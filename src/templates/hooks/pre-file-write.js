#!/usr/bin/env node

/**
 * PreToolUse Hook - Pre-file write check
 *
 * Enforced Constitution Articles:
 * - Article 2: TDD (Test-First)
 * - Article 4: Code Style
 * - Article 7: Security
 */

const fs = require('fs');

let inputData = '';
process.stdin.on('data', chunk => {
  inputData += chunk;
});

process.stdin.on('end', async () => {
  try {
    if (process.env.STDD_HOOKS_DISABLED) {
      console.log(JSON.stringify({ block: false }));
      process.exit(0);
      return;
    }

    const data = JSON.parse(inputData);
    const result = await runChecks(data);

    console.log(JSON.stringify(result));
    process.exit(result.block ? 1 : 0);
  } catch (error) {
    console.error('STDD Hook error:', error.message);
    process.exit(0);
  }
});

async function runChecks(data) {
  const { tool_input, tool_name } = data;

  if (!['Write', 'Edit'].includes(tool_name)) {
    return { block: false };
  }

  const filePath = tool_input.file_path || '';
  const content = tool_input.content || tool_input.new_string || '';

  const violations = [];

  // Article 2: TDD Check
  if (isImplementationFile(filePath)) {
    const testFile = getCorrespondingTestFile(filePath);
    if (!fs.existsSync(testFile)) {
      violations.push({
        article: 2,
        level: 'error',
        message: `Test file not found: ${testFile}`,
        suggestion: 'Create a failing test first: /stdd:apply'
      });
    }
  }

  // Article 4: Code Style Check
  violations.push(...checkCodeStyle(content, filePath));

  // Article 7: Security Check
  violations.push(...checkSecurity(content, filePath));

  const hasErrors = violations.some(v => v.level === 'error');

  return {
    block: hasErrors,
    violations,
    message: hasErrors ? formatViolationMessage(violations) : null
  };
}

function isImplementationFile(filePath) {
  const srcPattern = /\/src\//;
  const testPattern = /\.(test|spec)\./;
  return srcPattern.test(filePath) && !testPattern.test(filePath);
}

function getCorrespondingTestFile(filePath) {
  return filePath
    .replace('/src/', '/src/__tests__/')
    .replace(/\.ts$/, '.test.ts')
    .replace(/\.js$/, '.test.js')
    .replace(/\.py$/, '_test.py')
    .replace(/\.go$/, '_test.go');
}

function checkCodeStyle(content) {
  const violations = [];

  const lines = content.split('\n');
  if (lines.length > 500) {
    violations.push({
      article: 4,
      level: 'warning',
      message: `File too long: ${lines.length} lines (recommended < 500)`,
      suggestion: 'Consider splitting into smaller modules'
    });
  }

  return violations;
}

function checkSecurity(content) {
  const violations = [];

  const sensitivePatterns = [
    { pattern: /password\s*=\s*['"][^'"]+['"]/i, name: 'password' },
    { pattern: /api[_-]?key\s*=\s*['"][^'"]+['"]/i, name: 'API key' },
    { pattern: /secret\s*=\s*['"][^'"]+['"]/i, name: 'secret' },
    { pattern: /token\s*=\s*['"][a-zA-Z0-9]{20,}['"]/i, name: 'token' }
  ];

  for (const { pattern, name } of sensitivePatterns) {
    if (pattern.test(content)) {
      violations.push({
        article: 7,
        level: 'error',
        message: `Hardcoded sensitive data detected: ${name}`,
        suggestion: 'Use environment variables instead'
      });
    }
  }

  return violations;
}

function formatViolationMessage(violations) {
  const errors = violations.filter(v => v.level === 'error');
  const warnings = violations.filter(v => v.level === 'warning');

  let message = 'STDD Guard - Constitution Violation\n\n';

  if (errors.length > 0) {
    message += 'Blocking Issues:\n';
    errors.forEach(e => {
      message += `  - Article ${e.article}: ${e.message}\n`;
      message += `    Suggestion: ${e.suggestion}\n`;
    });
  }

  if (warnings.length > 0) {
    message += '\nWarnings:\n';
    warnings.forEach(w => {
      message += `  - Article ${w.article}: ${w.message}\n`;
    });
  }

  return message;
}
