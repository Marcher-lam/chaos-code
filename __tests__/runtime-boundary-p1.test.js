const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const { BrowserDoctor, detectPackageManager, installCommandFor } = require('../src/runtime/browser-doctor');
const { normalizeMutationResult } = require('../src/runtime/mutation/normalizer');
const { NoopAgentExecutor, ShellAgentExecutor, createAgentExecutor } = require('../src/runtime/agents');
const { SudoExecutor } = require('../src/runtime/sudolang-executor');

function tempProject(prefix = 'stdd-p1-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

describe('P1 runtime boundary implementations', () => {
  test('browser doctor detects package manager and suggests install command', () => {
    const root = tempProject('stdd-browser-doctor-');
    fs.writeFileSync(path.join(root, 'pnpm-lock.yaml'), 'lockfileVersion: 9');

    expect(detectPackageManager(root)).toBe('pnpm');
    expect(installCommandFor('pnpm')).toBe('pnpm add -D playwright');

    const result = new BrowserDoctor(root).check();
    expect(result.status).toBe('fail');
    expect(result.suggestions).toEqual(expect.arrayContaining(['pnpm add -D playwright', 'npx playwright install']));
  });

  test('mutation normalizer emits stable evidence schema with legacy score fields', () => {
    const normalized = normalizeMutationResult({ score: 82.5, status: 'pass', killed: 19, survived: 4 }, {
      cwd: '/repo',
      mode: 'stryker',
      tool: 'stryker',
      threshold: 80,
      unixTimestamp: 1000,
      changeName: 'demo',
    });

    expect(normalized).toEqual(expect.objectContaining({
      type: 'mutation',
      schemaVersion: 1,
      tool: 'stryker',
      mode: 'stryker',
      status: 'pass',
      score: 82.5,
      mutationScore: 82.5,
      threshold: 80,
      killed: 19,
      survived: 4,
      changeName: 'demo',
    }));
  });

  test('agent executor factory supports noop adapter', async () => {
    const executor = createAgentExecutor('noop');
    expect(executor).toBeInstanceOf(NoopAgentExecutor);

    const result = await executor.run({ role: 'architect', goal: 'design checkout' });
    expect(result).toEqual(expect.objectContaining({
      status: 'success',
      adapter: 'noop',
      role: 'architect',
    }));
    expect(result.output).toContain('design checkout');
  });

  test('shell agent executor passes request payload over stdin', async () => {
    const executor = new ShellAgentExecutor({ command: `${process.execPath} -e "process.stdin.on('data', d => { const r = JSON.parse(d); console.log(r.role + ':' + r.goal); })"` });
    const result = await executor.run({ role: 'qa', goal: 'find edge cases' });

    expect(result.status).toBe('success');
    expect(result.output).toBe('qa:find edge cases');
  });

  test('shell agent executor does not evaluate shell metacharacters', async () => {
    const marker = path.join(tempProject('stdd-shell-injection-'), 'pwned.txt');
    const executor = new ShellAgentExecutor({ command: `${process.execPath} -e "process.exit(0)" ; ${process.execPath} -e "require('fs').writeFileSync('${marker}', 'x')"` });

    const result = await executor.run({ role: 'qa', goal: 'do not inject' });

    expect(result.status).toBe('success');
    expect(fs.existsSync(marker)).toBe(false);
  });

  test('shell agent executor rejects binaries outside the allowlist by default', async () => {
    const executor = new ShellAgentExecutor({ command: 'python -c "print(1)"' });

    await expect(executor.run({ role: 'qa', goal: 'blocked' })).rejects.toThrow('rejected');
  });

  test('shell agent executor accepts an explicit binary allowlist', async () => {
    const executor = new ShellAgentExecutor({ command: `${process.execPath} -e "console.log('ok')"`, allowedBins: 'custom-bin' });
    const result = await executor.run({ role: 'qa', goal: 'allowed' });

    expect(result.status).toBe('success');
    expect(result.output).toBe('ok');
  });

  test('runtime agent run uses noop executor through CLI', () => {
    const cliPath = path.join(__dirname, '..', 'cli.js');
    const root = tempProject('stdd-agent-cli-');
    const result = spawnSync(process.execPath, [cliPath, 'runtime', 'agent', 'run', 'design checkout', '--executor', 'noop', '--role', 'architect', '--json'], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload).toEqual(expect.objectContaining({ adapter: 'noop', role: 'architect', status: 'success' }));
  });

  test('runtime agent shell executor exposes explicit unsafe switch through CLI', () => {
    const cliPath = path.join(__dirname, '..', 'cli.js');
    const root = tempProject('stdd-agent-shell-cli-');
    const result = spawnSync(process.execPath, [
      cliPath,
      'runtime', 'agent', 'run', 'execute command',
      '--executor', 'shell',
      '--command', `${process.execPath} -e "console.log('shell-ok')"`,
      '--allow-unsafe-shell-executor',
      '--json',
    ], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload).toEqual(expect.objectContaining({ adapter: 'shell', status: 'success', output: 'shell-ok' }));
  });

  test('sudo executor runs in a project path containing spaces and cleans temp file', async () => {
    const root = tempProject('stdd sudo ');
    const sourceFile = path.join(root, 'sample.sudo');
    fs.writeFileSync(sourceFile, 'goal: checkout flow\nconstraint: value must be positive\n', 'utf8');

    const result = await new SudoExecutor(root).executeFile(sourceFile);

    expect(result.success).toBe(true);
    const tmpDir = path.join(root, 'stdd', 'runtime', 'tmp');
    const files = fs.existsSync(tmpDir) ? fs.readdirSync(tmpDir).filter(file => file.endsWith('.js')) : [];
    expect(files).toHaveLength(0);
  });
});
