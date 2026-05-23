---
description: Generate CI configuration files for GitHub, GitLab, or Jenkins
---

# Command: /stdd:ci

## Usage
```
stdd ci github                   # Generate GitHub Actions
stdd ci gitlab                   # Generate GitLab CI
stdd ci jenkins                  # Generate Jenkinsfile
```

## Description
Generates CI/CD pipeline configuration with STDD quality gates (audit, lint, test, coverage) pre-configured.

## Execution Flow
1. Detect project type and tech stack
2. Select CI platform template
3. Configure quality gates
4. Generate configuration file

## Output
- CI pipeline configuration (`.github/workflows/stdd-ci.yml`, `.gitlab-ci.yml`, or `Jenkinsfile`)
- Quality gate rules for audit, lint, test, and coverage steps
