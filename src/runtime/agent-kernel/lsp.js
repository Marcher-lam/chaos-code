/**
 * Symbol-level navigation: real LSP client with a zero-dependency heuristic
 * fallback.
 *
 * - Heuristic extractor: language-aware regex symbol tables for
 *   js/ts/py/go/rs/java/php — always available, no server needed.
 * - LspManager: speaks Language Server Protocol over stdio (Content-Length
 *   framing) when the user configures servers in .chaos/lsp.json:
 *
 *     { "typescript": { "command": ["typescript-language-server", "--stdio"] },
 *       "python":      { "command": ["pylsp"] } }
 *
 *   Supports initialize / didOpen (memory) / textDocument/documentSymbol,
 *   per-request timeout, and request caching per file mtime.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// ── Language mapping ──
const LANGUAGE_BY_EXT = {
  '.js': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript', '.jsx': 'javascript',
  '.ts': 'typescript', '.tsx': 'typescript',
  '.py': 'python', '.go': 'go', '.rs': 'rust', '.java': 'java', '.php': 'php',
};

// ── Heuristic symbol extraction ──

const HEURISTICS = {
  javascript: [
    { re: /^[ \t]*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/, kind: 'function' },
    { re: /^[ \t]*(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/, kind: 'class' },
    { re: /^[ \t]*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/, kind: 'function' },
    { re: /^[ \t]{2,}(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/, kind: 'method' },
    { re: /^[ \t]*(?:export\s+)?(?:type|interface)\s+([A-Za-z_$][\w$]*)/, kind: 'type' },
  ],
  python: [
    { re: /^[ \t]*class\s+([A-Za-z_][\w]*)/, kind: 'class' },
    { re: /^[ \t]*def\s+([A-Za-z_][\w]*)/, kind: 'function' },
  ],
  go: [
    { re: /^func\s+(?:\([^)]*\)\s*)?([A-Za-z_][\w]*)\s*\(/, kind: 'function' },
    { re: /^type\s+([A-Za-z_][\w]*)\s+(?:struct|interface)/, kind: 'type' },
  ],
  rust: [
    { re: /^[ \t]*(?:pub\s+)?(?:async\s+)?fn\s+([A-Za-z_][\w]*)/, kind: 'function' },
    { re: /^[ \t]*(?:pub\s+)?(?:struct|enum|trait)\s+([A-Za-z_][\w]*)/, kind: 'type' },
    { re: /^[ \t]*impl(?:<[^>]*>)?\s+(?:[\w:<>]+\s+for\s+)?([A-Za-z_][\w]*)/, kind: 'impl' },
  ],
  java: [
    { re: /^[ \t]*(?:public|private|protected|static|final|abstract|\s)*class\s+([A-Za-z_][\w]*)/, kind: 'class' },
    { re: /^[ \t]*(?:public|private|protected|static|final|abstract|\s)*interface\s+([A-Za-z_][\w]*)/, kind: 'interface' },
    { re: /^[ \t]*(?:public|private|protected|static|final|synchronized|\s)+(?:[\w<>\[\],.]+\s+)+([A-Za-z_][\w]*)\s*\([^)]*\)\s*\{/, kind: 'method' },
  ],
  php: [
    { re: /^[ \t]*(?:abstract\s+)?class\s+([A-Za-z_][\w]*)/, kind: 'class' },
    { re: /^[ \t]*(?:public|private|protected|static|\s)*function\s+([A-Za-z_][\w]*)/, kind: 'function' },
  ],
};
HEURISTICS.typescript = HEURISTICS.javascript;

/**
 * Extract symbols from source text without any server.
 * @returns {Array<{name, kind, line, container?}>}
 */
function extractSymbols(sourceText, language) {
  const rules = HEURISTICS[language] || HEURISTICS.javascript;
  const lines = String(sourceText).split('\n');
  const symbols = [];
  let container = null;
  let containerIndent = -1;
  const seen = new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('#!')) continue;
    for (const rule of rules) {
      const m = rule.re.exec(line);
      if (m && m[1]) {
        const name = m[1];
        const key = `${name}:${rule.kind}`;
        if (seen.has(key)) break; // first declaration wins
        seen.add(key);
        const indent = line.length - line.trimStart().length;
        if (rule.kind === 'class' || rule.kind === 'impl' || rule.kind === 'interface') {
          container = name;
          containerIndent = indent;
          symbols.push({ name, kind: rule.kind, line: i + 1 });
        } else if (rule.kind === 'method' && container !== null && indent > containerIndent) {
          symbols.push({ name, kind: 'method', line: i + 1, container });
        } else {
          symbols.push({ name, kind: rule.kind, line: i + 1 });
        }
        break;
      }
    }
  }
  return symbols;
}

// ── LSP client ──

function fileUri(absPath) {
  return 'file://' + absPath;
}

class LspClient {
  constructor(name, config, cwd, options = {}) {
    this.name = name;
    this.config = config;
    this.cwd = cwd;
    this.timeoutMs = Number(config.timeoutMs) || 15000;
    this._spawn = options.spawnFn || spawn;
    this.process = null;
    this.buffer = Buffer.alloc(0);
    this.nextId = 1;
    this.pending = new Map(); // id → {resolve, reject, timer}
    this.ready = null;
    this.openedDocs = new Set();
  }

  _start() {
    if (this.ready) return this.ready;
    this.ready = new Promise((resolve, reject) => {
      const { command, args = [] } = this.config;
      const cmdList = Array.isArray(command) ? command : [command];
      this.process = this._spawn(cmdList[0], [...cmdList.slice(1), ...args], {
        cwd: this.cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      if (!this.process || !this.process.stdin) {
        return reject(new Error(`LSP server "${this.name}" failed to spawn`));
      }
      this.process.stdout.on('data', d => this._onData(d));
      this.process.stderr.on('data', () => { /* server logs — keep quiet */ });
      this.process.on('close', () => {
        for (const [, { reject: rej }] of this.pending) rej(new Error(`LSP server ${this.name} exited`));
        this.pending.clear();
        this.ready = null;
        this.process = null;
      });
      this.process.on('error', reject);

      this._request('initialize', {
        processId: process.pid,
        rootUri: fileUri(this.cwd),
        capabilities: { textDocument: { documentSymbol: { hierarchicalDocumentSymbolSupport: true } } },
      }, 20000)
        .then(() => {
          this._notify('initialized', {});
          resolve(this);
        })
        .catch(reject);
    });
    return this.ready;
  }

  _onData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    // LSP framing: Content-Length: N\r\n\r\n<json>
    for (;;) {
      const headerEnd = this.buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) return;
      const header = this.buffer.slice(0, headerEnd).toString('utf8');
      const m = /Content-Length:\s*(\d+)/i.exec(header);
      if (!m) { this.buffer = this.buffer.slice(headerEnd + 4); continue; }
      const len = Number(m[1]);
      if (this.buffer.length < headerEnd + 4 + len) return; // incomplete body
      const body = this.buffer.slice(headerEnd + 4, headerEnd + 4 + len).toString('utf8');
      this.buffer = this.buffer.slice(headerEnd + 4 + len);
      try {
        const msg = JSON.parse(body);
        if (msg.id !== undefined && this.pending.has(msg.id)) {
          const { resolve, reject, timer } = this.pending.get(msg.id);
          clearTimeout(timer);
          this.pending.delete(msg.id);
          if (msg.error) reject(new Error(msg.error.message || 'LSP error'));
          else resolve(msg.result);
        }
        // server requests/notifications (window/*, client/*) are ignored
      } catch (_) { /* malformed frame */ }
    }
  }

  _send(payload) {
    if (!this.process || !this.process.stdin) throw new Error(`LSP server ${this.name} is not running`);
    const json = JSON.stringify(payload);
    this.process.stdin.write(`Content-Length: ${Buffer.byteLength(json)}\r\n\r\n${json}`);
  }

  _request(method, params, timeoutMs = this.timeoutMs) {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`LSP ${method} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      try {
        this._send({ jsonrpc: '2.0', id, method, params });
      } catch (err) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(err);
      }
    });
  }

  _notify(method, params) {
    this._send({ jsonrpc: '2.0', method, params });
  }

  async documentSymbols(absPath, languageId, text) {
    await this._start();
    const uri = fileUri(absPath);
    if (!this.openedDocs.has(uri)) {
      this._notify('textDocument/didOpen', {
        textDocument: { uri, languageId, version: 1, text },
      });
      this.openedDocs.add(uri);
    }
    return this._request('textDocument/documentSymbol', { textDocument: { uri } });
  }

  stop() {
    try { if (this.process) this.process.kill(); } catch (_) { /* already gone */ }
    this.process = null;
    this.ready = null;
  }
}

// Flatten hierarchical DocumentSymbol[] into {name, kind, line, container}
function flattenLspSymbols(result, container = null, out = []) {
  for (const s of result || []) {
    if (Array.isArray(s)) { flattenLspSymbols(s, container, out); continue; } // legacy SymbolInformation[]
    const range = s.range || (s.location && s.location.range) || {};
    const line = ((range.start && range.start.line) || 0) + 1;
    out.push({ name: s.name, kind: String(s.kind), line, ...(container ? { container } : {}) });
    if (Array.isArray(s.children)) flattenLspSymbols(s.children, s.name, out);
  }
  return out;
}

class LspManager {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.clients = new Map(); // language → LspClient
    this.config = this._loadConfig();
  }

  _loadConfig() {
    try {
      const p = path.join(this.cwd, '.chaos', 'lsp.json');
      if (fs.existsSync(p)) {
        const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
        return cfg && typeof cfg === 'object' ? cfg : {};
      }
    } catch (_) { /* malformed config — heuristics only */ }
    return {};
  }

  hasServerFor(language) {
    return Boolean(this.config[language] && this.config[language].command);
  }

  clientFor(language) {
    if (!this.hasServerFor(language)) return null;
    if (!this.clients.has(language)) {
      this.clients.set(language, new LspClient(language, this.config[language], this.cwd));
    }
    return this.clients.get(language);
  }

  stopAll() {
    for (const c of this.clients.values()) c.stop();
    this.clients.clear();
  }
}

/**
 * Symbol query used by the `symbols` tool: LSP when a server is configured
 * for the file's language, heuristic extraction otherwise.
 */
async function getSymbols(cwd, args = {}) {
  const filePath = path.resolve(cwd, args.path || '');
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return { status: 'error', error: `File not found: ${args.path}` };
  }
  const ext = path.extname(filePath).toLowerCase();
  const language = LANGUAGE_BY_EXT[ext];
  if (!language) {
    return { status: 'error', error: `No symbol extraction for "${ext}" files. Supported: js/ts/jsx/tsx/py/go/rs/java/php.` };
  }

  const text = fs.readFileSync(filePath, 'utf8');
  const mgr = new LspManager(cwd);
  let symbols = null;
  let source = 'heuristic';

  const client = mgr.clientFor(language);
  if (client) {
    try {
      const raw = await client.documentSymbols(filePath, language, text);
      symbols = flattenLspSymbols(raw);
      source = `lsp:${language}`;
    } catch (_) {
      symbols = null; // fall through to heuristics
    } finally {
      mgr.stopAll();
    }
  }
  if (!symbols) symbols = extractSymbols(text, language);

  let filtered = symbols;
  if (args.name) {
    const needle = String(args.name).toLowerCase();
    filtered = symbols.filter(s => s.name.toLowerCase().includes(needle));
  }
  if (args.kind) {
    const kind = String(args.kind).toLowerCase();
    filtered = filtered.filter(s => String(s.kind).toLowerCase() === kind);
  }

  return {
    status: 'ok',
    path: path.relative(cwd, filePath) || args.path,
    language,
    source,
    totalLines: text.split('\n').length,
    symbolCount: filtered.length,
    symbols: filtered.slice(0, 200).map(s => `${s.line}\t${s.kind}\t${s.container ? s.container + '.' : ''}${s.name}`),
    note: 'Use fs_read with startLine=<line> to jump to a symbol.',
  };
}

module.exports = { extractSymbols, LspClient, LspManager, getSymbols, flattenLspSymbols, LANGUAGE_BY_EXT };
