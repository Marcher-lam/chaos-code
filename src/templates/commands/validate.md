---
description: Validate spec consistency and integrity
---

# Command: /stdd:validate

## Usage
```
chaos validate [change]           # Validate change
chaos validate --spec-guardian    # Spec Guardian check
chaos validate --fix              # Auto-fix issues
```

## Description
Validates specification consistency, Spec Guardian leakage detection, and RFC 2119 keyword compliance.

## Execution Flow
1. Parse specifications
2. Check for consistency issues
3. Run Spec Guardian leakage check
4. Validate RFC 2119 keywords
5. Generate report

## Output
- Validation report
- Issues found
- Fix suggestions
