---
description: BDD spec generation from requirements
---

# Command: /stdd:spec-generator

## Usage
```
chaos spec-generator [change]     # Generate specs
chaos spec-generator --format=bdd # BDD format
```

## Description
Generates BDD (Given/When/Then) specifications from confirmed requirements.

## Execution Flow
1. Read confirmed proposal
2. Extract feature points
3. Generate BDD scenarios
4. Output Delta Spec

## Output
- BDD scenarios
- Delta Spec files
