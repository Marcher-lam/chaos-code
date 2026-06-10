---
description: Aggregate change artifacts into final delivery document (language-agnostic)
---

# Command: /stdd:final-doc

## Usage
```bash
chaos final-doc <change-id>                      # Generate final doc
chaos final-doc <change-id> --output docs/       # Custom output
chaos final-doc <change-id> --include-diff       # Include code diff
chaos final-doc <change-id> --include-test-report  # Include test report
chaos final-doc <change-id> --json               # JSON format
chaos final-doc <change-id> --workspace packages/api  # Workspace scope
```

## Description
Aggregates all artifacts from the entire development cycle (proposal, specs, design, tasks, evidence, metrics) into a comprehensive final requirement document.

## Document Structure

### FINAL_REQUIREMENT.md
1. **Overview** - Summary, background, objectives (from proposal.md)
2. **Requirements** - Functional/non-functional requirements (from specs/)
3. **Design** - Architecture, data models, API design (from design.md)
4. **Implementation** - Completed tasks, code changes (from tasks.md, git diff)
5. **Testing** - Coverage, results, mutation testing (from evidence/)
6. **Quality** - Code review, Constitution compliance (from evidence/)
7. **Evidence** - Artifact list, coverage summary
8. **Deployment** - Notes, migration, rollback plan

## Artifact Coverage
```markdown
## Artifact Coverage

| Artifact | Status | Notes |
|----------|--------|-------|
| proposal.md | ✅ | Generated |
| specs/ | ✅ | 3 spec files |
| design.md | ✅ | Includes architecture |
| tasks.md | ✅ | 5 tasks completed |
| evidence/ | ⚠️ | Partial - missing mutation |
| mutation report | ❌ | Not run |

### Missing Evidence
- Mutation testing report not generated
- Suggested: `chaos mutation <change-id>`
```

## Referenced Skill
- `/stdd:final-doc`

## Output
- `FINAL_REQUIREMENT.md` - Comprehensive delivery document
- `artifact-coverage.json` - Coverage summary

## Related Commands
- `/stdd:verify` - Verification phase
- `/stdd:archive` - Archive phase
- `/stdd:product-proposal` - Product proposal generation
