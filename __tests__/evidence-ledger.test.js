const fs = require('fs');
const os = require('os');
const path = require('path');
const { EvidenceLedger } = require('../src/utils/evidence-ledger');

describe('EvidenceLedger', () => {
  let tempDirs = [];

  function createProject() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-ledger-test-'));
    tempDirs.push(root);
    fs.mkdirSync(path.join(root, 'stdd'), { recursive: true });
    return root;
  }

  afterAll(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('preserves event type for filtering and timeline summaries', () => {
    const project = createProject();
    const ledger = new EvidenceLedger(project);

    const entry = ledger.record({
      type: 'spec_generated',
      status: 'completed',
      change_name: 'demo',
      spec_id: 'SPEC-001'
    });
    ledger.flush();

    expect(entry.type).toBe('spec_generated');

    const filtered = ledger.readAll({ type: 'spec_generated' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].type).toBe('spec_generated');

    const timeline = ledger.getTimeline('demo');
    expect(timeline).toHaveLength(1);
    expect(timeline[0].type).toBe('spec_generated');
    expect(timeline[0].summary).toContain('Spec generated');
  });
});
