# STDD Copilot Ultra — English Documentation

> **STDD = Smart Team-Driven Development**
> A full-lifecycle AI development platform — from product ideation to verified delivery.

**STDD Copilot Ultra** is not an AI itself. It is a **process control layer and quality assurance system** that AI coding assistants execute against, covering the entire chain from product ideation to verifiable delivery.

---

## Key Stats

| Metric | Value |
|--------|-------|
| CLI Commands | **88** (implementations) / **86** (slash templates) |
| Slash Command Templates | **86** |
| Skill Templates | **53** |
| Test Suites | **200** |
| Test Cases | **4,151** (100% passing) |
| Statement Coverage | **97.7%** |
| Branch Coverage | **93.2%** |

---

## Quick Install

```bash
npm install -g @marcher-lam/stdd-copilot-ultra@latest
stdd --version
```

Source build and Docker options available in [INSTALL.md](../../INSTALL.md).

---

## Quick Start

```bash
stdd init                              # Initialize STDD workspace
stdd ff "add dark mode support"        # Fast-forward: proposal → specs → tasks
stdd apply                             # TDD Ralph Loop execution
stdd verify                            # 5-dimension verification
stdd archive                           # Archive and merge specs
```

Or one-shot:

```bash
stdd turbo "user registration feature"  # Full auto-pilot
```

Inside AI coding tools (Claude Code, Cursor, Windsurf, etc.):

```
/stdd:ff implement user OAuth login
/stdd:apply --phase red
/stdd:verify
/stdd:archive
```

---

## Features Overview

### Core Workflow

`init` → `new change` → `propose` → `clarify` → `confirm` → `spec` → `plan` → `apply` → `verify` → `archive`

### Key Capabilities

- **Multi-Role Agent Collaboration** — 12 roles (PM, Architect, UX, QA, Security, etc.)
- **Spec-First Methodology** — BDD specifications with Given/When/Then
- **Ralph Loop TDD** — RED → GREEN → MUTATION → REFACTOR closed-loop
- **9-Article Constitution** — Automated quality governance with Blocking/Warning/Suggestion tiers
- **Mutation Testing** — Quick heuristic + Stryker deep analysis for anti-fake-green detection
- **Skill Graph Engine** — DAG topology scheduling with parallel execution
- **Evidence System** — Structured proof collection with audit trail
- **Brownfield Support** — Existing project analysis, characterization tests, incremental migration
- **UI Generation** — React / Vue / Angular / Svelte page and component scaffolding
- **Monorepo Support** — Workspace-aware change management and verification

### AI Engine Compatibility

22 engines across 4 tiers: Claude Code, Cursor, Windsurf, GitHub Copilot, and more.

---

## English Documentation

| Document | Description |
|----------|-------------|
| [Getting Started](getting-started.md) | 5-minute quick start, CLI cheat sheet, configuration |
| [CLI Guide](cli-guide.md) | Full CLI command reference |
| [Project README](../../README_EN.md) | Project overview, architecture, and examples |

## Chinese Documentation (中文)

| Document | Description |
|----------|-------------|
| [快速开始](../getting-started.md) | 首次运行和 CLI 速查 |
| [CLI 指南](../cli-guide.md) | CLI 命令参考 |
| [老项目重构指南](../STDD-BROWNFIELD-REFACTORING-GUIDE.md) | Brownfield 接入和重构 |
| [验证与测试](../STDD-VERIFICATION-TEST.md) | 验证体系和测试指南 |
| [命令参考](../command-reference.md) | 86 个命令详解 |
| [核心概念](../concepts.md) | Spec-First, Ralph Loop, Constitution |
| [工作流](../workflows.md) | 工作流模式详解 |

---

## License

[MIT](../../LICENSE)

<!--
[Getting Started](getting-started.md) | First-run workflow and quick CLI reference
[CLI Guide](cli-guide.md) | Full CLI command reference
[Project README](../../README_EN.md) — Project overview and top-level examples
[Getting Started](getting-started.md) — First-run workflow and quick CLI reference
[CLI Guide](cli-guide.md) — Full CLI command reference
-->
