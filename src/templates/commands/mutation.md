---
description: Mutation testing for anti-fake-green
---

# Command: /stdd:mutation

## Usage
```
chaos mutation [change]            # Run mutation testing
chaos mutation --mode=quick        # Quick heuristic mode
chaos mutation --mode=stryker     # Stryker deep analysis
chaos mutation --threshold=80      # Set score threshold
```

## Description
Mutation testing to detect fake-green tests using Quick heuristic or Stryker delegation.

## Execution Flow
1. Analyze test coverage
2. Generate code mutants
3. Run tests against mutants
4. Calculate mutation score
5. Generate report

## Output
- Mutation score
- Killed/survived mutants
- Test weaknesses report
