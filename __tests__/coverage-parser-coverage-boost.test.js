/**
 * Targeted branch-coverage tests for coverage-parser.js
 * Covers: parseIstanbulJson edge cases, parseCoverageXml edge cases,
 *         parseLcov with mixed content, parseCoverage error handling.
 */

const fs = require('fs');
const path = require('path');
const { parseCoverage } = require('../src/utils/coverage-parser');

const TMP = path.join(__dirname, '__covparse_tmp__');
function mkdirp(dir) { fs.mkdirSync(dir, { recursive: true }); }
function w(filePath, content) { mkdirp(path.dirname(filePath)); fs.writeFileSync(filePath, content, 'utf8'); }

beforeEach(() => mkdirp(TMP));
afterEach(() => fs.rmSync(TMP, { recursive: true, force: true }));

describe('coverage-parser coverage boost', () => {
  describe('parseIstanbulJson — empty s/f/b maps', () => {
    it('handles Istanbul JSON with empty maps', () => {
      const data = {
        'file.js': {
          s: {}, f: {}, b: {}, statementMap: {}
        }
      };
      w(path.join(TMP, 'coverage', 'coverage-final.json'), JSON.stringify(data));
      const result = parseCoverage(TMP);
      expect(result.found).toBe(true);
      expect(result.type).toBe('istanbul-json');
    });

    it('handles Istanbul JSON with null file coverage', () => {
      const data = { 'file.js': null };
      w(path.join(TMP, 'coverage', 'coverage-final.json'), JSON.stringify(data));
      const result = parseCoverage(TMP);
      expect(result.found).toBe(true);
    });
  });

  describe('parseCoverageXml — missing rates', () => {
    it('handles XML with no line-rate or branch-rate', () => {
      w(path.join(TMP, 'coverage.xml'), '<coverage version="5"><packages></packages></coverage>');
      const result = parseCoverage(TMP);
      expect(result.found).toBe(true);
      expect(result.lines).toBeNull();
      expect(result.branches).toBeNull();
    });
  });

  describe('parseCoverage — corrupt file returns error', () => {
    it('returns error result for corrupt JSON', () => {
      w(path.join(TMP, 'coverage', 'coverage-summary.json'), 'not json{{{');
      const result = parseCoverage(TMP);
      expect(result.found).toBe(true);
      expect(result.error).toBeDefined();
    });
  });

  describe('parseLcov — real-world style', () => {
    it('parses lcov with mixed content', () => {
      const lcov = [
        'TN:',
        'SF:src/app.js',
        'DA:1,1',
        'DA:2,0',
        'LF:2',
        'LH:1',
        'BRF:4',
        'BRH:2',
        'FNF:3',
        'FNH:2',
        'end_of_record',
      ].join('\n');
      w(path.join(TMP, 'coverage', 'lcov.info'), lcov);
      const result = parseCoverage(TMP);
      expect(result.found).toBe(true);
      expect(result.lines.pct).toBe(50);
      expect(result.branches.pct).toBe(50);
      expect(result.functions.pct).toBeLessThanOrEqual(100);
    });
  });

  describe('parseCoverage — no root uses cwd', () => {
    it('returns found:false when no coverage files in cwd', () => {
      const origCwd = process.cwd();
      process.chdir(TMP);
      try {
        const result = parseCoverage();
        expect(result.found).toBe(false);
      } finally {
        process.chdir(origCwd);
      }
    });
  });
});
