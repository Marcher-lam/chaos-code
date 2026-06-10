const readline = require('readline');
const { execSync } = require('child_process');
const chalk = require('chalk');
const { ChaosAgentLoop } = require('../../runtime/agent-kernel/chaos-agent-loop');
const { AgentKernel } = require('../../runtime/agent-kernel/index');
const {
  BUILTIN_PROVIDERS,
  listProviders,
  addProvider,
  removeProvider,
  setActive,
  getActive,
} = require('../../runtime/agent-kernel/provider-config');
const { createCompleter, SLASH_COMMANDS } = require('../completer');
const { appendHistory, getRecentInputs, searchHistory } = require('../history');
const { StreamingMarkdownRenderer } = require('../renderer/markdown-renderer');
const { createSessionId, saveSession, loadSession, listSessions } = require('../session-store');
const { taskComplete, terminalBell } = require('../notifications');
const { SimplePager } = require('../pager');
const { loadConfig, saveConfig, getToolPermission, resetConfig, CONFIG_FILE } = require('../config');

const VERSION = require('../../../package.json').version;

// ── Load user config ──
let userConfig = loadConfig();

// ── Output verbosity: 0=minimal, 1=normal, 2=verbose ──
let verbosityLevel = userConfig.verbosity;

// ── Permission cache: "always allow" decisions per session ──
const sessionAllowedTools = new Set();

// ── Tool call timers for structured display ──
const toolTimers = new Map();

// ── Track patched files for /undo ──
const patchedFiles = [];

function printBanner() {
  console.log(chalk.dim(`\n  Chaos Code v${VERSION}  •  Type /help for commands\n`));
}

// ── Enhanced spinner with stage + timer ──
function startSpinner(label) {
  const frames = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
  let i = 0;
  let stopped = false;
  const startTime = Date.now();
  const interval = setInterval(() => {
    if (stopped) return;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    process.stdout.write(`\r${chalk.dim(frames[i % frames.length] + ' ' + label + ` (${elapsed}s)`)}       `);
    i++;
  }, 80);
  return {
    stop(finalText) {
      if (stopped) return;
      stopped = true;
      clearInterval(interval);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const suffix = finalText || chalk.dim(`(${elapsed}s)`);
      process.stdout.write(`\r${suffix}   \n`);
    },
    getElapsed() {
      return ((Date.now() - startTime) / 1000).toFixed(1);
    },
    getStartTime() {
      return startTime;
    },
  };
}

// ── Levenshtein distance for fuzzy command matching ──
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function findSimilar(cmd, commands, maxDist = 2) {
  return commands.filter(c => levenshtein(cmd, c) <= maxDist && levenshtein(cmd, c) > 0)
    .sort((a, b) => levenshtein(cmd, a) - levenshtein(cmd, b))
    .slice(0, 3);
}

// ── Unclosed expression detection for multiline input ──
function isUnclosedExpression(line) {
  const opens = (line.match(/[({[`]/g) || []).length;
  const closes = (line.match(/[)}\]]/g) || []).length;
  if (opens > closes) return true;
  // Check for unclosed backticks
  const backticks = (line.match(/`/g) || []).length;
  if (backticks % 2 !== 0) return true;
  return false;
}

// ── Dynamic prompt generator ──
function generatePrompt(agentLoop) {
  const parts = [];

  // Git branch
  try {
    const branch = execSync('git branch --show-current 2>/dev/null', { encoding: 'utf8', timeout: 3000 }).trim();
    if (branch) {
      const status = execSync('git status --porcelain 2>/dev/null', { encoding: 'utf8', timeout: 3000 }).trim();
      const dirty = status ? '*' : '';
      parts.push(chalk.magenta(branch + dirty));
    }
  } catch (_) {}

  // Model
  try {
    const model = agentLoop.getModel();
    if (model) parts.push(chalk.cyan(model));
  } catch (_) {}

  const prefix = parts.length > 0 ? parts.join(chalk.dim(':')) + ' ' : '';
  return prefix + '> ';
}

// ── BUG FIX: safeSetPrompt — was calling itself recursively! ──
function safeSetPrompt(rl, agentLoop) {
  if (typeof rl.setPrompt === 'function') {
    rl.setPrompt(generatePrompt(agentLoop));
  }
}

// ── Rough token estimation for context window tracking ──
function estimateTokens(messages) {
  let totalChars = 0;
  for (const m of messages) {
    if (typeof m.content === 'string') {
      totalChars += m.content.length;
    } else if (Array.isArray(m.content)) {
      for (const block of m.content) {
        if (block.text) totalChars += block.text.length;
        if (block.content && typeof block.content === 'string') totalChars += block.content.length;
      }
    }
    if (m.tool_calls) {
      for (const tc of m.tool_calls) {
        if (tc.function?.arguments) totalChars += tc.function.arguments.length;
      }
    }
  }
  return Math.ceil(totalChars / 3.5);
}

// ── Permission prompt: y / n / a(always) with diff preview ──
async function askPermission(toolName, description, args) {
  // Already allowed for this session
  if (sessionAllowedTools.has(toolName)) return true;

  // Check config-level permission default
  const permDefault = getToolPermission(toolName);
  if (permDefault === 'allow') { sessionAllowedTools.add(toolName); return true; }
  if (permDefault === 'deny') { console.log(chalk.red(`  ✗ ${toolName} is denied by config (${CONFIG_FILE})`)); return false; }

  const detail = buildPermissionDetail(toolName, args);

  // Show diff preview for fs_patch
  if (toolName === 'fs_patch' && args && args.diff) {
    process.stdout.write(chalk.dim('\n  ┌─ Proposed changes ─────────────────────────\n'));
    const diffLines = String(args.diff).split('\n').slice(0, 30);
    for (const l of diffLines) {
      if (l.startsWith('+++') || l.startsWith('--- ')) {
        process.stdout.write(chalk.bold(`  ${l}\n`));
      } else if (l.startsWith('@@')) {
        process.stdout.write(chalk.cyan(`  ${l}\n`));
      } else if (l.startsWith('+')) {
        process.stdout.write(chalk.green(`  ${l}\n`));
      } else if (l.startsWith('-')) {
        process.stdout.write(chalk.red(`  ${l}\n`));
      } else {
        process.stdout.write(chalk.dim(`  ${l}\n`));
      }
    }
    const totalLines = String(args.diff).split('\n').length;
    if (totalLines > 30) process.stdout.write(chalk.dim(`  ... (${totalLines - 30} more lines)\n`));
    process.stdout.write(chalk.dim('  └──────────────────────────────────────────────\n'));
  }

  return new Promise((resolve) => {
    const rlTemp = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rlTemp.question(
      chalk.bold(`  Allow ${chalk.cyan(toolName)}${detail ? ' (' + detail + ')' : ''}? ${chalk.dim('[y/n/a(always)/s(save)]: ')}`),
      (answer) => {
        rlTemp.close();
        const val = (answer || '').trim().toLowerCase();
        if (val === 'a' || val === 'always') {
          sessionAllowedTools.add(toolName);
          resolve(true);
        } else if (val === 's' || val === 'save') {
          sessionAllowedTools.add(toolName);
          // Persist to config so it survives restarts
          userConfig = saveConfig({ permissionDefaults: { [toolName]: 'allow' } });
          console.log(chalk.dim(`  Permission saved: ${toolName} = allow`));
          resolve(true);
        } else {
          resolve(val === 'y' || val === 'yes');
        }
      }
    );
  });
}

function buildPermissionDetail(name, args) {
  if (!args) return '';
  if (name === 'fs_patch') {
    const diff = args.diff || '';
    const fileCount = (diff.match(/^diff --git/gm) || []).length;
    const plusLines = (diff.match(/^\+/gm) || []).length;
    const minusLines = (diff.match(/^-/gm) || []).length;
    return `${fileCount} file(s), +${plusLines}/-${minusLines} lines`;
  }
  if (name === 'shell_run') return `run: "${(args.command || '').slice(0, 80)}"`;
  if (name === 'test_run') return 'run tests';
  if (name === 'git_commit') return `"${(args.message || '').slice(0, 50)}"`;
  if (name === 'git_push') return `${args.remote || 'origin'}/${args.branch || 'main'}`;
  if (name === 'git_checkout') return args.branch || '';
  if (name === 'git_branch') return args.name || '';
  if (name === 'git_reset') return `hard: ${!!args.hard}`;
  return '';
}

// ── Display a tool result summary inline ──
function displayToolResult(name, res) {
  if (!res || typeof res !== 'object') return;
  try {
    const parsed = typeof res === 'string' ? JSON.parse(res) : res;
    const elapsed = toolTimers.has(name) ? chalk.dim(` (${((Date.now() - toolTimers.get(name)) / 1000).toFixed(1)}s)`) : '';
    toolTimers.delete(name);

    // fs_read / fs_search – show first few lines (or paged full output in verbose mode)
    if (name === 'fs_read' || name === 'fs_search') {
      const text = parsed.content || parsed.output || (Array.isArray(parsed) ? parsed.map(r => r.path || r).join('\n') : '');
      if (text) {
        const totalLines = String(text).split('\n');
        const showLines = verbosityLevel >= 2 ? 30 : 8;
        if (verbosityLevel >= 2 && totalLines.length > 30) {
          // Verbose mode: page the full output
          _pagedOutput(chalk.dim('  ' + totalLines.join('\n') + '\n'), null);
        } else {
          const lines = totalLines.slice(0, showLines).join('\n');
          process.stdout.write(chalk.dim(`  ${lines}\n`));
          if (totalLines.length > showLines) process.stdout.write(chalk.dim(`  ... (${totalLines.length - showLines} more lines)${elapsed}\n`));
          else if (elapsed) process.stdout.write(chalk.dim(`${elapsed}\n`));
        }
      }
    }

    // fs_patch – show diff result with file details
    if (name === 'fs_patch') {
      if (parsed.files && parsed.files.length > 0) {
        process.stdout.write(chalk.green(`  ✓ ${parsed.files.length} file(s) changed${elapsed}\n`));
        if (verbosityLevel >= 2 && parsed.files) {
          for (const f of parsed.files.slice(0, 5)) {
            process.stdout.write(chalk.dim(`    ${typeof f === 'string' ? f : f.path || JSON.stringify(f)}\n`));
          }
        }
      } else if (parsed.error) {
        process.stdout.write(chalk.red(`  ✗ Patch failed: ${parsed.error}${elapsed}\n`));
      } else {
        process.stdout.write(chalk.dim(`  patch applied${elapsed}\n`));
      }
    }

    // test_run – show pass/fail
    if (name === 'test_run') {
      if (parsed.passed === true) {
        const count = parsed.resultCount || '';
        process.stdout.write(chalk.green(`  ✓ tests passed${count ? ` (${count} suite${count > 1 ? 's' : ''})` : ''}${elapsed}\n`));
      } else if (parsed.passed === false) {
        const failLine = (parsed.stderr || parsed.stdout || '').split('\n').filter(l => l.includes('FAIL') || l.includes('Error') || l.includes('✕')).slice(0, 5).join('\n');
        process.stdout.write(chalk.red(`  ✗ tests failed${elapsed}\n${failLine ? chalk.dim('  ' + failLine + '\n') : ''}`));
      }
    }

    // git_* – show status
    if (name.startsWith('git_') && parsed.status) {
      process.stdout.write(chalk.dim(`  ${parsed.status}${elapsed}\n`));
    }

    // shell_run – show output tail
    if (name === 'shell_run' && (parsed.stdout || parsed.stderr)) {
      const out = (parsed.stdout || '') + (parsed.stderr || '');
      const tail = out.trim().split('\n').slice(-5).join('\n');
      if (tail) process.stdout.write(chalk.dim(`  ${tail}${elapsed}\n`));
    }
  } catch (_) { /* non-critical */ }
}

function formatStatus(status) {
  if (!status) {
    console.log(chalk.dim('  No active change.'));
    return;
  }
  console.log(`  Change: ${status.activeChange ? chalk.green(status.activeChange) : chalk.dim('none')}`);
  console.log(`  Phase:  ${status.tddPhase ? chalk.yellow(status.tddPhase) : chalk.dim('none')}`);
  console.log(`  Specs:  ${status.specsCount || 0}  Changes: ${status.changesCount || 0}`);
}

// ── Paged output helper — uses SimplePager for long content ──
function _pagedOutput(text, rl) {
  if (!text) return;
  if (SimplePager.needsPaging(text)) {
    const pager = new SimplePager(text);
    return pager.show(rl);
  }
  process.stdout.write(text);
}

// ── Create shared callbacks factory (deduplicated) ──
function createCallbacks(spinner, mdRenderer) {
  return {
    onMessage: (msg) => {
      spinner.stop('');
      process.stdout.write(msg);
    },
    onToken: (token) => {
      spinner.stop('');
      mdRenderer.push(token);
    },
    onToolDetected: (name) => {
      // Lightweight indicator during streaming when tool name first arrives
      spinner.stop('');
      spinner.start(`Calling ${name}...`);
    },
    onToolStart: (name, args) => {
      spinner.stop('');
      toolTimers.set(name, Date.now());
      const detail = Object.keys(args || {}).length > 0
        ? ' ' + Object.entries(args).slice(0, 3).map(([k, v]) => `${k}=${JSON.stringify(v).slice(0, 40)}`).join(', ')
        : '';
      process.stdout.write(chalk.dim(`\n  ┌─ ${name}${detail ? ' ── ' + detail : ''}\n`));
      // Track fs_patch files for /undo
      if (name === 'fs_patch' && args && args.diff) {
        const diffStr = String(args.diff);
        const fileMatches = diffStr.match(/^\+\+\+ [ab]\/(.+)$/gm);
        if (fileMatches) {
          for (const fm of fileMatches) {
            const filePath = fm.replace(/^\+\+\+ [ab]\//, '');
            patchedFiles.push({ file: filePath, ts: Date.now() });
          }
        }
      }
      // Track fs_write files for /undo
      if (name === 'fs_write' && args && args.path) {
        patchedFiles.push({ file: args.path, ts: Date.now() });
      }
    },
    onToolEnd: (name, res) => {
      displayToolResult(name, res);
      process.stdout.write(chalk.dim('  └' + '─'.repeat(50) + '\n'));
    },
    askPermission: async (name, args) => {
      spinner.stop('');
      return askPermission(name, buildPermissionDetail(name, args), args);
    },
  };
}

// ── Print per-turn cost summary ──
function printTurnSummary(agentLoop, turnStartTime) {
  const stats = agentLoop.getSessionStats();
  const elapsed = turnStartTime ? ((Date.now() - turnStartTime) / 1000).toFixed(1) : '';
  const parts = [];
  if (elapsed) parts.push(`${elapsed}s`);
  if (stats.totalTokens > 0) {
    const tokK = stats.totalTokens > 1000 ? `${(stats.totalTokens / 1000).toFixed(1)}k` : stats.totalTokens;
    parts.push(`${tokK} tok`);
  }
  if (stats.cost > 0) parts.push(`$${stats.cost.toFixed(4)}`);
  if (parts.length > 0) {
    process.stdout.write(chalk.dim(`  ── ${parts.join(' · ')} ──\n`));
  }
}

async function launchChaosTerminal() {
  printBanner();

  const agentLoop = new ChaosAgentLoop();
  agentLoop.maxTurns = userConfig.maxTurns;
  agentLoop.temperature = userConfig.temperature;
  const kernel = new AgentKernel({ cwd: process.cwd() });
  let chatHistory = [];
  let currentAbortController = null;

  // ── Session persistence ──
  const sessionId = createSessionId();

  // ── Readline with completer + history ──
  const historyLines = getRecentInputs(500);
  const completer = createCompleter({
    getModels: () => {
      try {
        const active = getActive();
        return (active && active.models) || [];
      } catch (_) { return []; }
    },
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: generatePrompt(agentLoop),
    completer,
    historySize: 500,
    removeHistoryDuplicates: true,
  });

  // Load persistent history into readline
  if (historyLines.length > 0) {
    if (rl._history && Array.isArray(rl._history)) {
      rl._history = [...historyLines];
      rl._historyIndex = historyLines.length;
    }
  }

  // ── Multiline input state ──
  let multilineBuffer = [];
  let inMultiline = false;

  // Handle Ctrl+C gracefully: cancel current operation
  let isProcessing = false;
  const originalListeners = process.listeners('SIGINT');
  process.removeAllListeners('SIGINT');
  process.on('SIGINT', () => {
    if (inMultiline) {
      // Cancel multiline input
      inMultiline = false;
      multilineBuffer = [];
      process.stdout.write(chalk.yellow('\n  Cancelled.\n'));
      rl.prompt();
      return;
    }
    if (isProcessing && currentAbortController) {
      currentAbortController.abort();
      process.stdout.write(chalk.yellow('\n  Cancelling...\n'));
      currentAbortController = null;
      isProcessing = false;
      rl.resume();
      rl.prompt();
    } else {
      // Save session on exit
      _saveSessionOnExit(sessionId, chatHistory, agentLoop);
      console.log(chalk.dim('\n  Goodbye.'));
      process.exit(0);
    }
  });

  rl.prompt();

  rl.on('line', async (line) => {
    // ── Multiline input handling ──
    if (inMultiline) {
      if (line.trim() === '') {
        // Empty line ends multiline input
        const fullInput = multilineBuffer.join('\n');
        multilineBuffer = [];
        inMultiline = false;
        await _processInput(fullInput, rl, agentLoop, kernel, () => chatHistory, (h) => { chatHistory = h; }, () => isProcessing, (v) => { isProcessing = v; }, () => currentAbortController, (v) => { currentAbortController = v; }, sessionId);
      } else {
        multilineBuffer.push(line);
        process.stdout.write(chalk.dim('... '));
      }
      return;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      rl.prompt();
      return;
    }

    // ── Multiline trigger detection ──
    if (trimmed.startsWith('```') || trimmed.startsWith('"""')) {
      inMultiline = true;
      multilineBuffer = [trimmed];
      process.stdout.write(chalk.dim('... '));
      return;
    }
    if (isUnclosedExpression(trimmed)) {
      inMultiline = true;
      multilineBuffer = [trimmed];
      process.stdout.write(chalk.dim('... '));
      return;
    }

    await _processInput(trimmed, rl, agentLoop, kernel, () => chatHistory, (h) => { chatHistory = h; }, () => isProcessing, (v) => { isProcessing = v; }, () => currentAbortController, (v) => { currentAbortController = v; }, sessionId);
  });

  rl.on('close', () => {
    _saveSessionOnExit(sessionId, chatHistory, agentLoop);
    console.log(chalk.dim('  Goodbye.'));
    process.exit(0);
  });
}

// ── Save session on exit ──
function _saveSessionOnExit(sessionId, chatHistory, agentLoop) {
  try {
    if (chatHistory.length > 0) {
      const stats = agentLoop.getSessionStats();
      saveSession(sessionId, {
        chatHistory,
        stats,
        provider: stats.provider,
        model: stats.model,
      });
    }
  } catch (_) { /* non-critical */ }
}

// ── Shared input processing logic ──
async function _processInput(trimmed, rl, agentLoop, kernel, getHistory, setHistory, getProcessing, setProcessing, getAbort, setAbort, sessionId) {
  // Record to persistent history
  const type = trimmed.startsWith('/') ? 'command' : 'prompt';
  appendHistory(trimmed, type);

  if (trimmed.startsWith('/')) {
    const parts = trimmed.split(' ');
    const command = parts[0].toLowerCase();

    switch (command) {
      case '/exit':
      case '/quit':
        _saveSessionOnExit(sessionId, getHistory(), agentLoop);
        console.log(chalk.dim('  Goodbye.'));
        rl.close();
        process.exit(0);
        break;

      case '/help':
        console.log('');
        console.log('  ' + chalk.bold('Commands:'));
        console.log('  /connect        Add or manage LLM providers');
        console.log('  /models         List & switch models');
        console.log('  /model [name]   Quick switch model');
        console.log('  /providers      List configured providers');
        console.log('  /status         Active STDD change state');
        console.log('  /recommend      Next workflow step');
        console.log('  /verify         Run verification suite');
        console.log('  /doctor         Project health checks');
        console.log('  /diff           Git status and diff');
        console.log('  /commit         Stage & commit changes');
        console.log('  /rollback       Discard uncommitted changes');
        console.log('  /undo [file]    Revert recently patched files');
        console.log('  /compact        Compress conversation history');
        console.log('  /cost           Token usage and cost');
        console.log('  /session        Session info');
        console.log('  /resume         List and resume saved sessions');
        console.log('  /export         Export conversation to file');
        console.log('  /verbose [lvl]  Set output verbosity (0-2)');
        console.log('  /config         View/edit configuration');
        console.log('  /reset          Reset conversation');
        console.log('  /history [kw]   Search command history');
        console.log('  /clear          Clear screen');
        console.log('  /exit           Exit\n');
        break;

      case '/clear':
        console.clear();
        break;

      // ── /connect — Interactive provider setup ──
      case '/connect':
        await handleConnect(rl);
        break;

      // ── /models — List & switch models interactively ──
      case '/models':
        await handleModels(rl, agentLoop);
        break;

      // ── /providers — List configured providers ──
      case '/providers':
        handleProviders();
        break;

      case '/diff':
        try {
          const diffRes = kernel.executeTool('git.diff', { patch: true, maxBytes: 8000 });
          if (diffRes.dirty) {
            console.log(chalk.dim('  Modified files:'));
            console.log(diffRes.statusShort);
            if (diffRes.diff) {
              console.log(chalk.dim('  Diff:'));
              const diffLines = diffRes.diff.split('\n');
              let currentFile = '';
              diffLines.forEach(l => {
                if (l.startsWith('+++') || l.startsWith('---')) return;
                if (l.startsWith('@@')) {
                  process.stdout.write(chalk.cyan('  ' + l + '\n'));
                  return;
                }
                if (l.startsWith('diff --git')) {
                  const file = l.split(' b/').pop();
                  if (file && file !== currentFile) {
                    currentFile = file;
                    process.stdout.write(chalk.bold(`  ${file}\n`));
                  }
                  return;
                }
                if (l.startsWith('+')) process.stdout.write(chalk.green('  ' + l + '\n'));
                else if (l.startsWith('-')) process.stdout.write(chalk.red('  ' + l + '\n'));
                else process.stdout.write(chalk.dim('  ' + l + '\n'));
              });
            }
          } else {
            console.log(chalk.dim('  Working tree clean.'));
          }
        } catch (err) {
          console.log(chalk.red(`  Error: ${err.message}`));
        }
        break;

      case '/commit':
        try {
          const diffRes = kernel.executeTool('git.diff', { patch: false });
          if (!diffRes.dirty) {
            console.log(chalk.dim('  No changes to commit.'));
            break;
          }

          rl.pause();
          const msg = await new Promise((resolve) => {
            const rlTemp = readline.createInterface({
              input: process.stdin,
              output: process.stdout,
            });
            rlTemp.question(chalk.bold('  Commit message: '), (answer) => {
              rlTemp.close();
              resolve(answer.trim() || 'refactor: auto-update');
            });
          });
          rl.resume();

          kernel.executeTool('git.add', { files: '.' });
          const commitRes = kernel.executeTool('git.commit', { message: msg });
          if (commitRes.status === 'ok') {
            console.log(chalk.green(`  Committed: "${msg}"`));
          } else {
            console.log(chalk.red(`  Commit failed: ${commitRes.stderr || 'unknown error'}`));
          }
        } catch (err) {
          console.log(chalk.red(`  Error: ${err.message}`));
        }
        break;

      case '/rollback':
        try {
          const diffRes = kernel.executeTool('git.diff', { patch: false });
          if (!diffRes.dirty) {
            console.log(chalk.dim('  No changes to rollback.'));
            break;
          }

          const confirmed = await askPermission('rollback', 'discard all uncommitted changes?', {});
          if (confirmed) {
            const resetRes = kernel.executeTool('git.reset', { hard: true });
            if (resetRes.status === 'ok') {
              console.log(chalk.green('  Working directory rolled back.'));
            } else {
              console.log(chalk.red(`  Rollback failed: ${resetRes.stderr || 'unknown error'}`));
            }
          } else {
            console.log(chalk.dim('  Cancelled.'));
          }
        } catch (err) {
          console.log(chalk.red(`  Error: ${err.message}`));
        }
        break;

      case '/undo': {
        if (patchedFiles.length === 0) {
          console.log(chalk.dim('  No patched files to undo.'));
          break;
        }
        // Show recent patches
        const recent = patchedFiles.slice(-10);
        console.log(chalk.dim(`  Patched files (${patchedFiles.length} total, showing last ${recent.length}):`));
        const uniqueFiles = [...new Set(recent.map(p => p.file))];
        for (const f of uniqueFiles) {
          const count = patchedFiles.filter(p => p.file === f).length;
          console.log(chalk.dim(`    ${f} (${count}x)`));
        }
        const undoAll = parts[1] === 'all';
        const undoFile = parts[1] && !undoAll ? parts[1] : null;

        if (undoFile) {
          // Undo specific file
          try {
            execSync(`git restore ${undoFile}`, { stdio: 'pipe' });
            console.log(chalk.green(`  Reverted: ${undoFile}`));
          } catch (err) {
            console.log(chalk.red(`  Failed to revert ${undoFile}: ${err.message}`));
          }
        } else if (undoAll || uniqueFiles.length <= 5) {
          // Undo all patched files
          const confirmed = await askPermission('undo', `revert ${uniqueFiles.length} patched file(s)?`, {});
          if (confirmed) {
            let reverted = 0;
            for (const f of uniqueFiles) {
              try {
                execSync(`git restore ${f}`, { stdio: 'pipe' });
                reverted++;
              } catch (_) {}
            }
            patchedFiles.length = 0;
            console.log(chalk.green(`  Reverted ${reverted}/${uniqueFiles.length} files.`));
          } else {
            console.log(chalk.dim('  Cancelled.'));
          }
        } else {
          console.log(chalk.dim('  Usage:'));
          console.log(chalk.dim('    /undo         Show patched files'));
          console.log(chalk.dim('    /undo <file>  Revert a specific file'));
          console.log(chalk.dim('    /undo all     Revert all patched files'));
        }
        break;
      }

      case '/status':
        try {
          const status = kernel.executeTool('stdd.status');
          formatStatus(status);
        } catch (err) {
          console.log(chalk.red(`  Error: ${err.message}`));
        }
        break;

      case '/recommend':
        try {
          const rec = kernel.executeTool('stdd.recommend');
          console.log(`  ${rec.message || JSON.stringify(rec)}`);
        } catch (err) {
          console.log(chalk.red(`  Error: ${err.message}`));
        }
        break;

      case '/verify':
        try {
          const spinner = startSpinner('Running verification...');
          const res = await kernel.executeTool('stdd.verify');
          spinner.stop(chalk.green('  Verification complete.'));
          console.log(res.output || JSON.stringify(res, null, 2));
        } catch (err) {
          console.log(chalk.red(`  Error: ${err.message}`));
        }
        break;

      case '/doctor':
        try {
          const spinner = startSpinner('Running checks...');
          const res = kernel.runDoctor();
          spinner.stop('');
          for (const item of res) {
            const icon = item.status === 'ok' ? chalk.green('pass') : chalk.red('fail');
            console.log(`  [${icon}] ${item.id}${item.message ? chalk.dim(' — ' + item.message) : ''}`);
          }
        } catch (err) {
          console.log(chalk.red(`  Error: ${err.message}`));
        }
        break;

      case '/model': {
        const newModel = parts.slice(1).join(' ').trim();
        if (!newModel) {
          // Show current model + available models
          console.log(`  Model: ${chalk.bold(agentLoop.getModel())} (${agentLoop.getProviderId()})`);
          try {
            const active = getActive();
            if (active && active.models && active.models.length > 0) {
              console.log(chalk.dim('  Available:'));
              active.models.forEach(m => {
                const isCurrent = m === active.model;
                console.log(chalk.dim(`    ${isCurrent ? chalk.green('* ') : '  '}${m}`));
              });
            }
          } catch (_) {}
          break;
        }
        // Check if it's a provider ID switch
        const providers = listProviders();
        const matchProvider = providers.find(p => p.id === newModel);
        if (matchProvider) {
          agentLoop.switchProvider(newModel);
          console.log(chalk.dim(`  Provider: ${newModel}  Model: ${agentLoop.getModel()}`));
        } else {
          agentLoop.setModel(newModel);
          console.log(chalk.dim(`  Model: ${agentLoop.getModel()} (${agentLoop.getProviderId()})`));
        }
        // Update prompt
        safeSetPrompt(rl, agentLoop);
        break;
      }

      case '/compact': {
        const oldLen = getHistory().length;
        setHistory(agentLoop.compactHistory(getHistory()));
        const newLen = getHistory().length;
        const estTok = estimateTokens(getHistory());
        console.log(chalk.dim(`  Compacted ${oldLen} -> ${newLen} messages (~${estTok} tokens).`));
        break;
      }

      case '/cost': {
        const s = agentLoop.getSessionStats();
        const estTok = estimateTokens(getHistory());
        console.log(`  provider: ${s.provider}  model: ${s.model}`);
        console.log(`  tokens: ${s.totalTokens}  estimated context: ~${estTok}  cost: $${s.cost.toFixed(4)}`);
        break;
      }

      case '/session': {
        const s = agentLoop.getSessionStats();
        const estTok = estimateTokens(getHistory());
        console.log(`  provider: ${s.provider}  model: ${s.model}`);
        console.log(`  tokens: ${s.totalTokens}  cost: $${s.cost.toFixed(4)}`);
        console.log(`  messages: ${getHistory().length}  context: ~${estTok} tokens`);
        console.log(`  verbosity: ${verbosityLevel}  session: ${sessionId}`);
        break;
      }

      case '/verbose': {
        const lvl = parseInt(parts[1], 10);
        if (isNaN(lvl) || lvl < 0 || lvl > 2) {
          console.log(chalk.dim(`  Verbosity: ${verbosityLevel} (0=minimal, 1=normal, 2=verbose)`));
        } else {
          verbosityLevel = lvl;
          userConfig = saveConfig({ verbosity: lvl });
          console.log(chalk.dim(`  Verbosity set to ${verbosityLevel}`));
        }
        break;
      }

      case '/config': {
        const sub = parts[1];
        if (!sub) {
          // Show current config
          const cfg = loadConfig();
          console.log(chalk.dim(`  Config file: ${CONFIG_FILE}`));
          console.log(chalk.cyan('  Settings:'));
          for (const [k, v] of Object.entries(cfg)) {
            if (k === 'permissionDefaults') {
              console.log(chalk.cyan('    permissionDefaults:'));
              for (const [pk, pv] of Object.entries(v)) {
                const color = pv === 'allow' ? 'green' : pv === 'deny' ? 'red' : 'yellow';
                console.log(chalk[color](`      ${pk}: ${pv}`));
              }
            } else {
              console.log(`    ${chalk.dim(k)}: ${v}`);
            }
          }
        } else if (sub === 'set' && parts[2] && parts[3] !== undefined) {
          const key = parts[2];
          let val = parts.slice(3).join(' ');
          // Try to parse numbers and booleans
          if (val === 'true') val = true;
          else if (val === 'false') val = false;
          else if (!isNaN(Number(val)) && val !== '') val = Number(val);
          userConfig = saveConfig({ [key]: val });
          console.log(chalk.dim(`  Set ${key} = ${JSON.stringify(val)}`));
          // Sync verbosity if changed
          if (key === 'verbosity') verbosityLevel = val;
        } else if (sub === 'reset') {
          userConfig = resetConfig();
          verbosityLevel = userConfig.verbosity;
          console.log(chalk.dim('  Config reset to defaults.'));
        } else if (sub === 'permission' && parts[2] && parts[3]) {
          const tool = parts[2];
          const action = parts[3];
          if (!['ask', 'allow', 'deny'].includes(action)) {
            console.log(chalk.red('  Permission must be: ask | allow | deny'));
          } else {
            userConfig = saveConfig({ permissionDefaults: { [tool]: action } });
            console.log(chalk.dim(`  Permission ${tool}: ${action}`));
          }
        } else {
          console.log(chalk.dim('  Usage:'));
          console.log(chalk.dim('    /config              Show current config'));
          console.log(chalk.dim('    /config set <k> <v>  Set a config value'));
          console.log(chalk.dim('    /config permission <tool> <ask|allow|deny>'));
          console.log(chalk.dim('    /config reset        Reset to defaults'));
        }
        break;
      }

      case '/reset':
        setHistory([]);
        console.log(chalk.dim('  Conversation reset.'));
        break;

      case '/history': {
        const keyword = parts.slice(1).join(' ').trim();
        let historyOutput = '';
        if (keyword) {
          const results = searchHistory(keyword);
          if (results.length === 0) {
            console.log(chalk.dim(`  No history matching "${keyword}".`));
          } else {
            historyOutput = results.slice(0, 30).map(e => {
              const ts = new Date(e.ts).toLocaleString();
              return chalk.dim(`  ${ts}  ${e.input}`);
            }).join('\n') + '\n';
          }
        } else {
          const recent = searchHistory('', 20);
          historyOutput = recent.map(e => {
            const ts = new Date(e.ts).toLocaleString();
            return chalk.dim(`  ${ts}  ${e.input}`);
          }).join('\n') + '\n';
        }
        if (historyOutput) await _pagedOutput(historyOutput, rl);
        break;
      }

      // ── /resume — List and restore saved sessions ──
      case '/resume': {
        const sessions = listSessions(10);
        if (sessions.length === 0) {
          console.log(chalk.dim('  No saved sessions found.'));
          break;
        }
        console.log('');
        sessions.forEach((s, i) => {
          const ts = new Date(s.savedAt).toLocaleString();
          const info = `${s.provider}/${s.model || '?'}`;
          console.log(`  ${chalk.dim(String(i + 1).padStart(2))}  ${chalk.bold(s.id.slice(0, 19))}  ${chalk.dim(info)}  ${chalk.dim(s.messageCount + ' msgs')}  ${chalk.dim(ts)}`);
        });
        console.log('');

        rl.pause();
        const choice = await askInput('  Resume session (number or ID): ');
        rl.resume();

        const num = parseInt(choice.trim(), 10);
        let targetId;
        if (num >= 1 && num <= sessions.length) {
          targetId = sessions[num - 1].id;
        } else if (choice.trim()) {
          targetId = choice.trim();
        }

        if (targetId) {
          const loaded = loadSession(targetId);
          if (loaded && loaded.chatHistory) {
            setHistory(loaded.chatHistory);
            console.log(chalk.green(`  Resumed session: ${targetId.slice(0, 19)} (${loaded.chatHistory.length} messages)`));
          } else {
            console.log(chalk.red('  Failed to load session.'));
          }
        }
        break;
      }

      // ── /export — Export conversation to file ──
      case '/export': {
        const fs = require('fs');
        const path = require('path');
        const history = getHistory();
        if (history.length === 0) {
          console.log(chalk.dim('  Nothing to export.'));
          break;
        }
        const exportPath = parts[1] || path.join(process.cwd(), `chaos-export-${Date.now()}.md`);
        let md = `# Chaos Code Export\n\nSession: ${sessionId}\nDate: ${new Date().toISOString()}\n\n---\n\n`;
        for (const msg of history) {
          const role = msg.role || 'unknown';
          if (role === 'user') {
            md += `## User\n\n${msg.content || ''}\n\n`;
          } else if (role === 'assistant') {
            md += `## Assistant\n\n${msg.content || '(tool calls)'}\n\n`;
          }
        }
        try {
          fs.writeFileSync(exportPath, md, 'utf8');
          console.log(chalk.green(`  Exported to ${exportPath}`));
        } catch (err) {
          console.log(chalk.red(`  Export failed: ${err.message}`));
        }
        break;
      }

      default: {
        // Fuzzy matching for unknown commands
        const allCmds = SLASH_COMMANDS;
        const similar = findSimilar(command, allCmds);
        if (similar.length > 0) {
          console.log(chalk.yellow(`  Unknown command: ${command}`));
          console.log(chalk.dim(`  Did you mean: ${similar.join(', ')}?`));
        } else {
          console.log(chalk.dim(`  Unknown command: ${command}. Type /help for list.`));
        }
        break;
      }
    }
    safeSetPrompt(rl, agentLoop);
    rl.prompt();
    return;
  }

  // ── Process prompt via ChaosAgentLoop ──
  rl.pause();
  setProcessing(true);
  const abortCtrl = new AbortController();
  setAbort(abortCtrl);

  const turnStartTime = Date.now();
  const spinner = startSpinner('Thinking...');

  // ── Streaming Markdown renderer ──
  const mdRenderer = new StreamingMarkdownRenderer();

  // ── Auto-compact if context is getting large ──
  const estTokensBefore = estimateTokens(getHistory());
  if (estTokensBefore > userConfig.autoCompact) {
    const oldLen = getHistory().length;
    setHistory(agentLoop.compactHistory(getHistory()));
    console.log(chalk.dim(`  Auto-compacted ${oldLen} -> ${getHistory().length} messages (context was ~${estTokensBefore} tokens)\n`));
  }

  const callbacks = { ...createCallbacks(spinner, mdRenderer), signal: abortCtrl.signal };

  try {
    setHistory(await agentLoop.run(trimmed, getHistory(), callbacks));
    mdRenderer.flush();
    spinner.stop('');
    process.stdout.write('\n');
    // ── Per-turn cost summary ──
    printTurnSummary(agentLoop, turnStartTime);
    process.stdout.write('\n');
  } catch (err) {
    mdRenderer.flush();
    spinner.stop('');
    if (err.name === 'AbortError') {
      process.stdout.write(chalk.yellow('\n  Cancelled.\n'));
    } else {
      console.log(chalk.red(`\n  Error: ${err.message}\n`));
    }
  }

  setProcessing(false);
  setAbort(null);
  rl.resume();
  safeSetPrompt(rl, agentLoop);
  rl.prompt();
}

async function runChaosAgentPrompt(prompt, opts = {}) {
  // Apply CLI --model / --provider overrides
  if (opts.model) process.env.STDD_LLM_MODEL = opts.model;
  if (opts.provider) process.env.STDD_LLM_PROVIDER = opts.provider;

  const agentLoop = new ChaosAgentLoop();
  agentLoop.maxTurns = userConfig.maxTurns;
  agentLoop.temperature = userConfig.temperature;

  const turnStartTime = Date.now();
  const spinner = startSpinner('Thinking...');
  const mdRenderer = new StreamingMarkdownRenderer();

  const callbacks = createCallbacks(spinner, mdRenderer);

  try {
    await agentLoop.run(prompt, [], callbacks);
    mdRenderer.flush();
    // Print completion summary with notification
    const elapsed = (Date.now() - turnStartTime) / 1000;
    const stats = agentLoop.getSessionStats();
    taskComplete(elapsed, stats.cost, stats.totalTokens);
  } catch (err) {
    mdRenderer.flush();
    spinner.stop('');
    console.log(chalk.red(`\n  Error: ${err.message}\n`));
  }
}

// ── Interactive /connect command handler ──
async function handleConnect(rl) {
  console.log('');
  const ids = Object.keys(BUILTIN_PROVIDERS);
  ids.forEach((id, i) => {
    const p = BUILTIN_PROVIDERS[id];
    console.log(`  ${chalk.dim(String(i + 1).padStart(2))}  ${chalk.bold(id.padEnd(12))} ${chalk.dim(p.name)}`);
  });
  console.log('');

  rl.pause();
  const choice = await askInput('  Select provider (name or number): ');
  rl.resume();

  let selectedId = choice.trim();
  const num = parseInt(selectedId, 10);
  if (num >= 1 && num <= ids.length) {
    selectedId = ids[num - 1];
  }
  if (!BUILTIN_PROVIDERS[selectedId]) {
    console.log(chalk.red(`  Unknown provider: ${selectedId}`));
    return;
  }

  const builtin = BUILTIN_PROVIDERS[selectedId];
  let apiKey = '';
  let baseUrl = builtin.baseUrl;

  // Ask for base URL (pre-filled with default)
  if (selectedId === 'custom' || !builtin.baseUrl) {
    rl.pause();
    const urlInput = await askInput(`  Base URL: `);
    rl.resume();
    baseUrl = urlInput.trim() || baseUrl;
  } else {
    rl.pause();
    const urlInput = await askInput(`  Base URL (${chalk.dim(builtin.baseUrl)}): `);
    rl.resume();
    if (urlInput.trim()) baseUrl = urlInput.trim();
  }

  // Ask for API key (skip for local providers like Ollama)
  if (builtin.envKey || selectedId === 'custom') {
    const envHint = builtin.envKey ? chalk.dim(` (or set ${builtin.envKey})`) : '';
    rl.pause();
    apiKey = (await askInput(`  API key${envHint}: `)).trim();
    rl.resume();
    // If user skipped, try to resolve from env
    if (!apiKey && builtin.envKey) {
      apiKey = process.env[builtin.envKey] || '';
    }
  }

  // Ask for default model
  const defaultModel = builtin.defaultModel || '';
  rl.pause();
  const modelInput = (await askInput(`  Default model (${chalk.dim(defaultModel || 'none')}): `)).trim();
  rl.resume();

  addProvider(selectedId, {
    name: builtin.name,
    apiKey,
    baseUrl,
    model: modelInput || defaultModel,
    models: builtin.models,
  });

  // Set as active
  setActive(selectedId);

  console.log(chalk.green(`  Provider "${builtin.name}" configured and activated.`));
}

// ── Interactive /models command handler ──
async function handleModels(rl, agentLoop) {
  const active = getActive();
  if (!active) {
    console.log(chalk.dim('  No provider configured. Use /connect first.'));
    return;
  }

  console.log(`\n  ${chalk.bold(active.name)} — ${chalk.dim(active.id)}`);
  console.log(`  Base URL: ${active.baseUrl || '(default)'}`);
  console.log('');

  const models = active.models || [];
  if (models.length === 0) {
    console.log(chalk.dim('  No model list available. Use /model <name> to set manually.'));
    return;
  }

  models.forEach((m, i) => {
    const isCurrent = m === active.model;
    const marker = isCurrent ? chalk.green(' *') : '  ';
    console.log(`${marker} ${String(i + 1).padStart(2)}  ${isCurrent ? chalk.bold(m) : m}`);
  });
  console.log('');

  rl.pause();
  const choice = (await askInput('  Select model (name or number): ')).trim();
  rl.resume();

  if (!choice) return;

  let selectedModel = choice;
  const modelNum = parseInt(choice, 10);
  if (modelNum >= 1 && modelNum <= models.length) {
    selectedModel = models[modelNum - 1];
  }

  agentLoop.setModel(selectedModel);

  // Also persist the model choice
  const data = require('../../runtime/agent-kernel/provider-config').loadProviders();
  if (data.providers[data.active]) {
    data.providers[data.active].model = selectedModel;
    require('../../runtime/agent-kernel/provider-config').saveProviders(data);
  }

  console.log(chalk.green(`  Model: ${selectedModel}`));
}

// ── /providers command handler ──
function handleProviders() {
  const providers = listProviders();
  if (providers.length === 0) {
    console.log(chalk.dim('\n  No providers configured. Use /connect to add one.\n'));
    return;
  }
  console.log('');
  for (const p of providers) {
    const marker = p.active ? chalk.green('*') : ' ';
    const keyStatus = p.hasKey ? chalk.green('key') : chalk.yellow('no key');
    console.log(` ${marker} ${chalk.bold(p.id.padEnd(14))} ${chalk.dim(p.name)}`);
    console.log(`   ${chalk.dim('url:')} ${p.baseUrl || '(default)'}`);
    console.log(`   ${chalk.dim('key:')} ${keyStatus}  ${chalk.dim('model:')} ${p.model || '(none)'}`);
  }
  console.log('');
}

// ── Helper: readline-based input prompt ──
function askInput(prompt) {
  return new Promise((resolve) => {
    const rlTemp = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rlTemp.question(prompt, (answer) => {
      rlTemp.close();
      resolve(answer || '');
    });
  });
}

module.exports = {
  launchChaosTerminal,
  runChaosAgentPrompt,
};
