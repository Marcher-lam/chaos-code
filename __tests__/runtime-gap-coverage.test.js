const fs = require('fs');
const os = require('os');
const path = require('path');

const { StoryCommand } = require('../src/cli/commands/story');
const { UserTestCommand } = require('../src/cli/commands/user-test');
const { PipelineCommand } = require('../src/cli/commands/pipeline');
const { ExtensionsCommand } = require('../src/cli/commands/extensions');
const { SchemaCommand } = require('../src/cli/commands/schema');
const { FixPacketCommand } = require('../src/cli/commands/fix-packet');
const { OutsideInCommand } = require('../src/cli/commands/outside-in');
const { buildPhaseSubject, extractIssue } = require('../src/cli/commands/commit-msg');

function tempProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-runtime-gap-'));
  fs.mkdirSync(path.join(root, 'stdd', 'specs'), { recursive: true });
  return root;
}

describe('runtime gap coverage commands', () => {
  test('story create saves story data to json in stories directory', () => {
    const root = tempProject();
    const command = new StoryCommand(root);
    const created = command.create('checkout flow');
    const storyPath = path.join(root, 'stdd', 'stories', `${created.id}.json`);
    expect(fs.existsSync(storyPath)).toBe(true);
    const saved = JSON.parse(fs.readFileSync(storyPath, 'utf8'));
    expect(saved.name).toBe('checkout flow');
  });

  test('user-test generates human and agent scripts from specs', () => {
    const root = tempProject();
    fs.writeFileSync(path.join(root, 'stdd', 'specs', 'checkout.feature'), [
      'Feature: Checkout',
      '  Scenario: Successful checkout',
      '    Given a cart with items',
      '    When the user pays',
      '    Then the order is confirmed',
    ].join('\n'));
    const result = new UserTestCommand(root).execute(undefined, { json: false });
    expect(result.outputs.map(file => path.basename(file))).toEqual(expect.arrayContaining(['user-test-human.md', 'user-test-agent.json']));
  });

  test('pipeline creates IR and failing acceptance skeleton', () => {
    const root = tempProject();
    fs.writeFileSync(path.join(root, 'stdd', 'specs', 'auth.feature'), [
      'Feature: Auth',
      '  Scenario: Login',
      '    Given a registered user',
      '    When the user logs in',
      '    Then a session is created',
    ].join('\n'));
    const result = new PipelineCommand(root).execute(undefined, { json: false });
    expect(JSON.parse(fs.readFileSync(result.ir, 'utf8')).scenarios).toHaveLength(1);
    expect(fs.readFileSync(result.tests, 'utf8')).toContain('Implement acceptance test');
  });

  test('extensions install and validate local extension manifests', () => {
    const root = tempProject();
    const extensionDir = path.join(root, 'my-extension');
    fs.mkdirSync(extensionDir);
    fs.writeFileSync(path.join(extensionDir, 'extension.json'), JSON.stringify({ name: 'my-extension', version: '1.0.0' }));
    const command = new ExtensionsCommand(root);
    const installed = command.install(extensionDir);
    expect(installed.extension).toBe('my-extension');
    const validation = command.validate(path.join(root, 'stdd', 'extensions'));
    expect(validation.status).toBe('pass');
  });

  test('schema create and fork manage workflow schemas', () => {
    const root = tempProject();
    const command = new SchemaCommand(root);
    const created = command.create('custom-flow');
    expect(fs.existsSync(created.path)).toBe(true);
    const forked = command.fork(created.path, 'custom-flow-copy');
    expect(fs.existsSync(forked.path)).toBe(true);
  });

  test('commit helpers support TDG phase and issue traceability', () => {
    expect(buildPhaseSubject('red', '42', 'add failing login spec')).toContain('red:');
    expect(buildPhaseSubject('red', '42', 'add failing login spec')).toContain('(#42)');
    expect(extractIssue('Fix login (#77)', 'change')).toBe('77');
  });

  test('fix-packet creates Golden Packet style markdown and json evidence', () => {
    const root = tempProject();
    const changeDir = path.join(root, 'stdd', 'changes', 'demo');
    fs.mkdirSync(path.join(changeDir, 'specs'), { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [ ] TASK-001 Fix checkout\n');
    fs.writeFileSync(path.join(changeDir, 'specs', 'checkout.feature'), 'Feature: Checkout\n  Scenario: Pay\n    Given a cart\n');

    const result = new FixPacketCommand(root).execute('demo', { testCommand: 'npm test', silent: true });

    expect(result.output).toMatch(/stdd\/changes\/demo\/evidence\/fix-packet-.*\.md/);
    expect(fs.readFileSync(path.join(root, result.output), 'utf8')).toContain('Fix application code, not test expectations');
    expect(JSON.parse(fs.readFileSync(path.join(root, result.jsonOutput), 'utf8')).contextFiles[0]).toHaveProperty('path');
  });

  test('outside-in initializes registry and scaffolds layer plans', () => {
    const root = tempProject();
    const changeDir = path.join(root, 'stdd', 'changes', 'demo');
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'tasks.md'), '- [ ] TASK-001 Add login\n');

    const command = new OutsideInCommand(root);
    const init = command.execute('init', undefined, { json: false });
    expect(init.layers).toEqual(['e2e', 'integration', 'unit']);

    const scaffold = command.execute('scaffold', 'demo', { feature: 'login', json: false });
    expect(fs.readFileSync(path.join(root, scaffold.plan), 'utf8')).toContain('Outside-In Plan');
    expect(scaffold.skeletons).toHaveLength(3);
  });
});
