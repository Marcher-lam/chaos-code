const fs = require('fs');
const path = require('path');
const os = require('os');
const { SessionProgress } = require('../src/utils/session-progress');
const { EvidenceLedger } = require('../src/utils/evidence-ledger');

function setup() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-trace-test-'));
  fs.mkdirSync(path.join(tmp, 'stdd'), { recursive: true });
  return tmp;
}

describe('Trace and Span Logging in SessionProgress and EvidenceLedger', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = setup();
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  });

  it('should generate traceId and spanId in SessionProgress start logs', () => {
    const progress = new SessionProgress(path.join(tmpDir, 'stdd'));
    const entry = progress.start('verify', { testOpt: true });

    expect(entry.traceId).toMatch(/^trace_[a-f0-9]+$/);
    expect(entry.spanId).toMatch(/^span_[a-f0-9]+$/);

    const logContent = fs.readFileSync(path.join(tmpDir, 'stdd', 'progress.jsonl'), 'utf8');
    const parsed = JSON.parse(logContent.trim());
    expect(parsed.traceId).toBe(entry.traceId);
    expect(parsed.spanId).toBe(entry.spanId);
  });

  it('should inherit traceId from process.env if available in SessionProgress', () => {
    const origTrace = process.env.STDD_TRACE_ID;
    process.env.STDD_TRACE_ID = 'trace_inherited_12345';

    const progress = new SessionProgress(path.join(tmpDir, 'stdd'));
    const entry = progress.start('apply');

    expect(entry.traceId).toBe('trace_inherited_12345');

    if (origTrace) process.env.STDD_TRACE_ID = origTrace;
    else delete process.env.STDD_TRACE_ID;
  });

  it('should record trace_id and span_id in EvidenceLedger entries', () => {
    const ledger = new EvidenceLedger(tmpDir);
    const event = {
      type: 'test_passed',
      command: 'npm run test',
      duration_ms: 1500
    };

    const entry = ledger.record(event);
    expect(entry.trace_id).toMatch(/^trace_[a-f0-9]+$/);
    expect(entry.span_id).toMatch(/^span_[a-f0-9]+$/);

    ledger.flush();

    const ledgerContent = fs.readFileSync(path.join(tmpDir, 'stdd', 'evidence', 'evidence-ledger.jsonl'), 'utf8');
    const parsed = JSON.parse(ledgerContent.trim());
    expect(parsed.trace_id).toBe(entry.trace_id);
    expect(parsed.span_id).toBe(entry.span_id);
  });

  it('should inherit trace_id from process.env in EvidenceLedger', () => {
    const origTrace = process.env.STDD_TRACE_ID;
    process.env.STDD_TRACE_ID = 'trace_ledger_inherited';

    const ledger = new EvidenceLedger(tmpDir);
    const entry = ledger.record({ type: 'quality_gate_passed' });

    expect(entry.trace_id).toBe('trace_ledger_inherited');

    if (origTrace) process.env.STDD_TRACE_ID = origTrace;
    else delete process.env.STDD_TRACE_ID;
  });
});
