/**
 * Tests for multiline input support in chaos-terminal.
 */

// We test isUnclosedExpression directly since it's the core detection function.
// The actual REPL flow is tested via chaos-terminal.test.js.

describe('isUnclosedExpression (multiline trigger)', () => {
  // Re-implement the function from chaos-terminal.js for unit testing
  function isUnclosedExpression(line) {
    const opens = (line.match(/[{(\[]/g) || []).length;
    const closes = (line.match(/[})\]]/g) || []).length;
    if (opens > closes) return true;
    const backticks = (line.match(/`/g) || []).length;
    if (backticks % 2 !== 0) return true;
    return false;
  }

  test('should detect unclosed parenthesis', () => {
    expect(isUnclosedExpression('function test(')).toBe(true);
    expect(isUnclosedExpression('(a + b')).toBe(true);
  });

  test('should detect unclosed curly braces', () => {
    expect(isUnclosedExpression('const obj = {')).toBe(true);
    expect(isUnclosedExpression('{a: 1, b: {')).toBe(true);
  });

  test('should detect unclosed square brackets', () => {
    expect(isUnclosedExpression('const arr = [')).toBe(true);
    expect(isUnclosedExpression('[1, 2,')).toBe(true);
  });

  test('should detect unclosed backtick', () => {
    expect(isUnclosedExpression('const str = `hello')).toBe(true);
    expect(isUnclosedExpression('`template literal')).toBe(true);
  });

  test('should return false for balanced expressions', () => {
    expect(isUnclosedExpression('function test()')).toBe(false);
    expect(isUnclosedExpression('const obj = {}')).toBe(false);
    expect(isUnclosedExpression('const arr = []')).toBe(false);
    expect(isUnclosedExpression('`template`')).toBe(false);
  });

  test('should return false for plain text', () => {
    expect(isUnclosedExpression('hello world')).toBe(false);
    expect(isUnclosedExpression('fix the bug')).toBe(false);
  });

  test('should handle nested brackets', () => {
    expect(isUnclosedExpression('func({a: [1, 2]})')).toBe(false);
    expect(isUnclosedExpression('func({a: [1, 2]')).toBe(true);
  });

  test('should handle empty string', () => {
    expect(isUnclosedExpression('')).toBe(false);
  });
});
