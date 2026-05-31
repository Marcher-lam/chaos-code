/**
 * Commit TDD Command
 * Perform atomic git commit with TDD phase prefix (red:/green:/refactor:)
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { execSync } = require('child_process');
const { findActiveChange, parseTasks } = require('../../utils/change-utils');
const { createLogger } = require('../../utils/logger');
const { 
  buildPhaseSubject, 
  detectTddPhase, 
  extractIssue, 
  extractProposalTitle,
  buildBody 
} = require('./commit-msg');

const _logger = createLogger('commit-tdd');

class CommitTddCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.stddDir = path.join(cwd, 'stdd');
  }

  execute(action = 'commit', args = [], options = {}) {
    switch (action) {
      case 'commit':
      case 'do':
        return this.commit(args[0], options);
      case 'check':
        return this.check(args[0], options);
      case 'amend':
        return this.amend(args[0], options);
      case 'status':
        return this.status(options);
      default:
        return this.commit(action, options);
    }
  }

  async commit(changeName, options = {}) {
    if (!fs.existsSync(this.stddDir)) {
      throw new Error('STDD not initialized. Run `stdd init` first.');
    }

    const changeDir = findActiveChange(this.stddDir, changeName);

    if (!changeDir) {
      throw new Error(changeName
        ? `Change '${changeName}' not found.`
        : 'No active changes found.'
      );
    }

    const actualName = path.basename(changeDir);

    // Check git status
    const gitStatus = this.getGitStatus();
    if (gitStatus.staged.length === 0 && gitStatus.unstaged.length === 0) {
      throw new Error('No changes to commit. Make some changes first.');
    }

    // Parse tasks
    const tasksPath = path.join(changeDir, 'tasks.md');
    const tasks = fs.existsSync(tasksPath) ? parseTasks(tasksPath) : [];
    const completedTasks = tasks.filter(t => t.isDone);

    if (completedTasks.length === 0 && tasks.length > 0 && !options.allowIncomplete) {
      throw new Error('No completed tasks. Complete at least one task before committing.');
    }

    // Read proposal
    const proposalContent = this.readProposal(changeDir);
    const proposalTitle = extractProposalTitle(proposalContent) || actualName;

    // Detect phase or use provided
    const phase = options.phase || detectTddPhase(tasks, options);
    const issue = extractIssue(proposalContent, actualName, options);

    // Build commit message
    const subject = buildPhaseSubject(phase, issue, proposalTitle);
    const body = buildBody(completedTasks, actualName, changeDir);
    const fullMessage = subject + body;

    // Constitution check
    if (!options.skipConstitution) {
      console.log(chalk.dim('Running constitution check...'));
      try {
        execSync('stdd constitution check', { cwd: this.cwd, stdio: 'pipe' });
      } catch (err) {
        throw new Error('Constitution check failed. Use --skip-constitution to bypass.');
      }
    }

    // Stage files
    if (options.all || gitStatus.staged.length === 0) {
      console.log(chalk.dim('Staging files...'));
      execSync('git add -A', { cwd: this.cwd });
    }

    // Show preview
    if (options.dryRun || options.preview) {
      console.log(chalk.bold('\n📝 Commit Preview\n'));
      console.log(chalk.green(fullMessage));
      console.log();
      return { message: fullMessage, dryRun: true };
    }

    // Confirm
    if (!options.yes && process.stdin.isTTY) {
      const inquirer = require('inquirer');
      const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: 'Commit with this message?',
        default: false,
      }]);
      if (!confirm) {
        console.log(chalk.yellow('Commit cancelled.'));
        return { cancelled: true };
      }
    }

    // Execute commit
    try {
      const commitCmd = `git commit -m "${subject.replace(/"/g, '\\"')}" -m "${body.replace(/"/g, '\\"')}"`;
      execSync(commitCmd, { cwd: this.cwd, stdio: 'pipe' });

      console.log(chalk.bold('\n✓ Commit Created\n'));
      console.log(chalk.green(`  ${phase}: ${actualName}`));
      if (issue) console.log(chalk.dim(`  Issue #${issue}`));
      console.log(chalk.dim(`  ${completedTasks.length}/${tasks.length} tasks completed\n`));

      return { 
        committed: true, 
        phase, 
        change: actualName,
        hash: this.getLastCommitHash()
      };
    } catch (err) {
      throw new Error(`Commit failed: ${err.message}`);
    }
  }

  check(changeName, options = {}) {
    const changeDir = findActiveChange(this.stddDir, changeName);
    if (!changeDir) {
      throw new Error('No active change found.');
    }

    const actualName = path.basename(changeDir);
    const tasksPath = path.join(changeDir, 'tasks.md');
    const tasks = fs.existsSync(tasksPath) ? parseTasks(tasksPath) : [];
    const completedTasks = tasks.filter(t => t.isDone);

    const gitStatus = this.getGitStatus();
    const hasChanges = gitStatus.staged.length > 0 || gitStatus.unstaged.length > 0;

    const result = {
      change: actualName,
      ready: hasChanges && completedTasks.length > 0,
      hasChanges,
      tasksCompleted: completedTasks.length,
      tasksTotal: tasks.length,
      phase: detectTddPhase(tasks, options),
    };

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.bold(`\n🔍 Commit Readiness: ${actualName}\n`));
      console.log(`  Changes: ${result.hasChanges ? chalk.green('✓') : chalk.red('✗')}`);
      console.log(`  Tasks: ${chalk.cyan(`${result.tasksCompleted}/${result.tasksTotal}`)}`);
      console.log(`  Phase: ${chalk.cyan(result.phase)}`);
      console.log(`  Ready: ${result.ready ? chalk.green('Yes') : chalk.red('No')}\n`);
    }

    return result;
  }

  amend(changeName, options = {}) {
    const changeDir = findActiveChange(this.stddDir, changeName);
    if (!changeDir) {
      throw new Error('No active change found.');
    }

    const actualName = path.basename(changeDir);
    const tasks = parseTasks(path.join(changeDir, 'tasks.md')) || [];
    const proposalContent = this.readProposal(changeDir);
    const proposalTitle = extractProposalTitle(proposalContent) || actualName;

    const phase = options.phase || detectTddPhase(tasks, options);
    const issue = extractIssue(proposalContent, actualName, options);

    const subject = buildPhaseSubject(phase, issue, proposalTitle);
    const body = buildBody(tasks.filter(t => t.isDone), actualName, changeDir);
    const fullMessage = subject + body;

    if (options.dryRun) {
      console.log(chalk.bold('\n📝 Amended Commit Preview\n'));
      console.log(chalk.green(fullMessage));
      console.log();
      return { message: fullMessage, dryRun: true };
    }

    try {
      execSync(`git commit --amend -m "${subject.replace(/"/g, '\\"')}" -m "${body.replace(/"/g, '\\"')}"`, 
        { cwd: this.cwd, stdio: 'pipe' });

      console.log(chalk.bold('\n✓ Commit Amended\n'));
      return { amended: true, phase, change: actualName };
    } catch (err) {
      throw new Error(`Amend failed: ${err.message}`);
    }
  }

  status(options = {}) {
    const gitStatus = this.getGitStatus();
    const lastCommit = this.getLastCommit();

    const result = {
      branch: this.getCurrentBranch(),
      staged: gitStatus.staged.length,
      unstaged: gitStatus.unstaged.length,
      untracked: gitStatus.untracked.length,
      lastCommit: lastCommit ? {
        hash: lastCommit.hash,
        message: lastCommit.message,
        phase: this.detectPhaseFromMessage(lastCommit.message),
      } : null,
    };

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.bold('\n📊 Git Status\n'));
      console.log(`  Branch: ${chalk.cyan(result.branch)}`);
      console.log(`  Staged: ${chalk.cyan(result.staged)}`);
      console.log(`  Unstaged: ${chalk.cyan(result.unstaged)}`);
      console.log(`  Untracked: ${chalk.cyan(result.untracked)}`);
      if (result.lastCommit) {
        console.log(`  Last: ${chalk.cyan(result.lastCommit.phase)} ${chalk.dim(result.lastCommit.hash.slice(0, 8))}`);
      }
      console.log();
    }

    return result;
  }

  readProposal(changeDir) {
    const proposalPath = path.join(changeDir, 'proposal.md');
    if (!fs.existsSync(proposalPath)) return null;
    return fs.readFileSync(proposalPath, 'utf-8');
  }

  getGitStatus() {
    try {
      const output = execSync('git status --porcelain', { 
        cwd: this.cwd, 
        encoding: 'utf-8' 
      });
      
      const lines = output.trim().split('\n').filter(Boolean);
      const staged = [];
      const unstaged = [];
      const untracked = [];

      for (const line of lines) {
        const status = line.slice(0, 2);
        const file = line.slice(3);
        if (status[0] !== ' ' && status[0] !== '?') staged.push(file);
        if (status[1] !== ' ') unstaged.push(file);
        if (status === '??') untracked.push(file);
      }

      return { staged, unstaged, untracked };
    } catch {
      return { staged: [], unstaged: [], untracked: [] };
    }
  }

  getCurrentBranch() {
    try {
      return execSync('git rev-parse --abbrev-ref HEAD', { 
        cwd: this.cwd, 
        encoding: 'utf-8' 
      }).trim();
    } catch {
      return 'unknown';
    }
  }

  getLastCommit() {
    try {
      const hash = execSync('git rev-parse HEAD', { 
        cwd: this.cwd, 
        encoding: 'utf-8' 
      }).trim();
      const message = execSync('git log -1 --pretty=%B', { 
        cwd: this.cwd, 
        encoding: 'utf-8' 
      }).trim();
      return { hash, message };
    } catch {
      return null;
    }
  }

  getLastCommitHash() {
    try {
      return execSync('git rev-parse HEAD', { 
        cwd: this.cwd, 
        encoding: 'utf-8' 
      }).trim().slice(0, 8);
    } catch {
      return null;
    }
  }

  detectPhaseFromMessage(message) {
    if (/^red:/.test(message)) return 'red';
    if (/^green:/.test(message)) return 'green';
    if (/^refactor:/.test(message)) return 'refactor';
    return 'unknown';
  }
}

module.exports = { CommitTddCommand };
