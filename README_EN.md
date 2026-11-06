# Chaos Code 🤖

> **Spec + Test Driven Autonomous AI Coding Agent — Terminal REPL, HTTP Server, ACP & SDK**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-green.svg)](https://nodejs.org/)

Chaos Code is a fully-autonomous AI coding agent designed to run in your terminal. It fuses Spec-Driven development with Test-Driven Development (TDD), speaks the Model Context Protocol (MCP), and closes the loop: read code → plan → patch → run tests → self-heal → commit/push/PR — with production-grade safety (OS sandbox, permission gates, checkpoints) and STDD governance on top.

---

## 🌟 Key Features

*   **⚡ Autonomous Interactive REPL**
    Streaming Markdown rendering (syntax highlighting + line numbers + tables), Tab completion (slash commands / model names / skill names / file paths), multi-line input, dynamic prompt (`branch*:model`), structured tool display (`⏺`), Ctrl+C interrupt, auto-paging. Pipe mode: `git diff | node cli.js "review these changes"`.
*   **🛡️ OS-Level Sandbox (macOS seatbelt / Linux bubblewrap)**
    `shell_run` / `test_run` execute inside a real OS sandbox: writes to system and credential dirs (`~/.ssh`, `~/.aws`, `~/.gnupg`) are kernel-denied while the workspace and `/dev/null` redirects keep working (verified on a real Mac). The toggle is operator-only (`sandbox: 'auto'|'off'` or `CHAOS_SANDBOX`); `CHAOS_SANDBOX=on` fails CLOSED when no sandbox tool exists.
*   **👥 Parallel & Resident Subagents (`task_dispatch`)**
    Up to 5 tasks per dispatch (3 concurrent), each in an isolated context. Read-only tools by default; explicitly granted write tools still go through the same y/n/a/s permission gate. `background: true` keeps tasks RESIDENT across REPL turns with completion notices and `task_status` polling; pipe/SDK runs drain automatically. Named agent personas from `.chaos/agents.json` (`{reviewer: {prompt, tools, model}}`).
*   **🌲 Multi-Workspace via Git Worktrees**
    `git_worktree` (list/add/remove under `.worktrees/<name>`) + `task_dispatch {cwd}` gives a subagent its own kernel and rebuilt system prompt inside an isolated worktree — conflict-free parallel edits.
*   **🌗 Plan Mode**
    `/plan` enforces read-only at the kernel level: write tools are refused and the model is steered toward presenting an implementation plan (files / steps / risks). `/plan off` releases execution. Applies to subagents too.
*   **🧭 Symbol Navigation (LSP + heuristics)**
    The `symbols` tool drives a REAL LSP client when you configure `.chaos/lsp.json` (Content-Length framing, initialize/didOpen/documentSymbol, timeouts); with zero config it falls back to dependency-free heuristic extraction for js/ts/py/go/rs/java/php — functions/classes/methods/types with line numbers, jump with `fs_read startLine`.
*   **👁 Multimodal Image Input (`fs_read_image`)**
    Reads png/jpg/gif/webp (≤5MB) as base64 and delivers it provider-natively: OpenAI wire → `image_url` vision block; Anthropic wire → `image` block inside `tool_result`.
*   **🔌 SDK / HTTP Server / ACP**
    - SDK: `require('@marcher-lam/chaos-code/src/sdk')` → `runPrompt({prompt, cwd, maxTurns, onToken})`
    - `chaos serve`: HTTP API (`POST /v1/agent/run`, `/v1/skills`, `/v1/agents`, `/v1/health`) with optional `CHAOS_SERVER_TOKEN` bearer auth and single-flight run guard
    - `chaos acp`: minimal Agent Client Protocol over stdio (initialize / session new / streaming prompt chunks / cancel) for editor integration
*   **🧩 Five Extension Layers**
    Skills (53 STDD skills + 86 command templates, dual-hosted: usable in this REPL AND installable into Cursor, Copilot and 20+ other popular AI coding agents), Hooks (async spawn, timeout SIGKILL, preToolUse veto, plugin hooks behind a `trustedPlugins` trust gate), Subagents, Plugins (`.chaos/plugins/<name>/`), MCP (per-request timeout, 120s startup grace, leak-proof).
*   **🪝 Lifecycle Hooks**
    `~/.chaos/config.json` → `hooks: {preToolUse: [...], postToolUse: [...]}`. Hooks receive a JSON payload on stdin; non-zero exit blocks the tool call. Execution is ASYNC — a slow hook never freezes streaming or parallel subagents.
*   **🧠 Context Management**
    LLM-summarized compaction (structural-truncation fallback, original goal always preserved), Anthropic prompt caching with cache_control breakpoints (cloned per request — never accumulates), real usage via `stream_options.include_usage`, `maxTokens` configurable, CLAUDE.md/AGENTS.md/CHAOS.md project memory injection. Thinking models (qwen3/GLM/DeepSeek-R1): `reasoning_content` captured; empty-answer turns are nudged once instead of silently ending.
*   **⏪ Checkpoints & Undo**
    Every turn that writes files auto-saves a whole-workspace checkpoint (`/checkpoint`, `/rewind <id>`, last 10 kept); per-file `/undo` chains pre-write snapshots → git restore → delete-agent-created-files.
*   **🛠️ Full Git Automation**
    add/commit/push (current-branch default)/pull/log/stash/checkout/branch/reset + `git_pr` (gh CLI, timeout-aware duplicate-PR protection) + `git_worktree`. Argument-injection hardened.
*   **📖 Big-File & Secret Safety**
    Windowed `fs_read` (2000-line pages, UTF-8 byte budget, 16MB hard cap, `totalLines/truncated` metadata); secret-shaped files (`.env`, `*.pem`, `id_rsa*`, `credentials`) are refused from auto-read.
*   **⚙️ Configuration**
    `~/.chaos/config.json`: verbosity, thresholds, `maxTurns`, `temperature`, `maxTokens`, `promptCaching`, `mcpTimeout`, `sandbox`, `hooks`, `trustedPlugins`, per-tool permission defaults. Live view/edit via `/config`.
*   **📊 Sessions & History**
    Auto-saved sessions (`/resume`, `/export`), cross-session command history (`/history`), token/cost tracking per turn.
*   **📈 Ralph Loop STDD Governance**
    Eight rigorous phases — `inspect -> propose -> spec -> plan -> patch -> test -> verify -> summarize` — with TDD red/green/refactor state gates, a 9-article constitution checker, mutation-testing evidence ledgers and DAG orchestration. The moat.

---

## 🚀 Quick Start

### 1. Requirements
*   **Node.js** `>= 20.0.0` · **Git** installed (workspace `git init`-ed with an `origin` remote for push/PR tools)

### 2. Install

```bash
git clone https://github.com/Marcher-lam/chaos-code.git
cd chaos-code
npm install
npm link   # optional: exposes `chaos` / `stdd` / `ace` globally
```

### 3. API Key (multi-vendor / custom endpoints)

```bash
export OPENAI_API_KEY="sk-..."                        # OpenAI-compatible (default gpt-4o-mini)
export ANTHROPIC_API_KEY="sk-ant-..."                 # Anthropic (default claude-3-5-sonnet-latest)
# Any OpenAI-compatible endpoint — http:// and arbitrary path prefixes (e.g. /api/paas/v4) work:
export STDD_LLM_API_KEY="..." STDD_LLM_BASE_URL="https://open.bigmodel.cn/api/paas/v4" STDD_LLM_MODEL="glm-4.7"
#   GLM:       https://open.bigmodel.cn/api/paas/v4           + glm-4.7
#   Kimi:      https://api.moonshot.cn/v1                     + moonshot-v1-128k
#   Qwen:      https://dashscope.aliyuncs.com/compatible-mode/v1 + qwen-max
#   LM Studio: http://127.0.0.1:1234/v1                       + a loaded model name
#   Ollama:    http://127.0.0.1:11434/v1                      + qwen3:8b etc.
```

Multiple providers coexist: `/connect` (persisted to `~/.chaos/providers.json`), `/providers` to list, `/model <name>` to hot-switch mid-session.

### 4. Run

```bash
node cli.js                    # interactive REPL
echo "explain this codebase" | node cli.js      # pipe mode
node cli.js serve --port 8787  # HTTP API server
node cli.js acp                # ACP agent over stdio
```

---

## 📚 REPL Slash Commands

| Command | Description |
| :--- | :--- |
| `/help` | List all commands |
| `/status` · `/recommend` · `/verify` · `/doctor` | STDD state / next step / verification / health checks |
| `/diff` · `/commit` · `/rollback` · `/undo [file\|all]` | Git inspect & revert (undo chains snapshot → git → delete) |
| `/model [name]` · `/models` · `/providers` · `/connect` | Model & provider management |
| `/cost` · `/session` · `/config [k] [v]` · `/verbose [0-2]` · `/compact` | Stats, config, compaction |
| `/history [kw]` · `/resume` · `/export` · `/reset` · `/clear` | Sessions & history |
| `/tasks [status]` | Task list (AI-managed via task_* tools) |
| `/skills [kw]` · `/skill <name> [args]` | 53 STDD skills catalog / load & run (`$ARGUMENTS` substitution) |
| `/cmds [kw]` · `/cmd <name> [args]` | 86 command templates catalog / load & run |
| `/hooks` | Configured lifecycle hooks |
| `/plan [on\|off]` | Plan mode (read-only until approved) |
| `/agents` · `/plugins` | Named agent configs / installed plugin packs |
| `/checkpoint [label\|list]` · `/rewind <id>` | Whole-workspace checkpoints |
| `/exit` · `/quit` | Exit (drains resident background tasks, kills MCP servers) |

---

## 🔧 MCP Integration

Create `stdd/mcp-servers.json`:

```json
{
  "mcpServers": {
    "sqlite": { "command": "uvx", "args": ["mcp-server-sqlite", "--db-path", "./data.db"] }
  }
}
```

Chaos Code spawns the servers, speaks stdio JSON-RPC, and reflects their tools into the model as prefixed functions (`sqlite_query`, …). Per-request timeouts are configurable (`mcpTimeout`); hung servers can't stall the loop and never leak.

---

## 🧩 Workspace Extension Points (`.chaos/`)

| Path | Purpose |
| :--- | :--- |
| `.chaos/agents.json` | Named subagent personas (`prompt`/`tools`/`model`) referenced by `task_dispatch {agent}` |
| `.chaos/plugins/<name>/` | Plugin pack: `plugin.json` + `skills/` + `commands/` + `hooks.json` (hooks execute only after `trustedPlugins` allowlisting) |
| `.chaos/lsp.json` | LSP servers (`{"typescript":{"command":["typescript-language-server","--stdio"]}}`) enabling LSP-backed `symbols` |

User-level state lives under `~/.chaos/`: `config.json`, `agents.json`, `providers.json`, `backups/` (pre-write snapshots), `checkpoints/` (session checkpoints), `sessions/`.

---

## 📂 Project Structure

```bash
chaos-code/
├── __tests__/            # Jest suite (221 suites / 4500+ tests, incl. docs-consistency)
├── cli.js                # Entrypoint & four-way routing (REPL / pipe / subcommands / serve / acp)
├── src/
│   ├── cli/              # commands/, server.js (HTTP), acp.js, checkpoints.js, file-backups.js,
│   │                     # completer, history, session-store, config, notifications, pager, renderer/, registry/
│   ├── sdk/              # Programmatic SDK (runPrompt)
│   ├── runtime/agent-kernel/  # chaos-agent-loop (permission gates/plan mode/multimodal/thinking nudge),
│   │                          # subagent (pool/resident/named/cwd isolation), hooks (async spawn + trust gate),
│   │                          # lsp (client + heuristics), git-tool (full suite + worktree + gh PR),
│   │                          # mcp-client, tool-registry, patch/test/shell/read-only tools
│   └── utils/            # skills-loader, plugins-loader, agents-config, os-sandbox, security, ...
└── test-support/         # e2e smokes: real-model suite + local full-stack fake provider (real TLS/SSE)
```

---

## 🧪 Verification & Testing

```bash
npm run test:all          # full Jest suite

# Real-LLM end-to-end smoke (needs any API key, or a local Ollama/LM Studio server)
OPENAI_API_KEY=sk-... bash test-support/e2e-llm-smoke.sh
STDD_LLM_API_KEY=local STDD_LLM_BASE_URL=http://127.0.0.1:1234/v1 \
  STDD_LLM_MODEL=qwen3.5-9b-mlx bash test-support/e2e-llm-smoke.sh

# Keyless full-stack smoke: local HTTPS fake provider (real TLS + real SSE + real tool execution)
bash test-support/e2e-local-smoke.sh
```

Three verification tiers ship with the repo: unit/integration Jest (4500+), a keyless full-stack local e2e, and a real-model e2e.

---

## 📄 License

[MIT](LICENSE)
