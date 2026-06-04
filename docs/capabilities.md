# STDD Copilot Ultra 能力边界说明

> **@marcher-lam/stdd-copilot-ultra v2.0.0** — STDD（Smart Team-Driven Development）能力边界文档
>
> 本文档严格区分工具自身已实现的功能与需要外部 AI 执行器才能完成的功能。

## 核心定位

STDD Copilot Ultra 是一个 **CLI 工具 + 模板框架**，定位为 AI 编码助手的**过程控制层**。它本身不提供 AI 编码能力，而是通过 CLI 命令、Constitution 条例检查、模板指令等方式，为 Claude Code、Cursor、Windsurf 等 AI 编码助手设定「交通规则」。

### 技术栈

| 项目 | 详情 |
|------|------|
| 包名 | `@marcher-lam/stdd-copilot-ultra` |
| 版本 | 2.0.0 |
| 运行时 | Node.js CLI |
| 依赖 | `chalk` `commander` `inquirer` `js-yaml`（共 4 个） |
| 开发依赖 | `eslint` `jest`（共 2 个） |
| 测试基线 | 197 个测试套件，4151+ 个测试用例，97.7% 覆盖率 |

---

## 一、工具自身已实现的能力

> 以下所有命令和功能在安装 `@marcher-lam/stdd-copilot-ultra` 后即可直接使用，不依赖任何外部 AI 工具。

### 1.1 核心工作流命令

| 命令 | 功能说明 |
|------|---------|
| `stdd init` | 初始化 STDD 项目结构（创建目录、配置文件、Constitution） |
| `stdd new <name>` | 创建变更包目录和文件结构 |
| `stdd ff <name>` | Fast-Forward 快速推进变更 |
| `stdd issue <title>` | 从 Issue 创建变更包 |
| `stdd turbo <desc>` | 一键全流程启动 |
| `stdd apply <name>` | 运行测试并更新任务状态，支持 `--phase red\|green\|refactor`、`--allow-no-tests` |
| `stdd verify <name>` | 验证变更（测试通过 + Constitution 合规） |
| `stdd archive <name>` | 归档变更包 + Delta Spec 合并 |
| `stdd list` | 列出所有变更包 |
| `stdd status [name]` | 显示变更包当前状态 |

### 1.2 质量保证命令

| 命令 | 功能说明 |
|------|---------|
| `stdd doctor [--deep]` | 综合健康检查 / 深度诊断 |
| `stdd guard` | 质量门禁检查 |
| `stdd constitution` | 查看/检查开发条例（9 篇） |
| `stdd hooks` | Git hooks 管理 |
| `stdd mutation <name>` | Quick 启发式变异测试 |
| `stdd audit` | 审计日志查看 |
| `stdd depcheck` | 依赖检查 |
| `stdd schema` | Schema 验证 |

### 1.3 Constitution 开发条例（9 篇）

| 序号 | 条例名称 | 级别 | 检查能力 |
|------|---------|------|---------|
| 1 | Library-First | **Blocking** | 检测未使用依赖、重复造轮子 |
| 2 | TDD | **Blocking** | 测试文件存在性、反模式检查、阶段合规 |
| 3 | Small Commits | **Blocking** | Git 历史记录检查 |
| 4 | Code Style | Warning | ESLint 集成、文件长度检查 |
| 5 | Documentation | Warning | JSDoc 覆盖率检查 |
| 6 | Error Handling | Warning | 空 catch 块检测 |
| 7 | Security | Warning | 硬编码密码、SQL 注入模式检测 |
| 8 | Performance | Suggestion | useEffect 依赖、N+1 查询模式检测 |
| 9 | CI/CD | Suggestion | CI 配置检测 |

**级别说明：**
- **Blocking**：验证时强制通过，否则阻止归档
- **Warning**：验证时报告警告，不阻止归档
- **Suggestion**：验证时提供建议，不阻止归档

### 1.4 工作区与项目管理

| 命令 | 功能说明 |
|------|---------|
| `stdd workspace` | 工作区管理（自动检测 npm/pnpm workspaces） |
| `stdd metrics` | 质量指标统计 |
| `stdd progress` | 进度跟踪（JSONL 格式 + 断点续传） |
| `stdd ci` | 生成 CI 配置（GitHub Actions） |

### 1.5 Graph 引擎（DAG）

| 命令 / 功能 | 说明 |
|-------------|------|
| `stdd graph compile` | DAG 编译 |
| `stdd graph topo` | 拓扑排序 |
| `stdd graph visualize` | 可视化依赖图 |
| `stdd graph analyze` | 依赖分析 |
| `stdd graph history` | 执行历史 |
| `stdd graph recommend` | 智能推荐 |

### 1.6 UI 生成器

支持框架：**React / Vue / Angular / Svelte**

| 命令 | 功能 |
|------|------|
| `stdd ui page` | 页面生成（5 种页面类型） |
| `stdd ui component` | 组件生成（8 种组件类型） |
| `stdd ui scaffold` | 脚手架生成 |
| `stdd ui preview` | 预览生成 |
| `stdd ui test` | 测试文件生成 |
| `stdd ui diff` | 差异对比 |
| `stdd ui list` | 列出可用模板 |

**组件类型（8 种）：** `button` `card` `form` `input` `modal` `nav` `table` `list`

**页面类型（5 种）：** `landing` `dashboard` `auth` `settings` `pricing`

**UI 状态覆盖（6 种）：** `loading` `empty` `error` `permission` `offline` `success`

**无障碍支持：** `aria-*` 属性、ARIA roles、焦点陷阱（focus traps）、`aria-describedby`

**响应式支持：** `@media` 查询 + Tailwind `sm:`/`md:`/`lg:` 断点

**DESIGN.md Token 提取（3 级优先级回退）：**

1. JSON 代码块提取（最高优先级）
2. HTML 注释提取（次优先级）
3. Markdown 表格提取（最低优先级）

### 1.7 Spec 规格系统

| 命令 | 功能 |
|------|------|
| `stdd spec` | BDD 规格生成 |
| `stdd api-spec` | API 规格生成 |
| `stdd contract` | 契约定义 |
| `stdd validate` | 规格验证 |
| `stdd mock` | Mock 数据生成 |
| `stdd factory` | 工厂函数生成 |

### 1.8 Builder 构建器

| 命令 | 功能 |
|------|------|
| `stdd builder agent` | 自定义 Agent 构建 |
| `stdd builder workflow` | 自定义工作流构建 |
| `stdd builder skill` | 自定义 Skill 构建 |
| `stdd builder list` | 列出已构建项目 |
| `stdd builder validate` | 验证构建产物 |
| `stdd builder export` | 导出构建产物 |

### 1.9 浏览器测试

| 命令 | 功能 |
|------|------|
| `stdd browser snapshot` | 页面快照（基于 Playwright） |
| `stdd browser inspect` | 页面检查 |
| `stdd browser doctor` | 浏览器环境诊断 |
| `stdd browser compare` | 快照对比 |
| `stdd browser update-baseline` | 更新基准快照 |

### 1.10 站点与仪表板生成

| 命令 | 功能 |
|------|------|
| `stdd dashboard generate` | 生成静态 HTML 项目健康仪表板 |
| `stdd dashboard open` | 在浏览器中打开仪表板 |
| `stdd docs generate` | 生成静态 HTML 文档站点（Astro/Starlight 风格） |
| `stdd docs open` | 在浏览器中打开文档站点 |

### 1.11 模块市场

| 命令 | 功能 |
|------|------|
| `stdd modules featured` | 精选模块 |
| `stdd modules search` | 搜索模块 |
| `stdd modules install` | 安装模块 |
| `stdd modules list` | 列出已安装模块 |
| `stdd modules info` | 模块详情 |
| `stdd modules publish` | 发布模块 |
| `stdd modules categories` | 模块分类浏览 |

### 1.12 Profile 配置文件

| 命令 | 功能 |
|------|------|
| `stdd profile detect` | 自动检测项目 Profile |
| `stdd profile set` | 设置 Profile |
| `stdd profile list` | 列出可用 Profile |
| `stdd profile recommend` | 推荐最佳 Profile |

**内置 Profile：** `quick` `standard` `thorough` `enterprise`

### 1.13 Memory 记忆系统

| 命令 | 功能 |
|------|------|
| `stdd memory save` | 保存上下文记忆 |
| `stdd memory search` | 搜索记忆 |
| `stdd memory stats` | 记忆统计 |
| `stdd memory scan` | 扫描记忆 |
| `stdd memory list` | 列出记忆 |

### 1.14 Agent 运行时

| 命令 | 功能 |
|------|------|
| `stdd roles` | 查看 12 种 Agent 角色定义 |
| `stdd runtime start` | Party Mode Agent 启动 |
| `stdd runtime next` | 推进到下一个 Agent |
| `stdd runtime stop` | 停止 Agent 运行 |
| `stdd runtime run` | 运行完整 Agent 流程 |
| `stdd sudo` | SudoLang sudo 运行模式 |

### 1.15 其他已实现命令

| 命令 | 功能 |
|------|------|
| `stdd outside-in` | Outside-In 开发模式 |
| `stdd fix-packet` | 修复包生成 |
| `stdd tdd-init` | TDD 初始化 |
| `stdd baby-steps` | Baby Steps 增量开发模式 |
| `stdd starters` | 项目启动模板 |
| `stdd extensions` | 扩展管理 |
| `stdd story` | 用户故事管理 |
| `stdd user-test` | 用户测试 |
| `stdd pipeline` | 管道管理 |

### 1.16 认知与决策辅助

| 命令 | 功能 |
|------|------|
| `stdd certainty` | 5 维度确定性评分 |
| `stdd complexity` | APP Mass 复杂度分析 |
| `stdd vision` | 项目愿景管理 |
| `stdd prp` | PRP（Product Requirements Protocol） |
| `stdd parallel` | 并行任务管理 |
| `stdd supervisor` | 监督模式 |
| `stdd iterate` | 迭代管理 |
| `stdd help` | 帮助信息 |
| `stdd recommend` | 智能推荐 |

### 1.17 全流程命令

| 命令 | 功能 |
|------|------|
| `stdd propose` | 提出需求草案 |
| `stdd clarify` | 需求澄清 |
| `stdd confirm` | 需求确认门 |
| `stdd plan` | 任务拆解 + ADR |
| `stdd execute` | Ralph Loop TDD 执行 |
| `stdd commit` | 提交变更 |
| `stdd commit-tdd` | TDD 提交 |
| `stdd final-doc` | 最终文档生成 |
| `stdd product-proposal` | 产品提案 |
| `stdd context` | 上下文管理 |
| `stdd explore` | 探索分析 |
| `stdd brainstorm` | 头脑风暴 |
| `stdd learn` | 学习模式 |
| `stdd design` | 设计辅助 |

---

## 二、需要外部 AI 执行器的能力

> 以下功能以 **斜杠命令模板**（`.md` 文件）的形式存在于 `src/templates/commands/` 中。它们是结构化的 Markdown 指令，需要 AI 助手（如 Claude Code）读取并执行。工具本身只提供模板，**不包含 AI 推理和代码生成能力**。

### 2.1 斜杠命令模板完整列表

#### 需求与规格类

| 斜杠命令 | 功能 | AI 职责 |
|---------|------|--------|
| `/stdd:propose` | 提出需求草案 | AI 生成需求描述和验收标准 |
| `/stdd:clarify` | 需求澄清（78 种方法） | AI 通过提问澄清模糊需求 |
| `/stdd:confirm` | 需求确认门 | AI 验证需求完整性和一致性 |
| `/stdd:spec` | 生成 BDD 规格 | AI 将需求转化为 BDD Given-When-Then |
| `/stdd:design` | 设计方案 | AI 生成技术设计文档 |

#### 执行与推进类

| 斜杠命令 | 功能 | AI 职责 |
|---------|------|--------|
| `/stdd:plan` | 任务拆解 + ADR | AI 生成任务列表和架构决策记录 |
| `/stdd:execute` | Ralph Loop TDD 执行 | AI 编写测试和实现代码 |
| `/stdd:ff` | Fast-Forward 快速生成 | AI 快速生成全套产物 |
| `/stdd:continue` | 继续生成产物 | AI 接续上次中断的工作 |
| `/stdd:turbo` | 一键全流程 | AI 端到端完成从需求到实现 |

#### 提交与文档类

| 斜杠命令 | 功能 | AI 职责 |
|---------|------|--------|
| `/stdd:commit` | 提交变更 | AI 生成 commit message 并提交 |
| `/stdd:commit-tdd` | TDD 提交 | AI 按阶段生成 commit |
| `/stdd:final-doc` | 最终文档生成 | AI 整理变更文档和 Delta Spec |
| `/stdd:prp` | PRP 文档 | AI 生成产品需求协议文档 |
| `/stdd:product-proposal` | 产品提案 | AI 生成产品提案文档 |

#### 探索与思考类

| 斜杠命令 | 功能 | AI 职责 |
|---------|------|--------|
| `/stdd:brainstorm` | 头脑风暴 | AI 生成创意方案 |
| `/stdd:issue` | Issue 分析 | AI 分析问题并生成变更计划 |
| `/stdd:explore` | 探索分析 | AI 代码探索和理解 |

#### 评估与决策类

| 斜杠命令 | 功能 | AI 职责 |
|---------|------|--------|
| `/stdd:complexity` | 复杂度评估 | AI 分析代码复杂度 |
| `/stdd:certainty` | 确定性评估 | AI 5 维度评分 |
| `/stdd:vision` | 愿景规划 | AI 生成项目愿景 |

#### 协作与管理类

| 斜杠命令 | 功能 | AI 职责 |
|---------|------|--------|
| `/stdd:supervisor` | 监督模式 | AI 作为代码审查者 |
| `/stdd:iterate` | 迭代改进 | AI 循环改进代码 |
| `/stdd:parallel` | 并行任务 | AI 分配并行任务 |
| `/stdd:roles` | 角色管理 | AI 切换 Agent 角色 |

#### 帮助类

| 斜杠命令 | 功能 | AI 职责 |
|---------|------|--------|
| `/stdd:help` | 帮助信息 | AI 解释工具用法 |
| `/stdd:skills` | 技能列表 | AI 列出可用技能 |
| `/stdd:commands` | 命令列表 | AI 列出可用命令 |

### 2.2 斜杠命令工作原理

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  src/templates/  │     │   AI 助手读取     │     │   AI 执行并生成   │
│  commands/*.md   │────▶│   Markdown 模板   │────▶│   代码/文档/测试  │
│  （工具提供）      │     │   （AI 理解指令）  │     │   （AI 输出产物）  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

**工具负责：** 模板定义、目录结构管理、质量检查、状态追踪

**AI 负责：** 内容生成、代码编写、测试编写、文档编写、需求分析

---

## 三、部分实现（框架已存在，需执行器补充）

### 3.1 Graph 节点执行

| 功能 | 状态 | 说明 |
|------|------|------|
| DAG 编译 | ✅ 已实现 | 完整的 DAG 编译和验证 |
| 拓扑排序 | ✅ 已实现 | 自动拓扑排序和循环检测 |
| 可视化 | ✅ 已实现 | 依赖图可视化输出 |
| 分析 | ✅ 已实现 | 依赖分析和统计 |
| 历史记录 | ✅ 已实现 | 执行历史追踪 |
| 推荐 | ✅ 已实现 | 基于历史的智能推荐 |
| **节点执行** | ⚠️ 部分实现 | DAG 结构就绪，但节点内的代码执行需要外部 AI 完成 |

### 3.2 变异测试

| 模式 | 状态 | 说明 |
|------|------|------|
| Quick（启发式） | ✅ 已实现 | 基于规则的快速变异检测 |
| **Deep（Stryker）** | ⚠️ 需外部安装 | 框架已集成 Stryker 接口，但需项目自行安装配置 Stryker |

### 3.3 多 Agent 协作

| 功能 | 状态 | 说明 |
|------|------|------|
| 角色定义 | ✅ 已实现 | 12 种 Agent 角色完整定义 |
| Party Mode 状态机 | ✅ 已实现 | 状态机 + 三信号结构化收敛检测 |
| **真正的多 Agent 协作** | ❌ 未实现 | 多个 AI Agent 之间的实时通信和协作尚未实现 |

### 3.4 视觉回归测试

| 功能 | 状态 | 说明 |
|------|------|------|
| 浏览器快照 | ✅ 已实现 | 基于 Playwright 的页面快照 |
| 基准快照管理 | ✅ 已实现 | 更新、存储基准快照 |
| **差异对比** | ⚠️ 有限实现 | 基准对比框架存在，但像素级 diff 能力有限 |

---

## 四、兼容的 AI 工具

### Tier 1 — 完全兼容

| 工具 | 说明 |
|------|------|
| **Claude Code** | 主要适配目标，斜杠命令原生支持 |
| **Cursor** | IDE 深度集成，支持 AGENTS.md 读取 |
| **Windsurf** | IDE 深度集成，支持模板指令 |

### Tier 2 — 兼容

| 工具 | 说明 |
|------|------|
| **GitHub Copilot** | 通过 CLI 命令 + 手动触发斜杠命令 |
| **Aider** | 通过 CLI 命令 + 模板文件适配 |
| **Cline** | 通过 CLI 命令 + 模板文件适配 |
| **Continue** | 通过 CLI 命令 + 模板文件适配 |
| **Amazon Q** | 通过 CLI 命令 + 模板文件适配 |

### Tier 3/4 — 基础兼容

其他支持 Markdown 指令读取的 AI 编码工具，可通过 `src/templates/commands/` 中的模板文件进行基础适配。

---

## 五、典型工作流

### 场景 1：需求明确，快速推进

```bash
# ① 初始化项目（工具）
stdd init

# ② 创建变更包（工具）
stdd new add-login

# ③ 一键全流程（AI - 在 Claude Code 中使用 /stdd:turbo）
# /stdd:turbo 实现用户登录功能

# ④ 验证质量（工具）
stdd verify add-login

# ⑤ 归档（工具）
stdd archive add-login
```

### 场景 2：需求模糊，逐步澄清

```bash
# ① 初始化（工具）
stdd init

# ② 创建变更包（工具）
stdd new auth-flow

# ③ 需求澄清（AI）
# /stdd:clarify 用户认证流程

# ④ 确认需求（AI）
# /stdd:confirm

# ⑤ 生成规格（AI）
# /stdd:spec

# ⑥ 任务拆解（AI）
# /stdd:plan

# ⑦ TDD 执行（工具 + AI）
stdd apply auth-flow --phase red      # 写失败测试（AI 编写）
stdd apply auth-flow --phase green    # 实现代码（AI 编写）
stdd apply auth-flow --phase refactor # 重构（AI 编写）

# ⑧ 验证 + 归档（工具）
stdd verify auth-flow
stdd archive auth-flow
```

### 场景 3：多组件 UI 开发

```bash
# ① 初始化 + 创建变更包（工具）
stdd init && stdd new user-dashboard

# ② 生成 UI 组件（工具）
stdd ui component card --framework react --stateful
stdd ui component table --framework react --stateful
stdd ui page dashboard --framework react

# ③ 生成测试（工具）
stdd ui test card
stdd ui test table

# ④ 编写业务逻辑（AI）
# /stdd:execute 实现仪表板数据展示逻辑

# ⑤ 验证 + 归档（工具）
stdd verify user-dashboard
stdd archive user-dashboard
```

---

## 六、能力边界速查表

| 能力分类 | 工具已实现 | 需要外部 AI | 部分实现 |
|---------|-----------|------------|---------|
| 项目初始化 | ✅ | | |
| 变更包管理 | ✅ | | |
| TDD 阶段控制 | ✅ | | |
| Constitution 检查 | ✅ | | |
| 测试执行与报告 | ✅ | | |
| 质量门禁 | ✅ | | |
| 证据收集与审计 | ✅ | | |
| UI 组件/页面生成 | ✅ | | |
| Builder 构建器 | ✅ | | |
| 仪表板/文档生成 | ✅ | | |
| Graph DAG 结构 | ✅ | | |
| 浏览器快照 | ✅ | | |
| 需求分析 | | ✅ | |
| 代码生成 | | ✅ | |
| 测试编写 | | ✅ | |
| 文档编写 | | ✅ | |
| BDD 规格生成 | | ✅ | |
| Graph 节点执行 | | | ⚠️ |
| Stryker 变异测试 | | | ⚠️ |
| 多 Agent 协作 | | | ⚠️ |
| 视觉回归 Diff | | | ⚠️ |

---

## 七、相关文档

- [README.md](../README.md) — 项目介绍
- [USAGE.md](../USAGE.md) — 完整使用指南
- [ARCHITECTURE.md](../ARCHITECTURE.md) — 系统架构
- [agent-protocol.md](./agent-protocol.md) — AI Agent 行为协议
- [cli-guide.md](./cli-guide.md) — CLI 命令参考
- [command-reference.md](./command-reference.md) — 命令详细说明
