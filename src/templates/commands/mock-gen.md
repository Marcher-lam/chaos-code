---
description: Generate mock implementations
---

# Command: /stdd:mock-gen

## Usage
```
chaos mock [change]                # Generate mocks
chaos mock --all                   # Scan all dependencies
chaos mock --fake                  # Generate runnable fakes
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
