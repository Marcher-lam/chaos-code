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
  BabyStepsCommand, SudoExecutor, ElicitationCommand,
  createAgentExecutor, ProductProposalCommand,
  StartCommand, DoctorCommand,
  SkillsCommand, CommandsCommand,
  GraphHistoryCommand, GraphRunCommand,
  WaiverManagerCommand,
  // New CLI commands for previously Skill-only features
  VisionCommand, PrpCommand, DesignCommand, CertaintyCommand, ComplexityCommand,
  FactoryCommand, MockCommand, IterateCommand, HelpCommand,
  ParallelCommand, SupervisorCommand,
  // Skill-based workflow commands
  ProposeCommand, ClarifyCommand, ConfirmCommand, PlanCommand,
  ExecuteCommand, FinalDocCommand, CommitTddCommand,
  ProfileCommand,
  ModulesCommand,
  DashboardCommand,
  BuilderCommand,
  UICommand,
  DocsCommand,
  MemoryCommand,
  AdaptCommand,
  McpCommand,
  AgentCommand,
} = require('./src/cli/commands/index');

const { ProgressCommand } = require('./src/cli/commands/progress');

const { BrowserCommand } = require('./src/cli/commands/browser');
const { SpecGenerator } = require('./src/cli/commands/spec-generator');
const { ApiSpecCommand } = require('./src/cli/commands/api-spec');
const { MemoryScanner } = require('./src/cli/commands/memory-scan');
const { TddInitCommand } = require('./src/cli/commands/tdd-init');
const { ConstitutionStatusCommand } = require('./src/cli/commands/constitution-status');
const hooksCommand = require('./src/cli/commands/hooks');
const { graphCommand } = require('./src/cli/commands/graph');
const { ConstitutionChecker } = require('./src/cli/commands/constitution-checker');
const { WaiverManager } = require('./src/cli/commands/waiver-manager');

// ─── Program ───
const program = new Command();
const packageJson = require('./package.json');


const { CONSTITUTION_ARTICLES } = require('./src/cli/helpers/constitution-data');
const { createSpinner, safeAction } = require('./src/cli/helpers/cli-utils');


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
  MutationCommand,
  ElicitationCommand,
  BabyStepsCommand,
  SudoExecutorCommand: SudoExecutor,
  BrowserCommand,
  RuntimeAgentCommand: AgentEngine,
  RuntimeSudoCommand: SudoLangParser,
  SpecGenerator,
  ApiSpecCommand,
  MemoryCommand,
  GraphHistoryCommand,
  GraphRunCommand,
  WaiverManagerCommand,
  TddInitCommand,
  SkillsCommand,
  CommandsCommand,
  ProductProposalCommand,
  // New CLI commands for previously Skill-only features
  VisionCommand,
  PrpCommand,
  DesignCommand,
  CertaintyCommand,
  ComplexityCommand,
  FactoryCommand,
  MockCommand,
  IterateCommand,
  HelpCommand,
  ParallelCommand,
  SupervisorCommand,
  // Skill-based workflow commands
  ProposeCommand,
  ClarifyCommand,
  ConfirmCommand,
  PlanCommand,
  ExecuteCommand,
  FinalDocCommand,
  CommitTddCommand,
  ProfileCommand,
  ModulesCommand,
  DashboardCommand,
  BuilderCommand,
  UICommand,
  DocsCommand,
  AdaptCommand,
  McpCommand,
  AgentCommand,
};

const loader = new CommandLoader(program, {
  commandFactories,
  createSpinner,
  skipNames: ['constitution [action] [target]', 'hooks', 'graph', 'runtime', 'recommend', 'doctor', 'start', 'memory <action> [args...]', 'baby-steps [task]', 'sudo run [file]', 'list', 'status [change]', 'progress', 'vision [action]', 'prp [action]', 'design [action]', 'certainty [action]', 'complexity [action]', 'factory [action]', 'iterate [action]', 'help [topic]', 'parallel [action]', 'supervisor [action]', 'memory-scan [action]', 'graph-history [action] [id]', 'profile [action]', 'modules [action] [args...]']
});
loader.registerAll();

// ─── Inline: Start, Doctor, Progress, Recommend, Memory, BabySteps, Sudo, List, Status ───
program.command('start')
  .description('Interactive quick-start wizard for STDD')
  .option('--json')
  .action(safeAction(async (options) => {
    await new StartCommand().execute(options);
  }));

program.command('doctor')
  .description('Check project health')
  .option('--json')
  .option('--deep', 'Run deep checks including audit and lint availability')
  .action(safeAction(async (options) => {
    await new DoctorCommand(process.cwd()).execute(options);
  }));

program.command('progress')
  .description('Track and view progress')
  .option('--summary')
  .option('--resume')
  .option('--clear')
  .option('--json')
  .action(safeAction(async (options) => {
    await new ProgressCommand().execute(options);
  }));

program.command('recommend [change]')
  .description('Recommend next step')
  .option('--workspace <workspace>')
  .option('--json')
  .action(safeAction(async (change, options) => {
    const engine = new RecommendEngine(process.cwd());
    const recs = engine.recommend(change, options);
    if (options.json) console.log(JSON.stringify(recs, null, 2));
    else printRecommendations(recs);
  }));

program.command('memory <action> [args...]')
  .description('Manage memory artifacts')
  .option('--source-dir <dir>')
  .option('--json')
  .action(safeAction(async (action, args, options) => {
    const scanner = new MemoryScanner(process.cwd());
    if (action === 'scan') await scanner.scan(options);
    else if (action === 'list') scanner.listMemory({ json: options.json });
  }));

program.command('memory-scan [action]')
  .description('Scan project source code into memory artifacts')
  .option('--source-dir <dir>')
  .option('--json')
  .action(safeAction(async (action, options) => {
    const scanner = new MemoryScanner(process.cwd());
    if (!action || action === 'scan') {
      const result = await scanner.scan(options);
      if (options.json) console.log(JSON.stringify(result, null, 2));
    } else if (action === 'list') {
      scanner.listMemory({ json: options.json });
    } else {
      throw new Error(`Unknown memory-scan action: ${action}. Supported: scan, list.`);
    }
  }));

program.command('graph-history [action] [id]')
  .description('View graph execution history and replay evidence')
  .option('--json')
  .option('--change <name>')
  .option('--workspace <workspace>')
  .option('--verbose')
  .option('--no-verbose')
  .action(safeAction(async (action, id, options) => {
    const history = new GraphHistoryCommand(process.cwd());
    if (action === 'replay') history.replay(id, options);
    else history.list(options);
  }));

program.command('baby-steps [task]')
  .description('Interactive TDD guessing game guide')
  .action(safeAction(async (task) => {
    const { findActiveChange } = require('./src/utils/change-utils');
    const stddDir = path.join(process.cwd(), 'stdd');
    if (!fs.existsSync(stddDir)) throw new Error('Not initialized.');
    const changeDir = findActiveChange(stddDir);
    if (!changeDir) throw new Error('No active changes.');
    await new BabyStepsCommand(changeDir).execute(task || 'Next Step');
  }));

program.command('sudo run [file]')
  .description('Execute SudoLang logic and return validation results')
  .action(safeAction(async (file) => {
    if (!file) throw new Error('File path is required.');
    await new SudoExecutor(process.cwd()).executeFile(path.resolve(file));
  }));

// List & Status (custom wiring)
program.command('list')
  .alias('ls')
  .description('List all changes')
  .option('--changes')
  .option('--specs')
  .option('--archived')
  .option('--json')
  .addHelpText('after', 'Examples:\n  stdd list\n  stdd list --specs\n  stdd list --archived\n  stdd list --json\n\n`--archived` applies to change listings, not spec listings.')
  .action(safeAction(async (options = {}) => {
    await new ListCommand().execute('.', options);
  }));

program.command('status [change]')
  .description('Show status of a change')
  .option('--json')
  .addHelpText('after', 'Examples:\n  stdd status\n  stdd status add-dark-mode\n  stdd status --json\n  stdd status add-dark-mode --json')
  .action(safeAction(async (change, options = {}) => {
    await new StatusCommand().execute(change, options);
  }));

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
  .action(safeAction(async (action, target, options) => {
    action = action || 'show';
    if (action === 'show') {
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
    } else if (action === 'check') {
      const spinner = createSpinner('Running constitution check...').start();
      const { resolveWorkspace } = require('./src/utils/workspace-detector');
      const WorkspaceCache = require('./src/utils/workspace-cache');
      
      const resolvedWorkspace = options.workspace ? resolveWorkspace(process.cwd(), options.workspace) : null;
      const wsCache = new WorkspaceCache(process.cwd());

      if (options.workspace && !options.force) {
        const cached = wsCache.getValidCache(options.workspace, 'constitution');
        if (cached) {
          const violations = cached.issues;
          if (options.json) {
            console.log(JSON.stringify({ status: cached.status, ...violations, workspace: options.workspace || null, cached: true }, null, 2));
          } else {
            const all = [...(violations.blocking || []), ...(violations.warning || []), ...(violations.suggestion || [])];
            all.forEach(v => console.log(`  ${v.severity === 'blocking' ? chalk.red('✗') : v.severity === 'warning' ? chalk.yellow('⚠') : chalk.dim('ℹ')} Article ${v.article}: ${v.message}`));
            console.log(all.length ? '' : chalk.green('✓ All articles pass\n'));
          }
          spinner.succeed('Constitution check passed [Cached]');
          return;
        }
      }

      const checker = new ConstitutionChecker(process.cwd(), { ...options, workspace: resolvedWorkspace });
      checker.loadWaivers();
      checker.run();
      const violations = checker.issues;
      const hasBlocking = (violations.blocking || []).length > 0;
      if (hasBlocking) process.exitCode = 1;

      // Save to cache if scoped to workspace and passes
      if (options.workspace && !hasBlocking) {
        wsCache.setCache(options.workspace, 'constitution', { status: 'pass', issues: violations });
      }

      if (options.json) {
        console.log(JSON.stringify({ status: hasBlocking ? 'fail' : 'pass', ...violations, workspace: options.workspace || null }, null, 2));
      } else {
        const all = [...(violations.blocking || []), ...(violations.warning || []), ...(violations.suggestion || [])];
        all.forEach(v => console.log(`  ${v.severity === 'blocking' ? chalk.red('✗') : v.severity === 'warning' ? chalk.yellow('⚠') : chalk.dim('ℹ')} Article ${v.article}: ${v.message}`));
        console.log(all.length ? '' : chalk.green('✓ All articles pass\n'));
      }
      spinner.succeed(hasBlocking ? 'Constitution check completed with violations' : 'Constitution check passed');
    } else if (action === 'fix') {
      await new ConstitutionFixCommand(createSpinner('Fixing constitution violations...')).execute(process.cwd(), { article: options.article ? Number(options.article) : null, dryRun: options.dryRun, workspace: options.workspace });
    } else if (action === 'status') {
      await new ConstitutionStatusCommand().execute(options);
    } else if (action === 'audit') {
      await new AuditCommand().execute(process.cwd(), options);
    } else if (action === 'waive') {
      await new WaiverManager(process.cwd()).add(target, options);
    } else {
      console.log(chalk.yellow(`Unknown action: ${action}. Supported: show, check, fix, status, audit, waive.`));
    }
  }));

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
  .action(safeAction(async (action, topic, options) => {
    const engine = new AgentEngine();
    if (action === 'start') {
      if (!topic) throw new Error('Topic is required to start.');
      const state = engine.start(topic, { rounds: options.rounds });
      console.log(chalk.green(`Simulation started: ${topic}`));
      if (options.json) console.log(JSON.stringify(state, null, 2));
    } else if (action === 'next') {
      const turn = await engine.nextTurn();
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
  }));

program.command('agent [goal...]')
  .description('Preview the native STDD code-agent kernel contract')
  .option('--mode <mode>', 'Permission mode: suggest, guarded, autonomous', 'guarded')
  .option('--list-tools', 'List the native agent tool catalog')
  .option('--read <path>', 'Safely read a workspace text file through fs.read')
  .option('--search <query>', 'Safely search workspace text files through fs.search')
  .option('--patch-preview <file>', 'Validate a unified diff file through fs.patch without applying it')
  .option('--patch-apply <file>', 'Apply a unified diff file through fs.patch with explicit CLI approval')
  .option('--test-run', 'Run configured tests through test.run')
  .option('--test-command <cmd>', 'Override test command for --test-run')
  .option('--workspace <workspace>', 'Workspace scope for --test-run')
  .option('--timeout <ms>', 'Timeout for --test-run commands')
  .option('--git-diff', 'Inspect git status and diff through git.diff')
  .option('--fix-packet', 'Build an agent fix packet from current git/test context')
  .option('--patch', 'Include full git diff patch with --git-diff')
  .option('--max-bytes <n>', 'Maximum diff bytes for --git-diff --patch')
  .option('--cycle', 'Run minimal patch cycle: git diff -> patch apply -> test run -> git diff')
  .option('--patch-file <file>', 'Patch file for --cycle')
  .option('--path <path>', 'Search root for --search', '.')
  .option('--limit <n>', 'Maximum search results')
  .option('--json', 'JSON output')
  .option('--dry-run', 'Plan only; do not execute tools', true)
  .action(safeAction(async (goal, options) => {
    await new AgentCommand(process.cwd()).execute(goal, options);
  }));

agentCmd.command('sudo [file]')
  .description('Interpret SudoLang pseudo-code and generate artifacts')
  .option('--generate')
  .option('--json')
  .action(safeAction(async (file, options) => {
    const parser = new SudoLangParser();
    if (!file) throw new Error('Source file path is required.');
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
  }));

// ─── New CLI commands for previously Skill-only features ───
program.command('vision [action]')
  .description('Project vision document management')
  .option('--json', 'JSON output')
  .option('--force', 'Force overwrite')
  .action(safeAction(async (action, options) => {
    const cmd = new VisionCommand(process.cwd());
    await cmd.execute(action || 'show', [], options);
  }));

program.command('prp [action] [title...]')
  .description('What/Why/How/Success structured planning')
  .option('--json', 'JSON output')
  .option('--what <text>', 'What section content')
  .option('--why <text>', 'Why section content')
  .option('--how <text>', 'How section content')
  .option('--force', 'Force overwrite')
  .action(safeAction(async (action, title, options) => {
    const cmd = new PrpCommand(process.cwd());
    await cmd.execute(action || 'create', title, options);
  }));

program.command('design [action] [dir]')
  .description('Design system document generation')
  .option('--json', 'JSON output')
  .option('--preset <name>', 'Design preset (modern, dark, minimal)')
  .option('-p <name>', 'Design preset (shorthand)')
  .option('--no-preview', 'Skip preview.html and preview-dark.html generation')
  .option('--force', 'Force overwrite')
  .action(safeAction(async (action, dir, options) => {
    const cmd = new DesignCommand(process.cwd());
    await cmd.execute(action || 'create', [dir], options);
  }));

program.command('certainty [action] [args...]')
  .description('5-dimension confidence scoring')
  .option('--json', 'JSON output')
  .option('--scores <scores>', 'Pre-defined scores (req:4,tech:5,...)')
  .option('--set <thresholds>', 'Configure thresholds')
  .action(safeAction(async (action, args, options) => {
    const cmd = new CertaintyCommand(process.cwd());
    await cmd.execute(action || 'assess', args, options);
  }));

program.command('complexity [action] [path]')
  .description('Code complexity analysis')
  .option('--json', 'JSON output')
  .option('--limit <n>', 'Limit results')
  .action(safeAction(async (action, target, options) => {
    const cmd = new ComplexityCommand(process.cwd());
    await cmd.execute(action || 'analyze', [target || ''], options);
  }));

program.command('factory [action] [typeName]')
  .description('Test data factory generation')
  .option('--json', 'JSON output')
  .option('--fields <list>', 'Comma-separated field list')
  .option('--locale <locale>', 'Faker locale')
  .option('--force', 'Force overwrite')
  .action(safeAction(async (action, typeName, options) => {
    const cmd = new FactoryCommand(process.cwd());
    await cmd.execute(action || 'list', [typeName || ''], options);
  }));

program.command('iterate [action] [args...]')
  .description('Plan-Execute-Reflect iteration loop')
  .option('--json', 'JSON output')
  .option('--plan <text>', 'Plan content')
  .option('--reflection <text>', 'Reflection content')
  .option('--next <text>', 'Next steps')
  .action(safeAction(async (action, args, options) => {
    const cmd = new IterateCommand(process.cwd());
    await cmd.execute(action || 'status', args, options);
  }));

program.command('help [topic]')
  .description('Context-aware help system')
  .option('--json', 'JSON output')
  .action(safeAction(async (topic, options) => {
    const cmd = new HelpCommand(process.cwd());
    await cmd.execute(topic, [], options);
  }));

program.command('parallel [action] [intent]')
  .description('DAG parallel execution')
  .option('--json', 'JSON output')
  .option('-p <n>', 'Max parallel tasks')
  .option('--parallel <n>', 'Max parallel tasks (full)')
  .option('--strategy <name>', 'Parallel strategy (all, any, race)')
  .option('--dry-run', 'Plan without executing')
  .action(safeAction(async (action, intent, options) => {
    const cmd = new ParallelCommand(process.cwd());
    await cmd.execute(action || 'status', [intent || ''], options);
  }));

program.command('supervisor [action] [args...]')
  .description('Multi-agent coordination and supervision')
  .option('--json', 'JSON output')
  .option('--roles <list>', 'Comma-separated role list')
  .option('--rounds <n>', 'Number of discussion rounds')
  .action(safeAction(async (action, args, options) => {
    const cmd = new SupervisorCommand(process.cwd());
    await cmd.execute(action || 'status', args, options);
  }));

program.command('profile [action]')
  .description('Detect and manage planning depth profiles for adaptive workflows')
  .option('--json', 'JSON output')
  .option('--change <name>', 'Change type for specific profiling')
  .option('--force', 'Force overwrite')
  .action(safeAction(async (action, options) => {
    const cmd = new ProfileCommand(process.cwd());
    await cmd.execute(action || 'detect', [], options);
  }));

program.command('modules [action] [args...]')
  .description('Browse, search, install, and manage STDD modules from the marketplace')
  .option('--json', 'JSON output')
  .option('--category <cat>', 'Filter by category (for search)')
  .addHelpText('after', `Actions: featured, search, install, list, info, publish, categories

Examples:
  stdd modules                     # Show featured/official modules
  stdd modules search tdd          # Search for modules matching "tdd"
  stdd modules search workflow --category workflow
  stdd modules install stdd-tdd-core
  stdd modules info stdd-tdd-core
  stdd modules list
  stdd modules categories
  stdd modules publish ./my-module`)
  .action(safeAction(async (action, args, options) => {
    const cmd = new ModulesCommand(process.cwd());
    await cmd.execute(action || 'featured', args || [], options);
  }));


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
