const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const child_process = require('child_process');
const { ReadOnlyToolExecutor } = require('../src/runtime/agent-kernel/read-only-tools');
const { GitTool } = require('../src/runtime/agent-kernel/git-tool');
const { ChaosAgentLoop } = require('../src/runtime/agent-kernel/chaos-agent-loop');

jest.mock('https');
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

describe('daily usability hardening', () => {
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

  describe('fs.read line windows', () => {
    let dir;
    let ro;

    beforeEach(() => {
      dir = tmp('chaos-read-');
      fs.writeFileSync(path.join(dir, 'big.js'), Array.from({ length: 5000 }, (_, i) => `line ${i + 1}`).join('\n'));
      fs.writeFileSync(path.join(dir, 'small.js'), 'a\nb\nc');
      ro = new ReadOnlyToolExecutor({ cwd: dir });
    });

    afterEach(() => {
      fs.rmSync(dir, { recursive: true, force: true });
    });

    it('returns the whole small file with totalLines (back-compat shape)', () => {
      const res = ro.readFile({ path: 'small.js' });
      expect(res.content).toBe('a\nb\nc');
      expect(res.totalLines).toBe(3);
      expect(res.truncated).toBeUndefined();
    });

    it('reads an explicit line window with metadata', () => {
      const res = ro.readFile({ path: 'big.js', startLine: 4990, lineCount: 5 });
      expect(res.startLine).toBe(4990);
      expect(res.endLine).toBe(4994);
      expect(res.truncated).toBe(true);
      expect(res.content.split('\n')[0]).toBe('line 4990');
      expect(res.totalLines).toBe(5000);
    });

    it('no longer throws on files larger than maxBytes — returns a window', () => {
      const res = ro.readFile({ path: 'big.js', maxBytes: 1024 });
      expect(res.tool).toBe('fs.read');
      expect(res.truncated).toBe(true);
      expect(res.startLine).toBe(1);
      expect(Buffer.byteLength(res.content) <= 1024 + 4096).toBe(true); // bounded
    });

    it('reads common shell/config text extensions', () => {
      for (const name of ['run.sh', 'conf.toml', 'settings.env.txt']) {
        fs.writeFileSync(path.join(dir, name), 'ok');
        expect(() => ro.readFile({ path: name })).not.toThrow();
      }
    });
  });

  describe('project memory files', () => {
    let dir;

    beforeEach(() => { dir = tmp('chaos-mem-'); });
    afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

    it('injects CLAUDE.md instructions into the system prompt', () => {
      fs.writeFileSync(path.join(dir, 'CLAUDE.md'), 'Always answer in Chinese.');
      const loop = new ChaosAgentLoop(dir);
      expect(loop.systemPrompt).toContain('Project instructions (from CLAUDE.md)');
      expect(loop.systemPrompt).toContain('Always answer in Chinese.');
    });

    it('prefers CHAOS.md over CLAUDE.md and AGENTS.md', () => {
      fs.writeFileSync(path.join(dir, 'AGENTS.md'), 'agents rule');
      fs.writeFileSync(path.join(dir, 'CLAUDE.md'), 'claude rule');
      fs.writeFileSync(path.join(dir, 'CHAOS.md'), 'chaos rule');
      const loop = new ChaosAgentLoop(dir);
      expect(loop.systemPrompt).toContain('from CHAOS.md');
      expect(loop.systemPrompt).toContain('chaos rule');
      expect(loop.systemPrompt).not.toContain('claude rule');
    });

    it('caps oversized memory files with a truncation note', () => {
      fs.writeFileSync(path.join(dir, 'AGENTS.md'), 'X'.repeat(20 * 1024));
      const loop = new ChaosAgentLoop(dir);
      const section = loop.systemPrompt.split('Project instructions (from AGENTS.md):')[1] || '';
      expect(section).toContain('[... truncated]');
      expect(section.length).toBeLessThan(16 * 1024 + 200);
    });

    it('works without any memory file (no crash, no section)', () => {
      const loop = new ChaosAgentLoop(dir);
      expect(loop.systemPrompt).not.toContain('Project instructions');
    });
  });

  describe('git push defaults to the current branch', () => {
    it('pushes the current branch when none is given', () => {
      child_process.spawnSync.mockImplementation((cmd, args) => {
        if (args[0] === 'rev-parse') return { status: 0, stdout: 'master\n', stderr: '' };
        return { status: 0, stdout: '', stderr: '' };
      });
      const git = new GitTool({ cwd: '/tmp' });
      const res = git.push({ remote: 'origin' });

      expect(res.status).toBe('ok');
      expect(res.commands[0].command).toBe('git push origin master');
    });

    it('explicit branch still wins', () => {
      child_process.spawnSync.mockReturnValue({ status: 0, stdout: '', stderr: '' });
      const git = new GitTool({ cwd: '/tmp' });
      git.push({ branch: 'feat/x' });
      const pushCall = child_process.spawnSync.mock.calls.find(c => c[1][0] === 'push');
      expect(pushCall[1]).toEqual(['push', 'origin', 'feat/x']);
    });

    it('falls back to HEAD when the branch cannot be resolved', () => {
      child_process.spawnSync.mockImplementation((cmd, args) => {
        if (args[0] === 'rev-parse') return { status: 128, stdout: '', stderr: 'not a repo' };
        return { status: 0, stdout: '', stderr: '' };
      });
      const git = new GitTool({ cwd: '/tmp' });
      const res = git.push({});
      expect(res.commands[0].command).toBe('git push origin HEAD');
    });
  });

  describe('Anthropic history conversion hardening', () => {
    it('survives malformed streamed tool arguments instead of crashing', async () => {
      let requestPayload = null;
      https.request.mockImplementation((url, options, callback) => {
        const mockReq = {
          on: jest.fn(),
          write: jest.fn(body => { requestPayload = JSON.parse(body); }),
          end: jest.fn(() => {
            const mockRes = {
              statusCode: 200,
              on: (event, cb) => {
                if (event === 'data') cb('data: {"type":"message_start","message":{"usage":{"input_tokens":1,"output_tokens":0}}}\n\n');
                if (event === 'end') cb();
              },
            };
            callback(mockRes);
          }),
        };
        return mockReq;
      });

      const loop = new ChaosAgentLoop(tmp('chaos-anth-'));
      loop.apiKey = 'k';
      loop.provider = 'anthropic';
      loop.model = 'claude-3-5-sonnet-latest';

      const messages = [
        {
          role: 'assistant',
          content: null,
          tool_calls: [{
            id: 'call_1',
            function: { name: 'fs_read', arguments: '{broken json' },
          }],
        },
      ];

      await expect(loop._callAnthropicStream(messages, null, null)).resolves.toBeTruthy();
      const toolUse = requestPayload.messages[0].content.find(b => b.type === 'tool_use');
      expect(toolUse.input).toEqual({});
    });
  });
});
