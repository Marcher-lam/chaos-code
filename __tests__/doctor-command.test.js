const fs = require('fs');
const path = require('path');
const os = require('os');

const cliPath = path.join(__dirname, '..', 'cli.js');

function runCli(args, cwd) {
  const { spawnSync } = require('child_process');
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, CI: '1' },
  });
}

function setupProject() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-doctor-'));
  fs.mkdirSync(path.join(tmp, 'stdd'));
  fs.mkdirSync(path.join(tmp, 'stdd', 'changes'));
  fs.mkdirSync(path.join(tmp, 'stdd', 'specs'));
  fs.writeFileSync(path.join(tmp, 'stdd', 'config.yaml'), 'test:\n  command: "npm test"\n');
  fs.writeFileSync(path.join(tmp, 'AGENTS.md'), '# AGENTS');
  fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ name: 'test' }));
  return tmp;
}

describe('doctor command', () => {
  it('reports pass for healthy project', () => {
    const tmp = setupProject();
    const result = runCli(['doctor', '--json'], tmp);
    const checks = JSON.parse(result.stdout);
    expect(checks.some(c => c.id === 'stddDir' && c.status === 'pass')).toBe(true);
    expect(checks.some(c => c.id === 'configYaml' && c.status === 'pass')).toBe(true);
    expect(checks.some(c => c.id === 'nodeVersion' && c.status === 'pass')).toBe(true);
  });

  it('reports fail when stdd dir is missing', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-doctor-nostdd-'));
    const result = runCli(['doctor', '--json'], tmp);
    const checks = JSON.parse(result.stdout);
    expect(checks.some(c => c.id === 'stddDir' && c.status === 'fail')).toBe(true);
  });

  it('exits non-zero on failures', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-doctor-fail-'));
    const result = runCli(['doctor', '--json'], tmp);
    expect(result.status).not.toBe(0);
  });

  it('prints human-readable output without --json', () => {
    const tmp = setupProject();
    const result = runCli(['doctor'], tmp);
    expect(result.stdout).toContain('STDD Copilot Doctor');
    expect(result.stdout).toContain('config.yaml');
  });
});
