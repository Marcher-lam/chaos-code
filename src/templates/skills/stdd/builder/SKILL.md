---
id: stdd.builder
command: /stdd:builder
description: Create custom agents, workflows, and skills for Chaos Code
version: "1.0"
category: workflow
phase: governance
read_only: false
risk_level: low
custom: false
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.init]
next: [stdd.execute, stdd.plan]
on_failure: []
inputs:
  - name (agent/workflow/skill identifier)
  - type specification
  - configuration options
outputs:
  - stdd/builders/agents/<name>.json
  - stdd/builders/workflows/<name>.yaml
  - stdd/builders/skills/<name>/SKILL.md
  - stdd/extensions/installed/<name>/extension.json
evidence:
  required: false
  path: stdd/builders/
constitution_articles:
  blocking: []
  warning: []
  suggestion: [8]
graph:
  node_id: stdd.builder
  parallelizable: false
  resumable: true
  checkpoint: per-creation
---

# STDD Skill: /stdd:builder

## Purpose
The builder skill provides a creation toolkit for extending Chaos Code with custom agents, workflows, and skills. It enables teams to codify their own review perspectives, pipeline compositions, and specialized capabilities.

## When to Use
- Creating a custom review agent for domain-specific concerns (security, accessibility, performance)
- Composing a custom workflow from existing STDD phases
- Building a custom skill with specialized inputs/outputs
- Validating and exporting custom creations as reusable extensions

## Actions

### agent <name>
Creates a custom review agent definition.

**Schema:**
```json
{
  "id": "custom-<name>",
  "name": "<name>",
  "roleId": "<role-identifier>",
  "lens": "Review perspective description",
  "expertise": ["area1", "area2"],
  "reviewFocus": ["focus1", "focus2"],
  "checklist": ["item1", "item2"],
  "promptTemplate": "As ${name}, analyze '${topic}' for ${lens}.",
  "custom": true,
  "createdAt": "ISO timestamp"
}
```

**CLI flags:** `--expertise`, `--lens`, `--focus`, `--force`

### workflow <name>
Creates a custom workflow from STDD phase skills.

**Available phases:** stdd-propose, stdd-clarify, stdd-confirm, stdd-spec, stdd-plan, stdd-execute, stdd-verify, stdd-final-doc, stdd-commit-tdd

**CLI flags:** `--phases <comma-separated>`, `--intent <text>`, `--force`

### skill <name>
Creates a custom skill with SKILL.md frontmatter.

**CLI flags:** `--description <text>`, `--category <cat>`, `--phase <phase>`, `--force`

### list
Displays all custom agents, workflows, and skills from `stdd/builders/`.

### validate <path>
Validates a custom creation file against required fields.

### export <name> --type <agent|workflow|skill>
Packages a custom creation as an installable extension with manifest.

## CLI Runtime

```bash
# Create custom agents
chaos builder agent security-reviewer
chaos builder agent api-designer --expertise "REST,GraphQL" --lens "API consistency" --focus "naming,versioning"

# Create custom workflows
chaos builder workflow full-pipeline
chaos builder workflow quick-fix --phases stdd-spec,stdd-verify

# Create custom skills
chaos builder skill data-validator
chaos builder skill perf-analyzer --description "Performance regression detection" --category quality

# List all custom creations
chaos builder list
chaos builder list --json

# Validate creations
chaos builder validate stdd/builders/agents/security-reviewer.json
chaos builder validate stdd/builders/workflows/full-pipeline.yaml

# Export as extension
chaos builder export security-reviewer --type agent
chaos builder export full-pipeline --type workflow
chaos builder export data-validator --type skill
```

## Graph Semantics
- Node ID: stdd.builder
- Depends on stdd.init (project must be initialized)
- Can be used at any point after initialization
- checkpoint=per-creation; resumable=true; parallelizable=false

## Evidence Contract
- Agent definitions stored as JSON in `stdd/builders/agents/`
- Workflow definitions stored as YAML in `stdd/builders/workflows/`
- Skill definitions stored as SKILL.md in `stdd/builders/skills/<name>/`
- Extensions exported to `stdd/extensions/installed/<name>/`

## Related Skills
- **stdd.roles** - Built-in role definitions
- **stdd.profile** - Planning depth profiles
- **stdd.extensions** - Extension management
- **stdd.graph-run** - Workflow execution engine
