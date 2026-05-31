/**
 * Complexity Command
 * Code complexity assessment using cyclomatic complexity, cognitive complexity, and APP mass.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { createLogger } = require('../../utils/logger');
const { walkFiles: _walkFiles } = require('../../utils/file-walker');
const logger = createLogger('complexity');

const SOURCE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.rs'];

const COMPLEXITY_PATTERNS = {
  // Cyclomatic complexity incrementors
  decisionPoints: /\b(if|else if|elif|for|while|switch|case|catch|try|\?|\&\&|\|\|)\b/g,
  // Cognitive complexity indicators
  nesting: /[\{\[\(]/g,
  // Function/method boundaries
  functionBoundary: /\b(function|def|func|fn|class|=>)\s*\w+/g,
  // Lines of code (rough)
  linesOfCode: /\n/g,
};

class ComplexityCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.reportsDir = path.join(cwd, 'stdd', 'reports');
  }

  execute(action = 'analyze', args = [], options = {}) {
    switch (action) {
      case 'analyze':
      case 'scan':
        return this.analyze(args[0], options);
      case 'report':
        return this.report(options);
      case 'trend':
        return this.trend(options);
      case 'hotspots':
        return this.hotspots(options);
      default:
        return this.analyze(args[0], options);
    }
  }

  analyze(targetPath, options = {}) {
    const roots = targetPath
      ? [path.join(this.cwd, targetPath)]
      : ['src', 'lib', 'app', 'packages'].map(r => path.join(this.cwd, r)).filter(r => fs.existsSync(r));

    if (roots.length === 0) {
      throw new Error('No source directory found. Specify a path or ensure src/ exists.');
    }

    const files = roots.flatMap(root => _walkFiles(root, { extensions: SOURCE_EXTENSIONS }));
    const results = [];

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const metrics = this.calculateMetrics(content, file);
        results.push({ file: path.relative(this.cwd, file), ...metrics });
      } catch (err) {
        logger.warn(`Failed to analyze ${file}: ${err.message}`);
      }
    }

    const summary = this.summarize(results);
    this.saveReport(summary, results);

    if (options.json) {
      console.log(JSON.stringify({ summary, files: results }, null, 2));
    } else {
      this.printReport(summary, results, options);
    }

    return { summary, files: results };
  }

  calculateMetrics(content, _filePath) {
    const lines = content.split('\n');
    const nonEmptyLines = lines.filter(l => l.trim().length > 0);
    const commentLines = lines.filter(l => /^\s*\/\//.test(l) || /^\s*#/.test(l));
    const codeLines = nonEmptyLines.length - commentLines.length;

    // Count decision points for cyclomatic complexity
    const decisionMatches = content.match(COMPLEXITY_PATTERNS.decisionPoints) || [];
    const cyclomaticComplexity = decisionMatches.length + 1;

    // Count nesting for cognitive complexity
    const _nestingMatches = content.match(COMPLEXITY_PATTERNS.nesting) || [];
    const maxNesting = this.calculateMaxNesting(content);

    // Cognitive complexity formula (simplified)
    const cognitiveComplexity = cyclomaticComplexity + (maxNesting * 2);

    // Count functions
    const functionMatches = content.match(COMPLEXITY_PATTERNS.functionBoundary) || [];
    const functionCount = functionMatches.length;

    // APP Mass (Approximate)
    // APP = Absolute Number of Public Methods
    // Simplified: count of functions/methods
    const appMass = functionCount;

    return {
      loc: codeLines,
      totalLines: lines.length,
      commentLines,
      cyclomaticComplexity,
      cognitiveComplexity,
      maxNesting,
      functionCount,
      appMass,
      complexity: this.getComplexityLevel(cyclomaticComplexity),
    };
  }

  calculateMaxNesting(content) {
    let maxDepth = 0;
    let currentDepth = 0;

    for (const char of content) {
      if (char === '{' || char === '(' || char === '[') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (char === '}' || char === ')' || char === ']') {
        currentDepth--;
      }
    }

    return maxDepth;
  }

  getComplexityLevel(cyclomatic) {
    if (cyclomatic <= 5) return 'low';
    if (cyclomatic <= 10) return 'moderate';
    if (cyclomatic <= 20) return 'high';
    return 'very-high';
  }

  summarize(results) {
    const total = {
      files: results.length,
      loc: results.reduce((sum, r) => sum + r.loc, 0),
      totalLines: results.reduce((sum, r) => sum + r.totalLines, 0),
      cyclomaticComplexity: results.reduce((sum, r) => sum + r.cyclomaticComplexity, 0),
      cognitiveComplexity: results.reduce((sum, r) => sum + r.cognitiveComplexity, 0),
      functionCount: results.reduce((sum, r) => sum + r.functionCount, 0),
      appMass: results.reduce((sum, r) => sum + r.appMass, 0),
    };

    const avgCyclomatic = total.cyclomaticComplexity / results.length;
    const avgCognitive = total.cognitiveComplexity / results.length;
    const complexityScore = Math.max(0, 100 - (avgCyclomatic - 5) * 5);

    const hotspots = results
      .filter(r => r.cyclomaticComplexity > 10 || r.cognitiveComplexity > 15)
      .sort((a, b) => b.cyclomaticComplexity - a.cyclomaticComplexity)
      .slice(0, 10);

    return {
      ...total,
      avgCyclomaticComplexity: Math.round(avgCyclomatic * 100) / 100,
      avgCognitiveComplexity: Math.round(avgCognitive * 100) / 100,
      complexityScore: Math.round(complexityScore),
      complexityLevel: this.getComplexityLevel(avgCyclomatic),
      hotspots,
    };
  }

  printReport(summary, results, _options = {}) {
    console.log(chalk.bold('\nComplexity Analysis Report\n'));

    console.log('  Overview:');
    console.log(`    Files analyzed: ${chalk.cyan(summary.files)}`);
    console.log(`    Total LOC: ${chalk.cyan(summary.loc.toLocaleString())}`);
    console.log(`    Functions: ${chalk.cyan(summary.functionCount)}`);
    console.log(`    APP Mass: ${chalk.cyan(summary.appMass)}`);

    console.log('\n  Complexity:');
    console.log(`    Avg Cyclomatic: ${this.getComplexityDisplay(summary.avgCyclomaticComplexity)}`);
    console.log(`    Avg Cognitive: ${this.getComplexityDisplay(summary.avgCognitiveComplexity, true)}`);
    console.log(`    Score: ${this.getScoreDisplay(summary.complexityScore)}`);

    if (summary.hotspots.length > 0) {
      console.log('\n  Top Complexity Hotspots:');
      summary.hotspots.forEach((spot, i) => {
        console.log(`    ${chalk.dim((i + 1).toString() + '.')} ${chalk.cyan(spot.file)}`);
        console.log(`        CC: ${chalk.red(spot.cyclomaticComplexity.toString())} · Cog: ${chalk.yellow(spot.cognitiveComplexity.toString())} · Functions: ${spot.functionCount}`);
      });
    }

    console.log('\n  Recommendations:');
    if (summary.complexityScore < 70) {
      console.log(`    ${chalk.yellow('•')} Consider refactoring high-complexity files`);
      console.log(`    ${chalk.yellow('•')} Break down large functions into smaller units`);
      console.log(`    ${chalk.yellow('•')} Reduce nesting depth in complex areas`);
    } else {
      console.log(`    ${chalk.green('•')} Complexity is within acceptable range`);
    }
    console.log('');
  }

  getComplexityDisplay(value, isCognitive = false) {
    const threshold = isCognitive ? 15 : 10;
    if (value <= threshold / 2) return chalk.green(value.toFixed(1));
    if (value <= threshold) return chalk.yellow(value.toFixed(1));
    return chalk.red(value.toFixed(1));
  }

  getScoreDisplay(score) {
    if (score >= 80) return chalk.green(score + '/100');
    if (score >= 60) return chalk.yellow(score + '/100');
    return chalk.red(score + '/100');
  }

  saveReport(summary, results) {
    fs.mkdirSync(this.reportsDir, { recursive: true });
    const reportPath = path.join(this.reportsDir, 'complexity.json');
    const data = {
      timestamp: new Date().toISOString(),
      summary,
      files: results,
    };
    fs.writeFileSync(reportPath, JSON.stringify(data, null, 2), 'utf8');

    // Also save to trend history
    const trendPath = path.join(this.reportsDir, 'complexity-trend.jsonl');
    const trendEntry = {
      timestamp: data.timestamp,
      score: summary.complexityScore,
      avgCyclomatic: summary.avgCyclomaticComplexity,
      avgCognitive: summary.avgCognitiveComplexity,
      appMass: summary.appMass,
    };
    fs.appendFileSync(trendPath, JSON.stringify(trendEntry) + '\n', 'utf8');

    return reportPath;
  }

  report(options = {}) {
    const reportPath = path.join(this.reportsDir, 'complexity.json');
    if (!fs.existsSync(reportPath)) {
      throw new Error('No complexity report found. Run "stdd complexity analyze" first.');
    }

    const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

    if (options.json) {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(chalk.bold('\nLast Complexity Report\n'));
      console.log(`  Generated: ${chalk.dim(new Date(data.timestamp).toLocaleString())}`);
      console.log(`  Score: ${this.getScoreDisplay(data.summary.complexityScore)}\n`);
      console.log(`  Run ${chalk.cyan('stdd complexity hotspots')} for detailed analysis.\n`);
    }

    return data;
  }

  trend(options = {}) {
    const trendPath = path.join(this.reportsDir, 'complexity-trend.jsonl');
    if (!fs.existsSync(trendPath)) {
      throw new Error('No trend data found. Run "stdd complexity analyze" first.');
    }

    const lines = fs.readFileSync(trendPath, 'utf8').split('\n').filter(Boolean);
    const history = lines.map(line => JSON.parse(line)).slice(-(options.limit || 20));

    if (options.json) {
      console.log(JSON.stringify({ trend: history }, null, 2));
    } else {
      console.log(chalk.bold('\nComplexity Trend\n'));
      history.forEach((entry, i) => {
        const date = new Date(entry.timestamp).toLocaleDateString();
        const score = this.getScoreDisplay(entry.score);
        const delta = i > 0 ? entry.score - history[i - 1].score : 0;
        const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
        const deltaColor = delta > 0 ? chalk.green : delta < 0 ? chalk.red : chalk.dim;
        console.log(`  ${chalk.dim((i + 1).toString() + '.')} ${date} · ${score} ${deltaColor(arrow + Math.abs(delta).toFixed(0))}`);
      });
      console.log('');
    }

    return { trend: history };
  }

  hotspots(options = {}) {
    const reportPath = path.join(this.reportsDir, 'complexity.json');
    if (!fs.existsSync(reportPath)) {
      throw new Error('No complexity report found. Run "stdd complexity analyze" first.');
    }

    const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const hotspots = data.summary.hotspots || [];

    if (options.json) {
      console.log(JSON.stringify({ hotspots }, null, 2));
    } else {
      console.log(chalk.bold('\nComplexity Hotspots\n'));

      if (hotspots.length === 0) {
        console.log(chalk.green('  No complexity hotspots found!\n'));
      } else {
        hotspots.forEach((spot, i) => {
          const complexity = this.getComplexityDisplay(spot.cyclomaticComplexity);
          console.log(`\n  ${chalk.cyan((i + 1).toString() + '.')} ${spot.file}`);
          console.log(`      Cyclomatic: ${complexity} (${spot.cyclomaticComplexity})`);
          console.log(`      Cognitive: ${this.getComplexityDisplay(spot.cognitiveComplexity, true)} (${spot.cognitiveComplexity})`);
          console.log(`      Nesting: ${spot.maxNesting} · Functions: ${spot.functionCount} · LOC: ${spot.loc}`);

          // Suggest refactoring actions
          if (spot.cyclomaticComplexity > 20) {
            console.log(`      ${chalk.yellow('→ High complexity: Consider extracting methods')}`);
          }
          if (spot.maxNesting > 5) {
            console.log(`      ${chalk.yellow('→ Deep nesting: Consider early returns')}`);
          }
        });
        console.log('');
      }
    }

    return { hotspots };
  }
}

module.exports = { ComplexityCommand };
