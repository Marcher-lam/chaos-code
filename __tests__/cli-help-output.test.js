const { execFileSync } = require('child_process');
const path = require('path');

describe('CLI help output alignment', () => {
  const cliPath = path.join(__dirname, '..', 'cli.js');

  function runCli(args) {
    return execFileSync(process.execPath, [cliPath, ...args], {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8'
    });
  }

  it('skills help should include examples', () => {
    const output = runCli(['skills', '--help']);

    expect(output).toContain('Examples:');
    expect(output).toContain('stdd skills');
    expect(output).toContain('src/templates/skills/stdd/{name}/SKILL.md');
  });

  it('commands help should clarify that it lists slash commands', () => {
    const output = runCli(['commands', '--help']);

    expect(output).toContain('This command lists Claude Code slash commands');
    expect(output).toContain('stdd commands');
  });

  it('constitution help should include examples and supported actions', () => {
    const output = runCli(['constitution', '--help']);

    expect(output).toContain('stdd constitution show 2');
    expect(output).toContain('Supported: show, check');
  });

  it('constitution show 2 should print the requested article details', () => {
    const output = runCli(['constitution', 'show', '2']);

    expect(output).toContain('Article 2: TDD');
    expect(output).toContain('[Blocking]');
    expect(output.length).toBeGreaterThan(20);
  });

  it('root help should not contain duplicate command registrations', () => {
    const output = runCli(['--help']);
    const commandNames = ['spec', 'api-spec', 'contract', 'mock', 'tdd-init'];

    for (const commandName of commandNames) {
      const matches = output.match(new RegExp(`^  ${commandName.replace(':', '\\:')}\\b`, 'gm')) || [];
      expect(matches).toHaveLength(1);
    }
  });

  it('contract help should include consumer and provider options', () => {
    const output = runCli(['contract', '--help']);

    expect(output).toContain('--consumer <name>');
    expect(output).toContain('--provider <name>');
  });
});
