const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const { AgentConfig, AgentDoctor, AgentHistoryStore, AgentKernel, AgentSessionTrace, FixPacketBuilder, GitTool, LlmDiffProvider, PatchTool, PermissionPolicy, ReadOnlyToolExecutor, RunReportWriter, TestTool, ToolRegistry } = require('../src/runtime/agent-kernel');
const { extractUnifiedDiff } = require('../src/runtime/agent-kernel/llm-diff');

function tempProject(prefix = 'stdd-agent-kernel-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeSimplePatch(root, fileName = 'change.diff') {
  const patchPath = path.join(root, fileName);
  fs.writeFileSync(patchPath, [
    'diff --git a/README.md b/README.md',
    '--- a/README.md',
    '+++ b/README.md',
    '@@ -1 +1 @@',
    '-old',
    '+new',
  ].join('\n'), 'utf8');
  return fileName;
}

describe('native agent kernel scaffolding', () => {
  test('tool registry exposes stable prompt catalog', () => {
    const registry = new ToolRegistry();
    const catalog = registry.toPromptCatalog();

    expect(catalog.find(tool => tool.name === 'fs.patch')).toEqual(expect.objectContaining({
      risk: 'write',
      requiresApproval: true,
    }));
    expect(catalog.find(tool => tool.name === 'stdd.status')).toEqual(expect.objectContaining({
      risk: 'safe',
      requiresApproval: false,
    }));
  });

  test('permission policy asks before writes in guarded mode', () => {
    const registry = new ToolRegistry();
    const policy = new PermissionPolicy({ mode: 'guarded' });

    expect(policy.decide(registry.get('fs.read'))).toEqual(expect.objectContaining({ decision: 'allow' }));
    expect(policy.decide(registry.get('fs.patch'))).toEqual(expect.objectContaining({ decision: 'ask' }));
  });

  test('permission policy keeps suggest mode read-oriented', () => {
    const registry = new ToolRegistry();
    const policy = new PermissionPolicy({ mode: 'suggest' });

    expect(policy.decide(registry.get('fs.search')).decision).toBe('allow');
    expect(policy.decide(registry.get('shell.run')).decision).toBe('ask');
  });

  test('agent kernel creates an STDD-native dry-run plan and trace', () => {
    const root = tempProject();
    const trace = new AgentSessionTrace(root, { sessionId: 'test-session' });
    const kernel = new AgentKernel({ cwd: root, mode: 'guarded', trace });

    const plan = kernel.createPlan('implement login');

    expect(plan.goal).toBe('implement login');
    expect(plan.phases.map(phase => phase.id)).toEqual([
      'inspect', 'propose', 'spec', 'plan', 'patch', 'test', 'verify', 'summarize'
    ]);
    expect(trace.read()[0]).toEqual(expect.objectContaining({ type: 'plan.created' }));
  });

  test('agent config writes and loads default config', () => {
    const root = tempProject();
    const manager = new AgentConfig(root);

    const written = manager.writeDefault();
    const loaded = manager.load();

    expect(written).toBe('stdd/agent/config.yaml');
    expect(loaded).toEqual(expect.objectContaining({ mode: 'guarded' }));
    expect(loaded.defaults.model).toBe('gpt-4o-mini');
  });

  test('read-only executor reads workspace text files and records trace', () => {
    const root = tempProject();
    fs.writeFileSync(path.join(root, 'README.md'), '# Demo\nAgentKernel context\n', 'utf8');
    const trace = new AgentSessionTrace(root, { sessionId: 'read-session' });
    const executor = new ReadOnlyToolExecutor({ cwd: root, trace });

    const result = executor.execute('fs.read', { path: 'README.md' });

    expect(result).toEqual(expect.objectContaining({
      tool: 'fs.read',
      path: 'README.md',
      content: '# Demo\nAgentKernel context\n',
    }));
    expect(trace.read()[0]).toEqual(expect.objectContaining({ type: 'tool.fs.read' }));
  });

  test('read-only executor rejects paths outside workspace', () => {
    const root = tempProject();
    const executor = new ReadOnlyToolExecutor({ cwd: root });

    expect(() => executor.execute('fs.read', { path: '../outside.md' })).toThrow('unsafe');
  });

  test('read-only executor searches workspace text files', () => {
    const root = tempProject();
    fs.mkdirSync(path.join(root, 'src'));
    fs.writeFileSync(path.join(root, 'src', 'agent.js'), 'class AgentKernel {}\n', 'utf8');
    fs.writeFileSync(path.join(root, 'src', 'other.js'), 'const value = 1;\n', 'utf8');
    const executor = new ReadOnlyToolExecutor({ cwd: root });

    const result = executor.execute('fs.search', { query: 'AgentKernel', path: 'src' });

    expect(result.results).toEqual([
      { path: path.join('src', 'agent.js'), line: 1, text: 'class AgentKernel {}' }
    ]);
  });

  test('agent kernel executes allowed read-only tools', () => {
    const root = tempProject();
    fs.writeFileSync(path.join(root, 'package.json'), '{"name":"demo"}\n', 'utf8');
    const kernel = new AgentKernel({ cwd: root, mode: 'guarded' });

    const result = kernel.executeTool('fs.read', { path: 'package.json' });

    expect(result.content).toContain('demo');
  });

  test('patch tool previews unified diff without applying it', () => {
    const root = tempProject();
    fs.writeFileSync(path.join(root, 'README.md'), 'old\n', 'utf8');
    const trace = new AgentSessionTrace(root, { sessionId: 'patch-session' });
    const patch = new PatchTool({ cwd: root, trace });
    const diff = [
      'diff --git a/README.md b/README.md',
      '--- a/README.md',
      '+++ b/README.md',
      '@@ -1 +1 @@',
      '-old',
      '+new',
    ].join('\n');

    const result = patch.preview({ diff });

    expect(result).toEqual(expect.objectContaining({
      tool: 'fs.patch',
      mode: 'preview',
      approvedRequired: true,
      additions: 1,
      deletions: 1,
    }));
    expect(result.files[0]).toEqual(expect.objectContaining({ path: 'README.md', exists: true }));
    expect(fs.readFileSync(path.join(root, 'README.md'), 'utf8')).toBe('old\n');
    expect(trace.read()[0]).toEqual(expect.objectContaining({ type: 'tool.fs.patch.preview' }));
  });

  test('patch tool rejects unsafe target paths', () => {
    const root = tempProject();
    const patch = new PatchTool({ cwd: root });
    const diff = [
      'diff --git a/../outside.md b/../outside.md',
      '--- a/../outside.md',
      '+++ b/../outside.md',
      '@@ -0,0 +1 @@',
      '+bad',
    ].join('\n');

    expect(() => patch.preview({ diff })).toThrow('unsafe');
  });

  test('agent kernel requires approval for fs.patch in guarded mode', () => {
    const root = tempProject();
    const kernel = new AgentKernel({ cwd: root, mode: 'guarded' });

    expect(() => kernel.executeTool('fs.patch', { diff: 'diff --git a/a.md b/a.md' })).toThrow('requires approval');
  });

  test('agent kernel previews fs.patch when explicitly approved', () => {
    const root = tempProject();
    const kernel = new AgentKernel({ cwd: root, mode: 'guarded' });
    const diff = [
      'diff --git a/a.md b/a.md',
      '--- /dev/null',
      '+++ b/a.md',
      '@@ -0,0 +1 @@',
      '+hello',
    ].join('\n');

    const result = kernel.executeTool('fs.patch', { diff, approved: true });

    expect(result.files[0]).toEqual(expect.objectContaining({ path: 'a.md', additions: 1 }));
  });

  test('patch tool applies a strict matching text diff', () => {
    const root = tempProject();
    fs.writeFileSync(path.join(root, 'README.md'), 'one\ntwo\nthree\n', 'utf8');
    const trace = new AgentSessionTrace(root, { sessionId: 'apply-session' });
    const patch = new PatchTool({ cwd: root, trace });
    const diff = [
      'diff --git a/README.md b/README.md',
      '--- a/README.md',
      '+++ b/README.md',
      '@@ -1,3 +1,3 @@',
      ' one',
      '-two',
      '+TWO',
      ' three',
    ].join('\n');

    const result = patch.apply({ diff, approved: true });

    expect(result).toEqual(expect.objectContaining({ mode: 'apply', additions: 1, deletions: 1 }));
    expect(fs.readFileSync(path.join(root, 'README.md'), 'utf8')).toBe('one\nTWO\nthree\n');
    expect(trace.read()[0]).toEqual(expect.objectContaining({ type: 'tool.fs.patch.apply' }));
  });

  test('patch tool creates new files from /dev/null diff', () => {
    const root = tempProject();
    const patch = new PatchTool({ cwd: root });
    const diff = [
      'diff --git a/new.md b/new.md',
      '--- /dev/null',
      '+++ b/new.md',
      '@@ -0,0 +1,2 @@',
      '+hello',
      '+world',
    ].join('\n');

    const result = patch.apply({ diff, approved: true });

    expect(result.files[0]).toEqual(expect.objectContaining({ path: 'new.md', written: true }));
    expect(fs.readFileSync(path.join(root, 'new.md'), 'utf8')).toBe('hello\nworld');
  });

  test('patch tool rejects apply without approval', () => {
    const root = tempProject();
    const patch = new PatchTool({ cwd: root });

    expect(() => patch.apply({ diff: 'diff --git a/a.md b/a.md' })).toThrow('requires explicit approval');
  });

  test('patch tool rejects mismatched context without writing', () => {
    const root = tempProject();
    fs.writeFileSync(path.join(root, 'README.md'), 'actual\n', 'utf8');
    const patch = new PatchTool({ cwd: root });
    const diff = [
      'diff --git a/README.md b/README.md',
      '--- a/README.md',
      '+++ b/README.md',
      '@@ -1 +1 @@',
      '-expected',
      '+new',
    ].join('\n');

    expect(() => patch.apply({ diff, approved: true })).toThrow('mismatch');
    expect(fs.readFileSync(path.join(root, 'README.md'), 'utf8')).toBe('actual\n');
  });

  test('test tool reports skipped when no test command exists', () => {
    const root = tempProject();
    const trace = new AgentSessionTrace(root, { sessionId: 'test-skip-session' });
    const tool = new TestTool({ cwd: root, trace });

    const result = tool.run();

    expect(result).toEqual(expect.objectContaining({ tool: 'test.run', status: 'skipped', passed: null }));
    expect(trace.read()[0]).toEqual(expect.objectContaining({ type: 'tool.test.run' }));
  });

  test('test tool runs explicit passing command', () => {
    const root = tempProject();
    const tool = new TestTool({ cwd: root });

    const result = tool.run({ command: `${process.execPath} -e "console.log('pass')"` });

    expect(result.status).toBe('pass');
    expect(result.results[0]).toEqual(expect.objectContaining({ passed: true, exitCode: 0 }));
    expect(result.results[0].stdout).toContain('pass');
  });

  test('test tool reports failing command output', () => {
    const root = tempProject();
    const tool = new TestTool({ cwd: root });

    const result = tool.run({ command: `${process.execPath} -e "throw new Error('fail')"` });

    expect(result.status).toBe('fail');
    expect(result.results[0]).toEqual(expect.objectContaining({ passed: false, exitCode: 1 }));
    expect(result.results[0].stderr).toContain('fail');
  });

  test('agent kernel executes test.run tool', () => {
    const root = tempProject();
    const kernel = new AgentKernel({ cwd: root, mode: 'guarded' });

    const result = kernel.executeTool('test.run', { command: `${process.execPath} -e "process.exit(0)"` });

    expect(result.status).toBe('pass');
  });

  test('git tool reports unavailable outside git repository', () => {
    const root = tempProject();
    const tool = new GitTool({ cwd: root });

    const result = tool.diff();

    expect(result).toEqual(expect.objectContaining({ tool: 'git.diff', status: 'unavailable' }));
  });

  test('git tool reports dirty status and optional patch', () => {
    const root = tempProject();
    spawnSync('git', ['init'], { cwd: root, encoding: 'utf8' });
    fs.writeFileSync(path.join(root, 'README.md'), 'old\n', 'utf8');
    spawnSync('git', ['add', 'README.md'], { cwd: root, encoding: 'utf8' });
    spawnSync('git', ['commit', '-m', 'init'], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@example.com', GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@example.com' },
    });
    fs.writeFileSync(path.join(root, 'README.md'), 'new\n', 'utf8');
    const trace = new AgentSessionTrace(root, { sessionId: 'git-session' });
    const tool = new GitTool({ cwd: root, trace });

    const result = tool.diff({ patch: true });

    expect(result.status).toBe('ok');
    expect(result.dirty).toBe(true);
    expect(result.statusShort).toContain('M README.md');
    expect(result.diffStat).toContain('README.md');
    expect(result.diff).toContain('-old');
    expect(result.diff).toContain('+new');
    expect(trace.read()[0]).toEqual(expect.objectContaining({ type: 'tool.git.diff' }));
  });

  test('agent kernel executes git.diff tool', () => {
    const root = tempProject();
    const kernel = new AgentKernel({ cwd: root, mode: 'guarded' });

    const result = kernel.executeTool('git.diff');

    expect(result.tool).toBe('git.diff');
  });

  test('agent kernel runs minimal patch cycle successfully', () => {
    const root = tempProject();
    fs.writeFileSync(path.join(root, 'README.md'), 'old\n', 'utf8');
    const patchFile = writeSimplePatch(root);
    const kernel = new AgentKernel({ cwd: root, mode: 'guarded' });

    const result = kernel.runPatchCycle({
      patchFile,
      testCommand: `${process.execPath} -e "console.log('cycle-ok')"`,
    });

    expect(result).toEqual(expect.objectContaining({ tool: 'agent.cycle', mode: 'patch', status: 'pass' }));
    expect(result.summary).toEqual(expect.objectContaining({ patchApplied: true, testsStatus: 'pass' }));
    expect(fs.readFileSync(path.join(root, 'README.md'), 'utf8')).toBe('new\n');
  });

  test('agent kernel patch cycle returns fail when tests fail', () => {
    const root = tempProject();
    fs.writeFileSync(path.join(root, 'README.md'), 'old\n', 'utf8');
    const patchFile = writeSimplePatch(root);
    const kernel = new AgentKernel({ cwd: root, mode: 'guarded' });

    const result = kernel.runPatchCycle({
      patchFile,
      testCommand: `${process.execPath} -e "throw new Error('cycle-fail')"`,
    });

    expect(result.status).toBe('fail');
    expect(result.summary).toEqual(expect.objectContaining({ patchApplied: true, testsStatus: 'fail', testsPassed: false }));
    expect(result.tests.results[0].stderr).toContain('cycle-fail');
    expect(result.fixPacket).toEqual(expect.objectContaining({ type: 'agent-fix-packet', status: 'needs-fix' }));
    expect(result.fixPacket.tests.results[0].stderr).toContain('cycle-fail');
  });

  test('agent kernel runs repair cycle successfully', () => {
    const root = tempProject();
    fs.writeFileSync(path.join(root, 'README.md'), 'old\n', 'utf8');
    const patchFile = writeSimplePatch(root, 'repair.diff');
    const kernel = new AgentKernel({ cwd: root, mode: 'guarded' });

    const result = kernel.runRepairCycle({
      patchFile,
      testCommand: `${process.execPath} -e "console.log('repair-ok')"`,
    });

    expect(result).toEqual(expect.objectContaining({ tool: 'agent.cycle', mode: 'repair', status: 'pass' }));
    expect(result.preview.mode).toBe('preview');
    expect(result.summary).toEqual(expect.objectContaining({ repairApplied: true, testsStatus: 'pass' }));
    expect(fs.readFileSync(path.join(root, 'README.md'), 'utf8')).toBe('new\n');
  });

  test('agent kernel runs llm repair flow with mock response', async () => {
    const root = tempProject();
    fs.writeFileSync(path.join(root, 'README.md'), 'old\n', 'utf8');
    fs.writeFileSync(path.join(root, 'prompt.md'), '# Fix README\n', 'utf8');
    const kernel = new AgentKernel({ cwd: root, mode: 'guarded' });

    const result = await kernel.runLlmRepair({
      prompt: 'prompt.md',
      output: 'repair.diff',
      mockResponse: [
        'diff --git a/README.md b/README.md',
        '--- a/README.md',
        '+++ b/README.md',
        '@@ -1 +1 @@',
        '-old',
        '+new',
      ].join('\n'),
      testCommand: `${process.execPath} -e "console.log('llm-repair-ok')"`,
    });

    expect(result).toEqual(expect.objectContaining({ tool: 'agent.llm-repair', status: 'pass' }));
    expect(result.llm.output).toBe('repair.diff');
    expect(result.preview.mode).toBe('preview');
    expect(result.repair.mode).toBe('repair');
    expect(fs.readFileSync(path.join(root, 'README.md'), 'utf8')).toBe('new\n');
  });

  test('run report writer writes JSON and Markdown reports', () => {
    const root = tempProject();
    const trace = new AgentSessionTrace(root, { sessionId: 'run-report-session' });
    const writer = new RunReportWriter({ cwd: root, trace });
    const result = {
      tool: 'agent.cycle',
      mode: 'repair',
      status: 'pass',
      summary: { status: 'pass', filesChanged: ['README.md'], testsStatus: 'pass' },
    };

    const output = writer.write(result, { runId: 'demo-run' });

    expect(output).toEqual({ runId: 'demo-run', json: 'stdd/agent/runs/demo-run.json', markdown: 'stdd/agent/runs/demo-run.md' });
    const json = JSON.parse(fs.readFileSync(path.join(root, output.json), 'utf8'));
    const md = fs.readFileSync(path.join(root, output.markdown), 'utf8');
    expect(json).toEqual(expect.objectContaining({ type: 'agent-run-report', status: 'pass', mode: 'repair' }));
    expect(md).toContain('Agent Run Report');
    expect(md).toContain('Review git diff and commit when ready.');
    expect(trace.read()[0]).toEqual(expect.objectContaining({ type: 'run-report.written' }));
  });

  test('agent history store lists, shows, and resumes reports', () => {
    const root = tempProject();
    const writer = new RunReportWriter({ cwd: root });
    writer.write({ tool: 'agent.cycle', mode: 'repair', status: 'pass', summary: { status: 'pass' } }, { runId: 'pass-run' });
    writer.write({
      tool: 'agent.cycle',
      mode: 'repair',
      status: 'fail',
      summary: { status: 'fail' },
      fixPacket: { output: { markdown: 'stdd/agent/fix-packets/fix.md' } },
    }, { runId: 'fail-run' });
    const store = new AgentHistoryStore({ cwd: root });

    const list = store.list();
    const shown = store.show('fail-run');
    const resume = store.resume('fail-run');

    expect(list.map(item => item.runId)).toEqual(expect.arrayContaining(['pass-run', 'fail-run']));
    expect(shown.runId).toBe('fail-run');
    expect(resume).toEqual(expect.objectContaining({ runId: 'fail-run', status: 'fail', prompt: 'stdd/agent/fix-packets/fix.md' }));
    expect(resume.suggestedCommand).toContain('--llm-repair');
  });

  test('agent kernel repair cycle returns fix packet on failed tests', () => {
    const root = tempProject();
    fs.writeFileSync(path.join(root, 'README.md'), 'old\n', 'utf8');
    const patchFile = writeSimplePatch(root, 'repair.diff');
    const kernel = new AgentKernel({ cwd: root, mode: 'guarded' });

    const result = kernel.runRepairCycle({
      patchFile,
      testCommand: `${process.execPath} -e "throw new Error('repair-fail')"`,
    });

    expect(result.status).toBe('fail');
    expect(result.fixPacket).toEqual(expect.objectContaining({ type: 'agent-fix-packet', status: 'needs-fix' }));
    expect(result.fixPacket.tests.results[0].stderr).toContain('repair-fail');
  });

  test('fix packet builder compacts patch, tests, and git context', () => {
    const root = tempProject();
    const trace = new AgentSessionTrace(root, { sessionId: 'fix-packet-session' });
    const builder = new FixPacketBuilder({ cwd: root, trace });

    const packet = builder.build({
      goal: 'repair checkout',
      summary: { status: 'fail', filesChanged: ['README.md'], additions: 1, deletions: 1 },
      patch: { mode: 'apply', fileCount: 1, additions: 1, deletions: 1, files: [{ path: 'README.md', additions: 1, deletions: 1, written: true }] },
      tests: { status: 'fail', passed: false, resultCount: 1, results: [{ workspaceName: 'root', cwd: '.', command: 'npm test', exitCode: 1, passed: false, stdout: '', stderr: 'expected true' }] },
      git: { status: 'ok', dirty: true, statusShort: ' M README.md\n', diffStat: 'README.md | 2 +-\n', diff: 'diff --git a/README.md b/README.md' },
    });

    expect(packet).toEqual(expect.objectContaining({ type: 'agent-fix-packet', goal: 'repair checkout', status: 'needs-fix' }));
    expect(packet.patch.files[0].path).toBe('README.md');
    expect(packet.tests.results[0].stderr).toContain('expected true');
    expect(packet.git.diff).toContain('diff --git');
    expect(trace.read()[0]).toEqual(expect.objectContaining({ type: 'fix-packet.generated' }));
  });

  test('fix packet builder writes JSON and Markdown prompt files', () => {
    const root = tempProject();
    const builder = new FixPacketBuilder({ cwd: root });
    const packet = builder.build({
      goal: 'repair checkout',
      summary: { status: 'fail', filesChanged: ['README.md'], additions: 1, deletions: 1 },
      tests: { status: 'fail', passed: false, resultCount: 1, results: [{ workspaceName: 'root', cwd: '.', command: 'npm test', exitCode: 1, passed: false, stdout: '', stderr: 'boom' }] },
    });

    const output = builder.write(packet, { name: 'demo-fix' });

    expect(output.json).toBe('stdd/agent/fix-packets/demo-fix.json');
    expect(output.markdown).toBe('stdd/agent/fix-packets/demo-fix.md');
    const json = JSON.parse(fs.readFileSync(path.join(root, output.json), 'utf8'));
    const md = fs.readFileSync(path.join(root, output.markdown), 'utf8');
    expect(json.type).toBe('agent-fix-packet');
    expect(md).toContain('Return only a unified diff');
    expect(md).toContain('```diff');
  });

  test('extractUnifiedDiff extracts fenced diff content', () => {
    const diff = extractUnifiedDiff('Here is the patch:\n```diff\ndiff --git a/a.md b/a.md\n--- a/a.md\n+++ b/a.md\n@@ -1 +1 @@\n-old\n+new\n```');
    expect(diff).toContain('diff --git a/a.md b/a.md');
    expect(diff).toContain('+new');
  });

  test('llm diff provider writes candidate diff with mock response', async () => {
    const root = tempProject();
    fs.writeFileSync(path.join(root, 'prompt.md'), '# Fix\nReturn diff', 'utf8');
    const trace = new AgentSessionTrace(root, { sessionId: 'llm-diff-session' });
    const provider = new LlmDiffProvider({ cwd: root, trace });

    const result = await provider.generateDiff({
      prompt: 'prompt.md',
      output: 'repair.diff',
      mockResponse: '```diff\ndiff --git a/a.md b/a.md\n--- a/a.md\n+++ b/a.md\n@@ -1 +1 @@\n-old\n+new\n```',
    });

    expect(result).toEqual(expect.objectContaining({ tool: 'llm.diff', status: 'generated', output: 'repair.diff' }));
    expect(fs.readFileSync(path.join(root, 'repair.diff'), 'utf8')).toContain('diff --git a/a.md b/a.md');
    expect(trace.read()[0]).toEqual(expect.objectContaining({ type: 'tool.llm.diff' }));
  });

  test('llm diff provider requires API key without mock response', async () => {
    const root = tempProject();
    fs.writeFileSync(path.join(root, 'prompt.md'), '# Fix\n', 'utf8');
    const provider = new LlmDiffProvider({ cwd: root, apiKey: '' });

    await expect(provider.generateDiff({ prompt: 'prompt.md' })).rejects.toThrow('API key');
  });

  test('agent CLI emits JSON plan without editing files', () => {
    const cliPath = path.join(__dirname, '..', 'cli.js');
    const root = tempProject('stdd-agent-cli-preview-');

    const result = spawnSync(process.execPath, [cliPath, 'agent', 'implement', 'checkout', '--json'], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.goal).toBe('implement checkout');
    expect(payload.dryRun).toBe(true);
    expect(payload.phases.find(phase => phase.id === 'patch').tools).toContain('fs.patch');
  });

  test('agent CLI initializes and shows config', () => {
    const cliPath = path.join(__dirname, '..', 'cli.js');
    const root = tempProject('stdd-agent-cli-config-');

    const init = spawnSync(process.execPath, [cliPath, 'agent', '--init-config', '--json'], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });
    const show = spawnSync(process.execPath, [cliPath, 'agent', '--config', '--json'], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });

    expect(init.status).toBe(0);
    expect(JSON.parse(init.stdout).path).toBe('stdd/agent/config.yaml');
    expect(show.status).toBe(0);
    expect(JSON.parse(show.stdout)).toEqual(expect.objectContaining({ mode: 'guarded' }));
  });

  test('agent CLI uses config defaults for cycle test command and report', () => {
    const cliPath = path.join(__dirname, '..', 'cli.js');
    const root = tempProject('stdd-agent-cli-config-cycle-');
    fs.mkdirSync(path.join(root, 'stdd', 'agent'), { recursive: true });
    fs.writeFileSync(path.join(root, 'stdd', 'agent', 'config.yaml'), [
      'mode: guarded',
      'defaults:',
      `  test_command: ${JSON.stringify(`${process.execPath} -e "console.log('config-test-ok')"`)}`,
      '  write_report: true',
      '  model: gpt-4o-mini',
    ].join('\n'), 'utf8');
    fs.writeFileSync(path.join(root, 'README.md'), 'old\n', 'utf8');
    writeSimplePatch(root);

    const result = spawnSync(process.execPath, [cliPath, 'agent', '--cycle', '--patch-file', 'change.diff', '--json'], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.status).toBe('pass');
    expect(payload.tests.results[0].stdout).toContain('config-test-ok');
    expect(payload.report).toEqual(expect.objectContaining({ json: expect.any(String) }));
  });

  test('agent CLI lists tool permissions', () => {
    const cliPath = path.join(__dirname, '..', 'cli.js');
    const root = tempProject('stdd-agent-cli-tools-');

    const result = spawnSync(process.execPath, [cliPath, 'agent', '--list-tools', '--json'], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.find(tool => tool.name === 'fs.patch').permission.decision).toBe('ask');
  });

  test('agent CLI reads a file through fs.read', () => {
    const cliPath = path.join(__dirname, '..', 'cli.js');
    const root = tempProject('stdd-agent-cli-read-');
    fs.writeFileSync(path.join(root, 'README.md'), 'native agent read\n', 'utf8');

    const result = spawnSync(process.execPath, [cliPath, 'agent', '--read', 'README.md', '--json'], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload).toEqual(expect.objectContaining({ tool: 'fs.read', path: 'README.md' }));
    expect(payload.content).toContain('native agent read');
  });

  test('agent CLI searches files through fs.search', () => {
    const cliPath = path.join(__dirname, '..', 'cli.js');
    const root = tempProject('stdd-agent-cli-search-');
    fs.mkdirSync(path.join(root, 'src'));
    fs.writeFileSync(path.join(root, 'src', 'index.js'), 'const marker = "agent-search";\n', 'utf8');

    const result = spawnSync(process.execPath, [cliPath, 'agent', '--search', 'agent-search', '--path', 'src', '--json'], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.results[0]).toEqual(expect.objectContaining({ path: path.join('src', 'index.js'), line: 1 }));
  });

  test('agent CLI previews patch files without applying them', () => {
    const cliPath = path.join(__dirname, '..', 'cli.js');
    const root = tempProject('stdd-agent-cli-patch-');
    fs.writeFileSync(path.join(root, 'README.md'), 'old\n', 'utf8');
    fs.writeFileSync(path.join(root, 'change.diff'), [
      'diff --git a/README.md b/README.md',
      '--- a/README.md',
      '+++ b/README.md',
      '@@ -1 +1 @@',
      '-old',
      '+new',
    ].join('\n'), 'utf8');

    const result = spawnSync(process.execPath, [cliPath, 'agent', '--patch-preview', 'change.diff', '--json'], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload).toEqual(expect.objectContaining({ tool: 'fs.patch', mode: 'preview', additions: 1, deletions: 1 }));
    expect(fs.readFileSync(path.join(root, 'README.md'), 'utf8')).toBe('old\n');
  });

  test('agent CLI applies patch files with explicit command approval', () => {
    const cliPath = path.join(__dirname, '..', 'cli.js');
    const root = tempProject('stdd-agent-cli-patch-apply-');
    fs.writeFileSync(path.join(root, 'README.md'), 'old\n', 'utf8');
    fs.writeFileSync(path.join(root, 'change.diff'), [
      'diff --git a/README.md b/README.md',
      '--- a/README.md',
      '+++ b/README.md',
      '@@ -1 +1 @@',
      '-old',
      '+new',
    ].join('\n'), 'utf8');

    const result = spawnSync(process.execPath, [cliPath, 'agent', '--patch-apply', 'change.diff', '--json'], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload).toEqual(expect.objectContaining({ tool: 'fs.patch', mode: 'apply', additions: 1, deletions: 1 }));
    expect(fs.readFileSync(path.join(root, 'README.md'), 'utf8')).toBe('new\n');
  });

  test('agent CLI runs explicit test command', () => {
    const cliPath = path.join(__dirname, '..', 'cli.js');
    const root = tempProject('stdd-agent-cli-test-run-');

    const result = spawnSync(process.execPath, [
      cliPath,
      'agent',
      '--test-run',
      '--test-command',
      `${process.execPath} -e "console.log('cli-test-ok')"`,
      '--json',
    ], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload).toEqual(expect.objectContaining({ tool: 'test.run', status: 'pass', passed: true }));
    expect(payload.results[0].stdout).toContain('cli-test-ok');
  });

  test('agent CLI emits git diff JSON', () => {
    const cliPath = path.join(__dirname, '..', 'cli.js');
    const root = tempProject('stdd-agent-cli-git-diff-');

    const result = spawnSync(process.execPath, [cliPath, 'agent', '--git-diff', '--json'], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.tool).toBe('git.diff');
    expect(['ok', 'unavailable']).toContain(payload.status);
  });

  test('agent CLI runs minimal patch cycle', () => {
    const cliPath = path.join(__dirname, '..', 'cli.js');
    const root = tempProject('stdd-agent-cli-cycle-');
    fs.writeFileSync(path.join(root, 'README.md'), 'old\n', 'utf8');
    writeSimplePatch(root);

    const result = spawnSync(process.execPath, [
      cliPath,
      'agent',
      '--cycle',
      '--patch-file',
      'change.diff',
      '--test-command',
      `${process.execPath} -e "console.log('cli-cycle-ok')"`,
      '--json',
    ], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload).toEqual(expect.objectContaining({ tool: 'agent.cycle', mode: 'patch', status: 'pass' }));
    expect(payload.summary.filesChanged).toContain('README.md');
    expect(fs.readFileSync(path.join(root, 'README.md'), 'utf8')).toBe('new\n');
  });

  test('agent CLI writes run report for cycle', () => {
    const cliPath = path.join(__dirname, '..', 'cli.js');
    const root = tempProject('stdd-agent-cli-report-');
    fs.writeFileSync(path.join(root, 'README.md'), 'old\n', 'utf8');
    writeSimplePatch(root);

    const result = spawnSync(process.execPath, [
      cliPath,
      'agent',
      '--cycle',
      '--patch-file',
      'change.diff',
      '--test-command',
      `${process.execPath} -e "console.log('report-ok')"`,
      '--write-report',
      '--json',
    ], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.report).toEqual(expect.objectContaining({ json: expect.any(String), markdown: expect.any(String) }));
    expect(fs.existsSync(path.join(root, payload.report.json))).toBe(true);
    expect(fs.readFileSync(path.join(root, payload.report.markdown), 'utf8')).toContain('Agent Run Report');
  });

  test('agent CLI lists and resumes run history', () => {
    const cliPath = path.join(__dirname, '..', 'cli.js');
    const root = tempProject('stdd-agent-cli-history-');
    const writer = new RunReportWriter({ cwd: root });
    writer.write({
      tool: 'agent.cycle',
      mode: 'repair',
      status: 'fail',
      summary: { status: 'fail' },
      fixPacket: { output: { markdown: 'stdd/agent/fix-packets/fix.md' } },
    }, { runId: 'history-run' });

    const history = spawnSync(process.execPath, [cliPath, 'agent', '--history', '--json'], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });
    const resume = spawnSync(process.execPath, [cliPath, 'agent', '--resume', 'history-run', '--json'], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });

    expect(history.status).toBe(0);
    expect(JSON.parse(history.stdout)[0]).toEqual(expect.objectContaining({ runId: 'history-run' }));
    expect(resume.status).toBe(0);
    const payload = JSON.parse(resume.stdout);
    expect(payload).toEqual(expect.objectContaining({ runId: 'history-run', prompt: 'stdd/agent/fix-packets/fix.md' }));
    expect(payload.suggestedCommand).toContain('--llm-repair');
  });

  test('agent CLI emits standalone fix packet JSON', () => {
    const cliPath = path.join(__dirname, '..', 'cli.js');
    const root = tempProject('stdd-agent-cli-fix-packet-');

    const result = spawnSync(process.execPath, [cliPath, 'agent', 'repair', '--fix-packet', '--json'], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload).toEqual(expect.objectContaining({ type: 'agent-fix-packet', status: 'needs-fix', goal: 'repair' }));
    expect(payload.git.status).toBe('unavailable');
  });

  test('agent CLI writes fix packet prompt files', () => {
    const cliPath = path.join(__dirname, '..', 'cli.js');
    const root = tempProject('stdd-agent-cli-fix-prompt-');

    const result = spawnSync(process.execPath, [cliPath, 'agent', 'repair', '--fix-packet', '--write-prompt', '--json'], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.output).toEqual(expect.objectContaining({ json: expect.any(String), markdown: expect.any(String) }));
    expect(fs.existsSync(path.join(root, payload.output.json))).toBe(true);
    expect(fs.existsSync(path.join(root, payload.output.markdown))).toBe(true);
    expect(fs.readFileSync(path.join(root, payload.output.markdown), 'utf8')).toContain('Return only a unified diff');
  });

  test('agent CLI runs repair cycle', () => {
    const cliPath = path.join(__dirname, '..', 'cli.js');
    const root = tempProject('stdd-agent-cli-repair-');
    fs.writeFileSync(path.join(root, 'README.md'), 'old\n', 'utf8');
    writeSimplePatch(root, 'repair.diff');

    const result = spawnSync(process.execPath, [
      cliPath,
      'agent',
      '--repair',
      '--patch-file',
      'repair.diff',
      '--test-command',
      `${process.execPath} -e "console.log('cli-repair-ok')"`,
      '--json',
    ], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload).toEqual(expect.objectContaining({ tool: 'agent.cycle', mode: 'repair', status: 'pass' }));
    expect(payload.summary.repairApplied).toBe(true);
    expect(fs.readFileSync(path.join(root, 'README.md'), 'utf8')).toBe('new\n');
  });

  test('agent CLI generates llm diff with mock response', () => {
    const cliPath = path.join(__dirname, '..', 'cli.js');
    const root = tempProject('stdd-agent-cli-llm-diff-');
    fs.writeFileSync(path.join(root, 'prompt.md'), '# Fix\n', 'utf8');

    const result = spawnSync(process.execPath, [
      cliPath,
      'agent',
      '--llm-diff',
      '--prompt',
      'prompt.md',
      '--output',
      'repair.diff',
      '--mock-response',
      'diff --git a/a.md b/a.md\n--- a/a.md\n+++ b/a.md\n@@ -1 +1 @@\n-old\n+new',
      '--json',
    ], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload).toEqual(expect.objectContaining({ tool: 'llm.diff', status: 'generated', output: 'repair.diff' }));
    expect(fs.readFileSync(path.join(root, 'repair.diff'), 'utf8')).toContain('diff --git a/a.md b/a.md');
  });

  test('agent CLI runs llm repair with mock response', () => {
    const cliPath = path.join(__dirname, '..', 'cli.js');
    const root = tempProject('stdd-agent-cli-llm-repair-');
    fs.writeFileSync(path.join(root, 'README.md'), 'old\n', 'utf8');
    fs.writeFileSync(path.join(root, 'prompt.md'), '# Fix README\n', 'utf8');

    const result = spawnSync(process.execPath, [
      cliPath,
      'agent',
      '--llm-repair',
      '--prompt',
      'prompt.md',
      '--output',
      'repair.diff',
      '--mock-response',
      'diff --git a/README.md b/README.md\n--- a/README.md\n+++ b/README.md\n@@ -1 +1 @@\n-old\n+new',
      '--test-command',
      `${process.execPath} -e "console.log('cli-llm-repair-ok')"`,
      '--json',
    ], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload).toEqual(expect.objectContaining({ tool: 'agent.llm-repair', status: 'pass' }));
    expect(payload.llm.output).toBe('repair.diff');
    expect(fs.readFileSync(path.join(root, 'README.md'), 'utf8')).toBe('new\n');
  });

  test('agent doctor checks readiness including config and git', () => {
    const root = tempProject();
    fs.mkdirSync(path.join(root, 'stdd', 'agent'), { recursive: true });
    fs.writeFileSync(path.join(root, 'stdd', 'agent', 'config.yaml'), 'mode: guarded\ndefaults:\n  test_command: npm test\n');
    const doctor = new AgentDoctor(root);
    const items = doctor.run();
    const ids = items.map(item => item.id);
    expect(ids).toContain('agent-config');
    expect(ids).toContain('test-command');
    expect(ids).toContain('patch-apply-policy');
    expect(ids).toContain('recommend-next');
    expect(items.find(item => item.id === 'agent-config').status).toBe('pass');
  });

  test('agent CLI runs doctor', () => {
    const cliPath = path.join(__dirname, '..', 'cli.js');
    const root = tempProject('stdd-agent-cli-doctor-');

    const result = spawnSync(process.execPath, [cliPath, 'agent', '--doctor', '--json'], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, CI: '1' },
    });

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.find(item => item.id === 'git-repo')).toBeDefined();
    expect(payload.find(item => item.id === 'node-version').status).toBe('pass');
  });

  test('agent kernel executes stdd.status tool', () => {
    const root = tempProject();
    fs.mkdirSync(path.join(root, 'stdd', 'specs'), { recursive: true });
    fs.mkdirSync(path.join(root, 'stdd', 'changes', 'test-change'), { recursive: true });
    fs.writeFileSync(path.join(root, 'stdd', 'changes', 'test-change', 'tasks.md'), '- [x] done\n- [ ] pending\n');
    const kernel = new AgentKernel({ cwd: root, mode: 'guarded' });

    const result = kernel.executeTool('stdd.status', {});

    expect(result).toEqual(expect.objectContaining({ tool: 'stdd.status', initialized: true }));
    expect(result.changes[0]).toEqual(expect.objectContaining({ name: 'test-change', tasks: 2, done: 1 }));
  });

  test('agent CLI shows stdd status and recommend', () => {
    const cliPath = path.join(__dirname, '..', 'cli.js');
    const root = tempProject('stdd-agent-cli-stdd-');
    fs.mkdirSync(path.join(root, 'stdd', 'specs'), { recursive: true });
    fs.mkdirSync(path.join(root, 'stdd', 'changes', 'test-change'), { recursive: true });

    const statusResult = spawnSync(process.execPath, [cliPath, 'agent', '--status', '--json'], {
      cwd: root, encoding: 'utf8', env: { ...process.env, CI: '1' },
    });
    const recommendResult = spawnSync(process.execPath, [cliPath, 'agent', '--recommend', '--json'], {
      cwd: root, encoding: 'utf8', env: { ...process.env, CI: '1' },
    });

    expect(statusResult.status).toBe(0);
    expect(JSON.parse(statusResult.stdout).tool).toBe('stdd.status');
    expect(recommendResult.status).toBe(0);
  });
});
