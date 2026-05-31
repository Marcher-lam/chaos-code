/**
 * Graph Run Command
 * Executes STDD workflow steps based on DAG graph topology.
 */

const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { createLogger } = require('../../utils/logger');
const logger = createLogger('graph-run');
const DynamicGraphRouter = require('../../utils/dynamic-router');
const { getPackageRoot } = require('../../utils/path-resolver');
const { walkFiles } = require('../../utils/file-walker');
const { parseCommand, runCommand: runParsedCommand } = require('../../utils/command-runner');
const { FFCommand } = require('./ff');
const { generateChangeName: _genChangeName } = require('../../utils/change-helpers');
const { SpecGenerator } = require('./spec-generator');
const { ApplyCommand } = require('./apply');
const { VerifyCommand } = require('./verify');
const { ArchiveCommand } = require('./archive');
const { FixPacketCommand } = require('./fix-packet');
const { OutsideInCommand } = require('./outside-in');
const { resolveWorkspace } = require('../../utils/workspace-detector');

function toPosixPath(value) {
  return String(value || '').replace(/\\/g, '/');
}

function globPatternToRegex(pattern) {
  const normalized = toPosixPath(pattern).replace(/^\.\//, '');
  let source = '^';
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const next = normalized[i + 1];
    if (char === '*' && next === '*') {
      const after = normalized[i + 2];
      if (after === '/') {
        source += '(?:.*\/)?';
        i += 2;
      } else {
        source += '.*';
        i += 1;
      }
    } else if (char === '*') {
      source += '[^/]*';
    } else if (char === '?') {
      source += '[^/]';
    } else {
      source += char.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
    }
  }
  return new RegExp(source + '$');
}

function getValueAtPath(data, jsonPath) {
  const normalized = String(jsonPath || '').trim().replace(/^\$\.?/, '');
  if (!normalized) return data;
  const parts = normalized.match(/[^.[\]]+|\[(\d+)\]/g) || [];
  let current = data;
  for (const rawPart of parts) {
    const part = rawPart.startsWith('[') ? rawPart.slice(1, -1) : rawPart;
    if (current === null || current === undefined || !Object.prototype.hasOwnProperty.call(Object(current), part)) {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

function compareValues(actual, operator, expected) {
  switch (operator || 'exists') {
    case 'exists': return actual !== undefined && actual !== null;
    case 'equals': return String(actual) === String(expected);
    case 'not_equals': return String(actual) !== String(expected);
    case 'contains': return String(actual).includes(String(expected));
    case 'matches': return new RegExp(String(expected)).test(String(actual));
    case 'greater_than': return Number(actual) > Number(expected);
    case 'less_than': return Number(actual) < Number(expected);
    case 'greater_or_equal': return Number(actual) >= Number(expected);
    case 'less_or_equal': return Number(actual) <= Number(expected);
    default: return false;
  }
}

const ALLOWED_CONDITION_COMMANDS = new Set(['npm', 'git', 'node', 'npx', 'yarn', 'pnpm']);

const NODE_COMMAND_MAP = {
  'stdd-propose': 'propose',
  'stdd-spec': 'spec',
  'stdd-plan': 'plan',
  'stdd-outside-in': 'outside-in',
  'stdd-apply': 'apply',
  'stdd-fix-packet': 'fix-packet',
  'stdd-verify': 'verify',
  'stdd-issue': 'issue',
  'stdd-archive': 'archive',
  'stdd-commit': 'commit',
  'stdd-explore': 'explore',
  'stdd-brainstorm': 'brainstorm',
  'stdd-final-doc': 'final-doc',
  'stdd-init': 'init',
};

class GraphRunCommand {
  constructor(spinner) {
    this.spinner = spinner;
    this.result = { steps: [], changeName: null, failedAt: null };
  }

  _topologicalOrder(graph) {
    const nodes = Object.keys(graph.skills || {});
    const ordered = [];
    const visited = new Set();

    function visit(node) {
      if (visited.has(node)) return;
      visited.add(node);
      const deps = graph.skills[node]?.depends_on || [];
      for (const dep of deps) {
        if (graph.skills[dep]) {
          visit(dep);
        }
      }
      ordered.push(node);
    }

    for (const node of nodes) {
      visit(node);
    }

    return ordered;
  }

  async _executeNode(nodeName, changeName, options = {}, nodeDef = null) {
    const silentSpinner = {
      text: '', start() {}, stop() {}, succeed() {}, fail() {},
    };

    switch (nodeName) {
      case 'stdd-propose': {
        if (!options.description) {
          const now = new Date();
          const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
          options.description = `graph-run-${ts}`;
        }
        const ff = new FFCommand(silentSpinner);
        await ff.execute(options.description, { changeName, ...(options.proposeOptions || {}) });
        return { status: 'success', node: nodeName };
      }

      case 'stdd-spec': {
        const generator = new SpecGenerator();
        const result = await generator.generateFromTasks(changeName);
        return { status: 'success', node: nodeName, detail: result };
      }

      case 'stdd-plan':
        return { status: 'success', node: nodeName, detail: 'plan step merged with propose/spec' };

      case 'stdd-outside-in': {
        const outsideIn = new OutsideInCommand(process.cwd());
        const registryPath = path.join(process.cwd(), 'stdd', 'tdd-registry.yaml');
        if (!fs.existsSync(registryPath)) {
          outsideIn.execute('init', undefined, { json: false });
        }
        const result = outsideIn.execute('scaffold', changeName, {
          feature: options.feature || changeName,
          json: false,
        });
        return { status: 'success', node: nodeName, detail: result };
      }

      case 'stdd-apply': {
        if (options.skipApply) {
          console.log(chalk.dim(`  [Skipping: ${nodeName}] (--skip-apply)`));
          return { status: 'skipped', node: nodeName, workspace: options.workspaceContext };
        }
        const apply = new ApplyCommand();
        await apply.execute(changeName, { ...(options.applyOptions || {}), workspace: options.workspace });
        return { status: 'success', node: nodeName, workspace: options.workspaceContext };
      }

      case 'stdd-fix-packet': {
        const packet = new FixPacketCommand(process.cwd()).execute(changeName, {
          testCommand: options.applyOptions && options.applyOptions.testCommand,
          silent: true,
        });
        return { status: 'success', node: nodeName, detail: { output: packet.output, jsonOutput: packet.jsonOutput } };
      }

      case 'stdd-verify': {
        if (options.skipApply) {
          console.log(chalk.dim(`  [Skipping: ${nodeName}] (--skip-apply implied)`));
          return { status: 'skipped', node: nodeName, workspace: options.workspaceContext };
        }
        const verify = new VerifyCommand();
        await verify.execute(changeName, { ...(options.verifyOptions || {}), workspace: options.workspace });
        return { status: 'success', node: nodeName, workspace: options.workspaceContext };
      }

      case 'stdd-issue': {
        const { IssueCommand } = require('./issue');
        const issueDesc = options.description || changeName;
        await new IssueCommand(silentSpinner).execute(issueDesc, options);
        return { status: 'success', node: nodeName };
      }
      case 'stdd-archive': {
        const archive = new ArchiveCommand();
        await archive.execute(changeName, options.archiveOptions || {});
        return { status: 'success', node: nodeName };
      }

      case 'stdd-commit': {
        const cwd = process.cwd();
        try {
          const { stdout: diffStdout } = await execAsync('git diff --cached --stat', { cwd });
          if (!diffStdout.trim()) {
            await execAsync('git add -A', { cwd });
          }
          const msg = `stdd: complete graph run for ${changeName}`;
          await execAsync(`git commit -m ${JSON.stringify(msg)} --allow-empty`, { cwd });
          return { status: 'success', node: nodeName, detail: msg };
        } catch (err) {
          return { status: 'success', node: nodeName, detail: `commit skipped: ${err.message}` };
        }
      }

      case 'stdd-type-check': {
        try {
          const { stdout, stderr } = await execAsync('npx tsc --noEmit', {
            cwd: process.cwd(),
            timeout: 120000,
          });
          if (stderr && !stdout) {
            return { status: 'success', node: nodeName, detail: stderr.trim() };
          }
          return { status: 'success', node: nodeName, detail: stdout ? stdout.trim() : 'No type errors' };
        } catch (err) {
          throw new Error(`Type check failed: ${err.message}`);
        }
      }

      case 'stdd-explore': {
        const { ExploreCommand } = require('./explore');
        const explore = new ExploreCommand();
        await explore.execute('project', { output: null, json: false });
        return { status: 'success', node: nodeName };
      }

      case 'stdd-brainstorm': {
        const { ElicitationCommand } = require('./elicitation');
        const brainstorm = new ElicitationCommand();
        const topic = options.description || changeName;
        await brainstorm.execute(topic, { method: 'first-principles', list: false, json: false });
        return { status: 'success', node: nodeName };
      }

      case 'stdd-final-doc': {
        const docPath = path.join(process.cwd(), 'stdd', 'changes', changeName, 'FINAL-DOC.md');
        const heading = `# Final Documentation: ${changeName}\n\nGenerated by graph run.\n`;
        fs.mkdirSync(path.dirname(docPath), { recursive: true });
        fs.writeFileSync(docPath, heading, 'utf8');
        console.log(chalk.green(`    Final doc written: ${path.relative(process.cwd(), docPath)}`));
        return { status: 'success', node: nodeName };
      }

      case 'stdd-init': {
        const { InitCommand } = require('./init');
        const init = new InitCommand();
        await init.execute(process.cwd(), { force: false, skipSkills: false, yes: true });
        return { status: 'success', node: nodeName };
      }

      default:
        if (nodeDef && nodeDef.command) {
          try {
            const { stdout, stderr } = await execAsync(nodeDef.command, { cwd: process.cwd() });
            return { status: 'success', node: nodeName, detail: (stdout || stderr || '').trim() };
          } catch (err) {
            throw new Error(`Custom node command failed: ${err.message}`);
          }
        }
        return { status: 'unknown', node: nodeName };
    }
  }

  async execute(intent = 'feature', options = {}) {
    const stddDir = path.join(process.cwd(), 'stdd');
    if (!fs.existsSync(stddDir)) {
      throw new Error('STDD not initialized. Run `stdd init` first.');
    }

    let graph;
    let nodes;

    const isYaml = String(intent).endsWith('.yaml') || String(intent).endsWith('.yml') || fs.existsSync(path.resolve(process.cwd(), intent));
    if (isYaml) {
      const { WorkflowDslInterpreter } = require('../../utils/workflow-dsl-interpreter');
      const interpreter = new WorkflowDslInterpreter(process.cwd());
      const loaded = interpreter.load(intent);
      graph = interpreter.compile(loaded);
      nodes = graph.steps;
    } else {
      let router;
      try {
        router = new DynamicGraphRouter();
      } catch (error) {
        throw new Error(`Failed to initialize graph router: ${error.message}`);
      }
      graph = router.compile(intent);
      this._applyConditions(graph);
      nodes = this._topologicalOrder(graph);
    }

    if (nodes.length === 0) {
      throw new Error(`No nodes found for intent '${intent}'.`);
    }

    const changeName = options.changeName || this._generateChangeName(intent);
    options.changeName = changeName;
    this.result.changeName = changeName;

    if (options.workspace) {
      const workspace = resolveWorkspace(process.cwd(), options.workspace);
      if (!workspace) {
        throw new Error(`Workspace '${options.workspace}' not found.`);
      }
      options.workspace = workspace;
      options.workspaceContext = {
        name: workspace.name,
        path: path.relative(process.cwd(), workspace.root).replace(/\\/g, '/') || workspace.name,
        sourceDir: path.relative(process.cwd(), workspace.sourceDir).replace(/\\/g, '/'),
      };
      this.result.workspace = options.workspaceContext;
    }

    console.log(chalk.bold(`\n🚀 Graph Run: ${chalk.cyan(graph.name)}`));
    console.log(chalk.dim(`  Intent: ${intent} | Change: ${changeName}`));
    if (options.workspaceContext) {
      console.log(chalk.dim(`  Workspace: ${options.workspaceContext.name} (${options.workspaceContext.path})`));
    }
    console.log(chalk.dim(`  Steps: ${nodes.length}\n`));

    for (const nodeName of nodes) {
      const label = NODE_COMMAND_MAP[nodeName] || nodeName;
      console.log(chalk.yellow(`  [Executing: ${label}]`));

      try {
        const nodeDef = graph.skills && graph.skills[nodeName];
        const result = await this._executeNode(nodeName, changeName, options, nodeDef);
        this.result.steps.push({ node: nodeName, command: label, ...result });

        if (result.status === 'success') {
          console.log(chalk.green(`    ✓ ${label} completed`));
        } else if (result.status === 'skipped') {
          console.log(chalk.dim(`    ⊘ ${label} skipped`));
        } else {
          console.log(chalk.yellow(`    ? ${label} unknown`));
        }
      } catch (error) {
        this.result.steps.push({ node: nodeName, command: label, status: 'failed', error: error.message });
        this.result.failedAt = nodeName;
        console.log(chalk.red(`    ✗ ${label} failed: ${error.message}`));
        console.log(chalk.red(`\n  Graph run aborted at ${nodeName}.`));
        process.exitCode = 1;
        return this.result;
      }
    }

    console.log(chalk.green(`\n  Graph run completed for ${changeName}.`));
    return this.result;
  }

  _generateChangeName(intent) {
    const now = new Date();
    const yyyy = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const HH = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `graph-${intent}-${yyyy}${MM}${dd}-${HH}${mm}`;
  }

  _loadConditions() {
    const conditionsPath = path.join(getPackageRoot(), 'stdd', 'graph', 'conditions.json');
    try {
      if (fs.existsSync(conditionsPath)) {
        const content = fs.readFileSync(conditionsPath, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.log(chalk.dim(`  [Warning: Failed to load conditions.json: ${error.message}]`));
    }
    return { rules: [] };
  }

  _applyConditions(graph) {
    const conditions = this._loadConditions();
    if (!conditions.rules || conditions.rules.length === 0) {
      return;
    }

    console.log(chalk.cyan('  [Evaluating condition rules...]'));

    for (const rule of conditions.rules) {
      if (!rule.if || !rule.then || !rule.then.inject_node) {
        continue;
      }

      const condition = rule.if;
      const injectNode = rule.then.inject_node;
      const afterNode = rule.then.after;

      if (graph.skills && graph.skills[injectNode]) {
        continue;
      }

      if (this._evaluateCondition(condition)) {
        console.log(chalk.green(`  [Condition met: injecting node '${injectNode}' after '${afterNode}']`));

        if (!graph.skills) {
          graph.skills = {};
        }

        const originalDependents = [];
        if (afterNode) {
          for (const [name, node] of Object.entries(graph.skills)) {
            if (name === injectNode || name === afterNode) continue;
            if (node.depends_on && node.depends_on.includes(afterNode)) {
              originalDependents.push(name);
            }
          }
        }
        const dependsOn = afterNode && graph.skills[afterNode] ? [afterNode] : [];
        graph.skills[injectNode] = {
          description: `Condition-injected node: ${injectNode}`,
          phase: 'verify',
          depends_on: dependsOn,
          metadata: { priority: 'high', category: 'condition', injected: true },
        };

        if (afterNode) {
          for (const [name, node] of Object.entries(graph.skills)) {
            if (name === injectNode || name === afterNode) continue;
            if (node.depends_on && node.depends_on.includes(afterNode) && originalDependents.includes(name)) {
              node.depends_on = node.depends_on.filter(d => d !== afterNode);
              node.depends_on.push(injectNode);
            }
          }
        }
      }
    }
  }

  _evaluateCondition(condition) {
    if (!condition || typeof condition !== 'object') return false;

    if (condition.all) return Array.isArray(condition.all) && condition.all.every(item => this._evaluateCondition(item));
    if (condition.any) return Array.isArray(condition.any) && condition.any.some(item => this._evaluateCondition(item));
    if (condition.not) return !this._evaluateCondition(condition.not);

    if (condition.has_file) {
      const filePath = path.join(process.cwd(), condition.has_file);
      return fs.existsSync(filePath);
    }

    if (condition.has_file_pattern || condition.file_pattern) {
      return this._evaluateFilePattern(condition.has_file_pattern || condition.file_pattern);
    }

    if (condition.has_dependency) {
      const pkgPath = path.join(process.cwd(), 'package.json');
      if (!fs.existsSync(pkgPath)) return false;
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const deps = {
          ...(pkg.dependencies || {}),
          ...(pkg.devDependencies || {}),
          ...(pkg.peerDependencies || {}),
          ...(pkg.optionalDependencies || {}),
        };
        return condition.has_dependency in deps;
      } catch (err) {
        logger.warn(err.message);
        return false;
      }
    }

    if (condition.variable || condition.env) {
      return this._evaluateVariable(condition.variable || condition.env, condition);
    }

    if (condition.json_path) {
      return this._evaluateJsonPath(condition.json_path, condition);
    }

    if (condition.command) {
      return this._evaluateCommand(condition.command, condition);
    }

    if (condition.git_branch) {
      return this._evaluateGitBranch(condition.git_branch, condition);
    }

    if (condition.git_status) {
      return this._evaluateGitStatus(condition.git_status, condition);
    }

    return false;
  }

  _evaluateFilePattern(pattern) {
    if (!pattern) return false;
    const regex = globPatternToRegex(pattern);
    return walkFiles(process.cwd()).some(file => regex.test(toPosixPath(path.relative(process.cwd(), file))));
  }

  _evaluateVariable(name, condition) {
    const value = process.env[String(name)];
    return compareValues(value, condition.operator, condition.value);
  }

  _evaluateJsonPath(config, condition) {
    const file = typeof config === 'string' ? config : config.file;
    const query = typeof config === 'string' ? condition.path : config.path;
    if (!file || !query) return false;

    try {
      const content = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
      const value = getValueAtPath(JSON.parse(content), query);
      const operator = condition.operator || config.operator;
      const expected = Object.prototype.hasOwnProperty.call(condition, 'value') ? condition.value : config.value;
      return compareValues(value, operator, expected);
    } catch (err) {
      logger.warn(err.message);
      return false;
    }
  }

  _evaluateCommand(command, condition) {
    try {
      const { bin } = parseCommand(command, 'Condition command');
      if (!ALLOWED_CONDITION_COMMANDS.has(bin)) return false;
      const result = runParsedCommand(command, { cwd: process.cwd(), stdio: 'pipe', timeout: condition.timeout || 30000 });
      const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
      if (condition.operator) return compareValues(output, condition.operator, condition.value);
      return result.status === 0;
    } catch (err) {
      logger.warn(err.message);
      return false;
    }
  }

  _evaluateGitBranch(expected, condition) {
    try {
      const result = runParsedCommand('git branch --show-current', { cwd: process.cwd(), stdio: 'pipe', timeout: 10000 });
      if (result.status !== 0) return false;
      return compareValues(String(result.stdout || '').trim(), condition.operator || 'equals', expected);
    } catch (err) {
      logger.warn(err.message);
      return false;
    }
  }

  _evaluateGitStatus(expected, condition) {
    try {
      const result = runParsedCommand('git status --porcelain', { cwd: process.cwd(), stdio: 'pipe', timeout: 10000 });
      if (result.status !== 0) return false;
      const clean = String(result.stdout || '').trim().length === 0;
      const value = expected === 'clean' ? clean : !clean;
      return condition.operator ? compareValues(value, condition.operator, condition.value) : value;
    } catch (err) {
      logger.warn(err.message);
      return false;
    }
  }
}

module.exports = { GraphRunCommand, NODE_COMMAND_MAP };
