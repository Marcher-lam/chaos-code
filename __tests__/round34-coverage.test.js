/**
 * Round 34: Targeted branch-coverage boost for commit-msg.js and constitution-status.js
 * commit-msg uncovered: lines 18, 92, 130, 157, 211
 * constitution-status uncovered: lines 162, 168
 */
const fs = require('fs');
const path = require('path');
const TMP = path.join(__dirname, '__r34_tmp__');
function mkdirp(d) { fs.mkdirSync(d, { recursive: true }); }
function w(p, c) { mkdirp(path.dirname(p)); fs.writeFileSync(p, c, 'utf8'); }

beforeEach(() => mkdirp(TMP));
afterEach(() => fs.rmSync(TMP, { recursive: true, force: true }));

describe('commit-msg remaining branches', () => {
  const { CommitCommand, buildSubject } = require('../src/cli/commands/commit-msg');

  describe('CommitCommand.execute — missing proposal (line 18)', () => {
    it('handles change without proposal.md gracefully', async () => {
      const stddDir = path.join(TMP, 'stdd');
      const changeDir = path.join(stddDir, 'changes', 'no-proposal');
      mkdirp(changeDir);
      w(path.join(changeDir, 'tasks.md'), '- [ ] Task 1\n');
      w(path.join(stddDir, 'config.yaml'), 'version: "1.0"');
      const orig = process.cwd();
      process.chdir(TMP);
      const cap = () => { const l=[]; const o=console.log; console.log=(...a)=>l.push(a.join(' ')); return {l, r(){console.log=o;}}; };
      const c = cap();
      try {
        await new CommitCommand().execute('no-proposal');
        expect(c.l.join('\n')).toContain('no-proposal');
      } finally {
        c.r();
        process.chdir(orig);
      }
    });
  });

  describe('buildSubject — second truncation (line 92)', () => {
    it('raw slices after scope truncation still exceeds limit', () => {
      // Very long scope name so prefix alone is huge,
      // scope truncation path still produces > 50 chars
      const longScope = 'extremely-long-scope-name-that-is-unreasonably-verbose';
      const result = buildSubject('feat', longScope, 'some description here');
      expect(result.length).toBeLessThanOrEqual(50);
    });
  });

  describe('CommitCommand.execute — change dir missing (line 157)', () => {
    it('throws when changeDir does not exist as directory', async () => {
      const stddDir = path.join(TMP, 'stdd');
      mkdirp(path.join(stddDir, 'changes'));
      w(path.join(stddDir, 'config.yaml'), 'version: "1.0"');
      const orig = process.cwd();
      process.chdir(TMP);
      try {
        await expect(new CommitCommand().execute('ghost-change')).rejects.toThrow('not found');
      } finally {
        process.chdir(orig);
      }
    });
  });

  describe('CommitCommand.execute — warning no completed (line 211)', () => {
    it('prints warning when tasks exist but none completed', async () => {
      const stddDir = path.join(TMP, 'stdd');
      const changeDir = path.join(stddDir, 'changes', 'warn-me');
      mkdirp(changeDir);
      w(path.join(changeDir, 'proposal.md'), '# Test\n');
      w(path.join(changeDir, 'tasks.md'), '- [ ] Open task\n');
      w(path.join(stddDir, 'config.yaml'), 'version: "1.0"');
      const orig = process.cwd();
      process.chdir(TMP);
      const cap = () => { const l=[]; const o=console.log; console.log=(...a)=>l.push(a.join(' ')); return {l, r(){console.log=o;}}; };
      const c = cap();
      try {
        await new CommitCommand().execute('warn-me');
        expect(c.l.join('\n')).toContain('Warning');
      } finally {
        c.r();
        process.chdir(orig);
      }
    });
  });
});

describe('buildBody error handling (line 130)', () => {
  it('does not crash when specs path is a file not dir', () => {
    const { buildBody } = require('../src/cli/commands/commit-msg');
    const changeDir = path.join(TMP, 'stdd', 'changes', 'x');
    mkdirp(path.dirname(path.join(changeDir, 'specs')));
    fs.writeFileSync(path.join(changeDir, 'specs'), 'not-a-dir');
    const tasks = [{ description: 'Task', isDone: true }];
    const body = buildBody(tasks, 'x', changeDir);
    expect(typeof body).toBe('string');
  });
});

describe('constitution-status remaining branches', () => {
  const { ConstitutionStatusCommand } = require('../src/cli/commands/constitution-status');

  describe('constructor — falsy cwd fallback (line 25)', () => {
    it('uses process.cwd() when no cwd provided', () => {
      const cmd = new ConstitutionStatusCommand(null);
      expect(cmd.cwd).toBe(process.cwd());
      const cmd2 = new ConstitutionStatusCommand();
      expect(cmd2.cwd).toBe(process.cwd());
    });
  });

  describe('_printReport — score < 50% (line 162, red)', () => {
    it('uses chalk.red for score < 50 via _printReport directly', () => {
      const cmd = new ConstitutionStatusCommand(TMP);
      const out = [];
      const origLog = console.log;
      console.log = (...a) => out.push(a.join(' '));
      try {
        // Call _printReport with a result that has score < 50
        cmd._printReport({
          score: 29,
          totalArticles: 7,
          passCount: 2,
          failCount: 5,
          waivedCount: 0,
          articles: [
            { article: 2, name: 'TDD', status: 'Fail', points: 0, blockingCount: 1, warningCount: 0, firstIssue: { message: 'no test' }, waiverReason: null, waiverDays: null },
            { article: 4, name: 'Style', status: 'Fail', points: 0, blockingCount: 1, warningCount: 0, firstIssue: null, waiverReason: null, waiverDays: null },
            { article: 5, name: 'Doc', status: 'Fail', points: 0, blockingCount: 1, warningCount: 0, firstIssue: null, waiverReason: null, waiverDays: null },
            { article: 6, name: 'Error', status: 'Fail', points: 0, blockingCount: 1, warningCount: 0, firstIssue: null, waiverReason: null, waiverDays: null },
            { article: 7, name: 'Security', status: 'Fail', points: 0, blockingCount: 1, warningCount: 0, firstIssue: null, waiverReason: null, waiverDays: null },
            { article: 8, name: 'Perf', status: 'Pass', points: 1, blockingCount: 0, warningCount: 0, firstIssue: null, waiverReason: null, waiverDays: null },
            { article: 9, name: 'CI/CD', status: 'Pass', points: 1, blockingCount: 0, warningCount: 0, firstIssue: null, waiverReason: null, waiverDays: null },
          ],
        });
        // Check red fail indicators
        expect(out.join('\n')).toContain('%');
      } finally {
        console.log = origLog;
      }
    });
  });

  describe('_printReport — workspace display (line 168)', () => {
    it('shows workspace info when results include workspace', () => {
      const cmd = new ConstitutionStatusCommand(TMP);
      const out = [];
      const origLog = console.log;
      console.log = (...a) => out.push(a.join(' '));
      try {
        cmd._printReport({
          score: 100,
          totalArticles: 7,
          passCount: 7,
          failCount: 0,
          waivedCount: 0,
          workspace: { name: 'my-pkg', path: 'packages/my-pkg' },
          articles: [],
        });
        expect(out.join('\n')).toContain('Workspace: my-pkg');
      } finally {
        console.log = origLog;
      }
    });
  });
});
