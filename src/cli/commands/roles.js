/**
 * Roles Command
 * Lightweight runtime for role listing, adversarial review, and party-mode analysis.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { walkFiles } = require('../../utils/file-walker');

const ROLES = [
  { id: 'po', name: 'Product Owner', lens: 'scope, value, acceptance criteria' },
  { id: 'developer', name: 'Developer', lens: 'implementation simplicity and maintainability' },
  { id: 'tester', name: 'Tester', lens: 'testability, edge cases, regression risk' },
  { id: 'reviewer', name: 'Reviewer', lens: 'defects, coupling, unclear intent' },
  { id: 'architect', name: 'Architect', lens: 'boundaries, dependencies, evolution' },
  { id: 'security', name: 'Security', lens: 'secrets, injection, unsafe defaults' },
  { id: 'devops', name: 'DevOps', lens: 'CI, deployability, operational safety' },
  { id: 'ux', name: 'UX', lens: 'user journey and error states' },
  { id: 'ba', name: 'Business Analyst', lens: 'business rules and process fit' },
  { id: 'techwriter', name: 'Tech Writer', lens: 'documentation and terminology' },
  { id: 'qalead', name: 'QA Lead', lens: 'quality strategy and release risk' },
  { id: 'dataanalyst', name: 'Data Analyst', lens: 'metrics, observability, data quality' },
];

const REVIEW_PATTERNS = [
  { role: 'security', severity: 'high', pattern: /password|secret|token|api[_-]?key|private[_-]?key/i, message: 'Potential secret-sensitive code or text needs review.' },
  { role: 'security', severity: 'high', pattern: /eval\(|new Function\(|child_process|execSync|spawnSync/i, message: 'Potential command/code execution risk.' },
  { role: 'tester', severity: 'medium', pattern: /\.skip\(|TODO|FIXME|placeholder/i, message: 'Skipped or placeholder work weakens validation.' },
  { role: 'tester', severity: 'medium', pattern: /expect\([^)]*\)\.toBeTruthy\(\)|assert\(true\)/i, message: 'Weak assertion may allow fake-green tests.' },
  { role: 'architect', severity: 'medium', pattern: /global\.|singleton|circular|TODO.*refactor/i, message: 'Architecture or coupling risk should be checked.' },
  { role: 'developer', severity: 'low', pattern: /console\.log\(|debugger;/i, message: 'Debug artifacts should not ship unless intentional.' },
  { role: 'techwriter', severity: 'low', pattern: /TBD|lorem ipsum|xxx/i, message: 'Documentation has unresolved placeholder language.' },
];

class RolesCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
  }

  execute(action = 'list', args = [], options = {}) {
    switch (action) {
      case 'adversarial':
      case 'review':
        return this.adversarial(args[0] || '.', options);
      case 'party':
      case 'meeting':
        return this.party(args.join(' '), options);
      case 'list':
      default:
        return this.list(options);
    }
  }

  list(options = {}) {
    if (options.json) {
      console.log(JSON.stringify(ROLES, null, 2));
      return ROLES;
    }
    console.log(chalk.bold('\nSTDD Roles\n'));
    for (const role of ROLES) {
      console.log(`  ${chalk.cyan(role.id.padEnd(12))} ${role.name} - ${role.lens}`);
    }
    console.log('');
    return ROLES;
  }

  adversarial(target = '.', options = {}) {
    const targetPath = path.resolve(this.cwd, target);
    const files = fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()
      ? walkFiles(targetPath, { extensions: ['.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.rs', '.md', '.feature', '.yaml', '.yml', '.json'] })
      : fs.existsSync(targetPath) ? [targetPath] : [];
    if (files.length === 0) throw new Error(`No reviewable files found at '${target}'.`);

    const findings = [];
    for (const file of files) {
      const relFile = path.relative(this.cwd, file).replace(/\\/g, '/');
      let content;
      try { content = fs.readFileSync(file, 'utf8'); } catch { continue; }
      const lines = content.split('\n');
      for (const [index, line] of lines.entries()) {
        for (const rule of REVIEW_PATTERNS) {
          if (rule.pattern.test(line)) {
            findings.push({
              file: relFile,
              line: index + 1,
              role: rule.role,
              severity: rule.severity,
              message: rule.message,
              text: line.trim(),
            });
          }
        }
      }
    }

    const report = {
      target: path.relative(this.cwd, targetPath).replace(/\\/g, '/') || '.',
      filesReviewed: files.length,
      findings,
      status: findings.some(f => f.severity === 'high') ? 'fail' : 'pass',
    };
    const outputPath = this.saveReport('adversarial-review', report);
    report.output = outputPath;

    if (options.json) console.log(JSON.stringify(report, null, 2));
    else this.printAdversarial(report);
    if (report.status === 'fail') process.exitCode = 1;
    return report;
  }

  party(topic, options = {}) {
    if (!topic) topic = 'current change';
    const selected = (options.roles ? String(options.roles).split(',') : ['po', 'architect', 'developer', 'tester', 'security', 'reviewer'])
      .map(id => ROLES.find(role => role.id === id.trim()))
      .filter(Boolean);
    const contributions = selected.map(role => ({
      role: role.id,
      name: role.name,
      lens: role.lens,
      prompt: `Assess '${topic}' for ${role.lens}. State risks first, then one concrete recommendation.`,
    }));
    const report = { topic, roles: contributions, createdAt: new Date().toISOString() };
    const outputPath = this.saveReport('party-mode', report);
    report.output = outputPath;
    if (options.json) console.log(JSON.stringify(report, null, 2));
    else {
      console.log(chalk.bold('\nParty Mode Brief\n'));
      console.log(`  Topic: ${chalk.cyan(topic)}`);
      for (const item of contributions) {
        console.log(`\n  ${chalk.yellow(item.name)} (${item.role})`);
        console.log(`  ${item.prompt}`);
      }
      console.log(`\n  Output: ${chalk.cyan(outputPath)}\n`);
    }
    return report;
  }

  saveReport(prefix, report) {
    const dir = path.join(this.cwd, 'stdd', 'reports');
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `${prefix}-${Date.now()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf8');
    return path.relative(this.cwd, filePath).replace(/\\/g, '/');
  }

  printAdversarial(report) {
    console.log(chalk.bold('\nAdversarial Review\n'));
    console.log(`  Files reviewed: ${chalk.cyan(report.filesReviewed)}`);
    console.log(`  Findings:       ${report.findings.length ? chalk.yellow(report.findings.length) : chalk.green(0)}`);
    for (const finding of report.findings.slice(0, 30)) {
      const color = finding.severity === 'high' ? chalk.red : finding.severity === 'medium' ? chalk.yellow : chalk.dim;
      console.log(`  ${color(finding.severity.toUpperCase())} ${finding.file}:${finding.line} [${finding.role}]`);
      console.log(`    ${finding.message}`);
    }
    if (report.findings.length > 30) console.log(`  ... ${report.findings.length - 30} more finding(s)`);
    console.log(`\n  Output: ${chalk.cyan(report.output)}\n`);
  }
}

module.exports = { RolesCommand, ROLES, REVIEW_PATTERNS };
