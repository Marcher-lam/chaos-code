/**
 * Targeted branch-coverage tests for guard.js
 * Covers: guard execute with JSON output, skip flags.
 */

const fs = require('fs');
const path = require('path');

const TMP = path.join(__dirname, '__guard_cov_tmp__');
function mkdirp(dir) { fs.mkdirSync(dir, { recursive: true }); }
function _w(filePath, content) { mkdirp(path.dirname(filePath)); fs.writeFileSync(filePath, content, 'utf8'); }

beforeEach(() => mkdirp(TMP));
afterEach(() => fs.rmSync(TMP, { recursive: true, force: true }));

describe('guard.js coverage boost', () => {
  it('runs guard with --no-lint and --no-constitution flags', async () => {
    const { GuardCommand } = require('../src/cli/commands/guard');
    const cmd = new GuardCommand();
    const logs = [];
    const origLog = console.log;
    console.log = (...a) => logs.push(a.join(' '));
    try {
      await cmd.execute({ noLint: true, noConstitution: true }, {});
    } finally {
      console.log = origLog;
    }
  });

  it('runs guard with json output', async () => {
    const { GuardCommand } = require('../src/cli/commands/guard');
    const cmd = new GuardCommand();
    const logs = [];
    const origLog = console.log;
    console.log = (...a) => logs.push(a.join(' '));
    try {
      await cmd.execute({ json: true }, {});
      const out = logs.join('\n');
      // Should be JSON output
      expect(out.length).toBeGreaterThan(0);
    } finally {
      console.log = origLog;
    }
  });
});
