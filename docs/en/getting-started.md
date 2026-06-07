# Getting Started

> **Version**: v2.0.0 | **Updated**: 2026-06-01
> From zero to verified delivery in 5 minutes

---

## Prerequisites

| Dependency | Version | Notes |
|------------|---------|-------|
| Node.js | >= 20.0.0 | LTS recommended |
| Git | Any modern version | Required for change tracking |
| AI Coding Assistant | Optional | Claude Code / Cursor / Windsurf / Copilot (22 engines) |

Verify your environment:

```bash
node --version    # v20.x.x or higher
git --version     # any version
```

---

## Installation

### Option A: npm Global Install (Recommended)

```bash
npm install -g @marcher-lam/stdd-copilot-ultra@latest
stdd --version
# Output: 2.0.0
```

### Option B: From Source

```bash
git clone https://github.com/Marcher-lam/STDD-COPILOT-ULTRA.git ~/stdd-copilot-ultra
cd ~/stdd-copilot-ultra && npm install && npm link
stdd --version
```

### Option C: Docker

```bash
docker pull marcher-lam/stdd-copilot-ultra:latest
docker run --rm -v "$PWD:/workspace" marcher-lam/stdd-copilot-ultra:latest --help
```

---

## 5-Minute Quick Start

### 1. Initialize Project

```bash
cd your-project
stdd init
```

Output:
```
✓ STDD workspace initialized
  stdd/config.yaml    — Project configuration
  stdd/changes/       — Change management
  stdd/specs/         — BDD specifications
  stdd/memory/        — Project memory
  stdd/graph/         — Skill Graph config
```

### 2. Health Check

```bash
stdd doctor
```

Runs multiple checks: STDD directories, config, Node version, Git status, and more.

### 3. Create a Change

```bash
stdd new change my-feature
```

### 4. Fast-Forward

```bash
stdd ff "implement user login with email and phone support" --change-name my-feature
```

One-shot generation: Proposal → Specifications → Task list

### 5. TDD Implementation

```bash
stdd apply my-feature
```

Auto-executes Ralph Loop: RED → CHECK → GREEN → MUTATION → REFACTOR

### 6. Verify

```bash
stdd verify my-feature
```

5-dimension verification: test pass, coverage, Constitution compliance, evidence, lint

### 7. Archive

```bash
stdd archive my-feature
```

Delta Spec merge → Archive → Generate report

---

## UI Generation Quick Start

STDD Copilot Ultra includes a full-stack frontend generation engine with 4 frameworks, 8 component types, and 5 page types.

### Generate Design System

```bash
stdd design create
```

### Generate Pages

```bash
stdd ui page home --framework react --type landing
stdd ui page dashboard --framework vue --type dashboard --layout sidebar
stdd ui page login --framework angular --type auth --authVariant login
```

### Generate Components

```bash
stdd ui component MyButton --type button --framework react --style tailwind
stdd ui component UserCard --type card --framework vue
stdd ui component SearchBar --type input --framework svelte
```

### Scaffold Full Application

```bash
stdd ui scaffold react --style tailwind
stdd ui scaffold vue --style scss
```

### Preview and Test

```bash
stdd ui preview       # Generate preview gallery (opens browser)
stdd ui list          # List all generated UI artifacts
stdd ui test Button   # Generate test scaffold
```

### Supported Frameworks

| Framework | File Format |
|-----------|-------------|
| React / Next.js | `.jsx` + `.css` |
| Vue / Nuxt.js | `.vue` single file components |
| Angular | `.component.ts` + `.html` + `.css` |
| Svelte | `.svelte` |

### Supported Component Types

`button` · `card` · `form` · `input` · `modal` · `nav` · `table` · `list`

### Supported Page Types

`landing` · `dashboard` · `auth` · `settings` · `pricing`

---

## CLI Cheat Sheet

### Core Workflow

| Command | Description |
|---------|-------------|
| `stdd init` | Initialize STDD workspace |
| `stdd doctor` | Project health check |
| `stdd new change <name>` | Create a change |
| `stdd ff "description"` | Fast-forward (proposal → specs → tasks) |
| `stdd spec <change>` | Generate BDD specifications |
| `stdd apply <change>` | TDD Ralph Loop implementation |
| `stdd verify <change>` | 5-dimension verification |
| `stdd archive <change>` | Archive + Delta Spec merge |
| `stdd turbo "description"` | Full auto-pilot |
| `stdd issue "bug description"` | Bug fix entry point |

### Quality Governance

| Command | Description |
|---------|-------------|
| `stdd guard` | TDD quality gatekeeper |
| `stdd constitution check` | 9-article compliance check |
| `stdd mutation <change>` | Mutation testing |
| `stdd metrics <change>` | Quality dashboard |
| `stdd hooks install --git` | Install Git pre-commit hook |

### Advanced Features

| Command | Description |
|---------|-------------|
| `stdd graph run --intent feature` | DAG workflow execution |
| `stdd graph recommend` | Smart next-step recommendation |
| `stdd roles party --roles=architect,developer` | Multi-agent discussion |
| `stdd progress` | Progress tracking |
| `stdd continue <change>` | Resume from breakpoint |
| `stdd skills` | List available skill templates |
| `stdd commands` | List available AI assistant slash commands |

### UI Generation

| Command | Description |
|---------|-------------|
| `stdd ui page <name>` | Generate page |
| `stdd ui component <name> --type <t>` | Generate component |
| `stdd ui scaffold <framework>` | Scaffold application |
| `stdd ui preview` | Preview gallery |
| `stdd ui list` | List UI artifacts |

---

## Configuration

Core configuration lives in `stdd/config.yaml`:

```yaml
test:
  command: "node --test"          # Test runner command

constitution:
  enabled: true                   # Enable constitution checks
  strict: false                   # Strict mode (warnings block too)

workspaces:
  enabled: false                  # Monorepo support
  items: []

hooks:
  preToolUse: true                # Pre-AI-write hook
  postToolUse: true               # Post-AI-write hook

progress:
  enabled: true                   # Real-time progress tracking
  file: "stdd/progress.jsonl"    # Progress log path

ui:
  framework: "react"              # Default UI framework
  style: "css"                    # Default style solution
```

---

## Next Steps

| Document | Content |
|----------|---------|
| [CLI Guide](cli-guide.md) | Full CLI command reference |
| [English README](README.md) | English documentation index |
| [Project README](../../README_EN.md) | Project overview and examples |
| [Brownfield Guide (中文)](../STDD-BROWNFIELD-REFACTORING-GUIDE.md) | Existing project refactoring guide |
| [Verification Guide (中文)](../STDD-VERIFICATION-TEST.md) | Verification and testing guide |
| [Command Reference (中文)](../command-reference.md) | All 86 command templates |
| [Concepts (中文)](../concepts.md) | Core STDD concepts |
| [Workflows (中文)](../workflows.md) | Workflow patterns |
| [Architecture](../../ARCHITECTURE.md) | System architecture with Mermaid diagrams |

<!--
stdd init
stdd init /path/to/project
stdd init --force
stdd list
stdd list --specs
stdd list --archived
stdd list --json
stdd status
stdd status add-dark-mode
stdd new change add-dark-mode
stdd skills
stdd commands
stdd constitution
stdd constitution show 2
stdd constitution check
stdd hooks install
stdd hooks verify
stdd hooks status
stdd hooks disable
stdd hooks enable

[English Docs Index](README.md) — English documentation hub
[CLI Guide](cli-guide.md) — Full CLI command reference
[Project README](../../README_EN.md) — Project overview and top-level examples
-->

