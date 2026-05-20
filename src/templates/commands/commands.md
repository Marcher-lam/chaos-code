---
description: List all available Claude Code commands
---

# Command: /stdd:commands

## Usage
```
stdd commands                    # List all commands
stdd commands --filter=core      # Filter by category
```

## Description
Lists all available Claude Code slash commands with descriptions and usage examples.

## Execution Flow
1. Scan `.claude/commands/` directory
2. Parse command metadata
3. Format and display list

## Output
- Command list with descriptions
- Usage examples
