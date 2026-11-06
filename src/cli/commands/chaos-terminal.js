const readline = require('readline');
const { execSync, execFileSync } = require('child_process');
const chalk = require('chalk');
const { ChaosAgentLoop } = require('../../runtime/agent-kernel/chaos-agent-loop');
const {
  BUILTIN_PROVIDERS,
  listProviders,
  addProvider,
  setActive,
  getActive,
} = require('../../runtime/agent-kernel/provider-config');
const { createCompleter, SLASH_COMMANDS } = require('../completer');
const { appendHistory, getRecentInputs, searchHistory } = require('../history');
const { StreamingMarkdownRenderer } = require('../renderer/markdown-renderer');
const { createSessionId, saveSession, loadSession, listSessions } = require('../session-store');
const { taskComplete } = require('../notifications');
const { SimplePager } = require('../pager');
const { loadConfig, saveConfig, getToolPermission, resetConfig, CONFIG_FILE } = require('../config');
const { listSkills, renderSkillPrompt, listCommands, renderCommandPrompt } = require('../../utils/skills-loader');
const { backupFile, restoreFromBackup, pruneOldBackups } = require('../file-backups');
const { createCheckpoint, listCheckpoints, restoreCheckpoint } = require('../checkpoints');
const { listAgentConfigs } = require('../../utils/agents-config');
const { listPlugins } = require('../../utils/plugins-loader');

const VERSION = require('../../../package.json').version;

// ── Load user config ──
let userConfig = loadConfig();

// ── Output verbosity: 0=minimal, 1=normal, 2=verbose ──
let verbosityLevel = userConfig.verbosity;

// ── Permission cache: "always allow" decisions per session ──
const sessionAllowedTools = new Set();

// ── Tool call timers for structured display ──
const toolTimers = new Map();

// ── Track patched files for /undo (with pre-write backups) ──
const patchedFiles = [];
const _backupSessionId = `${Date.now().toString(36)}-${process.pid}`;

// ── Reference to main readline instance (set in launchChaosTerminal) ──
let _mainReadline = null;

function printBanner() {
  // Read provider info WITHOUT constructing a ChaosAgentLoop — the loop's
  // AgentKernel eagerly spawns every configured MCP server, so a throwaway
  // instance here would leak duplicate child processes for the whole session.
  let provider = 'openai';
  let model = process.env.STDD_LLM_MODEL || 'gpt-4o-mini';
  try {
    const active = getActive();
    if (active) {
      provider = active.id || active.providerType || provider;
      model = active.model || model;
    } else {
      if (process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY && !process.env.STDD_LLM_BASE_URL) {
        provider = 'anthropic';
        model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest';
      }
    }
  } catch (_) { /* defaults are fine */ }
  console.log('');
  console.log(chalk.bold('  Chaos Code') + chalk.dim(` v${VERSION}`));
  console.log(chalk.dim(`  ${provider}/${model}  •  /help for commands`));
  console.log('');
}

// ── Enhanced spinner with stage + timer ──
function startSpinner(label) {
  // Non-interactive stdout (pipe mode / one-shot): animated frames would
  // pollute the piped output and keep a timer handle alive — go inert.
  if (!process.stdout.isTTY) {
    const noop = () => {};
    return { updateLabel: noop, setExtra: noop, stop: noop, getElapsed: () => '0.0', getStartTime: () => Date.now() };
  }
  const frames = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
  let i = 0;
  let stopped = false;
  let currentLabel = label;
  let extraInfo = '';
  let lastFrameLen = 0;
  const startTime = Date.now();
  const interval = setInterval(() => {
    if (stopped) return;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const info = extraInfo ? `, ${extraInfo}` : '';
    const frame = chalk.dim(frames[i % frames.length] + ' ' + currentLabel + ` (${elapsed}s${info})`);
    // Clear previous frame + write new one
    const clearPad = ' '.repeat(Math.max(0, lastFrameLen));
    process.stdout.write(`\r${clearPad}\r${frame}`);
    lastFrameLen = chalk.stripColor(frame).length;
    i++;
  }, 80);
  return {
    updateLabel(newLabel) {
      currentLabel = newLabel;
    },
    setExtra(info) {
      extraInfo = info;
    },
    stop(finalText) {
      if (stopped) return;
      // Set stopped FIRST to prevent interval from writing another frame
      stopped = true;
      clearInterval(interval);
      // Clear the spinner line completely
      const clearPad = ' '.repeat(Math.max(lastFrameLen + 10, 60));
      process.stdout.write(`\r${clearPad}\r`);
      if (finalText) {
        process.stdout.write(`${finalText}\n`);
      }
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
  const opens = (line.match(/[{(\[]/g) || []).length;
  const closes = (line.match(/[})\]]/g) || []).length;
  if (opens > closes) return true;
  // Check for unclosed backticks (odd number means unclosed)
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
      const dirty = status ? chalk.red('*') : '';
      parts.push(chalk.magenta(branch) + dirty);
    }
  } catch (_) {}

  // Model (short form)
  try {
    const model = agentLoop.getModel() || '';
    if (model) {
      // Shorten model name for cleaner prompt
      const shortModel = model
        .replace(/claude-sonnet-4-20250514/, 'sonnet4')
        .replace(/claude-3-5-sonnet-latest/, 'sonnet3.5')
        .replace(/claude-3-5-haiku-latest/, 'haiku3.5')
        .replace(/claude-opus-4-20250514/, 'opus4')
        .replace(/gpt-4o-mini/, '4o-mini')
        .replace(/gpt-4\.1-mini/, '4.1-mini')
        .replace(/gpt-4\.1-nano/, '4.1-nano')
        .replace(/gpt-4\.1$/, '4.1')
        .replace(/gpt-4o/, '4o')
        .replace(/deepseek-chat/, 'ds-chat')
        .replace(/deepseek-reasoner/, 'ds-reason');
      parts.push(chalk.cyan(shortModel));
    }
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

  // Non-interactive contexts (pipe mode / one-shot prompt): there is no TTY to
  // answer a prompt on — asking would hang forever on an exhausted stdin.
  // The user already described the work in the prompt, so auto-allow tools
  // whose config says 'ask' (config 'deny' still blocks above) and note it.
  if (!process.stdin.isTTY) {
    process.stdout.write(chalk.dim(`  ⚠ non-interactive: auto-allowing ${toolName}${detail ? ` (${detail})` : ''}\n`));
    return true;
  }

  // Show diff preview for fs_patch
  if (toolName === 'fs_patch' && args && args.diff) {
    process.stdout.write(chalk.dim('\n    Proposed changes:\n'));
    const diffLines = String(args.diff).split('\n').slice(0, 30);
    for (const l of diffLines) {
      if (l.startsWith('+++') || l.startsWith('--- ')) {
        process.stdout.write(chalk.bold(`    ${l}\n`));
      } else if (l.startsWith('@@')) {
        process.stdout.write(chalk.cyan(`    ${l}\n`));
      } else if (l.startsWith('+')) {
        process.stdout.write(chalk.green(`    ${l}\n`));
      } else if (l.startsWith('-')) {
        process.stdout.write(chalk.red(`    ${l}\n`));
      } else {
        process.stdout.write(chalk.dim(`    ${l}\n`));
      }
    }
    const totalLines = String(args.diff).split('\n').length;
    if (totalLines > 30) process.stdout.write(chalk.dim(`    ... (${totalLines - 30} more lines)\n`));
  }

  return new Promise((resolve) => {
    // Pause main rl to prevent stdin race condition
    const mainRl = _mainReadline;
    if (mainRl) mainRl.pause();

    const rlTemp = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
    rlTemp.question(
      chalk.bold(`  Allow ${chalk.cyan(toolName)}${detail ? ' (' + detail + ')' : ''}? ${chalk.dim('[y/n/a/s]: ')}`),
      (answer) => {
        rlTemp.close();
        if (mainRl) mainRl.resume();
        const val = (answer || '').trim().toLowerCase();
        if (val.startsWith('a') || val === 'always') {
          sessionAllowedTools.add(toolName);
          resolve(true);
        } else if (val.startsWith('s') || val === 'save') {
          sessionAllowedTools.add(toolName);
          // Persist to config so it survives restarts
          userConfig = saveConfig({ permissionDefaults: { [toolName]: 'allow' } });
          console.log(chalk.dim(`  Permission saved: ${toolName} = allow`));
          resolve(true);
        } else {
          resolve(val.startsWith('y') || val === 'yes');
        }
      }
    );
  });
}

// ── Format tool args into a readable one-line summary ──
function formatToolArgs(name, args) {
  if (!args || typeof args !== 'object') return '';
  const entries = Object.entries(args);
  if (entries.length === 0) return '';

  // Tool-specific formatting
  if (name === 'fs_read' && args.path) return args.path;
  if (name === 'fs_write' && args.path) return `${args.path} (${(args.content || '').length} bytes)`;
  if (name === 'fs_glob' && args.pattern) return args.pattern;
  if (name === 'fs_grep' && args.pattern) return `/${args.pattern}/`;
  if (name === 'shell_run' && args.command) return args.command.slice(0, 60);
  if (name === 'test_run') return args.command || '';
  if (name === 'git_commit' && args.message) return `"${args.message.slice(0, 40)}"`;
  if (name === 'git_add' && args.files) return args.files.join(' ').slice(0, 50);
  if (name === 'git_pull') return `${args.remote || 'origin'}${args.branch ? '/' + args.branch : ''}`;
  if (name === 'git_log') return `${args.count || 20} commits${args.file ? ` (${args.file})` : ''}`;
  if (name === 'git_stash') return args.action || 'push';
  if (name === 'git_pr') return `"${String(args.title || '').slice(0, 40)}"${args.draft ? ' (draft)' : ''}`;
  if (name === 'git_worktree') return args.action || 'list';
  if (name === 'task_create' && args.subject) return args.subject;
  if (name === 'task_update' && args.id) return `#${args.id} → ${args.status || 'updated'}`;
  if (name === 'task_dispatch') {
    const tasks = Array.isArray(args.tasks) ? args.tasks : (args.prompt ? [args] : []);
    return tasks.length > 1 ? `⧉ ${tasks.length} subagents` : (tasks[0] && tasks[0].prompt ? String(tasks[0].prompt).slice(0, 50) : '');
  }
  if (name === 'skill' && args.name) return args.name;

  // Generic: show key=value pairs
  return entries.slice(0, 3).map(([k, v]) => {
    const val = typeof v === 'string' ? v.slice(0, 40) : JSON.stringify(v).slice(0, 40);
    return `${k}: ${val}`;
  }).join(', ');
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
  if (name === 'git_push') return `${args.remote || 'origin'}/${args.branch || 'current'}`;
  if (name === 'git_pull') return `pull ${args.remote || 'origin'}${args.branch ? '/' + args.branch : ''}`;
  if (name === 'git_stash') return `stash ${args.action || 'push'}`;
  if (name === 'git_pr') return `create PR "${(args.title || '').slice(0, 50)}"${args.draft ? ' (draft)' : ''}`;
  if (name === 'git_worktree') return `worktree ${args.action || 'list'}${args.name ? ` ${args.name}` : ''}`;
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

    // fs_read / fs_search – show first few lines with line numbers
    if (name === 'fs_read' || name === 'fs_search') {
      const text = parsed.content || parsed.output || (Array.isArray(parsed) ? parsed.map(r => r.path || r).join('\n') : '');
      if (text) {
        const totalLines = String(text).split('\n');
        const showLines = verbosityLevel >= 2 ? 30 : 8;
        if (verbosityLevel >= 2 && totalLines.length > 30) {
          _pagedOutput(chalk.dim('    ' + totalLines.join('\n') + '\n'), null);
        } else {
          const lines = totalLines.slice(0, showLines);
          const maxNumLen = String(lines.length).length;
          const numbered = lines.map((l, i) => {
            const num = chalk.dim(String(i + 1).padStart(maxNumLen) + ' │ ');
            return `    ${num}${chalk.dim(l)}`;
          }).join('\n');
          process.stdout.write(numbered + '\n');
          if (totalLines.length > showLines) process.stdout.write(chalk.dim(`    ... (${totalLines.length - showLines} more lines)${elapsed}\n`));
          else if (elapsed) process.stdout.write(chalk.dim(`    ${elapsed}\n`));
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
        const failLines = (parsed.stderr || parsed.stdout || '').split('\n').filter(l => l.includes('FAIL') || l.includes('Error') || l.includes('✕'));
        if (verbosityLevel >= 2 && failLines.length > 10) {
          process.stdout.write(chalk.red(`  ✗ tests failed${elapsed}\n`));
          _pagedOutput(chalk.dim('  ' + failLines.join('\n') + '\n'), null);
        } else {
          const shortFail = failLines.slice(0, 5).join('\n');
          process.stdout.write(chalk.red(`  ✗ tests failed${elapsed}\n${shortFail ? chalk.dim('  ' + shortFail + '\n') : ''}`));
        }
      }
    }

    // git_* – show status
    if (name.startsWith('git_') && parsed.status) {
      process.stdout.write(chalk.dim(`  ${parsed.status}${elapsed}\n`));
      // git_log – show recent commits
      if (name === 'git_log' && Array.isArray(parsed.commits) && parsed.commits.length > 0) {
        const show = verbosityLevel >= 2 ? parsed.commits.slice(0, 20) : parsed.commits.slice(0, 5);
        for (const c of show) {
          process.stdout.write(chalk.dim(`    ${String(c).slice(0, 90)}\n`));
        }
        if (parsed.commits.length > show.length) {
          process.stdout.write(chalk.dim(`    ... (${parsed.commits.length - show.length} more commits)\n`));
        }
      }
    }

    // git_pr – show created PR url
    if (name === 'git_pr' && parsed.url) {
      process.stdout.write(chalk.green(`  ✓ PR created: ${parsed.url.slice(0, 90)}${elapsed}\n`));
    } else if (name === 'git_pr' && parsed.status === 'unavailable') {
      process.stdout.write(chalk.yellow(`  ⚠ ${parsed.reason}${elapsed}\n`));
    }

    // git_worktree – show the result
    if (name === 'git_worktree') {
      if (Array.isArray(parsed.worktrees)) {
        process.stdout.write(chalk.dim(`  ${parsed.worktrees.length} worktree(s)${elapsed}\n`));
        for (const w of parsed.worktrees.slice(0, 8)) {
          process.stdout.write(chalk.dim(`    ${w.branch || (w.detached ? '(detached)' : '-')}  ${w.path}\n`));
        }
      } else if (parsed.status === 'ok' && parsed.path) {
        process.stdout.write(chalk.green(`  ✓ worktree ${parsed.action}: ${parsed.path}${elapsed}\n`));
      } else if (parsed.status === 'fail') {
        process.stdout.write(chalk.red(`  ✗ worktree ${parsed.action} failed${elapsed}\n`));
      }
    }

    // task_dispatch – show subagent results
    if (name === 'task_dispatch' && Array.isArray(parsed.results)) {
      const okCount = parsed.results.filter(r => r.ok).length;
      process.stdout.write(chalk.dim(`  ⧉ ${okCount}/${parsed.results.length} subagent(s) completed${elapsed}\n`));
      for (const r of parsed.results) {
        const marker = r.ok ? chalk.green('✓') : chalk.red('✗');
        const subject = (r.prompt || '').slice(0, 50);
        const summary = String(r.summary || '').split('\n')[0].slice(0, 80);
        process.stdout.write(`  ${marker} ${chalk.dim(subject)}\n`);
        if (summary) process.stdout.write(chalk.dim(`    ${summary}\n`));
      }
    }

    // skill – show loaded skill name
    if (name === 'skill' && parsed.status === 'ok' && parsed.skill) {
      process.stdout.write(chalk.dim(`  loaded skill "${parsed.skill}"${elapsed}\n`));
    }

    // fs_read_image – show image metadata
    if (name === 'fs_read_image' && parsed.path) {
      const kb = parsed.bytes ? ` (${Math.max(1, Math.round(parsed.bytes / 1024))} KB, ${parsed.mimeType})` : '';
      process.stdout.write(chalk.dim(`  🖼 ${parsed.path}${kb}${elapsed}\n`));
    }

    // task_status – show background subagent tasks
    if (name === 'task_status' && Array.isArray(parsed.tasks)) {
      for (const t of parsed.tasks) {
        const marker = t.status === 'running' ? chalk.yellow('◌') : (t.ok === false ? chalk.red('✗') : chalk.green('✓'));
        process.stdout.write(`  ${marker} ${chalk.dim(`${t.id} [${t.status}] ${String(t.prompt || '').slice(0, 50)}`)}\n`);
      }
    }

    // shell_run – show output tail (or paged in verbose mode)
    if (name === 'shell_run' && (parsed.stdout || parsed.stderr)) {
      const out = (parsed.stdout || '') + (parsed.stderr || '');
      const allLines = out.trim().split('\n');
      if (verbosityLevel >= 2 && allLines.length > 20) {
        _pagedOutput(chalk.dim('  ' + allLines.join('\n') + '\n'), null);
      } else {
        const tail = allLines.slice(-5).join('\n');
        if (tail) process.stdout.write(chalk.dim(`  ${tail}${elapsed}\n`));
      }
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
  let streamingTokens = 0;
  return {
    onMessage: (msg) => {
      spinner.stop('');
      process.stdout.write(msg);
    },
    onToken: (token) => {
      streamingTokens++;
      spinner.stop('');
      mdRenderer.push(token);
      // Update spinner extra info periodically (every 50 tokens)
      if (streamingTokens % 50 === 0) {
        const stats = mdRenderer._agentLoop ? mdRenderer._agentLoop.getSessionStats() : null;
        if (stats && stats.totalTokens > 0) {
          spinner.setExtra(`${stats.totalTokens} tok`);
        }
      }
    },
    onToolDetected: (name) => {
      // Lightweight indicator during streaming when tool name first arrives
      streamingTokens = 0;
      spinner.updateLabel(`Calling ${name}...`);
      spinner.setExtra('');
    },
    onToolStart: (name, args) => {
      spinner.stop('');
      toolTimers.set(name, Date.now());
      // Format tool args into a readable summary
      const argSummary = formatToolArgs(name, args);
      process.stdout.write(`\n  ${chalk.bold.blue('⏺')} ${chalk.bold(name)}${argSummary ? chalk.dim('  ' + argSummary) : ''}\n`);
      // Track fs_patch files for /undo — snapshot BEFORE the write lands
      if (name === 'fs_patch' && args && args.diff) {
        const diffStr = String(args.diff);
        const fileMatches = diffStr.match(/^\+\+\+ [ab]\/(.+)$/gm);
        if (fileMatches) {
          for (const fm of fileMatches) {
            const filePath = fm.replace(/^\+\+\+ [ab]\//, '');
            const entry = backupFile(process.cwd(), filePath, _backupSessionId) || {};
            patchedFiles.push({ file: filePath, ts: Date.now(), ...entry });
          }
        }
      }
      // Track fs_write files for /undo
      if (name === 'fs_write' && args && args.path) {
        const entry = backupFile(process.cwd(), args.path, _backupSessionId) || {};
        patchedFiles.push({ file: args.path, ts: Date.now(), ...entry });
      }
    },
    onToolEnd: (name, res) => {
      displayToolResult(name, res);
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
    process.stdout.write(chalk.dim(`  ${parts.join(' · ')}\n`));
  }
}

// ── Kill spawned MCP server processes on exit ──
function _shutdownMcp(agentLoop) {
  try {
    const mgr = agentLoop && agentLoop.kernel && agentLoop.kernel.mcpClientManager;
    if (mgr && typeof mgr.stopAll === 'function') mgr.stopAll();
  } catch (_) { /* best-effort cleanup */ }
}

// ── Dim notice for background subagent tasks that finished since last look ──
const _reportedBgTasks = new Set();
function _reportFinishedBackground(agentLoop) {
  try {
    const map = agentLoop && agentLoop._backgroundTasks;
    if (!map) return;
    for (const e of map.values()) {
      if (e.status !== 'running' && !_reportedBgTasks.has(e.id)) {
        _reportedBgTasks.add(e.id);
        const marker = e.result && e.result.ok ? chalk.green('✓') : chalk.red('✗');
        const note = e.result && e.result.ok
          ? String(e.result.summary || '').split('\n')[0].slice(0, 70)
          : String((e.result && e.result.error) || 'failed').slice(0, 70);
        process.stdout.write(chalk.dim(`  ${marker} bg ${e.id} finished — ${note}\n`));
      }
    }
  } catch (_) { /* best-effort */ }
}

// ── On exit: give resident background tasks a bounded chance to finish ──
async function _drainBackground(agentLoop, budgetMs = 15000) {
  try {
    const map = agentLoop && agentLoop._backgroundTasks;
    const running = map ? [...map.values()].filter(e => e.status === 'running' && e.promise) : [];
    if (running.length === 0) return;
    process.stdout.write(chalk.dim(`  draining ${running.length} background task(s)…\n`));
    await Promise.race([
      Promise.allSettled(running.map(e => e.promise)),
      new Promise(r => setTimeout(r, budgetMs)),
    ]);
    _reportFinishedBackground(agentLoop);
  } catch (_) { /* best-effort */ }
}

async function launchChaosTerminal() {
  printBanner();
  pruneOldBackups(); // best-effort: drop backup sessions older than 7 days

  const agentLoop = new ChaosAgentLoop();
  agentLoop.maxTurns = userConfig.maxTurns;
  agentLoop.temperature = userConfig.temperature;
  if (userConfig.maxTokens) agentLoop.maxTokens = userConfig.maxTokens;
  if (userConfig.promptCaching !== undefined) agentLoop.promptCaching = userConfig.promptCaching;
  // REPL keeps background subagents resident across turns; one-shot runs drain.
  agentLoop.awaitBackgroundOnExit = false;
  // Reuse the agent's kernel for slash-command tool execution — a second
  // AgentKernel would eagerly spawn ANOTHER copy of every MCP server.
  const kernel = agentLoop.kernel;
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
  _mainReadline = rl;

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
      _drainBackground(agentLoop).finally(() => {
        _shutdownMcp(agentLoop);
        console.log(chalk.dim('\n  Goodbye.'));
        process.exit(0);
      });
    }
  });

  // Ctrl+D / EOF exit path — kill spawned MCP servers as well
  rl.on('close', () => {
    _shutdownMcp(agentLoop);
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
        await _drainBackground(agentLoop);
        _shutdownMcp(agentLoop);
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
        console.log('  /tasks [status] Show task list');
        console.log('  /reset          Reset conversation');
        console.log('  /history [kw]   Search command history');
        console.log('  /skills [kw]    List STDD skills (catalog)');
        console.log('  /skill <name>   Load & run a STDD skill with the agent');
        console.log('  /cmds [kw]      List command templates');
        console.log('  /cmd <name>     Load & run a command template');
        console.log('  /hooks          Show configured lifecycle hooks');
        console.log('  /plan [on|off]  Toggle plan mode (read-only until approved)');
        console.log('  /agents         List named agent configs (.chaos/agents.json)');
        console.log('  /plugins        List installed workspace plugins');
        console.log('  /checkpoint     Save/list whole-workspace checkpoints');
        console.log('  /rewind <id>    Restore a checkpoint');
        console.log('  /clear          Clear screen');
        console.log('  /exit           Exit\n');
        break;

      case '/clear':
        console.clear();
        break;

      // ── /connect — Interactive provider setup ──
      case '/connect':
        await handleConnect(rl, agentLoop);
        break;

      // ── /plan — Toggle plan mode (read-only enforcement until approved) ──
      case '/plan': {
        const arg = (parts[1] || '').toLowerCase();
        let next;
        if (arg === 'on') next = true;
        else if (arg === 'off') next = false;
        else next = !agentLoop.planMode;
        agentLoop.planMode = next;
        if (next) {
          console.log(chalk.yellow('  ◷ Plan mode ON — write tools disabled. The agent will explore read-only and present an implementation plan.'));
          console.log(chalk.dim('    Approve execution with: /plan off'));
        } else {
          console.log(chalk.green('  ▶ Plan mode OFF — execution enabled. Ask the agent to proceed with its plan.'));
        }
        break;
      }

      // ── /agents — List named agent configurations ──
      case '/agents': {
        const agents = listAgentConfigs(process.cwd());
        if (agents.length === 0) {
          console.log(chalk.dim('  No named agents configured.'));
          console.log(chalk.dim('  Define them in .chaos/agents.json:  { "agents": { "reviewer": { "description": "...", "prompt": "...", "tools": ["fs_read"], "model": "..." } } }'));
          console.log(chalk.dim('  Then dispatch with task_dispatch({ tasks: [{ agent: "reviewer", prompt: "..." }] })'));
          break;
        }
        console.log('');
        for (const a of agents) {
          const meta = [a.model, a.tools ? `tools: ${a.tools.length}` : null].filter(Boolean).join(' · ');
          console.log(`  ${chalk.bold(a.name.padEnd(16))} ${meta ? chalk.dim(`[${meta}] `) : ''}${chalk.dim((a.description || '').slice(0, 60))}`);
        }
        console.log(chalk.dim(`\n  ${agents.length} agent(s). Use via task_dispatch tasks[].agent\n`));
        break;
      }

      // ── /plugins — List installed workspace plugins ──
      case '/plugins': {
        const plugins = listPlugins(process.cwd());
        if (plugins.length === 0) {
          console.log(chalk.dim('  No plugins found.'));
          console.log(chalk.dim('  Install one at .chaos/plugins/<name>/ with plugin.json + skills/ or commands/ or hooks.json'));
          break;
        }
        console.log('');
        for (const p of plugins) {
          const parts = [
            p.skillCount ? `${p.skillCount} skill(s)` : null,
            p.commandCount ? `${p.commandCount} command(s)` : null,
            p.hookCount ? `${p.hookCount} hook(s)` : null,
          ].filter(Boolean).join(', ');
          console.log(`  ${chalk.bold(p.name.padEnd(18))} ${parts ? chalk.dim(`[${parts}] `) : ''}${chalk.dim((p.description || '').slice(0, 55))}`);
        }
        console.log('');
        break;
      }

      // ── /checkpoint — Whole-workspace restore points ──
      case '/checkpoint': {
        const sub = (parts[1] || '').toLowerCase();
        const cps = listCheckpoints(sessionId);
        if (sub === 'list' || (!sub && cps.length > 0 && !parts[1])) {
          if (cps.length === 0) {
            console.log(chalk.dim('  No checkpoints yet. One is saved automatically after any turn that writes files; /checkpoint <label> saves manually.'));
            break;
          }
          console.log('');
          for (const c of cps) {
            console.log(`  ${chalk.bold('#' + c.id)} ${chalk.dim(new Date(c.ts).toLocaleTimeString())}  ${c.label}  (${c.fileCount} files)`);
          }
          console.log(chalk.dim(`\n  Restore with: /rewind <id>\n`));
          break;
        }
        const label = parts.slice(1).join('-') || 'manual';
        try {
          const cp = createCheckpoint(sessionId, process.cwd(), patchedFiles, label);
          console.log(chalk.green(`  ⧗ Checkpoint #${cp.id} saved (${cp.fileCount} files). Restore with /rewind ${cp.id}`));
        } catch (err) {
          console.log(chalk.red(`  Checkpoint failed: ${err.message}`));
        }
        break;
      }

      // ── /rewind — Restore a whole-workspace checkpoint ──
      case '/rewind': {
        const target = parts[1];
        if (!target) {
          const cps = listCheckpoints(sessionId);
          if (cps.length === 0) { console.log(chalk.dim('  No checkpoints. Use /checkpoint first.')); break; }
          console.log(chalk.dim('  Usage: /rewind <id>  — available:'));
          for (const c of cps) console.log(chalk.dim(`    #${c.id} ${c.label} (${c.fileCount} files)`));
          break;
        }
        const confirmed = await askPermission('rewind', `restore checkpoint ${target} (all touched files return to that point)`, {});
        if (!confirmed) { console.log(chalk.dim('  Cancelled.')); break; }
        const res = restoreCheckpoint(sessionId, process.cwd(), target);
        if (res.ok) {
          console.log(chalk.green(`  ⏪ Rewound to #${res.id} "${res.label}" — ${res.restored} file(s) restored, ${res.deleted} agent-created file(s) removed.`));
          if (res.skipped.length > 0) console.log(chalk.dim(`    skipped: ${res.skipped.join(', ')}`));
        } else {
          console.log(chalk.red(`  ${res.error}`));
        }
        break;
      }

      // ── /hooks — Show configured lifecycle hooks ──
      case '/hooks': {
        const desc = agentLoop.hooks ? agentLoop.hooks.describe() : [];
        const withCmds = desc.filter(d => d.commands.length > 0);
        if (withCmds.length === 0) {
          console.log(chalk.dim('  No hooks configured.'));
          console.log(chalk.dim('  Add them in ~/.chaos/config.json:  hooks: { preToolUse: [{ command: "..." }], postToolUse: [...] }'));
          break;
        }
        console.log('');
        for (const d of withCmds) {
          console.log(`  ${chalk.bold(d.event)}`);
          for (const c of d.commands) console.log(chalk.dim(`    $ ${c}`));
        }
        console.log('');
        break;
      }

      // ── /skills — List STDD skills ──
      case '/skills': {
        const filter = parts.slice(1).join(' ').toLowerCase();
        let skills = listSkills(process.cwd());
        if (filter) skills = skills.filter(s => s.name.includes(filter) || (s.description || '').toLowerCase().includes(filter));
        if (skills.length === 0) {
          console.log(chalk.dim('  No skills found.'));
          break;
        }
        console.log('');
        for (const s of skills) {
          const meta = [s.phase, s.riskLevel ? `risk:${s.riskLevel}` : null, s.source === 'workspace' ? 'workspace' : null].filter(Boolean).join(' · ');
          console.log(`  ${chalk.bold(s.name.padEnd(16))} ${meta ? chalk.dim(`[${meta}] `) : ''}${chalk.dim((s.description || '').slice(0, 70))}`);
        }
        console.log(chalk.dim(`\n  ${skills.length} skill(s). Load one with: /skill <name> [args]\n`));
        break;
      }

      // ── /skill — Load & run a STDD skill with the agent ──
      case '/skill': {
        const skillName = parts[1];
        if (!skillName) {
          console.log(chalk.dim('  Usage: /skill <name> [args]  — use /skills to list available skills.'));
          break;
        }
        const argsStr = parts.slice(2).join(' ');
        const rendered = renderSkillPrompt(skillName, argsStr, process.cwd());
        if (!rendered) {
          console.log(chalk.red(`  Skill "${skillName}" not found. Use /skills to list available skills.`));
          break;
        }
        console.log(chalk.dim(`  Loaded skill "${skillName}", dispatching to agent...`));
        await _processInput(rendered, rl, agentLoop, kernel, getHistory, setHistory, getProcessing, setProcessing, getAbort, setAbort, sessionId);
        break;
      }

      // ── /cmds — List command templates ──
      case '/cmds': {
        const filter = parts.slice(1).join(' ').toLowerCase();
        let cmds = listCommands(process.cwd());
        if (filter) cmds = cmds.filter(c => c.name.includes(filter) || (c.description || '').toLowerCase().includes(filter));
        if (cmds.length === 0) {
          console.log(chalk.dim('  No command templates found.'));
          break;
        }
        console.log('');
        for (const c of cmds) {
          console.log(`  ${chalk.bold(c.name.padEnd(20))} ${chalk.dim((c.description || '').slice(0, 66))}`);
        }
        console.log(chalk.dim(`\n  ${cmds.length} command template(s). Load one with: /cmd <name> [args]\n`));
        break;
      }

      // ── /cmd — Load & run a command template ──
      case '/cmd': {
        const cmdName = parts[1];
        if (!cmdName) {
          console.log(chalk.dim('  Usage: /cmd <name> [args]  — use /cmds to list available templates.'));
          break;
        }
        const argsStr = parts.slice(2).join(' ');
        const rendered = renderCommandPrompt(cmdName, argsStr, process.cwd());
        if (!rendered) {
          console.log(chalk.red(`  Command template "${cmdName}" not found. Use /cmds to list available templates.`));
          break;
        }
        console.log(chalk.dim(`  Loaded command "${cmdName}", dispatching to agent...`));
        await _processInput(rendered, rl, agentLoop, kernel, getHistory, setHistory, getProcessing, setProcessing, getAbort, setAbort, sessionId);
        break;
      }

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
            let diffOutput = chalk.dim('  Modified files:') + '\n' + diffRes.statusShort + '\n';
            if (diffRes.diff) {
              diffOutput += chalk.dim('  Diff:') + '\n';
              const diffLines = diffRes.diff.split('\n');
              let currentFile = '';
              diffLines.forEach(l => {
                if (l.startsWith('+++') || l.startsWith('---')) return;
                if (l.startsWith('@@')) {
                  diffOutput += chalk.cyan('  ' + l) + '\n';
                  return;
                }
                if (l.startsWith('diff --git')) {
                  const file = l.split(' b/').pop();
                  if (file && file !== currentFile) {
                    currentFile = file;
                    diffOutput += chalk.bold(`  ${file}`) + '\n';
                  }
                  return;
                }
                if (l.startsWith('+')) diffOutput += chalk.green('  ' + l) + '\n';
                else if (l.startsWith('-')) diffOutput += chalk.red('  ' + l) + '\n';
                else diffOutput += chalk.dim('  ' + l) + '\n';
              });
            }
            await _pagedOutput(diffOutput, rl);
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

        // Restore chain per file: pre-write backup snapshot FIRST (preserves
        // the user's own uncommitted pre-agent edits — git restore would wipe
        // them) → git restore → delete agent-created files. Paths come from
        // model-controlled tool args recorded before validation, so shell
        // injection via execSync templates is off the table: arg-array only.
        const revertOne = (f) => {
          const entries = patchedFiles.filter(p => p.file === f);
          // Oldest usable snapshot = state before the agent's FIRST write
          const entry = entries.find(p => p.existed && p.backup) || entries[0];
          if (entry) {
            const res = restoreFromBackup(process.cwd(), f, entry);
            if (res.restored) return { ok: true, note: res.method };
          }
          try {
            execFileSync('git', ['restore', '--', f], { stdio: 'pipe' });
            return { ok: true, note: 'git' };
          } catch (_) { /* not tracked / no git state */ }
          return { ok: false, note: entry ? 'no restorable snapshot' : 'not tracked in this session' };
        };

        if (undoFile) {
          // Undo specific file
          const res = revertOne(undoFile);
          if (res.ok) console.log(chalk.green(`  Reverted: ${undoFile} (${res.note})`));
          else console.log(chalk.red(`  Failed to revert ${undoFile}: ${res.note}`));
        } else if (undoAll || uniqueFiles.length <= 5) {
          // Undo all patched files
          const confirmed = await askPermission('undo', `revert ${uniqueFiles.length} patched file(s)?`, {});
          if (confirmed) {
            let reverted = 0;
            for (const f of uniqueFiles) {
              if (revertOne(f).ok) reverted++;
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
        setHistory(await agentLoop.compactHistory(getHistory()));
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
        const rlAsk = readline.createInterface({ input: process.stdin, output: process.stdout });
        const choice = await new Promise((resolve) => {
          rlAsk.question('  Resume session (number or ID): ', (answer) => {
            resolve((answer || '').trim());
          });
        });
        rlAsk.close();
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

      // ── /tasks — Show task list status ──
      case '/tasks': {
        const taskResult = agentLoop._executeTaskList(parts[1] ? { status: parts[1] } : {});
        if (taskResult.count === 0) {
          console.log(chalk.dim('  No tasks.'));
          break;
        }
        console.log('');
        console.log(`  ${chalk.bold(`Tasks (${taskResult.count})`)}:`);
        for (const t of taskResult.tasks) {
          const statusIcon = t.status === 'completed' ? chalk.green('✓')
            : t.status === 'in_progress' ? chalk.yellow('►')
            : chalk.dim('○');
          const depInfo = t.blockedBy.length > 0 ? chalk.dim(` blockedBy:${t.blockedBy.join(',')}`) : '';
          console.log(`  ${statusIcon} ${chalk.dim(`#${t.id}`)} ${t.subject}${depInfo}`);
        }
        console.log('');
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
  // Use the LAST request's usage (each request contains the whole history, so
  // it approximates CURRENT context size). Session totals are cumulative and
  // would trigger compaction on every prompt after a few turns.
  const _stats = agentLoop.getSessionStats();
  const estFromUsage = _stats.lastPromptTokens > 0
    ? _stats.lastPromptTokens + Math.floor(_stats.lastCompletionTokens / 2)
    : 0;
  const estTokensBefore = estFromUsage || estimateTokens(getHistory());
  if (estTokensBefore > userConfig.autoCompact) {
    const oldLen = getHistory().length;
    setHistory(await agentLoop.compactHistory(getHistory()));
    console.log(chalk.dim(`  Auto-compacted ${oldLen} -> ${getHistory().length} messages (context was ~${estTokensBefore} tokens)\n`));
  }

  const callbacks = { ...createCallbacks(spinner, mdRenderer), signal: abortCtrl.signal };

  // Session-touched file count before the turn — if the agent writes during
  // this turn, snapshot a whole-workspace checkpoint afterwards (/rewind-able)
  const patchedBefore = patchedFiles.length;

  try {
    setHistory(await agentLoop.run(trimmed, getHistory(), callbacks));
    mdRenderer.flush();
    spinner.stop('');
    process.stdout.write('\n');
    // ── Per-turn cost summary ──
    printTurnSummary(agentLoop, turnStartTime);
    process.stdout.write('\n');
    // ── Auto checkpoint when this turn changed files ──
    if (patchedFiles.length > patchedBefore) {
      try {
        const cp = createCheckpoint(sessionId, process.cwd(), patchedFiles, 'auto');
        process.stdout.write(chalk.dim(`  ⧗ checkpoint #${cp.id} saved (${cp.fileCount} files) — /rewind ${cp.id} to restore\n`));
      } catch (_) { /* checkpointing is best-effort */ }
    }
    // ── Newly-finished background tasks notice ──
    _reportFinishedBackground(agentLoop);
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
  if (userConfig.maxTokens) agentLoop.maxTokens = userConfig.maxTokens;
  if (userConfig.promptCaching !== undefined) agentLoop.promptCaching = userConfig.promptCaching;

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
    console.log(chalk.red(`\n  Error: ${err.message}\n`));
  } finally {
    spinner.stop('');
    _shutdownMcp(agentLoop);
  }
}

// ── Interactive /connect command handler ──
async function handleConnect(rl, agentLoop) {
  console.log('');
  const ids = Object.keys(BUILTIN_PROVIDERS);
  ids.forEach((id, i) => {
    const p = BUILTIN_PROVIDERS[id];
    console.log(`  ${chalk.dim(String(i + 1).padStart(2))}  ${chalk.bold(id.padEnd(12))} ${chalk.dim(p.name)}`);
  });
  console.log('');

  // Pause main rl for the entire interactive session to prevent stdin conflicts
  rl.pause();

  // Use a single readline instance for ALL prompts in this session
  const rlAsk = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  function ask(promptText) {
    return new Promise((resolve) => {
      rlAsk.question(promptText, (answer) => {
        resolve((answer || '').trim());
      });
    });
  }

  try {
    const choice = await ask('  Select provider (name or number): ');

    let selectedId = choice;
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

    // Ask for base URL
    if (selectedId === 'custom' || !builtin.baseUrl) {
      const urlInput = await ask('  Base URL: ');
      baseUrl = urlInput || baseUrl;
    } else {
      const urlInput = await ask(`  Base URL (${chalk.dim(builtin.baseUrl)}): `);
      if (urlInput) baseUrl = urlInput;
    }

    // Ask for API key
    if (builtin.envKey || selectedId === 'custom') {
      const envHint = builtin.envKey ? chalk.dim(` (or set ${builtin.envKey})`) : '';
      apiKey = await ask(`  API key${envHint}: `);
      if (!apiKey && builtin.envKey) {
        apiKey = process.env[builtin.envKey] || '';
      }
    }

    // Ask for default model
    const defaultModel = builtin.defaultModel || '';
    const modelInput = await ask(`  Default model (${chalk.dim(defaultModel || 'none')}): `);

    addProvider(selectedId, {
      name: builtin.name,
      apiKey,
      baseUrl,
      model: modelInput || defaultModel,
      models: builtin.models,
    });

    // Set as active
    setActive(selectedId);

    // Sync the agentLoop instance with new provider config
    if (agentLoop && typeof agentLoop.switchProvider === 'function') {
      agentLoop.switchProvider(selectedId);
      safeSetPrompt(rl, agentLoop);
    }

    console.log(chalk.green(`  Provider "${builtin.name}" configured and activated.`));
  } finally {
    // Always clean up the temp readline and resume main rl
    rlAsk.close();
    rl.resume();
  }
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
  const rlAsk = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const choice = await new Promise((resolve) => {
      rlAsk.question('  Select model (name or number): ', (answer) => {
        resolve((answer || '').trim());
      });
    });

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
  } finally {
    rlAsk.close();
    rl.resume();
  }
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
module.exports = {
  launchChaosTerminal,
  runChaosAgentPrompt,
};
