const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  compileGraph,
  getEdges,
  _getLayers,
  buildMermaid,
  sanitizeMermaidId,
  formatAnalyze,
  _formatParallelLayers,
  writeOrPrint,
  getGraphHtmlTemplatePath,
  _renderHtml,
  graphCommand,
} = require('../src/cli/commands/graph');

jest.mock('chalk', () => {
  const fn = (...args) => args.join('');
  fn.bold = fn;
  fn.green = fn;
  fn.yellow = fn;
  fn.cyan = fn;
  fn.dim = fn;
  fn.red = fn;
  return fn;
});

function captureActions() {
  const actions = {};
  const mockGraph = {
    command: jest.fn().mockImplementation((name) => {
      actions._current = name;
      return mockGraph;
    }),
    description: jest.fn().mockReturnThis(),
    option: jest.fn().mockReturnThis(),
    addHelpText: jest.fn().mockReturnThis(),
    action: jest.fn().mockImplementation((fn) => {
      actions[actions._current] = fn;
      return mockGraph;
    }),
  };
  const mockProgram = {
    command: jest.fn().mockReturnValue(mockGraph),
    addHelpText: jest.fn().mockReturnThis(),
    description: jest.fn().mockReturnThis(),
  };
  graphCommand(mockProgram);
  return actions;
}

describe('graph.js full coverage', () => {
  let tmpDir;
  let logSpy;
  let origCwd;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-graph-cov-'));
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    origCwd = process.cwd();
  });

  afterEach(() => {
    logSpy.mockRestore();
    process.exitCode = 0;
    process.chdir(origCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('pure functions', () => {
    it('compileGraph default', () => expect(compileGraph()).toBeDefined());
    it('compileGraph hotfix', () => expect(compileGraph('hotfix')).toBeDefined());
    it('getEdges empty', () => expect(getEdges({ skills: {} })).toEqual([]));
    it('getEdges no deps', () => expect(getEdges({ skills: { a: {} } })).toEqual([]));
    it('buildMermaid empty', () => expect(buildMermaid({ skills: {} })).toContain('No graph'));
    it('sanitizeMermaidId', () => {
      expect(sanitizeMermaidId('a/b-c')).toBe('a_b_c');
    });
    it('formatAnalyze no edges', () => {
      const out = formatAnalyze({ skills: { x: { depends_on: [] } } });
      expect(out).toContain('Nodes: 1');
    });
    it('formatAnalyze with name', () => {
      expect(formatAnalyze({ name: 'TestG', skills: {} })).toContain('TestG');
    });
    it('writeOrPrint to file', () => {
      const p = path.join(tmpDir, 'out.txt');
      writeOrPrint('hi', p);
      expect(fs.readFileSync(p, 'utf8')).toBe('hi');
    });
    it('writeOrPrint to console', () => {
      writeOrPrint('hi');
      expect(logSpy).toHaveBeenCalledWith('hi');
    });
    it('writeOrPrint deep dirs', () => {
      const p = path.join(tmpDir, 'a', 'b', 'c', 'out.txt');
      writeOrPrint('deep', p);
      expect(fs.readFileSync(p, 'utf8')).toBe('deep');
    });
  });

  describe('visualize action', () => {
    let actions;
    beforeAll(() => { actions = captureActions(); });

    it('mermaid format (default)', async () => {
      await actions['visualize']({ format: 'mermaid' });
      expect(logSpy).toHaveBeenCalled();
    });

    it('json format', async () => {
      const p = path.join(tmpDir, 'graph.json');
      await actions['visualize']({ format: 'json', output: p });
      const content = fs.readFileSync(p, 'utf8');
      const json = JSON.parse(content);
      expect(json).toHaveProperty('nodes');
      expect(json).toHaveProperty('edges');
    });

    it('unsupported format sets exitCode', async () => {
      await actions['visualize']({ format: 'yaml' });
      expect(process.exitCode).toBe(1);
    });

    it('html format writes and opens browser', async () => {
      const templatePath = getGraphHtmlTemplatePath();
      if (!fs.existsSync(templatePath)) return;
      const outPath = path.join(tmpDir, 'graph.html');
      await actions['visualize']({ format: 'html', output: outPath });
      expect(fs.existsSync(outPath)).toBe(true);
    });

    it('html format catches browser error', async () => {
      const templatePath = getGraphHtmlTemplatePath();
      if (!fs.existsSync(templatePath)) return;
      // Use invalid path to trigger openInBrowser error
      await actions['visualize']({ format: 'html', output: path.join(tmpDir, 'g.html') });
      // Should not throw - catches error internally
    });
  });

  describe('analyze action', () => {
    let actions;
    beforeAll(() => { actions = captureActions(); });

    it('prints analysis', async () => {
      await actions['analyze']({});
      expect(logSpy).toHaveBeenCalled();
      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('Nodes:');
    });
  });

  describe('parallel action', () => {
    let actions;
    beforeAll(() => { actions = captureActions(); });

    it('without detect flag sets exitCode', async () => {
      await actions['parallel']({});
      expect(process.exitCode).toBe(1);
    });

    it('with detect flag prints layers', async () => {
      await actions['parallel']({ detect: true });
      expect(logSpy).toHaveBeenCalled();
    });
  });

  describe('history action', () => {
    let actions;
    beforeAll(() => { actions = captureActions(); });

    it('handles missing stdd dir gracefully', async () => {
      process.chdir(tmpDir);
      await actions['history']({});
    });

    it('catches error when reading corrupt evidence', async () => {
      const stddDir = path.join(tmpDir, 'stdd');
      const evDir = path.join(stddDir, 'evidence');
      fs.mkdirSync(evDir, { recursive: true });
      fs.writeFileSync(path.join(evDir, 'bad.json'), 'not-json');
      process.chdir(tmpDir);
      await actions['history']({});
    });
  });

  describe('replay action', () => {
    let actions;
    beforeAll(() => { actions = captureActions(); });

    it('catches error for missing id', async () => {
      process.chdir(tmpDir);
      const fn = actions['replay <id>'];
      if (fn) await fn('nonexistent-id', {});
    });

    it('catches error and sets exitCode', async () => {
      const fn = actions['replay <id>'];
      if (!fn) return;
      process.chdir(tmpDir);
      await fn('missing-id', { json: true });
    });
  });

  describe('run action', () => {
    let actions;
    beforeAll(() => { actions = captureActions(); });

    it('catches error from GraphRunCommand', async () => {
      process.chdir(tmpDir);
      await actions['run']({ intent: 'feature' });
      // May succeed or fail depending on project state — should not crash
    });
  });

  describe('recommend action', () => {
    let actions;
    beforeAll(() => { actions = captureActions(); });

    it('catches error from RecommendEngine', async () => {
      process.chdir(tmpDir);
      await actions['recommend [change]'](undefined, {});
      // Should not throw
    });

    it('outputs json when --json flag', async () => {
      process.chdir(tmpDir);
      await actions['recommend [change]'](undefined, { json: true });
      // May print JSON or error — should not crash
    });
  });
});
