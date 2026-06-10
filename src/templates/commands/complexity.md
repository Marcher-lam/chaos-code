---
description: Code complexity assessment and quality metrics
---

# Command: /stdd:complexity

## Usage
```
chaos complexity analyze [path]               # Analyze complexity
chaos complexity report                       # Generate complexity report
chaos complexity trend                        # Show complexity trends
chaos complexity hotspots                     # Show complexity hotspots
```

## Description
Quantify code complexity using APP mass analysis, providing complexity metrics for refactoring decisions.

## Execution Flow
1. Scan source files
2. Calculate cyclomatic complexity
3. Measure cognitive complexity
4. Identify hotspots
5. Generate report

## Output
- Complexity metrics per file
- Hotspot identification
- Trend analysis
- Refactoring recommendations
