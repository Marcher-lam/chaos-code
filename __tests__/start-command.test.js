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
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-start-'));
  fs.mkdirSync(path.join(tmp, 'stdd'));
  return tmp;
}

describe('start command', () => {
  it('shows help with --help', () => {
    const tmp = setupProject();
    const result = runCli(['start', '--help'], tmp);
    expect(result.stdout).toContain('Interactive quick-start wizard');
  });
});
