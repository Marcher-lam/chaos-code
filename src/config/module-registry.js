// ─── Module Registry ───
// Core registry for the STDD modules marketplace.
// Uses only fs and path — no external dependencies.

const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');

class ModuleRegistry {
  /**
   * @param {object} options
   * @param {string} options.registryUrl  - Remote registry URL (optional)
   * @param {string} options.cachePath    - Local cache directory for catalog
   */
  constructor(options = {}) {
    this.registryUrl = options.registryUrl || null;
    this.cachePath = options.cachePath || null;
    this._remoteCache = new Map();
    this._cacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Official module catalog - pre-seeded with built-in modules.
   */
  static OFFICIAL_MODULES = [
    {
      name: 'stdd-tea',
      version: '1.0.0',
      description: 'Test Architecture module - risk-based test strategy, test matrix generation, coverage governance',
      category: 'testing',
      official: true,
      author: 'STDD',
      keywords: ['test', 'architecture', 'strategy', 'coverage', 'tea'],
      dependencies: [],
    },
    {
      name: 'stdd-security-audit',
      version: '1.0.0',
      description: 'Security audit module - OWASP Top 10 scanning, dependency vulnerability check, compliance verification',
      category: 'security',
      official: true,
      author: 'STDD',
      keywords: ['security', 'owasp', 'audit', 'compliance', 'vulnerability'],
      dependencies: [],
    },
    {
      name: 'stdd-design-system',
      version: '1.0.0',
      description: 'Design system module - DESIGN.md token management, component library scaffolding, visual regression baselines',
      category: 'design',
      official: true,
      author: 'STDD',
      keywords: ['design', 'tokens', 'ui', 'components', 'visual'],
      dependencies: [],
    },
    {
      name: 'stdd-ci-pipeline',
      version: '1.0.0',
      description: 'CI/CD integration module - GitHub Actions workflow generation, pre-commit hooks, quality gate enforcement',
      category: 'ci',
      official: true,
      author: 'STDD',
      keywords: ['ci', 'cd', 'github-actions', 'pipeline', 'hooks'],
      dependencies: ['stdd-tea'],
    },
    {
      name: 'stdd-brownfield',
      version: '1.0.0',
      description: 'Brownfield onboarding module - legacy code analysis, incremental TDD adoption, migration planning',
      category: 'onboarding',
      official: true,
      author: 'STDD',
      keywords: ['brownfield', 'legacy', 'migration', 'onboarding', 'incremental'],
      dependencies: [],
    },
    {
      name: 'stdd-agile-workflow',
      version: '1.0.0',
      description: 'Agile workflow module - story/epic management, sprint planning, retrospective templates, velocity tracking',
      category: 'agile',
      official: true,
      author: 'STDD',
      keywords: ['agile', 'scrum', 'story', 'epic', 'sprint', 'retrospective'],
      dependencies: [],
    },
    {
      name: 'stdd-enterprise-governance',
      version: '1.0.0',
      description: 'Enterprise governance module - RBAC roles, audit trail, compliance reporting, multi-team coordination',
      category: 'enterprise',
      official: true,
      author: 'STDD',
      keywords: ['enterprise', 'governance', 'rbac', 'audit', 'compliance'],
      dependencies: ['stdd-security-audit', 'stdd-ci-pipeline'],
    },
  ];

  /**
   * Seed the catalog with official modules if it's empty or new.
   */
  seedOfficialCatalog(catalogPath) {
    const catalog = this._readCatalog(catalogPath);
    if (catalog.extensions.length > 0) return catalog;

    catalog.extensions = ModuleRegistry.OFFICIAL_MODULES.map(m => ({ ...m }));
    this._writeCatalog(catalogPath, catalog);
    return catalog;
  }

  /**
   * Install a module and its dependencies recursively.
   */
  async installWithDependencies(moduleName, targetDir, options = {}) {
    const catalogPath = options.catalogPath;
    const catalog = catalogPath ? this._readCatalog(catalogPath) : { extensions: ModuleRegistry.OFFICIAL_MODULES };
    const module = catalog.extensions.find(e => e.name === moduleName);
    if (!module) throw new Error('Module not found: ' + moduleName);

    // Install dependencies first
    if (module.dependencies && module.dependencies.length > 0) {
      for (const dep of module.dependencies) {
        try {
          await this.install(dep, targetDir, options);
        } catch (_) {
          // Dependency may already be installed
        }
      }
    }

    // Install the module itself
    return this.install(moduleName, targetDir, options);
  }

  /**
   * Fetch data from remote registry. Best-effort: returns [] on failure.
   * @param {string} endpoint API endpoint path (e.g. '/api/modules?q=test')
   * @returns {Promise<Array>}
   */
  async _fetchRemote(endpoint) {
    if (!this.registryUrl) return [];

    // Check cache
    const cacheKey = endpoint;
    const cached = this._remoteCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this._cacheTTL) {
      return cached.data;
    }

    return new Promise((resolve) => {
      try {
        const fullUrl = new URL(endpoint, this.registryUrl);
        const req = https.get(fullUrl.href, { timeout: 5000 }, (res) => {
          let body = '';
          res.on('data', (chunk) => { body += chunk; });
          res.on('end', () => {
            try {
              const data = JSON.parse(body);
              const results = Array.isArray(data) ? data : (data.extensions || data.modules || []);
              this._remoteCache.set(cacheKey, { data: results, timestamp: Date.now() });
              resolve(results);
            } catch {
              resolve([]);
            }
          });
        });

        req.on('error', () => resolve([]));
        req.on('timeout', () => { req.destroy(); resolve([]); });
      } catch {
        resolve([]);
      }
    });
  }

  // ─── Catalog helpers ───

  /** Read catalog from a given path. Returns { extensions: [] } on missing/invalid. */
  _readCatalog(catalogPath) {
    if (!fs.existsSync(catalogPath)) return { extensions: [] };
    try {
      return JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    } catch {
      return { extensions: [] };
    }
  }

  /** Write catalog JSON to disk. Creates parent directories as needed. */
  _writeCatalog(catalogPath, data) {
    fs.mkdirSync(path.dirname(catalogPath), { recursive: true });
    fs.writeFileSync(catalogPath, JSON.stringify(data, null, 2), 'utf8');
  }

  // ─── Search ───

  /**
   * Search local catalog for matching modules (name, description, keywords).
   * If registryUrl is configured, also attempts a remote fetch (best-effort).
   *
   * @param {string} query          Search term
   * @param {object} [options]
   * @param {string} [options.catalogPath]  Override catalog file path
   * @param {string} [options.category]     Filter by category
   * @returns {Array<object>} Matching module entries
   */
  async search(query, options = {}) {
    const catalogPath = options.catalogPath;
    const catalog = catalogPath ? this._readCatalog(catalogPath) : { extensions: [] };
    const q = (query || '').toLowerCase();
    if (!q) return [];

    let matches = catalog.extensions.filter(ext => {
      const name = (ext.name || '').toLowerCase();
      const desc = (ext.description || '').toLowerCase();
      const keywords = (ext.keywords || []).join(' ').toLowerCase();
      return name.includes(q) || desc.includes(q) || keywords.includes(q);
    });

    if (options.category) {
      const cat = options.category.toLowerCase();
      matches = matches.filter(ext => (ext.category || '').toLowerCase() === cat);
    }

    return matches;
  }

  // ─── Info ───

  /**
   * Get full module details from catalog.
   *
   * @param {string} moduleName
   * @param {object} [options]
   * @param {string} [options.catalogPath]
   * @returns {object|null} Module entry or null
   */
  getInfo(moduleName, options = {}) {
    const catalogPath = options.catalogPath;
    if (!catalogPath) return null;
    const catalog = this._readCatalog(catalogPath);
    return catalog.extensions.find(ext => ext.name === moduleName) || null;
  }

  // ─── Install ───

  /**
   * Install a module from catalog to target directory.
   * Copies the module's source files (if present) and updates the catalog.
   *
   * @param {string} moduleName
   * @param {string} targetDir   Absolute path to install into
   * @param {object} [options]
   * @param {string} [options.catalogPath]
   * @param {string} [options.sourceDir]  Override source directory for module files
   * @returns {object} { status, module }
   */
  install(moduleName, targetDir, options = {}) {
    const catalogPath = options.catalogPath;
    if (!catalogPath) throw new Error('catalogPath is required for install.');
    const catalog = this._readCatalog(catalogPath);
    const mod = catalog.extensions.find(ext => ext.name === moduleName);
    if (!mod) throw new Error(`Module not found in catalog: ${moduleName}`);

    // Determine source: if sourceDir provided, copy from there; otherwise mark as catalog-only
    const installedPath = path.join(targetDir, moduleName);
    fs.mkdirSync(installedPath, { recursive: true });

    // Write an extension.json manifest into the installed directory
    const manifest = {
      name: mod.name,
      version: mod.version,
      description: mod.description,
      category: mod.category || '',
      author: mod.author || '',
      keywords: mod.keywords || [],
      official: mod.official || false,
      installedAt: new Date().toISOString(),
    };
    fs.writeFileSync(
      path.join(installedPath, 'extension.json'),
      JSON.stringify(manifest, null, 2),
      'utf8'
    );

    // If source files exist, copy them
    if (options.sourceDir && fs.existsSync(options.sourceDir)) {
      const srcPath = path.join(options.sourceDir, moduleName);
      if (fs.existsSync(srcPath)) {
        const entries = fs.readdirSync(srcPath);
        for (const entry of entries) {
          const fullSrc = path.join(srcPath, entry);
          const fullDest = path.join(installedPath, entry);
          if (fs.statSync(fullSrc).isDirectory()) {
            fs.cpSync(fullSrc, fullDest, { recursive: true });
          } else {
            fs.copyFileSync(fullSrc, fullDest);
          }
        }
      }
    }

    // Update catalog with installed info
    mod.installedAt = manifest.installedAt;
    mod.path = path.relative(path.dirname(catalogPath), installedPath);
    this._writeCatalog(catalogPath, catalog);

    return { status: 'installed', module: mod };
  }

  // ─── Publish ───

  /**
   * Validate and package a module for publishing.
   *
   * @param {string} moduleDir  Path to the module directory
   * @param {object} [options]
   * @param {string} [options.outputDir]  Directory for the packaged manifest
   * @returns {object} { status, errors, packagePath }
   */
  publish(moduleDir, options = {}) {
    const errors = [];
    const manifestPath = path.join(moduleDir, 'extension.json');

    if (!fs.existsSync(manifestPath)) {
      errors.push({ file: manifestPath, error: 'Missing extension.json manifest' });
    } else {
      try {
        const data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        if (!data.name) errors.push({ file: manifestPath, error: 'Missing name field' });
        if (!data.version) errors.push({ file: manifestPath, error: 'Missing version field' });
        if (!data.description) errors.push({ file: manifestPath, error: 'Missing description field' });
      } catch (e) {
        errors.push({ file: manifestPath, error: `Invalid JSON: ${e.message}` });
      }
    }

    if (errors.length) {
      return { status: 'fail', errors, packagePath: null };
    }

    const outputDir = options.outputDir || path.dirname(moduleDir);
    const pkg = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    pkg.publishedAt = new Date().toISOString();
    const packagePath = path.join(outputDir, `publish-${pkg.name}-${Date.now()}.json`);
    fs.mkdirSync(path.dirname(packagePath), { recursive: true });
    fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2), 'utf8');

    return { status: 'packaged', errors: [], packagePath };
  }

  // ─── Remove ───

  /**
   * Remove a module from catalog and delete installed files.
   *
   * @param {string} moduleName
   * @param {object} [options]
   * @param {string} [options.catalogPath]
   * @param {string} [options.installedDir]  Base installed directory
   * @returns {object} { status, removed }
   */
  remove(moduleName, options = {}) {
    const catalogPath = options.catalogPath;
    if (!catalogPath) throw new Error('catalogPath is required for remove.');
    const catalog = this._readCatalog(catalogPath);
    const idx = catalog.extensions.findIndex(ext => ext.name === moduleName);
    if (idx === -1) throw new Error(`Module not found: ${moduleName}`);

    const removed = catalog.extensions.splice(idx, 1)[0];
    this._writeCatalog(catalogPath, catalog);

    // Delete installed files if they exist
    if (options.installedDir) {
      const installedPath = path.join(options.installedDir, moduleName);
      if (fs.existsSync(installedPath)) {
        fs.rmSync(installedPath, { recursive: true, force: true });
      }
    }

    return { status: 'removed', removed };
  }

  // ─── Update ───

  /**
   * Check for newer version and update module.
   * For local-only catalogs this compares against the manifest in installed dir.
   *
   * @param {string} moduleName
   * @param {object} [options]
   * @param {string} [options.catalogPath]
   * @param {string} [options.installedDir]
   * @returns {object} { status, moduleName, currentVersion, message }
   */
  update(moduleName, options = {}) {
    const catalogPath = options.catalogPath;
    if (!catalogPath) throw new Error('catalogPath is required for update.');
    const catalog = this._readCatalog(catalogPath);
    const mod = catalog.extensions.find(ext => ext.name === moduleName);
    if (!mod) throw new Error(`Module not found: ${moduleName}`);

    // Check installed version
    let currentVersion = null;
    if (options.installedDir) {
      const manifestPath = path.join(options.installedDir, moduleName, 'extension.json');
      if (fs.existsSync(manifestPath)) {
        try {
          const installed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          currentVersion = installed.version;
        } catch { /* ignore */ }
      }
    }

    const catalogVersion = mod.version;
    if (currentVersion && currentVersion === catalogVersion) {
      return { status: 'up-to-date', moduleName, currentVersion, message: 'Already at latest version.' };
    }

    // Perform update: reinstall from catalog metadata
    if (options.installedDir) {
      this.install(moduleName, options.installedDir, { catalogPath });
    }

    return {
      status: 'updated',
      moduleName,
      previousVersion: currentVersion,
      newVersion: catalogVersion,
      message: `Updated ${moduleName} from ${currentVersion || 'unknown'} to ${catalogVersion}.`,
    };
  }

  // ─── Categories ───

  /**
   * List all unique categories from catalog.
   *
   * @param {object} [options]
   * @param {string} [options.catalogPath]
   * @returns {Array<string>}
   */
  listCategories(options = {}) {
    const catalogPath = options.catalogPath;
    if (!catalogPath) return [];
    const catalog = this._readCatalog(catalogPath);
    const cats = new Set();
    for (const ext of catalog.extensions) {
      if (ext.category) cats.add(ext.category);
    }
    return [...cats].sort();
  }

  // ─── Official modules ───

  /**
   * Return built-in official modules from catalog.
   *
   * @param {object} [options]
   * @param {string} [options.catalogPath]
   * @returns {Array<object>}
   */
  getOfficialModules(options = {}) {
    const catalogPath = options.catalogPath;
    if (!catalogPath) return [];
    const catalog = this._readCatalog(catalogPath);
    return catalog.extensions.filter(ext => ext.official === true);
  }
}

module.exports = { ModuleRegistry };
