---
description: Generate test pipeline from specs
---

# Command: /stdd:pipeline

## Usage
```
stdd pipeline [change]           # Generate pipeline
stdd pipeline --format=parser    # Parser IR format
```

## Description
Generates parser IR and acceptance test skeleton from BDD specifications.

## Execution Flow
1. Parse BDD specifications
2. Generate parser IR
3. Generate acceptance test skeleton
4. Output to test directory

## Output
- Parser intermediate representation
- Acceptance test skeleton
