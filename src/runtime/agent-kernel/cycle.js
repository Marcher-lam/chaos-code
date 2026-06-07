class AgentCycleRunner {
  constructor(options = {}) {
    this.kernel = options.kernel;
    if (!this.kernel) throw new Error('AgentCycleRunner requires a kernel.');
  }

  runPatchCycle(args = {}) {
    if (!args.patchFile) {
      throw new Error('Patch cycle requires --patch-file.');
    }

    const before = this.kernel.executeTool('git.diff', { patch: false });
    const patch = this.kernel.executeTool('fs.patch', {
      file: args.patchFile,
      approved: true,
      apply: true,
    });
    const tests = this.kernel.executeTool('test.run', {
      command: args.testCommand,
      workspace: args.workspace,
      timeout: args.timeout,
    });
    const after = this.kernel.executeTool('git.diff', {
      patch: Boolean(args.includePatch),
      maxBytes: args.maxBytes,
    });

    const summary = summarizeCycle({ before, patch, tests, after });
    this.kernel.trace.append('cycle.patch.completed', summary);
    const result = {
      tool: 'agent.cycle',
      mode: 'patch',
      status: summary.status,
      summary,
      before,
      patch,
      tests,
      after,
    };
    if (summary.status === 'fail') {
      result.fixPacket = this.kernel.buildFixPacket({ before, patch, tests, after, summary, source: 'agent.cycle' });
    }
    return result;
  }

  runRepairCycle(args = {}) {
    if (!args.patchFile) {
      throw new Error('Repair cycle requires --patch-file.');
    }

    const before = this.kernel.executeTool('git.diff', { patch: false });
    const preview = this.kernel.executeTool('fs.patch', {
      file: args.patchFile,
      approved: true,
    });
    const patch = this.kernel.executeTool('fs.patch', {
      file: args.patchFile,
      approved: true,
      apply: true,
    });
    const tests = this.kernel.executeTool('test.run', {
      command: args.testCommand,
      workspace: args.workspace,
      timeout: args.timeout,
    });
    const after = this.kernel.executeTool('git.diff', {
      patch: Boolean(args.includePatch),
      maxBytes: args.maxBytes,
    });

    const summary = summarizeCycle({ before, patch, tests, after });
    summary.repairApplied = summary.patchApplied;
    this.kernel.trace.append('cycle.repair.completed', summary);
    const result = {
      tool: 'agent.cycle',
      mode: 'repair',
      status: summary.status,
      summary,
      before,
      preview,
      patch,
      tests,
      after,
    };
    if (summary.status === 'fail') {
      result.fixPacket = this.kernel.buildFixPacket({ before, patch, tests, after, summary, source: 'agent.repair' });
    }
    return result;
  }
}

function summarizeCycle({ before, patch, tests, after }) {
  const testsPassed = tests.passed === true || tests.passed === null;
  const patchApplied = patch && patch.mode === 'apply' && patch.fileCount > 0;
  return {
    status: patchApplied && testsPassed ? 'pass' : 'fail',
    patchApplied,
    filesChanged: patch.files ? patch.files.map(file => file.path) : [],
    additions: patch.additions || 0,
    deletions: patch.deletions || 0,
    testsStatus: tests.status,
    testsPassed: tests.passed,
    dirtyBefore: before.status === 'ok' ? before.dirty : null,
    dirtyAfter: after.status === 'ok' ? after.dirty : null,
  };
}

module.exports = { AgentCycleRunner, summarizeCycle };
