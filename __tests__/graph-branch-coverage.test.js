/**
 * Branch-coverage tests for src/cli/commands/graph.js
 *
 * Covers:
 * 1. openInBrowser platform branches (win32, linux fallback) and non-zero exit code (lines 74-79, 86)
 * 2. HTML visualize error catch (lines 184-186)
 * 3. history action error catch (lines 233-234)
 * 4. replay action error catch (lines 249-250)
 * 5. recommend action error catch (lines 303-304)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// ---------------------------------------------------------------------------
// Shared chalk mock
// ---------------------------------------------------------------------------
jest.mock('chalk', () => {
  const fn = (...args) => args.join('');
  fn.bold = fn;
  fn.green = fn;
  fn.yellow = fn;
  fn.red = fn;
  fn.cyan = fn;
  fn.dim = fn;
  return fn;
});

// ---------------------------------------------------------------------------
// Helper to capture action handlers from graphCommand(program)
// ---------------------------------------------------------------------------
function captureActions(graphCommandFn) {
  const actions = {};
  const mockGraph = {
    command: jest.fn().mockImplementation((name) => {
      actions._current = name;
      return mockGraph;
    }),
    description: jest.fn().mockReturnThis(),
    option: jest.fn().mockReturnThis(),
    alias: jest.fn().mockReturnThis(),
    addHelpText: jest.fn().mockReturnThis(),
    action: jest.fn().mockImplementation((fn) => {
      actions[actions._current] = fn;
      return mockGraph;
    }),
  };
  graphCommandFn(mockGraph);
  return actions;
}

// ===========================================================================
// 1. openInBrowser platform branches + non-zero exit code
// ===========================================================================
describe('openInBrowser platform branches', () => {
  let tmpDir;
  let logSpy;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-graph-branch-'));
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  /**
   * Test a platform branch by isolating modules with mocked os.platform and
   * child_process.spawn, then invoking the visualize action with format=html.
   */
  function runPlatformTest(platform, expectedCommand, spawnBehavior) {
    return async () => {
      const htmlFile = path.join(tmpDir, 'test.html');
      fs.writeFileSync(htmlFile, '<html>test</html>');

      // Create the HTML template so renderHtml succeeds
      const templateDir = path.join(tmpDir, 'stdd', 'templates');
      fs.mkdirSync(templateDir, { recursive: true });
      fs.writeFileSync(path.join(templateDir, 'graph.html'), '<html>{{MERMAID_CODE}}</html>');

      let spawnArgs;

      await jest.isolateModules(async () => {
        // Mock os.platform
        const osMod = require('os');
        jest.spyOn(osMod, 'platform').mockReturnValue(platform);

        // Mock child_process.spawn
        const { _spawn } = require('child_process');
        const EventEmitter = require('events');

        jest.spyOn(require('child_process'), 'spawn').mockImplementation((cmd, args, opts) => {
          spawnArgs = { cmd, args, opts };
          const ee = new EventEmitter();
          // Defer so the caller can attach listeners
          setImmediate(() => spawnBehavior(ee, cmd));
          return ee;
        });

        // Mock getGraphHtmlTemplatePath by providing a valid template
        const graph = require('../src/cli/commands/graph');

        // Use the exported renderHtml + openInBrowser is internal,
        // so test via visualize action handler.
        const actions = captureActions(graph.graphCommand);

        const outputPath = path.join(tmpDir, 'out.html');

        // The visualize action will call renderHtml which reads the real template.
        // Instead, let's directly test openInBrowser behavior by using the action.
        // We need the template to exist at the real path though.
        // Easier: test openInBrowser directly through the visualize html branch.
        // But openInBrowser is not exported. So test via action handler.

        // The template file must exist at the real getGraphHtmlTemplatePath().
        // Let's mock fs.readFileSync for the template read to return something.
        const origReadFileSync = fs.readFileSync;
        jest.spyOn(fs, 'readFileSync').mockImplementation((filePath, encoding) => {
          if (typeof filePath === 'string' && filePath.endsWith('graph.html') && filePath.includes('templates')) {
            return '<html>{{MERMAID_CODE}}</html>';
          }
          return origReadFileSync(filePath, encoding);
        });

        // Also mock fs.writeFileSync to avoid writing to real FS
        jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
        jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});

        await actions['visualize']({ format: 'html', output: outputPath });
      });

      // Verify the correct command was used
      expect(spawnArgs).toBeDefined();
      expect(spawnArgs.cmd).toBe(expectedCommand);
    };
  }

  it(
    'uses "open" command on darwin',
    runPlatformTest('darwin', 'open', (ee) => {
      ee.emit('close', 0);
    })
  );

  it(
    'uses "cmd /c start" command on win32 (lines 74-76)',
    runPlatformTest('win32', 'cmd', (ee) => {
      ee.emit('close', 0);
    })
  );

  it(
    'uses "xdg-open" command on linux fallback (lines 77-79)',
    runPlatformTest('linux', 'xdg-open', (ee) => {
      ee.emit('close', 0);
    })
  );

  it(
    'rejects on non-zero exit code (line 86)',
    async () => {
      const htmlFile = path.join(tmpDir, 'test.html');
      fs.writeFileSync(htmlFile, '<html>test</html>');

      await jest.isolateModules(async () => {
        jest.spyOn(require('os'), 'platform').mockReturnValue('linux');

        const EventEmitter = require('events');
        jest.spyOn(require('child_process'), 'spawn').mockImplementation((_cmd, _args, _opts) => {
          const ee = new EventEmitter();
          setImmediate(() => ee.emit('close', 1)); // non-zero exit
          return ee;
        });

        jest.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
          if (typeof filePath === 'string' && filePath.endsWith('graph.html') && filePath.includes('templates')) {
            return '<html>{{MERMAID_CODE}}</html>';
          }
          return '<html></html>';
        });
        jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
        jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});

        const graph = require('../src/cli/commands/graph');
        const actions = captureActions(graph.graphCommand);
        const errorSpy = jest.spyOn(require('../src/utils/logger').createLogger('graph'), 'error').mockImplementation(() => {});

        await actions['visualize']({ format: 'html', output: path.join(tmpDir, 'fail.html') });

        // Should set exitCode to 1 (line 185)
        expect(process.exitCode).toBe(1);
        process.exitCode = 0;

        errorSpy.mockRestore();
      });
    }
  );
});

// ===========================================================================
// 2. HTML visualize error catch (lines 184-186)
//    renderHtml throws because the template file is missing
// ===========================================================================
describe('visualize HTML error catch (lines 184-186)', () => {
  let tmpDir;
  let logSpy;
  let origCwd;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-graph-html-err-'));
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    origCwd = process.cwd();
  });

  afterEach(() => {
    logSpy.mockRestore();
    process.exitCode = 0;
    process.chdir(origCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('catches error from renderHtml and sets exitCode=1', async () => {
    await jest.isolateModules(async () => {
      // Mock fs.readFileSync to throw when reading the graph.html template
      const origReadFileSync = fs.readFileSync;
      jest.spyOn(fs, 'readFileSync').mockImplementation((filePath, encoding) => {
        if (typeof filePath === 'string' && filePath.includes('templates') && filePath.endsWith('graph.html')) {
          throw new Error('ENOENT: no such file or directory, open template');
        }
        return origReadFileSync(filePath, encoding);
      });

      const graph = require('../src/cli/commands/graph');
      const actions = captureActions(graph.graphCommand);

      await actions['visualize']({ format: 'html', output: path.join(tmpDir, 'err.html') });

      expect(process.exitCode).toBe(1);
    });
  });

  it('catches error from openInBrowser (spawn error event) and sets exitCode=1', async () => {
    await jest.isolateModules(async () => {
      jest.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
        if (typeof filePath === 'string' && filePath.includes('templates') && filePath.endsWith('graph.html')) {
          return '<html>{{MERMAID_CODE}}</html>';
        }
        return '';
      });
      jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});

      const EventEmitter = require('events');
      jest.spyOn(require('child_process'), 'spawn').mockImplementation(() => {
        const ee = new EventEmitter();
        setImmediate(() => ee.emit('error', new Error('spawn ENOENT')));
        return ee;
      });

      const graph = require('../src/cli/commands/graph');
      const actions = captureActions(graph.graphCommand);

      await actions['visualize']({ format: 'html', output: path.join(tmpDir, 'spawn-err.html') });

      expect(process.exitCode).toBe(1);
    });
  });
});

// ===========================================================================
// 3-5. Error catch in history, replay, and recommend action handlers
//       (lines 233-234, 249-250, 303-304)
// ===========================================================================
describe('history action error catch (lines 233-234)', () => {
  let logSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    process.exitCode = 0;
  });

  it('catches constructor error and sets exitCode=1', async () => {
    await jest.isolateModules(async () => {
      // Mock graph-history to throw in constructor
      jest.doMock('../src/cli/commands/graph-history', () => ({
        GraphHistoryCommand: jest.fn(() => {
          throw new Error('GraphHistory BOOM');
        }),
      }));

      const graph = require('../src/cli/commands/graph');
      const actions = captureActions(graph.graphCommand);

      await actions['history']({});

      expect(process.exitCode).toBe(1);
    });
  });
});

describe('replay action error catch (lines 249-250)', () => {
  let logSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    process.exitCode = 0;
  });

  it('catches constructor error and sets exitCode=1', async () => {
    await jest.isolateModules(async () => {
      jest.doMock('../src/cli/commands/graph-history', () => ({
        GraphHistoryCommand: jest.fn(() => {
          throw new Error('Replay BOOM');
        }),
      }));

      const graph = require('../src/cli/commands/graph');
      const actions = captureActions(graph.graphCommand);

      const replayAction = actions['replay <id>'];
      await replayAction('some-id', {});

      expect(process.exitCode).toBe(1);
    });
  });
});

describe('recommend action error catch (lines 303-304)', () => {
  let logSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    process.exitCode = 0;
  });

  it('catches RecommendEngine constructor error and sets exitCode=1', async () => {
    await jest.isolateModules(async () => {
      jest.doMock('../src/cli/commands/recommend', () => ({
        RecommendEngine: jest.fn(() => {
          throw new Error('Recommend BOOM');
        }),
        printRecommendations: jest.fn(),
      }));

      const graph = require('../src/cli/commands/graph');
      const actions = captureActions(graph.graphCommand);

      await actions['recommend [change]'](undefined, {});

      expect(process.exitCode).toBe(1);
    });
  });

  it('catches RecommendEngine.recommend() error and sets exitCode=1', async () => {
    await jest.isolateModules(async () => {
      jest.doMock('../src/cli/commands/recommend', () => ({
        RecommendEngine: jest.fn(() => ({
          recommend: jest.fn(() => {
            throw new Error('recommend() BOOM');
          }),
        })),
        printRecommendations: jest.fn(),
      }));

      const graph = require('../src/cli/commands/graph');
      const actions = captureActions(graph.graphCommand);

      await actions['recommend [change]']('my-change', {});

      expect(process.exitCode).toBe(1);
    });
  });
});
