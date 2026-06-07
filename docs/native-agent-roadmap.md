# Native STDD Agent Roadmap

This document defines the incremental path for turning STDD Copilot Ultra from an external AI workflow framework into a native code-agent CLI.

## Current Position

STDD already owns workflow, governance, evidence, verification, and project artifacts. External AI tools still own open-ended code generation and file editing.

The new native agent kernel adds a stable boundary for that future work without changing existing workflows:

- Tool catalog: `src/runtime/agent-kernel/tool-registry.js`
- Permission policy: `src/runtime/agent-kernel/permission-policy.js`
- Session trace: `src/runtime/agent-kernel/session-trace.js`
- Dry-run planner: `src/runtime/agent-kernel/index.js`
- Read-only tools: `src/runtime/agent-kernel/read-only-tools.js`
- Patch preview: `src/runtime/agent-kernel/patch-tool.js`
- Test runner: `src/runtime/agent-kernel/test-tool.js`
- Git diff: `src/runtime/agent-kernel/git-tool.js`
- Fix packet: `src/runtime/agent-kernel/fix-packet.js`
- CLI preview: `stdd agent`

## Target Shape

```text
stdd agent "implement checkout"
  inspect   -> read STDD/project state
  propose   -> map goal to change package
  spec      -> keep behavior explicit
  plan      -> break work into reviewable tasks
  patch     -> produce patch-first edits behind approval gates
  test      -> run configured tests and collect evidence
  verify    -> enforce Constitution and STDD gates
  summarize -> report diff, evidence, and next steps
```

## Permission Modes

| Mode | Intent |
|---|---|
| `suggest` | Read and plan by default. Writes require approval. |
| `guarded` | Safe tools run, guarded/write tools ask, dangerous tools deny. |
| `autonomous` | Allows more execution, but still denies dangerous tools and asks where tools require approval. |

## Phased Implementation

1. Agent kernel contract: tool registry, permissions, session trace, dry-run plan.
2. Read/search tools: workspace-safe file reads and content search.
3. Patch tool: diff-first edits with conflict detection and approval gates.
4. Test tool: normalized test execution and evidence recording.
5. LLM loop: plan-act-observe loop with provider abstraction and streaming.
6. STDD closed loop: native RED/GREEN/REFACTOR execution with `verify` and Constitution gates.
7. Product UX: interactive REPL/TUI, interruptions, compaction, and resume.

## Non-Goals For The Kernel Scaffold

- It does not edit code yet.
- It does not bypass existing STDD confirmation gates.
- It does not replace `runtime agent` Party Mode.
- It does not make shell execution more permissive.

Use `stdd agent --list-tools` to inspect the current tool boundary and `stdd agent "goal" --json` to inspect the native execution plan contract.

## Read-Only Tool Preview

The first executable kernel tools are intentionally read-only:

```bash
stdd agent --read package.json
stdd agent --search "AgentKernel" --path src --limit 20
```

Both tools are workspace-bound, reject unsafe paths, skip common generated directories during search, and record calls in `stdd/agent/sessions/*.jsonl`.

## Patch Preview

The first `fs.patch` implementation validates unified diff files, extracts affected files, blocks unsafe paths, counts additions/deletions, and records trace evidence. Preview mode does not apply changes. Apply mode requires explicit approval and uses strict hunk matching with no fuzzy merge.

```bash
stdd agent --patch-preview change.diff
stdd agent --patch-preview change.diff --json
stdd agent --patch-apply change.diff --json
```

## Test Runner

`test.run` resolves the same project test commands used by STDD apply/verify and returns an agent-friendly result schema.

```bash
stdd agent --test-run --json
stdd agent --test-run --test-command "npm test" --json
```

The tool uses the existing command runner validation, captures stdout/stderr tails, records session trace, and does not attempt automatic repair.

## Git Diff

`git.diff` is read-only and runs fixed git commands only. It gives the agent a safe view of working tree changes before summaries or follow-up repairs.

```bash
stdd agent --git-diff --json
stdd agent --git-diff --patch --json
```

## Minimal Patch Cycle

The first executable agent cycle composes existing safe tools. It does not generate code or auto-repair failures.

```bash
stdd agent --cycle --patch-file change.diff --test-command "npm test" --json
```

Execution order:

```text
git.diff before -> fs.patch apply -> test.run -> git.diff after -> summary
```

If the cycle fails, the result includes an `agent-fix-packet` with failed test output, patch metadata, and git diff context.

```bash
stdd agent --fix-packet --patch --json
stdd agent --fix-packet --write-prompt --json
```

`--write-prompt` persists JSON and Markdown under `stdd/agent/fix-packets/`. The Markdown prompt instructs a model to return only a unified diff, which can then be passed to `stdd agent --repair --patch-file`.

## Repair Cycle

Repair cycle consumes a fix patch generated from an earlier fix packet and verifies it with the same safe tools.

```bash
stdd agent --repair --patch-file repair.diff --test-command "npm test" --json
```

Execution order:

```text
git.diff before -> fs.patch preview -> fs.patch apply -> test.run -> git.diff after -> summary
```

## LLM Diff Handoff

The first LLM integration is provider-neutral and patch-first. It reads a fix-packet Markdown prompt and writes a candidate unified diff. It does not apply the patch.

```bash
STDD_LLM_API_KEY=... stdd agent --llm-diff --prompt stdd/agent/fix-packets/fix-packet.md --output repair.diff --json
stdd agent --repair --patch-file repair.diff --test-command "npm test" --json
```

`--llm-repair` composes the handoff into one guarded flow:

```bash
STDD_LLM_API_KEY=... stdd agent --llm-repair --prompt stdd/agent/fix-packets/fix-packet.md --output repair.diff --test-command "npm test" --json
```

Execution order:

```text
llm.diff -> fs.patch preview -> repair cycle
```
