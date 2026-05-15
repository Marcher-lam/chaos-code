const { parseCommand, validateCommand, isDangerous, runCommand } = require('../src/utils/command-runner');

describe('command-runner', () => {
  test('preserves quoted arguments with spaces', () => {
    expect(parseCommand('npm test -- --testNamePattern "login flow"')).toEqual({
      bin: 'npm',
      args: ['test', '--', '--testNamePattern', 'login flow'],
    });
  });

  test('supports single quoted arguments', () => {
    expect(parseCommand("node script.js 'hello world'")).toEqual({
      bin: 'node',
      args: ['script.js', 'hello world'],
    });
  });

  test('rejects unterminated quotes', () => {
    expect(() => parseCommand('npm test "broken')).toThrow('Unterminated quote');
  });

  test('rejects empty commands', () => {
    expect(() => parseCommand('   ')).toThrow('Command is required');
    expect(() => validateCommand('')).toThrow('Command is required');
  });

  test('preserves escaped characters', () => {
    expect(parseCommand('node script.js hello\\ world')).toEqual({
      bin: 'node',
      args: ['script.js', 'hello world'],
    });
  });

  test('detects dangerous destructive commands', () => {
    expect(isDangerous('rm -rf /tmp/demo')).toBe(true);
    expect(isDangerous('npm test')).toBe(false);
    expect(() => validateCommand('rm -rf /tmp/demo')).toThrow('Dangerous command detected');
  });

  test.each(['npm test && whoami', 'npm test | cat', 'npm test; whoami', 'npm test > out.txt', 'npm test `whoami`', 'npm test $HOME'])('rejects shell injection pattern %s', (cmd) => {
    expect(() => validateCommand(cmd)).toThrow('Potential shell injection');
  });

  test('runs parsed command without shell', () => {
    const result = runCommand(`${process.execPath} -e "process.exit(0)"`, { stdio: 'pipe' });
    expect(result.status).toBe(0);
  });
});
