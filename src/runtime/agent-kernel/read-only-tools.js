const fs = require('fs');
const path = require('path');

const { walkFiles } = require('../../utils/file-walker');
const { isPathSafe } = require('../../utils/security');

const DEFAULT_MAX_BYTES = 64 * 1024;
const DEFAULT_MAX_RESULTS = 50;
const TEXT_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.txt', '.yaml', '.yml',
  '.css', '.scss', '.html', '.py', '.go', '.rs', '.java', '.cs', '.php',
]);

function toWorkspacePath(cwd, inputPath) {
  const requested = inputPath || '.';
  return path.resolve(cwd, requested);
}

function relativePath(cwd, filePath) {
  return path.relative(cwd, filePath) || '.';
}

function assertSafePath(cwd, targetPath) {
  if (!isPathSafe(targetPath, cwd)) {
    throw new Error(`Path is outside workspace or unsafe: ${targetPath}`);
  }
}

function isTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return TEXT_EXTENSIONS.has(ext) || ext === '';
}

class ReadOnlyToolExecutor {
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.trace = options.trace || null;
    this.maxBytes = options.maxBytes || DEFAULT_MAX_BYTES;
    this.maxResults = options.maxResults || DEFAULT_MAX_RESULTS;
  }

  execute(name, args = {}) {
    if (name === 'fs.read') return this.readFile(args);
    if (name === 'fs.search') return this.search(args);
    throw new Error(`Unsupported read-only tool: ${name}`);
  }

  readFile(args = {}) {
    const targetPath = toWorkspacePath(this.cwd, args.path);
    assertSafePath(this.cwd, targetPath);
    if (!fs.existsSync(targetPath)) {
      throw new Error(`File not found: ${args.path || '.'}`);
    }
    const stat = fs.statSync(targetPath);
    if (!stat.isFile()) {
      throw new Error(`Path is not a file: ${args.path || '.'}`);
    }
    if (stat.size > (args.maxBytes || this.maxBytes)) {
      throw new Error(`File exceeds max read size: ${relativePath(this.cwd, targetPath)}`);
    }
    if (!isTextFile(targetPath)) {
      throw new Error(`Refusing to read non-text file: ${relativePath(this.cwd, targetPath)}`);
    }

    const content = fs.readFileSync(targetPath, 'utf8');
    const result = {
      tool: 'fs.read',
      path: relativePath(this.cwd, targetPath),
      bytes: Buffer.byteLength(content, 'utf8'),
      content,
    };
    this.record('tool.fs.read', { path: result.path, bytes: result.bytes });
    return result;
  }

  search(args = {}) {
    const query = String(args.query || '').trim();
    if (!query) throw new Error('fs.search requires a query.');

    const root = toWorkspacePath(this.cwd, args.path || '.');
    assertSafePath(this.cwd, root);
    if (!fs.existsSync(root)) throw new Error(`Search path not found: ${args.path || '.'}`);

    const maxResults = Number(args.maxResults || this.maxResults);
    const files = fs.statSync(root).isFile() ? [root] : walkFiles(root, {
      predicate: filePath => isTextFile(filePath),
    });
    const results = [];
    const lowerQuery = args.caseSensitive ? query : query.toLowerCase();

    for (const filePath of files) {
      assertSafePath(this.cwd, filePath);
      let content;
      try {
        const stat = fs.statSync(filePath);
        if (!stat.isFile() || stat.size > (args.maxBytes || this.maxBytes)) continue;
        content = fs.readFileSync(filePath, 'utf8');
      } catch (_) {
        continue;
      }

      const lines = content.split('\n');
      for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        const haystack = args.caseSensitive ? line : line.toLowerCase();
        if (haystack.includes(lowerQuery)) {
          results.push({
            path: relativePath(this.cwd, filePath),
            line: index + 1,
            text: line.slice(0, 500),
          });
          if (results.length >= maxResults) {
            this.record('tool.fs.search', { query, resultCount: results.length, truncated: true });
            return { tool: 'fs.search', query, results, truncated: true };
          }
        }
      }
    }

    this.record('tool.fs.search', { query, resultCount: results.length, truncated: false });
    return { tool: 'fs.search', query, results, truncated: false };
  }

  record(type, payload) {
    if (this.trace && typeof this.trace.append === 'function') {
      this.trace.append(type, payload);
    }
  }
}

module.exports = { ReadOnlyToolExecutor, isTextFile };
