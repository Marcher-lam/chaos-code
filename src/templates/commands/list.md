---
description: List changes and specifications
---

# Command: /stdd:list

## Usage
```
stdd list                        # List active changes
stdd list --specs                # List specifications
stdd list --archived             # Include archived
stdd list --json                 # JSON format
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
