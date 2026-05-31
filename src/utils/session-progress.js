/**
 * SessionProgress — Real-time progress recording for STDD commands.
 *
 * Writes JSONL to stdd/progress.jsonl and records normal completion,
 * non-zero exits, SIGINT, and SIGTERM for active commands.
 * All methods are silent no-ops if stdd/ is not initialized.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createLogger } = require('./logger');
const logger = createLogger('session-progress');

const FILENAME = 'progress.jsonl';
const MAX_ENTRIES = 5000;

class SessionProgress {
  constructor(stddDir) {
    this.stddDir = stddDir;
    this.filePath = stddDir ? path.join(stddDir, FILENAME) : null;
    this._active = stddDir && fs.existsSync(stddDir);
  }

  _append(entry) {
    if (!this._active) return;
    try { fs.appendFileSync(this.filePath, JSON.stringify(entry) + '\n', 'utf8'); }
    catch { /* never block the main flow */ }
  }

  start(command, args = {}) {
    const traceId = process.env.STDD_TRACE_ID || `trace_${crypto.randomBytes(8).toString('hex')}`;
    const spanId = `span_${crypto.randomBytes(8).toString('hex')}`;
    const entry = {
      id: `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      ts: new Date().toISOString(),
      ev: 'start',
      cmd: command,
      args,
      pid: process.pid,
      traceId,
      spanId,
    };
    this._append(entry);
    return entry;
  }

  complete(id, extra = {}) {
    this._append({ id, ts: new Date().toISOString(), ev: 'complete', ...extra });
  }

  fail(id, error) {
    this._append({
      id, ts: new Date().toISOString(), ev: 'fail',
      err: typeof error === 'string' ? error : (error && error.message) || String(error),
    });
  }

  interrupt(id, signal) {
    this._append({ id, ts: new Date().toISOString(), ev: 'interrupt', sig: signal });
  }

  checkpoint(id, data = {}) {
    this._append({ id, ts: new Date().toISOString(), ev: 'cp', ...data });
  }

  readAll() {
    if (!this._active || !fs.existsSync(this.filePath)) return [];
    try {
      return fs.readFileSync(this.filePath, 'utf8').trim().split('\n')
        .filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } })
        .filter(Boolean);
    } catch { return []; }
  }

  readLast(n = 20) { return this.readAll().slice(-n); }

  findLastIncomplete() {
    const entries = this.readAll();
    const done = new Set();
    for (let i = entries.length - 1; i >= 0; i--) {
      const e = entries[i];
      if (e.ev === 'complete' || e.ev === 'fail' || e.ev === 'interrupt') done.add(e.id);
      else if (e.ev === 'start' && !done.has(e.id)) return e;
    }
    return null;
  }

  getResumeContext() {
    const inc = this.findLastIncomplete();
    if (!inc) return null;
    const entries = this.readAll();
    const cps = entries.filter(e => e.id === inc.id && e.ev === 'cp');
    const fail = entries.find(e => e.id === inc.id && e.ev === 'fail');
    return { start: inc, checkpoints: cps, failed: !!fail, failureDetail: fail || null };
  }

  summary() {
    const entries = this.readAll();
    const starts = entries.filter(e => e.ev === 'start');
    const completes = entries.filter(e => e.ev === 'complete');
    const fails = entries.filter(e => e.ev === 'fail');
    const interrupts = entries.filter(e => e.ev === 'interrupt');
    const doneIds = new Set(entries.filter(e => e.ev !== 'start').map(e => e.id));
    const incomplete = starts.filter(s => !doneIds.has(s.id));
    return {
      total: starts.length, completed: completes.length, failed: fails.length,
      interrupted: interrupts.length, incomplete: incomplete.length,
      lastActivity: entries.length ? entries[entries.length - 1].ts : null,
    };
  }

  clear() {
    if (this._active && fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, '', 'utf8');
    }
  }

  truncate() {
    const entries = this.readAll();
    if (entries.length <= MAX_ENTRIES) return;
    try {
      fs.writeFileSync(this.filePath, entries.slice(-MAX_ENTRIES).map(e => JSON.stringify(e)).join('\n') + '\n', 'utf8');
    } catch (err) { logger.warn('Failed to truncate progress file: %s', err.message); }
  }
}

// Singleton helpers — safe to call from anywhere
let _activeEntry = null;
let _instance = null;

function progress(cwd) {
  const dir = cwd ? path.join(cwd, 'stdd') : path.join(process.cwd(), 'stdd');
  if (!_instance || _instance.stddDir !== dir) _instance = new SessionProgress(dir);
  return _instance;
}

function active() { return _activeEntry; }
function setActive(e) { _activeEntry = e; }
function clearActive() { _activeEntry = null; }

function installSignals() {
  const mark = (sig, exitCode) => {
    if (_activeEntry) {
      try { progress().interrupt(_activeEntry.id, sig); } catch { /* best effort */ }
    }
    process.exit(exitCode);
  };
  process.on('SIGINT', () => { mark('SIGINT', 130); });
  process.on('SIGTERM', () => { mark('SIGTERM', 143); });
}

module.exports = { SessionProgress, progress, active, setActive, clearActive, installSignals, FILENAME };
