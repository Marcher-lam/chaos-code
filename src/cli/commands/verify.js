/**
 * Verify Command
 * Validates that a change is ready for archival:
 *   - All tasks in tasks.md are completed.
 *   - Test suite passes.
 *   - (Optional) Lint / type check.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const yaml = require('js-yaml');
const { findActiveChange, checkTasksCompletion } = require('../../utils/change-utils');
const { ConstitutionChecker } = require('./constitution-checker');
const EvidenceCapture = require('../../utils/evidence-capture');
const { injectReporter } = require('../../utils/reporter-injector');
const { resolveTestCommands, getConfigTestCommand } = require('../../utils/test-command-resolver');
const { commandToWorkspaceScope, resolveWorkspaceScope } = require('../../utils/workspace-scope');
const { findLatestMutationEvidence } = require('./mutation');
const { runCommand: runParsedCommand } = require('../../utils/command-runner');
const WorkspaceCache = require('../../utils/workspace-cache');

// getConfigTestCommand is now imported from test-command-resolver

function runCommand(cmd, cwd, additionalEnv) {
  const env = additionalEnv ? { ...process.env, ...additionalEnv } : undefined;
  return runParsedCommand(cmd, { cwd, stdio: 'pipe', env });
}

class VerifyCommand {
  async execute(changeName, options = {}) {
    const cwd = process.cwd();
    const stddDir = path.join(cwd, 'stdd');

    if (!fs.existsSync(stddDir)) {
      throw new Error('STDD not initialized. Run `stdd init` first.');
    }

    const resolvedName = options.change || changeName;
    const changeDir = findActiveChange(stddDir, resolvedName);
    if (!changeDir) {
      throw new Error(resolvedName
        ? `Change '${resolvedName}' not found.`
        : 'No active changes found. Create one with `stdd new change <name>`.'
      );
    }

    const changeNameActual = path.basename(changeDir);
    const report = { tasks: null, tests: null, lint: null, constitution: null, mutation: null };
    let healthy = true;
    const requestedWorkspace = options.workspace ? resolveWorkspaceScope(cwd, options.workspace) : null;

    // 0) Incremental cache check
    if (options.workspace && !options.force) {
      const wsCache = new WorkspaceCache(cwd);
      const cached = wsCache.getValidCache(options.workspace, 'verify');
      if (cached && cached.healthy) {
        console.log(chalk.bold(`\n🔍 Verifying ${chalk.cyan(changeNameActual)} (Workspace: ${options.workspace})`));
        console.log(chalk.green(`\n  [Cached] Workspace '${options.workspace}' is unmodified. Skipping checks.`));

        // Summary
        console.log(chalk.bold('\n📊 Verification Report [Cached]'));
        console.log(`  Tasks:       PASS  (Cached: all tasks assumed done or bypassed)`);
        console.log(`  Tests:       ${cached.tests && cached.tests.passed ? chalk.green('PASS') : chalk.red('FAIL')}`);
        if (cached.tests && cached.tests.workspaces && cached.tests.workspaces.length > 1) {
          for (const result of cached.tests.workspaces) {
            const rel = path.relative(cwd, result.cwd) || '.';
            console.log(`    ${result.workspaceName} (${rel}): ${result.passed ? chalk.green('PASS') : chalk.red('FAIL')}`);
          }
        }
        console.log(`  Constitution: ${cached.constitution && cached.constitution.status === 'pass' ? chalk.green('PASS') : chalk.red('FAIL')}`);
        if (cached.lint !== null && cached.lint !== undefined) {
          console.log(`  Lint:        ${cached.lint.passed ? chalk.green('PASS') : chalk.red('FAIL')}`);
        }
        console.log('');

        const capture = new EvidenceCapture();
        const metadata = {
          changeName: changeNameActual,
          os: process.platform,
          nodeVersion: process.version,
          cwd,
          workspace: requestedWorkspace,
          cached: true
        };
        const reportCached = {
          tasks: { allDone: true, done: 1, total: 1, pending: [] },
          tests: cached.tests,
          constitution: cached.constitution,
          lint: cached.lint,
          cached: true
        };
        const evidenceReport = capture.captureVerify('verify', reportCached, metadata);
        const evidencePath = capture.saveToFile(evidenceReport, changeDir, 'verify');
        const relativeEvidencePath = path.relative(cwd, evidencePath);
        console.log(`  ${chalk.dim('📝 Evidence saved to')} ${chalk.cyan(relativeEvidencePath)}`);
        console.log(chalk.green(`\n✅ Verification passed for ${changeNameActual} [Cached]`));
        return;
      }
    }

    // 1) Tasks check
    console.log(chalk.bold(`\n🔍 Verifying ${chalk.cyan(changeNameActual)}\n`));

    const taskCheck = checkTasksCompletion(changeDir);
    report.tasks = taskCheck;
    if (taskCheck.allDone) {
      console.log(`  ${chalk.green('✓')} Tasks: ${taskCheck.done}/${taskCheck.total} completed`);
    } else {
      console.log(`  ${chalk.red('✗')} Tasks: ${taskCheck.done}/${taskCheck.total} completed`);
      taskCheck.pending.forEach(d => {
        console.log(`      ${chalk.red('–')} ${d}`);
      });
      healthy = false;
    }

    // 2) Tests check
    const testCommands = resolveTestCommands(cwd, {
      testCommand: options.testCommand,
      configCommand: getConfigTestCommand(cwd),
      workspace: options.workspace,
    });
    if (testCommands.length > 0) {
      const testResults = [];
      console.log(`\n  📡 STDD Reporter linked for better evidence`);

      for (const testCommand of testCommands) {
        const injected = injectReporter(testCommand.command, testCommand.cwd);
        const testCmd = injected.command;
        const testEnv = injected.env;
        const label = testCommand.source === 'workspace'
          ? `${testCommand.workspaceName} (${path.relative(cwd, testCommand.cwd)})`
          : testCommand.workspaceName;

        console.log(`  Running ${chalk.cyan(label)}: ${chalk.cyan(testCmd)}`);

        let result = runCommand(testCmd, testCommand.cwd, testEnv);

        if (result.status !== 0 && result.error) {
          result.stderr = (result.stderr || '') + `\nCommand error: ${result.error.message}`;
        }

        if (result.status !== 0 && injected.command !== testCommand.command) {
          result = runCommand(testCommand.command, testCommand.cwd);
          if (result.error) {
            result.stderr = (result.stderr || '') + `\nCommand error: ${result.error.message}`;
          }
        }

        const testResult = {
          workspaceName: testCommand.workspaceName,
          source: testCommand.source,
          cwd: testCommand.cwd,
          command: testCommand.command,
          passed: result.status === 0,
          output: (result.stdout || ''),
          error: (result.stderr || ''),
        };
        const workspaceScope = commandToWorkspaceScope(cwd, testCommand);
        if (workspaceScope) {
          testResult.workspace = workspaceScope;
        }
        testResults.push(testResult);

        if (result.status === 0) {
          console.log(`  ${chalk.green('✓')} Tests (${label}): passed`);
        } else {
          console.log(`  ${chalk.red('✗')} Tests (${label}): failed`);
          if (result.stderr) {
            const tail = result.stderr.trim().split('\n').slice(-3).join('\n      ');
            console.log(`      ${chalk.dim(tail)}`);
          }
        }
      }

      const passed = testResults.every(result => result.passed);
      report.tests = {
        passed,
        output: testResults.map(result => result.output).filter(Boolean).join('\n'),
        error: testResults.map(result => result.error).filter(Boolean).join('\n'),
        workspaces: testResults,
      };
      const workspaceResults = testResults.map(result => result.workspace).filter(Boolean);
      if (requestedWorkspace) {
        report.tests.workspace = requestedWorkspace;
      } else if (workspaceResults.length === 1) {
        report.tests.workspace = workspaceResults[0];
      } else if (workspaceResults.length > 1) {
        report.tests.workspaces = testResults;
      }
      if (!passed) {
        healthy = false;
      }
    } else {
      console.log(`\n  ${chalk.yellow('⚠')} Tests: no test command configured (skipped)`);
      report.tests = { passed: null };
    }

    // 3) Constitution check
    if (options.constitution !== false) {
      console.log(`\n  ${chalk.bold('Constitution Compliance')}`);
      const checker = new ConstitutionChecker(cwd);
      const issues = checker.run();
      const hasBlocking = issues.blocking.length > 0;
      const hasWarnings = issues.warning.length > 0;
      report.constitution = { status: hasBlocking ? 'fail' : 'pass', issues };

      if (hasBlocking) {
        console.log(`  ${chalk.red('✗')} Constitution: ${issues.blocking.length} blocking issue(s)`);
        for (const b of issues.blocking) {
          console.log(`      ${chalk.red('✗')} Article ${b.article} (${b.name}): ${b.message}`);
        }
        healthy = false;
      } else if (hasWarnings) {
        console.log(`  ${chalk.yellow('⚠')} Constitution: passed with ${issues.warning.length} warning(s)`);
        for (const w of issues.warning) {
          console.log(`      ${chalk.yellow('⚠')} Article ${w.article} (${w.name}): ${w.message}`);
        }
      } else {
        console.log(`  ${chalk.green('✓')} Constitution: passed`);
      }

      if (issues.skipped.length > 0) {
        for (const s of issues.skipped) {
          console.log(`      ${chalk.dim('⊘ Article ' + s.article + ' (' + s.name + '): ' + s.reason)}`);
        }
      }
    } else {
      console.log(`\n  ${chalk.dim('Constitution: skipped (use --no-constitution)')}`);
      report.constitution = { status: 'pass', issues: { blocking: [], warning: [], info: [], skipped: [] } };
    }

    const mutationEvidence = findLatestMutationEvidence(cwd, {
      changeName: changeNameActual,
      workspace: requestedWorkspace || null,
    });
    if (mutationEvidence) {
      const score = (mutationEvidence.data.mutationScore !== undefined && mutationEvidence.data.mutationScore !== null) ? mutationEvidence.data.mutationScore : (mutationEvidence.data.score ?? null);
      report.mutation = {
        status: mutationEvidence.data.status,
        score,
        threshold: mutationEvidence.data.threshold,
        mode: mutationEvidence.data.mode,
        evidence: path.relative(cwd, mutationEvidence.filePath),
      };
      console.log(`\n  ${chalk.dim('Mutation: latest evidence')} ${report.mutation.status} (${score === null ? 'n/a' : score + '%'})`);
    } else {
      report.mutation = { status: 'skipped', reason: 'No mutation evidence found' };
      console.log(`\n  ${chalk.dim('Mutation: skipped (no evidence; run `stdd mutation`)')}`);
    }

    // 4) Optional lint check (--lint or --lint-command)
    if (options.lint || options.lintCommand) {
      const lintCmd = options.lintCommand || 'npm run lint';
      console.log(`\n  Running: ${chalk.cyan(lintCmd)}`);
      const result = runCommand(lintCmd, cwd);
      report.lint = { passed: result.status === 0, output: result.stdout, error: result.stderr };
      if (result.status === 0) {
        console.log(`  ${chalk.green('✓')} Lint: passed`);
      } else {
        // P0-4 Fix: Lint failure should affect verification health
        console.log(`  ${chalk.red('✗')} Lint: failed`);
        healthy = false;
      }
    } else {
      console.log(`\n  ${chalk.dim('Lint: skipped (use --lint to run "npm run lint")')}`);
      report.lint = null;
    }

    // 5) Visual Regression check
    let config = {};
    const configPath = path.join(stddDir, 'config.yaml');
    if (fs.existsSync(configPath)) {
      try {
        config = yaml.load(fs.readFileSync(configPath, 'utf8')) || {};
      } catch (e) {
        // ignore
      }
    }

    if (config.visual_regression && config.visual_regression.enabled && Array.isArray(config.visual_regression.routes)) {
      console.log(`\n  ${chalk.bold('Visual Regression Check')}`);
      const { BrowserCommand } = require('./browser');
      const browserCmd = new BrowserCommand(cwd);
      const visualResults = [];
      
      for (const route of config.visual_regression.routes) {
        console.log(`  Comparing route: ${chalk.cyan(route.name)} (${route.url})`);
        const compareResult = await browserCmd.compare(route.url, {
          name: route.name,
          threshold: route.threshold,
          width: route.width,
          height: route.height
        });
        
        visualResults.push({
          name: route.name,
          url: route.url,
          ...compareResult
        });
      }
      
      const allPassed = visualResults.every(r => r.status === 'pass');
      report.visual = { passed: allPassed, routes: visualResults };
      
      if (!allPassed) {
        console.log(`  ${chalk.red('✗')} Visual Regression: failed`);
        healthy = false;
      } else {
        console.log(`  ${chalk.green('✓')} Visual Regression: passed`);
      }
    }

    // Summary
    console.log(chalk.bold('\n📊 Verification Report'));
    console.log(`  Tasks:       ${report.tasks.allDone ? chalk.green('PASS') : chalk.red('FAIL')}  (${report.tasks.done}/${report.tasks.total})`);
    if (report.tests.passed !== null) {
      console.log(`  Tests:       ${report.tests.passed ? chalk.green('PASS') : chalk.red('FAIL')}`);
      if (report.tests.workspaces && report.tests.workspaces.length > 1) {
        for (const result of report.tests.workspaces) {
          const rel = path.relative(cwd, result.cwd) || '.';
          console.log(`    ${result.workspaceName} (${rel}): ${result.passed ? chalk.green('PASS') : chalk.red('FAIL')}`);
        }
      }
    } else {
      console.log(`  Tests:       ${chalk.yellow('SKIP')}`);
    }
    console.log(`  Constitution: ${report.constitution.status === 'pass' ? chalk.green('PASS') : chalk.red('FAIL')}`);
    if (report.lint !== null) {
      console.log(`  Lint:        ${report.lint.passed ? chalk.green('PASS') : chalk.red('FAIL')}`);
    }
    if (report.visual) {
      console.log(`  Visual:      ${report.visual.passed ? chalk.green('PASS') : chalk.red('FAIL')}`);
    }

    console.log('');

    const capture = new EvidenceCapture();
    const metadata = {
      changeName: changeNameActual,
      os: process.platform,
      nodeVersion: process.version,
      cwd,
    };
    const evidenceWorkspaceResults = report.tests && Array.isArray(report.tests.workspaces)
      ? report.tests.workspaces.map(result => result.workspace).filter(Boolean)
      : [];
    if (requestedWorkspace) {
      metadata.workspace = requestedWorkspace;
      report.workspace = requestedWorkspace;
    } else if (evidenceWorkspaceResults.length === 1) {
      metadata.workspace = evidenceWorkspaceResults[0];
      report.workspace = evidenceWorkspaceResults[0];
    } else if (evidenceWorkspaceResults.length > 1) {
      metadata.workspaces = evidenceWorkspaceResults;
      report.workspaces = evidenceWorkspaceResults;
    }
    const evidenceReport = capture.captureVerify('verify', report, metadata);
    const evidencePath = capture.saveToFile(evidenceReport, changeDir, 'verify');
    const relativeEvidencePath = path.relative(cwd, evidencePath);
    console.log(`  ${chalk.dim('📝 Evidence saved to')} ${chalk.cyan(relativeEvidencePath)}`);

    if (!healthy) {
      console.log(chalk.red(`✗ Verification failed for ${changeNameActual}`));
      process.exitCode = 1;
      return;
    }

    // Save successful verification to cache if scoped to a workspace
    if (options.workspace && healthy) {
      const wsCache = new WorkspaceCache(cwd);
      const cacheData = {
        tests: report.tests,
        constitution: report.constitution,
        lint: report.lint,
        healthy: true
      };
      wsCache.setCache(options.workspace, 'verify', cacheData);
    }

    console.log(chalk.green(`\n✅ Verification passed for ${changeNameActual}`));
  }
}

module.exports = { VerifyCommand };
