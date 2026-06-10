# Chaos Code 🤖

> **基于 Spec + Test 驱动的下一代自主 AI 编程中枢 & 命令行交互终端**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-green.svg)](https://nodejs.org/)

Chaos Code 是一个专注于命令行交互、具备完全自主能力的 AI 协同开发框架。它深受 Claude Code 和 Claw Code 的启发，深度融合了规范驱动开发（Spec-Driven）与测试驱动开发（TDD）理念，同时支持 Model Context Protocol (MCP) 多模型兼容，实现“自主读取代码、规划修改、运行本地测试、修复错误，并直接处理 Git 提交与推送”的闭环能力。

---

## 🌟 核心特性

*   **⚡ 自主交互与闭环（Claude-like Shell）**
    直接在终端以交互式会话（REPL）运行。AI 可以智能分析项目结构、自主检索文件、撰写统一补丁（Unified Diff）、并自动执行本地测试。
*   **🛠️ 完整的 Git 自动化链条**
    支持 AI 代理自动调用 Git 写入命令（如 `git.add`、`git.commit`、`git.push`、`git.checkout` 等），支持会话内变更预览及安全确认机制，提供一键 `/rollback`、`/commit` 交互命令。
*   **🔌 强大的 MCP 协议支持**
    内置高适配 Model Context Protocol 客户端，可动态拉起外部 stdio 协议 MCP 服务（如数据库操作、浏览器驱动等），并将外部工具动态反射至大模型认知网络中。
*   **🩺 智能自愈测试环（Self-Healing Loop）**
    如果在运行本地测试（`test_run`）时发生失败，AI 代理会自动解析错误日志与调用栈信息，生成自愈提示并进入“修补-再测试”循环，直至全部验证通过。
*   **🧠 多模型自由切换与开销监控**
    同时兼容 OpenAI、Anthropic 等主流提供商，支持在交互终端中通过 `/model` 实时无缝切换模型，并自动实时折算和统计会话 Token 开销与估算费用。
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

进入终端后，你将看到一个富美学样式的欢迎横幅，提示符 `chaos > ` 正在等待输入。

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
| `/model [name]` | 查看当前激活的模型，或直接切换模型（如 `/model gpt-4o`） |
| `/cost` | 实时查看本会话的 Prompt / Completion Token 用量及累计费用折算 |
| `/session` | 详细查看本会话的基本元数据、激活提供商、模型与消息总数 |
| `/compact` | 智能截断并压缩历史聊天上下文，保留最近关键状态以节省 Token |
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

## 📂 项目结构

```bash
chaos-code/
├── __tests__/           # Jest 自动化测试套件
├── cli.js               # CLI 统一主入口与 Claw-like 路由分配
├── package.json         # 项目元数据与依赖定义
├── src/
│   ├── cli/
│   │   ├── commands/    # CLI 子命令实现（包括交互式 chaos-terminal.js）
│   │   └── registry/    # 命令行加载与命令注册中心
│   └── runtime/
│       └── agent-kernel/# 核心代理内核
│           ├── chaos-agent-loop.js # Claude-like 自主控制环与自愈引擎
│           ├── git-tool.js          # Git 写入自动化工具集
│           ├── mcp-client.js        # MCP 协议 stdio 客户端与生命周期管理
│           ├── tool-registry.js     # 代理工具注册中心
│           └── index.js             # 代理内核核心逻辑与路由反射
└── test-support/        # 单元测试辅助脚手架与模拟数据
```

---

## 🧪 验证与测试

我们提供了完整的单元测试套件来保证内核和交互终端的逻辑正确性。你可以运行：

```bash
# 运行全部测试
npm run test:all

# 运行新增的 Git 写入、MCP 路由及 Terminal 功能测试
npx jest __tests__/git-mcp-enhancements.test.js __tests__/chaos-terminal.test.js
```

---

## 📄 开源许可

本项目基于 [MIT 许可证](LICENSE) 发布。
