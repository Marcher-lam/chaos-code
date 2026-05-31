/**
 * Targeted branch-coverage tests for commit-msg.js
 * Covers: buildSubject edge cases, buildPhaseSubject truncation,
 *         detectTddPhase branches, extractIssue branches,
 *         extractScopeFromChangeName branches, buildBody with specs,
 *         execute requireIssue, execute no active change.
 */

const fs = require('fs');
const path = require('path');
const { CommitCommand, buildSubject, buildPhaseSubject, _extractProposalTitle,
        _detectType, detectTddPhase, extractIssue, extractScopeFromChangeName, buildBody } = require('../src/cli/commands/commit-msg');

const TMP = path.join(__dirname, '__commit_cov_tmp__');
function mkdirp(dir) { fs.mkdirSync(dir, { recursive: true }); }
beforeEach(() => mkdirp(TMP));
afterEach(() => fs.rmSync(TMP, { recursive: true, force: true }));

describe('commit-msg coverage boost', () => {
  describe('buildSubject — edge cases', () => {
    it('truncates very long description even without scope', () => {
      const longDesc = 'A'.repeat(80);
      const result = buildSubject('feat', null, longDesc);
      expect(result.length).toBeLessThanOrEqual(50);
      expect(result).toContain('...');
    });

    it('truncates very long description with scope', () => {
      const longDesc = 'B'.repeat(80);
      const result = buildSubject('feat', 'api', longDesc);
      expect(result.length).toBeLessThanOrEqual(50);
    });

    it('handles empty description', () => {
      const result = buildSubject('fix', null, '');
      expect(result).toBe('fix: ');
    });
  });

  describe('buildPhaseSubject — truncation', () => {
    it('truncates long description with issue', () => {
      const longDesc = 'C'.repeat(60);
      const result = buildPhaseSubject('green', '42', longDesc);
      expect(result.length).toBeLessThanOrEqual(50);
      expect(result).toContain('#42');
    });

    it('handles no issue', () => {
      const result = buildPhaseSubject('red', null, 'short desc');
      expect(result).toContain('red:');
      expect(result).not.toContain('#');
    });
  });

  describe('detectTddPhase — branches', () => {
    it('returns options.phase when provided', () => {
      expect(detectTddPhase([], { phase: 'refactor' })).toBe('refactor');
    });

    it('returns red when red keywords and no completed', () => {
      const tasks = [{ description: 'write failing test', isDone: false }];
      expect(detectTddPhase(tasks)).toBe('red');
    });

    it('returns refactor when refactor keywords', () => {
      const tasks = [{ description: 'refactor the module', isDone: true }];
      expect(detectTddPhase(tasks)).toBe('refactor');
    });

    it('returns green by default', () => {
      const tasks = [{ description: 'implement feature', isDone: true }];
      expect(detectTddPhase(tasks)).toBe('green');
    });
  });

  describe('extractIssue — branches', () => {
    it('extracts from options.issue', () => {
      expect(extractIssue('', '', { issue: '#123' })).toBe('123');
    });

    it('extracts from content #123', () => {
      expect(extractIssue('fixes #456', '', {})).toBe('456');
    });

    it('extracts gh-123 format', () => {
      expect(extractIssue('see gh-789', '', {})).toBe('789');
    });

    it('extracts issue:123 format', () => {
      expect(extractIssue('issue: 100', '', {})).toBe('100');
    });

    it('returns null when no issue found', () => {
      expect(extractIssue('no issue here', 'no-issue', {})).toBeNull();
    });
  });

  describe('extractScopeFromChangeName', () => {
    it('extracts scope from ff- prefix', () => {
      expect(extractScopeFromChangeName('ff-login-123')).toBe('login');
    });

    it('returns null for non-ff name', () => {
      expect(extractScopeFromChangeName('bugfix-x')).toBeNull();
    });

    it('returns null for ff- with no content after', () => {
      expect(extractScopeFromChangeName('ff-')).toBeNull();
    });
  });

  describe('CommitCommand execute — error branches', () => {
    it('throws when no active changes found', async () => {
      const stddDir = path.join(TMP, 'stdd');
      mkdirp(path.join(stddDir, 'changes'));
      mkdirp(path.join(stddDir, 'specs'));
      fs.writeFileSync(path.join(stddDir, 'config.yaml'), 'version: "1.0"');
      const origCwd = process.cwd();
      process.chdir(TMP);
      try {
        const cmd = new CommitCommand();
        await expect(cmd.execute()).rejects.toThrow('No active changes found');
      } finally {
        process.chdir(origCwd);
      }
    });

    it('throws requireIssue when no issue present', async () => {
      const stddDir = path.join(TMP, 'stdd');
      mkdirp(path.join(stddDir, 'changes', 'my-change'));
      mkdirp(path.join(stddDir, 'specs'));
      fs.writeFileSync(path.join(stddDir, 'config.yaml'), 'version: "1.0"');
      fs.writeFileSync(path.join(stddDir, 'changes', 'my-change', 'proposal.md'), '# My Change\n');
      fs.writeFileSync(path.join(stddDir, 'changes', 'my-change', 'tasks.md'), '- [ ] Task 1\n');
      const origCwd = process.cwd();
      process.chdir(TMP);
      try {
        const cmd = new CommitCommand();
        await expect(cmd.execute('my-change', { requireIssue: true })).rejects.toThrow('Issue number is required');
      } finally {
        process.chdir(origCwd);
      }
    });

    it('generates TDD phase subject when options.tdd is set', async () => {
      const stddDir = path.join(TMP, 'stdd');
      const changeDir = path.join(stddDir, 'changes', 'my-change');
      mkdirp(changeDir);
      mkdirp(path.join(stddDir, 'specs'));
      fs.writeFileSync(path.join(stddDir, 'config.yaml'), 'version: "1.0"');
      fs.writeFileSync(path.join(changeDir, 'proposal.md'), '# Proposal: My Feature\n');
      fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] Implement\n');
      const origCwd = process.cwd();
      process.chdir(TMP);
      try {
        const cmd = new CommitCommand();
        const result = await cmd.execute('my-change', { tdd: true });
        expect(result).toContain('green:');
      } finally {
        process.chdir(origCwd);
      }
    });
  });

  describe('buildBody with spec files', () => {
    it('includes spec files in body', () => {
      const stddDir = path.join(TMP, 'stdd', 'changes', 'x');
      const specsDir = path.join(stddDir, 'specs');
      mkdirp(specsDir);
      fs.writeFileSync(path.join(specsDir, 'login.feature'), 'Feature: Login');
      const body = buildBody([{ description: 'Task A', isDone: true }], 'x', stddDir);
      expect(body).toContain('login.feature');
    });
  });
});
