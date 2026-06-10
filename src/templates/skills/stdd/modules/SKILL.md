---
id: stdd.modules
command: /stdd:modules
description: Browse, search, install, and manage STDD modules from the marketplace
version: "1.0"
category: marketplace
phase: discovery
read_only: false
risk_level: low
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: []
next: [stdd.extensions, stdd.profile]
on_failure: []
inputs:
  - module catalog (stdd/extensions/catalog.json)
  - search query
  - module name
outputs:
  - module listings
  - search results
  - installed module files
evidence:
  required: false
  path: stdd/extensions/installed/
constitution_articles:
  blocking: []
  warning: []
  suggestion: [8]
graph:
  node_id: stdd.modules
  parallelizable: false
  resumable: true
  checkpoint: per-action
---

# STDD Skill: /stdd:modules

## Purpose
Modules marketplace for discovering, installing, and managing STDD extensions.
Provides a curated catalog of official modules and a search interface for finding
the right tools for each project.

## When to Use
- When starting a new project and wanting to browse available modules
- When searching for specific functionality (TDD, design, roles, etc.)
- When installing or updating official STDD modules
- When publishing a custom module to the catalog
- When listing available module categories

## Actions

### featured (default)
Displays all official STDD modules. These are vetted, maintained modules
published by the STDD team.

```bash
chaos modules
chaos modules featured
chaos modules featured --json
```

### search
Full-text search across module names, descriptions, and keywords.
Optionally filter by category.

```bash
chaos modules search tdd
chaos modules search workflow --category workflow
chaos modules search design --json
```

### install
Install a module from the catalog. Creates the extension directory and
writes a manifest file.

```bash
chaos modules install stdd-tdd-core
chaos modules install stdd-design-system --json
```

### list
Show all installed modules (those with an `installedAt` timestamp).

```bash
chaos modules list
chaos modules list --json
```

### info
Display detailed information about a specific module.

```bash
chaos modules info stdd-tdd-core
chaos modules info stdd-roles-pack --json
```

### publish
Validate and package a module for publishing to the catalog.
Requires an `extension.json` manifest with name, version, and description.

```bash
chaos modules publish ./my-module
chaos modules publish ./my-module --json
```

### categories
List all unique categories found in the module catalog.

```bash
chaos modules categories
chaos modules categories --json
```

## Official Modules

| Module | Category | Description |
|--------|----------|-------------|
| stdd-tdd-core | workflow | Core TDD workflow with mutation testing |
| stdd-design-system | design | DESIGN.md generation with presets and preview |
| stdd-roles-pack | collaboration | 12-agent role system with adversarial review |
| stdd-graph-engine | workflow | DAG-based workflow orchestration |
| stdd-constitution | quality | 9-article quality governance |
| stdd-profile-engine | planning | Adaptive planning profiles |

## Categories

| Category | Description |
|----------|-------------|
| workflow | TDD loops, graph orchestration, process automation |
| design | UI/UX design systems, tokens, preview generation |
| collaboration | Multi-agent roles, party mode, adversarial review |
| quality | Constitution, governance, audit, waivers |
| planning | Profile detection, adaptive workflows, complexity |

## Architecture

- **ModuleRegistry** (`src/config/module-registry.js`): Core data layer for catalog operations
- **ModulesCommand** (`src/cli/commands/modules.js`): Marketplace-focused CLI interface
- **ExtensionsCommand** (`src/cli/commands/extensions.js`): Extended with search, info, update, remove
- **catalog.json** (`stdd/extensions/catalog.json`): Module catalog with metadata

## Graph Semantics
- Node ID: stdd.modules
- No dependencies; can run at any point
- checkpoint=per-action; resumable=true; parallelizable=false

## Related Skills
- **stdd.extensions** - Lower-level extension management (install, validate)
- **stdd.profile** - Uses modules to configure workflow depth
