/**
 * Certainty Command
 * 5-dimension confidence scoring for critical decisions.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { createLogger } = require('../../utils/logger');
const inquirer = require('inquirer');
const _logger = createLogger('certainty');

const DIMENSIONS = {
  requirementClarity: { label: 'Requirement Clarity', description: 'How clear and well-defined are the requirements?' },
  technicalFeasibility: { label: 'Technical Feasibility', description: 'How confident are we that this can be implemented?' },
  riskLevel: { label: 'Risk Level', description: 'How risky is this change? (higher score = lower risk)' },
  testCoverage: { label: 'Test Coverage', description: 'How well can we test this implementation?' },
  visionAlignment: { label: 'Vision Alignment', description: 'How well does this align with project vision?' },
};

const THRESHOLDS = {
  auto: 0.95,
  warning: 0.85,
  confirm: 0.70,
};

class CertaintyCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.historyPath = path.join(cwd, 'stdd', 'memory', 'certainty-history.jsonl');
  }

  execute(action = 'assess', args = [], options = {}) {
    switch (action) {
      case 'assess':
      case 'evaluate':
        return this.assess(args[0], options);
      case 'check':
        return this.check(args[0], options);
      case 'history':
        return this.history(options);
      case 'thresholds':
        return this.showThresholds(options);
      case 'configure':
        return this.configure(options);
      default:
        return this.assess(args[0], options);
    }
  }

  async assess(context, options = {}) {
    const scores = {};
    const rationale = {};

    if (options.interactive !== false && process.stdout.isTTY) {
      console.log(chalk.bold('\nCertainty Assessment\n'));
      console.log('Rate each dimension from 1 (low) to 5 (high)\n');

      for (const [key, dim] of Object.entries(DIMENSIONS)) {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'score',
            message: `${dim.label} (1-5):`,
            validate: (input) => {
              const num = parseFloat(input);
              return (!isNaN(num) && num >= 1 && num <= 5) || 'Please enter a number between 1 and 5';
            },
            filter: (input) => parseFloat(input),
          },
          {
            type: 'input',
            name: 'rationale',
            message: 'Rationale (optional):',
          },
        ]);
        scores[key] = answers.score;
        if (answers.rationale) rationale[key] = answers.rationale;
      }
    } else {
      if (!options.scores) {
        throw new Error('Scores required. Use --scores "req:4,tech:5,risk:3,test:4,vision:5" or run in interactive mode');
      }
      const scorePairs = options.scores.split(',');
      for (const pair of scorePairs) {
        const [key, value] = pair.split(':');
        const normalizedKey = Object.keys(DIMENSIONS).find(k => k.startsWith(key));
        if (normalizedKey) {
          scores[normalizedKey] = parseFloat(value);
        }
      }
    }

    const overall = Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(DIMENSIONS).length / 5;
    const assessment = {
      timestamp: new Date().toISOString(),
      context: context || 'manual',
      scores,
      rationale,
      overall: Math.round(overall * 100) / 100,
      recommendation: this.getRecommendation(overall),
    };

    this.recordAssessment(assessment);

    if (options.json) {
      console.log(JSON.stringify(assessment, null, 2));
    } else {
      this.printAssessment(assessment);
    }

    return assessment;
  }

  printAssessment(assessment) {
    console.log(chalk.bold('\nCertainty Assessment Report\n'));
    console.log(`  Overall: ${this.getScoreDisplay(assessment.overall)}\n`);

    console.log('  Dimensions:');
    for (const [key, score] of Object.entries(assessment.scores)) {
      const dim = DIMENSIONS[key];
      const normalized = score / 5;
      console.log(`    ${this.getScoreDisplay(normalized, true)} ${chalk.dim(dim.label.padEnd(25))} ${score}/5`);
      if (assessment.rationale[key]) {
        console.log(`      ${chalk.dim('│')} ${assessment.rationale[key]}`);
      }
    }

    console.log(`\n  Recommendation: ${assessment.recommendation.label}`);
    console.log(`  ${chalk.dim(assessment.recommendation.action)}\n`);

    if (assessment.overall < THRESHOLDS.confirm) {
      console.log(chalk.yellow('  ⚠️  Low confidence detected. Consider:\n'));
      console.log('    • Gathering more requirements');
      console.log('    • Conducting a spike/trial');
      console.log('    • Breaking into smaller changes\n');
    }
  }

  getScoreDisplay(score, compact = false) {
    const percentage = Math.round(score * 100);
    if (score >= THRESHOLDS.auto) return compact ? chalk.green('█') : chalk.green(`${percentage}%`);
    if (score >= THRESHOLDS.warning) return compact ? chalk.yellow('▓') : chalk.yellow(`${percentage}%`);
    if (score >= THRESHOLDS.confirm) return compact ? chalk.yellow('░') : chalk.yellow(`${percentage}%`);
    return compact ? chalk.red('▒') : chalk.red(`${percentage}%`);
  }

  getRecommendation(overall) {
    if (overall >= THRESHOLDS.auto) {
      return { label: 'PROCEED', action: 'High confidence: Safe to proceed automatically.' };
    }
    if (overall >= THRESHOLDS.warning) {
      return { label: 'RECOMMEND', action: 'Good confidence: Recommended with monitoring.' };
    }
    if (overall >= THRESHOLDS.confirm) {
      return { label: 'CONFIRM', action: 'Moderate confidence: Confirm with team before proceeding.' };
    }
    return { label: 'PAUSE', action: 'Low confidence: Pause and gather more information.' };
  }

  recordAssessment(assessment) {
    const dir = path.dirname(this.historyPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(this.historyPath, JSON.stringify(assessment) + '\n', 'utf8');
  }

  check(context, options = {}) {
    if (!fs.existsSync(this.historyPath)) {
      if (options.json) {
        console.log(JSON.stringify({ message: 'No certainty history found' }, null, 2));
      } else {
        console.log(chalk.yellow('\nNo certainty history found.\n'));
      }
      return { history: [] };
    }

    const lines = fs.readFileSync(this.historyPath, 'utf8').split('\n').filter(Boolean);
    const history = lines.map(line => JSON.parse(line));

    const recent = history.slice(-10);
    const avgOverall = recent.reduce((sum, a) => sum + a.overall, 0) / recent.length;
    const lowCount = recent.filter(a => a.overall < THRESHOLDS.confirm).length;

    const result = {
      recentCount: recent.length,
      averageOverall: Math.round(avgOverall * 100) / 100,
      lowCertaintyCount: lowCount,
      trend: this.getTrend(history),
    };

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.bold('\nCertainty Status\n'));
      console.log(`  Recent assessments: ${chalk.cyan(result.recentCount)}`);
      console.log(`  Average certainty: ${this.getScoreDisplay(result.averageOverall)}`);
      console.log(`  Low certainty: ${lowCount > 0 ? chalk.yellow(lowCount) : chalk.green(lowCount)} assessments`);
      console.log(`  Trend: ${result.trend}\n`);
    }

    return result;
  }

  getTrend(history) {
    if (history.length < 3) return 'insufficient data';
    const recent = history.slice(-5).map(h => h.overall);
    const _avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
    const secondHalf = recent.slice(Math.floor(recent.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    if (secondAvg > firstAvg + 0.1) return '↑ improving';
    if (secondAvg < firstAvg - 0.1) return '↓ declining';
    return '→ stable';
  }

  history(options = {}) {
    if (!fs.existsSync(this.historyPath)) {
      if (options.json) {
        console.log(JSON.stringify({ history: [] }, null, 2));
      } else {
        console.log(chalk.yellow('\nNo certainty history found.\n'));
      }
      return { history: [] };
    }

    const lines = fs.readFileSync(this.historyPath, 'utf8').split('\n').filter(Boolean);
    const history = lines.map(line => JSON.parse(line)).slice(-(options.limit || 20));

    if (options.json) {
      console.log(JSON.stringify({ history, count: history.length }, null, 2));
    } else {
      console.log(chalk.bold('\nCertainty History\n'));
      history.forEach((assessment, i) => {
        const date = new Date(assessment.timestamp).toLocaleDateString();
        console.log(`  ${chalk.dim((i + 1).toString() + '.')} ${date} · ${this.getScoreDisplay(assessment.overall)} · ${chalk.dim(assessment.context)}`);
      });
      console.log('');
    }

    return { history, count: history.length };
  }

  showThresholds(options = {}) {
    const result = { thresholds: THRESHOLDS };

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.bold('\nCertainty Thresholds\n'));
      console.log(`  Auto-proceed:  ${chalk.green('≥' + (THRESHOLDS.auto * 100) + '%')}`);
      console.log(`  Warning:      ${chalk.yellow('≥' + (THRESHOLDS.warning * 100) + '%')}`);
      console.log(`  Confirm:      ${chalk.yellow('≥' + (THRESHOLDS.confirm * 100) + '%')}`);
      console.log(`  Pause:        ${chalk.red('<' + (THRESHOLDS.confirm * 100) + '%')}\n`);
    }

    return result;
  }

  configure(options = {}) {
    if (!options.set) {
      throw new Error('Use --set "auto=0.9,warning=0.8,confirm=0.7" to configure thresholds');
    }

    const pairs = options.set.split(',');
    const newThresholds = {};
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (['auto', 'warning', 'confirm'].includes(key)) {
        newThresholds[key] = parseFloat(value);
      }
    }

    const configPath = path.join(this.cwd, 'stdd', 'config', 'certainty.json');
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify({ thresholds: newThresholds }, null, 2), 'utf8');

    if (options.json) {
      console.log(JSON.stringify({ thresholds: newThresholds, saved: true }, null, 2));
    } else {
      console.log(chalk.bold('\n✓ Certainty thresholds updated\n'));
      Object.entries(newThresholds).forEach(([key, value]) => {
        console.log(`  ${key}: ${chalk.cyan(value)}`);
      });
      console.log(`\n  Saved to: ${chalk.dim(path.relative(this.cwd, configPath))}\n`);
    }

    return { thresholds: newThresholds, saved: true };
  }
}

module.exports = { CertaintyCommand };
