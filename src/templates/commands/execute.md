---
description: Execute the Ralph Loop TDD closed-loop (language-agnostic)
---

# Command: /stdd:execute

## Usage
```bash
chaos execute <change-id>              # Execute all pending tasks
chaos execute <change-id> --task=TASK-001  # Execute specific task
chaos execute <change-id> --next       # Execute next phase only
chaos execute <change-id> --phase=GREEN # Start from specific phase
chaos execute <change-id> --test-command "pytest"  # Custom test command
chaos execute <change-id> --workspace packages/api # Workspace scope
```

## Description
Executes the Ralph Loop TDD closed-loop: **RED → CHECK → GREEN → MUTATION → REFACTOR**.

Processes tasks from `tasks.md` through the enhanced TDD cycle with circuit breaker protection.

## Ralph Loop Stages

### 1. RED
Write a failing test that describes the expected behavior.

**Test frameworks by language**:
- JavaScript/TypeScript: Jest, Vitest, Mocha → `npm test`
- Python: pytest, unittest → `pytest`
- Java: JUnit, TestNG → `mvn test`
- Go: testing → `go test ./...`
- Rust: Rusttest → `cargo test`
- C#: xUnit, NUnit → `dotnet test`
- PHP: PHPUnit → `vendor/bin/phpunit`

### 2. CHECK
Run static analysis: type checking, linting, formatting.

**Static analysis tools by language**:
- JavaScript/TypeScript: `tsc --noEmit`, ESLint, Prettier
- Python: mypy, pylint/ruff, Black
- Java: javac, Checkstyle, Spotless
- Go: go vet, golangci-lint, gofmt
- Rust: rustc, clippy, rustfmt
- C#: Roslyn, StyleCop, dotnet format
- PHP: PHPStan, Psalm, PHP CS Fixer

### 3. GREEN
Implement minimal code to make tests pass.

### 4. MUTATION
Verify tests detect code defects (anti-fake-green).

**Mutation testing tools by language**:
- JavaScript/TypeScript: [StrykerJS](https://stryker-mutator.io/) → `npx stryker run`
- Python: [Mutmut](https://github.com/mutmut/mutmut) → `mutmut run`
- Java: [PIT](https://pitest.org/) → `mvn org.pitest:pitest-maven:mutationCoverage`
- Go: [Gremlins](https://github.com/go-gremlins/gremlins) → `gremlins test`
- Rust: [cargo-mutants](https://mutants.rs/) → `cargo mutants`
- C#: [Stryker.NET](https://stryker-mutator.io/) → `dotnet stryker`
- PHP: [Infection](https://github.com/infection/infection) → `vendor/bin/infection`

### 5. REFACTOR
Optimize code structure while keeping tests green.

## Circuit Breaker
If a task fails 3 consecutive times, the circuit breaker triggers:
- Stops automatic execution
- Suggests manual intervention
- Generates fix-packet if needed

## Referenced Skill
- `/stdd:execute`

## Output
- Updated task status in `tasks.md`
- Execution log in `stdd/changes/<change-id>/apply.log`
- Evidence in `stdd/changes/<change-id>/evidence/execute-*.json`
- Circuit breaker state in `stdd/changes/<change-id>/circuit-breaker.json`

## Related Commands
- `/stdd:apply` - Task-level TDD execution
- `/stdd:plan` - Generate task list
- `/stdd:mutation` - Detailed mutation testing
