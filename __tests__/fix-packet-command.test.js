const fs = require('fs');
const path = require('path');
const os = require('os');
const { FixPacketCommand } = require('../src/cli/commands/fix-packet');

function setupChange(name = 'test-change') {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-fix-packet-'));
  const stddDir = path.join(tmp, 'stdd');
  const changeDir = path.join(stddDir, 'changes', name);
  fs.mkdirSync(changeDir, { recursive: true });
  fs.mkdirSync(path.join(changeDir, 'specs'), { recursive: true });
  fs.mkdirSync(path.join(changeDir, 'evidence'), { recursive: true });
  fs.writeFileSync(path.join(changeDir, 'proposal.md'), '# Proposal\nTest proposal');
  fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [ ] Task 1\n- [x] Task 2');
  fs.writeFileSync(path.join(changeDir, 'specs', 'test.feature'), 'Feature: Test\n  Scenario: Hello\n    Given x\n    When y\n    Then z');
  return { tmp, changeDir, stddDir, name };
}

describe('FixPacketCommand', () => {
  it('throws when stdd dir missing', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-fix-packet-nostdd-'));
    expect(() => new FixPacketCommand(tmp).execute('x')).toThrow();
  });

  it('throws when change not found', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-fix-packet-nochange-'));
    fs.mkdirSync(path.join(tmp, 'stdd', 'changes'), { recursive: true });
    expect(() => new FixPacketCommand(tmp).execute('nonexistent')).toThrow();
  });

  it('builds packet with proposal and tasks', () => {
    const { tmp, name } = setupChange();
    const result = new FixPacketCommand(tmp).execute(name, { silent: true });
    expect(result.status).toBe('needs-fix');
    expect(result.change).toBe(name);
    expect(result.output).toMatch(/fix-packet-.*\.md/);
    expect(result.jsonOutput).toMatch(/fix-packet-.*\.json/);
  });

  it('writes JSON and MD files to evidence dir', () => {
    const { tmp, name, changeDir } = setupChange();
    new FixPacketCommand(tmp).execute(name, { silent: true });
    const evidenceFiles = fs.readdirSync(path.join(changeDir, 'evidence'));
    expect(evidenceFiles.some(f => f.endsWith('.json'))).toBe(true);
    expect(evidenceFiles.some(f => f.endsWith('.md'))).toBe(true);
  });

  it('includes evidence files in packet', () => {
    const { tmp, name, changeDir } = setupChange();
    fs.writeFileSync(path.join(changeDir, 'evidence', 'apply-result.json'), JSON.stringify({ ok: true }));
    const result = new FixPacketCommand(tmp).execute(name, { silent: true });
    expect(result.evidenceFiles.length).toBeGreaterThan(0);
  });

  it('generates valid JSON output', () => {
    const { tmp, name } = setupChange();
    const result = new FixPacketCommand(tmp).execute(name, { silent: true });
    const jsonPath = path.join(tmp, result.jsonOutput);
    const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    expect(json.change).toBe(name);
    expect(json.generatedAt).toBeDefined();
  });
});
