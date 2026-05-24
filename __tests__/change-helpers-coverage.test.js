/**
 * Coverage boost: change-helpers.js (currently ~54% branch)
 */
const path = require('path');
const fs = require('fs');
const TMP = path.join(__dirname, '__zc_ch_tmp__');
function mkdirp(d) { fs.mkdirSync(d, { recursive: true }); }

beforeEach(() => mkdirp(TMP));
afterEach(() => fs.rmSync(TMP, { recursive: true, force: true }));

describe('change-helpers', () => {
  const {
    generateChangeName,
    toSafeFilename,
    toTitleCase,
    workspaceContext,
    resolveWorkspaceContext,
  } = require('../src/utils/change-helpers');

  describe('generateChangeName', () => {
    it('generates with default prefix', () => {
      const name = generateChangeName();
      expect(name).toMatch(/^change-\d{8}-\d{4}$/);
    });

    it('generates with custom prefix', () => {
      const name = generateChangeName('issue');
      expect(name).toMatch(/^issue-\d{8}-\d{4}$/);
    });

    it('generates with prefix ff', () => {
      const name = generateChangeName('ff');
      expect(name).toMatch(/^ff-\d{8}-\d{4}$/);
    });
  });

  describe('toSafeFilename', () => {
    it('converts to lowercase and replaces spaces', () => {
      expect(toSafeFilename('Hello World')).toBe('hello-world');
    });

    it('handles special characters', () => {
      expect(toSafeFilename('Test@#$Case')).toBe('test-case');
    });

    it('trims leading/trailing hyphens', () => {
      expect(toSafeFilename('-hello-')).toBe('hello');
    });

    it('handles empty string', () => {
      expect(toSafeFilename('')).toBe('');
    });

    it('handles null/undefined', () => {
      expect(toSafeFilename(null)).toBe('');
      expect(toSafeFilename(undefined)).toBe('');
    });

    it('handles multiple consecutive special chars', () => {
      expect(toSafeFilename('a///b')).toBe('a-b');
    });

    it('handles Chinese characters', () => {
      expect(toSafeFilename('你好')).toBe('');
    });
  });

  describe('toTitleCase', () => {
    it('converts hyphenated to PascalCase', () => {
      expect(toTitleCase('hello-world')).toBe('HelloWorld');
    });

    it('converts underscored to PascalCase', () => {
      expect(toTitleCase('hello_world')).toBe('HelloWorld');
    });

    it('handles single word', () => {
      expect(toTitleCase('hello')).toBe('Hello');
    });

    it('handles mixed separators', () => {
      expect(toTitleCase('hello_world-test')).toBe('HelloWorldTest');
    });

    it('handles extra whitespace', () => {
      expect(toTitleCase('  hello   world  ')).toBe('HelloWorld');
    });
  });

  describe('workspaceContext', () => {
    it('returns null for null workspace', () => {
      expect(workspaceContext(null)).toBeNull();
    });

    it('returns null for undefined workspace', () => {
      expect(workspaceContext(undefined)).toBeNull();
    });

    it('returns context object for valid workspace', () => {
      mkdirp(path.join(TMP, 'packages', 'api'));
      const ws = { name: 'api', root: path.join(TMP, 'packages', 'api') };
      const orig = process.cwd();
      process.chdir(TMP);
      try {
        const ctx = workspaceContext(ws);
        expect(ctx.name).toBe('api');
        expect(ctx.path).toContain('packages');
        expect(ctx.tag).toContain('packages');
      } finally {
        process.chdir(orig);
      }
    });

    it('uses name as path when root equals cwd', () => {
      const tmpWs = { name: 'root-pkg', root: TMP };
      const orig = process.cwd();
      process.chdir(TMP);
      try {
        const ctx = workspaceContext(tmpWs);
        expect(ctx.name).toBe('root-pkg');
        expect(ctx.path).toBe('root-pkg');
      } finally {
        process.chdir(orig);
      }
    });
  });

  describe('resolveWorkspaceContext', () => {
    it('returns null for empty selector', () => {
      expect(resolveWorkspaceContext(TMP, '')).toBeNull();
    });

    it('returns null for null selector', () => {
      expect(resolveWorkspaceContext(TMP, null)).toBeNull();
    });

    it('returns null for unknown workspace', () => {
      expect(resolveWorkspaceContext(TMP, 'nonexistent-pkg')).toBeNull();
    });
  });
});
