---
description: Create or check atomic TDD commits
---

# Command: /stdd:commit

## Usage
```
chaos commit [change]                  # Create an atomic TDD commit
chaos commit [change] --dry-run         # Preview the commit message
chaos commit [change] --phase=red       # Force TDD phase prefix
chaos commit check [change]             # Check commit readiness
chaos commit status                     # Show Git commit status summary
```

## Description
Creates atomic commits for STDD changes with `red:`, `green:`, or `refactor:` prefixes. This command wraps the commit workflow, while `/stdd:commit-msg` only generates a commit message.

## Execution Flow
1. Resolve the active or named change from `stdd/changes/`.
2. Read `proposal.md` and `tasks.md` for title, issue, and completed task context.
3. Detect or apply the TDD phase prefix.
4. Run constitution checks unless skipped.
5. Stage files when needed and create the Git commit.

## Options
- `--phase <phase>`: Force `red`, `green`, or `refactor` prefix.
- `--issue <number>`: Attach an issue number.
- `--require-issue`: Fail if no issue can be inferred.
- `--skip-constitution`: Skip constitution checks.
- `--allow-incomplete`: Allow commit before any task is completed.
- `--dry-run`: Preview without committing.
- `--yes`: Skip interactive confirmation.

## Output
- Commit preview or created commit summary.
- TDD phase, change name, task completion count, and issue traceability when available.
