---
description: Read-only exploration of project architecture and quality hotspots (language-agnostic)
---

# Command: /stdd:explore

## Usage
```bash
chaos explore                          # Explore entire project
chaos explore <scope>                  # Explore specific scope
chaos explore src                      # Explore src directory
chaos explore auth                     # Explore auth module
chaos explore --output report.md       # Save report to file
chaos explore --json                   # JSON format output
chaos explore --deep                   # Deep analysis
chaos explore --workspace packages/api # Workspace scope
```

## Description
Performs read-only exploration of project architecture, dependencies, and quality hotspots.

## Exploration Dimensions

### 1. Architecture Analysis
- Directory structure
- Module organization
- Entry point identification
- Dependency mapping

**Entry files by language**:
- JavaScript/TypeScript: index.js, main.js, app.js, server.js
- Python: __main__.py, main.py, app.py, manage.py
- Java: Main.java, Application.java
- Go: main.go, cmd/*/main.go
- Rust: main.rs, lib.rs
- C#: Program.cs, Startup.cs
- PHP: index.php

### 2. Tech Stack Detection
- Programming language
- Frameworks and libraries
- Build tools
- Test frameworks
- Package managers

**Config files by language**:
- JavaScript/TypeScript: package.json
- Python: pyproject.toml, requirements.txt, setup.py
- Java: pom.xml, build.gradle
- Go: go.mod
- Rust: Cargo.toml
- C#: .csproj, package.json
- PHP: composer.json

### 3. Test Coverage Analysis
- Untested source files
- Test file distribution
- Test pattern recognition

**Test file patterns by language**:
- JavaScript/TypeScript: *.test.js, *.spec.js, __tests__/*
- Python: test_*.py, *_test.py, tests/*.py
- Java: *Test.java, **/test/*.java
- Go: *_test.go
- Rust: *_test.rs, tests/*.rs
- C#: *.Tests.cs, **/Test/*.cs
- PHP: *Test.php, tests/*.php

### 4. Quality Hotspots
- Long files (>500 lines)
- High complexity
- Many exports
- Code duplication

### 5. Dependency Analysis
- Core dependencies
- Transitive dependencies
- Version conflicts

## Output
- Architecture summary
- Entry files list
- Core dependencies
- Untested files
- Quality hotspots
- Actionable suggestions

## Referenced Skill
- `/stdd:explore`

## Related Commands
- `/stdd:init` - Initialize project
- `/stdd:context` - Project context
- `/stdd:learn` - Learn from code
