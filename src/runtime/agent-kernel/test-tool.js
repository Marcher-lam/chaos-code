const path = require('path');

const { runCommand } = require('../../utils/command-runner');
const { getConfigTestCommand, resolveTestCommands } = require('../../utils/test-command-resolver');

function tail(value, max = 4000) {
  const text = String(value || '');
  return text.length > max ? text.slice(-max) : text;
}

class TestTool {
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.trace = options.trace || null;
    this.timeout = options.timeout || 120000;
  }

  run(args = {}) {
    const commands = resolveTestCommands(this.cwd, {
      testCommand: args.command,
      configCommand: getConfigTestCommand(this.cwd),
      workspace: args.workspace,
    });

    if (commands.length === 0) {
      const skipped = {
        tool: 'test.run',
        status: 'skipped',
        passed: null,
        reason: 'No test command configured.',
        results: [],
      };
      this.record('tool.test.run', skipped);
      return skipped;
    }

    const results = [];
    for (const testCommand of commands) {
      const startedAt = Date.now();
      const result = runCommand(testCommand.command, {
        cwd: testCommand.cwd,
        stdio: 'pipe',
        timeout: Number(args.timeout || this.timeout),
      });
      results.push({
        workspaceName: testCommand.workspaceName,
        source: testCommand.source,
        cwd: path.relative(this.cwd, testCommand.cwd) || '.',
        command: testCommand.command,
        exitCode: result.status,
        passed: result.status === 0,
        elapsedMs: Date.now() - startedAt,
        stdout: tail(result.stdout),
        stderr: tail((result.stderr || '') + (result.error ? `\nCommand error: ${result.error.message}` : '')),
      });
    }

    const passed = results.every(result => result.passed);
    const payload = {
      tool: 'test.run',
      status: passed ? 'pass' : 'fail',
      passed,
      resultCount: results.length,
      results,
    };
    this.record('tool.test.run', {
      status: payload.status,
      resultCount: payload.resultCount,
      commands: results.map(result => ({ command: result.command, cwd: result.cwd, passed: result.passed, exitCode: result.exitCode })),
    });
    return payload;
  }

  record(type, payload) {
    if (this.trace && typeof this.trace.append === 'function') {
      this.trace.append(type, payload);
    }
  }
}

module.exports = { TestTool, tail };
