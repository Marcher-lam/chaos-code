const fs = require('fs');
const path = require('path');
const os = require('os');

const mockCacheDir = path.join(os.tmpdir(), 'stdd-graph-cache-unit-' + Date.now());

jest.mock('../src/utils/path-resolver', () => ({
  getPackageRoot: () => mockCacheDir,
}));

const GraphCacheManager = require('../src/utils/graph-cache');

describe('GraphCacheManager', () => {
  let cache;

  beforeEach(() => {
    cache = new GraphCacheManager('test-project');
  });

  afterEach(() => {
    cache.clear();
    if (fs.existsSync(mockCacheDir)) {
      fs.rmSync(mockCacheDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('creates cache directory', () => {
      expect(fs.existsSync(cache.cacheDir)).toBe(true);
    });

    it('uses default project id when none provided', () => {
      const defaultCache = new GraphCacheManager();
      expect(defaultCache.projectId).toBe('default');
      defaultCache.clear();
    });
  });

  describe('set and get', () => {
    it('stores and retrieves cache entries', () => {
      cache.set('node-a', { input: 1 }, { result: 'ok' });
      const entry = cache.get('node-a', { input: 1 });
      expect(entry).toBeDefined();
      expect(entry.nodeName).toBe('node-a');
      expect(entry.outputs).toEqual({ result: 'ok' });
      expect(entry.timestamp).toBeDefined();
      expect(entry.inputsHash).toBeDefined();
    });

    it('returns null for missing entries', () => {
      expect(cache.get('missing', {})).toBeNull();
    });

    it('differentiates by inputs', () => {
      cache.set('node-a', { x: 1 }, { r: 'one' });
      cache.set('node-a', { x: 2 }, { r: 'two' });
      expect(cache.get('node-a', { x: 1 }).outputs.r).toBe('one');
      expect(cache.get('node-a', { x: 2 }).outputs.r).toBe('two');
    });

    it('isolates cache between different node names', () => {
      cache.set('node-x', { v: 1 }, { data: 'x' });
      cache.set('node-y', { v: 1 }, { data: 'y' });
      expect(cache.get('node-x', { v: 1 }).outputs.data).toBe('x');
      expect(cache.get('node-y', { v: 1 }).outputs.data).toBe('y');
    });
  });

  describe('has', () => {
    it('returns true for cached entries', () => {
      cache.set('node-b', {}, {});
      expect(cache.has('node-b', {})).toBe(true);
    });

    it('returns false for missing entries', () => {
      expect(cache.has('node-c', {})).toBe(false);
    });
  });

  describe('clear', () => {
    it('removes all cache entries', () => {
      cache.set('node-d', {}, { data: 1 });
      cache.set('node-e', {}, { data: 2 });
      cache.clear();
      expect(cache.has('node-d', {})).toBe(false);
      expect(cache.has('node-e', {})).toBe(false);
    });

    it('is safe to call on empty or cleared cache', () => {
      const fresh = new GraphCacheManager('empty-clear-test');
      fresh.clear();
      expect(() => fresh.clear()).not.toThrow();
      fresh.clear();
    });
  });

  describe('_generateHash', () => {
    it('produces deterministic hashes', () => {
      const h1 = cache._generateHash('x', { a: 1 });
      const h2 = cache._generateHash('x', { a: 1 });
      expect(h1).toBe(h2);
      expect(h1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('different inputs produce different hashes', () => {
      const h1 = cache._generateHash('x', { a: 1 });
      const h2 = cache._generateHash('x', { a: 2 });
      expect(h1).not.toBe(h2);
    });

    it('different node names produce different hashes', () => {
      const h1 = cache._generateHash('node-a', {});
      const h2 = cache._generateHash('node-b', {});
      expect(h1).not.toBe(h2);
    });
  });

  describe('deleteByNode', () => {
    it('removes only entries for specified node', () => {
      cache.set('target', { v: 1 }, { r: 'delete-me' });
      cache.set('other', { v: 1 }, { r: 'keep-me' });
      cache.set('target', { v: 2 }, { r: 'delete-me-too' });

      cache.deleteByNode('target');

      expect(cache.has('target', { v: 1 })).toBe(false);
      expect(cache.has('target', { v: 2 })).toBe(false);
      expect(cache.has('other', { v: 1 })).toBe(true);
    });

    it('is safe when no matching entries exist', () => {
      cache.set('a', {}, { d: 1 });
      expect(() => cache.deleteByNode('nonexistent')).not.toThrow();
      expect(cache.has('a', {})).toBe(true);
    });

    it('is safe on empty cache', () => {
      const fresh = new GraphCacheManager('delete-empty-test');
      expect(() => fresh.deleteByNode('anything')).not.toThrow();
      fresh.clear();
    });
  });

  describe('corrupt cache file', () => {
    it('returns null for corrupt JSON', () => {
      cache.set('corrupt', {}, { data: 1 });
      const hash = cache._generateHash('corrupt', {});
      const cacheFile = path.join(cache.cacheDir, `${hash}.json`);
      fs.writeFileSync(cacheFile, 'not valid json{{{', 'utf8');
      expect(cache.get('corrupt', {})).toBeNull();
    });
  });

  describe('deleteByNode corrupt entries', () => {
    it('removes corrupt cache files during deleteByNode', () => {
      // Create a valid entry to keep
      cache.set('keep-me', { v: 1 }, { r: 'safe' });
      // Create a corrupt file that looks like a cache entry
      const corruptFile = path.join(cache.cacheDir, 'deadbeef.json');
      fs.writeFileSync(corruptFile, '}}not-json{{', 'utf8');
      // Verify corrupt file exists
      expect(fs.existsSync(corruptFile)).toBe(true);

      cache.deleteByNode('irrelevant');

      // Corrupt file should have been removed (catch block line 67)
      expect(fs.existsSync(corruptFile)).toBe(false);
      // Valid entry should still exist
      expect(cache.has('keep-me', { v: 1 })).toBe(true);
    });

    it('logs warning for non-ENOENT/EACCES errors during deleteByNode', () => {
      // Write a file that will cause a parse error (corrupt JSON)
      const corruptFile = path.join(cache.cacheDir, 'corrupt-entry.json');
      fs.writeFileSync(corruptFile, '{bad json', 'utf8');

      // Spy on console.warn to capture the warning branch (line 65)
      // (logger.warn outputs via console.warn)
      const errorSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // The parse will fail with SyntaxError (code is undefined, not ENOENT/EACCES)
      cache.deleteByNode('any-node');

      // SyntaxError.code is undefined, so err.code !== 'ENOENT' && err.code !== 'EACCES'
      // should trigger the logger.warn branch on line 65
      expect(errorSpy).toHaveBeenCalled();
      const callArgs = errorSpy.mock.calls[0][0];
      expect(callArgs).toContain('[graph-cache]');

      // Corrupt file should still be removed (line 67)
      expect(fs.existsSync(corruptFile)).toBe(false);

      errorSpy.mockRestore();
    });

    it('silently handles ENOENT errors without logging warning', () => {
      // Create a file then delete it so readdir picks it up but readFileSync fails
      // Actually, we need a scenario where the file vanishes between readdir and readFile.
      // Mock fs to simulate ENOENT during read.
      const origReadFileSync = fs.readFileSync;
      const _origReaddirSync = fs.readdirSync;

      // Create a valid cache file first
      cache.set('enoent-test', {}, { r: 'data' });

      // Get the list of files
      const files = fs.readdirSync(cache.cacheDir).filter(f => f.endsWith('.json'));
      expect(files.length).toBeGreaterThan(0);

      // Now mock readFileSync to throw ENOENT
      jest.spyOn(fs, 'readFileSync').mockImplementation((filePath, encoding) => {
        if (typeof filePath === 'string' && filePath.includes('.json')) {
          const err = new Error('ENOENT: no such file');
          err.code = 'ENOENT';
          throw err;
        }
        return origReadFileSync(filePath, encoding);
      });

      const errorSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Should not throw, should not log warning (ENOENT branch)
      expect(() => cache.deleteByNode('enoent-test')).not.toThrow();
      expect(errorSpy).not.toHaveBeenCalled();

      errorSpy.mockRestore();
      jest.restoreAllMocks();
    });

    it('silently handles EACCES errors without logging warning', () => {
      // Create a valid cache file first
      cache.set('eacces-test', {}, { r: 'data' });

      // Mock readFileSync to throw EACCES
      jest.spyOn(fs, 'readFileSync').mockImplementation((_filePath) => {
        const err = new Error('EACCES: permission denied');
        err.code = 'EACCES';
        throw err;
      });

      const errorSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Should not throw, should not log warning (EACCES branch)
      expect(() => cache.deleteByNode('eacces-test')).not.toThrow();
      expect(errorSpy).not.toHaveBeenCalled();

      errorSpy.mockRestore();
      jest.restoreAllMocks();
    });
  });

  describe('缓存命中与隔离 (中文场景)', () => {
    it('应该能精准击中具有相同 input 参数的缓存产物，避免二次计算', () => {
      const nodeName = 'stdd-plan';
      const inputs = { scope: 'auth-module', depth: 'high' };
      const simulatedOutputs = { tasks: ['A', 'B'] };

      expect(cache.has(nodeName, inputs)).toBe(false);
      cache.set(nodeName, inputs, simulatedOutputs);
      expect(cache.has(nodeName, inputs)).toBe(true);

      const cachedData = cache.get(nodeName, inputs);
      expect(cachedData.outputs).toEqual(simulatedOutputs);
      expect(cachedData.nodeName).toBe(nodeName);
    });

    it('输入的微小改变应当引发隔离，防止污染', () => {
      const nodeName = 'stdd-apply';
      const inputsV1 = { code: 'function a() {}' };
      const inputsV2 = { code: 'function b() {}' };

      cache.set(nodeName, inputsV1, { status: 'success' });
      expect(cache.has(nodeName, inputsV2)).toBe(false);
    });
  });
});
