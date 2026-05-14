const { STDDError, ErrorCodes, handleCliError, withErrorHandling, withRetry, logErrorToEvidence } = require('../src/utils/error-handler');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('STDDError', () => {
  it('should create error with code and details', () => {
    const err = new STDDError('test error', 'E999', { foo: 'bar' });
    expect(err.name).toBe('STDDError');
    expect(err.message).toBe('test error');
    expect(err.code).toBe('E999');
    expect(err.details).toEqual({ foo: 'bar' });
    expect(err.timestamp).toBeDefined();
  });

  it('should serialize to JSON', () => {
    const err = new STDDError('test error', 'E999');
    const json = err.toJSON();
    expect(json.name).toBe('STDDError');
    expect(json.message).toBe('test error');
    expect(json.code).toBe('E999');
    expect(json.timestamp).toBeDefined();
    expect(json.stack).toBeDefined();
  });
});

describe('ErrorCodes', () => {
  it('should have all expected error code categories', () => {
    expect(ErrorCodes.NOT_INITIALIZED).toBe('E001');
    expect(ErrorCodes.CHANGE_NOT_FOUND).toBe('E101');
    expect(ErrorCodes.TASK_NOT_FOUND).toBe('E201');
    expect(ErrorCodes.VALIDATION_FAILED).toBe('E301');
    expect(ErrorCodes.COMMAND_FAILED).toBe('E401');
    expect(ErrorCodes.FILE_SYSTEM_ERROR).toBe('E501');
  });
});

describe('handleCliError', () => {
  let exitSpy;

  beforeEach(() => {
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  it('should handle STDDError with formatted output', () => {
    const err = new STDDError('test error', 'E001');
    const result = handleCliError(err, { exit: false });
    expect(result).toBe(1);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('should handle generic Error', () => {
    const err = new Error('unknown error');
    const result = handleCliError(err, { exit: false });
    expect(result).toBe(1);
  });

  it('should exit when exit option is true', () => {
    const err = new STDDError('test', 'E001');
    handleCliError(err, { exit: true, silent: true });
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});

describe('withErrorHandling', () => {
  it('should return result for successful function', async () => {
    const fn = async (x) => x * 2;
    const wrapped = withErrorHandling(fn, { exit: false });
    const result = await wrapped(21);
    expect(result).toBe(42);
  });

  it('should catch errors and return 1', async () => {
    const fn = async () => { throw new Error('fail'); };
    const wrapped = withErrorHandling(fn, { exit: false });
    const result = await wrapped();
    expect(result).toBe(1);
  });
});

describe('withRetry', () => {
  it('should return result on first success', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    const wrapped = withRetry(fn, { maxRetries: 3, delay: 10 });
    const result = await wrapped();
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and succeed', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success');
    const wrapped = withRetry(fn, { maxRetries: 3, delay: 10 });
    const result = await wrapped();
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should throw after max retries', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('persistent fail'));
    const wrapped = withRetry(fn, { maxRetries: 2, delay: 10 });
    await expect(wrapped()).rejects.toThrow('persistent fail');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('logErrorToEvidence', () => {
  it('should write error to evidence directory', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-error-test-'));
    const err = new STDDError('test error', 'E001', { detail: 'test' });
    
    logErrorToEvidence(err, tmpDir);
    
    const files = fs.readdirSync(tmpDir);
    expect(files.length).toBe(1);
    expect(files[0]).toMatch(/^error-\d+\.json$/);
    
    const content = JSON.parse(fs.readFileSync(path.join(tmpDir, files[0]), 'utf8'));
    expect(content.message).toBe('test error');
    expect(content.code).toBe('E001');
    expect(content.details).toEqual({ detail: 'test' });
    
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
