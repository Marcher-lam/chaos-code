/**
 * Apply Command
 * TDD runner with Red → Green → Refactor phase enforcement
 * Each task must pass through all three phases before completion.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { findActiveChange, parseTasks } = require('../../utils/change-utils');
const { injectReporter } = require('../../utils/reporter-injector');
const { resolveTestCommands, getConfigTestCommand } = require('../../utils/test-command-resolver');
const { commandToWorkspaceScope, resolveWorkspaceScope } = require('../../utils/workspace-scope');
const { runCommand: runParsedCommand } = require('../../utils/command-runner');
const { FixPacketCommand } = require('./fix-packet');

// TDD Phase State Machine
const TDD_PHASES = {
  RED: 'red',
  GREEN: 'green',
  REFACTOR: 'refactor',
  DONE: 'done',
};

const PHASE_LABELS = {
  red: '🔴 RED - Write failing test first',
  green: '🟢 GREEN - Minimal implementation',
  refactor: '🔵 REFACTOR - Improve code structure',
  done: '✅ DONE - Task complete',
};

const PHASE_ORDER = [TDD_PHASES.RED, TDD_PHASES.GREEN, TDD_PHASES.REFACTOR, TDD_PHASES.DONE];

function failNoTestCommand(phase = null) {
  const phasePrefix = phase ? `${phase.toUpperCase()} Phase ` : '';
  console.log(chalk.red(`\n❌ ${phasePrefix}requires test commands to be configured.`));
  console.log(chalk.yellow(`  Please configure a test command in stdd/config.yaml or pass --test-command`));
  console.log(chalk.dim(`  Use --allow-no-tests only for explicit non-code/documentation tasks.`));
  process.exitCode = 1;
}

function getCurrentPhase(taskPhase) {
  if (!taskPhase || !PHASE_ORDER.includes(taskPhase)) {
    return null;
  }
  return taskPhase;
}

function getTaskPhaseFromLine(taskLine) {
  const match = taskLine.match(/\[phase:(\w+)\]/);
  return match ? match[1] : null;
}

// getConfigTestCommand is imported from test-command-resolver module

function pickTask(tasks, options = {}) {
  if (options.task) {
    const target = String(options.task);
    return tasks.find(t =>
      !t.isDone && (t.description.includes(target) || t.line.includes(target))
    );
  }
  return tasks.find(t => !t.isDone);
}

function updateTaskLine(filePath, task, newStatus) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const oldLine = lines[task.index];
  if (!oldLine) {
    return;
  }
  const updatedLine = oldLine.replace(/\[([ ~x✓✓])\]/, `[${newStatus}]`);
  lines[task.index] = updatedLine;
  fs.writeFileSync(filePath, lines.join('\n'));
}

function updateTaskPhase(filePath, taskIndex, newPhase) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const oldLine = lines[taskIndex];
  if (!oldLine) return;

  let updatedLine = oldLine;
  if (/\[phase:\w+\]/.test(oldLine)) {
    updatedLine = oldLine.replace(/\[phase:\w+\]/, `[phase:${newPhase}]`);
  } else {
    updatedLine = oldLine.replace(/\]\s*/, `] [phase:${newPhase}] `);
  }
  lines[taskIndex] = updatedLine;
  fs.writeFileSync(filePath, lines.join('\n'));
}

function runCommand(cmd, cwd, additionalEnv) {
  const env = additionalEnv ? { ...process.env, ...additionalEnv } : undefined;
  return runParsedCommand(cmd, { cwd, stdio: 'inherit', env });
}

function writeLog(changeDir, entry) {
  const logPath = path.join(changeDir, 'apply.log');
  const line = `[${new Date().toISOString()}] ${JSON.stringify(entry)}\n`;
  fs.appendFileSync(logPath, line);
}

function writeEvidence(changeDir, name, data) {
  const evidenceDir = path.join(changeDir, 'evidence');
  fs.mkdirSync(evidenceDir, { recursive: true });
  const filePath = path.join(evidenceDir, `${name}-${Date.now()}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  return filePath;
}

function delegationPlan(resultStatus, testResults, options = {}) {
  if (resultStatus !== 'failed') return null;
  const engines = ['claude_code', 'cursor', 'copilot', 'qwen_code'];
  return {
    trigger: 'apply-test-failure',
    strategy: options.delegate ? 'delegate-requested' : 'recommend-delegation',
    suggestedEngines: engines,
    reason: 'Tests failed during apply; request a fresh model or role to inspect failing output before retrying.',
    failedCommands: testResults.filter(r => !r.passed).map(r => ({ workspace: r.workspaceName, command: r.command })),
  };
}

class ApplyCommand {
  async execute(changeName, options = {}) {
    const cwd = process.cwd();
    const stddDir = path.join(cwd, 'stdd');

    if (!fs.existsSync(stddDir)) {
      throw new Error('STDD not initialized. Run `stdd init` first.');
    }

    const changeDir = findActiveChange(stddDir, options.change || changeName);
    if (!changeDir) {
      throw new Error(options.change
        ? `Change '${options.change}' not found.`
        : 'No active changes found. Create one with `stdd new change <name>`.'
      );
    }

    const changeNameActual = path.basename(changeDir);
    const tasksPath = path.join(changeDir, 'tasks.md');
    const requestedWorkspace = options.workspace ? resolveWorkspaceScope(cwd, options.workspace) : null;

    if (!fs.existsSync(tasksPath)) {
      throw new Error(`tasks.md not found in ${changeNameActual}. Add tasks before running apply.`);
    }

    const tasks = parseTasks(tasksPath);
    if (!tasks || tasks.length === 0) {
      throw new Error(`No tasks found in ${changeNameActual}/tasks.md.`);
    }

    const selectedTask = pickTask(tasks, { task: options.task });
    if (!selectedTask) {
      console.log(chalk.green(`\n✅ All tasks completed in ${changeNameActual}`));
      return;
    }

    // Determine current TDD phase for this task
    const taskPhase = getTaskPhaseFromLine(selectedTask.line) || getCurrentPhase(selectedTask.tddPhase);
    const requestedPhase = options.phase;

    // If no phase specified in task or request, use legacy mode (direct test-and-mark)
    const useLegacyMode = !taskPhase && !requestedPhase;

    if (useLegacyMode) {
      return this._executeLegacyMode(changeDir, changeNameActual, tasksPath, selectedTask, options, requestedWorkspace);
    }

    // If user requested a specific phase, validate the transition
    if (requestedPhase) {
      if (!PHASE_ORDER.includes(requestedPhase)) {
        throw new Error(`Invalid phase '${requestedPhase}'. Valid phases: ${PHASE_ORDER.join(', ')}`);
      }

      const currentIdx = PHASE_ORDER.indexOf(taskPhase);
      const requestedIdx = PHASE_ORDER.indexOf(requestedPhase);

      if (requestedIdx < currentIdx) {
        throw new Error(`Cannot go back to phase '${requestedPhase}'. Current phase is '${taskPhase}'.`);
      }

      if (requestedIdx > currentIdx + 1) {
        throw new Error(`Cannot skip phase(s). Must complete '${taskPhase}' first before '${requestedPhase}'.`);
      }
    }

    // Determine the phase to execute
    const phase = requestedPhase || taskPhase;

    console.log(chalk.bold(`\n📌 Applying task in ${changeNameActual}:`));
    console.log(`  ${chalk.cyan(selectedTask.description)}`);
    console.log(`  ${PHASE_LABELS[phase]}\n`);

    if (options.dryRun) {
      const testCommands = resolveTestCommands(cwd, {
        testCommand: options.testCommand,
        configCommand: getConfigTestCommand(cwd),
        workspace: options.workspace,
      });
      console.log(`  ${chalk.yellow('Dry run mode')} — no commands will execute.`);
      if (testCommands.length > 0) {
        for (const testCommand of testCommands) {
          const rel = path.relative(cwd, testCommand.cwd) || '.';
          console.log(`  Test command would run (${testCommand.workspaceName}, ${rel}): ${chalk.cyan(testCommand.command)}`);
        }
      } else {
        console.log(`  ${chalk.dim('No test command configured.')}`);
      }
      return;
    }

    // RED Phase: Tests MUST fail before implementation
    if (phase === TDD_PHASES.RED) {
      return this._executeRedPhase(changeDir, changeNameActual, tasksPath, selectedTask, options, requestedWorkspace);
    }

    // GREEN Phase: Minimal implementation to make tests pass
    if (phase === TDD_PHASES.GREEN) {
      return this._executeGreenPhase(changeDir, changeNameActual, tasksPath, selectedTask, options, requestedWorkspace);
    }

    // REFACTOR Phase: Improve code structure while keeping tests green
    if (phase === TDD_PHASES.REFACTOR) {
      return this._executeRefactorPhase(changeDir, changeNameActual, tasksPath, selectedTask, options, requestedWorkspace);
    }
  }

  async _executeLegacyMode(changeDir, changeName, tasksPath, task, options, workspace) {
    const cwd = process.cwd();
    const testCommands = resolveTestCommands(cwd, {
      testCommand: options.testCommand,
      configCommand: getConfigTestCommand(cwd),
      workspace: workspace,
    });

    const e2eEvidence = options.e2eCommand ? this.runE2EProbe(options.e2eCommand, cwd, changeDir) : null;

    console.log(chalk.bold(`\n📌 Applying task in ${changeName}:`));
    console.log(`  ${chalk.cyan(task.description)}`);

    if (options.dryRun) {
      console.log(`  ${chalk.yellow('Dry run mode')} — no commands will execute.`);
      if (testCommands.length > 0) {
        for (const testCommand of testCommands) {
          const rel = path.relative(cwd, testCommand.cwd) || '.';
          console.log(`  Test command would run (${testCommand.workspaceName}, ${rel}): ${chalk.cyan(testCommand.command)}`);
        }
      } else {
        console.log(`  ${chalk.dim('No test command configured.')}`);
      }
      return;
    }

    updateTaskLine(tasksPath, task, '~');

    let resultStatus;
    const testResults = [];
    if (testCommands.length === 0) {
      // P0-1 Fix: In TDD mode, no test command should not silently complete.
      // Mark as failed and exit with error to enforce TDD discipline.
      failNoTestCommand();
      updateTaskLine(tasksPath, task, ' ');  // Keep task pending
      writeLog(changeDir, {
        change: changeName,
        task: task.description,
        command: '(none)',
        workspaces: [],
        status: 'failed',
        error: 'No test command configured. TDD requires tests to run.',
      });
      return;
    } else {
      console.log(`\n  ${chalk.dim('📡 STDD Reporter linked for better evidence')}`);

      for (const testCommand of testCommands) {
        const injected = injectReporter(testCommand.command, testCommand.cwd);
        const testCmd = injected.command;
        const testEnv = injected.env;
        const label = testCommand.source === 'workspace'
          ? `${testCommand.workspaceName} (${path.relative(cwd, testCommand.cwd)})`
          : testCommand.workspaceName;

        console.log(`  Running ${chalk.cyan(label)}: ${chalk.cyan(testCmd)}\n`);

        let result = runCommand(testCmd, testCommand.cwd, testEnv);

        if (result.status !== 0 && injected.command !== testCommand.command) {
          console.log(chalk.dim(`  Reporter injection failed, retrying without reporter...`));
          result = runCommand(testCommand.command, testCommand.cwd);
        }

        testResults.push({
          workspaceName: testCommand.workspaceName,
          source: testCommand.source,
          cwd: testCommand.cwd,
          command: testCommand.command,
          passed: result.status === 0,
          workspace: commandToWorkspaceScope(cwd, testCommand),
        });
      }

      resultStatus = testResults.every(result => result.passed) ? 'passed' : 'failed';
    }

    if (resultStatus === 'passed') {
      updateTaskLine(tasksPath, task, 'x');
      console.log(chalk.green(`\n✅ Task passed tests`));
    } else if (resultStatus === 'failed') {
      updateTaskLine(tasksPath, task, ' ');
      console.log(chalk.red(`\n✗ Task failed tests — reverted to pending`));
      const fixPacket = new FixPacketCommand(cwd).execute(changeName, {
        task: task.description,
        testCommand: testCommands.map(tc => tc.command).join(' && '),
        silent: true,
      });
      console.log(chalk.yellow(`  Fix packet: ${fixPacket.output}`));
    } else {
      updateTaskLine(tasksPath, task, 'x');
      console.log(chalk.dim(`\n  Task marked complete (tests skipped)`));
    }

    const workspaceResults = testResults.map(result => result.workspace).filter(Boolean);
    const logEntry = {
      change: changeName,
      task: task.description,
      command: testCommands.length > 0 ? testCommands.map(tc => tc.command).join(' && ') : '(none)',
      workspaces: testResults,
      status: resultStatus,
    };
    if (workspace) logEntry.workspace = workspace;
    else if (workspaceResults.length === 1) logEntry.workspace = workspaceResults[0];
    else if (workspaceResults.length > 1) logEntry.workspaceScopes = workspaceResults;

    const delegation = delegationPlan(resultStatus, testResults, options);
    if (delegation) {
      logEntry.delegation = delegation;
      const evidencePath = writeEvidence(changeDir, 'delegation', {
        status: 'recommend',
        change: changeName,
        task: task.description,
        delegation,
      });
      console.log(chalk.yellow(`  Delegation evidence: ${path.relative(cwd, evidencePath)}`));
    }
    if (e2eEvidence) logEntry.e2e = e2eEvidence;
    writeLog(changeDir, logEntry);

    if (resultStatus === 'failed') {
      process.exitCode = 1;
    }
  }

  async _executeRedPhase(changeDir, changeName, tasksPath, task, options, workspace) {
    const cwd = process.cwd();
    const testCommands = resolveTestCommands(cwd, {
      testCommand: options.testCommand,
      configCommand: getConfigTestCommand(cwd),
      workspace: workspace,
    });

    if (testCommands.length === 0) {
      if (options.allowNoTests) {
        console.log(chalk.yellow(`\n⚠ RED Phase skipped because --allow-no-tests was provided.`));
        updateTaskPhase(tasksPath, task.index, TDD_PHASES.GREEN);
        writeLog(changeDir, {
          change: changeName,
          task: task.description,
          phase: TDD_PHASES.RED,
          status: 'skipped',
          reason: '--allow-no-tests',
        });
        return;
      }
      failNoTestCommand(TDD_PHASES.RED);
      return;
    }

    // Run tests - they MUST fail in RED phase
    const testResults = await this._runTests(testCommands, cwd);
    const allFailed = testResults.every(r => !r.passed);

    if (!allFailed) {
      const passedTests = testResults.filter(r => r.passed);
      console.log(chalk.red(`\n❌ RED Phase Violation: ${passedTests.length} test(s) passed when they should fail!`));
      console.log(chalk.yellow(`  TDD requires tests to fail first before implementation.`));
      console.log(chalk.yellow(`  Please write a failing test for the new behavior.`));
      process.exitCode = 1;
      return;
    }

    console.log(chalk.green(`\n✅ Tests failed as expected (RED phase)`));
    updateTaskPhase(tasksPath, task.index, TDD_PHASES.GREEN);
    writeLog(changeDir, {
      change: changeName,
      task: task.description,
      phase: TDD_PHASES.RED,
      status: 'passed',
      message: 'Tests failed as expected, advancing to GREEN phase',
    });
  }

  async _executeGreenPhase(changeDir, changeName, tasksPath, task, options, workspace) {
    const cwd = process.cwd();
    const testCommands = resolveTestCommands(cwd, {
      testCommand: options.testCommand,
      configCommand: getConfigTestCommand(cwd),
      workspace: workspace,
    });

    const e2eEvidence = options.e2eCommand ? this.runE2EProbe(options.e2eCommand, cwd, changeDir) : null;

    if (testCommands.length === 0) {
      if (!options.allowNoTests) {
        failNoTestCommand(TDD_PHASES.GREEN);
        return;
      }
      console.log(chalk.yellow(`  No test command configured. Skipping test execution because --allow-no-tests was provided.`));
      updateTaskPhase(tasksPath, task.index, TDD_PHASES.REFACTOR);
      writeLog(changeDir, {
        change: changeName,
        task: task.description,
        phase: TDD_PHASES.GREEN,
        status: 'skipped',
      });
      return;
    }

    console.log(`\n  ${chalk.dim('📡 STDD Reporter linked for better evidence')}`);

    if (testCommands.length === 0) {
      if (!options.allowNoTests) {
        failNoTestCommand(TDD_PHASES.REFACTOR);
        return;
      }
      console.log(chalk.yellow(`  No test command configured. Marking complete because --allow-no-tests was provided.`));
      updateTaskLine(tasksPath, task, 'x');
      updateTaskPhase(tasksPath, task.index, TDD_PHASES.DONE);
      writeLog(changeDir, {
        change: changeName,
        task: task.description,
        phase: TDD_PHASES.REFACTOR,
        command: '(none)',
        workspaces: [],
        status: 'skipped',
        reason: '--allow-no-tests',
      });
      return;
    }

    const testResults = await this._runTests(testCommands, cwd);
    const allPassed = testResults.every(r => r.passed);

    if (allPassed) {
      console.log(chalk.green(`\n✅ Tests passed (GREEN phase)`));
      updateTaskPhase(tasksPath, task.index, TDD_PHASES.REFACTOR);

      const logEntry = {
        change: changeName,
        task: task.description,
        phase: TDD_PHASES.GREEN,
        command: testCommands.map(tc => tc.command).join(' && '),
        workspaces: testResults,
        status: 'passed',
      };
      if (workspace) logEntry.workspace = workspace;
      if (e2eEvidence) logEntry.e2e = e2eEvidence;
      writeLog(changeDir, logEntry);
    } else {
      const failedTests = testResults.filter(r => !r.passed);
      console.log(chalk.red(`\n❌ ${failedTests.length} test(s) still failing (GREEN phase)`));
      console.log(chalk.yellow(`  Implement the minimum code to make tests pass.`));

      const fixPacket = new FixPacketCommand(cwd).execute(changeName, {
        task: task.description,
        testCommand: testCommands.map(tc => tc.command).join(' && '),
        silent: true,
      });
      console.log(chalk.yellow(`  Fix packet: ${fixPacket.output}`));

      const delegation = delegationPlan('failed', testResults, options);
      if (delegation) {
        const evidencePath = writeEvidence(changeDir, 'delegation', {
          status: 'recommend',
          change: changeName,
          task: task.description,
          phase: TDD_PHASES.GREEN,
          delegation,
        });
        console.log(chalk.yellow(`  Delegation evidence: ${path.relative(cwd, evidencePath)}`));
      }

      writeLog(changeDir, {
        change: changeName,
        task: task.description,
        phase: TDD_PHASES.GREEN,
        command: testCommands.map(tc => tc.command).join(' && '),
        workspaces: testResults,
        status: 'failed',
      });
      process.exitCode = 1;
      return;
    }
  }

  async _executeRefactorPhase(changeDir, changeName, tasksPath, task, options, workspace) {
    const cwd = process.cwd();
    const testCommands = resolveTestCommands(cwd, {
      testCommand: options.testCommand,
      configCommand: getConfigTestCommand(cwd),
      workspace: workspace,
    });

    console.log(`\n  ${chalk.dim('📡 STDD Reporter linked for better evidence')}`);

    const testResults = await this._runTests(testCommands, cwd);
    const allPassed = testResults.every(r => r.passed);

    if (allPassed) {
      console.log(chalk.green(`\n✅ Tests still passing after refactoring (REFACTOR phase)`));
      updateTaskLine(tasksPath, task, 'x');
      updateTaskPhase(tasksPath, task.index, TDD_PHASES.DONE);

      const logEntry = {
        change: changeName,
        task: task.description,
        phase: TDD_PHASES.REFACTOR,
        command: testCommands.map(tc => tc.command).join(' && '),
        workspaces: testResults,
        status: 'passed',
      };
      if (workspace) logEntry.workspace = workspace;
      writeLog(changeDir, logEntry);

      console.log(chalk.green(`  Task marked as complete!`));
    } else {
      const failedTests = testResults.filter(r => !r.passed);
      console.log(chalk.red(`\n❌ ${failedTests.length} test(s) failing after refactoring!`));
      console.log(chalk.yellow(`  Refactoring must not change behavior. Revert and try again.`));

      writeLog(changeDir, {
        change: changeName,
        task: task.description,
        phase: TDD_PHASES.REFACTOR,
        command: testCommands.map(tc => tc.command).join(' && '),
        workspaces: testResults,
        status: 'failed',
      });
      process.exitCode = 1;
      return;
    }
  }

  async _runTests(testCommands, cwd) {
    const testResults = [];

    for (const testCommand of testCommands) {
      const injected = injectReporter(testCommand.command, testCommand.cwd);
      const testCmd = injected.command;
      const testEnv = injected.env;
      const label = testCommand.source === 'workspace'
        ? `${testCommand.workspaceName} (${path.relative(cwd, testCommand.cwd)})`
        : testCommand.workspaceName;

      console.log(`  Running ${chalk.cyan(label)}: ${chalk.cyan(testCmd)}\n`);

      let result = runCommand(testCmd, testCommand.cwd, testEnv);

      if (result.status !== 0 && injected.command !== testCommand.command) {
        console.log(chalk.dim(`  Reporter injection failed, retrying without reporter...`));
        result = runCommand(testCommand.command, testCommand.cwd);
      }

      testResults.push({
        workspaceName: testCommand.workspaceName,
        source: testCommand.source,
        cwd: testCommand.cwd,
        command: testCommand.command,
        passed: result.status === 0,
        workspace: commandToWorkspaceScope(cwd, testCommand),
      });
    }

    return testResults;
  }

  runE2EProbe(command, cwd, changeDir) {
    console.log(`\n  Running E2E probe: ${chalk.cyan(command)}\n`);
    const result = runCommand(command, cwd);
    const report = {
      status: result.status === 0 ? 'pass' : 'fail',
      command,
      timestamp: new Date().toISOString(),
    };
    const evidencePath = writeEvidence(changeDir, 'e2e', report);
    report.evidence = path.relative(cwd, evidencePath);
    return report;
  }
}

module.exports = { ApplyCommand };
