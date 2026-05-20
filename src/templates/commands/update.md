---
description: Update STDD Copilot templates
---

# Command: /stdd:update

## Usage
```
stdd update                      # Update templates
stdd update [path]               # Update specific path
stdd update --force              # Force overwrite
stdd update --dry-run            # Preview changes
```

## Description
Updates STDD Copilot template files to the latest version.

## Execution Flow
1. Check for updates
2. Compare with local templates
3. Update changed files
4. Report changes

## Output
- Update log
- Changed files list
