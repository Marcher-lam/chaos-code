# Chaos Code 🤖

> **Spec + Test Driven Next-Gen Autonomous AI Coding Agent & Interactive Terminal REPL**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-green.svg)](https://nodejs.org/)

Chaos Code is an interactive, fully-autonomous AI coding assistant designed to run directly in your terminal. Inspired by Claude Code and Claw Code, it integrates Spec-Driven development with Test-Driven Development (TDD) pipelines while offering multi-LLM compatibility and Model Context Protocol (MCP) support. 

Chaos Code is capable of autonomously reading files, planning modifications, running local tests, fixing test failures on the fly, and managing Git staging, commits, and pushes in a closed-loop fashion.

---

## 🌟 Key Features

*   **⚡ Claude-like Autonomous REPL**
    Start a conversational session directly in your terminal. The AI agent can inspect your workspace, search for patterns, apply unified diff patches (`fs_patch`), and verify modifications through local test suites.
*   **🛠️ Full Git Automation Pipeline**
    Supports AI-driven Git operations (`git.add`, `git.commit`, `git.push`, `git.checkout`, etc.) protected by user authorization gates. Allows previewing patches and staging updates via simple shell interactions.
*   **🔌 Model Context Protocol (MCP) Client**
    Includes a built-in JSON-RPC 2.0 based MCP client over stdio. Seamlessly connect and execute tools from external MCP servers (e.g. SQLite database tools, Playwright browser tools) reflection-registered into the LLM prompt context.
*   **🩺 Self-Healing Test Loops**
    If any test runner (`test_run`) returns a failure, the AI agent automatically parses the stderr/stdout stack traces and enters a "Repair-and-Verify" loop, fixing the codebase using diff patches until all tests pass.
*   **🧠 Multi-LLM Routing & Cost Tracking**
    Compatible with OpenAI and Anthropic API models. Easily switch active models via `/model` inside the REPL and track token usage, completion metrics, and session cost dynamically.
*   **📈 Ralph Loop Spec Gates**
    Breaks down developer goals into eight distinct, rigorous phases: `inspect -> propose -> spec -> plan -> patch -> test -> verify -> summarize`, ensuring full code quality compliance.

---

## 🚀 Quick Start

### 1. Requirements

*   **Node.js**: `>= 20.0.0`
*   **Git**: A local repository initialized with a remote source configured.

### 2. Installation

Install project dependencies in the root directory:

```bash
npm install
```

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
| `/model [name]` | Inspect current model or switch active model (e.g., `/model gpt-4o`) |
| `/cost` | Display cumulative token usage (Prompt/Completion) and estimated session cost |
| `/session` | Inspect active provider, model name, message counts, and stats |
| `/compact` | Compact chat history context to fit limits and save tokens |
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
├── __tests__/           # Jest test suite
├── cli.js               # CLI Entrypoint & Claw-like command router
├── package.json         # Package configuration and scripts
├── src/
│   ├── cli/
│   │   ├── commands/    # CLI command modules (including chaos-terminal.js)
│   │   └── registry/    # Command loader and registries
│   └── runtime/
│       └── agent-kernel/# Core AI Agent Kernel
│           ├── chaos-agent-loop.js # Claude-like loop & self-healing runner
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
