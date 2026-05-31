/**
 * CSS Token Extraction
 * Reads DESIGN.md and extracts design tokens for CSS generation.
 * Supports both Markdown table format and embedded JSON blocks.
 */

const fs = require('fs');

function extractTokensFromDesignMD(designPath) {
  const result = {
    colors: {
      primary: '#3B82F6',
      secondary: '#6366F1',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
    },
    fonts: {
      familyBase: 'Inter, system-ui, -apple-system, sans-serif',
      familyMono: 'JetBrains Mono, monospace',
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      '2xl': '3rem',
      '3xl': '4rem',
    },
    radius: {
      sm: '0.25rem',
      md: '0.5rem',
      lg: '0.75rem',
      xl: '1rem',
      full: '9999px',
    },
  };

  if (!fs.existsSync(designPath)) {
    return result;
  }

  const content = fs.readFileSync(designPath, 'utf8');

  // Priority 1: Try to parse embedded JSON block
  // Supports ```json (design-tokens) or <!-- design-tokens --> blocks
  const jsonBlockRe = /```json\s*\n([\s\S]*?)```/g;
  let jsonMatch;
  while ((jsonMatch = jsonBlockRe.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(jsonMatch[1].trim());
      if (parsed.colors) Object.assign(result.colors, parsed.colors);
      if (parsed.fonts) Object.assign(result.fonts, parsed.fonts);
      if (parsed.spacing) Object.assign(result.spacing, parsed.spacing);
      if (parsed.radius) Object.assign(result.radius, parsed.radius);
      return result;
    } catch (_) {
      // Not valid JSON, continue to next block
    }
  }

  // Priority 2: Try HTML comment-delimited JSON block
  const commentJsonRe = /<!--\s*design-tokens\s*-->\s*\n([\s\S]*?)\n\s*<!--\s*\/design-tokens\s*-->/g;
  let commentMatch;
  while ((commentMatch = commentJsonRe.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(commentMatch[1].trim());
      if (parsed.colors) Object.assign(result.colors, parsed.colors);
      if (parsed.fonts) Object.assign(result.fonts, parsed.fonts);
      if (parsed.spacing) Object.assign(result.spacing, parsed.spacing);
      if (parsed.radius) Object.assign(result.radius, parsed.radius);
      return result;
    } catch (_) {
      // Not valid JSON, fallback to regex
    }
  }

  // Priority 3: Fallback to regex-based Markdown table extraction
  // Extract semantic color tokens (table format: | `--color-xxx` | `#hex` | role |)
  const colorTokenRe = /`--color-(\w+)`\s*\|\s*`([^`]+)`/g;
  let match;
  while ((match = colorTokenRe.exec(content)) !== null) {
    result.colors[match[1]] = match[2];
  }

  // Extract neutral / gray scale tokens
  const grayTokenRe = /`--color-gray-(\d+)`\s*\|\s*`([^`]+)`/g;
  while ((match = grayTokenRe.exec(content)) !== null) {
    result.colors[`gray-${match[1]}`] = match[2];
  }

  // Extract bare hex colors in Semantic Tokens table
  const bareColorRe = /\|\s*`--color-(\w+)`\s*\|\s*`?(#[0-9a-fA-F]{3,8})`?/g;
  while ((match = bareColorRe.exec(content)) !== null) {
    if (!result.colors[match[1]]) {
      result.colors[match[1]] = match[2];
    }
  }

  // Extract font family
  const fontBaseRe = /--font-family-base:\s*(.+)/;
  match = fontBaseRe.exec(content);
  if (match) {
    result.fonts.familyBase = match[1].trim();
  }

  const fontMonoRe = /--font-family-mono:\s*(.+)/;
  match = fontMonoRe.exec(content);
  if (match) {
    result.fonts.familyMono = match[1].trim();
  }

  // Extract spacing tokens
  const spacingRe = /--spacing-(\w[\w]*):\s*([^\n]+)/g;
  while ((match = spacingRe.exec(content)) !== null) {
    result.spacing[match[1]] = match[2].trim();
  }

  // Extract border-radius tokens
  const radiusRe = /--radius-(\w+):\s*([^\n]+)/g;
  while ((match = radiusRe.exec(content)) !== null) {
    result.radius[match[1]] = match[2].trim();
  }

  return result;
}

/**
 * Convert token object to CSS custom properties string.
 * @param {object} tokens - Token object from extractTokensFromDesignMD
 * @returns {string} CSS string with :root custom properties
 */
function tokensToCSS(tokens) {
  const lines = [':root {'];

  for (const [key, value] of Object.entries(tokens.colors || {})) {
    lines.push(`  --color-${key}: ${value};`);
  }

  for (const [key, value] of Object.entries(tokens.fonts || {})) {
    const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    lines.push(`  --font-${cssKey}: ${value};`);
  }

  for (const [key, value] of Object.entries(tokens.spacing || {})) {
    lines.push(`  --spacing-${key}: ${value};`);
  }

  for (const [key, value] of Object.entries(tokens.radius || {})) {
    lines.push(`  --radius-${key}: ${value};`);
  }

  lines.push('}');
  return lines.join('\n');
}

module.exports = { extractTokensFromDesignMD, tokensToCSS };
