const { Logger, LogLevels, getLogger } = require('../src/utils/logger');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('LogLevels', () => {
  it('should have correct level values', () => {
    expect(LogLevels.DEBUG).toBe(0);
    expect(LogLevels.INFO).toBe(1);
    expect(LogLevels.WARN).toBe(2);
    expect(LogLevels.ERROR).toBe(3);
    expect(LogLevels.FATAL).toBe(4);
  });
});

describe('Logger', () => {
  let logDir;

  beforeEach(() => {
    logDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-logger-test-'));
    jest.restoreAllMocks();
  });

  afterEach(() => {
    fs.rmSync(logDir, { recursive: true, force: true });
  });

  it('should log to console at INFO level, filtering DEBUG', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const logger = new Logger({ level: 'INFO', output: 'console' });

    logger.debug('debug msg');
    logger.info('info msg');
    logger.warn('warn msg');

    expect(logSpy).toHaveBeenCalled();
    // info + warn calls (debug filtered at INFO level)
    const calls = logSpy.mock.calls.map(c => c[0]);
    expect(calls.some(c => c.includes('info msg'))).toBe(true);
    expect(calls.some(c => c.includes('warn msg'))).toBe(true);
    expect(calls.some(c => c.includes('debug msg'))).toBe(false);

    logSpy.mockRestore();
  });

  it('should log to file when output is file', () => {
    const logger = new Logger({ level: 'DEBUG', output: 'file', logDir });

    logger.info('file info');
    logger.error('file error');

    const files = fs.readdirSync(logDir);
    expect(files.length).toBe(1);
    expect(files[0]).toMatch(/^stdd-.*\.log$/);

    const content = fs.readFileSync(path.join(logDir, files[0]), 'utf8');
    expect(content).toContain('file info');
    expect(content).toContain('file error');
  });

  it('should format log entries with timestamp and level', () => {
    const logger = new Logger({ level: 'INFO', output: 'console' });
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    logger.info('formatted test');

    const call = logSpy.mock.calls[0][0];
    expect(call).toContain('INFO');
    expect(call).toContain('formatted test');
    // Should contain ISO timestamp pattern
    expect(call).toMatch(/\[\d{4}-\d{2}-\d{2}/);

    logSpy.mockRestore();
  });

  it('should include metadata in log output', () => {
    const logger = new Logger({ level: 'INFO', output: 'console' });
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    logger.info('meta test', { userId: 42 });

    const call = logSpy.mock.calls[0][0];
    expect(call).toContain('meta test');
    expect(call).toContain('userId');
    expect(call).toContain('42');

    logSpy.mockRestore();
  });

  it('should use JSON format when configured', () => {
    const logger = new Logger({ level: 'INFO', output: 'console', format: 'json' });
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    logger.info('json test', { key: 'value' });

    expect(logSpy).toHaveBeenCalledTimes(1);
    const call = logSpy.mock.calls[0][0];
    expect(call).toContain('json test');
    expect(call).toContain('key');
    expect(call).toContain('value');

    logSpy.mockRestore();
  });
});

describe('getLogger', () => {
  it('should return singleton logger instance', () => {
    const log1 = getLogger();
    const log2 = getLogger();
    expect(log1).toBe(log2);
  });
});
