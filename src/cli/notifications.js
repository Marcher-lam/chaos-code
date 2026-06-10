/**
 * Notification system for long-running tasks.
 * Supports terminal bell and optional desktop notifications.
 * Thresholds are configurable via ~/.chaos/config.json.
 */
const { loadConfig } = require('./config');

const chalk = require('chalk');

/**
 * Send a notification for task completion.
 * Uses terminal bell as fallback if node-notifier is not installed.
 *
 * @param {object} opts
 * @param {string} opts.title - Notification title
 * @param {string} opts.message - Notification body
 * @param {number} opts.elapsed - Elapsed time in seconds
 * @param {boolean} [opts.sound] - Play sound (default: true)
 */
function notify(opts) {
  const { title = 'Chaos Code', message, elapsed, sound = true } = opts;

  // Only notify if task took longer than configured threshold
  const config = loadConfig();
  if (elapsed && elapsed < config.notifyThreshold) return;

  // Try desktop notification
  try {
    const notifier = require('node-notifier');
    notifier.notify({
      title,
      message: message || `Task completed (${elapsed ? elapsed.toFixed(0) + 's' : 'done'})`,
      sound,
    });
  } catch (_) {
    // node-notifier not installed — use terminal bell
    terminalBell();
  }
}

/**
 * Ring the terminal bell (ANSI BEL character).
 */
function terminalBell() {
  process.stdout.write('\x07');
}

/**
 * Print completion summary with optional notification.
 */
function taskComplete(elapsed, cost, tokens) {
  const config = loadConfig();
  const parts = [];
  if (elapsed) parts.push(`${elapsed.toFixed(1)}s`);
  if (tokens) parts.push(`${tokens} tok`);
  if (cost) parts.push(`$${cost.toFixed(4)}`);

  const summary = parts.length > 0 ? ` (${parts.join(', ')})` : '';
  process.stdout.write(chalk.green(`✓ Done${summary}\n`));

  // Notify if long task (configurable thresholds)
  if (elapsed > config.notifyThreshold) {
    notify({ message: `Done in ${elapsed.toFixed(0)}s${cost ? ', $' + cost.toFixed(4) : ''}`, elapsed });
  } else if (elapsed > config.bellThreshold) {
    terminalBell();
  }
}

module.exports = { notify, terminalBell, taskComplete };
