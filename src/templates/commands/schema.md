---
description: JSON Schema and Zod validation
---

# Command: /stdd:schema

## Usage
```
stdd schema validate <file>      # Validate schema
stdd schema create <name>        # Create schema
stdd schema fork <src> <name>    # Fork existing schema
```

## Description
Generates JSON Schema and Zod type validation with custom artifact DAG workflow support.

## Execution Flow
1. Parse schema definition
2. Generate JSON Schema
3. Generate Zod validator
4. Output to specified location

## Output
- JSON Schema
- Zod validators
- Type definitions
