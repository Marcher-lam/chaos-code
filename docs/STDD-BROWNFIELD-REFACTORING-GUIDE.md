# STDD Copilot Ultra 老项目修改与重构实操文档

> **版本**: v2.0.0 | **更新日期**: 2026-06-01
> **适用场景**: 已有代码库接入 STDD Copilot Ultra，用于 bug 修复、功能修改、模块重构、架构迁移和质量治理
> **推荐环境**: Claude Code + 已安装 `stdd` CLI
> **项目类型**: Brownfield / Legacy / 已上线系统
> **核心原则**: 先理解现状，再提出变更；先锁定行为，再安全修改；先小范围验证，再逐步扩大重构

---

## 文档目标

这份文档说明：如果你已经有一个老项目，想通过 STDD Copilot Ultra 来做修改或重构，应该怎么操作。

它不是从空目录创建新项目，而是假设你面对的是一个真实已有系统：

1. 代码已经存在，可能没有统一文档。
2. 测试可能不完整，甚至没有测试。
3. 架构可能有历史债务。
4. 线上行为不能轻易破坏。
5. 每次修改都需要可追踪、可验证、可回滚。

STDD 在老项目中的定位是：

1. 帮你建立项目理解报告。
2. 把修改意图转成可审查的 proposal/spec/tasks。
3. 用测试和证据锁住已有行为。
4. 通过小步 TDD/重构降低回归风险。
5. 让每次修改都有清晰的验证记录和归档。

---

## 示例老项目

本文用一个典型老项目作为示例：

**LegacyShop** — 一个已经上线 3 年的电商后台系统。

| 模块 | 当前情况 |
|------|----------|
| 前端 | React 17 + JavaScript，部分页面无组件边界 |
| 后端 | Express + Node.js，路由和业务逻辑混杂 |
| 数据库 | MySQL，migration 不完整 |
| 鉴权 | JWT + 自定义 middleware |
| 测试 | Jest，覆盖率低，核心支付流程缺少测试 |
| CI | GitHub Actions，只跑 `npm test` |
| 主要痛点 | 订单模块复杂、权限逻辑重复、支付回调难以测试 |

本次目标分为三类：

1. 修复 bug：支付回调重复触发导致订单状态异常。
2. 修改功能：订单列表增加按退款状态筛选。
3. 重构模块：拆分订单服务，降低单文件复杂度。

---

## 环境准备

### 安装 STDD Copilot Ultra

**方式 A: npm 全局安装**

```bash
npm install -g @marcher-lam/stdd-copilot-ultra@latest
stdd --version
```

**方式 B: 源码安装**

```bash
git clone https://github.com/Marcher-lam/STDD-COPILOT-ULTRA.git ~/stdd-copilot-ultra
cd ~/stdd-copilot-ultra
npm install
npm link
stdd --version
```

**方式 C: Docker 隔离运行**

```bash
docker pull marcher-lam/stdd-copilot-ultra:latest
docker run --rm -v "$PWD:/workspace" marcher-lam/stdd-copilot-ultra:latest --help
```

常规开发推荐 npm 全局安装。Docker 更适合 CI、隔离审查或企业内部分发。

### 进入老项目

```bash
cd ~/projects/legacy-shop
git status --short --branch
```

建议先确认：

1. 当前分支是否正确。
2. 是否有未提交的用户改动。
3. 是否能本地安装依赖。
4. 是否能跑现有测试。

```bash
npm install
npm test
```

如果老项目测试本身已经失败，不要先修代码。先记录现状，把失败作为 brownfield baseline。

---

## Brownfield 工作流总览

```text
读取现状
  -> 初始化 STDD
  -> 生成项目理解报告
  -> 确认修改范围
  -> 创建 change
  -> 写 proposal/spec/tasks
  -> 补 characterization tests
  -> 小步修改或重构
  -> verify/guard/metrics
  -> archive
```

老项目和新项目最大的区别：

| 阶段 | 新项目 | 老项目 |
|------|--------|--------|
| 初始化 | 直接建结构 | 先读项目再初始化 |
| 需求 | 用户描述为主 | 用户描述 + 现有行为约束 |
| 测试 | 先写新测试 | 先补 characterization tests 锁定旧行为 |
| 实现 | 可以自由设计 | 必须控制影响范围 |
| 验证 | 功能验证为主 | 回归验证 + 兼容性验证 + 行为不变证明 |
| 归档 | 记录新功能 | 记录变更前后差异和迁移风险 |

---

## 测试约定

| 标记 | 含义 |
|------|------|
| `[PASS]` | 命令执行成功，产物符合预期 |
| `[PASS*]` | 核心功能正常，但老项目现状导致部分 warning |
| `[FAIL]` | 命令报错或产物不符合预期 |
| `[SKIP]` | 前置条件不满足 |

---

# Part I: 接手老项目与现状诊断

> **场景**: 你第一次在 LegacyShop 中使用 STDD。目标不是马上改代码，而是先建立可信的项目理解。

## Phase 0: 只读检查

### B01 — 确认工作区状态

```bash
git status --short --branch
```

**预期产物**: 当前分支和未提交文件列表。

**验证点**:
- [ ] 知道当前分支是否是 feature/refactor 分支。
- [ ] 未提交改动不会被误删或覆盖。

### B02 — 初步读取项目元信息

```bash
cat package.json
cat README.md
cat tsconfig.json 2>/dev/null || true
```

**预期产物**: 技术栈、脚本、依赖、项目说明。

**验证点**:
- [ ] 识别语言、框架、测试框架。
- [ ] 识别已有 `test`、`lint`、`build`、`start` 脚本。

### B03 — 运行现有质量基线

```bash
npm test
npm run lint
npm run build
```

**预期产物**: 当前项目 baseline。

**验证点**:
- [ ] 成功项记录为当前可用质量门禁。
- [ ] 失败项记录具体命令、错误摘要。
- [ ] 不因为老项目已有失败而直接修改无关代码。

### B04 — 使用 STDD 探索项目

```bash
stdd explore "分析当前老项目结构、技术栈、测试覆盖和主要风险"
```

**预期产物**: 只读项目探索输出。

**验证点**:
- [ ] 输出架构摘要。
- [ ] 输出测试和质量热点。
- [ ] 不修改业务代码。

---

## Phase 1: 初始化 STDD

### B05 — 在老项目中初始化 STDD

```bash
stdd init --yes
```

**预期产物**: `stdd/` 目录、`stdd/config.yaml`、`AGENTS.md`。

**验证点**:
- [ ] 不覆盖已有业务代码。
- [ ] `stdd/config.yaml` 存在。
- [ ] 技术栈检测结果合理。
- [ ] 如项目已有 `.github/` 文件，STDD 不应破坏已有 CI 配置。

### B06 — 深度诊断 STDD 接入状态

```bash
stdd doctor --deep
```

**预期产物**: STDD 健康诊断。

**验证点**:
- [ ] `stdd/` 和 `config.yaml` 检查通过。
- [ ] 输出 Node 版本、lint、audit、active changes、evidence 信息。
- [ ] 如果 test command 缺失，应显示 warning。

### B07 — 配置测试命令

打开 `stdd/config.yaml`，确认或补充测试命令。

```yaml
test:
  command: "npm test -- --runInBand"
```

**预期产物**: STDD 后续 `apply` / `verify` 可以找到测试命令。

**验证点**:
- [ ] 测试命令能在本机真实执行。
- [ ] 命令不依赖交互式输入。

---

## Phase 2: 建立项目记忆

### B08 — 扫描代码记忆

```bash
stdd memory scan
```

**预期产物**: `stdd/memory/components.md` 和 `stdd/memory/contracts.md`。

**验证点**:
- [ ] 组件/模块清单生成成功。
- [ ] 记忆文件不包含敏感密钥。

### B09 — 学习项目风格

```bash
stdd learn scan
```

**预期产物**: 项目代码风格和 pattern 记录。

**验证点**:
- [ ] 输出命名、测试、模块组织、错误处理习惯。

### B10 — 查看项目上下文

```bash
stdd context
```

**预期产物**: Foundation、Components、Contracts 三层上下文。

**验证点**:
- [ ] 输出足够让 AI 理解项目。

---

# Part II: 修复老项目 Bug

> **场景**: LegacyShop 的支付回调有 bug。同一个支付网关回调可能重复到达，导致订单状态被重复更新。

## Phase 3: 创建 bugfix change

### B11 — 使用 issue 流程创建 bug 修复

```bash
stdd issue "支付网关回调重复触发时，订单状态可能被重复更新，需要保证回调幂等" --title "支付回调幂等性修复" --severity high
```

**预期产物**: `stdd/changes/<change>/proposal.md`、`tasks.md`、`specs/`。

**验证点**:
- [ ] proposal 包含 Steps to Reproduce。
- [ ] tasks 第一项是写测试。
- [ ] change 名称可在 `stdd list` 中看到。

### B12 — 查看当前推荐动作

```bash
stdd recommend
```

**预期产物**: 下一步建议。

**验证点**:
- [ ] 如果 tasks 已存在，推荐 `stdd apply` 或 `stdd continue`。
- [ ] 推荐理由与当前 change 状态一致。

### B13 — 先写失败测试（RED）

```bash
stdd apply fixes/payment-idempotency --phase red
```

**预期产物**: 先写出能暴露 bug 的测试。

**验证点**:
- [ ] RED 阶段测试应该失败。
- [ ] 失败原因对应支付回调重复处理。

### B14 — 最小修复（GREEN）

```bash
stdd apply fixes/payment-idempotency --phase green
```

**预期产物**: 最小代码改动让测试通过。

**验证点**:
- [ ] 只修改支付回调幂等相关代码。
- [ ] 不重构无关订单逻辑。
- [ ] 测试通过后记录 evidence。

### B15 — 重构清理（REFACTOR）

```bash
stdd apply fixes/payment-idempotency --phase refactor
```

**预期产物**: 在测试保护下清理重复逻辑。

**验证点**:
- [ ] 行为不变。
- [ ] 测试仍然通过。

### B16 — 验证 bugfix change

```bash
stdd verify fixes/payment-idempotency --lint
stdd mutation fixes/payment-idempotency --mode quick
```

**预期产物**: 验证报告和 quick mutation 结果。

**验证点**:
- [ ] 所有相关测试通过。
- [ ] lint 通过或只报告既有 warning。
- [ ] mutation quick 没有明显 fake green 风险。

### B17 — 生成修复上下文

```bash
stdd fix-packet fixes/payment-idempotency
```

**预期产物**: 修复上下文，便于 code review 或 AI 复核。

**验证点**:
- [ ] 包含 proposal、tasks、失败/通过证据。

---

# Part III: 在老项目中添加小功能

> **场景**: 产品要求订单列表增加"退款状态"筛选。这是已有模块上的小功能修改。

## Phase 4: 创建 feature change

### B18 — 使用 ff 快速创建明确需求

```bash
stdd ff "订单列表增加按退款状态筛选，支持全部、未退款、退款中、已退款" --change-name order-refund-filter
```

**预期产物**: `stdd/changes/order-refund-filter/` 下的 proposal、tasks、specs。

**验证点**:
- [ ] 需求范围明确。
- [ ] 不把订单模块整体重构混入这个 change。

### B19 — 验证规格质量

```bash
stdd validate order-refund-filter --spec-guardian
```

**预期产物**: 规格泄漏检查。

**验证点**:
- [ ] specs 关注行为而非实现细节。

### B20 — 生成 API 规范

```bash
stdd api-spec order-refund-filter
stdd contract generate order-refund-filter
```

**预期产物**: API spec 和 contract。

**验证点**:
- [ ] 如果后端接口需要新增 query 参数，OpenAPI 有体现。

### B21 — 执行小步实现

```bash
stdd apply order-refund-filter
stdd continue order-refund-filter
```

**预期产物**: 按任务逐步实现。

**验证点**:
- [ ] 每个任务完成后测试通过。
- [ ] 如果中断，`stdd continue` 能恢复到下一个任务。
- [ ] 进度写入 `stdd/progress.jsonl`。

### B22 — 生成用户验收脚本

```bash
stdd user-test order-refund-filter
```

**预期产物**: 人类可读的验收脚本。

**验证点**:
- [ ] 产品/QA 可以按步骤验证筛选行为。

---

# Part IV: 安全重构老模块

> **场景**: 订单模块已有 1200 行单文件，长期难维护。目标是拆分服务，但不改变外部行为。

## Phase 5: 重构前评估

### B23 — 探索订单模块风险

```bash
stdd explore "深入分析订单模块 src/orders 的职责、依赖、测试覆盖和重构风险"
```

**预期产物**: 重构风险报告。

**验证点**:
- [ ] 标出高复杂度文件、缺测试路径、外部依赖。

### B24 — 查看复杂度和指标

```bash
stdd metrics --json
```

**预期产物**: 指标 JSON。

**验证点**:
- [ ] 可识别 top complex files。
- [ ] 记录重构前 baseline。

### B25 — 创建重构 change

```bash
stdd new change refactor-order-service --title "拆分订单服务并保持外部行为不变"
```

**预期产物**: `stdd/changes/refactor-order-service/`。

**验证点**:
- [ ] proposal 明确"不改变外部行为"。
- [ ] tasks 优先补测试，再拆分代码。

### B26 — 写重构设计

在 `stdd/changes/refactor-order-service/design.md` 中记录设计：

```text
目标：拆分 OrderService 中的查询、状态流转、支付回调、退款逻辑。
约束：不改变现有 API 响应格式，不改变数据库 schema，不改变权限规则。
验证：现有订单 API 测试全部通过，新增 characterization tests 覆盖关键路径。
```

**预期产物**: 重构设计文档。

### B27 — 先补 characterization tests

```bash
stdd tdd-init --dry-run
stdd apply refactor-order-service --phase red
```

**预期产物**: 关键旧行为被测试锁住。

**验证点**:
- [ ] 覆盖订单创建、状态变更、支付回调、退款路径。

### B28 — 分阶段拆分

```bash
stdd apply refactor-order-service --task TASK-002
stdd verify refactor-order-service --lint
stdd apply refactor-order-service --task TASK-003
stdd verify refactor-order-service --lint
```

**预期产物**: 每拆一步就验证一次。

**验证点**:
- [ ] 每一步 diff 小。
- [ ] 每一步测试通过。
- [ ] 外部 API 行为不变。

### B29 — 重构后对比指标

```bash
stdd metrics refactor-order-service --json
```

**预期产物**: 重构后质量指标。

**验证点**:
- [ ] 复杂度下降或职责更清晰。
- [ ] 测试覆盖不下降。

---

# Part V: 处理测试不足或无测试的老项目

> **场景**: 很多老项目没有测试。STDD 不盲目修改，先建立最低保护网。

## Phase 6: 建立最低测试保护

### B30 — 检查测试脚手架缺口

```bash
stdd tdd-init --dry-run
```

**预期产物**: 将生成哪些测试文件的预览。

**验证点**:
- [ ] 不直接写文件。
- [ ] 能识别无测试的源文件。

### B31 — 创建测试脚手架

```bash
stdd tdd-init
```

**预期产物**: 为缺失测试的核心文件创建测试骨架。

**验证点**:
- [ ] 不覆盖已有测试。
- [ ] 路径符合项目测试习惯。

### B32 — 对高风险模块先补测试

```bash
stdd new change add-order-tests --title "补订单模块回归测试"
stdd apply add-order-tests
```

**预期产物**: 专门的测试补强 change。

**验证点**:
- [ ] 不混入业务重构。
- [ ] 测试能描述当前真实行为。

### B33 — 没有测试命令时显式阻断

```bash
stdd apply
```

**预期产物**: 如果未配置测试命令，STDD 阻止继续。

**验证点**:
- [ ] 输出"requires test commands to be configured"。
- [ ] 只有 `--allow-no-tests` 才可跳过。

---

# Part VI: 多工作区或 monorepo 老项目

> **场景**: LegacyShop 后来演化成 monorepo，包含 `apps/admin`、`packages/api`、`packages/shared`。

## Phase 7: Workspace 管理

### B34 — 检测 workspace

```bash
stdd workspace list --json
```

**预期产物**: workspace 列表。

**验证点**:
- [ ] 检测到 apps/packages。

### B35 — 修复 workspace registry

```bash
stdd workspace validate
stdd workspace repair --dry-run
stdd workspace repair
```

**预期产物**: 修复后的 workspace registry。

### B36 — 针对单个 workspace 创建 change

```bash
stdd ff "后台管理端订单列表增加退款筛选" --change-name admin-order-refund-filter --workspace apps/admin
```

**预期产物**: workspace-scoped change。

**验证点**:
- [ ] change 限定在 `apps/admin`。
- [ ] 后续 verify 只跑相关 workspace。

### B37 — workspace 级验证

```bash
stdd verify admin-order-refund-filter --workspace apps/admin --lint
stdd metrics --workspace apps/admin
```

**预期产物**: 单 workspace 验证结果。

---

# Part VII: 安全、权限与高风险修改

> **场景**: 老项目权限逻辑重复，准备统一权限检查。这类修改风险高，需要更严格的确认和证据。

## Phase 8: 高风险变更治理

### B38 — 创建高风险 proposal

```bash
stdd new change refactor-permission-checks --title "统一权限检查入口"
```

**预期产物**: 权限重构 change。

**验证点**:
- [ ] proposal 标注高风险。
- [ ] 明确受影响角色、接口、页面。

### B39 — 对抗式审查

```bash
stdd roles adversarial src/auth
```

**预期产物**: 安全审查报告。

**验证点**:
- [ ] 检查越权、默认允许、绕过 middleware 等风险。

### B40 — Constitution 检查

```bash
stdd constitution check
```

**预期产物**: 合规检查。

**验证点**:
- [ ] Security 和 TDD 相关 blocking 项无失败。

### B41 — 临时豁免

```bash
stdd constitution waive 2 --reason "历史权限模块测试补齐需要分阶段完成" --days 7
```

**预期产物**: 临时 waiver（7 天后自动过期）。

---

# Part VIII: 断点续传与团队协作

> **场景**: 老项目改造通常持续多天，需要知道做到哪里、失败在哪里、谁接手都能继续。

## Phase 9: 进度追踪

### B42 — 查看当前进度

```bash
stdd progress --summary
stdd progress
```

**预期产物**: 命令执行历史和摘要。

**验证点**:
- [ ] 能看到 start/complete/fail/interrupt。

### B43 — 中断后恢复

```bash
stdd progress --resume
stdd continue
```

**预期产物**: 恢复上下文和下一步执行。

### B44 — 生成产品/技术方案报告

```bash
stdd product-proposal --json
```

**预期产物**: 聚合报告。

**验证点**:
- [ ] 汇总 proposal、specs、tasks、evidence、progress。

---

# Part IX: 验证、归档与交付

> **场景**: 修改或重构完成后，需要确认能交付、能审查、能回溯。

## Phase 10: 最终验证

### B45 — 完整 verify

```bash
stdd verify --lint
stdd guard --strict
stdd mutation --mode quick
```

**预期产物**: 最终验证证据。

**验证点**:
- [ ] 测试通过。
- [ ] lint 通过或已有 warning 有记录。
- [ ] guard 无 blocking 问题。
- [ ] mutation quick 无明显假绿风险。

### B46 — 项目级质量门禁

```bash
npm test
npm run lint
npm run build
```

**预期产物**: 老项目自身质量门禁结果。

**验证点**:
- [ ] 与接入 STDD 前 baseline 对比。
- [ ] 新增失败必须修复。

### B47 — 归档 change

```bash
stdd archive
```

**预期产物**: change 移动到 `stdd/changes/archive/`，生成 summary。

**验证点**:
- [ ] tasks 全部完成才允许 archive。
- [ ] specs 和 evidence 可回溯。

### B48 — 生成 commit message

```bash
stdd commit
```

**预期产物**: 推荐提交信息。

**验证点**:
- [ ] bugfix 用 `fix:`，功能用 `feat:`，重构用 `refactor:`。
- [ ] body 包含 specs/tasks 摘要。

---

# Part X: 老项目推荐执行顺序

## 第一次接入老项目

```bash
git status --short --branch
npm test || true
npm run lint || true
stdd init --yes
stdd doctor --deep
stdd memory scan
stdd learn scan
stdd context
```

## 修复 bug

```bash
stdd issue "描述 bug 和期望行为" --title "简短标题" --severity high
stdd apply --phase red
stdd apply --phase green
stdd apply --phase refactor
stdd verify --lint
stdd mutation --mode quick
stdd archive
```

## 添加小功能

```bash
stdd ff "清晰的小功能描述" --change-name feature-name
stdd validate feature-name --spec-guardian
stdd apply feature-name
stdd continue feature-name
stdd user-test feature-name
stdd verify feature-name --lint
stdd archive feature-name
```

## 做安全重构

```bash
stdd explore "分析目标模块重构风险"
stdd metrics --json
stdd new change refactor-target-module --title "重构目标和行为不变约束"
stdd tdd-init --dry-run
stdd apply refactor-target-module --phase red
stdd apply refactor-target-module --phase green
stdd verify refactor-target-module --lint
stdd metrics refactor-target-module --json
stdd archive refactor-target-module
```

---

# 老项目使用守则

1. 不要一上来重构，先建立 baseline。
2. 不要把 bugfix、功能、重构混在一个 change。
3. 不要在未配置测试命令的情况下执行代码任务。
4. 不要为了通过验证修改无关历史问题。
5. 每个 change 必须能解释"为什么改、改了什么、怎么验证"。
6. 重构前先补 characterization tests。
7. 高风险模块必须有 proposal、design、verify、evidence。
8. 归档前必须确认 tasks 全部完成。
9. 如果需要跳过测试，只能用于文档或非代码任务，并显式使用 `--allow-no-tests`。
10. 每次失败都优先生成 fix-packet，而不是盲目继续改。

---

# STDD Copilot Ultra 质量基线

| 指标 | 数值 |
|------|------|
| 版本 | v2.0.0 |
| 测试套件 | 196 |
| 测试用例 | 4151 |
| 通过率 | 100% |
| 语句覆盖 | 97.7% |
| 分支覆盖 | 93.2% |
| 函数覆盖 | ~97% |
| 行覆盖 | ~97% |
| CLI 命令 | 88 |
| Command 模板 | 86 |
| Skill 模板 | 53 |

---

> 老项目接入 STDD 的关键不是"让 AI 快速改完"，而是让每一次修改都变成可审查、可测试、可回滚、可归档的工程事件。
