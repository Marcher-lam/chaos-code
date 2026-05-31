const mockCompareResult = jest.fn();
jest.mock('../src/utils/visual-regression', () => ({
  VisualRegression: jest.fn().mockImplementation(() => ({
    compare: mockCompareResult,
  })),
}));

const { BrowserCommand } = require('../src/cli/commands/browser');

const mockSnapshot = jest.fn();
jest.mock('../src/runtime/browser-controller', () => ({
  BrowserController: jest.fn().mockImplementation(() => ({
    snapshot: mockSnapshot,
    inspect: jest.fn(),
  })),
}));
jest.mock('../src/runtime/browser-doctor', () => ({
  BrowserDoctor: jest.fn().mockImplementation(() => ({
    check: jest.fn(),
  })),
}));
jest.mock('chalk', () => {
  const fn = (...args) => args.join('');
  fn.bold = fn;
  fn.green = fn;
  fn.yellow = fn;
  fn.cyan = fn;
  fn.red = fn;
  fn.dim = fn;
  return fn;
});

describe('BrowserCommand', () => {
  let logSpy;
  let errorSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('exports BrowserCommand class', () => {
    expect(BrowserCommand).toBeDefined();
    expect(typeof BrowserCommand).toBe('function');
  });

  it('constructs with cwd and controller', () => {
    const cmd = new BrowserCommand('/tmp');
    expect(cmd.cwd).toBe('/tmp');
    expect(cmd.controller).toBeDefined();
  });

  describe('execute', () => {
    it('delegates snapshot action', async () => {
      const cmd = new BrowserCommand('/tmp');
      cmd.snapshot = jest.fn().mockResolvedValue({ url: 'http://test' });
      await cmd.execute('snapshot', 'http://test.com');
      expect(cmd.snapshot).toHaveBeenCalledWith('http://test.com', {});
    });

    it('delegates inspect action', async () => {
      const cmd = new BrowserCommand('/tmp');
      cmd.inspect = jest.fn().mockResolvedValue({});
      await cmd.execute('inspect', 'http://test.com');
      expect(cmd.inspect).toHaveBeenCalledWith('http://test.com', {});
    });

    it('delegates doctor action', async () => {
      const cmd = new BrowserCommand('/tmp');
      cmd.doctor = jest.fn();
      await cmd.execute('doctor', null, {});
      expect(cmd.doctor).toHaveBeenCalledWith({});
    });

    it('prints usage for unknown action', () => {
      const cmd = new BrowserCommand('/tmp');
      cmd.execute('unknown');
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Usage'));
    });
  });

  describe('snapshot', () => {
    it('returns result on success', async () => {
      const cmd = new BrowserCommand('/tmp');
      cmd.controller.snapshot.mockResolvedValue({
        relativePath: 'snap.html',
        url: 'http://test.com',
        title: 'Test',
      });
      const result = await cmd.snapshot('http://test.com');
      expect(result.relativePath).toBe('snap.html');
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Snapshot saved'));
    });

    it('handles not installed error', async () => {
      const cmd = new BrowserCommand('/tmp');
      cmd.controller.snapshot.mockRejectedValue(new Error('playwright not installed'));
      await cmd.snapshot('http://test.com');
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Browser Error'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Tip'));
      expect(process.exitCode).toBe(1);
    });

    it('handles generic error', async () => {
      const cmd = new BrowserCommand('/tmp');
      cmd.controller.snapshot.mockRejectedValue(new Error('timeout'));
      await cmd.snapshot('http://test.com');
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('timeout'));
      expect(process.exitCode).toBe(1);
    });
  });

  describe('inspect', () => {
    it('returns result on success', async () => {
      const cmd = new BrowserCommand('/tmp');
      cmd.controller.inspect.mockResolvedValue({ title: 'Inspected' });
      const result = await cmd.inspect('http://test.com');
      expect(result.title).toBe('Inspected');
    });

    it('handles error', async () => {
      const cmd = new BrowserCommand('/tmp');
      cmd.controller.inspect.mockRejectedValue(new Error('network error'));
      await cmd.inspect('http://test.com');
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Inspection Error'));
      expect(process.exitCode).toBe(1);
    });
  });

  describe('doctor', () => {
    it('outputs JSON when options.json', () => {
      const { BrowserDoctor } = require('../src/runtime/browser-doctor');
      const mockResult = {
        checks: [{ name: 'playwright', status: 'pass' }],
        suggestions: [],
        status: 'pass',
      };
      BrowserDoctor.mockImplementation(() => ({
        check: jest.fn().mockReturnValue(mockResult),
      }));

      const cmd = new BrowserCommand('/tmp');
      const result = cmd.doctor({ json: true });
      expect(result.status).toBe('pass');
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('pass'));
    });

    it('prints check results in text mode', () => {
      const { BrowserDoctor } = require('../src/runtime/browser-doctor');
      const mockResult = {
        checks: [
          { name: 'playwright', status: 'pass' },
          { name: 'browsers', status: 'fail', message: 'not installed' },
        ],
        suggestions: ['npx playwright install'],
        status: 'fail',
      };
      BrowserDoctor.mockImplementation(() => ({
        check: jest.fn().mockReturnValue(mockResult),
      }));

      const cmd = new BrowserCommand('/tmp');
      const result = cmd.doctor({});
      expect(result.status).toBe('fail');
      expect(process.exitCode).toBe(1);
    });

    it('handles all-pass scenario', () => {
      const { BrowserDoctor } = require('../src/runtime/browser-doctor');
      const mockResult = {
        checks: [{ name: 'playwright', status: 'pass' }],
        suggestions: [],
        status: 'pass',
      };
      BrowserDoctor.mockImplementation(() => ({
        check: jest.fn().mockReturnValue(mockResult),
      }));

      const cmd = new BrowserCommand('/tmp');
      const prevExitCode = process.exitCode;
      cmd.doctor({});
      expect(process.exitCode).toBe(prevExitCode);
    });
  });

  describe('compare and update-baseline', () => {
    let tempDir;
    const path = require('path');

    beforeAll(() => {
      const os = require('os');
      const fs = require('fs');
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-browser-cmd-test-'));
    });

    afterAll(() => {
      const fs = require('fs');
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('delegates compare action and handles pass state', async () => {
      const fs = require('fs');
      const cmd = new BrowserCommand(tempDir);
      
      // Initialize baseline on disk
      const baselineDir = path.join(tempDir, 'stdd/evidence/visual/baselines');
      fs.mkdirSync(baselineDir, { recursive: true });
      fs.writeFileSync(path.join(baselineDir, 'default.png'), 'baseline-data');

      // Mock snapshot controller
      mockSnapshot.mockResolvedValue({
        status: 'success',
        filePath: path.join(tempDir, 'snap.png'),
        url: 'http://test.com',
      });
      fs.writeFileSync(path.join(tempDir, 'snap.png'), 'current-data');

      mockCompareResult.mockReturnValue({
        status: 'pass',
        diffRatio: 0,
        message: 'Visual match perfect.'
      });

      const result = await cmd.compare('http://test.com', { name: 'default' });
      expect(result.status).toBe('pass');
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Visual Regression PASSED'));
    });

    it('delegates compare action and handles fail state', async () => {
      const fs = require('fs');
      const cmd = new BrowserCommand(tempDir);

      const baselineDir = path.join(tempDir, 'stdd/evidence/visual/baselines');
      fs.mkdirSync(baselineDir, { recursive: true });
      fs.writeFileSync(path.join(baselineDir, 'fail-test.png'), 'baseline-data');

      mockSnapshot.mockResolvedValue({
        status: 'success',
        filePath: path.join(tempDir, 'snap2.png'),
        url: 'http://test.com',
      });
      fs.writeFileSync(path.join(tempDir, 'snap2.png'), 'current-data');

      mockCompareResult.mockReturnValue({
        status: 'fail',
        diffRatio: 0.05,
        message: 'Diff exceeds threshold.',
        diffPath: 'stdd/evidence/visual/current/fail-test-diff.png'
      });

      await cmd.compare('http://test.com', { name: 'fail-test' });
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Visual Regression FAILED'));
      expect(process.exitCode).toBe(1);
      delete process.exitCode;
    });

    it('updates baseline successfully', async () => {
      const fs = require('fs');
      const cmd = new BrowserCommand(tempDir);

      mockSnapshot.mockResolvedValue({
        status: 'success',
        filePath: path.join(tempDir, 'new-baseline.png'),
        url: 'http://test.com',
      });
      fs.writeFileSync(path.join(tempDir, 'new-baseline.png'), 'new-baseline-data');

      const result = await cmd.updateBaseline('http://test.com', { name: 'new-baseline' });
      expect(result.status).toBe('success');
      expect(fs.existsSync(path.join(tempDir, 'stdd/evidence/visual/baselines/new-baseline.png'))).toBe(true);
    });
  });
});
