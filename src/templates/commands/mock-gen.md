---
description: Generate mock implementations
---

# Command: /stdd:mock-gen

## Usage
```
stdd mock [change]                # Generate mocks
stdd mock --all                   # Scan all dependencies
stdd mock --fake                  # Generate runnable fakes
```

## Description
Automatically generates mock implementations for external dependencies.

## Execution Flow
1. Scan for external dependencies
2. Analyze interfaces and types
3. Generate mock implementations
4. Output to test directory

## Output
- Mock implementations
- Fake implementations
- Test fixtures
