/**
 * Streaming Markdown renderer for terminal output.
 * Buffers tokens line-by-line, renders markdown inline styles,
 * code blocks with syntax highlighting.
 */

const chalk = require('chalk');
const { highlightCode } = require('./code-highlighter');

class StreamingMarkdownRenderer {
  constructor() {
    this.buffer = '';
    this.inCodeBlock = false;
    this.codeBlockLang = '';
    this.codeBlockBuffer = '';
    this.lineNum = 0;
  }

  /**
   * Push a token (partial text) into the renderer.
   * Outputs rendered lines as they complete.
   * @param {string} token
   */
  push(token) {
    this.buffer += token;
    let idx;
    while ((idx = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, idx);
      this.buffer = this.buffer.slice(idx + 1);
      this._renderLine(line);
    }
  }

  /**
   * Flush any remaining buffered content.
   */
  flush() {
    if (this.buffer) {
      this._renderLine(this.buffer);
      this.buffer = '';
    }
  }

  _renderLine(line) {
    this.lineNum++;

    // ── Code block boundary ──
    if (line.trimStart().startsWith('```')) {
      if (!this.inCodeBlock) {
        this.inCodeBlock = true;
        this.codeBlockLang = line.trimStart().slice(3).trim();
        this.codeBlockBuffer = '';
        const label = this.codeBlockLang || 'code';
        process.stdout.write(chalk.dim(`  ┌─ ${label} ─${'─'.repeat(Math.max(0, 40 - label.length))}\n`));
      } else {
        this.inCodeBlock = false;
        if (this.codeBlockBuffer.trim()) {
          const highlighted = highlightCode(this.codeBlockBuffer.replace(/\n$/, ''), this.codeBlockLang || undefined);
          process.stdout.write(highlighted + '\n');
        }
        process.stdout.write(chalk.dim('  └' + '─'.repeat(50) + '\n'));
      }
      return;
    }

    // ── Inside code block: accumulate ──
    if (this.inCodeBlock) {
      this.codeBlockBuffer += line + '\n';
      return;
    }

    // ── Normal line: render inline markdown ──
    process.stdout.write(this._renderInline(line) + '\n');
  }

  /**
   * Render inline markdown styles on a single line.
   */
  _renderInline(line) {
    // Heading
    if (/^#{1,6}\s/.test(line)) {
      const m = line.match(/^(#{1,6})\s+(.*)$/);
      if (m) {
        return chalk.bold(m[2]);
      }
    }

    // Horizontal rule
    if (/^[-*_]{3,}\s*$/.test(line)) {
      return chalk.dim('─'.repeat(50));
    }

    // Blockquote
    if (line.startsWith('> ')) {
      return chalk.dim('  │ ') + this._renderInlineStyles(line.slice(2));
    }

    // Unordered list
    if (/^[\s]*[-*+]\s/.test(line)) {
      const m = line.match(/^([\s]*)([-*+])\s(.*)$/);
      if (m) {
        return m[1] + chalk.dim('  • ') + this._renderInlineStyles(m[3]);
      }
    }

    // Ordered list
    if (/^[\s]*\d+\.\s/.test(line)) {
      const m = line.match(/^([\s]*)(\d+\.)\s(.*)$/);
      if (m) {
        return m[1] + chalk.dim(`  ${m[2]} `) + this._renderInlineStyles(m[3]);
      }
    }

    return this._renderInlineStyles(line);
  }

  /**
   * Apply inline markdown styles: bold, italic, code, links.
   */
  _renderInlineStyles(text) {
    // Inline code: `text`
    text = text.replace(/`([^`]+)`/g, (_, content) => {
      return chalk.inverse(' ' + content + ' ');
    });

    // Bold: **text** or __text__
    text = text.replace(/\*\*(.+?)\*\*/g, (_, content) => chalk.bold(content));
    text = text.replace(/__(.+?)__/g, (_, content) => chalk.bold(content));

    // Italic: *text* or _text_ (avoid matching within words)
    text = text.replace(/(?<!\w)\*(.+?)\*(?!\w)/g, (_, content) => chalk.italic(content));

    // Strikethrough: ~~text~~
    text = text.replace(/~~(.+?)~~/g, (_, content) => chalk.dim.strikethrough(content));

    // Links: [text](url)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
      return chalk.blue.underline(label) + chalk.dim(` (${url})`);
    });

    return text;
  }
}

/**
 * One-shot render a complete markdown string (non-streaming).
 * Used for tool results and other static content.
 */
function renderMarkdown(text) {
  const renderer = new StreamingMarkdownRenderer();
  renderer.push(text);
  renderer.flush();
}

module.exports = { StreamingMarkdownRenderer, renderMarkdown };
