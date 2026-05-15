#!/usr/bin/env bash
# Smoke test – verifies the CLI package installs and responds correctly
set -euo pipefail

TMPDIR=$(mktemp -d /tmp/stdd-smoketest-XXXX)
trap 'rm -rf "$TMPDIR"' EXIT

echo "==> Building package..."
npm pack --pack-destination "$TMPDIR" > /dev/null
PKG=$(ls "$TMPDIR"/*.tgz)

echo "==> Installing package..."
npm install -g "$PKG" > /dev/null

echo "==> Verifying CLI..."
stdd --version
stdd --help | grep -q "init" || { echo "ERROR: help missing init"; exit 1; }

echo "==> Testing init..."
mkdir "$TMPDIR/testproj"
cd "$TMPDIR/testproj"
stdd init --yes > /dev/null
test -d "$TMPDIR/testproj/stdd" || { echo "ERROR: stdd dir not created"; exit 1; }
test -f "$TMPDIR/testproj/stdd/config.yaml" || { echo "ERROR: config.yaml missing"; exit 1; }

echo "==> Testing listing..."
stdd list | grep -q "No active changes" || { echo "ERROR: list output unexpected"; exit 1; }

echo "==> Uninstalling..."
npm uninstall -g @marcher-lam/stdd-copilot > /dev/null

echo ""
echo "✓ Smoke test passed"
