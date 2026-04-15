/**
 * List Command
 * List changes, specs, or other items
 */

const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');

class ListCommand {
  async execute(targetPath, options = {}) {
    const mode = options.specs ? 'specs' : 'changes';
    const stddDir = path.join(targetPath, 'stdd');

    if (mode === 'specs') {
      await this.listSpecs(stddDir, options);
    } else {
      await this.listChanges(stddDir, options);
    }
  }

  async listChanges(stddDir, options) {
    const changesDir = path.join(stddDir, 'changes');
    const archiveDir = path.join(changesDir, 'archive');

    try {
      const entries = await fs.readdir(changesDir, { withFileTypes: true });
      const activeChanges = entries
        .filter(e => e.isDirectory() && !e.name.startsWith('.'))
        .filter(e => e.name !== 'archive')
        .sort();
      const archivedChanges = options.archived
        ? await this.getArchivedChanges(archiveDir)
        : [];

      const hasAnyChanges = activeChanges.length > 0 || archivedChanges.length > 0;

      if (!hasAnyChanges) {
        console.log(chalk.yellow('No active changes found.'));
        console.log(chalk.dim('Create one with: /stdd:new <description>'));
        return;
      }

      if (options.json) {
        if (options.archived) {
          console.log(JSON.stringify({
            active: activeChanges.map(c => c.name),
            archived: archivedChanges.map(c => c.name)
          }, null, 2));
        } else {
          console.log(JSON.stringify(activeChanges.map(c => c.name), null, 2));
        }
        return;
      }

      if (activeChanges.length > 0) {
        console.log(chalk.bold('\n📋 Active Changes\n'));

        for (const change of activeChanges) {
          const changeDir = path.join(changesDir, change.name);
          const status = await this.getChangeStatus(changeDir);
          const statusIcon = status.hasProposal ? '📝' : '❓';
          const tasksProgress = status.tasksCompleted
            ? ` ${status.tasksCompleted}/${status.totalTasks}`
            : '';

          console.log(`  ${statusIcon} ${chalk.cyan(change.name)}${tasksProgress}`);

          if (status.title) {
            console.log(`     ${chalk.dim(status.title)}`);
          }
        }
      } else {
        console.log(chalk.yellow('\nNo active changes found.'));
      }

      if (options.archived) {
        if (archivedChanges.length > 0) {
          console.log(chalk.bold('\n📦 Archived Changes\n'));
          for (const change of archivedChanges) {
            console.log(`  📦 ${chalk.cyan(change.name)}`);
          }
        } else {
          console.log(chalk.dim('\nNo archived changes found.'));
        }
      }

      console.log(chalk.dim('\nUse `stdd status <change>` for details.'));
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(chalk.yellow('STDD not initialized. Run `stdd init` first.'));
      } else {
        throw error;
      }
    }
  }

  async getArchivedChanges(archiveDir) {
    try {
      const entries = await fs.readdir(archiveDir, { withFileTypes: true });
      return entries
        .filter(e => e.isDirectory() && !e.name.startsWith('.'))
        .sort();
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async listSpecs(stddDir, options) {
    const specsDir = path.join(stddDir, 'specs');

    try {
      const entries = await fs.readdir(specsDir, { withFileTypes: true });
      const domains = entries
        .filter(e => e.isDirectory() && !e.name.startsWith('.'))
        .sort();

      if (domains.length === 0) {
        console.log(chalk.yellow('No specs found.'));
        console.log(chalk.dim('Specs are created through the /stdd:new workflow.'));
        return;
      }

      if (options.json) {
        console.log(JSON.stringify(domains.map(d => d.name), null, 2));
        return;
      }

      console.log(chalk.bold('\n📚 Specs\n'));

      for (const domain of domains) {
        const specFile = path.join(specsDir, domain.name, 'spec.md');
        const stat = await fs.stat(specFile).catch(() => null);
        const modified = stat ? stat.mtime.toLocaleDateString() : 'N/A';

        console.log(`  📄 ${chalk.cyan(domain.name)} ${chalk.dim(`(modified: ${modified})`)}`);
      }

    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(chalk.yellow('STDD not initialized. Run `stdd init` first.'));
      } else {
        throw error;
      }
    }
  }

  async getChangeStatus(changeDir) {
    const status = {
      hasProposal: false,
      title: null,
      tasksCompleted: 0,
      totalTasks: 0
    };

    try {
      const proposalPath = path.join(changeDir, 'proposal.md');
      await fs.access(proposalPath);
      status.hasProposal = true;

      const content = await fs.readFile(proposalPath, 'utf-8');
      const titleMatch = content.match(/^#\s+(.+)$/m);
      if (titleMatch) {
        status.title = titleMatch[1].replace('Proposal:', '').trim();
      }
    } catch {
      // Proposal doesn't exist
    }

    try {
      const tasksPath = path.join(changeDir, 'tasks.md');
      const content = await fs.readFile(tasksPath, 'utf-8');
      const completed = (content.match(/\[x\]/gi) || []).length;
      const total = (content.match(/\[[ x]\]/gi) || []).length;
      status.tasksCompleted = completed;
      status.totalTasks = total;
    } catch {
      // Tasks don't exist
    }

    return status;
  }
}

module.exports = { ListCommand };
