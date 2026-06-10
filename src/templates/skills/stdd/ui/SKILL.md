---
id: stdd.ui
command: /stdd:ui
description: Generate frontend pages and components using DESIGN.md design tokens
version: "1.0"
category: code-generation
phase: implementation
read_only: false
risk_level: low
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.design]
next: [stdd.apply, stdd.verify]
on_failure: []
inputs:
  - DESIGN.md
  - package.json (for framework detection)
outputs:
  - stdd/ui/pages/
  - stdd/ui/components/
  - stdd/ui/global.css
  - stdd/ui/preview.html
evidence:
  required: false
  path: stdd/ui/
constitution_articles:
  blocking: []
  warning: [4, 8]
  suggestion: []
graph:
  node_id: stdd.ui
  parallelizable: true
  resumable: true
  checkpoint: per-generation
---

# STDD Skill: /stdd:ui

## Purpose
Generate frontend pages and components using design tokens extracted from DESIGN.md. Produces framework-specific code (React, Vue, vanilla HTML) with CSS custom properties for consistent visual styling.

## When to Use
- Generate a new page for the application
- Create reusable UI components (buttons, cards, forms, inputs, modals, nav, tables, lists)
- Scaffold a full UI application structure
- Preview design tokens and generated components
- After running `chaos design create` to establish a design system

## Actions

### page <name>
Generate a page component with layout and sections.

**Options:**
- `--framework` (react|vue|vanilla, default: detected from package.json)
- `--layout` (centered|sidebar|full, default: centered)
- `--sections` (comma-separated section names)
- `--style` (css|scss|tailwind|css-modules, default: css)

**Output:** `stdd/ui/pages/<Name>.jsx` + `<name>.css`

### component <name>
Generate a typed UI component.

**Options:**
- `--type` (button|card|form|input|modal|nav|table|list)
- `--framework` (react|vue|vanilla)
- `--style` (css|scss|tailwind|css-modules)

**Component Types:**
| Type | Description |
|------|-------------|
| button | Styled button with primary/secondary/outline variants |
| card | Container with header/body/footer slots |
| form | Form wrapper with submit handler |
| input | Styled input with label and error state |
| modal | Overlay dialog with content and actions |
| nav | Responsive navigation bar |
| table | Data table with headers and rows |
| list | Ordered/unordered list with items |

### scaffold [framework]
Generate a complete UI app structure including layout, global CSS, base components (Button, Card, Input), and index page.

**Output:**
- `stdd/ui/global.css` - Global CSS with design tokens
- `stdd/ui/components/Layout.jsx` - Layout component
- `stdd/ui/components/Button.jsx` - Button component
- `stdd/ui/components/Card.jsx` - Card component
- `stdd/ui/components/Input.jsx` - Input component
- `stdd/ui/pages/Index.jsx` - Index page

### preview
Generate a static HTML preview gallery showing all design tokens (colors, spacing, radius).

**Output:** `stdd/ui/preview.html`

### list
Scan `stdd/ui/` for all generated artifacts and display a summary table.

## Design Token Integration

When DESIGN.md exists, tokens are extracted and used as CSS custom properties:

```css
:root {
  --color-primary: #3B82F6;
  --color-secondary: #6366F1;
  --font-family-base: Inter, system-ui, sans-serif;
  --spacing-md: 1rem;
  --radius-lg: 0.75rem;
}
```

All generated components reference these CSS variables, enabling global theme changes via DESIGN.md updates.

## CLI Runtime

```bash
# Generate a page
chaos ui page dashboard
chaos ui page settings --layout sidebar
chaos ui page landing --sections hero,features,testimonials,cta

# Generate components
chaos ui component PrimaryButton --type button
chaos ui component UserCard --type card
chaos ui component SearchInput --type input
chaos ui component DataTable --type table

# Scaffold full app
chaos ui scaffold
chaos ui scaffold react

# Preview tokens
chaos ui preview

# List artifacts
chaos ui list

# JSON output for scripting
chaos ui page dashboard --json
chaos ui list --json
```

## Graph Semantics
- Node ID: stdd.ui
- Depends on stdd.design for DESIGN.md tokens
- parallelizable=true: multiple pages/components can be generated independently
- resumable=true: can continue after interruption
- checkpoint=per-generation

## Evidence Contract
- Generated files written to `stdd/ui/`
- Each generation outputs file paths and metadata
- Preview gallery available at `stdd/ui/preview.html`

## Related Skills
- **stdd.design** - Creates DESIGN.md with design tokens
- **stdd.apply** - Applies generated code to the project
- **stdd.verify** - Verifies generated components
