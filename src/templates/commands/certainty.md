---
description: 5-dimension confidence scoring for critical decisions
---

# Command: /stdd:certainty

## Usage
```
chaos certainty assess                        # Interactive assessment
chaos certainty check [context]               # Check confidence level
chaos certainty history                       # Show assessment history
chaos certainty thresholds                    # Show current thresholds
chaos certainty configure                     # Configure thresholds
```

## Description
Assess decision confidence across 5 dimensions (requirement clarity, technical feasibility, risk level, test coverage, vision alignment) at critical decision points.

## Execution Flow
1. Present 5 dimensions
2. Collect scores (1-5)
3. Calculate overall confidence
4. Compare against thresholds
5. Record in history

## Output
- Confidence score (0-1)
- Dimension breakdown
- Pass/fail against thresholds
- Historical tracking in `stdd/memory/certainty-history.jsonl`
