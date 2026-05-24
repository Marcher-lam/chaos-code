/**
 * Targeted branch-coverage tests for validate.js
 */

const fs = require('fs');
const path = require('path');

const TMP = path.join(__dirname, '__validate_cov_tmp__');
function mkdirp(dir) { fs.mkdirSync(dir, { recursive: true }); }
function w(filePath, content) { mkdirp(path.dirname(filePath)); fs.writeFileSync(filePath, content, 'utf8'); }

beforeEach(() => mkdirp(TMP));
afterEach(() => fs.rmSync(TMP, { recursive: true, force: true }));

describe('validate.js coverage boost', () => {
  it('throws when stdd not initialized', () => {
    const { ValidateCommand } = require('../src/cli/commands/validate');
    const cmd = new ValidateCommand(TMP);
    expect(() => cmd.execute(null, {})).toThrow('STDD not initialized');
  });

  it('validates all specs when no changeName provided', () => {
    mkdirp(path.join(TMP, 'stdd', 'changes'));
    mkdirp(path.join(TMP, 'stdd', 'specs'));
    w(path.join(TMP, 'stdd', 'config.yaml'), 'version: "1.0"\nname: test\n');
    w(path.join(TMP, 'stdd', 'specs', 'example.feature'), 'Feature: Example\n  Scenario: Test\n    Given something\n');
    const { ValidateCommand } = require('../src/cli/commands/validate');
    const cmd = new ValidateCommand(TMP);
    const logs = [];
    const origLog = console.log;
    console.log = (...a) => logs.push(a.join(' '));
    try {
      const result = cmd.execute(null, { json: true });
      expect(result.status).toBe('pass');
    } finally {
      console.log = origLog;
    }
  });

  it('throws when change not found', () => {
    mkdirp(path.join(TMP, 'stdd', 'changes'));
    mkdirp(path.join(TMP, 'stdd', 'specs'));
    w(path.join(TMP, 'stdd', 'config.yaml'), 'version: "1.0"\nname: test\n');
    const { ValidateCommand } = require('../src/cli/commands/validate');
    const cmd = new ValidateCommand(TMP);
    expect(() => cmd.execute('nonexistent', {})).toThrow('not found');
  });

  it('throws when specs directory missing', () => {
    mkdirp(path.join(TMP, 'stdd', 'changes'));
    w(path.join(TMP, 'stdd', 'config.yaml'), 'version: "1.0"\nname: test\n');
    const { ValidateCommand } = require('../src/cli/commands/validate');
    const cmd = new ValidateCommand(TMP);
    expect(() => cmd.execute(null, {})).toThrow('No stdd/specs directory');
  });
});
