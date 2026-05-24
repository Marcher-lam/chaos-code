/**
 * Targeted branch-coverage tests for explore.js
 * Covers: _applyScopeFilter glob and exact path, _findUntestedFiles,
 *         _findLongFiles, _findHighExportFiles, _toMarkdown,
 *         execute with output file, execute with scope.
 */

const fs = require('fs');
const path = require('path');
const { ExploreCommand } = require('../src/cli/commands/explore');

const TMP = path.join(__dirname, '__explore_cov_tmp__');
function mkdirp(dir) { fs.mkdirSync(dir, { recursive: true }); }
function w(filePath, content) { mkdirp(path.dirname(filePath)); fs.writeFileSync(filePath, content, 'utf8'); }

beforeEach(() => mkdirp(TMP));
afterEach(() => fs.rmSync(TMP, { recursive: true, force: true }));

describe('explore.js coverage boost', () => {
  describe('_applyScopeFilter', () => {
    it('matches exact segment', () => {
      const cmd = new ExploreCommand(TMP);
      const files = [path.join(TMP, 'src', 'a.js'), path.join(TMP, 'lib', 'b.js')];
      const result = cmd._applyScopeFilter(files, 'src');
      expect(result).toHaveLength(1);
      expect(result[0]).toContain('a.js');
    });

    it('matches path prefix', () => {
      const cmd = new ExploreCommand(TMP);
      const files = [path.join(TMP, 'src', 'cli', 'x.js'), path.join(TMP, 'src', 'utils', 'y.js')];
      const result = cmd._applyScopeFilter(files, 'src/cli');
      expect(result).toHaveLength(1);
      expect(result[0]).toContain('x.js');
    });

    it('matches glob pattern', () => {
      const cmd = new ExploreCommand(TMP);
      const files = [path.join(TMP, 'test', 'a.js'), path.join(TMP, 'src', 'b.js')];
      const result = cmd._applyScopeFilter(files, 'test*');
      expect(result).toHaveLength(1);
    });

    it('matches prefix glob with slash', () => {
      const cmd = new ExploreCommand(TMP);
      const files = [path.join(TMP, 'test', 'unit', 'a.js'), path.join(TMP, 'src', 'b.js')];
      const result = cmd._applyScopeFilter(files, 'test/*');
      expect(result).toHaveLength(1);
    });
  });

  describe('_findUntestedFiles', () => {
    it('identifies files without matching test', () => {
      const cmd = new ExploreCommand(TMP);
      const src = [path.join(TMP, 'src', 'app.js')];
      const tests = [path.join(TMP, 'src', 'other.test.js')];
      const result = cmd._findUntestedFiles(src, tests);
      expect(result).toHaveLength(1);
    });

    it('returns empty when all tested', () => {
      const cmd = new ExploreCommand(TMP);
      const src = [path.join(TMP, 'src', 'app.js')];
      const tests = [path.join(TMP, 'src', 'app.test.js')];
      const result = cmd._findUntestedFiles(src, tests);
      expect(result).toHaveLength(0);
    });
  });

  describe('_findLongFiles', () => {
    it('detects files over threshold', () => {
      const cmd = new ExploreCommand(TMP);
      const longFile = path.join(TMP, 'big.js');
      w(longFile, '// line\n'.repeat(501));
      const result = cmd._findLongFiles([longFile]);
      expect(result).toHaveLength(1);
      expect(result[0].lineCount).toBeGreaterThan(500);
    });
  });

  describe('_findHighExportFiles', () => {
    it('detects files with many exports', () => {
      const cmd = new ExploreCommand(TMP);
      const exportFile = path.join(TMP, 'many.js');
      const lines = [];
      for (let i = 0; i < 12; i++) lines.push(`exports.export${i} = ${i};`);
      w(exportFile, lines.join('\n'));
      const result = cmd._findHighExportFiles([exportFile]);
      expect(result).toHaveLength(1);
    });
  });

  describe('execute with output file', () => {
    it('writes markdown report to file', async () => {
      const pkgJson = { name: 'test', dependencies: {}, devDependencies: {} };
      w(path.join(TMP, 'package.json'), JSON.stringify(pkgJson));
      w(path.join(TMP, 'src', 'app.js'), 'const x = 1;');
      w(path.join(TMP, 'src', 'app.test.js'), 'test("x", () => {});');
      mkdirp(path.join(TMP, 'stdd'));
      const cmd = new ExploreCommand(TMP);
      const outputPath = path.join(TMP, 'report.md');
      const report = await cmd.execute(null, { output: outputPath, sourceDir: path.join(TMP, 'src') });
      expect(fs.existsSync(outputPath)).toBe(true);
      const content = fs.readFileSync(outputPath, 'utf8');
      expect(content).toContain('STDD Project Exploration Report');
    });
  });

  describe('execute with scope', () => {
    it('filters source and test files by scope', async () => {
      const pkgJson = { name: 'test', dependencies: {}, devDependencies: {} };
      w(path.join(TMP, 'package.json'), JSON.stringify(pkgJson));
      w(path.join(TMP, 'src', 'cli', 'cmd.js'), 'const x = 1;');
      w(path.join(TMP, 'src', 'utils', 'helper.js'), 'const y = 2;');
      mkdirp(path.join(TMP, 'stdd'));
      const cmd = new ExploreCommand(TMP);
      const report = await cmd.execute('cli', { sourceDir: path.join(TMP, 'src') });
      expect(report.scope).toBe('cli');
    });
  });

  describe('_toMarkdown — all sections populated', () => {
    it('generates markdown with suggestions and scope', () => {
      const cmd = new ExploreCommand(TMP);
      const report = {
        techStack: { language: 'js', framework: 'none', testRunner: 'jest', testCommand: 'jest' },
        entryFiles: [path.join(TMP, 'src', 'index.js')],
        coreDependencies: ['lodash', 'express'],
        untestedFiles: [path.join(TMP, 'src', 'app.js')],
        longFiles: [{ file: path.join(TMP, 'src', 'big.js'), lineCount: 600 }],
        highExportFiles: [{ file: path.join(TMP, 'src', 'mod.js'), exportCount: 15 }],
        suggestions: [{ message: 'Add tests', priority: 'high' }, { message: 'Refactor', priority: 'medium' }],
        scope: 'src',
      };
      const md = cmd._toMarkdown(report);
      expect(md).toContain('STDD Project Exploration Report');
      expect(md).toContain('app.js');
      expect(md).toContain('600 lines');
      expect(md).toContain('15 exports');
      expect(md).toContain('Add tests');
    });
  });
});
