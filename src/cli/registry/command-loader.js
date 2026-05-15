const chalk = require('chalk');
const { commandRegistry } = require('./command-registry');

/**
 * Command Loader - Dynamically registers commands with action wiring
 */

class CommandLoader {
  /**
   * @param {object} program - Commander program instance
   * @param {object} context  - { commandFactories: Map<name, Constructor>, createSpinner: fn }
   */
  constructor(program, context = {}) {
    this.program = program;
    this.commandFactories = context.commandFactories || {};
    this.createSpinner = context.createSpinner || null;
    this.skipNames = context.skipNames || [];
    this.commands = new Map();
  }

  registerAll() {
    const skip = new Set(this.skipNames || []);
    for (const commandDef of commandRegistry) {
      if (!skip.has(commandDef.name)) {
        this.registerCommand(commandDef);
      }
    }
  }

  /** Wire a standard action handler for the given commander cmd object */
  _wireAction(cmd, def) {
    const className = def.action;
    const Factory = className ? this.commandFactories[className] : null;
    if (!Factory) return;

    const spinnerText = def.spinner || null;
    const successText = def.success || null;
    const errorViaStderr = def.errorViaStderr !== false && !spinnerText;

    cmd.action(async (...actionArgs) => {
      const args = def.mapper ? def.mapper(...actionArgs) : actionArgs;

      let spinner = null;
      if (spinnerText && this.createSpinner) {
        const text = typeof spinnerText === 'function' ? spinnerText(...args) : spinnerText;
        spinner = this.createSpinner(text).start();
      }

      const instance = new Factory(spinner || undefined);

      try {
        const result = await instance.execute(...args);
        if (typeof successText === 'function') {
          spinner && spinner.succeed(successText(result));
        } else if (spinner) {
          spinner.succeed(successText || 'Done');
        }
        return result;
      } catch (error) {
        if (spinner) {
          spinner.fail(error.message);
        } else if (errorViaStderr) {
          console.error(chalk.red(error.message));
        }
        process.exit(1);
      }
    });
  }

  registerCommand(commandDef) {
    const { name, alias, description, options, helpText, subcommands } = commandDef;

    if (subcommands && subcommands.length > 0) {
      const parentCmd = this.program.command(name).description(description);
      if (options) this._addOptions(parentCmd, options);
      if (helpText) parentCmd.addHelpText('after', helpText);
      if (commandDef.action) this._wireAction(parentCmd, commandDef);
      for (const sub of subcommands) {
        this.registerSubcommand(parentCmd, sub);
      }
    } else {
      const cmd = this.program.command(name).description(description);
      if (alias) cmd.alias(alias);
      if (options) this._addOptions(cmd, options);
      if (helpText) cmd.addHelpText('after', helpText);
      if (commandDef.action) this._wireAction(cmd, commandDef);
      this.commands.set(name, cmd);
    }
  }

  registerSubcommand(parent, subDef) {
    const { name, description, options, helpText } = subDef;
    const sub = parent.command(name).description(description);
    if (options) this._addOptions(sub, options);
    if (helpText) sub.addHelpText('after', helpText);
    if (subDef.action) {
      const [factoryName, actionMethod] = String(subDef.action).split('.');
      const Factory = this.commandFactories[factoryName];
      if (Factory) {
        sub.action(async (...actionArgs) => {
          try {
            const instance = new Factory();
            const method = subDef.method || actionMethod || 'execute';
            await instance[method](...actionArgs);
          } catch (error) {
            console.error(chalk.red(error.message));
            process.exit(1);
          }
        });
      }
    }
  }

  _addOptions(cmd, options) {
    for (const option of options) {
      cmd.option(option.flags, option.description, option.default);
    }
  }

  getCommand(name) {
    return this.commands.get(name) || null;
  }

  getAllCommands() {
    return this.commands;
  }
}

module.exports = { CommandLoader };
