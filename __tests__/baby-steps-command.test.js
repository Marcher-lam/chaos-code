const { BabyStepsCommand } = require('../src/cli/commands/baby-steps');

describe('BabyStepsCommand', () => {
  it('exports a class with execute method', () => {
    expect(typeof BabyStepsCommand).toBe('function');
    const cmd = new BabyStepsCommand('/tmp');
    expect(typeof cmd.execute).toBe('function');
  });

  it('extractKeyEntity returns noun-like entity', () => {
    const cmd = new BabyStepsCommand('/tmp');
    const entity = cmd.extractKeyEntity('user login form validation');
    expect(entity).toBeTruthy();
    expect(typeof entity).toBe('string');
  });
});
