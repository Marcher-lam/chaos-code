/**
 * STDD CLI - Start Command
 * Interactive quick-start wizard for new users
 */

const chalk = require('chalk');
const inquirer = require('inquirer');

const CORE_WORKFLOW = [
  { step: 1, cmd: 'stdd init', desc: 'Initialize STDD in your project' },
  { step: 2, cmd: 'stdd new <name>', desc: 'Create a new change' },
  { step: 3, cmd: 'stdd apply <name>', desc: 'Execute TDD tasks (red → green → refactor)' },
  { step: 4, cmd: 'stdd verify <name>', desc: 'Verify change readiness' },
  { step: 5, cmd: 'stdd archive <name>', desc: 'Archive completed change' },
];

const HELP_TEXT = `
${chalk.bold('🚀 STDD Copilot Quick Start')}

${chalk.cyan('Core Workflow:')}
${CORE_WORKFLOW.map(s => `  ${s.step}. ${chalk.yellow(s.cmd)} - ${s.desc}`).join('\n')}

${chalk.cyan('TDD Phases:')}
  ${chalk.red('stdd apply --phase red')}       - Write failing test first
  ${chalk.green('stdd apply --phase green')}    - Minimal implementation
  ${chalk.blue('stdd apply --phase refactor')}  - Improve code structure

${chalk.cyan('Quality Checks:')}
  ${chalk.yellow('stdd guard')}                 - Run quality gate
  ${chalk.yellow('stdd constitution')}          - Check development rules

${chalk.cyan('Other Useful Commands:')}
  ${chalk.dim('stdd list')}                   - List all changes
  ${chalk.dim('stdd status [name]')}          - Show change status
  ${chalk.dim('stdd recommend')}              - Get next step suggestion
  ${chalk.dim('stdd doctor')}                 - Diagnose project health

${chalk.dim('Run "stdd start" for interactive guide.')}
`;

class StartCommand {
  async execute(options = {}) {
    if (options.help) {
      console.log(HELP_TEXT);
      return;
    }

    console.log(chalk.bold('\n🚀 Welcome to STDD Copilot!\n'));
    
    const questions = [
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '📦 Initialize STDD in current project', value: 'init' },
          { name: '📝 Create a new change', value: 'new' },
          { name: '🔧 Execute TDD tasks', value: 'apply' },
          { name: '✅ Verify change', value: 'verify' },
          { name: '📚 View full command help', value: 'help' },
          { name: '🏥 Check project health', value: 'guard' },
        ],
      },
    ];

    const answers = await inquirer.prompt(questions);

    switch (answers.action) {
      case 'init':
        console.log('\n' + chalk.cyan('To initialize STDD in your project:'));
        console.log(chalk.yellow('  stdd init') + '\n');
        console.log('This will create:');
        console.log('  📁 stdd/           - Working directory');
        console.log('  📁 stdd/changes/   - Change management');
        console.log('  📁 stdd/specs/     - Specifications');
        console.log('  📄 AGENTS.md       - AI agent instructions\n');
        break;

      case 'new':
      {
        const { name } = await inquirer.prompt([
          {
            type: 'input',
            name: 'name',
            message: 'Change name (e.g., add-user-login):',
            validate: (input) => input.length > 0 || 'Name is required',
          },
        ]);
        console.log('\n' + chalk.cyan('To create this change:'));
        console.log(chalk.yellow(`  stdd new ${name}`) + '\n');
        break;
      }

      case 'apply':
        console.log('\n' + chalk.cyan('TDD Apply Command:'));
        console.log('  ' + chalk.yellow('stdd apply <name>') + ' - Execute next task\n');
        console.log('TDD Phases:');
        console.log(`  ${chalk.red('stdd apply --phase red')}       - Tests must fail first`);
        console.log(`  ${chalk.green('stdd apply --phase green')}    - Implement to pass tests`);
        console.log(`  ${chalk.blue('stdd apply --phase refactor')}  - Improve without breaking\n`);
        break;

      case 'help':
        console.log(HELP_TEXT);
        break;

      case 'guard':
        console.log('\n' + chalk.cyan('To check project health:'));
        console.log(chalk.yellow('  stdd guard') + '\n');
        console.log('This checks:');
        console.log('  ✅ Constitution compliance');
        console.log('  ✅ Lint configuration');
        console.log('  ✅ Test coverage estimate');
        console.log('  ✅ Test commands\n');
        break;
    }

    console.log(chalk.dim('\n💡 Tip: Run "stdd start" anytime for quick help.\n'));
  }
}

module.exports = { StartCommand, HELP_TEXT };
