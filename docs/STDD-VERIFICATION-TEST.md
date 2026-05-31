# STDD Copilot Ultra 验证与测试指南

> **版本**: v2.0.0 | **更新日期**: 2026-06-01
> **覆盖范围**: 88 个 CLI 命令 + 86 个 Command 模板 + 53 个 Skill 模板
> **质量基线**: `npm run premerge` (audit + zero-warning lint + docs + coverage)

---

## 1. 5 维验证体系

STDD 的 `stdd verify` 命令执行 5 个维度的验证，确保每个变更的质量：

| 维度 | 检查内容 | 阻断条件 |
|------|----------|----------|
| **API 签名** | 接口契约一致性、参数类型匹配 | 签名不匹配时阻断 |
| **BDD 覆盖** | Given/When/Then 场景全部通过 | 场景失败时阻断 |
| **类型安全** | TypeScript 编译无错误 | 类型错误时阻断 |
| **边界/异常** | 空值、越界、并发、网络异常路径 | 关键路径未覆盖时警告 |
| **文档一致性** | 代码与 spec/proposal/README 描述一致 | 不一致时警告 |

### 使用方式

```bash
stdd verify <change>
stdd verify <change> --lint
stdd verify <change> --no-constitution
stdd verify <change> --lint-command "npm run lint"
```

### 验证流程

```
测试运行 → 覆盖率检查 → Constitution 合规 → Evidence 生成 → 报告输出
    │           │              │                  │              │
    └─ 失败阻断  └─ 低于阈值阻断  └─ Blocking 项阻断   └─ 写入文件     └─ 终端展示
```

---

## 2. TDD Ralph Loop

Ralph Loop 是 STDD 的核心 TDD 执行循环，包含 4 个阶段：

```
🔴 RED → 🟢 GREEN → 🧬 MUTATION → 🔵 REFACTOR
   │          │            │             │
   │          │            │             └─ 在测试保护下优化代码结构
   │          │            └─ 变异测试验证测试质量
   │          └─ 最小改动让测试通过
   └─ 先写失败测试
```

### 2.1 RED 阶段

```bash
stdd apply <change> --phase red
```

- 写出能暴露需求/bug 的测试
- 测试必须失败，否则说明测试无意义
- 失败原因必须对应待实现功能

### 2.2 GREEN 阶段

```bash
stdd apply <change> --phase green
```

- 最小代码改动让测试通过
- 不重构、不优化、不过度设计
- 只修改与当前任务直接相关的代码

### 2.3 REFACTOR 阶段

```bash
stdd apply <change> --phase refactor
```

- 在测试保护下清理重复逻辑
- 行为不变（测试仍然通过）
- 改善命名、提取函数、消除重复

### 2.4 MUTATION 阶段

```bash
stdd mutation <change>
stdd mutation <change> --mode quick
stdd mutation <change> --threshold 70
```

- 检测假绿灯（测试通过但实际没有验证正确行为）
- Quick 模式：启发式快速评估
- Deep 模式：基于 Stryker 的深度变异分析
- 默认阈值 80%，可通过 `--threshold` 调整

### 2.5 完整循环执行

```bash
stdd apply <change>
```

不带 `--phase` 时自动执行完整 Ralph Loop。带 `--dry-run` 只预览不执行：

```bash
stdd apply <change> --dry-run
```

跳到指定任务：

```bash
stdd apply <change> --task TASK-003
```

---

## 3. Constitution 合规

STDD 内置 9 条质量宪法，三级执行：

| 级别 | 条例 | 核心规则 |
|------|------|---------|
| 🔴 Blocking | Article 2 — TDD | 测试先行 + 覆盖率门禁 + 变异证据 |
| 🔴 Blocking | Article 7 — Security | 禁止硬编码密钥、注入、不安全路径 |
| 🔴 Blocking | Article 9 — CI/CD | 自动化流水线必需 |
| 🟡 Warning | Article 1 — Library-First | 优先成熟库 |
| 🟡 Warning | Article 3 — Small Commits | 原子化提交 |
| 🟡 Warning | Article 4 — Code Style | 统一格式 |
| 🟡 Warning | Article 6 — Error Handling | 禁止空 catch |
| 🟢 Suggestion | Article 5 — Documentation | 文档即代码 |
| 🟢 Suggestion | Article 8 — Performance | 合理默认性能 |

### 3.1 合规检查

```bash
stdd constitution              # 概览
stdd constitution show 2       # 查看 Article 2 详情
stdd constitution check        # 逐条检查
```

### 3.2 临时豁免

```bash
stdd constitution waive 2 --reason "历史模块测试补齐需要分阶段完成" --days 7
```

豁免 7 天后自动过期，不会被遗忘。

### 3.3 合规审计

```bash
stdd audit --json
stdd constitution audit
```

输出历史合规审计记录，包含每条检查的时间、结果、豁免情况。

---

## 4. Mutation Testing

变异测试是 STDD 检测假绿灯的核心手段。

### 4.1 Quick Heuristic（快速启发式）

```bash
stdd mutation <change> --mode quick
```

快速模式：

- 不修改源代码
- 基于测试结构和断言密度启发式评估
- 输出变异分数估算
- 适合日常开发中的快速验证
- 执行时间：秒级

### 4.2 Stryker Deep Analysis（深度分析）

```bash
stdd mutation <change>
```

深度模式：

- 基于 Stryker Mutator 执行真实变异
- 支持变异操作符：算术替换、条件翻转、字符串修改等
- 输出详细的变异存活/杀死报告
- 适合关键模块的质量审查
- 执行时间：分钟级

### 4.3 阈值控制

```bash
stdd mutation <change> --threshold 70
```

默认阈值 80%。变异分数低于阈值时：

- `verify` 报告失败
- `archive` 被阻断
- 必须补充测试或降低阈值

### 4.4 Anti-Fake-Green 检测

STDD 专门检测以下假绿模式：

| 假绿模式 | 检测方式 |
|----------|----------|
| 断言缺失 | 检查测试中 assert/expect 数量 |
| 恒真断言 | 检查 `expect(true).toBe(true)` 类模式 |
| 未覆盖路径 | 分析分支覆盖和变异存活 |
| Mock 过度 | 检查 mock 占比是否过高 |
| 异步未等待 | 检查 async/await 配对 |

---

## 5. Quality Gates

STDD 提供三层质量门禁：

### 5.1 Guard 门禁

```bash
stdd guard
stdd guard --strict
stdd guard --no-constitution
stdd guard --workspace packages/api
```

Guard 运行：

1. 测试运行
2. 覆盖率检查
3. Constitution 合规
4. `--strict` 所有 warning 也报错
5. `--workspace` 限定工作区

### 5.2 Hooks 钩子

```bash
stdd hooks install --git
stdd hooks verify
stdd hooks status
stdd hooks disable
stdd hooks enable
```

| Hook 类型 | 触发时机 | 行为 |
|-----------|----------|------|
| `preToolUse` | AI 写入文件前 | 检查目标文件是否在变更范围内 |
| `postToolUse` | AI 写入文件后 | 自动运行相关测试 |
| Git pre-commit | `git commit` 前 | 运行 `stdd guard` |

### 5.3 Pre/Post Apply 检查

`stdd apply` 在执行前后自动运行：

**Pre-apply**：

- 测试命令是否配置
- 当前是否有未完成的 tasks
- 变更目录结构是否完整

**Post-apply**：

- 当前 task 的测试是否通过
- Evidence 是否记录
- Progress 是否更新

---

## 6. Evidence System

STDD 的证据系统提供结构化验证记录，确保每次修改都有可追溯的证明。

### 6.1 证据类型

| 证据类型 | 生成命令 | 内容 |
|----------|----------|------|
| 测试证据 | `stdd verify` | 测试运行结果、通过/失败数 |
| 覆盖率证据 | `stdd verify` | 语句/分支/函数/行覆盖率 |
| Lint 证据 | `stdd verify --lint` | ESLint/类型检查结果 |
| Mutation 证据 | `stdd mutation` | 变异分数、存活变异列表 |
| Constitution 证据 | `stdd constitution check` | 合规检查结果 |

### 6.2 结构化证明收集

```bash
stdd verify <change>
stdd guard --strict
stdd mutation <change>
stdd constitution check
```

每条证据自动写入 `stdd/changes/<change>/evidence/`，包含：

- 时间戳
- 命令和参数
- 执行结果
- 通过/失败状态

### 6.3 Audit Trail

```bash
stdd audit --json
stdd progress --summary
stdd progress --json
```

所有命令执行记录在 `stdd/progress.jsonl`，每行一条 JSON 记录：

```json
{"ts":"2026-06-01T10:00:00Z","cmd":"apply","change":"add-multiply","phase":"red","status":"start"}
{"ts":"2026-06-01T10:02:30Z","cmd":"apply","change":"add-multiply","phase":"red","status":"complete","tests":3,"passed":0,"failed":3}
```

---

## 7. Fix Packet

Fix Packet 是 STDD 在测试失败时生成的结构化上下文，用于 AI 高效修复。

### 7.1 生成 Fix Packet

```bash
stdd fix-packet <change>
```

### 7.2 Fix Packet 内容（Golden Packet）

| 内容 | 说明 |
|------|------|
| Proposal 摘要 | 当前变更的需求描述 |
| Tasks 状态 | 每个任务的完成状态 |
| 失败测试 | 测试名称、断言、期望值、实际值 |
| 相关代码 | 失败测试涉及的源文件和行号 |
| 环境信息 | Node 版本、测试框架版本 |
| 已有 Evidence | 之前成功/失败的证据记录 |

### 7.3 使用场景

1. **AI 助手修复**：将 Fix Packet 提供给 AI，获得精准的修复建议
2. **Code Review**：作为 review 上下文，帮助审查者理解变更和问题
3. **跨会话恢复**：中断后通过 Fix Packet 快速恢复上下文

---

## 8. Outside-In TDD

Outside-In TDD 是一种分层测试策略，从外到内逐步收敛：

```
E2E 测试（最外层）
  ↓ 失败 → 驱动
Integration 测试（中间层）
  ↓ 失败 → 驱动
Unit 测试（最内层）
```

### 8.1 初始化

```bash
stdd outside-in init
```

创建 `.stdd-outside-in.json` 注册表，记录测试层级关系。

### 8.2 脚手架生成

```bash
stdd outside-in scaffold <change>
```

为变更生成三层测试骨架：

- E2E：端到端用户场景
- Integration：模块间交互
- Unit：单个函数/类

### 8.3 查看状态

```bash
stdd outside-in status
```

输出每层测试的覆盖状态和失败情况。

### 8.4 执行顺序

1. 写 E2E 测试 → 失败（功能未实现）
2. 写 Integration 测试 → 失败（接口未实现）
3. 写 Unit 测试 → 失败（具体逻辑未实现）
4. 实现 Unit 逻辑 → Unit 测试通过
5. 实现接口 → Integration 测试通过
6. 端到端连通 → E2E 测试通过

---

## 9. 测试命令速查

### 9.1 核心测试命令

| 命令 | 说明 |
|------|------|
| `stdd apply <change>` | 执行完整 Ralph Loop |
| `stdd apply <change> --phase red` | 只执行 RED 阶段 |
| `stdd apply <change> --phase green` | 只执行 GREEN 阶段 |
| `stdd apply <change> --phase refactor` | 只执行 REFACTOR 阶段 |
| `stdd apply <change> --dry-run` | 预览不执行 |
| `stdd apply <change> --task TASK-003` | 跳到指定任务 |
| `stdd apply <change> --allow-no-tests` | 允许无测试通过 |

### 9.2 验证命令

| 命令 | 说明 |
|------|------|
| `stdd verify <change>` | 5 维验证 |
| `stdd verify <change> --lint` | 验证 + Lint |
| `stdd verify <change> --no-constitution` | 跳过合规检查 |
| `stdd guard` | 质量门禁 |
| `stdd guard --strict` | 严格模式（Warning 也阻断） |
| `stdd mutation <change>` | 变异测试（深度） |
| `stdd mutation <change> --mode quick` | 变异测试（快速） |
| `stdd mutation <change> --threshold 70` | 自定义阈值 |

### 9.3 测试辅助命令

| 命令 | 说明 |
|------|------|
| `stdd tdd-init` | 为缺失测试的文件创建骨架 |
| `stdd tdd-init --dry-run` | 预览将生成哪些测试文件 |
| `stdd tdd-init --source-dir src/` | 指定源码目录 |
| `stdd mock <change>` | 生成 Mock 数据 |
| `stdd mock-gen <change>` | 从规格生成 Mock |
| `stdd factory <entity>` | 生成测试数据工厂 |
| `stdd baby-steps "描述"` | TDD 小步引导 |
| `stdd fix-packet <change>` | 生成修复上下文 |
| `stdd outside-in init` | 初始化 Outside-In TDD |
| `stdd outside-in scaffold <change>` | 生成三层测试骨架 |

### 9.4 质量治理命令

| 命令 | 说明 |
|------|------|
| `stdd constitution check` | 9 条宪法合规检查 |
| `stdd constitution show <N>` | 查看指定条例 |
| `stdd constitution waive <N> --reason "..." --days 7` | 临时豁免 |
| `stdd audit --json` | 合规审计历史 |
| `stdd metrics <change>` | 质量指标仪表板 |
| `stdd metrics <change> --json` | JSON 格式指标 |
| `stdd depcheck` | 未使用依赖检查 |
| `stdd doctor --deep` | 深度健康诊断 |

### 9.5 进度与恢复命令

| 命令 | 说明 |
|------|------|
| `stdd progress` | 查看执行历史 |
| `stdd progress --summary` | 成功/失败/中断统计 |
| `stdd progress --json` | JSON 格式输出 |
| `stdd progress --resume` | 推荐恢复命令 |
| `stdd progress --last 50` | 最近 50 条记录 |
| `stdd continue <change>` | 断点续传 |
| `stdd continue <change> --dry-run` | 预览下一步 |

---

## 10. CI/CD 集成

### 10.1 生成 GitHub Actions 配置

```bash
stdd ci github
```

生成 `.github/workflows/ci.yml`：

```yaml
name: STDD CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20.x, 22.x]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm test
      - run: npm run lint
      - run: npx stdd guard
      - run: npx stdd constitution check
```

### 10.2 手动集成到已有 CI

如果项目已有 CI 配置，在已有步骤后添加：

```yaml
- name: STDD Quality Gate
  run: |
    npx stdd guard
    npx stdd constitution check
```

### 10.3 Git Hooks 集成

```bash
stdd hooks install --git
```

在 `git commit` 前自动运行质量检查。

### 10.4 Pre-merge 检查

STDD 项目推荐在 CI 中运行完整的 premerge 检查：

```bash
npm run premerge
```

包含：audit + zero-warning lint + docs + coverage。

---

## 质量基线

| 指标 | 数值 |
|------|------|
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

> **STDD Copilot Ultra v2.0.0** — 从测试先行到变异测试，从合规检查到证据归档，确保每次交付都有质量证明。
