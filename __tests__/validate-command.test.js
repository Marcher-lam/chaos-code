const fs = require('fs');
const path = require('path');
const os = require('os');
const { ValidateCommand, LEAKAGE_RULES } = require('../src/cli/commands/validate');

function setupWithSpecs() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-validate-'));
  const stdd = path.join(tmp, 'stdd');
  const specs = path.join(stdd, 'specs');
  const changes = path.join(stdd, 'changes');
  fs.mkdirSync(specs, { recursive: true });
  fs.mkdirSync(changes, { recursive: true });
  fs.writeFileSync(path.join(specs, 'clean.feature'),
    'Feature: Login\n  Scenario: Valid credentials\n    Given a registered user\n    When they submit login\n    Then access is granted\n'
  );
  return tmp;
}

describe('ValidateCommand', () => {
  it('has 5 leakage rules', () => {
    expect(LEAKAGE_RULES).toHaveLength(5);
  });

  it('passes on clean specs', () => {
    const tmp = setupWithSpecs();
    const cmd = new ValidateCommand(tmp);
    const result = cmd.execute(null, { json: true });
    expect(result.blocking).toBe(0);
    expect(result.status).toBe('pass');
  });

  it('detects code-path leakage', () => {
    const tmp = setupWithSpecs();
    fs.writeFileSync(path.join(tmp, 'stdd', 'specs', 'leaky.feature'),
      'Feature: Bad\n  Scenario: Leak\n    Given src/app/handler.js is loaded\n'
    );
    const cmd = new ValidateCommand(tmp);
    const result = cmd.execute(null, { json: true });
    expect(result.blocking).toBeGreaterThan(0);
    expect(result.diagnostics.some(d => d.rule === 'code-path')).toBe(true);
  });

  it('detects placeholder language', () => {
    const tmp = setupWithSpecs();
    fs.writeFileSync(path.join(tmp, 'stdd', 'specs', 'todo.feature'),
      'Feature: WIP\n  Scenario: TBD\n    Given TODO implement this\n'
    );
    const cmd = new ValidateCommand(tmp);
    const result = cmd.execute(null, { json: true });
    expect(result.blocking).toBeGreaterThan(0);
    expect(result.diagnostics.some(d => d.rule === 'test-placeholder')).toBe(true);
  });

  it('detects implementation type references', () => {
    const tmp = setupWithSpecs();
    fs.writeFileSync(path.join(tmp, 'stdd', 'specs', 'impl.feature'),
      'Feature: Impl\n  Scenario: Controller\n    Given the controller processes the request\n'
    );
    const cmd = new ValidateCommand(tmp);
    const result = cmd.execute(null, { json: true });
    expect(result.warning).toBeGreaterThan(0);
    expect(result.diagnostics.some(d => d.rule === 'implementation-type')).toBe(true);
  });

  it('sets exitCode on blocking issues', () => {
    const tmp = setupWithSpecs();
    fs.writeFileSync(path.join(tmp, 'stdd', 'specs', 'leaky.feature'),
      'Feature: Bad\n  Scenario: Leak\n    Given src/app.js runs\n'
    );
    process.exitCode = 0;
    const cmd = new ValidateCommand(tmp);
    cmd.execute(null);
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
  });

  it('throws when stdd dir missing', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-validate-nostdd-'));
    const cmd = new ValidateCommand(tmp);
    expect(() => cmd.execute(null)).toThrow();
  });
});
