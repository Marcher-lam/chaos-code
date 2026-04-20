# Getting Started with STDD Copilot

STDD Copilot is a **Specification & Test-Driven Development** framework for AI-assisted coding. It enforces TDD discipline through Constitution rules, Hook enforcement, and the Ralph Loop execution cycle.

## Quick Start

### 1. Initialize a Project

```bash
/stdd:init
```

This will:
- Detect your project type (Node.js, Python, Go, Rust)
- Configure test framework (Vitest, Jest, pytest, cargo test)
- Discover external AI engine skills
- Generate `stdd/config.yaml`

### 2. Propose a Feature

```bash
/stdd:propose
```

Describe the feature you want to build. STDD will generate a `proposal.md` with structured requirements.

### 3. Clarify & Confirm

```bash
/stdd:clarify    # Interactive Q&A to refine requirements
/stdd:confirm    # Lock down the confirmed requirements
```

### 4. Generate BDD Specs

```bash
/stdd:spec
```

Translates confirmed requirements into Gherkin-format BDD specifications (Given/When/Then). Auto-generates test code stubs via the Test Pipeline.

### 5. Plan & Execute

```bash
/stdd:plan       # Break down into micro-tasks (max 30min each)
/stdd:apply      # Pick a task and implement
/stdd:execute    # Run the Ralph Loop (Red → Green → Refactor)
```

### 6. Validate & Commit

```bash
/stdd:verify     # Validate implementation against specs
/stdd:commit     # Atomic commit with scope-creep review
```

## CLI Quick Reference

Use the `stdd` CLI for workspace bootstrap, status checks, and hook / constitution operations:

```bash
stdd init                    # Initialize the project
stdd init /path/to/project   # Initialize a specific directory
stdd init --force            # Overwrite existing STDD files

stdd list                    # List active changes
stdd list --specs            # List specs
stdd list --archived         # Include archived changes
stdd list --json             # JSON output

stdd status                  # Overall project status
stdd status add-dark-mode    # Status for a specific change
stdd status --json           # Machine-readable status output

stdd new change add-dark-mode      # Create a new change
stdd new spec auth                 # Create a new spec

stdd skills                  # List all skills
stdd skills --phase 4        # Filter skills by phase

stdd commands                # List Claude Code slash commands
stdd constitution            # Show all constitution articles
stdd constitution show 2     # Show Article 2 details
stdd constitution check      # Trigger the CLI-side compliance entry point

stdd hooks install           # Install hooks
stdd hooks verify            # Verify hooks
stdd hooks status            # Show hooks status
stdd hooks disable           # Disable hooks
stdd hooks enable            # Re-enable hooks
```

## Fast-Forward Mode

Skip all pre-phases and go straight to implementation:

```bash
/stdd:turbo
```

Merges propose → clarify → confirm → spec → plan into one shot, then optionally continues to TDD execution.

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Ralph Loop** | Strict Red → Green → Refactor TDD cycle with circuit breaker |
| **Constitution** | 9 development articles enforced by hooks |
| **Hook System** | Pre/Post tool-use hooks for automatic enforcement |
| **Spec Guardian** | Detects implementation leakage in BDD specs |
| **Test Pipeline** | Auto-generates test stubs from BDD specs |
| **Pattern Teaching** | Learns coding patterns from existing codebase |
| **Certainty Protocol** | Confidence scoring at decision checkpoints |

## Workflow Modes

```
Standard:  /stdd:propose → clarify → confirm → spec → plan → apply → execute → commit
Turbo:     /stdd:turbo (all pre-phases merged)
Issue:     /stdd:issue (bug fix via TDD)
Brainstorm: /stdd:brainstorm (analysis only, no code changes)
```

## Configuration

All settings are in `stdd/config.yaml`. Key sections:

- `project` — language, framework, test framework
- `tdd.ralph_loop` — iteration limits, failure threshold
- `tdd.hitl` — Human-in-the-Loop granularity
- `tdd.certainty` — confidence thresholds
- `tdd.mutation` — mutation testing (Quick pseudo + Deep Stryker)
- `defense` — 5-level anti-drift protection

## Documentation

- [English Docs Index](README.md) — English documentation hub
- [CLI Guide](cli-guide.md) — Full command reference
- [Project README](../../README_EN.md) — Project overview and top-level examples
- [中文项目首页](../../README.md) — Complete Chinese documentation

---

> Language: English | [English Docs Index](README.md) | [中文版本](../getting-started.md)
