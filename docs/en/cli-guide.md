# CLI Guide

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
stdd doctor
stdd doctor --deep
stdd apply <name> --allow-no-tests

## Documentation
[English Docs Index](README.md) — English documentation hub
[Getting Started](getting-started.md) — First-run workflow and quick CLI reference
[CLI Guide](cli-guide.md) — Full CLI command reference
[Project README](../../README_EN.md) — Project overview and top-level examples
[Getting Started](getting-started.md) — First-run workflow and quick CLI reference
[CLI Guide](cli-guide.md) — Full CLI command reference

## TDD Gap Enhancements
`stdd fix-packet [change]` creates a Golden Packet style AI handoff context for failed tests.

`stdd outside-in init/scaffold/status` creates and uses a layer registry for outside-in TDD.
