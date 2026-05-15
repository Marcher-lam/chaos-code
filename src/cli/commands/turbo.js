/**
 * Turbo Command (One-Shot Full Flow)
 * FF -> Spec -> Done in one shot
 */

const chalk = require('chalk');
const { FFCommand } = require('./ff');
const { SpecGenerator } = require('./spec-generator');

class TurboCommand {
  constructor(spinner) {
    this.spinner = spinner;
  }

  async execute(description, options = {}) {
    if (!description || typeof description !== 'string') {
      throw new Error('Description is required.');
    }

    const noSpec = options.noSpec === true;
    const producedFiles = [];

    const silentSpinner = {
      text: '',
      start() {},
      stop() {},
      succeed() {},
      fail() {}
    };

    const ffCommand = new FFCommand(silentSpinner);
    const ffResult = await ffCommand.execute(description, options);

    const changeName = ffResult.changeName;
    const workspace = ffResult.workspace;
    const changeDirBase = `stdd/changes/${changeName}`;

    producedFiles.push(`${changeDirBase}/proposal.md`);
    producedFiles.push(`${changeDirBase}/tasks.md`);

    if (!noSpec) {
      const generator = new SpecGenerator();
      const result = await generator.generateFromTasks(changeName, { workspace: options.workspace });

      for (const g of result.generated) {
        producedFiles.push(`${changeDirBase}/specs/${g.file}`);
      }
      for (const s of result.skipped) {
        producedFiles.push(`${changeDirBase}/specs/${s.file}`);
      }
    }

    console.log(chalk.green.bold('\n  Turbo Mode Completed\n'));
    console.log(chalk.cyan(`  Change: ${changeName}`));
    console.log(chalk.cyan(`  Description: ${description}`));
    if (workspace) {
      console.log(chalk.cyan(`  Workspace: ${workspace.path}`));
    }
    console.log('');
    console.log(chalk.bold('  Produced Files:'));
    producedFiles.forEach(f => {
      console.log(`    ${chalk.green('+')} ${f}`);
    });
    console.log('');
    const workspaceArg = workspace ? ` --workspace ${workspace.path}` : '';
    console.log(chalk.dim(`  Next: stdd apply ${changeName}${workspaceArg}`));
    console.log(chalk.dim('  Or:  stdd apply --next\n'));

    return { changeName, producedFiles, workspace };
  }
}

module.exports = { TurboCommand };
