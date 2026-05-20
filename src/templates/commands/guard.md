---
description: TDD guard with anti-bypass protection
---

# Command: /stdd:guard

## Usage
```
stdd guard                       # Check TDD compliance
stdd guard --strict              # Strict mode
stdd guard on                    # Enable guard
stdd guard off                   # Disable guard
stdd guard status                # Check status
```

## Description
TDD guard hook enforcing test-first development with anti-bypass mechanisms.

## Execution Flow
1. Check guard status
2. Scan for violations (code without tests)
3. Verify TDD phase compliance
4. Report or block violations

## Output
- Compliance status
- Violation report
- Block/fail decisions
