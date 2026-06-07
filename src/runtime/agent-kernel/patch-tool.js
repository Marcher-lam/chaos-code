const fs = require('fs');
const path = require('path');

const { isPathSafe } = require('../../utils/security');

function normalizePatchPath(rawPath) {
  const value = String(rawPath || '').trim();
  if (!value || value === '/dev/null') return null;
  return value.replace(/^[ab]\//, '');
}

function parsePatch(diffText = '') {
  const files = [];
  const lines = String(diffText || '').split('\n');
  let current = null;
  let currentHunk = null;

  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      const match = line.match(/^diff --git\s+a\/(.+?)\s+b\/(.+)$/);
      if (match) {
        current = {
          oldPath: normalizePatchPath(match[1]),
          newPath: normalizePatchPath(match[2]),
          additions: 0,
          deletions: 0,
          hunks: [],
        };
        files.push(current);
        currentHunk = null;
      }
      continue;
    }

    if (!current && (line.startsWith('--- ') || line.startsWith('+++ '))) {
      current = { oldPath: null, newPath: null, additions: 0, deletions: 0, hunks: [] };
      files.push(current);
    }

    if (line.startsWith('--- ')) {
      current.oldPath = normalizePatchPath(line.slice(4));
      continue;
    }
    if (line.startsWith('+++ ')) {
      current.newPath = normalizePatchPath(line.slice(4));
      continue;
    }
    if (line.startsWith('@@ ')) {
      if (!current) throw new Error('Patch hunk found before file header.');
      const match = line.match(/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/);
      if (!match) throw new Error(`Invalid patch hunk header: ${line}`);
      currentHunk = {
        oldStart: Number(match[1]),
        oldCount: Number(match[2] || 1),
        newStart: Number(match[3]),
        newCount: Number(match[4] || 1),
        lines: [],
      };
      current.hunks.push(currentHunk);
      continue;
    }
    if (current && line.startsWith('+') && !line.startsWith('+++ ')) {
      current.additions++;
      if (currentHunk) currentHunk.lines.push({ type: 'add', text: line.slice(1) });
      continue;
    }
    if (current && line.startsWith('-') && !line.startsWith('--- ')) {
      current.deletions++;
      if (currentHunk) currentHunk.lines.push({ type: 'remove', text: line.slice(1) });
      continue;
    }
    if (currentHunk && (line.startsWith(' ') || line === '')) {
      currentHunk.lines.push({ type: 'context', text: line.startsWith(' ') ? line.slice(1) : line });
    }
  }

  return files.filter(file => file.oldPath || file.newPath);
}

class PatchTool {
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.trace = options.trace || null;
  }

  preview(args = {}) {
    const diffText = this.loadDiff(args);
    if (!diffText.trim()) throw new Error('fs.patch preview requires a diff.');

    const files = parsePatch(diffText).map(file => this.validateFile(file));
    if (files.length === 0) throw new Error('No files found in patch.');

    const result = {
      tool: 'fs.patch',
      mode: 'preview',
      approvedRequired: true,
      fileCount: files.length,
      additions: files.reduce((sum, file) => sum + file.additions, 0),
      deletions: files.reduce((sum, file) => sum + file.deletions, 0),
      files,
    };
    this.record('tool.fs.patch.preview', {
      fileCount: result.fileCount,
      additions: result.additions,
      deletions: result.deletions,
      files: files.map(file => file.path),
    });
    return result;
  }

  apply(args = {}) {
    if (!args.approved) {
      throw new Error('fs.patch apply requires explicit approval.');
    }
    const diffText = this.loadDiff(args);
    if (!diffText.trim()) throw new Error('fs.patch apply requires a diff.');

    const parsedFiles = parsePatch(diffText);
    if (parsedFiles.length === 0) throw new Error('No files found in patch.');

    const results = [];
    for (const parsedFile of parsedFiles) {
      const file = this.validateFile(parsedFile);
      if (!parsedFile.newPath) {
        throw new Error(`Deleting files is not supported by fs.patch apply yet: ${parsedFile.oldPath}`);
      }
      const targetPath = path.resolve(this.cwd, file.path);
      const before = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf8') : '';
      const after = applyHunks(before, parsedFile.hunks, file.path);
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, after, 'utf8');
      results.push({ ...file, written: true, beforeBytes: Buffer.byteLength(before, 'utf8'), afterBytes: Buffer.byteLength(after, 'utf8') });
    }

    const result = {
      tool: 'fs.patch',
      mode: 'apply',
      fileCount: results.length,
      additions: results.reduce((sum, file) => sum + file.additions, 0),
      deletions: results.reduce((sum, file) => sum + file.deletions, 0),
      files: results,
    };
    this.record('tool.fs.patch.apply', {
      fileCount: result.fileCount,
      additions: result.additions,
      deletions: result.deletions,
      files: results.map(file => file.path),
    });
    return result;
  }

  loadDiff(args = {}) {
    if (args.diff) return String(args.diff);
    if (!args.file) return '';
    const filePath = path.resolve(this.cwd, args.file);
    if (!isPathSafe(filePath, this.cwd)) {
      throw new Error(`Patch file is outside workspace or unsafe: ${args.file}`);
    }
    if (!fs.existsSync(filePath)) throw new Error(`Patch file not found: ${args.file}`);
    return fs.readFileSync(filePath, 'utf8');
  }

  validateFile(file) {
    const target = file.newPath || file.oldPath;
    const resolved = path.resolve(this.cwd, target);
    if (!isPathSafe(resolved, this.cwd)) {
      throw new Error(`Patch target is outside workspace or unsafe: ${target}`);
    }
    return {
      path: target,
      oldPath: file.oldPath,
      newPath: file.newPath,
      additions: file.additions,
      deletions: file.deletions,
      exists: fs.existsSync(resolved),
      hunkCount: file.hunks ? file.hunks.length : 0,
    };
  }

  record(type, payload) {
    if (this.trace && typeof this.trace.append === 'function') {
      this.trace.append(type, payload);
    }
  }
}

function applyHunks(content, hunks, label) {
  const hadTrailingNewline = content.endsWith('\n');
  const originalLines = content.length === 0 ? [] : content.replace(/\n$/, '').split('\n');
  const output = [];
  let cursor = 0;

  for (const hunk of hunks || []) {
    const hunkStart = Math.max(0, hunk.oldStart - 1);
    while (cursor < hunkStart) {
      output.push(originalLines[cursor]);
      cursor++;
    }

    for (const entry of hunk.lines) {
      if (entry.type === 'context') {
        if (originalLines[cursor] !== entry.text) {
          throw new Error(`Patch context mismatch in ${label} at line ${cursor + 1}.`);
        }
        output.push(originalLines[cursor]);
        cursor++;
      } else if (entry.type === 'remove') {
        if (originalLines[cursor] !== entry.text) {
          throw new Error(`Patch removal mismatch in ${label} at line ${cursor + 1}.`);
        }
        cursor++;
      } else if (entry.type === 'add') {
        output.push(entry.text);
      }
    }
  }

  while (cursor < originalLines.length) {
    output.push(originalLines[cursor]);
    cursor++;
  }

  const result = output.join('\n');
  if (result === '') return '';
  return hadTrailingNewline ? result + '\n' : result;
}

module.exports = { PatchTool, applyHunks, parsePatch, normalizePatchPath };
