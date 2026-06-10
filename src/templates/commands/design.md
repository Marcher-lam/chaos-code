---
description: Generate technical design document from specifications
---

# Command: /stdd:design

## Usage
```
chaos design create                           # Create DESIGN.md
chaos design show                             # Show design document
chaos design check                            # Check design completeness
chaos design update                           # Update design document
```

## Description
Transform specifications into technical design documents with architecture decisions, implementation plans, and risk assessment.

## Execution Flow
1. Detect tech stack
2. Select design preset
3. Generate DESIGN.md template
4. Fill with architecture decisions
5. Validate completeness

## Output
- `DESIGN.md` in project root
- Architecture decisions
- Implementation plan
- Risk assessment
- Tech stack documentation
