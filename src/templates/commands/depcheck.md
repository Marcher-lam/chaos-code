---
description: Check for unused dependencies
---

# Command: /stdd:depcheck

## Usage
```
chaos depcheck                    # Check dependencies
chaos depcheck path/to/dir        # Check specific directory
chaos depcheck --json             # JSON format
```

## Description
Checks for unused and outdated dependencies in the project.

## Execution Flow
1. Scan package.json and imports
2. Detect unused dependencies
3. Detect outdated versions
4. Generate report

## Output
- Unused dependencies list
- Outdated packages
- Update recommendations
