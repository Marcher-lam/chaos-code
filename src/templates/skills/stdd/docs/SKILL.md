---
id: stdd.docs
command: /stdd:docs
description: Generate a static HTML documentation site from existing project docs
version: "1.0"
category: documentation
phase: delivery
read_only: true
risk_level: low
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: []
next: []
on_failure: []
inputs:
  - Project markdown files (README, docs/, ARCHITECTURE, etc.)
  - Command registry definitions
  - Skill definitions from src/templates/skills/stdd/
outputs:
  - Static HTML site at stdd/docs-site/
  - Search index JSON
  - Shared CSS stylesheet
evidence:
  required: false
  path: stdd/docs-site/index.html
constitution_articles:
  blocking: []
  warning: []
  suggestion: []
graph:
  node_id: stdd.docs
  parallelizable: true
  resumable: true
  checkpoint: per-generation
---

# STDD Skill: /stdd:docs

## Purpose
Generates a polished static HTML documentation site from all existing project documentation sources. Aggregates markdown files, command references, and skill definitions into a navigable multi-page site with sidebar, search index, and responsive design.

## When to Use
- Before presenting a project to stakeholders or new team members
- To create a browsable reference from scattered markdown files
- When publishing project documentation as a static site
- As part of a CI/CD pipeline to auto-generate docs on release

## Actions

### generate (default)
Scans the project for documentation sources and generates the full static site.

```
chaos docs
chaos docs generate
chaos docs --output ./public/docs
chaos docs --lang en
```

### open
Generates the docs site and opens `index.html` in the default browser.

```
chaos docs open
```

### sources
Lists all discovered documentation sources without generating the site.

```
chaos docs sources
chaos docs sources --json
```

## Documentation Sources
The command collects content from:
1. Root-level markdown: `README.md`, `README_EN.md`, `ARCHITECTURE.md`, `USAGE.md`, `INSTALL.md`, `CONTRIBUTING.md`, `CHANGELOG.md`
2. `docs/` directory: All `.md` files (getting-started, cli-guide, concepts, workflows, etc.)
3. Command registry: Auto-generated reference from `src/templates/commands/*.md`
4. Skills directory: Auto-generated reference from `src/templates/skills/stdd/*/SKILL.md`

## Design Token Integration
If `DESIGN.md` exists and contains a JSON code block with design tokens, those colors, fonts, and border radii will be applied to the generated CSS.

## Output Structure
```
stdd/docs-site/
  index.html          # Landing page with quick links
  overview.html       # From README.md
  architecture.html   # From ARCHITECTURE.md
  getting-started.html
  cli-guide.html
  commands.html       # Auto-generated from registry
  skills.html         # Auto-generated from skills
  ...
  style.css           # Shared stylesheet
  search.json         # Client-side search index
```

## CLI Runtime

```bash
# Generate docs site
chaos docs

# Generate and open in browser
chaos docs open

# List doc sources
chaos docs sources

# JSON output
chaos docs --json

# Language filter
chaos docs --lang en

# Custom output directory
chaos docs --output ./public/docs
```

## Markdown to HTML Conversion
The built-in converter handles:
- Headings (h1-h4)
- Bold, italic, inline code
- Fenced code blocks with language hints
- Tables with header/body
- Ordered and unordered lists
- Links and images
- Blockquotes
- Horizontal rules

## Related Skills
- **stdd.design** - Provides design tokens for CSS theming
- **stdd.vision** - Vision document included in docs
- **stdd.help** - Help content source for documentation
