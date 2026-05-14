const fs = require('fs');
const path = require('path');
const { findActiveChange } = require('../../utils/change-utils');
const { walkFiles } = require('../../utils/file-walker');

const TEXT_EXTENSIONS = /\.(md|feature|txt|json|yaml|yml|log)$/i;
const MAX_FILE_CHARS = 12000;
const MAX_OUTPUT_CHARS = 20000;

function safeRead(filePath, limit = MAX_FILE_CHARS) {
  try {
    const text = fs.readFileSync(filePath, 'utf8');
    return text.length > limit ? `${text.slice(0, limit)}\n\n[truncated ${text.length - limit} chars]` : text;
  } catch (_) {
    return null;
  }
}

function newestFirst(files) {
  return files
    .filter(file => fs.existsSync(file))
    .map(file => ({ file, mtime: fs.statSync(file).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
    .map(item => item.file);
}

class FixPacketCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
  }

  execute(changeName, options = {}) {
    const stddDir = path.join(this.cwd, 'stdd');
    if (!fs.existsSync(stddDir)) throw new Error('STDD not initialized. Run `stdd init` first.');

    const changeDir = findActiveChange(stddDir, changeName);
    if (!changeDir) throw new Error(changeName ? `Change '${changeName}' not found.` : 'No active changes found.');

    const packet = this.buildPacket(changeDir, options);
    const output = this.writePacket(changeDir, packet);
    packet.output = output.relativeMarkdown;
    packet.jsonOutput = output.relativeJson;

    if (options.json && !options.silent) {
      console.log(JSON.stringify(packet, null, 2));
      return packet;
    }

    if (!options.silent) console.log(`Fix packet written: ${output.relativeMarkdown}`);
    return packet;
  }

  buildPacket(changeDir, options = {}) {
    const change = path.basename(changeDir);
    const specsDir = path.join(changeDir, 'specs');
    const evidenceDir = path.join(changeDir, 'evidence');
    const rootEvidenceDir = path.join(this.cwd, 'stdd', 'evidence');
    const files = [];

    for (const name of ['proposal.md', 'design.md', 'tasks.md', 'arch-decisions.md', 'implementation_log.md', 'apply.log']) {
      const filePath = path.join(changeDir, name);
      if (fs.existsSync(filePath)) files.push(filePath);
    }
    files.push(...walkFiles(specsDir, { predicate: file => TEXT_EXTENSIONS.test(file) }));

    const evidenceFiles = newestFirst([
      ...walkFiles(evidenceDir, { predicate: file => TEXT_EXTENSIONS.test(file) }),
      ...walkFiles(rootEvidenceDir, { predicate: file => TEXT_EXTENSIONS.test(file) }),
    ]).slice(0, Number(options.evidenceLimit || 8));

    return {
      change,
      generatedAt: new Date().toISOString(),
      task: options.task || null,
      status: 'needs-fix',
      instructions: [
        'Read the specs and task first; they are the contract.',
        'Fix application code, not test expectations, unless the spec is explicitly wrong.',
        'Use evidence and runtime artifacts to locate the failure before editing.',
        'Prefer the smallest code change that makes the failing test pass.',
        'Run the listed test command again and record the result.',
      ],
      testCommand: options.testCommand || null,
      testOutput: options.testOutput ? safeRead(path.resolve(this.cwd, options.testOutput), MAX_OUTPUT_CHARS) : null,
      contextFiles: files.map(file => this.fileBlock(file)),
      evidenceFiles: evidenceFiles.map(file => this.fileBlock(file)),
      runtimeArtifacts: this.findRuntimeArtifacts().slice(0, Number(options.artifactLimit || 12)),
    };
  }

  fileBlock(filePath) {
    return {
      path: path.relative(this.cwd, filePath).replace(/\\/g, '/'),
      content: safeRead(filePath),
    };
  }

  findRuntimeArtifacts() {
    const roots = [
      path.join(this.cwd, 'stdd', 'evidence'),
      path.join(this.cwd, 'stdd', 'debug'),
      path.join(this.cwd, 'test-results'),
      path.join(this.cwd, 'playwright-report'),
      path.join(this.cwd, 'coverage'),
    ];
    const artifactPattern = /\.(png|jpg|jpeg|webp|zip|trace|har|html|json)$/i;
    return newestFirst(roots.flatMap(root => walkFiles(root, { predicate: file => artifactPattern.test(file) })))
      .map(file => path.relative(this.cwd, file).replace(/\\/g, '/'));
  }

  writePacket(changeDir, packet) {
    const evidenceDir = path.join(changeDir, 'evidence');
    fs.mkdirSync(evidenceDir, { recursive: true });
    const stamp = Date.now();
    const jsonPath = path.join(evidenceDir, `fix-packet-${stamp}.json`);
    const mdPath = path.join(evidenceDir, `fix-packet-${stamp}.md`);
    fs.writeFileSync(jsonPath, JSON.stringify(packet, null, 2), 'utf8');
    fs.writeFileSync(mdPath, this.toMarkdown(packet), 'utf8');
    return {
      relativeJson: path.relative(this.cwd, jsonPath).replace(/\\/g, '/'),
      relativeMarkdown: path.relative(this.cwd, mdPath).replace(/\\/g, '/'),
    };
  }

  toMarkdown(packet) {
    const lines = [`# Fix Packet: ${packet.change}`, '', `Generated: ${packet.generatedAt}`, '', '## System Rules'];
    lines.push(...packet.instructions.map(item => `- ${item}`), '');
    if (packet.testCommand) lines.push('## Test Command', '', '```bash', packet.testCommand, '```', '');
    if (packet.testOutput) lines.push('## Test Output', '', '```text', packet.testOutput, '```', '');
    lines.push('## Context Files', '');
    for (const file of packet.contextFiles) this.appendFile(lines, file);
    lines.push('## Evidence Files', '');
    for (const file of packet.evidenceFiles) this.appendFile(lines, file);
    if (packet.runtimeArtifacts.length > 0) lines.push('## Runtime Artifacts', '', ...packet.runtimeArtifacts.map(file => `- ${file}`), '');
    lines.push('## Task', '', 'Use the context above to propose and apply the smallest fix. Do not weaken tests to make them pass.', '');
    return lines.join('\n');
  }

  appendFile(lines, file) {
    lines.push(`### ${file.path}`, '');
    lines.push(file.content === null ? '_Unable to read file._' : ['```text', file.content, '```'].join('\n'), '');
  }
}

module.exports = { FixPacketCommand };
