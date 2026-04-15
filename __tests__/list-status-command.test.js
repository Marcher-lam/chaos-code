const fs = require('fs');
const path = require('path');
const os = require('os');
const { ListCommand } = require('../src/cli/commands/list');
const { StatusCommand } = require('../src/cli/commands/status');

describe('ListCommand + StatusCommand', () => {
  let tempDirs = [];
  let originalCwd;
  let logSpy;
  let errorSpy;

  function createTempProject(name) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-list-status-test-'));
    tempDirs.push(root);

    const projectPath = path.join(root, name);
    fs.mkdirSync(projectPath, { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes', 'archive'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'stdd', 'specs'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'stdd', 'memory'), { recursive: true });
    return projectPath;
  }

  function parseJsonOutputFromSpy(spy) {
    const printed = spy.mock.calls.map(call => String(call[0]));
    const jsonLine = printed.find(line => line.trim().startsWith('{') || line.trim().startsWith('['));
    if (!jsonLine) {
      throw new Error(`No JSON output found. Printed lines:\n${printed.join('\n')}`);
    }
    return JSON.parse(jsonLine);
  }

  beforeEach(() => {
    originalCwd = process.cwd();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (logSpy) logSpy.mockRestore();
    if (errorSpy) errorSpy.mockRestore();
  });

  afterAll(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('list --json --archived should include active and archived changes', async () => {
    const projectPath = createTempProject('list-archived-project');
    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes', 'feature-a'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes', 'archive', 'feature-old'), { recursive: true });

    const listCommand = new ListCommand();
    await listCommand.execute(projectPath, { json: true, archived: true });

    const payload = parseJsonOutputFromSpy(logSpy);
    expect(payload).toEqual({
      active: ['feature-a'],
      archived: ['feature-old']
    });
  });

  it('status --json should print pure JSON for overall and change status', async () => {
    const projectPath = createTempProject('status-json-project');
    fs.writeFileSync(path.join(projectPath, 'stdd', 'config.yaml'), 'version: "1.0"\n');
    fs.writeFileSync(path.join(projectPath, 'stdd', 'memory', 'foundation.md'), '# foundation\n');
    fs.mkdirSync(path.join(projectPath, 'stdd', 'specs', 'auth'), { recursive: true });

    const changeDir = path.join(projectPath, 'stdd', 'changes', 'feature-a');
    fs.mkdirSync(path.join(changeDir, 'specs'), { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'proposal.md'), '# Proposal: Feature A\n');
    fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [x] done\n- [ ] todo\n');
    fs.writeFileSync(path.join(changeDir, 'specs', 'auth.md'), '# spec\n');

    process.chdir(projectPath);

    const statusCommand = new StatusCommand();

    await statusCommand.execute(undefined, { json: true });
    expect(logSpy).toHaveBeenCalledTimes(1);
    const overallPayload = parseJsonOutputFromSpy(logSpy);
    expect(overallPayload.initialized).toBe(true);
    expect(overallPayload.changes).toBe(1);
    expect(Array.isArray(overallPayload.currentChanges)).toBe(true);
    expect(errorSpy).not.toHaveBeenCalled();

    logSpy.mockClear();
    errorSpy.mockClear();

    await statusCommand.execute('feature-a', { json: true });
    expect(logSpy).toHaveBeenCalledTimes(1);
    const changePayload = parseJsonOutputFromSpy(logSpy);
    expect(changePayload.change).toBe('feature-a');
    expect(changePayload.hasProposal).toBe(true);
    expect(changePayload.tasksProgress).toBe('1/2');
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
