/**
 * Help Command
 * Context-aware help system for Chaos Code.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { createLogger } = require('../../utils/logger');
const { detectTechStack } = require('../../utils/tech-stack-detector');
const _logger = createLogger('help');

const COMMAND_CATEGORIES = {
  'Core Workflow': ['init', 'new', 'propose', 'spec', 'plan', 'apply', 'verify', 'archive'],
  'Quick Start': ['ff', 'turbo', 'issue', 'continue'],
  'SDD Enhancement': ['api-spec', 'schema', 'contract', 'validate', 'fix-packet'],
  'TDD Enhancement': ['mutation', 'outside-in', 'tdd', 'mock', 'factory'],
  'Quality & Governance': ['guard', 'constitution', 'hooks', 'audit', 'metrics'],
  'Planning & Design': ['prp', 'vision', 'design', 'certainty', 'complexity'],
  'Learning & Memory': ['learn', 'memory', 'iterate', 'brainstorm', 'explore'],
  'Graph Engine': ['graph', 'graph-run', 'graph-history', 'recommend'],
  'Workspace & Project': ['workspace', 'context', 'doctor', 'depcheck'],
  'Documentation': ['story', 'product-proposal', 'final-doc', 'commit'],
  'Testing & CI': ['user-test', 'pipeline', 'ci-generator', 'browser'],
  'Advanced': ['roles', 'supervisor', 'parallel', 'runtime'],
  'Info & Status': ['status', 'list', 'skills', 'commands', 'progress', 'starters'],
};

class HelpCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
  }

  async execute(topic, args = [], options = {}) {
    switch (topic) {
      case 'workflow':
      case 'guide':
        return this.workflowGuide(options);
      case 'commands':
      case 'cmds':
        return this.listCommands(options);
      case 'search':
        return this.search(args.join(' '), options);
      case 'context':
        return this.contextHelp(options);
      case 'troubleshoot':
        return this.troubleshoot(options);
      case 'cheatsheet':
        return this.cheatsheet(options);
      case null:
      case undefined:
        return this.overview(options);
      default:
        return this.commandHelp(topic, options);
    }
  }

  async overview(_options = {}) {
    const techStack = await detectTechStack(this.cwd);

    const output = [
      chalk.bold('\nChaos Code - Spec & Test Driven AI Copilot\n'),
      chalk.dim('─'.repeat(50)),
      '',
      chalk.bold('Quick Start:'),
      '  chaos init                    # Initialize project',
      '  chaos new change <name>        # Create a change',
      '  chaos ff "<description>"       # Fast-forward all steps',
      '  chaos apply <change>           # TDD implementation',
      '  chaos verify <change>          # Verify & validate',
      '  chaos archive <change>         # Archive completed change',
      '',
      chalk.bold('Common Workflows:'),
      '  chaos issue "<bug>"            # Bug fix workflow',
      '  chaos turbo "<feature>"        # One-shot full workflow',
      '  chaos outside-in init          # Outside-in TDD',
      '',
      chalk.bold('Quality Gates:'),
      '  chaos constitution check       # Check compliance',
      '  chaos guard                    # TDD quality gate',
      '  chaos metrics                  # Quality metrics',
      '',
      chalk.bold('Get Help:'),
      `  chaos help <command>           # Command-specific help`,
      `  chaos help workflow            # Detailed workflow guide`,
      `  chaos help search <term>       # Search for help`,
      '',
    ];

    if (techStack.language) {
      output.push(
        chalk.bold('Detected Stack:'),
        `  Language: ${chalk.cyan(techStack.language)}`,
        `  Test Framework: ${chalk.cyan(techStack.testFramework || 'unknown')}`,
        ''
      );
    }

    output.push(chalk.dim('─'.repeat(50)));
    output.push(`  ${chalk.dim('Full docs: https://github.com/Marcher-lam/chaos-code')}\n`);

    console.log(output.join('\n'));
    return { topic: 'overview', techStack };
  }

  async workflowGuide(_options = {}) {
    const output = [
      chalk.bold('\nChaos Code Workflow Guide\n'),
      chalk.dim('─'.repeat(50)),
      '',
      chalk.bold('1. Initialization'),
      '  chaos init                    # Set up Chaos Code in your project',
      '  chaos start                    # Interactive quick-start',
      '',
      chalk.bold('2. Requirements Phase'),
      '  chaos new change <name>        # Create a change',
      '  chaos propose                  # Generate proposal',
      '  chaos clarify                  # Clarify requirements (78 methods)',
      '  chaos confirm                  # Human confirmation gate',
      '',
      chalk.bold('3. Specification Phase'),
      '  chaos spec <change>            # Generate BDD specs',
      '  chaos api-spec <change>        # API specifications',
      '  chaos schema                   # JSON Schema/Zod types',
      '',
      chalk.bold('4. Planning Phase'),
      '  chaos plan <change>            # Task breakdown',
      '  chaos prp                      # What/Why/How/Success planning',
      '',
      chalk.bold('5. Implementation Phase (TDD)'),
      '  chaos apply <change>           # Red-Green-Refactor loop',
      '  chaos continue <change>        # Continue next task',
      '  chaos outside-in               # E2E → Integration → Unit',
      '',
      chalk.bold('6. Verification Phase'),
      '  chaos verify <change>          # Run all checks',
      '  chaos mutation <change>        # Mutation testing',
      '  chaos validate <change>        # Spec validation',
      '',
      chalk.bold('7. Completion Phase'),
      '  chaos archive <change>         # Merge and archive',
      '  chaos commit <change>          # Atomic commits',
      '',
      chalk.bold('Quality Gates (run anytime)'),
      '  chaos constitution check       # 9-article compliance',
      '  chaos guard                    # TDD gate check',
      '  chaos metrics                  # Quality dashboard',
      '',
      chalk.dim('─'.repeat(50)),
      '',
    ];

    console.log(output.join('\n'));
    return { topic: 'workflow' };
  }

  listCommands(_options = {}) {
    const output = [chalk.bold('\nChaos Code Commands\n'), chalk.dim('─'.repeat(50)), ''];

    for (const [category, commands] of Object.entries(COMMAND_CATEGORIES)) {
      output.push(chalk.bold(category + ':'));
      for (const cmd of commands) {
        output.push(`  chaos ${chalk.cyan(cmd.padEnd(20))} ${this.getShortDescription(cmd)}`);
      }
      output.push('');
    }

    output.push(chalk.dim(`  Run ${chalk.cyan('chaos help <command>')} for detailed help.\n`));

    console.log(output.join('\n'));
    return { topic: 'commands', categories: Object.keys(COMMAND_CATEGORIES) };
  }

  getShortDescription(cmd) {
    const descriptions = {
      init: 'Initialize STDD project',
      new: 'Create a new change',
      propose: 'Generate proposal',
      spec: 'Generate BDD specs',
      plan: 'Task breakdown',
      apply: 'TDD implementation',
      verify: 'Verify & validate',
      archive: 'Archive completed change',
      ff: 'Fast-forward all steps',
      turbo: 'One-shot workflow',
      issue: 'Bug fix workflow',
      continue: 'Continue next task',
      'api-spec': 'API specifications',
      schema: 'JSON Schema types',
      contract: 'Contract testing',
      validate: 'Spec validation',
      'fix-packet': 'Failure repair context',
      mutation: 'Mutation testing',
      'outside-in': 'Outside-in TDD',
      tdd: 'Test skeleton generation',
      mock: 'Mock generation',
      factory: 'Test data factories',
      guard: 'TDD quality gate',
      constitution: 'Compliance checks',
      hooks: 'Hook management',
      audit: 'Constitution audit',
      metrics: 'Quality metrics',
      prp: 'What/Why/How/Success',
      vision: 'Project vision',
      design: 'Design system',
      certainty: 'Confidence scoring',
      complexity: 'Code complexity',
      learn: 'Pattern learning',
      memory: 'Memory management',
      iterate: 'Plan-Execute-Reflect',
      brainstorm: 'Multi-angle analysis',
      explore: 'Code exploration',
      graph: 'Skill graph',
      'graph-run': 'Execute graph',
      'graph-history': 'Graph history',
      recommend: 'Next step recommendation',
      workspace: 'Monorepo workspace',
      context: 'Project context',
      doctor: 'Project health',
      depcheck: 'Dependency check',
      story: 'Story mapping',
      'product-proposal': 'Product proposal',
      'final-doc': 'Final documentation',
      commit: 'Atomic commits',
      'user-test': 'User test scripts',
      pipeline: 'Test pipeline',
      'ci-generator': 'CI configuration',
      browser: 'Browser automation',
      roles: 'Agent roles',
      supervisor: 'Multi-agent coordination',
      parallel: 'Parallel execution',
      runtime: 'Runtime engines',
      status: 'Show status',
      list: 'List items',
      skills: 'List skills',
      commands: 'List commands',
      progress: 'Show progress',
      starters: 'Project starters',
    };
    return descriptions[cmd] || '';
  }

  search(query, options = {}) {
    if (!query) {
      throw new Error('Search query is required. Usage: chaos help search "<query>"');
    }

    const queryLower = query.toLowerCase();
    const results = [];

    for (const [category, commands] of Object.entries(COMMAND_CATEGORIES)) {
      for (const cmd of commands) {
        const desc = this.getShortDescription(cmd).toLowerCase();
        if (cmd.includes(queryLower) || desc.includes(queryLower)) {
          results.push({ command: cmd, description: this.getShortDescription(cmd), category });
        }
      }
    }

    if (options.json) {
      console.log(JSON.stringify({ query, results, count: results.length }, null, 2));
    } else {
      console.log(chalk.bold('\nSearch Results\n'));
      console.log(`  Query: ${chalk.cyan(query)}`);
      console.log(`  Found: ${chalk.cyan(results.length.toString())} results\n`);

      if (results.length === 0) {
        console.log(chalk.dim('  No matches found. Try different keywords.\n'));
      } else {
        results.forEach(r => {
          console.log(`  ${chalk.cyan('chaos ' + r.command)} - ${r.description}`);
        });
        console.log('');
      }
    }

    return { query, results, count: results.length };
  }

  async contextHelp(_options = {}) {
    const techStack = await detectTechStack(this.cwd);

    const output = [
      chalk.bold('\nContext-Specific Help\n'),
      chalk.dim('─'.repeat(50)),
      '',
    ];

    if (techStack.language) {
      output.push(chalk.bold('Detected Configuration:'));
      output.push(`  Language: ${chalk.cyan(techStack.language)}`);
      output.push(`  Test Framework: ${chalk.cyan(techStack.testFramework || 'unknown')}`);
      output.push('');
    }

    const stddConfigPath = path.join(this.cwd, 'stdd', 'config.yaml');
    if (fs.existsSync(stddConfigPath)) {
      output.push(chalk.bold('Chaos Code Status:'));
      output.push(`  ${chalk.green('✓')} Project initialized`);
      output.push(`  Config: ${chalk.dim(stddConfigPath)}`);

      const changesPath = path.join(this.cwd, 'stdd', 'changes');
      if (fs.existsSync(changesPath)) {
        const changes = fs.readdirSync(changesPath).filter(d => !d.startsWith('.'));
        output.push(`  Active changes: ${chalk.cyan(changes.length.toString())}`);
      }
      output.push('');
    } else {
      output.push(chalk.bold('Chaos Code Status:'));
      output.push(`  ${chalk.yellow('○')} Not initialized`);
      output.push(`  Run ${chalk.cyan('chaos init')} to get started`);
      output.push('');
    }

    output.push(chalk.bold('Recommended Next Steps:'));
    output.push(`  ${chalk.cyan('chaos doctor')} - Check project health`);
    output.push(`  ${chalk.cyan('chaos status')} - Show current status`);
    output.push(`  ${chalk.cyan('chaos recommend')} - Get recommendations\n`);

    console.log(output.join('\n'));
    return { context: techStack, initialized: fs.existsSync(stddConfigPath) };
  }

  troubleshoot(_options = {}) {
    const output = [
      chalk.bold('\nTroubleshooting Guide\n'),
      chalk.dim('─'.repeat(50)),
      '',
      chalk.bold('Common Issues:'),
      '',
      chalk.yellow('Problem: Tests not found'),
      '  chaos doctor                    # Check project health',
      '  chaos tdd init                  # Generate test skeleton',
      '',
      chalk.yellow('Problem: Low test coverage'),
      '  chaos metrics                   # Check coverage',
      '  chaos guard                     # Identify gaps',
      '',
      chalk.yellow('Problem: Constitution violations'),
      '  chaos constitution check        # Check violations',
      '  chaos constitution fix          # Auto-fix some issues',
      '',
      chalk.yellow('Problem: Chaos Code not initialized'),
      '  chaos init                      # Initialize project',
      '',
      chalk.yellow('Problem: Change not progressing'),
      '  chaos status <change>           # Check status',
      '  chaos recommend                 # Get next step',
      '',
      chalk.yellow('Problem: Hooks not working'),
      '  chaos hooks verify              # Verify hooks',
      '  chaos hooks install             # Re-install hooks',
      '',
      chalk.bold('Get More Help:'),
      '  chaos help <command>            # Command-specific help',
      '  chaos help search <term>        # Search documentation',
      `  ${chalk.dim('https://github.com/Marcher-lam/chaos-code/issues')}\n`,
    ];

    console.log(output.join('\n'));
    return { topic: 'troubleshoot' };
  }

  cheatsheet(_options = {}) {
    const output = [
      chalk.bold('\nChaos Code Cheatsheet\n'),
      chalk.dim('─'.repeat(50)),
      '',
      chalk.bold('Quick Commands:'),
      '  chaos init                      # Initialize',
      '  chaos ff "<desc>"               # Quick flow',
      '  chaos turbo "<desc>"            # One-shot',
      '  chaos issue "<bug>"             # Bug fix',
      '',
      chalk.bold('Common Workflow:'),
      '  new → spec → plan → apply → verify → archive',
      '',
      chalk.bold('Status & Info:'),
      '  chaos status                    # Overall status',
      '  chaos list                      # List changes',
      '  chaos progress                  # Show progress',
      '',
      chalk.bold('Quality:'),
      '  chaos constitution check       # Compliance',
      '  chaos guard                     # TDD gate',
      '  chaos metrics                   # Metrics',
      '',
      chalk.bold('Testing:'),
      '  chaos mutation                  # Mutation test',
      '  chaos outside-in                # Outside-in TDD',
      '  chaos mock                      # Mock generation',
      '',
      chalk.bold('Flags:'),
      '  --json                         # JSON output',
      '  --workspace <path>             # Monorepo scope',
      '  --force                        # Force action',
      '',
      chalk.dim('─'.repeat(50)),
      `  ${chalk.dim('Run "chaos help <command>" for details')}\n`,
    ];

    console.log(output.join('\n'));
    return { topic: 'cheatsheet' };
  }

  commandHelp(command, _options = {}) {
    const description = this.getShortDescription(command);
    const output = [
      chalk.bold(`\nchaos ${command}\n`),
      chalk.dim(description),
      '',
    ];

    // Try to find command file for more detailed help
    const commandPath = path.join(__dirname, `${command}.js`);
    if (fs.existsSync(commandPath)) {
      output.push(chalk.dim('─'.repeat(50)));
      output.push('');
      output.push(chalk.bold('Usage:'));
      output.push(`  chaos ${command} [options] [args]\n`);
    }

    output.push(chalk.dim(`Run ${chalk.cyan('chaos help workflow')} for usage examples.\n`));

    console.log(output.join('\n'));
    return { command, description };
  }
}

module.exports = { HelpCommand };
