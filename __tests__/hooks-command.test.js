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
    });
  });
});
