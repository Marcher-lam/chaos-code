/**
 * Plan Command
 * Evaluate architecture changes and generate micro-task list
 */

const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const { createLogger } = require('../../utils/logger');
const { TechStackDetector } = require('../../utils/tech-stack-detector');
const logger = createLogger('plan');

class PlanCommand {
  constructor() {
    this.maxTasks = 6;
    this.maxTaskTime = 30;
  }

  async execute(changeName, options = {}) {
    const changesDir = path.join(process.cwd(), 'stdd', 'changes');
    const changeDir = changeName
      ? path.join(changesDir, changeName)
      : await this.getActiveChangeDir(changesDir);

    if (!changeDir) {
      throw new Error('No active change found. Use `stdd new change <name>` first.');
    }

    const proposalPath = path.join(changeDir, 'proposal.md');
    const proposalExists = await this.fileExists(proposalPath);

    if (!proposalExists) {
      throw new Error(`No proposal found. Create a proposal first.`);
    }

    const proposal = await fs.readFile(proposalPath, 'utf-8');
    const techStack = TechStackDetector.analyze(process.cwd());

    console.log('');
    console.log(chalk.bold('📋 Generating Task Breakdown'));
    console.log(chalk.dim('═'.repeat(50)));
    console.log('');
    console.log(chalk.dim('Analyzing requirements and tech stack...'));
    console.log('');

    const tasks = await this.generateTasks(proposal, techStack);
    const tasksContent = this.formatTasks(tasks);

    if (options.dryRun) {
      console.log(chalk.yellow('Dry run - tasks not saved'));
      console.log('');
      console.log(tasksContent);
      return tasks;
    }

    const tasksPath = path.join(changeDir, 'tasks.md');
    await fs.writeFile(tasksPath, tasksContent);

    console.log(chalk.green(`✓ Tasks generated: ${tasksPath}`));
    console.log('');
    this.printTaskSummary(tasks);
    console.log('');
    console.log(chalk.cyan(`Next step: stdd apply ${path.basename(changeDir)}`));
    console.log('');

    return tasks;
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

  async generateTasks(proposal, techStack) {
    const requirements = this.extractRequirements(proposal);
    const tasks = [];

    const taskTemplates = this.getTaskTemplates(requirements, techStack);

    for (let i = 0; i < Math.min(taskTemplates.length, this.maxTasks); i++) {
      tasks.push({
        id: `TASK-${String(i + 1).padStart(3, '0')}`,
        title: taskTemplates[i].title,
        description: taskTemplates[i].description,
        estimatedMinutes: taskTemplates[i].estimatedMinutes || this.maxTaskTime,
        dependencies: taskTemplates[i].dependencies || []
      });
    }

    return tasks;
  }

  extractRequirements(proposal) {
    const requirements = {
      title: this.extractField(proposal, 'title') || 'Untitled',
      description: this.extractField(proposal, 'description') || '',
      scope: this.extractField(proposal, 'scope') || '',
      constraints: this.extractField(proposal, 'constraints') || '',
      acceptance: this.extractField(proposal, 'acceptance') || this.extractField(proposal, 'success_criteria') || ''
    };

    return requirements;
  }

  extractField(content, fieldName) {
    const patterns = [
      new RegExp(`^#+\\s*${fieldName}\\s*\\n([\\s\\S]+?)(?=\\n#+|\\n*$)`, 'im'),
      new RegExp(`\\*\\*${fieldName}\\*\\*:\\s*([\\s\\S]+?)(?=\\n\\*\\*|\\n*$)`, 'im'),
      new RegExp(`${fieldName}:\\s*([\\s\\S]+?)(?=\\n\\w+:|\\n*$)`, 'im')
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  getTaskTemplates(requirements, techStack) {
    const templates = [
      {
        title: 'Set up test infrastructure',
        description: 'Configure test framework, test environment, and testing utilities',
        estimatedMinutes: 30,
        dependencies: []
      },
      {
        title: 'Write failing tests for core functionality',
        description: 'Create test cases that define the expected behavior',
        estimatedMinutes: 30,
        dependencies: ['TASK-001']
      },
      {
        title: 'Implement core data structures',
        description: 'Define the main data models and interfaces',
        estimatedMinutes: 30,
        dependencies: ['TASK-001']
      },
      {
        title: 'Implement core business logic',
        description: 'Write the minimum code to make tests pass',
        estimatedMinutes: 30,
        dependencies: ['TASK-002', 'TASK-003']
      },
      {
        title: 'Add error handling and edge cases',
        description: 'Handle invalid inputs and boundary conditions',
        estimatedMinutes: 30,
        dependencies: ['TASK-004']
      },
      {
        title: 'Run mutation testing',
        description: 'Verify tests detect code mutations',
        estimatedMinutes: 30,
        dependencies: ['TASK-004']
      }
    ];

    return templates;
  }

  formatTasks(tasks) {
    let content = `# Task Breakdown\n\n`;
    content += `Generated: ${new Date().toISOString()}\n\n`;
    content += `## Tasks\n\n`;

    for (const task of tasks) {
      content += `- [ ] **${task.id}**: ${task.title}\n`;
      content += `  - Estimated: ${task.estimatedMinutes} minutes\n`;
      if (task.dependencies.length > 0) {
        content += `  - Dependencies: ${task.dependencies.join(', ')}\n`;
      }
      if (task.description) {
        content += `  - ${task.description}\n`;
      }
      content += `\n`;
    }

    content += `## Guidelines\n\n`;
    content += `- Each task should be completable in ~${this.maxTaskTime} minutes\n`;
    content += `- Follow TDD: Red → Green → Refactor\n`;
    content += `- Mark tasks as completed when done\n\n`;

    return content;
  }

  printTaskSummary(tasks) {
    console.log(chalk.bold('Task Summary'));
    console.log(chalk.dim('─'.repeat(40)));
    console.log('');
    console.log(`Total Tasks: ${tasks.length}`);
    console.log(`Estimated Time: ${tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0)} minutes`);
    console.log('');
    console.log(chalk.bold('Tasks:'));
    console.log('');

    for (const task of tasks) {
      const deps = task.dependencies.length > 0 ? ` (deps: ${task.dependencies.join(', ')})` : '';
      console.log(`  ${chalk.cyan(task.id)}: ${task.title}${deps}`);
    }
    console.log('');
  }
}

module.exports = { PlanCommand };
