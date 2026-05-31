const fs = require('fs');
const path = require('path');
const os = require('os');
const { RolesCommand, ROLES, REVIEW_PATTERNS } = require('../src/cli/commands/roles');

describe('RolesCommand', () => {
  let logSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    process.exitCode = 0;
  });

  it('list returns 12 roles', () => {
    expect(ROLES).toHaveLength(12);
  });

  it('list action returns role data', () => {
    const cmd = new RolesCommand();
    const result = cmd.execute('list');
    expect(result).toHaveLength(12);
    expect(result[0].id).toBe('po');
  });

  it('list outputs JSON when json option is set', () => {
    const cmd = new RolesCommand();
    const _result = cmd.list({ json: true });

    const output = logSpy.mock.calls.map(c => c[0]).join('\n');
    const json = JSON.parse(output);
    expect(json).toHaveLength(12);
    expect(json[0].id).toBe('po');
  });

  it('adversarial throws on empty target', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-roles-'));
    const cmd = new RolesCommand(tmp);
    expect(() => cmd.execute('adversarial', ['nonexistent-dir'])).toThrow();
  });

  it('adversarial detects security patterns', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-roles-'));
    fs.writeFileSync(path.join(tmp, 'dangerous.js'), 'const password = "hardcoded";\neval("code");');
    const cmd = new RolesCommand(tmp);
    const result = cmd.execute('adversarial', ['.']);
    expect(result.findings.length).toBeGreaterThan(0);
    const securityFindings = result.findings.filter(f => f.role === 'security');
    expect(securityFindings.length).toBeGreaterThan(0);
  });

  it('adversarial sets exitCode on high severity', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-roles-'));
    fs.writeFileSync(path.join(tmp, 'dangerous.js'), 'const password = "hardcoded";');
    const cmd = new RolesCommand(tmp);
    process.exitCode = 0;
    cmd.execute('adversarial', ['.']);
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
  });

  it('adversarial reviews a single file target', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-roles-file-'));
    const singleFile = path.join(tmp, 'target.js');
    fs.writeFileSync(singleFile, 'console.log("hello");');

    const cmd = new RolesCommand(tmp);
    const result = cmd.execute('adversarial', [singleFile]);
    expect(result.filesReviewed).toBe(1);
    expect(result.findings.some(f => f.role === 'developer')).toBe(true);
  });

  it('adversarial outputs JSON when json option is set', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-roles-json-'));
    fs.writeFileSync(path.join(tmp, 'sample.js'), 'const x = 1;');
    const cmd = new RolesCommand(tmp);
    const _result = cmd.execute('adversarial', ['.'], { json: true });

    const output = logSpy.mock.calls.map(c => c[0]).join('\n');
    const json = JSON.parse(output);
    expect(json.target).toBeDefined();
    expect(json.filesReviewed).toBeGreaterThan(0);
  });

  it('adversarial handles more than 30 findings with overflow', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-roles-overflow-'));
    const lines = [];
    for (let i = 0; i < 40; i++) {
      lines.push(`const password = "secret_${i}";`);
    }
    fs.writeFileSync(path.join(tmp, 'many-secrets.js'), lines.join('\n'));
    const cmd = new RolesCommand(tmp);
    const result = cmd.execute('adversarial', ['.']);
    expect(result.findings.length).toBeGreaterThan(30);

    logSpy.mockClear();
    cmd.printAdversarial(result);
    const output = logSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('more finding');
  });

  it('party generates multi-role prompts', () => {
    const cmd = new RolesCommand();
    const result = cmd.execute('party', ['user login']);
    expect(result.topic).toBe('user login');
    expect(result.roles.length).toBeGreaterThan(0);
  });

  it('party respects --roles option', () => {
    const cmd = new RolesCommand();
    const result = cmd.execute('party', ['topic'], { roles: 'po,security' });
    expect(result.roles).toHaveLength(2);
  });

  it('party defaults topic to "current change" when no topic given', () => {
    const cmd = new RolesCommand();
    const result = cmd.execute('party', []);
    expect(result.topic).toBe('current change');
  });

  it('party outputs JSON when json option is set', () => {
    const cmd = new RolesCommand();
    cmd.execute('party', ['test topic'], { json: true });

    const output = logSpy.mock.calls.map(c => c[0]).join('\n');
    const json = JSON.parse(output);
    expect(json.topic).toBe('test topic');
    expect(json.roles).toBeDefined();
  });

  it('party text output includes role prompts', () => {
    const cmd = new RolesCommand();
    cmd.execute('party', ['deploy safety']);

    const output = logSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('Party Mode Brief');
    expect(output).toContain('deploy safety');
  });

  it('REVIEW_PATTERNS has expected entries', () => {
    expect(REVIEW_PATTERNS.length).toBeGreaterThanOrEqual(5);
    expect(REVIEW_PATTERNS.every(p => p.role && p.pattern && p.message)).toBe(true);
  });

  it('saveReport creates a file in stdd/reports', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-roles-report-'));
    const cmd = new RolesCommand(tmp);
    const outputPath = cmd.saveReport('test-report', { data: true });
    expect(outputPath).toContain('stdd/reports');
    expect(fs.existsSync(path.join(tmp, outputPath))).toBe(true);
  });

  it('review action is alias for adversarial', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-roles-alias-'));
    fs.writeFileSync(path.join(tmp, 'sample.js'), 'const x = 1;');
    const cmd = new RolesCommand(tmp);
    const result = cmd.execute('review', ['.']);
    expect(result.filesReviewed).toBeGreaterThan(0);
  });

  it('meeting action is alias for party', () => {
    const cmd = new RolesCommand();
    const result = cmd.execute('meeting', ['planning']);
    expect(result.topic).toBe('planning');
  });

  it('default action is list', () => {
    const cmd = new RolesCommand();
    const result = cmd.execute();
    expect(result).toHaveLength(12);
  });
});
