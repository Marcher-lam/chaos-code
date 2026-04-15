/**
 * Status Command
 * Show status of current work or specific change
 */

const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');

class StatusCommand {
  async execute(changeName, options = {}) {
    const stddDir = path.join(process.cwd(), 'stdd');

    if (!changeName) {
      await this.showOverallStatus(stddDir, options);
    } else {
      await this.showChangeStatus(stddDir, changeName, options);
    }
  }

  async showOverallStatus(stddDir, options) {
    // Check initialization
    const configPath = path.join(stddDir, 'config.yaml');
    const isInitialized = await this.exists(configPath);

    if (options.json) {
      if (!isInitialized) {
        console.log(JSON.stringify({
          initialized: false,
          message: 'STDD not initialized in this directory.'
        }, null, 2));
        return;
      }

      const payload = await this.buildOverallStatusPayload(stddDir, { silent: true });
      console.log(JSON.stringify(payload, null, 2));
      return;
    }

    console.log(chalk.bold('\n📊 STDD Copilot Status\n'));

    if (!isInitialized) {
      console.log(chalk.yellow('⚠️  STDD not initialized in this directory.'));
      console.log(chalk.dim('   Run `stdd init` to get started.'));
      return;
    }

    const payload = await this.buildOverallStatusPayload(stddDir, { silent: false });

    console.log(chalk.green('✅ STDD initialized'));

    console.log(`📚 Specs: ${chalk.cyan(payload.specs)} domains`);
    console.log(`🔄 Active changes: ${chalk.cyan(payload.changes)}`);

    // Show current work
    if (payload.currentChanges.length > 0) {
      console.log(chalk.bold('\n  Current Changes:\n'));
      for (const change of payload.currentChanges.slice(0, 5)) {
        console.log(`    ${change.icon} ${chalk.cyan(change.name)}`);
        if (change.title) {
          console.log(`       ${chalk.dim(change.title)}`);
        }
        if (change.tasksProgress) {
          console.log(`       Tasks: ${change.tasksProgress}`);
        }
        if (change.phase) {
          console.log(`       Phase: ${change.phase}`);
        }
      }
      if (payload.currentChanges.length > 5) {
        console.log(chalk.dim(`    ... and ${payload.currentChanges.length - 5} more`));
      }
    }

    console.log(`\n🧠 Memory: ${chalk.cyan(payload.memory)} files`);
  }

  async showChangeStatus(stddDir, changeName, options) {
    const changeDir = path.join(stddDir, 'changes', changeName);

    if (!await this.exists(changeDir)) {
      throw new Error(`Change '${changeName}' not found.`);
    }

    const status = await this.getDetailedStatus(changeDir, { silent: options.json });

    if (options.json) {
      console.log(JSON.stringify({
        change: changeName,
        ...status
      }, null, 2));
      return;
    }

    console.log(chalk.bold(`\n📋 Change: ${changeName}\n`));

    // Artifacts status
    console.log(chalk.bold('  Artifacts:'));
    console.log(`    ${status.hasProposal ? '✅' : '❌'} proposal.md`);
    console.log(`    ${status.hasSpecs ? '✅' : '❌'} specs/`);
    console.log(`    ${status.hasDesign ? '✅' : '❌'} design.md`);
    console.log(`    ${status.hasTasks ? '✅' : '❌'} tasks.md`);

    // Tasks progress
    if (status.totalTasks > 0) {
      console.log(chalk.bold('\n  Tasks:'));
      console.log(`    Progress: ${status.tasksCompleted}/${status.totalTasks}`);
      console.log(`    ${this.getProgressBar(status.tasksCompleted, status.totalTasks)}`);
    }

    // Phase
    if (status.phase) {
      console.log(chalk.bold('\n  Current Phase:'));
      console.log(`    ${status.phase}`);
    }
  }

  async exists(path) {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async countItems(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      return entries.filter(e => !e.name.startsWith('.')).length;
    } catch {
      return 0;
    }
  }

  async getActiveChanges(changesDir) {
    try {
      const entries = await fs.readdir(changesDir, { withFileTypes: true });
      return entries
        .filter(e => e.isDirectory() && !e.name.startsWith('.'))
        .filter(e => e.name !== 'archive')
        .map(e => e.name);
    } catch {
      return [];
    }
  }

  async buildOverallStatusPayload(stddDir, options = {}) {
    const specsDir = path.join(stddDir, 'specs');
    const specCount = await this.countItems(specsDir);

    const changesDir = path.join(stddDir, 'changes');
    const changes = await this.getActiveChanges(changesDir);
    const changeStatuses = [];
    for (const change of changes) {
      const status = await this.getDetailedStatus(path.join(changesDir, change), options);
      changeStatuses.push({
        name: change,
        ...status
      });
    }

    const memoryDir = path.join(stddDir, 'memory');
    const memoryFiles = await this.countItems(memoryDir);

    return {
      initialized: true,
      specs: specCount,
      changes: changes.length,
      memory: memoryFiles,
      currentChanges: changeStatuses
    };
  }

  async getDetailedStatus(changeDir, options = {}) {
    const { silent = false } = options;
    const status = {
      hasProposal: false,
      hasSpecs: false,
      hasDesign: false,
      hasTasks: false,
      title: null,
      tasksCompleted: 0,
      totalTasks: 0,
      tasksProgress: null,
      phase: null,
      icon: '❓'
    };

    // Check proposal
    try {
      const proposalPath = path.join(changeDir, 'proposal.md');
      await fs.access(proposalPath);
      status.hasProposal = true;

      const content = await fs.readFile(proposalPath, 'utf-8');
      const titleMatch = content.match(/^#\s+(.+)$/m);
      if (titleMatch) {
        status.title = titleMatch[1].replace('Proposal:', '').trim();
      }
    } catch (error) {
      if (!silent && error.code !== 'ENOENT') {
        console.error(chalk.dim(`Warning: could not check proposal.md - ${error.message}`));
      }
    }

    // Check specs
    try {
      const specsDir = path.join(changeDir, 'specs');
      const files = await fs.readdir(specsDir);
      status.hasSpecs = files.some(f => f.endsWith('.md'));
    } catch (error) {
      if (!silent && error.code !== 'ENOENT') {
        console.error(chalk.dim(`Warning: could not read specs/ - ${error.message}`));
      }
    }

    // Check design
    try {
      await fs.access(path.join(changeDir, 'design.md'));
      status.hasDesign = true;
    } catch (error) {
      if (!silent && error.code !== 'ENOENT') {
        console.error(chalk.dim(`Warning: could not check design.md - ${error.message}`));
      }
    }

    // Check tasks
    try {
      const tasksPath = path.join(changeDir, 'tasks.md');
      const content = await fs.readFile(tasksPath, 'utf-8');
      status.hasTasks = true;
      status.tasksCompleted = (content.match(/\[x\]/gi) || []).length;
      status.totalTasks = (content.match(/\[[ x]\]/gi) || []).length;
      if (status.totalTasks > 0) {
        status.tasksProgress = `${status.tasksCompleted}/${status.totalTasks}`;
      }
    } catch (error) {
      if (!silent && error.code !== 'ENOENT') {
        console.error(chalk.dim(`Warning: could not read tasks.md - ${error.message}`));
      }
    }

    // Determine phase
    if (!status.hasProposal) {
      status.phase = 'Phase 1: Proposal (pending)';
      status.icon = '📝';
    } else if (!status.hasSpecs) {
      status.phase = 'Phase 2: Specification';
      status.icon = '📋';
    } else if (!status.hasDesign) {
      status.phase = 'Phase 3: Design';
      status.icon = '🎨';
    } else if (status.totalTasks === 0 || status.tasksCompleted < status.totalTasks) {
      status.phase = 'Phase 4: Implementation';
      status.icon = '🔧';
    } else {
      status.phase = 'Phase 5: Verification';
      status.icon = '✅';
    }

    return status;
  }

  getProgressBar(completed, total) {
    const width = 30;
    const ratio = total > 0 ? completed / total : 0;
    const filled = Math.round(width * ratio);
    const empty = width - filled;

    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const percent = Math.round(ratio * 100);

    if (percent === 100) {
      return chalk.green(`    [${bar}] ${percent}%`);
    } else if (percent >= 50) {
      return chalk.yellow(`    [${bar}] ${percent}%`);
    } else {
      return chalk.red(`    [${bar}] ${percent}%`);
    }
  }
}

module.exports = { StatusCommand };
