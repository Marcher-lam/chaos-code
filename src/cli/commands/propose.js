/**
 * Propose Command
 * Draft a new feature requirement with boundary clarification
 */

const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const { createLogger } = require('../../utils/logger');
const inquirer = require('inquirer');
const _logger = createLogger('propose');

class ProposeCommand {
  constructor() {
    this.maxWords = 500;
    this.epicThreshold = 1000;
  }

  async execute(requirement, options = {}) {
    if (!requirement || requirement.trim() === '') {
      if (!process.stdin.isTTY) {
        throw new Error('Requirement description is required.');
      }
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'requirement',
          message: 'Describe your requirement:',
          validate: input => input.trim().length > 0 || 'Requirement cannot be empty'
        }
      ]);
      requirement = answers.requirement;
    }

    const changesDir = path.join(process.cwd(), 'stdd', 'changes');
    await fs.mkdir(changesDir, { recursive: true });

    console.log('');
    console.log(chalk.bold('💡 Drafting Requirement Proposal'));
    console.log(chalk.dim('═'.repeat(50)));
    console.log('');

    const wordCount = requirement.split(/\s+/).length;
    const isEpic = wordCount > this.epicThreshold;

    if (isEpic) {
      console.log(chalk.yellow('⚠ This requirement seems large (Epic detected).'));
      console.log(chalk.yellow('Consider splitting it into smaller changes.'));
      console.log('');
    }

    const proposal = await this.generateProposal(requirement, options);

    if (options.dryRun) {
      console.log(chalk.yellow('Dry run - proposal not saved'));
      console.log('');
      console.log(proposal);
      return proposal;
    }

    const changeName = options.name || this.suggestChangeName(requirement);
    const changeDir = path.join(changesDir, changeName);
    await fs.mkdir(changeDir, { recursive: true });

    const proposalPath = path.join(changeDir, 'proposal.md');
    await fs.writeFile(proposalPath, proposal);

    const statusPath = path.join(changeDir, '.status.yaml');
    await fs.writeFile(statusPath, `status: proposal\ncreated: ${new Date().toISOString()}\n`);

    await this.updateGlobalStatus(changeName);

    console.log(chalk.green(`✓ Proposal created: ${proposalPath}`));
    console.log('');
    console.log(chalk.cyan(`Next step: stdd clarify ${changeName}`));
    console.log('');

    return { changeName, path: proposalPath };
  }

  async generateProposal(requirement, _options) {
    const date = new Date().toISOString().split('T')[0];
    const clarifyingQuestions = this.generateClarifyingQuestions(requirement);

    let proposal = `# Proposal: ${this.extractTitle(requirement)}\n\n`;
    proposal += `**Created**: ${date}\n`;
    proposal += `**Status**: draft\n\n`;
    proposal += `---\n\n`;

    proposal += `## Description\n\n`;
    proposal += `${requirement}\n\n`;

    proposal += `## Scope\n\n`;
    proposal += `<!-- Define what is included and what is excluded -->\n\n`;
    proposal += `- In scope:\n`;
    proposal += `- Out of scope:\n\n`;

    proposal += `## Success Criteria\n\n`;
    proposal += `<!-- Define measurable success criteria -->\n\n`;
    proposal += `- [ ] \n\n`;

    proposal += `## Constraints\n\n`;
    proposal += `<!-- Any technical, time, or resource constraints -->\n\n`;

    proposal += `## Clarifying Questions\n\n`;
    for (const question of clarifyingQuestions) {
      proposal += `- [ ] ${question}\n`;
    }
    proposal += `\n`;

    proposal += `## Edge Cases\n\n`;
    proposal += `<!-- Consider edge cases and error scenarios -->\n\n`;

    proposal += `## Dependencies\n\n`;
    proposal += `<!-- List any dependencies on other changes or systems -->\n\n`;

    proposal += `---\n\n`;
    proposal += `status: draft\n`;

    return proposal;
  }

  extractTitle(requirement) {
    const words = requirement.trim().split(/\s+/);
    const titleWords = words.slice(0, 8);
    return titleWords.join(' ').replace(/[.!?]$/, '');
  }

  suggestChangeName(requirement) {
    const words = requirement.trim().toLowerCase().split(/\s+/);
    const keyWords = words.filter(w => w.length > 3).slice(0, 3);
    const name = keyWords.join('-').replace(/[^a-z0-9-]/g, '-');
    return name.replace(/-+/g, '-').replace(/^-|-$/g, '') || 'change-' + Date.now();
  }

  generateClarifyingQuestions(_requirement) {
    const questions = [
      'What are the specific inputs and outputs?',
      'Who are the users/actors involved?',
      'What are the error conditions?',
      'Are there performance requirements?',
      'Are there security considerations?',
      'How should this be tested?',
      'What constitutes "done"?'
    ];

    return questions;
  }

  async updateGlobalStatus(changeName) {
    const statusPath = path.join(process.cwd(), 'stdd', '.status.yaml');
    let content = '';
    try {
      content = await fs.readFile(statusPath, 'utf-8');
    } catch {
      content = 'active_change: none\nstatus: idle\n';
    }

    content = content.replace(/active_change:\s*.+/, `active_change: ${changeName}`);
    content = content.replace(/status:\s*.+/, 'status: proposal');

    await fs.writeFile(statusPath, content);
  }
}

module.exports = { ProposeCommand };
