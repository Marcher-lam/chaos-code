---
description: Interpret SudoLang pseudo-code and generate STDD artifacts
---

# Command: /stdd:sudo

## Usage
```
chaos sudo run <file>               # Execute SudoLang and validate
chaos sudo run <file> --generate     # Generate artifacts from SudoLang
chaos sudo run <file> --json         # Output structured JSON
```

## Description
Parses SudoLang pseudo-code files and generates executable validation scripts or STDD artifacts (specs, designs, API specs) based on the parsed interfaces, constraints, and goals.

## Execution Flow
1. Parse the SudoLang source file
2. Extract interfaces, constraints, and goals
3. Generate a test/validation script
4. Execute the script and report results
5. Optionally generate STDD artifacts to `stdd/`

## Output
- Validation pass/fail result with exit code
- Artifacts in `stdd/artifacts/` when using `--generate`
