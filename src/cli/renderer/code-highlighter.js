/**
 * Code syntax highlighter for terminal output.
 * Wraps cli-highlight with fallback to plain text.
 */

let _highlight = null;

function _loadHighlight() {
  if (_highlight !== null) return _highlight;
  try {
    _highlight = require('cli-highlight').highlight;
  } catch (_) {
    _highlight = false;
  }
  return _highlight;
}

/**
 * Highlight a code string for terminal output.
 * @param {string} code - Source code
 * @param {string} [lang] - Language hint (js, ts, python, etc.)
 * @returns {string} Highlighted string with ANSI escapes
 */
function highlightCode(code, lang) {
  const fn = _loadHighlight();
  if (!fn) return code;
  try {
    return fn(code, {
      language: lang || _detectLang(code),
      ignoreIllegals: true,
      theme: {
        keyword: '\x1b[33m',   // yellow
        string: '\x1b[32m',    // green
        number: '\x1b[35m',    // magenta
        comment: '\x1b[2m',    // dim
        function: '\x1b[36m',  // cyan
        class: '\x1b[36m',     // cyan
        variable: '\x1b[37m',  // white
        operator: '\x1b[37m',  // white
        built_in: '\x1b[33m',  // yellow
      },
    });
  } catch (_) {
    return code;
  }
}

/**
 * Simple language detection from content heuristic.
 */
function _detectLang(code) {
  const t = code.trim();
  if (t.startsWith('<?php')) return 'php';
  if (/^import\s/.test(t) && /from\s+['"]/.test(t)) return 'python';
  if (/^(const|let|var|function|class|import|export)\s/.test(t)) return 'javascript';
  if (/^(fn|let|mut|pub|use|impl)\s/.test(t)) return 'rust';
  if (/^(package|import|func|type|var)\s/.test(t)) return 'go';
  if (/^#include/.test(t)) return 'cpp';
  if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER)\s/i.test(t)) return 'sql';
  if (/^\s*[{[]/.test(t)) return 'json';
  if (/^---\s/.test(t) || /^[\w.-]+:\s/.test(t)) return 'yaml';
  if (/^<!DOCTYPE|^<html/i.test(t)) return 'xml';
  if (/^#!/.test(t)) {
    if (t.includes('bash') || t.includes('sh')) return 'bash';
    if (t.includes('python')) return 'python';
    if (t.includes('node')) return 'javascript';
  }
  return undefined;
}

module.exports = { highlightCode };
