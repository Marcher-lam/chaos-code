---
description: Graph execution history viewer
---

# Command: /stdd:graph-history

## Usage
```
chaos graph history               # View execution history
chaos graph history --failures    # Show only failures
chaos graph history --id=<id>     # View specific run
```

## Description
Views Graph engine execution history with detailed logs and results.

## Execution Flow
1. Read history from evidence files
2. Parse execution records
3. Filter and format results
4. Display history

## Output
- Execution history
- Failure details
- Performance metrics
