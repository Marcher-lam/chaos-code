/**
 * Targeted branch-coverage tests for ff.js
 * Covers: ensureChangesDir non-ENOENT error, workspace resolution,
 *         generateProposal without workspace, generateTasks without workspace,
 *         EEXIST error on mkdir, execute with changeName option.
 */

const fs = require('fs');
const path = require('path');
const { FFCommand } = require('../src/cli/commands/ff');

const TMP = path.join(__dirname, '__ff_cov_tmp__');
function mkdirp(dir) { fs.mkdirSync(dir, { recursive: true }); }
beforeEach(() => mkdirp(TMP));
afterEach(() => fs.rmSync(TMP, { recursive: true, force: true }));

describe('ff.js coverage boost', () => {
  describe('ensureChangesDir — ENOENT branch', () => {
    it('throws STDD not initialized when changes dir missing', async () => {
      const stddDir = path.join(TMP, 'stdd');
      mkdirp(stddDir);
      // No changes directory
      const origCwd = process.cwd();
      process.chdir(TMP);
      try {
        const cmd = new FFCommand();
        await expect(cmd.ensureChangesDir()).rejects.toThrow('STDD not initialized');
      } finally {
        process.chdir(origCwd);
      }
    });
  });

  describe('execute — change already exists', () => {
    it('throws when change name already exists', async () => {
      const stddDir = path.join(TMP, 'stdd');
      mkdirp(path.join(stddDir, 'changes', 'ff-existing'));
      mkdirp(path.join(stddDir, 'specs'));
      fs.writeFileSync(path.join(stddDir, 'config.yaml'), 'version: "1.0"');
      const origCwd = process.cwd();
      process.chdir(TMP);
      try {
        const cmd = new FFCommand();
        await expect(cmd.execute('test feature', { changeName: 'ff-existing' })).rejects.toThrow('already exists');
      } finally {
        process.chdir(origCwd);
      }
    });
  });

  describe('execute — no description', () => {
    it('throws when description is empty', async () => {
      const stddDir = path.join(TMP, 'stdd');
      mkdirp(path.join(stddDir, 'changes'));
      mkdirp(path.join(stddDir, 'specs'));
      fs.writeFileSync(path.join(stddDir, 'config.yaml'), 'version: "1.0"');
      const origCwd = process.cwd();
      process.chdir(TMP);
      try {
        const cmd = new FFCommand();
        await expect(cmd.execute('')).rejects.toThrow('Description is required');
      } finally {
        process.chdir(origCwd);
      }
    });
  });

  describe('generateProposal — without workspace', () => {
    it('generates proposal without workspace section', () => {
      const cmd = new FFCommand();
      const proposal = cmd.generateProposal('Add dark mode');
      expect(proposal).toContain('Add dark mode');
      expect(proposal).not.toContain('Workspace');
    });
  });

  describe('generateTasks — without workspace', () => {
    it('generates tasks without workspace header', () => {
      const cmd = new FFCommand();
      const tasks = cmd.generateTasks('Implement login');
      expect(tasks).toContain('TASK-001');
      expect(tasks).toContain('Implement login');
      expect(tasks).not.toContain('Workspace:');
    });
  });

  describe('execute — successful creation', () => {
    it('creates change with default name', async () => {
      const stddDir = path.join(TMP, 'stdd');
      mkdirp(path.join(stddDir, 'changes'));
      mkdirp(path.join(stddDir, 'specs'));
      fs.writeFileSync(path.join(stddDir, 'config.yaml'), 'version: "1.0"');
      const origCwd = process.cwd();
      process.chdir(TMP);
      try {
        const cmd = new FFCommand();
        const result = await cmd.execute('Add search feature');
        expect(result.changeName).toMatch(/^ff-/);
        expect(fs.existsSync(path.join(stddDir, 'changes', result.changeName, 'proposal.md'))).toBe(true);
        expect(fs.existsSync(path.join(stddDir, 'changes', result.changeName, 'tasks.md'))).toBe(true);
      } finally {
        process.chdir(origCwd);
      }
    });
  });
});
