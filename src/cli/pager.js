/**
 * Simple terminal pager for long output.
 * Shows output page by page with Enter/Space for next, q to quit.
 */

const chalk = require('chalk');

class SimplePager {
  constructor(output, pageSize) {
    this.lines = output.split('\n');
    this.pageSize = pageSize || (process.stdout.rows - 2);
    this.page = 0;
    this.totalPages = Math.ceil(this.lines.length / this.pageSize);
  }

  /**
   * Write paged output to stdout using readline.
   * @param {readline.Interface} rl - Active readline instance
   * @returns {Promise<void>}
   */
  show(rl) {
    return new Promise((resolve) => {
      const showPage = () => {
        const start = this.page * this.pageSize;
        const end = Math.min(start + this.pageSize, this.lines.length);

        for (let i = start; i < end; i++) {
          process.stdout.write(this.lines[i] + '\n');
        }

        if (end >= this.lines.length) {
          resolve();
          return;
        }

        this.page++;
        process.stdout.write(chalk.dim(`  -- More (${end}/${this.lines.length}) [Space/Enter=next, q=quit] -- `));

        // Temporarily listen for keypress
        const onData = (chunk) => {
          const key = chunk.toString();
          if (key === 'q' || key === 'Q' || key === '\x03') {
            process.stdout.write('\n');
            process.stdin.removeListener('data', onData);
            resolve();
          } else if (key === '\n' || key === ' ' || key === '\r') {
            process.stdout.write('\n');
            showPage();
          }
        };
        process.stdin.once('data', onData);
      };

      if (rl) rl.pause();
      showPage();
      // Resume rl after pager is done via the resolve chain
    }).then(() => { if (rl) rl.resume(); });
  }

  /**
   * Check if output needs paging.
   * @param {string} output
   * @param {number} [threshold]
   * @returns {boolean}
   */
  static needsPaging(output, threshold) {
    const rows = threshold || (process.stdout.rows - 2);
    return output.split('\n').length > rows;
  }
}

module.exports = { SimplePager };
