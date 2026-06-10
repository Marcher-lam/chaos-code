---
description: Create custom agents, workflows, and skills for Chaos Code
---

# Command: /stdd:builder

## Usage
```
chaos builder agent <name>                        # Create a custom review agent
chaos builder agent <name> --expertise "..." --lens "..." --focus "..."
chaos builder workflow <name>                     # Create a custom workflow
chaos builder workflow <name> --phases stdd-propose,stdd-spec,stdd-plan
chaos builder skill <name>                        # Create a custom skill
chaos builder list                                # List all custom builders
chaos builder list --json                         # JSON output
chaos builder validate <path>                     # Validate a custom creation
chaos builder export <name> --type <agent|workflow|skill>  # Package as extension
```

## Description
The builder command allows users to create custom agents, workflows, and skills that extend Chaos Code's capabilities. Each creation type is stored in `stdd/builders/` and can be exported as a reusable extension.

## Actions

### agent <name>
Creates a custom review agent with the following properties:
- **roleId**: Agent role identifier
- **expertise**: Areas of expertise (comma-separated)
- **lens**: Review perspective description
- **reviewFocus**: Focus areas for review
- **checklist**: Checklist items for structured review
- **promptTemplate**: Auto-generated prompt template

Options: `--expertise`, `--lens`, `--focus` to skip interactive prompts.

### workflow <name>
Creates a custom workflow composed of STDD phases:
- Select from existing STDD skills (propose, clarify, confirm, spec, plan, execute, verify, final-doc, commit-tdd)
- Auto-generates phase IDs and gate placements
- Compatible with skills.yaml format

Options: `--phases <comma-separated>`, `--intent <description>`

### skill <name>
Creates a custom skill with pre-populated SKILL.md frontmatter:
- Auto-generates YAML frontmatter with STDD skill schema
- Prompts for description, category, phase, inputs, outputs

Options: `--description`, `--category`, `--phase`

### list
Scans `stdd/builders/` and displays all custom creations grouped by type (agents, workflows, skills).

### validate <path>
Validates a custom creation file against required field schemas per type.

### export <name>
Packages a custom creation as an installable extension with manifest.

Options: `--type <agent|workflow|skill>` (required)

## Output
- Agents: `stdd/builders/agents/<name>.json`
- Workflows: `stdd/builders/workflows/<name>.yaml`
- Skills: `stdd/builders/skills/<name>/SKILL.md`
- Extensions: `stdd/extensions/installed/<name>/`

## Storage Structure
```
stdd/builders/
  agents/
    security-reviewer.json
    api-designer.json
  workflows/
    custom-pipeline.yaml
  skills/
    data-validator/
      SKILL.md

stdd/extensions/installed/
  security-reviewer/
    extension.json
    security-reviewer.json
```
