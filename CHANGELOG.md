# CHANGELOG

All notable changes to STDD Copilot will be documented in this file.

## [1.0.0] - 2026-05-14

### Added
- **Skill Graph Engine**: Dynamic DAG orchestration with intent-adaptive topology (hotfix/feature/repair/research)
- **57 CLI Commands**: Full workflow automation (init, new, apply, verify, archive, mutation, start, doctor, etc.)
- **Constitution System**: 9 articles with Hook Enforcement and waiver tracking
- **Ralph Loop TDD**: Red → Green → Refactor cycle with phase enforcement
- **5-Level Defense System**: Human confirmation gates, micro-task isolation, failure rollback, static quality, mutation review
- **Graph Runtime Modules**: Dynamic router, executor with self-healing, evidence capture, error propagator, heterogeneous adapter, parallel executor
- **Multi-Agent Runtime**: Party Mode state machine, SudoLang parser/executor
- **Browser Automation**: Built-in Playwright integration for E2E testing
- **Workspace/Monorepo Support**: Registry, scope detection, per-package commands
- **Mutation Testing**: Quick heuristic mode + Stryker delegation
- **Evidence Capture**: Structured error evidence with multi-hop propagation
- **22 AI Engine Adapters**: 4-Tier compatibility system
- **Integration Tests**: End-to-end workflow validation
- **Performance Benchmarks**: Baseline metrics for core operations
- **TypeScript Type Definitions**: JSDoc types for core interfaces
- **Command Registry**: Centralized command management for dynamic loading
- **CommandLoader Pattern**: CLI refactored from 1125 to ~400 lines via modular command loading
- **Shell Executor**: Allowlist-based shell command execution with audit logging
- **Session Progress Tracking** (`stdd progress`): Real-time JSONL progress log for all CLI commands, survives terminal close/crash, supports breakpoint resume via `--resume`, SIGINT/SIGTERM signal capture, automatic truncation at 5000 entries
- **Product Proposal Generator** (`stdd product-proposal`): Scans all `stdd/` artifacts (vision, proposals, specs, designs, tasks, evidence, progress) and generates a 15-section product proposal report (`PRODUCT-PROPOSAL.md`) with artifact coverage, quality metrics, PM capability matrix, and roadmap
- **Logging System**: Multi-level structured logging with rotation
- **`stdd start`**: Interactive quick-start wizard for new users
- **`stdd doctor`**: Project health diagnostics (10 checks: STDD dir, config, Node.js version, git hooks, etc.); `--deep` mode for extended audit
- **`file-walker.js`**: Shared directory traversal utility, unifies 7 duplicated implementations
- **Docker Multi-Stage Build**: `.dockerignore`, non-root user, minimal production image
- **Coverage Thresholds**: Enforced on 7 core modules via Jest configuration
- **CI Pipeline**: test + package + docker jobs matrix (Node.js 20/22); premerge gate covering audit + lint + docs + coverage + Jest
- **Smoke Tests**: Quick health checks for initialized projects and active changes
- **14 new test suites**: doctor, start, fix-packet, learn, roles, story, pipeline, user-test, validate, outside-in, baby-steps, elicitation, waiver-manager, file-walker (77 suites / 888 tests total)

### Changed
- **apply.js/verify.js**: Extracted `getConfigTestCommand()` to shared module (`test-command-resolver.js`)
- **graph-executor.js**: Restored noop fallback with `shouldFailOn` simulation support, aligned comments with actual fallback behavior
- **config.yaml**: Calibrated test framework defaults from `vitest` to `jest` (3 locations)
- **cli.js**: Removed duplicate base program configuration (`--version`, `--no-color`, help footer)
- **7 command files**: Replaced local `walk`/`walkFiles` with shared `file-walker.js` utility
- **CI/CD**: Added Node.js 18/20/22 matrix testing

### Fixed
- Graph executor self-healing now preserves `_healingMeta` during rollback
- Integration tests aligned with actual CLI error messages
- `new change` now creates valid tasks.md with sample tasks
- **Progress tracking**: `stdd progress` no longer records itself in progress log (read-only observability)
- **Progress tracking**: Non-zero `process.exitCode` now recorded as `fail` instead of `complete`
- **Progress tracking**: `stdd progress --clear` no longer leaves dangling `complete` entry
- **Progress tracking**: `--resume` hints narrowed to resumable workflow commands only (apply/verify/archive/continue)
- **Verify test**: Renamed stale test name `'lint failure is a warning, not fatal'` → `'lint failure makes verification fail'`
- **security.js**: Fixed `redactSensitiveInfo` regex — non-capturing group `(?:...)` caused `$1` to output as literal text

### Removed
- `stdd/graph/cache/*` and `stdd/progress.jsonl` removed from git tracking; added to `.gitignore`
- `error-handler.js`: Removed dead code (never imported by any production file)
- `ora` dependency: Removed unused package
- `apply.js` local `TASK_PATTERN`: Removed unused duplicate of `change-utils.js` pattern
- `cli.js` dead `recommendEngine` function after `program.parse()`

### Security
- Path traversal protection in change name validation
- Directory traversal prevention in file operations
- Command injection prevention via `spawnSync`
- No hardcoded credentials or secrets

## [0.9.0] - 2026-05-13

### Added
- Initial public release
- Basic CLI commands (init, new, apply, verify, archive)
- Skill definitions for 5-phase workflow
- Constitution system foundation
- Graph engine foundation

## Version History Legend

- `Added` - New features
- `Changed` - Changes to existing functionality
- `Deprecated` - Soon-to-be removed features
- `Removed` - Removed features
- `Fixed` - Bug fixes
- `Security` - Security improvements
