# Chaos Code 🤖

> **Spec + Test Driven Next-Gen Autonomous AI Coding Agent & Interactive Terminal REPL**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-green.svg)](https://nodejs.org/)

Chaos Code is an interactive, fully-autonomous AI coding assistant designed to run directly in your terminal. Inspired by Claude Code and Claw Code, it integrates Spec-Driven development with Test-Driven Development (TDD) pipelines while offering multi-LLM compatibility and Model Context Protocol (MCP) support. 

Chaos Code is capable of autonomously reading files, planning modifications, running local tests, fixing test failures on the fly, and managing Git staging, commits, and pushes in a closed-loop fashion.

---

## 🌟 Key Features

*   **⚡ Claude-like Autonomous REPL**
    Start a conversational session directly in your terminal. The AI agent can inspect your workspace, search for patterns, apply unified diff patches (`fs_patch`), and verify modifications through local test suites. Features streaming Markdown rendering, Tab completion (commands/model names/file paths), multi-line input, and dynamic prompt showing git branch + model.
*   **🛠️ Full Git Automation Pipeline**
    Supports AI-driven Git operations (`git.add`, `git.commit`, `git.push`, `git.checkout`, etc.) protected by user authorization gates. Allows previewing patches and staging updates via simple shell interactions. Includes `/undo` for reverting recent AI edits.
*   **🔌 Model Context Protocol (MCP) Client**
    Includes a built-in JSON-RPC 2.0 based MCP client over stdio. Seamlessly connect and execute tools from external MCP servers (e.g. SQLite database tools, Playwright browser tools) reflection-registered into the LLM prompt context.
*   **🩺 Self-Healing Test Loops**
    If any test runner (`test_run`) returns a failure, the AI agent automatically parses the stderr/stdout stack traces and enters a "Repair-and-Verify" loop, fixing the codebase using diff patches until all tests pass.
*   **🧠 Multi-LLM Routing & Cost Tracking**
    Compatible with OpenAI, Anthropic, DeepSeek, OpenRouter, Groq, and Ollama. Easily switch active models via `/model` inside the REPL and track token usage, completion metrics, and session cost dynamically. Supports `--model` and `--provider` CLI flags.
*   **🔧 18+ Built-in Tools + MCP Dynamic Extensions**
    Includes `fs_read`, `fs_search`, `fs_glob` (file pattern matching), `fs_grep` (regex search with context lines), `fs_write` (direct file creation), `fs_patch` (diff patches), `shell_run`, `test_run`, full Git tool suite, STDD tools, and MCP dynamic tools.
*   **⚙️ Persistent Configuration System**
    Manage all preferences (verbosity, auto-compact threshold, temperature, max turns, per-tool permissions) via `~/.chaos/config.json`. Real-time view/edit with `/config` command.
*   **📊 Session Persistence & Recovery**
    Auto-saves chat history to `~/.chaos/sessions/`. Resume past sessions with `/resume`, export conversations to Markdown with `/export`.
*   **📈 Ralph Loop Spec Gates**
    Breaks down developer goals into eight distinct, rigorous phases: `inspect -> propose -> spec -> plan -> patch -> test -> verify -> summarize`, ensuring full code quality compliance.

---

## 🚀 Quick Start

### 1. Requirements

*   **Node.js**: `>= 20.0.0` (LTS versions such as Node 20 or higher recommended)
*   **Git**: Git command line tools installed. The local project workspace must be initialized (`git init`) and linked to an `origin` remote repository.

### 2. Detailed Installation Steps

#### Step 1: Clone the Repository
Clone the Chaos Code repository into your local machine directory:
```bash
git clone https://github.com/Marcher-lam/chaos-code.git
cd chaos-code
```

#### Step 2: Install Project Dependencies
Run the install command inside the cloned `chaos-code` directory to load all required Node.js packages:
```bash
npm install
```

#### Step 3: Link the CLI Command Globally (Recommended)
To run the `chaos` or `stdd` commands directly from **any other project workspace** on your computer, create a global symlink:
```bash
# Link the local binaries to your global PATH (prepend sudo if permission errors occur on Mac/Linux)
npm link
```
*   **Verification**: Check if it's successfully linked by opening a new shell and running `chaos --version`.
*   **Alternative Exec Option**: If you prefer not to install the symlink globally, you can invoke the CLI directly using its relative or absolute path, e.g., `node /path/to/chaos-code/cli.js [command]`.


### 3. API Key Setup

Set the credentials for your desired AI provider in your terminal session:

```bash
# For OpenAI models (defaults to gpt-4o-mini)
export OPENAI_API_KEY="your-openai-api-key"
export STDD_LLM_BASE_URL="https://api.openai.com/v1" # Optional custom API endpoint

# For Anthropic models (defaults to claude-3-5-sonnet-latest)
export ANTHROPIC_API_KEY="your-anthropic-api-key"
```

### 4. Launching the Interactive REPL

Run the main CLI script without arguments to boot up the interactive terminal:

```bash
node cli.js
```

You will see a beautiful terminal banner, and the prompt `chaos > ` will wait for your instructions.

---

## 📚 REPL Slash Commands

Within the interactive shell, you can use the following commands to manage your session and git state:

| Command | Description |
| :--- | :--- |
| `/help` | List all available slash commands and guides |
| `/status` | View active STDD changes and current TDD pipeline phase |
| `/diff` | Display git working tree status and patch previews |
| `/commit` | Stage and commit all local modifications interactively |
| `/rollback` | Hard rollback (`git reset --hard`) and discard all uncommitted edits |
| `/undo [file]` | Revert recently patched files (supports `/undo all`) |
| `/model [name]` | Inspect current model or switch active model (e.g., `/model gpt-4o`) |
| `/models` | List all available models from the current provider |
| `/providers` | List all configured providers and their status |
| `/connect` | Interactive provider setup (API key, base URL, model) |
| `/cost` | Display cumulative token usage (Prompt/Completion) and estimated session cost |
| `/session` | Inspect active provider, model name, message counts, and stats |
| `/config [key] [value]` | View/edit persistent configuration (verbosity, thresholds, per-tool permissions) |
| `/compact` | Compact chat history context to fit limits and save tokens |
| `/history [keyword]` | Search cross-session persistent command history |
| `/resume` | List and restore previously saved sessions |
| `/export` | Export conversation to a Markdown file |
| `/verbose [0-2]` | Set output verbosity (0=minimal, 1=normal, 2=verbose) |
| `/reset` | Clear the active conversation history context |
| `/clear` | Clear the terminal screen |
| `/exit` or `/quit` | Exit the Chaos Code terminal shell |

---

## 🔧 Model Context Protocol (MCP) Integration

To hook up external MCP tools, create a config file at `stdd/mcp-servers.json` in your project root:

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

On shell initialization, Chaos Code will spawn these subprocesses, fetch their tool catalogs, and dynamically register prefixed actions like `sqlite_query` or `webbrowser_navigate` for the AI model to call.

---

## 📂 Project Structure

```bash
chaos-code/
├── __tests__/           # Jest test suite (204 suites)
├── cli.js               # CLI Entrypoint & Claw-like command router
├── package.json         # Package configuration and scripts
├── src/
│   ├── cli/
│   │   ├── commands/    # CLI command modules (including chaos-terminal.js)
│   │   ├── completer.js # Tab completion engine (commands/models/file paths)
│   │   ├── history.js   # Command history persistence (JSONL)
│   │   ├── session-store.js # Session persistence manager
│   │   ├── config.js    # User config manager (~/.chaos/config.json)
│   │   ├── notifications.js # Notification system (desktop + terminal bell)
│   │   ├── pager.js     # Output pager
│   │   ├── renderer/    # Terminal rendering engines
│   │   │   ├── markdown-renderer.js # Streaming Markdown renderer
│   │   │   └── code-highlighter.js  # Syntax highlighting
│   │   └── registry/    # Command loader and registries
│   └── runtime/
│       └── agent-kernel/# Core AI Agent Kernel
│           ├── chaos-agent-loop.js # Claude-like loop & self-healing runner
│           ├── provider-config.js  # Multi-provider config management
│           ├── git-tool.js          # Git write automation utilities
│           ├── mcp-client.js        # stdio JSON-RPC MCP client
│           ├── tool-registry.js     # Tool registration and schemas
│           └── index.js             # Kernel main class & route mappings
└── test-support/        # Mock helpers and benchmark scripts
```

---

## 🧪 Verification & Testing

Verify that everything is set up correctly by running the test suite:

```bash
# Run all automated tests
npm run test:all

# Run specific integration tests for the Git, MCP, and REPL enhancements
npx jest __tests__/git-mcp-enhancements.test.js __tests__/chaos-terminal.test.js
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
