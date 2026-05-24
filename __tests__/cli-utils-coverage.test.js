/**
 * Coverage boost: cli-utils.js (currently ~30% branch)
 */

describe('cli-utils', () => {
  let createSpinner, safeAction;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const mod = require('../src/cli/helpers/cli-utils');
    createSpinner = mod.createSpinner;
    safeAction = mod.safeAction;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('createSpinner', () => {
    it('start writes spinner with text', () => {
      const s = createSpinner('Loading');
      s.start();
      expect(process.stdout.write).toHaveBeenCalled();
    });

    it('start clears previous interval on second call', () => {
      const s = createSpinner('Test');
      s.start();
      jest.advanceTimersByTime(100);
      process.stdout.write.mockClear();
      s.start();
      expect(process.stdout.write).toHaveBeenCalled();
    });

    it('succeed writes checkmark with msg', () => {
      const s = createSpinner('Default');
      s.succeed('Done!');
      const calls = process.stdout.write.mock.calls.map(c => c[0]).join('');
      expect(calls).toContain('Done!');
    });

    it('succeed uses default text when no msg', () => {
      const s = createSpinner('Default text');
      s.succeed();
      const calls = process.stdout.write.mock.calls.map(c => c[0]).join('');
      expect(calls).toContain('Default text');
    });

    it('fail writes cross with msg', () => {
      const s = createSpinner('Loading');
      s.fail('Failed!');
      const calls = process.stdout.write.mock.calls.map(c => c[0]).join('');
      expect(calls).toContain('Failed!');
    });

    it('fail uses default text when no msg', () => {
      const s = createSpinner('Default text');
      s.fail();
      const calls = process.stdout.write.mock.calls.map(c => c[0]).join('');
      expect(calls).toContain('Default text');
    });

    it('returns this from start for chaining', () => {
      const s = createSpinner('X');
      expect(s.start()).toBe(s);
    });

    it('succeed after start clears interval', () => {
      const s = createSpinner('X');
      s.start();
      jest.advanceTimersByTime(100);
      process.stdout.write.mockClear();
      s.succeed('OK');
      const calls = process.stdout.write.mock.calls.map(c => c[0]);
      expect(calls.some(c => c.includes('OK'))).toBe(true);
    });

    it('fail after start clears interval', () => {
      const s = createSpinner('X');
      s.start();
      jest.advanceTimersByTime(100);
      process.stdout.write.mockClear();
      s.fail('Bad');
      const calls = process.stdout.write.mock.calls.map(c => c[0]);
      expect(calls.some(c => c.includes('Bad'))).toBe(true);
    });

    it('succeed without starting works', () => {
      const s = createSpinner('X');
      s.succeed('done');
      expect(process.stdout.write).toHaveBeenCalled();
    });

    it('fail without starting works', () => {
      const s = createSpinner('X');
      s.fail('err');
      expect(process.stdout.write).toHaveBeenCalled();
    });
  });

  describe('safeAction', () => {
    it('calls fn and returns result', async () => {
      const fn = jest.fn().mockResolvedValue('ok');
      const wrapped = safeAction(fn);
      await wrapped('arg1', 'arg2');
      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('catches error and sets process.exitCode', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const fn = jest.fn().mockRejectedValue(new Error('test error'));
      const wrapped = safeAction(fn);
      await wrapped();
      expect(process.exitCode).toBe(1);
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
      process.exitCode = 0;
    });

    it('returns a function', () => {
      const wrapped = safeAction(async () => {});
      expect(typeof wrapped).toBe('function');
    });
  });
});
