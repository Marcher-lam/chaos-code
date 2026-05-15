#!/usr/bin/env node

/**
 * STDD Copilot CLI
 * Spec + Test Driven Development Copilot
 *
 * Commands are primarily registered via the CommandLoader registry.
 * Only constitution, hooks, graph, and runtime-agent remain inline
 * due to complex subcommand-level routing.
 */

const { Command } = require('commander');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const { CommandLoader } = require('./src/cli/registry/command-loader');

// ─── Command imports ───
const {
  InitCommand, UpdateCommand, ListCommand, NewCommand, StatusCommand,
  ApplyCommand, VerifyCommand, ArchiveCommand, FFCommand, TurboCommand,
  MetricsCommand, GuardCommand, ExploreCommand, StartersCommand,
  ContinueCommand, IssueCommand, CommitCommand, ContextCommand,
  CiGeneratorCommand, AuditCommand, WorkspaceCommand, DepcheckCommand,
  SchemaCommand, ContractCommand, MockGenCommand, ValidateCommand,
  LearnCommand, RolesCommand, ExtensionsCommand, StoryCommand,
  UserTestCommand, PipelineCommand, FixPacketCommand, OutsideInCommand,
  RecommendEngine, printRecommendations,
  ConstitutionFixCommand, MutationCommand, AgentEngine, SudoLangParser,
  BabyStepsCommand, SudoExecutor, ElicitationCommand, BrowserDoctor,
  createAgentExecutor, ProductProposalCommand,
  StartCommand, DoctorCommand
} = require('./src/cli/commands/index');

const { ProgressCommand } = require('./src/cli/commands/progress');

const BrowserCommand = require('./src/cli/commands/browser');
const { SpecGenerator } = require('./src/cli/commands/spec-generator');
const { ApiSpecCommand } = require('./src/cli/commands/api-spec');
const { MemoryScanner } = require('./src/cli/commands/memory-scan');
const { TddInitCommand } = require('./src/cli/commands/tdd-init');
const { ConstitutionStatusCommand } = require('./src/cli/commands/constitution-status');
const hooksCommand = require('./src/cli/commands/hooks');
const graphCommand = require('./src/cli/commands/graph');
const { ConstitutionChecker } = require('./src/cli/commands/constitution-checker');
const { WaiverManager } = require('./src/cli/commands/waiver-manager');

// ─── Program ───
const program = new Command();
const packageJson = require('./package.json');

const CONSTITUTION_ARTICLES = [
  { n: 1, name: 'Library-First', priority: 'Warning' },
  { n: 2, name: 'TDD', priority: 'Blocking' },
  { n: 3, name: 'Small Commits', priority: 'Warning' },
  { n: 4, name: 'Code Style', priority: 'Warning' },
  { n: 5, name: 'Documentation', priority: 'Suggestion' },
  { n: 6, name: 'Error Handling', priority: 'Warning' },
  { n: 7, name: 'Security', priority: 'Blocking' },
  { n: 8, name: 'Performance', priority: 'Suggestion' },
  { n: 9, name: 'CI/CD', priority: 'Blocking' },
];

// ─── Spinner helper ───
function createSpinner(text) {
  let interval;
  const frames = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
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

// ─── Command factories for dynamic loader ───
const commandFactories = {
  InitCommand, UpdateCommand, ListCommand, NewCommand, StatusCommand,
  ApplyCommand, VerifyCommand, ArchiveCommand, FFCommand, TurboCommand,
  MetricsCommand, GuardCommand, ExploreCommand, StartersCommand,
  ContinueCommand, IssueCommand, CommitCommand, ContextCommand,
  CiGeneratorCommand, AuditCommand, WorkspaceCommand, DepcheckCommand,
  SchemaCommand, ContractCommand, MockGenCommand, ValidateCommand,
  LearnCommand, RolesCommand, ExtensionsCommand, StoryCommand,
  UserTestCommand, PipelineCommand, FixPacketCommand, OutsideInCommand,
  RecommendCommand: RecommendEngine,
  MutationCommand,
  ElicitationCommand,
  BabyStepsCommand,
  SudoExecutorCommand: SudoExecutor,
  BrowserCommand,
  BrowserSnapshotCommand: BrowserCommand,
  BrowserInspectCommand: BrowserCommand,
  BrowserDoctorCommand: BrowserDoctor,
  RuntimeAgentCommand: AgentEngine,
  RuntimeSudoCommand: SudoLangParser,
  SpecGenerator,
  ApiSpecCommand,
  MemoryCommand: MemoryScanner,
  TddInitCommand,
  ProductProposalCommand,
};

const loader = new CommandLoader(program, {
  commandFactories,
  createSpinner,
  skipNames: ['constitution [action] [target]', 'hooks', 'graph', 'runtime', 'recommend', 'doctor', 'start', 'memory <action> [args...]', 'baby-steps [task]', 'sudo run [file]', 'list', 'status [change]', 'progress'],
});
loader.registerAll();

// ─── Inline: Start, Doctor, Progress, Recommend, Memory, BabySteps, Sudo, List, Status ───
program.command('start')
  .description('Interactive quick-start wizard for STDD')
  .option('--json')
  .action(async (options) => {
    try { await new StartCommand().execute(options); } catch (e) { console.error(chalk.red(e.message)); process.exit(1); }
  });

program.command('doctor')
  .description('Check project health')
  .option('--json')
  .option('--deep', 'Run deep checks including audit and lint availability')
  .action(async (options) => {
    try { await new DoctorCommand(process.cwd()).execute(options); } catch (e) { console.error(chalk.red(e.message)); process.exit(1); }
  });

program.command('progress')
  .description('Track and view progress')
  .option('--summary')
  .option('--resume')
  .option('--clear')
  .option('--json')
  .action(async (options) => {
    try { await new ProgressCommand().execute(options); } catch (e) { console.error(chalk.red(e.message)); process.exit(1); }
  });

program.command('recommend [change]')
  .description('Recommend next step')
  .option('--workspace <workspace>')
  .option('--json')
  .action(async (change, options) => {
    try {
      const engine = new RecommendEngine(process.cwd());
      const recs = engine.recommend(change, options);
      if (options.json) console.log(JSON.stringify(recs, null, 2));
      else printRecommendations(recs);
    } catch (e) { console.error(chalk.red(e.message)); process.exit(1); }
  });

program.command('memory <action> [args...]')
  .description('Manage memory artifacts')
  .option('--source-dir <dir>')
  .option('--json')
  .action(async (action, args, options) => {
    try {
      const scanner = new MemoryScanner(process.cwd());
      if (action === 'scan') await scanner.scan(options);
      else if (action === 'list') scanner.listMemory({ json: options.json });
    } catch (e) { console.error(chalk.red(e.message)); process.exit(1); }
  });

program.command('baby-steps [task]')
  .description('Interactive TDD guessing game guide')
  .action(async (task) => {
    try {
      const { findActiveChange } = require('./src/utils/change-utils');
      const stddDir = path.join(process.cwd(), 'stdd');
      if (!fs.existsSync(stddDir)) throw new Error('Not initialized.');
      const changeDir = findActiveChange(stddDir);
      if (!changeDir) throw new Error('No active changes.');
      await new BabyStepsCommand(changeDir).execute(task || 'Next Step');
    } catch (e) { console.error(chalk.red(e.message)); process.exit(1); }
  });

program.command('sudo run [file]')
  .description('Execute SudoLang logic and return validation results')
  .action(async (file) => {
    try {
      if (!file) throw new Error('File path is required.');
      await new SudoExecutor(process.cwd()).executeFile(path.resolve(file));
    } catch (e) { console.error(chalk.red(e.message)); process.exit(1); }
  });

// List & Status (custom wiring)
program.command('list')
  .alias('ls')
  .description('List all changes')
  .option('--changes')
  .option('--specs')
  .option('--archived')
  .option('--json')
  .addHelpText('after', 'Examples:\n  stdd list\n  stdd list --specs\n  stdd list --archived\n  stdd list --json\n\n`--archived` applies to change listings, not spec listings.')
  .action(async (options = {}) => {
    try { await new ListCommand().execute('.', options); } catch (e) { console.error(chalk.red(e.message)); process.exit(1); }
  });

program.command('status [change]')
  .description('Show status of a change')
  .option('--json')
  .addHelpText('after', 'Examples:\n  stdd status\n  stdd status add-dark-mode\n  stdd status --json\n  stdd status add-dark-mode --json')
  .action(async (change, options = {}) => {
    try { await new StatusCommand().execute(change, options); } catch (e) { console.error(chalk.red(e.message)); process.exit(1); }
  });

// ─── Constitution (inline – complex routing) ───
program.command('constitution [action] [target]')
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
  .addHelpText('after', 'Examples:\n  stdd constitution\n  stdd constitution show 2\n  stdd constitution check\n\nSupported: show, check, fix, status, audit, waive')
  .action(async (action, target, options) => {
    action = action || 'show';
    if (action === 'show') {
      try {
        if (options.article) target = options.article;
        if (target && !options.json) {
          const article = CONSTITUTION_ARTICLES.find(a => String(a.n) === String(target));
          if (article) {
            console.log(`\n  Article ${article.n}: ${article.name} [${article.priority}]\n`);
            const artFile = path.join(__dirname, 'schemas', 'constitution', 'articles', `${String(article.n).padStart(2,'0')}-${article.name.toLowerCase().replace(/ /g,'-')}.md`);
            if (fs.existsSync(artFile)) console.log(fs.readFileSync(artFile, 'utf8'));
          } else {
            CONSTITUTION_ARTICLES.forEach(a => console.log(`  Article ${a.n}: ${a.name} [${a.priority}]`));
          }
        } else {
          CONSTITUTION_ARTICLES.forEach(a => console.log(`  Article ${a.n}: ${a.name} [${a.priority}]`));
        }
      } catch (e) { console.error(chalk.red(e.message)); process.exit(1); }
    } else if (action === 'check') {
      const spinner = createSpinner('Running constitution check...').start();
      try {
        const checker = new ConstitutionChecker(process.cwd());
        checker.loadWaivers();
        checker.checkAll();
        const violations = checker.issues;
        const hasBlocking = (violations.blocking || []).length > 0;
        if (hasBlocking) process.exitCode = 1;
        if (options.json) {
          console.log(JSON.stringify({ status: hasBlocking ? 'fail' : 'pass', ...violations, workspace: options.workspace || null }, null, 2));
        } else {
          const all = [...(violations.blocking || []), ...(violations.warning || []), ...(violations.suggestion || [])];
          all.forEach(v => console.log(`  ${v.severity === 'blocking' ? chalk.red('✗') : v.severity === 'warning' ? chalk.yellow('⚠') : chalk.dim('ℹ')} Article ${v.article}: ${v.message}`));
          console.log(all.length ? '' : chalk.green('✓ All articles pass\n'));
        }
        spinner.succeed(hasBlocking ? 'Constitution check completed with violations' : 'Constitution check passed');
      } catch (e) { spinner.fail(e.message); process.exit(1); }
    } else if (action === 'fix') {
      try {
        await new ConstitutionFixCommand(createSpinner('Fixing constitution violations...')).execute(process.cwd(), { article: options.article ? Number(options.article) : null, dryRun: options.dryRun, workspace: options.workspace });
      } catch (e) { console.error(chalk.red(e.message)); process.exit(1); }
    } else if (action === 'status') {
      try {
        await new ConstitutionStatusCommand().execute(options);
      } catch (e) { console.error(chalk.red(e.message)); process.exit(1); }
    } else if (action === 'audit') {
      try {
        await new AuditCommand().execute(process.cwd(), options);
      } catch (e) { console.error(chalk.red(e.message)); process.exit(1); }
    } else if (action === 'waive') {
      try {
        await new WaiverManager(process.cwd()).add(target, options);
      } catch (e) { console.error(chalk.red(e.message)); process.exit(1); }
    } else {
      console.log(chalk.yellow(`Unknown action: ${action}. Supported: show, check, fix, status, audit, waive.`));
    }
  });

// ─── Hooks (uses module's own registration) ───
hooksCommand(program);

// ─── Graph (uses module's own registration) ───
graphCommand(program);

// ─── Runtime Agent (inline – complex routing) ───
const agentCmd = program.command('runtime').description('Interact with STDD Runtime Engines');
agentCmd.command('agent <action> [topic]')
  .description('Start/Manage multi-agent simulation (Party Mode)')
  .option('--rounds <n>')
  .option('--executor <name>', 'Executor adapter for run action (noop or shell)', 'noop')
  .option('--command <cmd>', 'Shell command for --executor shell')
  .option('--allow-unsafe-shell-executor', 'Allow shell executor to run binaries outside the allowlist')
  .option('--allowed-bin <bins>', 'Comma-separated shell executor binary allowlist')
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
      if (options.json) console.log(JSON.stringify(turn, null, 2));
    } else if (action === 'record') {
      const parts = (topic || '').split('|');
      engine.recordTurn(parts[0], parts.slice(1).join('|'));
      console.log('Recorded agent turn.');
    } else if (action === 'stop') {
      console.log(JSON.stringify(engine.forceStop(), null, 2));
    } else if (action === 'run') {
      if (!topic) throw new Error('Goal is required to run an agent executor.');
      const executor = createAgentExecutor(options.executor, {
        command: options.command,
        cwd: process.cwd(),
        allowUnsafe: options.allowUnsafeShellExecutor,
        allowedBins: options.allowedBin,
      });
      const result = await executor.run({ role: options.role || 'developer', goal: topic, context: engine.getStatus() });
      if (options.json) console.log(JSON.stringify(result, null, 2));
      else console.log(result.output || JSON.stringify(result, null, 2));
    }
  });

agentCmd.command('sudo [file]')
  .description('Interpret SudoLang pseudo-code and generate artifacts')
  .option('--generate')
  .option('--json')
  .action(async (file, options) => {
    const parser = new SudoLangParser();
    if (!file) throw new Error('Source file path is required.');
    try {
      const parsed = parser.parse(file);
      if (options.generate) {
        const artifacts = parser.generateArtifacts(parsed);
        console.log(chalk.green('Generated artifacts:'));
        for (const [name, artifactPath] of Object.entries(artifacts)) {
          console.log(`  ${name}: ${artifactPath}`);
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

// ─── Parse with progress tracking ───
const { progress: getProgress, installSignals, active, setActive, clearActive } = require('./src/utils/session-progress');

installSignals();

// Wrap parse to auto-track command start/end in progress.jsonl
const _originalParse = program.parse.bind(program);
program.parse = function (argv) {
  const cmdParts = (argv || process.argv).slice(2).filter(p => !p.startsWith('-'));
  const cmdName = cmdParts.length > 0 ? cmdParts[0] : '';
  if (cmdName && cmdName !== 'progress' && cmdName !== 'help') {
    const entry = getProgress().start(cmdName);
    setActive(entry);
  }
  return _originalParse(argv);
};

process.on('exit', () => {
  const entry = active();
  if (entry) {
    clearActive();
    if (process.exitCode && process.exitCode !== 0) {
      getProgress().fail(entry.id, `Command exited with code ${process.exitCode}`);
    } else {
      getProgress().complete(entry.id);
    }
  }
});

program.parse();
