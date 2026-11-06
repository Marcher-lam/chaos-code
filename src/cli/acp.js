/**
 * `chaos acp` — minimal Agent Client Protocol (ACP) adapter over stdio,
 * letting ACP clients (e.g. editors) drive the Chaos agent.
 *
 * Transport: newline-delimited JSON-RPC 2.0 on stdin/stdout (ACP v1 shape).
 * Implemented methods:
 *   initialize           → {protocolVersion:1, agentCapabilities, authMethods:[]}
 *   session/new          → {sessionId}
 *   session/prompt       → streams session/update agent_message_chunk
 *                          notifications, resolves {stopReason:'end_of_turn'}
 *   session/cancel       → {} (aborts the in-flight run)
 *
 * The handler is a pure function of (message, state) so it is fully unit
 * testable without real stdio.
 */

const crypto = require('crypto');
const { ChaosAgentLoop } = require('../runtime/agent-kernel/chaos-agent-loop');

class AcpAgent {
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.sessions = new Map(); // sessionId → { abort: AbortController }
    this._current = null; // current running prompt's session id
  }

  /**
   * Handle one incoming JSON-RPC message.
   * @returns {Promise<Array<{jsonrpc, id?, method?, params?}>>} messages to send back, in order
   */
  async handle(msg) {
    try {
      if (msg.method === 'initialize') {
        return [this._result(msg.id, {
          protocolVersion: 1,
          agentCapabilities: { loadSession: false },
          authMethods: [],
        })];
      }
      if (msg.method === 'session/new') {
        const sessionId = crypto.randomUUID();
        this.sessions.set(sessionId, { abort: null });
        return [this._result(msg.id, { sessionId, modes: [] })];
      }
      if (msg.method === 'session/prompt') {
        return await this._prompt(msg);
      }
      if (msg.method === 'session/cancel') {
        const entry = this.sessions.get((msg.params && msg.params.sessionId) || this._current);
        if (entry && entry.abort) entry.abort.abort();
        return msg.id !== undefined ? [this._result(msg.id, {})] : [];
      }
      // Unknown request → method-not-found error when it expects a response
      if (msg.id !== undefined && msg.method) {
        return [{
          jsonrpc: '2.0',
          id: msg.id,
          error: { code: -32601, message: `method not found: ${msg.method}` },
        }];
      }
      return []; // stray notification — ignore
    } catch (err) {
      if (msg.id !== undefined) {
        return [{ jsonrpc: '2.0', id: msg.id, error: { code: -32603, message: err.message } }];
      }
      return [];
    }
  }

  async _prompt(msg) {
    const sessionId = msg.params && msg.params.sessionId;
    const blocks = (msg.params && msg.params.prompt) || [];
    const textBlock = blocks.find(b => b.type === 'text');
    const prompt = textBlock ? textBlock.text : '';
    if (!this.sessions.has(sessionId)) {
      return [{ jsonrpc: '2.0', id: msg.id, error: { code: -32002, message: `unknown session ${sessionId}` } }];
    }
    if (!prompt) {
      return [{ jsonrpc: '2.0', id: msg.id, error: { code: -32602, message: 'prompt must contain a text block' } }];
    }

    const entry = this.sessions.get(sessionId);
    entry.abort = new AbortController();
    this._current = sessionId;

    const loop = new ChaosAgentLoop(this.cwd);
    loop.awaitBackgroundOnExit = true;

    const updates = []; // buffered agent_message_chunk notifications
    const push = (update) => updates.push({
      jsonrpc: '2.0',
      method: 'session/update',
      params: { sessionId, update },
    });

    try {
      const messages = await loop.run(prompt, [], {
        onToken: (token) => push({
          sessionUpdate: 'agent_message_chunk',
          content: { type: 'text', text: token },
        }),
        signal: entry.abort.signal,
      });
      try { loop.kernel.mcpClientManager.stopAll(); } catch (_) { /* best-effort */ }
      const assistantMsgs = (messages || []).filter(m => m.role === 'assistant' && typeof m.content === 'string' && m.content.trim());
      if (assistantMsgs.length > 0) {
        push({
          sessionUpdate: 'agent_message_chunk',
          content: { type: 'text', text: assistantMsgs[assistantMsgs.length - 1].content },
        });
      }
      return [...updates, this._result(msg.id, { stopReason: 'end_of_turn' })];
    } catch (err) {
      const aborted = err && err.name === 'AbortError';
      return [
        ...updates,
        this._result(msg.id, { stopReason: aborted ? 'cancelled' : 'end_of_turn', ...(aborted ? {} : { error: err.message }) }),
      ];
    } finally {
      entry.abort = null;
      this._current = null;
    }
  }

  _result(id, result) {
    return { jsonrpc: '2.0', id, result };
  }
}

/** Wire an AcpAgent to real stdio (used by the CLI command). */
function runAcpStdio(cwd) {
  const agent = new AcpAgent({ cwd });
  let buffer = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    buffer += chunk;
    let idx;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      let msg;
      try { msg = JSON.parse(line); } catch (_) { continue; }
      agent.handle(msg).then(out => {
        for (const m of out) process.stdout.write(JSON.stringify(m) + '\n');
      });
    }
  });
  process.stdin.resume();
}

module.exports = { AcpAgent, runAcpStdio };
