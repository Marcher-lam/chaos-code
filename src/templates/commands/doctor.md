---
description: Project health diagnostic check
---

# Command: /stdd:doctor

## Usage
```
stdd doctor                      # Run health check
stdd doctor --deep               # Deep diagnostic
stdd doctor --fix                # Auto-fix issues
```

## Description
Comprehensive project health check covering STDD directory, configuration, Node version, Git hooks, test framework, and more.

## Execution Flow
1. Check STDD directory structure
2. Validate configuration files
3. Check Node version compatibility
4. Verify Git hooks
5. Check test framework setup
6. Generate diagnostic report

## Output
- Health status report
- Issues found
- Fix recommendations
