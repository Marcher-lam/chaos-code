---
description: Constitution waiver management
---

# Command: /stdd:waiver-manager

## Usage
```
chaos waiver-manager list         # List waivers
chaos waiver-manager create       # Create waiver
chaos waiver-manager revoke <id>  # Revoke waiver
chaos waiver-manager audit        # Audit waiver history
```

## Description
Manages Constitution article waivers with tracking, expiration, and audit trail.

## Execution Flow
1. Read waiver database
2. Parse waiver entries
3. Check expiration
4. Display or manage waivers

## Output
- Waiver list
- Waiver details
- Audit trail
