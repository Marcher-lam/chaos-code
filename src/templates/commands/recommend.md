---
description: Recommend next step based on state
---

# Command: /stdd:recommend

## Usage
```
stdd recommend                   # Get recommendation
stdd recommend --json            # JSON format
stdd graph recommend             # Alias
```

## Description
Analyzes project state and recommends the next STDD command or skill to use.

## Execution Flow
1. Analyze current project state
2. Check active changes
3. Determine next logical step
4. Provide recommendation with reasoning

## Output
- Recommended command
- Reasoning
- Alternative options
