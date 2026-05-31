'use strict';

const chalk = require('chalk');

// ---------------------------------------------------------------------------
// Log level hierarchy (lower = more verbose)
// ---------------------------------------------------------------------------
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

/**
 * Resolve the effective log level from environment variables.
 * Priority: LOG_LEVEL > STDD_LOG_LEVEL > 'info'
 */
function resolveLevel() {
  const raw = process.env.LOG_LEVEL || process.env.STDD_LOG_LEVEL || 'info';
  const level = LOG_LEVELS[raw.toLowerCase()];
  return level !== undefined ? level : LOG_LEVELS.info;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/**
 * Printf-style %s/%d/%j substitution (mirrors console.log behaviour).
 */
function formatArgs(template, args) {
  if (typeof template !== 'string' || args.length === 0) {
    // When only a single value is passed (or non-string), just stringify.
    return [template, ...args].map(String).join(' ');
  }

  let idx = 0;
  const result = template.replace(/%[sdjifoO]/g, () => {
    if (idx >= args.length) return '';
    const val = args[idx++];
    return String(val);
  });

  // Append any leftover args (matches console.log semantics)
  const rest = idx < args.length ? ' ' + args.slice(idx).map(String).join(' ') : '';
  return result + rest;
}

/**
 * Build a formatted message string with printf substitution.
 * Accepts either:
 *   - (template, ...rest)  => printf-style
 *   - (...values)          => space-joined (drop-in for console.log)
 */
function buildMessage(template, args) {
  if (typeof template === 'string') {
    return formatArgs(template, args);
  }
  return [template, ...args].map(String).join(' ');
}

// ---------------------------------------------------------------------------
// Level-specific colour functions
// ---------------------------------------------------------------------------
const levelColours = {
  debug: (msg) => chalk.dim(msg),
  info:  (msg) => chalk.cyan(msg),
  warn:  (msg) => chalk.yellow(msg),
  error: (msg) => chalk.red(msg),
};

const levelLabels = {
  debug: 'DEBUG',
  info:  'INFO ',
  warn:  'WARN ',
  error: 'ERROR',
};

// ---------------------------------------------------------------------------
// Core log function
// ---------------------------------------------------------------------------
function logAt(level, prefix, template, args) {
  if (resolveLevel() > LOG_LEVELS[level]) return;

  const message = buildMessage(template, args);
  const tag = `[${prefix}]`;
  const label = levelLabels[level];
  const coloured = levelColours[level](`${tag} ${label} ${message}`);

  if (level === 'error') {
    console.error(coloured);
  } else if (level === 'warn') {
    console.warn(coloured);
  } else {
    console.log(coloured);
  }
}

// ---------------------------------------------------------------------------
// createLogger — factory for module-scoped loggers (backward-compatible)
// ---------------------------------------------------------------------------
function createLogger(moduleName) {
  const prefix = moduleName || 'STDD';

  return {
    debug(template, ...args) { logAt('debug', prefix, template, args); },
    info(template, ...args)  { logAt('info',  prefix, template, args); },
    warn(template, ...args)  { logAt('warn',  prefix, template, args); },
    error(template, ...args) { logAt('error', prefix, template, args); },
  };
}

// ---------------------------------------------------------------------------
// Singleton instance — drop-in console.log replacement
// ---------------------------------------------------------------------------
const logger = createLogger('STDD');

module.exports = logger;
module.exports.createLogger = createLogger;
module.exports.logger = logger;
