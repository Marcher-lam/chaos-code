const fs = require('fs');
const path = require('path');

class AgentSessionTrace {
  constructor(cwd = process.cwd(), options = {}) {
    this.cwd = cwd;
    this.sessionId = options.sessionId || new Date().toISOString().replace(/[:.]/g, '-');
    this.traceDir = options.traceDir || path.join(cwd, 'stdd', 'agent', 'sessions');
    this.tracePath = path.join(this.traceDir, `${this.sessionId}.jsonl`);
  }

  ensureDir() {
    fs.mkdirSync(this.traceDir, { recursive: true });
  }

  append(type, payload = {}) {
    this.ensureDir();
    const event = {
      schemaVersion: 1,
      ts: new Date().toISOString(),
      sessionId: this.sessionId,
      type,
      payload,
    };
    fs.appendFileSync(this.tracePath, JSON.stringify(event) + '\n', 'utf8');
    return event;
  }

  read() {
    if (!fs.existsSync(this.tracePath)) return [];
    return fs.readFileSync(this.tracePath, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line));
  }
}

module.exports = { AgentSessionTrace };
