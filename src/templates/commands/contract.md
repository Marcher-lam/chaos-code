---
description: Consumer-driven contract testing
---

# Command: /stdd:contract

## Usage
```
chaos contract generate [change]  # Generate contracts
chaos contract verify [change]    # Verify contracts
chaos contract --mode=pact        # Specify contract format
```

## Description
Generates and manages consumer-driven contract tests supporting 5 message patterns.

## Execution Flow
1. Parse API specifications
2. Generate contract definitions
3. Generate verification tests
4. Run contract verification

## Output
- Contract definitions
- Verification tests
- Compliance reports
