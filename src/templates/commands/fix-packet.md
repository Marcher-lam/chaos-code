---
description: Generate a Golden Packet fix context for test failures
---

# Fix Packet

You are running the STDD Copilot Fix Packet command to generate a focused fix context for test failures.

## Context

- **Current Working Directory**: {{cwd}}
- **Change Name**: {{changeName}}
- **Options**: {{options}}

## Task

Generate a "Golden Packet" fix context that includes:

1. **Specs and Requirements**: Read the change specs, proposals, design docs, and tasks
2. **Test Output**: Include the failing test output if provided
3. **Evidence Files**: Include recent evidence from mutation testing, coverage reports, and test results
4. **Runtime Artifacts**: List screenshots, traces, and other artifacts for debugging

## Instructions

After generating the fix packet:

1. Read the specs and task first; they are the contract.
2. Fix application code, not test expectations, unless the spec is explicitly wrong.
3. Use evidence and runtime artifacts to locate the failure before editing.
4. Prefer the smallest code change that makes the failing test pass.
5. Run the listed test command again and record the result.

## CLI Command

```bash
stdd fix-packet <change-name> [options]
```

Options:
- `--task <name>`: Specific task to fix
- `--test-command <cmd>`: Test command that failed
- `--test-output <path>`: Path to test output file
- `--evidence-limit <n>`: Max evidence files (default: 8)
- `--artifact-limit <n>`: Max runtime artifacts (default: 12)
- `--json`: Output JSON instead of markdown
- `--silent`: Suppress output

## Output

The fix packet will be written to:
- `stdd/changes/<change-name>/evidence/fix-packet-<timestamp>.md`
- `stdd/changes/<change-name>/evidence/fix-packet-<timestamp>.json`
