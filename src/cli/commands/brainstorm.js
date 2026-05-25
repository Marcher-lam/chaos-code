/**
 * Brainstorm Command
 * Multi-perspective analysis and brainstorming for requirements and solutions
 * Enhanced: context-aware analysis using project metadata
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { createLogger } = require('../../utils/logger');
const logger = createLogger('brainstorm');
const { ANGLE_STRATEGIES, CONTEXT_HINT_SIGNALS } = require('../../config/brainstorm-strategies');

const DEFAULT_ANGLES = [
  'technical',
  'user',
  'business',
  'security',
  'performance',
  'maintainability',
  'scalability'
];

const ANGLE_TEMPLATES = {
  technical: {
    name: 'Technical',
    icon: '🔧',
    questions: [
      'What are the technical requirements and constraints?',
      'What technologies and frameworks are suitable?',
      'What are the potential technical risks?',
      'How does this integrate with existing systems?'
    ]
  },
  user: {
    name: 'User Experience',
    icon: '👤',
    questions: [
      'Who are the target users?',
      'What are the user pain points?',
      'How will users interact with this feature?',
      'What makes this intuitive and accessible?'
    ]
  },
  business: {
    name: 'Business',
    icon: '💼',
    questions: [
      'What is the business value?',
      'What are the success metrics?',
      'What is the cost-benefit analysis?',
      'How does this align with business goals?'
    ]
  },
  security: {
    name: 'Security',
    icon: '🔒',
    questions: [
      'What are the security requirements?',
      'What are potential vulnerabilities?',
      'How do we protect user data?',
      'What authentication/authorization is needed?'
    ]
  },
  performance: {
    name: 'Performance',
    icon: '⚡',
    questions: [
      'What are the performance requirements?',
      'What are the expected load patterns?',
      'How do we optimize for speed/efficiency?',
      'What are the scalability considerations?'
    ]
  },
  maintainability: {
    name: 'Maintainability',
    icon: '🛠',
    questions: [
      'How do we keep the code maintainable?',
      'What testing strategy is needed?',
      'How do we handle future changes?',
      'What documentation is required?'
    ]
  },
  scalability: {
    name: 'Scalability',
    icon: '📈',
    questions: [
      'How does this scale with growth?',
      'What are the bottlenecks?',
      'How do we handle increased load?',
      'What are the scaling strategies?'
    ]
  }
};

class BrainstormCommand {
  constructor() {
    this.angles = DEFAULT_ANGLES;
  }

  async execute(topic, options = {}) {
    if (!topic || topic.trim() === '') {
      throw new Error('Topic is required for brainstorming.');
    }

    // Subcommand routing: swot / adr
    if (options.subcommand === 'swot') {
      const context = await this.gatherContext(topic, this.cwd || process.cwd());
      return this.executeSWOT(topic, context, options);
    }
    if (options.subcommand === 'adr') {
      const context = await this.gatherContext(topic, this.cwd || process.cwd());
      return this.executeADR(topic, context, options);
    }

    const selectedAngles = options.angles
      ? options.angles.split(',').map(a => a.trim().toLowerCase())
      : DEFAULT_ANGLES;

    const numSolutions = parseInt(options.solutions, 10) || 3;
    const format = options.format || 'text';

    const context = await this.gatherContext(topic, this.cwd || process.cwd());
    const analysis = this.analyzeFromAngles(topic, selectedAngles, context);
    const solutions = this.generateSolutions(topic, numSolutions);

    if (format === 'json') {
      const output = {
        topic,
        timestamp: new Date().toISOString(),
        contextSummary: this.summarizeContext(context),
        analysis,
        solutions
      };
      console.log(JSON.stringify(output, null, 2));
      return output;
    }

    this.printTextOutput(topic, analysis, solutions, context);
    return { topic, analysis, solutions, contextSummary: this.summarizeContext(context) };
  }

  analyzeFromAngles(topic, angles, context) {
    const analysis = {};

    for (const angle of angles) {
      const template = ANGLE_TEMPLATES[angle];
      const strategy = ANGLE_STRATEGIES[angle];
      if (template) {
        // Generate context-specific hints from the strategy
        let contextualHints = [];
        if (strategy && strategy.analyzeFunction) {
          try {
            contextualHints = strategy.analyzeFunction(topic, context || {});
          } catch (_) {
            contextualHints = [];
          }
        }

        analysis[angle] = {
          name: template.name,
          icon: template.icon,
          considerations: template.questions.map((q, idx) => ({
            question: q,
            hint: (contextualHints && contextualHints[idx]) || this.generateContextualHint(topic, q, context || {})
          })),
          contextualInsights: contextualHints.length > 0 ? contextualHints : undefined
        };
      }
    }

    return analysis;
  }

  consider(topic, question) {
    return {
      question,
      hint: this.generateHint(topic, question)
    };
  }

  generateHint(topic, question) {
    const hints = [
      `Consider the impact on ${topic.split(' ')[0]}`,
      'Think about edge cases and error scenarios',
      'Evaluate trade-offs between different approaches',
      'Review existing patterns and best practices',
      'Consider long-term implications'
    ];
    return hints[Math.floor(Math.random() * hints.length)];
  }

  /**
   * Context-aware hint generator. Replaces random hint selection with
   * specific hints derived from project metadata.
   */
  generateContextualHint(topic, question, context) {
    if (!context || Object.keys(context).length === 0) {
      return this.generateHint(topic, question);
    }

    // Walk through signal mappings in priority order
    for (const signal of CONTEXT_HINT_SIGNALS) {
      try {
        if (signal.test(context)) {
          return signal.hint;
        }
      } catch (_) {
        continue;
      }
    }

    // Fallback to generic hints
    return this.generateHint(topic, question);
  }

  /**
   * Gather project context from well-known files.
   * Gracefully handles missing files - returns partial context.
   */
  async gatherContext(topic, cwd) {
    const context = {};

    // package.json -> techStack
    try {
      const pkgPath = path.join(cwd, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const raw = fs.readFileSync(pkgPath, 'utf8');
        const pkg = JSON.parse(raw);
        const deps = Object.keys(pkg.dependencies || {});
        const devDeps = Object.keys(pkg.devDependencies || {});
        context.techStack = {
          name: pkg.name || null,
          version: pkg.version || null,
          dependencies: deps,
          devDependencies: devDeps,
          scripts: pkg.scripts || {},
          allDeps: [...deps, ...devDeps],
        };
      }
    } catch (_) { /* non-fatal */ }

    // DESIGN.md -> designSystem
    try {
      const designPath = path.join(cwd, 'DESIGN.md');
      if (fs.existsSync(designPath)) {
        const content = fs.readFileSync(designPath, 'utf8');
        const tokenCount = (content.match(/token|color|spacing|typography/gi) || []).length;
        context.designSystem = {
          exists: true,
          tokenCount,
          preview: content.substring(0, 500),
        };
      }
    } catch (_) { /* non-fatal */ }

    // stdd/reports/complexity.json -> complexity
    try {
      const complexityPath = path.join(cwd, 'stdd', 'reports', 'complexity.json');
      if (fs.existsSync(complexityPath)) {
        const raw = fs.readFileSync(complexityPath, 'utf8');
        const data = JSON.parse(raw);
        let avgComplexity;
        let highRiskFiles = [];

        if (Array.isArray(data.files)) {
          const ccs = data.files
            .filter(f => typeof f.complexity === 'number')
            .map(f => f.complexity);
          if (ccs.length > 0) {
            avgComplexity = ccs.reduce((a, b) => a + b, 0) / ccs.length;
          }
          highRiskFiles = data.files
            .filter(f => typeof f.complexity === 'number' && f.complexity > 15)
            .sort((a, b) => b.complexity - a.complexity)
            .slice(0, 5)
            .map(f => f.path || f.file);
        } else if (typeof data.averageComplexity === 'number') {
          avgComplexity = data.averageComplexity;
        }

        context.complexity = {
          avgComplexity,
          highRiskFiles,
          raw: data,
        };
      }
    } catch (_) { /* non-fatal */ }

    // ARCHITECTURE.md -> architecture
    try {
      const archPath = path.join(cwd, 'ARCHITECTURE.md');
      if (fs.existsSync(archPath)) {
        const content = fs.readFileSync(archPath, 'utf8');
        context.architecture = content.substring(0, 2000);
      }
    } catch (_) { /* non-fatal */ }

    // stdd/changes/*/proposal.md -> recentChanges (last 3)
    try {
      const changesDir = path.join(cwd, 'stdd', 'changes');
      if (fs.existsSync(changesDir)) {
        const entries = fs.readdirSync(changesDir).filter(e => {
          const candidate = path.join(changesDir, e);
          return fs.statSync(candidate).isDirectory();
        });

        const changes = [];
        for (const entry of entries) {
          const proposalPath = path.join(changesDir, entry, 'proposal.md');
          if (fs.existsSync(proposalPath)) {
            const stat = fs.statSync(proposalPath);
            changes.push({ name: entry, mtime: stat.mtime.getTime() });
          }
        }

        changes.sort((a, b) => b.mtime - a.mtime);
        context.recentChanges = changes.slice(0, 3);
      }
    } catch (_) { /* non-fatal */ }

    // stdd/config.yaml -> projectConfig
    try {
      const configPath = path.join(cwd, 'stdd', 'config.yaml');
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8');
        context.projectConfig = { exists: true, preview: content.substring(0, 500) };
      }
    } catch (_) { /* non-fatal */ }

    return context;
  }

  /**
   * Summarize gathered context for display
   */
  summarizeContext(context) {
    if (!context) return null;
    const summary = {};
    if (context.techStack) {
      summary.projectName = context.techStack.name;
      summary.dependencyCount = context.techStack.dependencies ? context.techStack.dependencies.length : 0;
    }
    if (context.designSystem) summary.hasDesignSystem = true;
    if (context.complexity) {
      summary.avgComplexity = context.complexity.avgComplexity;
      summary.highRiskFileCount = context.complexity.highRiskFiles ? context.complexity.highRiskFiles.length : 0;
    }
    if (context.architecture) summary.hasArchitecture = true;
    if (context.recentChanges) summary.activeChanges = context.recentChanges.length;
    if (context.projectConfig) summary.hasProjectConfig = true;
    return summary;
  }

  /**
   * Generate SWOT analysis from project context.
   */
  generateSWOT(topic, context) {
    const swot = { strengths: [], weaknesses: [], opportunities: [], threats: [] };

    // Strengths: from tech stack (modern tools, good coverage)
    if (context.techStack) {
      const deps = context.techStack.allDeps || context.techStack.dependencies || [];
      if (deps.some(d => /typescript|eslint|prettier|vitest|jest|playwright/.test(d))) {
        swot.strengths.push('Modern tooling with TypeScript, linting, and testing infrastructure');
      }
      if (deps.some(d => /react|vue|svelte|next|nuxt/.test(d))) {
        swot.strengths.push('Component-based UI framework with strong ecosystem');
      }
      if (deps.some(d => /docker|kubernetes|terraform/.test(d))) {
        swot.strengths.push('Containerized deployment infrastructure');
      }
      if (deps.some(d => /prettier|eslint|stylelint|husky|lint-staged/.test(d))) {
        swot.strengths.push('Code quality enforcement via linting and formatting tools');
      }
    }
    if (context.designSystem) {
      swot.strengths.push('Design system in place - consistent UI patterns established');
    }
    if (context.architecture) {
      swot.strengths.push('Architecture documentation exists - shared understanding of system design');
    }

    // Weaknesses: from complexity (hotspots, high CC files)
    if (context.complexity) {
      if (context.complexity.highRiskFiles && context.complexity.highRiskFiles.length > 0) {
        swot.weaknesses.push(`High complexity in ${context.complexity.highRiskFiles.length} file(s): ${context.complexity.highRiskFiles.slice(0, 3).join(', ')}`);
      }
      if (context.complexity.avgComplexity !== undefined && context.complexity.avgComplexity > 15) {
        swot.weaknesses.push(`Average cyclomatic complexity (${context.complexity.avgComplexity.toFixed(1)}) is above recommended threshold (10)`);
      }
    }
    if (context.techStack) {
      const deps = context.techStack.dependencies || [];
      const devDeps = context.techStack.devDependencies || [];
      if (!deps.concat(devDeps).some(d => /jest|vitest|mocha|pytest|tape/.test(d))) {
        swot.weaknesses.push('No test framework detected - test coverage risk');
      }
    }
    if (!context.designSystem && context.techStack && (context.techStack.allDeps || []).some(d => /react|vue|svelte/.test(d))) {
      swot.weaknesses.push('No DESIGN.md found despite having a UI framework - design consistency risk');
    }

    // Opportunities: from recentChanges
    if (context.recentChanges && context.recentChanges.length > 0) {
      swot.opportunities.push(`${context.recentChanges.length} active change(s) in progress - potential for integration synergy`);
      const changeNames = context.recentChanges.map(c => c.name).join(', ');
      swot.opportunities.push(`Recent work on ${changeNames} may provide reusable patterns`);
    }
    if (context.techStack && context.techStack.scripts) {
      const scripts = context.techStack.scripts;
      if (scripts['test'] || scripts['test:ci']) {
        swot.opportunities.push('Automated testing pipeline ready for expansion');
      }
      if (scripts['build']) {
        swot.opportunities.push('Build pipeline in place - can add CI/CD stages');
      }
    }

    // Threats: from security patterns, missing tests, outdated deps
    if (context.techStack) {
      const deps = context.techStack.dependencies || [];
      if (!deps.concat(context.techStack.devDependencies || []).some(d => /helmet|cors|csurf|rate/.test(d))) {
        swot.threats.push('No visible security middleware (helmet, cors, rate-limiting) in dependencies');
      }
    }
    if (context.complexity && context.complexity.highRiskFiles && context.complexity.highRiskFiles.length > 5) {
      swot.threats.push('Multiple high-complexity files increase regression and security risk');
    }
    swot.threats.push('Dependency vulnerabilities - run audit regularly');

    // Ensure at least 2 items per quadrant
    const defaults = {
      strengths: ['Established codebase with defined structure'],
      weaknesses: ['Technical debt assessment needed'],
      opportunities: ['Iteration on existing features for incremental improvement'],
      threats: ['External dependency supply chain risk'],
    };
    for (const key of Object.keys(defaults)) {
      if (swot[key].length < 2) {
        swot[key].push(defaults[key][0]);
      }
    }

    return swot;
  }

  /**
   * Generate Architecture Decision Record from context + solutions.
   */
  generateADR(topic, solutions, context) {
    const topSolution = solutions && solutions.length > 0 ? solutions[0] : { name: 'TBD', description: 'Pending analysis' };
    const adr = {
      title: `ADR: ${topic}`,
      status: 'Proposed',
      date: new Date().toISOString().split('T')[0],
      context: [],
      decision: topSolution.name,
      description: topSolution.description || '',
      consequences: { positive: [], negative: [], neutral: [] },
      compliance: [],
    };

    // Build context section from gathered metadata
    if (context.techStack && context.techStack.name) {
      adr.context.push(`Project: ${context.techStack.name} (v${context.techStack.version || '0.0.0'})`);
    }
    if (context.techStack && context.techStack.dependencies && context.techStack.dependencies.length > 0) {
      adr.context.push(`Key runtime dependencies: ${context.techStack.dependencies.slice(0, 8).join(', ')}`);
    }
    if (context.complexity && context.complexity.avgComplexity !== undefined) {
      adr.context.push(`Average cyclomatic complexity: ${context.complexity.avgComplexity.toFixed(1)}`);
    }
    if (context.complexity && context.complexity.highRiskFiles && context.complexity.highRiskFiles.length > 0) {
      adr.context.push(`Complexity hotspots: ${context.complexity.highRiskFiles.slice(0, 3).join(', ')}`);
    }
    if (context.architecture) {
      adr.context.push(`Architecture: ${context.architecture.substring(0, 200).split('\n')[0]}`);
    }
    if (context.recentChanges && context.recentChanges.length > 0) {
      adr.context.push(`Active changes: ${context.recentChanges.map(c => c.name).join(', ')}`);
    }

    // Consequences from top solution
    if (topSolution.pros) {
      adr.consequences.positive = topSolution.pros.slice();
    }
    if (topSolution.cons) {
      adr.consequences.negative = topSolution.cons.slice();
    }
    adr.consequences.neutral = ['Requires team review and consensus before proceeding'];

    // Compliance notes
    if (context.projectConfig) {
      adr.compliance.push('Verify against stdd/config.yaml constraints');
    }
    adr.compliance.push('Ensure constitution articles are not violated');
    if (context.techStack && context.techStack.dependencies && context.techStack.dependencies.some(d => /jest|vitest|mocha/.test(d))) {
      adr.compliance.push('Update tests to cover new architectural decision');
    }

    return adr;
  }

  /**
   * Execute SWOT subcommand
   */
  executeSWOT(topic, context, options) {
    const swot = this.generateSWOT(topic, context);
    const format = options.format || 'text';

    if (format === 'json') {
      const output = { topic, timestamp: new Date().toISOString(), swot, contextSummary: this.summarizeContext(context) };
      console.log(JSON.stringify(output, null, 2));
      return output;
    }

    console.log('');
    console.log(chalk.bold('SWOT Analysis'));
    console.log(chalk.dim('='.repeat(50)));
    console.log(chalk.bold(`Topic: ${topic}`));
    console.log('');

    const sections = [
      { key: 'strengths', label: 'Strengths', color: chalk.green, icon: '+' },
      { key: 'weaknesses', label: 'Weaknesses', color: chalk.red, icon: '-' },
      { key: 'opportunities', label: 'Opportunities', color: chalk.blue, icon: '*' },
      { key: 'threats', label: 'Threats', color: chalk.yellow, icon: '!' },
    ];

    for (const section of sections) {
      console.log(section.color.bold(`  [${section.icon}] ${section.label}`));
      for (const item of swot[section.key]) {
        console.log(section.color(`    ${item}`));
      }
      console.log('');
    }

    console.log(chalk.dim('='.repeat(50)));
    console.log('');
    return { topic, swot, contextSummary: this.summarizeContext(context) };
  }

  /**
   * Execute ADR subcommand
   */
  executeADR(topic, context, options) {
    const solutions = this.generateSolutions(topic, 3);
    const adr = this.generateADR(topic, solutions, context);
    const format = options.format || 'text';

    if (format === 'json') {
      const output = { topic, timestamp: new Date().toISOString(), adr, contextSummary: this.summarizeContext(context) };
      console.log(JSON.stringify(output, null, 2));
      return output;
    }

    console.log('');
    console.log(chalk.bold('Architecture Decision Record'));
    console.log(chalk.dim('='.repeat(50)));
    console.log('');
    console.log(chalk.bold(`  Title: ${adr.title}`));
    console.log(`  Status: ${chalk.yellow(adr.status)}`);
    console.log(`  Date:   ${adr.date}`);
    console.log('');

    console.log(chalk.bold('  Context:'));
    for (const ctx of adr.context) {
      console.log(chalk.dim(`    - ${ctx}`));
    }
    console.log('');

    console.log(chalk.bold('  Decision:'));
    console.log(chalk.green(`    ${adr.decision}`));
    if (adr.description) {
      console.log(chalk.dim(`    ${adr.description}`));
    }
    console.log('');

    console.log(chalk.bold('  Consequences:'));
    console.log(chalk.green('    Positive:'));
    for (const item of adr.consequences.positive) {
      console.log(chalk.green(`      + ${item}`));
    }
    console.log(chalk.red('    Negative:'));
    for (const item of adr.consequences.negative) {
      console.log(chalk.red(`      - ${item}`));
    }
    console.log(chalk.dim('    Neutral:'));
    for (const item of adr.consequences.neutral) {
      console.log(chalk.dim(`      ~ ${item}`));
    }
    console.log('');

    if (adr.compliance.length > 0) {
      console.log(chalk.bold('  Compliance Notes:'));
      for (const note of adr.compliance) {
        console.log(chalk.yellow(`    ! ${note}`));
      }
      console.log('');
    }

    console.log(chalk.dim('='.repeat(50)));
    console.log('');
    return { topic, adr, contextSummary: this.summarizeContext(context) };
  }

  generateSolutions(topic, count) {
    const solutions = [];
    const approaches = [
      {
        name: 'Minimal Viable Approach',
        description: 'Start with the simplest implementation that meets core requirements',
        pros: ['Fast to implement', 'Easy to understand', 'Low risk'],
        cons: ['May need refactoring later', 'Limited functionality']
      },
      {
        name: 'Comprehensive Approach',
        description: 'Build a complete solution with all features from the start',
        pros: ['Complete feature set', 'Future-proof', 'Polished UX'],
        cons: ['Longer development time', 'Higher complexity', 'More testing needed']
      },
      {
        name: 'Iterative Approach',
        description: 'Build in phases, starting with core and expanding incrementally',
        pros: ['Early feedback', 'Flexible to changes', 'Risk mitigation'],
        cons: ['Requires planning', 'Multiple deployment cycles']
      },
      {
        name: 'Integration Approach',
        description: 'Leverage existing tools/services rather than building from scratch',
        pros: ['Faster time to market', 'Less maintenance', 'Proven solutions'],
        cons: ['Dependency on third parties', 'Potential cost', 'Less customization']
      },
      {
        name: 'Custom Solution',
        description: 'Build a tailored solution specifically for this use case',
        pros: ['Full control', 'Optimized for needs', 'No external dependencies'],
        cons: ['Higher development cost', 'Maintenance burden', 'Reinventing wheel']
      }
    ];

    for (let i = 0; i < Math.min(count, approaches.length); i++) {
      solutions.push({
        ...approaches[i],
        id: i + 1
      });
    }

    return solutions;
  }

  printTextOutput(topic, analysis, solutions, context) {
    console.log('');
    console.log(chalk.bold('🧠 Brainstorm Analysis'));
    console.log(chalk.dim('═'.repeat(50)));
    console.log('');
    console.log(chalk.bold(`Topic: ${topic}`));

    // Print context summary if available
    if (context) {
      const summary = this.summarizeContext(context);
      if (summary && Object.keys(summary).length > 0) {
        console.log('');
        console.log(chalk.bold('📋 Project Context'));
        console.log(chalk.dim('─'.repeat(40)));
        if (summary.projectName) {
          console.log(`  Project: ${chalk.cyan(summary.projectName)}`);
        }
        if (summary.dependencyCount !== undefined) {
          console.log(`  Dependencies: ${chalk.cyan(summary.dependencyCount)}`);
        }
        if (summary.hasDesignSystem) {
          console.log(`  Design System: ${chalk.green('DESIGN.md found')}`);
        }
        if (summary.hasArchitecture) {
          console.log(`  Architecture: ${chalk.green('ARCHITECTURE.md found')}`);
        }
        if (summary.avgComplexity !== undefined) {
          const color = summary.avgComplexity > 15 ? chalk.red : chalk.green;
          console.log(`  Avg Complexity: ${color(summary.avgComplexity.toFixed(1))}`);
        }
        if (summary.highRiskFileCount !== undefined && summary.highRiskFileCount > 0) {
          console.log(`  High-Risk Files: ${chalk.red(summary.highRiskFileCount)}`);
        }
        if (summary.activeChanges !== undefined) {
          console.log(`  Active Changes: ${chalk.yellow(summary.activeChanges)}`);
        }
      }
    }

    console.log('');

    // Print analysis by angle
    for (const [key, value] of Object.entries(analysis)) {
      console.log(chalk.bold(`${value.icon} ${value.name} Perspective`));
      console.log(chalk.dim('─'.repeat(40)));

      for (const consideration of value.considerations) {
        console.log(`  ${chalk.blue('❓')} ${consideration.question}`);
        console.log(`     ${chalk.dim(`💡 ${consideration.hint}`)}`);
        console.log('');
      }

      // Print contextual insights if available
      if (value.contextualInsights && value.contextualInsights.length > 0) {
        console.log(chalk.dim(`  Contextual insights:`));
        for (const insight of value.contextualInsights) {
          console.log(chalk.cyan(`    → ${insight}`));
        }
        console.log('');
      }
    }

    // Print solution alternatives
    console.log('');
    console.log(chalk.bold('💡 Solution Alternatives'));
    console.log(chalk.dim('═'.repeat(50)));
    console.log('');

    for (const solution of solutions) {
      console.log(chalk.bold(`${solution.id}. ${solution.name}`));
      console.log(chalk.dim(solution.description));
      console.log('');
      console.log(chalk.green('   ✓ Pros:'));
      for (const pro of solution.pros) {
        console.log(`     • ${pro}`);
      }
      console.log('');
      console.log(chalk.red('   ✗ Cons:'));
      for (const con of solution.cons) {
        console.log(`     • ${con}`);
      }
      console.log('');
    }

    console.log(chalk.dim('─'.repeat(50)));
    console.log('');
    console.log(chalk.yellow('💭 Next Steps:'));
    console.log('   1. Review the analysis from each perspective');
    console.log('   2. Evaluate which solution approach best fits your needs');
    console.log('   3. Consider running: stdd new change <name>');
    console.log('   4. Then run: stdd ff "<topic>" to start implementation');
    console.log(chalk.dim('   5. For SWOT analysis: stdd brainstorm swot "<topic>"'));
    console.log(chalk.dim('   6. For architecture decision: stdd brainstorm adr "<topic>"'));
    console.log('');
  }
}

module.exports = { BrainstormCommand };
