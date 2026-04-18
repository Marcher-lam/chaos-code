#!/usr/bin/env node

/**
 * STDD Copilot CLI
 * Spec + Test Driven Development Copilot
 */

const { Command } = require('commander');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const { InitCommand } = require('./src/cli/commands/init');
const { UpdateCommand } = require('./src/cli/commands/update');
const { ListCommand } = require('./src/cli/commands/list');
const { NewCommand } = require('./src/cli/commands/new');
const { StatusCommand } = require('./src/cli/commands/status');
const hooksCommand = require('./src/cli/commands/hooks');

const program = new Command();
const packageJson = require('./package.json');
const CONSTITUTION_ARTICLES = [
  { n: 1, name: 'Library-First', priority: 'Warning', desc: '优先使用成熟库', enforcement: '警告提示' },
  { n: 2, name: 'TDD', priority: 'Blocking', desc: '测试先行', enforcement: 'Hook 阻断' },
  { n: 3, name: 'Small Commits', priority: 'Warning', desc: '原子提交', enforcement: '警告提示' },
  { n: 4, name: 'Code Style', priority: 'Warning', desc: '统一风格', enforcement: 'Hook 检查' },
  { n: 5, name: 'Documentation', priority: 'Suggestion', desc: '文档即代码', enforcement: '建议提示' },
  { n: 6, name: 'Error Handling', priority: 'Warning', desc: '显式错误处理', enforcement: '建议提示' },
  { n: 7, name: 'Security', priority: 'Blocking', desc: '安全优先', enforcement: 'Hook 阻断' },
  { n: 8, name: 'Performance', priority: 'Suggestion', desc: '性能默认', enforcement: '建议提示' },
  { n: 9, name: 'CI/CD', priority: 'Blocking', desc: '自动化流水线', enforcement: 'CI 门禁' }
];

// Simple spinner implementation
function createSpinner(text) {
  let interval;
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;

  return {
    start() {
      if (interval) clearInterval(interval);
      process.stdout.write(`${frames[i]} ${text}`);
      interval = setInterval(() => {
        i = (i + 1) % frames.length;
        process.stdout.write(`\r${frames[i]} ${text}`);
      }, 80);
      return this;
    },
    succeed(msg) {
      if (interval) clearInterval(interval);
      process.stdout.write(`\r${chalk.green('✓')} ${msg || text}\n`);
    },
    fail(msg) {
      if (interval) clearInterval(interval);
      process.stdout.write(`\r${chalk.red('✗')} ${msg || text}\n`);
    },
    text: ''
  };
}

program
  .name('stdd')
  .description('STDD Copilot - Spec + Test Driven Development Framework')
  .version(packageJson.version);

program.addHelpText('after', `
Common examples:
  stdd init
  stdd new change add-dark-mode
  stdd list --archived
  stdd status --json

For Claude Code slash commands: stdd commands
`);

// Global options
program.option('--no-color', 'Disable color output');

// Init command
program
  .command('init [path]')
  .description('Initialize STDD Copilot in your project')
  .option('--force', 'Overwrite existing files')
  .option('--skip-skills', 'Skip copying skills directory')
  .option('-y, --yes', 'Run non-interactively with default settings')
  .option('--non-interactive', 'Run non-interactively (same as --yes)')
  .addHelpText('after', `
Examples:
  stdd init
  stdd init /path/to/project
  stdd init --force
  stdd init --skip-skills --yes
`)
  .action(async (targetPath = '.', options = {}) => {
    const spinner = createSpinner('Initializing STDD Copilot...').start();
    try {
      const resolvedPath = path.resolve(targetPath);
      const initCommand = new InitCommand(spinner);
      await initCommand.execute(resolvedPath, options);
      spinner.succeed('STDD Copilot initialized successfully!');
    } catch (error) {
      spinner.fail(`Error: ${error.message}`);
      process.exit(1);
    }
  });

// Update command
program
  .command('update [path]')
  .description('Update STDD Copilot files in your project')
  .option('--force', 'Force update even when files exist')
  .addHelpText('after', `
Examples:
  stdd update
  stdd update /path/to/project
  stdd update --force

Use this after upgrading the CLI to sync command files and schemas.
`)
  .action(async (targetPath = '.', options = {}) => {
    const spinner = createSpinner('Updating STDD Copilot...').start();
    try {
      const resolvedPath = path.resolve(targetPath);
      const updateCommand = new UpdateCommand(spinner);
      await updateCommand.execute(resolvedPath, options);
      spinner.succeed('STDD Copilot updated successfully!');
    } catch (error) {
      spinner.fail(`Error: ${error.message}`);
      process.exit(1);
    }
  });

// List command
program
  .command('list')
  .alias('ls')
  .description('List all changes or specs')
  .option('--changes', 'List changes (default)')
  .option('--specs', 'List specs')
  .option('--archived', 'Include archived items')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
Examples:
  stdd list
  stdd list --specs
  stdd list --archived
  stdd list --json

\`--archived\` applies to change listings, not spec listings.
`)
  .action(async (options = {}) => {
    try {
      const listCommand = new ListCommand();
      await listCommand.execute('.', options);
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Status command
program
  .command('status [change]')
  .description('Show status of a change or current work')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
Examples:
  stdd status
  stdd status add-dark-mode
  stdd status --json
  stdd status add-dark-mode --json
`)
  .action(async (changeName, options = {}) => {
    try {
      const statusCommand = new StatusCommand();
      await statusCommand.execute(changeName, options);
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// New command group
const newCmd = program.command('new').description('Create new changes or specs');

newCmd.addHelpText('after', `
Examples:
  stdd new change add-dark-mode
  stdd new change api-v2 --title "API V2"
  stdd new spec auth

Run \`stdd init\` before creating changes or specs.
`);

newCmd
  .command('change <name>')
  .description('Create a new change')
  .option('--title <title>', 'Change title')
  .option('--description <desc>', 'Change description')
  .addHelpText('after', `
Examples:
  stdd new change add-dark-mode
  stdd new change add-auth --title "User Authentication"
  stdd new change api-v2 --description "Introduce API v2"
`)
  .action(async (name, options = {}) => {
    const spinner = createSpinner(`Creating change: ${name}...`).start();
    try {
      const newCommand = new NewCommand(spinner);
      await newCommand.createChange(name, options);
      spinner.succeed(`Change '${name}' created!`);
    } catch (error) {
      spinner.fail(`Error: ${error.message}`);
      process.exit(1);
    }
  });

newCmd
  .command('spec <domain>')
  .description('Create a new domain spec')
  .addHelpText('after', `
Examples:
  stdd new spec auth
  stdd new spec payment
`)
  .action(async (domain, options = {}) => {
    const spinner = createSpinner(`Creating spec: ${domain}...`).start();
    try {
      const newCommand = new NewCommand(spinner);
      await newCommand.createSpec(domain, options);
      spinner.succeed(`Spec '${domain}' created!`);
    } catch (error) {
      spinner.fail(`Error: ${error.message}`);
      process.exit(1);
    }
  });

// Skills command
program
  .command('skills')
  .description('List all available STDD skills')
  .option('--phase <phase>', 'Filter by phase (1-5)')
  .addHelpText('after', `
Examples:
  stdd skills
  stdd skills --phase 1
  stdd skills --phase 4

Valid phases: 1, 2, 3, 4, 5
`)
  .action(async (options = {}) => {
    try {
      const skillsPath = path.join(__dirname, '.claude', 'skills');
      const stddSkillsPath = path.join(__dirname, 'src', 'stdd-skills');

      console.log(chalk.bold('\n📚 STDD Copilot Skills\n'));

      // Core skills
      console.log(chalk.cyan('Core Skills:'));
      const coreSkills = fs.existsSync(path.join(__dirname, 'src', 'core-skills'))
        ? fs.readdirSync(path.join(__dirname, 'src', 'core-skills')).filter(f => !f.startsWith('.'))
        : [];
      coreSkills.forEach(skill => {
        console.log(`  • ${skill}`);
      });

      // Phase-based skills
      console.log(chalk.cyan('\nPhase-based Skills:'));
      [1, 2, 3, 4, 5].forEach(phase => {
        const phasePath = path.join(stddSkillsPath, `${phase}-*`);
        const phaseSkills = fs.existsSync(stddSkillsPath)
          ? fs.readdirSync(stddSkillsPath).filter(f => f.startsWith(`${phase}-`))
          : [];
        if (phaseSkills.length > 0) {
          const phaseNames = {
            1: 'Proposal',
            2: 'Specification',
            3: 'Design',
            4: 'Implementation',
            5: 'Verification'
          };
          console.log(`  ${chalk.yellow(`Phase ${phase}`)} (${phaseNames[phase]}):`);
          phaseSkills.forEach(skill => {
            console.log(`    • ${skill}`);
          });
        }
      });

      console.log(chalk.dim('\nUse in Claude Code: /stdd:<skill-name>'));
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Commands reference
program
  .command('commands')
  .description('List all Claude Code slash commands')
  .addHelpText('after', `
Examples:
  stdd commands

This command lists Claude Code slash commands, not CLI commands like \`stdd init\`.
`)
  .action(async () => {
    console.log(chalk.bold('\n🔧 STDD Copilot Commands\n'));

    const commands = [
      { cmd: '/stdd:init', desc: 'Initialize STDD workspace' },
      { cmd: '/stdd:new', desc: 'Create new change proposal' },
      { cmd: '/stdd:explore', desc: 'Explore requirements' },
      { cmd: '/stdd:ff', desc: 'Fast-forward generation' },
      { cmd: '/stdd:continue', desc: 'Continue paused work' },
      { cmd: '/stdd:apply', desc: 'Apply change (TDD cycle)' },
      { cmd: '/stdd:verify', desc: 'Verify implementation' },
      { cmd: '/stdd:archive', desc: 'Archive completed change' },
      { cmd: '/stdd:constitution', desc: 'Constitution management' },
      { cmd: '/stdd:graph *', desc: 'Graph engine commands' },
    ];

    commands.forEach(({ cmd, desc }) => {
      console.log(`  ${chalk.cyan(cmd.padEnd(24))} ${desc}`);
    });

    console.log(chalk.dim('\nUse these commands in Claude Code conversations.'));
  });

// Hooks command (使用函数式导入)
hooksCommand(program);

function getArticleByNumber(articleNumber) {
  const normalized = Number.parseInt(articleNumber, 10);
  if (Number.isNaN(normalized)) {
    return null;
  }
  return CONSTITUTION_ARTICLES.find(article => article.n === normalized) || null;
}

function printConstitutionOverview() {
  console.log(chalk.bold('\n📋 STDD Constitution - 9 篇开发条例\n'));

  const blocking = CONSTITUTION_ARTICLES.filter(a => a.priority === 'Blocking');
  const warning = CONSTITUTION_ARTICLES.filter(a => a.priority === 'Warning');
  const suggestion = CONSTITUTION_ARTICLES.filter(a => a.priority === 'Suggestion');

  console.log(chalk.red('Priority 1 (Blocking):'));
  blocking.forEach(a => {
    console.log(`  Article ${a.n}: ${chalk.bold(a.name)} - ${a.desc}`);
  });

  console.log(chalk.yellow('\nPriority 2 (Warning):'));
  warning.forEach(a => {
    console.log(`  Article ${a.n}: ${chalk.bold(a.name)} - ${a.desc}`);
  });

  console.log(chalk.blue('\nPriority 3 (Suggestion):'));
  suggestion.forEach(a => {
    console.log(`  Article ${a.n}: ${chalk.bold(a.name)} - ${a.desc}`);
  });

  console.log(chalk.dim('\n详情: stdd constitution show 2'));
  console.log(chalk.dim('检查: stdd constitution check'));
}

function printConstitutionArticle(article) {
  console.log(chalk.bold(`\n📋 Article ${article.n}: ${article.name}\n`));
  console.log(`Priority: ${article.priority}`);
  console.log(`Description: ${article.desc}`);
  console.log(`Enforcement: ${article.enforcement}`);
}

// Constitution command
program
  .command('constitution [action] [target]')
  .description('Manage STDD Constitution (9 articles)')
  .option('--article <n>', 'Specific article number')
  .option('--reason <reason>', 'Reason for waiver')
  .option('--days <days>', 'Waiver duration in days')
  .addHelpText('after', `
Examples:
  stdd constitution
  stdd constitution show 2
  stdd constitution show --article 7
  stdd constitution check

Supported actions: show, check
`)
  .action(async (action = 'show', target, options = {}) => {
    try {
      if (action === 'show') {
        const articleRef = options.article || target;
        if (articleRef) {
          const article = getArticleByNumber(articleRef);
          if (!article) {
            throw new Error(`Unknown article '${articleRef}'. Use a number between 1 and 9.`);
          }
          printConstitutionArticle(article);
        } else {
          printConstitutionOverview();
        }
      } else if (action === 'check') {
        console.log(chalk.bold('\n🔍 Constitution 合规检查\n'));
        console.log('请使用 Claude Code 运行: /stdd:constitution check');
      } else {
        console.log(`未知操作: ${action}`);
        console.log('可用操作: show, check');
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Parse arguments
program.parse();
