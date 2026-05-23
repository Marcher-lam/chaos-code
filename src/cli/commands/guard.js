/**
 * Guard Command
 * Global quality gate for CI / pre-commit. Checks the whole repository health.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const chalk = require('chalk');
const { createLogger } = require('../../utils/logger');
const logger = createLogger('guard');
const { ConstitutionChecker } = require('./constitution-checker');
const { TechStackDetector } = require('../../utils/tech-stack-detector');
const EvidenceCapture = require('../../utils/evidence-capture');
const { detectWorkspaces, resolveWorkspace, collectSourceDirs } = require('../../utils/workspace-detector');
const { resolveTestCommands } = require('../../utils/test-command-resolver');
const { commandToWorkspaceScope, detectWorkspaceScopes, resolveWorkspaceScope } = require('../../utils/workspace-scope');
const { parseCoverage } = require('../../utils/coverage-parser');
const { findLatestMutationEvidence } = require('./mutation');
const { walkFiles } = require('../../utils/file-walker');

const LINTER_TIMEOUT = 10000;

class GuardCommand {
  constructor(cwd) {
    this.cwd = cwd || process.cwd();
    this.workspaces = detectWorkspaces(this.cwd);
  }

  _getSourceDirs() {
    return collectSourceDirs(this.cwd, {
      workspace: this.focusWorkspace,
      workspaces: this.workspaces,
    });
  }

  async execute(options = {}) {
    this.focusWorkspace = null;
    const workspaceScope = options.workspace ? resolveWorkspaceScope(this.cwd, options.workspace) : null;
    if (options.workspace) {
      this.focusWorkspace = resolveWorkspace(this.cwd, options.workspace);
      if (!this.focusWorkspace) {
        throw new Error(`Workspace '${options.workspace}' not found.`);
      }
    }
    const report = {
      constitution: { status: 'pass', details: null },
      lint: { status: 'pass', details: null },
      coverage: { status: 'pass', details: null },
      testCommands: { status: 'pass', details: null },
      mutation: { status: 'skip', details: null },
    };
    let failed = false;

    const skipConstitution = options.constitution === false;

    // 1) Constitution Health
    if (!skipConstitution) {
      this._printSection('Constitution Health');
      const checker = new ConstitutionChecker(this.cwd, this.focusWorkspace ? { workspace: this.focusWorkspace } : {});
      const issues = checker.run();
      const hasBlocking = issues.blocking.length > 0;
      const hasWarning = issues.warning.length > 0;

      if (hasBlocking) {
        report.constitution.status = 'fail';
        report.constitution.details = issues;
        for (const b of issues.blocking) {
          console.log(`  ${chalk.red('✗')} Article ${b.article} (${b.name}): ${b.message}`);
        }
        failed = true;
      } else if (hasWarning) {
        report.constitution.status = 'warn';
        report.constitution.details = issues;
        for (const w of issues.warning) {
          console.log(`  ${chalk.yellow('⚠')} Article ${w.article} (${w.name}): ${w.message}`);
        }
      } else {
        report.constitution.status = 'pass';
        report.constitution.details = issues;
        console.log(`  ${chalk.green('✓')} No constitution issues`);
      }
    } else {
      report.constitution.status = 'skip';
      console.log(`  ${chalk.dim('Constitution: skipped')}`);
    }

    // 2) Lint Check
    this._printSection('Lint Check');
    const lintResult = this._runLint();
    if (lintResult.available) {
      report.lint.status = lintResult.exitCode === 0 ? 'pass' : 'warn';
      report.lint.details = lintResult;
      if (lintResult.exitCode === 0) {
        console.log(`  ${chalk.green('✓')} ${lintResult.type}: no issues`);
      } else {
        console.log(`  ${chalk.yellow('⚠')} ${lintResult.type}: ${lintResult.issueCount} issue(s)`);
        console.log(chalk.dim(`    Fix: npx eslint . --fix`));
        if (options.strict) {
          report.lint.status = 'fail';
          failed = true;
        }
      }
    } else {
      report.lint.status = 'skip';
      report.lint.details = lintResult;
      console.log(`  ${chalk.yellow('⚠')} No linter detected (skipped)`);
    }

    // 3) Coverage Gate
    this._printSection('Coverage Gate');
    const coverageResult = this._estimateCoverage();
    const coveragePct = coverageResult.coverageSource === 'report' ? coverageResult.lines.pct : coverageResult.ratio;
    const coverageThreshold = coverageResult.coverageSource === 'report' ? 80 : 20;
    report.coverage.status = coveragePct >= coverageThreshold ? 'pass' : 'warn';
    report.coverage.details = coverageResult;
    if (coverageResult.coverageSource === 'report') {
      console.log(`  Coverage report: ${path.relative(this.cwd, coverageResult.file)}`);
      console.log(`  Line coverage: ${coverageResult.lines.pct.toFixed(1)}%`);
      if (coverageResult.lines.pct < coverageThreshold) {
        console.log(`  ${chalk.yellow('⚠')} Line coverage below ${coverageThreshold}%`);
        console.log(chalk.dim(`    Fix: add tests to uncovered files (run npm run test:coverage for details)`));
      } else {
        console.log(`  ${chalk.green('✓')} Line coverage acceptable`);
      }
    } else if (coverageResult.sourceFiles > 0) {
      console.log(`  Source files: ${coverageResult.sourceFiles}, Test files: ${coverageResult.testFiles}`);
      console.log(`  Test ratio: ${coverageResult.ratio.toFixed(1)}%`);
      if (coverageResult.ratio < 20) {
        console.log(`  ${chalk.yellow('⚠')} Test ratio below 20%`);
        console.log(chalk.dim(`    Fix: write tests alongside source files (e.g. src/app.js → src/__tests__/app.test.js)`));
      } else {
        console.log(`  ${chalk.green('✓')} Test ratio acceptable`);
      }
    } else {
      report.coverage.status = 'skip';
      console.log(`  ${chalk.yellow('⚠')} No source files found (skipped)`);
    }

    // 4) Test Command Detection
    this._printSection('Test Commands');
    const testCommands = resolveTestCommands(this.cwd, { workspace: this.focusWorkspace || null });
    const commandCoverage = testCommands.map(testCommand => ({
      ...testCommand,
      workspace: commandToWorkspaceScope(this.cwd, testCommand),
    }));
    report.testCommands.details = {
      workspaceAware: this.workspaces.length > 0,
      workspaceCount: this.workspaces.length,
      commands: commandCoverage,
      coverage: commandCoverage.map(command => ({
        command: command.command,
        source: command.source,
        workspace: command.workspace || null,
      })),
    };
    if (testCommands.length > 0) {
      report.testCommands.status = 'pass';
      for (const testCommand of testCommands) {
        const rel = path.relative(this.cwd, testCommand.cwd) || '.';
        console.log(`  ${chalk.green('✓')} ${testCommand.workspaceName} (${rel}): ${testCommand.command}`);
      }
    } else {
      report.testCommands.status = 'skip';
      console.log(`  ${chalk.yellow('⚠')} No test commands detected (skipped)`);
      console.log(chalk.dim(`    Fix: add a "test" script to package.json or configure in stdd/config.yaml`));
    }

    // 5) Mutation Evidence Hint
    this._printSection('Mutation Evidence');
    const mutationEvidence = findLatestMutationEvidence(this.cwd, {
      workspace: workspaceScope || null,
    });
    if (mutationEvidence) {
      const score = mutationEvidence.data.mutationScore !== undefined ? mutationEvidence.data.mutationScore : mutationEvidence.data.score;
      report.mutation.status = mutationEvidence.data.status === 'fail' ? 'warn' : mutationEvidence.data.status;
      report.mutation.details = {
        status: mutationEvidence.data.status,
        score,
        threshold: mutationEvidence.data.threshold,
        mode: mutationEvidence.data.mode,
        evidence: path.relative(this.cwd, mutationEvidence.filePath),
      };
      console.log(`  ${chalk.green('✓')} Latest mutation evidence: ${report.mutation.details.evidence}`);
      console.log(`  Score: ${score === null ? 'n/a' : score + '%'} (threshold ${mutationEvidence.data.threshold || 80}%)`);
    } else {
      report.mutation.status = 'skip';
      report.mutation.details = { reason: 'No mutation evidence found' };
      console.log(`  ${chalk.yellow('⚠')} Mutation evidence missing (skipped; run \`stdd mutation\`)`);
    }

    // Print Report
    this._printReport(report);

    if (failed) {
      console.log(chalk.red.bold('\n❌ Guard Failed\n'));
      process.exitCode = 1;
    } else {
      console.log(chalk.green.bold('\n✅ Guard Passed\n'));
    }

    const capture = new EvidenceCapture();
    const testCount = report.coverage.details && Number.isFinite(report.coverage.details.testFiles) ? (report.coverage.details.sourceFiles + report.coverage.details.testFiles) : 0;
    const constArticles = report.constitution.details ? (
      (report.constitution.details.blocking || []).length +
      (report.constitution.details.warning || []).length +
      (report.constitution.details.info || []).length
    ) : 0;
    const constBlocking = report.constitution.details ? (report.constitution.details.blocking || []).length : 0;
    const constPassRate = constArticles > 0 ? ((constArticles - constBlocking) / constArticles * 100) : 100;

    const metadata = {
      os: process.platform,
      nodeVersion: process.version,
      constitutionPassRate: parseFloat(constPassRate.toFixed(1)),
      testCount,
      cwd: this.cwd,
      detectedWorkspaces: detectWorkspaceScopes(this.cwd),
      testCommandCoverage: report.testCommands.details.coverage,
      coverage: report.coverage.details,
    };
    if (workspaceScope) {
      metadata.workspace = workspaceScope;
      report.workspace = workspaceScope;
    } else if (metadata.detectedWorkspaces.length > 0) {
      metadata.workspaces = metadata.detectedWorkspaces;
      report.workspaces = metadata.detectedWorkspaces;
    }
    const evidenceReport = capture.captureVerify('guard', report, metadata);
    const stddDir = path.join(this.cwd, 'stdd');
    if (fs.existsSync(stddDir)) {
      const evidencePath = capture.saveToFile(evidenceReport, stddDir, 'guard');
      const relativeEvidencePath = path.relative(this.cwd, evidencePath);
      console.log(`  ${chalk.dim('📝 Evidence saved to')} ${chalk.cyan(relativeEvidencePath)}`);
    }

    return report;
  }

  _printSection(title) {
    console.log(chalk.bold(`\n${title}`));
    console.log(chalk.dim('  ' + '─'.repeat(40)));
  }

  _runLint() {
    const sourceDirs = this._getSourceDirs();
    if (sourceDirs.length === 0) {
      return { available: false, reason: 'No src/ directory' };
    }

    const techStack = TechStackDetector.analyze(this.cwd);

    if (techStack.language === 'node') {
      const pkgPath = path.join(this.cwd, 'package.json');
      let pkg;
      try {
        pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      } catch (err) {
        logger.warn(err.message);
        return { available: false, reason: 'Cannot read package.json' };
      }

      const deps = {
        ...((pkg && pkg.devDependencies) || {}),
        ...((pkg && pkg.dependencies) || {}),
      };

      if (deps.eslint) {
        const result = spawnSync('npx', ['eslint', '.', '--no-error-on-unmatched-pattern', '--format', 'compact'], {
          timeout: LINTER_TIMEOUT,
          stdio: ['pipe', 'pipe', 'pipe'],
          encoding: 'utf-8',
          cwd: this.cwd,
        });

        if (result.error) {
          return { available: false, reason: result.error.message };
        }

        const output = (result.stdout || '') + (result.stderr || '');
        const lines = output.split('\n').filter(l => l.trim() && /^[\w/.-]/.test(l.trim()));
        return {
          available: true,
          type: 'eslint',
          exitCode: result.status,
          issueCount: lines.length,
          output: result.stdout,
          stderr: result.stderr,
        };
      }
    }

    return { available: false, reason: 'No linter configured' };
  }

  _estimateCoverage() {
    const coverage = parseCoverage(this.focusWorkspace ? this.focusWorkspace.root : this.cwd);
    if (coverage.found && coverage.lines && coverage.lines.pct !== null) {
      return { ...coverage, coverageSource: 'report', workspaceCount: this.focusWorkspace ? 1 : this.workspaces.length };
    }

    const sourceDirs = this._getSourceDirs();
    if (sourceDirs.length === 0) {
      return { coverageSource: 'none', sourceFiles: 0, testFiles: 0, ratio: 0, workspaceCount: this.workspaces.length };
    }

    let sourceFiles = 0;
    let testFiles = 0;

    for (const srcDir of sourceDirs) {
      const files = walkFiles(srcDir, { extensions: ['.js', '.ts', '.py'] });
      for (const filePath of files) {
        const basename = path.basename(filePath);
        if (basename.includes('.test.') || basename.includes('.spec.') || basename.startsWith('test_')) {
          testFiles++;
        } else {
          sourceFiles++;
        }
      }
    }

    const total = sourceFiles + testFiles;
    const ratio = total > 0 ? (testFiles / total) * 100 : 0;

    return { coverageSource: 'estimate', sourceFiles, testFiles, ratio, workspaceCount: this.workspaces.length };
  }

  _printReport(report) {
    console.log(chalk.bold('\n🛡️  STDD Guard Report\n'));

    const statusLabel = (status) => {
      switch (status) {
        case 'pass': return chalk.green('PASS');
        case 'fail': return chalk.red('FAIL');
        case 'warn': return chalk.yellow('WARN');
        case 'skip': return chalk.dim('SKIP');
        default: return chalk.white(status);
      }
    };

    console.log(`  Constitution:  ${statusLabel(report.constitution.status)}`);
    console.log(`  Lint:          ${statusLabel(report.lint.status)}`);
    console.log(`  Coverage:      ${statusLabel(report.coverage.status)}`);
    console.log(`  Test Commands: ${statusLabel(report.testCommands.status)}`);
    console.log(`  Mutation:      ${statusLabel(report.mutation.status)}`);
  }
}

module.exports = { GuardCommand };
