/**
 * round25-batch4.test.js — targets uncovered branches in:
 *   src/runtime/browser-controller.js      (2/15 branches: default-args on lines 31, 73)
 *   src/runtime/browser-doctor.js           (4/30 branches: default-arg line 5, launch-check lines 48/51)
 *   src/templates/hooks/post-file-write.js  (5/39 branches: stdin entry point lines 124-151)
 *   src/templates/hooks/pre-file-write.js   (5/39 branches: stdin entry point lines 199-222)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// ─── helpers ────────────────────────────────────────────────────────────────
const tmpDirs = [];
function _mktmp(prefix) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpDirs.push(d);
  return d;
}
afterAll(() => {
  for (const d of tmpDirs) {
    try { fs.rmSync(d, { recursive: true, force: true }); } catch (_) {}
  }
});

// ═════════════════════════════════════════════════════════════════════════════
//  1. browser-controller.js  (2 uncovered branches)
// ═════════════════════════════════════════════════════════════════════════════
describe('browser-controller uncovered branches', () => {
  const { BrowserController } = require('../src/runtime/browser-controller');

  test('snapshot() without options exercises default-arg on line 31 and throws for missing url', async () => {
    const bc = new BrowserController();
    bc.playwright = { chromium: { launch: jest.fn() } };
    // Calling with no args triggers the default-arg branch (options = {})
    // then hits the !url check and throws
    await expect(bc.snapshot()).rejects.toThrow('URL is required for snapshot.');
  });

  test('inspect() without options exercises default-arg on line 73 and throws for missing url', async () => {
    const bc = new BrowserController();
    bc.playwright = { chromium: { launch: jest.fn() } };
    await expect(bc.inspect()).rejects.toThrow('URL is required for inspection.');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  2. browser-doctor.js  (4 uncovered branches)
// ═════════════════════════════════════════════════════════════════════════════
describe('browser-doctor uncovered branches', () => {
  // The module imports child_process for spawnSync used in _checkLaunch.
  // We mock it at the module level to avoid real chromium launches.
  jest.mock('child_process', () => ({
    spawnSync: jest.fn(),
  }));

  const { BrowserDoctor, detectPackageManager } = require('../src/runtime/browser-doctor');
  const { spawnSync } = require('child_process');

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('detectPackageManager() without args exercises default-arg on line 5', () => {
    // This exercises the default `cwd = process.cwd()` branch
    const pm = detectPackageManager();
    expect(['npm', 'pnpm', 'yarn', 'bun']).toContain(pm);
  });

  test('check() with launch enabled (default) exercises if-true on line 48', () => {
    const doctor = new BrowserDoctor('/nonexistent');
    // Mock package + binary checks to pass so we reach the launch check
    doctor._checkPackage = jest.fn().mockReturnValue({ name: 'playwright package', status: 'pass' });
    doctor._checkBrowserBinary = jest.fn().mockReturnValue({ name: 'chromium binary', status: 'pass' });
    // Mock spawnSync to simulate a successful launch
    spawnSync.mockReturnValue({ status: 0 });

    // Call check() without { launch: false } to exercise the if-true branch
    const result = doctor.check();
    expect(result.checks.length).toBe(3); // package + binary + launch
    expect(result.checks[2].name).toBe('headless launch');
    expect(result.checks[2].status).toBe('pass');
    expect(result.status).toBe('pass');
  });

  test('check() with launch enabled and _checkLaunch fails exercises failure branch on line 51', () => {
    const doctor = new BrowserDoctor('/nonexistent');
    doctor._checkPackage = jest.fn().mockReturnValue({ name: 'playwright package', status: 'pass' });
    doctor._checkBrowserBinary = jest.fn().mockReturnValue({ name: 'chromium binary', status: 'pass' });
    // Mock spawnSync to simulate a failed launch
    spawnSync.mockReturnValue({ status: 1, stderr: 'Chromium launch failed' });

    const result = doctor.check();
    expect(result.checks.length).toBe(3);
    expect(result.checks[2].status).toBe('fail');
    expect(result.checks[2].message).toContain('Chromium launch failed');
    expect(result.status).toBe('fail');
    expect(result.suggestions).toContain('npx playwright install --with-deps');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  3. post-file-write.js  (5 uncovered branches: stdin entry point)
// ═════════════════════════════════════════════════════════════════════════════
describe('post-file-write stdin entry point for branch coverage', () => {
  const hookPath = path.resolve(__dirname, '..', 'src', 'templates', 'hooks', 'post-file-write.js');

  test('stdin path: STDD_HOOKS_DISABLED exits early with code 0', () => {
    const input = JSON.stringify({
      tool_name: 'Write',
      tool_input: { file_path: '/tmp/test.js', content: 'try{x();}catch(e){}' },
    });
    // STDD_HOOKS_DISABLED triggers the if-true branch (line 132), then process.exit(0)
    const result = execSync(
      `echo '${input}' | STDD_HOOKS_DISABLED=1 node "${hookPath}" 2>&1; echo "EXIT:$?"`,
      { encoding: 'utf8' }
    );
    expect(result.trim().toLowerCase()).toContain('exit:0');
  });

  test('stdin path: outputs JSON when suggestions are found (line 140 if-true)', () => {
    const input = JSON.stringify({
      tool_name: 'Write',
      tool_input: { file_path: '/tmp/app.js', content: 'function add(a,b){return a+b;}' },
    });
    // Source file without documentation triggers suggestion, exercises suggestions.length > 0 branch
    const result = execSync(`echo '${input}' | node "${hookPath}"`, { encoding: 'utf8' });
    const parsed = JSON.parse(result.trim());
    expect(parsed).toHaveProperty('suggestions');
    expect(parsed.suggestions.length).toBeGreaterThan(0);
    expect(parsed).toHaveProperty('message');
  });

  test('stdin path: outputs nothing when no suggestions (line 140 if-false)', () => {
    const input = JSON.stringify({
      tool_name: 'Read',
      tool_input: { file_path: '/tmp/README.md', content: 'Hello' },
    });
    // Read tool returns [] suggestions, so suggestions.length === 0, nothing is printed
    const result = execSync(`echo '${input}' | node "${hookPath}"`, { encoding: 'utf8' });
    expect(result.trim()).toBe('');
  });

  test('stdin path: invalid JSON triggers catch block with exit 0', () => {
    const result = execSync(
      `echo 'not-valid-json' | node "${hookPath}" 2>&1; echo "EXIT:$?"`,
      { encoding: 'utf8' }
    );
    expect(result).toContain('STDD Hook error');
    expect(result.toLowerCase()).toContain('exit:0');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  4. pre-file-write.js  (5 uncovered branches: stdin entry point)
// ═════════════════════════════════════════════════════════════════════════════
describe('pre-file-write stdin entry point for branch coverage', () => {
  const hookPath = path.resolve(__dirname, '..', 'src', 'templates', 'hooks', 'pre-file-write.js');

  test('stdin path: STDD_HOOKS_DISABLED exits early with block:false (line 207)', () => {
    const input = JSON.stringify({
      tool_name: 'Write',
      tool_input: { file_path: '/tmp/test.js', content: 'const x = 1;' },
    });
    // STDD_HOOKS_DISABLED triggers if-true branch, outputs { block: false }
    const result = execSync(
      `echo '${input}' | STDD_HOOKS_DISABLED=1 node "${hookPath}" 2>&1`,
      { encoding: 'utf8' }
    );
    const parsed = JSON.parse(result.trim());
    expect(parsed.block).toBe(false);
  });

  test('stdin path: block=true exits with code 1 (cond-expr line 217 true branch)', () => {
    // Use content with a hardcoded secret to trigger security error => block: true
    const input = JSON.stringify({
      tool_name: 'Write',
      tool_input: { file_path: '/tmp/config.js', content: 'const secret = "hardcoded-secret-value-here"' },
    });
    // This should trigger Article 7 violation → level 'error' → block: true → exit(1)
    const result = execSync(
      `echo '${input}' | node "${hookPath}" 2>&1; echo "EXIT:$?"`,
      { encoding: 'utf8' }
    );
    // Should output JSON result and exit with non-zero code
    const lines = result.trim().split('\n');
    const jsonLine = lines.find(l => l.startsWith('{'));
    expect(jsonLine).toBeDefined();
    const parsed = JSON.parse(jsonLine);
    expect(parsed.block).toBe(true);
    expect(result.toLowerCase()).toMatch(/exit:[1-9]/);
  });

  test('stdin path: block=false exits with code 0 (cond-expr line 217 false branch)', () => {
    // Use a safe content with non-Write/Edit tool to get block: false
    const input = JSON.stringify({
      tool_name: 'Read',
      tool_input: { file_path: '/tmp/test.js', content: 'const x = 1;' },
    });
    // Read tool returns { block: false } → exit(0)
    const result = execSync(
      `echo '${input}' | node "${hookPath}" 2>&1; echo "EXIT:$?"`,
      { encoding: 'utf8' }
    );
    const lines = result.trim().split('\n');
    const jsonLine = lines.find(l => l.startsWith('{'));
    expect(jsonLine).toBeDefined();
    const parsed = JSON.parse(jsonLine);
    expect(parsed.block).toBe(false);
    expect(result.toLowerCase()).toContain('exit:0');
  });

  test('stdin path: invalid JSON triggers catch block with exit 0', () => {
    const result = execSync(
      `echo 'not-json' | node "${hookPath}" 2>&1; echo "EXIT:$?"`,
      { encoding: 'utf8' }
    );
    expect(result).toContain('STDD Hook error');
    expect(result.toLowerCase()).toContain('exit:0');
  });
});
