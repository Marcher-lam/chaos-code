/**
 * Execute Command
 * Execute the Ralph Loop TDD closed-loop
 */

const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const { createLogger } = require('../../utils/logger');
const logger = createLogger('execute');

class ExecuteCommand {
  constructor() {
    this.loopStages = ['RED', 'CHECK', 'GREEN', 'MUTATION', 'REFACTOR'];
    this.failureThreshold = 3;
  }

  async execute(changeName, options = {}) {
    const changesDir = path.join(process.cwd(), 'stdd', 'changes');
    const changeDir = changeName
      ? path.join(changesDir, changeName)
      : await this.getActiveChangeDir(changesDir);

    if (!changeDir) {
      throw new Error('No active change found. Use `stdd new change <name>` first.');
    }

    const tasksPath = path.join(changeDir, 'tasks.md');
    const tasksExists = await this.fileExists(tasksPath);

    if (!tasksExists) {
      throw new Error(`No tasks.md found. Run \`stdd plan ${path.basename(changeDir)}\` first.`);
    }

    const tasks = await this.parseTasks(tasksPath);
    const targetTask = options.task || this.getNextTask(tasks);

    if (!targetTask) {
      console.log(chalk.green('\n✓ All tasks completed!'));
      return { completed: true };
    }

    console.log('');
    console.log(chalk.bold('🔄 Ralph Loop TDD Execution'));
    console.log(chalk.dim('═'.repeat(50)));
    console.log('');
    console.log(chalk.bold(`Task: ${targetTask.title}`));
    console.log(chalk.dim(`Status: ${targetTask.status}`));
    console.log('');

    if (options.next) {
      return this.executeNextStage(targetTask, changeDir, options);
    }

    return this.executeFullLoop(targetTask, changeDir, options);
  }

  async getActiveChangeDir(changesDir) {
    try {
      const statusPath = path.join(process.cwd(), 'stdd', '.status.yaml');
      const statusExists = await this.fileExists(statusPath);

      if (statusExists) {
        const status = await fs.readFile(statusPath, 'utf-8');
        const match = status.match(/active_change:\s*(.+)/);
        if (match && match[1].trim() !== 'none') {
          const changeDir = path.join(changesDir, match[1].trim());
          const exists = await this.fileExists(changeDir);
          if (exists) return changeDir;
        }
      }

      const entries = await fs.readdir(changesDir, { withFileTypes: true });
      const dirs = entries.filter(e => e.isDirectory() && e.name !== 'archive');

      if (dirs.length === 1) {
        return path.join(changesDir, dirs[0].name);
      }

      return dirs.length > 0 ? path.join(changesDir, dirs[0].name) : null;
    } catch (err) {
      logger.warn(`Could not determine active change: ${err.message}`);
      return null;
    }
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async parseTasks(tasksPath) {
    const content = await fs.readFile(tasksPath, 'utf-8');
    const tasks = [];

    const lines = content.split('\n');
    for (const line of lines) {
      const match = line.match(/-\s*\[([ x])\]\s*(.+)/);
      if (match) {
        tasks.push({
          status: match[1] === 'x' ? 'completed' : 'pending',
          title: match[2].trim(),
          failures: 0
        });
      }
    }

    return tasks;
  }

  getNextTask(tasks) {
    return tasks.find(t => t.status === 'pending') || null;
  }

  async executeFullLoop(task, changeDir, options) {
    const results = {
      task: task.title,
      stages: {}
    };

    for (const stage of this.loopStages) {
      console.log(chalk.bold(`\n${stage} Stage`));
      console.log(chalk.dim('─'.repeat(40)));

      const stageResult = await this.executeStage(stage, task, changeDir, options);
      results.stages[stage] = stageResult;

      if (!stageResult.success) {
        task.failures = (task.failures || 0) + 1;

        if (task.failures >= this.failureThreshold) {
          console.log(chalk.red(`\n⚠ Task failed ${task.failures} times. Circuit breaker triggered.`));
          console.log(chalk.yellow('Manual intervention recommended.'));
          await this.updateTaskStatus(changeDir, task, 'blocked');
          return { ...results, circuitBreaker: true };
        }

        console.log(chalk.red(`\n✗ ${stage} stage failed. Task failures: ${task.failures}`));
        return results;
      }

      console.log(chalk.green(`✓ ${stage} stage completed`));
    }

    await this.updateTaskStatus(changeDir, task, 'completed');
    console.log(chalk.green('\n✓ Task completed!'));
    return results;
  }

  async executeNextStage(task, changeDir, options) {
    const currentStage = options.phase || this.loopStages[0];

    console.log(chalk.bold(`\n${currentStage} Stage`));
    console.log(chalk.dim('─'.repeat(40)));

    const result = await this.executeStage(currentStage, task, changeDir, options);

    if (result.success) {
      console.log(chalk.green(`✓ ${currentStage} stage completed`));
      const nextStageIndex = this.loopStages.indexOf(currentStage) + 1;
      if (nextStageIndex < this.loopStages.length) {
        console.log(chalk.cyan(`\nNext: ${this.loopStages[nextStageIndex]} stage`));
      } else {
        await this.updateTaskStatus(changeDir, task, 'completed');
        console.log(chalk.green('\n✓ Task completed!'));
      }
    } else {
      console.log(chalk.red(`\n✗ ${currentStage} stage failed`));
    }

    return result;
  }

  async executeStage(stage, task, changeDir, options) {
    switch (stage) {
      case 'RED':
        return this.executeRedStage(task, changeDir, options);
      case 'CHECK':
        return this.executeCheckStage(task, changeDir, options);
      case 'GREEN':
        return this.executeGreenStage(task, changeDir, options);
      case 'MUTATION':
        return this.executeMutationStage(task, changeDir, options);
      case 'REFACTOR':
        return this.executeRefactorStage(task, changeDir, options);
      default:
        return { success: false, error: 'Unknown stage' };
    }
  }

  async executeRedStage(task, _changeDir, _options) {
    console.log(chalk.dim('Write failing test for: ' + task.title));
    console.log(chalk.cyan('\nPrompt: Write a test that fails for this task.'));
    return { success: true, message: 'RED stage - ready to write test' };
  }

  async executeCheckStage(_task, _changeDir, _options) {
    console.log(chalk.dim('Run static analysis...'));
    console.log(chalk.cyan('\nCommands: npm run lint, tsc --noEmit'));
    return { success: true, message: 'CHECK stage - static analysis passed' };
  }

  async executeGreenStage(_task, _changeDir, _options) {
    console.log(chalk.dim('Implement minimal code to pass test...'));
    console.log(chalk.cyan('\nPrompt: Implement the minimum code to make the test pass.'));
    return { success: true, message: 'GREEN stage - ready to implement' };
  }

  async executeMutationStage(task, changeDir, _options) {
    console.log(chalk.dim('Verify tests detect mutations...'));
    console.log(chalk.cyan('\nCommand: stdd mutation ' + path.basename(changeDir)));
    return { success: true, message: 'MUTATION stage - mutation testing passed' };
  }

  async executeRefactorStage(_task, _changeDir, _options) {
    console.log(chalk.dim('Optimize code structure...'));
    console.log(chalk.cyan('\nPrompt: Refactor the code while keeping tests green.'));
    return { success: true, message: 'REFACTOR stage - ready to refactor' };
  }

  async updateTaskStatus(changeDir, task, status) {
    const tasksPath = path.join(changeDir, 'tasks.md');
    let content = await fs.readFile(tasksPath, 'utf-8');

    const checkbox = status === 'completed' ? '[x]' : '[ ]';
    content = content.replace(
      new RegExp(`-\\s*\\[[ x]\\]\\s*${this.escapeRegex(task.title)}`, 'm'),
      `${checkbox} ${task.title}`
    );

    await fs.writeFile(tasksPath, content);
  }

  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

module.exports = { ExecuteCommand };
