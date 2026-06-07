const fs = require('fs');
const path = require('path');

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
    const filePaths = input.files || (input.patch && input.patch.files ? input.patch.files.map(f => f.path) : []);
    const contextFiles = this.readContextFiles(filePaths);
    const packet = {
      schemaVersion: 1,
      type: 'agent-fix-packet',
      generatedAt: new Date().toISOString(),
      status: 'needs-fix',
      goal: input.goal || null,
      instructions: [
        'Use the failed test output, git diff, and file content to identify the smallest corrective patch.',
        'Do not weaken tests unless the spec or task is explicitly wrong.',
        'Prefer a minimal code change and rerun the failing test command.',
        'Return a unified diff that can be processed by fs.patch preview/apply.',
      ],
      summary: input.summary || null,
      patch: compactPatch(input.patch),
      tests: compactTests(input.tests),
      git: compactGit(input.after || input.git),
      before: compactGit(input.before),
      contextFiles,
      metadata: {
        cwd: this.cwd,
        source: input.source || 'agent.cycle',
      },
    };
    this.record('fix-packet.generated', {
      status: packet.status,
      testsStatus: packet.tests ? packet.tests.status : null,
      filesChanged: packet.summary ? packet.summary.filesChanged : [],
      contextFileCount: contextFiles.length,
    });
    return packet;
  }

  readContextFiles(paths) {
    return (paths || []).slice(0, 10).map(filePath => {
      const resolved = path.resolve(this.cwd, filePath);
      if (!fs.existsSync(resolved)) return { path: filePath, content: null, bytes: 0 };
      try {
        const content = fs.readFileSync(resolved, 'utf8');
        return { path: filePath, content: tail(content, 6000), bytes: Buffer.byteLength(content, 'utf8') };
      } catch (_) {
        return { path: filePath, content: null, bytes: 0 };
      }
    });
  }

  write(packet, options = {}) {
    const dir = options.outputDir || path.join(this.cwd, 'stdd', 'agent', 'fix-packets');
    fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = options.name || `fix-packet-${stamp}`;
    const jsonPath = path.join(dir, `${baseName}.json`);
    const mdPath = path.join(dir, `${baseName}.md`);
    fs.writeFileSync(jsonPath, JSON.stringify(packet, null, 2), 'utf8');
    fs.writeFileSync(mdPath, this.toMarkdown(packet), 'utf8');
    const output = {
      json: path.relative(this.cwd, jsonPath).replace(/\\/g, '/'),
      markdown: path.relative(this.cwd, mdPath).replace(/\\/g, '/'),
    };
    this.record('fix-packet.written', output);
    return output;
  }

  toMarkdown(packet) {
    const lines = [
      '# Agent Fix Packet',
      '',
      `Generated: ${packet.generatedAt}`,
      `Goal: ${packet.goal || '(none)'}`,
      `Status: ${packet.status}`,
      '',
      '## Instructions For The Repair Model',
      '',
      ...packet.instructions.map(item => `- ${item}`),
      '- Return only a unified diff. Do not include prose outside the diff.',
      '- Do not apply changes directly; the caller will run fs.patch preview/apply.',
      '',
    ];
    appendJsonBlock(lines, 'Summary', packet.summary);
    appendJsonBlock(lines, 'Patch Metadata', packet.patch);
    appendJsonBlock(lines, 'Test Results', packet.tests);
    appendJsonBlock(lines, 'Git Context', packet.git);
    appendJsonBlock(lines, 'Before Context', packet.before);
    appendContextFiles(lines, packet.contextFiles);
    lines.push('## Required Output', '', '```diff', 'diff --git a/path b/path', '--- a/path', '+++ b/path', '@@ -1 +1 @@', '-old', '+new', '```', '');
    return lines.join('\n');
  }

  record(type, payload) {
    if (this.trace && typeof this.trace.append === 'function') {
      this.trace.append(type, payload);
    }
  }
}

function appendJsonBlock(lines, title, value) {
  if (!value) return;
  lines.push(`## ${title}`, '', '```json', JSON.stringify(value, null, 2), '```', '');
}

function appendContextFiles(lines, files) {
  if (!files || files.length === 0) return;
  lines.push('## Changed File Content', '');
  for (const file of files) {
    lines.push(`### ${file.path}`, '');
    if (file.content) {
      const lang = file.path.endsWith('.js') || file.path.endsWith('.ts') ? 'javascript' : '';
      lines.push(lang ? `\`\`\`${lang}` : '```', file.content, '```', '');
    } else {
      lines.push('_Unable to read file._', '');
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
