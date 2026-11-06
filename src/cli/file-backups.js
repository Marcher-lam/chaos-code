/**
 * File backup support for /undo.
 *
 * git restore only reverts tracked files — anything the agent newly created
 * (fs_write on a fresh path) or edits to files that were never committed
 * cannot be undone through git alone. Before each fs_write/fs_patch the
 * terminal snapshots the current file into ~/.chaos/backups/<session>/ so
 * /undo can fall back to it (and delete files that did not exist before).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { isPathSafe } = require('../utils/security');

const BACKUPS_ROOT = path.join(os.homedir(), '.chaos', 'backups');
const DEFAULT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_KEEP_SESSIONS = 20;

function sessionBackupDir(sessionId) {
  return path.join(BACKUPS_ROOT, String(sessionId));
}

function _sanitize(relPath) {
  return String(relPath).replace(/[^a-zA-Z0-9._-]+/g, '__').slice(-120);
}

// Distinct paths can sanitize to the same name, and two snapshots can land
// in the same millisecond — a monotonic counter guarantees uniqueness.
let _backupSeq = 0;

/**
 * Snapshot cwd/relPath before an agent write.
 * @returns {{backup: string|null, existed: boolean}|null} null when relPath
 *   is empty; backup is null when the file did not exist yet.
 */
function backupFile(cwd, relPath, sessionId) {
  if (!relPath) return null;
  const abs = path.resolve(cwd, relPath);
  // Defense in depth: relPath is recorded from model-controlled tool args
  // BEFORE the kernel's own isPathSafe gate runs — never snapshot outside
  // the workspace (would copy secrets into ~/.chaos/backups for 7 days).
  if (!isPathSafe(abs, cwd)) return { backup: null, existed: false };
  const existed = fs.existsSync(abs) && fs.statSync(abs).isFile();
  if (!existed) return { backup: null, existed: false };

  try {
    const dir = sessionBackupDir(sessionId);
    fs.mkdirSync(dir, { recursive: true });
    _backupSeq = (_backupSeq + 1) % 46656;
    const backup = path.join(dir, `${Date.now().toString(36)}-${_backupSeq.toString(36).padStart(3, '0')}-${_sanitize(relPath)}`);
    fs.copyFileSync(abs, backup);
    return { backup, existed: true };
  } catch (_) {
    // Backup is best-effort: report that the file existed but we have no copy
    return { backup: null, existed: true };
  }
}

/**
 * Fallback restore when `git restore` failed.
 * - entry.existed && entry.backup  → copy the snapshot back
 * - !entry.existed                 → the agent created this file: remove it
 * @returns {{restored: boolean, method: 'backup'|'deleted'|'none', message: string}}
 */
function restoreFromBackup(cwd, relPath, entry) {
  if (!entry) return { restored: false, method: 'none', message: 'no backup entry' };
  const abs = path.resolve(cwd, relPath);
  // Never copy back to — or delete — anything outside the workspace
  if (!isPathSafe(abs, cwd)) {
    return { restored: false, method: 'none', message: 'refusing to touch a path outside the workspace' };
  }

  if (entry.existed && entry.backup && fs.existsSync(entry.backup)) {
    try {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.copyFileSync(entry.backup, abs);
      return { restored: true, method: 'backup', message: `restored from backup` };
    } catch (err) {
      return { restored: false, method: 'none', message: err.message };
    }
  }

  if (entry.existed && !entry.backup) {
    return { restored: false, method: 'none', message: 'file existed before but no backup copy was taken' };
  }

  // File did not exist before the agent ran → undo means removing it
  if (!entry.existed) {
    if (!fs.existsSync(abs)) return { restored: true, method: 'deleted', message: 'already absent' };
    try {
      fs.rmSync(abs);
      return { restored: true, method: 'deleted', message: 'removed agent-created file' };
    } catch (err) {
      return { restored: false, method: 'none', message: err.message };
    }
  }

  return { restored: false, method: 'none', message: 'backup file no longer exists' };
}

/**
 * Prune old backup session dirs (age + count cap). Best-effort.
 */
function pruneOldBackups(maxAgeMs = DEFAULT_MAX_AGE_MS, keep = DEFAULT_KEEP_SESSIONS) {
  try {
    if (!fs.existsSync(BACKUPS_ROOT)) return;
    const entries = fs.readdirSync(BACKUPS_ROOT, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => {
        const dir = path.join(BACKUPS_ROOT, e.name);
        let mtime = 0;
        try { mtime = fs.statSync(dir).mtimeMs; } catch (_) {}
        return { dir, mtime };
      })
      .sort((a, b) => b.mtime - a.mtime);

    const cutoff = Date.now() - maxAgeMs;
    for (let i = 0; i < entries.length; i++) {
      if (i >= keep || entries[i].mtime < cutoff) {
        try { fs.rmSync(entries[i].dir, { recursive: true, force: true }); } catch (_) {}
      }
    }
  } catch (_) { /* best-effort */ }
}

module.exports = { backupFile, restoreFromBackup, pruneOldBackups, sessionBackupDir, BACKUPS_ROOT };
