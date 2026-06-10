const { spawnSync } = require('child_process');

function runGit(cwd, args, timeout = 30000) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
    timeout,
  });
  return {
    command: `git ${args.join(' ')}`,
    exitCode: result.status,
    stdout: result.stdout || '',
    stderr: (result.stderr || '') + (result.error ? `\nCommand error: ${result.error.message}` : ''),
  };
}

function tail(value, max = 12000) {
  const text = String(value || '');
  return text.length > max ? text.slice(-max) : text;
}

class GitTool {
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.trace = options.trace || null;
    this.timeout = options.timeout || 30000;
  }

  diff(args = {}) {
    const status = runGit(this.cwd, ['status', '--short'], this.timeout);
    if (status.exitCode !== 0) {
      const result = {
        tool: 'git.diff',
        status: 'unavailable',
        reason: tail(status.stderr || status.stdout, 2000) || 'git status failed',
        commands: [status],
      };
      this.record('tool.git.diff', { status: result.status, reason: result.reason });
      return result;
    }

    const stat = runGit(this.cwd, ['diff', '--stat'], this.timeout);
    const includePatch = Boolean(args.patch);
    const patch = includePatch ? runGit(this.cwd, ['diff'], this.timeout) : null;

    const result = {
      tool: 'git.diff',
      status: 'ok',
      dirty: status.stdout.trim().length > 0,
      statusShort: status.stdout,
      diffStat: stat.stdout,
      diff: patch ? tail(patch.stdout, Number(args.maxBytes || 12000)) : undefined,
      commands: [status, stat, ...(patch ? [patch] : [])].map(item => ({
        command: item.command,
        exitCode: item.exitCode,
        stderr: tail(item.stderr, 1000),
      })),
    };
    this.record('tool.git.diff', { status: result.status, dirty: result.dirty, includePatch });
    return result;
  }

  add(args = {}) {
    const files = Array.isArray(args.files) ? args.files : [args.files || '.'];
    const status = runGit(this.cwd, ['add', ...files], this.timeout);
    const result = {
      tool: 'git.add',
      status: status.exitCode === 0 ? 'ok' : 'fail',
      stdout: status.stdout,
      stderr: status.stderr,
      commands: [status],
    };
    this.record('tool.git.add', { status: result.status, files });
    return result;
  }

  commit(args = {}) {
    const msg = args.message || 'update';
    const status = runGit(this.cwd, ['commit', '-m', msg], this.timeout);
    const result = {
      tool: 'git.commit',
      status: status.exitCode === 0 ? 'ok' : 'fail',
      stdout: status.stdout,
      stderr: status.stderr,
      commands: [status],
    };
    this.record('tool.git.commit', { status: result.status, message: msg });
    return result;
  }

  push(args = {}) {
    const remote = args.remote || 'origin';
    const branch = args.branch || 'main';
    const status = runGit(this.cwd, ['push', remote, branch], this.timeout);
    const result = {
      tool: 'git.push',
      status: status.exitCode === 0 ? 'ok' : 'fail',
      stdout: status.stdout,
      stderr: status.stderr,
      commands: [status],
    };
    this.record('tool.git.push', { status: result.status, remote, branch });
    return result;
  }

  checkout(args = {}) {
    const branch = args.branch;
    if (!branch) {
      throw new Error('Branch name is required for checkout.');
    }
    const status = runGit(this.cwd, ['checkout', branch], this.timeout);
    const result = {
      tool: 'git.checkout',
      status: status.exitCode === 0 ? 'ok' : 'fail',
      stdout: status.stdout,
      stderr: status.stderr,
      commands: [status],
    };
    this.record('tool.git.checkout', { status: result.status, branch });
    return result;
  }

  branch(args = {}) {
    const name = args.name;
    if (!name) {
      throw new Error('Branch name is required to create a branch.');
    }
    const status = runGit(this.cwd, ['checkout', '-b', name], this.timeout);
    const result = {
      tool: 'git.branch',
      status: status.exitCode === 0 ? 'ok' : 'fail',
      stdout: status.stdout,
      stderr: status.stderr,
      commands: [status],
    };
    this.record('tool.git.branch', { status: result.status, name });
    return result;
  }

  reset(args = {}) {
    const mode = args.hard ? '--hard' : '--mixed';
    const status = runGit(this.cwd, ['reset', mode], this.timeout);
    const result = {
      tool: 'git.reset',
      status: status.exitCode === 0 ? 'ok' : 'fail',
      stdout: status.stdout,
      stderr: status.stderr,
      commands: [status],
    };
    this.record('tool.git.reset', { status: result.status, hard: !!args.hard });
    return result;
  }

  record(type, payload) {
    if (this.trace && typeof this.trace.append === 'function') {
      this.trace.append(type, payload);
    }
  }
}

module.exports = { GitTool, runGit };
