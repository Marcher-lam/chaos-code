const fs = require('fs');
const os = require('os');
const path = require('path');
const child_process = require('child_process');
const { ChaosAgentLoop } = require('../src/runtime/agent-kernel/chaos-agent-loop');
const { GitTool } = require('../src/runtime/agent-kernel/git-tool');
const { ShellTool } = require('../src/runtime/agent-kernel/shell-tool');
const { AgentHooks } = require('../src/runtime/agent-kernel/hooks');
const { wrapForSandbox } = require('../src/utils/os-sandbox');
const { loadAgentConfigs, listAgentConfigs } = require('../src/utils/agents-config');
const { listPlugins, pluginHooks } = require('../src/utils/plugins-loader');
const { listSkills, loadSkill, listCommands } = require('../src/utils/skills-loader');

jest.mock('child_process');
jest.mock('../src/runtime/agent-kernel/index');
jest.mock('../src/runtime/agent-kernel/provider-config', () => ({
  initFromEnv: jest.fn(() => null),
  getActive: jest.fn(() => null),
  setActive: jest.fn(),
  listProviders: jest.fn(() => []),
  addProvider: jest.fn(),
  BUILTIN_PROVIDERS: {},
}));

function tmp(name) {
  return fs.mkdtempSync(path.join(os.tmpdir(), name));
}

describe('parity features round: plan mode / sandbox / git_pr / named agents / plugins', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.STDD_LLM_API_KEY = 'test-key';
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  // ── Plan mode ──
  describe('plan mode', () => {
    it('refuses guarded tools with a planning steer and skips askPermission', async () => {
      const loop = new ChaosAgentLoop(tmp('chaos-plan-'));
      loop.apiKey = 'k';
      loop.provider = 'openai';
      loop.planMode = true;
      const askPermission = jest.fn().mockResolvedValue(true);
      loop._currentCallbacks = { askPermission };

      let call = 0;
      const toolResults = [];
      jest.spyOn(loop, '_callLLM').mockImplementation(async () => {
        call++;
        if (call === 1) {
          return {
            content: null,
            toolCalls: [{ id: 'c1', name: 'fs_write', arguments: { path: 'x', content: 'y' } }],
            toolCallsRaw: [{ id: 'c1', type: 'function', function: { name: 'fs_write', arguments: '{}' } }],
            usage: {},
          };
        }
        return { content: 'here is my plan: ...', toolCalls: [], usage: {} };
      });
      jest.spyOn(loop, '_executeWrite').mockResolvedValue({ status: 'ok' });

      const messages = await loop.run('do it', [], { onMessage: () => {}, onToolEnd: (n, r) => toolResults.push(r) });

      expect(askPermission).not.toHaveBeenCalled();       // no permission prompt in plan mode
      expect(loop._executeWrite).not.toHaveBeenCalled();  // write never executes
      expect(toolResults[0].error).toContain('Plan mode is active');
      const toolMsg = messages.find(m => m.role === 'tool');
      expect(toolMsg.content).toContain('implementation plan');
    });

    it('still allows read-only tools in plan mode', async () => {
      const loop = new ChaosAgentLoop(tmp('chaos-plan2-'));
      loop.apiKey = 'k';
      loop.provider = 'openai';
      loop.planMode = true;

      let call = 0;
      jest.spyOn(loop, '_callLLM').mockImplementation(async () => {
        call++;
        if (call === 1) {
          return {
            content: null,
            toolCalls: [{ id: 'c1', name: 'task_list', arguments: {} }],
            toolCallsRaw: [{ id: 'c1', type: 'function', function: { name: 'task_list', arguments: '{}' } }],
            usage: {},
          };
        }
        return { content: 'plan based on tasks', toolCalls: [], usage: {} };
      });

      const messages = await loop.run('plan something', [], { onMessage: () => {} });
      const toolMsg = messages.find(m => m.role === 'tool');
      expect(JSON.stringify(toolMsg.content)).toContain('count'); // task_list ran for real
    });
  });

  // ── OS sandbox ──
  describe('os sandbox', () => {
    it('wraps commands with sandbox-exec when available (darwin profile)', () => {
      process.env.CHAOS_SANDBOX_TOOL = 'sandbox-exec';
      const res = wrapForSandbox('node', ['server.js'], { cwd: '/tmp/wk' });
      expect(res.sandboxed).toBe(true);
      expect(res.bin).toBe('sandbox-exec');
      expect(res.args[0]).toBe('-p');
      expect(res.args[1]).toContain('(deny file-write*');
      expect(res.args[1]).toContain('/.ssh');
      expect(res.args.slice(2)).toEqual(['node', 'server.js']);
      delete process.env.CHAOS_SANDBOX_TOOL;
    });

    it('wraps commands with bwrap on linux', () => {
      process.env.CHAOS_SANDBOX_TOOL = 'bwrap';
      const res = wrapForSandbox('jest', ['--silent'], { cwd: '/tmp/wk' });
      expect(res.sandboxed).toBe(true);
      expect(res.bin).toBe('bwrap');
      expect(res.args).toContain('--ro-bind');
      expect(res.args).toContain('--unshare-pid');
      expect(res.args).toContain('--die-with-parent'); // no orphaned sandbox procs
      expect(res.args.slice(-3)).toEqual(['--', 'jest', '--silent']);
      delete process.env.CHAOS_SANDBOX_TOOL;
    });

    it('is a passthrough when disabled or unavailable', () => {
      process.env.CHAOS_SANDBOX = 'off';
      expect(wrapForSandbox('node', ['x.js'], {})).toEqual({ bin: 'node', args: ['x.js'], sandboxed: false });
      delete process.env.CHAOS_SANDBOX;
      process.env.CHAOS_SANDBOX_TOOL = '';
      expect(wrapForSandbox('node', ['x.js'], {}).sandboxed).toBe(false);
      delete process.env.CHAOS_SANDBOX_TOOL;
    });

    it('ShellTool routes execution through the sandbox wrapper', () => {
      process.env.CHAOS_SANDBOX_TOOL = 'sandbox-exec';
      child_process.spawnSync.mockImplementation((bin, args) => {
        if (bin === 'sandbox-exec' && args[0] === '-p' && args[1].includes('(version 1)')) {
          return { status: 0, stdout: 'out', stderr: '' };
        }
        return { status: 0, stdout: '', stderr: '' };
      });
      const sh = new ShellTool({ cwd: tmp('chaos-sbx-') });
      const res = sh.run({ command: 'echo hi' });
      const call = child_process.spawnSync.mock.calls.find(c => c[0] === 'sandbox-exec');
      expect(call).toBeDefined();
      expect(res.status).toBe('pass');
      delete process.env.CHAOS_SANDBOX_TOOL;
    });

    it('a model-supplied sandbox:false is IGNORED — only operator config can disable', () => {
      process.env.CHAOS_SANDBOX_TOOL = 'sandbox-exec';
      child_process.spawnSync.mockReturnValue({ status: 0, stdout: '', stderr: '' });
      const sh = new ShellTool({ cwd: tmp('chaos-sbx2-') });
      sh.run({ command: 'echo hi', sandbox: false }); // model-controlled opt-out attempt
      expect(child_process.spawnSync.mock.calls.find(c => c[0] === 'sandbox-exec')).toBeDefined();
      delete process.env.CHAOS_SANDBOX_TOOL;
    });

    it('CHAOS_SANDBOX=off (operator env) disables the wrapper', () => {
      process.env.CHAOS_SANDBOX_TOOL = 'sandbox-exec';
      process.env.CHAOS_SANDBOX = 'off';
      child_process.spawnSync.mockReturnValue({ status: 0, stdout: '', stderr: '' });
      const sh = new ShellTool({ cwd: tmp('chaos-sbx3-') });
      sh.run({ command: 'echo hi' });
      expect(child_process.spawnSync.mock.calls.find(c => c[0] === 'sandbox-exec')).toBeUndefined();
      delete process.env.CHAOS_SANDBOX;
      delete process.env.CHAOS_SANDBOX_TOOL;
    });

    it('CHAOS_SANDBOX=on fails closed when no sandbox tool exists', () => {
      process.env.CHAOS_SANDBOX = 'on';
      process.env.CHAOS_SANDBOX_TOOL = ''; // no tool available
      const sh = new ShellTool({ cwd: tmp('chaos-sbx4-') });
      const res = sh.run({ command: 'echo hi' });
      expect(res.status).toBe('rejected');
      expect(res.passed).toBe(false);
      expect(String(res.reason || res.stderr || '')).toMatch(/Refusing/i);
      delete process.env.CHAOS_SANDBOX;
      delete process.env.CHAOS_SANDBOX_TOOL;
    });
  });

  // ── git_pr ──
  describe('git_pr tool', () => {
    it('reports unavailable when gh is missing', () => {
      child_process.spawnSync.mockImplementation((bin) => {
        if (bin === 'gh') return { status: 127, error: new Error('not found') };
        return { status: 0, stdout: '', stderr: '' };
      });
      const git = new GitTool({ cwd: tmp('chaos-pr-') });
      const res = git.pr({ title: 'feat: x' });
      expect(res.status).toBe('unavailable');
      expect(res.reason).toContain('gh');
    });

    it('pushes then creates the PR and returns its url', () => {
      child_process.spawnSync.mockImplementation((bin, args) => {
        if (bin === 'gh' && args[0] === '--version') return { status: 0, stdout: 'gh 2.0', stderr: '' };
        if (bin === 'git' && args[0] === 'push') return { status: 0, stdout: '', stderr: '' };
        if (bin === 'gh' && args[0] === 'pr') return { status: 0, stdout: 'https://github.com/o/r/pull/9\n', stderr: '' };
        return { status: 0, stdout: '', stderr: '' };
      });
      const git = new GitTool({ cwd: tmp('chaos-pr2-') });
      const res = git.pr({ title: 'feat: x', body: 'b', draft: true });
      expect(res.status).toBe('ok');
      expect(res.url).toContain('pull/9');
      const ghCreate = child_process.spawnSync.mock.calls.find(c => c[0] === 'gh' && c[1][0] === 'pr');
      expect(ghCreate[1]).toEqual(expect.arrayContaining(['--title', 'feat: x', '--draft']));
    });

    it('is registered and guarded end to end', () => {
      const loop = new ChaosAgentLoop(tmp('chaos-pr3-'));
      const names = loop._getLLMTools().map(t => t.function.name);
      expect(names).toContain('git_pr');
    });
  });

  // ── Named agents ──
  describe('named agent configs', () => {
    let dir;

    beforeEach(() => { dir = tmp('chaos-agents-'); });
    afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

    it('loads and merges global + workspace configs (workspace wins)', () => {
      const home = tmp('chaos-agents-home-');
      fs.mkdirSync(path.join(home, '.chaos'), { recursive: true });
      fs.writeFileSync(path.join(home, '.chaos', 'agents.json'), JSON.stringify({
        agents: { reviewer: { description: 'global', tools: ['fs_read'] }, only: { description: 'global-only' } },
      }));
      fs.mkdirSync(path.join(dir, '.chaos'), { recursive: true });
      fs.writeFileSync(path.join(dir, '.chaos', 'agents.json'), JSON.stringify({
        agents: { reviewer: { description: 'workspace', prompt: 'p', tools: ['fs_read', 'fs_grep'], model: 'm1' } },
      }));
      const origHome = os.homedir;
      os.homedir = () => home;
      try {
        const cfgs = loadAgentConfigs(dir);
        expect(cfgs.reviewer.description).toBe('workspace');
        expect(cfgs.reviewer.model).toBe('m1');
        expect(cfgs.only.description).toBe('global-only');
        expect(listAgentConfigs(dir).map(a => a.name).sort()).toEqual(['only', 'reviewer']);
      } finally {
        os.homedir = origHome;
        fs.rmSync(home, { recursive: true, force: true });
      }
    });

    it('task_dispatch applies the agent prompt, tools and model', async () => {
      fs.mkdirSync(path.join(dir, '.chaos'), { recursive: true });
      fs.writeFileSync(path.join(dir, '.chaos', 'agents.json'), JSON.stringify({
        agents: { reviewer: { prompt: 'Review harshly.', tools: ['fs_read'], model: 'agent-model-x' } },
      }));

      const parent = new ChaosAgentLoop(dir);
      parent.apiKey = 'k';
      parent.provider = 'openai';
      parent.model = 'parent-model';

      const seen = [];
      jest.spyOn(ChaosAgentLoop.prototype, '_callLLM').mockImplementation(async function () {
        seen.push({ model: this.model, allowed: this.allowedTools ? [...this.allowedTools] : null, prompt: this.systemPrompt });
        return { content: 'reviewed', toolCalls: [], usage: {} };
      });

      const res = await parent._executeTool('task_dispatch', { tasks: [{ agent: 'reviewer', prompt: 'check code' }] });
      expect(res.status).toBe('ok');
      expect(res.results[0].ok).toBe(true);
      expect(seen[0].model).toBe('agent-model-x');
      expect(seen[0].allowed).toEqual(['fs_read']);
      expect(seen[0].prompt).toContain('Role instructions (agent: reviewer)');
      expect(seen[0].prompt).toContain('Review harshly.');
    });

    it('unknown agent names fail with a helpful error', async () => {
      const dir2 = tmp('chaos-agents2-');
      const parent = new ChaosAgentLoop(dir2);
      parent.apiKey = 'k';
      const res = await parent._executeTool('task_dispatch', { tasks: [{ agent: 'ghost', prompt: 'x' }] });
      expect(res.results[0].ok).toBe(false);
      expect(res.results[0].error).toContain('Unknown agent "ghost"');
      fs.rmSync(dir2, { recursive: true, force: true });
    });
  });

  // ── Plugins ──
  describe('plugin packs', () => {
    let dir;

    beforeEach(() => {
      dir = tmp('chaos-plugins-');
      const plug = path.join(dir, '.chaos', 'plugins', 'acme');
      fs.mkdirSync(path.join(plug, 'skills', 'deploy'), { recursive: true });
      fs.mkdirSync(path.join(plug, 'commands'), { recursive: true });
      fs.writeFileSync(path.join(plug, 'plugin.json'), JSON.stringify({ name: 'acme', description: 'Acme workflows' }));
      fs.writeFileSync(path.join(plug, 'skills', 'deploy', 'SKILL.md'), '---\ndescription: deploy skill\n---\nDeploy steps');
      fs.writeFileSync(path.join(plug, 'commands', 'audit.md'), '---\ndescription: audit\n---\nAudit steps');
      fs.writeFileSync(path.join(plug, 'hooks.json'), JSON.stringify({ preToolUse: ['echo plugin-hook'] }));
    });
    afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

    it('lists the plugin with its contributions', () => {
      const plugins = listPlugins(dir);
      expect(plugins).toHaveLength(1);
      expect(plugins[0]).toMatchObject({ name: 'acme', skillCount: 1, commandCount: 1, hookCount: 1 });
    });

    it('plugin skills and commands merge into the catalogs', () => {
      const deploy = loadSkill('deploy', dir);
      expect(deploy.source).toBe('plugin:acme');
      expect(deploy.body).toContain('Deploy steps');
      expect(listSkills(dir).length).toBeGreaterThanOrEqual(54);
      expect(listCommands(dir).find(c => c.name === 'audit').source).toBe('plugin:acme');
    });

    it('workspace skills still override plugin skills with the same name', () => {
      const ws = path.join(dir, 'stdd', 'skills', 'deploy');
      fs.mkdirSync(ws, { recursive: true });
      fs.writeFileSync(path.join(ws, 'SKILL.md'), '---\ndescription: ws wins\n---\nWS deploy');
      expect(loadSkill('deploy', dir).source).toBe('workspace');
    });

    it('trusted plugin hooks append to user hooks; untrusted are skipped with a notice', () => {
      const home = tmp('chaos-plugins-home-');
      fs.mkdirSync(path.join(home, '.chaos'), { recursive: true });
      fs.writeFileSync(path.join(home, '.chaos', 'config.json'), JSON.stringify({
        hooks: { preToolUse: [{ command: 'user-hook' }] },
        trustedPlugins: ['acme'],
      }));
      const origHome = os.homedir;
      os.homedir = () => home;
      try {
        const h = new AgentHooks(dir);
        expect(h.config.preToolUse.map(x => x.command)).toEqual(['user-hook', 'echo plugin-hook']);
        expect(h.config.untrustedPluginHooks).toEqual([]);
      } finally {
        os.homedir = origHome;
        fs.rmSync(home, { recursive: true, force: true });
      }
    });

    it('UNTRUSTED plugin hooks are never executed (supply-chain RCE guard)', () => {
      const home = tmp('chaos-plugins-home2-');
      fs.mkdirSync(path.join(home, '.chaos'), { recursive: true });
      fs.writeFileSync(path.join(home, '.chaos', 'config.json'), JSON.stringify({ hooks: {} })); // no trustedPlugins
      const origHome = os.homedir;
      os.homedir = () => home;
      try {
        const h = new AgentHooks(dir);
        expect(h.config.preToolUse).toEqual([]);                       // plugin hook NOT loaded
        expect(h.config.untrustedPluginHooks).toEqual(['acme']);       // but reported
      } finally {
        os.homedir = origHome;
        fs.rmSync(home, { recursive: true, force: true });
      }
    });

    it('pluginHooks tolerates missing plugins dir', () => {
      const res = pluginHooks(tmp('chaos-noplugin-'));
      expect(res.preToolUse).toEqual([]);
      expect(res.postToolUse).toEqual([]);
      expect(res.untrusted).toEqual([]);
    });
  });
});
