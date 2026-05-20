---
description: Initialize test scaffolding for existing code
---

# Command: /stdd:tdd-init

## Usage
```
stdd tdd init [path]             # Initialize tests
stdd tdd-init --dry-run          # Preview only
```

## Description
Initializes test scaffolding for existing source code files.

## Execution Flow
1. Scan source files
2. Analyze exports and functions
3. Generate test skeleton
4. Output to test directory

## Output
- Test file skeletons
- Test configuration
