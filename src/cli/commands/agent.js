const chalk = require('chalk');
const { AgentKernel } = require('../../runtime/agent-kernel');

class AgentCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
  }

  async execute(goalParts = [], options = {}) {
    const goal = Array.isArray(goalParts) ? goalParts.join(' ').trim() : String(goalParts || '').trim();
    const kernel = new AgentKernel({ cwd: this.cwd, mode: options.mode });

    if (options.listTools) {
      const description = kernel.describe();
      if (options.json) {
        console.log(JSON.stringify(description.tools, null, 2));
        return description.tools;
      }
      console.log(chalk.bold('STDD Agent tool catalog'));
      for (const tool of description.tools) {
        console.log(`  ${tool.name} [${tool.risk}] -> ${tool.permission.decision}`);
      }
      return description.tools;
    }

    if (options.read) {
      const result = kernel.executeTool('fs.read', { path: options.read });
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(result.content);
      }
      return result;
    }

    if (options.search) {
      const result = kernel.executeTool('fs.search', {
        query: options.search,
        path: options.path || '.',
        maxResults: options.limit,
      });
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        for (const item of result.results) {
          console.log(`${item.path}:${item.line}: ${item.text}`);
        }
      }
      return result;
    }

    if (options.patchPreview) {
      const result = kernel.executeTool('fs.patch', { file: options.patchPreview, approved: true });
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(chalk.bold('Patch preview requires approval before apply'));
        for (const file of result.files) {
          console.log(`  ${file.path}: +${file.additions} -${file.deletions}`);
        }
      }
      return result;
    }

    if (options.patchApply) {
      const result = kernel.executeTool('fs.patch', { file: options.patchApply, approved: true, apply: true });
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(chalk.bold('Patch applied'));
        for (const file of result.files) {
          console.log(`  ${file.path}: +${file.additions} -${file.deletions}`);
        }
      }
      return result;
    }

    if (options.testRun) {
      const result = kernel.executeTool('test.run', {
        command: options.testCommand,
        workspace: options.workspace,
        timeout: options.timeout,
      });
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else if (result.status === 'skipped') {
        console.log(chalk.yellow(result.reason));
      } else {
        console.log(chalk.bold(`Tests: ${result.status}`));
        for (const item of result.results) {
          const marker = item.passed ? chalk.green('PASS') : chalk.red('FAIL');
          console.log(`  ${marker} ${item.cwd}: ${item.command}`);
        }
      }
      return result;
    }

    if (options.gitDiff) {
      const result = kernel.executeTool('git.diff', { patch: options.patch, maxBytes: options.maxBytes });
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else if (result.status !== 'ok') {
        console.log(chalk.yellow(result.reason));
      } else {
        console.log(chalk.bold(`Git dirty: ${result.dirty ? 'yes' : 'no'}`));
        if (result.statusShort) console.log(result.statusShort.trimEnd());
        if (result.diffStat) console.log(result.diffStat.trimEnd());
        if (result.diff) console.log(result.diff.trimEnd());
      }
      return result;
    }

    if (options.fixPacket) {
      const git = kernel.executeTool('git.diff', { patch: options.patch, maxBytes: options.maxBytes });
      const packet = kernel.buildFixPacket({
        source: 'stdd.agent.fix-packet',
        goal: goal || null,
        git,
        summary: { status: 'needs-fix', filesChanged: [], additions: 0, deletions: 0 },
      });
      if (options.writePrompt) {
        packet.output = kernel.fixPacketBuilder.write(packet);
      }
      if (options.json) console.log(JSON.stringify(packet, null, 2));
      else {
        console.log(chalk.bold('Agent fix packet'));
        console.log(`  Status: ${packet.status}`);
        console.log(`  Git: ${packet.git ? packet.git.status : 'none'}`);
      }
      return packet;
    }

    if (options.cycle) {
      const result = kernel.runPatchCycle({
        patchFile: options.patchFile,
        testCommand: options.testCommand,
        workspace: options.workspace,
        timeout: options.timeout,
        includePatch: options.patch,
        maxBytes: options.maxBytes,
      });
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        const marker = result.status === 'pass' ? chalk.green('PASS') : chalk.red('FAIL');
        console.log(chalk.bold(`Agent cycle: ${marker}`));
        console.log(`  Files: ${result.summary.filesChanged.join(', ') || '(none)'}`);
        console.log(`  Patch: +${result.summary.additions} -${result.summary.deletions}`);
        console.log(`  Tests: ${result.summary.testsStatus}`);
      }
      return result;
    }

    if (options.repair) {
      const result = kernel.runRepairCycle({
        patchFile: options.patchFile,
        testCommand: options.testCommand,
        workspace: options.workspace,
        timeout: options.timeout,
        includePatch: options.patch,
        maxBytes: options.maxBytes,
      });
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        const marker = result.status === 'pass' ? chalk.green('PASS') : chalk.red('FAIL');
        console.log(chalk.bold(`Agent repair: ${marker}`));
        console.log(`  Files: ${result.summary.filesChanged.join(', ') || '(none)'}`);
        console.log(`  Patch: +${result.summary.additions} -${result.summary.deletions}`);
        console.log(`  Tests: ${result.summary.testsStatus}`);
      }
      return result;
    }

    const plan = kernel.createPlan(goal || 'No goal provided', { dryRun: options.dryRun !== false });
    if (options.json) {
      console.log(JSON.stringify(plan, null, 2));
      return plan;
    }

    console.log(chalk.bold('STDD native agent preview'));
    console.log(`Goal: ${plan.goal}`);
    console.log(`Mode: ${plan.mode}`);
    console.log(`Dry run: ${plan.dryRun ? 'yes' : 'no'}`);
    console.log('Phases:');
    for (const phase of plan.phases) {
      console.log(`  ${phase.id}: ${phase.purpose}`);
    }
    console.log(chalk.dim('This command exposes the future agent kernel contract; it does not edit files yet.'));
    return plan;
  }
}

module.exports = { AgentCommand };
