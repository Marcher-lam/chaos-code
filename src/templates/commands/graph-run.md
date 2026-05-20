---
description: Dynamic DAG execution engine
---

# Command: /stdd:graph-run

## Usage
```
stdd graph run <intent>          # Execute by intent
stdd graph run --change-name=<name>
stdd graph run --parallel        # Enable parallel execution
```

## Description
Executes the Graph engine with dynamic DAG orchestration based on intent (feature/hotfix/repair/research).

## Execution Flow
1. Load Graph configuration
2. Parse intent
3. Build execution DAG
4. Execute tasks topologically
5. Capture evidence

## Output
- Execution results
- Evidence files
- Execution logs
