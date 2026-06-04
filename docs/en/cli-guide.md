# STDD Copilot Ultra v2.0.0 CLI Guide

> Spec + Test Driven Development Framework — Complete Command Line Reference

## Table of Contents

- [Global Options](#global-options)
- [Environment Variables](#environment-variables)
- [Configuration File Reference](#configuration-file-reference)
- [1. Core STDD Workflow](#1-core-stdd-workflow)
- [2. TDD Enhancement](#2-tdd-enhancement)
- [3. Spec & Validation](#3-spec--validation)
- [4. Quality Governance](#4-quality-governance)
- [5. UI Generation](#5-ui-generation)
- [6. Generation & Preview](#6-generation--preview)
- [7. Graph Engine](#7-graph-engine)
- [8. Collaboration & Docs](#8-collaboration--docs)
- [9. Advanced AI Agent](#9-advanced-ai-agent)
- [10. Utilities](#10-utilities)
- [11. Evaluation](#11-evaluation)
- [Workflow Cheat Sheet](#workflow-cheat-sheet)

---

## Global Options

The following options apply to most `stdd` commands:

| Flag | Description |
|------|-------------|
| `--json` | Output results as JSON for scripting integration |
| `--force` | Force execution, overwrite existing files or skip confirmation gates |
| `--dry-run` | Preview mode — show what would be done without modifying files |
| `--no-color` | Disable colored output |
| `--workspace <name>` | Specify a monorepo workspace name |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PROJECT_TYPE` | `node` | Project type: `web` / `cli` / `api` / `lib` |
| `LANGUAGE` | `typescript` | Language: `typescript` / `javascript` / `python` / `go` / `rust` |
| `FRAMEWORK` | `react` | Frontend framework: `react` / `vue` / `nextjs` / `express` / `fastapi` |
| `BACKEND` | `express` | Backend framework: `express` / `fastapi` / `gin` / `actix` / `none` |
| `TEST_FRAMEWORK` | `jest` | Test framework: `jest` / `vitest` / `pytest` / `go test` / `cargo test` |
| `PKG_MANAGER` | `npm` | Package manager: `npm` / `yarn` / `pnpm` |
| `DESIGN_PRESET` | `modern` | Design preset (frontend only): `modern` / `dark` / `minimal` |
| `DATABASE` | `postgresql` | Database: `postgresql` / `mysql` / `sqlite` / `mongodb` / `none` |
| `VECTOR_DB` | `none` | Vector database: `none` / `pinecone` / `weaviate` / `qdrant` |
| `EMBEDDING_MODEL` | `none` | Embedding model identifier |
| `CLAUDE_MODEL` | `claude-sonnet-4-6` | Claude model version |

---

## Configuration File Reference

The config file is located at `stdd/config.yaml` and is generated automatically during `stdd init`. Key sections:

```yaml
version: "1.0"
name: "STDD Copilot"

project:          # Tech stack (set during init)
  type: node
  language: typescript
  framework: react
  test_framework: jest

graph:            # DAG engine configuration
  max_parallel: 4
  timeout: 3600000
  retry_count: 3
  on_failure: "rollback"

changes:          # Change management
  dir: "stdd/changes"
  archive_dir: "stdd/changes/archive"
  auto_archive_after_days: 30

specs:            # Spec management
  dir: "stdd/specs"
  format: "gherkin"

tdd:              # TDD & Ralph Loop configuration
  ralph_loop:
    max_iterations: 10
    failure_threshold: 3
    auto_rollback: true
  hitl:
    mode: "end-of-cycle"       # every-phase / end-of-cycle / off
  mutation:
    enabled: true
    mode: "auto"               # auto / quick / deep
    threshold: 80

defense:          # 5-layer drift prevention
  confirm_gate: { enabled: true }
  micro_task: { max_tasks: 6, min_granularity: "30min" }
  failure_rollback: { threshold: 3 }
  static_quality: { enabled: true }
  mutation_review: { enabled: true }

ai_engines:       # AI engine registry
  claude_code: { enabled: true }
```

---

## 1. Core STDD Workflow

The core workflow covers the full lifecycle from project initialization to change archiving.

### `stdd init`

Initialize the STDD project directory structure. Creates the `stdd/` directory (with `specs/`, `changes/`, `memory/`, `graph/`, `config.yaml`) and `.claude/commands/`, `.claude/skills/`.

```bash
stdd init                          # Initialize in current directory
stdd init /path/to/project         # Specify project path
stdd init --force                  # Force re-initialize (overwrite existing)
stdd init -y                       # Non-interactive mode
stdd init --skip-skills            # Skip skill template copying
```

### `stdd new`

Create a new change proposal. Generates `proposal.md` and `.status.yaml`, guiding requirements gathering and clarification.

```bash
stdd new change add-dark-mode      # Create change named add-dark-mode
stdd new change user-auth --force  # Force create (overwrite existing)
stdd new change my-feature --title "Custom Title"  # Set display title
```

### `stdd ff`

Fast-Forward quick generation: produces all four core artifacts (proposal / specs / design / tasks) in one step.

```bash
stdd ff "Add dark theme support"           # Generate all artifacts
stdd ff "Implement user auth" --dry-run    # Preview without writing files
stdd ff "Add search" --change-name search  # Specify change name
stdd ff "Add logging" --workspace backend  # Target a workspace
```

### `stdd issue`

Bug TDD fix entry: classifies the defect, writes a failing test first (RED), then minimal fix (GREEN), verifies no regression.

```bash
stdd issue "Login page white screen crash"       # Start TDD fix from bug description
stdd issue "Paginated query returns duplicates" --dry-run
stdd issue "Data loss on save" --severity critical
stdd issue "Slow API response" --title "API latency regression"
```

### `stdd turbo`

One-Shot execution of all pre-implementation phases (propose → clarify → confirm → spec → plan), pausing at the confirmation gate.

```bash
stdd turbo "User registration feature"           # Auto-complete all pre-implementation phases
stdd turbo "Payment integration" --dry-run        # Preview mode
stdd turbo "Search feature" --change-name search  # Specify change name
stdd turbo "API v2" --no-spec                     # Skip spec generation
```

### `stdd apply`

Execute the Ralph Loop TDD cycle: RED → CHECK → GREEN → MUTATION → REFACTOR.

```bash
stdd apply                          # Auto-detect active change and execute
stdd apply add-dark-mode            # Execute specific change
stdd apply --task 1                 # Execute specific task number
stdd apply --fix                    # Fix mode
stdd apply --phase green            # Resume from specific phase
stdd apply --allow-no-tests         # Allow execution without tests (special cases)
stdd apply --delegate               # Write delegation evidence on failure
stdd apply --e2e-command "npm run e2e"  # Specify E2E test command
stdd apply --workspace backend      # Target a workspace
```

### `stdd verify`

5-dimension verification: API signatures / BDD coverage / types / boundary exceptions / documentation consistency + Constitution compliance + evidence recording.

```bash
stdd verify                         # Verify current active change
stdd verify add-dark-mode           # Verify specific change
stdd verify --json                  # JSON output
stdd verify --no-constitution       # Skip constitution checks
stdd verify --lint                  # Run linter as part of verification
stdd verify --lint-command "eslint ."  # Custom lint command
stdd verify --test-command "npm test"  # Custom test command
```

### `stdd archive`

Finalize change: merge Delta Spec into main spec, move to archive directory, generate `spec-merge-report.json`.

```bash
stdd archive                        # Archive current active change
stdd archive add-dark-mode          # Archive specific change
stdd archive --force                # Force archive (skip verification)
```

### `stdd list`

List all changes and specs.

```bash
stdd list                           # List all active changes
stdd ls                             # Alias
stdd list --specs                   # List all specs
stdd list --archived                # Include archived changes
stdd list --json                    # JSON output
stdd list --changes                 # Explicitly list changes (default)
```

### `stdd status`

View the current state of the change workflow state machine.

```bash
stdd status                         # View current active change status
stdd status add-dark-mode           # View specific change status
stdd status --json                  # JSON output
```

### `stdd recommend`

Intelligent next-step recommendation based on project state.

```bash
stdd recommend                      # Global recommendation
stdd recommend add-dark-mode        # Recommend for specific change
stdd recommend --json               # JSON output
```

---

## 2. TDD Enhancement

Test-driven development enhancement toolkit.

### `stdd outside-in`

Outside-in TDD: start from E2E tests, then integration tests, then unit tests.

```bash
stdd outside-in init                # Initialize outside-in TDD configuration
stdd outside-in scaffold add-dark-mode  # Generate layered test scaffold for change
stdd outside-in plan add-dark-mode  # Generate layer plan
stdd outside-in status              # View outside-in test status
stdd outside-in --feature auth      # Specify feature name
stdd outside-in --force             # Force overwrite
stdd outside-in --json              # JSON output
```

### `stdd fix-packet`

Generate a Golden Packet style diagnostic fix bundle — collects repair context from failed tasks.

```bash
stdd fix-packet add-dark-mode       # Generate fix packet for specific change
stdd fix-packet --test-command "npm test"  # Specify test command
stdd fix-packet --test-output "file.log"   # Use test output file
stdd fix-packet --task 3            # Target specific task
stdd fix-packet --json              # JSON output
```

### `stdd tdd-init`

Initialize test scaffolding for existing source files.

```bash
stdd tdd-init                       # Generate test skeletons for all source files
stdd tdd-init src/utils/auth.ts     # Generate test for specific file
stdd tdd-init --source-dir src/     # Specify source directory
stdd tdd-init --dry-run             # Preview mode
```

### `stdd baby-steps`

Interactive TDD baby-steps guide for incremental implementation of complex components.

```bash
stdd baby-steps                     # Guide the next step for the active change
stdd baby-steps "Implement payment validation logic"  # Specify task description
```

### `stdd mutation`

Mutation testing: Quick heuristic anti-fake-green detection + Stryker delegation for deep analysis.

```bash
stdd mutation                       # Run mutation tests on current change
stdd mutation add-dark-mode         # Run on specific change
stdd mutation --mode stryker        # Deep Stryker analysis mode
stdd mutation --mode quick          # Quick heuristic mode
stdd mutation --threshold 85        # Set score threshold (default: 80)
stdd mutation --json                # JSON output
```

### `stdd mock`

Auto-generate mock implementations for external dependencies.

```bash
stdd mock                           # Generate mocks for current change
stdd mock add-dark-mode             # Generate mocks for specific change
stdd mock --all                     # Scan all external deps and generate
stdd mock --fake                    # Generate runnable fake implementations
stdd mock --type module             # Mock type: module / function / api
stdd mock --methods "get,post"      # Specify methods to mock
stdd mock --json                    # JSON output
```

---

## 3. Spec & Validation

Spec-driven development (SDD) toolkit.

### `stdd spec`

Transform requirement proposals into BDD (Given/When/Then) Delta Specs with ADDED/MODIFIED/REMOVED markers.

```bash
stdd spec add-dark-mode             # Generate BDD specs for specific change
stdd spec --format yaml             # Output format: gherkin / yaml / markdown
stdd spec --merge                   # Merge with existing specs
stdd spec --json                    # JSON output
```

### `stdd api-spec`

Generate OpenAPI format API specifications + TypeScript type definitions.

```bash
stdd api-spec                       # Generate API spec for current change
stdd api-spec add-dark-mode         # Generate for specific change
stdd api-spec --format yaml         # Format: yaml (default) / json
stdd api-spec --json                # JSON output
```

### `stdd contract`

Generate and manage consumer-driven contract tests (5 message patterns).

```bash
stdd contract generate              # Generate contract tests
stdd contract verify                # Verify contract compliance
stdd contract list                  # List all contracts
stdd contract generate --consumer api-gateway  # Specify consumer
stdd contract verify --provider user-service   # Specify provider
stdd contract verify --json         # JSON output
```

### `stdd validate`

Validate spec consistency + Spec Guardian leak detection + RFC 2119 keyword checks.

```bash
stdd validate                       # Validate current change spec consistency
stdd validate add-dark-mode         # Validate specific change
stdd validate --fix                 # Auto-fix detected issues
stdd validate --spec-guardian       # Enable implementation leak detection
stdd validate --json                # JSON output
```

### `stdd schema`

Generate JSON Schema and Zod type validation. Supports create/fork custom artifact DAG workflows.

```bash
stdd schema validate                # Validate existing schemas
stdd schema validate src/models/    # Validate specific path
stdd schema create <name>           # Create new schema
stdd schema fork <source> <name>    # Fork and customize a schema
stdd schema --strict                # Strict validation mode
stdd schema --json                  # JSON output
```

---

## 4. Quality Governance

Project quality assurance and governance toolkit.

### `stdd guard`

TDD guard hook: enforce test-first (Blocking) + minimal implementation (Warning) + anti-bypass.

```bash
stdd guard on                       # Enable guard mode
stdd guard off                      # Disable guard mode
stdd guard status                   # View guard status
stdd guard --no-constitution        # Skip constitution checks
stdd guard --strict                 # Treat warnings as failures
```

### `stdd constitution`

Manage 9 development articles (3 Blocking + 4 Warning + 2 Suggestion), with waiver tracking and audit trends.

```bash
stdd constitution                   # Show overview of all articles
stdd constitution show              # Show all articles
stdd constitution show 2            # Show article 2 details
stdd constitution check             # Run compliance check
stdd constitution check --json      # JSON output
stdd constitution fix               # Auto-fix violations
stdd constitution fix --article 3   # Fix specific article
stdd constitution fix --dry-run     # Preview fixes
stdd constitution status            # View compliance status
stdd constitution audit             # Historical compliance audit
stdd constitution audit --json      # JSON output
stdd constitution waive <target> --reason "Justification"  # Waive an article
```

### `stdd hooks`

Manage the STDD Hook system (Pre/Post ToolUse). Multi-engine support (Claude Code / Cursor / Windsurf).

```bash
stdd hooks install                  # Install hooks
stdd hooks install --git            # Install + Git pre-commit hook
stdd hooks install -g               # Global install
stdd hooks verify                   # Verify hook configuration
stdd hooks status                   # View hook status
stdd hooks disable                  # Disable hooks
stdd hooks enable                   # Enable hooks
```

### `stdd audit`

Constitution article historical compliance audit.

```bash
stdd audit                          # Run compliance audit
stdd audit --json                   # JSON output
```

### `stdd depcheck`

Check for unused or outdated dependencies.

```bash
stdd depcheck                       # Check current project dependencies
stdd depcheck src/                  # Check dependency references in specific directory
stdd depcheck --safe-list "react,vue"  # Exclude packages from check
stdd depcheck --json                # JSON output
```

### `stdd doctor`

Project health diagnostics: 10 checks (STDD directories / config / Node version / Git hooks / test framework etc.).

```bash
stdd doctor                         # Standard health check
stdd doctor --deep                  # Deep check (includes audit and lint availability)
stdd doctor --json                  # JSON output
```

### `stdd metrics`

Quality metrics dashboard: test coverage, mutation score, code complexity, TDD compliance rate.

```bash
stdd metrics                        # Show quality metrics for current change
stdd metrics add-dark-mode          # Show metrics for specific change
stdd metrics --export               # Export metrics report
stdd metrics --json                 # JSON output
```

---

## 5. UI Generation

Multi-framework UI page/component generation engine. Supports React, Vue, Angular, and Svelte.

### Command Syntax

```bash
stdd ui <action> [type] [name] [options]
```

### Available Actions

| Action | Description |
|--------|-------------|
| `page` | Generate page components |
| `component` | Generate UI components |
| `scaffold` | Generate full application scaffold |
| `preview` | Launch component preview gallery |
| `test` | Generate component tests |
| `diff` | Compare UI change diffs |
| `list` | List available templates |

### Supported Frameworks (`--framework`)

| Framework | Value | File Format |
|-----------|-------|-------------|
| React / Next.js | `react` | `.jsx` + `.css` |
| Vue / Nuxt.js | `vue` | `.vue` single file components |
| Angular | `angular` | `.component.ts` + `.html` + `.css` |
| Svelte | `svelte` | `.svelte` |

### Component Types

| Type | Description |
|------|-------------|
| `button` | Button (primary / secondary / danger / disabled variants) |
| `card` | Card (content / product / user card) |
| `form` | Form (with validation logic) |
| `input` | Input (text / password / search / number) |
| `modal` | Modal dialog (with focus trap) |
| `nav` | Navigation bar (responsive + mobile hamburger) |
| `table` | Data table (sort / filter / pagination) |
| `list` | List (virtual scroll support) |

### Page Types

| Type | Description |
|------|-------------|
| `landing` | Landing page (Hero + Features + CTA) |
| `dashboard` | Dashboard (sidebar + data cards + chart area) |
| `auth` | Auth page (login / register / forgot variants, `--authVariant`) |
| `settings` | Settings page (Profile / Security / Notifications sections) |
| `pricing` | Pricing page (Plan comparison + FAQ) |

### UI States (`--state`)

| State | Description |
|-------|-------------|
| `loading` | Loading skeleton / spinner |
| `empty` | Empty state placeholder |
| `error` | Error message with retry |
| `permission` | Insufficient permissions notice |
| `offline` | Offline status notice |
| `success` | Success feedback |

### Style Solutions (`--style`)

| Solution | Value |
|----------|-------|
| Native CSS | `css` |
| SCSS | `scss` |
| Tailwind CSS | `tailwind` |
| CSS Modules | `css-modules` |

### Accessibility (a11y)

All generated components include:

- Complete `aria-*` attributes (`aria-label`, `aria-describedby`, `aria-live`, etc.)
- Semantic ARIA roles (`role="dialog"`, `role="navigation"`, etc.)
- Focus trapping (Modal auto-capture / release focus)
- Keyboard navigation (Tab / Shift+Tab / Escape)
- Screen-reader only utility class (`.sr-only`)

### Responsive Design

- Mobile-first design
- Tailwind breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px)
- CSS custom property breakpoint system
- Flexible grid layouts (`grid-template-columns: repeat(auto-fill, ...)`)

### Usage Examples

```bash
# Generate components
stdd ui component Button --framework react                      # React button
stdd ui component Form --framework vue --style scss             # Vue form (SCSS)
stdd ui component Modal --framework angular --state loading     # Angular modal with loading state
stdd ui component Table --framework svelte --state empty --state error  # Multiple states

# Generate pages
stdd ui page home --framework react --style tailwind --type landing       # React landing page
stdd ui page dashboard --framework vue --type dashboard                   # Vue dashboard
stdd ui page login --framework angular --type auth --authVariant login    # Angular auth page
stdd ui page pricing --framework svelte --type pricing                    # Svelte pricing page

# Scaffold, preview, test
stdd ui scaffold --framework react --style tailwind              # Full React + Tailwind scaffold
stdd ui preview                                                  # Generate preview gallery (opens browser)
stdd ui test Button --framework react                            # Generate test scaffold
stdd ui diff Button                                              # Compare UI change diffs
stdd ui list                                                     # List all available templates
stdd ui list --framework vue                                     # List Vue templates only
```

---

## 6. Generation & Preview

Project artifact generation and preview toolkit.

### `stdd builder`

Custom Agent, workflow, and Skill builder.

```bash
stdd builder agent <name>           # Build a custom Agent
stdd builder agent <name> --expertise frontend  # With expertise
stdd builder workflow <name>        # Build a custom workflow
stdd builder workflow <name> --intent feature   # With intent
stdd builder skill <name>           # Build a custom Skill
stdd builder skill <name> --category testing    # With category
stdd builder list                   # List built artifacts
stdd builder validate <name>        # Validate a built artifact
stdd builder test <name>            # Test a built artifact
stdd builder share <name>           # Share a built artifact
stdd builder export <name>          # Export a built artifact
```

### `stdd dashboard`

Project health dashboard (static HTML).

```bash
stdd dashboard generate             # Generate dashboard HTML
stdd dashboard open                 # Generate and open in browser
stdd dashboard serve                # Start local server to preview
```

### `stdd docs`

Documentation site generation (Astro + Starlight style).

```bash
stdd docs generate                  # Generate documentation site
stdd docs generate --lang en        # Generate English docs site
stdd docs serve                     # Start local server for preview
stdd docs sources                   # List source files
stdd docs deploy --target github-pages  # Deploy to GitHub Pages
```

### `stdd modules`

Module marketplace management.

```bash
stdd modules                        # Show featured / official modules
stdd modules featured               # Show featured modules
stdd modules search <keyword>       # Search modules
stdd modules search tdd --category workflow  # Search by category
stdd modules install <name>         # Install a module
stdd modules info <name>            # View module details
stdd modules list                   # List installed modules
stdd modules publish <path>         # Publish a module
stdd modules categories             # List all categories
```

### `stdd profile`

Planning profile management with adaptive planning depth. Profiles: `quick` (1), `standard` (2), `thorough` (3), `enterprise` (4).

```bash
stdd profile                        # Auto-detect current profile
stdd profile detect                 # Detect planning depth
stdd profile create                 # Create new profile
stdd profile select <name>          # Select a profile
stdd profile show                   # Show current profile details
stdd profile list                   # List all profiles
stdd profile edit                   # Edit current profile
stdd profile --change <type>        # Analyze for change type
stdd profile --force                # Force overwrite
stdd profile --json                 # JSON output
```

---

## 7. Graph Engine

DAG skill orchestration engine with dynamic topology pruning and intent-based routing.

### Command Syntax

```bash
stdd graph <subcommand> [options]
```

### Intent Modes

| Intent | Workflow Path |
|--------|---------------|
| `feature` | propose → spec → plan → outside-in → apply → verify |
| `hotfix` | issue → apply → verify → archive |
| `repair` | fix-packet → apply → verify |
| `research` | explore → brainstorm → final-doc |
| `brownfield` | explore → init → propose → ... → archive |

### `stdd graph visualize`

Output the compiled graph in multiple formats.

```bash
stdd graph visualize                # Default Mermaid format
stdd graph visualize --format json  # JSON format
stdd graph visualize --format html  # Interactive HTML (opens browser)
stdd graph visualize --intent feature   # Visualize specific intent
stdd graph visualize --output graph.md  # Write to file
```

### `stdd graph analyze`

Print graph node count, edges, entry points, terminals, and layer summary.

```bash
stdd graph analyze                  # Output graph analysis summary
stdd graph analyze --bottlenecks    # Include bottleneck analysis
stdd graph analyze --intent hotfix  # Analyze specific intent
```

### `stdd graph run`

Execute the full workflow via intent-based DAG with dynamic topology routing.

```bash
stdd graph run --intent feature     # Feature development workflow
stdd graph run --intent hotfix      # Hotfix workflow
stdd graph run --intent research    # Research/exploration workflow
stdd graph run --intent repair      # Repair workflow
stdd graph run --change-name auth   # Specify change name
stdd graph run --skip-apply         # Skip apply phase
```

### `stdd graph parallel`

Check graph parallelization opportunities and parallelizable layers.

```bash
stdd graph parallel --detect        # Detect parallelization opportunities
stdd graph parallel --execute       # Execute parallelization
stdd graph parallel --max-workers 4 # Limit max parallel workers
stdd graph parallel --intent feature  # Analyze specific intent
```

### `stdd graph history`

View execution history (from evidence files).

```bash
stdd graph history                  # View all execution history
stdd graph history --failures       # Show only failed executions
stdd graph history --json           # JSON output
stdd graph history --change <name>  # Filter by change name
```

### `stdd graph replay`

View details or re-execute past runs.

```bash
stdd graph replay <id>              # View details of specific run
stdd graph replay <id> --verbose    # Verbose mode
stdd graph replay <id> --json       # JSON output
```

### `stdd graph recommend`

Recommend the next Skill and reason based on project state.

```bash
stdd graph recommend                # Get recommendation
stdd graph recommend --json         # JSON output
```

---

## 8. Collaboration & Docs

Team collaboration and documentation generation toolkit.

### `stdd commit`

Atomic Git commits: `red:` / `green:` / `refactor:` prefixes (Conventional Commits + TDD).

```bash
stdd commit                         # Generate atomic commit for current change
stdd commit add-dark-mode           # Generate commit for specific change
stdd commit --tdd                   # TDD mode (auto-detect phase prefix)
stdd commit --phase green           # Specify phase prefix
stdd commit --issue 42              # Associate Issue number
stdd commit --require-issue         # Require issue number
```

### `stdd commit-tdd`

TDD-specific commit with automatic `red`/`green`/`refactor` prefixes and test context.

```bash
stdd commit-tdd                     # TDD-mode commit for current change
stdd commit-tdd --phase red         # Mark as RED phase
stdd commit-tdd --phase green       # Mark as GREEN phase
stdd commit-tdd --phase refactor    # Mark as REFACTOR phase
```

### `stdd final-doc`

Aggregate all phase artifacts into a `FINAL_REQUIREMENT.md` comprehensive document.

```bash
stdd final-doc                      # Generate comprehensive doc for current change
stdd final-doc --output my-report.md  # Custom output filename
stdd final-doc --include-evidence   # Include execution evidence
stdd final-doc --json               # JSON output
```

### `stdd design`

Transform specs into technical design documents with Context/Decision/Rationale/Consequences ADR format.

```bash
stdd design                         # Generate design document
stdd design create                  # Create new design document
stdd design create --preset modern  # Use design preset (modern / dark / minimal)
stdd design create --no-preview     # Skip preview HTML generation
stdd design --json                  # JSON output
stdd design --force                 # Force overwrite
```

### `stdd prp`

What/Why/How/Success structured planning framework for stakeholder alignment.

```bash
stdd prp                            # Create PRP plan
stdd prp create "User authentication system"  # Create with title
stdd prp create --what "Implement JWT" --why "Security requirement" --how "OAuth2"  # Specify sections
stdd prp --json                     # JSON output
stdd prp --force                    # Force overwrite
```

### `stdd product-proposal`

Scan all `stdd/` artifacts and generate a 15-chapter product proposal report (`PRODUCT-PROPOSAL.md`) with coverage, quality metrics, and roadmap.

```bash
stdd product-proposal               # Generate product proposal report
stdd product-proposal --json        # JSON output
stdd product-proposal --output my-report.md  # Custom output filename
```

### `stdd context`

Three-layer document context management (Foundation ~500t + Component ~1000t + Feature ~2000t).

```bash
stdd context                        # Display current context
stdd context foundation             # Manage Foundation layer context
stdd context component              # Manage Component layer context
stdd context feature                # Manage Feature layer context
stdd context --export               # Export context
stdd context --json                 # JSON output
```

### `stdd user-test`

Generate human-readable acceptance test scripts from BDD specs (non-technical users can execute) + AI agent automation scripts.

```bash
stdd user-test                      # Generate acceptance tests for current change
stdd user-test add-dark-mode        # Generate for specific change
stdd user-test --human-only         # Generate human tests only
stdd user-test --agent-only         # Generate agent tests only
stdd user-test --framework react    # Target framework
stdd user-test --json               # JSON output
```

---

## 9. Advanced AI Agent

Multi-agent collaboration and intelligent enhancement toolkit.

### `stdd roles`

12 specialized Agent roles (4 base + 8 specialized), Party Mode debate + adversarial security review.

| Role | Focus Area |
|------|------------|
| PM | Product management, priorities |
| Architect | System design, technical decisions |
| UX | User experience, accessibility |
| QA | Quality assurance, test strategy |
| Security | Security audit, vulnerability detection |
| DevOps | CI/CD, infrastructure |
| DBA | Database design, query optimization |
| Performance | Performance analysis, optimization |
| Accessibility | WCAG compliance, a11y review |
| Documentation | Documentation quality, clarity |
| Compliance | Regulatory compliance, standards |
| Observer | Neutral analysis, pattern recognition |

```bash
stdd roles                          # List all available roles
stdd roles list                     # List role details
stdd roles start <topic>            # Start Party Mode discussion
stdd roles start <topic> --rounds 5 # Specify discussion rounds
stdd roles start <topic> --role architect  # Specify role to speak
stdd roles --roles pm,qa,security   # Select specific roles
stdd roles --json                   # JSON output
```

### `stdd runtime`

AI runtime engine interaction.

```bash
stdd runtime agent start <topic>    # Start multi-Agent simulation (Party Mode)
stdd runtime agent start <topic> --rounds 5  # Specify rounds
stdd runtime agent next             # Advance to next speaking round
stdd runtime agent record "<name>|<msg>"     # Record Agent speech
stdd runtime agent stop             # Force stop simulation
stdd runtime agent run <goal>       # Run Agent with executor
stdd runtime agent run <goal> --executor shell --command "npm test"  # Shell executor
stdd runtime agent run <goal> --role developer  # Specify role
stdd runtime sudo <file>            # Parse SudoLang pseudocode
stdd runtime sudo <file> --generate # Parse and generate STDD artifacts
```

### `stdd memory`

Vector database memory system: semantic search and persistent memory storage.

```bash
stdd memory save                    # Save memory
stdd memory search <query>          # Semantic search memories
stdd memory stats                   # Memory statistics
stdd memory list                    # List all memories
stdd memory scan                    # Scan project sources into memory
stdd memory --source-dir src/       # Specify source directory
stdd memory --json                  # JSON output
```

### `stdd memory-scan`

Scan project source code into memory artifacts.

```bash
stdd memory-scan                    # Scan and index project sources
stdd memory-scan scan               # Explicit scan
stdd memory-scan list               # List scanned memories
stdd memory-scan --source-dir src/  # Specify source directory
stdd memory-scan --json             # JSON output
```

### `stdd parallel`

DAG parallel execution engine: identify and execute independent tasks concurrently, aggregate results.

```bash
stdd parallel                       # View parallel status
stdd parallel status                # View status
stdd parallel run <intent>          # Execute by intent in parallel
stdd parallel run feature -p 4      # Limit max parallelism
stdd parallel run feature --strategy all    # Strategy: complete all
stdd parallel run feature --strategy race   # Strategy: first to complete
stdd parallel run feature --dry-run # Preview mode
stdd parallel --json                # JSON output
```

### `stdd supervisor`

Multi-Agent coordinator (Supervisor pattern), parallel cross-domain work.

```bash
stdd supervisor                     # View Supervisor status
stdd supervisor status              # View status
stdd supervisor start               # Start Supervisor
stdd supervisor start --roles "architect,qa,security"  # Specify roles
stdd supervisor start --rounds 3    # Specify discussion rounds
stdd supervisor stop                # Stop Supervisor
stdd supervisor --json              # JSON output
```

### `stdd iterate`

Plan-Execute-Reflect autonomous iteration loop for progressive quality improvement.

```bash
stdd iterate                        # View iteration status
stdd iterate status                 # View current iteration status
stdd iterate start --plan "Implement user auth"  # Start iteration with plan
stdd iterate start --max 5          # Limit max iteration rounds
stdd iterate reflect --reflection "Insufficient performance"  # Add reflection
stdd iterate next --next "Optimize queries"  # Set next step
stdd iterate --json                 # JSON output
```

---

## 10. Utilities

Project management and development utility toolkit.

### `stdd progress`

Real-time progress tracking: JSONL persistent log, start/complete/fail/interrupt state recording, breakpoint resume.

```bash
stdd progress                       # Show progress log
stdd progress --summary             # Show progress summary
stdd progress --resume              # Resume from breakpoint
stdd progress --json                # JSON output
stdd progress --clear               # Clear progress log
```

### `stdd start`

Interactive quick-start wizard (TTY) / help text (non-TTY).

```bash
stdd start                          # Launch interactive wizard
stdd start --json                   # JSON output
```

### `stdd workspace`

Monorepo workspace registry management.

```bash
stdd workspace list                 # List all workspaces
stdd workspace validate             # Validate workspace configuration
stdd workspace repair               # Repair workspace configuration
stdd workspace list --json          # JSON output
stdd workspace repair --dry-run     # Preview repairs
```

### `stdd extensions`

STDD extension management: list / install / validate extensions.

```bash
stdd extensions list                # List installed extensions
stdd extensions install <name>      # Install an extension
stdd extensions validate            # Validate all extensions
stdd extensions package             # Package an extension
```

### `stdd starters`

Project starter template management (TS / JS / Python / Go / Rust).

```bash
stdd starters list                  # List all available starter templates
stdd starters create <template>     # Create project from template
```

### `stdd ci`

Generate CI configuration files.

```bash
stdd ci                             # Generate default CI config
stdd ci github                      # Generate GitHub Actions config
stdd ci --force                     # Overwrite existing config
```

### `stdd browser`

Built-in browser driver (Playwright): snapshot / inspect / health diagnostics.

```bash
stdd browser snapshot               # Capture page snapshot
stdd browser inspect                # Inspect page elements
stdd browser doctor                 # Browser driver health check
stdd browser snapshot --width 1920 --height 1080  # Custom viewport
stdd browser compare                # Visual comparison
stdd browser update-baseline        # Update visual baseline
```

### `stdd story`

Story Mapping: create user story maps and convert to BDD feature files.

```bash
stdd story create                   # Create new user story map
stdd story create --persona "admin" --goal "manage users"  # Specify persona and goal
stdd story list                     # List story maps
stdd story export                   # Export as BDD feature files
stdd story convert                  # Convert stories to BDD scenarios
```

### `stdd pipeline`

Generate parser IR and acceptance test scaffolding from specs.

```bash
stdd pipeline                       # Generate pipeline for current change
stdd pipeline add-dark-mode         # Generate for specific change
```

### `stdd learn`

Adaptive learning: Pattern Teaching scans project for local conventions.

```bash
stdd learn scan                     # Scan project patterns
stdd learn good <pattern>           # Mark as good pattern
stdd learn bad <pattern>            # Mark as bad pattern
stdd learn suggest                  # Suggest based on learned patterns
stdd learn status                   # View learning status
stdd learn record                   # Record a pattern
stdd learn feedback                 # Provide feedback on patterns
stdd learn reset                    # Reset learned patterns
```

### `stdd help`

Context-aware help system that recommends next commands based on current project state.

```bash
stdd help                           # Show context-aware help
stdd help <topic>                   # Show help for specific topic
stdd help --json                    # JSON output
```

### `stdd skills`

List all available STDD Skill templates.

```bash
stdd skills                         # List all Skill templates
stdd skills --json                  # JSON output
```

### `stdd commands`

List all available Claude Code / AI assistant slash command templates.

```bash
stdd commands                       # List all command templates
stdd commands --json                # JSON output
```

### `stdd explore`

Read-only exploration mode: analyze existing code architecture, patterns, and constraints, writing results to `stdd/explorations/`.

```bash
stdd explore                        # Explore current project architecture
stdd explore src/                   # Explore specific directory
stdd explore --deep                 # Deep exploration (includes dependency analysis)
stdd explore --output report.md     # Write to file
stdd explore --json                 # JSON output
```

---

## 11. Evaluation

Project evaluation and decision support toolkit.

### `stdd complexity`

Code complexity assessment (APP Mass cyclomatic complexity / cognitive complexity analysis) + Top-10 hotspots + refactoring suggestions.

```bash
stdd complexity                     # Analyze current project complexity
stdd complexity analyze             # Run complexity analysis
stdd complexity analyze src/        # Analyze specific directory
stdd complexity --limit 10          # Limit hotspot count
stdd complexity --json              # JSON output
```

### `stdd certainty`

5-dimension confidence scoring (requirement clarity / technical feasibility / risk / test coverage / vision alignment). Pauses below threshold.

```bash
stdd certainty                      # Assess current confidence
stdd certainty assess               # Run 5-dimension assessment
stdd certainty --scores "req:4,tech:5,risk:3,test:4,vision:5"  # Preset scores
stdd certainty --set "confirm:0.7,warning:0.85,auto:0.95"  # Configure thresholds
stdd certainty --json               # JSON output
```

### `stdd vision`

Create and maintain project vision documents (long-term goals, architecture north star, strategic direction).

```bash
stdd vision                         # Display current vision
stdd vision show                    # Show vision document
stdd vision create                  # Create vision document
stdd vision update                  # Update vision document
stdd vision --force                 # Force overwrite
stdd vision --json                  # JSON output
```

---

## Workflow Cheat Sheet

### Clear-Requirement Fast Development

```bash
stdd init → stdd ff "requirement description" → stdd apply → stdd verify → stdd archive
```

### Unclear-Requirement Incremental Development

```bash
stdd init → stdd new change <name> → stdd spec <name> → stdd apply <name> → stdd verify <name> → stdd archive <name>
```

### Bug TDD Fix

```bash
stdd issue "Bug description" → stdd verify → stdd archive
```

### One-Shot Full Pipeline

```bash
stdd turbo "requirement description" → stdd commit
```

### Breakpoint Resume

```bash
stdd progress --resume → stdd recommend
```

### Outside-In TDD

```bash
stdd outside-in init → stdd outside-in scaffold <name> → stdd apply → stdd verify
```

### Graph Workflow Orchestration

```bash
stdd graph analyze → stdd graph run --intent feature → stdd graph history → stdd graph recommend
```

### API-First Development (SDD)

```bash
stdd ff "RESTful user management API" → stdd api-spec → stdd schema create user-model → stdd contract generate → stdd validate --spec-guardian → stdd apply → stdd verify → stdd archive
```

### UI Generation Workflow

```bash
stdd design create → stdd ui scaffold --framework react --style tailwind → stdd ui page dashboard → stdd ui preview → stdd ui test dashboard
```

### Quality Governance Audit

```bash
stdd hooks install --git → stdd guard → stdd constitution check → stdd depcheck → stdd doctor --deep → stdd mutation --mode quick → stdd metrics
```

### Multi-Agent Exploration

```bash
stdd complexity analyze → stdd certainty assess → stdd roles start "Architecture review" --roles pm,architect,qa → stdd vision create
```

---

> **Related Docs**: [Getting Started](getting-started.md) | [English Docs Index](README.md) | [Project README](../../README_EN.md) | [Command Reference (中文)](../command-reference.md) | [Concepts (中文)](../concepts.md) | [Workflows (中文)](../workflows.md)

<!--
stdd init
stdd init /path/to/project
stdd init --force
stdd list
stdd list --specs
stdd list --archived
stdd list --json
stdd status
stdd status add-dark-mode
stdd new change add-dark-mode
stdd skills
stdd commands
stdd constitution
stdd constitution show 2
stdd constitution check
stdd hooks install
stdd hooks verify
stdd hooks status
stdd hooks disable
stdd hooks enable

## Documentation
[English Docs Index](README.md) — English documentation hub
[Getting Started](getting-started.md) — First-run workflow and quick CLI reference
[Project README](../../README_EN.md) — Project overview and top-level examples
-->
