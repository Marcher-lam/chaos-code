const fs = require('fs');
const path = require('path');

const { walkFiles } = require('../../utils/file-walker');
const { isPathSafe } = require('../../utils/security');

const DEFAULT_MAX_BYTES = 64 * 1024;
const DEFAULT_MAX_RESULTS = 50;
const DEFAULT_MAX_LINES = 2000;
const HARD_MAX_READ_BYTES = 16 * 1024 * 1024; // windowing must never load unbounded files
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_MIME_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};
// Secret-shaped basenames are NOT auto-readable: their contents would be
// serialized straight into prompts sent to an external provider.
const SECRET_FILE_PATTERNS = [/^\.env(\..+)?$/i, /^credentials$/i, /^id_rsa/i, /\.pem$/i, /^\.npmrc$/i, /^\.netrc$/i];
const TEXT_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json', '.md', '.txt', '.mdx',
  '.yaml', '.yml', '.toml', '.ini', '.conf', '.cfg',
  '.css', '.scss', '.less', '.html', '.htm', '.xml', '.svg', '.vue', '.svelte',
  '.py', '.go', '.rs', '.java', '.cs', '.php', '.rb', '.kt', '.swift', '.scala',
  '.dart', '.sh', '.bash', '.zsh', '.sql', '.graphql', '.gql', '.proto', '.tf',
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

function isSecretShaped(filePath) {
  const base = path.basename(filePath);
  return SECRET_FILE_PATTERNS.some(re => re.test(base));
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
    if (name === 'fs.read_image') return this.readImage(args);
    if (name === 'fs.search') return this.search(args);
    throw new Error(`Unsupported read-only tool: ${name}`);
  }

  /**
   * Read an image file as base64 for multimodal (vision) analysis.
   * The result carries an `_image` field the agent loop maps to the
   * provider-native image block (OpenAI image_url / Anthropic image).
   */
  readImage(args = {}) {
    const targetPath = toWorkspacePath(this.cwd, args.path);
    assertSafePath(this.cwd, targetPath);
    if (!fs.existsSync(targetPath)) {
      throw new Error(`Image not found: ${args.path || '.'}`);
    }
    const ext = path.extname(targetPath).toLowerCase();
    const mimeType = IMAGE_MIME_TYPES[ext];
    if (!mimeType) {
      throw new Error(`Unsupported image type "${ext}". Supported: ${Object.keys(IMAGE_MIME_TYPES).join(', ')}`);
    }
    const stat = fs.statSync(targetPath);
    if (!stat.isFile()) throw new Error(`Path is not a file: ${args.path}`);
    if (stat.size > MAX_IMAGE_BYTES) {
      throw new Error(`Image exceeds 5MB limit: ${relativePath(this.cwd, targetPath)} (${(stat.size / 1024 / 1024).toFixed(1)}MB)`);
    }

    const data = fs.readFileSync(targetPath).toString('base64');
    const result = {
      tool: 'fs.read_image',
      path: relativePath(this.cwd, targetPath),
      mimeType,
      bytes: stat.size,
      note: 'Image loaded. It is delivered to you as a native vision block alongside this message — analyze it directly.',
      _image: { data, mimeType, detail: args.detail || 'auto' },
    };
    this.record('tool.fs.read_image', { path: result.path, mimeType, bytes: result.bytes });
    return result;
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
    if (isSecretShaped(targetPath)) {
      throw new Error(`Refusing to auto-read potential secrets file: ${relativePath(this.cwd, targetPath)}. Ask the user to approve it explicitly (e.g. via shell_run).`);
    }
    if (!isTextFile(targetPath)) {
      throw new Error(`Refusing to read non-text file: ${relativePath(this.cwd, targetPath)}`);
    }
    if (stat.size > HARD_MAX_READ_BYTES) {
      throw new Error(`File too large to read (${(stat.size / 1024 / 1024).toFixed(1)}MB > 16MB): ${relativePath(this.cwd, targetPath)}. Use fs_search to explore it.`);
    }

    const maxBytes = args.maxBytes || this.maxBytes;
    const wantsWindow = args.startLine !== undefined || args.lineCount !== undefined;

    // Small file without an explicit window: return everything (back-compat shape)
    if (stat.size <= maxBytes && !wantsWindow) {
      const content = fs.readFileSync(targetPath, 'utf8');
      const result = {
        tool: 'fs.read',
        path: relativePath(this.cwd, targetPath),
        bytes: Buffer.byteLength(content, 'utf8'),
        totalLines: content.split('\n').length,
        content,
      };
      this.record('tool.fs.read', { path: result.path, bytes: result.bytes });
      return result;
    }

    // Large file (or explicit window): read a bounded line window instead of
    // failing, so the agent can paginate through big files like Claude Code.
    const startLine = Math.max(1, Number(args.startLine) || 1);
    const maxLines = Math.max(1, Math.min(Number(args.lineCount) || DEFAULT_MAX_LINES, DEFAULT_MAX_LINES));
    const raw = fs.readFileSync(targetPath, 'utf8');
    const allLines = raw.split('\n');
    const slice = [];
    let bytes = 0;
    for (let i = startLine - 1; i < allLines.length && slice.length < maxLines; i++) {
      const line = allLines[i];
      // Byte budget in UTF-8 terms (CJK/emoji are up to 3 bytes per unit)
      const lineBytes = Buffer.byteLength(line, 'utf8') + 1;
      if (bytes + lineBytes > maxBytes && slice.length > 0) break;
      slice.push(line);
      bytes += lineBytes;
    }
    const emptyWindow = slice.length === 0; // e.g. startLine beyond EOF
    const result = {
      tool: 'fs.read',
      path: relativePath(this.cwd, targetPath),
      bytes: Buffer.byteLength(slice.join('\n'), 'utf8'),
      totalLines: allLines.length,
      startLine,
      endLine: emptyWindow ? startLine : startLine + slice.length - 1,
      truncated: !emptyWindow && startLine + slice.length - 1 < allLines.length,
      ...(emptyWindow ? { note: `startLine ${startLine} is beyond end of file (${allLines.length} lines).` } : {}),
      content: slice.join('\n'),
    };
    this.record('tool.fs.read', { path: result.path, startLine, endLine: result.endLine, windowed: true });
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
