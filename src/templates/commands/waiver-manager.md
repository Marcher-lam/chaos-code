---
description: Constitution waiver management
---

# Command: /stdd:waiver-manager

## Usage
```
stdd waiver-manager list         # List waivers
stdd waiver-manager create       # Create waiver
stdd waiver-manager revoke <id>  # Revoke waiver
stdd waiver-manager audit        # Audit waiver history
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
