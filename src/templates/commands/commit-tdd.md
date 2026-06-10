---
description: Perform atomic git commits with TDD phase prefix (red:/green:/refactor:)
---

# Command: /stdd:commit-tdd

## Usage
```
chaos commit-tdd commit [change]          # Create atomic TDD commit
chaos commit-tdd check [change]           # Check commit readiness
chaos commit-tdd amend [change]           # Amend last commit
chaos commit-tdd status                   # Show git commit status
```

## Description
Creates atomic commits with `red:`, `green:`, or `refactor:` Conventional Commit prefixes. Differs from `/stdd:commit` by always using the TDD phase prefix and performing the actual `git commit` operation.

## Options
- `--phase <phase>`: Force `red`, `green`, or `refactor` prefix.
- `--all`: Stage all changed files before committing.
- `--amend`: Amend the previous commit.
- `--dry-run`: Preview without committing.
- `--skip-constitution`: Skip constitution checks.
- `-y, --yes`: Skip confirmation prompts.

## Execution Flow
1. Resolve the active or named change
2. Read `tasks.md` and `proposal.md` for context
3. Detect or apply the TDD phase
4. Run constitution checks (unless skipped)
5. Stage files when needed
6. Create the commit with the generated message

## Output
- TDD-prefixed commit message
- Commit hash and change summary
