---
description: Generate Golden Packet fix context for failed tasks (language-agnostic)
---

# Command: /stdd:fix-packet

## Usage
```bash
chaos fix-packet <change-id>                      # Generate fix packet
chaos fix-packet <change-id> --task TASK-001      # Specific task
chaos fix-packet <change-id> --json-only          # JSON only
chaos fix-packet <change-id> --full-source        # Include full source
chaos fix-packet <change-id> --output path/       # Custom output
chaos fix-packet <change-id> --workspace packages/api  # Workspace scope
```

## Description
Generate a "Golden Packet" containing all diagnostic information needed to fix a failed task. Includes spec, design, source code, test output, and suggestions.

## Golden Packet Format

### Markdown Format (fix-packet-*.md)
```markdown
# Fix Packet: <change-id> - <timestamp>

## Failure Summary
- Task: TASK-001
- Stage: GREEN
- Failures: 3

## Context
- Spec excerpt
- Design excerpt
- Task description

## Failure Details
- Test output
- Error message
- Stack trace

## Related Code
- Source snippet
- Test snippet

## Diagnostics
- Possible causes
- Fix suggestions

## History
- Attempt log
- Next actions
```

### JSON Format (fix-packet-*.json)
```json
{
  "packetId": "fix-packet-20250519-103000",
  "changeId": "add-user-login",
  "task": { "id": "TASK-001", "phase": "GREEN" },
  "failure": {
    "summary": "...",
    "testOutput": "...",
    "errorMessage": "...",
    "stackTrace": "..."
  },
  "context": { "spec": "...", "design": "..." },
  "code": { "sourceSnippet": "...", "testSnippet": "..." },
  "diagnostics": {
    "possibleCauses": ["..."],
    "suggestions": ["..."]
  }
}
```

## Auto-Collected Information
1. Failed task info (from tasks.md)
2. Test output (from apply.log or fresh run)
3. Spec excerpts (from specs/)
4. Design excerpts (from design.md)
5. Source code snippets
6. Error messages and stack traces
7. Failure history

## Error Formats by Language
| Language | Error Format | Stack Trace |
|----------|--------------|-------------|
| JavaScript/TypeScript | Error: message | at Function (file:line) |
| Python | Exception: message | Traceback (most recent call last) |
| Java | Exception: message | at Class.method(file:line) |
| Go | error message | goroutine, file:line |
| Rust | error message | backtrace |
| C# | Exception: message | at Class.Method() |

## Referenced Skill
- `/stdd:fix-packet`

## Output
- `stdd/changes/<change-id>/evidence/fix-packet-*.md`
- `stdd/changes/<change-id>/evidence/fix-packet-*.json`

## Related Commands
- `/stdd:apply` - Failure source
- `/stdd:verify` - Verify fix
- `/stdd:guard` - Real-time quality gates
