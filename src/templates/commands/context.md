---
description: Three-layer documentation context management
---

# Command: /stdd:context

## Usage
```
chaos context                     # Show all layers
chaos context foundation          # Show foundation layer
chaos context --export            # Export context
chaos context --json              # JSON format
```

## Description
Manages three-layer documentation context: Foundation (~500t), Component (~1000t), Feature (~2000t).

## Execution Flow
1. Read context layers from `stdd/memory/`
2. Merge and format context
3. Display or export

## Output
- Merged context documentation
- Token counts per layer
