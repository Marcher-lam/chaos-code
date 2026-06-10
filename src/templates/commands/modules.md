---
description: STDD modules marketplace
---

# Command: /stdd:modules

## Usage
```
chaos modules                          # Show featured/official modules
chaos modules featured                 # Show curated official modules
chaos modules search <query>           # Search modules by name, description, keywords
chaos modules search <query> --category workflow  # Filter by category
chaos modules install <module>         # Install a module from the catalog
chaos modules list                     # List all installed modules
chaos modules info <module>            # Show detailed module information
chaos modules publish [target]         # Publish a module
chaos modules categories               # List available module categories
```

## Description
Browse, discover, install, and manage STDD modules from the built-in marketplace.
Modules are pre-packaged extensions that provide additional workflows, design tools,
collaboration features, and quality governance capabilities.

All actions support `--json` for machine-readable output.

## Actions

### featured (default)
Shows all official STDD modules from the catalog. This is the default action when
no subcommand is specified.

### search <query>
Full-text search across module names, descriptions, and keywords.
Supports `--category <cat>` to filter results.

### install <module>
Install a module from the catalog into `stdd/extensions/installed/`.

### list
List all modules that have been installed (have an `installedAt` timestamp).

### info <module>
Display detailed information about a specific module: name, version, description,
category, author, official status, keywords, and installation path.

### publish [target]
Validate and package a module for publishing. Checks for required extension.json
fields and creates a publishable manifest.

### categories
List all unique categories found in the module catalog.

## Official Modules
- **stdd-tdd-core** - Core TDD workflow with mutation testing
- **stdd-design-system** - Design document generation with presets
- **stdd-roles-pack** - 12-agent role system with adversarial review
- **stdd-graph-engine** - DAG-based workflow orchestration
- **stdd-constitution** - Quality governance with audit and waivers
- **stdd-profile-engine** - Adaptive planning profiles

## Execution Flow
1. Load catalog from `stdd/extensions/catalog.json`
2. Route to the appropriate action handler
3. Delegate to ModuleRegistry for data operations
4. Format and display results (text or JSON)

## Output
- Module listings with name, version, description, category
- Search results with keyword matching
- Installation confirmation
- Module detail views
- Category lists
