/**
 * `chaos serve` — expose the agent over HTTP (SDK transport).
 *
 *   POST /v1/agent/run   {prompt, maxTurns?, temperature?} → {ok, reply, stats}
 *   GET  /v1/health      → {ok, version}
 *   GET  /v1/skills      → skill catalog
 *   GET  /v1/agents      → named agent configs
 *
 * Auth: set CHAOS_SERVER_TOKEN to require `Authorization: Bearer <token>`.
 * Concurrency: one agent run at a time (409 while busy) — REPL-style state
 * (sessions, background tasks) intentionally stays with the CLI.
 */

const http = require('http');
const { runPrompt } = require('../sdk');
const { listSkills } = require('../utils/skills-loader');
const { listAgentConfigs } = require('../utils/agents-config');
const pkg = require('../../package.json');

function createAgentServer(options = {}) {
  const cwd = options.cwd || process.cwd();
  const token = options.token !== undefined ? options.token : process.env.CHAOS_SERVER_TOKEN;
  let busy = false;

  const server = http.createServer(async (req, res) => {
    const json = (code, body) => {
      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    };

    if (token && req.headers.authorization !== `Bearer ${token}`) {
      return json(401, { ok: false, error: 'missing or invalid Authorization bearer token' });
    }

    try {
      if (req.method === 'GET' && req.url === '/v1/health') {
        return json(200, { ok: true, version: pkg.version, busy });
      }
      if (req.method === 'GET' && (req.url === '/v1/skills' || req.url === '/v1/skills/')) {
        return json(200, { ok: true, skills: listSkills(cwd) });
      }
      if (req.method === 'GET' && (req.url === '/v1/agents' || req.url === '/v1/agents/')) {
        return json(200, { ok: true, agents: listAgentConfigs(cwd) });
      }
      if (req.method === 'POST' && (req.url === '/v1/agent/run' || req.url === '/v1/agent/run/')) {
        let body = '';
        req.on('data', c => { body += c; });
        req.on('end', async () => {
          let parsed = {};
          try { parsed = JSON.parse(body || '{}'); } catch (_) { return json(400, { ok: false, error: 'body must be JSON' }); }
          if (!parsed.prompt || typeof parsed.prompt !== 'string') {
            return json(400, { ok: false, error: 'prompt (string) is required' });
          }
          if (busy) return json(409, { ok: false, error: 'another agent run is in progress' });
          busy = true;
          const startedAt = Date.now();
          try {
            const { reply, stats } = await runPrompt({
              prompt: parsed.prompt,
              cwd,
              maxTurns: parsed.maxTurns,
              temperature: parsed.temperature,
            });
            return json(200, { ok: true, reply, stats, elapsedMs: Date.now() - startedAt });
          } catch (err) {
            return json(500, { ok: false, error: err.message });
          } finally {
            busy = false;
          }
        });
        return;
      }
      return json(404, { ok: false, error: `no route: ${req.method} ${req.url}` });
    } catch (err) {
      return json(500, { ok: false, error: err.message });
    }
  });

  server.agentCwd = cwd; // introspection/testing
  return server;
}

function startServeCommand(options = {}) {
  const port = Number(options.port) || 8787;
  const server = createAgentServer(options);
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      console.log(`chaos serve listening on http://127.0.0.1:${port} (cwd: ${server.agentCwd})`);
      console.log(process.env.CHAOS_SERVER_TOKEN || options.token
        ? 'auth: bearer token required'
        : 'auth: NONE (set CHAOS_SERVER_TOKEN to require a bearer token)');
      resolve(server);
    });
  });
}

module.exports = { createAgentServer, startServeCommand };
