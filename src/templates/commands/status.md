---
description: View change status
---

# Command: /stdd:status

## Usage
```
stdd status                      # Show all status
stdd status [change]             # Show specific change
stdd status --json               # JSON format
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
