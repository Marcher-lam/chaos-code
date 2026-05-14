const fs = require('fs');
const path = require('path');
const os = require('os');
const { OutsideInCommand, DEFAULT_REGISTRY } = require('../src/cli/commands/outside-in');

function setup() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-outsidein-'));
  fs.mkdirSync(path.join(tmp, 'stdd'));
  fs.mkdirSync(path.join(tmp, 'stdd', 'changes', 'my-change'), { recursive: true });
  return tmp;
}

describe('OutsideInCommand', () => {
  it('init creates tdd-registry.yaml', () => {
    const tmp = setup();
    const cmd = new OutsideInCommand(tmp);
    const result = cmd.execute('init');
    expect(result.path).toContain('tdd-registry.yaml');
    expect(fs.existsSync(path.join(tmp, 'stdd', 'tdd-registry.yaml'))).toBe(true);
  });

  it('init throws on duplicate without --force', () => {
    const tmp = setup();
    const cmd = new OutsideInCommand(tmp);
    cmd.execute('init');
    expect(() => cmd.execute('init')).toThrow();
  });

  it('init with --force overwrites', () => {
    const tmp = setup();
    const cmd = new OutsideInCommand(tmp);
    cmd.execute('init');
    const result = cmd.execute('init', null, { force: true });
    expect(result.path).toContain('tdd-registry.yaml');
  });

  it('status returns registry', () => {
    const tmp = setup();
    const cmd = new OutsideInCommand(tmp);
    cmd.execute('init');
    const result = cmd.execute('status');
    expect(result.layers).toBeDefined();
    expect(result.layers.length).toBeGreaterThan(0);
  });

  it('status throws when registry missing', () => {
    const tmp = setup();
    const cmd = new OutsideInCommand(tmp);
    expect(() => cmd.execute('status')).toThrow();
  });

  it('DEFAULT_REGISTRY has 3 layers', () => {
    expect(DEFAULT_REGISTRY.layers).toHaveLength(3);
    const ids = DEFAULT_REGISTRY.layers.map(l => l.name);
    expect(ids).toContain('e2e');
    expect(ids).toContain('integration');
    expect(ids).toContain('unit');
  });
});
