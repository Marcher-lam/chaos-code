---
description: List all available skills
---

# Command: /stdd:skills

## Usage
```
chaos skills                      # List all skills
chaos skills --phase N            # Filter by phase
chaos skills --category <name>    # Filter by category
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
