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
    expect(isDangerous('rm -fr /tmp/demo')).toBe(true);
    expect(isDangerous('rm -f -r /tmp/demo')).toBe(true);
    expect(isDangerous('rm -fR /tmp/demo')).toBe(true);
    expect(isDangerous('npm test')).toBe(false);
    expect(() => validateCommand('rm -rf /tmp/demo')).toThrow('Dangerous command detected');
    expect(() => validateCommand('rm -fr /tmp/demo')).toThrow('Dangerous command detected');
  });

  test.each(['npm test && whoami', 'npm test | cat', 'npm test; whoami', 'npm test > out.txt', 'npm test `whoami`'])('rejects shell injection pattern %s', (cmd) => {
    expect(() => validateCommand(cmd)).toThrow('Potential shell injection');
  });

  test('rejects subshell pattern $(cmd) as dangerous', () => {
    expect(() => validateCommand('npm test $(whoami)')).toThrow();
  });

  test('allows environment variable references in commands', () => {
    expect(() => validateCommand('npm test $HOME')).not.toThrow();
    expect(() => validateCommand('npm test --grep=$TEST_NAME')).not.toThrow();
  });

  test('runs parsed command without shell', () => {
    const result = runCommand(`${process.execPath} -e "process.exit(0)"`, { stdio: 'pipe' });
    expect(result.status).toBe(0);
  });

  test('runs command with default options (no options passed)', () => {
    const result = runCommand(`${process.execPath} -e "process.exit(0)"`);
    expect(result.status).toBe(0);
  });

  test('runs command with all spawn options provided', () => {
    const result = runCommand(`${process.execPath} -e "process.exit(0)"`, {
      cwd: __dirname,
      stdio: 'pipe',
      env: process.env,
      timeout: 5000,
    });
    expect(result.status).toBe(0);
  });

  test('runCommand rejects falsy command via validateCommand', () => {
    expect(() => runCommand('')).toThrow('Command is required');
    expect(() => runCommand(null)).toThrow('Command is required');
    expect(() => runCommand(undefined)).toThrow('Command is required');
  });

  test('runCommand rejects dangerous command', () => {
    expect(() => runCommand('rm -rf /tmp')).toThrow('Dangerous command detected');
  });

  test('runCommand rejects shell injection', () => {
    expect(() => runCommand('npm test && whoami')).toThrow('Potential shell injection');
  });

  test('isDangerous returns false for safe commands', () => {
    expect(isDangerous('npm test')).toBe(false);
    expect(isDangerous('node script.js')).toBe(false);
    expect(isDangerous('jest --coverage')).toBe(false);
  });

  test('isDangerous detects all dangerous patterns', () => {
    expect(isDangerous('rm -r /tmp')).toBe(true);
    expect(isDangerous('del /f file.txt')).toBe(true);
    expect(isDangerous('format c:abc')).toBe(true);
    expect(isDangerous('shred secret.txt')).toBe(true);
    expect(isDangerous('mkfs.ext4 /dev/sda')).toBe(true);
    expect(isDangerous('dd if=/dev/zero of=/dev/sda')).toBe(true);
    expect(isDangerous('sudo rm -rf /')).toBe(true);
    expect(isDangerous('bash -c "ls && cat /etc/passwd"')).toBe(true);
    expect(isDangerous('eval $(whoami)')).toBe(true);
    expect(isDangerous('exec $(malicious)')).toBe(true);
    expect(isDangerous('powershell -Command Remove-Item')).toBe(true);
  });

  test('validateCommand returns true for safe commands', () => {
    expect(validateCommand('npm test')).toBe(true);
    expect(validateCommand('jest --coverage')).toBe(true);
  });

  test('validateCommand rejects append redirect', () => {
    expect(() => validateCommand('npm test >> out.txt')).toThrow('Potential shell injection');
  });

  test('validateCommand rejects redirect without ampersand', () => {
    expect(() => validateCommand('npm test > out.txt')).toThrow('Potential shell injection');
  });

  test('parseCommand parses single-word command', () => {
    expect(parseCommand('node')).toEqual({ bin: 'node', args: [] });
  });

  test('parseCommand parses command with multiple args', () => {
    expect(parseCommand('git commit -m "initial commit"')).toEqual({
      bin: 'git',
      args: ['commit', '-m', 'initial commit'],
    });
  });

  test('sandbox rejects non-allowlisted binaries', () => {
    expect(() => validateCommand('python3 script.py', { sandbox: true })).toThrow("rejected under sandbox: Binary 'python3' is not allowed");
    expect(() => validateCommand('npm test', { sandbox: true })).not.toThrow();
  });

  test('sandbox rejects destructive arguments', () => {
    expect(() => validateCommand('node index.js rm file.txt', { sandbox: true })).toThrow("rejected under sandbox: Destructive argument 'rm' is not allowed");
    expect(() => validateCommand('node index.js mkdir dirName', { sandbox: true })).toThrow("rejected under sandbox: Destructive argument 'mkdir' is not allowed");
    expect(() => validateCommand('node index.js parse file.txt', { sandbox: true })).not.toThrow();
  });
});
