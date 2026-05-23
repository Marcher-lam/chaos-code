const fs = require('fs');
const path = require('path');
const os = require('os');
const { SpecGenerator } = require('../src/cli/commands/spec-generator');

describe('SpecGenerator', () => {
  let tempDirs = [];
  let originalCwd;

  function createTempProject(name) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-spec-test-'));
    tempDirs.push(root);

    const projectPath = path.join(root, name);
    fs.mkdirSync(projectPath, { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'stdd', 'specs'), { recursive: true });

    return projectPath;
  }

  function createTasksFile(projectPath, changeName, content) {
    const changeDir = path.join(projectPath, 'stdd', 'changes', changeName);
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'tasks.md'), content, 'utf8');
  }

  function createWorkspace(projectPath, workspacePath, name) {
    fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({ private: true, workspaces: ['packages/*'] }, null, 2));
    const root = path.join(projectPath, workspacePath);
    fs.mkdirSync(root, { recursive: true });
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name }, null, 2));
  }

  beforeEach(() => {
    originalCwd = process.cwd();
  });

  afterEach(() => {
    process.chdir(originalCwd);
  });

  afterAll(() => {
    if (originalCwd && process.cwd() !== originalCwd) {
      process.chdir(originalCwd);
    }
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('should generate a .feature file for each task', async () => {
    const projectPath = createTempProject('feature-gen-project');
    process.chdir(projectPath);

    createTasksFile(projectPath, 'test-change', `# Tasks

- [ ] TASK-001: User Login
- [ ] TASK-002: Create New Post
- [ ] TASK-003: Delete Comment
`);

    const generator = new SpecGenerator();
    const result = await generator.generateFromTasks('test-change');

    expect(result.generated.length).toBe(3);
    expect(result.skipped.length).toBe(0);

    const specsDir = path.join(projectPath, 'stdd', 'changes', 'test-change', 'specs');
    expect(fs.existsSync(path.join(specsDir, 'user-login.feature'))).toBe(true);
    expect(fs.existsSync(path.join(specsDir, 'create-new-post.feature'))).toBe(true);
    expect(fs.existsSync(path.join(specsDir, 'delete-comment.feature'))).toBe(true);
  });

  it('should generate Feature / Scenario / Given / When / Then structure', async () => {
    const projectPath = createTempProject('feature-structure-project');
    process.chdir(projectPath);

    createTasksFile(projectPath, 'structure-change', `# Tasks

- [ ] TASK-001: User Registration
`);

    const generator = new SpecGenerator();
    await generator.generateFromTasks('structure-change');

    const featurePath = path.join(projectPath, 'stdd', 'changes', 'structure-change', 'specs', 'user-registration.feature');
    const content = fs.readFileSync(featurePath, 'utf8');

    expect(content).toContain('Feature: User Registration');
    expect(content).toContain('Scenario: User Registration');
    expect(content).toContain('Given');
    expect(content).toContain('When');
    expect(content).toContain('Then');
    expect(content).toContain('TASK-001');
  });

  it('should use keyword-specific template for "Login"', async () => {
    const projectPath = createTempProject('login-template-project');
    process.chdir(projectPath);

    createTasksFile(projectPath, 'login-change', `# Tasks

- [ ] TASK-001: User Login
`);

    const generator = new SpecGenerator();
    await generator.generateFromTasks('login-change');

    const featurePath = path.join(projectPath, 'stdd', 'changes', 'login-change', 'specs', 'user-login.feature');
    const content = fs.readFileSync(featurePath, 'utf8');

    expect(content).toContain('Given a valid user exists in the system');
    expect(content).toContain('the user is on the login page');
    expect(content).toContain('the user enters valid credentials');
    expect(content).toContain('the user is redirected to the dashboard');
  });

  it('should prefer project-local BDD templates over built-in templates', async () => {
    const projectPath = createTempProject('local-template-project');
    process.chdir(projectPath);
    fs.mkdirSync(path.join(projectPath, 'stdd', 'templates'), { recursive: true });
    fs.writeFileSync(path.join(projectPath, 'stdd', 'templates', 'bdd-templates.yaml'), `login:\n  feature: Custom Login\n  given:\n    - Given a local template user exists\n  when:\n    - When local login runs\n  then:\n    - Then local login succeeds\n`, 'utf8');

    createTasksFile(projectPath, 'local-login-change', `# Tasks

- [ ] TASK-001: User Login
`);

    const generator = new SpecGenerator();
    await generator.generateFromTasks('local-login-change');

    const featurePath = path.join(projectPath, 'stdd', 'changes', 'local-login-change', 'specs', 'user-login.feature');
    const content = fs.readFileSync(featurePath, 'utf8');

    expect(content).toContain('Given a local template user exists');
    expect(content).toContain('When local login runs');
    expect(content).toContain('Then local login succeeds');
  });

  it('should use keyword-specific template for "Delete"', async () => {
    const projectPath = createTempProject('delete-template-project');
    process.chdir(projectPath);

    createTasksFile(projectPath, 'delete-change', `# Tasks

- [ ] TASK-001: Delete User Account
`);

    const generator = new SpecGenerator();
    await generator.generateFromTasks('delete-change');

    const featurePath = path.join(projectPath, 'stdd', 'changes', 'delete-change', 'specs', 'delete-user-account.feature');
    const content = fs.readFileSync(featurePath, 'utf8');

    expect(content).toContain('Given the user is authenticated');
    expect(content).toContain('the resource exists');
    expect(content).toContain('the resource is deleted');
  });

  it('should use default template for non-keyword tasks', async () => {
    const projectPath = createTempProject('default-template-project');
    process.chdir(projectPath);

    createTasksFile(projectPath, 'default-change', `# Tasks

- [ ] TASK-001: Setup Development Environment
`);

    const generator = new SpecGenerator();
    await generator.generateFromTasks('default-change');

    const featurePath = path.join(projectPath, 'stdd', 'changes', 'default-change', 'specs', 'setup-development-environment.feature');
    const content = fs.readFileSync(featurePath, 'utf8');

    expect(content).toContain('Given the system is ready');
    expect(content).toContain('When the user performs the action');
    expect(content).toContain('Then the result is expected');
  });

  it('should skip existing .feature files', async () => {
    const projectPath = createTempProject('skip-existing-project');
    process.chdir(projectPath);

    createTasksFile(projectPath, 'skip-change', `# Tasks

- [ ] TASK-001: User Login
`);

    const specsDir = path.join(projectPath, 'stdd', 'changes', 'skip-change', 'specs');
    fs.mkdirSync(specsDir, { recursive: true });
    fs.writeFileSync(path.join(specsDir, 'user-login.feature'), 'Feature: Existing', 'utf8');

    const generator = new SpecGenerator();
    const result = await generator.generateFromTasks('skip-change');

    expect(result.generated.length).toBe(0);
    expect(result.skipped.length).toBe(1);
    expect(result.skipped[0].file).toBe('user-login.feature');

    const content = fs.readFileSync(path.join(specsDir, 'user-login.feature'), 'utf8');
    expect(content).toBe('Feature: Existing');
  });

  it('should fail when STDD is not initialized', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-spec-test-'));
    tempDirs.push(root);

    const projectPath = path.join(root, 'uninit-project');
    fs.mkdirSync(projectPath, { recursive: true });
    process.chdir(projectPath);

    const generator = new SpecGenerator();

    await expect(generator.generateFromTasks('some-change'))
      .rejects
      .toThrow('STDD not initialized. Run `stdd init` first.');
  });

  it('should fail when change does not exist', async () => {
    const projectPath = createTempProject('missing-change-project');
    process.chdir(projectPath);

    const generator = new SpecGenerator();

    await expect(generator.generateFromTasks('nonexistent-change'))
      .rejects
      .toThrow("Change 'nonexistent-change' does not exist in stdd/changes/.");
  });

  it('should fail when tasks.md does not exist', async () => {
    const projectPath = createTempProject('no-tasks-project');
    process.chdir(projectPath);

    const changeDir = path.join(projectPath, 'stdd', 'changes', 'no-tasks-change');
    fs.mkdirSync(changeDir, { recursive: true });

    const generator = new SpecGenerator();

    await expect(generator.generateFromTasks('no-tasks-change'))
      .rejects
      .toThrow("tasks.md not found in change 'no-tasks-change'.");
  });

  it('should fail when tasks.md has no tasks', async () => {
    const projectPath = createTempProject('empty-tasks-project');
    process.chdir(projectPath);

    createTasksFile(projectPath, 'empty-tasks-change', `# Tasks

No tasks here.
`);

    const generator = new SpecGenerator();

    await expect(generator.generateFromTasks('empty-tasks-change'))
      .rejects
      .toThrow("No tasks found in tasks.md for change 'empty-tasks-change'.");
  });

  it('should include task ID as Gherkin tag', async () => {
    const projectPath = createTempProject('tag-project');
    process.chdir(projectPath);

    createTasksFile(projectPath, 'tag-change', `# Tasks

- [ ] TASK-005: Process Payment
`);

    const generator = new SpecGenerator();
    await generator.generateFromTasks('tag-change');

    const featurePath = path.join(projectPath, 'stdd', 'changes', 'tag-change', 'specs', 'process-payment.feature');
    const content = fs.readFileSync(featurePath, 'utf8');

    expect(content).toContain('@task-005');
  });

  it('should include task ID and description as comment', async () => {
    const projectPath = createTempProject('comment-project');
    process.chdir(projectPath);

    createTasksFile(projectPath, 'comment-change', `# Tasks

- [ ] TASK-002: Upload Image
`);

    const generator = new SpecGenerator();
    await generator.generateFromTasks('comment-change');

    const featurePath = path.join(projectPath, 'stdd', 'changes', 'comment-change', 'specs', 'upload-image.feature');
    const content = fs.readFileSync(featurePath, 'utf8');

    expect(content).toContain('# Task: TASK-002 - Upload Image');
  });

  it('should generate workspace-scoped feature metadata and filename prefix', async () => {
    const projectPath = createTempProject('workspace-feature-project');
    process.chdir(projectPath);
    createWorkspace(projectPath, 'packages/api', '@demo/api');

    createTasksFile(projectPath, 'workspace-change', `# Tasks

- [ ] TASK-001: User Login
`);

    const generator = new SpecGenerator();
    const result = await generator.generateFromTasks('workspace-change', { workspace: 'packages/api' });

    expect(result.workspace).toMatchObject({ name: '@demo/api', path: 'packages/api', tag: 'packages-api' });
    expect(result.generated[0].file).toBe('packages-api-user-login.feature');

    const featurePath = path.join(projectPath, 'stdd', 'changes', 'workspace-change', 'specs', 'packages-api-user-login.feature');
    const content = fs.readFileSync(featurePath, 'utf8');
    expect(content).toContain('# Workspace: packages/api');
    expect(content).toContain('@workspace:packages-api');
  });

  it('should avoid collisions for the same task across workspaces', async () => {
    const projectPath = createTempProject('workspace-collision-project');
    process.chdir(projectPath);
    fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({ private: true, workspaces: ['packages/*'] }, null, 2));
    createWorkspace(projectPath, 'packages/api', '@demo/api');
    createWorkspace(projectPath, 'packages/web', '@demo/web');

    createTasksFile(projectPath, 'collision-change', `# Tasks

- [ ] TASK-001: User Login
`);

    const generator = new SpecGenerator();
    await generator.generateFromTasks('collision-change', { workspace: 'packages/api' });
    await generator.generateFromTasks('collision-change', { workspace: 'packages/web' });

    const specsDir = path.join(projectPath, 'stdd', 'changes', 'collision-change', 'specs');
    expect(fs.existsSync(path.join(specsDir, 'packages-api-user-login.feature'))).toBe(true);
    expect(fs.existsSync(path.join(specsDir, 'packages-web-user-login.feature'))).toBe(true);
  });

  it('should fail when workspace does not exist', async () => {
    const projectPath = createTempProject('missing-workspace-project');
    process.chdir(projectPath);
    fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({ private: true, workspaces: ['packages/*'] }, null, 2));

    createTasksFile(projectPath, 'missing-workspace-change', `# Tasks

- [ ] TASK-001: User Login
`);

    const generator = new SpecGenerator();
    await expect(generator.generateFromTasks('missing-workspace-change', { workspace: 'packages/api' }))
      .rejects
      .toThrow("Workspace 'packages/api' not found.");
  });
});
