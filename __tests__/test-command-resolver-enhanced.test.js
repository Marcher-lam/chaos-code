const fs = require('fs');
const path = require('path');
const os = require('os');
const { resolveTestCommands, detectTestCommand, getConfigTestCommand, _detectPackageManager } = require('../src/utils/test-command-resolver');

describe('test-command-resolver', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-tcr-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writePkg(dir, pkg) {
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg));
  }

  describe('detectPackageManager', () => {
    test('detects pnpm from pnpm-workspace.yaml', () => {
      fs.writeFileSync(path.join(tmpDir, 'pnpm-workspace.yaml'), 'packages:\n  - "packages/*"');
      expect(_detectPackageManager(tmpDir)).toBe('pnpm');
    });

    test('detects pnpm from pnpm-lock.yaml', () => {
      fs.writeFileSync(path.join(tmpDir, 'pnpm-lock.yaml'), '');
      expect(_detectPackageManager(tmpDir)).toBe('pnpm');
    });

    test('detects yarn from yarn.lock', () => {
      fs.writeFileSync(path.join(tmpDir, 'yarn.lock'), '');
      expect(_detectPackageManager(tmpDir)).toBe('yarn');
    });

    test('defaults to npm', () => {
      expect(_detectPackageManager(tmpDir)).toBe('npm');
    });

    test('pnpm-workspace.yaml takes priority over yarn.lock', () => {
      fs.writeFileSync(path.join(tmpDir, 'pnpm-workspace.yaml'), '');
      fs.writeFileSync(path.join(tmpDir, 'yarn.lock'), '');
      expect(_detectPackageManager(tmpDir)).toBe('pnpm');
    });
  });

  describe('getConfigTestCommand', () => {
    test('returns null when no config.yaml exists', () => {
      expect(getConfigTestCommand(tmpDir)).toBeNull();
    });

    test('returns null when config has no test section', () => {
      fs.mkdirSync(path.join(tmpDir, 'stdd'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'stdd', 'config.yaml'), 'name: test\n');
      expect(getConfigTestCommand(tmpDir)).toBeNull();
    });

    test('returns command from config', () => {
      fs.mkdirSync(path.join(tmpDir, 'stdd'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'stdd', 'config.yaml'), 'test:\n  command: "npm run test:ci"\n');
      expect(getConfigTestCommand(tmpDir)).toBe('npm run test:ci');
    });

    test('handles malformed yaml gracefully', () => {
      fs.mkdirSync(path.join(tmpDir, 'stdd'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'stdd', 'config.yaml'), 'invalid: [yaml: content');
      expect(getConfigTestCommand(tmpDir)).toBeNull();
    });
  });

  describe('resolveTestCommands', () => {
    test('returns empty array when no test command found', () => {
      writePkg(tmpDir, { name: 'test' });
      expect(resolveTestCommands(tmpDir)).toEqual([]);
    });

    test('uses explicit testCommand option', () => {
      const result = resolveTestCommands(tmpDir, { testCommand: 'jest --coverage' });
      expect(result).toHaveLength(1);
      expect(result[0].command).toBe('jest --coverage');
      expect(result[0].source).toBe('root');
    });

    test('uses configCommand option', () => {
      const result = resolveTestCommands(tmpDir, { configCommand: 'npm run test:ci' });
      expect(result).toHaveLength(1);
      expect(result[0].command).toBe('npm run test:ci');
    });

    test('detects root package test script', () => {
      writePkg(tmpDir, { name: 'my-project', scripts: { test: 'jest' } });
      const result = resolveTestCommands(tmpDir);
      expect(result).toHaveLength(1);
      expect(result[0].command).toBe('npm test');
      expect(result[0].workspaceName).toBe('my-project');
    });

    test('detects yarn test when yarn.lock present', () => {
      writePkg(tmpDir, { name: 'yarn-project', scripts: { test: 'jest' } });
      fs.writeFileSync(path.join(tmpDir, 'yarn.lock'), '');
      const result = resolveTestCommands(tmpDir);
      expect(result[0].command).toBe('yarn test');
    });

    test('detects pnpm test when pnpm-lock.yaml present', () => {
      writePkg(tmpDir, { name: 'pnpm-project', scripts: { test: 'jest' } });
      fs.writeFileSync(path.join(tmpDir, 'pnpm-lock.yaml'), '');
      const result = resolveTestCommands(tmpDir);
      expect(result[0].command).toBe('pnpm test');
    });

    test('falls back to workspace detection when root has no test', () => {
      writePkg(tmpDir, { name: 'mono', private: true, workspaces: ['packages/*'] });
      const apiDir = path.join(tmpDir, 'packages', 'api');
      fs.mkdirSync(apiDir, { recursive: true });
      writePkg(apiDir, { name: '@mono/api', scripts: { test: 'jest' } });

      const result = resolveTestCommands(tmpDir);
      expect(result).toHaveLength(1);
      expect(result[0].workspaceName).toBe('@mono/api');
      expect(result[0].source).toBe('workspace');
    });

    test('skips workspaces without test scripts', () => {
      writePkg(tmpDir, { name: 'mono', private: true, workspaces: ['packages/*'] });
      const apiDir = path.join(tmpDir, 'packages', 'api');
      fs.mkdirSync(apiDir, { recursive: true });
      writePkg(apiDir, { name: '@mono/api' });

      const result = resolveTestCommands(tmpDir);
      expect(result).toEqual([]);
    });

    test('resolves workspace from string selector', () => {
      writePkg(tmpDir, { name: 'mono', private: true, workspaces: ['packages/*'] });
      const apiDir = path.join(tmpDir, 'packages', 'api');
      fs.mkdirSync(apiDir, { recursive: true });
      writePkg(apiDir, { name: '@mono/api', scripts: { test: 'jest' } });

      const result = resolveTestCommands(tmpDir, { workspace: 'packages/api' });
      expect(result).toHaveLength(1);
      expect(result[0].workspaceName).toBe('@mono/api');
    });

    test('resolves workspace with explicit testCommand', () => {
      writePkg(tmpDir, { name: 'mono', private: true, workspaces: ['packages/*'] });
      const apiDir = path.join(tmpDir, 'packages', 'api');
      fs.mkdirSync(apiDir, { recursive: true });
      writePkg(apiDir, { name: '@mono/api' });

      const result = resolveTestCommands(tmpDir, { workspace: 'packages/api', testCommand: 'vitest' });
      expect(result).toHaveLength(1);
      expect(result[0].command).toBe('vitest');
    });

    test('returns empty for non-existent workspace', () => {
      writePkg(tmpDir, { name: 'mono', private: true, workspaces: ['packages/*'] });
      const result = resolveTestCommands(tmpDir, { workspace: 'nonexistent' });
      expect(result).toEqual([]);
    });

    test('workspace option accepts object directly', () => {
      const ws = { name: 'api', root: tmpDir };
      writePkg(tmpDir, { name: 'api', scripts: { test: 'jest' } });
      const result = resolveTestCommands(tmpDir, { workspace: ws });
      expect(result).toHaveLength(1);
    });
  });

  describe('detectTestCommand', () => {
    test('returns null when no command found', () => {
      writePkg(tmpDir, { name: 'test' });
      expect(detectTestCommand(tmpDir)).toBeNull();
    });

    test('returns first command when found', () => {
      writePkg(tmpDir, { name: 'test', scripts: { test: 'jest' } });
      expect(detectTestCommand(tmpDir)).toBe('npm test');
    });
  });

  describe('readPackageJson error branches', () => {
    const { resolveTestCommands } = require('../src/utils/test-command-resolver');

    test('logs warning for non-ENOENT/EACCES readPackageJson errors', () => {
      // Create a directory as package.json so readFileSync throws EISDIR
      fs.mkdirSync(path.join(tmpDir, 'package.json'));
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const result = resolveTestCommands(tmpDir);
      expect(warnSpy).toHaveBeenCalled();
      expect(result).toEqual([]);
      warnSpy.mockRestore();
    });

    test('silently handles ENOENT in readPackageJson', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      // No package.json at all - triggers ENOENT
      const result = resolveTestCommands(tmpDir);
      expect(warnSpy).not.toHaveBeenCalled();
      expect(result).toEqual([]);
      warnSpy.mockRestore();
    });
  });

  describe('getConfigTestCommand error branches', () => {
    test('logs warning for non-ENOENT/EACCES config read errors', () => {
      fs.mkdirSync(path.join(tmpDir, 'stdd'), { recursive: true });
      // Create config.yaml as a directory so readFileSync throws EISDIR
      fs.mkdirSync(path.join(tmpDir, 'stdd', 'config.yaml'));
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const result = getConfigTestCommand(tmpDir);
      expect(warnSpy).toHaveBeenCalled();
      expect(result).toBeNull();
      warnSpy.mockRestore();
    });

    test('silently handles ENOENT error in getConfigTestCommand catch', () => {
      // Use jest.isolateModules to mock fs so readFileSync throws ENOENT inside the try block
      // This covers the branch where err.code === 'ENOENT' skips console.error
      jest.isolateModules(() => {
        const realFs = require('fs');
        const mockFs = {
          ...realFs,
          readFileSync: jest.fn().mockImplementation((_p) => {
            const err = new Error('ENOENT');
            err.code = 'ENOENT';
            throw err;
          }),
        };
        jest.doMock('fs', () => mockFs);
        jest.doMock('js-yaml', () => ({ load: realFs.readFileSync })); // yaml not reached

        // Need a config.yaml to exist so we get past the existsSync check
        // but readFileSync in the try block throws ENOENT
        const _yaml = require('js-yaml');
        jest.doMock('js-yaml', () => ({
          load: jest.fn().mockImplementation(() => { throw new Error('should not reach'); }),
        }));

        const { getConfigTestCommand } = require('../src/utils/test-command-resolver');
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        // We need the existsSync to return true to enter the try block
        const fsMod = require('fs');
        const origExists = fsMod.existsSync;
        fsMod.existsSync = () => true;

        const result = getConfigTestCommand(tmpDir);
        expect(result).toBeNull();
        expect(warnSpy).not.toHaveBeenCalled();

        fsMod.existsSync = origExists;
        warnSpy.mockRestore();
      });
    });
  });

  describe('resolveTestCommands workspace without test script', () => {
    test('returns empty when workspace object has no test script and no testCommand', () => {
      const ws = { name: 'api', root: tmpDir };
      writePkg(tmpDir, { name: 'api' }); // no scripts.test
      const result = resolveTestCommands(tmpDir, { workspace: ws });
      expect(result).toEqual([]);
    });
  });

  describe('resolveTestCommands workspace name fallback (line 78)', () => {
    test('uses workspace.name when pkg exists but has no name', () => {
      const ws = { name: 'my-workspace', root: tmpDir };
      writePkg(tmpDir, { scripts: { test: 'jest' } }); // pkg without name field
      const result = resolveTestCommands(tmpDir, { workspace: ws });
      expect(result).toHaveLength(1);
      expect(result[0].workspaceName).toBe('my-workspace');
    });
  });

  describe('resolveTestCommands root name fallback (line 94)', () => {
    test('uses "root" when rootPkg exists but has no name', () => {
      writePkg(tmpDir, { scripts: { test: 'jest' } }); // no name field
      const result = resolveTestCommands(tmpDir);
      expect(result).toHaveLength(1);
      expect(result[0].workspaceName).toBe('root');
    });
  });

  describe('resolveTestCommands workspace detection name fallback (line 103)', () => {
    test('uses workspace.name when detected workspace pkg has no name', () => {
      writePkg(tmpDir, { name: 'mono', private: true, workspaces: ['packages/*'] });
      const apiDir = path.join(tmpDir, 'packages', 'api');
      fs.mkdirSync(apiDir, { recursive: true });
      writePkg(apiDir, { scripts: { test: 'jest' } }); // no name field

      const result = resolveTestCommands(tmpDir);
      expect(result).toHaveLength(1);
      // Should use the workspace directory name since pkg has no name
      expect(result[0].workspaceName).toBe('api');
      expect(result[0].source).toBe('workspace');
    });
  });

  describe('detectPackageManager', () => {
    test('detects bun from bun.lockb', () => {
      fs.writeFileSync(path.join(tmpDir, 'bun.lockb'), '');
      expect(_detectPackageManager(tmpDir)).toBe('bun');
    });
  });

  describe('_detectPackageManagerWithFallback', () => {
    const { _detectPackageManagerWithFallback } = require('../src/utils/test-command-resolver');

    test('uses workspace PM when it has own lock file', () => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-pm-'));
      fs.writeFileSync(path.join(root, 'yarn.lock'), '');
      const wsRoot = path.join(root, 'packages', 'api');
      fs.mkdirSync(wsRoot, { recursive: true });
      fs.writeFileSync(path.join(wsRoot, 'pnpm-lock.yaml'), '');

      expect(_detectPackageManagerWithFallback(wsRoot, root)).toBe('pnpm');
    });

    test('falls back to root PM when workspace has no lock file', () => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-pm-'));
      fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), '');
      const wsRoot = path.join(root, 'packages', 'api');
      fs.mkdirSync(wsRoot, { recursive: true });

      expect(_detectPackageManagerWithFallback(wsRoot, root)).toBe('pnpm');
    });

    test('returns npm when neither has lock file', () => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-pm-'));
      const wsRoot = path.join(root, 'packages', 'api');
      fs.mkdirSync(wsRoot, { recursive: true });

      expect(_detectPackageManagerWithFallback(wsRoot, root)).toBe('npm');
    });
  });
});
