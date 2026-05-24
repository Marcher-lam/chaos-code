<div align="center">

# STDD Copilot

**Specification-Driven + Test-Driven Development · A Process Control Layer for AI Coding Assistants**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-green.svg)](https://nodejs.org/)
[![npm](https://img.shields.io/npm/v/@marcher-lam/stdd-copilot)](https://www.npmjs.com/package/@marcher-lam/stdd-copilot)
[![Tests](https://img.shields.io/badge/tests-4158%2F4158%20passing-brightgreen.svg)](CONTRIBUTING.md)
[![Coverage](https://img.shields.io/badge/coverage-97%25%20stmts%20%7C%2093%25%20branch-brightgreen.svg)](CONTRIBUTING.md)

[简体中文](./README.md) · [English](./README_EN.md)

</div>

---

## Table of Contents

- [What is STDD Copilot](#what-is-stdd-copilot)
- [Why STDD](#why-stdd)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Full Workflow](#full-workflow)
- [Command Overview](#command-overview)
- [Constitution Quality Governance](#constitution-quality-governance)
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [Installation & Contributing](#installation--contributing)

---

## What is STDD Copilot

**STDD Copilot** is a CLI workflow framework that brings **Spec-First** discipline and **TDD** rigor to AI-assisted development. It generates a chain of checkpoint artifacts — BDD specifications, task lists, design documents, test evidence, and compliance audits — that keep AI coding assistants on a predetermined track, transforming vague prompts into verifiable engineering deliverables.

> **STDD is not an AI.** It is a process control layer that AI coding assistants execute against.

### Key Metrics

| Metric | Value |
|--------|-------|
| CLI Commands | 75 |
| Command Templates | 80 (`/stdd:*` slash commands) |
| Skill Templates | 47 |
| Test Suites | **191** suites, **4,158** tests, 100% passing |
| Statement Coverage | **97.7%** |
| Branch Coverage | **93.2%** |
| Supported AI Engines | 24 (Claude Code, Cursor, Windsurf, etc. across 4 tiers) |
| Code Generation Targets | TypeScript/JS, Python, Java, Go, Rust, C#, PHP |

### Two Equivalent Entry Points

```bash
# Option 1: CLI
stdd new change login
stdd apply login
stdd verify login

# Option 2: Slash commands in AI coding tools
/stdd:new login
/stdd:apply login
/stdd:verify login
```

---

## Why STDD

AI coding assistants are powerful but prone to drift. STDD applies constraints at every stage:

| Pain Point | How STDD Addresses It |
|------------|----------------------|
| AI misinterprets your intent | Multi-round clarification → Confirm Gate → BDD specification lock-in |
| AI ships untested code | Ralph Loop TDD closed-loop: Red → Green → Mutation → Refactor |
| No consistent quality bar | 9-article Constitution with automatic hook enforcement |
| Requirements drift silently | File-based Source of Truth (`stdd/changes/`) + Delta Spec Merge |
| Context lost on crash / close | Real-time JSONL progress log with resume-from-breakpoint |
| Over-implementation beyond scope | Micro-task decomposition (~30 min per task) + Confirmation Gates |
| Fake-green tests (pass but wrong) | Mutation testing (Quick Heuristic + Stryker deep mutation) |
| Multiple AI agents conflicting | Skill Graph topology scheduling + parallel executor |

---

## Quick Start

### Installation

```bash
npm install -g @marcher-lam/stdd-copilot@latest
```

> For source builds and Docker, see [INSTALL.md](./INSTALL.md).

### 30-Second Demo

```bash
cd your-project
stdd init                              # Initialize STDD directory structure

stdd new change add-dark-mode          # Create a change
stdd ff "add dark mode support"        # Fast-forward: proposal → specs → tasks
stdd apply add-dark-mode               # Execute TDD cycle
stdd verify add-dark-mode              # Run tests + constitution + evidence
stdd archive add-dark-mode             # Archive and merge specs
```

### Inside AI Coding Tools

```
/stdd:ff implement user login with OAuth
/stdd:apply --phase red
/stdd:verify
/stdd:archive
```

---

## Core Concepts

### Dual Mode: User-Driven + Agent-Driven

STDD automatically switches behavior based on your input:

| Input | Mode | Behavior |
|-------|------|----------|
| `/stdd:apply` (slash command) | **User-Driven** | Execute the specified command immediately, no orchestration |
| "Implement login" (natural language) | **Agent-Driven** | Auto-plan full execution path, pause only at confirmation gates |
| "Continue" / "Next step" | **Agent-Driven** | Advance to the next Phase |

```
User: Implement user login
Agent: [Read Skill Graph] → [Detect state] → [Auto-advance full workflow]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Phase 1/7: Requirement Proposal (propose)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
... (auto-generates proposal)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Phase 2/7: Requirement Clarification (clarify)
✅ Previous: proposal generated
🔜 Next: confirm ⚠️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ Confirmation Gate: Does the above understanding match your intent?
   Reply "confirm" to proceed, or provide corrections.
```

### Dual Scenario: Greenfield + Brownfield

| Scenario | Trigger | Workflow |
|----------|---------|----------|
| **Greenfield** | Empty directory or brand-new project | `init` → tech stack interview → standard STDD flow |
| **Brownfield** | Existing code but no `stdd/` config | Deep read → understanding report → user confirmation → standard STDD flow |

In Brownfield mode, STDD automatically:
1. Reads `package.json`, directory structure, and key entry files
2. Generates a project understanding report (tech stack, module dependencies, test coverage)
3. Waits for you to confirm the change scope before initializing STDD

### 5-Layer Anti-Drift Defense

```
Layer 1 — Confirmation Gates
         → Pause at requirement confirmation and archive for human approval

Layer 2 — Micro Tasks
         → ~30 minutes per task, max 6 tasks, prevents over-implementation

Layer 3 — Failure Rollback
         → Auto circuit-breaker after 3 consecutive failures, auto-stash

Layer 4 — Static Quality
         → ESLint + type checks, block on errors

Layer 5 — Mutation Review
         → Detect fake-green tests, mutation score ≥ threshold to archive
```

---

## Full Workflow

```
init → new → propose → clarify → confirm → spec → plan → apply → verify → archive
  │                   │        │                                        │
  │                   └ AI clarify ┘                          mutation evidence
  └── ff "desc" ──→ skip clarify, generate directly ──────────────────┘
```

### Phase Details

| Phase | Command | Artifacts | Description |
|-------|---------|-----------|-------------|
| **Init** | `stdd init` | `stdd/config.yaml`, directories | Initialize STDD project skeleton |
| **New** | `stdd new change <name>` | `proposal.md`, `.status.yaml` | Create change directory and proposal template |
| **Propose** | `stdd propose <req>` | Proposal content | Draft requirements; auto-detects oversized Epics |
| **Clarify** | `stdd clarify <change>` | Clarification records | 78 structured reasoning methods to resolve ambiguity |
| **Confirm** | `stdd confirm <change>` | Approval | ⚠️ Human-in-the-loop confirmation gate |
| **Spec** | `stdd spec <change>` | `.feature` BDD files | Given/When/Then specifications |
| **Plan** | `stdd plan <change>` | `tasks.md`, `design.md`, ADR | 5-6 micro-tasks + architecture decision records |
| **Apply** | `stdd apply <change>` | Implementation code | Ralph Loop: Red → Check → Green → Mutation → Refactor |
| **Verify** | `stdd verify <change>` | Verification report | 5-dimension verification + Constitution + evidence |
| **Archive** | `stdd archive <change>` | Archive | ⚠️ Final confirmation gate, merge Delta Specs |

### Fast Tracks

| Scenario | Shortcut |
|----------|----------|
| Clear feature | `stdd ff "desc"` → `apply` → `verify` → `archive` |
| Needs refinement | `stdd new change <name>` → `continue` → `apply` → … |
| Bug fix | `stdd issue "desc"` → TDD fix → `verify` → `archive` |
| One-shot | `stdd turbo "desc"` — auto-executes every phase |

---

## Command Overview

### Core Workflow (14 commands)

| CLI | Slash Command | Purpose |
|-----|--------------|---------|
| `stdd init [path]` | `/stdd:init` | Initialize STDD in a project |
| `stdd new change <name>` | `/stdd:new` | Create a change |
| `stdd propose <req>` | `/stdd:propose` | Draft requirement proposal |
| `stdd clarify <change>` | `/stdd:clarify` | Multi-round requirement clarification |
| `stdd confirm <change>` | `/stdd:confirm` | Confirmation gate |
| `stdd spec <change>` | `/stdd:spec` | Generate BDD `.feature` files |
| `stdd plan <change>` | `/stdd:plan` | Task breakdown + architecture decisions |
| `stdd apply <change>` | `/stdd:apply` | TDD implementation |
| `stdd execute <change>` | `/stdd:execute` | Strict Ralph Loop closed-loop execution |
| `stdd verify <change>` | `/stdd:verify` | 5-dimension verification |
| `stdd archive <change>` | `/stdd:archive` | Archive and merge specs |
| `stdd continue <change>` | `/stdd:continue` | Resume interrupted work |
| `stdd ff <desc>` | `/stdd:ff` | Fast-forward: proposal → specs → tasks |
| `stdd turbo <desc>` | `/stdd:turbo` | Full auto-pilot execution |

### SDD Enhancements (Specification-Driven Development)

| CLI | Purpose |
|-----|---------|
| `stdd api-spec [change]` | Generate OpenAPI 3.0 + multilanguage types/mocks/validators (TS/JS/Python/Java/Go/Rust/C#/PHP) |
| `stdd schema create / validate / fork` | JSON Schema / Zod type definitions |
| `stdd contract generate / verify` | Consumer-driven contract testing |
| `stdd validate [change]` | Spec Guardian consistency checks |
| `stdd final-doc <change>` | Generate aggregated requirement document |
| `stdd memory scan / search / forget` | 3-layer project memory system |
| `stdd product-proposal` | Full product proposal from all STDD artifacts |
| `stdd context --export` | 3-layer project context export |

### TDD Enhancements (Test-Driven Development)

| CLI | Purpose |
|-----|---------|
| `stdd mutation [change]` | Mutation testing (Quick Heuristic + Stryker deep mutation) |
| `stdd outside-in init / scaffold` | Outside-In TDD: E2E → Integration → Unit |
| `stdd tdd-init` | Test scaffold generation (Jest/Vitest/pytest/go test) |
| `stdd mock <name>` | Mock data and stub generation |
| `stdd mock-gen [change]` | Generate mocks from specs (MSW, pytest fixtures, etc.) |
| `stdd factory <entity>` | Test data factories (Factory Bot style) |
| `stdd baby-steps` | 7-step TDD onboarding |
| `stdd commit-tdd` | TDD-phase auto-commits (red:/green:/refactor: prefix) |

### Quality & Governance

| CLI | Purpose |
|-----|---------|
| `stdd guard` | TDD gatekeeper (run tests → check coverage → block dirty commits) |
| `stdd constitution show / check / fix / waive / audit` | 9-article constitution system |
| `stdd hooks install / verify / disable / enable` | AI editor hook installation |
| `stdd progress --summary / --resume / --clear` | Real-time JSONL progress tracking + resume |
| `stdd metrics` | Quality dashboard |
| `stdd doctor` | Project health diagnostics |
| `stdd depcheck` | Unused dependency detection |
| `stdd audit` | Historical compliance audit |
| `stdd ci` | CI pipeline config generation |
| `stdd update` | Framework version update check |

### Graph Engine

| CLI | Purpose |
|-----|---------|
| `stdd graph run <intent>` | Execute DAG by intent (feature / hotfix / repair / research) |
| `stdd graph visualize` | Visualize current Skill Graph topology |
| `stdd graph history` | Execution history and replay |
| `stdd graph recommend` | Smart next-step recommendation |
| `stdd graph analyze` | Bottleneck analysis and path optimization |

### Exploration & Design

| CLI | Purpose |
|-----|---------|
| `stdd explore [scope]` | Read-only project exploration (architecture, patterns, constraints) |
| `stdd brainstorm <topic>` | 60+ structured reasoning methods, multi-angle analysis |
| `stdd design create / list` | DESIGN.md design system generation (modern / dark / minimal presets) |
| `stdd complexity analyze / hotspots / report` | Cyclomatic complexity analysis |
| `stdd certainty assess / history / configure` | Certainty protocol assessment |
| `stdd learn` | Pattern extraction and style guide generation |
| `stdd vision show / update` | Project vision management |

### Collaboration & Extensions

| CLI | Purpose |
|-----|---------|
| `stdd workspace list / validate / repair` | Monorepo workspace management |
| `stdd roles party / review` | 12-role collaborative agent simulation |
| `stdd supervisor start / status / roles` | Multi-agent supervision coordination |
| `stdd parallel <cmd>` | Cross-workspace parallel execution |
| `stdd story create / to-bdd` | Story Mapping → BDD conversion |
| `stdd user-test [change]` | Human + agent test scripts |
| `stdd pipeline [change]` | Generate IR + acceptance test skeletons from specs |
| `stdd starters` | Project starter templates (JS / TS / Python / Go / Rust) |
| `stdd extensions` | Community extension management |
| `stdd runtime agent start / next / stop` | Party Mode multi-agent simulation |
| `stdd runtime sudo <file>` | SudoLang interpreter |
| `stdd list` | List all current changes |
| `stdd status` | Project status overview |
| `stdd recommend` | Recommend next action |
| `stdd help [topic]` | Help system |

---

## Constitution Quality Governance

9 articles across 3 tiers — **Blocking**, **Warning**, **Suggestion** — enforced automatically on `verify` and `guard`.

| Tier | Article | Rule |
|------|---------|------|
| 🔴 Blocking | 2 — TDD | Test-first + coverage gate + mutation evidence |
| 🔴 Blocking | 7 — Security | No hardcoded secrets, no injection, safe paths |
| 🔴 Blocking | 9 — CI/CD | Automated pipeline required |
| 🟡 Warning | 1 — Library-First | Prefer mature libraries, avoid reinventing |
| 🟡 Warning | 3 — Small Commits | Atomic, conventional commits |
| 🟡 Warning | 4 — Code Style | Consistent formatting |
| 🟡 Warning | 6 — Error Handling | Explicit error paths, no empty catch |
| 🟢 Suggestion | 5 — Documentation | Docs as code |
| 🟢 Suggestion | 8 — Performance | Reasonable defaults |

```bash
stdd constitution check                               # Full compliance check
stdd constitution show 2                              # Inspect article 2
stdd constitution fix --dry-run                       # Preview auto-fixes
stdd constitution waive 4 --reason "legacy" --days 7   # Temporary exemption
stdd constitution status                              # Health score dashboard
stdd constitution audit                               # Historical compliance audit
```

### Health Score Example

```
Constitution Health
Workspace: @myapp/api (packages/api)
85%
  ✅  Art 1: Library-First
  ✅  Art 2: TDD
  ❌  Art 3: Small Commits (2 oversized commits found)
  ✅  Art 4: Code Style
  ⚠️  Art 5: Documentation (Waived for 14 days)
  ✅  Art 6: Error Handling
  ✅  Art 7: Security
  ✅  Art 8: Performance
  ❌  Art 9: CI/CD (No CI config found)
  6 passed, 2 failed, 1 waived
```

---

## Architecture Overview

STDD Copilot fuses Spec-First and TDD via a **Skill Graph** engine. The architecture consists of four layers:

```
┌──────────────────────────────────────────────┐
│              User Layer                       │
│  CLI (stdd)    │    IDE Integration           │
├──────────────────────────────────────────────┤
│         Skill Graph Engine                    │
│  DAG Runner  │  Visualizer  │  Analyzer      │
├──────────────────────────────────────────────┤
│            Core Executors                     │
│  75 Command Modules  │  21 Utility Modules    │
├──────────────────────────────────────────────┤
│            Infrastructure                     │
│  Templates  │  Hooks  │  Logger  │  Security  │
└──────────────────────────────────────────────┘
```

**Key Design Decisions:**
- Each CLI command is an independent class module, dynamically loaded via `CommandLoader`
- The Skill Graph automatically selects the DAG path based on user intent
- All artifacts are persisted as files, enabling AI context recovery from disk
- Supports 4 tiers of 24 external AI engine adapters

For the complete architecture documentation, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Project Structure

```
stdd-copilot/
├── cli.js                          # CLI entry point (Commander.js)
├── src/
│   ├── cli/
│   │   ├── commands/               # 75 command implementations (one class each)
│   │   ├── helpers/                # Shared CLI utilities (spinner, safe wrappers)
│   │   └── registry/               # CommandRegistry + CommandLoader
│   ├── utils/                      # 21 shared utility modules
│   ├── runtime/                    # Agent simulator, SudoLang, browser
│   └── types/                      # JSDoc type definitions
├── src/templates/
│   ├── commands/                   # 80 slash-command templates (Markdown)
│   └── skills/stdd/                # 47 skill template directories
├── stdd/                           # Runtime working directory (generated in user projects)
│   ├── changes/                    # Change lifecycle
│   ├── specs/                      # BDD source of truth
│   ├── graph/                      # DAG config + cache
│   ├── evidence/                   # guard / verify / mutation outputs
│   ├── memory/                     # Project memory store
│   ├── config/                     # Additional config (engines.yaml, etc.)
│   └── reporters/                  # Test reporter plugins
├── __tests__/                      # 191 suites / 4,158 tests
├── docs/                           # Documentation
│   ├── agent-protocol.md           # AI Agent behavior protocol
│   ├── cli-guide.md                # Full CLI reference
│   ├── getting-started.md          # Getting started guide
│   ├── command-reference.md        # Detailed command reference
│   ├── concepts.md                 # Core concepts
│   ├── capabilities.md             # Capability catalog
│   ├── workflows.md                # Workflow details
│   └── en/                         # English documentation
├── schemas/                        # JSON / YAML Schemas
│   ├── spec-driven/                # Spec templates
│   └── constitution/               # 9 articles
└── tools/                          # Utility scripts
```

---

## Documentation

| Document | Content |
|----------|---------|
| [docs/getting-started.md](./docs/getting-started.md) | First-run workflow and quick reference |
| [docs/cli-guide.md](./docs/cli-guide.md) | Complete CLI command reference |
| [docs/command-reference.md](./docs/command-reference.md) | Detailed descriptions for all 80 commands |
| [docs/concepts.md](./docs/concepts.md) | Core concepts: Spec-First, Ralph Loop, Constitution |
| [docs/workflows.md](./docs/workflows.md) | Workflow details: Greenfield / Brownfield / Quick Fix |
| [docs/capabilities.md](./docs/capabilities.md) | Full capability catalog |
| [docs/agent-protocol.md](./docs/agent-protocol.md) | AI Agent behavior protocol (Phase transitions, gates, path selection) |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture (with Mermaid diagrams) |
| [USAGE.md](./USAGE.md) | Complete usage guide |
| [INSTALL.md](./INSTALL.md) | Installation guide (npm / source / Docker) |
| [EXAMPLES.md](./EXAMPLES.md) | Multi-scenario practical examples |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Contribution guide |
| [CHANGELOG.md](./CHANGELOG.md) | Version history |
| [fix.md](./fix.md) | Incremental optimization tracker |
| [docs/en/](./docs/en/) | English documentation |

---

## Installation & Contributing

### Installation

```bash
# Global install via npm (recommended)
npm install -g @marcher-lam/stdd-copilot@latest

# From source
git clone https://github.com/Marcher-lam/STDD-COPILOT.git
cd STDD-COPILOT && npm install && npm link

# Docker
docker compose up -d
```

See [INSTALL.md](./INSTALL.md) for details.

### Development & Testing

```bash
npm test                # Run 191 suites / 4,158 tests
npm run lint            # ESLint check
npm run premerge        # Full pre-merge check (audit + lint + docs + coverage)
npm run test:coverage   # Run with coverage report
```

### Contributing

Issues and PRs are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## License

[MIT](LICENSE)

---

*STDD Copilot — Keeping AI coding assistants on the right track.*
