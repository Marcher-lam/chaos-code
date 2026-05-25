// ─── Command Registry ───
// Centralized command definitions for dynamic loading

const commandRegistry = [
  {
    name: 'init [path]',
    description: 'Initialize STDD Copilot in your project',
    options: [
      { flags: '--force', description: 'Overwrite existing files' },
      { flags: '--skip-skills', description: 'Skip copying skills' },
      { flags: '-y, --yes', description: 'Run non-interactively' },
    ],
    helpText: `\nExamples:\n  stdd init\n  stdd init /path/to/project\n  stdd init --force\n  stdd init --skip-skills --yes`,
    action: 'InitCommand',
    spinner: 'Initializing STDD Copilot',
    success: 'STDD initialized successfully!',
    mapper: (targetPath, options) => [require('path').resolve(targetPath || '.'), options],
  },
  {
    name: 'update [path]',
    description: 'Update STDD Copilot files',
    options: [
      { flags: '--force', description: 'Force update' },
      { flags: '--dry-run', description: 'Show changes without writing' },
    ],
    action: 'UpdateCommand',
    spinner: 'Updating STDD Copilot',
    success: 'Update complete!',
  },
  {
    name: 'list',
    alias: 'ls',
    description: 'List all changes',
    options: [
      { flags: '--changes', description: 'List changes' },
      { flags: '--specs', description: 'List specs' },
      { flags: '--archived', description: 'Include archived' },
      { flags: '--json', description: 'JSON output' },
    ],
    helpText: `Examples:\n  stdd list\n  stdd list --specs\n  stdd list --archived\n  stdd list --json\n\n\`--archived\` applies to change listings, not spec listings.`,
    action: 'ListCommand',
  },
  {
    name: 'status [change]',
    description: 'Show status of a change',
    options: [
      { flags: '--json', description: 'JSON output' },
    ],
    helpText: `Examples:\n  stdd status\n  stdd status add-dark-mode\n  stdd status --json\n  stdd status add-dark-mode --json`,
    action: 'StatusCommand',
  },
  {
    name: 'skills',
    description: 'List all available STDD skills',
    options: [],
    helpText: `Examples:\n  stdd skills\n\nLists all skills from src/templates/skills/stdd/{name}/SKILL.md`,
    action: 'SkillsCommand',
  },
  {
    name: 'commands',
    description: 'List all Claude Code slash commands',
    helpText: `Examples:\n  stdd commands\n\nThis command lists Claude Code slash commands, not CLI commands like \`stdd init\`.`,
    action: 'CommandsCommand',
  },
  {
    name: 'new',
    description: 'Create new changes',
    subcommands: [
      {
        name: 'change <name>',
        description: 'Create a new change',
        options: [
          { flags: '--title <title>', description: 'Change title' },
        ],
        action: 'NewCommand',
        method: 'createChange',
        spinner: (name) => `Creating change: ${name}`,
        success: (name) => `Change '${name}' created!`,
      },
    ],
  },
  {
    name: 'ff <description>',
    description: 'Fast-forward: create change with pre-populated tasks',
    options: [
      { flags: '--change-name <name>', description: 'Custom change name' },
      { flags: '--workspace <workspace>', description: 'Scope to workspace' },
    ],
    action: 'FFCommand',
    spinner: 'Fast-forwarding',
    success: (result) => `Created fast-forward: ${result.changeName}`,
  },
  {
    name: 'issue <description>',
    description: 'Create bug-fix change',
    options: [
      { flags: '--title <title>', description: 'Issue title' },
      { flags: '--severity <severity>', description: 'Issue severity' },
      { flags: '--workspace <workspace>', description: 'Scope to workspace' },
    ],
    action: 'IssueCommand',
    spinner: 'Creating bug',
    success: 'Bug-fix change created!',
  },
  {
    name: 'turbo <description>',
    description: 'One-shot full process',
    options: [
      { flags: '--change-name <name>', description: 'Custom change name' },
      { flags: '--no-spec', description: 'Skip spec generation' },
    ],
    action: 'TurboCommand',
    spinner: 'Running Turbo',
    success: 'Turbo sequence completed!',
  },
  {
    name: 'apply [change]',
    description: 'Run next pending task',
    options: [
      { flags: '--task <id>', description: 'Task ID to apply' },
      { flags: '--dry-run', description: 'Show what would be done' },
      { flags: '--test-command <cmd>', description: 'Custom test command' },
      { flags: '--allow-no-tests', description: 'Explicitly allow apply phases to proceed without a test command' },
      { flags: '--phase <phase>', description: 'TDD phase: red, green, refactor' },
      { flags: '--delegate', description: 'Write cross-model delegation evidence on failure' },
      { flags: '--e2e-command <cmd>', description: 'Run E2E probe as part of apply evidence' },
      { flags: '--workspace <workspace>', description: 'Scope to workspace' },
    ],
    helpText: 'Examples:\n  stdd apply\n  stdd apply --dry-run\n  stdd apply --phase red\n  stdd apply --allow-no-tests',
    action: 'ApplyCommand',
  },
  {
    name: 'verify [change]',
    description: 'Verify change readiness',
    options: [
      { flags: '--no-constitution', description: 'Skip constitution check' },
      { flags: '--lint', description: 'Run lint check' },
      { flags: '--lint-command <cmd>', description: 'Custom lint command' },
      { flags: '--test-command <cmd>', description: 'Custom test command' },
      { flags: '--workspace <workspace>', description: 'Scope to workspace' },
    ],
    helpText: `\nExamples:\n  stdd verify\n  stdd verify --lint\n  stdd verify --workspace packages/api`,
    action: 'VerifyCommand',
  },
  {
    name: 'archive [change]',
    description: 'Archive completed change',
    action: 'ArchiveCommand',
  },
  {
    name: 'validate [change]',
    description: 'Validate specs and run Spec Guardian checks',
    options: [
      { flags: '--spec-guardian', description: 'Run implementation leakage checks' },
      { flags: '--fix', description: 'Write rewrite suggestions for diagnostics' },
      { flags: '--json', description: 'JSON output' },
    ],
    action: 'ValidateCommand',
  },
  {
    name: 'fix-packet [change]',
    description: 'Generate a Golden Packet style failure context for AI handoff',
    options: [
      { flags: '--test-output <file>', description: 'Include captured test output from a file' },
      { flags: '--test-command <cmd>', description: 'Test command to show in the packet' },
      { flags: '--task <task>', description: 'Task description to include' },
      { flags: '--json', description: 'JSON output' },
    ],
    action: 'FixPacketCommand',
  },
  {
    name: 'outside-in [action] [change]',
    description: 'Manage outside-in TDD registry and layer scaffolds',
    options: [
      { flags: '--feature <name>', description: 'Feature key for generated layer skeletons' },
      { flags: '--force', description: 'Overwrite registry during init' },
      { flags: '--json', description: 'JSON output' },
    ],
    action: 'OutsideInCommand',
  },
  {
    name: 'roles [action] [args...]',
    description: 'Run role utilities, party mode, or adversarial review',
    options: [
      { flags: '--roles <roles>', description: 'Comma-separated role ids for party mode' },
      { flags: '--json', description: 'JSON output' },
    ],
    action: 'RolesCommand',
  },
  {
    name: 'guard',
    description: 'Run STDD Guard checks',
    options: [
      { flags: '--no-constitution', description: 'Skip constitution check' },
      { flags: '--workspace <workspace>', description: 'Scope to workspace' },
      { flags: '--strict', description: 'Fail on warnings instead of passing' },
    ],
    action: 'GuardCommand',
  },
  {
    name: 'metrics [change]',
    description: 'Show metrics',
    options: [
      { flags: '--workspace <workspace>', description: 'Scope to workspace' },
      { flags: '--json', description: 'JSON output' },
    ],
    action: 'MetricsCommand',
  },
  {
    name: 'depcheck [path]',
    description: 'Check dependencies',
    options: [
      { flags: '--workspace <workspace>', description: 'Scope to workspace' },
      { flags: '--safe-list <list>', description: 'Safe list of dependencies' },
      { flags: '--json', description: 'JSON output' },
    ],
    action: 'DepcheckCommand',
  },
  {
    name: 'schema',
    description: 'Manage workflow and data schemas',
    subcommands: [
      {
        name: 'validate [path]',
        description: 'Validate schemas',
        options: [
          { flags: '--strict', description: 'Strict validation' },
          { flags: '--json', description: 'JSON output' },
        ],
        action: 'SchemaCommand.validate',
      },
      {
        name: 'create <name>',
        description: 'Create workflow schema',
        options: [
          { flags: '--force', description: 'Overwrite existing' },
          { flags: '--json', description: 'JSON output' },
        ],
        action: 'SchemaCommand.create',
      },
      {
        name: 'fork <source> <name>',
        description: 'Fork workflow schema',
        options: [
          { flags: '--force', description: 'Overwrite existing' },
          { flags: '--json', description: 'JSON output' },
        ],
        action: 'SchemaCommand.fork',
      },
    ],
  },
  {
    name: 'constitution [action] [target]',
    description: 'Manage constitution',
    options: [
      { flags: '--article <n>', description: 'Article number' },
      { flags: '--force', description: 'Force action' },
      { flags: '--reason <reason>', description: 'Reason for waiver' },
      { flags: '--days <days>', description: 'Waiver duration in days' },
      { flags: '--json', description: 'JSON output' },
      { flags: '--workspace <workspace>', description: 'Scope to workspace' },
      { flags: '--no-constitution', description: 'Skip constitution check' },
      { flags: '--lint', description: 'Run lint check' },
      { flags: '--dry-run', description: 'Show what would be done' },
    ],
    helpText: `Examples:\n  stdd constitution\n  stdd constitution show 2\n  stdd constitution show --article 7\n  stdd constitution check\n\nSupported actions: show, check`,
    action: 'ConstitutionCommand',
  },
  {
    name: 'graph',
    description: 'Graph engine commands',
    action: 'GraphCommand',
  },
  {
    name: 'workspace',
    description: 'Manage workspaces',
    subcommands: [
      {
        name: 'list',
        description: 'List workspaces',
        options: [
          { flags: '--json', description: 'JSON output' },
        ],
        action: 'WorkspaceCommand.list',
      },
      {
        name: 'validate',
        description: 'Validate registry',
        action: 'WorkspaceCommand.validate',
      },
      {
        name: 'repair',
        description: 'Repair registry',
        options: [
          { flags: '--dry-run', description: 'Show what would be done' },
        ],
        action: 'WorkspaceCommand.repair',
      },
    ],
  },
  {
    name: 'context [layer]',
    description: 'Show project context',
    options: [
      { flags: '--export', description: 'Export context to file' },
      { flags: '--workspace <workspace>', description: 'Scope to workspace' },
      { flags: '--json', description: 'JSON output' },
      { flags: '--format <format>', description: 'Output format' },
    ],
    action: 'ContextCommand',
  },
  {
    name: 'explore [scope]',
    description: 'Explore project',
    options: [
      { flags: '--output <file>', description: 'Output file' },
      { flags: '--json', description: 'JSON output' },
    ],
    action: 'ExploreCommand',
  },
  {
    name: 'ci [platform]',
    description: 'Generate CI config',
    options: [
      { flags: '--force', description: 'Overwrite existing' },
    ],
    action: 'CiGeneratorCommand',
  },
  {
    name: 'ci-generator [platform]',
    description: 'Generate CI config',
    options: [
      { flags: '--force', description: 'Overwrite existing' },
    ],
    action: 'CiGeneratorCommand',
  },
  {
    name: 'starters <subcommand> [args...]',
    description: 'Manage project starters',
    action: 'StartersCommand',
  },
  {
    name: 'extensions [action] [args...]',
    description: 'List, install, validate, and package STDD extensions',
    options: [
      { flags: '--json', description: 'JSON output' },
    ],
    action: 'ExtensionsCommand',
  },
  {
    name: 'story [action] [name]',
    description: 'Create story maps and convert journeys to BDD',
    options: [
      { flags: '--persona <persona>', description: 'Persona for story' },
      { flags: '--goal <goal>', description: 'Goal for story' },
      { flags: '--force', description: 'Overwrite existing' },
      { flags: '--json', description: 'JSON output' },
    ],
    action: 'StoryCommand',
  },
  {
    name: 'user-test [change]',
    description: 'Generate human and agent user test scripts',
    options: [
      { flags: '--human-only', description: 'Only human tests' },
      { flags: '--agent-only', description: 'Only agent tests' },
      { flags: '--json', description: 'JSON output' },
    ],
    action: 'UserTestCommand',
  },
  {
    name: 'pipeline [change]',
    description: 'Generate parser IR and acceptance test skeletons from specs',
    options: [
      { flags: '--json', description: 'JSON output' },
    ],
    action: 'PipelineCommand',
  },
  {
    name: 'recommend',
    description: 'Recommend next step',
    options: [
      { flags: '--workspace <workspace>', description: 'Scope to workspace' },
      { flags: '--json', description: 'JSON output' },
    ],
    action: 'RecommendCommand',
  },
  {
    name: 'memory <action> [args...]',
    description: 'Manage memory',
    action: 'MemoryCommand',
  },
  {
    name: 'memory-scan [action]',
    description: 'Scan project source code into memory artifacts',
    options: [
      { flags: '--source-dir <dir>', description: 'Source directory' },
      { flags: '--json', description: 'JSON output' },
    ],
    action: 'MemoryCommand',
  },
  {
    name: 'learn [action] [args...]',
    description: 'Learn project patterns and record feedback',
    options: [
      { flags: '--json', description: 'JSON output' },
    ],
    action: 'LearnCommand',
  },
  {
    name: 'commit [change]',
    description: 'Generate commit message',
    options: [
      { flags: '--format <format>', description: 'Output format (text|json)', default: 'text' },
      { flags: '--tdd', description: 'Use TDG red/green/refactor commit prefix' },
      { flags: '--phase <phase>', description: 'TDD phase prefix: red, green, refactor' },
      { flags: '--issue <number>', description: 'Issue number for traceability' },
      { flags: '--require-issue', description: 'Fail when no issue number is available' },
    ],
    action: 'CommitCommand',
  },
  {
    name: 'commit-msg [change]',
    description: 'Generate commit message',
    options: [
      { flags: '--format <format>', description: 'Output format (text|json)', default: 'text' },
      { flags: '--tdd', description: 'Use TDG red/green/refactor commit prefix' },
      { flags: '--phase <phase>', description: 'TDD phase prefix: red, green, refactor' },
      { flags: '--issue <number>', description: 'Issue number for traceability' },
      { flags: '--require-issue', description: 'Fail when no issue number is available' },
    ],
    action: 'CommitCommand',
  },
  {
    name: 'spec <change>',
    description: 'Generate specs from tasks',
    options: [
      { flags: '--merge', description: 'Merge with existing specs' },
    ],
    action: 'SpecGenerator',
  },
  {
    name: 'api-spec [change]',
    description: 'Generate OpenAPI spec',
    options: [
      { flags: '--format <format>', description: 'yaml or json', default: 'yaml' },
      { flags: '--workspace <workspace>', description: 'Scope to workspace' },
    ],
    action: 'ApiSpecCommand',
  },
  {
    name: 'contract <action> [change]',
    description: 'Manage contracts',
    options: [
      { flags: '--workspace <workspace>', description: 'Scope to workspace' },
      { flags: '--consumer <name>', description: 'Consumer name' },
      { flags: '--provider <name>', description: 'Provider name' },
    ],
    action: 'ContractCommand',
  },
  {
    name: 'mock [action] [target]',
    description: 'Mock generation (alias to mock-gen with additional functionality)',
    options: [
      { flags: '--json', description: 'JSON output' },
      { flags: '--type <type>', description: 'Mock type (module, function, api)' },
      { flags: '--methods <list>', description: 'API methods' },
      { flags: '--force', description: 'Force overwrite' },
    ],
    action: 'MockCommand',
  },
  {
    name: 'tdd-init [path]',
    description: 'Initialize test scaffolds',
    options: [
      { flags: '--source-dir <dir>', description: 'Source directory' },
      { flags: '--dry-run', description: 'Show what would be done' },
    ],
    action: 'TddInitCommand',
  },
  {
    name: 'audit',
    description: 'Historical compliance audit',
    options: [
      { flags: '--json', description: 'JSON output' },
    ],
    action: 'AuditCommand',
  },
  {
    name: 'continue [change]',
    description: 'Continue interrupted work',
    options: [
      { flags: '--force', description: 'Force continue' },
      { flags: '--dry-run', description: 'Show what would be done' },
      { flags: '--test-command <cmd>', description: 'Test command to use' },
    ],
    action: 'ContinueCommand',
  },
  {
    name: 'mutation [change]',
    description: 'Run mutation testing',
    options: [
      { flags: '--mode <mode>', description: 'quick or stryker', default: 'quick' },
      { flags: '--workspace <workspace>', description: 'Scope to workspace' },
      { flags: '--threshold <num>', description: 'Score threshold', default: '80' },
      { flags: '--json', description: 'JSON output' },
    ],
    action: 'MutationCommand',
  },
  {
    name: 'graph-run [intent]',
    description: 'Execute the full STDD workflow based on intent DAG',
    options: [
      { flags: '--change-name <name>', description: 'Custom change name' },
      { flags: '--workspace <workspace>', description: 'Run with workspace context' },
      { flags: '--skip-apply', description: 'Skip apply and verify steps' },
      { flags: '--skip-archive', description: 'Skip archive step' },
      { flags: '--description <text>', description: 'Feature description for generated change' },
    ],
    action: 'GraphRunCommand',
  },
  {
    name: 'graph-history [action] [id]',
    description: 'View graph execution history and replay evidence',
    options: [
      { flags: '--json', description: 'Output as JSON' },
      { flags: '--change <name>', description: 'Filter by change name' },
      { flags: '--workspace <workspace>', description: 'Filter by workspace' },
      { flags: '--verbose', description: 'Show full results' },
      { flags: '--no-verbose', description: 'Hide results detail' },
    ],
    action: 'GraphHistoryCommand',
  },
  {
    name: 'waiver-manager [action]',
    description: 'Manage constitution waivers',
    options: [
      { flags: '--article <n>', description: 'Article number' },
      { flags: '--reason <reason>', description: 'Waiver reason' },
      { flags: '--days <days>', description: 'Waiver duration in days' },
      { flags: '--force', description: 'Replace an existing waiver' },
      { flags: '--json', description: 'JSON output' },
    ],
    action: 'WaiverManagerCommand',
  },
  {
    name: 'runtime',
    description: 'Interact with STDD Runtime Engines',
    subcommands: [
      {
        name: 'agent <action> [topic]',
        description: 'Start/Manage multi-agent simulation (Party Mode)',
        options: [
          { flags: '--rounds <n>', description: 'Max rounds' },
          { flags: '--executor <name>', description: 'Executor adapter for run action (noop or shell)', default: 'noop' },
          { flags: '--command <cmd>', description: 'Shell command for --executor shell' },
          { flags: '--role <role>', description: 'Agent role for run action' },
          { flags: '--json', description: 'JSON output' },
        ],
        action: 'RuntimeAgentCommand',
      },
      {
        name: 'sudo [file]',
        description: 'Interpret SudoLang pseudo-code and generate artifacts',
        options: [
          { flags: '--generate', description: 'Generate STDD artifacts' },
          { flags: '--json', description: 'JSON output' },
        ],
        action: 'RuntimeSudoCommand',
      },
    ],
  },
  {
    name: 'brainstorm <topic...>',
    description: 'Advanced elicitation and reasoning engine',
    options: [
      { flags: '--method <id>', description: 'Specific elicitation method (e.g., first-principles)' },
      { flags: '--list', description: 'List available methods' },
      { flags: '--json', description: 'JSON output' },
    ],
    action: 'ElicitationCommand',
  },
  {
    name: 'baby-steps [task]',
    description: 'Interactive TDD guessing game guide',
    action: 'BabyStepsCommand',
  },
  {
    name: 'sudo run [file]',
    description: 'Execute SudoLang logic and return validation results',
    action: 'SudoExecutorCommand',
  },
  {
    name: 'browser',
    description: 'Built-in browser drive for E2E testing',
    subcommands: [
      {
        name: 'snapshot <url>',
        description: 'Take a screenshot of the URL and save as evidence',
        options: [
          { flags: '--width <width>', description: 'Viewport width', default: '1280' },
          { flags: '--height <height>', description: 'Viewport height', default: '800' },
        ],
        action: 'BrowserCommand.snapshot',
      },
      {
        name: 'inspect <url>',
        description: 'Inspect the page title and basic info',
        action: 'BrowserCommand.inspect',
      },
      {
        name: 'doctor',
        description: 'Check Playwright browser dependency health',
        options: [
          { flags: '--no-launch', description: 'Skip headless Chromium launch probe' },
          { flags: '--json', description: 'JSON output' },
        ],
        action: 'BrowserCommand.doctor',
      },
    ],
  },
  {
    name: 'product-proposal',
    description: 'Generate a structured product proposal document',
    options: [
      { flags: '--json', description: 'JSON output' },
    ],
    action: 'ProductProposalCommand',
    spinner: 'Generating product proposal',
    success: 'Product proposal generated!',
  },
  {
    name: 'propose [action] [name]',
    description: 'Draft requirement proposals with boundary clarification',
    options: [
      { flags: '--description <text>', description: 'Requirement description' },
      { flags: '--force', description: 'Overwrite existing proposal' },
      { flags: '--dry-run', description: 'Show proposal without saving' },
      { flags: '--json', description: 'JSON output' },
    ],
    action: 'ProposeCommand',
    helpText: `Actions: draft, show, refine, validate, split\n\nExamples:\n  stdd propose draft add-user-auth\n  stdd propose show\n  stdd propose validate`,
  },
  {
    name: 'clarify [action] [change]',
    description: 'Multi-round requirement clarification',
    options: [
      { flags: '--rounds <n>', description: 'Number of clarification rounds', default: '3' },
      { flags: '--focus <area>', description: 'Focus on specific area' },
      { flags: '--json', description: 'JSON output' },
    ],
    action: 'ClarifyCommand',
    helpText: `Actions: clarify, questions, edge-cases, constraints\n\nExamples:\n  stdd clarify add-user-auth\n  stdd clarify questions`,
  },
  {
    name: 'confirm [change]',
    description: 'User confirmation gate before specification',
    options: [
      { flags: '--skip', description: 'Skip confirmation (auto-confirm)' },
      { flags: '--json', description: 'JSON output' },
    ],
    action: 'ConfirmCommand',
    helpText: `Examples:\n  stdd confirm\n  stdd confirm add-user-auth\n\nDisplays proposal summary and requests approval.`,
  },
  {
    name: 'plan [action] [change]',
    description: 'Evaluate architecture and generate micro-task list',
    options: [
      { flags: '--tasks <n>', description: 'Target number of tasks (default: 5-6)' },
      { flags: '--estimate', description: 'Include time estimates' },
      { flags: '--json', description: 'JSON output' },
    ],
    action: 'PlanCommand',
    helpText: `Actions: generate, show, estimate, dependencies\n\nExamples:\n  stdd plan add-user-auth\n  stdd plan estimate\n  stdd plan dependencies`,
  },
  {
    name: 'execute [action] [change]',
    description: 'Run Ralph Loop TDD closed-loop execution',
    options: [
      { flags: '--phase <phase>', description: 'Specific phase: red, green, refactor' },
      { flags: '--max-tasks <n>', description: 'Maximum tasks to execute' },
      { flags: '--json', description: 'JSON output' },
    ],
    action: 'ExecuteCommand',
    helpText: `Actions: run, status, evidence, retry\n\nLoop: RED → CHECK → GREEN → MUTATION → REFACTOR\n\nExamples:\n  stdd execute run\n  stdd execute status`,
  },
  {
    name: 'final-doc [change]',
    description: 'Generate final aggregated requirement document',
    options: [
      { flags: '--output <file>', description: 'Output file name', default: 'FINAL_REQUIREMENT.md' },
      { flags: '--include-evidence', description: 'Include execution evidence' },
      { flags: '--json', description: 'JSON output' },
    ],
    action: 'FinalDocCommand',
    helpText: `Examples:\n  stdd final-doc\n  stdd final-doc add-user-auth --include-evidence\n\nAggregates all phase artifacts into comprehensive document.`,
  },
  {
    name: 'commit-tdd [action] [change]',
    description: 'Atomic git commit with TDD phase prefix',
    options: [
      { flags: '--phase <phase>', description: 'TDD phase: red, green, refactor' },
      { flags: '--all', description: 'Stage all files' },
      { flags: '--amend', description: 'Amend last commit' },
      { flags: '--dry-run', description: 'Preview commit message' },
      { flags: '--skip-constitution', description: 'Skip constitution check' },
      { flags: '-y, --yes', description: 'Skip confirmation' },
    ],
    action: 'CommitTddCommand',
    helpText: `Actions: commit, check, amend, status\n\nExamples:\n  stdd commit-tdd commit\n  stdd commit-tdd check\n  stdd commit-tdd commit --phase green\n\nCreates atomic commits with red:/green:/refactor: prefix.`,
  },
  {
    name: 'profile [action]',
    description: 'Detect and manage planning depth profiles for adaptive workflows',
    options: [
      { flags: '--change <name>', description: 'Change type for specific profiling (hotfix, feature, refactor, compliance)' },
      { flags: '--json', description: 'JSON output' },
      { flags: '--force', description: 'Force overwrite' },
    ],
    action: 'ProfileCommand',
    helpText: `Actions: detect, set, list, recommend\n\nExamples:\n  stdd profile detect\n  stdd profile set thorough\n  stdd profile list\n  stdd profile recommend --change feature\n\nProfiles: quick (depth 1), standard (depth 2), thorough (depth 3), enterprise (depth 4)`,
  },
];

module.exports = { commandRegistry };
