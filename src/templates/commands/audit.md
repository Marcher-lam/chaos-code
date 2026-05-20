---
description: Constitution compliance audit history
---

# Command: /stdd:audit

## Usage
```
stdd audit                       # View audit history
stdd audit --json                # JSON format output
stdd audit --article=2           # Filter by article
stdd audit --limit=20            # Limit entries
```

## Description
Displays Constitution compliance audit history with trends and patterns over time.

## Execution Flow
1. Read audit log from `stdd/constitution/audit.log`
2. Parse and filter entries
3. Calculate trends and statistics
4. Display formatted output

## Output
- Audit history with timestamps
- Compliance trends
- Violation patterns
