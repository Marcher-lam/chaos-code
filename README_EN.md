# STDD Copilot

**Specification & Test-Driven Development Copilot**

A **Skill Graph**-based full-lifecycle automation development framework that deeply integrates **Spec-First** with **TDD**.

Current baseline: **66 test suites, 827 tests passed, zero npm audit vulnerabilities**.

## Quick Start

```bash
npm install -g @marcher-lam/stdd-copilot@latest
cd your-project
stdd init
stdd new change add-dark-mode
stdd apply add-dark-mode --test-command "npm test"
stdd verify add-dark-mode
stdd archive add-dark-mode
```

## CLI Commands

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
stdd new spec auth
stdd skills
stdd skills --phase 4
stdd commands
stdd fix-packet add-dark-mode
stdd outside-in init
stdd outside-in scaffold add-dark-mode
stdd constitution
stdd constitution show 2
stdd constitution check
stdd hooks install
stdd hooks verify
stdd hooks status
stdd hooks disable
stdd hooks enable
stdd progress
stdd progress --summary
stdd progress --resume

## Installation

### npm Global (Recommended)

```bash
npm install -g @marcher-lam/stdd-copilot@latest
```

### Docker

```bash
docker build -t stdd-copilot .
docker run --rm -v $(pwd):/workspace stdd-copilot init
```

## Documentation

[English Docs Index](./docs/en/README.md) | English documentation hub and entry-point map

[Getting Started](./docs/en/getting-started.md) | First-run workflow and quick CLI reference

[CLI Guide](./docs/en/cli-guide.md) | Full CLI command reference

## License

MIT
