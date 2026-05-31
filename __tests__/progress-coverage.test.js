/**
 * Branch-coverage tests for src/cli/commands/progress.js
 *
 * Covers:
 *  - Lines 36-41: summary with incomplete commands (s.incomplete > 0, with/without ctx)
 *  - Line 41: lastActivity branch in summary
 *  - Lines 47-48: _resume !ctx and opts.json branches
 *  - Lines 52-53: resume ctx with start.args and ctx.failed
 *  - Line 66: _resumeHint constitution fix with/without article
 *  - Line 78: constitution fix article branch
 *  - Line 81: 'new' command resume with/without change name
 *  - Line 84: 'ff' command resume with/without change description
 *  - Lines 100, 102-103: history entries with err, unknown event, changeName
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

jest.mock('chalk', () => {
  const fn = (...args) => args.join('');
  fn.bold = fn;
  fn.green = fn;
  fn.yellow = fn;
  fn.red = fn;
  fn.cyan = fn;
  fn.blue = fn;
  fn.dim = fn;
  return fn;
});

const { ProgressCommand } = require('../src/cli/commands/progress');
const { SessionProgress } = require('../src/utils/session-progress');

function makeTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-prog-cov-'));
}

function makeStdd(root) {
  const stdd = path.join(root, 'stdd');
  fs.mkdirSync(stdd, { recursive: true });
  return stdd;
}

function writeEntry(stddDir, entry) {
  const fp = path.join(stddDir, 'progress.jsonl');
  fs.appendFileSync(fp, JSON.stringify(entry) + '\n', 'utf8');
}

function getOutput(logSpy) {
  return logSpy.mock.calls.map(c => c.join('')).join('\n');
}

describe('ProgressCommand branch coverage', () => {
  let cmd;
  let logSpy;
  let origCwd;

  beforeEach(() => {
    cmd = new ProgressCommand();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    origCwd = process.cwd;
  });

  afterEach(() => {
    logSpy.mockRestore();
    process.cwd = origCwd;
    process.exitCode = 0;
  });

  // ---------------------------------------------------------------------------
  // Lines 36-41: Summary with incomplete commands
  // ---------------------------------------------------------------------------
  describe('_summary incomplete branches', () => {
    it('prints incomplete hint when s.incomplete > 0 and ctx exists (line 39)', () => {
      const root = makeTmp();
      const stdd = makeStdd(root);
      const p = new SessionProgress(stdd);
      // Start an entry but do not complete/fail it => incomplete
      p.start('apply', { change: 'feat-x' });
      process.cwd = () => root;

      cmd._summary(p, {});

      const output = getOutput(logSpy);
      expect(output).toContain('incomplete');
      expect(output).toContain('Last: apply');     // ctx exists => line 39
      expect(output).toContain('stdd progress --resume');
    });

    it('prints incomplete hint but no "Last:" when ctx is null (line 39 if-branch false)', () => {
      const root = makeTmp();
      const stdd = makeStdd(root);
      const p = new SessionProgress(stdd);
      // Write a start entry directly then a complete for a different id,
      // then another start that getResumeContext won't find because summary
      // counts it incomplete but findLastIncomplete won't match.
      // Actually, let's just use the real flow: start an entry, then manually
      // append a "complete" with a different id so the start is incomplete
      // but findLastIncomplete walks backwards and picks the complete.
      // Better approach: just test via _summary with a mock.
      const _origGetResumeContext = p.getResumeContext.bind(p);
      p.getResumeContext = jest.fn().mockReturnValue(null);
      // Make summary report incomplete > 0
      const _origSummary = p.summary.bind(p);
      p.summary = jest.fn().mockReturnValue({
        total: 1, completed: 0, failed: 0, interrupted: 0,
        incomplete: 1, lastActivity: null,
      });

      process.cwd = () => root;
      cmd._summary(p, {});

      const output = getOutput(logSpy);
      expect(output).toContain('incomplete');
      expect(output).not.toContain('Last:');
      // Also covers line 41 false branch (no lastActivity)
      expect(output).not.toContain('Last activity');
    });

    it('prints lastActivity when present (line 41)', () => {
      const root = makeTmp();
      const stdd = makeStdd(root);
      const p = new SessionProgress(stdd);
      p.summary = jest.fn().mockReturnValue({
        total: 1, completed: 1, failed: 0, interrupted: 0,
        incomplete: 0, lastActivity: '2026-05-19T12:00:00.000Z',
      });

      process.cwd = () => root;
      cmd._summary(p, {});

      const output = getOutput(logSpy);
      expect(output).toContain('Last activity');
      expect(output).toContain('2026-05-19');
    });

    it('returns JSON when opts.json is true (line 30)', () => {
      const root = makeTmp();
      const stdd = makeStdd(root);
      const p = new SessionProgress(stdd);
      const entry = p.start('init');
      p.complete(entry.id);
      process.cwd = () => root;

      cmd._summary(p, { json: true });

      const output = getOutput(logSpy);
      const json = JSON.parse(output);
      expect(json.completed).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Lines 47-48: _resume branches
  // ---------------------------------------------------------------------------
  describe('_resume branches', () => {
    it('prints "No incomplete commands" when ctx is null (line 47)', () => {
      const root = makeTmp();
      const stdd = makeStdd(root);
      const p = new SessionProgress(stdd);
      // Empty progress file => no incomplete
      process.cwd = () => root;

      cmd._resume(p, {});

      const output = getOutput(logSpy);
      expect(output).toContain('No incomplete');
    });

    it('prints JSON when opts.json is true and ctx exists (line 48)', () => {
      const root = makeTmp();
      const stdd = makeStdd(root);
      const p = new SessionProgress(stdd);
      p.start('apply', { change: 'feat-a' });
      process.cwd = () => root;

      cmd._resume(p, { json: true });

      const output = getOutput(logSpy);
      const json = JSON.parse(output);
      expect(json.start.cmd).toBe('apply');
      expect(json.start.args.change).toBe('feat-a');
    });
  });

  // ---------------------------------------------------------------------------
  // Lines 52-53: Resume context with args and failed
  // ---------------------------------------------------------------------------
  describe('_resume with args and failed state', () => {
    it('prints args when ctx.start.args exists (line 52)', () => {
      const root = makeTmp();
      const stdd = makeStdd(root);
      const p = new SessionProgress(stdd);
      p.start('verify', { change: 'feat-args', extra: true });
      process.cwd = () => root;

      cmd._resume(p, {});

      const output = getOutput(logSpy);
      expect(output).toContain('Args:');
      expect(output).toContain('change');
    });

    it('prints failed detail when ctx.failed is true (line 53)', () => {
      const root = makeTmp();
      const stdd = makeStdd(root);
      const p = new SessionProgress(stdd);
      const entry = p.start('apply', { change: 'feat-fail' });
      p.fail(entry.id, 'Something went wrong');
      // Now start another incomplete entry so getResumeContext finds an incomplete
      // Actually, the fail marks entry.id as done, so we need a new incomplete start
      // But we want ctx.failed to be true. Let's create: start1, fail for start1 (different id),
      // then start2 incomplete.
      // Wait - let me re-read getResumeContext. It finds the last incomplete start.
      // If start1 is failed, it's not incomplete. So ctx.failed won't be true for an incomplete.
      // Actually, looking at getResumeContext more carefully:
      //   const fail = entries.find(e => e.id === inc.id && e.ev === 'fail');
      //   return { ..., failed: !!fail, failureDetail: fail || null };
      // So for ctx.failed to be true, the incomplete entry must also have a fail event.
      // But findLastIncomplete only returns entries where !done.has(e.id).
      // And done is populated by complete/fail/interrupt events.
      // So if there's a fail for the same id, it's in done, and it won't be returned as incomplete.
      //
      // This means ctx.failed=true requires a scenario where:
      // - A start has a fail event (so it's in done)
      // - But somehow it's still returned as incomplete
      // That's contradictory in the real SessionProgress.
      //
      // Let me directly test _resume with a mocked p that returns a context with failed=true.
      const mockCtx = {
        start: { cmd: 'apply', ts: '2026-05-19T10:00:00.000Z', args: { change: 'feat-fail' } },
        checkpoints: [],
        failed: true,
        failureDetail: { err: 'Something went wrong' },
      };
      p.getResumeContext = jest.fn().mockReturnValue(mockCtx);
      process.cwd = () => root;

      cmd._resume(p, {});

      const output = getOutput(logSpy);
      expect(output).toContain('Failed:');
      expect(output).toContain('Something went wrong');
    });

    it('prints "unknown" when failed but no err message (line 53 fallback)', () => {
      const root = makeTmp();
      const stdd = makeStdd(root);
      const p = new SessionProgress(stdd);
      const mockCtx = {
        start: { cmd: 'apply', ts: '2026-05-19T10:00:00.000Z', args: undefined },
        checkpoints: [],
        failed: true,
        failureDetail: null,
      };
      p.getResumeContext = jest.fn().mockReturnValue(mockCtx);
      process.cwd = () => root;

      cmd._resume(p, {});

      const output = getOutput(logSpy);
      expect(output).toContain('Failed:');
      expect(output).toContain('unknown');
    });

    it('does not print args when ctx.start.args is missing', () => {
      const root = makeTmp();
      const stdd = makeStdd(root);
      const p = new SessionProgress(stdd);
      const mockCtx = {
        start: { cmd: 'guard', ts: '2026-05-19T10:00:00.000Z' },
        checkpoints: [],
        failed: false,
        failureDetail: null,
      };
      p.getResumeContext = jest.fn().mockReturnValue(mockCtx);
      process.cwd = () => root;

      cmd._resume(p, {});

      const output = getOutput(logSpy);
      expect(output).not.toContain('Args:');
    });
  });

  // ---------------------------------------------------------------------------
  // Lines 66, 78: constitution fix with/without article
  // ---------------------------------------------------------------------------
  describe('_resumeHint constitution fix', () => {
    it('returns constitution fix with article (line 78)', () => {
      const result = cmd._resumeHint({ start: { cmd: 'constitution', args: { action: 'fix', article: '3' } } });
      expect(result).toBe('stdd constitution fix --article 3');
    });

    it('returns constitution fix without article (line 78 false branch)', () => {
      const result = cmd._resumeHint({ start: { cmd: 'constitution', args: { action: 'fix' } } });
      expect(result).toBe('stdd constitution fix');
    });
  });

  // ---------------------------------------------------------------------------
  // Line 81: 'new' command resume
  // ---------------------------------------------------------------------------
  describe('_resumeHint new command', () => {
    it('returns new change with change name', () => {
      const result = cmd._resumeHint({ start: { cmd: 'new', args: { change: 'add-logging' } } });
      expect(result).toBe('stdd new change add-logging');
    });

    it('returns new change with changeName', () => {
      const result = cmd._resumeHint({ start: { cmd: 'new', args: { changeName: 'add-auth' } } });
      expect(result).toBe('stdd new change add-auth');
    });

    it('returns new change with placeholder when no change name', () => {
      const result = cmd._resumeHint({ start: { cmd: 'new', args: {} } });
      expect(result).toBe('stdd new change <name>');
    });
  });

  // ---------------------------------------------------------------------------
  // Line 84: 'ff' command resume
  // ---------------------------------------------------------------------------
  describe('_resumeHint ff command', () => {
    it('returns ff with change description', () => {
      const result = cmd._resumeHint({ start: { cmd: 'ff', args: { change: 'deploy-hotfix' } } });
      expect(result).toBe('stdd ff deploy-hotfix');
    });

    it('returns ff with changeName', () => {
      const result = cmd._resumeHint({ start: { cmd: 'ff', args: { changeName: 'my-ff' } } });
      expect(result).toBe('stdd ff my-ff');
    });

    it('returns ff with placeholder when no description', () => {
      const result = cmd._resumeHint({ start: { cmd: 'ff', args: {} } });
      expect(result).toBe('stdd ff <description>');
    });
  });

  // ---------------------------------------------------------------------------
  // Lines 100, 102-103: History entries with various fields
  // ---------------------------------------------------------------------------
  describe('_history entry variations', () => {
    it('prints entry with err field (line 102)', () => {
      const root = makeTmp();
      const stdd = makeStdd(root);
      const p = new SessionProgress(stdd);
      const entry = p.start('verify', { change: 'feat-err' });
      p.fail(entry.id, 'test exploded');
      process.cwd = () => root;

      cmd._history(p, {});

      const output = getOutput(logSpy);
      expect(output).toContain('test exploded');
    });

    it('prints unknown event type as dot (line 103 fallback)', () => {
      const root = makeTmp();
      const stdd = makeStdd(root);
      // Write a raw entry with an unknown event type
      writeEntry(stdd, {
        id: 'unknown-ev-1',
        ts: '2026-05-19T10:30:00.000Z',
        ev: 'unknown_event',
        cmd: 'mystery',
        args: {},
      });
      const p = new SessionProgress(stdd);
      process.cwd = () => root;

      cmd._history(p, {});

      const output = getOutput(logSpy);
      // The unknown event type should use the fallback '·' character
      expect(output).toContain('mystery');
      // The line starts with '·' for unknown events
      const lines = output.split('\n').filter(l => l.includes('mystery'));
      expect(lines.length).toBeGreaterThan(0);
      expect(lines[0].trim()[0]).toBe('·'); // middle dot
    });

    it('prints entry with changeName in brackets (line 101 changeName branch)', () => {
      const root = makeTmp();
      const stdd = makeStdd(root);
      writeEntry(stdd, {
        id: 'cn-1',
        ts: '2026-05-19T11:00:00.000Z',
        ev: 'start',
        cmd: 'apply',
        args: { changeName: 'via-changeName' },
      });
      const p = new SessionProgress(stdd);
      process.cwd = () => root;

      cmd._history(p, {});

      const output = getOutput(logSpy);
      expect(output).toContain('[via-changeName]');
    });

    it('prints entry without change or changeName (line 101 both undefined)', () => {
      const root = makeTmp();
      const stdd = makeStdd(root);
      writeEntry(stdd, {
        id: 'no-change-1',
        ts: '2026-05-19T11:00:00.000Z',
        ev: 'start',
        cmd: 'init',
        args: {},
      });
      const p = new SessionProgress(stdd);
      process.cwd = () => root;

      cmd._history(p, {});

      const output = getOutput(logSpy);
      expect(output).toContain('init');
      // Should not contain brackets since no change/changeName
      const initLine = output.split('\n').find(l => l.includes('init') && !l.includes('Progress'));
      expect(initLine).not.toContain('[');
    });

    it('prints entry without ts field (line 100 empty string fallback)', () => {
      const root = makeTmp();
      const stdd = makeStdd(root);
      writeEntry(stdd, {
        id: 'no-ts-1',
        ev: 'start',
        cmd: 'init',
        args: {},
      });
      const p = new SessionProgress(stdd);
      process.cwd = () => root;

      cmd._history(p, {});

      const output = getOutput(logSpy);
      expect(output).toContain('init');
    });

    it('prints entries with --json flag (line 96)', () => {
      const root = makeTmp();
      const stdd = makeStdd(root);
      const p = new SessionProgress(stdd);
      p.start('init');
      process.cwd = () => root;

      cmd._history(p, { json: true });

      const output = getOutput(logSpy);
      const json = JSON.parse(output);
      expect(json[0].ev).toBe('start');
    });

    it('prints no progress when entries empty (line 95)', () => {
      const root = makeTmp();
      const stdd = makeStdd(root);
      const p = new SessionProgress(stdd);
      process.cwd = () => root;

      cmd._history(p, {});

      const output = getOutput(logSpy);
      expect(output).toContain('No progress recorded');
    });

    it('respects --last option (line 93)', () => {
      const root = makeTmp();
      const stdd = makeStdd(root);
      const p = new SessionProgress(stdd);
      // Create 5 entries
      for (let i = 0; i < 5; i++) {
        p.start(`cmd-${i}`);
      }
      process.cwd = () => root;

      cmd._history(p, { last: '3' });

      const output = getOutput(logSpy);
      // Should show "last 3" in header
      expect(output).toContain('last 3');
      // Should contain cmd-2, cmd-3, cmd-4 but not cmd-0, cmd-1
      expect(output).toContain('cmd-4');
      expect(output).toContain('cmd-3');
      expect(output).toContain('cmd-2');
    });
  });
});
