# STDD Copilot Ultra v2.0.0 — 完整命令参考

> **Smart Team-Driven Development · AI 全生命周期开发平台**
> 最后更新：2026-06-01 · 适用于 `@marcher-lam/stdd-copilot-ultra@2.0.0`

---

## 1. 核心 STDD 工作流（11 个）

核心工作流覆盖从初始化到归档的完整生命周期。每个阶段产出文件化证据链，支持断点续传。

| 斜杠命令 | CLI 命令 | 功能描述 |
|----------|---------|---------|
| `/stdd:init` | `stdd init [path]` | 初始化 STDD 工作区。生成 `stdd/` 目录结构、配置文件 `config.yaml`、memory 模板、skills 模板。支持 `--force` 覆盖、`--skip-skills` 跳过技能复制、`-y` 非交互模式 |
| `/stdd:new` | `stdd new change <name>` | 创建新变更目录 `stdd/changes/<name>/`，包含 `proposal.md`、`tasks.md`、`evidence/` 等初始文件。支持 `--title` 设置标题 |
| `/stdd:propose` | `stdd propose [action] [name]` | 需求提案草拟。Actions: `draft`（创建提案）、`show`（查看）、`refine`（精炼）、`validate`（验证完整性）、`split`（拆分复杂需求）。支持 `--description`、`--force`、`--dry-run` |
| `/stdd:clarify` | `stdd clarify [action] [change]` | 多轮需求澄清。Actions: `clarify`（执行澄清）、`questions`（生成澄清问题）、`edge-cases`（边界情况分析）、`constraints`（约束识别）。支持 `--rounds`（轮数，默认 3）、`--focus`（聚焦领域） |
| `/stdd:confirm` | `stdd confirm [change]` | 人类确认门。展示提案摘要和澄清结果，请求用户批准后进入规格阶段。支持 `--skip` 自动确认 |
| `/stdd:spec` | `stdd spec <change>` | 从任务生成 BDD 规格。产出 `stdd/specs/features/` 和 `stdd/specs/scenarios/`。支持 `--merge` 与已有规格合并 |
| `/stdd:plan` | `stdd plan [action] [change]` | 架构评估与微任务拆解。Actions: `generate`（生成任务列表）、`show`（查看）、`estimate`（时间估算）、`dependencies`（依赖分析）。支持 `--tasks`（目标任务数）、`--estimate` |
| `/stdd:apply` | `stdd apply [change]` | Ralph Loop TDD 实现。执行 红→绿→重构 循环。支持 `--task <id>`、`--phase red\|green\|refactor`、`--dry-run`、`--delegate`（失败时写委派证据）、`--e2e-command`、`--allow-no-tests`、`--workspace` |
| `/stdd:execute` | `stdd execute [action] [change]` | Ralph Loop 闭环执行器。Actions: `run`（执行 TDD 循环）、`status`（查看状态）、`evidence`（查看证据）、`retry`（重试失败任务）。支持 `--phase`、`--max-tasks` |
| `/stdd:verify` | `stdd verify [change]` | 5 维验证 + 宪法检查。验证测试通过、覆盖率达标、宪法合规、证据完整。支持 `--no-constitution`、`--lint`、`--lint-command`、`--test-command`、`--workspace` |
| `/stdd:archive` | `stdd archive [change]` | Delta Spec Merge 归档。合并变更规格到主规格库，移动证据到 `stdd/changes/archive/`，生成归档报告 |

---

## 2. 工作流增强（6 个）

快捷通道和增强工具，加速常见工作流模式。

| 斜杠命令 | CLI 命令 | 功能描述 |
|----------|---------|---------|
| `/stdd:ff` | `stdd ff <description>` | **快速通道**：提案→规格→任务一步到位。自动创建变更、生成提案、拆解任务。支持 `--change-name`、`--workspace` |
| `/stdd:continue` | `stdd continue [change]` | **断点续传**：读取 `stdd/changes/*/progress.jsonl`，恢复中断的工作。支持 `--force`、`--dry-run`、`--test-command` |
| `/stdd:explore` | `stdd explore [scope]` | **深度项目探索**：分析项目架构、技术栈、模块依赖、代码模式。产出 `stdd/memory/exploration.md`。支持 `--output`、`--json` |
| `/stdd:turbo` | `stdd turbo <description>` | **一键全流程**：自动执行 propose→confirm→spec→plan→apply→verify→archive 全链路。仅在确认点和归档点暂停。支持 `--change-name`、`--no-spec` |
| `/stdd:brainstorm` | `stdd brainstorm <topic...>` | **多策略头脑风暴**：内置 10+ 启发式方法（第一性原理、SCAMPER、逆向思维等）。支持 `--method <id>`（指定方法）、`--list`（列出方法）、`--json` |
| `/stdd:issue` | `stdd issue <description>` | **Bug 修复入口**：创建 bugfix 变更，自动标记严重度，生成修复提案。支持 `--title`、`--severity`、`--workspace` |

---

## 3. SDD 增强 — 规格驱动（4 个）

Spec-Driven Development 工具链，在编码前锁定接口和数据契约。

| 斜杠命令 | CLI 命令 | 功能描述 |
|----------|---------|---------|
| `/stdd:api-spec` | `stdd api-spec [change]` | **OpenAPI 规范生成**：从需求自动生成 OpenAPI 3.0 规范。产出 `stdd/specs/openapi.yaml`。支持 `--format yaml\|json`（默认 yaml）、`--workspace` |
| `/stdd:schema` | `stdd schema <subcommand>` | **类型/数据 Schema 管理**。Subcommands: `validate [path]`（验证 Schema 合规）、`create <name>`（创建工作流 Schema）、`fork <source> <name>`（派生 Schema）。支持 `--strict`、`--force`、`--json` |
| `/stdd:contract` | `stdd contract <action> [change]` | **契约测试**：生成消费者/提供者契约。Actions: `generate`、`verify`、`list`。支持 `--consumer`、`--provider`、`--workspace` |
| `/stdd:validate` | `stdd validate [change]` | **规格验证 + Spec Guardian**：检查规格一致性、实现泄漏。支持 `--spec-guardian`（实现泄漏检测）、`--fix`（写入修复建议）、`--json` |

---

## 4. TDD 增强 — 测试驱动（6 个）

强化 TDD 实践的专用工具，覆盖从测试脚手架到变异测试的全链路。

| 斜杠命令 | CLI 命令 | 功能描述 |
|----------|---------|---------|
| `/stdd:outside-in` | `stdd outside-in [action] [change]` | **外向内 TDD**：生成分层测试骨架（E2E→集成→单元）。Actions: `init`（创建注册表）、`plan`（生成层计划）、`scaffold`（生成测试文件）。支持 `--feature`、`--force`、`--json` |
| `/stdd:mutation` | `stdd mutation [change]` | **变异测试**：验证测试套件有效性。Modes: `quick`（Quick Heuristic，快速）、`stryker`（集成 Stryker）。支持 `--mode`、`--threshold`（分数阈值，默认 80）、`--workspace`、`--json` |
| `/stdd:mock` | `stdd mock [action] [target]` | **Mock 生成**：自动生成模块/函数/API Mock。Actions: `generate`、`list`、`validate`。支持 `--type module\|function\|api`、`--methods`、`--force`、`--json` |
| `/stdd:factory` | `stdd factory [action] [typeName]` | **测试数据工厂**：基于类型定义生成 Faker 数据工厂。Actions: `list`、`generate`、`validate`。支持 `--fields`（逗号分隔字段列表）、`--locale`（Faker 区域设置）、`--force`、`--json` |
| — | `stdd tdd-init [path]` | **TDD 脚手架初始化**：为项目生成测试配置和初始测试文件。支持 `--source-dir`、`--dry-run` |
| — | `stdd baby-steps [task]` | **Baby Steps TDD 引导**：交互式 TDD 猜谜游戏，引导用户逐步实现功能。适用于学习和教学场景 |

---

## 5. 质量与治理（8 个）

代码质量守护、宪法合规检查和依赖治理。

| 斜杠命令 | CLI 命令 | 功能描述 |
|----------|---------|---------|
| `/stdd:guard` | `stdd guard` | **TDD 守护钩子**：运行实时质量检查（宪法、TDD 合规）。支持 `--no-constitution`、`--workspace`、`--strict`（警告也视为失败）。可作为 Git pre-commit hook 使用 |
| `/stdd:constitution` | `stdd constitution [action] [target]` | **9 条质量宪法管理**。Actions: `show`（查看条例）、`check`（合规检查）、`fix`（自动修复）、`status`（状态）、`audit`（历史审计）、`waive`（豁免）。支持 `--article <n>`、`--force`、`--reason`、`--days`、`--dry-run`、`--lint`、`--json` |
| `/stdd:metrics` | `stdd metrics [change]` | **质量指标仪表板**：展示测试覆盖率、任务完成率、宪法合规率等指标。支持 `--workspace`、`--json` |
| `/stdd:fix-packet` | `stdd fix-packet [change]` | **Golden Packet 失败修复上下文**：为 AI 交接生成完整的失败上下文包，包含测试输出、代码差异、规格。支持 `--test-output`、`--test-command`、`--task`、`--json` |
| — | `stdd hooks <subcommand>` | **AI Code Hook 系统**。Subcommands: `install`（安装 hooks 到 AI 引擎配置）、`verify`（验证安装）、`status`（状态）、`disable`（禁用）、`enable`（启用）。支持 `-g/--global`、`-f/--force`、`--git`（同时安装 Git pre-commit hook）、`--article` |
| — | `stdd audit` | **历史合规审计**：扫描历史变更，生成宪法合规审计报告。支持 `--json` |
| — | `stdd depcheck [path]` | **依赖检查**：检测未使用、过时或已知漏洞的依赖。支持 `--workspace`、`--safe-list`、`--json` |
| — | `stdd doctor` | **项目健康检查**：验证 STDD 配置、文件完整性、工具链可用性。支持 `--json`、`--deep`（深度检查包括 audit 和 lint） |

---

## 6. Graph 引擎 — DAG 编排（8 个子命令）

基于 DAG（有向无环图）的工作流编排引擎，支持可视化、分析和并行执行。

| 斜杠命令 | CLI 命令 | 功能描述 |
|----------|---------|---------|
| `/stdd:graph` | `stdd graph <subcommand>` | **Graph 引擎入口**。4 种意图模式：`feature`（新功能）、`hotfix`（热修复）、`research`（探索分析）、`repair`（修复）、`brownfield`（接手遗留项目） |
| — | `stdd graph visualize` | **DAG 可视化**：输出 Mermaid 图、JSON 结构或 HTML 交互视图（自动打开浏览器）。支持 `--intent`、`--format mermaid\|json\|html`、`--output` |
| — | `stdd graph analyze` | **图结构分析**：展示节点数、边数、入口节点、终端节点、并行层数。支持 `--intent` |
| — | `stdd graph run` | **DAG 工作流执行**：按拓扑顺序执行完整 STDD 工作流。支持 `--intent`、`--change-name`、`--workspace`、`--skip-apply` |
| — | `stdd graph parallel` | **并行化分析**：检测可并行执行的层级。支持 `--intent`、`--detect` |
| — | `stdd graph history` | **执行历史**：查看 DAG 执行历史和证据。支持 `--json`、`--change`、`--workspace` |
| — | `stdd graph replay <id>` | **历史回放**：回放过去的 DAG 执行记录，查看详细结果。支持 `--json`、`--verbose` |
| — | `stdd graph recommend [change]` | **智能推荐**：基于项目状态推荐下一步操作。支持 `--json`、`--workspace` |

---

## 7. 协作与文档（9 个）

团队协作、文档生成和故事管理工作流。

| 斜杠命令 | CLI 命令 | 功能描述 |
|----------|---------|---------|
| `/stdd:commit` | `stdd commit [change]` | **提交消息生成**：基于变更内容生成结构化 commit message。支持 `--format text\|json`、`--tdd`（TDD 前缀）、`--phase red\|green\|refactor`、`--issue`、`--require-issue`。别名：`stdd commit-msg` |
| `/stdd:final-doc` | `stdd final-doc [change]` | **最终需求文档**：聚合所有阶段产物为 `FINAL_REQUIREMENT.md`。支持 `--output`（自定义输出文件名）、`--include-evidence`（包含执行证据）、`--json` |
| `/stdd:design` | `stdd design [action] [dir]` | **设计系统文档**：生成 `DESIGN.md`，包含 Design Tokens（颜色、排版、间距、圆角）。支持 `--preset modern\|dark\|minimal`、`--no-preview`（跳过预览 HTML）、`--force`、`--json` |
| `/stdd:prp` | `stdd prp [action] [title...]` | **PRP 结构化规划**：What/Why/How/Success 四段式规划。Actions: `create`、`show`、`update`。支持 `--what`、`--why`、`--how`、`--force`、`--json` |
| `/stdd:product-proposal` | `stdd product-proposal` | **产品提案文档**：生成结构化产品提案，包含市场分析、用户画像、功能规划。支持 `--json` |
| `/stdd:context` | `stdd context [layer]` | **三层文档架构**：展示项目上下文（Foundation/Components/Integration）。支持 `--export`、`--workspace`、`--format`、`--json` |
| `/stdd:user-test` | `stdd user-test [change]` | **用户测试脚本**：生成人类和 Agent 用户测试框架骨架。支持 `--human-only`、`--agent-only`、`--framework react\|vue\|vanilla`、`--json` |
| — | `stdd story [action] [name]` | **故事地图**：创建用户旅程并转换为 BDD 场景。Actions: `create`、`list`、`convert`。支持 `--persona`、`--goal`、`--force`、`--json` |
| — | `stdd pipeline [change]` | **Pipeline 骨架**：从规格生成 Parser IR 和验收测试骨架。支持 `--json` |

---

## 8. 高级与 AI Agent（10 个）

多 Agent 协作、运行时引擎、记忆系统和并行执行。

| 斜杠命令 | CLI 命令 | 功能描述 |
|----------|---------|---------|
| `/stdd:supervisor` | `stdd supervisor [action] [args...]` | **多 Agent 协调器**：管理 Agent 讨论轮次、角色分配、决策汇总。Actions: `status`、`start`、`stop`、`review`。支持 `--roles`（逗号分隔角色列表）、`--rounds`、`--json` |
| `/stdd:iterate` | `stdd iterate [action] [args...]` | **Plan-Execute-Reflect 迭代循环**：自主迭代改进。Actions: `status`、`plan`、`execute`、`reflect`。支持 `--plan`、`--reflection`、`--next`、`--json` |
| `/stdd:memory` | `stdd memory <action> [args...]` | **记忆管理**：扫描项目源码到记忆工件。Actions: `scan`（扫描）、`list`（列出）。支持 `--source-dir`、`--json` |
| `/stdd:parallel` | `stdd parallel [action] [intent]` | **DAG 并行执行**：并行运行多个 Skill。Actions: `status`、`run`、`plan`。支持 `-p`（最大并行数）、`--strategy all\|any\|race`、`--dry-run`、`--json` |
| `/stdd:roles` | `stdd roles [action] [args...]` | **12 角色 Agent 协作**：PM、Architect、UX、QA、Security、DevOps、DBA、Performance、Accessibility、Documentation、Compliance、Observer。Actions: `party`（派对模式）、`review`（对抗审查）、`list`。支持 `--roles`、`--json` |
| `/stdd:learn` | `stdd learn [action] [args...]` | **自适应学习**：记录项目模式和反馈，优化后续工作流。Actions: `record`、`feedback`、`patterns`、`reset`。支持 `--json` |
| `/stdd:vision` | `stdd vision [action]` | **项目愿景文档**：管理项目愿景、目标、路线图。Actions: `show`、`create`、`update`。支持 `--force`、`--json` |
| `/stdd:help` | `stdd help [topic]` | **上下文感知帮助**：根据当前工作流阶段提供定向帮助。支持 `--json` |
| — | `stdd runtime agent <action> [topic]` | **Agent 运行时引擎**：多 Agent 模拟器（Party Mode）。Actions: `start`（启动）、`next`（下一轮）、`record`（记录）、`stop`（停止）、`run`（执行任务）。支持 `--rounds`、`--executor noop\|shell`、`--command`、`--role`、`--allow-unsafe-shell-executor`、`--allowed-bin`、`--json` |
| — | `stdd runtime sudo [file]` | **SudoLang 解释器**：解析 SudoLang 伪代码并生成 STDD 工件。支持 `--generate`（生成工件）、`--json` |
| — | `stdd memory-scan [action]` | **源码记忆扫描**：扫描项目源码并生成结构化记忆工件。Actions: `scan`（默认）、`list`。支持 `--source-dir`、`--json` |

---

## 9. 评估与决策支持（3 个）

复杂度评估、信心评分和项目愿景分析工具。

| 斜杠命令 | CLI 命令 | 功能描述 |
|----------|---------|---------|
| `/stdd:complexity` | `stdd complexity [action] [path]` | **代码复杂度分析**：计算圈复杂度、认知复杂度、耦合度。Actions: `analyze`（分析）、`report`（报告）、`trend`（趋势）。支持 `--limit`、`--json` |
| `/stdd:certainty` | `stdd certainty [action] [args...]` | **5 维度信心评分**：需求清晰度、技术可行性、资源充裕度、时间可行性、风险评估。Actions: `assess`（评估）、`set`（设置阈值）、`history`（历史趋势）。支持 `--scores`（预设分数）、`--set`（配置阈值）、`--json` |
| `/stdd:vision` | `stdd vision [action]` | **项目愿景管理**：（同 8 高级与 AI Agent 中的 vision，跨分类复用）。支持 `--force`、`--json` |

---

## 10. 生成与预览（7 个）

代码生成、UI 生成、模块市场和可视化工具。

| 斜杠命令 | CLI 命令 | 功能描述 |
|----------|---------|---------|
| `/stdd:builder` | `stdd builder [action] [name]` | **自定义构建器**：创建自定义 Agent、工作流和 Skill。Actions: `agent`（创建 Agent）、`workflow`（创建工作流）、`skill`（创建 Skill）、`list`、`validate`、`export`。支持 `--type`、`--expertise`、`--lens`、`--focus`、`--phases`、`--intent`、`--description`、`--category`、`--phase`、`--force`、`--json` |
| `/stdd:ui` | `stdd ui [action] [name]` | **前端页面与组件生成**（详见下方详细说明） |
| `/stdd:modules` | `stdd modules [action] [args...]` | **STDD 模块市场**：浏览、搜索、安装模块。Actions: `featured`（精选）、`search`（搜索）、`install`（安装）、`list`（已安装）、`info`（详情）、`publish`（发布）、`categories`（分类）。支持 `--category`、`--json` |
| `/stdd:dashboard` | `stdd dashboard [action]` | **静态 HTML 仪表板**：生成项目健康度、变更状态、证据概览的仪表板。Actions: `generate`（默认）、`open`（生成并打开浏览器）。支持 `--json`、`--output` |
| `/stdd:docs` | `stdd docs [action]` | **静态文档站点**：从项目文档生成可部署的 HTML 文档站点。Actions: `generate`（默认）、`open`、`sources`（列出源文件）、`deploy`（部署到 gh-pages/netlify）。支持 `--output`、`--lang zh\|en`、`--json` |
| `/stdd:profile` | `stdd profile [action]` | **自适应规划深度**：根据变更类型自动调整规划深度。Profiles: `quick`(1)、`standard`(2)、`thorough`(3)、`enterprise`(4)。Actions: `detect`、`set`、`list`、`recommend`。支持 `--change`、`--force`、`--json` |
| — | `stdd adapt [action]` | **IDE 适配器**（内部使用）：为不同 IDE 生成配置文件。Actions: `generate\|setup`、`list`、`all`。自动适配所有已安装的 AI 引擎 |

### `/stdd:ui` 详细说明

`stdd ui` 是全栈前端生成引擎，基于 `DESIGN.md` Design Token 驱动。

#### Actions

| Action | 命令 | 说明 |
|--------|------|------|
| `page` | `stdd ui page <name>` | 生成页面（支持所有页面类型和框架） |
| `component` | `stdd ui component <name>` | 生成组件（支持所有组件类型） |
| `scaffold` | `stdd ui scaffold` | 脚手架完整 UI 应用（布局 + 基础组件 + 默认状态） |
| `preview` | `stdd ui preview` | 生成预览画廊 HTML（自动打开浏览器） |
| `test` | `stdd ui test <name>` | 生成测试脚手架 |
| `diff` | `stdd ui diff [name]` | 视觉回归对比 |
| `list` | `stdd ui list` | 列出所有已生成的 UI 工件 |

#### Component 类型

| 类型 | 说明 |
|------|------|
| `button` | 按钮（主要/次要/危险/禁用变体） |
| `card` | 卡片（内容/产品/用户卡片） |
| `form` | 表单（含验证逻辑） |
| `input` | 输入框（文本/密码/搜索/数字） |
| `modal` | 模态对话框（含焦点陷阱） |
| `nav` | 导航栏（响应式 + 移动端汉堡菜单） |
| `table` | 数据表格（排序/筛选/分页） |
| `list` | 列表（虚拟滚动支持） |

#### Page 类型

| 类型 | 说明 |
|------|------|
| `landing` | 着陆页（Hero + Features + CTA） |
| `dashboard` | 仪表板（侧边栏 + 数据卡片 + 图表区） |
| `auth` | 认证页（login/register/forgot 变体，`--authVariant`） |
| `settings` | 设置页（Profile/Security/Notifications 分区） |
| `pricing` | 定价页（Plan 对比 + FAQ） |

#### 支持框架

| 框架 | 文件格式 |
|------|---------|
| `react` / `next` | `.jsx` + `.css` |
| `vue` / `nuxt` | `.vue` 单文件组件 |
| `angular` | `.component.ts` + `.html` + `.css` |
| `svelte` | `.svelte` |
| `vanilla` | `.html` |

#### 样式方案

| 方案 | 说明 |
|------|------|
| `css` | 标准 CSS（默认） |
| `scss` | Sass 预处理器 |
| `tailwind` | Tailwind CSS 工具类 |
| `css-modules` | CSS Modules（React 专用） |

#### UI 状态生成

| 状态 | 说明 |
|------|------|
| `loading` | 加载骨架屏/Spinner |
| `empty` | 空状态占位 |
| `error` | 错误提示与重试 |
| `permission` | 权限不足提示 |
| `offline` | 离线状态提示 |
| `success` | 操作成功反馈 |

#### 无障碍（a11y）支持

- 完整 `aria-*` 属性（`aria-label`、`aria-describedby`、`aria-live` 等）
- 语义化 ARIA roles（`role="dialog"`、`role="navigation"` 等）
- 焦点陷阱（Modal 自动捕获/释放焦点）
- 键盘导航支持（Tab/Shift+Tab/Escape）
- Screen-reader only 工具类（`.sr-only`）

#### 响应式支持

- 移动优先设计
- Tailwind 断点：`sm:`（640px）、`md:`（768px）、`lg:`（1024px）
- CSS 自定义属性断点系统
- 弹性网格布局（`grid-template-columns: repeat(auto-fill, ...)`）

#### DESIGN.md Token 提取

所有生成的组件和页面自动从 `DESIGN.md` 提取 Design Tokens：
- **颜色系统**：`--color-primary`、`--color-gray-*`、语义色
- **排版**：`--font-family-base`、`--font-size-*`
- **间距**：`--spacing-xs` ~ `--spacing-3xl`
- **圆角**：`--radius-sm` ~ `--radius-full`
- 无 `DESIGN.md` 时使用合理默认值

---

## 11. 辅助工具（16 个）

项目管理和辅助工具。

| CLI 命令 | 功能描述 |
|---------|---------|
| `stdd status [change]` | 显示变更状态（当前阶段、任务进度、证据状态）。支持 `--json` |
| `stdd list` / `stdd ls` | 列出所有变更和规格。支持 `--changes`、`--specs`、`--archived`（含已归档）、`--json` |
| `stdd skills` | 列出所有可用的 STDD Skills |
| `stdd commands` | 列出所有 Claude Code 斜杠命令模板 |
| `stdd recommend [change]` | 基于项目状态推荐下一步操作。支持 `--workspace`、`--json` |
| `stdd update [path]` | 更新 STDD 配置文件到最新版本。支持 `--force`、`--dry-run` |
| `stdd progress` | 跟踪和查看命令执行进度（JSONL 记录）。支持 `--summary`、`--resume`、`--clear`、`--json` |
| `stdd start` | 交互式快速启动向导。支持 `--json` |
| `stdd workspace <subcommand>` | 工作区管理。Subcommands: `list`（列出）、`validate`（验证注册表）、`repair`（修复）。支持 `--json`、`--dry-run` |
| `stdd extensions [action] [args...]` | 扩展管理。Actions: `list`、`install`、`validate`、`package`。支持 `--json` |
| `stdd starters <subcommand> [args...]` | 项目启动器模板（TypeScript/JavaScript/Python/Go/Rust） |
| `stdd ci [platform]` | CI 配置生成（GitHub Actions/GitLab CI/Jenkins 等）。支持 `--force`。别名：`stdd ci-generator` |
| `stdd browser <subcommand>` | 内置浏览器驱动（E2E 测试和视觉回归）。Subcommands: `snapshot`（截图）、`inspect`（检查页面）、`doctor`（Playwright 健康检查）、`compare`（视觉对比）、`update-baseline`（更新基线） |
| `stdd mcp [action]` | MCP 工具服务。Actions: `serve`、`tools`，用于向外部 AI 客户端暴露 STDD 工具调用 |
| `stdd graph recommend [change]` | （同 6 Graph 引擎中的 recommend，跨分类复用） |
| `stdd constitution audit` | （同 5 质量与治理中的 constitution audit，跨分类复用） |

---

## 统计总览

| 指标 | 数量 |
|------|------|
| CLI 命令实现 | **88** |
| 斜杠命令模板 | **86** |
| Skill 模板 | **53** |
| 顶级 CLI 命令 | **84** |
| 测试套件 | **200** |
| 测试用例 | **4151+** |
| 测试通过率 | **100%** |
| 代码覆盖率 | **97.7% statements / 93% branches** |
| AI 引擎兼容 | **4 层 22 种**（Claude Code、Cursor、Windsurf、Copilot、Aider、Cline、Continue.dev、Amazon Q、OpenCode、Codex、Qwen Code、MarsCode、Comate、Gemini、ChatGPT Codex、Kiro、CodeBuddy、Augment、PearAI、Cody、Tabnine、Bolt.new） |
| 宪法条例 | **9 条**（3 Blocking + 4 Warning + 2 Suggestion） |
| Agent 角色 | **12 个**（PM、Architect、UX、QA、Security、DevOps、DBA、Performance、Accessibility、Documentation、Compliance、Observer） |
| Graph 意图模式 | **5 种**（feature、hotfix、research、repair、brownfield） |

---

## 按使用场景速查

### 场景 1：新功能开发（标准流程）

```bash
stdd init                                    # 首次初始化
stdd new change add-dark-mode                # 创建变更
stdd propose draft add-dark-mode             # 需求提案
stdd clarify add-dark-mode                   # 需求澄清
stdd confirm add-dark-mode                   # 确认需求
stdd spec add-dark-mode                      # 生成规格
stdd plan add-dark-mode                      # 任务拆解
stdd apply add-dark-mode                     # TDD 实现
stdd verify add-dark-mode                    # 验证
stdd archive add-dark-mode                   # 归档
```

### 场景 2：快速通道（推荐日常使用）

```bash
stdd ff "添加深色模式支持"                     # 一键：提案→规格→任务
stdd apply                                    # TDD 循环
stdd verify                                   # 验证
stdd archive                                  # 归档
```

### 场景 3：一键全流程

```bash
stdd turbo "用户注册功能"                      # 全自动（仅在确认/归档暂停）
```

### 场景 4：Bug 修复

```bash
stdd issue "登录页面白屏"                      # Bug 修复入口
stdd apply                                    # TDD 修复
stdd verify                                   # 验证
stdd archive                                  # 归档
```

### 场景 5：接手遗留项目（Brownfield）

```bash
stdd explore                                  # 深度分析项目
stdd init                                     # 初始化 STDD
stdd ff "修复性能问题"                         # 快速通道
stdd apply && stdd verify && stdd archive     # 执行
```

### 场景 6：AI 助手斜杠命令（Claude Code / Cursor 等）

```
/stdd:init                                    # 初始化
/stdd:ff 实现用户 OAuth 登录                    # 快速通道
/stdd:apply --phase red                       # TDD 红阶段
/stdd:apply --phase green                     # TDD 绿阶段
/stdd:mutation                                # 变异测试
/stdd:verify                                  # 全面验证
/stdd:archive                                 # 归档
```

### 场景 7：多 Agent 协作探索

```bash
stdd brainstorm "微服务架构迁移" --method first-principles  # 头脑风暴
stdd roles party --roles pm,architect,qa       # 多角色讨论
stdd complexity analyze                        # 复杂度评估
stdd certainty assess                          # 信心评分
stdd vision create                             # 项目愿景
```

### 场景 8：API 优先开发（SDD）

```bash
stdd ff "RESTful 用户管理 API"                 # 快速通道
stdd api-spec                                 # OpenAPI 规范
stdd schema create user-model                 # 数据 Schema
stdd contract generate                        # 契约测试
stdd validate --spec-guardian                 # 规格验证
stdd apply && stdd verify && stdd archive     # 执行
```

### 场景 9：前端 UI 生成

```bash
stdd design create                            # 生成设计系统
stdd ui scaffold --framework react --style tailwind   # 脚手架
stdd ui page dashboard --pageType dashboard   # 仪表板页面
stdd ui component UserCard --type card        # 卡片组件
stdd ui state AppLoading --type loading       # 加载状态
stdd ui preview                               # 预览画廊
stdd ui test dashboard                        # 测试脚手架
```

### 场景 10：DAG 工作流编排

```bash
stdd graph visualize --format html            # 可视化 DAG
stdd graph analyze --intent feature           # 分析结构
stdd graph run --intent feature               # 执行工作流
stdd graph history                            # 查看历史
stdd graph replay <id>                        # 回放执行
```

### 场景 11：质量治理

```bash
stdd hooks install --git                      # 安装 hooks + Git pre-commit
stdd guard                                    # 质量守护
stdd constitution check                       # 宪法合规
stdd depcheck                                 # 依赖检查
stdd doctor --deep                            # 深度健康检查
stdd mutation --mode quick                    # 快速变异测试
stdd metrics                                  # 质量指标
stdd dashboard                                # 生成仪表板
```

---

## AI 引擎兼容性矩阵

STDD Copilot Ultra 兼容 22 种 AI 编码引擎，通过 4 层适配：

| 层级 | 引擎 |
|------|------|
| **Tier 1 — 完整适配** | Claude Code (`.claude`)、Cursor (`.cursor`)、Windsurf (`.windsurf`) |
| **Tier 2 — 高度兼容** | GitHub Copilot (`.github`)、Aider (`.aider`)、Cline (`.cline`)、Continue.dev (`.continue`) |
| **Tier 3 — 标准兼容** | Amazon Q (`.amazonq`)、OpenCode (`.opencode`)、Codex (`.codex`)、Qwen Code (`.tongyi`)、MarsCode (`.marscode`)、Comate (`.comate`)、Gemini (`.gemini`)、ChatGPT Codex (`AGENTS.md`) |
| **Tier 4 — 基础兼容** | Kiro (`.kiro`)、CodeBuddy (`.codebuddy`)、Augment (`.augment`)、PearAI (`.pearai`)、Cody (`.cody`)、Tabnine (`.tabnine`)、Bolt.new (`bolt.md`) |

---

## Constitution 质量宪法（9 条）

| # | 条例 | 优先级 | 核心规则 |
|---|------|--------|---------|
| 1 | Library-First | 🟡 Warning | 优先使用成熟库，避免重复造轮子 |
| 2 | TDD | 🔴 Blocking | 测试先行 + 覆盖率门禁 + 变异证据 |
| 3 | Small Commits | 🟡 Warning | 原子化提交，每个 commit 只做一件事 |
| 4 | Code Style | 🟡 Warning | 统一代码格式，遵循项目 lint 规则 |
| 5 | Documentation | 🟢 Suggestion | 文档即代码，保持文档与代码同步 |
| 6 | Error Handling | 🟡 Warning | 禁止空 catch，必须有错误处理策略 |
| 7 | Security | 🔴 Blocking | 禁止硬编码密钥、注入、不安全路径 |
| 8 | Performance | 🟢 Suggestion | 合理默认性能，避免不必要优化 |
| 9 | CI/CD | 🔴 Blocking | 自动化流水线必需，禁止手动部署 |

---

## 相关文档

- [CLI 使用指南](./cli-guide.md) — 命令行使用详解
- [工作流说明](./workflows.md) — 工作流模式详解
- [核心概念](./concepts.md) — STDD 核心概念
- [快速开始](./getting-started.md) — 5 分钟上手
- [Agent 协议](./agent-protocol.md) — Agent 通信协议
- [English CLI Guide](./en/cli-guide.md) — 英文版 CLI 指南
