---
description: Check for unused dependencies
---

# Command: /stdd:depcheck

## Usage
```
stdd depcheck                    # Check dependencies
stdd depcheck path/to/dir        # Check specific directory
stdd depcheck --json             # JSON format
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
