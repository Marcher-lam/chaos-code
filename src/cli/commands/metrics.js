/**
 * Metrics Command
 * Provide quality metrics report for the project or a specific change
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { spawnSync } = require('child_process');
const { ConstitutionChecker } = require('./constitution-checker');
const { detectWorkspaces, resolveWorkspace } = require('../../utils/workspace-detector');
const { workspaceToScope, normalizePath } = require('../../utils/workspace-scope');
const { parseCoverage } = require('../../utils/coverage-parser');
const { resolveChangeDir } = require('../../utils/change-utils');

const LINTER_TIMEOUT = 10000;

class MetricsCommand {
  constructor(cwd) {
    this.cwd = cwd || process.cwd();
    this.workspaces = detectWorkspaces(this.cwd);
  }

  getSourceDirs(workspace = null) {
    const dirs = [];

    if (workspace) {
      const workspaceSrcDir = path.join(workspace.root, 'src');
      const workspaceTestsDir = path.join(workspace.root, 'tests');
      if (fs.existsSync(workspaceSrcDir)) dirs.push(workspaceSrcDir);
      if (fs.existsSync(workspaceTestsDir)) dirs.push(workspaceTestsDir);
      return dirs;
    }

    const rootSrcDir = path.join(this.cwd, 'src');
    if (fs.existsSync(rootSrcDir)) dirs.push(rootSrcDir);

    for (const workspace of this.workspaces) {
      if (fs.existsSync(workspace.sourceDir)) dirs.push(workspace.sourceDir);
    }

    return dirs;
  }

  async execute(changeName, options = {}) {
    const workspace = this.resolveWorkspaceOption(options);
    const scopedOptions = { ...options, workspace };

    if (changeName) {
      return this.collectChangeMetrics(changeName, scopedOptions);
    }
    return this.collectGlobalMetrics(scopedOptions);
  }

  resolveWorkspaceOption(options = {}) {
    if (!options.workspace) return null;
    if (typeof options.workspace === 'object') return options.workspace;

    const workspace = resolveWorkspace(this.cwd, options.workspace);
    if (!workspace) {
      const errorResult = {
        status: 'error',
        error: `Workspace '${options.workspace}' not found.`,
        workspace: null,
      };

      if (options.json) {
        console.log(JSON.stringify(errorResult, null, 2));
        return errorResult;
      }

      throw new Error(errorResult.error);
    }
    return workspace;
  }

  async collectGlobalMetrics(options = {}) {
    if (options.workspace && options.workspace.status === 'error') return options.workspace;

    const workspace = options.workspace || null;
    const sourceDirs = this.getSourceDirs(workspace);
    const workspaceScope = workspace ? workspaceToScope(this.cwd, workspace) : null;
    const metrics = {
      totalFiles: 0,
      sourceFiles: 0,
      testFiles: 0,
      sourceLines: 0,
      testLines: 0,
      complexity: { functions: 0, classes: 0 },
      lintErrors: 0,
      lintWarnings: 0,
      lintStatus: 'N/A',
      constitutionHealth: 'PASS',
      coverageSource: 'none',
      coverage: null,
      workspaceCount: workspace ? 1 : this.workspaces.length,
      workspaces: workspace ? [workspaceScope] : this.workspaces.map(workspace => ({
        name: workspace.name,
        root: normalizePath(path.relative(this.cwd, workspace.root)),
        sourceDir: normalizePath(path.relative(this.cwd, workspace.sourceDir)),
        packageJsonPath: normalizePath(path.relative(this.cwd, workspace.packageJsonPath)),
      }))
    };

    if (workspaceScope) metrics.workspace = workspaceScope;

    if (sourceDirs.length === 0) {
      metrics.message = 'No src/ directory found';
      this.output(metrics, options);
      return metrics;
    }

    const { sourceFiles, testFiles } = this.categorizeDirs(sourceDirs);
    metrics.totalFiles = sourceFiles.length + testFiles.length;
    metrics.sourceFiles = sourceFiles.length;
    metrics.testFiles = testFiles.length;

    metrics.sourceLines = this.countLines(sourceFiles);
    metrics.testLines = this.countLines(testFiles);
    Object.assign(metrics, this.collectCoverageMetrics(workspace, metrics.sourceLines, metrics.testLines));

    metrics.complexity = this.estimateComplexity(sourceFiles);

    const cyclomaticMetrics = this.calculateCyclomaticComplexity(sourceFiles);
    metrics.averageComplexity = cyclomaticMetrics.average;
    metrics.topComplexFiles = cyclomaticMetrics.topFiles;

    const lintResult = this.runLintCheck(workspace);
    metrics.lintErrors = lintResult.errors;
    metrics.lintWarnings = lintResult.warnings;
    metrics.lintStatus = lintResult.status;

    const constitutionResult = this.runConstitutionCheck(workspace);
    metrics.constitutionHealth = constitutionResult.health;
    metrics.constitutionIssues = constitutionResult.issues;

    this.output(metrics, options);
    return metrics;
  }

  async collectChangeMetrics(changeName, options = {}) {
    if (options.workspace && options.workspace.status === 'error') return options.workspace;

    const changeDir = resolveChangeDir(path.join(this.cwd, 'stdd'), changeName);

    if (!changeDir || !fs.existsSync(changeDir)) {
      throw new Error(`Change '${changeName}' not found`);
    }

    const workspace = options.workspace || null;
    const workspaceScope = workspace ? workspaceToScope(this.cwd, workspace) : null;
    const metrics = {
      change: changeName,
      specCoverage: { specs: 0, tasks: 0, coverage: 0 },
      sourceFiles: 0,
      testFiles: 0,
      sourceLines: 0,
      testLines: 0,
      constitutionHealth: 'PASS'
    };

    if (workspaceScope) metrics.workspace = workspaceScope;

    // Spec coverage: count .md files in specs/
    const specsDir = path.join(changeDir, 'specs');
    if (fs.existsSync(specsDir)) {
      const specFiles = this.findFiles(specsDir, /\.md$/);
      metrics.specCoverage.specs = specFiles.length;
    }

    // Tasks coverage: count tasks in tasks.md
    const tasksPath = path.join(changeDir, 'tasks.md');
    if (fs.existsSync(tasksPath)) {
      const content = fs.readFileSync(tasksPath, 'utf-8');
      const totalTasks = (content.match(/\[[ x]\]/gi) || []).length;
      metrics.specCoverage.tasks = totalTasks;
    }

    if (metrics.specCoverage.tasks > 0) {
      metrics.specCoverage.coverage = Math.round(
        (metrics.specCoverage.specs / metrics.specCoverage.tasks) * 100
      );
    }

    // Find related source and test files in src/
    const sourceDirs = this.getSourceDirs(workspace);
    if (sourceDirs.length > 0) {
      const { sourceFiles, testFiles } = this.categorizeDirs(sourceDirs);
      metrics.sourceFiles = sourceFiles.length;
      metrics.testFiles = testFiles.length;
      metrics.sourceLines = this.countLines(sourceFiles);
      metrics.testLines = this.countLines(testFiles);
    }

    const constitutionResult = this.runConstitutionCheck(workspace);
    metrics.constitutionHealth = constitutionResult.health;

    this.output(metrics, options);
    return metrics;
  }

  categorizeFiles(dir) {
    const sourceFiles = [];
    const testFiles = [];
    this.walkDir(dir, (filePath) => {
      const ext = path.extname(filePath);
      if (!['.js', '.ts'].includes(ext)) return;
      const basename = path.basename(filePath);
      if (basename.includes('.test.') || basename.includes('.spec.')) {
        testFiles.push(filePath);
      } else {
        sourceFiles.push(filePath);
      }
    });
    return { sourceFiles, testFiles };
  }

  categorizeDirs(dirs) {
    const allSourceFiles = [];
    const allTestFiles = [];
    for (const dir of dirs) {
      const { sourceFiles, testFiles } = this.categorizeFiles(dir);
      allSourceFiles.push(...sourceFiles);
      allTestFiles.push(...testFiles);
    }
    return { sourceFiles: allSourceFiles, testFiles: allTestFiles };
  }

  walkDir(dir, callback) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
          this.walkDir(fullPath, callback);
        }
      } else if (entry.isFile()) {
        callback(fullPath);
      }
    }
  }

  findFiles(dir, pattern) {
    const files = [];
    this.walkDir(dir, (filePath) => {
      if (pattern.test(filePath)) {
        files.push(filePath);
      }
    });
    return files;
  }

  countLines(files) {
    let total = 0;
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        total += content.split('\n').length;
      } catch (_) {
        // ignore read errors
      }
    }
    return total;
  }

  estimateComplexity(sourceFiles) {
    let functions = 0;
    let classes = 0;
    const functionPatterns = [
      /function\s+\w+/g,
      /\w+\s*=\s*(?:async\s+)?function/g,
      /\w+\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g,
      /const\s+\w+\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g,
      /^\s*(?:async\s+)?\w+\s*\([^)]*\)\s*\{/gm,
    ];
    const classPattern = /class\s+\w+/g;

    for (const file of sourceFiles) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        for (const pattern of functionPatterns) {
          const matches = content.match(pattern);
          if (matches) functions += matches.length;
        }
        const classMatches = content.match(classPattern);
        if (classMatches) classes += classMatches.length;
      } catch (_) {
        // ignore read errors
      }
    }

    return { functions, classes };
  }

  calculateCyclomaticComplexity(sourceFiles) {
    const branchPatterns = [
      /\bif\b/g,
      /\bfor\b/g,
      /\bwhile\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /&&/g,
      /\|\|/g,
      /\?(?!\?|\.)/g,
    ];

    const fileComplexities = [];

    for (const file of sourceFiles) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        let branchCount = 0;
        for (const pattern of branchPatterns) {
          const matches = content.match(pattern);
          if (matches) {
            branchCount += matches.length;
          }
        }
        const complexity = 1 + branchCount;
        fileComplexities.push({
          file,
          complexity,
        });
      } catch (_) {
      }
    }

    const total = fileComplexities.reduce((sum, f) => sum + f.complexity, 0);
    const average = fileComplexities.length > 0 ? Math.round((total / fileComplexities.length) * 100) / 100 : 0;

    const sorted = [...fileComplexities].sort((a, b) => b.complexity - a.complexity);
    const topFiles = sorted.slice(0, 3).map((f) => ({
          file: normalizePath(path.relative(this.cwd, f.file)),
          complexity: f.complexity,
        }));

    return { average, topFiles };
  }

  runLintCheck(workspace = null) {
    const result = { errors: 0, warnings: 0, status: 'N/A' };
    const lintCwd = workspace ? workspace.root : this.cwd;
    const pkgPath = path.join(lintCwd, 'package.json');
    if (!fs.existsSync(pkgPath)) return result;

    let pkg;
    try {
      pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    } catch (_) {
      return result;
    }

    const devDeps = { ...((pkg && pkg.devDependencies) || {}), ...((pkg && pkg.dependencies) || {}) };
    if (!devDeps.eslint && !devDeps.prettier) return result;

    let lintCmd;
    let lintArgs;
    if (devDeps.eslint) {
      lintCmd = 'npx';
      lintArgs = ['eslint', '--ext', '.js,.ts', 'src/', '--no-error-on-unmatched-pattern', '--format', 'json'];
    } else {
      lintCmd = 'npx';
      lintArgs = ['prettier', '--check', 'src/'];
    }

    try {
      const execResult = spawnSync(lintCmd, lintArgs, {
        shell: true,
        timeout: LINTER_TIMEOUT,
        stdio: ['pipe', 'pipe', 'pipe'],
        encoding: 'utf-8',
          cwd: lintCwd
      });

      if (execResult.error) {
        result.status = 'N/A';
        return result;
      }

      if (execResult.status === 0) {
        result.status = 'PASS';
        return result;
      }

      const stdout = execResult.stdout || '';
      const stderr = execResult.stderr || '';

      try {
        if (devDeps.eslint) {
          const jsonStr = stdout.trim() || stderr.trim();
          const results = JSON.parse(jsonStr);
          if (Array.isArray(results)) {
            for (const r of results) {
              result.errors += (r.errorCount || 0);
              result.warnings += (r.warningCount || 0);
            }
          }
        } else {
          const lines = (stdout + stderr).split('\n');
          result.warnings = lines.filter(l => l.trim()).length;
        }
      } catch (_) {
        const combined = stdout + stderr;
        const errorMatches = combined.match(/error/gi) || [];
        const warningMatches = combined.match(/warning/gi) || [];
        result.errors = errorMatches.length;
        result.warnings = warningMatches.length;
      }

      result.status = result.errors > 0 ? 'FAIL' : 'WARN';
    } catch (_) {
      result.status = 'N/A';
    }

    return result;
  }

  runConstitutionCheck(workspace = null) {
    try {
      const checker = new ConstitutionChecker(this.cwd, workspace ? { workspace } : {});
      const issues = checker.run();
      const isPass = issues.blocking.length === 0;
      return {
        health: isPass ? 'PASS' : 'FAIL',
        issues
      };
    } catch (_) {
      return { health: 'N/A', issues: null };
    }
  }

  collectCoverageMetrics(workspace, sourceLines, testLines) {
    const coverage = parseCoverage(workspace ? workspace.root : this.cwd);
    if (coverage.found && coverage.lines && coverage.lines.pct !== null) {
      return {
        coverageSource: 'report',
        coverage,
        coveragePercent: coverage.lines.pct,
      };
    }

    if (sourceLines > 0 || testLines > 0) {
      const coveragePercent = sourceLines > 0 ? Math.round((testLines / sourceLines) * 1000) / 10 : 0;
      return {
        coverageSource: 'estimate',
        coverage: {
          found: false,
          type: 'test-source-line-ratio',
          lines: { covered: testLines, total: sourceLines, pct: coveragePercent },
          summary: `estimated from test/source line ratio: ${coveragePercent}%`,
        },
        coveragePercent,
      };
    }

    return { coverageSource: 'none', coverage: null, coveragePercent: null };
  }

  filterIssuesByWorkspace(issues, workspace) {
    const filter = (items) => (items || []).filter((issue) => this.issueBelongsToWorkspace(issue, workspace));
    return {
      blocking: filter(issues.blocking),
      warning: filter(issues.warning),
      skipped: filter(issues.skipped),
    };
  }

  issueBelongsToWorkspace(issue, workspace) {
    const relRoot = normalizePath(path.relative(this.cwd, workspace.root));
    const absRoot = normalizePath(workspace.root);
    const candidates = [issue.file, issue.path, issue.filepath, issue.filePath, issue.message]
      .filter(Boolean)
      .map(normalizePath);

    return candidates.some(value => value === relRoot || value.startsWith(relRoot + '/') || value.startsWith(absRoot + '/'));
  }

  output(metrics, options = {}) {
    if (options.json) {
      console.log(JSON.stringify(metrics, null, 2));
      return;
    }

    if (metrics.change) {
      this.printChangeMetrics(metrics);
    } else {
      this.printGlobalMetrics(metrics);
    }
  }

  printGlobalMetrics(metrics) {
    console.log(chalk.bold('\n📊 STDD Metrics Report\n'));

    if (metrics.workspace) {
      console.log(chalk.dim(`Workspace: ${metrics.workspace.name} (${metrics.workspace.path})`));
      console.log('');
    }

    console.log(chalk.cyan('  Overview:'));
    console.log(`    Total Files:  ${chalk.white(metrics.totalFiles)}`);
    console.log(`    Source Files: ${chalk.white(metrics.sourceFiles)}`);
    console.log(`    Test Files:   ${chalk.white(metrics.testFiles)}`);

    console.log(chalk.cyan('\n  Lines of Code:'));
    console.log(`    Source Lines: ${chalk.white(metrics.sourceLines)}`);
    console.log(`    Test Lines:   ${chalk.white(metrics.testLines)}`);
    const testRatio = metrics.sourceLines > 0
      ? ((metrics.testLines / metrics.sourceLines) * 100).toFixed(1)
      : '0.0';
    console.log(`    Test Ratio:   ${chalk.white(testRatio)}%`);

    if (metrics.coverageSource !== 'none') {
      console.log(chalk.cyan('\n  Coverage:'));
      console.log(`    Source:       ${chalk.white(metrics.coverageSource)}`);
      console.log(`    Lines:        ${chalk.white(metrics.coveragePercent)}%`);
    }

    console.log(chalk.cyan('\n  Complexity:'));
    console.log(`    Functions:    ${chalk.white(metrics.complexity.functions)}`);
    console.log(`    Classes:      ${chalk.white(metrics.complexity.classes)}`);
    console.log(`    Avg Cyclomatic: ${chalk.white(metrics.averageComplexity)}`);

    if (metrics.topComplexFiles && metrics.topComplexFiles.length > 0) {
      console.log('');
      console.log(chalk.cyan('  Top Complex Files:'));
      for (const f of metrics.topComplexFiles) {
        const relPath = f.file;
        const color = f.complexity > 15 ? chalk.red : f.complexity > 5 ? chalk.yellow : chalk.white;
        console.log(`    ${color(String(f.complexity).padStart(3))}  ${relPath}`);
      }

      if (metrics.averageComplexity > 5 || (metrics.topComplexFiles[0] && metrics.topComplexFiles[0].complexity > 15)) {
        console.log(chalk.yellow('\n  ⚠ High Complexity Risk'));
      }
    }

    console.log(chalk.cyan('\n  Constitution Health:'));
    const healthColor = metrics.constitutionHealth === 'PASS' ? chalk.green : chalk.red;
    console.log(`    Status:       ${healthColor(metrics.constitutionHealth)}`);

    console.log(chalk.cyan('\n  Lint Status:'));
    let lintColor = chalk.white;
    if (metrics.lintStatus === 'PASS') lintColor = chalk.green;
    else if (metrics.lintStatus === 'FAIL') lintColor = chalk.red;
    else if (metrics.lintStatus === 'WARN') lintColor = chalk.yellow;
    console.log(`    Status:       ${lintColor(metrics.lintStatus)}`);
    if (metrics.lintErrors > 0 || metrics.lintWarnings > 0) {
      console.log(`    Errors:       ${chalk.red(metrics.lintErrors)}`);
      console.log(`    Warnings:     ${chalk.yellow(metrics.lintWarnings)}`);
    }

    if (metrics.message) {
      console.log(chalk.yellow(`\n  Note: ${metrics.message}`));
    }

    if (metrics.workspaceCount > 0) {
      console.log(chalk.cyan('\n  Workspaces:'));
      console.log(`    Count:        ${chalk.white(metrics.workspaceCount)}`);
    }

    console.log('');
  }

  printChangeMetrics(metrics) {
    console.log(chalk.bold(`\n📊 Metrics for Change: ${metrics.change}\n`));

    if (metrics.workspace) {
      console.log(chalk.dim(`Workspace: ${metrics.workspace.name} (${metrics.workspace.path})`));
      console.log('');
    }

    console.log(chalk.cyan('  Spec Coverage:'));
    console.log(`    Specs:        ${chalk.white(metrics.specCoverage.specs)}`);
    console.log(`    Tasks:        ${chalk.white(metrics.specCoverage.tasks)}`);
    console.log(`    Coverage:     ${chalk.white(metrics.specCoverage.coverage)}%`);

    console.log(chalk.cyan('\n  Source & Test:'));
    console.log(`    Source Files: ${chalk.white(metrics.sourceFiles)}`);
    console.log(`    Test Files:   ${chalk.white(metrics.testFiles)}`);
    console.log(`    Source Lines: ${chalk.white(metrics.sourceLines)}`);
    console.log(`    Test Lines:   ${chalk.white(metrics.testLines)}`);

    console.log(chalk.cyan('\n  Constitution Health:'));
    const healthColor = metrics.constitutionHealth === 'PASS' ? chalk.green : chalk.red;
    console.log(`    Status:       ${healthColor(metrics.constitutionHealth)}`);

    console.log('');
  }
}

module.exports = { MetricsCommand };
