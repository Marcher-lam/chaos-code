/**
 * Evidence Ledger
 * Append-only JSONL evidence ledger for full audit trail.
 * Every requirement confirmation, spec generation, test run, mutation test,
 * quality gate, code change, and archive action is recorded.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createLogger } = require('./logger');
const logger = createLogger('evidence-ledger');

const EVENT_TYPES = [
  'requirement_confirmed',
  'spec_generated',
  'task_planned',
  'test_failed',
  'test_passed',
  'mutation_run',
  'quality_gate_passed',
  'quality_gate_failed',
  'code_changed',
  'review_completed',
  'archive_created',
  'exception_approved',
  'phase_started',
  'phase_completed',
  'agent_handoff',
  'workflow_started',
  'workflow_completed',
  'artifact_created',
  'artifact_modified',
  'artifact_archived',
  'constitution_check',
  'coverage_measured',
  'security_scan',
  'release_signed',
];

const LEDGER_FILENAME = 'evidence-ledger.jsonl';
const MAX_LEDGER_SIZE = 50 * 1024 * 1024;

function generateEventId() {
  const ts = Date.now();
  const rand = crypto.randomBytes(4).toString('hex');
  return `evt_${ts}_${rand}`;
}

class EvidenceLedger {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.evidenceDir = path.join(cwd, 'stdd', 'evidence');
    this.ledgerPath = path.join(this.evidenceDir, LEDGER_FILENAME);
    this._buffer = [];
    this._flushInterval = null;
  }

  _ensureDir() {
    if (!fs.existsSync(this.evidenceDir)) {
      fs.mkdirSync(this.evidenceDir, { recursive: true });
    }
  }

  _rotateIfNeeded() {
    if (!fs.existsSync(this.ledgerPath)) return;
    try {
      const stat = fs.statSync(this.ledgerPath);
      if (stat.size > MAX_LEDGER_SIZE) {
        const backupPath = this.ledgerPath.replace('.jsonl', `-${Date.now()}.jsonl`);
        fs.renameSync(this.ledgerPath, backupPath);
        logger.info(`Evidence ledger rotated to ${path.basename(backupPath)}`);
      }
    } catch (e) {
      // best effort
    }
  }

  record(event) {
    const traceId = event.trace_id || event.traceId || process.env.STDD_TRACE_ID || `trace_${crypto.randomBytes(8).toString('hex')}`;
    const spanId = event.span_id || event.spanId || `span_${crypto.randomBytes(8).toString('hex')}`;
    const entry = {
      event_id: generateEventId(),
      timestamp: new Date().toISOString(),
      trace_id: traceId,
      span_id: spanId,
      ...event,
      type: event.type || 'unknown',
    };

    if (event.requirement_id) entry.requirement_id = event.requirement_id;
    if (event.spec_id) entry.spec_id = event.spec_id;
    if (event.task_id) entry.task_id = event.task_id;
    if (event.change_name) entry.change_name = event.change_name;
    if (event.agent_id) entry.agent_id = event.agent_id;
    if (event.workflow_id) entry.workflow_id = event.workflow_id;
    if (event.phase) entry.phase = event.phase;

    if (event.status) entry.status = event.status;
    if (event.command) entry.command = event.command;
    if (event.duration_ms) entry.duration_ms = event.duration_ms;

    if (event.coverage) entry.coverage = event.coverage;
    if (event.mutation_score) entry.mutation_score = event.mutation_score;
    if (event.artifacts) entry.artifacts = event.artifacts;
    if (event.metadata) entry.metadata = event.metadata;

    this._buffer.push(entry);

    if (this._buffer.length >= 10) {
      this.flush();
    }

    return entry;
  }

  flush() {
    if (this._buffer.length === 0) return;
    this._ensureDir();
    this._rotateIfNeeded();

    const lines = this._buffer.map(e => JSON.stringify(e)).join('\n') + '\n';
    try {
      fs.appendFileSync(this.ledgerPath, lines, 'utf8');
      this._buffer = [];
    } catch (e) {
      logger.warn(`Failed to flush evidence ledger: ${e.message}`);
    }
  }

  readAll(options = {}) {
    if (!fs.existsSync(this.ledgerPath)) return [];

    const content = fs.readFileSync(this.ledgerPath, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    let entries = [];

    for (const line of lines) {
      try {
        entries.push(JSON.parse(line));
      } catch (e) {
        // skip malformed lines
      }
    }

    if (options.type) {
      entries = entries.filter(e => e.type === options.type);
    }
    if (options.change_name) {
      entries = entries.filter(e => e.change_name === options.change_name);
    }
    if (options.phase) {
      entries = entries.filter(e => e.phase === options.phase);
    }
    if (options.status) {
      entries = entries.filter(e => e.status === options.status);
    }
    if (options.since) {
      entries = entries.filter(e => new Date(e.timestamp) >= new Date(options.since));
    }
    if (options.limit) {
      entries = entries.slice(-options.limit);
    }

    return entries;
  }

  getTimeline(changeName) {
    const entries = this.readAll({ change_name: changeName });
    return entries.map(e => ({
      time: e.timestamp,
      type: e.type,
      status: e.status || '',
      phase: e.phase || '',
      agent: e.agent_id || '',
      summary: this._summarizeEvent(e),
    }));
  }

  _summarizeEvent(entry) {
    switch (entry.type) {
      case 'requirement_confirmed':
        return `Requirement confirmed${entry.requirement_id ? ` (${entry.requirement_id})` : ''}`;
      case 'spec_generated':
        return `Spec generated${entry.spec_id ? ` (${entry.spec_id})` : ''}`;
      case 'task_planned':
        return `Task planned${entry.task_id ? ` (${entry.task_id})` : ''}`;
      case 'test_passed':
        return `Test passed${entry.command ? `: ${entry.command}` : ''}`;
      case 'test_failed':
        return `Test failed${entry.command ? `: ${entry.command}` : ''}`;
      case 'mutation_run':
        return `Mutation test (score: ${entry.mutation_score || 'N/A'})`;
      case 'quality_gate_passed':
        return `Quality gate passed${entry.metadata?.gate_name ? `: ${entry.metadata.gate_name}` : ''}`;
      case 'quality_gate_failed':
        return `Quality gate FAILED${entry.metadata?.gate_name ? `: ${entry.metadata.gate_name}` : ''}`;
      case 'code_changed':
        return `Code changed${entry.metadata?.files ? `: ${entry.metadata.files.length} files` : ''}`;
      case 'review_completed':
        return `Review completed${entry.agent_id ? ` by ${entry.agent_id}` : ''}`;
      case 'archive_created':
        return `Change archived`;
      case 'phase_started':
        return `Phase started: ${entry.phase || ''}`;
      case 'phase_completed':
        return `Phase completed: ${entry.phase || ''}`;
      case 'agent_handoff':
        return `Handoff: ${entry.metadata?.from || ''} → ${entry.metadata?.to || ''}`;
      case 'artifact_created':
        return `Artifact created: ${entry.metadata?.artifact_id || ''}`;
      case 'constitution_check':
        return `Constitution check: ${entry.status || ''}`;
      case 'coverage_measured':
        return `Coverage: ${entry.coverage?.statements || 'N/A'}% stmts`;
      case 'security_scan':
        return `Security scan: ${entry.status || ''}`;
      default:
        return `${entry.type} ${entry.status || ''}`;
    }
  }

  getStats() {
    const entries = this.readAll();
    const stats = {
      total: entries.length,
      byType: {},
      byStatus: {},
      byPhase: {},
      firstEvent: null,
      lastEvent: null,
    };

    for (const e of entries) {
      stats.byType[e.type] = (stats.byType[e.type] || 0) + 1;
      if (e.status) stats.byStatus[e.status] = (stats.byStatus[e.status] || 0) + 1;
      if (e.phase) stats.byPhase[e.phase] = (stats.byPhase[e.phase] || 0) + 1;
    }

    if (entries.length > 0) {
      stats.firstEvent = entries[0].timestamp;
      stats.lastEvent = entries[entries.length - 1].timestamp;
    }

    return stats;
  }

  renderTimeline(changeName) {
    const entries = this.getTimeline(changeName);
    if (entries.length === 0) {
      return '\nNo evidence records found.\n';
    }

    const lines = ['\nEvidence Timeline\n'];
    for (const e of entries) {
      const ts = e.time.replace('T', ' ').replace(/\.\d+Z$/, '');
      const icon = e.status === 'passed' || e.status === 'completed' || e.status === 'created'
        ? '✓'
        : e.status === 'failed' ? '✗'
        : '·';
      lines.push(`  ${icon} ${ts}  ${e.type.padEnd(24)} ${e.summary}`);
    }
    lines.push(`\n  Total: ${entries.length} events\n`);
    return lines.join('\n');
  }

  startAutoFlush(intervalMs = 5000) {
    this.stopAutoFlush();
    this._flushInterval = setInterval(() => this.flush(), intervalMs);
    if (this._flushInterval.unref) this._flushInterval.unref();
  }

  stopAutoFlush() {
    if (this._flushInterval) {
      clearInterval(this._flushInterval);
      this._flushInterval = null;
    }
    this.flush();
  }

  clear() {
    this._buffer = [];
    if (fs.existsSync(this.ledgerPath)) {
      fs.unlinkSync(this.ledgerPath);
    }
  }
}

function createLedger(cwd) {
  return new EvidenceLedger(cwd);
}

module.exports = { EvidenceLedger, EVENT_TYPES, LEDGER_FILENAME, createLedger };
