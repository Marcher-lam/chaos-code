const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const chalk = require('chalk');
const crypto = require('crypto');
const { resolveWorkspace } = require('../../utils/workspace-detector');
const { resolveWorkspaceScope, evidenceMatchesWorkspace, normalizePath } = require('../../utils/workspace-scope');
const { normalizeMutationResult } = require('../../runtime/mutation/normalizer');
const { resolveChangeDir, ensureInsideDir } = require('../../utils/change-utils');
const { walkFiles: _walkFiles } = require('../../utils/file-walker');

const TEST_FILE_PATTERNS = [
  /\.test\.(js|jsx|ts|tsx|py)$/,
  /\.spec\.(js|jsx|ts|tsx|py)$/,
  /^test_.*\.py$/,
  /_test\.py$/,
];

const SOURCE_EXTENSIONS = /\.(js|jsx|ts|tsx|py)$/;

function isTestFile(filePath) {
  const basename = path.basename(filePath);
  return TEST_FILE_PATTERNS.some(pattern => pattern.test(basename));
}

function safeReadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return null;
  }
}

function findLatestMutationEvidence(cwd, options = {}) {
  const dirs = [];
  const changeName = options.changeName || options.change || null;
  const workspaceSelector = typeof options.workspace === 'string'
    ? options.workspace
    : options.workspace && (options.workspace.path || options.workspace.name || options.workspace.root);

  if (changeName) {
    const changeDir = resolveChangeDir(path.join(cwd, 'stdd'), changeName);
    if (changeDir) dirs.push(path.join(changeDir, 'evidence'));
  }

  const changesDir = path.join(cwd, 'stdd', 'changes');
  if (fs.existsSync(changesDir)) {
    for (const entry of fs.readdirSync(changesDir, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name !== 'archive') {
        dirs.push(path.join(changesDir, entry.name, 'evidence'));
      }
    }
  }

  dirs.push(path.join(cwd, 'stdd', 'evidence'));

  const seen = new Set();
  const candidates = [];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const fileName of fs.readdirSync(dir)) {
      if (!fileName.startsWith('mutation-') || !fileName.endsWith('.json')) continue;
      const filePath = path.join(dir, fileName);
      if (seen.has(filePath)) continue;
      seen.add(filePath);
      const data = safeReadJson(filePath);
      if (!data) continue;
      if (workspaceSelector && !evidenceMatchesWorkspace(data, workspaceSelector)) continue;
      const timestamp = Number(data.unixTimestamp || data.timestamp || fs.statSync(filePath).mtimeMs);
      candidates.push({ filePath, data, timestamp });
    }
  }

  candidates.sort((a, b) => b.timestamp - a.timestamp);
  return candidates[0] || null;
}

class MutationCommand {
  constructor(cwd) {
    this.cwd = cwd || process.cwd();
  }

  execute(changeName, options = {}) {
    const mode = options.mode || 'quick';
    const threshold = Number.isFinite(Number(options.threshold)) ? Number(options.threshold) : 80;
    const workspace = this._resolveWorkspace(options.workspace);

    if (!['quick', 'stryker'].includes(mode)) {
      throw new Error(`Unsupported mutation mode '${mode}'. Use quick or stryker.`);
    }

    const result = mode === 'stryker'
      ? this._runStryker(threshold, workspace)
      : this._runQuick(threshold, workspace);

    const evidence = this._buildEvidence(result, threshold, mode, workspace, changeName);
    const evidencePath = this._saveEvidence(evidence, changeName);
    evidence.evidencePath = path.relative(this.cwd, evidencePath);

    if (options.json) {
      console.log(JSON.stringify(evidence, null, 2));
    } else {
      this._printResult(evidence);
    }

    if (evidence.status === 'fail') {
      process.exitCode = 1;
    }

    return evidence;
  }

  _resolveWorkspace(selector) {
    if (!selector) return null;
    const workspace = resolveWorkspace(this.cwd, selector);
    if (!workspace) {
      throw new Error(`Workspace '${selector}' not found.`);
    }
    return workspace;
  }

  _scanRoot(workspace) {
    return workspace ? workspace.root : this.cwd;
  }

  _runQuick(threshold, workspace) {
    const root = this._scanRoot(workspace);
    const sourceFiles = _walkFiles(root, { predicate: filePath => SOURCE_EXTENSIONS.test(filePath) && !isTestFile(filePath) });
    const testFiles = _walkFiles(root, { predicate: filePath => SOURCE_EXTENSIONS.test(filePath) && isTestFile(filePath) });

    let assertions = 0;
    let placeholders = 0;
    let emptyTests = 0;

    for (const filePath of testFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      assertions += this._countAssertions(content);
      placeholders += this._countPlaceholders(content);
      emptyTests += this._countEmptyTests(content);
    }

    placeholders += emptyTests;

    const coveredSourceFiles = sourceFiles.filter(sourceFile => this._hasNearbyTest(sourceFile, root, testFiles)).length;
    const testCoverageRatio = sourceFiles.length > 0 ? coveredSourceFiles / sourceFiles.length : (testFiles.length > 0 ? 1 : 0);
    const assertionDensity = testFiles.length > 0 ? Math.min(assertions / testFiles.length, 1) : 0;
    const placeholderRatio = (assertions + emptyTests) > 0 ? Math.min(placeholders / (assertions + emptyTests), 1) : 0;

    const rawScore = (assertionDensity * 45) + (testCoverageRatio * 35) + ((1 - placeholderRatio) * 20) - (placeholderRatio * 60);
    const score = Math.max(0, Math.min(100, Math.round(rawScore)));

    return {
      score,
      threshold,
      status: score >= threshold ? 'pass' : 'fail',
      assertions,
      placeholders,
      emptyTests,
      testFiles: testFiles.length,
      sourceFiles: sourceFiles.length,
      coveredSourceFiles,
      assertionDensity: Number(assertionDensity.toFixed(3)),
      testCoverageRatio: Number(testCoverageRatio.toFixed(3)),
      placeholderRatio: Number(placeholderRatio.toFixed(3)),
    };
  }

  _countAssertions(content) {
    const patterns = [
      /\bexpect\s*\(/g,
      /\bassert\s*\(/g,
      /\bassert\.(?:equal|strictEqual|deepStrictEqual|ok|throws|rejects|doesNotThrow)\s*\(/g,
      /\bstrictEqual\s*\(/g,
      /\bdeepStrictEqual\s*\(/g,
      /\.should\b/g,
      /\bself\.assert\w+\s*\(/g,
      /\bassert\s+(?:True|False|Equal|NotEqual|In|Raises)\s*\(/g,
      /\btoBe\s*\(/g,
      /\btoEqual\s*\(/g,
      /\btoContain\s*\(/g,
      /\btoThrow\s*\(/g,
    ];

    return patterns.reduce((count, pattern) => count + ((content.match(pattern) || []).length), 0);
  }

  _countPlaceholders(content) {
    const patterns = [
      /expect\s*\(\s*true\s*\)\s*\.\s*toBe\s*\(\s*true\s*\)/gi,
      /expect\s*\(\s*1\s*\)\s*\.\s*toBe\s*\(\s*1\s*\)/gi,
      /expect\s*\(\s*true\s*\)\s*\.\s*toEqual\s*\(\s*true\s*\)/gi,
      /assert\s*\(\s*true\s*\)/gi,
      /assert\.ok\s*\(\s*true\s*\)/gi,
      /assert\s+True\s*\(?\s*True\s*\)?/gi,
      /pass\s*(?:#.*)?$/gmi,
      /TODO:\s*assert/gi,
    ];

    return patterns.reduce((count, pattern) => count + ((content.match(pattern) || []).length), 0);
  }

  _countEmptyTests(content) {
    const patterns = [
      /\b(?:it|test)\s*\([^,]+,\s*(?:async\s*)?\(\s*\)\s*=>\s*\{\s*\}\s*\)/g,
      /\b(?:it|test)\s*\([^,]+,\s*function\s*\(\s*\)\s*\{\s*\}\s*\)/g,
      /def\s+test_\w+\s*\([^)]*\):\s*(?:pass|\.\.\.)/g,
    ];

    return patterns.reduce((count, pattern) => count + ((content.match(pattern) || []).length), 0);
  }

  _hasNearbyTest(sourceFile, root, testFiles) {
    const rel = normalizePath(path.relative(root, sourceFile));
    const ext = path.extname(rel);
    const base = rel.slice(0, -ext.length);
    const sourceBaseName = path.basename(base);
    const normalizedTests = testFiles.map(filePath => normalizePath(path.relative(root, filePath)));

    return normalizedTests.some(testRel => {
      const testExt = path.extname(testRel);
      const testBase = testRel.slice(0, -testExt.length)
        .replace(/\.test$/, '')
        .replace(/\.spec$/, '')
        .replace(/(^|\/)test_/, '$1')
        .replace(/_test$/, '');
      return testBase.endsWith(base) || path.basename(testBase) === sourceBaseName;
    });
  }

  _runStryker(threshold, workspace) {
    const root = this._scanRoot(workspace);
    if (!this._hasStryker(root)) {
      return {
        score: null,
        threshold,
        status: 'skipped',
        assertions: 0,
        placeholders: 0,
        reason: 'Stryker is not installed and no stryker.conf.* file was found.',
      };
    }

    const result = spawnSync('npx', ['stryker', 'run'], {
      cwd: root,
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf8',
    });

    const output = `${result.stdout || ''}\n${result.stderr || ''}`;
    const score = this._parseStrykerScore(root, output);
    const status = score === null ? (result.status === 0 ? 'pass' : 'fail') : (score >= threshold ? 'pass' : 'fail');

    return {
      score,
      threshold,
      status,
      assertions: 0,
      placeholders: 0,
      exitCode: result.status,
      output: output.slice(-4000),
    };
  }

  _hasStryker(root) {
    const pkg = safeReadJson(path.join(root, 'package.json')) || safeReadJson(path.join(this.cwd, 'package.json')) || {};
    const deps = { ...((pkg && pkg.dependencies) || {}), ...((pkg && pkg.devDependencies) || {}) };
    if (deps['@stryker-mutator/core']) return true;

    const configNames = ['stryker.conf.js', 'stryker.conf.cjs', 'stryker.conf.mjs', 'stryker.conf.json', 'stryker.conf.ts'];
    return configNames.some(fileName => fs.existsSync(path.join(root, fileName)) || fs.existsSync(path.join(this.cwd, fileName)));
  }

  _parseStrykerScore(root, output) {
    const reportPath = path.join(root, 'reports', 'mutation', 'mutation.json');
    const report = safeReadJson(reportPath);
    const score = report && report.thresholds && report.thresholds.high !== undefined
      ? null
      : this._extractMutationScore(report);
    if (score !== null) return score;

    const match = output.match(/(?:mutation score|score)\D+(\d+(?:\.\d+)?)%/i);
    return match ? Number(match[1]) : null;
  }

  _extractMutationScore(value) {
    if (!value || typeof value !== 'object') return null;
    for (const key of ['mutationScore', 'score', 'mutationScoreBasedOnCoveredCode']) {
      if (Number.isFinite(Number(value[key]))) return Number(value[key]);
    }
    for (const child of Object.values(value)) {
      const score = this._extractMutationScore(child);
      if (score !== null) return score;
    }
    return null;
  }

  _buildEvidence(result, threshold, mode, workspace, changeName) {
    const workspaceScope = workspace ? resolveWorkspaceScope(this.cwd, workspace) : null;
    const unixTimestamp = Date.now();
    return normalizeMutationResult(result, {
      id: crypto.createHash('sha256').update(JSON.stringify({ mode, unixTimestamp, result })).digest('hex').slice(0, 16),
      cwd: this.cwd,
      mode,
      tool: mode === 'stryker' ? 'stryker' : 'quick',
      threshold,
      unixTimestamp,
      workspace: workspaceScope,
      changeName: changeName || null,
    });
  }

  _saveEvidence(evidence, changeName) {
    const stddDir = path.join(this.cwd, 'stdd');
    const baseDir = changeName
      ? path.join(resolveChangeDir(stddDir, changeName, { mustExist: false }), 'evidence')
      : path.join(stddDir, 'evidence');
    fs.mkdirSync(baseDir, { recursive: true });
    const filePath = ensureInsideDir(baseDir, path.join(baseDir, `mutation-${evidence.unixTimestamp}.json`), 'mutation evidence path');
    fs.writeFileSync(filePath, JSON.stringify(evidence, null, 2), 'utf8');
    return filePath;
  }

  _printResult(evidence) {
    const scoreLabel = evidence.score === null ? 'n/a' : `${evidence.score}%`;
    const statusColor = evidence.status === 'pass' ? chalk.green : evidence.status === 'fail' ? chalk.red : chalk.yellow;
    console.log(chalk.bold('\nMutation Gate'));
    console.log(`  Mode:        ${evidence.mode}${evidence.mode === 'quick' ? chalk.dim(' (heuristic — not real mutation testing)') : ''}`);
    if (evidence.workspace) console.log(`  Workspace:   ${evidence.workspace.path}`);
    console.log(`  Score:       ${scoreLabel} (threshold ${evidence.threshold}%)`);
    console.log(`  Assertions:  ${evidence.assertions}`);
    console.log(`  Placeholders:${evidence.placeholders}`);
    if (evidence.results.reason) console.log(`  Reason:      ${evidence.results.reason}`);
    console.log(`  Status:      ${statusColor(evidence.status.toUpperCase())}`);
    console.log(`  Evidence:    ${evidence.evidencePath}`);
  }
}

module.exports = { MutationCommand, findLatestMutationEvidence };
