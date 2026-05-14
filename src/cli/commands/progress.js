/**
 * stdd progress — view session progress history and resume context.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { SessionProgress, FILENAME } = require('../../utils/session-progress');

class ProgressCommand {
  execute(options = {}) {
    const stddDir = path.join(process.cwd(), 'stdd');
    if (!fs.existsSync(stddDir)) {
      console.error(chalk.red('STDD not initialized. Run `stdd init` first.'));
      process.exit(1);
    }
    const p = new SessionProgress(stddDir);

    if (options.clear) { p.clear(); console.log(chalk.green('Progress log cleared.')); return; }
    if (options.summary) return this._summary(p, options);
    if (options.resume) return this._resume(p, options);
    return this._history(p, options);
  }

  _summary(p, opts) {
    const s = p.summary();
    if (opts.json) { console.log(JSON.stringify(s, null, 2)); return; }
    console.log(chalk.bold('\n📊 Session Progress\n'));
    console.log(`  Commands:    ${s.total}`);
    console.log(`  ${chalk.green('Completed')}:  ${s.completed}`);
    console.log(`  ${chalk.red('Failed')}:     ${s.failed}`);
    console.log(`  ${chalk.yellow('Interrupted')}: ${s.interrupted}`);
    if (s.incomplete > 0) {
      const ctx = p.getResumeContext();
      console.log(chalk.yellow(`\n  ⚠ ${s.incomplete} incomplete → stdd progress --resume`));
      if (ctx) console.log(chalk.dim(`    Last: ${ctx.start.cmd} at ${ctx.start.ts}`));
    }
    if (s.lastActivity) console.log(`\n  Last activity: ${s.lastActivity}`);
    console.log();
  }

  _resume(p, opts) {
    const ctx = p.getResumeContext();
    if (!ctx) { console.log(chalk.green('\n✅ No incomplete commands.\n')); return; }
    if (opts.json) { console.log(JSON.stringify(ctx, null, 2)); return; }
    console.log(chalk.bold('\n🔄 Resume Context\n'));
    console.log(`  Command:  ${chalk.bold(ctx.start.cmd)}`);
    console.log(`  Started:  ${ctx.start.ts}`);
    if (ctx.start.args) console.log(`  Args:     ${JSON.stringify(ctx.start.args)}`);
    if (ctx.failed) console.log(chalk.red(`  ❌ Failed: ${ctx.failureDetail?.err || 'unknown'}`));
    const c = ctx.start.args?.change || ctx.start.args?.changeName;
    const suffix = c ? ` ${c}` : '';
    console.log(chalk.cyan(`\n  → stdd continue${suffix}`));
    console.log();
  }

  _history(p, opts) {
    const n = parseInt(opts.last, 10) || 20;
    const entries = p.readLast(n);
    if (!entries.length) { console.log(chalk.dim('\nNo progress recorded.\n')); return; }
    if (opts.json) { console.log(JSON.stringify(entries, null, 2)); return; }
    console.log(chalk.bold(`\n📜 Progress (last ${entries.length})\n`));
    const icons = { start: chalk.cyan('▶'), complete: chalk.green('✓'), fail: chalk.red('✗'), interrupt: chalk.yellow('⚡'), cp: chalk.blue('◆') };
    for (const e of entries) {
      const t = (e.ts || '').replace('T', ' ').replace(/\.\d+Z$/, '');
      const ch = e.args?.change || e.args?.changeName || '';
      const err = e.err ? chalk.red(` → ${e.err}`) : '';
      console.log(`  ${icons[e.ev] || '·'} ${chalk.dim(t)} ${e.cmd || ''}${ch ? ` [${ch}]` : ''}${err}`);
    }
    console.log();
  }
}

module.exports = { ProgressCommand };
