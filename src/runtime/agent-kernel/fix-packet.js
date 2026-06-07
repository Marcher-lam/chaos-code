function tail(value, max = 8000) {
  const text = String(value || '');
  return text.length > max ? text.slice(-max) : text;
}

class FixPacketBuilder {
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.trace = options.trace || null;
  }

  build(input = {}) {
    const packet = {
      schemaVersion: 1,
      type: 'agent-fix-packet',
      generatedAt: new Date().toISOString(),
      status: 'needs-fix',
      goal: input.goal || null,
      instructions: [
        'Use the failed test output and git diff to identify the smallest corrective patch.',
        'Do not weaken tests unless the spec or task is explicitly wrong.',
        'Prefer a minimal code change and rerun the failing test command.',
        'Return a unified diff that can be processed by fs.patch preview/apply.',
      ],
      summary: input.summary || null,
      patch: compactPatch(input.patch),
      tests: compactTests(input.tests),
      git: compactGit(input.after || input.git),
      before: compactGit(input.before),
      metadata: {
        cwd: this.cwd,
        source: input.source || 'agent.cycle',
      },
    };
    this.record('fix-packet.generated', {
      status: packet.status,
      testsStatus: packet.tests ? packet.tests.status : null,
      filesChanged: packet.summary ? packet.summary.filesChanged : [],
    });
    return packet;
  }

  record(type, payload) {
    if (this.trace && typeof this.trace.append === 'function') {
      this.trace.append(type, payload);
    }
  }
}

function compactPatch(patch) {
  if (!patch) return null;
  return {
    mode: patch.mode,
    fileCount: patch.fileCount,
    additions: patch.additions,
    deletions: patch.deletions,
    files: (patch.files || []).map(file => ({
      path: file.path,
      additions: file.additions,
      deletions: file.deletions,
      written: Boolean(file.written),
    })),
  };
}

function compactTests(tests) {
  if (!tests) return null;
  return {
    status: tests.status,
    passed: tests.passed,
    resultCount: tests.resultCount,
    results: (tests.results || []).map(result => ({
      workspaceName: result.workspaceName,
      cwd: result.cwd,
      command: result.command,
      exitCode: result.exitCode,
      passed: result.passed,
      stdout: tail(result.stdout),
      stderr: tail(result.stderr),
    })),
  };
}

function compactGit(git) {
  if (!git) return null;
  return {
    status: git.status,
    dirty: git.dirty,
    statusShort: git.statusShort || '',
    diffStat: git.diffStat || '',
    diff: tail(git.diff || ''),
    reason: git.reason || null,
  };
}

module.exports = { FixPacketBuilder, compactGit, compactPatch, compactTests };
