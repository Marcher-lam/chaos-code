const { GitTool } = require('../src/runtime/agent-kernel/git-tool');
const { AgentKernel } = require('../src/runtime/agent-kernel/index');
const { ToolRegistry } = require('../src/runtime/agent-kernel/tool-registry');
const child_process = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

jest.mock('child_process');

describe('GitTool extended operations (pull / log / stash)', () => {
  let tmpDir;

  beforeEach(() => {
    jest.clearAllMocks();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chaos-git-ext-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('pull', () => {
    it('pulls from origin with explicit branch', () => {
      child_process.spawnSync.mockReturnValue({ status: 0, stdout: 'Already up to date.', stderr: '' });
      const git = new GitTool({ cwd: tmpDir });
      const result = git.pull({ remote: 'origin', branch: 'main' });

      expect(child_process.spawnSync).toHaveBeenCalledWith('git', ['pull', 'origin', 'main'], expect.any(Object));
      expect(result.status).toBe('ok');
      expect(result.tool).toBe('git.pull');
    });

    it('pulls current branch when branch omitted', () => {
      child_process.spawnSync.mockReturnValue({ status: 0, stdout: 'Fast-forward', stderr: '' });
      const git = new GitTool({ cwd: tmpDir });
      const result = git.pull({});

      expect(child_process.spawnSync).toHaveBeenCalledWith('git', ['pull', 'origin'], expect.any(Object));
      expect(result.status).toBe('ok');
    });

    it('reports failure status on conflict', () => {
      child_process.spawnSync.mockReturnValue({ status: 1, stdout: '', stderr: 'CONFLICT' });
      const git = new GitTool({ cwd: tmpDir });
      const result = git.pull({ branch: 'main' });

      expect(result.status).toBe('fail');
      expect(result.stderr).toContain('CONFLICT');
    });
  });

  describe('log', () => {
    it('returns parsed commit list with default count', () => {
      child_process.spawnSync.mockReturnValue({
        status: 0,
        stdout: 'abc123 2026-01-01 Alice feat: one\ndef456 2026-01-02 Bob fix: two',
        stderr: '',
      });
      const git = new GitTool({ cwd: tmpDir });
      const result = git.log({});

      expect(child_process.spawnSync).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['log', '-20']),
        expect.any(Object)
      );
      expect(result.status).toBe('ok');
      expect(result.commits).toHaveLength(2);
      expect(result.commits[0]).toContain('abc123');
    });

    it('caps count at 200 and supports file filter', () => {
      child_process.spawnSync.mockReturnValue({ status: 0, stdout: 'a1 x', stderr: '' });
      const git = new GitTool({ cwd: tmpDir });
      git.log({ count: 500, file: 'src/app.js' });

      const args = child_process.spawnSync.mock.calls[0][1];
      expect(args).toContain('-200');
      expect(args.slice(-2)).toEqual(['--', 'src/app.js']);
    });
  });

  describe('stash', () => {
    it('pushes with a message', () => {
      child_process.spawnSync.mockReturnValue({ status: 0, stdout: 'Saved working directory', stderr: '' });
      const git = new GitTool({ cwd: tmpDir });
      const result = git.stash({ action: 'push', message: 'wip' });

      expect(child_process.spawnSync).toHaveBeenCalledWith('git', ['stash', 'push', '-m', 'wip'], expect.any(Object));
      expect(result.status).toBe('ok');
    });

    it('lists stashes', () => {
      child_process.spawnSync.mockReturnValue({ status: 0, stdout: 'stash@{0}: WIP on main', stderr: '' });
      const git = new GitTool({ cwd: tmpDir });
      const result = git.stash({ action: 'list' });

      expect(child_process.spawnSync).toHaveBeenCalledWith('git', ['stash', 'list'], expect.any(Object));
      expect(result.status).toBe('ok');
    });

    it('rejects invalid actions', () => {
      const git = new GitTool({ cwd: tmpDir });
      expect(() => git.stash({ action: 'bogus' })).toThrow(/Invalid stash action/);
    });
  });

  describe('kernel dispatch & registry', () => {
    it('registers git.pull/git.log/git.stash in the default tool registry', () => {
      const registry = new ToolRegistry();
      expect(registry.get('git.pull')).not.toBeNull();
      expect(registry.get('git.log')).not.toBeNull();
      expect(registry.get('git.stash')).not.toBeNull();
      expect(registry.get('git.log').risk).toBe('safe');
      expect(registry.get('git.pull').risk).toBe('write');
    });

    it('AgentKernel.executeTool routes git.pull / git.log / git.stash', () => {
      child_process.spawnSync.mockReturnValue({ status: 0, stdout: 'ok', stderr: '' });
      const kernel = new AgentKernel({ cwd: tmpDir });

      const pullRes = kernel.executeTool('git.pull', { approved: true, branch: 'main' });
      expect(pullRes.tool).toBe('git.pull');
      expect(pullRes.status).toBe('ok');

      const logRes = kernel.executeTool('git.log', {});
      expect(logRes.tool).toBe('git.log');

      const stashRes = kernel.executeTool('git.stash', { approved: true, action: 'list' });
      expect(stashRes.tool).toBe('git.stash');
    });
  });
});
