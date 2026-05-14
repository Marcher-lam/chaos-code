/**
 * Learn Command
 * Lightweight Pattern Teaching runtime for project-local style extraction.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { walkFiles: _walkFiles } = require('../../utils/file-walker');

const SOURCE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.rs'];

function top(entries, limit = 5) {
  return Object.entries(entries)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

class LearnCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
  }

  execute(action = 'status', args = [], options = {}) {
    this.ensureLearningDir();
    switch (action) {
      case 'scan':
      case 'analyze-patterns':
        return this.scan(options);
      case 'good':
      case 'bad':
      case 'suggest':
        return this.recordFeedback(action, args.join(' '), options);
      case 'status':
      case 'list':
      default:
        return this.status(options);
    }
  }

  ensureLearningDir() {
    const dir = path.join(this.cwd, 'stdd', 'memory', 'learning');
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  scan(options = {}) {
    const roots = ['src', 'lib', 'app', 'packages']
      .map(root => path.join(this.cwd, root))
      .filter(root => fs.existsSync(root));
    const files = roots.flatMap(root => _walkFiles(root, { extensions: SOURCE_EXTENSIONS }));
    const patterns = this.extractPatterns(files);
    const learningDir = this.ensureLearningDir();
    const jsonPath = path.join(learningDir, 'code-patterns.json');
    const mdPath = path.join(learningDir, 'styleguide.md');
    fs.writeFileSync(jsonPath, JSON.stringify(patterns, null, 2), 'utf8');
    fs.writeFileSync(mdPath, this.renderStyleguide(patterns), 'utf8');

    if (options.json) {
      console.log(JSON.stringify(patterns, null, 2));
    } else {
      console.log(chalk.bold('\nPattern Teaching Scan\n'));
      console.log(`  Files analyzed: ${chalk.cyan(patterns.filesAnalyzed)}`);
      console.log(`  Dominant module style: ${chalk.cyan(patterns.moduleStyle.primary || 'unknown')}`);
      console.log(`  Dominant test style: ${chalk.cyan(patterns.testStyle.primary || 'unknown')}`);
      console.log(`  Output: ${chalk.cyan(path.relative(this.cwd, jsonPath))}`);
      console.log(`  Guide:  ${chalk.cyan(path.relative(this.cwd, mdPath))}\n`);
    }
    return patterns;
  }

  extractPatterns(files) {
    const data = {
      generatedAt: new Date().toISOString(),
      filesAnalyzed: files.length,
      naming: { camelCase: 0, PascalCase: 0, snake_case: 0 },
      moduleStyle: { commonjs: 0, esm: 0, primary: null },
      asyncStyle: { asyncAwait: 0, promises: 0, callbacks: 0 },
      errorHandling: { tryCatch: 0, throws: 0, resultObjects: 0 },
      testStyle: { jestVitest: 0, pytest: 0, goTest: 0, rustTest: 0, primary: null },
      comments: { jsdoc: 0, inline: 0 },
      topImports: [],
      confidence: 0,
    };
    const imports = {};

    for (const file of files) {
      let content;
      try {
        content = fs.readFileSync(file, 'utf8');
      } catch {
        continue;
      }
      data.naming.camelCase += (content.match(/\b[a-z][a-z0-9]+(?:[A-Z][a-z0-9]+)+\b/g) || []).length;
      data.naming.PascalCase += (content.match(/\b[A-Z][a-z0-9]+(?:[A-Z][a-z0-9]+)*\b/g) || []).length;
      data.naming.snake_case += (content.match(/\b[a-z]+(?:_[a-z0-9]+)+\b/g) || []).length;
      data.moduleStyle.commonjs += (content.match(/\brequire\(|module\.exports|exports\./g) || []).length;
      data.moduleStyle.esm += (content.match(/^\s*import\s|^\s*export\s/gm) || []).length;
      data.asyncStyle.asyncAwait += (content.match(/\basync\b|\bawait\b/g) || []).length;
      data.asyncStyle.promises += (content.match(/\.then\(|\.catch\(/g) || []).length;
      data.asyncStyle.callbacks += (content.match(/callback\s*\(|\bcb\s*\(/g) || []).length;
      data.errorHandling.tryCatch += (content.match(/\btry\s*\{|\bcatch\s*\(/g) || []).length;
      data.errorHandling.throws += (content.match(/\bthrow\s+new\b|\braise\s+/g) || []).length;
      data.errorHandling.resultObjects += (content.match(/status:\s*['"](?:pass|fail|error|success)|ok:\s*(?:true|false)/g) || []).length;
      data.testStyle.jestVitest += (content.match(/\b(describe|it|expect|test)\s*\(/g) || []).length;
      data.testStyle.pytest += (content.match(/def\s+test_|pytest/g) || []).length;
      data.testStyle.goTest += (content.match(/func\s+Test\w+\s*\(t \*testing\.T\)/g) || []).length;
      data.testStyle.rustTest += (content.match(/#\[test\]/g) || []).length;
      data.comments.jsdoc += (content.match(/\/\*\*[\s\S]*?\*\//g) || []).length;
      data.comments.inline += (content.match(/(^|\s)\/\/|#/g) || []).length;

      for (const match of content.matchAll(/(?:import\s+.*?from\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\))/g)) {
        const name = match[1] || match[2];
        imports[name] = (imports[name] || 0) + 1;
      }
    }

    data.moduleStyle.primary = data.moduleStyle.esm >= data.moduleStyle.commonjs ? 'esm' : 'commonjs';
    const testCounts = {
      jestVitest: data.testStyle.jestVitest,
      pytest: data.testStyle.pytest,
      goTest: data.testStyle.goTest,
      rustTest: data.testStyle.rustTest,
    };
    data.testStyle.primary = top(testCounts, 1)[0]?.name || null;
    data.topImports = top(imports, 10);
    data.confidence = this.calculateConfidence(data);
    return data;
  }

  calculateConfidence(data) {
    if (data.filesAnalyzed === 0) return 0;
    let score = 40;
    if (data.moduleStyle.commonjs + data.moduleStyle.esm > 0) score += 20;
    if (data.testStyle.jestVitest + data.testStyle.pytest + data.testStyle.goTest + data.testStyle.rustTest > 0) score += 20;
    if (data.naming.camelCase + data.naming.PascalCase + data.naming.snake_case > 20) score += 10;
    if (data.errorHandling.tryCatch + data.errorHandling.throws + data.errorHandling.resultObjects > 0) score += 10;
    return Math.min(100, score);
  }

  renderStyleguide(patterns) {
    return `# Learned Code Patterns\n\nGenerated: ${patterns.generatedAt}\n\n## Summary\n\n- Files analyzed: ${patterns.filesAnalyzed}\n- Confidence: ${patterns.confidence}%\n- Module style: ${patterns.moduleStyle.primary || 'unknown'}\n- Test style: ${patterns.testStyle.primary || 'unknown'}\n\n## Guidance For AI Agents\n\n- Prefer ${patterns.moduleStyle.primary || 'the existing'} module style.\n- Match the dominant test style: ${patterns.testStyle.primary || 'existing project tests'}.\n- Preserve existing naming distribution rather than introducing a new style.\n- Reuse common imports when appropriate: ${patterns.topImports.map(item => item.name).join(', ') || 'none detected'}.\n`;
  }

  recordFeedback(kind, feedback, options = {}) {
    if (!feedback) throw new Error(`Feedback text is required for learn ${kind}.`);
    const learningDir = this.ensureLearningDir();
    const filePath = path.join(learningDir, 'feedback.jsonl');
    const entry = { kind, feedback, createdAt: new Date().toISOString() };
    fs.appendFileSync(filePath, JSON.stringify(entry) + '\n', 'utf8');
    if (options.json) console.log(JSON.stringify(entry, null, 2));
    else console.log(`Recorded ${kind} feedback in ${path.relative(this.cwd, filePath)}`);
    return entry;
  }

  status(options = {}) {
    const learningDir = this.ensureLearningDir();
    const patternsPath = path.join(learningDir, 'code-patterns.json');
    const feedbackPath = path.join(learningDir, 'feedback.jsonl');
    const status = {
      patterns: fs.existsSync(patternsPath) ? JSON.parse(fs.readFileSync(patternsPath, 'utf8')) : null,
      feedbackCount: fs.existsSync(feedbackPath) ? fs.readFileSync(feedbackPath, 'utf8').split('\n').filter(Boolean).length : 0,
      learningDir: path.relative(this.cwd, learningDir),
    };
    if (options.json) console.log(JSON.stringify(status, null, 2));
    else {
      console.log(chalk.bold('\nLearning Status\n'));
      console.log(`  Directory: ${chalk.cyan(status.learningDir)}`);
      console.log(`  Patterns:  ${status.patterns ? chalk.green('available') : chalk.yellow('missing; run stdd learn scan')}`);
      console.log(`  Feedback:  ${status.feedbackCount}\n`);
    }
    return status;
  }
}

module.exports = { LearnCommand };
