---
description: List changes and specifications
---

# Command: /stdd:list

## Usage
```
chaos list                        # List active changes
chaos list --specs                # List specifications
chaos list --archived             # Include archived
chaos list --json                 # JSON format
```

## Description
Lists all active changes, specifications, and archived items.

## Execution Flow
1. Scan `stdd/changes/` directory
2. Parse change metadata
3. Format and display list

## Output
- Change list with status
- Specification tree
- Archive contents
