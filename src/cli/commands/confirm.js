/**
 * Confirm Command
 * User review and confirmation gate before specification phase
 */

const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const { createLogger } = require('../../utils/logger');
const logger = createLogger('confirm');

class ConfirmCommand {
  constructor() {
    this.requiredSections = ['title', 'description', 'scope', 'success_criteria'];
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
      throw new Error(`No proposal found at ${proposalPath}. Create a proposal first.`);
    }

    const proposal = await fs.readFile(proposalPath, 'utf-8');
    const summary = this.extractSummary(proposal);
    const validation = this.validateProposal(proposal);

    this.printConfirmationGate(summary, validation);

    if (options.dryRun) {
      console.log(chalk.yellow('\nDry run - confirmation not recorded'));
      return { summary, validation, confirmed: false };
    }

    const statusPath = path.join(process.cwd(), 'stdd', '.status.yaml');
    const confirmed = await this.promptConfirmation();

    if (confirmed) {
      await this.updateStatus(statusPath, path.basename(changeDir), 'confirmed');
      await this.updateProposalStatus(proposalPath, 'confirmed');
      console.log(chalk.green('\n✓ Proposal confirmed!'));
      console.log(chalk.cyan('\nNext step: stdd spec ' + path.basename(changeDir)));
      return { summary, validation, confirmed: true };
    } else {
      console.log(chalk.yellow('\n⚠ Confirmation cancelled. Return to proposal phase.'));
      console.log(chalk.cyan('\nNext step: /stdd:propose to revise'));
      return { summary, validation, confirmed: false };
    }
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

  extractSummary(proposal) {
    const summary = {
      title: this.extractSection(proposal, 'title') || 'Untitled',
      description: this.extractSection(proposal, 'description') || '',
      scope: this.extractSection(proposal, 'scope') || '',
      success_criteria: this.extractSection(proposal, 'success_criteria') || '',
      constraints: this.extractSection(proposal, 'constraints') || ''
    };

    return summary;
  }

  extractSection(proposal, sectionName) {
    const patterns = [
      new RegExp(`^#+\\s*${sectionName.replace(/_/g, '([ _-]?)')}\\s*\\n([\\s\\S]+?)(?=\\n#+|\\n*$)`, 'im'),
      new RegExp(`**${sectionName}**:\\s*([\\s\\S]+?)(?=\\n\\*\\*|\\n*$)`, 'im'),
      new RegExp(`${sectionName}:\\s*([\\s\\S]+?)(?=\\n\\w+:|\\n*$)`, 'im')
    ];

    for (const pattern of patterns) {
      const match = proposal.match(pattern);
      if (match && match[1]) {
        return match[1].trim().substring(0, 200);
      }
    }

    return null;
  }

  validateProposal(proposal) {
    const validation = {
      valid: true,
      missing: [],
      warnings: []
    };

    for (const section of this.requiredSections) {
      const content = this.extractSection(proposal, section);
      if (!content) {
        validation.missing.push(section);
        validation.valid = false;
      }
    }

    const wordCount = proposal.split(/\s+/).length;
    if (wordCount < 50) {
      validation.warnings.push('Proposal seems too brief (< 50 words)');
    }

    return validation;
  }

  printConfirmationGate(summary, validation) {
    console.log('');
    console.log(chalk.bold('📋 Proposal Confirmation Gate'));
    console.log(chalk.dim('═'.repeat(50)));
    console.log('');

    console.log(chalk.bold(`Title: ${summary.title}`));
    console.log('');

    if (summary.description) {
      console.log(chalk.dim('Description:'));
      console.log(chalk.dim(summary.description.substring(0, 150) + '...'));
      console.log('');
    }

    if (summary.scope) {
      console.log(chalk.dim('Scope:'));
      console.log(chalk.dim(summary.scope.substring(0, 100) + '...'));
      console.log('');
    }

    if (!validation.valid) {
      console.log(chalk.red('⚠ Missing Sections:'));
      for (const missing of validation.missing) {
        console.log(chalk.red(`   • ${missing}`));
      }
      console.log('');
    }

    if (validation.warnings.length > 0) {
      console.log(chalk.yellow('⚠ Warnings:'));
      for (const warning of validation.warnings) {
        console.log(chalk.yellow(`   • ${warning}`));
      }
      console.log('');
    }

    console.log(chalk.dim('─'.repeat(50)));
    console.log('');
  }

  async promptConfirmation() {
    // In non-interactive mode, auto-confirm
    if (!process.stdin.isTTY) {
      return true;
    }

    try {
      const inquirer = require('inquirer');
      const answers = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmed',
          message: 'Do you confirm this proposal and proceed to specification?',
          default: false
        }
      ]);
      return answers.confirmed;
    } catch (err) {
      logger.warn(`Could not prompt for confirmation: ${err.message}`);
      return false;
    }
  }

  async updateStatus(statusPath, changeName, status) {
    let content = '';
    try {
      content = await fs.readFile(statusPath, 'utf-8');
    } catch {
      content = 'active_change: none\nstatus: proposal\n';
    }

    content = content.replace(/active_change:\s*.+/, `active_change: ${changeName}`);
    content = content.replace(/status:\s*.+/, `status: ${status}`);

    await fs.writeFile(statusPath, content);
  }

  async updateProposalStatus(proposalPath, status) {
    let proposal = await fs.readFile(proposalPath, 'utf-8');

    if (proposal.includes('status:')) {
      proposal = proposal.replace(/status:\s*\w+/, `status: ${status}`);
    } else {
      proposal += `\n\nstatus: ${status}`;
    }

    await fs.writeFile(proposalPath, proposal);
  }
}

module.exports = { ConfirmCommand };
