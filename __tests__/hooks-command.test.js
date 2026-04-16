const fs = require('fs');
const path = require('path');
const os = require('os');
const hooksCommand = require('../src/cli/commands/hooks');

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
    expect(fs.existsSync(path.join(projectPath, '.cursor', 'settings.json'))).toBe(true);
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
});
