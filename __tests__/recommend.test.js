const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { RecommendEngine } = require('../src/cli/commands/recommend');

describe('RecommendEngine', () => {
  function createTempDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-recommend-'));
  }

  function createSTDD(root, changes = {}) {
    const stddDir = path.join(root, 'stdd');
    fs.mkdirSync(path.join(stddDir, 'changes'), { recursive: true });
    fs.writeFileSync(path.join(stddDir, 'config.yaml'), 'version: 1\n');

    for (const [name, content] of Object.entries(changes)) {
      const changeDir = path.join(stddDir, 'changes', name);
      fs.mkdirSync(changeDir, { recursive: true });

      if (content.proposal) {
        fs.writeFileSync(path.join(changeDir, 'proposal.md'), content.proposal);
      }
      if (content.tasks) {
        fs.writeFileSync(path.join(changeDir, 'tasks.md'), content.tasks);
      }
      if (content.specs) {
        const specsDir = path.join(changeDir, 'specs');
        fs.mkdirSync(specsDir, { recursive: true });
        fs.writeFileSync(path.join(specsDir, 'feature.md'), content.specs);
      }
      if (content.applyLog) {
        fs.writeFileSync(path.join(changeDir, 'apply.log'), content.applyLog);
      }
      if (content.evidence) {
        const evidenceDir = path.join(changeDir, 'evidence');
        fs.mkdirSync(evidenceDir, { recursive: true });
        fs.writeFileSync(
          path.join(evidenceDir, 'verify-20260512.json'),
          JSON.stringify(content.evidence)
        );
      }
    }

    return stddDir;
  }

  function createWorkspace(root, workspacePath = 'packages/api', pkg = { name: '@demo/api' }) {
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ private: true, workspaces: ['packages/*'] }));
    const workspaceRoot = path.join(root, workspacePath);
    fs.mkdirSync(path.join(workspaceRoot, 'src'), { recursive: true });
    fs.writeFileSync(path.join(workspaceRoot, 'package.json'), JSON.stringify(pkg));
    return workspaceRoot;
  }

  describe('no active changes', () => {
    it('recommends stdd new when no changes exist', () => {
      const root = createTempDir();
      createSTDD(root);

      const engine = new RecommendEngine(root);
      const recs = engine.recommend();

      expect(recs.length).toBe(1);
      expect(recs[0].command).toContain('stdd new');
      expect(recs[0].state).toBe('no_changes');
    });
  });

  describe('no proposal', () => {
    it('recommends stdd ff when change has no proposal', () => {
      const root = createTempDir();
      createSTDD(root, {
        'my-change': {},
      });

      const engine = new RecommendEngine(root);
      const recs = engine.recommend();

      expect(recs.length).toBe(1);
      expect(recs[0].command).toContain('stdd ff');
      expect(recs[0].state).toBe('no_proposal');
    });
  });

  describe('proposal but no tasks', () => {
    it('recommends writing tasks when proposal exists but no tasks', () => {
      const root = createTempDir();
      createSTDD(root, {
        'my-change': {
          proposal: '# Proposal: Add feature\n',
        },
      });

      const engine = new RecommendEngine(root);
      const recs = engine.recommend();

      expect(recs.length).toBe(1);
      expect(recs[0].command).toContain('stdd ff');
      expect(recs[0].state).toBe('no_tasks');
    });
  });

  describe('all tasks pending', () => {
    it('recommends stdd apply when all tasks are pending', () => {
      const root = createTempDir();
      createSTDD(root, {
        'my-change': {
          proposal: '# Proposal: Add feature\n',
          tasks: '- [ ] TASK-001 Write tests\n- [ ] TASK-002 Implement\n',
        },
      });

      const engine = new RecommendEngine(root);
      const recs = engine.recommend();

      expect(recs.length).toBe(1);
      expect(recs[0].command).toContain('stdd apply');
      expect(recs[0].state).toBe('all_pending');
    });
  });

  describe('partial progress', () => {
    it('recommends stdd continue when some tasks are done', () => {
      const root = createTempDir();
      createSTDD(root, {
        'my-change': {
          proposal: '# Proposal: Add feature\n',
          tasks: '- [x] TASK-001 Write tests\n- [ ] TASK-002 Implement\n',
        },
      });

      const engine = new RecommendEngine(root);
      const recs = engine.recommend();

      expect(recs.length).toBe(1);
      expect(recs[0].command).toContain('stdd continue');
      expect(recs[0].doneTasks).toBe(1);
      expect(recs[0].totalTasks).toBe(2);
    });

    it('recommends stdd continue when last task failed', () => {
      const root = createTempDir();
      const failedLog = `[2026-05-12T10:00:00Z] ${JSON.stringify({ task: 'TASK-002', status: 'failed', command: 'npm test' })}`;
      createSTDD(root, {
        'my-change': {
          proposal: '# Proposal: Add feature\n',
          tasks: '- [x] TASK-001 Write tests\n- [ ] TASK-002 Implement\n',
          applyLog: failedLog,
        },
      });

      const engine = new RecommendEngine(root);
      const recs = engine.recommend();

      expect(recs.length).toBe(1);
      expect(recs[0].command).toContain('stdd continue');
      expect(recs[0].state).toBe('failure_retry');
    });
  });

  describe('all tasks done', () => {
    it('recommends stdd verify when all tasks done and no verification evidence', () => {
      const root = createTempDir();
      createSTDD(root, {
        'my-change': {
          proposal: '# Proposal: Add feature\n',
          tasks: '- [x] TASK-001 Write tests\n- [x] TASK-002 Implement\n',
        },
      });

      const engine = new RecommendEngine(root);
      const recs = engine.recommend();

      expect(recs.length).toBe(1);
      expect(recs[0].command).toContain('stdd verify');
      expect(recs[0].state).toBe('tasks_done');
    });

    it('recommends stdd archive when all tasks done and verification passed', () => {
      const root = createTempDir();
      createSTDD(root, {
        'my-change': {
          proposal: '# Proposal: Add feature\n',
          tasks: '- [x] TASK-001 Write tests\n- [x] TASK-002 Implement\n',
          evidence: { type: 'verify', status: 'pass' },
        },
      });

      const engine = new RecommendEngine(root);
      const recs = engine.recommend();

      expect(recs.length).toBe(1);
      expect(recs[0].command).toContain('stdd archive');
      expect(recs[0].state).toBe('verified');
    });
  });

  describe('specific change', () => {
    it('recommends for a specific change by name', () => {
      const root = createTempDir();
      createSTDD(root, {
        'change-a': {
          proposal: '# Proposal: A\n',
          tasks: '- [x] TASK-001 Done\n- [x] TASK-002 Done\n',
          evidence: { type: 'verify', status: 'pass' },
        },
        'change-b': {
          proposal: '# Proposal: B\n',
          tasks: '- [ ] TASK-001 Pending\n',
        },
      });

      const engine = new RecommendEngine(root);
      const recs = engine.recommend('change-b');

      expect(recs.length).toBe(1);
      expect(recs[0].command).toContain('stdd apply');
    });
  });

  describe('non-existent change', () => {
    it('recommends creating the change if it does not exist', () => {
      const root = createTempDir();
      createSTDD(root, {});

      const engine = new RecommendEngine(root);
      const recs = engine.recommend('nonexistent');

      expect(recs.length).toBe(1);
      expect(recs[0].command).toContain('stdd new change nonexistent');
      expect(recs[0].state).toBe('change_not_found');
    });
  });

  describe('not initialized', () => {
    it('recommends stdd init when workspace not initialized', () => {
      const root = createTempDir();

      const engine = new RecommendEngine(root);
      const recs = engine.recommend();

      expect(recs.length).toBe(1);
      expect(recs[0].command).toBe('stdd init');
      expect(recs[0].state).toBe('not_initialized');
    });
  });

  describe('in-progress tasks', () => {
    it('recommends stdd continue when a task is in progress', () => {
      const root = createTempDir();
      createSTDD(root, {
        'my-change': {
          proposal: '# Proposal: Add feature\n',
          tasks: '- [x] TASK-001 Write tests\n- [~] TASK-002 Implement\n- [ ] TASK-003 Polish\n',
        },
      });

      const engine = new RecommendEngine(root);
      const recs = engine.recommend();

      expect(recs.length).toBe(1);
      expect(recs[0].command).toContain('stdd continue');
      expect(recs[0].doneTasks).toBe(1);
      expect(recs[0].totalTasks).toBe(3);
    });
  });

  describe('multiple changes', () => {
    it('recommends for each active change', () => {
      const root = createTempDir();
      createSTDD(root, {
        'change-a': {
          proposal: '# Proposal: A\n',
          tasks: '- [ ] TASK-001 Pending\n',
        },
        'change-b': {
          proposal: '# Proposal: B\n',
          tasks: '- [x] TASK-001 Done\n',
          evidence: { type: 'verify', status: 'pass' },
        },
      });

      const engine = new RecommendEngine(root);
      const recs = engine.recommend();

      expect(recs.length).toBe(2);
      const commands = recs.map(r => r.command);
      expect(commands.some(c => c.includes('stdd apply'))).toBe(true);
      expect(commands.some(c => c.includes('stdd archive'))).toBe(true);
    });
  });

  describe('workspace metadata inference', () => {
    it('adds workspace scope to recommendations from change metadata', () => {
      const root = createTempDir();
      createWorkspace(root, 'packages/api');
      createSTDD(root, {
        'workspace-change': {
          proposal: '# Proposal\n\n| Field | Value |\n|-------|-------|\n| Workspace | packages/api |\n',
          tasks: '# Tasks\n\n> Workspace: packages/api\n\n- [ ] TASK-001 Write tests\n',
        },
      });

      const engine = new RecommendEngine(root);
      const recs = engine.recommend('workspace-change');

      expect(recs.length).toBe(1);
      expect(recs[0].command).toBe('stdd apply workspace-change --workspace packages/api');
      expect(recs[0].workspace).toEqual(expect.objectContaining({
        name: '@demo/api',
        path: 'packages/api',
        sourceDir: 'packages/api/src',
      }));
    });
  });
});

describe('recommend CLI', () => {
  const cliPath = path.join(__dirname, '..', 'cli.js');

  function runCli(args, cwd) {
    return spawnSync(process.execPath, [cliPath, ...args], {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });
  }

  function createTempProject(changes = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-recommend-cli-'));
    const stddDir = path.join(root, 'stdd');
    fs.mkdirSync(path.join(stddDir, 'changes'), { recursive: true });
    fs.writeFileSync(path.join(stddDir, 'config.yaml'), 'version: 1\n');

    for (const [name, content] of Object.entries(changes)) {
      const changeDir = path.join(stddDir, 'changes', name);
      fs.mkdirSync(changeDir, { recursive: true });

      if (content.proposal) {
        fs.writeFileSync(path.join(changeDir, 'proposal.md'), content.proposal);
      }
      if (content.tasks) {
        fs.writeFileSync(path.join(changeDir, 'tasks.md'), content.tasks);
      }
      if (content.evidence) {
        const evidenceDir = path.join(changeDir, 'evidence');
        fs.mkdirSync(evidenceDir, { recursive: true });
        fs.writeFileSync(
          path.join(evidenceDir, 'verify-20260512.json'),
          JSON.stringify(content.evidence)
        );
      }
    }

    return root;
  }

  function createWorkspace(root, workspacePath = 'packages/api', pkg = { name: '@demo/api' }) {
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ private: true, workspaces: ['packages/*'] }));
    const workspaceRoot = path.join(root, workspacePath);
    fs.mkdirSync(path.join(workspaceRoot, 'src'), { recursive: true });
    fs.writeFileSync(path.join(workspaceRoot, 'package.json'), JSON.stringify(pkg));
    return workspaceRoot;
  }

  it('graph recommend outputs recommendation when no changes', () => {
    const root = createTempProject();
    const result = runCli(['graph', 'recommend'], root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('stdd new');
  });

  it('graph recommend outputs recommendation with --json', () => {
    const root = createTempProject({
      'demo': {
        proposal: '# Proposal\n',
        tasks: '- [ ] TASK-001 Write tests\n',
      },
    });
    const result = runCli(['graph', 'recommend', '--json'], root);

    expect(result.status).toBe(0);
    const json = JSON.parse(result.stdout);
    expect(Array.isArray(json)).toBe(true);
    expect(json[0].command).toContain('stdd apply');
  });

  it('graph recommend for a specific change', () => {
    const root = createTempProject({
      'demo': {
        proposal: '# Proposal\n',
        tasks: '- [x] TASK-001 Write tests\n- [x] TASK-002 Implement\n',
      },
    });
    const result = runCli(['graph', 'recommend', 'demo'], root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('stdd verify');
  });

  it('top-level stdd recommend works', () => {
    const root = createTempProject({
      'demo': {
        proposal: '# Proposal\n',
        tasks: '- [x] TASK-001 Write tests\n- [x] TASK-002 Implement\n',
        evidence: { type: 'verify', status: 'pass' },
      },
    });
    const result = runCli(['recommend', 'demo'], root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('stdd archive');
  });

  it('top-level stdd recommend --json works', () => {
    const root = createTempProject({});
    const result = runCli(['recommend', '--json'], root);

    expect(result.status).toBe(0);
    const json = JSON.parse(result.stdout);
    expect(json[0].state).toBe('no_changes');
  });

  it('graph recommend --workspace outputs workspace field as JSON', () => {
    const root = createTempProject();
    createWorkspace(root, 'packages/api');
    fs.writeFileSync(path.join(root, 'packages', 'api', 'src', 'index.js'), 'module.exports = {};\n');
    fs.mkdirSync(path.join(root, 'packages', 'api', 'src', '__tests__'), { recursive: true });
    fs.writeFileSync(path.join(root, 'packages', 'api', 'src', '__tests__', 'index.test.js'), 'test("ok", () => {});\n');

    const result = runCli(['graph', 'recommend', '--workspace', 'packages/api', '--json'], root);

    expect(result.status).toBe(0);
    const json = JSON.parse(result.stdout);
    expect(json[0].workspace).toEqual(expect.objectContaining({
      name: '@demo/api',
      path: 'packages/api',
      sourceDir: 'packages/api/src',
    }));
    expect(json[0].reason).toContain('@demo/api');
    expect(json[0].reason).toContain('packages/api');
  });

  it('graph recommend --workspace suggests tdd init when workspace lacks tests', () => {
    const root = createTempProject();
    createWorkspace(root, 'packages/api');
    fs.writeFileSync(path.join(root, 'packages', 'api', 'src', 'index.js'), 'module.exports = {};\n');

    const result = runCli(['graph', 'recommend', '--workspace', 'packages/api', '--json'], root);

    expect(result.status).toBe(0);
    const json = JSON.parse(result.stdout);
    expect(json[0].state).toBe('workspace_missing_tests');
    expect(json[0].command).toBe('stdd tdd init --source-dir packages/api/src');
  });

  it('graph recommend --workspace reports not found for missing workspace', () => {
    const root = createTempProject();
    createWorkspace(root, 'packages/api');

    const result = runCli(['graph', 'recommend', '--workspace', 'packages/missing', '--json'], root);

    expect(result.status).toBe(0);
    const json = JSON.parse(result.stdout);
    expect(json[0].state).toBe('workspace_not_found');
    expect(json[0].workspace).toEqual({ query: 'packages/missing', found: false });
  });

  it('top-level recommend --workspace resolves by package name', () => {
    const root = createTempProject();
    createWorkspace(root, 'packages/api', { name: '@demo/api' });
    fs.writeFileSync(path.join(root, 'packages', 'api', 'src', 'index.js'), 'module.exports = {};\n');

    const result = runCli(['recommend', '--workspace', '@demo/api', '--json'], root);

    expect(result.status).toBe(0);
    const json = JSON.parse(result.stdout);
    expect(json[0].workspace.path).toBe('packages/api');
  });
});
