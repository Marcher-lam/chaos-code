---
description: Generate CI configuration files
---

# Command: /stdd:ci

## Usage
```
stdd ci github                   # Generate GitHub Actions
stdd ci gitlab                   # Generate GitLab CI
stdd ci jenkins                  # Generate Jenkinsfile
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
