---
description: List all available skills
---

# Command: /stdd:skills

## Usage
```
stdd skills                      # List all skills
stdd skills --phase N            # Filter by phase
stdd skills --category <name>    # Filter by category
```

## Description
Lists all available STDD skills with descriptions and usage information.

## Execution Flow
1. Scan `.claude/skills/` directory
2. Parse skill metadata
3. Format and display list

## Output
- Skill list with descriptions
- Phase information
- Usage examples
