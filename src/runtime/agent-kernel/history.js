const fs = require('fs');
const path = require('path');

class AgentHistoryStore {
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.runsDir = options.runsDir || path.join(this.cwd, 'stdd', 'agent', 'runs');
  }

  list() {
    if (!fs.existsSync(this.runsDir)) return [];
    return fs.readdirSync(this.runsDir)
      .filter(file => file.endsWith('.json'))
      .map(file => this.safeRead(path.join(this.runsDir, file)))
      .filter(Boolean)
      .sort((a, b) => String(b.generatedAt || '').localeCompare(String(a.generatedAt || '')))
      .map(report => ({
        runId: report.runId,
        generatedAt: report.generatedAt,
        mode: report.mode,
        status: report.status,
        summary: report.summary,
        next: report.next,
      }));
  }

  show(runId) {
    const report = this.findReport(runId);
    if (!report) throw new Error(`Run report not found: ${runId}`);
    return report;
  }

  resume(runId) {
    const report = this.show(runId);
    const result = report.result || {};
    const fixPacket = result.fixPacket || result.repair?.fixPacket || null;
    const prompt = fixPacket && fixPacket.output ? fixPacket.output.markdown || fixPacket.output.json : null;
    const suggestedCommand = buildSuggestedCommand(report, prompt);
    return {
      runId: report.runId,
      status: report.status,
      mode: report.mode,
      generatedAt: report.generatedAt,
      prompt,
      fixPacketEmbedded: Boolean(fixPacket && !fixPacket.output),
      next: report.next,
      suggestedCommand,
      summary: report.summary,
    };
  }

  findReport(runId) {
    if (!runId) return null;
    const exact = path.join(this.runsDir, `${runId}.json`);
    if (fs.existsSync(exact)) return this.safeRead(exact);
    return this.listAll().find(report => report.runId === runId || String(report.runId || '').startsWith(runId)) || null;
  }

  listAll() {
    if (!fs.existsSync(this.runsDir)) return [];
    return fs.readdirSync(this.runsDir)
      .filter(file => file.endsWith('.json'))
      .map(file => this.safeRead(path.join(this.runsDir, file)))
      .filter(Boolean);
  }

  safeRead(filePath) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (_) {
      return null;
    }
  }
}

function buildSuggestedCommand(report, prompt) {
  if (report.status === 'pass') return 'Review git diff and commit when ready.';
  if (prompt) return `stdd agent --llm-repair --prompt ${prompt} --output repair.diff --test-command "npm test" --write-report --json`;
  return 'stdd agent --fix-packet --write-prompt --json';
}

module.exports = { AgentHistoryStore, buildSuggestedCommand };
