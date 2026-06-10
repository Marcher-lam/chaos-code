const readline = require('readline');
const chalk = require('chalk');
const { ChaosAgentLoop } = require('../../runtime/agent-kernel/chaos-agent-loop');
const { AgentKernel } = require('../../runtime/agent-kernel/index');

const VERSION = require('../../../package.json').version;

function printBanner() {
  const line1 = '  █████ ██ ██ █████ █████ █████   █████ █████ ████  █████';
  const line2 = '  ██    ██ ██ ██ ██ ██ ██ ██      ██    ██ ██ ██ ██ ██   ';
  const line3 = '  ██    █████ █████ ██ ██ █████   ██    ██ ██ ██ ██ █████';
  const line4 = '  ██    ██ ██ ██ ██ ██ ██    ██   ██    ██ ██ ██ ██ ██   ';
  const line5 = '  █████ ██ ██ ██ ██ █████ █████   █████ █████ ████  █████';

  console.log('\n' + chalk.magenta(line1));
  console.log(chalk.magenta(line2));
  console.log(chalk.cyan(line3));
  console.log(chalk.cyan(line4));
  console.log(chalk.green(line5) + '\n');
  
  console.log(`  ${chalk.bold.white('🤖 CHAOS CODE')} ${chalk.dim('—')} ${chalk.gray('Spec + Test Driven AI Copilot')} ${chalk.cyan('(v' + VERSION + ')')}`);
  console.log(`  ${chalk.dim('✨ Type')} ${chalk.yellow('/help')} ${chalk.dim('for slash commands,')} ${chalk.yellow('/exit')} ${chalk.dim('or')} ${chalk.yellow('ctrl+d')} ${chalk.dim('to quit.')}\n`);
}

async function askConfirm(question) {
  return new Promise((resolve) => {
    const rlTemp = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rlTemp.question(chalk.bold.yellow(`❓ ${question} (y/n): `), (answer) => {
      rlTemp.close();
      const val = answer.trim().toLowerCase();
      resolve(val === 'y' || val === 'yes');
    });
  });
}

function formatStatus(status) {
  console.log(chalk.bold.cyan('\n⚙️  STDD Status:'));
  if (!status) {
    console.log('  No status available.');
    return;
  }
  console.log(`  Active Change: ${status.activeChange ? chalk.green(status.activeChange) : chalk.dim('None')}`);
  console.log(`  TDD Phase:     ${status.tddPhase ? chalk.yellow(status.tddPhase) : chalk.dim('None')}`);
  console.log(`  Specs Count:   ${status.specsCount || 0}`);
  console.log(`  Changes Count: ${status.changesCount || 0}`);
  console.log('');
}

async function launchChaosTerminal() {
  printBanner();
  
  const agentLoop = new ChaosAgentLoop();
  const kernel = new AgentKernel({ cwd: process.cwd() });
  let chatHistory = [];
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.bold.cyan('chaos > ')
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      rl.prompt();
      return;
    }

    if (trimmed.startsWith('/')) {
      const parts = trimmed.split(' ');
      const command = parts[0].toLowerCase();
      
      switch (command) {
        case '/exit':
        case '/quit':
          console.log(chalk.bold.yellow('\nGoodbye!'));
          rl.close();
          process.exit(0);
          break;

        case '/help':
          console.log(chalk.bold('\n📚 Available Slash Commands:'));
          console.log(`  ${chalk.cyan('/status')}      - Check active STDD change state`);
          console.log(`  ${chalk.cyan('/recommend')}   - Recommend next STDD workflow step`);
          console.log(`  ${chalk.cyan('/verify')}      - Run STDD verification suite`);
          console.log(`  ${chalk.cyan('/doctor')}      - Run project health checks`);
          console.log(`  ${chalk.cyan('/model [name]')} - View or switch active LLM model`);
          console.log(`  ${chalk.cyan('/diff')}        - Show current git status and patch diff`);
          console.log(`  ${chalk.cyan('/commit')}      - Interactive stage & commit current changes`);
          console.log(`  ${chalk.cyan('/rollback')}    - Rollback and discard modifications in this session`);
          console.log(`  ${chalk.cyan('/compact')}      - Compact conversation history to save tokens`);
          console.log(`  ${chalk.cyan('/cost')}         - View current session token usage & cost`);
          console.log(`  ${chalk.cyan('/session')}      - View session details (provider, model, cost)`);
          console.log(`  ${chalk.cyan('/reset')}       - Reset the active conversation history`);
          console.log(`  ${chalk.cyan('/clear')}       - Clear the terminal screen`);
          console.log(`  ${chalk.cyan('/exit')}        - Exit Chaos Terminal\n`);
          break;

        case '/clear':
          console.clear();
          break;

        case '/diff':
          try {
            console.log(chalk.dim('\nRunning git diff...'));
            const diffRes = kernel.executeTool('git.diff', { patch: true, maxBytes: 8000 });
            if (diffRes.dirty) {
              console.log(chalk.bold.cyan('\n📂 Git Status & Diff:'));
              console.log(diffRes.statusShort);
              console.log(chalk.bold.blue('--- Patch Preview ---'));
              console.log(diffRes.diff || chalk.dim('(Diff too large or empty)'));
            } else {
              console.log(chalk.green('\n✓ No modifications (working tree clean).\n'));
            }
          } catch (err) {
            console.log(chalk.red(`Error: ${err.message}`));
          }
          break;

        case '/commit':
          try {
            console.log(chalk.dim('\nChecking workspace changes...'));
            const diffRes = kernel.executeTool('git.diff', { patch: false });
            if (!diffRes.dirty) {
              console.log(chalk.yellow('\nNo changes to commit.\n'));
              break;
            }
            
            rl.pause();
            const msg = await new Promise((resolve) => {
              const rlTemp = readline.createInterface({
                input: process.stdin,
                output: process.stdout
              });
              rlTemp.question(chalk.bold.yellow('✍️  Enter commit message (or press Enter for "refactor: auto-update"): '), (answer) => {
                rlTemp.close();
                resolve(answer.trim() || 'refactor: auto-update');
              });
            });
            rl.resume();
            
            console.log(chalk.dim('\nStaging changes...'));
            kernel.executeTool('git.add', { files: '.' });
            
            console.log(chalk.dim('Committing changes...'));
            const commitRes = kernel.executeTool('git.commit', { message: msg });
            if (commitRes.status === 'ok') {
              console.log(chalk.green(`\n✓ Successfully committed with message: "${msg}"\n`));
            } else {
              console.log(chalk.red(`\n✗ Commit failed: ${commitRes.stderr || 'Unknown error'}\n`));
            }
          } catch (err) {
            console.log(chalk.red(`Error: ${err.message}`));
          }
          break;

        case '/rollback':
          try {
            console.log(chalk.dim('\nChecking workspace changes...'));
            const diffRes = kernel.executeTool('git.diff', { patch: false });
            if (!diffRes.dirty) {
              console.log(chalk.yellow('\nNo changes to rollback.\n'));
              break;
            }
            
            const confirmed = await askConfirm('Are you sure you want to discard all uncommitted changes?');
            if (confirmed) {
              console.log(chalk.dim('\nDiscarding uncommitted changes...'));
              const resetRes = kernel.executeTool('git.reset', { hard: true });
              if (resetRes.status === 'ok') {
                console.log(chalk.green('\n✓ Working directory successfully rolled back.\n'));
              } else {
                console.log(chalk.red(`\n✗ Rollback failed: ${resetRes.stderr || 'Unknown error'}\n`));
              }
            } else {
              console.log(chalk.yellow('\nRollback cancelled.\n'));
            }
          } catch (err) {
            console.log(chalk.red(`Error: ${err.message}`));
          }
          break;

        case '/status':
          try {
            const status = kernel.executeTool('stdd.status');
            formatStatus(status);
          } catch (err) {
            console.log(chalk.red(`Error: ${err.message}`));
          }
          break;

        case '/recommend':
          try {
            const rec = kernel.executeTool('stdd.recommend');
            console.log(chalk.bold.cyan('\n💡 Recommendation:'));
            console.log(`  ${rec.message || JSON.stringify(rec)}\n`);
          } catch (err) {
            console.log(chalk.red(`Error: ${err.message}`));
          }
          break;

        case '/verify':
          try {
            console.log(chalk.dim('\nRunning verification...'));
            const res = await kernel.executeTool('stdd.verify');
            console.log(chalk.green('\n✓ Verification Complete:'));
            console.log(res.output || JSON.stringify(res, null, 2));
            console.log('');
          } catch (err) {
            console.log(chalk.red(`Error: ${err.message}`));
          }
          break;

        case '/doctor':
          try {
            console.log(chalk.dim('\nRunning doctor check...'));
            const res = kernel.runDoctor();
            console.log(chalk.bold.cyan('\n🏥 Doctor Report:'));
            for (const item of res) {
              const statusColor = item.status === 'ok' ? chalk.green('PASS') : chalk.red('FAIL');
              console.log(`  [${statusColor}] ${item.id}`);
            }
            console.log('');
          } catch (err) {
            console.log(chalk.red(`Error: ${err.message}`));
          }
          break;

        case '/model': {
          const newModel = parts.slice(1).join(' ').trim();
          if (newModel) {
            agentLoop.setModel(newModel);
            console.log(chalk.green(`\n✓ Active model switched to: ${chalk.bold(agentLoop.getModel())} (${agentLoop.getProvider()})\n`));
          } else {
            console.log(`\nActive Model: ${chalk.bold(agentLoop.getModel())} (Provider: ${agentLoop.getProvider()})\n`);
          }
          break;
        }

        case '/compact': {
          const oldLen = chatHistory.length;
          chatHistory = agentLoop.compactHistory(chatHistory);
          console.log(chalk.green(`\n✓ Compacted conversation history from ${oldLen} to ${chatHistory.length} messages.\n`));
          break;
        }

        case '/cost': {
          const costStats = agentLoop.getSessionStats();
          console.log(chalk.bold.cyan('\n💸 Session Token Usage & Cost:'));
          console.log(`  Prompt Tokens:     ${costStats.promptTokens}`);
          console.log(`  Completion Tokens: ${costStats.completionTokens}`);
          console.log(`  Total Tokens:      ${costStats.totalTokens}`);
          console.log(`  Estimated Cost:    $${costStats.cost.toFixed(6)}\n`);
          break;
        }

        case '/session': {
          const sessionStats = agentLoop.getSessionStats();
          console.log(chalk.bold.cyan('\n📋 Session Info:'));
          console.log(`  Provider:       ${sessionStats.provider}`);
          console.log(`  Model:          ${sessionStats.model}`);
          console.log(`  Messages Count: ${chatHistory.length}`);
          console.log(`  Total Tokens:   ${sessionStats.totalTokens}`);
          console.log(`  Total Cost:     $${sessionStats.cost.toFixed(6)}\n`);
          break;
        }

        case '/reset':
          chatHistory = [];
          console.log(chalk.green('\n✓ Conversation history reset.\n'));
          break;

        default:
          console.log(chalk.red(`\nUnknown command: ${command}. Type /help for list of commands.\n`));
      }
      rl.prompt();
      return;
    }

    // Process prompt via ChaosAgentLoop
    rl.pause();
    
    const callbacks = {
      onMessage: (msg) => {
        process.stdout.write(msg);
      },
      onToolStart: (name, args) => {
        console.log(chalk.bold.blue(`\n🛠️  Running tool: ${name}`));
        if (args && Object.keys(args).length > 0) {
          console.log(chalk.dim(`   Args: ${JSON.stringify(args)}`));
        }
      },
      onToolEnd: (name, res) => {
        console.log(chalk.bold.green(`✓ Tool ${name} finished.`));
      },
      askPermission: async (name, args) => {
        let details = '';
        if (name === 'fs_patch') details = `Apply diff modifications`;
        else if (name === 'shell_run') details = `Execute command: "${args.command}"`;
        else if (name === 'test_run') details = `Run tests`;
        else if (name === 'stdd_verify') details = `Run verification`;
        else if (name === 'git_add') details = `Stage files`;
        else if (name === 'git_commit') details = `Commit: "${args.message}"`;
        else if (name === 'git_push') details = `Push to ${args.remote || 'origin'}/${args.branch || 'main'}`;
        else if (name === 'git_checkout') details = `Checkout branch: "${args.branch}"`;
        else if (name === 'git_branch') details = `Create branch: "${args.name}"`;
        else if (name === 'git_reset') details = `Reset working directory (hard: ${!!args.hard})`;
        
        return askConfirm(`Allow tool ${chalk.bold.cyan(name)} (${details})?`);
      }
    };

    console.log('');
    try {
      chatHistory = await agentLoop.run(trimmed, chatHistory, callbacks);
      console.log('\n');
    } catch (err) {
      console.log(chalk.red(`\nExecution Error: ${err.message}\n`));
    }
    
    rl.resume();
    rl.prompt();
  });

  rl.on('close', () => {
    console.log(chalk.bold.yellow('\nGoodbye!'));
    process.exit(0);
  });
}

async function runChaosAgentPrompt(prompt) {
  const agentLoop = new ChaosAgentLoop();
  
  const callbacks = {
    onMessage: (msg) => {
      process.stdout.write(msg);
    },
    onToolStart: (name, args) => {
      console.log(chalk.bold.blue(`\n🛠️  Running tool: ${name}`));
      if (args && Object.keys(args).length > 0) {
        console.log(chalk.dim(`   Args: ${JSON.stringify(args)}`));
      }
    },
    onToolEnd: (name, res) => {
      console.log(chalk.bold.green(`✓ Tool ${name} finished.`));
    },
    askPermission: async (name, args) => {
      let details = '';
      if (name === 'fs_patch') details = `Apply diff modifications`;
      else if (name === 'shell_run') details = `Execute command: "${args.command}"`;
      else if (name === 'test_run') details = `Run tests`;
      else if (name === 'stdd_verify') details = `Run verification`;
      else if (name === 'git_add') details = `Stage files`;
      else if (name === 'git_commit') details = `Commit: "${args.message}"`;
      else if (name === 'git_push') details = `Push to ${args.remote || 'origin'}/${args.branch || 'main'}`;
      else if (name === 'git_checkout') details = `Checkout branch: "${args.branch}"`;
      else if (name === 'git_branch') details = `Create branch: "${args.name}"`;
      else if (name === 'git_reset') details = `Reset working directory (hard: ${!!args.hard})`;
      
      return askConfirm(`Allow tool ${chalk.bold.cyan(name)} (${details})?`);
    }
  };

  console.log(chalk.cyan(`\n🚀 Executing Chaos Agent instruction: "${prompt}"...\n`));
  try {
    await agentLoop.run(prompt, [], callbacks);
    console.log('\n');
  } catch (err) {
    console.log(chalk.red(`\nExecution Error: ${err.message}\n`));
  }
}

module.exports = {
  launchChaosTerminal,
  runChaosAgentPrompt
};
