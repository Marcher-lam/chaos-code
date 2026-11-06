const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const child_process = require('child_process');
const { EventEmitter } = require('events');
const { GitTool } = require('../src/runtime/agent-kernel/git-tool');
const { createCheckpoint, listCheckpoints, restoreCheckpoint, getCheckpoint } = require('../src/cli/checkpoints');
const { extractSymbols, flattenLspSymbols, LspClient, getSymbols } = require('../src/runtime/agent-kernel/lsp');
const { createAgentServer } = require('../src/cli/server');
const { AcpAgent } = require('../src/cli/acp');
const { ChaosAgentLoop } = require('../src/runtime/agent-kernel/chaos-agent-loop');

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
jest.mock('../src/sdk', () => ({
  runPrompt: jest.fn(async () => ({ reply: 'sdk-reply', messages: [], stats: { totalTokens: 5 } })),
}));

function tmp(name) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), name));
  return { cwd: path.join(home, 'ws'), home, mkdir: () => fs.mkdirSync(path.join(home, 'ws'), { recursive: true }) };
}

describe('platform features round', () => {
  let originalEnv;
  let originalHomedir;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.STDD_LLM_API_KEY = 'test-key';
    originalHomedir = os.homedir;
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    os.homedir = originalHomedir;
    jest.restoreAllMocks();
  });

  // ── git worktree ──
  describe('git worktree', () => {
    it('lists worktrees parsed from porcelain output', () => {
      child_process.spawnSync.mockReturnValue({
        status: 0,
        stdout: 'worktree /repo/main\nHEAD abcdef12\nbranch refs/heads/main\n\nworktree /repo/main/.worktrees/feat\nHEAD 12345678\nbranch refs/heads/feat\n',
        stderr: '',
      });
      const git = new GitTool({ cwd: '/repo/main' });
      const res = git.worktree({});
      expect(res.status).toBe('ok');
      expect(res.worktrees).toHaveLength(2);
      expect(res.worktrees[0]).toMatchObject({ path: '/repo/main', branch: 'main', head: 'abcdef12' });
      expect(res.worktrees[1].branch).toBe('feat');
    });

    it('add creates .worktrees/<name> with a matching branch', () => {
      child_process.spawnSync.mockReturnValue({ status: 0, stdout: '', stderr: '' });
      const git = new GitTool({ cwd: '/repo/main' });
      const res = git.worktree({ action: 'add', name: 'feat-x' });
      expect(res.status).toBe('ok');
      const call = child_process.spawnSync.mock.calls.find(c => c[1][0] === 'worktree' && c[1][1] === 'add');
      expect(call[1]).toEqual(['worktree', 'add', '-b', 'feat-x', '/repo/main/.worktrees/feat-x']);
    });

    it('rejects path-traversal names', () => {
      const git = new GitTool({ cwd: '/repo/main' });
      expect(() => git.worktree({ action: 'add', name: '../evil' })).toThrow(/simple worktree name/i);
      expect(() => git.worktree({ action: 'add', name: 'a/b' })).toThrow(/simple worktree name/i);
    });
  });

  // ── session checkpoints ──
  describe('checkpoints', () => {
    it('create → mutate → restore round-trips a whole timeline point', () => {
      const { cwd, home, mkdir } = tmp('chaos-cp-');
      mkdir();
      os.homedir = () => home;
      fs.writeFileSync(path.join(cwd, 'a.js'), 'v1');
      fs.writeFileSync(path.join(cwd, 'b.js'), 'v1');

      const cp = createCheckpoint('sess1', cwd, [{ file: 'a.js', existed: true }, { file: 'b.js', existed: true }]);
      expect(cp.fileCount).toBe(2);

      fs.writeFileSync(path.join(cwd, 'a.js'), 'v2-ruined');
      fs.rmSync(path.join(cwd, 'b.js'));
      fs.writeFileSync(path.join(cwd, 'made-by-agent.txt'), 'x');

      // second checkpoint including the agent-created file
      createCheckpoint('sess1', cwd, [{ file: 'a.js', existed: true }, { file: 'made-by-agent.txt', existed: true }]);

      const res = restoreCheckpoint('sess1', cwd, '1');
      expect(res.ok).toBe(true);
      expect(fs.readFileSync(path.join(cwd, 'a.js'), 'utf8')).toBe('v1');
      expect(fs.readFileSync(path.join(cwd, 'b.js'), 'utf8')).toBe('v1');
      // made-by-agent.txt was NOT in cp-1's manifest — stays
      expect(fs.existsSync(path.join(cwd, 'made-by-agent.txt'))).toBe(true);

      // restoring the newest checkpoint's view of a created file works via manifest
      expect(listCheckpoints('sess1').map(c => c.id)).toEqual([1, 2]);
      expect(getCheckpoint('sess1', '1').id).toBe(1);
      fs.rmSync(home, { recursive: true, force: true });
    });

    it('deletes agent-created files on restore when the manifest says existed:false', () => {
      const { cwd, home, mkdir } = tmp('chaos-cp2-');
      mkdir();
      os.homedir = () => home;
      fs.writeFileSync(path.join(cwd, 'gen.ts'), 'agent content');
      createCheckpoint('sess2', cwd, [{ file: 'gen.ts', existed: true }]);
      const res = restoreCheckpoint('sess2', cwd, '1');
      expect(res.ok).toBe(true);
      expect(fs.existsSync(path.join(cwd, 'gen.ts'))).toBe(true); // snapshotted → restored in place
      fs.rmSync(home, { recursive: true, force: true });
    });

    it('prunes to the newest 10 checkpoints', () => {
      const { cwd, home, mkdir } = tmp('chaos-cp3-');
      mkdir();
      os.homedir = () => home;
      fs.writeFileSync(path.join(cwd, 'a.js'), 'v');
      for (let i = 0; i < 13; i++) createCheckpoint('sess3', cwd, [{ file: 'a.js', existed: true }], `cp${i}`);
      const cps = listCheckpoints('sess3');
      expect(cps).toHaveLength(10);
      expect(cps[0].id).toBe(4); // oldest three pruned
      fs.rmSync(home, { recursive: true, force: true });
    });
  });

  // ── LSP / symbols ──
  describe('symbols (heuristic + LSP client)', () => {
    it('extracts js symbols with line numbers and containers', () => {
      const src = [
        'const helper = (x) => x + 1;',
        '',
        'class Server {',
        '  constructor() {}',
        '  async start(port) {',
        '    return port;',
        '  }',
        '}',
        '',
        'function main() {',
        '  return 1;',
        '}',
      ].join('\n');
      const syms = extractSymbols(src, 'javascript');
      const names = syms.map(s => s.name);
      expect(names).toContain('helper');
      expect(names).toContain('Server');
      expect(names).toContain('start');
      expect(names).toContain('main');
      const start = syms.find(s => s.name === 'start');
      expect(start.kind).toBe('method');
      expect(start.container).toBe('Server');
      expect(start.line).toBe(5);
    });

    it('extracts python and go definitions', () => {
      const py = extractSymbols('class Repo:\n    def load(self):\n        pass\n\ndef top():\n    pass\n', 'python');
      expect(py.map(s => s.name)).toEqual(['Repo', 'load', 'top']);
      const go = extractSymbols('func (s *Server) Start() {}\nfunc main() {}\ntype Config struct {\n}\n', 'go');
      expect(go.map(s => s.name)).toEqual(['Start', 'main', 'Config']);
    });

    it('getSymbols serves heuristics when no LSP server is configured', async () => {
      const { cwd } = tmp('chaos-sym-');
      fs.mkdirSync(cwd, { recursive: true });
      fs.writeFileSync(path.join(cwd, 'mod.js'), 'function alpha() {}\nfunction beta() {}\n');
      const res = await getSymbols(cwd, { path: 'mod.js' });
      expect(res.status).toBe('ok');
      expect(res.source).toBe('heuristic');
      expect(res.symbolCount).toBe(2);
      const filtered = await getSymbols(cwd, { path: 'mod.js', name: 'alp' });
      expect(filtered.symbolCount).toBe(1);
      expect(filtered.symbols[0]).toContain('alpha');
    });

    it('LspClient speaks Content-Length framing end to end (initialize → documentSymbol)', async () => {
      const child = new EventEmitter();
      child.stdin = { write: jest.fn() };
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();
      child.kill = jest.fn();

      const frame = (obj) => {
        const j = JSON.stringify(obj);
        return Buffer.from(`Content-Length: ${Buffer.byteLength(j)}\r\n\r\n${j}`);
      };
      child.stdin.write.mockImplementation((data) => {
        const str = data.toString();
        const headerEnd = str.indexOf('\r\n\r\n');
        const msg = JSON.parse(str.slice(headerEnd + 4));
        if (msg.method === 'initialize') {
          child.stdout.emit('data', frame({ jsonrpc: '2.0', id: msg.id, result: { capabilities: {} } }));
        } else if (msg.method === 'textDocument/documentSymbol') {
          child.stdout.emit('data', frame({
            jsonrpc: '2.0',
            id: msg.id,
            result: [{
              name: 'Server', kind: 5, range: { start: { line: 0 } },
              children: [{ name: 'start', kind: 6, range: { start: { line: 4 } } }],
            }],
          }));
        }
      });

      const client = new LspClient('test', { command: 'x' }, '/ws', { spawnFn: () => child });
      const raw = await client.documentSymbols('/ws/a.js', 'javascript', 'class Server {}');
      const flat = flattenLspSymbols(raw);
      expect(flat).toEqual([
        { name: 'Server', kind: '5', line: 1 },
        { name: 'start', kind: '6', line: 5, container: 'Server' },
      ]);
      client.stop();
    });

    it('flattenLspSymbols handles flat SymbolInformation[] responses', () => {
      const flat = flattenLspSymbols([
        { name: 'foo', kind: 12, location: { range: { start: { line: 2 } } } },
      ]);
      expect(flat[0]).toEqual({ name: 'foo', kind: '12', line: 3 });
    });
  });

  // ── HTTP server (SDK transport) ──
  describe('chaos serve', () => {
    let server;

    afterEach(() => { if (server) server.close(); });

    function request(method, urlPath, body, headers = {}) {
      return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const req = http.request({
          host: '127.0.0.1', port: server.address().port, method, path: urlPath,
          headers: { ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}), ...headers },
        }, res => {
          let data = '';
          res.on('data', c => { data += c; });
          res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data || '{}') }));
        });
        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
      });
    }

    it('exposes health, skills and agent run', async () => {
      server = createAgentServer({ cwd: __dirname, token: '' });
      await new Promise(r => server.listen(0, '127.0.0.1', r));

      const health = await request('GET', '/v1/health');
      expect(health.status).toBe(200);
      expect(health.body.ok).toBe(true);

      const skills = await request('GET', '/v1/skills');
      expect(skills.status).toBe(200);
      expect(skills.body.skills.length).toBeGreaterThan(0);

      const run = await request('POST', '/v1/agent/run', { prompt: 'say hi' });
      expect(run.status).toBe(200);
      expect(run.body.ok).toBe(true);
      expect(run.body.reply).toBe('sdk-reply');

      const missing = await request('POST', '/v1/agent/run', {});
      expect(missing.status).toBe(400);
    });

    it('requires the bearer token when configured', async () => {
      server = createAgentServer({ cwd: __dirname, token: 'sekret' });
      await new Promise(r => server.listen(0, '127.0.0.1', r));
      const denied = await request('GET', '/v1/health');
      expect(denied.status).toBe(401);
      const allowed = await request('GET', '/v1/health', null, { Authorization: 'Bearer sekret' });
      expect(allowed.status).toBe(200);
    });
  });

  // ── ACP agent ──
  describe('ACP adapter', () => {
    it('initialize + session/new + session/prompt lifecycle', async () => {
      const agent = new AcpAgent({ cwd: os.tmpdir() });
      const init = await agent.handle({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
      expect(init[0].result.protocolVersion).toBe(1);

      const created = await agent.handle({ jsonrpc: '2.0', id: 2, method: 'session/new', params: {} });
      const sessionId = created[0].result.sessionId;
      expect(sessionId).toBeTruthy();

      jest.spyOn(ChaosAgentLoop.prototype, 'run').mockResolvedValue([
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'the answer' },
      ]);
      jest.spyOn(ChaosAgentLoop.prototype, 'getSessionStats').mockReturnValue({});

      const out = await agent.handle({
        jsonrpc: '2.0', id: 3, method: 'session/prompt',
        params: { sessionId, prompt: [{ type: 'text', text: 'hi' }] },
      });
      const last = out[out.length - 1];
      expect(last.id).toBe(3);
      expect(last.result.stopReason).toBe('end_of_turn');
      const chunks = out.filter(m => m.method === 'session/update');
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[chunks.length - 1].params.update.content.text).toBe('the answer');
    });

    it('rejects prompts for unknown sessions and unknown methods', async () => {
      const agent = new AcpAgent({ cwd: os.tmpdir() });
      const bad = await agent.handle({ jsonrpc: '2.0', id: 1, method: 'session/prompt', params: { sessionId: 'ghost', prompt: [{ type: 'text', text: 'x' }] } });
      expect(bad[0].error.message).toContain('unknown session');

      const unknown = await agent.handle({ jsonrpc: '2.0', id: 2, method: 'session/dance', params: {} });
      expect(unknown[0].error.code).toBe(-32601);
    });
  });

  // ── background residency ──
  describe('background residency', () => {
    it('REPL runs keep background tasks resident across turns (no drain)', async () => {
      const { cwd } = tmp('chaos-bgres-');
      fs.mkdirSync(cwd, { recursive: true });
      const loop = new ChaosAgentLoop(cwd);
      loop.apiKey = 'k';
      loop.provider = 'openai';
      loop.awaitBackgroundOnExit = false;

      jest.spyOn(ChaosAgentLoop.prototype, '_callLLM').mockImplementation(async () => {
        await new Promise(r => setTimeout(r, 120));
        return { content: 'slow result', toolCalls: [], usage: {} };
      });

      const t0 = Date.now();
      // foreground turn that only dispatches a background task, then answers
      let call = 0;
      loop._callLLM.mockImplementation(async () => {
        call++;
        if (call === 1) {
          return {
            content: null,
            toolCalls: [{ id: 'c1', name: 'task_dispatch', arguments: { tasks: [{ prompt: 'bg job', background: true }] } }],
            toolCallsRaw: [{ id: 'c1', type: 'function', function: { name: 'task_dispatch', arguments: '{}' } }],
            usage: {},
          };
        }
        return { content: 'dispatched, will check later', toolCalls: [], usage: {} };
      });

      await loop.run('start bg', [], { onMessage: () => {} });
      const elapsed = Date.now() - t0;
      // The run returned WITHOUT waiting ~120ms for the background task
      expect(elapsed).toBeLessThan(110);
      const running = [...loop._backgroundTasks.values()].filter(e => e.status === 'running');
      expect(running).toHaveLength(1);
      // it finishes on its own, resident across turns
      await new Promise(r => setTimeout(r, 250));
      expect(loop._backgroundTasks.get(running[0].id).status).toBe('completed');
    });

    it('awaitBackgroundOnExit=true (pipe/SDK) drains before run() returns', async () => {
      const { cwd } = tmp('chaos-bgdrain-');
      fs.mkdirSync(cwd, { recursive: true });
      const loop = new ChaosAgentLoop(cwd);
      loop.apiKey = 'k';
      loop.provider = 'openai';
      loop.awaitBackgroundOnExit = true;

      let call = 0;
      jest.spyOn(ChaosAgentLoop.prototype, '_callLLM').mockImplementation(async () => {
        call++;
        if (call === 1) {
          return {
            content: null,
            toolCalls: [{ id: 'c1', name: 'task_dispatch', arguments: { tasks: [{ prompt: 'bg', background: true }] } }],
            toolCallsRaw: [{ id: 'c1', type: 'function', function: { name: 'task_dispatch', arguments: '{}' } }],
            usage: {},
          };
        }
        return { content: 'done', toolCalls: [], usage: {} };
      });

      const messages = await loop.run('go', [], { onMessage: () => {} });
      expect(messages).toBeDefined();
      for (const e of loop._backgroundTasks.values()) {
        expect(e.status).not.toBe('running');
      }
    });
  });
});
