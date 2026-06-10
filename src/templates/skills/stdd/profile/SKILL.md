---
id: stdd.profile
command: /stdd:profile
description: Adaptive planning depth profile detection and management
version: "1.0"
category: planning
phase: governance
read_only: false
risk_level: low
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.complexity, stdd.certainty]
next: [stdd.plan, stdd.execute]
on_failure: []
inputs:
  - complexity score (from stdd/reports/complexity.json)
  - certainty score (from stdd/memory/certainty-history.jsonl)
  - change type override
outputs:
  - detected profile
  - adapted workflow phases
  - phase configuration
evidence:
  required: false
  path: stdd/config.yaml
constitution_articles:
  blocking: []
  warning: []
  suggestion: [8]
graph:
  node_id: stdd.profile
  parallelizable: false
  resumable: true
  checkpoint: per-detection
---

# STDD Skill: /stdd:profile

## Purpose
Adaptive planning depth profile system that unifies complexity analysis and certainty scoring into a coherent planning strategy. Automatically selects the right level of ceremony based on project metrics.

## When to Use
- Before starting a new change to determine the right planning depth
- When uncertainty exists about how much process a change needs
- To enforce consistent planning standards across a team
- When switching between bugfixes, features, and architectural changes

## Profiles

### Quick (depth 1)
- **Use for**: Bugfixes, hotfixes, one-line changes
- **Phases**: verify, test only
- **Max tasks**: 3
- **Test threshold**: 80%
- **Skips**: clarify, mutation, ADR, security audit, multi-role review, full docs

### Standard (depth 2)
- **Use for**: Normal features, enhancements
- **Phases**: spec, plan, verify, test (full lifecycle)
- **Max tasks**: 6
- **Test threshold**: 90%
- **Skips**: ADR, security audit, multi-role review, full docs

### Thorough (depth 3)
- **Use for**: Complex features, architecture changes, migrations
- **Phases**: clarify, spec, plan, mutation, ADR, multi-role review, verify, test
- **Max tasks**: 9
- **Test threshold**: 95%
- **Requires**: mutation, ADR, multi-role review, clarify

### Enterprise (depth 4)
- **Use for**: Cross-cutting concerns, compliance, security changes
- **Phases**: ALL phases including security audit and constitution check
- **Max tasks**: 12
- **Test threshold**: 98%
- **Requires**: everything including full docs and security audit

## Detection Algorithm

```
IF changeType IN {hotfix, fix, bugfix}        -> quick
IF changeType IN {feature, enhancement}       -> standard
IF changeType IN {refactor, architecture}     -> thorough
IF changeType IN {compliance, security, audit} -> enterprise

IF complexity < 20 AND certainty >= 90  -> quick
IF complexity < 50 AND certainty >= 80  -> standard
IF complexity < 80 OR  certainty >= 70  -> thorough
ELSE                                    -> enterprise
```

## CLI Runtime

```bash
# Auto-detect from project data
chaos profile detect

# Explicitly set a profile
chaos profile set thorough

# List all profiles
chaos profile list

# Get full recommendation with workflow
chaos profile recommend
chaos profile recommend --change feature

# JSON output for scripting
chaos profile detect --json
chaos profile recommend --change hotfix --json
```

## Configuration Persistence

Setting a profile saves to `stdd/config.yaml`:
```yaml
profile:
  id: thorough
  name: Thorough
  depth: 3
  setAt: "2026-05-25T10:00:00.000Z"
```

## Graph Semantics
- Node ID: stdd.profile
- Depends on stdd.complexity and stdd.certainty for auto-detection
- Can be used standalone with manual profile selection
- checkpoint=per-detection; resumable=true; parallelizable=false

## Evidence Contract
- Profile selection persisted in stdd/config.yaml
- Detection results include source tracking (scores vs change-type vs default)

## Related Skills
- **stdd.complexity** - Provides complexity score
- **stdd.certainty** - Provides certainty score
- **stdd.plan** - Uses profile to configure task generation
- **stdd.execute** - Uses profile to configure TDD loop
