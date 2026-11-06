#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Local full-stack e2e smoke — NO external API key required.
#
# Spins a local HTTPS fake provider (real TLS + real SSE), points the real
# CLI at it, and verifies the genuine end-to-end path:
#   CLI process → https agent → TLS → SSE parsing → streamed tool-call
#   assembly → permission gate (pipe-mode auto-allow) → REAL fs_read /
#   fs_write on disk → tool result fed back → final answer rendered.
#
# Usage: bash test-support/e2e-local-smoke.sh
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CLI="$ROOT/cli.js"
SERVER="$ROOT/test-support/local-e2e-server.js"
TMP="$(mktemp -d)"
PASS=0; FAIL=0
SERVER_PID=""

# `timeout` is GNU coreutils; stock macOS only has gtimeout
TIMEOUT_BIN="$(command -v timeout || command -v gtimeout || true)"
if [ -z "$TIMEOUT_BIN" ]; then
  echo "\u2717 timeout/gtimeout not found (install coreutils)"; exit 1
fi

# Isolate HOME so the run neither reads nor persists the user's ~/.chaos config
export HOME="$TMP/chaos-home"
mkdir -p "$HOME"

cleanup() {
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null
  rm -rf "$TMP"
}
trap cleanup EXIT

fail() { echo "  ✗ FAIL — $1"; FAIL=$((FAIL+1)); }
ok()   { echo "  ✓ PASS — $1"; PASS=$((PASS+1)); }

# ── 1. self-signed cert (trusted by the CLI via NODE_EXTRA_CA_CERTS) ──
CERT_DIR="$TMP/certs"; mkdir -p "$CERT_DIR"
if ! openssl req -x509 -newkey rsa:2048 -keyout "$CERT_DIR/key.pem" -out "$CERT_DIR/cert.pem" \
     -days 2 -nodes -subj "/CN=localhost" \
     -addext "subjectAltName=IP:127.0.0.1,DNS:localhost" >/dev/null 2>&1; then
  echo "✗ openssl could not generate a self-signed cert"; exit 1
fi

# ── 2. start the fake provider ──
node "$SERVER" "$CERT_DIR" > "$TMP/server.log" 2>&1 &
SERVER_PID=$!
PORT=""
for _ in $(seq 1 50); do
  PORT="$(grep -o 'PORT=[0-9]*' "$TMP/server.log" 2>/dev/null | head -1 | cut -d= -f2)"
  [ -n "$PORT" ] && break
  sleep 0.1
done
if [ -z "$PORT" ]; then echo "✗ fake provider failed to start"; cat "$TMP/server.log"; exit 1; fi
echo "fake provider listening on 127.0.0.1:$PORT"

export STDD_LLM_API_KEY="local-e2e-fake-key"
export STDD_LLM_BASE_URL="https://127.0.0.1:$PORT/v1"
export STDD_LLM_MODEL="local-fake-model"
export NODE_EXTRA_CA_CERTS="$CERT_DIR/cert.pem"

# stdin detached: interactive runs would sit on an invisible permission
# prompt (the CLI auto-allows 'ask' tools only when stdin is not a TTY)
run_cli() { (cd "$1" && "$TIMEOUT_BIN" 60 node "$CLI" "$2" < /dev/null 2>&1); }

# ── T1: READ scenario — real fs_read round-trip ──
echo "── T1 read: CLI → TLS → SSE → fs_read → real file content → final answer"
W1="$TMP/w1"; mkdir -p "$W1"
printf 'const SECRET = "PAPAYA-31337";\n' > "$W1/answer.js"
OUT1="$(run_cli "$W1" "READ: read answer.js and tell me the SECRET value")"
if echo "$OUT1" | grep -q "PAPAYA-31337"; then
  ok "model echoed the real file content (PAPAYA-31337)"
else
  fail "expected PAPAYA-31337 in output"; echo "$OUT1" | tail -12 | sed 's/^/    | /'
fi
if ! grep -q "PAPAYA-31337" "$W1/answer.js"; then
  fail "answer.js was modified by the run"
else
  ok "workspace file untouched"
fi

# ── T2: CREATE scenario — real fs_write through the permission gate ──
echo "── T2 write: streamed fs_write → pipe-mode auto-allow → file on disk"
W2="$TMP/w2"; mkdir -p "$W2"
OUT2="$(run_cli "$W2" "CREATE: make the file")"
if [ -f "$W2/made.txt" ] && grep -q "LOCAL-E2E-OK" "$W2/made.txt"; then
  ok "made.txt created with LOCAL-E2E-OK (real fs_write)"
else
  fail "made.txt missing or wrong content"; echo "$OUT2" | tail -12 | sed 's/^/    | /'
fi

# ── T3: pipe output must be clean (no spinner frames / control garbage) ──
echo "── T3 pipe output hygiene (both runs, CR + ANSI escapes)"
HYGIENE_OK=1
if printf '%s' "$OUT1" "$OUT2" | LC_ALL=C grep -q $'\r'; then
  fail "output contains CR characters (spinner artifacts)"
  HYGIENE_OK=0
fi
if printf '%s' "$OUT1" "$OUT2" | LC_ALL=C grep -q $'\x1b\['; then
  fail "output contains ANSI escape sequences (spinner artifacts)"
  HYGIENE_OK=0
fi
[ "$HYGIENE_OK" = "1" ] && ok "no spinner/control characters in piped output"

echo ""
echo "────────────────────────────────"
echo "local e2e smoke: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && echo "ALL GREEN — full network+tool stack verified end to end." || exit 1
