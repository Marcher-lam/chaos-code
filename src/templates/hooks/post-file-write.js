#!/usr/bin/env node

/**
 * PostToolUse Hook - Post-file write check
 *
 * Enforced Constitution Articles:
 * - Article 5: Documentation
 * - Article 6: Error Handling
 * - Article 8: Performance
 */


let inputData = '';
process.stdin.on('data', chunk => {
  inputData += chunk;
});

process.stdin.on('end', async () => {
  try {
    if (process.env.STDD_HOOKS_DISABLED) {
      process.exit(0);
      return;
    }

    const data = JSON.parse(inputData);
    const suggestions = await analyzeCode(data);

    if (suggestions.length > 0) {
      console.log(JSON.stringify({
        message: formatSuggestions(suggestions),
        suggestions
      }));
    }

    process.exit(0);
  } catch (error) {
    console.error('STDD Hook error:', error.message);
    process.exit(0);
  }
});

async function analyzeCode(data) {
  const { tool_input, tool_name } = data;

  if (!['Write', 'Edit'].includes(tool_name)) {
    return [];
  }

  const filePath = tool_input.file_path || '';
  const content = tool_input.content || tool_input.new_string || '';

  const suggestions = [];

  // Article 5: Documentation
  if (isSourceFile(filePath) && !hasDocumentation(content)) {
    suggestions.push({
      article: 5,
      level: 'suggestion',
      message: 'Public API without documentation',
      suggestion: 'Consider adding JSDoc/TSDoc comments'
    });
  }

  // Article 6: Error Handling
  if (hasEmptyCatch(content)) {
    suggestions.push({
      article: 6,
      level: 'warning',
      message: 'Empty catch block detected',
      suggestion: 'Handle the error or add a comment explaining why it is ignored'
    });
  }

  // Article 8: Performance
  if (hasNPlusOnePattern(content)) {
    suggestions.push({
      article: 8,
      level: 'warning',
      message: 'Possible N+1 query issue',
      suggestion: 'Consider using batch queries or JOINs'
    });
  }

  return suggestions;
}

function isSourceFile(filePath) {
  return /\.(ts|js|py|go|java)$/.test(filePath);
}

function hasDocumentation(content) {
  return /\/\*\*[\s\S]*?\*\//.test(content);
}

function hasEmptyCatch(content) {
  return /catch\s*\([^)]*\)\s*\{\s*\}/.test(content);
}

function hasNPlusOnePattern(content) {
  const loopPatterns = /for\s*\(.*await.*\)/;
  const dbPatterns = /\.findMany\(|\.findById\(/;
  return loopPatterns.test(content) && dbPatterns.test(content);
}

function formatSuggestions(suggestions) {
  let message = 'STDD Guard - Improvement Suggestions\n\n';

  suggestions.forEach(s => {
    const icon = s.level === 'warning' ? 'Warning' : 'Suggestion';
    message += `${icon} Article ${s.article}: ${s.message}\n`;
    message += `   ${s.suggestion}\n\n`;
  });

  return message;
}
