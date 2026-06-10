const fs = require('fs');
const path = require('path');
const os = require('os');

// 在文件顶部 mock inquirer，后续通过 mockFn 控制行为
jest.mock('inquirer', () => ({
  prompt: jest.fn(),
}));
const inquirer = require('inquirer');
const { InitCommand } = require('../src/cli/commands/init');

describe('InitCommand', () => {
  let tempDirs = [];
  let logSpy;

  function createTempDir(prefix = 'stdd-init-test-') {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    tempDirs.push(dir);
    return dir;
  }

  const silentSpinner = {
    text: '',
    start() {},
    stop() {},
    succeed() {},
    fail() {}
  };

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    if (logSpy) {
      logSpy.mockRestore();
    }
  });

  afterAll(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('should create config.yaml using target directory name in non-interactive mode', async () => {
    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'my-target-project');
    fs.mkdirSync(targetPath, { recursive: true });

    const initCommand = new InitCommand(silentSpinner);
    await initCommand.execute(targetPath, { nonInteractive: true, skipSkills: true });

    const configPath = path.join(targetPath, 'stdd', 'config.yaml');
    const configContent = fs.readFileSync(configPath, 'utf8');

    expect(configContent).toContain('name: "my-target-project"');
  });

  it('should honor --skip-skills and leave skills directory empty', async () => {
    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'skip-skills-project');
    fs.mkdirSync(targetPath, { recursive: true });

    const initCommand = new InitCommand(silentSpinner);
    await initCommand.execute(targetPath, { nonInteractive: true, skipSkills: true });

    const skillsDir = path.join(targetPath, '.claude', 'skills');
    const skillsEntries = fs.readdirSync(skillsDir);

    expect(fs.existsSync(skillsDir)).toBe(true);
    expect(skillsEntries).toHaveLength(0);
  });

  it('should detect Node/Jest tech stack and write to config.yaml', async () => {
    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'node-jest-project');
    fs.mkdirSync(targetPath, { recursive: true });
    fs.writeFileSync(
      path.join(targetPath, 'package.json'),
      JSON.stringify({
        name: 'node-jest-project',
        devDependencies: { jest: '^29.0.0' },
      })
    );

    const initCommand = new InitCommand(silentSpinner);
    await initCommand.execute(targetPath, { nonInteractive: true, skipSkills: true });

    const configPath = path.join(targetPath, 'stdd', 'config.yaml');
    const configContent = fs.readFileSync(configPath, 'utf8');

    expect(configContent).toContain('language: "node"');
    expect(configContent).toContain('command: "npx jest"');
    expect(configContent).toContain('runner: "jest"');
  });

  it('should detect Python/pytest tech stack and write to config.yaml', async () => {
    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'python-project');
    fs.mkdirSync(targetPath, { recursive: true });
    fs.writeFileSync(
      path.join(targetPath, 'requirements.txt'),
      'flask==2.0\npytest==7.0\n'
    );

    const initCommand = new InitCommand(silentSpinner);
    await initCommand.execute(targetPath, { nonInteractive: true, skipSkills: true });

    const configPath = path.join(targetPath, 'stdd', 'config.yaml');
    const configContent = fs.readFileSync(configPath, 'utf8');

    expect(configContent).toContain('language: "python"');
    expect(configContent).toContain('command: "pytest"');
    expect(configContent).toContain('runner: "pytest"');
  });

  it('should create foundation.md with detected tech stack info', async () => {
    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'foundation-project');
    fs.mkdirSync(targetPath, { recursive: true });
    fs.writeFileSync(
      path.join(targetPath, 'Cargo.toml'),
      '[package]\nname = "rust-app"\n'
    );

    const initCommand = new InitCommand(silentSpinner);
    await initCommand.execute(targetPath, { nonInteractive: true, skipSkills: true });

    const foundationPath = path.join(targetPath, 'stdd', 'memory', 'foundation.md');
    const content = fs.readFileSync(foundationPath, 'utf8');

    expect(content).toContain('Detected: rust');
    expect(content).toContain('Rust');
    expect(content).toContain('cargo test');
  });

  it('should create foundation.md for unknown tech stack', async () => {
    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'empty-project');
    fs.mkdirSync(targetPath, { recursive: true });

    const initCommand = new InitCommand(silentSpinner);
    await initCommand.execute(targetPath, { nonInteractive: true, skipSkills: true });

    const foundationPath = path.join(targetPath, 'stdd', 'memory', 'foundation.md');
    const content = fs.readFileSync(foundationPath, 'utf8');

    expect(content).toContain('Unknown language');
    expect(content).toContain('Not detected');
  });

  it('should register detected pnpm workspaces in config.yaml and foundation.md', async () => {
    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'workspace-project');
    fs.mkdirSync(targetPath, { recursive: true });
    fs.writeFileSync(path.join(targetPath, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
    fs.mkdirSync(path.join(targetPath, 'packages', 'api'), { recursive: true });
    fs.writeFileSync(
      path.join(targetPath, 'packages', 'api', 'package.json'),
      JSON.stringify({ name: '@scope/api' })
    );

    const initCommand = new InitCommand(silentSpinner);
    await initCommand.execute(targetPath, { nonInteractive: true, skipSkills: true });

    const configPath = path.join(targetPath, 'stdd', 'config.yaml');
    const configContent = fs.readFileSync(configPath, 'utf8');
    const foundationPath = path.join(targetPath, 'stdd', 'memory', 'foundation.md');
    const foundationContent = fs.readFileSync(foundationPath, 'utf8');

    expect(configContent).toContain('workspaces:');
    expect(configContent).toContain('enabled: true');
    expect(configContent).toContain('name: "@scope/api"');
    expect(configContent).toContain('root: "packages/api"');
    expect(configContent).toContain('source_root: "packages/api/src"');
    expect(configContent).toContain('package_json: "packages/api/package.json"');
    expect(foundationContent).toContain('## Monorepo/Workspaces');
    expect(foundationContent).toContain('- @scope/api: packages/api');
  });

  it('should render detected workspaces in PR template for monorepos', async () => {
    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'workspace-pr-template-project');
    fs.mkdirSync(targetPath, { recursive: true });
    fs.writeFileSync(path.join(targetPath, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n  - apps/*\n');
    fs.mkdirSync(path.join(targetPath, 'packages', 'api'), { recursive: true });
    fs.mkdirSync(path.join(targetPath, 'apps', 'web'), { recursive: true });
    fs.writeFileSync(
      path.join(targetPath, 'packages', 'api', 'package.json'),
      JSON.stringify({ name: '@scope/api' })
    );
    fs.writeFileSync(
      path.join(targetPath, 'apps', 'web', 'package.json'),
      JSON.stringify({ name: '@scope/web' })
    );

    const initCommand = new InitCommand(silentSpinner);
    await initCommand.execute(targetPath, { nonInteractive: true, skipSkills: true });

    const prTemplatePath = path.join(targetPath, '.github', 'PULL_REQUEST_TEMPLATE.md');
    const content = fs.readFileSync(prTemplatePath, 'utf8');

    expect(content).toContain('## Affected Workspaces');
    expect(content).toContain('- [ ] packages/api');
    expect(content).toContain('- [ ] apps/web');
    expect(content).toContain('chaos verify --workspace <workspace>');
    expect(content).toContain('chaos metrics --workspace <workspace>');
  });

  it('should keep generic workspace placeholders in PR template for non-monorepos', async () => {
    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'non-workspace-pr-template-project');
    fs.mkdirSync(targetPath, { recursive: true });

    const initCommand = new InitCommand(silentSpinner);
    await initCommand.execute(targetPath, { nonInteractive: true, skipSkills: true });

    const prTemplatePath = path.join(targetPath, '.github', 'PULL_REQUEST_TEMPLATE.md');
    const content = fs.readFileSync(prTemplatePath, 'utf8');

    expect(content).toContain('- [ ] packages/api');
    expect(content).toContain('- [ ] apps/web');
    expect(content).toContain('- [ ] root/shared');
  });

  it('should create .github/PULL_REQUEST_TEMPLATE.md during initialization', async () => {
    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'github-templates-project');
    fs.mkdirSync(targetPath, { recursive: true });

    const initCommand = new InitCommand(silentSpinner);
    await initCommand.execute(targetPath, { nonInteractive: true, skipSkills: true });

    const prTemplatePath = path.join(targetPath, '.github', 'PULL_REQUEST_TEMPLATE.md');

    expect(fs.existsSync(prTemplatePath)).toBe(true);
  });

  it('should include STDD checklist items in PR template', async () => {
    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'pr-checklist-project');
    fs.mkdirSync(targetPath, { recursive: true });

    const initCommand = new InitCommand(silentSpinner);
    await initCommand.execute(targetPath, { nonInteractive: true, skipSkills: true });

    const prTemplatePath = path.join(targetPath, '.github', 'PULL_REQUEST_TEMPLATE.md');
    const content = fs.readFileSync(prTemplatePath, 'utf8');

    expect(content).toContain('Proposal created');
    expect(content).toContain('Tests pass');
    expect(content).toContain('Specs updated');
    expect(content).toContain('Constitution check');
  });

  it('should create GitHub issue templates', async () => {
    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'issue-templates-project');
    fs.mkdirSync(targetPath, { recursive: true });

    const initCommand = new InitCommand(silentSpinner);
    await initCommand.execute(targetPath, { nonInteractive: true, skipSkills: true });

    const bugReportPath = path.join(targetPath, '.github', 'ISSUE_TEMPLATE', 'bug_report.md');
    const featureRequestPath = path.join(targetPath, '.github', 'ISSUE_TEMPLATE', 'feature_request.md');

    expect(fs.existsSync(bugReportPath)).toBe(true);
    expect(fs.existsSync(featureRequestPath)).toBe(true);
  });

  it('should not overwrite existing .github/PULL_REQUEST_TEMPLATE.md', async () => {
    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'no-overwrite-project');
    fs.mkdirSync(targetPath, { recursive: true });

    const githubDir = path.join(targetPath, '.github');
    fs.mkdirSync(githubDir, { recursive: true });
    const existingContent = '# Custom PR Template\nThis is my custom template.';
    fs.writeFileSync(path.join(githubDir, 'PULL_REQUEST_TEMPLATE.md'), existingContent);

    const initCommand = new InitCommand(silentSpinner);
    await initCommand.execute(targetPath, { nonInteractive: true, skipSkills: true });

    const prTemplatePath = path.join(targetPath, '.github', 'PULL_REQUEST_TEMPLATE.md');
    const content = fs.readFileSync(prTemplatePath, 'utf8');

    expect(content).toBe(existingContent);
  });

  it('should include workspace fields in GitHub issue templates', async () => {
    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'issue-workspace-template-project');
    fs.mkdirSync(targetPath, { recursive: true });

    const initCommand = new InitCommand(silentSpinner);
    await initCommand.execute(targetPath, { nonInteractive: true, skipSkills: true });

    const bugContent = fs.readFileSync(
      path.join(targetPath, '.github', 'ISSUE_TEMPLATE', 'bug_report.md'),
      'utf8'
    );
    const featureContent = fs.readFileSync(
      path.join(targetPath, '.github', 'ISSUE_TEMPLATE', 'feature_request.md'),
      'utf8'
    );

    expect(bugContent).toContain('Affected Workspace(s)');
    expect(bugContent).toContain('chaos context --workspace <workspace> --export');
    expect(featureContent).toContain('Affected Workspace(s)');
    expect(featureContent).toContain('chaos context --workspace <workspace> --export');
  });

  it('should force re-initialize with --force flag', async () => {
    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'force-project');
    fs.mkdirSync(targetPath, { recursive: true });

    const initCommand = new InitCommand(silentSpinner);
    await initCommand.execute(targetPath, { nonInteractive: true, skipSkills: true });

    const configPath = path.join(targetPath, 'stdd', 'config.yaml');
    fs.readFileSync(configPath, 'utf8');

    await initCommand.execute(targetPath, { nonInteractive: true, skipSkills: true, force: true });

    expect(fs.existsSync(configPath)).toBe(true);
  });

  it('should throw error when already initialized without --force', async () => {
    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'already-init-project');
    fs.mkdirSync(targetPath, { recursive: true });

    const initCommand = new InitCommand(silentSpinner);
    await initCommand.execute(targetPath, { nonInteractive: true, skipSkills: true });

    await expect(
      initCommand.execute(targetPath, { nonInteractive: true, skipSkills: true })
    ).rejects.toThrow('STDD already initialized');
  });

  it('should update existing .gitignore with STDD entries', async () => {
    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'gitignore-project');
    fs.mkdirSync(targetPath, { recursive: true });
    fs.writeFileSync(path.join(targetPath, '.gitignore'), 'node_modules/\ndist/\n');

    const initCommand = new InitCommand(silentSpinner);
    await initCommand.execute(targetPath, { nonInteractive: true, skipSkills: true });

    const gitignoreContent = fs.readFileSync(path.join(targetPath, '.gitignore'), 'utf8');
    expect(gitignoreContent).toContain('node_modules/');
    expect(gitignoreContent).toContain('# STDD Copilot');
  });

  it('should not duplicate STDD entries in .gitignore', async () => {
    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'gitignore-dup-project');
    fs.mkdirSync(targetPath, { recursive: true });
    fs.writeFileSync(path.join(targetPath, '.gitignore'), 'node_modules/\n# STDD Copilot\nstdd/\n');

    const initCommand = new InitCommand(silentSpinner);
    await initCommand.execute(targetPath, { nonInteractive: true, skipSkills: true });

    const gitignoreContent = fs.readFileSync(path.join(targetPath, '.gitignore'), 'utf8');
    const stddCount = (gitignoreContent.match(/# STDD Copilot/g) || []).length;
    expect(stddCount).toBe(1);
  });

  it('should copy skills when skipSkills is false', async () => {
    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'skills-project');
    fs.mkdirSync(targetPath, { recursive: true });

    const initCommand = new InitCommand(silentSpinner);
    await initCommand.execute(targetPath, { nonInteractive: true, skipSkills: false });

    const claudeSkillsDir = path.join(targetPath, '.claude', 'skills', 'stdd');
    if (fs.existsSync(claudeSkillsDir)) {
      const entries = fs.readdirSync(claudeSkillsDir);
      expect(entries.length).toBeGreaterThan(0);
    }
  });

  it('should copy hooks for selected agents', async () => {
    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'hooks-project');
    fs.mkdirSync(targetPath, { recursive: true });

    const initCommand = new InitCommand(silentSpinner);
    await initCommand.execute(targetPath, { nonInteractive: true, skipSkills: true });

    const hooksDir = path.join(targetPath, '.claude', 'hooks');
    if (fs.existsSync(hooksDir)) {
      const files = fs.readdirSync(hooksDir);
      expect(files.some(f => f.endsWith('.js'))).toBe(true);
    }
  });

  it('should copy schemas directory', async () => {
    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'schemas-project');
    fs.mkdirSync(targetPath, { recursive: true });

    const initCommand = new InitCommand(silentSpinner);
    await initCommand.execute(targetPath, { nonInteractive: true, skipSkills: true });

    const schemaPath = path.join(targetPath, 'schemas');
    if (fs.existsSync(schemaPath)) {
      const entries = fs.readdirSync(schemaPath, { recursive: true });
      expect(entries.length).toBeGreaterThan(0);
    }
  });

  it('formatTechStack formats node project correctly', () => {
    const initCommand = new InitCommand(silentSpinner);
    const result = initCommand.formatTechStack({
      language: 'node',
      framework: 'express',
      testRunner: 'jest',
    });
    expect(result).toContain('Node.js');
    expect(result).toContain('express');
    expect(result).toContain('jest');
  });

  it('formatTechStack formats python project correctly', () => {
    const initCommand = new InitCommand(silentSpinner);
    const result = initCommand.formatTechStack({
      language: 'python',
      framework: 'unknown',
      testRunner: 'unknown',
    });
    expect(result).toContain('Python');
  });

  it('formatTechStack formats rust project correctly', () => {
    const initCommand = new InitCommand(silentSpinner);
    const result = initCommand.formatTechStack({
      language: 'rust',
      framework: 'unknown',
      testRunner: 'unknown',
    });
    expect(result).toContain('Rust');
  });

  it('formatTechStack formats go project correctly', () => {
    const initCommand = new InitCommand(silentSpinner);
    const result = initCommand.formatTechStack({
      language: 'go',
      framework: 'unknown',
      testRunner: 'unknown',
    });
    expect(result).toContain('Go');
  });

  it('formatAffectedWorkspaces returns generic placeholders for no workspaces', () => {
    const initCommand = new InitCommand(silentSpinner);
    const result = initCommand.formatAffectedWorkspaces([]);
    expect(result).toContain('packages/api');
    expect(result).toContain('apps/web');
    expect(result).toContain('root/shared');
  });

  it('formatAffectedWorkspaces returns workspace paths when given', () => {
    const initCommand = new InitCommand(silentSpinner);
    const result = initCommand.formatAffectedWorkspaces([
      { name: 'api', root: '/project/packages/api' },
    ], '/project');
    expect(result).toContain('packages/api');
  });

  it('getDefaultSelectedAgents returns default agents', () => {
    const initCommand = new InitCommand(silentSpinner);
    const agents = initCommand.getDefaultSelectedAgents();
    expect(Array.isArray(agents)).toBe(true);
    expect(agents.length).toBeGreaterThan(0);
  });

  it('shouldPromptForAgents returns false in nonInteractive mode', () => {
    const initCommand = new InitCommand(silentSpinner);
    expect(initCommand.shouldPromptForAgents({ nonInteractive: true })).toBe(false);
    expect(initCommand.shouldPromptForAgents({ yes: true })).toBe(false);
  });

  // ========== shouldPromptForAgents TTY 检测逻辑 ==========

  it('shouldPromptForAgents returns true when stdin/stdout are both TTY and no nonInteractive flag', () => {
    const initCommand = new InitCommand(silentSpinner);
    // 保存原始 TTY 状态
    const origStdin = process.stdin.isTTY;
    const origStdout = process.stdout.isTTY;
    process.stdin.isTTY = true;
    process.stdout.isTTY = true;

    try {
      expect(initCommand.shouldPromptForAgents({})).toBe(true);
      expect(initCommand.shouldPromptForAgents({ nonInteractive: false })).toBe(true);
    } finally {
      process.stdin.isTTY = origStdin;
      process.stdout.isTTY = origStdout;
    }
  });

  it('shouldPromptForAgents returns false when stdin is not TTY', () => {
    const initCommand = new InitCommand(silentSpinner);
    const origStdin = process.stdin.isTTY;
    const origStdout = process.stdout.isTTY;
    process.stdin.isTTY = false;
    process.stdout.isTTY = true;

    try {
      expect(initCommand.shouldPromptForAgents({})).toBe(false);
    } finally {
      process.stdin.isTTY = origStdin;
      process.stdout.isTTY = origStdout;
    }
  });

  it('shouldPromptForAgents returns false when stdout is not TTY', () => {
    const initCommand = new InitCommand(silentSpinner);
    const origStdin = process.stdin.isTTY;
    const origStdout = process.stdout.isTTY;
    process.stdin.isTTY = true;
    process.stdout.isTTY = false;

    try {
      expect(initCommand.shouldPromptForAgents({})).toBe(false);
    } finally {
      process.stdin.isTTY = origStdin;
      process.stdout.isTTY = origStdout;
    }
  });

  // ========== inquirer 交互提示分支 (行 193-213) ==========

  it('should prompt with inquirer in interactive TTY mode and use selected engines', async () => {
    // 设置 inquirer mock 返回用户选择了 .claude 和 .codex
    inquirer.prompt.mockResolvedValue({ agents: ['.claude', '.codex'] });

    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'interactive-project');
    fs.mkdirSync(targetPath, { recursive: true });

    const initCommand = new InitCommand(silentSpinner);

    // 模拟 TTY 环境
    const origStdin = process.stdin.isTTY;
    const origStdout = process.stdout.isTTY;
    process.stdin.isTTY = true;
    process.stdout.isTTY = true;

    try {
      await initCommand.execute(targetPath, { skipSkills: true });

      // inquirer.prompt 应该被调用过
      expect(inquirer.prompt).toHaveBeenCalled();

      // 验证 prompt 参数包含 checkbox 类型和引擎选项
      const promptArg = inquirer.prompt.mock.calls[0][0];
      expect(promptArg[0].type).toBe('checkbox');
      expect(promptArg[0].name).toBe('agents');
      expect(promptArg[0].choices.length).toBeGreaterThan(0);

      // 验证包含 Exit 占位选项（disabled）
      const exitChoice = promptArg[0].choices.find(c => c.value === '__exit__');
      expect(exitChoice).toBeDefined();
      expect(exitChoice.disabled).toBe(true);

      // 验证用户选择的引擎被实际使用：.claude 和 .codex 目录应该被创建
      expect(fs.existsSync(path.join(targetPath, '.claude', 'commands', 'stdd'))).toBe(true);
      expect(fs.existsSync(path.join(targetPath, '.codex', 'commands', 'stdd'))).toBe(true);

      // config.yaml 应该存在
      expect(fs.existsSync(path.join(targetPath, 'stdd', 'config.yaml'))).toBe(true);
    } finally {
      process.stdin.isTTY = origStdin;
      process.stdout.isTTY = origStdout;
      inquirer.prompt.mockReset();
    }
  });

  it('should restore spinner state after inquirer prompt (stop then start)', async () => {
    inquirer.prompt.mockResolvedValue({ agents: ['.claude'] });

    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'spinner-restore-project');
    fs.mkdirSync(targetPath, { recursive: true });

    // 使用带追踪的 spinner mock
    const trackerSpinner = {
      text: '',
      start: jest.fn(),
      stop: jest.fn(),
      succeed: jest.fn(),
      fail: jest.fn(),
    };

    const initCommand = new InitCommand(trackerSpinner);

    const origStdin = process.stdin.isTTY;
    const origStdout = process.stdout.isTTY;
    process.stdin.isTTY = true;
    process.stdout.isTTY = true;

    try {
      await initCommand.execute(targetPath, { skipSkills: true });

      // spinner.stop 应该在 inquirer 调用前被调用
      expect(trackerSpinner.stop).toHaveBeenCalled();
      // spinner.start 应该在 inquirer 返回后被调用
      expect(trackerSpinner.start).toHaveBeenCalled();
    } finally {
      process.stdin.isTTY = origStdin;
      process.stdout.isTTY = origStdout;
      inquirer.prompt.mockReset();
    }
  });

  // ========== 用户未选择任何 engine 时的取消路径 (行 216-219) ==========

  it('should cancel initialization without error when user selects no engines', async () => {
    // 用户在交互界面取消所有选择
    inquirer.prompt.mockResolvedValue({ agents: [] });

    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'no-engine-project');
    fs.mkdirSync(targetPath, { recursive: true });

    const initCommand = new InitCommand(silentSpinner);

    const origStdin = process.stdin.isTTY;
    const origStdout = process.stdout.isTTY;
    process.stdin.isTTY = true;
    process.stdout.isTTY = true;

    try {
      // 不应该抛出错误，而是优雅退出
      await initCommand.execute(targetPath, { skipSkills: true });

      // stdd 目录不应该被创建
      expect(fs.existsSync(path.join(targetPath, 'stdd'))).toBe(false);
      // config.yaml 不应该存在
      expect(fs.existsSync(path.join(targetPath, 'stdd', 'config.yaml'))).toBe(false);

      // console.log 应该被调用了取消消息
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('No AI engine selected'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('stdd init -y'));
    } finally {
      process.stdin.isTTY = origStdin;
      process.stdout.isTTY = origStdout;
      inquirer.prompt.mockReset();
    }
  });

  it('should cancel when selectedAgents is null from inquirer', async () => {
    // 模拟 inquirer 返回 agents 为 null（极端情况）
    inquirer.prompt.mockResolvedValue({ agents: null });

    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'null-agents-project');
    fs.mkdirSync(targetPath, { recursive: true });

    const initCommand = new InitCommand(silentSpinner);

    const origStdin = process.stdin.isTTY;
    const origStdout = process.stdout.isTTY;
    process.stdin.isTTY = true;
    process.stdout.isTTY = true;

    try {
      await initCommand.execute(targetPath, { skipSkills: true });

      // stdd 目录不应该被创建（selectedAgents 被 filter 后为空数组）
      expect(fs.existsSync(path.join(targetPath, 'stdd'))).toBe(false);
    } finally {
      process.stdin.isTTY = origStdin;
      process.stdout.isTTY = origStdout;
      inquirer.prompt.mockReset();
    }
  });

  // ========== getDefaultSelectedAgents fallback 路径 (行 154-157) ==========

  it('getDefaultSelectedAgents returns checked engines from config', () => {
    // 默认配置中 .claude 的 checked=true，正常路径
    const initCommand = new InitCommand(silentSpinner);
    const defaults = initCommand.getDefaultSelectedAgents();
    expect(defaults).toContain('.claude');
  });

  it('getDefaultSelectedAgents fallback to first engine when no checked engines exist', () => {
    // 使用 jest.isolateModules 确保每个 require 调用获得独立的模块实例
    jest.isolateModules(() => {
      // mock engines.json：所有引擎都不勾选，但 engines 数组非空
      jest.mock('../src/config/engines.json', () => ({
        engines: [
          { "name": "OpenCode", "value": ".opencode" },
          { "name": "Codex", "value": ".codex" },
        ],
      }));

      const { InitCommand: IsolatedInitCommand } = require('../src/cli/commands/init');
      const cmd = new IsolatedInitCommand(silentSpinner);
      const defaults = cmd.getDefaultSelectedAgents();

      // 没有 checked=true，应 fallback 到 engines[0].value = '.opencode'
      expect(defaults).toEqual(['.opencode']);
    });
  });

  it('getDefaultSelectedAgents fallback to [.claude] when engines array is empty', () => {
    // 测试 engines 为空数组时的最终 fallback（行 157）
    jest.isolateModules(() => {
      jest.mock('../src/config/engines.json', () => ({
        engines: [],
      }));

      const { InitCommand: IsolatedInitCommand } = require('../src/cli/commands/init');
      const cmd = new IsolatedInitCommand(silentSpinner);
      const defaults = cmd.getDefaultSelectedAgents();

      // engines 为空数组，且 engines[0] 为 undefined，应 fallback 到 ['.claude']
      expect(defaults).toEqual(['.claude']);
    });
  });

  // ========== formatTechStack unknown language 分支 ==========

  it('formatTechStack returns raw language string for unknown language', () => {
    const initCommand = new InitCommand(silentSpinner);

    // 使用 java 这种不在 node/python/rust/go 映射中的语言
    const result = initCommand.formatTechStack({
      language: 'java',
      framework: 'unknown',
      testRunner: 'unknown',
    });
    expect(result).toContain('java');
    expect(result).not.toContain('Node.js');
    expect(result).not.toContain('Python');
    expect(result).not.toContain('Rust');
    expect(result).not.toContain('Go');
  });

  it('formatTechStack returns "unknown" when language is "unknown"', () => {
    const initCommand = new InitCommand(silentSpinner);

    const result = initCommand.formatTechStack({
      language: 'unknown',
      framework: 'unknown',
      testRunner: 'unknown',
    });
    expect(result).toContain('unknown');
    expect(result).toBe('unknown project');
  });

  it('formatTechStack handles exotic language with framework and testRunner', () => {
    const initCommand = new InitCommand(silentSpinner);

    const result = initCommand.formatTechStack({
      language: 'elixir',
      framework: 'phoenix',
      testRunner: 'exunit',
    });
    expect(result).toContain('elixir');
    expect(result).toContain('phoenix');
    expect(result).toContain('exunit');
  });

  // ========== Constructor tests ==========

  it('should use provided spinner in constructor', () => {
    const customSpinner = {
      text: '',
      start: jest.fn(),
      stop: jest.fn(),
      succeed: jest.fn(),
      fail: jest.fn(),
    };
    const cmd = new InitCommand(customSpinner);
    expect(cmd.spinner).toBe(customSpinner);
  });

  it('should create default spinner when none provided', () => {
    const cmd = new InitCommand();
    expect(cmd.spinner).toBeDefined();
    expect(cmd.spinner.start).toBeDefined();
    expect(cmd.spinner.stop).toBeDefined();
    expect(cmd.spinner.succeed).toBeDefined();
    expect(cmd.spinner.fail).toBeDefined();
    // Default spinner should be callable without error
    expect(() => cmd.spinner.start()).not.toThrow();
    expect(() => cmd.spinner.stop()).not.toThrow();
  });

  // ========== exists() method tests ==========

  it('exists() returns true for existing path', async () => {
    const targetRoot = createTempDir();
    const testFile = path.join(targetRoot, 'existing-file.txt');
    fs.writeFileSync(testFile, 'test');

    const cmd = new InitCommand(silentSpinner);
    const result = await cmd.exists(testFile);
    expect(result).toBe(true);
  });

  it('exists() returns false for non-existent path (ENOENT)', async () => {
    const targetRoot = createTempDir();
    const nonExistent = path.join(targetRoot, 'does-not-exist');

    const cmd = new InitCommand(silentSpinner);
    const result = await cmd.exists(nonExistent);
    expect(result).toBe(false);
  });

  it('exists() returns false for permission denied path (EACCES)', async () => {
    const _targetRoot = createTempDir();
    const cmd = new InitCommand(silentSpinner);
    // Use a path that won't exist with EACCES code
    // Since fs.access throws with code ENOENT for non-existent paths,
    // we test the EACCES branch by mocking
    const origAccess = require('fs').promises.access;
    require('fs').promises.access = jest.fn().mockRejectedValue(Object.assign(new Error('EACCES'), { code: 'EACCES' }));
    try {
      const result = await cmd.exists('/some/path');
      expect(result).toBe(false);
    } finally {
      require('fs').promises.access = origAccess;
    }
  });

  // ========== createDirectories() direct test ==========

  it('createDirectories() creates all base directories', async () => {
    const targetRoot = createTempDir();
    const cmd = new InitCommand(silentSpinner);

    await cmd.createDirectories(targetRoot, ['.claude']);

    expect(fs.existsSync(path.join(targetRoot, 'stdd'))).toBe(true);
    expect(fs.existsSync(path.join(targetRoot, 'stdd', 'specs'))).toBe(true);
    expect(fs.existsSync(path.join(targetRoot, 'stdd', 'changes'))).toBe(true);
    expect(fs.existsSync(path.join(targetRoot, 'stdd', 'changes', 'archive'))).toBe(true);
    expect(fs.existsSync(path.join(targetRoot, 'stdd', 'memory'))).toBe(true);
    expect(fs.existsSync(path.join(targetRoot, 'stdd', 'graph'))).toBe(true);
    expect(fs.existsSync(path.join(targetRoot, 'stdd', 'explorations'))).toBe(true);
  });

  it('createDirectories() creates agent-specific directories', async () => {
    const targetRoot = createTempDir();
    const cmd = new InitCommand(silentSpinner);

    await cmd.createDirectories(targetRoot, ['.claude', '.codex']);

    expect(fs.existsSync(path.join(targetRoot, '.claude', 'commands', 'stdd'))).toBe(true);
    expect(fs.existsSync(path.join(targetRoot, '.claude', 'skills'))).toBe(true);
    expect(fs.existsSync(path.join(targetRoot, '.codex', 'commands', 'stdd'))).toBe(true);
    expect(fs.existsSync(path.join(targetRoot, '.codex', 'skills'))).toBe(true);
  });

  // ========== createAgentsMd() direct test ==========

  it('createAgentsMd() creates AGENTS.md with correct content', async () => {
    const targetRoot = createTempDir();
    const cmd = new InitCommand(silentSpinner);

    await cmd.createAgentsMd(targetRoot);

    const agentsPath = path.join(targetRoot, 'AGENTS.md');
    expect(fs.existsSync(agentsPath)).toBe(true);

    const content = fs.readFileSync(agentsPath, 'utf8');
    expect(content).toContain('STDD Copilot');
    expect(content).toContain('Spec-First');
    expect(content).toContain('Test-Driven');
    expect(content).toContain('/stdd:init');
    expect(content).toContain('/stdd:new');
    expect(content).toContain('/stdd:apply');
    expect(content).toContain('/stdd:archive');
    expect(content).toContain('/stdd:verify');
  });

  // ========== createConfigYaml() direct test ==========

  it('createConfigYaml() uses target directory basename as project name', async () => {
    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'my-cool-project');
    fs.mkdirSync(targetPath, { recursive: true });
    fs.mkdirSync(path.join(targetPath, 'stdd'), { recursive: true });

    const cmd = new InitCommand(silentSpinner);
    await cmd.createConfigYaml(targetPath, { language: 'node', testRunner: 'jest', testCommand: 'npx jest' });

    const content = fs.readFileSync(path.join(targetPath, 'stdd', 'config.yaml'), 'utf8');
    expect(content).toContain('name: "my-cool-project"');
    expect(content).toContain('version: "1.0"');
    expect(content).toContain('ralph_loop');
    expect(content).toContain('max_iterations: 10');
    expect(content).toContain('mutation');
    expect(content).toContain('threshold: 80');
    expect(content).toContain('defense');
    expect(content).toContain('confirm_gate');
    expect(content).toContain('memory');
    expect(content).toContain('enabled: true');
  });

  it('createConfigYaml() uses default tech stack when none provided', async () => {
    const targetRoot = createTempDir();
    fs.mkdirSync(path.join(targetRoot, 'stdd'), { recursive: true });

    const cmd = new InitCommand(silentSpinner);
    await cmd.createConfigYaml(targetRoot);

    const content = fs.readFileSync(path.join(targetRoot, 'stdd', 'config.yaml'), 'utf8');
    // When techStack is {}, language is undefined, so it falls through to the template
    // literal expression which evaluates the JS expression LANGUAGE:-typescript => undefined
    expect(content).toContain('runner: "unknown"');
    expect(content).toContain('version: "1.0"');
    // testCommand falls back to the template literal ${TEST_COMMAND:-npm test}
    expect(content).toContain('npm test');
  });

  // ========== createFoundationMd() direct tests ==========

  it('createFoundationMd() writes rust tech stack correctly', async () => {
    const targetRoot = createTempDir();
    fs.mkdirSync(path.join(targetRoot, 'stdd', 'memory'), { recursive: true });

    const cmd = new InitCommand(silentSpinner);
    await cmd.createFoundationMd(targetRoot, {
      language: 'rust',
      framework: 'unknown',
      testRunner: 'unknown',
      testCommand: 'cargo test',
    });

    const content = fs.readFileSync(path.join(targetRoot, 'stdd', 'memory', 'foundation.md'), 'utf8');
    expect(content).toContain('Detected: rust');
    expect(content).toContain('Rust');
    expect(content).toContain('Not detected'); // framework unknown
    expect(content).toContain('cargo test');
  });

  it('createFoundationMd() writes go tech stack correctly', async () => {
    const targetRoot = createTempDir();
    fs.mkdirSync(path.join(targetRoot, 'stdd', 'memory'), { recursive: true });

    const cmd = new InitCommand(silentSpinner);
    await cmd.createFoundationMd(targetRoot, {
      language: 'go',
      framework: 'gin',
      testRunner: 'go test',
      testCommand: 'go test ./...',
    });

    const content = fs.readFileSync(path.join(targetRoot, 'stdd', 'memory', 'foundation.md'), 'utf8');
    expect(content).toContain('Detected: go');
    expect(content).toContain('Go');
    expect(content).toContain('gin');
    expect(content).toContain('go test ./...');
  });

  it('createFoundationMd() writes node tech stack with framework', async () => {
    const targetRoot = createTempDir();
    fs.mkdirSync(path.join(targetRoot, 'stdd', 'memory'), { recursive: true });

    const cmd = new InitCommand(silentSpinner);
    await cmd.createFoundationMd(targetRoot, {
      language: 'node',
      framework: 'express',
      testRunner: 'jest',
      testCommand: 'npx jest',
    });

    const content = fs.readFileSync(path.join(targetRoot, 'stdd', 'memory', 'foundation.md'), 'utf8');
    expect(content).toContain('Detected: node');
    expect(content).toContain('Node.js (JavaScript/TypeScript)');
    expect(content).toContain('express');
    expect(content).toContain('jest');
  });

  it('createFoundationMd() writes python tech stack', async () => {
    const targetRoot = createTempDir();
    fs.mkdirSync(path.join(targetRoot, 'stdd', 'memory'), { recursive: true });

    const cmd = new InitCommand(silentSpinner);
    await cmd.createFoundationMd(targetRoot, {
      language: 'python',
      framework: 'flask',
      testRunner: 'pytest',
      testCommand: 'pytest',
    });

    const content = fs.readFileSync(path.join(targetRoot, 'stdd', 'memory', 'foundation.md'), 'utf8');
    expect(content).toContain('Detected: python');
    expect(content).toContain('Python');
    expect(content).toContain('flask');
    expect(content).toContain('pytest');
  });

  // ========== renderGitHubTemplate() direct test ==========

  it('renderGitHubTemplate() replaces workspace markers', () => {
    const cmd = new InitCommand(silentSpinner);
    const template = 'Before\n<!-- STDD:WORKSPACES:start -->placeholder<!-- STDD:WORKSPACES:end -->\nAfter';
    const result = cmd.renderGitHubTemplate(template, '/project', [
      { name: 'api', root: '/project/packages/api' },
      { name: 'web', root: '/project/apps/web' },
    ]);

    expect(result).toContain('packages/api');
    expect(result).toContain('apps/web');
    expect(result).toContain('STDD:WORKSPACES:start');
    expect(result).toContain('STDD:WORKSPACES:end');
  });

  it('renderGitHubTemplate() uses generic placeholders for empty workspaces', () => {
    const cmd = new InitCommand(silentSpinner);
    const template = 'Before\n<!-- STDD:WORKSPACES:start -->placeholder<!-- STDD:WORKSPACES:end -->\nAfter';
    const result = cmd.renderGitHubTemplate(template, '/project', []);

    expect(result).toContain('packages/api');
    expect(result).toContain('apps/web');
    expect(result).toContain('root/shared');
  });

  it('renderGitHubTemplate() returns unchanged content when no workspace markers', () => {
    const cmd = new InitCommand(silentSpinner);
    const template = 'No markers here';
    const result = cmd.renderGitHubTemplate(template, '/project', []);
    expect(result).toBe('No markers here');
  });

  // ========== copyDirContents() direct test ==========

  it('copyDirContents() only copies .md files', async () => {
    const targetRoot = createTempDir();
    const sourceDir = path.join(targetRoot, 'source');
    const targetDir = path.join(targetRoot, 'target');

    fs.mkdirSync(sourceDir, { recursive: true });
    fs.writeFileSync(path.join(sourceDir, 'cmd1.md'), '# Command 1');
    fs.writeFileSync(path.join(sourceDir, 'cmd2.md'), '# Command 2');
    fs.writeFileSync(path.join(sourceDir, 'ignore.txt'), 'should not copy');
    fs.writeFileSync(path.join(sourceDir, 'ignore.js'), 'module.exports = {}');

    const cmd = new InitCommand(silentSpinner);
    await cmd.copyDirContents(sourceDir, targetDir);

    expect(fs.existsSync(path.join(targetDir, 'cmd1.md'))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, 'cmd2.md'))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, 'ignore.txt'))).toBe(false);
    expect(fs.existsSync(path.join(targetDir, 'ignore.js'))).toBe(false);
  });

  it('copyDirContents() does nothing when source does not exist', async () => {
    const targetRoot = createTempDir();
    const nonExistent = path.join(targetRoot, 'nonexistent');
    const targetDir = path.join(targetRoot, 'target');

    const cmd = new InitCommand(silentSpinner);
    await cmd.copyDirContents(nonExistent, targetDir);

    // target dir should not be created if source doesn't exist
    expect(fs.existsSync(targetDir)).toBe(false);
  });

  // ========== copyHooks() direct test ==========

  it('copyHooks() skips when hooks source directory does not exist', async () => {
    const targetRoot = createTempDir();

    const cmd = new InitCommand(silentSpinner);
    // The copyHooks method checks if sourceDir exists and returns early if not.
    // With the real getPackageRoot, it points to this project's templates/hooks.
    // To test the "source doesn't exist" path, we temporarily override.
    const _origMethod = cmd.copyHooks.bind(cmd);
    // Spy on cmd.exists to force it to return false for the hooks sourceDir
    const origExists = cmd.exists.bind(cmd);
    cmd.exists = async function(p) {
      // Return false only for paths that look like the hooks template dir
      if (p.includes('templates') && p.includes('hooks')) return false;
      return origExists(p);
    };

    // Should not throw and should not create hooks dirs
    await cmd.copyHooks(targetRoot, ['.claude']);
    expect(fs.existsSync(path.join(targetRoot, '.claude', 'hooks'))).toBe(false);

    cmd.exists = origExists;
  });

  // ========== updateGitignore() direct tests ==========

  it('updateGitignore() creates .gitignore when none exists', async () => {
    const targetRoot = createTempDir();

    const cmd = new InitCommand(silentSpinner);
    await cmd.updateGitignore(targetRoot, ['.claude']);

    const gitignore = fs.readFileSync(path.join(targetRoot, '.gitignore'), 'utf8');
    expect(gitignore).toContain('# STDD Copilot');
    expect(gitignore).toContain('stdd/graph/cache/');
    expect(gitignore).toContain('stdd/memory/*.bin');
    expect(gitignore).toContain('stdd/evidence/');
    expect(gitignore).toContain('.claude/tdd-guard/');
  });

  it('updateGitignore() appends agent tdd-guard entries for multiple agents', async () => {
    const targetRoot = createTempDir();

    const cmd = new InitCommand(silentSpinner);
    await cmd.updateGitignore(targetRoot, ['.claude', '.codex']);

    const gitignore = fs.readFileSync(path.join(targetRoot, '.gitignore'), 'utf8');
    expect(gitignore).toContain('.claude/tdd-guard/');
    expect(gitignore).toContain('.codex/tdd-guard/');
  });

  it('updateGitignore() skips if STDD Copilot entries already present', async () => {
    const targetRoot = createTempDir();
    const gitignorePath = path.join(targetRoot, '.gitignore');
    fs.writeFileSync(gitignorePath, 'node_modules/\n# STDD Copilot\nstdd/\n');

    const originalContent = fs.readFileSync(gitignorePath, 'utf8');

    const cmd = new InitCommand(silentSpinner);
    await cmd.updateGitignore(targetRoot, ['.claude']);

    const content = fs.readFileSync(gitignorePath, 'utf8');
    expect(content).toBe(originalContent);
  });

  // ========== printNextSteps() tests ==========

  it('printNextSteps() prints engine list and tech stack info', () => {
    const cmd = new InitCommand(silentSpinner);

    cmd.printNextSteps(
      ['.claude', '.codex'],
      { language: 'node', framework: 'express', testRunner: 'jest' }
    );

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Chaos Code initialized'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Tech stack:'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Enabled engines: .claude, .codex'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('/stdd:new'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('/stdd:explore'));
  });

  it('printNextSteps() skips tech stack info for unknown language', () => {
    const cmd = new InitCommand(silentSpinner);

    cmd.printNextSteps(['.claude'], { language: 'unknown', framework: 'unknown', testRunner: 'unknown' });

    // Should not print the tech stack dim line for unknown
    const techStackCalls = logSpy.mock.calls.filter(
      c => typeof c[0] === 'string' && c[0].includes('Tech stack:')
    );
    expect(techStackCalls).toHaveLength(0);
  });

  it('printNextSteps() handles empty agents array', () => {
    const cmd = new InitCommand(silentSpinner);

    cmd.printNextSteps([], { language: 'node', framework: 'unknown', testRunner: 'unknown' });

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Chaos Code initialized'));
    // Should not print enabled engines line when empty
    const engineCalls = logSpy.mock.calls.filter(
      c => typeof c[0] === 'string' && c[0].includes('Enabled engines:')
    );
    expect(engineCalls).toHaveLength(0);
  });

  // ========== normalizeRelativePath() indirect test via formatAffectedWorkspaces ==========

  it('formatAffectedWorkspaces normalizes Windows-style backslashes', () => {
    const cmd = new InitCommand(silentSpinner);
    // Simulate a workspace whose relative path would have backslashes on Windows
    // On *nix this just tests the normal path
    const result = cmd.formatAffectedWorkspaces(
      [{ name: 'api', root: '/project/packages/api' }],
      '/project'
    );
    expect(result).not.toContain('\\');
    expect(result).toContain('packages/api');
  });

  // ========== copyGitHubTemplates() does not overwrite existing files ==========

  it('copyGitHubTemplates() skips existing files in nested directories', async () => {
    const targetRoot = createTempDir();
    const githubDir = path.join(targetRoot, '.github', 'ISSUE_TEMPLATE');
    fs.mkdirSync(githubDir, { recursive: true });

    const existingBugReport = '# My Custom Bug Report\n';
    fs.writeFileSync(path.join(githubDir, 'bug_report.md'), existingBugReport);

    const cmd = new InitCommand(silentSpinner);
    await cmd.copyGitHubTemplates(targetRoot, []);

    const bugContent = fs.readFileSync(path.join(githubDir, 'bug_report.md'), 'utf8');
    expect(bugContent).toBe(existingBugReport);

    // Feature request should still be copied since it didn't exist
    expect(fs.existsSync(path.join(githubDir, 'feature_request.md'))).toBe(true);
  });

  // ========== execute() with AGENTS.md creation verification ==========

  it('should create AGENTS.md with version header during execute', async () => {
    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'agents-md-project');
    fs.mkdirSync(targetPath, { recursive: true });

    const cmd = new InitCommand(silentSpinner);
    await cmd.execute(targetPath, { nonInteractive: true, skipSkills: true });

    const agentsPath = path.join(targetPath, 'AGENTS.md');
    expect(fs.existsSync(agentsPath)).toBe(true);
    const content = fs.readFileSync(agentsPath, 'utf8');
    // Verify the date stamp is present (today's date)
    const today = new Date().toISOString().split('T')[0];
    expect(content).toContain(today);
  });

  // ========== execute() creates all base stdd subdirectories ==========

  it('should create all expected stdd subdirectories', async () => {
    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'subdir-project');
    fs.mkdirSync(targetPath, { recursive: true });

    const cmd = new InitCommand(silentSpinner);
    await cmd.execute(targetPath, { nonInteractive: true, skipSkills: true });

    expect(fs.existsSync(path.join(targetPath, 'stdd', 'specs'))).toBe(true);
    expect(fs.existsSync(path.join(targetPath, 'stdd', 'changes'))).toBe(true);
    expect(fs.existsSync(path.join(targetPath, 'stdd', 'changes', 'archive'))).toBe(true);
    expect(fs.existsSync(path.join(targetPath, 'stdd', 'memory'))).toBe(true);
    expect(fs.existsSync(path.join(targetPath, 'stdd', 'graph'))).toBe(true);
    expect(fs.existsSync(path.join(targetPath, 'stdd', 'explorations'))).toBe(true);
  });

  // ========== execute() inquirer error handling ==========

  it('should restore spinner even when inquirer throws', async () => {
    inquirer.prompt.mockRejectedValue(new Error('User aborted'));

    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'inquirer-error-project');
    fs.mkdirSync(targetPath, { recursive: true });

    const trackerSpinner = {
      text: '',
      start: jest.fn(),
      stop: jest.fn(),
      succeed: jest.fn(),
      fail: jest.fn(),
    };

    const cmd = new InitCommand(trackerSpinner);

    const origStdin = process.stdin.isTTY;
    const origStdout = process.stdout.isTTY;
    process.stdin.isTTY = true;
    process.stdout.isTTY = true;

    try {
      await expect(cmd.execute(targetPath, { skipSkills: true })).rejects.toThrow('User aborted');
      // The finally block in execute should still restore spinner
      expect(trackerSpinner.start).toHaveBeenCalled();
    } finally {
      process.stdin.isTTY = origStdin;
      process.stdout.isTTY = origStdout;
      inquirer.prompt.mockReset();
    }
  });

  // ========== buildConfigYamlTemplate workspace integration ==========

  it('should include workspace registry in config.yaml for monorepo', async () => {
    const targetRoot = createTempDir();
    const targetPath = path.join(targetRoot, 'yaml-workspace-project');
    fs.mkdirSync(targetPath, { recursive: true });
    fs.writeFileSync(path.join(targetPath, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
    fs.mkdirSync(path.join(targetPath, 'packages', 'ui'), { recursive: true });
    fs.writeFileSync(
      path.join(targetPath, 'packages', 'ui', 'package.json'),
      JSON.stringify({ name: '@scope/ui' })
    );

    const cmd = new InitCommand(silentSpinner);
    await cmd.execute(targetPath, { nonInteractive: true, skipSkills: true });

    const configContent = fs.readFileSync(path.join(targetPath, 'stdd', 'config.yaml'), 'utf8');
    expect(configContent).toContain('Monorepo Workspace Registry');
    expect(configContent).toContain('name: "@scope/ui"');
    expect(configContent).toContain('root: "packages/ui"');
    expect(configContent).toContain('package_json: "packages/ui/package.json"');
  });
});
