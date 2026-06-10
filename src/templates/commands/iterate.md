---
description: Plan-Execute-Reflect iteration loop
---

# Command: /stdd:iterate

## Usage
```
chaos iterate start "<title>"                 # Start iteration cycle
chaos iterate complete <cycle>                # Complete current cycle
chaos iterate reflect <cycle>                 # Add reflection
chaos iterate status                          # Show cycle status
chaos iterate history                         # Show iteration history
chaos iterate continue                        # Continue next cycle
chaos iterate retrospective                   # Generate retrospective
```

## Description
Autonomous iterative loop that plans, executes, and reflects on results to progressively improve implementation quality.

## Execution Flow
1. Create cycle with plan
2. Execute and record actions
3. Reflect on outcomes
4. Define next steps
5. Track in `stdd/iterations/index.jsonl`

## Output
- Iteration cycle document
- Reflection notes
- Improvement suggestions
- Historical trends
