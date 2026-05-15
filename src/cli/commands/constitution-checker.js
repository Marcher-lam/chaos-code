const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { spawnSync, execSync } = require('child_process');
const { detectWorkspaces } = require('../../utils/workspace-detector');
const { parseCoverage } = require('../../utils/coverage-parser');
const { findLatestMutationEvidence } = require('./mutation');
const { SchemaCommand } = require('./schema');
const { isSafeListed } = require('./depcheck');

const LINTER_TIMEOUT = 10000;
const LIBRARY_FIRST_DIRS = ['utils', 'helpers', 'lib'];
const WHEEL_REINVENTION_LINE_THRESHOLD = 200;

const LIBRARY_HEURISTICS = [
  { patterns: [/date/i, /time/i], libraries: ['date-fns', 'dayjs'] },
  { patterns: [/http/i, /fetch/i, /request/i, /api/i, /client/i], libraries: ['axios', 'node-fetch'] },
  { patterns: [/string/i, /str/i, /text/i], libraries: ['lodash'] },
  { patterns: [/deep/i, /merge/i, /clone/i, /copy/i], libraries: ['lodash', 'ramda'] },
];

class ConstitutionChecker {
  constructor(cwd, options = {}) {
    this.cwd = cwd || process.cwd();
    this.options = options;
    this.issues = { blocking: [], warning: [], info: [], skipped: [] };
    this.waivers = new Set();
    this.workspaces = detectWorkspaces(this.cwd);
  }

  loadConfig() {
    const configPath = path.join(this.cwd, 'stdd', 'config.yaml');
    if (!fs.existsSync(configPath)) return {};
    try {
      return yaml.load(fs.readFileSync(configPath, 'utf8')) || {};
    } catch (_) {
      return {};
    }
  }

  getSourceDirs() {
    const dirs = [];
    if (this.options.workspace) {
      if (fs.existsSync(this.options.workspace.sourceDir)) dirs.push(this.options.workspace.sourceDir);
      return dirs;
    }

    const rootSrcDir = path.join(this.cwd, 'src');
    if (fs.existsSync(rootSrcDir)) dirs.push(rootSrcDir);

    for (const workspace of this.workspaces) {
      if (fs.existsSync(workspace.sourceDir)) dirs.push(workspace.sourceDir);
    }

    return dirs;
  }

  getPackageJsonPaths() {
    const paths = [];
    if (this.options.workspace) {
      if (fs.existsSync(this.options.workspace.packageJsonPath)) paths.push(this.options.workspace.packageJsonPath);
      return paths;
    }

    const rootPackageJson = path.join(this.cwd, 'package.json');
    if (fs.existsSync(rootPackageJson)) paths.push(rootPackageJson);

    for (const workspace of this.workspaces) {
      if (fs.existsSync(workspace.packageJsonPath)) paths.push(workspace.packageJsonPath);
    }

    return paths;
  }

  getAllSourceFiles() {
    return this.getSourceDirs().flatMap(srcDir => this.findSourceFiles(srcDir));
  }

  loadWaivers() {
    const waiversPath = path.join(this.cwd, 'stdd', 'constitution', 'waivers.yaml');
    if (!fs.existsSync(waiversPath)) return;
    try {
      const content = fs.readFileSync(waiversPath, 'utf8');
      const data = yaml.load(content);
      if (!data || !Array.isArray(data.waivers)) return;
      const now = Date.now();
      for (const w of data.waivers) {
        const articleNum = Number(w.article);
        if (Number.isNaN(articleNum)) continue;

        let isValid = false;

        if (w.valid_until) {
          const expiry = new Date(w.valid_until).getTime();
          if (!Number.isNaN(expiry)) {
            isValid = now <= expiry;
          }
        } else if (w.days) {
          const grantedAt = w.granted_at ? new Date(w.granted_at).getTime() : now;
          const expiry = grantedAt + w.days * 24 * 60 * 60 * 1000;
          isValid = now <= expiry;
        } else {
          isValid = true;
        }

        if (isValid) {
          this.waivers.add(articleNum);
        }
      }
    } catch (_) {
      // ignore parse errors
    }
  }

  isWaived(articleNumber) {
    return this.waivers.has(articleNumber);
  }

  isTestFile(filePath) {
    const basename = path.basename(filePath);
    return basename.includes('.test.') || basename.includes('.spec.') || basename.startsWith('test_');
  }

  findSourceFiles(dir) {
    const files = [];
    if (!fs.existsSync(dir)) return files;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== '__tests__' && entry.name !== 'node_modules') {
        files.push(...this.findSourceFiles(fullPath));
      } else if (entry.isFile()) {
        if (/\.(js|jsx|ts|tsx|py)$/.test(entry.name) && !this.isTestFile(entry.name)) {
          files.push(fullPath);
        }
      }
    }
    return files;
  }

  findTestFileForSource(sourceFile, srcDir) {
    const relPath = path.relative(srcDir, sourceFile);
    const ext = path.extname(relPath);
    const baseName = path.basename(relPath, ext);
    const dirName = path.dirname(relPath);

    const candidates = [
      path.join(srcDir, dirName, '__tests__', `${baseName}.test${ext}`),
      path.join(srcDir, dirName, `${baseName}.test${ext}`),
      path.join(srcDir, dirName, `${baseName}.spec${ext}`),
      // Also check for js test when source is ts and vice versa
      path.join(srcDir, dirName, '__tests__', `${baseName}.test.js`),
      path.join(srcDir, dirName, '__tests__', `${baseName}.test.ts`),
      path.join(srcDir, dirName, `${baseName}.test.js`),
      path.join(srcDir, dirName, `${baseName}.test.ts`),
    ];

    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return null;
  }

  getInstalledDependencies() {
    const deps = new Set();
    for (const pkgPath of this.getPackageJsonPaths()) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const packageDeps = { ...((pkg && pkg.dependencies) || {}), ...((pkg && pkg.devDependencies) || {}) };
        Object.keys(packageDeps).forEach(dep => deps.add(dep));
      } catch (_) {
        // ignore invalid package.json files
      }
    }
    return deps;
  }

  suggestLibraryForFile(fileName, installedDeps) {
    const basename = path.basename(fileName, path.extname(fileName));
    for (const heuristic of LIBRARY_HEURISTICS) {
      const matchesPattern = heuristic.patterns.some(pat => pat.test(basename));
      if (!matchesPattern) continue;
      const hasAny = heuristic.libraries.some(lib => installedDeps.has(lib));
      if (hasAny) return null;
      return heuristic.libraries[0];
    }
    return null;
  }

  checkArticle1LibraryFirst() {
    if (this.isWaived(1)) {
      this.issues.skipped.push({ article: 1, name: 'Library-First', reason: 'Waived' });
      return;
    }

    this.checkArticle1UnusedDependencies();

    const installedDeps = this.getInstalledDependencies();

    for (const srcDir of this.getSourceDirs()) {
      for (const dirName of LIBRARY_FIRST_DIRS) {
        const targetDir = path.join(srcDir, dirName);
        if (!fs.existsSync(targetDir)) continue;

        const entries = fs.readdirSync(targetDir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isFile()) continue;
          if (!/\.(js|jsx|ts|tsx|py)$/.test(entry.name)) continue;
          if (entry.name === 'index.js' || entry.name === 'index.ts' || entry.name === 'index.tsx') continue;
          if (this.isTestFile(entry.name)) continue;

          const fullPath = path.join(targetDir, entry.name);
          const relPath = path.relative(this.cwd, fullPath);

          const suggestedLib = this.suggestLibraryForFile(entry.name, installedDeps);
          if (suggestedLib) {
            this.issues.warning.push({
              article: 1,
              name: 'Library-First',
              message: `Potential wheel reinvention in ${relPath}. Consider using ${suggestedLib}.`
            });
          }

          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const actualLineCount = content
              .split('\n')
              .filter(line => {
                const trimmed = line.trim();
                if (trimmed === '') return false;
                if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return false;
                return true;
              }).length;

            if (actualLineCount > WHEEL_REINVENTION_LINE_THRESHOLD) {
              this.issues.warning.push({
                article: 1,
                name: 'Library-First',
                message: `Potential wheel reinvention detected: ${relPath} has ~${actualLineCount} lines of code. Consider using a mature library (e.g., lodash, date-fns, axios) instead.`
              });
            }
          } catch (_) {
            // ignore read errors
          }
        }
      }
    }
  }

  checkArticle1UnusedDependencies() {
    const pkgPaths = this.getPackageJsonPaths();
    if (pkgPaths.length === 0) return;

    const targetPkg = this.options.workspace
      ? this.options.workspace.packageJsonPath
      : pkgPaths[0];

    if (!fs.existsSync(targetPkg)) return;

    try {
      const pkg = JSON.parse(fs.readFileSync(targetPkg, 'utf8'));
      const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      const depNames = Object.keys(allDeps);
      if (depNames.length === 0) return;

      const usedDeps = this._findUsedDepsInSource();
      const depModuleNames = this._buildDepModuleMap(targetPkg);

      const accountedDeps = new Set();
      for (const usedName of usedDeps) {
        const pkgName = depModuleNames.get(usedName);
        if (pkgName) accountedDeps.add(pkgName);
        accountedDeps.add(usedName);
      }

      const unused = [];
      for (const depName of depNames) {
        if (accountedDeps.has(depName)) continue;
        if (isSafeListed(depName)) continue;
        unused.push(depName);
      }

      if (unused.length > 0) {
        this.issues.warning.push({
          article: 1,
          name: 'Library-First',
          message: `Unused dependencies detected: ${unused.join(', ')}. Consider removing unused deps to reduce bundle size and maintenance overhead.`
        });
      }
    } catch (_) {
      // ignore parse errors
    }
  }

  _buildDepModuleMap(pkgJsonPath) {
    try {
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      const allDeps = {
        ...((pkgJson && pkgJson.dependencies) || {}),
        ...((pkgJson && pkgJson.devDependencies) || {}),
      };
      return new Map(Object.keys(allDeps).map(name => [name, name]));
    } catch (_) {
      return new Map();
    }
  }

  _findUsedDepsInSource() {
    const usedPackages = new Set();
    const srcDir = this.options.workspace
      ? this.options.workspace.sourceDir
      : path.join(this.cwd, 'src');

    if (fs.existsSync(srcDir)) {
      this._scanDirForConstImports(srcDir, usedPackages);
    }

    return [...usedPackages];
  }

  _scanDirForConstImports(dir, usedPackages) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
          this._scanDirForConstImports(fullPath, usedPackages);
        }
      } else if (entry.isFile() && /\.(js|jsx|ts|tsx|mjs|cjs)$/.test(entry.name)) {
        this._extractDepImports(fullPath, usedPackages);
      }
    }
  }

  _extractDepImports(filePath, usedPackages) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const importPatterns = [
        /(?:import\s+(?:(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s*,?\s*)*from\s+)?['"]([^'"]+)['"])/g,
        /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      ];

      for (const pattern of importPatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const mod = match[1];
          if (!mod.startsWith('.') && !mod.startsWith('/')) {
            const pkgName = mod.startsWith('@')
              ? mod.split('/').slice(0, 2).join('/')
              : mod.split('/')[0];
            usedPackages.add(pkgName);
          }
        }
      }
    } catch {
      // ignore read errors
    }
  }

  checkArticle2TDD() {
    if (this.isWaived(2)) {
      this.issues.skipped.push({ article: 2, name: 'TDD', reason: 'Waived' });
      return;
    }

    const sourceDirs = this.getSourceDirs();
    if (sourceDirs.length === 0) {
      this.issues.skipped.push({ article: 2, name: 'TDD', reason: 'No src/ directory found' });
      return;
    }

    const sourceFiles = sourceDirs.flatMap(srcDir => this.findSourceFiles(srcDir).map(file => ({ file, srcDir })));
    if (sourceFiles.length === 0) {
      this.issues.skipped.push({ article: 2, name: 'TDD', reason: 'No source files in src/' });
      return;
    }

    // Check 1: Every source file must have a corresponding test file
    for (const { file: sf, srcDir } of sourceFiles) {
      const testFile = this.findTestFileForSource(sf, srcDir);
      if (!testFile) {
        const relPath = path.relative(this.cwd, sf);
        this.issues.blocking.push({
          article: 2,
          name: 'TDD',
          message: `Missing test file for: ${relPath}`
        });
      }
    }

    // Check 2: Verify test execution status (not just file existence)
    this.checkArticle2TestExecution();

    // Check 3: Verify TDD phase compliance
    this.checkArticle2PhaseCompliance();

    // Check 4: Coverage gate
    this.checkArticle2CoverageGate();

    // Check 5: Mutation gate
    this.checkArticle2MutationGate();
  }

  checkArticle2TestExecution() {
    // Check if there's a test command configured
    const config = this.loadConfig();
    const testCommand = (config && config.test && config.test.command) || null;

    if (!testCommand) {
      // Check package.json for test script
      const pkgPath = path.join(this.cwd, 'package.json');
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          if (!pkg.scripts || !pkg.scripts.test) {
            this.issues.warning.push({
              article: 2,
              name: 'TDD',
              message: 'No test command configured in stdd/config.yaml or package.json',
            });
          }
        } catch {
          // ignore
        }
      }
    }

    // Check for common anti-patterns in test files
    const sourceDirs = this.getSourceDirs();
    for (const srcDir of sourceDirs) {
      const testFiles = this._findTestFiles(srcDir);
      for (const testFile of testFiles) {
        this._checkTestFileAntiPatterns(testFile);
      }
    }
  }

  checkArticle2PhaseCompliance() {
    // Check active changes for TDD phase compliance
    const stddDir = path.join(this.cwd, 'stdd');
    if (!fs.existsSync(stddDir)) return;

    const changesDir = path.join(stddDir, 'changes');
    if (!fs.existsSync(changesDir)) return;

    const entries = fs.readdirSync(changesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === 'archive') continue;

      const changeDir = path.join(changesDir, entry.name);
      const tasksPath = path.join(changeDir, 'tasks.md');

      if (!fs.existsSync(tasksPath)) continue;

      const tasksContent = fs.readFileSync(tasksPath, 'utf8');
      const lines = tasksContent.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.match(/-\s*\[/)) continue;

        // Check if task has phase marker
        const hasPhase = /\[phase:(\w+)\]/.test(line);
        const isPending = /\[ \]/.test(line);

        if (isPending && !hasPhase) {
          this.issues.warning.push({
            article: 2,
            name: 'TDD',
            message: `Task without phase marker in ${entry.name}/tasks.md:${i + 1} (should have [phase:red|green|refactor])`,
          });
        }
      }
    }
  }

  _findTestFiles(srcDir) {
    const testFiles = [];
    if (!fs.existsSync(srcDir)) return testFiles;

    const walkDir = (dir) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
            walkDir(fullPath);
          }
        } else if (entry.isFile()) {
          if (/\.(test|spec)\.(js|jsx|ts|tsx)$/.test(entry.name) ||
              /^test_\w+\.py$/.test(entry.name)) {
            testFiles.push(fullPath);
          }
        }
      }
    };

    walkDir(srcDir);
    return testFiles;
  }

  _checkTestFileAntiPatterns(testFile) {
    try {
      const content = fs.readFileSync(testFile, 'utf8');
      const relPath = path.relative(this.cwd, testFile);

      // Pattern 1: Skipped tests (describe.skip, it.skip, test.skip, xdescribe, xit, xtest)
      const skipPattern = /(?:describe|it|test)\.skip|x(?:describe|it|test)/g;
      const skipMatches = content.match(skipPattern);
      if (skipMatches && skipMatches.length > 0) {
        this.issues.warning.push({
          article: 2,
          name: 'TDD',
          message: `Skipped test found: ${relPath} (${skipMatches.length} skipped)`,
          file: relPath,
        });
      }

      // Pattern 2: Empty test blocks - only flag if file has NO assertions at all
      const hasAnyAssertion = /(?:expect|assert|should|toBe|toEqual|toBeTruthy|toBeFalsy|toContain|toMatch|toThrow)/.test(content);
      const hasEmptyDescribe = /describe\s*\([^)]*\)\s*(?:=>\s*)?\{[\s\n]*\}/g.test(content);
      
      if (hasEmptyDescribe && !hasAnyAssertion) {
        this.issues.warning.push({
          article: 2,
          name: 'TDD',
          message: `Test file with no assertions: ${relPath}`,
          file: relPath,
        });
      }
    } catch {
      // ignore read errors
    }
  }

  checkArticle2MutationGate() {
    const config = this.loadConfig();
    const mutationConfig = (((config.tdd || {}).mutation) || {});
    const threshold = Number.isFinite(Number(mutationConfig.threshold)) ? Number(mutationConfig.threshold) : 80;
    const evidence = findLatestMutationEvidence(this.cwd, {
      workspace: this.options.workspace || null,
    });

    if (!evidence) {
      this.issues.skipped.push({
        article: 2,
        name: 'TDD',
        reason: 'Mutation evidence not found (run `stdd mutation` to enable mutation gate)'
      });
      return;
    }

    const score = Number(evidence.data.mutationScore !== undefined ? evidence.data.mutationScore : evidence.data.score);
    const evidenceThreshold = Number.isFinite(Number(evidence.data.threshold)) ? Number(evidence.data.threshold) : threshold;
    const effectiveThreshold = Number.isFinite(Number(mutationConfig.threshold)) ? threshold : evidenceThreshold;
    if (!Number.isFinite(score)) {
      this.issues.info.push({
        article: 2,
        name: 'TDD',
        message: `Mutation evidence skipped: ${path.relative(this.cwd, evidence.filePath)}`,
        file: path.relative(this.cwd, evidence.filePath),
      });
      return;
    }

    if (score < effectiveThreshold) {
      const targetBucket = mutationConfig.blocking === true ? this.issues.blocking : this.issues.warning;
      targetBucket.push({
        article: 2,
        name: 'TDD',
        message: `Mutation score below threshold: ${score}% < ${effectiveThreshold}% (${path.relative(this.cwd, evidence.filePath)}).`,
        file: path.relative(this.cwd, evidence.filePath),
        mutation: {
          score,
          threshold: effectiveThreshold,
          mode: evidence.data.mode,
          status: evidence.data.status,
        },
      });
    }
  }

  checkArticle2CoverageGate() {
    const config = this.loadConfig();
    const coverageConfig = (((config.tdd || {}).coverage) || {});
    const threshold = Number.isFinite(Number(coverageConfig.threshold)) ? Number(coverageConfig.threshold) : 80;
    const targetBucket = coverageConfig.blocking === true ? this.issues.blocking : this.issues.warning;
    const roots = this.options.workspace
      ? [this.options.workspace]
      : [{ name: 'root', root: this.cwd }].concat(this.workspaces);

    for (const scope of roots) {
      const coverage = parseCoverage(scope.root);
      if (!coverage.found || !coverage.lines || coverage.lines.pct === null) continue;
      if (coverage.lines.pct < threshold) {
        const relFile = path.relative(this.cwd, coverage.file) || coverage.file;
        const scopeName = scope.root === this.cwd ? 'root' : (scope.name || path.basename(scope.root));
        targetBucket.push({
          article: 2,
          name: 'TDD',
          message: `Coverage below threshold for ${scopeName}: lines ${coverage.lines.pct}% < ${threshold}% (${relFile}).`,
          file: relFile,
          coverage,
        });
      }
    }
  }

  _scanDependencyVulnerabilities() {
    const pkgPath = path.join(this.cwd, 'package.json');
    const reqPath = path.join(this.cwd, 'requirements.txt');

    if (fs.existsSync(pkgPath)) {
      this._runNpmAudit();
    } else if (fs.existsSync(reqPath)) {
      this._runPipAudit();
    }
  }

  _runNpmAudit() {
    try {
      const result = execSync('npm audit --json', {
        cwd: this.cwd,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 30000,
      });
      const audit = JSON.parse(result);
      const metadata = audit.metadata || {};
      const vulnerabilities = metadata.vulnerabilities || {};

      const criticalCount = (vulnerabilities.critical || 0);
      const highCount = (vulnerabilities.high || 0);
      const moderateCount = (vulnerabilities.moderate || 0);
      const totalCount = criticalCount + highCount + moderateCount;

      if (totalCount === 0) return;

      if (criticalCount > 0) {
        this.issues.blocking.push({
          article: 7,
          name: 'Security',
          message: `Found ${criticalCount} critical security vulnerabilities in dependencies. Run \`npm audit fix\`.`
        });
      }

      if (highCount > 0 || moderateCount > 0) {
        const parts = [];
        if (highCount > 0) parts.push(`${highCount} high`);
        if (moderateCount > 0) parts.push(`${moderateCount} moderate`);
        this.issues.warning.push({
          article: 7,
          name: 'Security',
          message: `Found ${parts.join(', ')} security vulnerabilities in dependencies. Consider running \`npm audit fix\`.`
        });
      }
    } catch (err) {
      // npm audit may fail due to network issues, no dependencies, or npm not installed
      // Log as debug but do not block the check
    }
  }

  _runPipAudit() {
    try {
      const result = execSync('pip audit --json', {
        cwd: this.cwd,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 30000,
      });
      const audit = JSON.parse(result);
      const vulns = audit.vulns || [];

      if (vulns.length === 0) return;

      this.issues.warning.push({
        article: 7,
        name: 'Security',
        message: `Found ${vulns.length} known security vulnerabilities in Python dependencies. Consider running \`pip-audit\` or updating requirements.`
      });
    } catch (err) {
      this.issues.warning.push({
        article: 7,
        name: 'Security',
        message: 'Python dependency audit skipped (pip-audit not available).'
      });
    }
  }

  _checkDependencyLock() {
    const pkgJsonExists = this.getPackageJsonPaths().length > 0;
    const pyprojectExists = fs.existsSync(path.join(this.cwd, 'pyproject.toml'));

    if (!pkgJsonExists && !pyprojectExists) return;

    const jsLockfiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
    const pyLockfiles = ['poetry.lock', 'Pipfile.lock'];
    const allLockfiles = jsLockfiles.concat(pyLockfiles);

    let hasAnyLockfile = allLockfiles.some(f => fs.existsSync(path.join(this.cwd, f)));

    if (!hasAnyLockfile) {
      this.issues.warning.push({
        article: 7,
        name: 'Security',
        message: 'Missing dependency lockfile. Commit your lockfile to ensure reproducible builds.'
      });
    }
  }

  _checkHttpSecurity(content, relPath) {
    const httpPat = /https?:\/\/[^\s"'`<>)]+/gi;
    const whitelist = [
      /^http:\/\/localhost/i,
      /^http:\/\/127\.0\.0\.1/i,
      /^http:\/\/0\.0\.0\.0/i,
      /^http:\/\/example\.com/i,
    ];

    const matches = content.match(httpPat);
    if (!matches) return;

    const lines = content.split('\n');

    for (const match of matches) {
      if (/^https:\/\//i.test(match)) continue;

      const isWhitelisted = whitelist.some(pat => pat.test(match));
      if (isWhitelisted) continue;

      let lineNum = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(match)) {
          lineNum = i + 1;
          break;
        }
      }
      if (lineNum === -1) continue;

      this.issues.warning.push({
        article: 7,
        name: 'Security',
        message: `Insecure HTTP endpoint detected in ${relPath}:${lineNum}. Consider using HTTPS to prevent MITM attacks.`
      });
    }
  }

  _checkSqlNoSqlInjection(content, relPath) {
    const sqlInjectionPatterns = [
      /`[^`]*(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|DROP|ALTER|CREATE|UNION)[^`]*\$\{[^}]+\}[^`]*`/gi,
      /['"][^'"]*(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|DROP|ALTER|CREATE|UNION)[^'"]*['"]\s*\+\s*/gi,
      /\+\s*['"][^'"]*(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|DROP|ALTER|CREATE|UNION)[^'"]*['"]/gi,
    ];

    for (const pattern of sqlInjectionPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        const lineNum = this._getLineNumber(content, content.indexOf(matches[0]));
        this.issues.blocking.push({
          article: 7,
          name: 'Security',
          message: `Potential SQL/NoSQL Injection detected in ${relPath}:${lineNum}. Use parameterized queries instead of string interpolation.`
        });
        return true;
      }
    }

    const nosqlPat = /\.find\s*\(\s*[^)]*\+/g;
    const nosqlMatches = content.match(nosqlPat);
    if (nosqlMatches) {
      const lineNum = this._getLineNumber(content, content.indexOf(nosqlMatches[0]));
      this.issues.blocking.push({
        article: 7,
        name: 'Security',
        message: `Potential NoSQL Injection detected in ${relPath}:${lineNum}. Use parameterized queries instead of string concatenation.`
      });
      return true;
    }

    return false;
  }

  _getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

   checkArticle7Security() {
    if (this.isWaived(7)) {
      this.issues.skipped.push({ article: 7, name: 'Security', reason: 'Waived' });
      return;
    }

    this._checkDependencyLock();

    const patterns = [
      /password\s*=\s*['"][^"']+['"]/gi,
      /apiKey\s*=\s*['"][^"']+['"]/gi,
      /secret\s*=\s*['"][^"']+['"]/gi,
    ];

    // P0-2 Fix: Skip directories that should never be scanned to prevent performance bomb
    const SKIP_DIRS = new Set([
      'node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.nuxt',
      '.cache', 'out', 'vendor', 'target', 'bin', 'obj', '.parcel-cache',
    ]);

    const scanDir = (dir) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          // Skip known heavy directories to prevent performance bomb
          if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) {
            continue;
          }
          scanDir(fullPath);
        } else if (entry.isFile() && /\.(js|ts|py|rb|yaml|yml|json|env|cfg|ini|conf)$/.test(entry.name)) {
          // Skip lock files and generated files
          const skipFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'Cargo.lock', 'Gemfile.lock'];
          if (skipFiles.includes(entry.name)) continue;

          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            for (const pattern of patterns) {
              const matches = content.match(pattern);
              if (matches) {
                const relPath = path.relative(this.cwd, fullPath);
                this.issues.blocking.push({
                  article: 7,
                  name: 'Security',
                  message: `Hardcoded secret in ${relPath}: ${matches[0].trim()}`
                });
              }
            }
            if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
              const relPath = path.relative(this.cwd, fullPath);
              this._checkHttpSecurity(content, relPath);
              this._checkSqlNoSqlInjection(content, relPath);
            }
          } catch (_) {
            // ignore read errors
          }
        }
      }
    };

    scanDir(this.cwd);
    this._scanDependencyVulnerabilities();
  }

  detectSourceLanguage(srcDir) {
    const sourceFiles = this.findSourceFiles(srcDir);
    const langs = new Set();
    for (const f of sourceFiles) {
      const ext = path.extname(f);
      if (ext === '.js' || ext === '.ts') langs.add('js');
      else if (ext === '.py') langs.add('py');
      else if (ext === '.rb') langs.add('rb');
    }
    return langs;
  }

  detectLinter(srcDir) {
    const langs = this.detectSourceLanguage(srcDir);
    if (langs.size === 0) return null;

    if (langs.has('js')) {
      const pkgPath = path.join(this.cwd, 'package.json');
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          const devDeps = { ...((pkg && pkg.devDependencies) || {}), ...((pkg && pkg.dependencies) || {}) };
          if (devDeps.eslint) {
            return { type: 'eslint', cmd: 'npx', args: ['eslint', '--ext', '.js,.ts', 'src/'] };
          }
          if (devDeps.prettier) {
            return { type: 'prettier', cmd: 'npx', args: ['prettier', '--check', 'src/'] };
          }
          if (devDeps.tslint) {
            return { type: 'tslint', cmd: 'npx', args: ['tslint', '-p', 'tsconfig.json', 'src/**/*.ts'] };
          }
        } catch (_) {
        }
      }
    }

    if (langs.has('py')) {
      if (this.spawnExists('pylint')) {
        return { type: 'pylint', cmd: 'pylint', args: ['--errors-only', 'src/'] };
      }
      if (this.spawnExists('flake8')) {
        return { type: 'flake8', cmd: 'flake8', args: ['src/'] };
      }
    }

    if (langs.has('rb')) {
      if (this.spawnExists('rubocop')) {
        return { type: 'rubocop', cmd: 'rubocop', args: ['--only', 'Syntax', 'src/'] };
      }
    }

    return null;
  }

  spawnExists(command) {
    const result = spawnSync(command, ['--version'], { timeout: LINTER_TIMEOUT, stdio: 'pipe' });
    return !result.error && result.status === 0;
  }

  runLinter(linter) {
    return spawnSync(linter.cmd, linter.args, {
      timeout: LINTER_TIMEOUT,
      stdio: 'pipe',
      encoding: 'utf-8',
      cwd: this.cwd
    });
  }

  fallbackLineCheck(srcDir) {
    const sourceFiles = this.findSourceFiles(srcDir);
    for (const sf of sourceFiles) {
      try {
        const content = fs.readFileSync(sf, 'utf8');
        const lineCount = content.split('\n').length;
        if (lineCount > 500) {
          const relPath = path.relative(this.cwd, sf);
          this.issues.warning.push({
            article: 4,
            name: 'Style',
            message: `File too long (${lineCount} lines): ${relPath}`
          });
        }
      } catch (_) {
        // ignore read errors
      }
    }
  }

  checkArticle4Style() {
    if (this.isWaived(4)) {
      this.issues.skipped.push({ article: 4, name: 'Style', reason: 'Waived' });
      return;
    }

    const sourceDirs = this.getSourceDirs();
    if (sourceDirs.length === 0) return;

    const linter = this.detectLinter(sourceDirs[0]);
    if (linter) {
      const result = this.runLinter(linter);
      if (result.error) {
        sourceDirs.forEach(srcDir => this.fallbackLineCheck(srcDir));
        return;
      }
      if (result.status !== 0) {
        const stderr = (result.stderr || '').trim() || (result.stdout || '').trim();
        const lines = stderr.split('\n').filter(l => l.trim()).slice(0, 3);
        this.issues.blocking.push({
          article: 4,
          name: 'Style',
          message: `Lint errors (${linter.type}): ${lines.join(' | ')}`
        });
      }
    } else {
      sourceDirs.forEach(srcDir => this.fallbackLineCheck(srcDir));
    }
  }

  _checkProductionLogging(content, relPath) {
    const lines = content.split('\n');
    const consolePat = /console\.(log|info|warn|error)\s*\(/g;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^\s*\/\//.test(line)) continue;

      let match;
      consolePat.lastIndex = 0;
      while ((match = consolePat.exec(line)) !== null) {
        const method = match[1];
        const lineNum = i + 1;
        this.issues.warning.push({
          article: 6,
          name: 'Error Handling',
          message: `Found console usage in ${relPath}:${lineNum} (console.${method}). Use a logger (e.g. winston/pino) instead.`
        });
      }
    }
  }

  checkArticle6ErrorHandling() {
    if (this.isWaived(6)) {
      this.issues.skipped.push({ article: 6, name: 'Error Handling', reason: 'Waived' });
      return;
    }

    const sourceFiles = this.getAllSourceFiles();
    for (const sf of sourceFiles) {
      try {
        const content = fs.readFileSync(sf, 'utf8');
        const relPath = path.relative(this.cwd, sf);
        const ext = path.extname(sf);

        if (ext === '.js' || ext === '.ts') {
          this._checkProductionLogging(content, relPath);

          const catchWordPat = /catch\s*\([^)]*\)/g;
          let cMatch;
          while ((cMatch = catchWordPat.exec(content)) !== null) {
            const catchEnd = cMatch.index + cMatch[0].length;
            const afterCatch = content.substring(catchEnd);
            const firstBrace = afterCatch.indexOf('{');
            if (firstBrace === -1) continue;
            const openBracePos = catchEnd + firstBrace;
            let braceCount = 0;
            let closePos = -1;
            for (let k = openBracePos; k < content.length; k++) {
              if (content[k] === '{') braceCount++;
              if (content[k] === '}') braceCount--;
              if (braceCount === 0) { closePos = k; break; }
            }
            if (closePos === -1) continue;
            const inner = content.substring(openBracePos + 1, closePos);
            const hasOnlyComments = inner.replace(/\/\/.*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim().length === 0;
            const catchLine = content.substring(0, cMatch.index).split('\n').length;
            if (hasOnlyComments) {
              if (inner.trim().length === 0) {
                this.issues.warning.push({
                  article: 6,
                  name: 'Error Handling',
                  message: `Detected empty catch block in ${relPath}:${catchLine}. Add logging or error handling.`
                });
              } else {
                this.issues.warning.push({
                  article: 6,
                  name: 'Error Handling',
                  message: `Detected empty catch block (comments only) in ${relPath}:${catchLine}. Add logging or error handling.`
                });
              }
            }
          }
        }

        if (ext === '.py') {
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (/except.*:\s*$/.test(lines[i])) {
              let j = i + 1;
              while (j < lines.length && (lines[j].trim() === '' || lines[j].trim().startsWith('#'))) {
                j++;
              }
              if (j < lines.length && /^\s*pass\s*$/.test(lines[j])) {
                const nextLine = j + 1 < lines.length ? lines[j + 1].trim() : '';
                if (!nextLine.startsWith('#')) {
                  this.issues.warning.push({
                    article: 6,
                    name: 'Error Handling',
                    message: `Detected empty except block (pass without comment) in ${relPath}:${i + 1}. Add logging or error handling.`
                  });
                }
              }
            }
          }
        }
      } catch (_) {
        // ignore read errors
      }
    }
  }

  checkArticle8Performance() {
    if (this.isWaived(8)) {
      this.issues.skipped.push({ article: 8, name: 'Performance', reason: 'Waived' });
      return;
    }

    const sourceFiles = this.getAllSourceFiles().filter(f => /\.(js|jsx|ts|tsx)$/.test(f));
    for (const sf of sourceFiles) {
      try {
        const content = fs.readFileSync(sf, 'utf8');
        const relPath = path.relative(this.cwd, sf);

        // 1a. useEffect without dependency array
        const useEffectPat = /useEffect\s*\(\s*\(?[^)]*\)?\s*=>\s*\{[^}]*\}\s*\)/g;
        let ueMatch;
        while ((ueMatch = useEffectPat.exec(content)) !== null) {
          const match = ueMatch[0];
          if (!/\)\s*\)/.test(match) && !/\)\s*,\s*\[/.test(match) && !/\)\s*\]\s*\)/.test(match)) {
            const lineNum = content.substring(0, ueMatch.index).split('\n').length;
            this.issues.warning.push({
              article: 8,
              name: 'Performance',
              message: `Detected potential performance issue: useEffect missing dependency array in ${relPath}:${lineNum}. This may cause infinite re-renders.`
            });
          }
        }

        // 1b. key={index} in list rendering
        const keyIndexPat = /key\s*=\s*\{\s*index\s*\}/g;
        let kiMatch;
        while ((kiMatch = keyIndexPat.exec(content)) !== null) {
          const lineNum = content.substring(0, kiMatch.index).split('\n').length;
          this.issues.warning.push({
            article: 8,
            name: 'Performance',
            message: `Detected potential performance issue: Using index as key in ${relPath}:${lineNum}. Prefer stable unique keys.`
          });
        }

        // 2a. Nested loops detection using brace tracking
        const lines = content.split('\n');
        let nestingDepth = 0;
        let loopStack = [];
        let reportedNestedAt = new Set();
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const loopStarts = [...line.matchAll(/(?<!\w)(?:for\s*\(|forEach\s*\()/g)];
          for (let __j = 0; __j < loopStarts.length; __j++) {
            nestingDepth++;
            loopStack.push(i + 1);
          }
          if (nestingDepth >= 2) {
            const key = `${relPath}:${loopStack[loopStack.length - 1]}`;
            if (!reportedNestedAt.has(key)) {
              reportedNestedAt.add(key);
              this.issues.warning.push({
                article: 8,
                name: 'Performance',
                message: `Detected potential performance issue: Nested loop at ${relPath}:${loopStack[loopStack.length - 1]} (depth: ${nestingDepth}). Consider optimizing with Map/Set or early exit.`
              });
            }
          }
          const strippedLine = line.replace(/\/\/.*/, '').trim();
          if ((strippedLine === '}' || strippedLine.endsWith('});')) && nestingDepth > 0) {
            if (loopStarts.length === 0) {
              nestingDepth--;
              loopStack.pop();
            }
          }
        }

        // 2b. while loops without break or yield
        const whilePat = /while\s*\([^)]*\)\s*\{/g;
        let wMatch;
        while ((wMatch = whilePat.exec(content)) !== null) {
          const whileStart = wMatch.index;
          let braceCount = 0;
          let whileEnd = -1;
          for (let k = whileStart; k < content.length; k++) {
            if (content[k] === '{') braceCount++;
            if (content[k] === '}') braceCount--;
            if (braceCount === 0) { whileEnd = k; break; }
          }
          if (whileEnd === -1) continue;
          const whileBody = content.substring(whileStart, whileEnd + 1);
          if (!/\bbreak\b/.test(whileBody) && !/\byield\b/.test(whileBody) && !/\bawait\b/.test(whileBody)) {
            // Check for common termination patterns
            const hasIterationVarChange = /\b\w+\+\+|\b\w+\-\-/.test(whileBody);
            if (!hasIterationVarChange) {
              const lineNum = content.substring(0, whileStart).split('\n').length;
              this.issues.warning.push({
                article: 8,
                name: 'Performance',
                message: `Detected potential performance issue: while loop without break/yield/await in ${relPath}:${lineNum}. May block the event loop.`
              });
            }
          }
        }

        // 3. Sync blocking calls in non-initialization code
        const syncFsPat = /fs\.readFileSync|fs\.writeFileSync|fs\.appendFileSync|fs\.renameSync|fs\.unlinkSync|fs\.statSync|fs\.existsSync|fs\.mkdirSync/g;
        let sfMatch;
        while ((sfMatch = syncFsPat.exec(content)) !== null) {
          const match = sfMatch[0];
          const lineNum = content.substring(0, sfMatch.index).split('\n').length;
          this.issues.warning.push({
            article: 8,
            name: 'Performance',
            message: `Detected potential performance issue: Synchronous fs call (${match}) in ${relPath}:${lineNum}. Use async alternatives to avoid blocking the event loop.`
          });
        }

        // 4. N+1 query pattern: DB calls inside loops
        this._checkNPlusOneQuery(content, relPath);
      } catch (_) {
        // ignore read errors
      }
    }
  }

  _checkNPlusOneQuery(content, relPath) {
    const lines = content.split('\n');
    const blockLoopPat = /\b(?:for\s*\(|forEach\s*\(|while\s*\().*\{/;
    const arrowLoopPat = /(?:\.map|\.filter|\.reduce|\.some|\.every)\s*\(\s*\([^)]*\)\s*=>\s*\{/;
    const dbCallPat = /(?:prisma\.\w+\.|Model\.|db\.|\w+Model\.)?(?:find|findOne|findById|findUnique|findMany|findAndCountAll|query|save|saveBatch|create|update|delete|deleteMany|remove|removeMany|insert|insertMany|aggregate)\w*\s*\(/i;
    const reported = new Set();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isBlockLoop = blockLoopPat.test(line) || arrowLoopPat.test(line);
      if (!isBlockLoop) continue;

      const hasSameLineDbCall = dbCallPat.test(line);
      if (hasSameLineDbCall && !reported.has(i)) {
        reported.add(i);
        const fullMatch = line.match(/[\w.]+(?:find|findOne|findById|findUnique|findMany|findAndCountAll|query|save|saveBatch|create|update|delete|deleteMany|remove|removeMany|insert|insertMany|aggregate)\w*\s*\(/i);
        const dbCallName = fullMatch ? fullMatch[0] : 'db operation';
        this.issues.warning.push({
          article: 8,
          name: 'Performance',
          message: `Potential N+1 query issue in ${relPath}:${i + 1}. Database call (${dbCallName}) inside a loop. Consider batching or using IN queries.`
        });
        continue;
      }

      let braceDepth = 0;
      for (let j = i; j < lines.length; j++) {
        const innerLine = lines[j];
        const braceOpens = (innerLine.match(/\{/g) || []).length;
        const braceCloses = (innerLine.match(/\}/g) || []).length;
        braceDepth += braceOpens - braceCloses;

        if (dbCallPat.test(innerLine) && j !== i) {
          if (!reported.has(j)) {
            reported.add(j);
            const fullMatch = innerLine.match(/[\w.]+(?:find|findOne|findById|findUnique|findMany|findAndCountAll|query|save|saveBatch|create|update|delete|deleteMany|remove|removeMany|insert|insertMany|aggregate)\w*\s*\(/i);
            const dbCallName = fullMatch ? fullMatch[0] : 'db operation';
            this.issues.warning.push({
              article: 8,
              name: 'Performance',
              message: `Potential N+1 query issue in ${relPath}:${j + 1}. Database call (${dbCallName}) inside a loop. Consider batching or using IN queries.`
            });
          }
        }

        if (braceDepth <= 0 && j > i) break;
        if (j - i > 30) break;
      }
    }
  }

  checkArticle9CICD() {
    if (this.isWaived(9)) {
      this.issues.skipped.push({ article: 9, name: 'CI/CD', reason: 'Waived' });
      return;
    }

    const ciConfigs = [
      { name: 'GitHub Actions', path: '.github/workflows', isDir: true },
      { name: 'CircleCI', path: '.circleci/config.yml', isDir: false },
      { name: 'GitLab CI', path: '.gitlab-ci.yml', isDir: false },
      { name: 'Jenkins', path: 'Jenkinsfile', isDir: false },
    ];

    let foundCI = false;
    let foundCITypes = [];
    for (const ci of ciConfigs) {
      const fullPath = path.join(this.cwd, ci.path);
      const exists = fs.existsSync(fullPath);
      if (exists) {
        foundCI = true;
        foundCITypes.push(ci.name);
      }
    }

    if (!foundCI) {
      const pkgPath = path.join(this.cwd, 'package.json');
      let hasTestScript = false;
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          const scripts = (pkg && pkg.scripts) || {};
          if (scripts.test) {
            hasTestScript = true;
          }
        } catch (_) {
          // ignore parse errors
        }
      }

      this.issues.blocking.push({
        article: 9,
        name: 'CI/CD',
        message: 'Missing CI Configuration. No CI config found (GitHub Actions, CircleCI, GitLab CI, or Jenkins).'
      });

      if (hasTestScript) {
        this.issues.warning.push({
          article: 9,
          name: 'CI/CD',
          message: 'Node project has test script but no CI configuration. Consider adding .github/workflows/ for automated testing.'
        });
      }
    }

    this.checkArticle9SchemaValidity();
  }

  checkArticle9SchemaValidity() {
    const schemaCmd = new SchemaCommand(this.cwd);
    const schemasDir = [
      path.join(this.cwd, 'schemas'),
      path.join(this.cwd, 'src', 'schemas'),
    ].find(dir => fs.existsSync(dir));

    if (!schemasDir) return;

    const result = schemaCmd.validate(null, { strict: false });

    if (result.status === 'fail' && result.errors && result.errors.length > 0) {
      for (const err of result.errors) {
        const loc = err.line ? `:${err.line}` : '';
        this.issues.blocking.push({
          article: 9,
          name: 'CI/CD',
          message: `Schema Validity Error: ${err.file}${loc} - ${err.error}`
        });
      }
    }
  }

  _checkStagedChanges() {
    let numstatOutput;
    try {
      numstatOutput = execSync('git diff --staged --numstat', {
        cwd: this.cwd,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (_) {
      return;
    }

    if (!numstatOutput || !numstatOutput.trim()) return;

    const lines = numstatOutput.trim().split('\n').filter(l => l.trim());
    let totalChanges = 0;

    for (const line of lines) {
      const parts = line.split('\t');
      if (parts.length < 2) continue;
      const insertions = parts[0];
      const deletions = parts[1];
      if (insertions === '-' || deletions === '-') continue;
      totalChanges += Number(insertions) + Number(deletions);
    }

    if (totalChanges > 500) {
      this.issues.warning.push({
        article: 3,
        name: 'Commits',
        message: 'Staged changes are too large (>500 lines). Consider splitting into smaller commits.'
      });
    }
  }

  checkArticle3Commits() {
    if (this.isWaived(3)) {
      this.issues.skipped.push({ article: 3, name: 'Commits', reason: 'Waived' });
      return;
    }

    this._checkStagedChanges();

    let gitLog;
    try {
      gitLog = execSync('git log --oneline -5', { cwd: this.cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (_) {
      this.issues.skipped.push({ article: 3, name: 'Commits', reason: 'Not a git repository or no commits' });
      return;
    }

    const lines = gitLog.trim().split('\n').filter(l => l.trim());
    if (lines.length === 0) {
      this.issues.skipped.push({ article: 3, name: 'Commits', reason: 'No commits found' });
      return;
    }

    const conventionalCommitPat = /^[a-z]+(\([^)]*\))?:\s/;

    for (const line of lines) {
      const hashEnd = line.indexOf(' ');
      if (hashEnd === -1) continue;
      const subject = line.substring(hashEnd + 1).trim();

      if (!conventionalCommitPat.test(subject)) {
        this.issues.warning.push({
          article: 3,
          name: 'Commits',
          message: `Commit message does not follow Conventional Commits spec: "${subject}"`
        });
      }

      if (subject.length > 72) {
        this.issues.warning.push({
          article: 3,
          name: 'Commits',
          message: `Commit subject line too long (${subject.length} chars): "${subject.substring(0, 50)}..."`
        });
      }
    }
  }

  _hasJsdocBeforeLine(lines, lineIndex) {
    let i = lineIndex - 1;
    while (i >= 0 && lines[i].trim() === '') {
      i--;
    }
    if (i < 0) return false;
    if (lines[i].trim().endsWith('*/')) {
      let j = i;
      while (j >= 0) {
        if (lines[j].includes('*/') && j !== i) break;
        if (lines[j].includes('/**')) return true;
        j--;
      }
      if (lines[i].trim().startsWith('/**')) return true;
    }
    return false;
  }

  _isSimpleExport(line) {
    const simplePat = /^export\s+(const|let|var)\s+\w+\s*=\s*['"`\d\[\{]?(true|false|null|\d+)/i;
    return simplePat.test(line.trim());
  }

  _isPublicExport(line) {
    const exportPats = [
      /^export\s+(async\s+)?function\b/i,
      /^export\s+class\b/i,
      /^export\s+(const|let|var)\s+\w+\s*=\s*(async\s+)?\(/i,
      /^export\s+(const|let|var)\s+\w+\s*=\s*function/i,
      /^export\s+(const|let|var)\s+\w+\s*=\s*\[/i,
      /^export\s+(const|let|var)\s+\w+\s*=\s*\{/i,
      /^export\s+default\s+(function|class)/i,
      /^export\s+default\s+\w+/i,
    ];
    for (const pat of exportPats) {
      if (pat.test(line.trim())) return true;
    }
    return false;
  }

  _extractExportName(line) {
    const fnMatch = line.match(/^export\s+(async\s+)?function\s+(\w+)/i);
    if (fnMatch) return fnMatch[2];
    const classMatch = line.match(/^export\s+class\s+(\w+)/i);
    if (classMatch) return classMatch[1];
    const constMatch = line.match(/^export\s+(const|let|var)\s+(\w+)/i);
    if (constMatch) return constMatch[2];
    const defaultMatch = line.match(/^export\s+default\s+(?:function|class)\s+(\w+)/i);
    if (defaultMatch) return defaultMatch[1];
    const defaultVarMatch = line.match(/^export\s+default\s+(\w+)/i);
    if (defaultVarMatch) return defaultVarMatch[1];
    return 'unknown';
  }

  checkArticle5Documentation() {
    if (this.isWaived(5)) {
      this.issues.skipped.push({ article: 5, name: 'Documentation', reason: 'Waived' });
      return;
    }

    const sourceFiles = this.getAllSourceFiles().filter(f => /\.(js|ts)$/.test(f));
    if (sourceFiles.length === 0) return;

    let fileWithNoJsdoc = 0;

    for (const sf of sourceFiles) {
      try {
        const content = fs.readFileSync(sf, 'utf8');
        const relPath = path.relative(this.cwd, sf);
        const lines = content.split('\n');
        let fileHasAnyJsdoc = false;
        let exportCount = 0;

        for (let i = 0; i < lines.length; i++) {
          if (!this._isPublicExport(lines[i])) continue;
          if (this._isSimpleExport(lines[i])) continue;

          exportCount++;
          const name = this._extractExportName(lines[i]);

          if (this._hasJsdocBeforeLine(lines, i)) {
            fileHasAnyJsdoc = true;
          } else {
            this.issues.warning.push({
              article: 5,
              name: 'Documentation',
              message: `Missing JSDoc for public API "${name}" in ${relPath}:${i + 1}`
            });
          }
        }

        if (exportCount > 0 && !fileHasAnyJsdoc) {
          fileWithNoJsdoc++;
        }
      } catch (_) {
      }
    }

    if (fileWithNoJsdoc > 0 && sourceFiles.length > 0) {
      this.issues.info.push({
        article: 5,
        name: 'Documentation',
        message: `${fileWithNoJsdoc} file(s) in src/ have exported symbols with no JSDoc at all. Consider adding project-level documentation.`
      });
    }
  }

  run() {
    this.loadWaivers();
    this.checkArticle1LibraryFirst();
    this.checkArticle3Commits();
    this.checkArticle2TDD();
    this.checkArticle7Security();
    this.checkArticle4Style();
    this.checkArticle5Documentation();
    this.checkArticle6ErrorHandling();
    this.checkArticle8Performance();
    this.checkArticle9CICD();
    return this.issues;
  }
}

module.exports = { ConstitutionChecker };
