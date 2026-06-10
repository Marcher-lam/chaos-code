---
description: Generate a static HTML dashboard showing project health, changes, and evidence
---

# Command: /stdd:dashboard

## Usage
```
chaos dashboard                # Generate dashboard to stdd/dashboard/index.html
chaos dashboard generate       # Same as above
chaos dashboard open           # Generate and open in browser
chaos dashboard --json         # Output raw dashboard data as JSON
chaos dashboard --output ./r   # Custom output file path
```

## Description
Generates a self-contained static HTML dashboard that visualizes the current state of your STDD project. No external CSS or JS dependencies required. The dashboard includes:

- **Overview**: Active, verified, and archived change counts with status cards
- **Quality Score**: Circular progress indicator combining complexity and certainty scores
- **Progress Timeline**: Last 20 entries from progress.jsonl with status indicators
- **Constitution Status**: Article list with pass/fail/waived badges and health percentage
- **Evidence Gallery**: Scanned evidence files from all change directories

## Data Sources
| Source | Path | Data |
|--------|------|------|
| Project info | `package.json` | Name, version |
| Active changes | `stdd/changes/*/` | Name, status, phase |
| Archived count | `stdd/changes/archive/` | Directory count |
| Complexity | `stdd/reports/complexity.json` | Complexity score |
| Certainty | `stdd/memory/certainty-history.jsonl` | Last certainty score |
| Progress | `stdd/progress.jsonl` | Last 20 entries |
| Constitution | Static article list + `stdd/waivers.yaml` | Pass/fail/waived status |
| Evidence | `stdd/evidence/` + `stdd/changes/*/evidence/` | File listing |
| Design tokens | `DESIGN.md` (optional) | Color and style overrides |

## Actions
| Action | Description |
|--------|-------------|
| `generate` | Generate dashboard HTML (default) |
| `open` | Generate and open in default browser |

## Options
| Option | Description |
|--------|-------------|
| `--json` | Output raw dashboard data as JSON instead of HTML |
| `--output <path>` | Write HTML to a custom file path |

## Output
Default output: `stdd/dashboard/index.html`

The generated HTML is fully self-contained with inline CSS and minimal inline JavaScript for tab switching. It uses a dark theme by default, with optional color overrides from DESIGN.md design tokens.
