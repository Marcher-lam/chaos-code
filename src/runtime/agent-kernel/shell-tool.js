const { runCommand, validateCommand } = require('../../utils/command-runner');
const { wrapForSandbox } = require('../../utils/os-sandbox');


const DEFAULT_TIMEOUT = 30000;

class ShellTool {
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.trace = options.trace || null;
  }

  run(args = {}) {
    const command = String(args.command || '').trim();
    if (!command) throw new Error('shell.run requires a command.');

    try {
      validateCommand(command, { sandbox: args.sandbox });
    } catch (err) {
      return {
        tool: 'shell.run',
        status: 'rejected',
        command,
        passed: false,
        exitCode: null,
        reason: err.message,
        stdout: '',
        stderr: '',
      };
    }

    const timeout = Number(args.timeout || DEFAULT_TIMEOUT);
    // Sandbox application is OPERATOR-controlled only (config/env) — a
    // model-supplied `sandbox: false` must never disable it.
    let result;
    try {
      result = runCommand(command, {
        cwd: args.cwd || this.cwd,
        timeout,
        stdio: 'pipe',
        sandboxWrap: wrapForSandbox,
      });
    } catch (err) {
      // e.g. CHAOS_SANDBOX=on with no sandbox tool available (fail-closed)
      return {
        tool: 'shell.run',
        status: 'rejected',
        command,
        passed: false,
        exitCode: null,
        reason: err.message,
        stdout: '',
        stderr: err.message,
      };
    }

    const passed = result.status === 0;
    const output = {
      tool: 'shell.run',
      status: passed ? 'pass' : 'fail',
      command,
      passed,
      exitCode: result.status,
      stdout: tailStdio(result.stdout),
      stderr: tailStdio(result.stderr),
    };

    this.record('tool.shell.run', {
      command,
      status: output.status,
      exitCode: output.exitCode,
    });

    return output;
  }

  record(type, payload) {
    if (this.trace && typeof this.trace.append === 'function') {
      this.trace.append(type, payload);
    }
  }
}

function tailStdio(value, max = 8000) {
  const text = String(value || '');
  return text.length > max ? text.slice(-max) : text;
}

module.exports = { ShellTool };
