/**
 * Adapt Command
 * Generate IDE-specific configuration files for cross-platform support.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { generateForIDE, generateAll, listAdapters } = require('../../config/ide-adapters');

class AdaptCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
  }

  async execute(action = 'all', args = [], options = {}) {
    switch (action) {
      case 'generate':
      case 'setup':
        return this.generate(args[0], options);
      case 'list':
        return this.list(options);
      case 'all':
      default:
        return this.generateAll(options);
    }
  }

  generate(ide, options = {}) {
    const projectName = this._getProjectName();
    const stddDir = path.join(this.cwd, 'stdd');

    if (ide) {
      const files = generateForIDE(ide, this.cwd, projectName, stddDir);
      if (!options.json) {
        console.log(chalk.bold('\n  IDE Configuration Generated\n'));
        console.log('  IDE: ' + chalk.cyan(ide));
        for (const f of files) {
          console.log('  File: ' + chalk.cyan(f));
        }
        console.log('');
      }
      return { ide, files };
    }

    // No specific IDE, ask which one
    return this.generateAll(options);
  }

  generateAll(options = {}) {
    const projectName = this._getProjectName();
    const stddDir = path.join(this.cwd, 'stdd');
    const results = generateAll(this.cwd, projectName, stddDir);

    if (!options.json) {
      console.log(chalk.bold('\n  Cross-Platform IDE Configuration\n'));
      for (const [ide, files] of Object.entries(results)) {
        if (files.error) {
          console.log('  ' + chalk.red(ide) + ': ' + files.error);
        } else {
          console.log('  ' + chalk.cyan(ide) + ': ' + files.join(', '));
        }
      }
      console.log('');
    }
    return results;
  }

  list(options = {}) {
    const adapters = listAdapters();
    if (options.json) {
      console.log(JSON.stringify(adapters, null, 2));
    } else {
      console.log(chalk.bold('\n  Supported IDEs\n'));
      for (const a of adapters) {
        console.log('  ' + chalk.cyan(a.id) + ' - ' + a.name);
      }
      console.log('');
    }
    return adapters;
  }

  _getProjectName() {
    const pkgPath = path.join(this.cwd, 'package.json');
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      return pkg.name || 'project';
    } catch (_) {
      return path.basename(this.cwd);
    }
  }
}

module.exports = { AdaptCommand };
