const { ElicitationCommand } = require('../src/cli/commands/elicitation');

describe('ElicitationCommand', () => {
  it('execute with --list prints available methods', () => {
    const cmd = new ElicitationCommand();
    const result = cmd.execute([], { list: true });
    expect(result).toBeUndefined();
  });

  it('execute with --method runs specific method', () => {
    const cmd = new ElicitationCommand();
    const result = cmd.execute(['test topic'], { method: 'inversion' });
    expect(result.method).toContain('Inversion');
    expect(result.topic).toBe('test topic');
    expect(result.prompt).not.toContain('${topic}');
  });

  it('execute without method picks random', () => {
    const cmd = new ElicitationCommand();
    const result = cmd.execute(['my topic']);
    expect(result.method).toBeTruthy();
    expect(result.prompt).toBeTruthy();
  });

  it('replaces topic placeholder in prompt', () => {
    const cmd = new ElicitationCommand();
    const result = cmd.execute(['authentication'], { method: 'five-whys' });
    expect(result.prompt).toContain('authentication');
  });
});
