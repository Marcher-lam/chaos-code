const fs = require('fs');
const path = require('path');
const os = require('os');
const hooksCommand = require('../src/cli/commands/hooks');

describe('HooksCommand - Verify', () => {
  let tempDirs = [];
  let originalCwd;
  let logSpy;

  function createTempDir(name) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-verify-test-'));
    tempDirs.push(root);
    const dir = path.join(root, name);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  function writeSettings(settingsPath, content) {
    const dir = path.dirname(settingsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(settingsPath, JSON.stringify(content, null, 2));
  }

  function createFakeHookScript(scriptPath) {
    const dir = path.dirname(scriptPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(scriptPath, '// fake hook');
    return scriptPath;
  }

  function outputLines() {
    return logSpy.mock.calls.map(call => String(call[0]));
  }

  beforeEach(() => {
    originalCwd = process.cwd();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (logSpy) {
      logSpy.mockRestore();
    }
  });

  afterAll(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  describe('extractScriptPath', () => {
    it('should extract script path from hook command', () => {
      const entry = {
        matcher: 'Edit|Write',
        hooks: [{ type: 'command', command: 'node /some/path/.claude/hooks/pre-file-write.js' }]
      };
      const result = hooksCommand.extractScriptPath(entry);
      expect(result).toBe('/some/path/.claude/hooks/pre-file-write.js');
    });

    it('should return null for invalid entry', () => {
      expect(hooksCommand.extractScriptPath(null)).toBeNull();
      expect(hooksCommand.extractScriptPath({})).toBeNull();
      expect(hooksCommand.extractScriptPath({ hooks: 'not-array' })).toBeNull();
    });

    it('should return null when no command matches', () => {
      const entry = { hooks: [{ type: 'command', command: 'echo hello' }] };
      expect(hooksCommand.extractScriptPath(entry)).toBeNull();
    });
  });

  describe('isSTDDHook', () => {
    it('should identify pre-file-write.js as STDD hook', () => {
      expect(hooksCommand.isSTDDHook('node /path/pre-file-write.js')).toBe(true);
    });

    it('should identify post-file-write.js as STDD hook', () => {
      expect(hooksCommand.isSTDDHook('node /path/post-file-write.js')).toBe(true);
    });

    it('should identify stdd-guard as STDD hook', () => {
      expect(hooksCommand.isSTDDHook('stdd-guard check')).toBe(true);
    });

    it('should reject non-STDD commands', () => {
      expect(hooksCommand.isSTDDHook('echo hello')).toBe(false);
      expect(hooksCommand.isSTDDHook(null)).toBe(false);
      expect(hooksCommand.isSTDDHook(undefined)).toBe(false);
    });
  });

  describe('verifySettingsFile', () => {
    let tempDir;
    let settingsPath;
    let hooksDir;
    let validScriptPath;

    beforeEach(() => {
      tempDir = createTempDir('verify-test');
      hooksDir = path.join(tempDir, '.claude', 'hooks');
      validScriptPath = createFakeHookScript(path.join(hooksDir, 'pre-file-write.js'));
      createFakeHookScript(path.join(hooksDir, 'post-file-write.js'));
      settingsPath = path.join(tempDir, '.claude', 'settings.json');
    });

    it('should return active when config has valid STDD hooks', () => {
      writeSettings(settingsPath, {
        hooks: {
          PreToolUse: [{
            matcher: 'Edit|Write',
            hooks: [{ type: 'command', command: `node ${validScriptPath}` }]
          }],
          PostToolUse: [{
            matcher: 'Edit|Write',
            hooks: [{ type: 'command', command: `node ${path.join(hooksDir, 'post-file-write.js')}` }]
          }]
        }
      });

      const result = hooksCommand.verifySettingsFile(settingsPath);
      expect(result.status).toBe('active');
      expect(result.pre.status).toBe('active');
      expect(result.post.status).toBe('active');
    });

    it('should return not-installed when settings file does not exist', () => {
      const nonExistentPath = path.join(tempDir, '.claude', 'settings.json');
      const result = hooksCommand.verifySettingsFile(nonExistentPath);
      expect(result.status).toBe('not-installed');
      expect(result.pre.status).toBe('not-installed');
      expect(result.post.status).toBe('not-installed');
    });

    it('should return not-installed when settings file is empty object', () => {
      writeSettings(settingsPath, {});
      const result = hooksCommand.verifySettingsFile(settingsPath);
      expect(result.status).toBe('not-installed');
    });

    it('should return not-installed when settings has no hooks', () => {
      writeSettings(settingsPath, { theme: 'dark', name: 'test' });
      const result = hooksCommand.verifySettingsFile(settingsPath);
      expect(result.status).toBe('not-installed');
    });

    it('should return broken when script path does not exist', () => {
      const fakeScript = '/nonexistent/path/to/pre-file-write.js';
      writeSettings(settingsPath, {
        hooks: {
          PreToolUse: [{
            matcher: 'Edit|Write',
            hooks: [{ type: 'command', command: `node ${fakeScript}` }]
          }],
          PostToolUse: [{
            matcher: 'Edit|Write',
            hooks: [{ type: 'command', command: `node ${path.join(hooksDir, 'post-file-write.js')}` }]
          }]
        }
      });

      const result = hooksCommand.verifySettingsFile(settingsPath);
      expect(result.status).toBe('broken');
      expect(result.pre.status).toBe('broken');
      expect(result.post.status).toBe('active');
    });

    it('should return not-installed when hooks exist but not STDD hooks', () => {
      writeSettings(settingsPath, {
        hooks: {
          PreToolUse: [{
            matcher: 'Read',
            hooks: [{ type: 'command', command: 'echo custom-hook' }]
          }],
          PostToolUse: [{
            matcher: 'Read',
            hooks: [{ type: 'command', command: 'echo custom-post-hook' }]
          }]
        }
      });

      const result = hooksCommand.verifySettingsFile(settingsPath);
      expect(result.status).toBe('not-installed');
    });

    it('should return broken when both hooks point to missing scripts', () => {
      writeSettings(settingsPath, {
        hooks: {
          PreToolUse: [{
            matcher: 'Edit|Write',
            hooks: [{ type: 'command', command: 'node /missing/pre-file-write.js' }]
          }],
          PostToolUse: [{
            matcher: 'Edit|Write',
            hooks: [{ type: 'command', command: 'node /missing/post-file-write.js' }]
          }]
        }
      });

      const result = hooksCommand.verifySettingsFile(settingsPath);
      expect(result.status).toBe('broken');
    });
  });

  describe('formatVerificationResult', () => {
    it('should format active result with green checkmarks', () => {
      const results = [{
        status: 'active',
        settingsPath: '/test/.claude/settings.json',
        pre: { status: 'active', scriptPath: '/test/hooks/pre-file-write.js' },
        post: { status: 'active', scriptPath: '/test/hooks/post-file-write.js' }
      }];

      const output = hooksCommand.formatVerificationResult(results);
      expect(output).toContain('Active');
      expect(output).toContain('验证通过');
    });

    it('should format not-installed result with red cross', () => {
      const results = [{
        status: 'not-installed',
        settingsPath: '/test/.claude/settings.json',
        pre: { status: 'not-installed', scriptPath: null },
        post: { status: 'not-installed', scriptPath: null }
      }];

      const output = hooksCommand.formatVerificationResult(results);
      expect(output).toContain('Not Installed');
      expect(output).toContain('hooks install');
    });

    it('should format broken result with yellow warning', () => {
      const results = [{
        status: 'broken',
        settingsPath: '/test/.claude/settings.json',
        pre: { status: 'broken', scriptPath: '/missing/pre-file-write.js' },
        post: { status: 'active', scriptPath: '/valid/post-file-write.js' }
      }];

      const output = hooksCommand.formatVerificationResult(results);
      expect(output).toContain('Broken');
    });
  });

  describe('verifyHooks integration', () => {
    let tempDir;
    let hooksDir;

    beforeEach(() => {
      tempDir = createTempDir('verify-integration');
      process.chdir(tempDir);
      hooksDir = path.join(tempDir, '.claude', 'hooks');
    });

    it('should return true when hooks are properly installed', () => {
      const preScript = createFakeHookScript(path.join(hooksDir, 'pre-file-write.js'));
      createFakeHookScript(path.join(hooksDir, 'post-file-write.js'));
      const settingsPath = path.join(tempDir, '.claude', 'settings.json');
      writeSettings(settingsPath, {
        hooks: {
          PreToolUse: [{
            matcher: 'Edit|Write',
            hooks: [{ type: 'command', command: `node ${preScript}` }]
          }],
          PostToolUse: [{
            matcher: 'Edit|Write',
            hooks: [{ type: 'command', command: `node ${path.join(hooksDir, 'post-file-write.js')}` }]
          }]
        }
      });

      const result = hooksCommand.verifyHooks({ global: false });
      expect(result).toBe(true);
      const output = outputLines().join('\n');
      expect(output).toContain('Active');
      expect(output).toContain('验证通过');
    });

    it('should return false when hooks are not installed (empty settings)', () => {
      const settingsPath = path.join(tempDir, '.claude', 'settings.json');
      writeSettings(settingsPath, {});

      const result = hooksCommand.verifyHooks({ global: false });
      expect(result).toBe(false);
      const output = outputLines().join('\n');
      expect(output).toContain('Not Installed');
    });

    it('should return false when hooks are broken (missing scripts)', () => {
      const settingsPath = path.join(tempDir, '.claude', 'settings.json');
      writeSettings(settingsPath, {
        hooks: {
          PreToolUse: [{
            matcher: 'Edit|Write',
            hooks: [{ type: 'command', command: 'node /nonexistent/pre-file-write.js' }]
          }],
          PostToolUse: [{
            matcher: 'Edit|Write',
            hooks: [{ type: 'command', command: 'node /nonexistent/post-file-write.js' }]
          }]
        }
      });

      const result = hooksCommand.verifyHooks({ global: false });
      expect(result).toBe(false);
      const output = outputLines().join('\n');
      expect(output).toContain('Broken');
    });
  });
});

describe('HooksCommand', () => {
  let tempDirs = [];
  let originalCwd;
  let logSpy;
  let errorSpy;

  function createTempProject(name, engines = ['.claude']) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-hooks-test-'));
    tempDirs.push(root);

    const projectPath = path.join(root, name);
    fs.mkdirSync(projectPath, { recursive: true });

    for (const engine of engines) {
      fs.mkdirSync(path.join(projectPath, engine), { recursive: true });
    }

    return projectPath;
  }

  function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  function outputLines() {
    return logSpy.mock.calls.map(call => String(call[0]));
  }

  beforeEach(() => {
    originalCwd = process.cwd();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (logSpy) {
      logSpy.mockRestore();
    }
    if (errorSpy) {
      errorSpy.mockRestore();
    }
  });

  afterAll(() => {
    if (originalCwd && process.cwd() !== originalCwd) {
      process.chdir(originalCwd);
    }
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('installHooks should merge with existing settings without dropping custom hooks', () => {
    const projectPath = createTempProject('install-merge-project');
    process.chdir(projectPath);

    const settingsPath = path.join(projectPath, '.claude', 'settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify({
      theme: 'dark',
      hooks: {
        CustomHook: [
          {
            matcher: 'Read',
            hooks: [{ type: 'command', command: 'echo existing' }]
          }
        ]
      }
    }, null, 2));

    const result = hooksCommand.installHooks({ global: false, force: true });

    expect(result).toBe(true);
    const updated = readJson(settingsPath);
    expect(updated.theme).toBe('dark');
    expect(updated.hooks.CustomHook).toBeDefined();
    expect(updated.hooks.PreToolUse).toBeDefined();
    expect(updated.hooks.PostToolUse).toBeDefined();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('disableHooks should create a backup and remove hooks from settings', () => {
    const projectPath = createTempProject('disable-project');
    process.chdir(projectPath);

    hooksCommand.installHooks({ global: false, force: true });
    logSpy.mockClear();

    const result = hooksCommand.disableHooks({ global: false });

    expect(result).toBe(true);
    const settingsPath = path.join(projectPath, '.claude', 'settings.json');
    const backupPath = `${settingsPath}.backup`;
    const disabledSettings = readJson(settingsPath);
    const backupSettings = readJson(backupPath);

    expect(disabledSettings.hooks).toBeUndefined();
    expect(backupSettings.hooks.PreToolUse).toBeDefined();
    expect(backupSettings.hooks.PostToolUse).toBeDefined();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('enableHooks should reinstall only once when backups are missing', () => {
    const projectPath = createTempProject('enable-project', ['.claude', '.cursor']);
    process.chdir(projectPath);

    const result = hooksCommand.enableHooks({ global: false });

    expect(result).toBe(true);

    const installHeadings = outputLines().filter(line => line.includes('STDD Hooks 安装'));
    expect(installHeadings).toHaveLength(1);

    expect(fs.existsSync(path.join(projectPath, '.claude', 'settings.json'))).toBe(true);
    // .cursor is not in engines.json (only .claude is checked), so it won't be installed
    // expect(fs.existsSync(path.join(projectPath, '.cursor', 'settings.json'))).toBe(true);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('statusHooks should reflect disabled state when a backup exists', () => {
    const projectPath = createTempProject('status-project');
    process.chdir(projectPath);

    hooksCommand.installHooks({ global: false, force: true });
    hooksCommand.disableHooks({ global: false });
    logSpy.mockClear();

    const result = hooksCommand.statusHooks({ global: false });

    expect(result).toBe(true);
    expect(outputLines().some(line => line.includes('已禁用 (存在备份)'))).toBe(true);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  describe('Git Hook integration', () => {
    let projectPath;
    let rootTempDir;

    function setupProject(withHusky = false) {
      rootTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-githook-test-'));
      projectPath = path.join(rootTempDir, 'git-project');
      fs.mkdirSync(projectPath, { recursive: true });

      const pkg = { name: 'test-project', version: '1.0.0' };
      if (withHusky) {
        pkg.devDependencies = { husky: '^9.0.0' };
      }
      fs.writeFileSync(
        path.join(projectPath, 'package.json'),
        JSON.stringify(pkg, null, 2)
      );

      fs.mkdirSync(path.join(projectPath, '.git', 'hooks'), { recursive: true });
    }

    function cleanup() {
      if (rootTempDir) {
        fs.rmSync(rootTempDir, { recursive: true, force: true });
      }
    }

    afterEach(() => {
      cleanup();
    });

    describe('install --git (no husky)', () => {
      it('should write .git/hooks/pre-commit containing stdd guard', () => {
        setupProject(false);
        process.chdir(projectPath);

        const result = hooksCommand.installGitHooks({ cwd: projectPath });

        expect(result).toBe(true);
        const hookPath = path.join(projectPath, '.git', 'hooks', 'pre-commit');
        expect(fs.existsSync(hookPath)).toBe(true);
        const content = fs.readFileSync(hookPath, 'utf-8');
        expect(content).toContain('stdd guard');
        const stat = fs.statSync(hookPath);
        expect(stat.mode & 0o111).toBeGreaterThan(0);
      });

      it('should write .husky/pre-commit when husky is in package.json', () => {
        setupProject(true);
        process.chdir(projectPath);

        const result = hooksCommand.installGitHooks({ cwd: projectPath });

        expect(result).toBe(true);
        const hookPath = path.join(projectPath, '.husky', 'pre-commit');
        expect(fs.existsSync(hookPath)).toBe(true);
        const content = fs.readFileSync(hookPath, 'utf-8');
        expect(content).toContain('stdd guard');
        const stat = fs.statSync(hookPath);
        expect(stat.mode & 0o111).toBeGreaterThan(0);
      });

      it('should initialize git repo if .git/hooks does not exist', () => {
        rootTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-githook-nogit-'));
        projectPath = path.join(rootTempDir, 'no-git-project');
        fs.mkdirSync(projectPath, { recursive: true });

        const pkg = { name: 'test-project', version: '1.0.0' };
        fs.writeFileSync(
          path.join(projectPath, 'package.json'),
          JSON.stringify(pkg, null, 2)
        );

        process.chdir(projectPath);

        const result = hooksCommand.installGitHooks({ cwd: projectPath });

        expect(result).toBe(true);
        const hookPath = path.join(projectPath, '.git', 'hooks', 'pre-commit');
        expect(fs.existsSync(hookPath)).toBe(true);
        expect(fs.readFileSync(hookPath, 'utf-8')).toContain('stdd guard');
      });
    });

    describe('verify --git', () => {
      it('should return true when .git/hooks/pre-commit exists with stdd guard', () => {
        setupProject(false);
        const hookPath = path.join(projectPath, '.git', 'hooks', 'pre-commit');
        fs.writeFileSync(hookPath, `#!/bin/sh\nnpx stdd guard --no-constitution\n`);

        process.chdir(projectPath);

        const result = hooksCommand.verifyGitHooks({ cwd: projectPath });
        expect(result).toBe(true);
      });

      it('should return true when .husky/pre-commit exists with stdd guard', () => {
        setupProject(true);
        fs.mkdirSync(path.join(projectPath, '.husky'), { recursive: true });
        const hookPath = path.join(projectPath, '.husky', 'pre-commit');
        fs.writeFileSync(hookPath, `#!/bin/sh\nnpx stdd guard --no-constitution\n`);

        process.chdir(projectPath);

        const result = hooksCommand.verifyGitHooks({ cwd: projectPath });
        expect(result).toBe(true);
      });

      it('should return false when hook file does not exist', () => {
        setupProject(false);
        process.chdir(projectPath);

        const result = hooksCommand.verifyGitHooks({ cwd: projectPath });
        expect(result).toBe(false);
      });

      it('should return false when hook exists but does not contain stdd guard', () => {
        setupProject(false);
        const hookPath = path.join(projectPath, '.git', 'hooks', 'pre-commit');
        fs.writeFileSync(hookPath, `#!/bin/sh\necho "custom hook"\n`);

        process.chdir(projectPath);

        const result = hooksCommand.verifyGitHooks({ cwd: projectPath });
        expect(result).toBe(false);
      });
    });

    describe('hasHusky', () => {
      it('should return true when husky is in devDependencies', () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-husky-test-'));
        const pkgPath = path.join(tempDir, 'package.json');
        fs.writeFileSync(pkgPath, JSON.stringify({
          name: 'test',
          devDependencies: { husky: '^9.0.0' }
        }));

        expect(hooksCommand.hasHusky(tempDir)).toBe(true);
        fs.rmSync(tempDir, { recursive: true, force: true });
      });

      it('should return true when husky is in dependencies', () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-husky-test-'));
        const pkgPath = path.join(tempDir, 'package.json');
        fs.writeFileSync(pkgPath, JSON.stringify({
          name: 'test',
          dependencies: { husky: '^8.0.0' }
        }));

        expect(hooksCommand.hasHusky(tempDir)).toBe(true);
        fs.rmSync(tempDir, { recursive: true, force: true });
      });

      it('should return false when husky is not in package.json', () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-husky-test-'));
        const pkgPath = path.join(tempDir, 'package.json');
        fs.writeFileSync(pkgPath, JSON.stringify({
          name: 'test',
          dependencies: { express: '^4.0.0' }
        }));

        expect(hooksCommand.hasHusky(tempDir)).toBe(false);
        fs.rmSync(tempDir, { recursive: true, force: true });
      });

      it('should return false when package.json does not exist', () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-husky-test-'));
        expect(hooksCommand.hasHusky(tempDir)).toBe(false);
        fs.rmSync(tempDir, { recursive: true, force: true });
      });

      it('should return false when package.json is malformed', () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-husky-test-'));
        const pkgPath = path.join(tempDir, 'package.json');
        fs.writeFileSync(pkgPath, 'not-valid-json{{{');
        expect(hooksCommand.hasHusky(tempDir)).toBe(false);
        fs.rmSync(tempDir, { recursive: true, force: true });
      });

      it('should return false when package.json has null dependencies', () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-husky-test-'));
        const pkgPath = path.join(tempDir, 'package.json');
        fs.writeFileSync(pkgPath, JSON.stringify({ name: 'test', dependencies: null, devDependencies: null }));
        expect(hooksCommand.hasHusky(tempDir)).toBe(false);
        fs.rmSync(tempDir, { recursive: true, force: true });
      });
    });
  });
});

// =========================================================================
// NEW: Comprehensive coverage for uncovered branches
// =========================================================================

describe('HooksCommand - Extended Coverage', () => {
  let tempDirs = [];
  let originalCwd;
  let logSpy;

  function createTempDir(prefix) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    tempDirs.push(dir);
    return dir;
  }

  function createTempProject(name, engines = ['.claude']) {
    const root = createTempDir('stdd-ext-test-');
    const projectPath = path.join(root, name);
    fs.mkdirSync(projectPath, { recursive: true });
    for (const engine of engines) {
      fs.mkdirSync(path.join(projectPath, engine), { recursive: true });
    }
    return projectPath;
  }

  function writeJson(filePath, content) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
  }

  function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  function createFakeHookScript(scriptPath) {
    const dir = path.dirname(scriptPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(scriptPath, '// fake hook');
    return scriptPath;
  }

  function outputLines() {
    return logSpy.mock.calls.map(call => String(call[0]));
  }

  beforeEach(() => {
    originalCwd = process.cwd();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(originalCwd);
    delete process.env.STDD_HOOKS_DISABLED;
    if (logSpy) logSpy.mockRestore();
  });

  afterAll(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  // -----------------------------------------------------------------------
  // getDefaultEngine
  // -----------------------------------------------------------------------
  describe('getDefaultEngine', () => {
    it('should return the checked engine from config', () => {
      const engine = hooksCommand.getDefaultEngine();
      expect(engine).toBeDefined();
      expect(engine.checked).toBe(true);
      expect(engine.value).toBe('.claude');
    });
  });

  // -----------------------------------------------------------------------
  // getSettingsPaths
  // -----------------------------------------------------------------------
  describe('getSettingsPaths', () => {
    it('should return path with engine directory when no agent directories exist (fallback)', () => {
      const emptyDir = createTempDir('stdd-nosettings-');
      process.chdir(emptyDir);

      const paths = hooksCommand.getSettingsPaths(false);
      expect(paths).toHaveLength(1);
      expect(paths[0]).toContain('.claude');
      expect(paths[0]).toContain('settings.json');
    });

    it('should detect active agents when engine directories exist', () => {
      const projectDir = createTempProject('multi-engine', ['.claude', '.opencode']);
      process.chdir(projectDir);

      const paths = hooksCommand.getSettingsPaths(false);
      expect(paths.length).toBeGreaterThanOrEqual(2);
      const values = paths.map(p => {
        const match = p.match(/\/(\.[^/]+)\/settings\.json$/);
        return match ? match[1] : null;
      });
      expect(values).toContain('.claude');
      expect(values).toContain('.opencode');
    });

    it('should use homedir when global=true', () => {
      const paths = hooksCommand.getSettingsPaths(true);
      expect(paths.length).toBeGreaterThanOrEqual(1);
      expect(paths[0]).toContain(os.homedir());
    });

    it('should fallback on readdir error', () => {
      const tempDir = createTempDir('stdd-filecwd-');
      const subFile = path.join(tempDir, 'notadir');
      fs.writeFileSync(subFile, 'content');
      // chdir to the temp dir (valid directory) — readdir of subFile as agent dir will fail
      const origCwd = process.cwd();
      process.chdir(tempDir);

      const paths = hooksCommand.getSettingsPaths(false);
      expect(paths.length).toBeGreaterThanOrEqual(1);

      process.chdir(origCwd);
    });
  });

  // -----------------------------------------------------------------------
  // readSettings
  // -----------------------------------------------------------------------
  describe('readSettings', () => {
    it('should return empty object when file does not exist', () => {
      const result = hooksCommand.readSettings('/nonexistent/path/settings.json');
      expect(result).toEqual({});
    });

    it('should return empty object when file contains malformed JSON', () => {
      const tempDir = createTempDir('stdd-readsettings-');
      const filePath = path.join(tempDir, 'settings.json');
      fs.writeFileSync(filePath, '{not valid json!!!');
      const result = hooksCommand.readSettings(filePath);
      expect(result).toEqual({});
    });

    it('should return parsed object for valid JSON', () => {
      const tempDir = createTempDir('stdd-readsettings-');
      const filePath = path.join(tempDir, 'settings.json');
      const data = { theme: 'dark', hooks: { PreToolUse: [] } };
      fs.writeFileSync(filePath, JSON.stringify(data));
      const result = hooksCommand.readSettings(filePath);
      expect(result).toEqual(data);
    });
  });

  // -----------------------------------------------------------------------
  // writeSettings
  // -----------------------------------------------------------------------
  describe('writeSettings', () => {
    it('should create parent directories if they do not exist', () => {
      const tempDir = createTempDir('stdd-writesettings-');
      const filePath = path.join(tempDir, 'deep', 'nested', 'settings.json');
      const data = { theme: 'light' };

      hooksCommand.writeSettings(filePath, data);

      expect(fs.existsSync(filePath)).toBe(true);
      expect(readJson(filePath)).toEqual(data);
    });

    it('should overwrite existing file', () => {
      const tempDir = createTempDir('stdd-writesettings-');
      const filePath = path.join(tempDir, 'settings.json');
      fs.writeFileSync(filePath, JSON.stringify({ old: true }));

      hooksCommand.writeSettings(filePath, { new: true });
      expect(readJson(filePath)).toEqual({ new: true });
    });

    it('should create the same backup file used by disable and enable', () => {
      const tempDir = createTempDir('stdd-writesettings-');
      const filePath = path.join(tempDir, 'settings.json');
      fs.writeFileSync(filePath, JSON.stringify({ hooks: { PreToolUse: [] } }));

      hooksCommand.writeSettings(filePath, { theme: 'dark' });

      expect(fs.existsSync(`${filePath}.backup`)).toBe(true);
      expect(fs.existsSync(`${filePath}.stdd-backup`)).toBe(false);
    });
  });

  // getSTDDHooksPath is tested indirectly via installHooks/verify tests
  // (cannot mock getPackageRoot after module-level destructuring)

  // -----------------------------------------------------------------------
  // generateHooksConfig
  // -----------------------------------------------------------------------
  describe('generateHooksConfig', () => {
    it('should generate config with PreToolUse and PostToolUse hooks', () => {
      const config = hooksCommand.generateHooksConfig('/some/hooks/path');
      expect(config.hooks).toBeDefined();
      expect(config.hooks.PreToolUse).toHaveLength(1);
      expect(config.hooks.PostToolUse).toHaveLength(1);
      expect(config.hooks.PreToolUse[0].matcher).toBe('Edit|Write');
      expect(config.hooks.PreToolUse[0].hooks[0].type).toBe('command');
      expect(config.hooks.PreToolUse[0].hooks[0].command).toContain('pre-file-write.js');
      expect(config.hooks.PostToolUse[0].hooks[0].command).toContain('post-file-write.js');
    });

    it('should include hooksPath in command', () => {
      const config = hooksCommand.generateHooksConfig('/custom/hooks');
      expect(config.hooks.PreToolUse[0].hooks[0].command).toContain('/custom/hooks');
    });
  });

  // -----------------------------------------------------------------------
  // mergeSettings
  // -----------------------------------------------------------------------
  describe('mergeSettings', () => {
    it('should handle existingSettings with non-object hooks', () => {
      const existing = { hooks: 'not-an-object' };
      const hooksConfig = { hooks: { PreToolUse: [], PostToolUse: [] } };
      const result = hooksCommand.mergeSettings(existing, hooksConfig);
      expect(result.hooks.PreToolUse).toEqual([]);
      expect(result.hooks.PostToolUse).toEqual([]);
    });

    it('should handle hooksConfig with non-object hooks', () => {
      const existing = { hooks: { Custom: [] } };
      const hooksConfig = { hooks: 'not-an-object' };
      const result = hooksCommand.mergeSettings(existing, hooksConfig);
      expect(result.hooks.Custom).toEqual([]);
    });

    it('should handle both existingSettings and hooksConfig having no hooks property', () => {
      const existing = { theme: 'dark' };
      const hooksConfig = { otherProp: true };
      const result = hooksCommand.mergeSettings(existing, hooksConfig);
      expect(result.hooks).toEqual({});
    });

    it('should preserve existing hook categories when merging', () => {
      const existing = {
        theme: 'dark',
        hooks: {
          CustomHook: [{ matcher: 'Read', hooks: [] }],
          PreToolUse: [{ matcher: 'Old', hooks: [] }]
        }
      };
      const hooksConfig = {
        hooks: {
          PreToolUse: [{ matcher: 'New', hooks: [{ type: 'command', command: 'new-cmd' }] }],
          PostToolUse: [{ matcher: 'New', hooks: [] }]
        }
      };
      const result = hooksCommand.mergeSettings(existing, hooksConfig);
      expect(result.theme).toBe('dark');
      expect(result.hooks.CustomHook).toBeDefined();
      // PreToolUse is overridden by generated config
      expect(result.hooks.PreToolUse[0].matcher).toBe('New');
      expect(result.hooks.PostToolUse).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // installHooks - uncovered branches
  // -----------------------------------------------------------------------
  describe('installHooks - edge cases', () => {
    // getSTDDHooksPath returning null cannot be easily tested without
    // reworking the module import structure (destructured at module load)

    it('should skip when existing hooks and force is false', () => {
      const projectPath = createTempProject('skip-project');
      process.chdir(projectPath);

      // First install with force
      hooksCommand.installHooks({ global: false, force: true });
      logSpy.mockClear();

      // Second install without force - should skip
      const result = hooksCommand.installHooks({ global: false, force: false });
      expect(result).toBe(true); // returns true because skippedCount > 0
      expect(outputLines().some(l => l.includes('跳过'))).toBe(true);
    });

    it('should print "X 个配置文件" when multiple settings paths exist', () => {
      const projectPath = createTempProject('multi-settings', ['.claude', '.opencode']);
      process.chdir(projectPath);

      const result = hooksCommand.installHooks({ global: false, force: true });
      expect(result).toBe(true);
      // With 2 engines detected, should say "N 个配置文件"
      expect(outputLines().some(l => l.includes('个配置文件'))).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // disableHooks - edge cases
  // -----------------------------------------------------------------------
  describe('disableHooks - edge cases', () => {
    it('should handle article option (partial disable warning)', () => {
      const projectPath = createTempProject('article-project');
      process.chdir(projectPath);

      const result = hooksCommand.disableHooks({ global: false, article: 2 });
      expect(result).toBe(true);
      expect(outputLines().some(l => l.includes('STDD_HOOKS_DISABLED'))).toBe(true);
    });

    it('should return false when no hooks to disable', () => {
      const projectPath = createTempProject('nodisable-project');
      process.chdir(projectPath);

      // No hooks installed, nothing to disable
      const result = hooksCommand.disableHooks({ global: false });
      expect(result).toBe(false);
      expect(outputLines().some(l => l.includes('未发现可禁用'))).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // enableHooks - edge cases
  // -----------------------------------------------------------------------
  describe('enableHooks - edge cases', () => {
    it('should restore from backup when backup exists', () => {
      const projectPath = createTempProject('restore-project');
      process.chdir(projectPath);

      // Install hooks, then disable (creates backup), then enable
      hooksCommand.installHooks({ global: false, force: true });
      const settingsPath = path.join(projectPath, '.claude', 'settings.json');
      const backupPath = settingsPath + '.backup';

      hooksCommand.disableHooks({ global: false });
      logSpy.mockClear();

      expect(fs.existsSync(backupPath)).toBe(true);

      const result = hooksCommand.enableHooks({ global: false });
      expect(result).toBe(true);
      expect(outputLines().some(l => l.includes('恢复'))).toBe(true);

      // Backup should be removed after restore
      expect(fs.existsSync(backupPath)).toBe(false);
      // Settings should have hooks back
      const restored = readJson(settingsPath);
      expect(restored.hooks).toBeDefined();
    });

    it('should handle partial backup scenario (some backups missing)', () => {
      // Create project with .claude only (single engine), no backup
      const projectPath = createTempProject('partial-backup', ['.claude']);
      process.chdir(projectPath);

      // enableHooks with no backup at all triggers reinstall
      const result = hooksCommand.enableHooks({ global: false });
      expect(result).toBe(true);
      expect(outputLines().some(l => l.includes('没有找到备份') || l.includes('缺少备份'))).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // statusHooks - all states
  // -----------------------------------------------------------------------
  describe('statusHooks - all states', () => {
    it('should show enabled state when hooks are active', () => {
      const projectPath = createTempProject('status-enabled');
      process.chdir(projectPath);

      hooksCommand.installHooks({ global: false, force: true });
      logSpy.mockClear();

      const result = hooksCommand.statusHooks({ global: false });
      expect(result).toBe(true);
      expect(outputLines().some(l => l.includes('已启用'))).toBe(true);
    });

    it('should show session disabled when STDD_HOOKS_DISABLED=1', () => {
      const projectPath = createTempProject('status-envdisabled');
      process.chdir(projectPath);

      hooksCommand.installHooks({ global: false, force: true });
      process.env.STDD_HOOKS_DISABLED = '1';
      logSpy.mockClear();

      const result = hooksCommand.statusHooks({ global: false });
      expect(result).toBe(true);
      expect(outputLines().some(l => l.includes('当前会话已禁用'))).toBe(true);
    });

    it('should show unconfigured when no hooks and no backup', () => {
      const projectPath = createTempProject('status-unconfigured');
      process.chdir(projectPath);

      const result = hooksCommand.statusHooks({ global: false });
      expect(result).toBe(true);
      expect(outputLines().some(l => l.includes('未配置'))).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // verifySettingsFile - uncovered branches
  // -----------------------------------------------------------------------
  describe('verifySettingsFile - edge cases', () => {
    it('should handle null settingsPath', () => {
      const result = hooksCommand.verifySettingsFile(null);
      expect(result.status).toBe('not-installed');
    });

    it('should handle undefined settingsPath', () => {
      const result = hooksCommand.verifySettingsFile(undefined);
      expect(result.status).toBe('not-installed');
    });

    it('should handle non-array PreToolUse hooks', () => {
      const tempDir = createTempDir('stdd-verify-nonarray-');
      const settingsPath = path.join(tempDir, 'settings.json');
      writeJson(settingsPath, {
        hooks: {
          PreToolUse: 'not-an-array',
          PostToolUse: 'not-an-array'
        }
      });

      const result = hooksCommand.verifySettingsFile(settingsPath);
      expect(result.status).toBe('not-installed');
    });

    it('should return broken for mixed state (active pre, not-installed post)', () => {
      const tempDir = createTempDir('stdd-verify-mixed-');
      const hooksDir = path.join(tempDir, 'hooks');
      const preScript = createFakeHookScript(path.join(hooksDir, 'pre-file-write.js'));
      const settingsPath = path.join(tempDir, 'settings.json');

      writeJson(settingsPath, {
        hooks: {
          PreToolUse: [{
            matcher: 'Edit|Write',
            hooks: [{ type: 'command', command: `node ${preScript}` }]
          }],
          PostToolUse: [{
            matcher: 'Edit|Write',
            hooks: [{ type: 'command', command: 'echo not-stdd' }]
          }]
        }
      });

      const result = hooksCommand.verifySettingsFile(settingsPath);
      // pre is active, post is not-installed => overall "broken"
      expect(result.pre.status).toBe('active');
      expect(result.post.status).toBe('not-installed');
      expect(result.status).toBe('broken');
    });

    it('should handle hooks object that is not an object type', () => {
      const tempDir = createTempDir('stdd-verify-hooksstr-');
      const settingsPath = path.join(tempDir, 'settings.json');
      writeJson(settingsPath, { hooks: 42 });

      const result = hooksCommand.verifySettingsFile(settingsPath);
      expect(result.status).toBe('not-installed');
    });
  });

  // -----------------------------------------------------------------------
  // formatVerificationResult - uncovered branches
  // -----------------------------------------------------------------------
  describe('formatVerificationResult - all branches', () => {
    it('should format mixed results (partial failure)', () => {
      const results = [
        { status: 'active', settingsPath: '/a/settings.json', pre: { status: 'active', scriptPath: '/a/pre.js' }, post: { status: 'active', scriptPath: '/a/post.js' } },
        { status: 'not-installed', settingsPath: '/b/settings.json', pre: { status: 'not-installed', scriptPath: null }, post: { status: 'not-installed', scriptPath: null } }
      ];

      const output = hooksCommand.formatVerificationResult(results);
      expect(output).toContain('部分验证失败');
      expect(output).toContain('install --force');
    });

    it('should format all-broken results', () => {
      const results = [{
        status: 'broken',
        settingsPath: '/test/settings.json',
        pre: { status: 'broken', scriptPath: '/missing/pre.js' },
        post: { status: 'broken', scriptPath: '/missing/post.js' }
      }];

      const output = hooksCommand.formatVerificationResult(results);
      expect(output).toContain('Broken');
      expect(output).toContain('install --force');
    });
  });

  // -----------------------------------------------------------------------
  // isSTDDHook - additional edge cases
  // -----------------------------------------------------------------------
  describe('isSTDDHook - edge cases', () => {
    it('should reject non-string types', () => {
      expect(hooksCommand.isSTDDHook(123)).toBe(false);
      expect(hooksCommand.isSTDDHook({})).toBe(false);
      expect(hooksCommand.isSTDDHook([])).toBe(false);
      expect(hooksCommand.isSTDDHook(true)).toBe(false);
    });

    it('should reject empty string', () => {
      expect(hooksCommand.isSTDDHook('')).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // extractScriptPath - additional edge cases
  // -----------------------------------------------------------------------
  describe('extractScriptPath - edge cases', () => {
    it('should return null when hooks entry has no command property', () => {
      const entry = { hooks: [{ type: 'command' }] };
      expect(hooksCommand.extractScriptPath(entry)).toBeNull();
    });

    it('should return null when command is not a string', () => {
      const entry = { hooks: [{ type: 'command', command: 42 }] };
      expect(hooksCommand.extractScriptPath(entry)).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // installGitHooks - git init failure
  // -----------------------------------------------------------------------
  describe('installGitHooks - git init failure', () => {
    it('should return false when git init fails and no .git/hooks exists', () => {
      const tempDir = createTempDir('stdd-gitinitfail-');
      // Create a package.json so hasHusky returns false
      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'test' }));

      // Write-protect the directory so git init fails
      const readOnlyDir = path.join(tempDir, 'readonly-subdir');
      fs.mkdirSync(readOnlyDir);
      fs.chmodSync(readOnlyDir, 0o444);

      let result;
      try {
        result = hooksCommand.installGitHooks({ cwd: readOnlyDir });
      } finally {
        // Always restore permissions for cleanup
        fs.chmodSync(readOnlyDir, 0o755);
      }

      expect(result).toBe(false);
      expect(outputLines().some(l => l.includes('无法初始化') || l.includes('git init'))).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Commander registration (module.exports function)
  // -----------------------------------------------------------------------
  describe('Commander registration', () => {
    function createMockProgram() {
      const mockHooks = {
        command: jest.fn().mockReturnThis(),
        description: jest.fn().mockReturnThis(),
        addHelpText: jest.fn().mockReturnThis(),
        option: jest.fn().mockReturnThis(),
        action: jest.fn().mockReturnThis()
      };
      const mockProgram = {
        command: jest.fn().mockReturnValue(mockHooks),
        description: jest.fn().mockReturnThis(),
        addHelpText: jest.fn().mockReturnThis(),
        option: jest.fn().mockReturnThis(),
        action: jest.fn().mockReturnThis()
      };
      return { mockProgram, mockHooks };
    }

    it('should register hooks command with 5 subcommands', () => {
      const { mockProgram, mockHooks } = createMockProgram();
      hooksCommand(mockProgram);

      // Top-level: program.command('hooks')
      expect(mockProgram.command).toHaveBeenCalledWith('hooks');

      // 5 subcommands on hooks
      const subcommandNames = mockHooks.command.mock.calls.map(c => c[0]);
      expect(subcommandNames).toContain('install');
      expect(subcommandNames).toContain('verify');
      expect(subcommandNames).toContain('disable');
      expect(subcommandNames).toContain('enable');
      expect(subcommandNames).toContain('status');
      expect(subcommandNames).toHaveLength(5);
    });

    it('should register correct options for each subcommand', () => {
      const { mockProgram, mockHooks } = createMockProgram();
      hooksCommand(mockProgram);

      // Each subcommand gets .description(), .option(), .addHelpText(), .action()
      expect(mockHooks.action.mock.calls.length).toBeGreaterThanOrEqual(5);
      expect(mockHooks.description.mock.calls.length).toBeGreaterThanOrEqual(5);
    });

    it('should capture and invoke install action with --git flag', () => {
      const { mockProgram, mockHooks } = createMockProgram();
      hooksCommand(mockProgram);

      // Find install action by index
      const installIndex = mockHooks.command.mock.calls.findIndex(c => c[0] === 'install');
      const installAction = mockHooks.action.mock.calls[installIndex][0];

      // The action calls installHooks and conditionally installGitHooks
      // These call the real closures, so we need a temp project for hooksPath
      const projectPath = createTempProject('cmdr-install-git');
      process.chdir(projectPath);

      // With git:true, both installHooks and installGitHooks should run
      // installGitHooks needs a git repo
      const { execSync } = require('child_process');
      execSync('git init', { cwd: projectPath, stdio: 'pipe' });
      fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({ name: 'test' }));

      installAction({ git: true, force: true });
      // Check git hook was written
      expect(fs.existsSync(path.join(projectPath, '.git', 'hooks', 'pre-commit'))).toBe(true);
    });

    it('verify action should set process.exitCode on failure', () => {
      const { mockProgram, mockHooks } = createMockProgram();
      hooksCommand(mockProgram);

      const verifyIndex = mockHooks.command.mock.calls.findIndex(c => c[0] === 'verify');
      const verifyAction = mockHooks.action.mock.calls[verifyIndex][0];

      // Use empty temp dir so verifyHooks returns false
      const tempDir = createTempDir('stdd-cmdr-verify-');
      process.chdir(tempDir);

      const origExitCode = process.exitCode;

      // Without git flag, should set exitCode=1 when hooks not active
      verifyAction({ git: false });
      expect(process.exitCode).toBe(1);

      // With git flag
      process.exitCode = origExitCode;
      verifyAction({ git: true });
      // Both AI and git hooks will fail
      expect(process.exitCode).toBe(1);

      process.exitCode = origExitCode;
    });

    it('disable and enable actions should work end-to-end', () => {
      const { mockProgram, mockHooks } = createMockProgram();
      hooksCommand(mockProgram);

      const disableIndex = mockHooks.command.mock.calls.findIndex(c => c[0] === 'disable');
      const enableIndex = mockHooks.command.mock.calls.findIndex(c => c[0] === 'enable');
      const disableAction = mockHooks.action.mock.calls[disableIndex][0];
      const enableAction = mockHooks.action.mock.calls[enableIndex][0];

      const projectPath = createTempProject('cmdr-disable-enable');
      process.chdir(projectPath);

      // Install hooks first
      hooksCommand.installHooks({ global: false, force: true });
      logSpy.mockClear();

      // Disable
      const _disableResult = disableAction({ global: false });
      // The action itself just calls disableHooks, which returns true/false
      // But we can verify it ran by checking the settings
      const settingsPath = path.join(projectPath, '.claude', 'settings.json');
      const afterDisable = readJson(settingsPath);
      expect(afterDisable.hooks).toBeUndefined();

      // Enable (restores from backup)
      logSpy.mockClear();
      enableAction({ global: false });
      const afterEnable = readJson(settingsPath);
      expect(afterEnable.hooks).toBeDefined();
    });

    it('status action should work end-to-end', () => {
      const { mockProgram, mockHooks } = createMockProgram();
      hooksCommand(mockProgram);

      const statusIndex = mockHooks.command.mock.calls.findIndex(c => c[0] === 'status');
      const statusAction = mockHooks.action.mock.calls[statusIndex][0];

      const projectPath = createTempProject('cmdr-status');
      process.chdir(projectPath);
      hooksCommand.installHooks({ global: false, force: true });
      logSpy.mockClear();

      statusAction({ global: false });
      expect(outputLines().some(l => l.includes('已启用'))).toBe(true);
    });

    it('disable action with article option should show warning', () => {
      const { mockProgram, mockHooks } = createMockProgram();
      hooksCommand(mockProgram);

      const disableIndex = mockHooks.command.mock.calls.findIndex(c => c[0] === 'disable');
      const disableAction = mockHooks.action.mock.calls[disableIndex][0];

      const projectPath = createTempProject('cmdr-article');
      process.chdir(projectPath);
      logSpy.mockClear();

      disableAction({ global: false, article: 4 });
      expect(outputLines().some(l => l.includes('STDD_HOOKS_DISABLED'))).toBe(true);
    });
  });
});
