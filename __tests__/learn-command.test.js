const fs = require('fs');
const path = require('path');
const os = require('os');
const { LearnCommand } = require('../src/cli/commands/learn');

function setupSrc() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-learn-'));
  const src = path.join(tmp, 'src');
  fs.mkdirSync(src);
  fs.writeFileSync(path.join(src, 'index.js'), 'const express = require("express");\nmodule.exports = { hello };\nasync function hello() { return await fetch("/api"); }\n');
  fs.writeFileSync(path.join(src, 'utils.js'), 'function add(a, b) { return a + b; }\n// TODO: refactor\n');
  return tmp;
}

describe('LearnCommand', () => {
  it('scan writes code-patterns.json and styleguide.md', () => {
    const tmp = setupSrc();
    const cmd = new LearnCommand(tmp);
    const result = cmd.execute('scan');
    expect(result.generatedAt).toBeDefined();
    expect(fs.existsSync(path.join(tmp, 'stdd', 'memory', 'learning', 'code-patterns.json'))).toBe(true);
    expect(fs.existsSync(path.join(tmp, 'stdd', 'memory', 'learning', 'styleguide.md'))).toBe(true);
  });

  it('status returns current patterns', () => {
    const tmp = setupSrc();
    const cmd = new LearnCommand(tmp);
    cmd.execute('scan');
    const result = cmd.execute('status');
    expect(result.patterns).toBeDefined();
    expect(result.feedbackCount).toBe(0);
  });

  it('good records feedback', () => {
    const tmp = setupSrc();
    const cmd = new LearnCommand(tmp);
    cmd.execute('scan');
    const result = cmd.execute('good', ['nice naming']);
    expect(result).toBeDefined();
  });

  it('bad records feedback', () => {
    const tmp = setupSrc();
    const cmd = new LearnCommand(tmp);
    cmd.execute('scan');
    const result = cmd.execute('bad', ['ugly code']);
    expect(result).toBeDefined();
  });

  it('throws on empty feedback', () => {
    const tmp = setupSrc();
    const cmd = new LearnCommand(tmp);
    cmd.execute('scan');
    expect(() => cmd.execute('good', [])).toThrow();
  });
});
