/**
 * Shared CLI utilities extracted from cli.js
 */

const chalk = require('chalk');

/**
 * Spinner helper for long-running commands
 */
function createSpinner(text) {
  let interval;
  const frames = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
  let i = 0;
  return {
    start() {
      if (interval) clearInterval(interval);
      process.stdout.write(`${frames[i]} ${text}`);
      interval = setInterval(() => {
        i = (i + 1) % frames.length;
        process.stdout.write(`\r${frames[i]} ${text}`);
      }, 80);
      return this;
    },
    succeed(msg) {
      if (interval) clearInterval(interval);
      process.stdout.write(`\r${chalk.green('✓')} ${msg || text}\n`);
    },
    fail(msg) {
      if (interval) clearInterval(interval);
      process.stdout.write(`\r${chalk.red('✗')} ${msg || text}\n`);
    },
  };
}

/**
 * Safe action wrapper — eliminates repeated try/catch + process.exit(1)
 */
function safeAction(fn) {
  return async (...args) => {
    try { await fn(...args); } catch (e) { console.error(chalk.red(e.message)); process.exitCode = 1; }
  };
}

module.exports = { createSpinner, safeAction };
