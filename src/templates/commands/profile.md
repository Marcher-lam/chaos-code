---
description: Detect and manage planning depth profiles for adaptive workflows
---

# Command: /stdd:profile

## Usage
```
chaos profile detect                           # Auto-detect profile from project data
chaos profile set <quick|standard|thorough|enterprise>  # Set profile explicitly
chaos profile list                             # List all profiles with descriptions
chaos profile recommend                        # Detect + show recommended phases and settings
chaos profile recommend --change feature       # Recommend for a specific change type
```

## Description
Unifies complexity analysis and certainty scoring into an adaptive planning system. Automatically selects the right planning depth based on project metrics, or allows manual override.

## Profiles

| Profile | Depth | Max Tasks | Test Threshold | Use Case |
|---------|-------|-----------|----------------|----------|
| quick | 1 | 3 | 80% | Bugfix/hotfix |
| standard | 2 | 6 | 90% | Normal features |
| thorough | 3 | 9 | 95% | Complex features/architecture |
| enterprise | 4 | 12 | 98% | Cross-cutting/compliance |

## Detection Logic
- Reads `stdd/reports/complexity.json` for complexity score
- Reads `stdd/memory/certainty-history.jsonl` for certainty score
- Change type overrides: hotfix -> quick, feature -> standard, refactor -> thorough, compliance -> enterprise

## Output
- Recommended profile with phase configuration
- Adapted workflow (active, skipped, and gate phases)
- JSON output available via `--json`
