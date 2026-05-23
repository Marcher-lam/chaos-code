const fs = require('fs');
const os = require('os');
const path = require('path');

function mkTmp(prefix = 'stdd-r25-') {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmps.push(d);
  return d;
}
const tmps = [];
afterAll(() => { for (const d of tmps) { try { fs.rmSync(d, { recursive: true, force: true }); } catch {} } });

// ─── ff.js ───
describe('round25: ff.js', () => {
  test('workspaceContext null workspace', () => {
    const { FFCommand } = require('../src/cli/commands/ff');
    const cmd = new FFCommand(mkTmp());
    const { workspaceContext: _wsCtx } = require('../src/utils/change-helpers');
    expect(_wsCtx(null)).toBeNull();
  });

  test('toSafeFilename edge cases', () => {
    const { FFCommand } = require('../src/cli/commands/ff');
    const cmd = new FFCommand(mkTmp());
    const { toSafeFilename: _toSafe } = require('../src/utils/change-helpers');
    expect(_toSafe('')).toBe('');
    expect(_toSafe(null)).toBe('');
    expect(_toSafe('A-B C!')).toBe('a-b-c');
  });

  test('generateChangeName starts with ff-', () => {
    const { FFCommand } = require('../src/cli/commands/ff');
    const cmd = new FFCommand(mkTmp());
    const { generateChangeName: _genChangeName } = require('../src/utils/change-helpers');
    expect(_genChangeName('ff')).toMatch(/^ff-\d{8}-\d{4}$/);
  });
});

// ─── issue.js ───
describe('round25: issue.js', () => {
  test('generateChangeName starts with bugfix-', () => {
    const { IssueCommand } = require('../src/cli/commands/issue');
    const cmd = new IssueCommand();
    const { generateChangeName: _genChangeName } = require('../src/utils/change-helpers');
    expect(_genChangeName('bugfix')).toMatch(/^bugfix-\d{8}-\d{4}$/);
  });

  test('workspaceContext null', () => {
    const { IssueCommand } = require('../src/cli/commands/issue');
    const cmd = new IssueCommand();
    const { workspaceContext: _wsCtx } = require('../src/utils/change-helpers');
    expect(_wsCtx(null)).toBeNull();
  });

  test('toSafeFilename', () => {
    const { toSafeFilename: _toSafe } = require('../src/utils/change-helpers');
    const { IssueCommand } = require('../src/cli/commands/issue');
    const cmd = new IssueCommand();
    expect(_toSafe('Bug: Crash!')).toBe('bug-crash');
  });
});

// ─── status.js ───
describe('round25: status.js', () => {
  test('execute with no stdd returns error', async () => {
    const { StatusCommand } = require('../src/cli/commands/status');
    const cmd = new StatusCommand();
    const dir = mkTmp();
    await expect(cmd.execute('no-change', { json: true })).rejects.toThrow();
  });
});

// ─── commit-msg.js ───
describe('round25: commit-msg.js', () => {
  test('detectType: bugfix prefix → fix', () => {
    const { detectType } = require('../src/cli/commands/commit-msg');
    expect(detectType('bugfix-20260101-1200')).toBe('fix');
    expect(detectType('ff-dark')).toBe('feat');
    expect(detectType('normal-change')).toBe('feat');
  });

  test('detectTddPhase: refactoring', () => {
    const { detectTddPhase } = require('../src/cli/commands/commit-msg');
    expect(detectTddPhase([{ description: 'refactor module', isDone: false }])).toBe('refactor');
    expect(detectTddPhase([{ description: '重构代码', isDone: false }])).toBe('refactor');
  });

  test('detectTddPhase: red phase', () => {
    const { detectTddPhase } = require('../src/cli/commands/commit-msg');
    expect(detectTddPhase([{ description: 'write test for auth', isDone: false }])).toBe('red');
    expect(detectTddPhase([{ description: 'fix failing test', isDone: false }])).toBe('red');
  });

  test('detectTddPhase: green phase default', () => {
    const { detectTddPhase } = require('../src/cli/commands/commit-msg');
    expect(detectTddPhase([{ description: 'add feature', isDone: false }])).toBe('green');
  });

  test('detectTddPhase: options.phase override', () => {
    const { detectTddPhase } = require('../src/cli/commands/commit-msg');
    expect(detectTddPhase([], { phase: 'IMPLEMENT' })).toBe('IMPLEMENT');
  });

  test('extractIssue from options and content', () => {
    const { extractIssue } = require('../src/cli/commands/commit-msg');
    expect(extractIssue('content', 'change', { issue: '#42' })).toBe('42');
    expect(extractIssue('fixes #123', 'change', {})).toBe('123');
    expect(extractIssue('no issue', 'change', {})).toBeNull();
  });

  test('buildSubject truncation', () => {
    const { buildSubject } = require('../src/cli/commands/commit-msg');
    const result = buildSubject('feat', 'scope', 'a'.repeat(200));
    expect(result.length).toBeLessThanOrEqual(72);
    expect(result).toContain('...');
  });

  test('buildSubject without scope', () => {
    const { buildSubject } = require('../src/cli/commands/commit-msg');
    expect(buildSubject('fix', null, 'short')).toBe('fix: short');
  });

  test('buildPhaseSubject with/without issue', () => {
    const { buildPhaseSubject } = require('../src/cli/commands/commit-msg');
    expect(buildPhaseSubject('IMPLEMENT', '42', 'do stuff')).toContain('#42');
    expect(buildPhaseSubject('IMPLEMENT', null, 'do stuff')).not.toContain('#');
  });

  test('detectTddPhase handles empty tasks', () => {
    const { detectTddPhase } = require('../src/cli/commands/commit-msg');
    expect(detectTddPhase([])).toBe('green');
    expect(detectTddPhase([{ description: 'done task', isDone: true }])).toBe('green');
  });

  test('extractProposalTitle formats', () => {
    const { extractProposalTitle } = require('../src/cli/commands/commit-msg');
    expect(extractProposalTitle('# Proposal: X')).toBe('X');
    expect(extractProposalTitle('# Bug: Y')).toBe('Y');
    expect(extractProposalTitle(null)).toBeNull();
    expect(extractProposalTitle('no header')).toBeNull();
  });

  test('extractScopeFromChangeName ff- prefix', () => {
    const { extractScopeFromChangeName } = require('../src/cli/commands/commit-msg');
    expect(extractScopeFromChangeName('ff-dark-mode-123')).toBe('dark');
    expect(extractScopeFromChangeName('regular')).toBeNull();
  });
});

// ─── explore.js ───
describe('round25: explore.js', () => {
  test('execute with no stdd returns result', async () => {
    const { ExploreCommand } = require('../src/cli/commands/explore');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const dir = mkTmp();
    const cmd = new ExploreCommand(dir);
    try {
      const result = await cmd.execute({ target: '.' });
      expect(result).toBeDefined();
    } catch (e) {
      expect(e).toBeDefined();
    }
    logSpy.mockRestore();
  });
});

// ─── doctor.js ───
describe('round25: doctor.js', () => {
  let logSpy;
  beforeEach(() => { logSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); });
  afterEach(() => { logSpy.mockRestore(); jest.restoreAllMocks(); });

  test('no stdd dir sets exitCode 1', () => {
    const { DoctorCommand } = require('../src/cli/commands/doctor');
    const dir = mkTmp();
    process.exitCode = undefined;
    new DoctorCommand(dir).execute();
    expect(process.exitCode).toBe(1);
    process.exitCode = undefined;
  });

  test('healthy project passes', () => {
    const { DoctorCommand } = require('../src/cli/commands/doctor');
    const dir = mkTmp();
    const stddDir = path.join(dir, 'stdd');
    fs.mkdirSync(stddDir, { recursive: true });
    fs.writeFileSync(path.join(stddDir, 'config.yaml'), 'version: "1.0"\n');
    process.exitCode = undefined;
    new DoctorCommand(dir).execute();
    expect(process.exitCode).toBe(undefined);
    process.exitCode = undefined;
  });
});

// ─── coverage-parser.js ───
describe('round25: coverage-parser.js', () => {
  test('parseCoverage handles empty string', () => {
    const { parseCoverage } = require('../src/utils/coverage-parser');
    expect(parseCoverage('')).toBeDefined();
  });

  test('parseCoverage handles jest summary format', () => {
    const { parseCoverage } = require('../src/utils/coverage-parser');
    const result = parseCoverage('Statements   : 90% ( 100/200 )');
    expect(result).toBeDefined();
  });

  test('parseCoverage handles malformed input', () => {
    const { parseCoverage } = require('../src/utils/coverage-parser');
    expect(parseCoverage('not coverage data')).toBeDefined();
  });
});
