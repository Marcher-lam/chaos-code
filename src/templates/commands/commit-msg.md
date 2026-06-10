---
description: Generate TDD-style commit messages
---

# Command: /stdd:commit-msg

## Usage
```
chaos commit-msg [change]         # Generate commit message
chaos commit-msg --phase=red      # Specify TDD phase
```

## Description
Generates Conventional Commits with TDD phase prefixes (red:/green:/refactor:).

## Execution Flow
1. Read change status and tasks
2. Detect TDD phase
3. Generate formatted commit message
4. Apply prefix based on phase

## Output
- TDD-prefixed commit message
- Conventional Commits format
