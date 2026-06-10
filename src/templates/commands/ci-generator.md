---
description: Generate CI configuration files
---

# Command: /stdd:ci-generator

## Usage
```
chaos ci github                   # Generate GitHub Actions
chaos ci gitlab                   # Generate GitLab CI
chaos ci jenkins                  # Generate Jenkinsfile
```

## Description
Generates CI configuration files for various platforms with STDD quality gates pre-configured.

## Execution Flow
1. Detect project type and tech stack
2. Select CI platform template
3. Configure quality gates (audit, lint, test, coverage)
4. Generate configuration file

## Output
- CI configuration file
- Quality gate rules
