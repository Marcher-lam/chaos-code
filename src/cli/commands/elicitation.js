/**
 * Elicitation Command
 * CLI interface for BMAD Advanced Elicitation methods.
 * Enhanced: delegates 'swot' and 'adr' subcommands to BrainstormCommand.
 */
const { ElicitationEngine } = require('../../runtime/elicitation-engine');
const { BrainstormCommand } = require('./brainstorm');
const chalk = require('chalk');
const { createLogger } = require('../../utils/logger');
const logger = createLogger('elicitation');

const SUBCOMMANDS = ['swot', 'adr'];

class ElicitationCommand {
  constructor() {
    this.engine = new ElicitationEngine();
    this.brainstorm = new BrainstormCommand();
  }

  execute(args, options = {}) {
    // Route subcommands to BrainstormCommand
    const firstArg = args && args[0];
    if (SUBCOMMANDS.includes(firstArg)) {
      const topic = args.slice(1).join(' ');
      if (!topic || topic.trim() === '') {
        logger.error('Topic is required. Usage: stdd brainstorm swot "Design Auth System"');
        return;
      }
      return this.brainstorm.execute(topic, { ...options, subcommand: firstArg });
    }

    if (options.list) {
      return this.listMethods();
    }

    const topic = args.join(' ');
    const methodId = options.method;

    if (!topic) {
      logger.error('Topic is required. Usage: stdd brainstorm "Design Auth System"');
      return;
    }

    if (methodId) {
      return this.runMethod(methodId, topic);
    } else {
      // Random suggestion if no method specified
      const methods = this.engine.list();
      const randomMethod = methods[Math.floor(Math.random() * methods.length)];
      console.log(`Random Elicitation selected: ${randomMethod.name}`);
      return this.applyMethod(randomMethod, topic);
    }
  }

  listMethods() {
    const methods = this.engine.list();
    console.log(chalk.bold(' Available Elicitation Methods (60+ Framework Support):'));
    console.log('');
    methods.forEach(m => {
      console.log(`${chalk.blue(m.category.padEnd(15))} ${chalk.green(m.id.padEnd(10))} - ${m.name}`);
    });
    console.log('');
    console.log('Usage: stdd brainstorm <topic> --method <id>');
    console.log('Example: stdd brainstorm "Secure Payment API" --method inversion');
    console.log('');
    console.log(chalk.bold(' Context-Aware Subcommands:'));
    console.log(`  ${chalk.green('swot <topic>')}   - Generate SWOT analysis using project context`);
    console.log(`  ${chalk.green('adr <topic>')}    - Generate Architecture Decision Record`);
  }

  runMethod(methodId, topic) {
    const method = this.engine.getMethod(methodId);
    if (!method) {
      logger.error(`Method '${methodId}' not found. Run --list to see available methods.`);
      return;
    }
    return this.applyMethod(method, topic);
  }

  applyMethod(method, topic) {
    const prompt = this.engine.generatePrompt(method, topic);
    console.log(chalk.bold(`\n 🧠 Activating: ${method.name}`));
    console.log(chalk.dim(`Topic: ${topic}`));
    console.log('');
    console.log(chalk.yellow(prompt));
    console.log('');
    console.log(chalk.dim('Paste this prompt into your AI session to trigger forced reasoning mode.'));
    return { method: method.name, prompt, topic };
  }
}

module.exports = { ElicitationCommand };
