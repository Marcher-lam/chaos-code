# STDD Copilot Ultra 老项目（Brownfield）重构指南

> **版本**: v2.0.0 | **更新日期**: 2026-06-01
> **适用场景**: 已有代码库接入 STDD Copilot Ultra
> **核心原则**: 先理解现状，再提出变更；先锁定行为，再安全修改；先小范围验证，再逐步扩大重构

---

## 1. 什么是 Brownfield（接手已有项目）

**Brownfield** 指的是已经存在的、有业务代码运行的项目——不是从空目录开始的新项目。这类项目通常具有以下特征：

| 特征 | 典型表现 |
|------|----------|
| 代码已存在 | 可能有数月甚至数年的历史积累 |
| 测试不完整 | 核心路径可能缺少测试，甚至完全没有测试 |
| 文档缺失 | README 过时，接口文档与实际不符 |
| 架构债务 | 循环依赖、上帝类、职责混杂 |
| 线上在跑 | 每次修改都必须保证不影响现有用户 |
| 团队换手 | 原作者可能已离开，接手者不了解全貌 |

**STDD 的定位**：不是替代你理解老项目，而是帮你建立系统化的理解报告，把每次修改变成可审查、可测试、可回滚、可归档的工程事件。

---

## 2. 自动检测规则

STDD Copilot Ultra 会根据项目目录特征自动判断场景：

| 检测条件 | 场景判定 | 自动行为 |
|----------|----------|----------|
| 空目录或仅有 `package.json` 但无 `src/` | **Greenfield** | 直接标准初始化流程 |
| 存在 `src/` 或 `package.json` 但没有 `stdd/config.yaml` | **Brownfield** | 进入阅读→报告→确认流程 |
| 已存在 `stdd/config.yaml` | **已有 STDD 项目** | 直接继续工作 |

### Brownfield 自动行为

```bash
cd existing-project
stdd init --yes
```

当检测到 Brownfield 时，`stdd init` 会：

1. **不覆盖已有文件** — 只创建 `stdd/` 目录和配置
2. **自动检测技术栈** — 从 `package.json`、`tsconfig.json` 等推断
3. **识别已有测试框架** — Jest / Vitest / pytest / go test 等
4. **评估测试覆盖现状** — 作为后续 baseline
5. **生成 Brownfield 报告** — 记录项目现状快照

```bash
stdd doctor --deep
```

`--deep` 模式额外输出：

- 已有 lint/audit 状态
- 活跃 changes 数量
- Evidence 记录状态
- 测试命令配置状态

---

## 3. Brownfield 阅读清单

接手老项目时，STDD 建议按以下顺序阅读关键文件：

### 3.1 项目元信息

| 文件 | 读取方式 | 关注点 |
|------|----------|--------|
| `package.json` | `cat package.json` | 技术栈、脚本命令、依赖版本 |
| `README.md` | `cat README.md` | 项目定位、使用说明、已知问题 |
| `tsconfig.json` | `cat tsconfig.json` | TypeScript 配置、模块系统 |
| `.env.example` / `config/` | 视项目而定 | 环境变量、配置结构 |

### 3.2 目录结构

```bash
stdd explore "分析当前项目结构和技术栈"
```

关注点：

- 入口文件位置（`src/index.ts`、`app.ts`、`main.py` 等）
- 模块划分方式
- 配置文件分布
- 测试文件位置和命名习惯

### 3.3 关键入口文件

| 入口类型 | 典型位置 |
|----------|----------|
| 应用入口 | `src/index.ts`、`src/app.ts`、`src/main.ts` |
| 路由定义 | `src/routes/`、`src/router.ts` |
| 数据库模型 | `src/models/`、`src/entities/` |
| 中间件 | `src/middleware/`、`src/filters/` |
| 工具函数 | `src/utils/`、`src/helpers/`、`src/lib/` |

### 3.4 现有测试

```bash
npm test 2>&1 | tee test-baseline.txt
```

记录内容：

- 测试框架和配置
- 通过 / 失败 / 跳过数量
- 覆盖率（如有）
- 失败原因摘要

### 3.5 一键生成阅读报告

```bash
stdd explore "全面分析项目架构、技术栈、测试覆盖、依赖关系和主要风险点"
stdd memory scan
stdd learn scan
stdd context
```

`memory scan` 生成组件清单和接口契约，`learn scan` 提取代码风格 pattern，`context` 输出三层上下文（Foundation / Components / Contracts）。

---

## 4. Brownfield 工作流

Brownfield 场景使用扩展版的 STDD 工作流，在标准流程前后增加了探索和评估环节：

```
explore → report → init → propose → clarify → confirm → spec → plan → apply → verify → archive
   │         │        │                                                    │          │
   │    现状报告   初始化STDD                                        回归验证      归档记录
   │         │                                                                  包含变更差异
   └── 只读探索 ┘
```

### 4.1 各阶段说明

| 阶段 | 命令 | Brownfield 特殊行为 |
|------|------|---------------------|
| **explore** | `stdd explore "分析范围"` | 只读，不修改任何业务代码 |
| **report** | `stdd doctor --deep` | 记录测试/lint/覆盖 baseline |
| **init** | `stdd init --yes` | 不覆盖已有文件，自动检测技术栈 |
| **propose** | `stdd propose` 或 `stdd ff` | 需求描述必须包含"不破坏现有行为"约束 |
| **clarify** | `stdd clarify` | 额外澄清与现有模块的边界 |
| **confirm** | `stdd confirm` | 确认修改范围和风险评估 |
| **spec** | `stdd spec` | BDD 规格标注影响范围 |
| **plan** | `stdd plan` | 任务拆分更细，每步可独立验证 |
| **apply** | `stdd apply` | 小步 TDD，每步验证回归 |
| **verify** | `stdd verify --lint` | 回归验证 + 兼容性验证 + 行为不变证明 |
| **archive** | `stdd archive` | 归档记录包含变更前后差异和迁移风险 |

### 4.2 三个快捷入口

| 场景 | 命令 | 说明 |
|------|------|------|
| Bug 修复 | `stdd issue "描述" --severity high` | 自动进入 RED → GREEN → REFACTOR |
| 小功能 | `stdd ff "描述"` | 一步生成提案+规格+任务 |
| 一键全流程 | `stdd turbo "描述"` | 自动执行所有阶段 |

---

## 5. 风险评估

每次修改老代码前，必须进行风险评估。STDD 提供多维度风险检查：

### 5.1 风险检查清单

```bash
stdd explore "分析目标模块的职责、依赖、测试覆盖和修改风险"
stdd metrics --json
stdd roles adversarial src/target-module
stdd constitution check
```

### 5.2 风险等级定义

| 风险等级 | 判定条件 | 要求 |
|----------|----------|------|
| **低** | 有完整测试覆盖，单文件，无外部依赖 | 标准工作流 |
| **中** | 测试不完整，涉及 2-3 个文件 | 必须先补 characterization tests |
| **高** | 无测试，涉及跨模块、数据库、权限 | 必须先补测试 + 写 design.md + 人工确认 |

### 5.3 高风险修改治理

高风险修改必须满足：

1. **Proposal 标注风险等级**
2. **Design 文档**：明确受影响角色、接口、页面
3. **对抗式审查**：`stdd roles adversarial src/target`
4. **Constitution 检查**：`stdd constitution check`
5. **临时豁免**（如需）：`stdd constitution waive 2 --reason "历史测试补齐需要分阶段" --days 7`

### 5.4 风险评估命令

```bash
stdd complexity analyze --target src/orders/
stdd certainty assess "重构订单模块"
stdd depcheck
stdd guard --strict
```

---

## 6. 增量迁移策略

将 STDD 引入已有项目，推荐分阶段进行，不要一次性改造。

### 6.1 迁移路线图

```
阶段 1: 只读理解（1-2 天）
  └── explore → doctor → memory scan → learn scan → context

阶段 2: 建立保护网（1-3 天）
  └── tdd-init → 补 characterization tests → 记录 baseline

阶段 3: 单模块试点（3-5 天）
  └── 选一个低风险模块 → 标准工作流 → 验证效果

阶段 4: 逐步扩大（按需）
  └── 中风险模块 → 高风险模块 → 跨模块重构
```

### 6.2 阶段 1：只读理解

```bash
git status --short --branch
npm test || true
npm run lint || true
npm run build || true
stdd init --yes
stdd doctor --deep
stdd memory scan
stdd learn scan
stdd context
```

**关键原则**：不修改任何业务代码，只建立理解。

### 6.3 阶段 2：建立保护网

```bash
stdd tdd-init --dry-run
stdd tdd-init
stdd new change add-baseline-tests --title "为核心模块补测试"
stdd apply add-baseline-tests
stdd verify add-baseline-tests --lint
stdd archive add-baseline-tests
```

**Characterization Tests** vs **Unit Tests**：

| 类型 | 目的 | 写法 |
|------|------|------|
| Characterization Test | 锁定当前行为（即使行为有 bug） | 记录输入输出，不判断对错 |
| Unit Test | 验证期望行为 | Given/When/Then，断言正确性 |

STDD 建议：先写 characterization tests 锁定现有行为，再在此基础上做修改。

### 6.4 阶段 3：单模块试点

选择标准：

- 改动频率中等
- 有一定测试基础
- 不涉及核心支付/权限路径
- 修改范围可控制在 1-3 个文件

```bash
stdd ff "小功能描述" --change-name pilot-feature
stdd validate pilot-feature --spec-guardian
stdd apply pilot-feature
stdd verify pilot-feature --lint
stdd mutation pilot-feature --mode quick
stdd archive pilot-feature
```

### 6.5 阶段 4：逐步扩大

扩大范围时注意：

1. 每次只扩大一个模块
2. 先评估风险等级
3. 高风险模块必须有 design.md
4. 跨模块修改必须明确接口契约

---

## 7. 与现有工具共存

STDD 不替代你现有的工具链，而是与之协同。

### 7.1 ESLint 共存

```bash
stdd verify my-change --lint
stdd verify my-change --lint-command "npx eslint src/ --ext .ts,.tsx"
stdd guard --strict
```

STDD 调用你项目已有的 ESLint 配置，不引入自己的 lint 规则。`--lint` 标志在 `verify` 和 `guard` 时运行你配置的 lint 命令。

**处理既有 lint 警告**：

- STDD 不会为了通过验证而修改无关历史问题
- 既有 warning 记录为 baseline
- 新增 warning 必须修复

### 7.2 Jest / Vitest 共存

在 `stdd/config.yaml` 中配置测试命令：

```yaml
test:
  command: "npm test -- --runInBand"
```

或使用其他框架：

```yaml
test:
  command: "npx vitest run"
  command: "python -m pytest"
  command: "go test ./..."
```

**关键要求**：

- 测试命令必须能在本机真实执行
- 不能依赖交互式输入
- 返回非零退出码表示失败

### 7.3 CI/CD 集成

#### GitHub Actions

```bash
stdd ci github
```

生成 `.github/workflows/ci.yml`，内容包含：

- `npm test` — 运行测试
- `npm run lint` — 代码检查
- `stdd guard` — STDD 质量门禁
- `stdd constitution check` — 合规检查

#### Git Hooks

```bash
stdd hooks install --git
stdd hooks verify
stdd hooks status
```

安装 pre-commit hook，在提交前自动运行 STDD 检查。

#### 与已有 CI 共存

STDD 不会覆盖已有的 CI 配置文件。`stdd ci github` 只在文件不存在时生成新文件。如果已有 CI，建议手动添加 STDD 步骤：

```yaml
- name: STDD Guard
  run: npx stdd guard
- name: STDD Constitution
  run: npx stdd constitution check
```

### 7.4 Monorepo 支持

```bash
stdd workspace list --json
stdd workspace validate
stdd workspace repair
```

STDD 自动检测 monorepo workspace 结构，支持 workspace 级别的 change 创建和验证：

```bash
stdd ff "功能描述" --change-name feature-name --workspace packages/api
stdd verify feature-name --workspace packages/api --lint
stdd metrics --workspace packages/api
```

---

## 8. 实战示例

以下是一个完整的实战示例：为已有 React + Express 项目添加"退款状态筛选"功能。

### 8.1 项目背景

**LegacyShop** — 已上线 3 年的电商后台系统：

| 模块 | 现状 |
|------|------|
| 前端 | React 17 + JavaScript |
| 后端 | Express + Node.js |
| 数据库 | MySQL，migration 不完整 |
| 测试 | Jest，覆盖率低 |
| CI | GitHub Actions，只跑 `npm test` |
| 痛点 | 订单模块复杂、权限逻辑重复 |

### 8.2 Step 1：只读检查

```bash
cd ~/projects/legacy-shop
git status --short --branch
npm install
npm test || true
npm run lint || true
npm run build || true
```

记录当前 baseline：测试通过/失败数量、lint 警告、构建状态。

### 8.3 Step 2：初始化 STDD

```bash
stdd init --yes
stdd doctor --deep
```

检查输出：

- `stdd/config.yaml` 已生成，技术栈检测正确
- 已有 `.github/workflows/` 未被破坏
- 测试命令自动识别为 `npm test`

### 8.4 Step 3：建立项目记忆

```bash
stdd explore "分析订单模块结构、接口、依赖和测试覆盖"
stdd memory scan
stdd learn scan
stdd context
```

这一步生成组件清单和代码风格记录，后续 AI 助手可据此理解项目。

### 8.5 Step 4：创建功能变更

```bash
stdd ff "订单列表增加按退款状态筛选，支持全部、未退款、退款中、已退款" \
  --change-name order-refund-filter
```

一键生成 `stdd/changes/order-refund-filter/` 下的 proposal、tasks、specs。

### 8.6 Step 5：验证规格

```bash
stdd validate order-refund-filter --spec-guardian
stdd api-spec order-refund-filter
stdd contract generate order-refund-filter
```

确保规格关注行为而非实现细节，API 规范包含新增 query 参数。

### 8.7 Step 6：TDD 实现

```bash
stdd apply order-refund-filter
```

自动执行 Ralph Loop：RED → GREEN → REFACTOR

如果中断：

```bash
stdd continue order-refund-filter
```

进度记录在 `stdd/progress.jsonl`，可随时恢复。

### 8.8 Step 7：验证

```bash
stdd verify order-refund-filter --lint
stdd mutation order-refund-filter --mode quick
```

验证项：

- 所有相关测试通过
- lint 通过或只有既有 warning
- mutation quick 无明显假绿风险
- Constitution 合规

### 8.9 Step 8：生成修复上下文（如需）

如果验证过程中遇到问题：

```bash
stdd fix-packet order-refund-filter
```

生成 Golden Packet 修复上下文，包含 proposal、tasks、失败/通过证据。

### 8.10 Step 9：用户验收

```bash
stdd user-test order-refund-filter
```

生成人类可读的验收脚本，产品/QA 可以按步骤验证筛选行为。

### 8.11 Step 10：归档

```bash
stdd archive order-refund-filter
```

变更移动到 `stdd/changes/archive/`，Delta Specs 合并到 `stdd/specs/`。

### 8.12 Step 11：提交

```bash
stdd commit order-refund-filter
```

输出 Conventional Commits 格式提交信息：

```
feat(orders): add refund status filter to order list

- Support filter by: all, pending, processing, refunded
- Add query parameter `refundStatus` to GET /api/orders
- Add dropdown component on frontend order list page

Specs: stdd/changes/archive/order-refund-filter/
Tasks: 4/4 completed
Evidence: all tests passing, mutation score 85%
```

---

## 老项目使用守则

1. 不要一上来重构，先建立 baseline
2. 不要把 bugfix、功能、重构混在一个 change
3. 不要在未配置测试命令的情况下执行代码任务
4. 不要为了通过验证修改无关历史问题
5. 每个 change 必须能解释"为什么改、改了什么、怎么验证"
6. 重构前先补 characterization tests
7. 高风险模块必须有 proposal、design、verify、evidence
8. 归档前必须确认 tasks 全部完成
9. 如果需要跳过测试，只能用于文档或非代码任务，并显式使用 `--allow-no-tests`
10. 每次失败都优先生成 fix-packet，而不是盲目继续改

---

## 质量基线

| 指标 | 数值 |
|------|------|
| 版本 | v2.0.0 |
| 测试套件 | 196 |
| 测试用例 | 4151 |
| 通过率 | 100% |
| 语句覆盖 | 97.7% |
| 分支覆盖 | 93.2% |
| CLI 命令 | 88 |
| Command 模板 | 86 |
| Skill 模板 | 53 |

---

> 老项目接入 STDD 的关键不是"让 AI 快速改完"，而是让每一次修改都变成可审查、可测试、可回滚、可归档的工程事件。
