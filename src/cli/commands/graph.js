const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');
const chalk = require('chalk');
const DynamicGraphRouter = require('../../utils/dynamic-router');
const HeterogeneousAdapter = require('../../utils/heterogeneous-adapter');
const ParallelExecutor = require('../../utils/parallel-executor');
const { GraphHistoryCommand } = require('./graph-history');
const { RecommendEngine, printRecommendations } = require('./recommend');
const { GraphRunCommand } = require('./graph-run');

function compileGraph(intent = 'feature') {
  const router = new DynamicGraphRouter();
  return router.compile(intent);
}

function getEdges(graph) {
  const edges = [];
  for (const [nodeName, nodeDef] of Object.entries(graph.skills || {})) {
    for (const dep of nodeDef.depends_on || []) {
      edges.push({ from: dep, to: nodeName });
    }
  }
  return edges;
}

function getLayers(graph) {
  const executor = new ParallelExecutor(graph, new HeterogeneousAdapter(), {
    maxParallel: graph.config?.max_parallel || 4,
  });
  return executor._topologicalLayers();
}

function buildMermaid(graph) {
  const lines = ['graph TD'];
  const nodes = Object.keys(graph.skills || {});
  const edges = getEdges(graph);

  if (nodes.length === 0) {
    lines.push('  empty[No graph nodes]');
    return lines.join('\n');
  }

  for (const node of nodes) {
    lines.push(`  ${sanitizeMermaidId(node)}["${node}"]`);
  }

  for (const edge of edges) {
    lines.push(`  ${sanitizeMermaidId(edge.from)} --> ${sanitizeMermaidId(edge.to)}`);
  }

  return lines.join('\n');
}

function sanitizeMermaidId(value) {
  return String(value).replace(/[^a-zA-Z0-9_]/g, '_');
}

function getGraphHtmlTemplatePath() {
  const projectRoot = path.resolve(__dirname, '../../..');
  return path.join(projectRoot, 'stdd', 'templates', 'graph.html');
}

function openInBrowser(filePath) {
  const platform = os.platform();
  let command;
  let args;
  if (platform === 'darwin') {
    command = 'open';
    args = [filePath];
  } else if (platform === 'win32') {
    command = 'cmd';
    args = ['/c', 'start', '', filePath];
  } else {
    command = 'xdg-open';
    args = [filePath];
  }
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'ignore', detached: false, shell: false });
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

async function renderHtml(mermaidCode) {
  const templatePath = getGraphHtmlTemplatePath();
  const template = fs.readFileSync(templatePath, 'utf8');
  return template.replace('{{MERMAID_CODE}}', mermaidCode);
}

function writeOrPrint(content, outputPath) {
  if (outputPath) {
    fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
    fs.writeFileSync(outputPath, content);
    console.log(`Graph output written to ${outputPath}`);
    return;
  }
  console.log(content);
}

function formatAnalyze(graph) {
  const nodes = Object.keys(graph.skills || {});
  const edges = getEdges(graph);
  const dependedOn = new Set(edges.map(edge => edge.from));
  const entryNodes = nodes.filter(node => (graph.skills[node].depends_on || []).length === 0);
  const terminalNodes = nodes.filter(node => !dependedOn.has(node));
  const layers = getLayers(graph);

  return [
    chalk.bold(`Graph: ${graph.name || 'STDD Graph'}`),
    `Nodes: ${nodes.length}`,
    `Edges: ${edges.length}`,
    `Entry nodes: ${entryNodes.join(', ') || '(none)'}`,
    `Terminal nodes: ${terminalNodes.join(', ') || '(none)'}`,
    `Parallel layers: ${layers.length}`,
    ...layers.map((layer, index) => `  Layer ${index}: ${layer.join(', ')}`),
  ].join('\n');
}

function formatParallelLayers(graph) {
  const layers = getLayers(graph);
  return [
    chalk.bold('Parallelizable layers'),
    ...layers.map((layer, index) => `Layer ${index}: ${layer.join(', ')}`),
  ].join('\n');
}

function graphCommand(program) {
  const graph = program
    .command('graph')
    .description('Inspect the STDD skill graph')
    .addHelpText('after', `
Examples:
  stdd graph visualize
  stdd graph visualize --format json
  stdd graph analyze
  stdd graph parallel --detect
  stdd graph history
  stdd graph history --json
  stdd graph replay <id>
  stdd graph recommend
  stdd graph recommend add-dark-mode

Currently implemented: visualize, analyze, parallel --detect, history, replay, run, recommend.
`);

  graph
    .command('visualize')
    .description('Print the compiled graph as Mermaid, JSON, or open in browser')
    .option('--intent <intent>', 'Graph intent: feature, hotfix, research', 'feature')
    .option('--format <format>', 'Output format: mermaid, json, or html', 'mermaid')
    .option('--output <file>', 'Write output to file')
    .action(async (options = {}) => {
      const compiled = compileGraph(options.intent);
      const format = String(options.format || 'mermaid').toLowerCase();

      if (format === 'json') {
        const payload = {
          name: compiled.name,
          nodes: Object.keys(compiled.skills || {}),
          edges: getEdges(compiled),
        };
        writeOrPrint(JSON.stringify(payload, null, 2), options.output);
        return;
      }

      if (format === 'html') {
        try {
          const mermaidCode = buildMermaid(compiled);
          const htmlContent = await renderHtml(mermaidCode);
          const timestamp = Date.now();
          const outputPath = options.output || path.join(os.tmpdir(), `stdd-graph-${timestamp}.html`);
          fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
          fs.writeFileSync(outputPath, htmlContent, 'utf8');
          await openInBrowser(outputPath);
          console.log(chalk.green('\u{1F9FF} Graph visualization opened in browser.'));
        } catch (error) {
          console.error(chalk.red(`Error opening graph visualization: ${error.message}`));
          process.exit(1);
        }
        return;
      }

      if (format !== 'mermaid') {
        console.error(chalk.red(`Unsupported graph format: ${options.format}`));
        process.exit(1);
      }

      writeOrPrint(buildMermaid(compiled), options.output);
    });

  graph
    .command('analyze')
    .description('Print graph node, edge, entry, terminal, and layer summary')
    .option('--intent <intent>', 'Graph intent: feature, hotfix, research', 'feature')
    .action((options = {}) => {
      console.log(formatAnalyze(compileGraph(options.intent)));
    });

  graph
    .command('parallel')
    .description('Inspect graph parallelization opportunities')
    .option('--intent <intent>', 'Graph intent: feature, hotfix, research', 'feature')
    .option('--detect', 'Detect parallelizable layers')
    .action((options = {}) => {
      if (!options.detect) {
        console.error(chalk.red('Only `stdd graph parallel --detect` is implemented currently.'));
        process.exit(1);
      }
      console.log(formatParallelLayers(compileGraph(options.intent)));
    });

  graph
    .command('history')
    .description('View execution history from evidence files')
    .option('--json', 'Output as JSON')
    .option('--change <name>', 'Filter by change name')
    .option('--workspace <workspace>', 'Filter by workspace (path or package name)')
    .action((options = {}) => {
      try {
        const historyCommand = new GraphHistoryCommand();
        historyCommand.list(options);
      } catch (error) {
        console.error(chalk.red(`Error: ${error.message}`));
        process.exit(1);
      }
    });

  graph
    .command('replay <id>')
    .description('Show details or re-run a past execution')
    .option('--json', 'Output as JSON')
    .option('--verbose', 'Show full results (default: true)')
    .option('--no-verbose', 'Hide results detail')
    .action((id, options = {}) => {
      try {
        const historyCommand = new GraphHistoryCommand();
        historyCommand.replay(id, options);
      } catch (error) {
        console.error(chalk.red(`Error: ${error.message}`));
        process.exit(1);
      }
    });

  graph
    .command('run')
    .description('Execute the full STDD workflow based on intent DAG')
    .option('--intent <intent>', 'Graph intent: feature, hotfix, research', 'feature')
    .option('--change-name <name>', 'Custom change name')
    .option('--workspace <workspace>', 'Run with workspace context (path or package name)')
    .option('--skip-apply', 'Skip apply and verify steps (spec generation only)')
    .addHelpText('after', `
Examples:
  stdd graph run
  stdd graph run --intent hotfix
  stdd graph run --intent repair --change-name existing-change
  stdd graph run --intent feature --skip-apply
  stdd graph run --change-name my-change
  stdd graph run --workspace packages/api

Executes nodes in topological order. Feature intent includes outside-in scaffolding; repair intent starts with fix-packet evidence.
`)
    .action((options = {}) => {
      try {
        const runCommand = new GraphRunCommand();
        runCommand.execute(options.intent, {
          changeName: options.changeName,
          skipApply: options.skipApply,
          workspace: options.workspace,
        }).catch((error) => {
          console.error(chalk.red(`Error: ${error.message}`));
          process.exit(1);
        });
      } catch (error) {
        console.error(chalk.red(`Error: ${error.message}`));
        process.exit(1);
      }
    });

  graph
    .command('recommend [change]')
    .description('Recommend the next step based on project state')
    .option('--json', 'Output as JSON')
    .option('--workspace <workspace>', 'Recommend for a workspace (path or package name)')
    .action((changeName, options = {}) => {
      try {
        const engine = new RecommendEngine(process.cwd());
        const recs = engine.recommend(changeName, { workspace: options.workspace });

        if (options.json) {
          console.log(JSON.stringify(recs, null, 2));
          return;
        }

        printRecommendations(recs);
      } catch (error) {
        console.error(chalk.red(`Error: ${error.message}`));
        process.exit(1);
      }
    });
}

module.exports = graphCommand;
