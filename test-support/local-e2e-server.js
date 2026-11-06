#!/usr/bin/env node
/**
 * Local fake OpenAI-compatible provider for end-to-end smoke testing.
 *
 * Serves a REAL HTTPS endpoint with SSE streaming so the actual CLI process
 * exercises its genuine network stack (TLS, keep-alive agent, SSE parser,
 * streaming tool-call assembly) — the only scripted part is the "model".
 *
 * Scripted behavior (by user prompt content):
 *   - "READ:" prompt   → fs_read answer.js, then echo the SECRET value found
 *                        in the tool result.
 *   - "CREATE:" prompt → fs_write made.txt with a fixed payload, then confirm.
 *
 * Usage: node local-e2e-server.js <certDir> <workspaceDir>
 * Prints "PORT=<n>" once listening.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const [, , certDir] = process.argv;
if (!certDir) {
  console.error('usage: node local-e2e-server.js <certDir>');
  process.exit(2);
}

// The smoke exports these to the CLI — assert them on every request so a
// header/model propagation regression fails loudly instead of silently.
const EXPECTED_KEY = process.env.STDD_LLM_API_KEY || 'local-e2e-fake-key';
const EXPECTED_MODEL = process.env.STDD_LLM_MODEL || 'local-fake-model';

const WRITE_PAYLOAD = 'LOCAL-E2E-OK';

function sse(res, obj) {
  res.write(`data: ${JSON.stringify(obj)}\n\n`);
}

function chunkDelay() {
  return new Promise(r => setTimeout(r, 25));
}

async function respond(res, body) {
  const messages = body.messages || [];
  const userMsg = [...messages].reverse().find(m => m.role === 'user' && typeof m.content === 'string');
  const prompt = (userMsg && userMsg.content) || '';
  const hasToolResult = messages.some(m => m.role === 'tool');

  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });

  if (prompt.includes('READ:')) {
    if (!hasToolResult) {
      // turn 1: stream a little text, then a streamed fs_read tool call
      await chunkDelay();
      sse(res, { choices: [{ delta: { role: 'assistant' } }] });
      await chunkDelay();
      sse(res, { choices: [{ delta: { content: 'Reading answer.js...' } }] });
      await chunkDelay();
      sse(res, { choices: [{ delta: { tool_calls: [{ index: 0, id: 'call_e2e_1', type: 'function', function: { name: 'fs_read', arguments: '' } }] } }] });
      await chunkDelay();
      // split args across chunks to exercise stream reassembly
      sse(res, { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '{"path":"ans' } }] } }] });
      await chunkDelay();
      sse(res, { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: 'wer.js"}' } }] } }] });
      await chunkDelay();
      sse(res, { choices: [], usage: { prompt_tokens: 12, completion_tokens: 7 } });
    } else {
      // turn 2: pull the SECRET out of the tool result and report it
      const toolMsg = [...messages].reverse().find(m => m.role === 'tool');
      const match = /SECRET\s*=\s*"([^"]+)"/.exec(String(toolMsg && toolMsg.content));
      const secret = match ? match[1] : 'SECRET-NOT-FOUND';
      await chunkDelay();
      sse(res, { choices: [{ delta: { content: `The secret is ${secret}.` } }] });
      await chunkDelay();
      sse(res, { choices: [], usage: { prompt_tokens: 30, completion_tokens: 9 } });
    }
  } else if (prompt.includes('CREATE:')) {
    if (!hasToolResult) {
      await chunkDelay();
      sse(res, { choices: [{ delta: { tool_calls: [{ index: 0, id: 'call_e2e_2', type: 'function', function: { name: 'fs_write', arguments: '' } }] } }] });
      await chunkDelay();
      const args = JSON.stringify({ path: 'made.txt', content: WRITE_PAYLOAD });
      const mid = Math.floor(args.length / 2);
      sse(res, { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: args.slice(0, mid) } }] } }] });
      await chunkDelay();
      sse(res, { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: args.slice(mid) } }] } }] });
      await chunkDelay();
      sse(res, { choices: [], usage: { prompt_tokens: 15, completion_tokens: 6 } });
    } else {
      await chunkDelay();
      sse(res, { choices: [{ delta: { content: `Wrote made.txt containing ${WRITE_PAYLOAD}.` } }] });
      await chunkDelay();
      sse(res, { choices: [], usage: { prompt_tokens: 25, completion_tokens: 8 } });
    }
  } else {
    await chunkDelay();
    sse(res, { choices: [{ delta: { content: 'Unknown scenario.' } }] });
  }

  res.write('data: [DONE]\n\n');
  res.end();
}

const server = https.createServer(
  {
    key: fs.readFileSync(path.join(certDir, 'key.pem')),
    cert: fs.readFileSync(path.join(certDir, 'cert.pem')),
  },
  (req, res) => {
    // STRICT path check: the client must preserve the base-URL path prefix
    // (a lenient match here once masked a real /v1-dropping bug). Return a
    // real 4xx so the CLI's error path shows the diagnostic instead of an
    // opaque empty-SSE hang.
    if (req.method !== 'POST' || req.url !== '/v1/chat/completions') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Unexpected endpoint or method. (${req.method} ${req.url})` }));
      return;
    }
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      let parsed = {};
      try { parsed = JSON.parse(body); } catch (_) { /* ignore */ }
      // Prove the real HTTP stack carries auth header + model field — a
      // regression dropping either must fail the smoke loudly.
      if (req.headers.authorization !== `Bearer ${EXPECTED_KEY}`) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'missing or wrong Authorization header' }));
        return;
      }
      if (parsed.model !== EXPECTED_MODEL) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `unexpected model "${parsed.model}" (wanted ${EXPECTED_MODEL})` }));
        return;
      }
      respond(res, parsed).catch(err => {
        console.error('respond failed:', err && err.message);
        try { res.end(); } catch (_) { /* already gone */ }
      });
    });
  }
);

server.listen(0, '127.0.0.1', () => {
  console.log(`PORT=${server.address().port}`);
});

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
