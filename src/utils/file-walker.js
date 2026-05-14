const fs = require('fs');
const path = require('path');

const DEFAULT_SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'coverage',
  '.next', 'reports', '.cache', '.stdd',
]);

function walkFiles(dir, options = {}) {
  const {
    predicate,
    extensions,
    skipDirs = DEFAULT_SKIP_DIRS,
  } = options;

  const extSet = extensions
    ? new Set(Array.isArray(extensions) ? extensions : [extensions])
    : null;

  const files = [];
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) {
        files.push(...walkFiles(fullPath, options));
      }
    } else if (entry.isFile()) {
      if (predicate && !predicate(fullPath)) continue;
      if (extSet && !extSet.has(path.extname(entry.name))) continue;
      files.push(fullPath);
    }
  }
  return files;
}

module.exports = { walkFiles, DEFAULT_SKIP_DIRS };
