const fs = require('fs');
const os = require('os');
const path = require('path');
const { backupFile, restoreFromBackup, pruneOldBackups, sessionBackupDir, BACKUPS_ROOT } = require('../src/cli/file-backups');

describe('file-backups (pre-write snapshots for /undo)', () => {
  let cwd;
  let sessionId;

  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'chaos-bk-'));
    sessionId = 'test-' + Date.now().toString(36);
  });

  afterEach(() => {
    fs.rmSync(cwd, { recursive: true, force: true });
    try { fs.rmSync(sessionBackupDir(sessionId), { recursive: true, force: true }); } catch (_) {}
  });

  it('snapshots an existing file and reports existed=true', () => {
    fs.writeFileSync(path.join(cwd, 'tracked.js'), 'original');
    const entry = backupFile(cwd, 'tracked.js', sessionId);

    expect(entry.existed).toBe(true);
    expect(entry.backup).not.toBeNull();
    expect(fs.existsSync(entry.backup)).toBe(true);
    expect(fs.readFileSync(entry.backup, 'utf8')).toBe('original');
  });

  it('records existed=false for files that do not exist yet (agent-created)', () => {
    const entry = backupFile(cwd, 'brand-new.js', sessionId);
    expect(entry.existed).toBe(false);
    expect(entry.backup).toBeNull();
  });

  it('returns null for empty paths', () => {
    expect(backupFile(cwd, '', sessionId)).toBeNull();
  });

  it('restores an untracked file from its snapshot', () => {
    fs.writeFileSync(path.join(cwd, 'notes.md'), 'before');
    const entry = backupFile(cwd, 'notes.md', sessionId);
    fs.writeFileSync(path.join(cwd, 'notes.md'), 'after agent edit');

    const res = restoreFromBackup(cwd, 'notes.md', entry);
    expect(res.restored).toBe(true);
    expect(res.method).toBe('backup');
    expect(fs.readFileSync(path.join(cwd, 'notes.md'), 'utf8')).toBe('before');
  });

  it('deletes agent-created files on undo', () => {
    const entry = backupFile(cwd, 'generated.ts', sessionId);
    fs.writeFileSync(path.join(cwd, 'generated.ts'), 'agent content');

    const res = restoreFromBackup(cwd, 'generated.ts', entry);
    expect(res.restored).toBe(true);
    expect(res.method).toBe('deleted');
    expect(fs.existsSync(path.join(cwd, 'generated.ts'))).toBe(false);
  });

  it('reports failure when the file existed but no backup was taken', () => {
    const res = restoreFromBackup(cwd, 'x.js', { existed: true, backup: null });
    expect(res.restored).toBe(false);
    expect(res.message).toContain('no backup');
  });

  it('handles a missing backup file gracefully', () => {
    const res = restoreFromBackup(cwd, 'x.js', { existed: true, backup: '/nonexistent/backup' });
    expect(res.restored).toBe(false);
  });

  it('handles subdirectory restores', () => {
    fs.mkdirSync(path.join(cwd, 'src', 'deep'), { recursive: true });
    fs.writeFileSync(path.join(cwd, 'src', 'deep', 'file.js'), 'v1');
    const entry = backupFile(cwd, 'src/deep/file.js', sessionId);
    fs.rmSync(path.join(cwd, 'src'), { recursive: true, force: true });

    const res = restoreFromBackup(cwd, 'src/deep/file.js', entry);
    expect(res.restored).toBe(true);
    expect(fs.readFileSync(path.join(cwd, 'src', 'deep', 'file.js'), 'utf8')).toBe('v1');
  });

  it('prunes old backup sessions but keeps recent ones', () => {
    const keepId = 'keep-' + Date.now().toString(36);
    const oldId = 'old-' + Date.now().toString(36);
    for (const id of [keepId, oldId]) {
      const dir = sessionBackupDir(id);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'snap'), 'x');
    }
    // age out the "old" session
    const oldTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    fs.utimesSync(sessionBackupDir(oldId), oldTime, oldTime);

    pruneOldBackups(7 * 24 * 60 * 60 * 1000, 20);

    expect(fs.existsSync(sessionBackupDir(keepId))).toBe(true);
    expect(fs.existsSync(sessionBackupDir(oldId))).toBe(false);

    fs.rmSync(sessionBackupDir(keepId), { recursive: true, force: true });
  });

  it('keeps backups under ~/.chaos/backups', () => {
    expect(BACKUPS_ROOT).toBe(path.join(os.homedir(), '.chaos', 'backups'));
  });
});
