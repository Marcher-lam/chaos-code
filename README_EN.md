# STDD Copilot

**Specification & Test-Driven Development Copilot**

A **Skill Graph**-based full-lifecycle automation development framework that deeply integrates **Spec-First** with **TDD**.

**Current baseline**: 80 test suites, 893 tests passed, zero npm audit vulnerabilities.

[**English**](./README_EN.md) · [**简体中文**](./README.md)

---

## CLI Quick Reference

```
stdd init                    # Initialize project
stdd init /path/to/project   # Specify directory
stdd init --force            # Force overwrite

stdd list                    # List active changes
stdd list --specs            # List specs
stdd list --archived         # Include archived
stdd list --json             # JSON format

stdd status                  # Overall status
stdd status add-dark-mode    # Specific change status

stdd new change add-dark-mode
stdd new spec auth
stdd skills                  # List all skills
stdd skills --phase 4        # Filter by phase
stdd commands                # List slash commands

stdd ff "add dark mode"      # Fast-forward
stdd spec add-dark-mode      # Generate BDD feature
stdd apply add-dark-mode     # TDD implementation
stdd continue add-dark-mode  # Continue
stdd verify add-dark-mode    # Verify
stdd archive add-dark-mode   # Archive

stdd constitution            # View all articles
stdd constitution show 2     # View Article 2
stdd constitution check      # Compliance check

stdd hooks install           # Install Hooks
stdd hooks verify            # Verify Hooks
stdd hooks status            # View Hooks status
stdd hooks disable           # Disable Hooks
stdd hooks enable            # Re-enable Hooks

stdd progress                # Progress history
stdd progress --summary      # Progress summary
stdd progress --resume       # Breakpoint resume
stdd progress --json         # JSON output
stdd progress --clear        # Clear progress
```

### All Slash Commands (58)

**Command Templates (20)**: `/stdd:init` `/stdd:new` `/stdd:propose` `/stdd:clarify` `/stdd:confirm` `/stdd:spec` `/stdd:plan` `/stdd:apply` `/stdd:execute` `/stdd:verify` `/stdd:archive` `/stdd:final-doc` `/stdd:brainstorm` `/stdd:issue` `/stdd:constitution` `/stdd:ff` `/stdd:continue` `/stdd:explore` `/stdd:graph` `/stdd:turbo`

**Skill Templates (38)**: `/stdd:api-spec` `/stdd:certainty` `/stdd:commit` `/stdd:complexity` `/stdd:context` `/stdd:contract` `/stdd:design` `/stdd:factory` `/stdd:guard` `/stdd:help` `/stdd:iterate` `/stdd:learn` `/stdd:memory` `/stdd:metrics` `/stdd:mock` `/stdd:mutation` `/stdd:outside-in` `/stdd:parallel` `/stdd:prp` `/stdd:roles` `/stdd:schema` `/stdd:supervisor` `/stdd:user-test` `/stdd:validate` `/stdd:vision`

---

## Why STDD Copilot?

| Problem | STDD's Solution |
|---------|----------------|
| AI coding drifts from requirements | Multi-round clarification + Confirm Gate → rigorous BDD specs |
| No tests before code, tech debt piles up | Ralph Loop TDD: Red → Green → Mutation Review → Refactor |
| Code quality relies on manual review | 9 Constitution articles + Hook auto-enforcement |
| Context lost after terminal restart | Real-time progress tracking with breakpoint resume |

## Quick Start

```bash
# Install
npm install -g @marcher-lam/stdd-copilot@latest

# 5-minute workflow
cd your-project
stdd init
stdd new change add-dark-mode
stdd ff "add dark mode support"
stdd apply add-dark-mode
stdd verify add-dark-mode
stdd archive add-dark-mode
```

### With AI Coding Tools

```bash
/stdd:init
/stdd:ff implement a todo-list with Markdown export
/stdd:apply
/stdd:verify
/stdd:archive
```

## Core Workflow

```
init → new → propose → clarify → confirm → spec → plan → apply → verify → archive
  │                 │           │                                        │
  └── stdd ff ──────┘  AI clarifies  ──┘                              mutation
                                                                       evidence
```

| Scenario | Command Path |
|----------|-------------|
| Clear requirement | `stdd ff "desc"` → `stdd apply` → `stdd verify` → `stdd archive` |
| Vague requirement | `stdd new` → `stdd continue` → `stdd apply` → ... |
| Bug fix | `stdd issue "desc"` → TDD minimal fix → `stdd verify` → `stdd archive` |
| One-shot | `stdd turbo "desc"` → auto-complete all phases → `stdd commit` |

## Key Features

| Feature | Description |
|---------|-------------|
| **Spec-First** | 78 structured reasoning methods + Confirm Gate → BDD specs |
| **Ralph Loop TDD** | 🔴 Red → Static Check → 🟢 Green → Mutation Review → 🔵 Refactor |
| **5-Level Defense** | Confirm gates · Micro-task isolation · Failure rollback · Static quality · Pseudo-mutation |
| **Constitution + Hook** | 9 articles + Pre/Post Hook auto-enforcement + Waiver tracking |
| **38 Skills + 12 Agents** | Full session coverage from requirements to commit |
| **Skill Graph** | Dynamic DAG orchestration with intent-adaptive topology |
| **Dual Entry** | CLI (`stdd`) + AI tooling slash commands (`/stdd:*`) |
| **Progress Tracking** | Real-time JSONL log, survives crashes, breakpoint resume |
| **Monorepo Support** | `--workspace` scope, per-package test detection |
| **Browser Driver** | Built-in Playwright integration for E2E |

## Commands

### Core Flow

| CLI | Slash | Description |
|-----|-------|-------------|
| `stdd init` | `/stdd:init` | Initialize project |
| `stdd new change <name>` | `/stdd:new` | Create change |
| `stdd spec <change>` | `/stdd:spec` | Generate BDD specs |
| `stdd apply <change>` | `/stdd:apply` | TDD implementation |
| `stdd verify <change>` | `/stdd:verify` | Verify (tests + Constitution + Evidence) |
| `stdd archive <change>` | `/stdd:archive` | Archive + Delta Spec Merge |
| `stdd ff <desc>` | `/stdd:ff` | Fast-Forward |
| `stdd turbo <desc>` | `/stdd:turbo` | One-shot full pipeline |
| `stdd issue <desc>` | `/stdd:issue` | Bug TDD fix flow |
| `stdd continue <change>` | `/stdd:continue` | Continue next artifact |
| `stdd explore [scope]` | `/stdd:explore` | Read-only exploration |

### SDD Enhancement

| CLI | Description |
|-----|-------------|
| `stdd api-spec [change]` | API spec (OpenAPI/TypeScript) |
| `stdd schema validate` | JSON Schema/Zod validation |
| `stdd contract <action>` | Contract testing (5 message patterns) |
| `stdd validate [change]` | Spec Guardian validation |
| `stdd fix-packet [change]` | Golden Packet failure context |

### TDD Enhancement

| CLI | Description |
|-----|-------------|
| `stdd mutation [change]` | Mutation testing (Quick heuristic + Stryker) |
| `stdd outside-in <action>` | Outside-in TDD (E2E→Integration→Unit) |

### Quality & Governance

| CLI | Description |
|-----|-------------|
| `stdd guard` | TDD guard + Anti-Bypass |
| `stdd constitution` | 9 articles management (check/status/fix/audit/waive) |
| `stdd hooks` | Hook management (install/verify/enable/disable) |
| `stdd progress` | Progress tracking (--summary/--resume/--clear) |
| `stdd metrics` | Quality metrics dashboard |
| `stdd doctor` | Project health diagnosis |
| `stdd depcheck` | Unused dependency detection |

### Graph Engine

| CLI | Description |
|-----|-------------|
| `stdd graph run <intent>` | Dynamic DAG execution |
| `stdd graph history` | Execution history |
| `stdd graph recommend` | Smart next-step recommendation |

### Advanced

| CLI | Description |
|-----|-------------|
| `stdd workspace` | Monorepo registry (list/validate/repair) |
| `stdd learn` | Pattern Teaching + style extraction |
| `stdd roles` | 12 Agent role collaboration |
| `stdd story` | Story Mapping → BDD |
| `stdd commit` | Atomic commit (red:/green:/refactor: prefix) |
| `stdd runtime agent` | Party Mode multi-Agent state machine |
| `stdd runtime sudo` | SudoLang pseudo-code parser |

## Implementation Boundary

**CLI-ified** (57 commands): init, start, doctor, new, ff, spec, api-spec, apply, continue, mutation, verify, archive, commit, constitution, guard, hooks, graph, workspace, metrics, context, ci, starters, depcheck, schema, contract, validate, fix-packet, outside-in, learn, roles, story, user-test, pipeline, extensions, progress, recommend, explore, brainstorm, issue, turbo, runtime, etc.

**Runtime Engines**: Agent state machine (Party Mode), SudoLang parser, built-in browser driver (Playwright), dynamic Graph orchestration (DAG), breakpoint-resume progress tracking, evidence capture & audit.

**Requires External AI**: Real AI auto-coding, full multi-Agent runtime, factory deep generation, remote extension registry.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js >= 20.0.0 (CommonJS, no build step) |
| CLI | Commander.js |
| Core Engine | Skill Graph DAG + Agent State Machine + SudoLang |
| Testing | Framework-agnostic (default Jest, supports Vitest/pytest) |
| AI Integration | 22 engines, 4-tier compatibility |
| Containerization | Docker + docker-compose |

## Documentation

| Document | Description |
|----------|-------------|
| [English Docs Index](./docs/en/README.md) | English documentation hub and entry-point map |
| [Getting Started](./docs/en/getting-started.md) | First-run workflow and quick CLI reference |
| [CLI Guide](./docs/en/cli-guide.md) | Full CLI command reference |

## Contributing

Issues and Pull Requests are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT License](LICENSE)

---

<div align="center">

**STDD Copilot** — Your AI pair-programming expert that never drifts

Made with ❤️ by [Marcher-lam](https://github.com/Marcher-lam)

</div>
