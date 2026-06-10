---
description: Interact with STDD runtime engines for multi-agent simulation and SudoLang parsing
---

# Command: /stdd:runtime

## Usage
```
chaos runtime agent <action> [topic]   # Multi-agent party mode
chaos runtime sudo [file]              # SudoLang interpreter
```

## Description
Manages STDD runtime engines including multi-agent simulation (Party Mode) and the SudoLang pseudo-code interpreter.

## Subcommands

### runtime agent
```
chaos runtime agent start <topic>    # Start party mode simulation
chaos runtime agent next             # Advance to next turn
chaos runtime agent stop             # Stop simulation
chaos runtime agent run --role <r>   # Run single-agent turn
```

### runtime sudo
```
chaos runtime sudo <file>            # Parse and execute SudoLang
chaos runtime sudo <file> --generate  # Generate STDD artifacts
```

## Execution Flow
1. Validate runtime prerequisites
2. Dispatch to the requested sub-engine (agent or sudo)
3. Execute the simulation or parse step
4. Output structured results

## Output
- Agent simulation state (rounds, turns, role outputs)
- SudoLang parsing results or generated artifacts
