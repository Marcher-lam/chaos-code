/**
 * Session-level checkpoints — timeline rewind across ALL files the agent
 * touched, not just per-file undo (file-backups.js covers the per-write
 * snapshot; this layers whole-workspace restore points on top).
 *
 * Layout: ~/.chaos/checkpoints/<sessionId>/
 *   cp-0001-<label>/manifest.json  {id, label, ts, files: [{file, existed, snapshot}]}
 *   cp-0001-<label>/<sanitized-relative-path>  (content copies)
 *
 * Snapshots record the state AT CHECKPOINT TIME. Restoring copies everything
 * back; agent-created files (existed:false at their first record) are deleted.
 * Old checkpoints are pruned to the newest MAX_CHECKPOINTS.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { isPathSafe } = require('../utils/security');

const CHECKPOINTS_ROOT = () => path.join(os.homedir(), '.chaos', 'checkpoints');
const MAX_CHECKPOINTS = 10;

function _sanitize(relPath) {
  return String(relPath).replace(/[^a-zA-Z0-9._-]+/g, '__');
}

function sessionDir(sessionId) {
  return path.join(CHECKPOINTS_ROOT(), String(sessionId));
}

/**
 * Create a checkpoint of the CURRENT state of the given touched files.
 * @param {string} sessionId
 * @param {string} cwd
 * @param {Array<{file: string, existed: boolean}>} files — session-touched entries
 * @param {string} [label]
 * @returns {{id, label, dir, fileCount}} — never throws for missing files
 */
function createCheckpoint(sessionId, cwd, files, label = 'manual') {
  const safeLabel = String(label).replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 30) || 'manual';
  const existing = listCheckpoints(sessionId);
  const nextId = existing.length > 0 ? existing[existing.length - 1].id + 1 : 1;
  const dirName = `cp-${String(nextId).padStart(4, '0')}-${safeLabel}`;
  const dir = path.join(sessionDir(sessionId), dirName);

  const manifest = { id: nextId, label: safeLabel, ts: Date.now(), files: [] };
  const seen = new Set();
  for (const entry of files || []) {
    if (!entry || !entry.file || seen.has(entry.file)) continue;
    seen.add(entry.file);
    const abs = path.resolve(cwd, entry.file);
    // Only checkpoint files inside the workspace that exist right now
    if (!isPathSafe(abs, cwd)) continue;
    const rel = entry.file;
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
      const snapshot = path.join(dir, _sanitize(rel));
      try {
        fs.mkdirSync(path.dirname(snapshot), { recursive: true });
        fs.copyFileSync(abs, snapshot);
        manifest.files.push({ file: rel, existed: true, snapshot: path.basename(snapshot) });
      } catch (_) { /* unreadable file — record without snapshot */ }
    } else {
      // Agent-created-and-since-deleted, or never landed: nothing to copy
      manifest.files.push({ file: rel, existed: false, snapshot: null });
    }
  }

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  _prune(sessionId);
  return { id: nextId, label: safeLabel, dir, fileCount: manifest.files.length };
}

function listCheckpoints(sessionId) {
  const dir = sessionDir(sessionId);
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }).filter(e => e.isDirectory()); } catch (_) { return []; }
  const cps = [];
  for (const e of entries) {
    try {
      const m = JSON.parse(fs.readFileSync(path.join(dir, e.name, 'manifest.json'), 'utf8'));
      cps.push({ id: m.id, label: m.label, ts: m.ts, fileCount: (m.files || []).length, dirName: e.name });
    } catch (_) { /* incomplete checkpoint dir — skip */ }
  }
  return cps.sort((a, b) => a.id - b.id);
}

function getCheckpoint(sessionId, idOrLabel) {
  const cps = listCheckpoints(sessionId);
  const num = Number(idOrLabel);
  return cps.find(c => c.id === num) || cps.find(c => c.label === String(idOrLabel)) || null;
}

/**
 * Restore the whole checkpoint: copy every snapshotted file back and delete
 * files the agent created (existed:false in the manifest).
 */
function restoreCheckpoint(sessionId, cwd, idOrLabel) {
  const cp = getCheckpoint(sessionId, idOrLabel);
  if (!cp) return { ok: false, error: `Checkpoint "${idOrLabel}" not found.` };

  const dir = path.join(sessionDir(sessionId), cp.dirName);
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  } catch (err) {
    return { ok: false, error: `Checkpoint manifest unreadable: ${err.message}` };
  }

  let restored = 0;
  let deleted = 0;
  const skipped = [];
  for (const entry of manifest.files || []) {
    const abs = path.resolve(cwd, entry.file);
    if (!isPathSafe(abs, cwd)) { skipped.push(entry.file); continue; }
    if (entry.snapshot) {
      const snap = path.join(dir, entry.snapshot);
      try {
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.copyFileSync(snap, abs);
        restored++;
      } catch (_) { skipped.push(entry.file); }
    } else if (!entry.existed) {
      // Agent-created file: remove it again
      try {
        if (fs.existsSync(abs)) fs.rmSync(abs);
        deleted++;
      } catch (_) { skipped.push(entry.file); }
    }
  }
  return { ok: true, id: cp.id, label: cp.label, restored, deleted, skipped };
}

function _prune(sessionId) {
  const cps = listCheckpoints(sessionId);
  for (let i = 0; i < cps.length - MAX_CHECKPOINTS; i++) {
    try { fs.rmSync(path.join(sessionDir(sessionId), cps[i].dirName), { recursive: true, force: true }); } catch (_) { /* best-effort */ }
  }
}

function deleteSessionCheckpoints(sessionId) {
  try { fs.rmSync(sessionDir(sessionId), { recursive: true, force: true }); return true; } catch (_) { return false; }
}

module.exports = { createCheckpoint, listCheckpoints, getCheckpoint, restoreCheckpoint, deleteSessionCheckpoints, CHECKPOINTS_ROOT };
