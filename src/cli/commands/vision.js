/**
 * Vision Command
 * Project vision document management for long-term goals and strategic direction.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { createLogger } = require('../../utils/logger');
const _logger = createLogger('vision');

const DEFAULT_VISION_TEMPLATE = `# Project Vision

> Generated: {{date}}
> Version: 1.0

## Purpose

<!-- Describe the problem this project solves and why it exists -->

## Target Audience

<!-- Who are the primary users? What are their needs? -->

## Technical Vision

<!-- Architectural principles and technical north stars -->

### Core Principles
1.
2.
3.

## Success Metrics

<!-- Measurable indicators of project success -->

- [ ] Metric 1
- [ ] Metric 2
- [ ] Metric 3

## Milestones

<!-- Key milestones on the roadmap -->

| Phase | Milestone | Target Date | Status |
|-------|-----------|-------------|--------|
| 1 | | | Planned |
| 2 | | | Planned |
| 3 | | | Planned |

## Constraints

<!-- Technical, business, or resource constraints -->

## Non-Goals

<!-- What this project explicitly will NOT do -->

## Alignment with Current Specs

<!-- Link vision to current specifications and changes -->

---

*Review this vision document quarterly or after major project changes.*
`;

class VisionCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.visionPath = path.join(cwd, 'stdd', 'vision.md');
  }

  execute(action = 'show', _args = [], options = {}) {
    switch (action) {
      case 'create':
      case 'init':
        return this.create(options);
      case 'edit':
        return this.edit(options);
      case 'check':
      case 'verify':
        return this.check(options);
      case 'align':
        return this.align(options);
      case 'show':
      default:
        return this.show(options);
    }
  }

  create(options = {}) {
    if (fs.existsSync(this.visionPath) && !options.force) {
      throw new Error(`Vision document already exists at ${this.visionPath}. Use --force to overwrite.`);
    }

    const content = DEFAULT_VISION_TEMPLATE.replace('{{date}}', new Date().toISOString().split('T')[0]);
    fs.mkdirSync(path.dirname(this.visionPath), { recursive: true });
    fs.writeFileSync(this.visionPath, content, 'utf8');

    if (options.json) {
      console.log(JSON.stringify({ path: this.visionPath, created: true }, null, 2));
    } else {
      console.log(chalk.bold('\n✓ Vision document created\n'));
      console.log(`  ${chalk.cyan(path.relative(this.cwd, this.visionPath))}`);
      console.log(chalk.dim('\n  Edit this file to define your project vision.\n'));
    }
    return { path: this.visionPath, created: true };
  }

  show(options = {}) {
    if (!fs.existsSync(this.visionPath)) {
      if (options.json) {
        console.log(JSON.stringify({ exists: false, message: 'No vision document found. Run "stdd vision create" to create one.' }, null, 2));
      } else {
        console.log(chalk.yellow('\nNo vision document found.\n'));
        console.log('  Run ' + chalk.cyan('stdd vision create') + ' to create one.\n');
      }
      return { exists: false };
    }

    const content = fs.readFileSync(this.visionPath, 'utf8');
    if (options.json) {
      console.log(JSON.stringify({ exists: true, path: this.visionPath, content }, null, 2));
    } else {
      console.log(chalk.bold('\n' + path.relative(this.cwd, this.visionPath) + '\n'));
      console.log(chalk.dim('─'.repeat(50)));
      console.log(content);
      console.log(chalk.dim('─'.repeat(50) + '\n'));
    }
    return { exists: true, path: this.visionPath, content };
  }

  edit(_options = {}) {
    if (!fs.existsSync(this.visionPath)) {
      throw new Error(`No vision document found. Run "stdd vision create" first.`);
    }

    const editor = process.env.EDITOR || 'vi';
    const { spawn } = require('child_process');
    spawn(editor, [this.visionPath], { stdio: 'inherit' });
    return { edited: true, path: this.visionPath };
  }

  check(options = {}) {
    if (!fs.existsSync(this.visionPath)) {
      throw new Error(`No vision document found. Run "stdd vision create" first.`);
    }

    const content = fs.readFileSync(this.visionPath, 'utf8');
    const issues = [];
    const checks = {
      hasPurpose: /##\s*Purpose/i.test(content) && content.split('## Purpose')[1]?.split('##')[0]?.trim().length > 100,
      hasAudience: /##\s*Target Audience/i.test(content) && content.split('## Target Audience')[1]?.split('##')[0]?.trim().length > 50,
      hasPrinciples: /##\s*Core Principles/i.test(content) || /##\s*Technical Vision/i.test(content),
      hasMetrics: /##\s*Success Metrics/i.test(content),
      hasMilestones: /##\s*Milestones/i.test(content),
      hasConstraints: /##\s*Constraints/i.test(content),
      hasNonGoals: /##\s*Non-Goals/i.test(content),
    };

    if (!checks.hasPurpose) issues.push('Purpose section is missing or too brief (should be > 100 chars)');
    if (!checks.hasAudience) issues.push('Target Audience section is missing or too brief (should be > 50 chars)');
    if (!checks.hasPrinciples) issues.push('Core Principles section is missing');
    if (!checks.hasMetrics) issues.push('Success Metrics section is missing');
    if (!checks.hasMilestones) issues.push('Milestones section is missing');
    if (!checks.hasConstraints) issues.push('Constraints section is missing');
    if (!checks.hasNonGoals) issues.push('Non-Goals section is missing');

    const result = {
      path: this.visionPath,
      checks,
      issues,
      score: Math.max(0, 100 - issues.length * 10),
    };

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.bold('\nVision Document Check\n'));
      console.log(`  Score: ${result.score >= 70 ? chalk.green(result.score) : chalk.yellow(result.score)}/100\n`);

      Object.entries(checks).forEach(([key, value]) => {
        console.log(`  ${value ? chalk.green('✓') : chalk.yellow('○')} ${key}`);
      });

      if (issues.length > 0) {
        console.log(chalk.yellow('\n  Issues:\n'));
        issues.forEach(issue => console.log(`    • ${issue}`));
      }
      console.log('');
    }
    return result;
  }

  align(options = {}) {
    if (!fs.existsSync(this.visionPath)) {
      throw new Error(`No vision document found. Run "stdd vision create" first.`);
    }

    const specsDir = path.join(this.cwd, 'stdd', 'specs');
    const changesDir = path.join(this.cwd, 'stdd', 'changes');
    const _vision = fs.readFileSync(this.visionPath, 'utf8');

    const specs = [];
    if (fs.existsSync(specsDir)) {
      const files = fs.readdirSync(specsDir).filter(f => f.endsWith('.md') || f.endsWith('.feature'));
      files.forEach(f => {
        const content = fs.readFileSync(path.join(specsDir, f), 'utf8');
        specs.push({ file: f, mentionsVision: /vision|strategic|goal|purpose/i.test(content) });
      });
    }

    const changes = [];
    if (fs.existsSync(changesDir)) {
      const dirs = fs.readdirSync(changesDir).filter(d => !d.startsWith('archive') && !d.startsWith('.'));
      dirs.forEach(d => {
        const proposalPath = path.join(changesDir, d, 'proposal.md');
        if (fs.existsSync(proposalPath)) {
          const content = fs.readFileSync(proposalPath, 'utf8');
          changes.push({ change: d, hasProposal: true, mentionsVision: /vision|strategic|goal|purpose/i.test(content) });
        }
      });
    }

    const alignedSpecs = specs.filter(s => s.mentionsVision).length;
    const alignedChanges = changes.filter(c => c.mentionsVision).length;
    const alignment = {
      visionPath: this.visionPath,
      specs: { total: specs.length, aligned: alignedSpecs },
      changes: { total: changes.length, aligned: alignedChanges },
      alignmentScore: specs.length + changes.length > 0
        ? Math.round(((alignedSpecs + alignedChanges) / (specs.length + changes.length)) * 100)
        : 100,
    };

    if (options.json) {
      console.log(JSON.stringify(alignment, null, 2));
    } else {
      console.log(chalk.bold('\nVision Alignment Report\n'));
      console.log(`  Alignment Score: ${alignment.alignmentScore >= 70 ? chalk.green(alignment.alignmentScore + '%') : chalk.yellow(alignment.alignmentScore + '%')}\n`);
      console.log(`  Specs: ${chalk.cyan(alignment.specs.aligned)}/${alignment.specs.total} mention vision`);
      console.log(`  Changes: ${chalk.cyan(alignment.changes.aligned)}/${alignment.changes.total} mention vision\n`);

      if (alignment.alignmentScore < 70) {
        console.log(chalk.yellow('  💡 Consider referencing the vision in more specs and changes.\n'));
      }
    }
    return alignment;
  }
}

module.exports = { VisionCommand };
