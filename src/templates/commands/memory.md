---
description: Vector database memory system
---

# Command: /stdd:memory

## Usage
```
chaos memory scan                             # Scan and index memory
chaos memory search "<query>"                 # Semantic search
chaos memory add "<content>"                  # Add to memory
chaos memory list                             # List memory entries
chaos memory status                           # Show memory statistics
chaos memory clear                            # Clear memory
chaos memory export                           # Export memory
chaos memory import                           # Import memory
```

## Description
Semantic search and persistent memory storage using vector embeddings for cross-session context retention.

## Execution Flow
1. Scan project for artifacts
2. Generate vector embeddings
3. Store in vector database
4. Enable semantic search
5. Maintain statistics

## Output
- Memory index in `stdd/memory/`
- Search results with relevance scores
- Memory statistics and coverage
