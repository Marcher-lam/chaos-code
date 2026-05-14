const fs = require('fs');
const path = require('path');
const os = require('os');
const { RolesCommand, ROLES, REVIEW_PATTERNS } = require('../src/cli/commands/roles');

describe('RolesCommand', () => {
  it('list returns 12 roles', () => {
    expect(ROLES).toHaveLength(12);
  });

  it('list action returns role data', () => {
    const cmd = new RolesCommand();
    const result = cmd.execute('list');
    expect(result).toHaveLength(12);
    expect(result[0].id).toBe('po');
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

  it('REVIEW_PATTERNS has expected entries', () => {
    expect(REVIEW_PATTERNS.length).toBeGreaterThanOrEqual(5);
    expect(REVIEW_PATTERNS.every(p => p.role && p.pattern && p.message)).toBe(true);
  });
});
