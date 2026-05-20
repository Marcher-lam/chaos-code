---
description: Pattern teaching and style extraction
---

# Command: /stdd:learn

## Usage
```
stdd learn                       # Show learning status
stdd learn scan                  # Scan for patterns
stdd learn good <pattern>        # Teach good pattern
stdd learn bad <pattern>         # Teach bad pattern
stdd learn suggest               # Get suggestions
stdd learn status                # Show learned patterns
```

## Description
Adaptive learning system that scans project patterns and teaches good/bad practices.

## Execution Flow
1. Scan codebase for patterns
2. Extract style conventions
3. Store pattern memory
4. Provide suggestions

## Output
- Pattern database
- Style conventions
- Suggestions
