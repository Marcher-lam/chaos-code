# Chaos Code 统一使用手册 (Usage Manual)

本手册详细介绍了 **Chaos Code (Spec + Test Driven AI Copilot)** 的核心概念、工作流阶段、命令行工具、交互式终端（REPL）、Model Context Protocol (MCP) 以及各种高级功能的配置与使用。

---

## 目录
1. [核心概念与工作流](#1-核心概念与工作流)
2. [环境配置与初始化](#2-环境配置与初始化)
3. [标准命令行工具参考](#3-标准命令行工具参考)
4. [交互式智能终端 (REPL) 使用指南](#4-交互式智能终端-repl-使用指南)
5. [Model Context Protocol (MCP) 接入配置](#5-model-context-protocol-mcp-接入配置)
6. [自愈测试与修复环 (Self-Healing Loop)](#6-自愈测试与修复环-self-healing-loop)
7. [项目健康诊断与配置定制](#7-项目健康诊断与配置定制)
8. [高级多智能体 (Multi-Agent) 与并行控制](#8-高级多智能体-multi-agent-与并行控制)
9. [工作区扩展点与 Agent 能力](#9-工作区扩展点与-agent-能力)
10. [安全模型](#10-安全模型)
11. [SDK / HTTP Server / ACP](#11-sdk--http-server--acp)

---

## 1. 核心概念与工作流

Chaos Code 以规范（Spec）与测试（Test）为核心，将所有的代码变更抽象为 **Change (变更)**。每一次开发活动都由 AI 驱动并受到“STDD 宪法”的约束。

### 1.1 核心概念
*   **Spec (规格说明)**：位于 `stdd/specs/` 下的 Markdown 文件，明确定义了需求、接口契约和验收条件。代码修改前，规格必须先明确。
*   **Change (变更)**：位于 `stdd/changes/<change-name>/` 下的一组文件。每个变更包含一个 `tasks.md`（任务清单）以及所产生的测试证据。
*   **STDD Constitution (宪法)**：包含一系列交付规则。例如：所有公共函数必须有 JSDoc 注释、不允许遗留硬编码 Secrets、测试覆盖率必须达标、修改前必须编写/运行测试（红绿重构）等。

### 1.2 Ralph Loop 工作流阶段
每次开发都遵循以下 8 个严格的生命周期阶段：
1.  **inspect (检索)**：分析项目代码库及当前变更状态。
2.  **propose (提案)**：明确变更范围与需求。
3.  **spec (规格化)**：生成或更新 spec 规格文档。
4.  **plan (规划)**：在 `tasks.md` 中拆解详细任务清单。
5.  **patch (修补)**：AI 编写代码并以补丁（unified diff）形式应用到源码中。
6.  **test (测试)**：运行配置的单元测试并收集执行证据。
7.  **verify (验证)**：执行 STDD 宪法门禁审计（代码规范、漏洞扫描、测试通过率）。
8.  **summarize (总结)**：记录交付报告并将变更归档（archive）。

---

## 2. 环境配置与初始化

### 2.1 完整安装与部署

#### 2.1.1 本地依赖安装
克隆好 Chaos Code 源代码仓库到本地后，首先进入根目录下安装全部 Node.js 运行期所依赖的包：
```bash
git clone https://github.com/Marcher-lam/chaos-code.git
cd chaos-code
npm install
```

#### 2.1.2 全局链接 CLI 命令 (重要推荐)
要在任意项目文件夹下直接使用 `chaos` 或 `stdd` 命令，需将此克隆库全局链接到系统中。
在 `chaos-code` 根目录内执行：
```bash
# 全局挂载（如果在 Mac/Linux 遇到写入权限错误，请添加 sudo 前缀）
npm link
```
链接建立后，系统将自动创建如下的全局软链：
*   `chaos` -> 指向 `cli.js` 主运行脚本
*   `stdd` -> 指向 `cli.js` 主运行脚本 (兼容别名)

您可以在任何其它项目目录下，直接调用 `chaos --help` 调出命令行助手，或者直接键入 `chaos` 进入交互终端。

### 2.2 环境变量配置

Chaos Code 根据环境变量来获取 LLM 密钥和配置网络接入：

```bash
# OpenAI 兼容 API 配置
export OPENAI_API_KEY="sk-..."
export STDD_LLM_BASE_URL="https://api.openai.com/v1" # 自定义转发端点
export OPENAI_MODEL="gpt-4o-mini"                   # 默认模型

# Anthropic API 配置
export ANTHROPIC_API_KEY="sk-ant-..."
export ANTHROPIC_MODEL="claude-3-5-sonnet-latest"    # 默认模型

# 统一 LLM 覆盖变量 (高优先级)
export STDD_LLM_API_KEY="your-api-key"
export STDD_LLM_MODEL="your-chosen-model"
```

### 2.2 项目初始化
在需要接入 Chaos Code 的项目根目录中执行：

```bash
node cli.js init
```
该命令会在项目根目录自动创建 `stdd/` 文件夹及默认配置文件 `stdd/config.yaml`。

---

## 3. 标准命令行工具参考

Chaos Code 提供了丰富的子命令用于非交互式的 CI 流程或单步骤控制。

### 3.1 基础管理命令
*   `chaos init [path]`：初始化当前或指定路径的项目。
*   `chaos list` (或 `chaos ls`)：列出所有活跃的变更。
*   `chaos status [change-name]`：展示指定变更的流程状态与当前的门禁检查情况。
*   `chaos doctor`：对项目进行健康检查，排查配置缺失、预挂钩（Hooks）异常或文件破坏。

### 3.2 变更生命周期命令
*   `chaos new change <change-name>`：创建一个新的活跃变更目录与任务清单。
*   `chaos ff <description>`：快速生成带有预填充任务的任务变更（Fast-Forward 模式）。
*   `chaos turbo <description>`：一键跑通前置的所有静态解析与规格生成阶段。
*   `chaos apply [change-name]`：执行当前活跃任务的下一个待办任务项，自动修改代码。
*   `chaos verify [change-name]`：运行宪法与测试套件校验，确保随时可交付。
*   `chaos archive [change-name]`：将验证通过的变更文件移动到归档目录 `stdd/changes/archive/`。

### 3.3 质量与规范命令
*   `chaos guard`：执行核心合规审计检查。
*   `chaos metrics [change-name]`：查看当前变更关联的测试覆盖率与代码度量数据。
*   `chaos constitution check`：单步对工作区进行宪法合规性扫描。
*   `chaos constitution fix`：自动修复一些常见的违宪项目（例如缺失的 JSDoc 或格式错误）。

---

## 4. 交互式智能终端 (REPL) 使用指南

这是 Chaos Code 的核心交互体验。通过在项目根目录运行无参数的命令来拉起交互式 Shell：

```bash
node cli.js
```

### 4.1 终端特点
*   **完全自主的上下文环境**：你可以像和普通 AI 对话一样在提示符 `chaos > ` 后面键入自然语言指令，如 `”修复 __tests__/my-code.test.js 中的失败用例并提交”`。
*   **流式 Markdown 渲染**：AI 回复实时流式输出，支持代码块语法高亮（12+ 语言）+ 行号、表格对齐、粗体/斜体/链接等完整 Markdown 渲染。
*   **Tab 补全**：智能补全：`/` 开头匹配 30+ 个斜杠命令、`/model ` 后匹配模型名、`/skill `/`/cmd ` 后匹配技能与模板名（大小写不敏感）、`./` `../` `~/` 匹配文件路径。
*   **多行输入**：输入 `”””` 或 ``` 进入多行模式，支持括号/引号未闭合自动检测，空行提交。
*   **动态 Prompt**：提示符显示当前 git 分支名（脏标记红色 `*`）和活跃模型缩写名，如 `main*:gpt-4o > `。
*   **结构化工具展示**：AI 调用工具时显示 `⏺ tool_name  args` 格式，`fs_read` 结果带行号显示，长输出自动分页。
*   **Ctrl+C / Ctrl+D**：Ctrl+C 中断当前 AI 操作（不退出），Ctrl+D 优雅退出并保存会话。
*   **操作审批拦截器**：当 AI 判定需要写入、修补文件、执行测试或调用 Git 操作时，终端会停顿并展示红色/黄色警告和 diff 预览，要求用户确认（`y/n/a/s`，`s` 保存到配置永久生效）。
*   **自动压缩**：上下文超过 80k token 时自动压缩，保留原始目标和最近对话。
*   **每轮统计**：每轮对话后显示 `3.2s · 1.2k tok · $0.0034` 格式的计时/Token/费用摘要。
*   **管道模式**：支持 `echo "prompt" | node cli.js` 和 `cat file | node cli.js "fix"` 管道输入。
*   **长任务通知**：执行超过 30 秒的任务完成后发送桌面通知 + 终端响铃。
*   **会话内斜杠命令（Slash Commands）**：

| 斜杠命令 | 参数 | 用例与功能描述 |
| :--- | :--- | :--- |
| `/help` | 无 | 显示终端斜杠命令的统一列表与基础帮助。 |
| `/status` | 无 | 打印出当前的 STDD 活跃变更名、当前的阶段（如 patch/test）以及相关计数统计。 |
| `/diff` | 无 | 展示工作区未提交的文件状态，并在终端中预览统一补丁。 |
| `/commit` | 无 | 暂存所有工作区修改，并弹出交互提示请求输入 Commit Message 完成提交。 |
| `/rollback` | 无 | 强制丢弃本地工作区所有未提交的修改（执行 `git reset --hard`）。 |
| `/undo` | `[file\|all]` | 恢复 AI 代理最近修改的文件。`/undo` 查看列表，`/undo <file>` 恢复指定文件，`/undo all` 恢复全部。恢复链：`git restore` → 写前快照备份（`~/.chaos/backups/`，未跟踪/未提交文件也能恢复）→ AI 新建的文件直接删除。 |
| `/model` | `[model_name]` | 不带参数时查看当前使用的 LLM 模型；带参数时立即在会话中切换模型。 |
| `/models` | 无 | 列出当前提供商的所有可用模型。 |
| `/providers` | 无 | 列出所有已配置的提供商及其状态。 |
| `/connect` | 无 | 交互式配置提供商（API Key、Base URL、模型）。 |
| `/cost` | 无 | 打印本会话累积消耗的 Token 用量（提示词/补全词）以及估算累计折算美分费用。 |
| `/session` | 无 | 展示当前会话的元数据，包括运行时间、LLM 提供商名称、当前模型及上下文列表。 |
| `/config` | `[key] [value]` | 查看/修改持久化配置。支持 `set`、`permission`、`reset` 子命令。新增键：`maxTokens`（Anthropic 单次请求上限，默认 4096）、`promptCaching`（Anthropic 提示词缓存，默认 true）、`mcpTimeout`（MCP 单请求超时毫秒数，默认 30000）。 |
| `/compact` | 无 | 压缩聊天历史：优先调用 LLM 生成摘要（保留决策、文件路径、错误与任务状态），失败时回退为结构化截断，始终保留原始目标与最近对话。 |
| `/history` | `[keyword]` | 搜索跨会话持久化的命令历史。 |
| `/resume` | 无 | 列出并恢复历史保存的会话。 |
| `/export` | 无 | 导出当前对话为 Markdown 文件。 |
| `/tasks` | `[status]` | 查看当前会话的任务列表及状态（AI 可通过 task_create/task_update/task_list 工具管理任务）。 |
| `/skills` | `[keyword]` | 列出内置 53 个 STDD 技能目录（支持关键字过滤）。工作区 `stdd/skills/<name>/SKILL.md` 可覆盖同名内置技能。 |
| `/skill` | `<name> [args]` | 加载一个 STDD 技能的完整指令并交给 AI 执行，`$ARGUMENTS` 会被替换为给定参数（如 `/skill commit fix login`）。AI 也可通过 `skill` 工具按需自主加载。 |
| `/cmds` | `[keyword]` | 列出 86 个命令模板目录。 |
| `/cmd` | `<name> [args]` | 加载一个命令模板并交给 AI 执行（如 `/cmd doctor`）。 |
| `/hooks` | 无 | 查看已配置的生命周期钩子（在 `~/.chaos/config.json` 的 `hooks` 键配置 `preToolUse`/`postToolUse`，插件 `.chaos/plugins/*/hooks.json` 追加）。 |
| `/plan` | `[on\|off]` | 切换 Plan Mode：开启后写类工具被内核拦截，模型先产出实施计划（文件/步骤/风险），`/plan off` 放行执行。 |
| `/agents` | 无 | 列出 `.chaos/agents.json` 中定义的具名子代理（角色提示词/工具白名单/模型），经 `task_dispatch` 的 `agent` 字段引用。 |
| `/plugins` | 无 | 列出 `.chaos/plugins/` 下已安装的插件包（技能/命令/钩子贡献计数）。 |
| `/checkpoint` | `[label\|list]` | 保存/列出全工作区检查点（写文件的回合会自动保存；保留 10 个）。 |
| `/rewind` | `<id\|label>` | 把所有被触及文件恢复到该检查点时间点（代理新建文件会被删除，需确认）。 |
| `/verbose` | `[0-2]` | 设置输出详细程度：0=简洁, 1=正常, 2=详细。 |
| `/reset` | 无 | 彻底清空当前会话的上下文记录，开启全新的对话交互。 |
| `/clear` | 无 | 清除屏幕。 |
| `/exit` | 无 | 退出交互式终端（快捷键为 `ctrl+d`）。 |

---

## 5. Model Context Protocol (MCP) 接入配置

Model Context Protocol (MCP) 允许大语言模型使用标准化接口发现并调用外部工具。Chaos Code 内置了 MCP 客户端，可以反射调用系统中的任何 MCP 服务。

### 5.1 配置服务
在工作区创建一个配置文件 `stdd/mcp-servers.json`：

```json
{
  "mcpServers": {
    "gitserver": {
      "command": "node",
      "args": ["/Users/user/.nvm/versions/node/v20.11.0/bin/mcp-server-git"]
    },
    "mysql": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost/mydb"]
    }
  }
}
```

### 5.2 动态反射与前缀解析
启动 Chaos Code 时，它会自动在后台拉起上述定义的服务，通过标准 I/O 完成 JSON-RPC 握手并拉取工具列表。
*   工具注册：工具会自动加上服务名前缀。例如，`gitserver` 服务的 `create_branch` 工具在 Chaos Code 中会反射为大模型可调用的 `gitserver_create_branch` 函数。
*   安全限制：所有的 MCP 外部工具默认分配为 `risk: 'write'` 风险等级，在执行前必须在交互终端中得到用户的输入确认。

---

## 6. 自愈测试与修复环 (Self-Healing Loop)

Chaos Code 具有强大的代码编写及修复自动纠错闭环：

```mermaid
graph TD
    A[用户输入修改需求] --> B[AI 编写 Patch 并应用]
    B --> C[AI 调用 test_run 运行本地测试]
    C -->|测试全部通过| D[验证合规, 提示用户 Commit]
    C -->|测试发生失败| E[解析 Error/Stack Trace 日志]
    E --> F[自动注入自愈引导 Prompt 注入上下文]
    F --> G[AI 分析报错, 构思修复方案]
    G --> B
```

### 6.1 自愈日志解析
在 `test_run` 执行失败后，AI 会拿到过滤后的堆栈信息，包含发生错误的测试断言、代码行数和异常类别，随后自动唤醒修复模式重新执行 Patch 写入，直到代码通过测试。

---

## 7. 项目健康诊断与配置定制

### 7.1 配置文件说明
`stdd/config.yaml` 包含了控制规范与行为的全部选项：

```yaml
# 核心配置
mode: strict            # strict 严格执行门禁模式, loose 宽松开发模式
defaults:
  model: gpt-4o-mini    # 默认使用的核心模型
  
# 自动测试配置
test:
  command: npm run test # 测试运行命令
  coverage_threshold: 80 # 期望的代码覆盖率百分比
  
# linter 合规工具选择
linter:
  tool: eslint          # 可选 eslint, prettier, standard

# 宪法检查门禁
constitution:
  enforce_jsdoc: true   # 是否强制为导出的公共 API 编写 JSDoc 注释
  block_secrets: true   # 阻止提交包含潜在 API Key 等密钥的代码
```

---

## 8. 高级多智能体 (Multi-Agent) 与并行控制

在复杂开发任务中，可以使用 Chaos Code 提供的并行与多智能体路由能力。

### 8.1 并行流水线任务
```bash
chaos parallel run "lint-and-format"
```
根据 DAG 任务依赖定义，在进程中并发调度多个子模块构建活动。

### 8.2 Supervisor 协调模式
当开启复杂重构时，可以运行主管模式，拉起多个独立的子 Agent：
```bash
chaos supervisor start --agents research,patcher,tester
```
*   `research` 负责在后台无损阅读和检索；
*   `patcher` 负责生成并验证差异代码；
*   `tester` 在沙箱中执行断言验证与监控。
三个子 Agent 在同一个工作区中分工协作，降低主上下文的污染。

### 8.3 REPL 内的并行子代理（task_dispatch）

主代理可在 REPL 中直接调用 `task_dispatch` 工具：

*   **同步并行**：`tasks` 数组最多 5 项、并发 3 个，每项 `{prompt, agent?, tools?, model?, maxTurns?, cwd?, background?}`；子代理上下文完全隔离、默认只读白名单（含 `fs_read`/`fs_read_image`/`symbols`/`fs_grep`/`fs_glob`/`git_diff`/`git_log`/`task_list`/`skill`），显式授予的写工具沿用主循环 y/n/a/s 确认；Token 消耗并入会话统计。
*   **后台常驻**：`background: true` 立即返回 `bg-N` ID，REPL 跨回合运行不阻塞；回合结束打印完成通知（✓/✗ + 摘要），`task_status` 随时查询；退出时 15 秒有界收敛；管道/SDK 模式自动等待收尾。
*   **工作区隔离**：`git_worktree` 建好 `.worktrees/<name>` 后，`task_dispatch {cwd: ".worktrees/<name>"}` 让子代理拿独立 kernel 与按该目录重建的系统提示词——并行修改零冲突。

---

## 9. 工作区扩展点与 Agent 能力

### 9.1 `.chaos/` 目录一览

| 路径 | 作用 | 示例 |
| :--- | :--- | :--- |
| `.chaos/agents.json` | 具名子代理（prompt/工具白名单/模型；同名时覆盖全局 `~/.chaos/agents.json`） | `{"agents":{"reviewer":{"prompt":"严格审查…","tools":["fs_read","fs_grep"],"model":"gpt-4o"}}}` |
| `.chaos/plugins/<name>/` | 插件包：`plugin.json`（元数据）+ `skills/` + `commands/` + `hooks.json` 任意组合 | `/plugins` 查看加载情况 |
| `.chaos/lsp.json` | LSP 服务器映射，启用 `symbols` 工具的 LSP 模式 | `{"typescript":{"command":["typescript-language-server","--stdio"]}}` |
| `stdd/skills/`、`stdd/commands/` | 工作区技能/命令模板，同名优先级高于内置与插件 | `/skill <name>` 直接执行 |

### 9.2 插件信任门（重要）

插件里的 `hooks.json` 是**工作区携带的 shell 命令**——直接执行等于供应链 RCE。Chaos Code 只执行你在 `~/.chaos/config.json` 中白名单过的插件钩子：

```json
{ "trustedPlugins": ["acme"] }
```

未信任的插件钩子会被跳过并在启动时打印显著警告；插件的 skills/commands 是纯文本资产，始终可用。

### 9.3 符号级导航（symbols 工具）

```json
// .chaos/lsp.json —— 配置后走真 LSP 客户端
{ "typescript": { "command": ["typescript-language-server", "--stdio"], "timeoutMs": 15000 } }
```

未配置时自动退回零依赖启发式（js/ts/py/go/rs/java/php 的函数/类/方法/类型 + 行号 + 容器）。输出形如 `行号\t类型\t容器.名称`，配合 `fs_read {path, startLine}` 精准跳转。

### 9.4 会话检查点与回滚

*   任何写文件的回合结束后**自动**保存全工作区检查点（`~/.chaos/checkpoints/<session>/`，保留最近 10 个）。
*   `/checkpoint [label]` 手动保存；`/checkpoint list` 查看；`/rewind <id|label>` 恢复（需确认，代理新建的文件会被删除）。
*   与逐文件 `/undo` 互补：`/undo` 管单文件写前状态，`/rewind` 管整条时间线。

### 9.5 Plan Mode 与多模态

*   `/plan on`：内核级拦截写工具并引导模型产出实施方案（文件/步骤/风险），`/plan off` 放行；子代理同受约束。
*   `fs_read_image`：png/jpg/gif/webp（≤5MB）→ OpenAI `image_url` 视觉块 / Anthropic `tool_result` 内 `image` 块，视觉模型可直接分析。

---

## 10. 安全模型

| 层 | 机制 |
| :--- | :--- |
| 工具权限 | 写类工具（fs_patch/fs_write/shell_run/test_run/git 写操作/git_pr/git_worktree）逐一 y/n/a/s 确认；`permissionDefaults` 三态（ask/allow/deny，`git_push`/`git_reset` 默认 deny）；管道/非交互模式自动放行 ask 级（deny 仍拦截）并打印提示 |
| OS 沙箱 | `shell_run`/`test_run` 默认经 seatbelt（macOS）/ bwrap（Linux，凭证目录只读 + unshare-pid + die-with-parent）；开关仅操作者可控（`sandbox`/`CHAOS_SANDBOX`）；`CHAOS_SANDBOX=on` 无工具时**拒绝执行** |
| 钩子信任 | preToolUse 钩子可否决任意工具调用；插件钩子须 `trustedPlugins` 白名单 |
| 路径安全 | 工作区约束（isPathSafe）覆盖补丁/备份/检查点/skill 名/agent 名/git 参数；穿越与注入参数直接拒绝 |
| 密钥防泄漏 | 密钥形文件（.env/.env.*/\*.pem/id_rsa\*/credentials/.npmrc/.netrc）拒绝自动读取；http:// 非回环地址发送 API key 时显著告警 |
| 回滚 | 写前快照（~/.chaos/backups，7 天）+ 会话检查点（~/.chaos/checkpoints，10 个）双保险 |

---

## 11. SDK / HTTP Server / ACP

### 11.1 SDK（程序化嵌入）

```js
const { runPrompt } = require('@marcher-lam/chaos-code/src/sdk');
const { reply, stats } = await runPrompt({
  prompt: '修复失败的单测并提交',
  cwd: '/path/to/repo',
  maxTurns: 20,
  onToken: (t) => process.stdout.write(t),   // 可选流式回调
});
```

### 11.2 `chaos serve`（HTTP API）

```bash
CHAOS_SERVER_TOKEN=sekret node cli.js serve --port 8787
curl -s http://127.0.0.1:8787/v1/agent/run \
  -H 'Authorization: Bearer sekret' -H 'Content-Type: application/json' \
  -d '{"prompt":"explain this repo","maxTurns":10}'
# 其余端点：GET /v1/health、GET /v1/skills、GET /v1/agents
```

单并发防重入（运行中返回 409）；未设置 token 时无鉴权（仅本机监听）。

### 11.3 `chaos acp`（编辑器直驱）

最小 Agent Client Protocol（stdio、换行分隔 JSON-RPC）：`initialize` → `session/new` → `session/prompt`（流式 `session/update agent_message_chunk`，结束返回 `stopReason: end_of_turn`）→ `session/cancel`。

---

## 12. 附录：常用命令范例 (Appendix: Common Command Examples)

以下是 Chaos Code 的一些常用命令范例，供查阅与测试对齐：

```bash
# 初始化与变更管理
chaos init /path/to/project
chaos init --force
chaos new change add-dark-mode
chaos status add-dark-mode

# 列表与状态
chaos list --specs
chaos list --archived
chaos list --json
chaos skills
chaos commands

# 宪法门禁与预挂钩
chaos constitution show 2
chaos hooks install
chaos hooks verify
chaos hooks status
chaos hooks disable
chaos hooks enable
```

