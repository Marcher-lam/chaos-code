/**
 * Validate Command
 * Runtime spec validation plus Spec Guardian leakage checks.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { findActiveChange, parseTasks } = require('../../utils/change-utils');
const EvidenceCapture = require('../../utils/evidence-capture');
const { walkFiles } = require('../../utils/file-walker');

const GWT_PATTERN = /^\s*(?:[-*]\s*)?(Given|When|Then|And|But)\b/i;

const LEAKAGE_RULES = [
  {
    id: 'code-path',
    severity: 'blocking',
    pattern: /(?:src|lib|app|packages|tests?)\/[\w./-]+\.(?:js|jsx|ts|tsx|py|go|rs|java|php)/i,
    message: 'Spec references source/test file paths; use domain language instead.',
  },
  {
    id: 'implementation-type',
    severity: 'warning',
    pattern: /\b(class|function|method|component|hook|middleware|repository|controller|service)\b/i,
    message: 'Spec appears to mention implementation types.',
  },
  {
    id: 'database-detail',
    severity: 'warning',
    pattern: /\b(table|column|SQL|migration|index|foreign key|primary key)\b/i,
    message: 'Spec appears to mention database implementation details.',
  },
  {
    id: 'api-detail',
    severity: 'warning',
    pattern: /\b(GET|POST|PUT|PATCH|DELETE)\s+\/[\w/{}/:-]+|\b(endpoint|REST|GraphQL|OpenAPI)\b/i,
    message: 'Spec appears to mention transport/API implementation details.',
  },
  {
    id: 'test-placeholder',
    severity: 'blocking',
    pattern: /\b(TODO|TBD|FIXME|placeholder)\b/i,
    message: 'Spec contains unresolved placeholder language.',
  },
];

function lineDiagnostics(filePath, cwd) {
  const relFile = path.relative(cwd, filePath).replace(/\\/g, '/');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const diagnostics = [];
  let scenarioCount = 0;
  let gwtCount = 0;

  for (const [index, line] of lines.entries()) {
    if (/^\s*(?:#{2,5}\s*)?Scenario\b/i.test(line)) scenarioCount++;
    if (GWT_PATTERN.test(line)) gwtCount++;

    for (const rule of LEAKAGE_RULES) {
      if (rule.pattern.test(line)) {
        diagnostics.push({
          file: relFile,
          line: index + 1,
          rule: rule.id,
          severity: rule.severity,
          message: rule.message,
          text: line.trim(),
          suggestion: 'Rewrite this line as externally observable behavior without naming implementation details.',
        });
      }
    }
  }

  if (scenarioCount === 0 && /\.(feature|md)$/.test(filePath)) {
    diagnostics.push({
      file: relFile,
      line: 1,
      rule: 'missing-scenario',
      severity: 'warning',
      message: 'Spec has no Scenario section.',
      text: '',
      suggestion: 'Add at least one Given/When/Then scenario.',
    });
  }

  if (scenarioCount > 0 && gwtCount === 0) {
    diagnostics.push({
      file: relFile,
      line: 1,
      rule: 'missing-gwt',
      severity: 'blocking',
      message: 'Scenario exists but no Given/When/Then steps were found.',
      text: '',
      suggestion: 'Add Given/When/Then steps to make the requirement testable.',
    });
  }

  return diagnostics;
}

class ValidateCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
  }

  execute(changeName, options = {}) {
    const stddDir = path.join(this.cwd, 'stdd');
    if (!fs.existsSync(stddDir)) {
      throw new Error('STDD not initialized. Run `stdd init` first.');
    }

    const changeDir = changeName ? findActiveChange(stddDir, changeName) : null;
    if (changeName && !changeDir) {
      throw new Error(`Change '${changeName}' not found.`);
    }
    const specsDir = changeDir ? path.join(changeDir, 'specs') : path.join(stddDir, 'specs');
    if (!fs.existsSync(specsDir)) {
      throw new Error(changeName ? `No specs directory found for change '${changeName}'.` : 'No stdd/specs directory found.');
    }

    const specFiles = walkFiles(specsDir, { predicate: file => /\.(feature|md)$/.test(file) });
    const diagnostics = specFiles.flatMap(file => lineDiagnostics(file, this.cwd));
    const taskReport = changeDir ? this.compareTasksToSpecs(changeDir, specFiles) : null;
    const blocking = diagnostics.filter(d => d.severity === 'blocking');
    const warning = diagnostics.filter(d => d.severity !== 'blocking');

    const report = {
      status: blocking.length > 0 ? 'fail' : 'pass',
      mode: options.specGuardian ? 'spec-guardian' : 'validate',
      change: changeDir ? path.basename(changeDir) : null,
      specFiles: specFiles.map(file => path.relative(this.cwd, file).replace(/\\/g, '/')),
      diagnostics,
      blocking: blocking.length,
      warning: warning.length,
      tasks: taskReport,
    };

    if (options.fix && diagnostics.length > 0) {
      report.fixOutput = this.writeRewriteSuggestions(changeDir || stddDir, diagnostics);
    }

    const capture = new EvidenceCapture();
    const evidence = capture.captureVerify('validate', report, {
      cwd: this.cwd,
      changeName: report.change,
      specGuardian: Boolean(options.specGuardian),
    });
    const evidencePath = capture.saveToFile(evidence, changeDir || stddDir, 'validate');
    report.evidence = path.relative(this.cwd, evidencePath).replace(/\\/g, '/');

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
      return report;
    }

    this.print(report);
    if (report.status === 'fail') process.exitCode = 1;
    return report;
  }

  compareTasksToSpecs(changeDir, specFiles) {
    const tasksPath = path.join(changeDir, 'tasks.md');
    const tasks = parseTasks(tasksPath) || [];
    const specText = specFiles.map(file => fs.readFileSync(file, 'utf8')).join('\n').toLowerCase();
    const uncovered = tasks
      .filter(task => !this.taskAppearsInSpecs(task.description, specText))
      .map(task => task.description);

    return {
      total: tasks.length,
      covered: Math.max(0, tasks.length - uncovered.length),
      uncovered,
    };
  }

  taskAppearsInSpecs(description, specText) {
    const words = String(description || '')
      .toLowerCase()
      .replace(/task-\d+[:：]?/g, '')
      .split(/[^a-z0-9\u4e00-\u9fa5]+/)
      .filter(word => word.length >= 3)
      .slice(0, 8);
    if (words.length === 0) return true;
    return words.some(word => specText.includes(word));
  }

  writeRewriteSuggestions(baseDir, diagnostics) {
    const outputPath = path.join(baseDir, 'spec-guardian-suggestions.md');
    const lines = ['# Spec Guardian Rewrite Suggestions', ''];
    for (const item of diagnostics) {
      lines.push(`## ${item.file}:${item.line}`);
      lines.push(`- Rule: ${item.rule}`);
      lines.push(`- Severity: ${item.severity}`);
      lines.push(`- Issue: ${item.message}`);
      if (item.text) lines.push(`- Current: ${item.text}`);
      lines.push(`- Suggestion: ${item.suggestion}`);
      lines.push('');
    }
    fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
    return path.relative(this.cwd, outputPath).replace(/\\/g, '/');
  }

  print(report) {
    console.log(chalk.bold(`\nSpec Validation${report.change ? `: ${report.change}` : ''}\n`));
    console.log(`  Specs:      ${report.specFiles.length}`);
    console.log(`  Blocking:   ${report.blocking > 0 ? chalk.red(report.blocking) : chalk.green(report.blocking)}`);
    console.log(`  Warnings:   ${report.warning > 0 ? chalk.yellow(report.warning) : chalk.green(report.warning)}`);
    if (report.tasks) {
      console.log(`  Task cover: ${report.tasks.covered}/${report.tasks.total}`);
    }
    for (const item of report.diagnostics) {
      const color = item.severity === 'blocking' ? chalk.red : chalk.yellow;
      console.log(`  ${color(item.severity.toUpperCase())} ${item.file}:${item.line} ${item.rule}`);
      console.log(`    ${item.message}`);
    }
    if (report.fixOutput) console.log(`\n  Suggestions: ${chalk.cyan(report.fixOutput)}`);
    console.log(`\n  Evidence: ${chalk.cyan(report.evidence)}`);
    console.log(report.status === 'pass' ? chalk.green('\nValidation passed\n') : chalk.red('\nValidation failed\n'));
  }
}

module.exports = { ValidateCommand, LEAKAGE_RULES };
