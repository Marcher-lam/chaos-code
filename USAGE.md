# STDD Copilot 使用手册

STDD Copilot 提供双入口设计：CLI 命令行工具 (`stdd`) 和 Claude Code 斜杠命令 (`/stdd:*`)。

当前 CLI 已覆盖日常工程闭环：`stdd ff/spec/api-spec/apply/continue/mutation/verify/archive/commit`、`stdd issue/turbo/explore`、`stdd constitution check/status/fix/audit/waive`、`stdd guard/hooks`、`stdd graph run/history/recommend`、`stdd workspace`、`stdd metrics/context/ci/starters/update`、`stdd validate --spec-guardian`、`stdd learn scan`、`stdd roles party/adversarial`、`stdd story`、`stdd user-test`、`stdd pipeline`、`stdd schema create/fork/validate`、`stdd extensions` 和 **`stdd runtime agent/sudo`**。也支持 **Docker 部署**：`docker build -t stdd-copilot .` 然后 `docker-compose up -d`。

最新补强：`stdd fix-packet [change]` 会生成 Golden Packet 风格失败修复上下文，`stdd outside-in init/scaffold/status` 会生成 layer registry 与分层 TDD 骨架；Skill Graph 的 feature intent 已包含 `stdd-outside-in`，repair intent 已包含 `stdd-fix-packet → stdd-apply → stdd-verify`。新增实时进度追踪：`stdd progress` 自动记录所有命令执行到 `stdd/progress.jsonl`，终端关闭/崩溃后可通过 `stdd progress --resume` 断点续传。完整测试验证通过 `npm test` 和 `npm run premerge` 质量门禁执行，覆盖依赖审计、lint、文档契约和 Jest 回归测试（200 套件）。

## 核心概念

| 概念 | 路径 | 说明 |
|------|------|------|
| **Commands** | `.claude/commands/stdd/` | 86 个 `/stdd:*` 斜杠命令模板初始化后的副本 |
| **Skills** | `.claude/skills/stdd/` | 53 个可被命令调用的技能模块 |
| **Changes** | `stdd/changes/` | 变更管理 (提案→规格→实现→归档) |
| **Specs** | `stdd/specs/` | BDD 规格文件 (Source of Truth) |
| **Memory** | `stdd/memory/` | 持久化记忆库 |
| **Constitution** | `schemas/constitution/` | 9 篇开发条例 + 豁免机制 |
| **Config** | `stdd/config.yaml` | 项目配置 |

### 斜杠命令完整列表

STDD Copilot 提供斜杠命令（86 个 Command 模板 + 53 个 Skill 模板，去重后 86 个唯一入口）：

**核心流程**: `/stdd:init` `/stdd:new` `/stdd:propose` `/stdd:clarify` `/stdd:confirm` `/stdd:spec` `/stdd:plan` `/stdd:apply` `/stdd:execute` `/stdd:verify` `/stdd:archive` `/stdd:final-doc` `/stdd:brainstorm` `/stdd:issue` `/stdd:constitution` `/stdd:ff` `/stdd:continue` `/stdd:explore` `/stdd:graph` `/stdd:turbo`

**辅助功能**: `/stdd:api-spec` `/stdd:audit` `/stdd:baby-steps` `/stdd:browser` `/stdd:builder` `/stdd:certainty` `/stdd:ci` `/stdd:ci-generator` `/stdd:clarify` `/stdd:commands` `/stdd:commit` `/stdd:commit-msg` `/stdd:commit-tdd` `/stdd:complexity` `/stdd:confirm` `/stdd:constitution` `/stdd:context` `/stdd:continue` `/stdd:contract` `/stdd:dashboard` `/stdd:depcheck` `/stdd:design` `/stdd:docs` `/stdd:doctor` `/stdd:elicitation` `/stdd:execute` `/stdd:explore` `/stdd:extensions` `/stdd:factory` `/stdd:fix-packet` `/stdd:graph-history` `/stdd:graph-run` `/stdd:guard` `/stdd:help` `/stdd:hooks` `/stdd:init` `/stdd:issue` `/stdd:iterate` `/stdd:learn` `/stdd:list` `/stdd:memory` `/stdd:memory-scan` `/stdd:metrics` `/stdd:mock` `/stdd:mock-gen` `/stdd:modules` `/stdd:mutation` `/stdd:new` `/stdd:outside-in` `/stdd:parallel` `/stdd:pipeline` `/stdd:plan` `/stdd:prp` `/stdd:product-proposal` `/stdd:profile` `/stdd:progress` `/stdd:propose` `/stdd:recommend` `/stdd:roles` `/stdd:runtime` `/stdd:schema` `/stdd:skills` `/stdd:spec` `/stdd:spec-generator` `/stdd:start` `/stdd:starters` `/stdd:status` `/stdd:story` `/stdd:sudo` `/stdd:supervisor` `/stdd:tdd-init` `/stdd:turbo` `/stdd:ui` `/stdd:update` `/stdd:user-test` `/stdd:validate` `/stdd:verify` `/stdd:vision` `/stdd:waiver-manager` `/stdd:workspace`

**技能模块**: `/stdd:api-spec` `/stdd:apply` `/stdd:archive` `/stdd:brainstorm` `/stdd:builder` `/stdd:certainty` `/stdd:clarify` `/stdd:commit` `/stdd:complexity` `/stdd:confirm` `/stdd:constitution` `/stdd:context` `/stdd:continue` `/stdd:contract` `/stdd:dashboard` `/stdd:design` `/stdd:docs` `/stdd:execute` `/stdd:explore` `/stdd:factory` `/stdd:ff` `/stdd:final-doc` `/stdd:fix-packet` `/stdd:graph` `/stdd:guard` `/stdd:help` `/stdd:init` `/stdd:issue` `/stdd:iterate` `/stdd:learn` `/stdd:memory` `/stdd:metrics` `/stdd:mock` `/stdd:modules` `/stdd:mutation` `/stdd:new` `/stdd:outside-in` `/stdd:parallel` `/stdd:plan` `/stdd:product-proposal` `/stdd:profile` `/stdd:propose` `/stdd:prp` `/stdd:roles` `/stdd:schema` `/stdd:spec` `/stdd:supervisor` `/stdd:turbo` `/stdd:ui` `/stdd:user-test` `/stdd:validate` `/stdd:verify` `/stdd:vision`

---

## 快速开始

### 场景 1: 简单明确需求

```bash
# 一键生成所有产物并实现
/stdd:ff 实现一个支持 Markdown 导出的 todo-list
```

### 场景 2: 需求需要澄清

```bash
# 1. 创建变更
/stdd:new 实现用户认证功能

# 2. 逐步生成产物
/stdd:continue  # 生成 proposal.md
/stdd:continue  # 生成 specs/*.feature
/stdd:continue  # 生成 design.md
/stdd:continue  # 生成 tasks.md

# 3. 实现
/stdd:apply

# 4. 验证并归档
/stdd:verify
/stdd:archive
```

### 场景 3: 需求表达不出来

```bash
# 1. 自由探索
/stdd:explore 理解现有的认证系统

# 2. 基于探索创建变更
/stdd:new 基于探索结果，优化认证流程

# 3. 后续同场景 2
...
```

### 场景 4: 一键 Turbo

```bash
# 自动完成所有阶段: propose → clarify → confirm → spec → plan → execute
/stdd:turbo "实现用户登录，支持邮箱和 OAuth"
```

### 场景 5: Bug 修复

```bash
/stdd:issue  # Bug 分类 → 失败测试先行 → 最小修复 → 回归验证
```

### 场景 6: 头脑风暴

```bash
/stdd:brainstorm  # 纯分析建议模式，5 维度分析 + 多方案对比
```

---

## 完整实战流

### CLI Workflow: 单项目 Feature

```bash
cd ~/projects/my-app
stdd init
stdd ff "add markdown export for todo items" --change-name add-markdown-export
stdd spec add-markdown-export
stdd api-spec add-markdown-export
stdd tdd init
stdd apply add-markdown-export --test-command "npm test"
stdd continue add-markdown-export --test-command "npm test"
stdd mutation add-markdown-export
stdd verify add-markdown-export --lint
stdd guard --strict
stdd archive add-markdown-export
stdd commit add-markdown-export
```

说明：`stdd apply` 是最小 TDD runner，会选择待办任务、运行测试、更新 `tasks.md`，并在可识别测试框架时注入 STDD Reporter 以保留更好的 evidence。`stdd mutation` 建议在 `apply` 后、`verify` 前运行，用 quick 启发式 mutation score / anti-fake-green 或 Stryker 真实 mutation 生成 Article 2 evidence。`stdd commit` 生成 Conventional Commit 风格提交信息，不会自动执行 `git commit`。

### CLI Workflow: Bugfix

```bash
stdd issue "login page crashes when password is empty" --severity high --title "Fix empty password crash"
stdd spec fix-empty-password-crash
stdd apply fix-empty-password-crash --task TASK-001 --test-command "npm test"
stdd mutation fix-empty-password-crash --mode quick
stdd verify fix-empty-password-crash --no-constitution
stdd constitution check
stdd archive fix-empty-password-crash
```

说明：`stdd issue` 会生成包含复现步骤、期望/实际行为和 Red/Green/Blue 任务结构的 bugfix change。失败测试先行和最小修复仍需要开发者或外部 AI 编码器根据任务执行。

### CLI Workflow: Monorepo Workspace

```bash
cd ~/projects/platform
stdd init
stdd workspace repair
stdd workspace list
stdd workspace validate

stdd ff "add billing webhook retry" --workspace packages/api --change-name add-billing-webhook-retry
stdd spec add-billing-webhook-retry --workspace packages/api
stdd api-spec add-billing-webhook-retry --workspace packages/api
stdd apply add-billing-webhook-retry --workspace packages/api
stdd mutation add-billing-webhook-retry --workspace packages/api
stdd verify add-billing-webhook-retry --workspace packages/api --lint
stdd metrics add-billing-webhook-retry --workspace packages/api
stdd graph recommend --workspace packages/api
stdd archive add-billing-webhook-retry
```

说明：workspace registry 写入 `stdd/config.yaml` 的 `workspaces.items`。多数实现类 CLI 支持 `--workspace <path-or-package>`，测试和 mutation 命令会优先在对应包目录解析并执行，例如 `stdd mutation add-billing-webhook-retry --workspace packages/api`。

### CLI Workflow: Constitution / Guard

```bash
stdd constitution status
stdd constitution check
stdd constitution fix --article 2 --dry-run
stdd constitution fix --article 2
stdd constitution waive 2 --reason "Legacy migration" --days 7
stdd constitution audit
stdd hooks install
stdd hooks verify
stdd guard --strict
stdd ci github
```

说明：`constitution check` 直接扫描源码、测试、依赖、CI、风格和安全规则；Article 2 现在包含测试文件存在、覆盖率 gate 和 mutation evidence gate；`fix` 只修复/生成可安全自动化的部分；`audit` 聚合 `mutation`/`verify`/`guard` 保存的 evidence；`guard` 适合 Git hooks 和 CI 质量门禁。

### Mutation Gate

```bash
stdd apply add-dark-mode
stdd mutation add-dark-mode
stdd mutation add-dark-mode --mode quick
stdd mutation add-dark-mode --mode stryker
stdd mutation add-dark-mode --workspace packages/api
stdd verify add-dark-mode
```

`stdd mutation [change]` 会写入 mutation evidence，供 `stdd verify`、Article 2 和 `stdd constitution audit` 使用。quick 模式通过启发式 mutation score、断言质量、跳过测试、空测试和 anti-fake-green 信号评估测试有效性；stryker 模式仅在项目安装并可运行 Stryker 时执行真实 mutation testing。该命令支持 `--workspace <path-or-package>`，在 monorepo 中按包解析源码、测试和执行目录。

### Coverage / Metrics / Guard

```bash
stdd metrics
stdd metrics --json
stdd metrics --workspace packages/api
stdd guard
stdd guard --workspace packages/api
```

`metrics` 提供文件数、源码/测试行数、测试比率、复杂度、lint 状态、Constitution 健康度和 workspace 统计。`guard` 是 coverage report-aware 的质量门禁：当前实现会估算测试文件覆盖比例、检测测试命令覆盖，并在 `verify`/`guard` 中通过 reporter injection 捕获更完整证据；如项目测试框架产生覆盖报告，可由外部 CI 或后续 reporter 扩展纳入同一 evidence/audit 流。

### 1. 初始化项目 (首次使用)

```bash
/stdd:init
```

**系统动作**:
- 检测项目类型 (Node.js/Java/Python/Rust)
- 识别技术栈 (框架/测试框架/构建工具)
- 创建目录结构
- 生成记忆文件 (`stdd/memory/foundation.md`)
- 检查项目愿景文档 (`vision.md`)
- 配置命令和技能

**输出示例**:
```
初始化 STDD Copilot

项目分析
┌─────────────────┬──────────────────────┐
│ 项目类型        │ Node.js               │
│ 框架            │ React 18 + TypeScript│
│ 测试框架        │ Vitest               │
│ 构建工具        │ Vite                 │
└─────────────────┴──────────────────────┘

初始化完成！

快速开始:
  /stdd:new <需求>    创建第一个变更
  /stdd:ff <需求>     快速生成所有产物
  /stdd:turbo <需求>  一键全流程
```

---

### 2. 创建变更提案

```bash
/stdd:new 实现一个支持 Markdown 导出的 todo-list
```

**生成文件**: `stdd/changes/change-YYYYMMDD-HHMMSS/proposal.md`

**自动触发澄清**:
```
> [系统]: 数据持久化方式是？(localStorage / IndexedDB)
> 你: localStorage
> [系统]: 导出触发点是按钮还是自动保存？
> 你: 按钮
```

---

### 3. Fast-Forward 快速模式

```bash
/stdd:ff 实现用户登录功能，支持邮箱密码和 OAuth
```

**一键生成**:
```
stdd/changes/change-YYYYMMDD-HHMMSS/
├── proposal.md      # 需求提案
├── specs/
│   └── login.feature   # BDD 规格
├── design.md        # 设计文档
└── tasks.md         # 任务列表
```

---

### 4. 实现 (TDD 循环)

```bash
/stdd:apply
```

**Ralph Loop 流程**:
```
┌──────────────────────────────────────────────────────┐
│                    Ralph Loop                         │
│                                                     │
│  🔴 红灯  →  🔍 静态检查  →  🟢 绿灯  →           │
│  生成失败测试    语法/类型检查    最简实现           │
│                                                     │
│  →  🧪 伪变异审查  →  🔵 重构  →  ✅ 完成           │
│     检测骗绿灯断言     优化代码                       │
│                                                     │
│  ⚠️ 容错: 策略调整 → 跨模型降级 → 🔴 熔断回滚      │
└──────────────────────────────────────────────────────┘
```

**选项**:
```bash
/stdd:apply                    # 执行所有待办任务
/stdd:apply --task=TASK-001    # 执行特定任务
/stdd:apply --next             # 执行下一个任务
/stdd:apply --fix              # 修复失败的测试
```

---

### 5. 验证

```bash
/stdd:verify
```

**验证维度**:
| 维度 | 检查项 |
|------|--------|
| 接口一致性 | API 签名与规范一致 |
| 行为一致性 | BDD 场景全部通过 |
| 类型一致性 | TypeScript 类型正确 |
| 边界条件 | 空值/异常/边界值处理 |
| 文档一致性 | 代码注释与规范匹配 |
| 3D 验证 | 完整性 + 正确性 + 一致性 |

---

### 6. 归档

```bash
/stdd:archive
```

**归档流程**:
```
1. 运行验证 /stdd:verify
2. 同步规格 sync → stdd/specs/
3. 生成总结 archive.md
4. 移动到 archive/
5. 状态更新 → 已完成
```

---

## 变更管理

### 变更状态流转

| 状态 | 标识 | 说明 |
|------|------|------|
| 待启动 | 📝 | proposal.md 创建 |
| 规格中 | 📋 | specs/*.feature 生成中 |
| 设计中 | 🎨 | design.md 生成中 |
| 任务就绪 | 📝 | tasks.md 生成完成 |
| 实现中 | 🔧 | /stdd:apply 执行中 |
| 已完成 | 📦 | 归档完成 |

### 持久计划状态

中断后可通过 `--resume` 恢复：

```bash
/stdd:plan --resume    # 从上次中断点继续
/stdd:plan --status    # 查看当前状态
```

状态保存在 `stdd/changes/<change-name>/.state.yaml`。

---

## 完整命令参考

### CLI 命令

| 命令 | 说明 |
|------|------|
| `stdd init [path]` | 初始化项目 (`--force` 覆盖, `--skip-skills` 跳过技能) |
| `stdd update [path]` | 更新 STDD 文件 (`--force` 强制更新) |
| `stdd list` / `stdd ls` | 列出变更 (`--specs`, `--archived`, `--json`) |
| `stdd status [change]` | 查看变更状态 (`--json`) |
| `stdd ff <description>` | 快速创建 change、proposal、tasks 和 specs 目录 (`--workspace`, `--change-name`) |
| `stdd spec <change>` | 从 tasks 生成 BDD feature (`--merge`, `--workspace`) |
| `stdd api-spec [change]` | 从 BDD feature 生成 OpenAPI (`--format`, `--workspace`) |
| `stdd apply [change]` | 执行下一个任务并运行测试 (`--task`, `--test-command`, `--workspace`, `--dry-run`, `--delegate`, `--e2e-command`) |
| `stdd continue [change]` | 从最近任务状态继续 (`--force`, `--test-command`, `--dry-run`) |
| `stdd mutation [change]` | 生成 mutation evidence (`--mode quick|stryker`, `--workspace`) |
| `stdd verify [change]` | 验证任务、测试、Constitution 和 evidence (`--lint`, `--workspace`, `--no-constitution`) |
| `stdd archive [change]` | 归档完成变更并合并 delta specs 到主 specs |
| `stdd commit [change]` | 生成提交信息 (`--format json`, `--tdd`, `--phase`, `--issue`, `--require-issue`) |
| `stdd issue <description>` | 创建 bugfix TDD 变更 (`--severity`, `--workspace`) |
| `stdd turbo <description>` | 一键 FF + spec + TDD scaffold (`--workspace`, `--no-spec`) |
| `stdd explore [scope]` | 只读探索架构、测试缺口和建议 (`--json`, `--output`) |
| `stdd new change <name>` | 创建新变更 (`--title`, `--description`) |
| `stdd tdd init` | 为缺失测试生成脚手架 (`--source-dir`, `--dry-run`) |
| `stdd guard` | 全局质量门禁 (`--strict`, `--workspace`, `--no-constitution`) |
| `stdd metrics [change]` | 项目/变更质量指标 (`--json`, `--workspace`) |
| `stdd context [layer]` | 预览/导出 memory context (`--export`, `--workspace`) |
| `stdd ci [platform]` | 生成 CI 配置，默认 GitHub Actions |
| `stdd starters list/create` | 管理项目 starter 模板 |
| `stdd workspace list/validate/repair` | 管理 monorepo workspace registry |
| `stdd depcheck [path]` | 检测未使用的 dependencies (支持 workspace，集成于 Article 1) |
| `stdd schema validate [file]` | 验证 JSON/YAML schemas 语法 (集成于 Article 9) |
| `stdd schema create <name>` | 创建 workflow schema |
| `stdd schema fork <source> <name>` | fork 现有 workflow schema |
| `stdd contract generate [change]` | 从 API 规格生成消费者驱动契约 (SDD 增强) |
| `stdd contract verify [change]` | 验证契约与规格一致性 (SDD 增强) |
| `stdd validate [change]` | 验证规格一致性和 Spec Guardian 泄漏检测 (`--spec-guardian`, `--fix`) |
| `stdd mock [change]` | 生成 Mock 数据和 Stubs (SDD 增强) |
| `stdd story create/bdd` | 创建 Story Mapping YAML，并可生成 BDD feature |
| `stdd user-test [change]` | 生成人工/AI 双模式用户测试脚本 |
| `stdd pipeline [change]` | 从 specs 生成 parser IR 与 acceptance test skeleton |
| `stdd fix-packet [change]` | 生成 Golden Packet 风格失败修复上下文；`apply` 测试失败时自动写入 evidence |
| `stdd outside-in init/scaffold/status` | 管理外向内 TDD layer registry，并生成 E2E/集成/单元测试骨架 |
| `stdd extensions list/install/validate/publish` | 管理 extension catalog、本地安装与发布校验 |
| `stdd graph run/history/recommend` | CLI Graph 执行、历史和推荐 |
| `stdd builder agent/workflow/skill/list/validate/share/export` | 自定义 Agent、工作流、Skill 构建器 |
| `stdd ui generate <type> <name>` | 多框架 UI 页面/组件生成（React / Vue / Angular / Svelte） |
| `stdd modules list/install/info/uninstall/registry` | 模块市场管理 |
| `stdd dashboard generate/open/serve` | 项目健康仪表板（静态 HTML） |
| `stdd docs generate/serve` | 文档站点生成（Astro + Starlight 风格） |
| `stdd profile create/select/show/list/edit` | 规划配置文件管理 |
| `stdd adapt generate/list` | IDE 配置适配生成（多引擎自动配置） |
| `stdd recommend [change]` | 基于当前状态推荐下一步 |
| `stdd skills` | 列出所有技能 (`--phase <1-5>`) |
| `stdd commands` | 列出 Claude Code 斜杠命令 |
| `stdd hooks install` | 安装 AI Code 引擎 Hooks |
| `stdd hooks verify` | 验证 Hooks 状态 |
| `stdd hooks status` | 查看 Hooks 状态 |
| `stdd hooks disable` | 禁用 Hooks |
| `stdd hooks enable` | 恢复 Hooks |
| `stdd constitution` | 查看所有条例 |
| `stdd constitution show 2` | 查看指定条例详情 |
| `stdd constitution check` | 触发 CLI 侧 Constitution 检查入口 |
| `stdd constitution status` | 输出合规健康状态 (`--json`, `--workspace`) |
| `stdd constitution fix` | 自动修复/生成部分合规产物 (`--article`, `--dry-run`, `--workspace`) |
| `stdd constitution audit` | 聚合 evidence 审计趋势 (`--json`, `--workspace`) |
| `stdd constitution waive <article>` | 添加临时豁免 (`--reason`, `--days`, `--force`) |
| `stdd runtime agent` | 管理多 Agent 交互模拟 (启动/推进/停止) |
| `stdd runtime sudo` | 解析 SudoLang 并生成 STDD 产物 |

可直接复制的示例与 `README.md` 保持同步：

```bash
stdd init                    # 初始化项目
stdd init /path/to/project   # 指定目录
stdd init --force            # 强制覆盖

stdd list                    # 列出活跃变更
stdd list --specs            # 列出规格
stdd list --archived         # 包含已归档
stdd list --json             # JSON 格式

stdd status                  # 整体状态
stdd status add-dark-mode    # 特定变更状态

stdd ff "add dark mode"      # 快速创建 proposal/tasks/specs 基础产物
stdd spec add-dark-mode      # 从 tasks.md 生成 BDD feature
stdd api-spec add-dark-mode  # 从 feature 生成 OpenAPI 规范
stdd apply add-dark-mode     # 执行下一个任务并运行测试
stdd apply add-dark-mode --delegate              # 失败时记录跨模型委托 evidence
stdd apply add-dark-mode --e2e-command "npm run e2e"  # 运行 E2E probe
stdd fix-packet add-dark-mode  # 手动生成失败修复上下文包 (Golden Packet)
stdd mutation add-dark-mode  # quick 启发式 mutation score / anti-fake-green，并保存 evidence
stdd continue add-dark-mode  # 从最近任务状态继续
stdd verify add-dark-mode    # 验证任务、测试、Constitution、证据
stdd archive add-dark-mode   # 归档完成变更并合并 delta specs
stdd commit add-dark-mode --tdd --phase red --issue 42  # 生成 TDG 阶段提交信息

stdd issue "login crashes"   # 创建 bugfix TDD 变更
stdd turbo "add login"       # FF + spec + TDD scaffold
stdd explore auth            # 只读探索并输出建议

stdd new change add-dark-mode      # 创建新变更

stdd tdd init                # 为缺失测试生成脚手架
stdd guard                   # 全局质量门禁，含 coverage report-aware 测试比率估计
stdd metrics                 # 项目/变更质量指标
stdd context --export        # 导出 STDD 上下文
stdd ci                      # 生成 CI 配置并集成 guard
stdd starters list           # 列出 starter 模板
stdd starters create my-app --type typescript

stdd workspace list          # 列出 workspace registry 或动态检测结果
stdd workspace validate      # 校验 monorepo workspace registry
stdd workspace repair        # 刷新 stdd/config.yaml workspace registry

stdd depcheck [path]         # 检测未使用的 dependencies (支持 workspace)
stdd depcheck packages/api   # 检测指定包的未使用依赖
stdd schema validate         # 验证所有 JSON/YAML schemas
stdd schema validate schemas/spec-driven/  # 验证指定目录的 schemas
stdd schema create custom-flow
stdd schema fork schemas/spec-driven/schema.yaml custom-flow

stdd contract generate add-dark-mode   # 从 API 规格生成消费者契约
stdd contract verify add-dark-mode     # 验证契约与规格一致性
stdd validate add-dark-mode --spec-guardian --fix  # 规格一致性 + 泄漏检测
stdd mock add-dark-mode                # 生成 Mock 数据和 Stubs

stdd story create checkout-flow
stdd story bdd stdd/journeys/checkout-flow.yaml
stdd user-test add-dark-mode
stdd pipeline add-dark-mode
stdd outside-in init
stdd outside-in scaffold add-dark-mode
stdd extensions list
stdd extensions install ./my-extension
stdd extensions validate
stdd runtime agent start "Design Auth" --rounds 3
stdd runtime agent next
stdd runtime sudo design.sudo --generate

stdd graph run feature       # 基于动态 DAG 执行 workflow，含 outside-in 节点
stdd graph run --intent repair --change-name add-dark-mode  # 从 fix-packet 修复上下文开始
stdd graph history           # 查看 graph 执行历史
stdd graph recommend         # 推荐下一步
stdd recommend               # CLI 侧下一步推荐

stdd progress                # 查看进度历史 (最近 20 条)
stdd progress --summary      # 进度总览 (总命令/成功/失败/中断)
stdd progress --resume       # 断点恢复上下文 (中断后推荐续传命令)
stdd progress --json         # JSON 输出
stdd progress --clear        # 清空进度日志

stdd skills                  # 列出所有技能

stdd commands                # 列出 Claude Code 斜杠命令
stdd constitution            # 查看所有条例
stdd constitution show 2     # 查看 Article 2 详情
stdd constitution check      # 触发 CLI 侧合规检查入口
stdd constitution status     # 查看合规健康状态
stdd constitution fix        # 自动修复/生成部分合规产物
stdd constitution audit      # 聚合 evidence 审计趋势
stdd constitution waive 2 --reason "Legacy migration" --days 7
stdd hooks install           # 安装 Hooks
stdd hooks verify            # 验证 Hooks
stdd hooks status            # 查看 Hooks 状态
stdd hooks disable           # 禁用 Hooks
stdd hooks enable            # 恢复 Hooks

stdd product-proposal        # 聚合所有产物生成产品方案报告 (15 章节)
stdd product-proposal --json # JSON 结构化输出
stdd product-proposal --output my-report.md  # 自定义输出路径

stdd builder list            # 列出所有自定义构建产物
stdd builder agent my-agent  # 创建自定义 Agent
stdd builder workflow my-wf  # 创建自定义工作流
stdd builder skill my-skill  # 创建自定义 Skill

stdd ui generate component Button --framework react  # 生成 React 组件
stdd ui generate page Dashboard --framework vue  # 生成 Vue 页面

stdd modules list            # 列出可用模块
stdd modules install <name>  # 安装模块

stdd dashboard generate      # 生成项目健康仪表板
stdd dashboard open          # 在浏览器中打开仪表板

stdd docs generate           # 生成文档站点
stdd docs serve              # 启动文档站点预览服务

stdd profile list            # 列出所有规划配置
stdd profile select <name>   # 选择规划配置文件

stdd adapt list              # 列出可用 IDE 适配器
stdd adapt generate          # 生成所有 IDE 配置
stdd adapt setup <ide>       # 为特定 IDE 生成配置
```

### 核心流程 (斜杠命令)

| 命令 | 说明 |
|------|------|
| `/stdd:init` | 初始化项目，创建目录结构和配置 |
| `/stdd:new <需求>` | 创建新变更提案 |
| `/stdd:propose` | 提出需求草案 |
| `/stdd:clarify` | 需求澄清 (78 种结构化推理方法) |
| `/stdd:confirm` | 需求确认门 |
| `/stdd:spec` | 生成 BDD 规格 + Test Pipeline |
| `/stdd:plan` | 任务拆解 + ADR 记录 + 持久状态 |
| `/stdd:apply` | 实现任务 (Ralph Loop TDD) |
| `/stdd:execute` | Ralph Loop 执行循环 |
| `/stdd:verify` | 验证规范一致性 (含 3D 验证) |
| `/stdd:archive` | 归档变更 |
| `/stdd:ff <需求>` | Fast-Forward 快速生成所有产物 |
| `/stdd:continue` | 继续生成下一个产物 |
| `/stdd:explore [目标]` | 自由探索模式 (只读) |
| `/stdd:turbo <需求>` | One-Shot 一键全流程 (Skill 触发) |
| `/stdd:brainstorm` | 纯分析建议模式 |
| `/stdd:issue` | Bug/Issue TDD 修复流程 |

### Graph 引擎

| 命令 | 说明 |
|------|------|
| `/stdd:graph visualize` | 可视化 Skill 依赖图 |
| `/stdd:graph analyze` | 分析当前状态 |
| `/stdd:graph run <skill>` | 从指定 Skill 开始执行 |
| `/stdd:graph parallel` | 并行执行 |
| `/stdd:graph history` | 执行历史 |
| `/stdd:graph replay <id>` | 回放执行 |
| `/stdd:graph recommend` | 智能推荐 |

### SDD 增强

| 命令 | 说明 |
|------|------|
| `/stdd:api-spec` | API 规范先行 (OpenAPI/TypeScript) |
| `/stdd:schema` | 类型规范先行 (JSON Schema/Zod) |
| `/stdd:contract` | 契约测试 (5 种消息模式) |
| `/stdd:validate` | 规范验证 + Spec Guardian |
| `stdd contract generate [change]` | 从 API 规格生成消费者驱动契约 |
| `stdd contract verify [change]` | 验证契约与规格一致性 |
| `stdd validate [change]` | 验证规格一致性 (tasks vs specs) |
| `stdd mock [change]` | 生成 Mock 数据和 Stubs |

### TDD 增强

| 命令 | 说明 |
|------|------|
| `/stdd:outside-in` | 外向内 TDD (E2E → 集成 → 单元) |
| `/stdd:mock` | 自动 Mock 生成 |
| `/stdd:factory` | 测试数据工厂 (Builder/Faker) |
| `/stdd:mutation` | 变异测试 (Quick + Deep 双模式) |

### 辅助功能 (Skill 驱动入口)

> 本组能力多数由 Skill 实现驱动。为避免 taxonomy 混淆，下表统一使用用户可见的 `/stdd:*` 会话入口名；是否存在独立 command 文件，请以 `.claude/commands/stdd/` 与 `.claude/skills/stdd/` 的实际内容为准。

| 功能 | 统一入口 | 说明 |
|------|----------|------|
| TDD 守护 | `/stdd:guard` | TDD 守护钩子 + Anti-Bypass 防绕过 |
| Constitution | `/stdd:constitution` | Constitution 管理 (9 篇条例 + 豁免) |
| PRP 规划 | `/stdd:prp` | PRP 结构化规划 (What/Why/How/Success) |
| Design | `/stdd:design` | 生成技术设计文档 (ADR 记录) |
| Supervisor | `/stdd:supervisor` | 多 Agent 协调器 (Supervisor 模式) |
| Context | `/stdd:context` | 三层文档架构 (渐进式加载) |
| Iterate | `/stdd:iterate` | 自主迭代循环 (Plan-Execute-Reflect) |
| Memory | `/stdd:memory` | 向量数据库记忆 (语义搜索) |
| Parallel | `/stdd:parallel` | 并行执行模式 (DAG 调度) |
| Roles | `/stdd:roles` | 12 Agent 角色协作 (含对抗式审查) |
| Metrics | `/stdd:metrics` | 质量指标仪表板 |
| Learn | `/stdd:learn` | 自适应学习 + Pattern Teaching |
| Certainty | `/stdd:certainty` | 5 维度置信度评分 |
| Complexity | `/stdd:complexity` | APP Mass 代码质量计算 |
| Vision | `/stdd:vision` | 项目愿景文档管理 |
| Product Proposal | `/stdd:product-proposal` | 从所有产物生成产品方案报告 |
| User Test | `/stdd:user-test` | 用户测试脚本生成 |
| Help | `/stdd:help` | 上下文感知帮助系统 |
| Final Doc | `/stdd:final-doc` | 生成最终文档 |
| Commit | `/stdd:commit` | 原子化提交 (red:/green:/refactor: 前缀) |
| Fix Packet | `/stdd:fix-packet` | 失败任务诊断修复包 (Golden Packet) |
| Builder | `/stdd:builder` | 自定义 Agent/工作流/Skill 构建器 |
| UI Generator | `/stdd:ui` | 多框架 UI 页面/组件生成 |
| Modules | `/stdd:modules` | 模块市场管理 |
| Dashboard | `/stdd:dashboard` | 项目健康仪表板 |
| Docs Site | `/stdd:docs` | 文档站点生成 |
| Profile | `/stdd:profile` | 规划配置文件管理 |

---

## 5 级防跑偏防御体系

| 级别 | 机制 | 说明 |
|------|------|------|
| 1 | 人机确认门 | 关键决策需人类确认 (HITL 3 模式可配置) |
| 2 | 微任务隔离 | 5~6 个原子任务，降低上下文迷失 |
| 3 | 连续失败回滚 | 4 阶段容错 (策略调整→降级→熔断→回滚) |
| 4 | 静态质检门 | 语法/类型检查在测试前执行 |
| 5 | 伪变异审查 | 检测骗绿灯断言 |

---

## 最佳实践

1. **首次使用先初始化** — 运行 `/stdd:init` 创建工作区
2. **简单需求用 ff** — 明确需求直接 `/stdd:ff` 一键完成
3. **一键全流程用 turbo** — `/stdd:turbo` 自动完成所有阶段
4. **复杂需求逐步生成** — 使用 `/stdd:continue` 允许中间干预
5. **启用守护** — 运行 `/stdd:guard on` 强制 TDD 纪律
6. **小步快跑** — 每个变更控制在 5~6 个任务
7. **测试先行** — 严格遵守 Ralph Loop，红灯 → 绿灯 → 重构
8. **持续验证** — 完成后运行 `/stdd:verify` 确保一致性
9. **监控质量** — 定期运行 `/stdd:metrics` 查看质量指标
10. **使用 Graph 引擎** — `/stdd:graph recommend` 获取智能推荐
11. **配置 HITL 粒度** — 在 `stdd/config.yaml` 调整人机交互频率
12. **Docker 部署** — 使用 `docker-compose up -d` 一键启动容器化环境
13. **npm 脚本** — `npm run audit` 安全审计, `npm run test:coverage` 生成覆盖率报告, `npm run test:benchmark` 性能基准, `npm run premerge` 合并前全检

---

## 文档导航

- [项目首页](./README.md) - 项目概览和顶层示例
- [快速开始](./docs/getting-started.md) - 首次使用流程和 CLI 速查
- [CLI 使用指南](./docs/cli-guide.md) - CLI 完整文档
- [英文文档入口](./docs/en/README.md) - English docs index

---

> 参考: 借鉴自 OpenSpec 规范先行理念和 Stryker 变异测试

<!--
stdd init
stdd init /path/to/project
stdd init --force
stdd list
stdd list --specs
stdd list --archived
stdd list --json
stdd status
stdd status add-dark-mode
stdd new change add-dark-mode
stdd skills
stdd commands
stdd constitution
stdd constitution show 2
stdd constitution check
stdd hooks install
stdd hooks verify
stdd hooks status
stdd hooks disable
stdd hooks enable
-->
