#!/usr/bin/env node

/**
 * STDD Copilot CLI
 * Spec + Test Driven Development Copilot
 */

const { Command } = require('commander');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Import Commands from Index
const {
  InitCommand,
  UpdateCommand,
  ListCommand,
  NewCommand,
  StatusCommand,
  ApplyCommand,
  VerifyCommand,
  ArchiveCommand,
  FFCommand,
  TurboCommand,
  MetricsCommand,
  GuardCommand,
  ExploreCommand,
  StartersCommand,
  ContinueCommand,
  IssueCommand,
  CommitCommand,
  ContextCommand,
  CiGeneratorCommand,
  AuditCommand,
  WorkspaceCommand,
  DepcheckCommand,
  SchemaCommand,
  ContractCommand,
  MockGenCommand,
  ValidateCommand,
  LearnCommand,
  RolesCommand,
  ExtensionsCommand,
  StoryCommand,
  UserTestCommand,
  PipelineCommand,
  FixPacketCommand,
  OutsideInCommand,
  RecommendEngine,
  printRecommendations,
  GraphRunCommand,
  ConstitutionFixCommand,
  MutationCommand,
  AgentEngine,
  SudoLangParser,
  BabyStepsCommand,
  SudoExecutor,
  ElicitationCommand,
  BrowserDoctor,
  createAgentExecutor
} = require('./src/cli/commands/index');

// ... (keep existing imports)

const BrowserCommand = require('./src/cli/commands/browser');
const { BrowserController } = require('./src/runtime/browser-controller');

const { SpecGenerator } = require('./src/cli/commands/spec-generator');
const { ApiSpecCommand } = require('./src/cli/commands/api-spec');
const { MemoryScanner } = require('./src/cli/commands/memory-scan');
const { TddInitCommand } = require('./src/cli/commands/tdd-init');
const { ConstitutionStatusCommand } = require('./src/cli/commands/constitution-status');

const hooksCommand = require('./src/cli/commands/hooks');
const graphCommand = require('./src/cli/commands/graph');
const { ConstitutionChecker } = require('./src/cli/commands/constitution-checker');
const { WaiverManager } = require('./src/cli/commands/waiver-manager');

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

// Simple spinner
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
  };
}

// ─── Base Configuration ───
program
  .name('stdd')
  .description('STDD Copilot - Spec + Test Driven Development Framework')
  .version(packageJson.version)
  .option('--no-color', 'Disable color output');

program.addHelpText('after', `
Common examples:
  stdd init
  stdd new change add-dark-mode
  stdd list --archived
  stdd status --json

For Claude Code slash commands: stdd commands
`);

// ─── Dynamic Command Loading ───
// TODO: Migrate all commands to use CommandLoader for dynamic registration
// const { CommandLoader } = require('./src/cli/registry/command-loader');
// const commandLoader = new CommandLoader(program);
// commandLoader.registerAll();

// ─── Core Commands ───
program
  .command('init [path]')
  .description('Initialize STDD Copilot in your project')
  .option('--force', 'Overwrite existing files')
  .option('--skip-skills', 'Skip copying skills')
  .option('-y, --yes', 'Run non-interactively')
  .addHelpText('after', `\nExamples:\n  stdd init\n  stdd init /path/to/project\n  stdd init --force\n  stdd init --skip-skills --yes`)
  .action(async (targetPath = '.', options = {}) => {
    const spinner = createSpinner('Initializing STDD Copilot').start();
    try {
      await new InitCommand(spinner).execute(path.resolve(targetPath), options);
      spinner.succeed('STDD initialized successfully!');
    } catch (error) {
      spinner.fail(error.message);
      process.exit(1);
    }
  });

// Update
program
  .command('update [path]')
  .description('Update STDD Copilot files')
  .option('--force', 'Force update')
  .option('--dry-run', 'Show changes without writing')
  .action(async (targetPath = '.', options = {}) => {
    const spinner = createSpinner('Updating STDD Copilot').start();
    try {
      await new UpdateCommand(spinner).execute(path.resolve(targetPath), options);
      spinner.succeed('Update complete!');
    } catch (error) {
      spinner.fail(error.message);
      process.exit(1);
    }
  });

// List & Status
program
  .command('list')
  .alias('ls')
  .description('List all changes')
  .option('--changes', 'List changes')
  .option('--specs', 'List specs')
  .option('--archived', 'Include archived')
  .option('--json', 'JSON output')
  .addHelpText('after', `
Examples:
  stdd list
  stdd list --specs
  stdd list --archived
  stdd list --json

\`--archived\` applies to change listings, not spec listings.
`)
  .action(async (options = {}) => {
    try { await new ListCommand().execute('.', options); } catch (error) {
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Status
program
  .command('status [change]')
  .description('Show status of a change')
  .option('--json', 'JSON output')
  .addHelpText('after', `
Examples:
  stdd status
  stdd status add-dark-mode
  stdd status --json
  stdd status add-dark-mode --json
`)
  .action(async (change, options = {}) => {
    try { await new StatusCommand().execute(change, options); } catch (error) {
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Skills
program
  .command('skills')
  .description('List all available STDD skills')
  .option('--phase <phase>', 'Filter by phase (1-5)')
  .addHelpText('after', `
Examples:
  stdd skills
  stdd skills --phase 4

Valid phases: 1, 2, 3, 4, 5
`)
  .action(async (options = {}) => {
    try {
      const skillsPath = path.join(__dirname, '.claude', 'skills');
      const stddSkillsPath = path.join(__dirname, 'src', 'stdd-skills');
      console.log(chalk.bold('\n📚 STDD Copilot Skills\n'));
      console.log(chalk.cyan('Core Skills:'));
      const coreSkillsConfig = path.join(__dirname, 'src', 'config', 'core-skills-module.yaml');
      if (fs.existsSync(coreSkillsConfig)) {
        console.log(`  • core-skills (${coreSkillsConfig})`);
      }
      console.log(chalk.cyan('\nPhase-based Skills:'));
      [1, 2, 3, 4, 5].forEach(phase => {
        const stddSkills = fs.existsSync(stddSkillsPath)
          ? fs.readdirSync(stddSkillsPath).filter(f => f.startsWith(`${phase}-`))
          : [];
        if (stddSkills.length > 0) {
          const phaseNames = { 1: 'Proposal', 2: 'Specification', 3: 'Design', 4: 'Implementation', 5: 'Verification' };
          console.log(`  ${chalk.yellow(`Phase ${phase}`)} (${phaseNames[phase]}):`);
          stddSkills.forEach(skill => console.log(`    • ${skill}`));
        }
      });
      console.log(chalk.dim('\nUse in Claude Code: /stdd:<skill-name>'));
    } catch (error) {
      console.error(chalk.red(error.message)); process.exit(1);
    }
  });

// Commands reference
program
  .command('commands')
  .description('List all Claude Code slash commands')
  .addHelpText('after', `\nExamples:\n  stdd commands\n\nThis command lists Claude Code slash commands, not CLI commands like \`stdd init\`.`)
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
    commands.forEach(c => console.log(`  ${chalk.cyan(c.cmd.padEnd(24))} ${c.desc}`));
    console.log(chalk.dim('\nUse these commands in Claude Code conversations.'));
  });

// New
const newCmd = program.command('new').description('Create new changes');
newCmd
  .command('change <name>')
  .description('Create a new change')
  .option('--title <title>', 'Change title')
  .action(async (name, options = {}) => {
    const spinner = createSpinner(`Creating change: ${name}`).start();
    try {
      await new NewCommand(spinner).createChange(name, options);
      spinner.succeed(`Change '${name}' created!`);
    } catch (error) {
      spinner.fail(error.message);
      process.exit(1);
    }
  });

// ─── Workflow Commands ───
// FF
program
  .command('ff <description>')
  .description('Fast-forward: create change with pre-populated tasks')
  .option('--change-name <name>', 'Custom change name')
  .option('--workspace <workspace>', 'Scope to workspace')
  .action(async (desc, options) => {
    const spinner = createSpinner('Fast-forwarding').start();
    try {
      const result = await new FFCommand().execute(desc, options);
      spinner.succeed(`Created fast-forward: ${result.changeName}`);
      console.log(`${chalk.cyan('Next steps:')}\n  stdd apply ${result.changeName}`);
    } catch (error) {
      spinner.fail(error.message);
      process.exit(1);
    }
  });

// Issue
program
  .command('issue <description>')
  .description('Create bug-fix change')
  .option('--title <title>')
  .option('--severity <severity>')
  .option('--workspace <workspace>')
  .action(async (desc, options) => {
    const spinner = createSpinner('Creating bug').start();
    try {
      await new IssueCommand().execute(desc, options);
      spinner.succeed('Bug-fix change created!');
    } catch (error) {
      spinner.fail(error.message);
      process.exit(1);
    }
  });

// Turbo
program
  .command('turbo <description>')
  .description('One-shot full process')
  .option('--change-name <name>')
  .option('--no-spec')
  .action(async (desc, options) => {
    const spinner = createSpinner('Running Turbo').start();
    try {
      await new TurboCommand().execute(desc, options);
      spinner.succeed('Turbo sequence completed!');
    } catch (error) {
      spinner.fail(error.message);
      process.exit(1);
    }
  });

// Apply
program
  .command('apply [change]')
  .description('Run next pending task')
  .option('--task <id>')
  .option('--dry-run')
  .option('--test-command <cmd>')
  .option('--delegate', 'Write cross-model delegation evidence on failure')
  .option('--e2e-command <cmd>', 'Run E2E probe as part of apply evidence')
  .option('--workspace <workspace>')
  .addHelpText('after', 'Examples:\n  stdd apply\n  stdd apply --dry-run')
  .action(async (change, options = {}) => {
    try { await new ApplyCommand().execute(change, options); } catch (error) {
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Verify
program
  .command('verify [change]')
  .description('Verify change readiness')
  .option('--no-constitution')
  .option('--lint')
  .option('--lint-command <cmd>', 'Custom lint command')
  .option('--test-command <cmd>', 'Custom test command')
  .option('--workspace <workspace>')
  .addHelpText('after', 'Examples:\n  stdd verify\n  stdd verify --lint')
  .action(async (change, options = {}) => {
    try { await new VerifyCommand().execute(change, options); } catch (error) {
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Archive
program
  .command('archive [change]')
  .description('Archive completed change')
  .action(async (change, options = {}) => {
    try {
      await new ArchiveCommand().execute(change, options);
    } catch (error) {
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Validate / Spec Guardian
program
  .command('validate [change]')
  .description('Validate specs and run Spec Guardian checks')
  .option('--spec-guardian', 'Run implementation leakage checks')
  .option('--fix', 'Write rewrite suggestions for diagnostics')
  .option('--json')
  .action(async (change, options = {}) => {
    try { await new ValidateCommand().execute(change, options); } catch (error) {
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Fix Packet / Golden Packet
program
  .command('fix-packet [change]')
  .description('Generate a Golden Packet style failure context for AI handoff')
  .option('--test-output <file>', 'Include captured test output from a file')
  .option('--test-command <cmd>', 'Test command to show in the packet')
  .option('--task <task>', 'Task description to include')
  .option('--json')
  .action(async (change, options = {}) => {
    try { new FixPacketCommand().execute(change, options); } catch (error) {
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Outside-In TDD registry and scaffolds
program
  .command('outside-in [action] [change]')
  .description('Manage outside-in TDD registry and layer scaffolds')
  .option('--feature <name>', 'Feature key for generated layer skeletons')
  .option('--force', 'Overwrite registry during init')
  .option('--json')
  .action(async (action = 'status', change, options = {}) => {
    try { new OutsideInCommand().execute(action, change, options); } catch (error) {
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Roles / Party Mode / Adversarial Review
program
  .command('roles [action] [args...]')
  .description('Run role utilities, party mode, or adversarial review')
  .option('--roles <roles>', 'Comma-separated role ids for party mode')
  .option('--json')
  .action(async (action = 'list', args = [], options = {}) => {
    try { await new RolesCommand().execute(action, args, options); } catch (error) {
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// ─── Quality & Governance ───
// Guard
program
  .command('guard')
  .description('Run STDD Guard checks')
  .option('--no-constitution')
  .option('--workspace <workspace>')
  .option('--strict', 'Fail on warnings instead of passing')
  .action(async (options) => {
    try { await new GuardCommand().execute(options); } catch (error) {
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Metrics
program
  .command('metrics [change]')
  .description('Show metrics')
  .option('--workspace <workspace>')
  .option('--json')
  .action(async (change, options) => {
    try { await new MetricsCommand().execute(change, options); } catch (error) {
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Depcheck
program
  .command('depcheck [path]')
  .description('Check dependencies')
  .option('--workspace <workspace>')
  .option('--safe-list <list>')
  .option('--json')
  .action(async (p, options) => {
    try { await new DepcheckCommand().execute(p, options); } catch (error) {
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

const schemaCmd = program.command('schema').description('Manage workflow and data schemas');
schemaCmd.command('validate [path]').description('Validate schemas').option('--strict').option('--json').action((p, options) => {
  try { new SchemaCommand().validate(p, options); } catch (error) { console.error(chalk.red(error.message)); process.exit(1); }
});
schemaCmd.command('create <name>').description('Create workflow schema').option('--force').option('--json').action((name, options) => {
  try { new SchemaCommand().create(name, options); } catch (error) { console.error(chalk.red(error.message)); process.exit(1); }
});
schemaCmd.command('fork <source> <name>').description('Fork workflow schema').option('--force').option('--json').action((source, name, options) => {
  try { new SchemaCommand().fork(source, name, options); } catch (error) { console.error(chalk.red(error.message)); process.exit(1); }
});

// ─── Quality & Governance ───
// Constitution
program
  .command('constitution [action] [target]')
  .description('Manage constitution')
  .option('--article <n>')
  .option('--force')
  .option('--reason <reason>')
  .option('--days <days>')
  .option('--json')
  .option('--workspace <workspace>')
  .option('--no-constitution')
  .option('--lint')
  .option('--dry-run')
  .addHelpText('after', `
Examples:
  stdd constitution
  stdd constitution show 2
  stdd constitution show --article 7
  stdd constitution check

Supported actions: show, check
`)
  .action(async (action = 'show', target, options) => {
    try {
      if (action === 'check') {
        await new ConstitutionChecker().run();
      } else if (action === 'status') {
        await new ConstitutionStatusCommand().execute(options);
      } else if (action === 'fix') {
        await new ConstitutionFixCommand().execute(target, options);
      } else if (action === 'audit') {
        await new AuditCommand().execute(options);
      } else if (action === 'waive' || action === 'waiver') {
        await new WaiverManager(process.cwd()).add(target, options);
      } else {
        // Default: show
        if (target || options.article) {
          const articleIdx = options.article || target;
          const article = CONSTITUTION_ARTICLES.find(a => a.n === parseInt(articleIdx));
          if (article) {
            console.log(chalk.bold(`\n📋 Article ${article.n}: ${article.name}\n`));
            console.log(`Priority: ${article.priority}`);
            console.log(`Description: ${article.desc}`);
            console.log(`Enforcement: ${article.enforcement}`);
          } else {
            console.log(chalk.red('Unknown article number.'));
            process.exit(1);
          }
        } else {
          console.log(chalk.bold('\n📋 STDD Constitution - 9 Articles\n'));
          CONSTITUTION_ARTICLES.forEach(a => {
            console.log(`  ${chalk.cyan(`Article ${a.n}: ${a.name}`)} - ${a.desc}`);
          });
        }
      }
    } catch (error) {
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// ─── Graph & Workspace ───
// Graph
graphCommand(program);

// Workspace
const wsCmd = program.command('workspace').description('Manage workspaces');
const wsCmdInstance = new WorkspaceCommand();
wsCmd.command('list').description('List workspaces').option('--json').action(() => wsCmdInstance.list());
wsCmd.command('validate').description('Validate registry').action(() => wsCmdInstance.validate());
wsCmd.command('repair').description('Repair registry').option('--dry-run').action((opts) => wsCmdInstance.repair(opts));

// ─── Tools ───
// Context
program
  .command('context [layer]')
  .description('Show project context')
  .option('--export')
  .option('--workspace <workspace>')
  .option('--json')
  .option('--format <format>')
  .action(async (layer, options) => {
    try { await new ContextCommand().execute(layer, options); } catch (error) {
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Explore
program
  .command('explore [scope]')
  .description('Explore project')
  .option('--output <file>')
  .option('--json')
  .action(async (scope, options) => {
    try { await new ExploreCommand().execute(scope, options); } catch (error) {
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// CI
program
  .command('ci [platform]')
  .description('Generate CI config')
  .option('--force')
  .action(async (platform, options) => {
    try { await new CiGeneratorCommand().execute(platform, options); } catch (error) {
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Starters
program
  .command('starters <subcommand> [args...]')
  .description('Manage project starters')
  .action(async (sub, args) => {
    try { await new StartersCommand().execute(sub, args); } catch (error) {
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Extensions marketplace
program
  .command('extensions [action] [args...]')
  .description('List, install, validate, and package STDD extensions')
  .option('--json')
  .action(async (action = 'list', args = [], options = {}) => {
    try { await new ExtensionsCommand().execute(action, args, options); } catch (error) {
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Story mapping
program
  .command('story [action] [name]')
  .description('Create story maps and convert journeys to BDD')
  .option('--persona <persona>')
  .option('--goal <goal>')
  .option('--force')
  .option('--json')
  .action(async (action = 'create', name = 'journey', options = {}) => {
    try { await new StoryCommand().execute(action, name, options); } catch (error) {
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// User testing scripts
program
  .command('user-test [change]')
  .description('Generate human and agent user test scripts')
  .option('--human-only')
  .option('--agent-only')
  .option('--json')
  .action(async (change, options = {}) => {
    try { await new UserTestCommand().execute(change, options); } catch (error) {
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Pipeline builder
program
  .command('pipeline [change]')
  .description('Generate parser IR and acceptance test skeletons from specs')
  .option('--json')
  .action(async (change, options = {}) => {
    try { await new PipelineCommand().execute(change, options); } catch (error) {
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Hooks
hooksCommand(program);

// Recommend
program
  .command('recommend')
  .description('Recommend next step')
  .option('--workspace <workspace>')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const engine = new RecommendEngine(process.cwd());
      const recs = engine.recommend(undefined, options);
      if (options.json) {
        const jsonOut = recs.map(r => ({
          command: r.command,
          reason: r.reason,
          state: r.state,
          workspace: r.workspace
        }));
        console.log(JSON.stringify(jsonOut, null, 2));
      } else {
        printRecommendations(recs);
      }
    } catch (error) {
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Memory
program
  .command('memory <action> [args...]')
  .description('Manage memory')
  .action(async (action, args) => {
    const ms = new MemoryScanner();
    if (action === 'scan') await ms.scan();
    else if (action === 'list') await ms.listMemory();
  });

// Learn / Pattern Teaching
program
  .command('learn [action] [args...]')
  .description('Learn project patterns and record feedback')
  .option('--json')
  .action(async (action = 'status', args = [], options = {}) => {
    try { await new LearnCommand().execute(action, args, options); } catch (error) {
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// ─── Missing CLI Commands ───
// Commit
program
  .command('commit [change]')
  .description('Generate commit message')
  .option('--format <format>', 'Output format (text|json)', 'text')
  .option('--tdd', 'Use TDG red/green/refactor commit prefix')
  .option('--phase <phase>', 'TDD phase prefix: red, green, refactor')
  .option('--issue <number>', 'Issue number for traceability')
  .option('--require-issue', 'Fail when no issue number is available')
  .action(async (change, options = {}) => {
    try { await new CommitCommand().execute(change, options); } catch (error) {
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Spec
program
  .command('spec <change>')
  .description('Generate specs from tasks')
  .option('--merge')
  .action(async (change, options) => {
    try {
      await new SpecGenerator().generateFromTasks(change, options);
    } catch (error) {
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// API Spec
program
  .command('api-spec [change]')
  .description('Generate OpenAPI spec')
  .option('--format <format>', 'yaml or json', 'yaml')
  .option('--workspace <workspace>')
  .action(async (change, options) => {
    try { await new ApiSpecCommand().execute(change, options); } catch (error) {
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Contract
program
  .command('contract <action> [change]')
  .description('Manage contracts')
  .option('--workspace <workspace>')
  .option('--consumer <name>')
  .option('--provider <name>')
  .action(async (action, change, options) => {
    try { await new ContractCommand().execute(action, change, options); } catch (error) {
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Mock
program
  .command('mock [change]')
  .description('Generate mocks')
  .option('--workspace <workspace>')
  .action(async (change, options) => {
    try { await new MockGenCommand().execute(change, options); } catch (error) {
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// TDD Init
program
  .command('tdd-init [path]')
  .description('Initialize test scaffolds')
  .option('--source-dir <dir>')
  .option('--dry-run')
  .action(async (path, options) => {
    try { await new TddInitCommand().execute(path, options); } catch (error) {
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Audit
program
  .command('audit')
  .description('Historical compliance audit')
  .option('--json')
  .action(async (options) => {
    try { await new AuditCommand().execute(options); } catch (error) {
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Continue
program
  .command('continue [change]')
  .description('Continue interrupted work')
  .option('--force')
  .option('--dry-run')
  .option('--test-command <cmd>', 'Test command to use')
  .action(async (change, options = {}) => {
    try { await new ContinueCommand().execute(change, options); } catch (error) {
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Mutation
program
  .command('mutation [change]')
  .description('Run mutation testing')
  .option('--mode <mode>', 'quick or stryker', 'quick')
  .option('--workspace <workspace>')
  .option('--threshold <num>', 'Score threshold', '80')
  .option('--json')
  .action(async (change, options) => {
    try { await new MutationCommand().execute(change, options); } catch (error) {
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// ─── Advanced Runtime ───
const agentCmd = program.command('runtime').description('Interact with STDD Runtime Engines');

// Agent Runtime
agentCmd.command('agent <action> [topic]')
  .description('Start/Manage multi-agent simulation (Party Mode)')
  .option('--rounds <n>', 'Max rounds')
  .option('--executor <name>', 'Executor adapter for run action (noop or shell)', 'noop')
  .option('--command <cmd>', 'Shell command for --executor shell')
  .option('--role <role>', 'Agent role for run action')
  .option('--json')
  .action(async (action, topic, options) => {
    const engine = new AgentEngine();
    if (action === 'start') {
      if (!topic) throw new Error('Topic is required to start.');
      const state = engine.start(topic, { rounds: options.rounds });
      console.log(chalk.green(`Simulation started: ${topic}`));
      if (options.json) console.log(JSON.stringify(state, null, 2));
    } else if (action === 'next') {
      const turn = engine.nextTurn();
      if (turn.error) return console.error(chalk.red(turn.error));
      console.log(chalk.bold(`\nTurn ${turn.turn}: ${turn.speaker.name}`));
      console.log(`Role: ${turn.speaker.role}`);
      console.log(chalk.dim(`Context: ${turn.history.slice(-2).map(h => `[${h.speakerId} -> ${h.content}`).join(' | ')}`));
      if (options.json) console.log(JSON.stringify(turn, null, 2));
    } else if (action === 'record') {
      // Assuming topic contains "id|content"
      const parts = (topic || '').split('|');
      engine.recordTurn(parts[0], parts.slice(1).join('|'));
      console.log('Recorded agent turn.');
    } else if (action === 'stop') {
      console.log(JSON.stringify(engine.forceStop(), null, 2));
    } else if (action === 'run') {
      if (!topic) throw new Error('Goal is required to run an agent executor.');
      const executor = createAgentExecutor(options.executor, { command: options.command, cwd: process.cwd() });
      const result = await executor.run({ role: options.role || 'developer', goal: topic, context: engine.getStatus() });
      if (options.json) console.log(JSON.stringify(result, null, 2));
      else console.log(result.output || JSON.stringify(result, null, 2));
    }
  });

// SudoLang Interpreter
agentCmd.command('sudo [file]')
  .description('Interpret SudoLang pseudo-code and generate artifacts')
  .option('--generate', 'Generate STDD artifacts')
  .option('--json')
  .action(async (file, options) => {
    const parser = new SudoLangParser();
    if (!file) throw new Error('Source file path is required.');
    try {
      const parsed = parser.parse(file);
      if (options.generate) {
        const artifacts = parser.generateArtifacts(parsed);
        console.log(chalk.green('Generated artifacts:'));
        for (const [name, path] of Object.entries(artifacts)) {
          console.log(`  ${name}: ${path}`);
        }
        if (options.json) console.log(JSON.stringify(artifacts, null, 2));
      } else {
        console.log(JSON.stringify(parsed, null, 2));
      }
    } catch (e) {
      console.error(chalk.red(e.message));
      process.exit(1);
    }
  });

// ─── BMAD Elicitation Command ───
program
  .command('brainstorm <topic...>')
  .description('Advanced elicitation and reasoning engine')
  .option('--method <id>', 'Specific elicitation method (e.g., first-principles)')
  .option('--list', 'List available methods')
  .option('--json', 'JSON output')
  .action(async (topic, options) => {
    try { await new ElicitationCommand().execute(topic, options); } catch (error) {
      console.error(chalk.red(error.message)); process.exit(1);
    }
  });

// ─── Baby Steps TDD Command ───
program
  .command('baby-steps [task]')
  .description('Interactive TDD guessing game guide')
  .action(async (task, options) => {
    try {
      const { findActiveChange } = require('./src/utils/change-utils');
      const stddDir = path.join(process.cwd(), 'stdd');
      if (!fs.existsSync(stddDir)) throw new Error('Not initialized.');
      const changeDir = findActiveChange(stddDir);
      if (!changeDir) throw new Error('No active changes.');
      await new BabyStepsCommand(changeDir).execute(task || 'Next Step');
    } catch (error) {
      console.error(chalk.red(error.message)); process.exit(1);
    }
  });

// ─── SudoLang Execution ───
program
  .command('sudo run [file]')
  .description('Execute SudoLang logic and return validation results')
  .action(async (file, options) => {
    try {
      if (!file) throw new Error('File path is required.');
      const exec = new SudoExecutor(process.cwd());
      await exec.executeFile(path.resolve(file));
    } catch (error) {
      console.error(chalk.red(error.message)); process.exit(1);
    }
  });

// ─── Browser Automation ───
const browserCmd = program.command('browser').description('Built-in browser drive for E2E testing');
browserCmd.command('snapshot <url>')
  .description('Take a screenshot of the URL and save as evidence')
  .option('--width <width>', 'Viewport width', '1280')
  .option('--height <height>', 'Viewport height', '800')
  .action(async (url, options) => {
    const { BrowserController } = require('./src/runtime/browser-controller');
    const controller = new BrowserController();
    await controller.snapshot({ ...options, url });
  });

browserCmd.command('inspect <url>')
  .description('Inspect the page title and basic info')
  .action(async (url, options) => {
    const { BrowserController } = require('./src/runtime/browser-controller');
    const controller = new BrowserController();
    await controller.inspect({ ...options, url });
  });

browserCmd.command('doctor')
  .description('Check Playwright browser dependency health')
  .option('--no-launch', 'Skip headless Chromium launch probe')
  .option('--json', 'JSON output')
  .action(async (options) => {
    const result = new BrowserDoctor(process.cwd()).check({ launch: options.launch });
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      if (result.status !== 'pass') process.exitCode = 1;
      return;
    }
    console.log(chalk.bold('\nBrowser Doctor'));
    for (const check of result.checks) {
      const label = check.status === 'pass' ? chalk.green('PASS') : chalk.red('FAIL');
      console.log(`  ${label} ${check.name}${check.message ? ` - ${check.message}` : ''}`);
    }
    if (result.suggestions.length) {
      console.log(chalk.yellow('\nSuggested fixes:'));
      result.suggestions.forEach(command => console.log(`  ${command}`));
    }
    if (result.status !== 'pass') process.exitCode = 1;
  });

// ─── Session Progress: real-time command tracking for breakpoint resume ───
const { progress, active, setActive, installSignals } = require('./src/utils/session-progress');
const { ProgressCommand } = require('./src/cli/commands/progress');

installSignals();

// Register stdd progress command
program
  .command('progress')
  .description('View session progress, resume context, and history')
  .option('--last <n>', 'Show last N entries', '20')
  .option('--summary', 'Show progress summary')
  .option('--resume', 'Show resume context for last interrupted command')
  .option('--clear', 'Clear progress log')
  .option('--json', 'JSON output')
  .action((options) => { new ProgressCommand().execute(options); });

// Global progress tracking via Commander hooks — only active when stdd/ exists
program.hook('preAction', (thisCmd, actionCmd) => {
  try {
    const p = progress();
    if (!p._active) return;
    const cmd = actionCmd.name();
    const opts = actionCmd.opts() || {};
    const args = {};
    const operands = actionCmd.args || [];
    if (operands.length) args._pos = operands.join(' ');
    if (opts.task) args.task = opts.task;
    if (opts.changeName) args.changeName = opts.changeName;
    if (opts.workspace) args.workspace = opts.workspace;
    if (opts.mode) args.mode = opts.mode;
    if (cmd === 'change' || cmd === 'new') args._sub = 'new change';
    if (operands[0] && cmd !== 'progress') args.change = operands[0];
    setActive(p.start(cmd, args));
  } catch { /* never block the main flow */ }
});

program.hook('postAction', () => {
  try {
    const e = active();
    if (e) { progress().complete(e.id); progress().truncate(); }
  } catch { /* never block the main flow */ }
});

program.parse();

// Helpers
async function recommendEngine(options = {}) {
  const engine = new RecommendEngine(process.cwd());
  const recs = engine.recommend(undefined, options);
  printRecommendations(recs);
}
