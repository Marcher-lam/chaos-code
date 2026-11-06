# Chaos Code 🤖

> **基于 Spec + Test 驱动的下一代自主 AI 编程中枢 & 命令行交互终端**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-green.svg)](https://nodejs.org/)

Chaos Code 是一个专注于命令行交互、具备完全自主能力的 AI 协同开发框架。它深度融合了规范驱动开发（Spec-Driven）与测试驱动开发（TDD）理念，同时支持 Model Context Protocol (MCP) 多模型兼容，实现“自主读取代码、规划修改、运行本地测试、修复错误，并直接处理 Git 提交与推送”的闭环能力。

---

## 🌟 核心特性

*   **⚡ 自主交互与闭环（智能终端 Shell）**
    直接在终端以交互式会话（REPL）运行。AI 可以智能分析项目结构、自主检索文件、撰写统一补丁（Unified Diff）、并自动执行本地测试。支持流式 Markdown 渲染（代码高亮+行号+表格）、Tab 补全（命令/模型名/文件路径）、多行输入（`"""` + 语法未闭合检测）、动态 Prompt（显示 git branch + model 缩写）、结构化工具调用展示（`⏺` 图标 + 参数摘要 + 行号内容）、Ctrl+C 中断/Ctrl+D 退出、长输出自动分页。
*   **🛠️ 完整的 Git 自动化链条**
    支持 AI 代理自动调用 Git 写入命令（如 `git.add`、`git.commit`、`git.push`、`git.checkout` 等），支持会话内变更预览及安全确认机制，提供一键 `/rollback`、`/commit`、`/undo` 交互命令。
*   **🔌 强大的 MCP 协议支持**
    内置高适配 Model Context Protocol 客户端，可动态拉起外部 stdio 协议 MCP 服务（如数据库操作、浏览器驱动等），并将外部工具动态反射至大模型认知网络中。
*   **🩺 智能自愈测试环（Self-Healing Loop）**
    如果在运行本地测试（`test_run`）时发生失败，AI 代理会自动解析错误日志与调用栈信息，生成自愈提示并进入”修补-再测试”循环，直至全部验证通过。
*   **🧠 多模型自由切换与开销监控**
    同时兼容 OpenAI、Anthropic、DeepSeek、OpenRouter、Groq、Ollama、LM Studio 等提供商，支持在交互终端中通过 `/model` 实时无缝切换模型，并自动实时折算和统计会话 Token 开销与估算费用。支持 `--model` 和 `--provider` CLI 标志。baseUrl 带任意路径前缀（如 `/api/paas/v4`）与 `http://` 本地端点均可正确对接。
*   **👥 并行 Subagent（task_dispatch）**
    主代理可通过 `task_dispatch` 工具派出最多 5 个（并发 3 个）拥有独立上下文窗口的子代理并行探索/调研/搜索。子代理默认只读工具集，写工具需显式授予并沿用主循环的 y/n/a/s 权限确认；子代理 Token 消耗自动并入会话统计；支持引用具名 Agent 配置（见下）。
*   **🌗 Plan Mode（写前规划）**
    `/plan` 一键切换：开启后内核强制只读——写类工具直接被拦截并引导模型先产出实施方案（改动文件、步骤、风险），你审阅后 `/plan off` 放行执行。子代理同样受约束。
*   **🛡️ OS 级沙箱（macOS seatbelt / Linux bubblewrap）**
    `shell_run` 与 `test_run` 默认经 OS 沙箱执行：系统目录与凭证目录（`~/.ssh`、`~/.aws`、`~/.gnupg` 等）写入被内核级拒绝，工作区与临时目录不受影响，`/dev/null` 等伪设备重定向正常（已在 macOS 真机验证）。开关仅由操作者控制：配置 `sandbox: 'auto'|'off'` 或环境变量 `CHAOS_SANDBOX=off`；`CHAOS_SANDBOX=on` 时无可用沙箱工具则**拒绝执行**（fail-closed，绝不静默放行）。
*   **🤖 具名 Agent 配置（可复用角色）**
    在 `.chaos/agents.json`（或全局 `~/.chaos/agents.json`）定义角色：`{ reviewer: { prompt, tools, model } }`，`task_dispatch` 按 `agent: "reviewer"` 引用——角色提示词注入子代理 system prompt、工具白名单与模型各就各位。`/agents` 查看。
*   **📦 Plugins 打包（五层扩展补全）**
    `.chaos/plugins/<name>/` 一目录一插件：`skills/`、`commands/`、`hooks.json` 任意组合，加载即合并（工作区同名技能仍优先）。`/plugins` 查看已装插件。至此 hooks/skills/MCP/subagents/plugins 五层扩展齐备。
*   **🔍 Thinking 模型原生支持**
    qwen3/GLM/DeepSeek-R1 的 `reasoning_content` 被捕获：纯思考无可见答复的回合自动补推一次（不再静默空结束）；`stream_options.include_usage` 请求真实用量驱动自动压缩。
*   **🔀 git_pr 一键 PR**
    `git_pr` 工具经 `gh` CLI 推送当前分支并创建 Pull Request（title/body/draft/base），无 gh 时给出安装指引。
*   **🧠 智能上下文压缩（LLM 摘要）**
    `/compact` 与自动压缩优先调用 LLM 生成结构化摘要（保留决策、文件路径、错误与任务状态），调用失败自动回退结构化截断，原始目标永不丢失。Anthropic 提供商支持 prompt caching（`cache_control` 断点），`maxTokens` 可配置。
*   **📚 技能双通道加载**
    53 个 STDD 技能与 86 个命令模板既能在自家 REPL 中通过 `/skills`、`/skill <name>`、`/cmds`、`/cmd <name>` 直接加载执行（AI 也可通过 `skill` 工具按需自主加载），也能安装进 Cursor、Copilot 等 24 个主流 AI 编码引擎复用；工作区 `stdd/skills/` 可覆盖内置技能。
*   **🔧 31 个内置工具 + MCP 动态扩展（带超时保护）**
    包含 `fs_read`（分窗大文件）、`fs_read_image`（多模态）、`symbols`（符号导航）、`fs_search`、`fs_glob`、`fs_grep`、`fs_write`、`fs_patch`、`shell_run`、`test_run`、全套 Git 工具（`git_pull`/`git_log`/`git_stash`/`git_pr`/`git_worktree`）、`task_create`/`task_update`/`task_list`（任务管理）、`task_dispatch`（子代理）、`task_status`（后台任务轮询）、`skill`（技能加载）、STDD 工具及 MCP 动态工具；MCP 每请求超时可配（`mcpTimeout`，启动握手宽限 120s），挂死服务不再阻塞主循环、失败即杀防泄漏。
*   **👁 多模态图片输入（fs_read_image）**
    读取 png/jpg/gif/webp（≤5MB）为 base64 并按提供商原生格式投递：OpenAI 线协议映射为 `image_url` 视觉块（紧随工具消息的用户消息），Anthropic 线协议映射为 `tool_result` 内的 `image` content block——视觉模型可直接分析截图/设计稿/图表。子代理默认只读白名单同样包含它。
*   **🔄 后台常驻 Subagent（跨回合常驻）**
    `task_dispatch` 的 `background: true` 让子代理**跨回合常驻运行**（REPL 不阻塞，并发上限 3）：下个提示符前打印完成通知（✓/✗ + 摘要），`task_status` 随时轮询；退出时 15 秒有界收敛，失败原因原样透传。管道/SDK 模式自动等待收尾。
*   **🌲 Git Worktree 多工作区隔离**
    `git_worktree`（list/add/remove，默认 `.worktrees/<name>` + 自动建分支，名称穿越防护）+ `task_dispatch` 的 `cwd` 选项：子代理在自己的 worktree 里拿独立 kernel 与重建的系统提示词——**并行修改零冲突**。
*   **⏪ 会话级 Checkpoint（时间线回滚）**
    任何写文件的回合结束后自动保存全工作区检查点（`~/.chaos/checkpoints/<session>/`，保留 10 个）；`/checkpoint [label]` 手动保存、`/checkpoint list` 查看、`/rewind <id>` 一键把所有被触及文件恢复到该时间点（代理新建的文件会被删除）。与逐文件 `/undo` 互补。
*   **🧭 符号级导航（LSP + 启发式）**
    `symbols` 工具：配置 `.chaos/lsp.json`（如 `{"typescript": {"command": ["typescript-language-server", "--stdio"]}}`）即走**真 LSP 客户端**（Content-Length 帧、initialize/didOpen/documentSymbol、超时保护）；未配置则零依赖启发式提取 js/ts/py/go/rs/java/php 的函数/类/方法/类型及行号，配合 `fs_read startLine` 精准跳转。
*   **🔌 SDK / HTTP Server / ACP**
    - SDK：`require('@marcher-lam/chaos-code/src/sdk')` → `runPrompt({prompt, cwd, maxTurns, onToken})` 程序化嵌入；
    - `chaos serve`：HTTP API（`POST /v1/agent/run`、`/v1/skills`、`/v1/agents`、`/v1/health`），`CHAOS_SERVER_TOKEN` Bearer 鉴权，单并发防重入；
    - `chaos acp`：最小 Agent Client Protocol（stdio NDJSON：initialize/session new/prompt 流式 agent_message_chunk/cancel），编辑器（如 Zed）可直驱。
*   **🪝 生命周期 Hooks**
    在 `~/.chaos/config.json` 配置 `hooks: { preToolUse: [...], postToolUse: [...] }`：preToolUse 钩子收到 JSON 载荷（stdin），非零退出即可否决工具调用；postToolUse 用于记录/通知。REPL 用 `/hooks` 查看。子代理同样受钩子约束。
*   **📋 项目记忆文件（CHAOS.md / CLAUDE.md / AGENTS.md）**
    遵循社区通用约定：启动时自动把工作区的 `CHAOS.md`（优先）、`CLAUDE.md` 或 `AGENTS.md` 注入系统提示词（16KB 截断保护），项目级指令持久生效。
*   **📖 大文件分窗读取**
    `fs_read` 对超过 64KB 的文件不再报错，改为返回带 `startLine/endLine/totalLines/truncated` 元数据的行窗口（默认 2000 行），模型可用 `startLine/lineCount` 翻页读取；文本扩展名白名单扩充（.sh/.toml/.xml/.sql 等）。
*   **⚙️ 持久化配置系统**
    通过 `~/.chaos/config.json` 管理所有偏好设置（verbosity、自动压缩阈值、温度、最大轮次、per-tool 权限、maxTokens、promptCaching、mcpTimeout、hooks），`/config` 命令实时查看和修改。
*   **📊 会话持久化与恢复**
    自动保存聊天历史到 `~/.chaos/sessions/`，支持 `/resume` 恢复历史会话、`/export` 导出对话为 Markdown。
*   **📈 Ralph Loop 规范驱动流程**
    将开发拆分为 `inspect -> propose -> spec -> plan -> patch -> test -> verify -> summarize` 八个严谨阶段，保障项目在重构和交付时的代码合规性与高 compliance。
*   **📚 丰富的模板生态**
    系统内置了多达 86 个命令模板和 53 个 Skill 模板，提供全方位的代码与逻辑模板支持。
*   **🛠️ 完整的工具链条**
    支持通过调用 `/stdd:init`、`/stdd:propose`、`/stdd:spec`、`/stdd:plan`、`/stdd:apply`、`/stdd:verify`、`/stdd:archive` 和 `/stdd:turbo` 等命令进行全生命周期管理。


---

## 🚀 快速开始

### 1. 系统要求

*   **Node.js**: `>= 20.0.0` (推荐使用最新 LTS 版本，如 Node 20 或更高)
*   **Git**: 系统已安装 Git 工具，本地项目目录已执行过 `git init`，并正确关联了 `origin` 远程源。

### 2. 详细安装步骤

#### 第一步：克隆代码库
首先，将 Chaos Code 仓库克隆到本地开发目录中：
```bash
git clone https://github.com/Marcher-lam/chaos-code.git
cd chaos-code
```

#### 第二步：安装项目依赖
在克隆下来的 `chaos-code` 根目录下，执行 npm 命令来安装所有运行所需的 Node 依赖项：
```bash
npm install
```

#### 第三步：全局链接 CLI 命令行工具 (推荐)
为了在您电脑上的**任何其它项目目录**中直接运行 `chaos` 或 `stdd` 命令，建议使用 `npm link` 将本地命令行挂载到全局系统路径中：
```bash
# 执行链接命令 (Mac/Linux 下若遇到权限问题，请在前面加 sudo)
npm link
```
*   **验证全局可用性**：运行成功后，在新开的任何终端窗口中执行 `chaos --version` 即可输出当前版本。
*   **不使用链接的备选方案**：若不想使用全局链接，您也可以在执行时使用相对或绝对路径来直接拉起，如：`node /path/to/chaos-code/cli.js [command]`。


### 3. 配置 API Key

Chaos Code 支持 OpenAI 和 Anthropic 系列模型。请在终端环境变量中进行配置：

```bash
# OpenAI 或兼容提供商（默认使用 gpt-4o-mini）
export OPENAI_API_KEY="your-openai-api-key"
export STDD_LLM_BASE_URL="https://api.openai.com/v1" # 可选，自定义中转端点

# 或使用 Anthropic 提供商（默认使用 claude-3-5-sonnet-latest）
export ANTHROPIC_API_KEY="your-anthropic-api-key"
```

### 4. 运行终端 REPL

直接不带参数运行 `cli.js`，即可启动交互终端：

```bash
node cli.js
```

进入终端后，你将看到版本号和当前 provider/model 的欢迎横幅，提示符 `main*:gpt-4o > ` 正在等待输入。

也可以通过管道模式快速使用：

```bash
echo "explain this codebase" | node cli.js
cat error.log | node cli.js "fix this error"
git diff | node cli.js "review these changes"
```

---

## 📚 交互指令（Slash Commands）

在交互式 REPL 中，你可以使用斜杠指令来快速管理你的会话、检查状态和操控 Git：

| 斜杠指令 | 说明 |
| :--- | :--- |
| `/help` | 显示所有可用的斜杠指令与操作帮助 |
| `/status` | 检查当前活跃的 STDD 变更状态与 TDD 阶段门禁 |
| `/diff` | 展示当前工作区的 Git 状态及统一补丁（Diff）预览 |
| `/commit` | 交互式暂存（Stage）当前所有修改，并引导输入信息进行提交 |
| `/rollback` | 一键执行强行回滚（`git reset --hard`），丢弃本会话所有修改 |
| `/undo [file]` | 恢复 AI 代理最近修改的文件（支持 `/undo all` 恢复全部） |
| `/model [name]` | 查看当前激活的模型，或直接切换模型（如 `/model gpt-4o`） |
| `/models` | 列出当前提供商的所有可用模型 |
| `/providers` | 列出所有已配置的提供商及其状态 |
| `/connect` | 交互式配置 API Key、Base URL、模型 |
| `/cost` | 实时查看本会话的 Prompt / Completion Token 用量及累计费用折算 |
| `/session` | 详细查看本会话的基本元数据、激活提供商、模型与消息总数 |
| `/config [key] [value]` | 查看/修改持久化配置（verbosity、阈值、per-tool 权限等） |
| `/compact` | 智能截断并压缩历史聊天上下文，保留最近关键状态以节省 Token |
| `/history [keyword]` | 搜索跨会话持久化的命令历史 |
| `/resume` | 列出并恢复历史保存的会话 |
| `/export` | 导出当前对话为 Markdown 文件 |
| `/tasks [status]` | 查看当前会话的任务列表及状态 |
| `/skills [keyword]` | 列出 53 个 STDD 技能目录（支持过滤） |
| `/skill <name> [args]` | 加载 STDD 技能指令并交给 AI 执行（`$ARGUMENTS` 替换） |
| `/cmds [keyword]` | 列出 86 个命令模板 |
| `/cmd <name> [args]` | 加载命令模板并交给 AI 执行 |
| `/hooks` | 查看已配置的生命周期钩子 |
| `/plan [on\|off]` | 切换 Plan Mode（只读规划，审阅后放行执行） |
| `/agents` | 列出具名子代理配置（`.chaos/agents.json`） |
| `/plugins` | 列出已安装的工作区插件包 |
| `/checkpoint [label\|list]` | 保存/列出全工作区检查点 |
| `/rewind <id>` | 把所有被触及文件恢复到检查点时间点 |
| `/verbose [0-2]` | 设置输出详细程度（0=简洁, 1=正常, 2=详细） |
| `/reset` | 清除当前对话的上下文历史，开始全新的会话 |
| `/clear` | 清理并重置终端屏幕显示 |
| `/exit` 或 `/quit` | 安全退出 Chaos Code 终端 |

---

## 🔧 Model Context Protocol (MCP) 配置

要在 Chaos Code 中加载外部 MCP 工具，请在工作区中创建 `stdd/mcp-servers.json` 配置文件：

```json
{
  "mcpServers": {
    "sqlite": {
      "command": "uvx",
      "args": ["mcp-server-sqlite", "--db-path", "./data.db"]
    },
    "webbrowser": {
      "command": "node",
      "args": ["/path/to/mcp-server-playwright/dist/index.js"]
    }
  }
}
```

Chaos Code 启动时会自主拉起这些进程，通过标准 I/O 协商协议，并动态向 AI 代理注册诸如 `sqlite_query`、`webbrowser_navigate` 等前缀工具。

---

## 🧩 工作区扩展点（.chaos/ 目录）

| 文件/目录 | 作用 |
| :--- | :--- |
| `.chaos/agents.json` | 具名子代理：`{"agents":{"reviewer":{"prompt","tools","model"}}}`，`task_dispatch` 按 `agent` 引用 |
| `.chaos/plugins/<name>/` | 插件包：`plugin.json` + `skills/` + `commands/` + `hooks.json`（hooks 需在全局配置 `trustedPlugins` 白名单后才会执行） |
| `.chaos/lsp.json` | LSP 服务器映射：`{"typescript":{"command":["typescript-language-server","--stdio"]}}`，启用 `symbols` 工具的 LSP 模式 |
| `stdd/skills/`、`stdd/commands/` | 工作区技能/命令模板（同名时优先于内置与插件） |
| `stdd/mcp-servers.json` | MCP 服务器配置 |

用户级配置（全局）：`~/.chaos/config.json`（含 `sandbox`/`hooks`/`trustedPlugins`/`maxTokens`/`promptCaching`/`mcpTimeout`/per-tool 权限）、`~/.chaos/agents.json`、`~/.chaos/providers.json`（提供商凭据）、`~/.chaos/backups/`（写前快照）、`~/.chaos/checkpoints/`（会话检查点）、`~/.chaos/sessions/`（会话历史）。

---

## 🔌 SDK / HTTP Server / ACP

```bash
# HTTP Server（Bearer 鉴权：CHAOS_SERVER_TOKEN）
node cli.js serve --port 8787
curl -s http://127.0.0.1:8787/v1/agent/run -H 'Content-Type: application/json' \
  -d '{"prompt":"explain this repo"}'

# ACP（stdio NDJSON，编辑器可直驱）
node cli.js acp

# SDK（程序化嵌入）
node -e "require('./src/sdk').runPrompt({prompt:'hi', cwd:process.cwd()}).then(r => console.log(r.reply))"
```

---

## 📂 项目结构

```bash
chaos-code/
├── __tests__/           # Jest 自动化测试套件（221 套件 / 4500+ 用例）
├── cli.js               # CLI 统一主入口、四路分发（REPL/管道/子命令/serve/acp）
├── src/
│   ├── cli/
│   │   ├── commands/    # 子命令实现（chaos-terminal.js 交互终端等）
│   │   ├── server.js    # chaos serve HTTP API
│   │   ├── acp.js       # chaos acp 编辑器协议适配
│   │   ├── checkpoints.js # 会话级检查点与 /rewind
│   │   ├── file-backups.js # 写前快照（/undo 三级恢复链）
│   │   ├── completer.js / history.js / session-store.js / config.js / notifications.js / pager.js
│   │   ├── renderer/    # 流式 Markdown 渲染 + 代码高亮
│   │   └── registry/    # 命令加载与注册中心
│   ├── sdk/             # 程序化嵌入 SDK（runPrompt）
│   ├── runtime/
│   │   └── agent-kernel/ # 核心代理内核
│   │       ├── chaos-agent-loop.js # 自主控制环（权限门/Plan Mode/多模态/thinking 补推）
│   │       ├── subagent.js  # 子代理执行（并行池/后台常驻/具名 agent/cwd 隔离）
│   │       ├── hooks.js     # 生命周期钩子（异步 spawn/trustedPlugins 信任门）
│   │       ├── lsp.js       # LSP 客户端 + 启发式符号提取
│   │       ├── git-tool.js  # Git 全套 + worktree + gh PR
│   │       ├── mcp-client.js# MCP stdio 客户端（超时/宽限/防泄漏）
│   │       └── ...           # provider-config / tool-registry / patch / test / shell / read-only
│   └── utils/           # skills-loader / plugins-loader / agents-config / os-sandbox / security 等
└── test-support/        # e2e 冒烟脚本（真实模型 + 本地全栈 TLS/SSE 假服务）
```

---

## 🧪 验证与测试

我们提供了完整的单元测试套件来保证内核和交互终端的逻辑正确性。你可以运行：

```bash
# 运行全部测试
npm run test:all

# 运行新增的 Git 写入、MCP 路由及 Terminal 功能测试
npx jest __tests__/git-mcp-enhancements.test.js __tests__/chaos-terminal.test.js

# 真实 LLM 端到端冒烟（需要一个 API key；验证 真实模型→工具调用→文件修改 全链路）
OPENAI_API_KEY=sk-... bash test-support/e2e-llm-smoke.sh
# 或任意 OpenAI 兼容端点：
STDD_LLM_API_KEY=... STDD_LLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4 bash test-support/e2e-llm-smoke.sh
# 或本地模型服务（Ollama / LM Studio，http:// 端点同样支持）：
STDD_LLM_API_KEY=local STDD_LLM_BASE_URL=http://127.0.0.1:1234/v1 \
  STDD_LLM_MODEL=qwen3.5-9b-mlx bash test-support/e2e-llm-smoke.sh

# 无需任何 key 的本地全链路冒烟（本地 HTTPS 假模型服务：真 TLS + 真 SSE + 真工具执行）
bash test-support/e2e-local-smoke.sh
```

---

## 📄 开源许可

本项目基于 [MIT 许可证](LICENSE) 发布。
