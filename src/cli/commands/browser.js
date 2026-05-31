const { BrowserController } = require('../../runtime/browser-controller');
const { BrowserDoctor } = require('../../runtime/browser-doctor');
const { VisualRegression } = require('../../utils/visual-regression');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const { createLogger } = require('../../utils/logger');
const logger = createLogger('browser');

class BrowserCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.controller = new BrowserController();
    this.visualRegression = new VisualRegression(cwd);
  }

  execute(action, target, options = {}) {
    if (action === 'snapshot') {
      return this.snapshot(target, options);
    } else if (action === 'inspect') {
      return this.inspect(target, options);
    } else if (action === 'doctor') {
      return this.doctor(options);
    } else if (action === 'compare') {
      return this.compare(target, options);
    } else if (action === 'update-baseline') {
      return this.updateBaseline(target, options);
    } else {
      console.log(chalk.yellow("Usage: stdd browser <snapshot|inspect|doctor|compare|update-baseline> <url> [--name <snapshot-name>] [--threshold <ratio>]"));
    }
  }

  async snapshot(url, options) {
    try {
      console.log(chalk.cyan(`Taking browser snapshot of: ${url}`));
      const result = await this.controller.snapshot({ ...options, url });
      console.log(chalk.green(`Snapshot saved: ${result.relativePath}`));
      console.log(chalk.dim(`URL: ${result.url}`));
      console.log(chalk.dim(`Title: ${result.title}`));
      return result;
    } catch (error) {
      logger.error(`Browser Error: ${error.message}`);
      if (error.message.includes("not installed")) {
        console.log(chalk.yellow("Tip: Run `npm install playwright` to enable built-in browser drive."));
      }
      process.exitCode = 1;
    }
  }

  async inspect(url, options) {
    try {
      console.log(chalk.cyan(`Inspecting page: ${url}`));
      const result = await this.controller.inspect({ ...options, url });
      console.log(chalk.green(`Inspection Complete:`));
      console.log(chalk.dim(`Title: ${result.title}`));
      return result;
    } catch (error) {
      logger.error(`Inspection Error: ${error.message}`);
      process.exitCode = 1;
    }
  }

  async compare(url, options = {}) {
    try {
      const name = options.name || 'default';
      const threshold = options.threshold !== undefined ? Number(options.threshold) : 0.01;
      
      const baselineDir = path.join(this.cwd, 'stdd/evidence/visual/baselines');
      const currentDir = path.join(this.cwd, 'stdd/evidence/visual/current');
      
      if (!fs.existsSync(baselineDir)) {
        fs.mkdirSync(baselineDir, { recursive: true });
      }
      if (!fs.existsSync(currentDir)) {
        fs.mkdirSync(currentDir, { recursive: true });
      }

      const baselinePath = path.join(baselineDir, `${name}.png`);
      const currentPath = path.join(currentDir, `${name}.png`);
      const diffPath = path.join(currentDir, `${name}-diff.png`);

      if (!fs.existsSync(baselinePath)) {
        console.log(chalk.yellow(`Baseline not found for: ${name}. Updating baseline first.`));
        await this.updateBaseline(url, options);
        return { status: 'pass', diffRatio: 0, message: 'Initialized baseline.' };
      }

      // Take current snapshot
      console.log(chalk.cyan(`Capturing visual comparison snapshot for: ${url}`));
      const controllerWithCustomDir = new BrowserController('stdd/evidence/visual/current');
      
      const snapshotResult = await controllerWithCustomDir.snapshot({ 
        url, 
        width: options.width, 
        height: options.height 
      });

      // Move snapshot to the fixed name.png path
      if (fs.existsSync(snapshotResult.filePath)) {
        if (fs.existsSync(currentPath)) fs.unlinkSync(currentPath);
        fs.renameSync(snapshotResult.filePath, currentPath);
      }

      // Perform visual comparison
      const compareResult = this.visualRegression.compare(baselinePath, currentPath, {
        diffPath,
        threshold
      });

      if (compareResult.status === 'pass') {
        console.log(chalk.green(`✓ Visual Regression PASSED: ${compareResult.message}`));
      } else {
        console.log(chalk.red(`✗ Visual Regression FAILED: ${compareResult.message}`));
        if (compareResult.diffPath) {
          console.log(chalk.dim(`Diff visual file saved to: ${compareResult.diffPath}`));
        }
        process.exitCode = 1;
      }

      return compareResult;
    } catch (error) {
      logger.error(`Compare Error: ${error.message}`);
      process.exitCode = 1;
    }
  }

  async updateBaseline(url, options = {}) {
    try {
      const name = options.name || 'default';
      const baselineDir = path.join(this.cwd, 'stdd/evidence/visual/baselines');
      if (!fs.existsSync(baselineDir)) {
        fs.mkdirSync(baselineDir, { recursive: true });
      }

      const baselinePath = path.join(baselineDir, `${name}.png`);

      console.log(chalk.cyan(`Updating visual baseline for: ${url}`));
      const controllerWithCustomDir = new BrowserController('stdd/evidence/visual/baselines');
      
      const snapshotResult = await controllerWithCustomDir.snapshot({ 
        url, 
        width: options.width, 
        height: options.height 
      });

      if (fs.existsSync(snapshotResult.filePath)) {
        if (fs.existsSync(baselinePath)) fs.unlinkSync(baselinePath);
        fs.renameSync(snapshotResult.filePath, baselinePath);
        console.log(chalk.green(`✓ Baseline updated successfully: ${path.relative(this.cwd, baselinePath)}`));
      }

      return { status: 'success', baselinePath };
    } catch (error) {
      logger.error(`Update Baseline Error: ${error.message}`);
      process.exitCode = 1;
    }
  }

  doctor(options = {}) {
    const result = new BrowserDoctor(this.cwd).check(options);
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return result;
    }

    console.log(chalk.bold('\nBrowser Doctor'));
    for (const check of result.checks) {
      const label = check.status === 'pass' ? chalk.green('PASS') : chalk.red('FAIL');
      console.log(`  ${label} ${check.name}${check.message ? ` - ${check.message}` : ''}`);
    }
    if (result.suggestions.length) {
      console.log(chalk.yellow('\nSuggested fixes:'));
      result.suggestions.forEach(command => console.log(`  ${command}`));
    }
    if (result.status !== 'pass') process.exitCode = 1;
    return result;
  }
}

module.exports = { BrowserCommand };
