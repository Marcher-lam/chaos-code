const fs = require('fs');
const path = require('path');
const os = require('os');
const { StoryCommand } = require('../src/cli/commands/story');

function setup() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-story-'));
  fs.mkdirSync(path.join(tmp, 'stdd'), { recursive: true });
  return tmp;
}

describe('StoryCommand', () => {
  it('create generates YAML journey', () => {
    const tmp = setup();
    const cmd = new StoryCommand(tmp);
    const result = cmd.execute('create', 'login-flow');
    expect(result.status).toBe('created');
    expect(fs.existsSync(result.path)).toBe(true);
    const content = fs.readFileSync(result.path, 'utf8');
    expect(content).toContain('persona:');
    expect(content).toContain('steps:');
  });

  it('create throws on duplicate without --force', () => {
    const tmp = setup();
    const cmd = new StoryCommand(tmp);
    cmd.execute('create', 'dup');
    expect(() => cmd.execute('create', 'dup')).toThrow();
  });

  it('create with --force overwrites', () => {
    const tmp = setup();
    const cmd = new StoryCommand(tmp);
    cmd.execute('create', 'dup');
    const result = cmd.execute('create', 'dup', { force: true });
    expect(result.status).toBe('created');
  });

  it('create sanitizes name', () => {
    const tmp = setup();
    const cmd = new StoryCommand(tmp);
    const result = cmd.execute('create', 'Hello World!');
    expect(result.path).toContain('hello-world');
  });

  it('bdd generates feature file from journey', () => {
    const tmp = setup();
    const cmd = new StoryCommand(tmp);
    cmd.execute('create', 'checkout');
    const journeyFile = path.join(tmp, 'stdd', 'journeys', 'checkout.yaml');
    const result = cmd.execute('bdd', journeyFile);
    expect(result.status).toBe('generated');
    expect(fs.existsSync(result.path)).toBe(true);
    const content = fs.readFileSync(result.path, 'utf8');
    expect(content).toContain('Feature:');
  });

  it('bdd throws on missing journey file', () => {
    const tmp = setup();
    const cmd = new StoryCommand(tmp);
    expect(() => cmd.execute('bdd', '/nonexistent.yaml')).toThrow();
  });
});
