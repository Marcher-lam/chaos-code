---
description: Generate user acceptance tests
---

# Command: /stdd:user-test

## Usage
```
chaos user-test [change]          # Generate user tests
chaos user-test --format=human    # Human-readable format
```

## Description
Generates human-readable acceptance test scripts from BDD specs for non-technical users.

## Execution Flow
1. Read BDD specifications
2. Generate human-readable test script
3. Generate AI agent automation script
4. Output to test directory

## Output
- Human-readable test scripts
- AI automation scripts
