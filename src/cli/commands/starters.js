/**
 * Starters Command
 * Generate a new project from starter templates with optional STDD initialization.
 */

const fs = require('fs').promises;
const path = require('path');
const { getPackageRoot } = require('../../utils/path-resolver');
const { InitCommand } = require('./init');
const chalk = require('chalk');
const { createLogger } = require('../../utils/logger');
const logger = createLogger('starters');

class StartersCommand {
  constructor(spinner) {
    this.spinner = spinner || { text: '', start() {}, stop() {}, succeed() {}, fail() {} };
  }

  async execute(subcommand, ...args) {
    if (subcommand === 'list') return this.printList();
    if (subcommand === 'create') {
      const [name, options] = args;
      const type = (options && options.type) || (args[1] && args[1].type) || 'default';
      return this.create(name, type, options || {});
    }
    return this.printList();
  }

  _getTemplatesDir() {
    return path.join(getPackageRoot(), 'stdd', 'templates', 'starters');
  }

  async _exists(p) {
    try {
      await fs.access(p);
      return true;
    } catch (err) {
      logger.warn(err.message);
      return false;
    }
  }

  async list() {
    const templatesDir = this._getTemplatesDir();
    const entries = await fs.readdir(templatesDir);

    const types = [];
    for (const entry of entries) {
      const stat = await fs.stat(path.join(templatesDir, entry));
      if (stat.isDirectory() && entry !== 'node_modules') {
        const hasStarter = await this._exists(path.join(templatesDir, entry, 'starter.md'));
        types.push({
          name: entry,
          hasStarterMd: hasStarter
        });
      }
    }

    return types;
  }

  async printList() {
    const types = await this.list();

    console.log(chalk.bold('\n📦 Available Chaos Code Starters\n'));

    for (const t of types) {
      const marker = t.hasStarterMd ? chalk.green('✓') : chalk.dim(' ');
      console.log(`  ${marker}  ${chalk.cyan(t.name)}`);
    }

    console.log(chalk.dim(`\nTotal: ${types.length} template(s)\n`));
    console.log(chalk.dim('Usage: chaos starters create <name> --type <type>'));
  }

  async create(name, type, options = {}) {
    const templatesDir = this._getTemplatesDir();
    const templatePath = path.join(templatesDir, type);

    if (!(await this._exists(templatePath))) {
      throw new Error(
        `Template '${type}' not found. Available types: ${(await this.list()).map(t => t.name).join(', ')}`
      );
    }

    const targetPath = path.resolve(name);

    if (await this._exists(targetPath)) {
      throw new Error(`Directory '${name}' already exists.`);
    }

    this.spinner.text = `Creating project '${name}' from '${type}' starter...`;
    this.spinner.start();

    await fs.mkdir(targetPath, { recursive: true });

    await this._copyTemplate(templatePath, targetPath, path.basename(name));

    if (options.stdd !== false) {
      this.spinner.text = 'Initializing Chaos Code...';
      const initCmd = new InitCommand(this.spinner);
      await initCmd.execute(targetPath, { nonInteractive: true, skipSkills: true, force: true });
    }

    this.spinner.text = '';

    console.log(chalk.green(`\n✅ Project '${name}' created!\n`));
    console.log(chalk.bold('Next steps:\n'));
    console.log(`  cd ${chalk.cyan(name)}`);
    console.log(`  npm install`);
    console.log(`  npm test\n`);
    console.log(chalk.dim('Then start with: /stdd:new your-first-feature'));
    console.log(chalk.dim('Documentation: https://github.com/Marcher-lam/chaos-code'));
  }

  async _copyTemplate(templatePath, targetPath, projectName) {
    const files = await this._readDirRecursive(templatePath);

    for (const relativePath of files) {
      const src = path.join(templatePath, relativePath);
      const dest = path.join(targetPath, relativePath);

      const content = await fs.readFile(src, 'utf-8');
      const processed = this._processTemplate(content, projectName);

      const destDir = path.dirname(dest);
      await fs.mkdir(destDir, { recursive: true });
      await fs.writeFile(dest, processed);
    }
  }

  _processTemplate(content, projectName) {
    return content.replace(/\{\{name\}\}/g, projectName);
  }

  async _readDirRecursive(dir, baseDir) {
    const results = [];
    const currentBase = baseDir || dir;
    const entries = await fs.readdir(dir);

    for (const entry of entries) {
      if (entry === 'starter.md' && dir === currentBase) continue;

      const fullPath = path.join(dir, entry);
      const stat = await fs.stat(fullPath);

      if (stat.isDirectory()) {
        const children = await this._readDirRecursive(fullPath, currentBase);
        results.push(...children);
      } else {
        results.push(path.relative(currentBase, fullPath));
      }
    }

    return results;
  }
}

module.exports = { StartersCommand };
