const path = require('path');
const { spawnSync } = require('child_process');

describe('CLI help output', () => {
  const cliPath = path.join(__dirname, '..', 'cli.js');

  function runCli(args) {
    const result = spawnSync(process.execPath, [cliPath, ...args], {
      encoding: 'utf8'
    });

    return {
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr
    };
  }

  it('prints common examples in root help output', () => {
    const { status, stdout, stderr } = runCli(['--help']);

    expect(status).toBe(0);
    expect(stderr).toBe('');
    expect(stdout).toContain('Common examples:');
    expect(stdout).toContain('ace list --archived');
    expect(stdout).toContain('For Claude Code slash commands: ace commands');
  });

  it('prints examples for init/list/status help output', () => {
    const initHelp = runCli(['init', '--help']);
    expect(initHelp.status).toBe(0);
    expect(initHelp.stdout).toContain('chaos init --skip-skills --yes');

    const listHelp = runCli(['list', '--help']);
    expect(listHelp.status).toBe(0);
    expect(listHelp.stdout).toContain('chaos list --archived');
    expect(listHelp.stdout).toContain('`--archived` applies to change listings');

    const statusHelp = runCli(['status', '--help']);
    expect(statusHelp.status).toBe(0);
    expect(statusHelp.stdout).toContain('chaos status add-dark-mode --json');
  });

  it('prints examples for hooks command help output', () => {
    const hooksHelp = runCli(['hooks', '--help']);
    expect(hooksHelp.status).toBe(0);
    expect(hooksHelp.stdout).toContain('chaos hooks disable --article 2');

    const disableHelp = runCli(['hooks', 'disable', '--help']);
    expect(disableHelp.status).toBe(0);
    expect(disableHelp.stdout).toContain('chaos hooks disable --article 4');
    expect(disableHelp.stdout).toContain('compatibility semantics');
  });
});
