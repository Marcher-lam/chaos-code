const fs = require('fs');
const path = require('path');
const { createLogger } = require('./logger');
const log = createLogger('CssExtractor');

class CssExtractor {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    // Default fallback configurations based on "modern" preset
    this.defaults = {
      name: 'Extracted Design',
      colors: {
        primary: '#3B82F6',
        secondary: '#6366F1',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        neutral: ['#F9FAFB', '#F3F4F6', '#E5E7EB', '#D1D5DB', '#9CA3AF', '#6B7280', '#4B5563', '#374151', '#1F2937', '#111827'],
      },
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      borderRadius: { sm: '4px', md: '8px', lg: '12px', xl: '16px', full: '9999px' },
      spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px', '2xl': '48px', '3xl': '64px' },
      shadows: {
        sm: '0 1px 2px rgba(0,0,0,.06)',
        md: '0 8px 24px rgba(0,0,0,.10)',
        lg: '0 20px 48px rgba(0,0,0,.16)',
      }
    };
  }

  /**
   * Recursively walk a directory to find relevant files
   */
  _walk(dir, results = []) {
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    for (const file of list) {
      if (file === 'node_modules' || file === '.git' || file === 'stdd') continue;
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        this._walk(fullPath, results);
      } else {
        const ext = path.extname(file);
        if (['.css', '.scss', '.sass'].includes(ext) || file.startsWith('tailwind.config.')) {
          results.push(fullPath);
        }
      }
    }
    return results;
  }

  /**
   * Scan and extract design system tokens
   * @param {string} targetDir - Directory to scan
   * @returns {Object} Extracted design tokens
   */
  extract(targetDir = this.cwd) {
    const files = this._walk(targetDir);
    const tokens = JSON.parse(JSON.stringify(this.defaults)); // Deep clone defaults
    let neutralScaleFound = false;

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const ext = path.extname(file);

        if (['.css', '.scss', '.sass'].includes(ext)) {
          this._extractFromCss(content, tokens, { neutralScaleFound });
        } else if (path.basename(file).startsWith('tailwind.config.')) {
          this._extractFromTailwind(content, tokens);
        }
      } catch (err) {
        log.warn(`Failed to parse style file ${file}: ${err.message}`);
      }
    }

    return tokens;
  }

  /** Parse standard CSS variable declarations */
  _extractFromCss(content, tokens) {
    // Regex for matching CSS variables like: --color-primary: #3b82f6; or --font-family-base: Inter;
    const cssVarRegex = /--([\w-]+)\s*:\s*([^;}\n]+)/g;
    let match;
    const cssNeutralScale = {};

    while ((match = cssVarRegex.exec(content)) !== null) {
      const name = match[1].trim().toLowerCase();
      const val = match[2].trim();

      // Categorize semantic colors
      if (name === 'color-primary') tokens.colors.primary = val;
      else if (name === 'color-secondary') tokens.colors.secondary = val;
      else if (name === 'color-success') tokens.colors.success = val;
      else if (name === 'color-warning') tokens.colors.warning = val;
      else if (name === 'color-error') tokens.colors.error = val;

      // Categorize neutral grey scales (e.g., --color-gray-50, --color-gray-100)
      else if (name.startsWith('color-gray-') || name.startsWith('color-neutral-') || name.startsWith('color-grey-')) {
        const matchNum = name.match(/\d+$/);
        if (matchNum) {
          const index = parseInt(matchNum[0], 10);
          cssNeutralScale[index] = val;
        }
      }

      // Font Family
      else if (name === 'font-family-base' || name === 'font-family') {
        tokens.fontFamily = val.replace(/['"]/g, '');
      }

      // Border Radius scale
      else if (name.startsWith('radius-')) {
        const key = name.replace('radius-', '');
        tokens.borderRadius[key] = val;
      }

      // Spacing scale
      else if (name.startsWith('spacing-')) {
        const key = name.replace('spacing-', '');
        tokens.spacing[key] = val;
      }

      // Shadows scale
      else if (name.startsWith('shadow-')) {
        const key = name.replace('shadow-', '');
        tokens.shadows[key] = val;
      }
    }

    // Sort neutral gray scale indexes (50, 100, 200...) and replace the default neutral array if complete
    const sortedKeys = Object.keys(cssNeutralScale).sort((a, b) => Number(a) - Number(b));
    if (sortedKeys.length >= 5) {
      tokens.colors.neutral = sortedKeys.map(k => cssNeutralScale[k]);
    }
  }

  /** Parse Tailwind configuration files statically via regular expressions */
  _extractFromTailwind(content, tokens) {
    // 1. Semantic Color Mappings
    const primaryMatch = content.match(/['"]?primary['"]?\s*:\s*['"]([^'"]+)['"]/);
    if (primaryMatch) tokens.colors.primary = primaryMatch[1];

    const secondaryMatch = content.match(/['"]?secondary['"]?\s*:\s*['"]([^'"]+)['"]/);
    if (secondaryMatch) tokens.colors.secondary = secondaryMatch[1];

    const successMatch = content.match(/['"]?success['"]?\s*:\s*['"]([^'"]+)['"]/);
    if (successMatch) tokens.colors.success = successMatch[1];

    const warningMatch = content.match(/['"]?warning['"]?\s*:\s*['"]([^'"]+)['"]/);
    if (warningMatch) tokens.colors.warning = warningMatch[1];

    const errorMatch = content.match(/['"]?error['"]?\s*:\s*['"]([^'"]+)['"]/);
    if (errorMatch) tokens.colors.error = errorMatch[1];

    // 2. Font Family
    const fontMatch = content.match(/['"]?fontFamily['"]?\s*:\s*\{[^}]*['"]?sans['"]?\s*:\s*\[([^\]]+)\]/);
    if (fontMatch) {
      tokens.fontFamily = fontMatch[1].split(',').map(s => s.replace(/['"]/g, '').trim()).join(', ');
    }

    // 3. Spacing / Padding / Margin
    this._extractTailwindScale(content, 'spacing', tokens.spacing);

    // 4. Border Radius
    this._extractTailwindScale(content, 'borderRadius', tokens.borderRadius);

    // 5. Box Shadow
    this._extractTailwindScale(content, 'boxShadow', tokens.shadows);
  }

  /** Helper to extract nested key-value pairs in Tailwind configs */
  _extractTailwindScale(content, sectionName, targetObject) {
    const regex = new RegExp(`['"]?${sectionName}['"]?\\s*:\\s*\\{([^}]+)\\}`, 'i');
    const match = content.match(regex);
    if (match) {
      const block = match[1];
      const kvRegex = /['"]?([\w-]+)['"]?\s*:\s*['"]([^'"]+)['"]/g;
      let kv;
      while ((kv = kvRegex.exec(block)) !== null) {
        targetObject[kv[1]] = kv[2];
      }
    }
  }
}

module.exports = { CssExtractor };
