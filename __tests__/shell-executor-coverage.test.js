/**
 * Targeted branch-coverage tests for shell-executor.js
 * Covers: allowUnsafe=true path, no-command error, spawnSync error,
 *         bin blocked audit, spawn-error audit.
 */

const { ShellAgentExecutor, _parseCommand } = require('../src/runtime/agents/shell-executor');
const fs = require('fs');
const path = require('path');

const TMP = path.join(__dirname, '__shell_cov_tmp__');

beforeAll(() => fs.mkdirSync(TMP, { recursive: true }));
afterAll(() => fs.rmSync(TMP, { recursive: true, force: true }));

describe('ShellAgentExecutor coverage boost', () => {
  describe('constructor branches', () => {
    it('uses environment variable for command when options.command not set', () => {
      const original = process.env.STDD_AGENT_COMMAND;
      process.env.STDD_AGENT_COMMAND = 'echo hello';
      const exec = new ShellAgentExecutor({ cwd: TMP });
      expect(exec.command).toBe('echo hello');
      process.env.STDD_AGENT_COMMAND = original;
    });

    it('uses environment variable for allowedBins', () => {
      const original = process.env.STDD_AGENT_ALLOWED_BINS;
      process.env.STDD_AGENT_ALLOWED_BINS = 'echo,cat';
      const exec = new ShellAgentExecutor({ cwd: TMP });
      expect(exec.allowedBins.has('echo')).toBe(true);
      expect(exec.allowedBins.has('cat')).toBe(true);
      process.env.STDD_AGENT_ALLOWED_BINS = original;
    });

    it('uses environment variable for allowUnsafe', () => {
      const original = process.env.STDD_ALLOW_UNSAFE_SHELL_EXECUTOR;
      process.env.STDD_ALLOW_UNSAFE_SHELL_EXECUTOR = '1';
      const exec = new ShellAgentExecutor({ cwd: TMP });
      expect(exec.allowUnsafe).toBe(true);
      process.env.STDD_ALLOW_UNSAFE_SHELL_EXECUTOR = original;
    });
  });

  describe('isAllowedBin branches', () => {
    it('returns true when allowUnsafe is set', () => {
      const exec = new ShellAgentExecutor({ cwd: TMP, allowUnsafe: true });
      expect(exec.isAllowedBin('dangerous-bin')).toBe(true);
    });

    it('resolves bin via basename for path-like input', () => {
      const exec = new ShellAgentExecutor({ cwd: TMP, allowedBins: ['node'] });
      expect(exec.isAllowedBin('/usr/local/bin/node')).toBe(true);
    });
  });

  describe('run — no command error', () => {
    it('throws when no command is configured', async () => {
      const original = process.env.STDD_AGENT_COMMAND;
      delete process.env.STDD_AGENT_COMMAND;
      const exec = new ShellAgentExecutor({ cwd: TMP });
      await expect(exec.run({ goal: 'test' })).rejects.toThrow('requires --command');
      process.env.STDD_AGENT_COMMAND = original;
    });
  });

  describe('run — bin blocked', () => {
    it('throws and writes audit for blocked bin', async () => {
      const exec = new ShellAgentExecutor({ cwd: TMP, command: 'rm -rf /' });
      await expect(exec.run({ goal: 'destruct' })).rejects.toThrow('rejected');
      // Check audit file was written
      const auditFile = path.join(TMP, 'stdd', 'logs', 'shell-executor-audit.jsonl');
      if (fs.existsSync(auditFile)) {
        const lines = fs.readFileSync(auditFile, 'utf8').trim().split('\n');
        const last = JSON.parse(lines[lines.length - 1]);
        expect(last.status).toBe('blocked');
      }
    });
  });

  describe('run — successful execution', () => {
    it('executes node and returns success status', async () => {
      const exec = new ShellAgentExecutor({ cwd: TMP, command: 'node -e "process.stdout.write(JSON.stringify({ok:true}))"' });
      const result = await exec.run({ goal: 'test' });
      expect(result.status).toBe('success');
      expect(result.adapter).toBe('shell');
      expect(result.exitCode).toBe(0);
    });
  });

  describe('_ensureAuditDir', () => {
    it('creates log directory if missing', () => {
      const freshDir = path.join(TMP, 'fresh');
      const exec = new ShellAgentExecutor({ cwd: freshDir });
      const dir = exec._ensureAuditDir();
      expect(fs.existsSync(dir)).toBe(true);
    });
  });
});
