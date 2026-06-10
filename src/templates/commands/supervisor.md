---
description: Multi-agent coordinator (Supervisor pattern)
---

# Command: /stdd:supervisor

## Usage
```
chaos supervisor start "<topic>"              # Start supervisor session
chaos supervisor consult                      # Get recommendations
chaos supervisor review [change]              # Review work
chaos supervisor debate "<topic>"             # Agent debate
chaos supervisor roles                        # List available roles
chaos supervisor status                       # Show session status
chaos supervisor history                      # Show session history
```

## Description
Coordinate multiple AI agents working on different tasks, managing delegation, status, and synchronization.

## Execution Flow
1. Select participating agent roles
2. Define topic or task
3. Run discussion rounds
4. Collect recommendations
5. Record session for history

## Output
- Multi-agent recommendations
- Discussion summary
- Session history in `stdd/supervisor/sessions.jsonl`
