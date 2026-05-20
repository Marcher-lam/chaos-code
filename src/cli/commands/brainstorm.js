/**
 * Brainstorm Command
 * Multi-perspective analysis and brainstorming for requirements and solutions
 */

const chalk = require('chalk');
const { createLogger } = require('../../utils/logger');
const logger = createLogger('brainstorm');

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

    const selectedAngles = options.angles
      ? options.angles.split(',').map(a => a.trim().toLowerCase())
      : DEFAULT_ANGLES;

    const numSolutions = parseInt(options.solutions, 10) || 3;
    const format = options.format || 'text';

    const analysis = this.analyzeFromAngles(topic, selectedAngles);
    const solutions = this.generateSolutions(topic, numSolutions);

    if (format === 'json') {
      const output = {
        topic,
        timestamp: new Date().toISOString(),
        analysis,
        solutions
      };
      console.log(JSON.stringify(output, null, 2));
      return output;
    }

    this.printTextOutput(topic, analysis, solutions);
    return { topic, analysis, solutions };
  }

  analyzeFromAngles(topic, angles) {
    const analysis = {};

    for (const angle of angles) {
      const template = ANGLE_TEMPLATES[angle];
      if (template) {
        analysis[angle] = {
          name: template.name,
          icon: template.icon,
          considerations: template.questions.map(q => this.consider(topic, q))
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

  printTextOutput(topic, analysis, solutions) {
    console.log('');
    console.log(chalk.bold('🧠 Brainstorm Analysis'));
    console.log(chalk.dim('═'.repeat(50)));
    console.log('');
    console.log(chalk.bold(`Topic: ${topic}`));
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
    console.log('');
  }
}

module.exports = { BrainstormCommand };
