const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { TddInitCommand } = require('./tdd-init');
const { detectWorkspaces, resolveWorkspace } = require('../../utils/workspace-detector');
const { workspaceToScope } = require('../../utils/workspace-scope');
const LINT_TIMEOUT = 10000;

class ConstitutionFixCommand {
  constructor(spinner) {
    this.spinner = spinner;
  }

  async execute(cwd, options = {}) {
    const article = options.article ? Number(options.article) : null;
    const dryRun = options.dryRun || false;
    const workspace = options.workspace ? resolveWorkspace(cwd, options.workspace) : null;

    if (options.workspace && !workspace) {
      throw new Error(`Workspace '${options.workspace}' not found.`);
    }

    const workspaceScope = workspace ? workspaceToScope(cwd, workspace) : null;

    const fixes = [];

    if (!article || article === 2) {
      fixes.push({ article: 2, name: 'TDD - Missing Tests', fn: () => this._fixArticle2(cwd, dryRun, workspace) });
    }
    if (!article || article === 4) {
      fixes.push({ article: 4, name: 'Code Style - Lint Auto-Fix', fn: () => this._fixArticle4(cwd, dryRun, workspace) });
    }
    if (!article || article === 5) {
      fixes.push({ article: 5, name: 'Documentation - Missing JSDoc', fn: () => this._fixArticle5(cwd, dryRun, workspace) });
    }
    if (!article || article === 1) {
      fixes.push({ article: 1, name: 'Library-First - Suggestions', fn: () => this._fixArticle1(cwd, dryRun) });
    }

    const results = [];
    for (const fix of fixes) {
      const result = await fix.fn();
      results.push({ article: fix.article, name: fix.name, workspace: workspaceScope, ...result });
    }

    return results;
  }

  async _fixArticle2(cwd, dryRun, workspace = null) {
    const silentSpinner = {
      text: '',
      start() {},
      stop() {},
      succeed() {},
      fail() {}
    };
    const tddCmd = new TddInitCommand(silentSpinner);
    if (workspace) {
      const sourceDir = path.relative(cwd, workspace.sourceDir);
      if (dryRun) {
        console.log(`\nWorkspace: ${workspace.name} (${path.relative(cwd, workspace.root) || '.'})`);
      }
      return tddCmd.execute(cwd, { dryRun, sourceDir });
    }

    return tddCmd.execute(cwd, { dryRun });
  }

  _findSourceFiles(dir) {
    const files = [];
    if (!fs.existsSync(dir)) return files;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== '__tests__' && entry.name !== 'node_modules') {
        files.push(...this._findSourceFiles(fullPath));
      } else if (entry.isFile() && /\.(js|ts)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
    return files;
  }

  _getSourceDirs(cwd, workspace = null) {
    if (workspace) {
      return fs.existsSync(workspace.sourceDir) ? [path.resolve(workspace.sourceDir)] : [];
    }

    const dirs = [];
    const rootSrc = path.join(cwd, 'src');
    if (fs.existsSync(rootSrc)) dirs.push(rootSrc);

    for (const workspace of detectWorkspaces(cwd)) {
      if (fs.existsSync(workspace.sourceDir)) dirs.push(workspace.sourceDir);
    }

    return [...new Set(dirs.map(dir => path.resolve(dir)))];
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

  _isSimpleExport(line) {
    const simplePat = /^export\s+(const|let|var)\s+\w+\s*=\s*['"`\d\[\{]?(true|false|null|\d+)/i;
    return simplePat.test(line.trim());
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

  _extractParams(line) {
    const fnMatch = line.match(/(?:export\s+(?:async\s+)?function\s+\w+\s*\(|export\s+(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?function\s*\(|export\s+(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?\()([^)]*)/i);
    if (fnMatch) {
      const paramStr = fnMatch[1].trim();
      if (paramStr === '') return [];
      return paramStr.split(',').map(p => {
        const cleaned = p.trim();
        const nameMatch = cleaned.match(/^(?:async\s+)?(\w+)/);
        return nameMatch ? nameMatch[1] : cleaned.split(/[=:]/)[0].trim() || 'param';
      });
    }

    const arrowMatch = line.match(/(?:export\s+(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?)\(([^)]*)\)/i);
    if (arrowMatch) {
      const paramStr = arrowMatch[1].trim();
      if (paramStr === '') return [];
      return paramStr.split(',').map(p => {
        const cleaned = p.trim();
        const nameMatch = cleaned.match(/^(\w+)/);
        return nameMatch ? nameMatch[1] : cleaned.split(/[=:]/)[0].trim() || 'param';
      });
    }

    return [];
  }

  _buildJsdoc(name, params) {
    let jsdoc = '/**\n';
    jsdoc += ` * [Description needed]\n`;
    if (name) {
      jsdoc += ` * @name ${name}\n`;
    }
    for (const param of params) {
      jsdoc += ` * @param {*} ${param}\n`;
    }
    jsdoc += ` * @returns {*}\n`;
    jsdoc += ' */';
    return jsdoc;
  }

  async _fixArticle5(cwd, dryRun, workspace = null) {
    const sourceDirs = this._getSourceDirs(cwd, workspace);
    if (sourceDirs.length === 0) {
      return { fixed: [], dryRun };
    }

    const sourceFiles = sourceDirs.flatMap(srcDir => this._findSourceFiles(srcDir));
    const modified = [];

    for (const sf of sourceFiles) {
      try {
        const content = fs.readFileSync(sf, 'utf8');
        const lines = content.split('\n');
        let fileModified = false;
        const newLines = [];

        for (let i = 0; i < lines.length; i++) {
          if (!this._isPublicExport(lines[i])) {
            newLines.push(lines[i]);
            continue;
          }
          if (this._isSimpleExport(lines[i])) {
            newLines.push(lines[i]);
            continue;
          }

          if (this._hasJsdocBeforeLine(lines, i)) {
            newLines.push(lines[i]);
            continue;
          }

          const name = this._extractExportName(lines[i]);
          const params = this._extractParams(lines[i]);
          const jsdoc = this._buildJsdoc(name, params);

          if (dryRun) {
            const relPath = path.relative(cwd, sf);
            modified.push(relPath);
            fileModified = true;
            newLines.push(lines[i]);
          } else {
            newLines.push(jsdoc);
            newLines.push(lines[i]);
            fileModified = true;
          }
        }

        if (fileModified && !dryRun) {
          const newContent = newLines.join('\n');
          fs.writeFileSync(sf, newContent, 'utf8');
          modified.push(path.relative(cwd, sf));
        }
      } catch (_) {
      }
    }

    if (dryRun && modified.length > 0) {
      if (workspace) {
        console.log(`\nWorkspace: ${workspace.name} (${path.relative(cwd, workspace.root) || '.'})`);
      }
      console.log('\nDry run - the following files would be modified:\n');
      const unique = [...new Set(modified)];
      unique.forEach(f => console.log(`  ${f}`));
      console.log(`\nTotal: ${unique.length} file(s)`);
    }

    return { fixed: [...new Set(modified)], dryRun };
  }

  async _fixArticle1(cwd, dryRun) {
    const checkerModule = require('./constitution-checker');
    const { ConstitutionChecker } = checkerModule;
    const checker = new ConstitutionChecker(cwd);
    checker.loadWaivers();
    checker.checkArticle1LibraryFirst();

    const warnings = checker.issues.warning.filter(i => i.article === 1);

    if (warnings.length > 0) {
      if (dryRun) {
        console.log('\nDry run - Article 1 (Library-First) suggestions:\n');
      } else {
        console.log('\nArticle 1 (Library-First) suggestions:\n');
      }
      for (const w of warnings) {
        console.log(`  ${w.message}`);
      }
      console.log('');
    }

    return { suggestions: warnings.length, dryRun };
  }

  _detectLinter(cwd) {
    let linter = null;

    if (fs.existsSync(path.join(cwd, 'package.json'))) {
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
        const deps = {
          ...((pkg.dependencies) || {}),
          ...((pkg.devDependencies) || {})
        };

        if (deps.eslint) {
          linter = { name: 'eslint', command: 'npx eslint "src/**/*.{js,jsx,ts,tsx}" --fix' };
        } else if (deps.prettier) {
          linter = { name: 'prettier', command: 'npx prettier --write "src/**/*.{js,jsx,ts,tsx,json,css,scss,md}"' };
        } else if (deps.standard) {
          linter = { name: 'standard', command: 'npx standard --fix' };
        }
      } catch (_) {
      }
    }

    if (!linter) {
      if (fs.existsSync(path.join(cwd, '.eslintrc.js')) || fs.existsSync(path.join(cwd, '.eslintrc.json')) || fs.existsSync(path.join(cwd, '.eslintrc')) || fs.existsSync(path.join(cwd, '.eslintrc.yaml')) || fs.existsSync(path.join(cwd, 'eslint.config.js')) || fs.existsSync(path.join(cwd, 'eslint.config.mjs'))) {
        linter = { name: 'eslint', command: 'npx eslint "src/**/*.{js,jsx,ts,tsx}" --fix' };
      } else if (fs.existsSync(path.join(cwd, '.prettierrc')) || fs.existsSync(path.join(cwd, '.prettierrc.json')) || fs.existsSync(path.join(cwd, '.prettierrc.js')) || fs.existsSync(path.join(cwd, 'prettier.config.js'))) {
        linter = { name: 'prettier', command: 'npx prettier --write "src/**/*.{js,jsx,ts,tsx,json,css,scss,md}"' };
      }
    }

    return linter;
  }

  _getLintTargets(cwd, workspace = null) {
    if (workspace) {
      const linter = this._detectLinter(workspace.root);
      return linter ? [{ cwd: workspace.root, linter }] : [];
    }

    const rootLinter = this._detectLinter(cwd);
    if (rootLinter) {
      return [{ cwd, linter: rootLinter }];
    }

    return detectWorkspaces(cwd)
      .filter(workspace => fs.existsSync(workspace.packageJsonPath))
      .map(workspace => ({ cwd: workspace.root, linter: this._detectLinter(workspace.root) }))
      .filter(target => target.linter);
  }

  async _countLintErrors(cwd, linter) {
    let cmd;
    let args;
    if (linter.name === 'eslint') {
      cmd = 'npx';
      args = ['eslint', 'src/**/*.{js,jsx,ts,tsx}'];
    } else if (linter.name === 'prettier') {
      cmd = 'npx';
      args = ['prettier', '--check', 'src/**/*.{js,jsx,ts,tsx,json,css,scss,md}'];
    } else if (linter.name === 'standard') {
      cmd = 'npx';
      args = ['standard'];
    } else {
      return 0;
    }

    const result = spawnSync(cmd, args, { cwd, timeout: LINT_TIMEOUT, encoding: 'utf8' });
    if (result.status === 0) {
      return 0;
    }
    const output = (result.stdout || '') + (result.stderr || '');
    const problemMatch = output.match(/(\d+)\s+problem/);
    if (problemMatch) return parseInt(problemMatch[1], 10);
    const codeErrorMatch = output.match(/(\d+)\s+code\s+error/);
    if (codeErrorMatch) return parseInt(codeErrorMatch[1], 10);
    const errorMatch = output.match(/(\d+)\s+error/);
    if (errorMatch) return parseInt(errorMatch[1], 10);
    return 1;
  }

  async _fixArticle4(cwd, dryRun, workspace = null) {
    const targets = this._getLintTargets(cwd, workspace);

    if (targets.length === 0) {
      if (workspace) {
        console.log(`No linter found for workspace ${workspace.name} (${path.relative(cwd, workspace.root) || '.'}).`);
      }
      return { fixed: 0, linter: null, dryRun };
    }

    if (dryRun) {
      console.log(`\nDry run - Article 4 (Code Style) would execute:\n`);
      if (workspace) {
        console.log(`  Workspace: ${workspace.name} (${path.relative(cwd, workspace.root) || '.'})`);
      }
      for (const target of targets) {
        console.log(`  Directory: ${path.relative(cwd, target.cwd) || '.'}`);
        console.log(`  Linter: ${target.linter.name}`);
        console.log(`  Command: ${target.linter.command}`);
      }
      console.log('');
      return { fixed: 0, linter: targets[0].linter.name, command: targets[0].linter.command, targets: targets.map(target => path.relative(cwd, target.cwd) || '.'), dryRun };
    }

    let fixed = 0;
    let errorsBefore = 0;
    let errorsAfter = 0;

    for (const target of targets) {
      const before = await this._countLintErrors(target.cwd, target.linter);

      try {
        const fixArgs = target.linter.command === 'npx standard --fix'
          ? ['standard', '--fix']
          : target.linter.name === 'prettier'
            ? ['prettier', '--write', 'src/**/*.{js,jsx,ts,tsx,json,css,scss,md}']
            : ['eslint', 'src/**/*.{js,jsx,ts,tsx}', '--fix'];
        spawnSync('npx', fixArgs, { cwd: target.cwd, timeout: 60000, encoding: 'utf8' });
      } catch (_) {
      }

      const after = await this._countLintErrors(target.cwd, target.linter);
      errorsBefore += before;
      errorsAfter += after;
      fixed += Math.max(before - after, 0);
    }

    return { fixed, linter: targets[0].linter.name, errorsBefore, errorsAfter, dryRun };
  }
}

module.exports = { ConstitutionFixCommand };
