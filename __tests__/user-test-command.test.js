const fs = require('fs');
const path = require('path');
const os = require('os');
const { UserTestCommand } = require('../src/cli/commands/user-test');

function setupWithSpecs(extraSetup) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-usertest-'));
  const specs = path.join(tmp, 'stdd', 'specs');
  fs.mkdirSync(specs, { recursive: true });
  fs.writeFileSync(path.join(specs, 'checkout.feature'),
    'Feature: Checkout\n  Scenario: Pay with card\n    Given cart has items\n    When user pays\n    Then order is created\n'
  );
  if (extraSetup) extraSetup(tmp);
  return tmp;
}

function setupChangeWithSpecs() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-usertest-chg-'));
  const changeDir = path.join(tmp, 'stdd', 'changes', 'my-change');
  const specs = path.join(changeDir, 'specs');
  fs.mkdirSync(specs, { recursive: true });
  fs.writeFileSync(path.join(specs, 'login.feature'),
    'Feature: Login\n  Scenario: Valid credentials\n    Given user on login page\n    When user submits credentials\n    Then user is logged in\n'
  );
  return { tmp, changeDir };
}

describe('UserTestCommand', () => {
  let logSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

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

  it('generates only agent output with agentOnly option', () => {
    const tmp = setupWithSpecs();
    const cmd = new UserTestCommand(tmp);
    const result = cmd.execute(null, { agentOnly: true });
    expect(result.outputs).toHaveLength(1);
    expect(result.outputs[0]).toContain('user-test-agent');
  });

  it('generates only human output with humanOnly option', () => {
    const tmp = setupWithSpecs();
    const cmd = new UserTestCommand(tmp);
    const result = cmd.execute(null, { humanOnly: true });
    expect(result.outputs).toHaveLength(1);
    expect(result.outputs[0]).toContain('user-test-human');
  });

  it('outputs JSON when json option is true', () => {
    const tmp = setupWithSpecs();
    const cmd = new UserTestCommand(tmp);
    const _result = cmd.execute(null, { json: true });

    const output = logSpy.mock.calls.map(c => c[0]).join('\n');
    const json = JSON.parse(output);
    expect(json.scenarios).toBeGreaterThan(0);
    expect(json.outputs).toHaveLength(2);
  });

  it('handles changeName to generate test scripts in change directory', () => {
    const { tmp, changeDir } = setupChangeWithSpecs();
    const cmd = new UserTestCommand(tmp);
    const result = cmd.execute('my-change');

    expect(result.scenarios.length).toBeGreaterThan(0);
    expect(result.outputs).toHaveLength(2);
    expect(result.outputs.every(f => f.startsWith(changeDir))).toBe(true);
  });

  it('outputs text summary without json option', () => {
    const tmp = setupWithSpecs();
    const cmd = new UserTestCommand(tmp);
    cmd.execute(null);

    const output = logSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('Generated user test scripts');
  });

  it('generates React testing library skeleton', () => {
    const tmp = setupWithSpecs();
    const cmd = new UserTestCommand(tmp);
    const result = cmd.execute(null, { framework: 'react' });
    expect(result.outputs.length).toBe(3);
    const reactSpec = result.outputs.find(f => f.endsWith('user-test-react.test.jsx'));
    expect(reactSpec).toBeDefined();
    const content = fs.readFileSync(reactSpec, 'utf8');
    expect(content).toContain("import React from 'react';");
    expect(content).toContain("describe('BDD User Test Scenarios (React)'");
    expect(content).toContain("test('Scenario: Pay with card'");
  });

  it('generates Vue test skeleton', () => {
    const tmp = setupWithSpecs();
    const cmd = new UserTestCommand(tmp);
    const result = cmd.execute(null, { framework: 'vue' });
    expect(result.outputs.length).toBe(3);
    const vueSpec = result.outputs.find(f => f.endsWith('user-test-vue.spec.js'));
    expect(vueSpec).toBeDefined();
    const content = fs.readFileSync(vueSpec, 'utf8');
    expect(content).toContain("import { mount } from '@vue/test-utils';");
    expect(content).toContain("describe('BDD User Test Scenarios (Vue)'");
  });

  it('generates Playwright E2E skeleton by default for unrecognized framework', () => {
    const tmp = setupWithSpecs();
    const cmd = new UserTestCommand(tmp);
    const result = cmd.execute(null, { framework: 'vanilla' });
    expect(result.outputs.length).toBe(3);
    const e2eSpec = result.outputs.find(f => f.endsWith('user-test-e2e.spec.js'));
    expect(e2eSpec).toBeDefined();
    const content = fs.readFileSync(e2eSpec, 'utf8');
    expect(content).toContain("const { test, expect } = require('@playwright/test');");
    expect(content).toContain("test.describe('BDD User Test Scenarios (Playwright E2E)'");
  });
});
