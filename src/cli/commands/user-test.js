const fs = require('fs');
const path = require('path');
const { resolveChangeDir } = require('../../utils/change-utils');
const { walkFiles } = require('../../utils/file-walker');

class UserTestCommand {
  constructor(cwd = process.cwd()) { this.cwd = cwd; }

  execute(changeName, options = {}) {
    const changeDir = changeName ? resolveChangeDir(path.join(this.cwd, 'stdd'), changeName) : null;
    const base = changeName ? path.join(changeDir || '', 'specs') : path.join(this.cwd, 'stdd', 'specs');
    if (!fs.existsSync(base)) throw new Error(`Spec directory not found: ${path.relative(this.cwd, base)}`);
    const scenarios = this.extractScenarios(walkFiles(base, { extensions: ['.feature', '.md'], skipDirs: new Set() }));
    const outputDir = changeName ? changeDir : path.join(this.cwd, 'stdd');
    const outputs = [];
    if (!options.agentOnly) outputs.push(this.writeHuman(outputDir, scenarios));
    if (!options.humanOnly) outputs.push(this.writeAgent(outputDir, scenarios));
    if (options.json) console.log(JSON.stringify({ scenarios: scenarios.length, outputs }, null, 2));
    else console.log(`Generated user test scripts: ${outputs.map(file => path.relative(this.cwd, file)).join(', ')}`);
    return { scenarios, outputs };
  }

  extractScenarios(files) {
    const scenarios = [];
    for (const file of files) {
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      let current = null;
      for (const line of lines) {
        const scenario = line.match(/^\s*(?:#{2,5}\s*)?Scenario:\s*(.+)$/i);
        if (scenario) {
          current = { name: scenario[1].trim(), steps: [], source: path.relative(this.cwd, file) };
          scenarios.push(current);
        } else if (current && /^\s*(?:[-*]\s*)?(Given|When|Then|And|But)\b/i.test(line)) {
          current.steps.push(line.trim().replace(/^[-*]\s*/, ''));
        }
      }
    }
    return scenarios;
  }

  writeHuman(dir, scenarios) {
    const file = path.join(dir, 'user-test-human.md');
    const lines = ['# Human User Test Script', '', 'Use think-aloud protocol. Record blockers, confusion, and time on task.', ''];
    for (const scenario of scenarios) {
      lines.push(`## ${scenario.name}`, '', `Source: ${scenario.source}`, '', 'Steps:');
      scenario.steps.forEach((step, index) => lines.push(`${index + 1}. ${step}`));
      lines.push('', 'Expected outcome:', '- User can complete the scenario without assistance.', '');
    }
    fs.writeFileSync(file, lines.join('\n'), 'utf8');
    return file;
  }

  writeAgent(dir, scenarios) {
    const file = path.join(dir, 'user-test-agent.json');
    const data = { generatedAt: new Date().toISOString(), scenarios: scenarios.map(s => ({ ...s, mode: 'agent', captureScreenshots: true })) };
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    return file;
  }
}

module.exports = { UserTestCommand };
