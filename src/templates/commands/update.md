---
description: Update Chaos Code templates
---

# Command: /stdd:update

## Usage
```
chaos update                      # Update templates
chaos update [path]               # Update specific path
chaos update --force              # Force overwrite
chaos update --dry-run            # Preview changes
```

## Description
Updates Chaos Code template files to the latest version.

## Execution Flow
1. Check for updates
2. Compare with local templates
3. Update changed files
4. Report changes

## Output
- Update log
- Changed files list
