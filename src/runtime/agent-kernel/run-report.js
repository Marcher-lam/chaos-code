const fs = require('fs');
const path = require('path');

class RunReportWriter {
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.trace = options.trace || null;
  }

  write(result, options = {}) {
    const dir = options.outputDir || path.join(this.cwd, 'stdd', 'agent', 'runs');
    fs.mkdirSync(dir, { recursive: true });
    const runId = options.runId || `${sanitize(result.mode || result.tool || 'agent')}-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    const payload = {
      schemaVersion: 1,
      type: 'agent-run-report',
      runId,
      generatedAt: new Date().toISOString(),
      status: result.status || 'unknown',
      mode: result.mode || result.tool || 'agent',
      summary: result.summary || null,
      result,
      next: suggestNext(result),
    };
    const jsonPath = path.join(dir, `${runId}.json`);
    const mdPath = path.join(dir, `${runId}.md`);
    fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), 'utf8');
    fs.writeFileSync(mdPath, toMarkdown(payload), 'utf8');
    const output = {
      runId,
      json: path.relative(this.cwd, jsonPath).replace(/\\/g, '/'),
      markdown: path.relative(this.cwd, mdPath).replace(/\\/g, '/'),
    };
    if (this.trace && typeof this.trace.append === 'function') {
      this.trace.append('run-report.written', output);
    }
    return output;
  }
}

function sanitize(value) {
  return String(value || 'agent').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'agent';
}

function suggestNext(result) {
  if (result.status === 'pass') return 'Review git diff and commit when ready.';
  if (result.fixPacket && result.fixPacket.output) return `Use ${result.fixPacket.output.markdown || result.fixPacket.output.json} to request a repair diff.`;
  if (result.fixPacket) return 'Generate a repair diff from the embedded fixPacket, then run stdd agent --repair --patch-file <diff>.';
  return 'Inspect the report and rerun with --fix-packet or --write-prompt if repair context is needed.';
}

function toMarkdown(report) {
  const lines = [
    `# Agent Run Report: ${report.runId}`,
    '',
    `Generated: ${report.generatedAt}`,
    `Mode: ${report.mode}`,
    `Status: ${report.status}`,
    '',
  ];
  if (report.summary) {
    lines.push('## Summary', '', '```json', JSON.stringify(report.summary, null, 2), '```', '');
  }
  lines.push('## Next Suggested Action', '', report.next, '');
  lines.push('## Full Result', '', '```json', JSON.stringify(report.result, null, 2), '```', '');
  return lines.join('\n');
}

module.exports = { RunReportWriter, suggestNext, toMarkdown };
