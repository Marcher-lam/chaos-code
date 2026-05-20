---
description: Monorepo workspace registry management
---

# Command: /stdd:workspace

## Usage
```
stdd workspace list              # List workspaces
stdd workspace validate          # Validate registry
stdd workspace repair            # Repair registry
stdd workspace --json            # JSON format
```

## Description
Manages Monorepo workspace registry with list, validate, and repair operations.

## Execution Flow
1. Read workspace configuration
2. Scan for workspaces
3. Validate workspace entries
4. Repair invalid entries

## Output
- Workspace list
- Validation results
- Repair actions taken
