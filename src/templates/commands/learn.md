---
description: Pattern teaching and style extraction
---

# Command: /stdd:learn

## Usage
```
chaos learn                       # Show learning status
chaos learn scan                  # Scan for patterns
chaos learn good <pattern>        # Teach good pattern
chaos learn bad <pattern>         # Teach bad pattern
chaos learn suggest               # Get suggestions
chaos learn status                # Show learned patterns
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
