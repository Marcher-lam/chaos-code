---
description: Quality metrics dashboard
---

# Command: /stdd:metrics

## Usage
```
chaos metrics                      # Show metrics
chaos metrics [change]             # Metrics for change
chaos metrics --workspace <pkg>    # Monorepo package
chaos metrics --export             # Export metrics
```

## Description
Displays quality metrics dashboard including test coverage, mutation score, code complexity, and TDD compliance rate.

## Execution Flow
1. Collect metrics from evidence files
2. Calculate aggregated metrics
3. Display dashboard
4. Optionally export to file

## Output
- Quality metrics dashboard
- Historical trends
- Benchmark comparisons
