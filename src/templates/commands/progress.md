---
description: Real-time progress tracking with resume
---

# Command: /stdd:progress

## Usage
```
stdd progress                    # Show progress
stdd progress --summary          # Progress overview
stdd progress --resume           # Resume from last state
stdd progress --json             # JSON format
stdd progress --last N           # Last N entries
stdd progress --clear            # Clear progress
```

## Description
Real-time JSONL progress tracking with crash recovery and breakpoint resume capability.

## Execution Flow
1. Read progress.jsonl
2. Parse and aggregate entries
3. Calculate completion status
4. Display formatted output

## Output
- Progress history
- Current status
- Resume information
