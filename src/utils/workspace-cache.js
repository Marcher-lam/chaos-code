const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { walkFiles } = require('./file-walker');
const { resolveWorkspace } = require('./workspace-detector');

class WorkspaceCache {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.cacheFilePath = path.join(this.cwd, 'stdd', 'workspace-cache.json');
  }

  /**
   * Load cache database from disk
   * @returns {object}
   */
  loadCache() {
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const content = fs.readFileSync(this.cacheFilePath, 'utf8');
        return JSON.parse(content) || {};
      }
    } catch (_) {
      // Return empty if parsing/reading fails
    }
    return {};
  }

  /**
   * Write cache database to disk
   * @param {object} cache
   */
  saveCacheData(cache) {
    try {
      const dir = path.dirname(this.cacheFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(cache, null, 2), 'utf8');
    } catch (_) {
      // Silently ignore saving errors
    }
  }

  /**
   * Calculate workspace files hash
   * @param {object} workspace Resolved workspace object
   * @returns {string} SHA256 string
   */
  calculateWorkspaceHash(workspace) {
    if (!workspace || !workspace.root) {
      return '';
    }

    const files = walkFiles(workspace.root);
    // Sort to ensure deterministic hashing
    files.sort();

    const hash = crypto.createHash('sha256');

    // Add workspace root path (in case it is moved/renamed)
    hash.update(path.relative(this.cwd, workspace.root));

    for (const file of files) {
      try {
        const stats = fs.statSync(file);
        const relPath = path.relative(workspace.root, file).replace(/\\/g, '/');
        
        // Hash file metadata: path, size, mtime (ms)
        hash.update(`${relPath}:${stats.size}:${stats.mtimeMs}`);

        // For small config files, hash content as well for extra robustness
        const filename = path.basename(file);
        if (stats.size < 50000 && (
          filename.endsWith('.json') || 
          filename.includes('config') || 
          filename.endsWith('.yaml') || 
          filename.endsWith('.yml')
        )) {
          const content = fs.readFileSync(file);
          hash.update(content);
        }
      } catch (_) {
        // Skip files that cannot be read/statted (e.g. broken symlinks)
      }
    }

    return hash.digest('hex');
  }

  cacheKey(workspace) {
    const relRoot = path.relative(this.cwd, workspace.root || '').replace(/\\/g, '/');
    return `${workspace.name || 'workspace'}:${relRoot}`;
  }

  /**
   * Check if the workspace cache is valid for a given type of check
   * @param {string} selector Workspace name or path
   * @param {string} type Type of validation (e.g. 'verify', 'constitution')
   * @returns {object|null} The cached result data or null if invalid
   */
  getValidCache(selector, type) {
    let ws;
    try {
      ws = resolveWorkspace(this.cwd, selector);
    } catch (_) {
      return null;
    }
    if (!ws) return null;

    const currentHash = this.calculateWorkspaceHash(ws);
    if (!currentHash) return null;

    const cache = this.loadCache();
    const wsCache = cache[this.cacheKey(ws)];
    if (wsCache && wsCache.hash === currentHash && wsCache[type]) {
      return wsCache[type];
    }
    return null;
  }

  /**
   * Set valid cache for a workspace
   * @param {string} selector Workspace name or path
   * @param {string} type Type of validation
   * @param {object} data Cached result data
   */
  setCache(selector, type, data) {
    let ws;
    try {
      ws = resolveWorkspace(this.cwd, selector);
    } catch (_) {
      return;
    }
    if (!ws) return;

    const currentHash = this.calculateWorkspaceHash(ws);
    if (!currentHash) return;

    const cache = this.loadCache();
    const key = this.cacheKey(ws);
    if (!cache[key]) {
      cache[key] = { hash: currentHash };
    }
    
    // Update hash to current hash
    cache[key].hash = currentHash;
    cache[key][type] = data;

    this.saveCacheData(cache);
  }

  /**
   * Invalidate cache for a workspace
   * @param {string} selector Workspace name or path
   */
  invalidateCache(selector) {
    let ws;
    try {
      ws = resolveWorkspace(this.cwd, selector);
    } catch (_) {
      return;
    }
    if (!ws) return;

    const cache = this.loadCache();
    delete cache[this.cacheKey(ws)];
    this.saveCacheData(cache);
  }
}

module.exports = WorkspaceCache;
