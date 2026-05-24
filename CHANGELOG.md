# CHANGELOG

All notable changes to STDD Copilot will be documented in this file.

## [1.0.7] - 2026-05-24

### Added
- Fixed and completed 4 zero-coverage batch test suites (batch1-4) — 88 tests covering all 23 previously 0%-coverage command modules (brainstorm, certainty, commit-tdd, complexity, design, execute, factory, final-doc, help, iterate, memory, mock, parallel, plan, propose, prp, spec, supervisor, vision, waiver-manager-command, constitution, clarify, confirm).
- Added 3 targeted coverage test suites for low-branch-coverage modules:
  - `cli-utils-coverage.test.js` (14 tests) — createSpinner + safeAction
  - `change-helpers-coverage.test.js` (22 tests) — generateChangeName, toSafeFilename, toTitleCase, workspaceContext, resolveWorkspaceContext
  - `api-spec-coverage.test.js` (78 tests) — 20+ standalone utility methods
- `round34-coverage.test.js` (8 tests) — commit-msg (94.89%, +7pp) and constitution-status (93.22%, +5pp) branch coverage boost.
- Test count: 4158 (+210), suites: 191 (+8).

### Fixed
- Fixed async `execute()` calls in batch test files using synchronous `try/finally` (missing `await` + `catch`) causing unhandled Promise rejections and process crashes.
- Fixed `cap()` being erroneously defined as `async () =>` in batch3, breaking `c.r()` calls.
- Fixed ConstitutionCommand constructor dependency failures in test environment with try/catch guards.

## [1.0.6] - 2026-05-24

### Changed
- Extracted `createSpinner`, `safeAction`, and `CONSTITUTION_ARTICLES` from cli.js into `src/cli/helpers/` modules, reducing the CLI entry point from 555 to ~515 lines.
- Audited all remaining `process.exit` calls in `src/` — confirmed all are legitimate (signal handlers and hook scripts).
- Updated `fix.md` optimization tracker to reflect Round 31-32 progress.

### Added
- Added 12 targeted coverage test suites (`status-coverage-boost`, `shell-executor-coverage`, `update-coverage-boost`, `tdd-init-coverage-boost`, `commit-msg-coverage-boost`, `coverage-parser-coverage-boost`, `ff-coverage-boost`, `explore-coverage-boost`, `doctor-coverage-boost`, `guard-coverage-boost`, `validate-coverage-boost`, `skills-coverage-boost`) with 103 new test cases.
- Test count grew from 3845 to 3948 (171 → 183 suites, 0 failures).
- Created `src/cli/helpers/` directory with `cli-utils.js`, `constitution-data.js`, and `command-factories.js` modules.

## [1.0.5] - 2026-05-23

### Added
- Added project-local BDD template override coverage for `stdd/templates/bdd-templates.yaml`.
- Added regression coverage for hotfix graph runs using generated and explicit change names.
- Added the missing `/stdd:commit` command template backed by the existing `stdd commit` CLI.

### Changed
- Externalized BDD generation templates to `stdd/templates/bdd-templates.yaml` with project-local override support.
- Clarified mutation quick mode as a heuristic score rather than real mutation testing.
- Updated package metadata and documentation for the v1.0.5 release.
- Updated slash command taxonomy from 75 to 76 command templates.

### Fixed
- Fixed `stdd graph run --intent hotfix` so the generated change name is passed through to `stdd issue`, `apply`, `verify`, and `archive` consistently.
- Removed the last production `execSync` usage in hooks Git initialization and replaced it with `spawnSync('git', ['init'])`.
- Unified hooks settings backups on `.backup` so install, disable, and enable use the same recovery file.
- Removed failed `product-proposal` section-splitting dead code that was not wired into production.
- Removed stale documentation references to the non-existent `src/utils/graph-executor.js`.

### Security
- Hardened hook installation by avoiding shell command execution for `git init`.

## [1.0.4-preview] - 2026-05-22

### Added
- **STDD Skills 全量审查完成**: 47 个 STDD skills 全部审查并标记 ✅ 完成
- **api-spec skill 增强**: 添加框架原生 hooks (React Query, SWR, Vue Query, Svelte Query)
- **apply skill 增强**: 添加 Snapshot 测试、并行执行、智能重试、参数化测试支持

### Changed
- **SKILL.md 文档质量**: 所有 47 个 skill 文档覆盖外部工具最佳实践
- **多语言支持**: 确认所有 skills 支持语言无关设计
- **文档计数**: skill_method.md 中所有 skills 标记完成状态

### Fixed
- 文档与实际实现保持一致

## [1.0.3] - 2026-05-21

### Added
- **12 个新 Command 模板**: vision.md, supervisor.md, prp.md, parallel.md, mock.md, memory.md, iterate.md, help.md, factory.md, design.md, complexity.md, certainty.md
- **12 个新 CLI 命令实现**: vision, supervisor, prp, parallel, mock, memory, iterate, help, factory, design, complexity, certainty
- **commit-tdd 命令**: 原子化 TDD 前缀 Git 提交信息生成

### Changed
- **Command 模板数量**: 63 → 75
- **斜杠命令总数**: 110 → 122 (75 Command + 47 Skill)
- **CLI 命令实现**: 66 → 67
- **全面文档更新**: CHANGELOG.md, README.md, README_EN.md, USAGE.md, docs/command-reference.md, docs/EvoRL.md, docs/PRODUCT-PROPOSAL.md, docs/STDD-VERIFICATION-TEST.md, ARCHITECTURE.md
- **测试契约更新**: test-support/docs-contracts.js, __tests__/docs-taxonomy-consistency.test.js

### Fixed
- 修复所有文档中的命令数量不一致问题
- 所有 122 个斜杠命令和 67 个 CLI 命令已完全覆盖

## [1.0.2] - 2026-05-20

### Added
- **2 个新 Command 模板**: `fix-packet.md`, `product-proposal.md`
- **9 个新命令实现**: `brainstorm.js`, `clarify.js`, `confirm.js`, `constitution.js`, `execute.js`, `final-doc.js`, `plan.js`, `propose.js`, `spec.js`
- **43 个辅助命令模板**: api-spec, audit, baby-steps, browser, ci-generator, commands, commit-msg, context, contract, depcheck, doctor, elicitation, extensions, fix-packet, graph-history, graph-run, guard, hooks, learn, list, memory-scan, metrics, mock-gen, mutation, outside-in, pipeline, product-proposal, progress, recommend, roles, schema, skills, spec-generator, start, starters, status, story, tdd-init, update, user-test, validate, waiver-manager, workspace

### Changed
- **Command 模板数量**: 63 → 75
- **斜杠命令总数**: 110 → 122 (75 Command + 47 Skill)
- **CLI 命令实现**: 66 → 67
- **文档同步更新**: CLAUDE.md, AGENTS.md, CLAUDE_CODE_GUIDE.md, README.md, USAGE.md, docs/commands.md, docs/EvoRL.md, docs/STDD-VERIFICATION-TEST.md
- **测试更新**: docs-taxonomy-consistency.test.js, test-support/docs-contracts.js

### Fixed
- 修复文档中命令数量不一致的问题
- 所有 122 个斜杠命令和 67 个 CLI 命令已完全覆盖
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
- **Graph Runtime Modules**: Dynamic router, graph cache, evidence capture, error propagator, heterogeneous adapter, parallel executor
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
- **Graph runtime docs**: Aligned graph runtime comments with actual fallback behavior
- **config.yaml**: Calibrated test framework defaults from `vitest` to `jest` (3 locations)
- **cli.js**: Removed duplicate base program configuration (`--version`, `--no-color`, help footer)
- **7 command files**: Replaced local `walk`/`walkFiles` with shared `file-walker.js` utility
- **CI/CD**: Added Node.js 18/20/22 matrix testing

### Fixed
- Graph runtime self-healing now preserves `_healingMeta` during rollback
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
