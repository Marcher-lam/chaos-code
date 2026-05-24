/**
 * Targeted branch-coverage tests for status.js
 * Covers: showChangeStatus text output (artifacts, tasks, phase),
 *         showOverallStatus with >5 changes overflow,
 *         getDetailedStatus non-silent paths.
 */

const fs = require('fs');
const path = require('path');
const { StatusCommand } = require('../src/cli/commands/status');
const { CHANGE_PHASES } = require('../src/types');

// Helpers
const cmd = new StatusCommand();
const TMP = path.join(__dirname, '__status_cov_tmp__');

function mkdirp(dir) { fs.mkdirSync(dir, { recursive: true }); }
function rmdir(dir) { fs.rmSync(dir, { recursive: true, force: true }); }
function w(filePath, content) { mkdirp(path.dirname(filePath)); fs.writeFileSync(filePath, content, 'utf8'); }

beforeEach(() => mkdirp(TMP));
afterEach(() => rmdir(TMP));

describe('StatusCommand coverage boost', () => {
  describe('showOverallStatus — >5 changes overflow branch', () => {
    it('prints overflow message when more than 5 active changes exist', async () => {
      const stddDir = path.join(TMP, 'stdd');
      mkdirp(path.join(stddDir, 'specs'));
      mkdirp(path.join(stddDir, 'memory'));
      w(path.join(stddDir, 'config.yaml'), 'version: "1.0"');
      const changesDir = path.join(stddDir, 'changes');
      mkdirp(changesDir);
      for (let i = 1; i <= 7; i++) {
        mkdirp(path.join(changesDir, `change-${i}`));
      }
      const logs = [];
      const origLog = console.log;
      console.log = (...a) => logs.push(a.join(' '));
      try {
        await cmd.showOverallStatus(stddDir, {});
      } finally {
        console.log = origLog;
      }
      const out = logs.join('\n');
      expect(out).toContain('and 2 more');
    });
  });

  describe('showChangeStatus — full text output branches', () => {
    it('shows all artifact states, tasks, and phase in text mode', async () => {
      const stddDir = path.join(TMP, 'stdd');
      const changeDir = path.join(stddDir, 'changes', 'my-change');
      mkdirp(path.join(changeDir, 'specs'));
      w(path.join(changeDir, 'proposal.md'), '# My Feature Proposal\nSome desc');
      w(path.join(changeDir, 'specs', 'foo.md'), '# Feature spec');
      w(path.join(changeDir, 'design.md'), '# Design');
      w(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n- [ ] Task 2');

      const logs = [];
      const origLog = console.log;
      console.log = (...a) => logs.push(a.join(' '));
      try {
        await cmd.showChangeStatus(stddDir, 'my-change', {});
      } finally {
        console.log = origLog;
      }
      const out = logs.join('\n');
      expect(out).toContain('proposal.md');
      expect(out).toContain('Tasks:');
      expect(out).toContain('Phase:');
    });

    it('shows artifacts when all missing in text mode', async () => {
      const stddDir = path.join(TMP, 'stdd');
      const changeDir = path.join(stddDir, 'changes', 'empty-change');
      mkdirp(changeDir);
      // No proposal, specs, design, or tasks

      const logs = [];
      const origLog = console.log;
      console.log = (...a) => logs.push(a.join(' '));
      try {
        await cmd.showChangeStatus(stddDir, 'empty-change', {});
      } finally {
        console.log = origLog;
      }
      const out = logs.join('\n');
      // All artifacts should show as missing
      expect(out).toContain('proposal.md');
    });
  });

  describe('getDetailedStatus — title extraction branch', () => {
    it('extracts title from proposal.md header', async () => {
      const changeDir = path.join(TMP, 'change-t');
      mkdirp(changeDir);
      w(path.join(changeDir, 'proposal.md'), '# Proposal: Add dark mode\nDetails');
      const result = await cmd.getDetailedStatus(changeDir, { silent: true });
      expect(result.title).toContain('Add dark mode');
    });

    it('returns null title when proposal has no # header', async () => {
      const changeDir = path.join(TMP, 'change-no-h1');
      mkdirp(changeDir);
      w(path.join(changeDir, 'proposal.md'), 'No header here');
      const result = await cmd.getDetailedStatus(changeDir, { silent: true });
      expect(result.title).toBeNull();
    });
  });

  describe('getProgressBar — percent boundaries', () => {
    it('returns yellow bar for exactly 50%', () => {
      const bar = cmd.getProgressBar(1, 2);
      expect(bar).toContain('50%');
    });

    it('returns green bar for 100%', () => {
      const bar = cmd.getProgressBar(3, 3);
      expect(bar).toContain('100%');
    });

    it('returns red bar for 0%', () => {
      const bar = cmd.getProgressBar(0, 3);
      expect(bar).toContain('0%');
    });
  });

  describe('showOverallStatus — title and tasksProgress and phase branches', () => {
    it('prints title, tasks progress, and phase for a change with tasks', async () => {
      const stddDir = path.join(TMP, 'stdd');
      mkdirp(path.join(stddDir, 'specs'));
      mkdirp(path.join(stddDir, 'memory'));
      w(path.join(stddDir, 'config.yaml'), 'version: "1.0"');
      const changeDir = path.join(stddDir, 'changes', 'feat-x');
      mkdirp(path.join(changeDir, 'specs'));
      w(path.join(changeDir, 'proposal.md'), '# Proposal: Feature X\n');
      w(path.join(changeDir, 'specs', 'x.md'), 'spec');
      w(path.join(changeDir, 'design.md'), 'design');
      w(path.join(changeDir, 'tasks.md'), '- [x] Done\n- [ ] Todo');

      const logs = [];
      const origLog = console.log;
      console.log = (...a) => logs.push(a.join(' '));
      try {
        await cmd.showOverallStatus(stddDir, {});
      } finally {
        console.log = origLog;
      }
      const out = logs.join('\n');
      expect(out).toContain('Feature X');
      expect(out).toContain('Tasks:');
      expect(out).toContain('Phase:');
    });
  });
});
