/**
 * Iterate Command
 * Plan-Execute-Reflect loop for continuous improvement.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { createLogger } = require('../../utils/logger');
const inquirer = require('inquirer');
const _logger = createLogger('iterate');

const CYCLE_TEMPLATE = `# Iteration Cycle: {{title}}

> Started: {{startDate}}
> Cycle {{number}}

## Plan

<!-- What do you intend to do? -->

{{plan}}

## Execute

<!-- What did you do? -->

{{execute}}

## Reflect

<!-- What did you learn? -->

{{reflect}}

## Next Steps

<!-- What will you do differently? -->

- [ ]
- [ ]
- [ ]

---
`;

class IterateCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.iterationsDir = path.join(cwd, 'stdd', 'iterations');
    this.currentIndex = path.join(this.iterationsDir, 'index.jsonl');
  }

  execute(action = 'start', args = [], options = {}) {
    switch (action) {
      case 'start':
      case 'new':
        return this.start(args[0], options);
      case 'complete':
        return this.complete(args[0], options);
      case 'reflect':
        return this.reflect(args[0], options);
      case 'status':
        return this.status(options);
      case 'history':
        return this.history(options);
      case 'continue':
        return this.continue(options);
      case 'retrospective':
        return this.retrospective(options);
      default:
        return this.status(options);
    }
  }

  async start(title, options = {}) {
    fs.mkdirSync(this.iterationsDir, { recursive: true });

    const cycleNumber = this.getNextCycleNumber();

    if (!title && process.stdout.isTTY) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'title',
          message: 'Iteration title:',
          default: `Cycle ${cycleNumber}`,
        },
        {
          type: 'editor',
          name: 'plan',
          message: 'Describe your plan:',
        },
      ]);
      title = answers.title;
      options.plan = answers.plan;
    }

    if (!title) {
      throw new Error('Iteration title is required. Usage: stdd iterate start "<title>"');
    }

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `${timestamp}-${slug}.md`;
    const filePath = path.join(this.iterationsDir, fileName);

    const content = CYCLE_TEMPLATE
      .replace('{{title}}', title)
      .replace('{{startDate}}', new Date().toISOString())
      .replace(/{{number}}/g, cycleNumber.toString())
      .replace('{{plan}}', options.plan || '<!-- Describe your plan -->');

    fs.writeFileSync(filePath, content, 'utf8');

    // Record in index
    this.recordIndex({
      id: fileName.replace('.md', ''),
      title,
      cycle: cycleNumber,
      status: 'in-progress',
      started: new Date().toISOString(),
    });

    if (options.json) {
      console.log(JSON.stringify({ path: filePath, title, cycle: cycleNumber, started: true }, null, 2));
    } else {
      console.log(chalk.bold('\n✓ Iteration started\n'));
      console.log(`  ${chalk.cyan(title)}`);
      console.log(`  Cycle: ${chalk.cyan('#' + cycleNumber)}`);
      console.log(`  File: ${chalk.dim(path.relative(this.cwd, filePath))}\n`);
    }

    return { path: filePath, title, cycle: cycleNumber, started: true };
  }

  complete(id, options = {}) {
    const cycle = this.findCycle(id);
    if (!cycle) {
      throw new Error(`Iteration not found: ${id}`);
    }

    const filePath = path.join(this.iterationsDir, cycle.file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Update execute section
    if (options.execute) {
      content = content.replace(/{{execute}}/g, options.execute);
    }

    // Mark as completed
    content = content.replace('> Started: ', '> Completed: ');
    content = content.replace('(in-progress)', '(completed)');

    fs.writeFileSync(filePath, content, 'utf8');

    this.updateIndex(cycle.id, { status: 'completed', completed: new Date().toISOString() });

    if (options.json) {
      console.log(JSON.stringify({ id: cycle.id, completed: true }, null, 2));
    } else {
      console.log(chalk.bold('\n✓ Iteration completed\n'));
      console.log(`  ${chalk.cyan(cycle.title)}`);
      console.log(`  Use ${chalk.cyan('stdd iterate reflect ' + cycle.id)} to add reflections.\n`);
    }

    return { id: cycle.id, completed: true };
  }

  reflect(id, options = {}) {
    const cycle = this.findCycle(id);
    if (!cycle) {
      throw new Error(`Iteration not found: ${id}`);
    }

    const filePath = path.join(this.iterationsDir, cycle.file);
    let content = fs.readFileSync(filePath, 'utf8');

    const reflection = options.reflection || options.learnings || '<!-- What did you learn? -->';
    const nextSteps = options.next || options['next-steps'] || '- [ ] \n- [ ] ';

    content = content.replace(/{{reflect}}/g, reflection);
    content = content.replace(/{{nextSteps}}/g, nextSteps);

    fs.writeFileSync(filePath, content, 'utf8');

    this.updateIndex(cycle.id, { reflected: true, reflectedAt: new Date().toISOString() });

    if (options.json) {
      console.log(JSON.stringify({ id: cycle.id, reflected: true }, null, 2));
    } else {
      console.log(chalk.bold('\n✓ Reflection added\n'));
      console.log(`  ${chalk.cyan(cycle.title)}\n`);
    }

    return { id: cycle.id, reflected: true };
  }

  status(options = {}) {
    const cycles = this.loadIndex();
    const current = cycles.find(c => c.status === 'in-progress');
    const completed = cycles.filter(c => c.status === 'completed').length;
    const total = cycles.length;

    const result = {
      current: current ? { id: current.id, title: current.title, cycle: current.cycle } : null,
      completed,
      total,
      averageCycleTime: this.calculateAverageCycleTime(cycles),
    };

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.bold('\nIteration Status\n'));

      if (current) {
        console.log(`  Current: ${chalk.cyan(current.title)} (#${current.cycle})`);
        console.log(`  ${chalk.dim('Run "stdd iterate complete" to finish the cycle')}\n`);
      } else {
        console.log(`  Current: ${chalk.yellow('No active iteration')}`);
        console.log(`  ${chalk.dim('Run "stdd iterate start <title>" to begin')}\n`);
      }

      console.log(`  Completed: ${chalk.cyan(completed.toString())}/${total}`);
      console.log(`  Avg cycle time: ${chalk.cyan(result.averageCycleTime)}\n`);
    }

    return result;
  }

  history(options = {}) {
    const cycles = this.loadIndex().slice(-(options.limit || 20));

    if (options.json) {
      console.log(JSON.stringify({ cycles, count: cycles.length }, null, 2));
    } else {
      console.log(chalk.bold('\nIteration History\n'));

      if (cycles.length === 0) {
        console.log(chalk.dim('  No iterations found.\n'));
      } else {
        cycles.forEach(cycle => {
          const status = cycle.status === 'completed' ? chalk.green('✓') : chalk.yellow('○');
          const date = new Date(cycle.started).toLocaleDateString();
          console.log(`  ${status} ${chalk.cyan('#' + cycle.cycle)} ${chalk.bold(cycle.title)}`);
          console.log(`      ${chalk.dim(date)} · ${cycle.status}\n`);
        });
      }
    }

    return { cycles, count: cycles.length };
  }

  async continue(options = {}) {
    const current = this.loadIndex().find(c => c.status === 'in-progress');

    if (!current) {
      if (process.stdout.isTTY) {
        const answers = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'start',
            message: 'No active iteration. Start a new one?',
            default: true,
          },
        ]);
        if (answers.start) {
          return await this.start(null, options);
        }
        return { action: 'none' };
      }
      throw new Error('No active iteration. Run "stdd iterate start <title>" to begin.');
    }

    const filePath = path.join(this.iterationsDir, current.file);

    if (options.json) {
      console.log(JSON.stringify({ current, path: filePath }, null, 2));
    } else {
      console.log(chalk.bold('\nContinuing Iteration\n'));
      console.log(`  ${chalk.cyan(current.title)} (#${current.cycle})`);
      console.log(`  ${chalk.dim('Edit the file to update progress:')}`);
      console.log(`  ${chalk.dim(path.relative(this.cwd, filePath))}\n`);

      const { spawn } = require('child_process');
      const editor = process.env.EDITOR || 'vi';
      spawn(editor, [filePath], { stdio: 'inherit' });
    }

    return { current, path: filePath };
  }

  retrospective(options = {}) {
    const cycles = this.loadIndex().filter(c => c.status === 'completed');

    if (cycles.length === 0) {
      throw new Error('No completed iterations found for retrospective.');
    }

    const recent = cycles.slice(-10);
    const totalDuration = this.calculateAverageCycleTime(cycles);
    const learnings = this.extractLearnings(recent);

    const result = {
      cyclesAnalyzed: recent.length,
      averageDuration: totalDuration,
      themes: this.identifyThemes(recent),
      learnings,
    };

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.bold('\nIteration Retrospective\n'));
      console.log(`  Cycles analyzed: ${chalk.cyan(result.cyclesAnalyzed.toString())}`);
      console.log(`  Average duration: ${chalk.cyan(result.averageDuration)}\n`);

      if (result.themes.length > 0) {
        console.log('  Common themes:');
        result.themes.forEach(theme => {
          console.log(`    • ${chalk.cyan(theme)}`);
        });
        console.log('');
      }

      if (learnings.length > 0) {
        console.log('  Key learnings:');
        learnings.forEach(learning => {
          console.log(`    • ${chalk.dim(learning)}`);
        });
        console.log('');
      }
    }

    return result;
  }

  findCycle(id) {
    const cycles = this.loadIndex();
    return cycles.find(c => c.id === id || c.file === id || c.cycle.toString() === id);
  }

  loadIndex() {
    if (!fs.existsSync(this.currentIndex)) {
      return [];
    }
    return fs.readFileSync(this.currentIndex, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line));
  }

  recordIndex(entry) {
    fs.mkdirSync(this.iterationsDir, { recursive: true });
    fs.appendFileSync(this.currentIndex, JSON.stringify(entry) + '\n', 'utf8');
  }

  updateIndex(id, updates) {
    const cycles = this.loadIndex();
    const index = cycles.findIndex(c => c.id === id);
    if (index !== -1) {
      cycles[index] = { ...cycles[index], ...updates };
      const content = cycles.map(c => JSON.stringify(c)).join('\n');
      fs.writeFileSync(this.currentIndex, content + '\n', 'utf8');
    }
  }

  getNextCycleNumber() {
    const cycles = this.loadIndex();
    if (cycles.length === 0) return 1;
    return Math.max(...cycles.map(c => c.cycle)) + 1;
  }

  calculateAverageCycleTime(cycles) {
    const completed = cycles.filter(c => c.completed);
    if (completed.length === 0) return 'N/A';

    const totalMs = completed.reduce((sum, c) => {
      const started = new Date(c.started).getTime();
      const ended = new Date(c.completed || c.reflectedAt || Date.now()).getTime();
      return sum + (ended - started);
    }, 0);

    const avgMs = totalMs / completed.length;
    const days = Math.floor(avgMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((avgMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return '< 1h';
  }

  extractLearnings(cycles) {
    const learnings = [];
    for (const cycle of cycles) {
      const filePath = path.join(this.iterationsDir, cycle.file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const reflectMatch = content.match(/## Reflect\n([\s\S]+?)##/);
        if (reflectMatch) {
          const points = reflectMatch[1].split('\n')
            .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
            .map(line => line.replace(/^[-•]\s*/, '').trim())
            .filter(Boolean);
          learnings.push(...points);
        }
      }
    }
    return learnings.slice(0, 5);
  }

  identifyThemes(cycles) {
    // Simple theme extraction from titles
    const words = cycles.flatMap(c => c.title.toLowerCase().split(/\s+/));
    const freq = {};
    words.forEach(w => {
      if (w.length > 3) freq[w] = (freq[w] || 0) + 1;
    });
    return Object.entries(freq)
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([word, _]) => word);
  }
}

module.exports = { IterateCommand };
