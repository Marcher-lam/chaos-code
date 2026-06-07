const { ToolRegistry } = require('./tool-registry');
const { PermissionPolicy } = require('./permission-policy');
const { AgentSessionTrace } = require('./session-trace');
const { ReadOnlyToolExecutor } = require('./read-only-tools');
const { PatchTool } = require('./patch-tool');
const { TestTool } = require('./test-tool');
const { GitTool } = require('./git-tool');
const { AgentCycleRunner } = require('./cycle');
const { FixPacketBuilder } = require('./fix-packet');
const { LlmDiffProvider } = require('./llm-diff');

const STDD_NATIVE_PHASES = [
  'inspect',
  'propose',
  'spec',
  'plan',
  'patch',
  'test',
  'verify',
  'summarize',
];

class AgentKernel {
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.tools = options.tools || new ToolRegistry();
    this.policy = options.policy || new PermissionPolicy({ mode: options.mode });
    this.trace = options.trace || new AgentSessionTrace(this.cwd, options.traceOptions || {});
    this.readOnlyTools = options.readOnlyTools || new ReadOnlyToolExecutor({ cwd: this.cwd, trace: this.trace });
    this.patchTool = options.patchTool || new PatchTool({ cwd: this.cwd, trace: this.trace });
    this.testTool = options.testTool || new TestTool({ cwd: this.cwd, trace: this.trace });
    this.gitTool = options.gitTool || new GitTool({ cwd: this.cwd, trace: this.trace });
    this.fixPacketBuilder = options.fixPacketBuilder || new FixPacketBuilder({ cwd: this.cwd, trace: this.trace });
    this.llmDiffProvider = options.llmDiffProvider || new LlmDiffProvider({ cwd: this.cwd, trace: this.trace });
    this.cycleRunner = options.cycleRunner || new AgentCycleRunner({ kernel: this });
  }

  describe() {
    const tools = this.tools.list().map(tool => ({
      ...tool,
      permission: this.policy.decide(tool),
    }));
    return {
      schemaVersion: 1,
      kind: 'stdd-agent-kernel',
      cwd: this.cwd,
      phases: STDD_NATIVE_PHASES,
      tools,
    };
  }

  createPlan(goal = '', options = {}) {
    const plan = {
      schemaVersion: 1,
      goal,
      mode: this.policy.mode,
      dryRun: options.dryRun !== false,
      phases: [
        { id: 'inspect', purpose: 'Read project/STDD state before changing anything.', tools: ['stdd.status', 'stdd.recommend', 'fs.search', 'fs.read'] },
        { id: 'propose', purpose: 'Map the user goal into a change package and acceptance criteria.', tools: ['stdd.recommend'] },
        { id: 'spec', purpose: 'Keep behavior explicit before implementation.', tools: ['stdd.status'] },
        { id: 'plan', purpose: 'Break implementation into reviewable tasks.', tools: ['stdd.recommend'] },
        { id: 'patch', purpose: 'Generate patch-first code edits behind approval gates.', tools: ['fs.patch', 'git.diff'] },
        { id: 'test', purpose: 'Run configured tests and collect normalized evidence.', tools: ['test.run', 'shell.run'] },
        { id: 'verify', purpose: 'Apply STDD Constitution and verification gates.', tools: ['stdd.verify'] },
        { id: 'summarize', purpose: 'Report changes, evidence, and next actions.', tools: ['git.diff'] },
      ],
    };
    this.trace.append('plan.created', { goal, phases: plan.phases.map(phase => phase.id) });
    return plan;
  }

  executeTool(name, args = {}) {
    const tool = this.tools.get(name);
    const permission = this.policy.decide(tool);
    if (permission.decision === 'deny') {
      throw new Error(`Tool denied by policy: ${name} (${permission.reason})`);
    }
    if (permission.decision === 'ask' && !args.approved) {
      throw new Error(`Tool requires approval: ${name} (${permission.reason})`);
    }
    if (name === 'fs.read' || name === 'fs.search') {
      return this.readOnlyTools.execute(name, args);
    }
    if (name === 'fs.patch') {
      if (args.apply) return this.patchTool.apply(args);
      return this.patchTool.preview(args);
    }
    if (name === 'test.run') {
      return this.testTool.run(args);
    }
    if (name === 'git.diff') {
      return this.gitTool.diff(args);
    }
    throw new Error(`Tool execution not implemented yet: ${name}`);
  }

  runPatchCycle(args = {}) {
    return this.cycleRunner.runPatchCycle(args);
  }

  runRepairCycle(args = {}) {
    return this.cycleRunner.runRepairCycle(args);
  }

  runLlmRepair(args = {}) {
    return this.cycleRunner.runLlmRepair(args);
  }

  buildFixPacket(input = {}) {
    return this.fixPacketBuilder.build(input);
  }

  generateLlmDiff(args = {}) {
    return this.llmDiffProvider.generateDiff(args);
  }
}

module.exports = {
  AgentCycleRunner,
  AgentKernel,
  AgentSessionTrace,
  FixPacketBuilder,
  GitTool,
  LlmDiffProvider,
  PatchTool,
  PermissionPolicy,
  ReadOnlyToolExecutor,
  STDD_NATIVE_PHASES,
  TestTool,
  ToolRegistry,
};
