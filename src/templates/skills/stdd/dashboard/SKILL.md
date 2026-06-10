---
id: stdd.dashboard
command: /stdd:dashboard
description: Generate static HTML dashboard showing project health, changes, and evidence
version: "1.0"
category: reporting
phase: review
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
  - package.json (project name, version)
  - stdd/changes/ (active change directories)
  - stdd/changes/archive/ (archived changes)
  - stdd/reports/complexity.json (complexity score)
  - stdd/memory/certainty-history.jsonl (certainty scores)
  - stdd/progress.jsonl (progress timeline)
  - stdd/evidence/ and stdd/changes/*/evidence/ (evidence files)
  - DESIGN.md (optional design tokens)
outputs:
  - stdd/dashboard/index.html (self-contained static HTML dashboard)
evidence:
  required: false
  path: stdd/dashboard/index.html
constitution_articles:
  blocking: []
  warning: []
  suggestion: []
graph:
  node_id: stdd.dashboard
  parallelizable: true
  resumable: true
  checkpoint: per-generation
---

# STDD Skill: /stdd:dashboard

## Purpose
Generates a self-contained static HTML dashboard that visualizes the current state of an STDD project. The dashboard provides at-a-glance insight into project health, change progress, quality scores, constitution compliance, and evidence collection.

## When to Use
- After running multiple STDD commands to see a summary of project state
- Before a review meeting to generate a shareable status page
- During CI/CD to produce an artifact showing build/test health
- When onboarding new team members to show project status
- As part of a `chaos doctor` or health check workflow

## Dashboard Sections

### 1. Overview Tab
- Summary cards: active changes, verified changes, archived count
- Active change list with status badges (active/verified/failed)

### 2. Quality Tab
- Circular progress indicator for composite quality score
- Breakdown of complexity and certainty sub-scores
- Color-coded thresholds (green >= 80, yellow >= 60, red < 60)

### 3. Progress Tab
- Timeline of last 20 progress entries from progress.jsonl
- Status indicators: complete (green), fail (red), in-progress (blue)

### 4. Constitution Tab
- Article list with pass/fail/waived badges
- Overall health percentage

### 5. Evidence Tab
- Flat list of all evidence files across changes
- File type, change association, and timestamps

## CLI Runtime

```bash
# Generate dashboard (default action)
chaos dashboard

# Generate with explicit action
chaos dashboard generate

# Generate and open in browser
chaos dashboard open

# Output raw data as JSON (no HTML generation)
chaos dashboard --json

# Custom output path
chaos dashboard --output ./reports/dashboard.html
```

## Design Token Integration
If a `DESIGN.md` file exists in the project root, the dashboard parses color tokens from it and uses those colors instead of the default dark theme. This provides visual consistency with the project's design system.

## Technical Details
- Zero external dependencies (no frameworks, no CDN references)
- Fully self-contained HTML with inline CSS and minimal JS for tab switching
- Responsive layout: collapses to single-column on mobile
- Dark theme default with optional DESIGN.md overrides
- Gracefully handles missing data files (shows empty states)

## Data Aggregation
The `gatherData()` method reads from multiple STDD data sources and produces a unified data structure. All file reads are wrapped in try/catch to handle missing files gracefully. The dashboard never fails due to incomplete data.

## Related Skills
- **stdd.status** - Text-based status display
- **stdd.doctor** - Health check with diagnostics
- **stdd.metrics** - Detailed metrics reporting
- **stdd.complexity** - Provides complexity score
- **stdd.certainty** - Provides certainty score
- **stdd.design** - Provides design tokens
