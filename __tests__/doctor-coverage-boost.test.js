/**
 * Targeted branch-coverage tests for doctor.js
 * Covers: execute --deep, execute --json with fail results,
 *         nodeVersion check, packageJson check, husky detection.
 */

const fs = require('fs');
const path = require('path');
const { DoctorCommand } = require('../src/cli/commands/doctor');

const TMP = path.join(__dirname, '__doctor_cov_tmp__');
function mkdirp(dir) { fs.mkdirSync(dir, { recursive: true }); }
function w(filePath, content) { mkdirp(path.dirname(filePath)); fs.writeFileSync(filePath, content, 'utf8'); }

beforeEach(() => mkdirp(TMP));
afterEach(() => fs.rmSync(TMP, { recursive: true, force: true }));

describe('doctor.js coverage boost', () => {
  describe('execute — json with errors sets exitCode', () => {
    it('sets exitCode when errors found in json mode', () => {
      const cmd = new DoctorCommand(TMP);
      // No stdd dir → errors
      const origExitCode = process.exitCode;
      const logs = [];
      const origLog = console.log;
      console.log = (...a) => logs.push(a.join(' '));
      try {
        cmd.execute({ json: true });
        expect(process.exitCode).toBe(1);
      } finally {
        console.log = origLog;
        process.exitCode = origExitCode;
      }
    });
  });

  describe('execute — deep checks', () => {
    it('runs deep checks without crash', () => {
      mkdirp(path.join(TMP, 'stdd'));
      w(path.join(TMP, 'stdd', 'config.yaml'), 'version: "1.0"');
      w(path.join(TMP, 'AGENTS.md'), '# STDD');
      mkdirp(path.join(TMP, 'stdd', 'changes'));
      mkdirp(path.join(TMP, 'stdd', 'specs'));
      mkdirp(path.join(TMP, 'stdd', 'evidence'));
      w(path.join(TMP, 'package.json'), '{"name":"test"}');
      const cmd = new DoctorCommand(TMP);
      const logs = [];
      const origLog = console.log;
      console.log = (...a) => logs.push(a.join(' '));
      try {
        cmd.execute({ deep: true });
      } finally {
        console.log = origLog;
      }
      const out = logs.join('\n');
      expect(out).toContain('Doctor');
    });
  });

  describe('individual checks', () => {
    it('nodeVersion returns pass for node >= 20', () => {
      const cmd = new DoctorCommand(TMP);
      const result = cmd.nodeVersion();
      const major = parseInt(process.versions.node.split('.')[0], 10);
      expect(result.status).toBe(major >= 20 ? 'pass' : 'warn');
    });

    it('packageJson returns pass when present', () => {
      w(path.join(TMP, 'package.json'), '{}');
      const cmd = new DoctorCommand(TMP);
      const result = cmd.packageJson();
      expect(result.status).toBe('pass');
    });

    it('husky returns pass when .husky dir exists', () => {
      mkdirp(path.join(TMP, '.husky'));
      const cmd = new DoctorCommand(TMP);
      const result = cmd.husky();
      expect(result.status).toBe('pass');
    });

    it('husky returns info when husky in dependencies', () => {
      w(path.join(TMP, 'package.json'), JSON.stringify({ devDependencies: { husky: '^8.0.0' } }));
      const cmd = new DoctorCommand(TMP);
      const result = cmd.husky();
      expect(result.status).toBe('info');
    });

    it('gitHooks returns pass when stdd hook exists', () => {
      const hookDir = path.join(TMP, '.git', 'hooks');
      mkdirp(hookDir);
      fs.writeFileSync(path.join(hookDir, 'pre-commit'), '#!/bin/sh\nstdd guard\n');
      const cmd = new DoctorCommand(TMP);
      const result = cmd.gitHooks();
      expect(result.status).toBe('pass');
    });

    it('testConfig returns warn when config has no test command', () => {
      mkdirp(path.join(TMP, 'stdd'));
      w(path.join(TMP, 'stdd', 'config.yaml'), 'version: "1.0"');
      const cmd = new DoctorCommand(TMP);
      const result = cmd.testConfig();
      expect(result.status).toBe('warn');
    });
  });

  describe('printResults — all statuses', () => {
    it('prints fail, warn, info, and pass messages', () => {
      const cmd = new DoctorCommand(TMP);
      const results = [
        { status: 'fail', message: 'Critical', severity: 'error', id: 'x' },
        { status: 'warn', message: 'Warning', severity: 'warning', id: 'y' },
        { status: 'info', message: 'Info', severity: 'info', id: 'z' },
        { status: 'pass', message: 'All good', severity: 'info', id: 'w' },
      ];
      const logs = [];
      const origLog = console.log;
      console.log = (...a) => logs.push(a.join(' '));
      try {
        cmd.printResults(results);
      } finally {
        console.log = origLog;
      }
      const out = logs.join('\n');
      expect(out).toContain('Critical');
      expect(out).toContain('1 critical issue');
      expect(out).toContain('1 warning');
    });

    it('prints clean message when no issues', () => {
      const cmd = new DoctorCommand(TMP);
      const results = [{ status: 'pass', message: 'OK', severity: 'info', id: 'x' }];
      const logs = [];
      const origLog = console.log;
      console.log = (...a) => logs.push(a.join(' '));
      try {
        cmd.printResults(results);
      } finally {
        console.log = origLog;
      }
      const out = logs.join('\n');
      expect(out).toContain('Everything looks good');
    });
  });
});
