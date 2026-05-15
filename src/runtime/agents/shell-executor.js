const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { AgentExecutor } = require('./executor-interface');

const DEFAULT_ALLOWED_BINS = new Set(['node', process.execPath]);

function splitList(value) {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function basename(value) {
  return String(value || '').replace(/\\/g, '/').split('/').pop();
}

function parseCommand(command) {
  const input = String(command || '').trim();
  if (!input) throw new Error('Shell agent executor requires a command.');

  const args = [];
  let current = '';
  let quote = null;
  let escaping = false;

  for (const char of input) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }
    if (char === '\\') {
      escaping = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = null;
      else current += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      if (current) {
        args.push(current);
        current = '';
      }
      continue;
    }
    current += char;
  }

  if (escaping) current += '\\';
  if (quote) throw new Error('Unterminated quote in shell agent command.');
  if (current) args.push(current);
  if (args.length === 0) throw new Error('Shell agent executor requires a command.');
  return { bin: args[0], args: args.slice(1) };
}

class ShellAgentExecutor extends AgentExecutor {
  constructor(options = {}) {
    super();
    this.command = options.command || process.env.STDD_AGENT_COMMAND;
    this.cwd = options.cwd || process.cwd();
    this.allowUnsafe = Boolean(options.allowUnsafe || process.env.STDD_ALLOW_UNSAFE_SHELL_EXECUTOR === '1');
    this.allowedBins = new Set([
      ...DEFAULT_ALLOWED_BINS,
      ...splitList(options.allowedBins),
      ...splitList(process.env.STDD_AGENT_ALLOWED_BINS),
    ]);
  }

  isAllowedBin(bin) {
    if (this.allowUnsafe) return true;
    return this.allowedBins.has(bin) || this.allowedBins.has(basename(bin));
  }

  _ensureAuditDir() {
    const dir = path.join(this.cwd, 'stdd', 'logs');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  _writeAudit(event) {
    try {
      const dir = this._ensureAuditDir();
      const file = path.join(dir, 'shell-executor-audit.jsonl');
      fs.appendFileSync(file, JSON.stringify(event) + '\n', 'utf8');
    } catch (_) {
      // audit failure must not break execution
    }
  }

  async run(request = {}) {
    if (!this.command) {
      throw new Error('Shell agent executor requires --command or STDD_AGENT_COMMAND.');
    }

    const payload = JSON.stringify(request);
    const parsed = parseCommand(this.command);
    const allowed = this.isAllowedBin(parsed.bin);
    if (!allowed) {
      const err = new Error(`Shell agent executor rejected '${parsed.bin}'. Set STDD_AGENT_ALLOWED_BINS or pass --allow-unsafe-shell-executor to permit it.`);
      this._writeAudit({
        ts: new Date().toISOString(),
        bin: parsed.bin,
        argsHash: parsed.args.join(' ').slice(0, 200),
        cwd: this.cwd,
        allowUnsafe: this.allowUnsafe,
        allowlisted: false,
        status: 'blocked',
        role: request.role,
        goal: String(request.goal || '').slice(0, 256),
      });
      throw err;
    }

    const startedAt = Date.now();
    let result;
    try {
      result = spawnSync(parsed.bin, parsed.args, {
        cwd: this.cwd,
        input: payload,
        encoding: 'utf8',
        shell: false,
        timeout: Number(request.timeout || 120000),
      });
    } catch (spawnErr) {
      this._writeAudit({
        ts: new Date().toISOString(),
        bin: parsed.bin,
        argsHash: parsed.args.join(' ').slice(0, 200),
        cwd: this.cwd,
        allowUnsafe: this.allowUnsafe,
        allowlisted: true,
        status: 'spawn-error',
        error: String(spawnErr.message).slice(0, 256),
        elapsedMs: Date.now() - startedAt,
        role: request.role,
        goal: String(request.goal || '').slice(0, 256),
      });
      throw spawnErr;
    }

    const status = result.status === 0 ? 'success' : 'fail';
    this._writeAudit({
      ts: new Date().toISOString(),
      bin: parsed.bin,
      argsHash: parsed.args.join(' ').slice(0, 200),
      cwd: this.cwd,
      allowUnsafe: this.allowUnsafe,
      allowlisted: true,
      status,
      exitCode: result.status,
      elapsedMs: Date.now() - startedAt,
      stderrTail: String(result.stderr || '').slice(-200),
      role: request.role,
      goal: String(request.goal || '').slice(0, 256),
    });

    return {
      status: status,
      adapter: 'shell',
      command: this.command,
      exitCode: result.status,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      output: (result.stdout || result.stderr || '').trim(),
    };
  }
}

module.exports = { ShellAgentExecutor, parseCommand };
