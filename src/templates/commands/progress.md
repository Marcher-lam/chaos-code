---
description: Real-time progress tracking with resume
---

# Command: /stdd:progress

## Usage
```
chaos progress                    # Show progress
chaos progress --summary          # Progress overview
chaos progress --resume           # Resume from last state
chaos progress --json             # JSON format
chaos progress --last N           # Last N entries
chaos progress --clear            # Clear progress
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
