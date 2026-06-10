---
description: View change status
---

# Command: /stdd:status

## Usage
```
chaos status                      # Show all status
chaos status [change]             # Show specific change
chaos status --json               # JSON format
```

## Description
Displays status of active changes, specifications, and workflow state.

## Execution Flow
1. Read `.status.yaml`
2. Parse change metadata
3. Display formatted status

## Output
- Active change status
- Workflow state
- Change list
