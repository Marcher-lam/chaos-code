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

function currentBranch(cwd, timeout = 3000) {
  try {
    const res = runGit(cwd, ['rev-parse', '--abbrev-ref', 'HEAD'], timeout);
    if (res.exitCode === 0) return res.stdout.trim();
  } catch (_) { /* not a git repo or git missing */ }
  return '';
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
    // Default to the CURRENT branch — hardcoding 'main' fails on master/main-
    // less or differently-named repos (the common daily case).
    const branch = args.branch || currentBranch(this.cwd, this.timeout) || 'HEAD';
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

  pull(args = {}) {
    const remote = args.remote || 'origin';
    const branch = args.branch || '';
    // Model-controlled values must not become unexpected git flags
    if (String(remote).startsWith('-') || String(branch).startsWith('-')) {
      throw new Error('Invalid remote/branch: expected a refname, got an option-like value.');
    }
    const gitArgs = branch ? ['pull', remote, branch] : ['pull', remote];
    const status = runGit(this.cwd, gitArgs, this.timeout);
    const result = {
      tool: 'git.pull',
      status: status.exitCode === 0 ? 'ok' : 'fail',
      stdout: status.stdout,
      stderr: status.stderr,
      commands: [status],
    };
    this.record('tool.git.pull', { status: result.status, remote, branch });
    return result;
  }

  log(args = {}) {
    const count = Math.max(1, Math.min(Number(args.count) || 20, 200));
    const format = args.format || '%h %ad %an %s';
    const gitArgs = ['log', `-${count}`, `--pretty=format:${format}`, '--date=short'];
    if (args.file) gitArgs.push('--', args.file);
    const status = runGit(this.cwd, gitArgs, this.timeout);
    const result = {
      tool: 'git.log',
      status: status.exitCode === 0 ? 'ok' : 'fail',
      commits: status.exitCode === 0 ? status.stdout.split('\n').filter(Boolean) : [],
      stdout: status.stdout,
      stderr: status.stderr,
      commands: [status],
    };
    this.record('tool.git.log', { status: result.status, count });
    return result;
  }

  stash(args = {}) {
    const action = args.action || 'push';
    const valid = ['push', 'pop', 'list', 'drop'];
    if (!valid.includes(action)) {
      throw new Error(`Invalid stash action: ${action}. Must be one of: ${valid.join(', ')}`);
    }
    const gitArgs = ['stash', action];
    if (action === 'push' && args.message) gitArgs.push('-m', args.message);
    if (args.index !== undefined) {
      const index = Number(args.index);
      if (!Number.isInteger(index) || index < 0) {
        throw new Error(`Invalid stash index: ${args.index}. Must be a non-negative integer.`);
      }
      if (action === 'pop' || action === 'drop') gitArgs.push(String(index));
    }
    const status = runGit(this.cwd, gitArgs, this.timeout);
    const result = {
      tool: 'git.stash',
      status: status.exitCode === 0 ? 'ok' : 'fail',
      stdout: status.stdout,
      stderr: status.stderr,
      commands: [status],
    };
    this.record('tool.git.stash', { status: result.status, action });
    return result;
  }

  /**
   * Git worktree operations — the backbone of multi-workspace isolation.
   * `add` creates <cwd>/.worktrees/<name> by default with an optional new
   * branch; subagents can then be dispatched with cwd pointing into it.
   */
  worktree(args = {}) {
    const action = args.action || 'list';
    const valid = ['list', 'add', 'remove'];
    if (!valid.includes(action)) {
      throw new Error(`Invalid worktree action: ${action}. Must be one of: ${valid.join(', ')}`);
    }

    if (action === 'list') {
      const status = runGit(this.cwd, ['worktree', 'list', '--porcelain'], this.timeout);
      const worktrees = [];
      let current = {};
      for (const line of status.stdout.split('\n')) {
        if (line.startsWith('worktree ')) {
          if (current.path) worktrees.push(current);
          current = { path: line.slice('worktree '.length) };
        } else if (line.startsWith('branch ')) current.branch = line.slice('branch refs/heads/'.length);
        else if (line.startsWith('HEAD ')) current.head = line.slice('HEAD '.length).slice(0, 8);
        else if (line === 'bare') current.bare = true;
        else if (line === 'detached') current.detached = true;
      }
      if (current.path) worktrees.push(current);
      const result = {
        tool: 'git.worktree',
        status: status.exitCode === 0 ? 'ok' : 'fail',
        worktrees,
        stdout: status.stdout,
        stderr: status.stderr,
        commands: [status],
      };
      this.record('tool.git.worktree', { status: result.status, action, count: worktrees.length });
      return result;
    }

    // add / remove need a name; default location keeps trees INSIDE the
    // workspace so path-safety guarantees still apply.
    const name = args.name;
    if (!name || /[\\/]|\.\./.test(String(name))) {
      throw new Error('A simple worktree name (no path separators or "..") is required.');
    }
    const path = require('path');
    const treePath = args.path && !String(args.path).includes('..')
      ? path.resolve(this.cwd, args.path)
      : path.join(this.cwd, '.worktrees', name);

    if (action === 'add') {
      const branchArgs = args.branch ? ['-b', args.branch] : (args.newBranch === false ? [] : ['-b', name]);
      const status = runGit(this.cwd, ['worktree', 'add', ...branchArgs, treePath], this.timeout);
      const result = {
        tool: 'git.worktree',
        status: status.exitCode === 0 ? 'ok' : 'fail',
        path: treePath,
        branch: args.branch || name,
        stdout: status.stdout,
        stderr: status.stderr,
        commands: [status],
      };
      this.record('tool.git.worktree', { status: result.status, action, path: treePath });
      return result;
    }

    // remove
    const rmArgs = ['worktree', 'remove', treePath];
    if (args.force) rmArgs.push('--force');
    const status = runGit(this.cwd, rmArgs, this.timeout);
    const result = {
      tool: 'git.worktree',
      status: status.exitCode === 0 ? 'ok' : 'fail',
      path: treePath,
      stdout: status.stdout,
      stderr: status.stderr,
      commands: [status],
    };
    this.record('tool.git.worktree', { status: result.status, action: path.basename(treePath) });
    return result;
  }

  /**
   * Create a GitHub pull request via the `gh` CLI.
   * Pushes the current branch first (unless skipPush), then `gh pr create`.
   */
  pr(args = {}) {
    const title = args.title;
    if (!title) throw new Error('Title is required for git.pr.');

    const ghCheck = spawnSync('gh', ['--version'], { encoding: 'utf8', timeout: 5000 });
    if (ghCheck.error || ghCheck.status !== 0) {
      return {
        tool: 'git.pr',
        status: 'unavailable',
        reason: 'GitHub CLI (gh) is not installed or not on PATH. Install it from https://cli.github.com/ and run `gh auth login`.',
      };
    }

    const commands = [];
    if (!args.skipPush) {
      const push = this.push({ remote: args.remote });
      commands.push(push);
      if (push.status !== 'ok') {
        return { tool: 'git.pr', status: 'fail', reason: 'Push failed before creating PR.', stdout: push.stdout, stderr: push.stderr, commands };
      }
    }

    const ghArgs = ['pr', 'create', '--title', title, '--body', args.body || title];
    if (args.base) ghArgs.push('--base', args.base);
    if (args.draft) ghArgs.push('--draft');
    const res = spawnSync('gh', ghArgs, { cwd: this.cwd, encoding: 'utf8', timeout: 60000 });
    if (res.error) {
      const reason = `gh pr create failed: ${res.error.message}${res.error.code === 'ETIMEDOUT' ? ' (timed out — the PR may still have been created; check before retrying)' : ''}`;
      this.record('tool.git.pr', { status: 'fail', title, draft: !!args.draft, reason });
      return { tool: 'git.pr', status: 'fail', reason, commands };
    }
    const result = {
      tool: 'git.pr',
      status: res.status === 0 ? 'ok' : 'fail',
      url: (res.stdout || '').trim(),
      stdout: res.stdout,
      stderr: res.stderr,
      commands,
    };
    this.record('tool.git.pr', { status: result.status, title, draft: !!args.draft });
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
