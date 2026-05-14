const fs = require('fs');
const path = require('path');
const os = require('os');
const { UserTestCommand } = require('../src/cli/commands/user-test');

function setupWithSpecs() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-usertest-'));
  const specs = path.join(tmp, 'stdd', 'specs');
  fs.mkdirSync(specs, { recursive: true });
  fs.writeFileSync(path.join(specs, 'checkout.feature'),
    'Feature: Checkout\n  Scenario: Pay with card\n    Given cart has items\n    When user pays\n    Then order is created\n'
  );
  return tmp;
}

describe('UserTestCommand', () => {
  it('generates human and agent test scripts', () => {
    const tmp = setupWithSpecs();
    const cmd = new UserTestCommand(tmp);
    const result = cmd.execute(null);
    expect(result.scenarios.length).toBeGreaterThan(0);
    expect(result.outputs).toHaveLength(2);
    expect(result.outputs.some(f => f.includes('user-test-human'))).toBe(true);
    expect(result.outputs.some(f => f.includes('user-test-agent'))).toBe(true);
  });

  it('human output contains think-aloud text', () => {
    const tmp = setupWithSpecs();
    const cmd = new UserTestCommand(tmp);
    const result = cmd.execute(null);
    const humanFile = result.outputs.find(f => f.includes('human'));
    const content = fs.readFileSync(humanFile, 'utf8');
    expect(content.length).toBeGreaterThan(0);
  });

  it('agent output is valid JSON', () => {
    const tmp = setupWithSpecs();
    const cmd = new UserTestCommand(tmp);
    const result = cmd.execute(null);
    const agentFile = result.outputs.find(f => f.includes('agent'));
    const json = JSON.parse(fs.readFileSync(agentFile, 'utf8'));
    expect(json).toBeDefined();
  });

  it('throws when specs dir missing', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-usertest-nospecs-'));
    fs.mkdirSync(path.join(tmp, 'stdd'));
    const cmd = new UserTestCommand(tmp);
    expect(() => cmd.execute(null)).toThrow();
  });
});
