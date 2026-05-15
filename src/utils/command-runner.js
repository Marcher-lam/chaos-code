const { spawnSync } = require('child_process');

// P0-3 Fix: Dangerous commands that should never be allowed
const DANGEROUS_COMMANDS = [
  /\brm\s+(-rf?|--recursive)\b/i,
  /\bdel\s+\/[fqs]\b/i,
  /\bformat\s+[a-z]:\b/i,
  /\bshred\b/i,
  /\bmkfs\b/i,
  /\bdd\s+if=/i,
  /\bsudo\b.*\b(rm|del|format|mkfs)\b/i,
  /\bbash\s+-c\b.*(\||&&|;)/i,
  /\beval\b/i,
  /\bexec\b.*\$\(/i,
  /\$\(/,
  /\bpowershell\b.*-Command\b/i,
];

function isDangerous(command) {
  for (const pattern of DANGEROUS_COMMANDS) {
    if (pattern.test(command)) {
      return true;
    }
  }
  return false;
}

function parseCommand(command) {
  const input = String(command || '').trim();
  if (!input) throw new Error('Command is required.');

  const args = [];
  let current = '';
  let quote = null;
  let escaping = false;

  for (const char of input) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }
    if (char === '\\') {
      escaping = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = null;
      else current += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      if (current) {
        args.push(current);
        current = '';
      }
      continue;
    }
    current += char;
  }

  if (escaping) current += '\\';
  if (quote) throw new Error('Unterminated quote in command.');
  if (current) args.push(current);
  if (args.length === 0) throw new Error('Command is required.');
  return { bin: args[0], args: args.slice(1) };
}

function validateCommand(command, _options = {}) {
  const input = String(command || '').trim();
  if (!input) throw new Error('Command is required.');

  // P0-3 Fix: Block dangerous commands
  if (isDangerous(input)) {
    throw new Error(`Command rejected: Dangerous command detected. For security reasons, commands containing destructive operations (rm -rf, eval, exec$(), etc.) are not allowed.`);
  }

  // P0-3 Fix: Shell injection detection
  const injectionPatterns = [/\|/, /&&/, /;/, /\$/, /`/, />>\s*/, />\s*[^&]/];
  for (const pattern of injectionPatterns) {
    if (pattern.test(input)) {
      throw new Error('Command rejected: Potential shell injection detected. Characters like pipe, &&, semicolon, dollar, backtick, or redirect are not allowed in test commands.');
    }
  }

  return true;
}

function runCommand(command, options = {}) {
  const input = String(command || '').trim();

  // P0-3 Fix: Validate command before execution
  validateCommand(input, options);

  const { bin, args } = parseCommand(command);
  return spawnSync(bin, args, {
    cwd: options.cwd,
    stdio: options.stdio || 'pipe',
    encoding: 'utf-8',
    env: options.env,
    timeout: options.timeout,
  });
}

module.exports = { parseCommand, runCommand, validateCommand, isDangerous };
