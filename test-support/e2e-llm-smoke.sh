#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Real-LLM end-to-end smoke test for Chaos Code.
#
# Verifies the full loop (real model → tool calls → file changes) that unit
# tests cover only with mocks. Run it whenever you want to confirm the agent
# still works against a live provider:
#
#   OPENAI_API_KEY=sk-... bash test-support/e2e-llm-smoke.sh
#
# Also supports:  ANTHROPIC_API_KEY=...   or   STDD_LLM_API_KEY=... +
# STDD_LLM_BASE_URL=... (+ optional STDD_LLM_MODEL=... for any
# OpenAI-compatible endpoint, e.g. GLM/DeepSeek/Ollama/LM Studio).
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CLI="$ROOT/cli.js"
PASS=0
FAIL=0
T1=""; T2=""; T3=""

# Isolate HOME so the run neither reads nor persists the user's ~/.chaos config
CHAOS_E2E_HOME="$(mktemp -d)"
export HOME="$CHAOS_E2E_HOME"

cleanup() { rm -rf "$CHAOS_E2E_HOME" "${T1:-}" "${T2:-}" "${T3:-}"; }
trap cleanup EXIT

if [ -z "${OPENAI_API_KEY:-}" ] && [ -z "${ANTHROPIC_API_KEY:-}" ] && [ -z "${STDD_LLM_API_KEY:-}" ]; then
  echo "✗ No API key found. Export OPENAI_API_KEY / ANTHROPIC_API_KEY / STDD_LLM_API_KEY first."
  exit 1
fi

# `timeout` is GNU coreutils; stock macOS only has gtimeout via Homebrew
TIMEOUT_BIN="$(command -v timeout || command -v gtimeout || true)"
if [ -z "$TIMEOUT_BIN" ]; then
  echo "✗ timeout/gtimeout not found (install coreutils: brew install coreutils)"
  exit 1
fi

# stdin is detached on every CLI invocation: when run from an interactive
# terminal the CLI would otherwise inherit the TTY, sit on an invisible
# "Allow fs_write?" permission prompt and die by timeout.
run_cli() { (cd "$1" && "$TIMEOUT_BIN" 180 node "$CLI" "$2" < /dev/null 2>&1); }

run_case() {
  local name="$1" dir="$2" prompt="$3" expect="$4"
  echo "── $name"
  local out
  out="$(run_cli "$dir" "$prompt")"
  if echo "$out" | grep -qi -- "$expect"; then
    echo "  ✓ PASS (matched: $expect)"
    PASS=$((PASS+1))
    return 0
  fi
  echo "  ✗ FAIL — expected to find: $expect"
  echo "$out" | tail -15 | sed 's/^/    | /'
  FAIL=$((FAIL+1))
  return 1
}

# ── T1: read tool round-trip (model must call fs_read) ──
T1="$(mktemp -d)"
printf 'const SECRET = "PINEAPPLE-42";\n' > "$T1/answer.js"
run_case "T1 read: model reads a file and reports its content" \
  "$T1" \
  "Read the file answer.js in this directory and reply with the exact value of SECRET and nothing else." \
  "PINEAPPLE-42"

# ── T2: write tool round-trip (model must call fs_write; detached stdin makes
#    the CLI non-interactive so 'ask' tools are auto-allowed with a notice).
#    The assertion is the artifact on disk — the model's closing reply may
#    or may not repeat the file content verbatim. ──
T2="$(mktemp -d)"
echo "── T2 write: model creates a file with requested content"
T2_OUT="$(run_cli "$T2" "Create a file named result.txt in this directory containing exactly the text CHAOS-OK-99 (no trailing prose).")"
if [ -f "$T2/result.txt" ] && grep -q "CHAOS-OK-99" "$T2/result.txt"; then
  echo "  ✓ PASS (result.txt on disk: $(head -1 "$T2/result.txt"))"
  PASS=$((PASS+1))
else
  echo "  ✗ FAIL — result.txt missing or wrong content"
  echo "$T2_OUT" | tail -15 | sed 's/^/    | /'
  FAIL=$((FAIL+1))
fi

# ── T3: multi-step (write then read back) ──
# Deterministic assertions: file on disk + BOTH tool invocations in the
# transcript (⏺ fs_write and ⏺ fs_read of the same file). The transcript
# renders "⏺ <tool>  <path>" with a variable number of spaces, so the grep
# is whitespace-tolerant. The model echoing the marker is a soft signal.
T3="$(mktemp -d)"
echo "── T3 multi-step: model writes a file, reads it back, verifies"
T3_OUT="$(run_cli "$T3" "Create notes/e2e.md with the single line MARKER-777. Then read the file back to verify its content before answering.")"
T3_FILE_OK=0; T3_CHAIN_OK=0; T3_ECHO=0
[ -f "$T3/notes/e2e.md" ] && grep -q "MARKER-777" "$T3/notes/e2e.md" && T3_FILE_OK=1
echo "$T3_OUT" | grep -qE 'fs_write[[:space:]]+notes/e2e\.md' && echo "$T3_OUT" | grep -qE 'fs_read[[:space:]]+notes/e2e\.md' && T3_CHAIN_OK=1
echo "$T3_OUT" | grep -q "MARKER-777" && T3_ECHO=1
if [ "$T3_FILE_OK" = "1" ] && { [ "$T3_CHAIN_OK" = "1" ] || [ "$T3_ECHO" = "1" ]; }; then
  echo "  ✓ PASS (file on disk${T3_CHAIN_OK:+ + write→read tool chain}${T3_ECHO:+, marker echoed})"
  PASS=$((PASS+1))
else
  echo "  ✗ FAIL — file_ok=$T3_FILE_OK tool_chain_ok=$T3_CHAIN_OK echo=$T3_ECHO"
  echo "$T3_OUT" | tail -12 | sed 's/^/    | /'
  FAIL=$((FAIL+1))
fi

echo ""
echo "────────────────────────────────"
echo "e2e smoke: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && echo "ALL GREEN — the agent loop works end to end." || exit 1
