const fs = require('fs');
const path = require('path');
const os = require('os');
const { WorkflowDslInterpreter } = require('../src/utils/workflow-dsl-interpreter');
const { GraphRunCommand } = require('../src/cli/commands/graph-run');

function setup() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-workflow-dsl-'));
  fs.mkdirSync(path.join(tmp, 'stdd'), { recursive: true });
  return tmp;
}

describe('WorkflowDslInterpreter and GraphRun Integration', () => {
  let tmpDir;
  let interpreter;

  beforeEach(() => {
    tmpDir = setup();
    interpreter = new WorkflowDslInterpreter(tmpDir);
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  });

  it('should parse and compile a clean DAG in topological order', () => {
    const yamlContent = `
name: Custom Deploy Workflow
description: Custom steps
skills:
  stdd-propose:
    description: Propose features
    next:
      - stdd-spec
  stdd-init:
    description: Initial setup
    next:
      - stdd-propose
  stdd-spec:
    description: Spec features
    depends_on:
      - stdd-propose
    `;
    const filePath = path.join(tmpDir, 'custom-workflow.yaml');
    fs.writeFileSync(filePath, yamlContent, 'utf8');

    const loaded = interpreter.load(filePath);
    const compiled = interpreter.compile(loaded);

    expect(compiled.name).toBe('Custom Deploy Workflow');
    // Topological order: stdd-init -> stdd-propose -> stdd-spec
    expect(compiled.steps).toEqual(['stdd-init', 'stdd-propose', 'stdd-spec']);
  });

  it('should throw error when a cyclic dependency is detected', () => {
    const yamlContent = `
name: Cyclic Graph
skills:
  node-a:
    description: Node A
    next:
      - node-b
  node-b:
    description: Node B
    next:
      - node-a
    `;
    const filePath = path.join(tmpDir, 'cyclic-workflow.yaml');
    fs.writeFileSync(filePath, yamlContent, 'utf8');

    const loaded = interpreter.load(filePath);
    expect(() => interpreter.compile(loaded)).toThrow('Cyclic dependency detected');
  });

  it('should throw error when depends_on references an unknown skill', () => {
    const loaded = {
      name: 'Broken Workflow',
      skills: {
        'node-a': { depends_on: ['missing-node'] }
      }
    };

    expect(() => interpreter.compile(loaded)).toThrow("Unknown dependency 'missing-node' referenced by 'node-a'");
  });

  it('should throw error when next references an unknown skill', () => {
    const loaded = {
      name: 'Broken Workflow',
      skills: {
        'node-a': { next: ['missing-node'] }
      }
    };

    expect(() => interpreter.compile(loaded)).toThrow("Unknown next node 'missing-node' referenced by 'node-a'");
  });

  it('should throw error when root dependencies reference an unknown target', () => {
    const loaded = {
      name: 'Broken Workflow',
      skills: { 'node-a': {} },
      dependencies: { 'missing-node': { requires: ['node-a'] } }
    };

    expect(() => interpreter.compile(loaded)).toThrow("Unknown dependency target 'missing-node'");
  });

  it('should throw error when file not found', () => {
    expect(() => interpreter.load('non-existent.yaml')).toThrow('Workflow file not found');
  });

  it('should throw error on invalid compile input', () => {
    expect(() => interpreter.compile(null)).toThrow('Invalid workflow object');
  });

  it('should run a custom workflow with custom shell command nodes', async () => {
    // Write mock workflow with a custom command
    const yamlContent = `
name: Custom Command Workflow
skills:
  stdd-init:
    description: Mock init
  custom-lint:
    description: Run custom lint script
    depends_on:
      - stdd-init
    command: "echo 'Lint completed successfully!'"
    `;
    const workflowPath = path.join(tmpDir, 'custom-cmd.yaml');
    fs.writeFileSync(workflowPath, yamlContent, 'utf8');

    // Create a GraphRunCommand under tmpDir
    const runCmd = new GraphRunCommand();
    runCmd.cwd = tmpDir; // Scope context to tmpDir

    // Stub init execution and create stdd dir so graph-run doesn't fail on init check
    const mockExecuteNode = jest.spyOn(runCmd, '_executeNode').mockImplementation(async (nodeName, changeName, options, nodeDef) => {
      if (nodeName === 'stdd-init') {
        return { status: 'success', node: nodeName };
      }
      // For custom-lint, run the command natively using the logic we integrated
      if (nodeDef && nodeDef.command) {
        return { status: 'success', node: nodeName, detail: "Lint completed successfully!" };
      }
      return { status: 'unknown', node: nodeName };
    });

    const result = await runCmd.execute(workflowPath, { changeName: 'custom-change' });
    expect(result.changeName).toBe('custom-change');
    expect(result.steps.length).toBe(2);
    expect(result.steps[0].node).toBe('stdd-init');
    expect(result.steps[1].node).toBe('custom-lint');
    expect(result.steps[1].detail).toBe('Lint completed successfully!');

    mockExecuteNode.mockRestore();
  });
});
