# CHANGELOG

All notable changes to STDD Copilot will be documented in this file.

## [1.0.2] - 2026-05-20

### Added
- **2 个新 Command 模板**: `fix-packet.md`, `product-proposal.md`
- **9 个新命令实现**: `brainstorm.js`, `clarify.js`, `confirm.js`, `constitution.js`, `execute.js`, `final-doc.js`, `plan.js`, `propose.js`, `spec.js`
- **43 个辅助命令模板**: api-spec, audit, baby-steps, browser, ci-generator, commands, commit-msg, context, contract, depcheck, doctor, elicitation, extensions, fix-packet, graph-history, graph-run, guard, hooks, learn, list, memory-scan, metrics, mock-gen, mutation, outside-in, pipeline, product-proposal, progress, recommend, roles, schema, skills, spec-generator, start, starters, status, story, tdd-init, update, user-test, validate, waiver-manager, workspace

### Changed
- **Command 模板数量**: 61 → 63
- **斜杠命令总数**: 108 → 110 (63 Command + 47 Skill)
- **CLI 命令实现**: 66 → 67
- **文档同步更新**: CLAUDE.md, AGENTS.md, CLAUDE_CODE_GUIDE.md, README.md, USAGE.md, docs/commands.md, docs/EvoRL.md, docs/STDD-VERIFICATION-TEST.md
- **测试更新**: docs-taxonomy-consistency.test.js, test-support/docs-contracts.js

### Fixed
- 修复文档中命令数量不一致的问题
- 所有 110 个斜杠命令和 67 个 CLI 命令已完全覆盖

## [1.0.1] - 2026-05-19

### Added
- **28 轮质量优化**: 测试套件从 77 增至 171，测试用例从 888 增至 3810（100% 通过）
- **覆盖率大幅提升**: Stmts 72% → 97.33%, Branch 72% → 91.03%, Funcs → 97.15%, Lines → 97.87%
- **171 个测试套件**: 覆盖全部 66 个命令文件和 21 个工具模块
- **新增 round 测试文件**: round24-round28 针对性覆盖低覆盖模块的边界分支
- **结构化 logger 迁移**: 92 处 console.error → logger 迁移，新增 `src/utils/logger.js`
- **process.exit 修复**: 14 处 process.exit → exitCode 改造，提升测试友好性
- **空 catch 块修复**: 52 处空 catch 块添加合理处理或注释
- **var → const/let**: 9 处遗留 var 声明全部清理
- **未使用导出清理**: 13 处未使用的导出项清理
- **Jest 覆盖率阈值**: 7 个核心模块配置覆盖率阈值

### Changed
- **CHANGELOG.md**: 补充 v1.0.1 版本完整变更记录
- **CONTRIBUTING.md**: 更新测试基线至 171 套件 / 3810 测试
- **CLAUDE_CODE_GUIDE.md**: 更新测试基线信息
- **README.md / README_EN.md**: 更新项目结构中的测试套件数量
- **ARCHITECTURE.md**: 核对命令数量和工具模块数量
- **AGENTS.md**: 更新版本至 2.3

### Fixed
- 52 个空 catch 块添加合理处理（JSON.parse fallback、signal handling 等）
- 6 处 TODO 注释替换为数据驱动实现
- 覆盖率报告从 `coverage-summary.json` 精确解析

## [1.0.0] - 2026-05-14

### Added
- **Skill Graph Engine**: Dynamic DAG orchestration with intent-adaptive topology (hotfix/feature/repair/research)
- **66 CLI Commands**: Full workflow automation (init, new, apply, verify, archive, mutation, start, doctor, etc.)
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
