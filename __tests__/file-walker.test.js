const fs = require('fs');
const path = require('path');
const os = require('os');
const { walkFiles, DEFAULT_SKIP_DIRS } = require('../src/utils/file-walker');

function setupDir() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-walker-'));
  fs.writeFileSync(path.join(tmp, 'a.js'), '');
  fs.writeFileSync(path.join(tmp, 'b.ts'), '');
  fs.writeFileSync(path.join(tmp, 'c.md'), '');
  const sub = path.join(tmp, 'sub');
  fs.mkdirSync(sub);
  fs.writeFileSync(path.join(sub, 'd.js'), '');
  fs.writeFileSync(path.join(sub, 'e.py'), '');
  const nm = path.join(tmp, 'node_modules');
  fs.mkdirSync(nm);
  fs.writeFileSync(path.join(nm, 'pkg.js'), '');
  const dotgit = path.join(tmp, '.git');
  fs.mkdirSync(dotgit);
  fs.writeFileSync(path.join(dotgit, 'config'), '');
  return tmp;
}

describe('walkFiles', () => {
  it('returns all files recursively', () => {
    const tmp = setupDir();
    const files = walkFiles(tmp, { skipDirs: new Set() });
    expect(files.length).toBeGreaterThanOrEqual(4);
  });

  it('skips node_modules and .git by default', () => {
    const tmp = setupDir();
    const files = walkFiles(tmp);
    expect(files.every(f => !f.includes('node_modules'))).toBe(true);
    expect(files.every(f => !f.includes('.git'))).toBe(true);
  });

  it('filters by extensions', () => {
    const tmp = setupDir();
    const files = walkFiles(tmp, { extensions: ['.js'] });
    expect(files.every(f => f.endsWith('.js'))).toBe(true);
    expect(files.length).toBe(2);
  });

  it('filters by predicate', () => {
    const tmp = setupDir();
    const files = walkFiles(tmp, { predicate: f => f.endsWith('.md') });
    expect(files).toHaveLength(1);
  });

  it('returns empty for non-existent dir', () => {
    expect(walkFiles('/nonexistent/path')).toEqual([]);
  });

  it('respects custom skipDirs', () => {
    const tmp = setupDir();
    const files = walkFiles(tmp, { skipDirs: new Set() });
    expect(files.some(f => f.includes('node_modules'))).toBe(true);
  });

  it('DEFAULT_SKIP_DIRS contains expected entries', () => {
    expect(DEFAULT_SKIP_DIRS.has('node_modules')).toBe(true);
    expect(DEFAULT_SKIP_DIRS.has('.git')).toBe(true);
    expect(DEFAULT_SKIP_DIRS.has('coverage')).toBe(true);
  });
});
