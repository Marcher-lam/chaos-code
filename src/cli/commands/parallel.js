/**
 * Parallel Command
 * DAG parallel execution with layer-based scheduling.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { createLogger } = require('../../utils/logger');
const { ParallelExecutor } = require('../../utils/parallel-executor');
const { HeterogeneousAdapter } = require('../../utils/heterogeneous-adapter');
const { DynamicRouter } = require('../../utils/dynamic-router');
const _logger = createLogger('parallel');

class ParallelCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.graphDir = path.join(cwd, 'stdd', 'graph');
  }

  execute(action = 'run', args = [], options = {}) {
    switch (action) {
      case 'run':
      case 'execute':
        return this.run(args.join(' ') || 'feature', options);
      case 'dry-run':
        return this.dryRun(args.join(' ') || 'feature', options);
      case 'visualize':
      case 'graph':
        return this.visualize(args.join(' ') || 'feature', options);
      case 'layers':
        return this.showLayers(args.join(' ') || 'feature', options);
      case 'status':
        return this.status(options);
      default:
        return this.run(action, options);
    }
  }

  async run(intent, options = {}) {
    const router = new DynamicRouter(this.graphDir);
    const dag = await router.compile(intent);

    if (!dag || dag.nodes.length === 0) {
      throw new Error(`No DAG found for intent: ${intent}. Available: feature, hotfix, repair, research`);
    }

    const adapter = new HeterogeneousAdapter();
    const executor = new ParallelExecutor(adapter, {
      maxParallel: options.parallel || options.p || 4,
      strategy: options.strategy || 'all',
      dryRun: options['dry-run'] || false,
    });

    console.log(chalk.bold('\nParallel Execution\n'));
    console.log(`  Intent: ${chalk.cyan(intent)}`);
    console.log(`  Nodes: ${chalk.cyan(dag.nodes.length.toString())}`);
    console.log(`  Max parallel: ${chalk.cyan(options.parallel || 4)}\n`);

    const startTime = Date.now();
    const results = await executor.execute(dag);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    this.printResults(results, duration);

    return { intent, results, duration };
  }

  async dryRun(intent, options = {}) {
    const router = new DynamicRouter(this.graphDir);
    const dag = await router.compile(intent);

    if (!dag || dag.nodes.length === 0) {
      throw new Error(`No DAG found for intent: ${intent}`);
    }

    const adapter = new HeterogeneousAdapter();
    const executor = new ParallelExecutor(adapter, {
      maxParallel: options.parallel || options.p || 4,
      strategy: options.strategy || 'all',
      dryRun: true,
    });

    const plan = await executor.plan(dag);

    if (options.json) {
      console.log(JSON.stringify({ intent, plan }, null, 2));
    } else {
      console.log(chalk.bold('\nParallel Execution Plan (Dry Run)\n'));
      console.log(`  Intent: ${chalk.cyan(intent)}`);
      console.log(`  Total nodes: ${chalk.cyan(dag.nodes.length.toString())}`);
      console.log(`  Layers: ${chalk.cyan(plan.layers.length.toString())}`);
      console.log(`  Estimated time: ${chalk.cyan(plan.estimatedTime + 's')}\n`);

      plan.layers.forEach((layer, i) => {
        console.log(`  ${chalk.bold('Layer ' + i + ':')} ${chalk.cyan(layer.nodes.join(', '))}`);
      });
      console.log('');
    }

    return { intent, plan };
  }

  async visualize(intent, _options = {}) {
    const router = new DynamicRouter(this.graphDir);
    const dag = await router.compile(intent);

    if (!dag || dag.nodes.length === 0) {
      throw new Error(`No DAG found for intent: ${intent}`);
    }

    const adapter = new HeterogeneousAdapter();
    const executor = new ParallelExecutor(adapter);
    const layers = executor.buildLayers(dag);

    let output = chalk.bold('\nExecution Graph Visualization\n');
    output += chalk.dim('─'.repeat(50)) + '\n\n';

    layers.forEach((layer, i) => {
      output += `  ${chalk.bold('Layer ' + i + ':')}\n`;
      layer.nodes.forEach(node => {
        const dependencies = dag.edges
          .filter(e => e.to === node)
          .map(e => e.from);
        const depStr = dependencies.length > 0 ? ` ← ${dependencies.join(', ')}` : '';
        output += `    ${chalk.cyan(node)}${chalk.dim(depStr)}\n`;
      });
      output += '\n';
    });

    output += chalk.dim('─'.repeat(50)) + '\n';

    console.log(output);

    return { intent, layers: layers.map(l => l.nodes) };
  }

  async showLayers(intent, options = {}) {
    const router = new DynamicRouter(this.graphDir);
    const dag = await router.compile(intent);

    if (!dag || dag.nodes.length === 0) {
      throw new Error(`No DAG found for intent: ${intent}`);
    }

    const adapter = new HeterogeneousAdapter();
    const executor = new ParallelExecutor(adapter);
    const layers = executor.buildLayers(dag);

    if (options.json) {
      console.log(JSON.stringify({ intent, layers }, null, 2));
    } else {
      console.log(chalk.bold('\nExecution Layers\n'));
      console.log(`  Intent: ${chalk.cyan(intent)}\n`);

      layers.forEach((layer, i) => {
        console.log(`  ${chalk.bold('Layer ' + i + ':')} ${chalk.cyan(layer.nodes.join(', '))}`);
      });
      console.log('');
    }

    return { intent, layers };
  }

  status(options = {}) {
    const configPath = path.join(this.graphDir, 'config.json');
    const skillsPath = path.join(this.graphDir, 'skills.yaml');
    const conditionsPath = path.join(this.graphDir, 'conditions.json');

    const status = {
      graphDir: path.relative(this.cwd, this.graphDir),
      hasConfig: fs.existsSync(configPath),
      hasSkills: fs.existsSync(skillsPath),
      hasConditions: fs.existsSync(conditionsPath),
      availableIntents: ['feature', 'hotfix', 'repair', 'research'],
    };

    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      status.maxParallel = config.max_parallel || 4;
      status.timeout = config.timeout;
    }

    if (options.json) {
      console.log(JSON.stringify(status, null, 2));
    } else {
      console.log(chalk.bold('\nParallel Execution Status\n'));
      console.log(`  Graph directory: ${chalk.cyan(status.graphDir)}`);
      console.log(`  Config: ${status.hasConfig ? chalk.green('✓') : chalk.yellow('○')}`);
      console.log(`  Skills: ${status.hasSkills ? chalk.green('✓') : chalk.yellow('○')}`);
      console.log(`  Conditions: ${status.hasConditions ? chalk.green('✓') : chalk.yellow('○')}`);

      if (status.maxParallel) {
        console.log(`  Max parallel: ${chalk.cyan(status.maxParallel.toString())}`);
      }

      console.log(`\n  Available intents: ${chalk.cyan(status.availableIntents.join(', '))}\n`);
    }

    return status;
  }

  printResults(results, duration) {
    console.log(chalk.bold('\nExecution Results\n'));
    console.log(`  Duration: ${chalk.cyan(duration + 's')}`);
    console.log(`  Total: ${chalk.cyan(results.total.toString())}`);
    console.log(`  Succeeded: ${chalk.green(results.succeeded.toString())}`);
    console.log(`  Failed: ${results.failed > 0 ? chalk.red(results.failed.toString()) : chalk.green('0')}`);
    console.log(`  Skipped: ${chalk.dim(results.skipped?.toString() || '0')}\n`);

    if (results.errors && results.errors.length > 0) {
      console.log(chalk.bold('Errors:'));
      results.errors.forEach(err => {
        console.log(`  ${chalk.red('✗')} ${err.node}: ${err.message}`);
      });
      console.log('');
    }

    if (results.results) {
      console.log(chalk.bold('Node Results:'));
      for (const [node, result] of Object.entries(results.results)) {
        const status = result.success ? chalk.green('✓') : chalk.red('✗');
        const time = result.duration ? ` (${result.duration}ms)` : '';
        console.log(`  ${status} ${node}${chalk.dim(time)}`);
      }
      console.log('');
    }
  }
}

module.exports = { ParallelCommand };
