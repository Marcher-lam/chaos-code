/**
 * Design Command
 * DESIGN.md generation for frontend design system specification.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { createLogger } = require('../../utils/logger');
const { TechStackDetector, detectTechStack: _detectTechStack } = require('../../utils/tech-stack-detector');
const logger = createLogger('design');

const PRESETS = {
  modern: {
    name: 'Modern SaaS',
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
  },
  dark: {
    name: 'Dark Developer',
    colors: {
      primary: '#10B981',
      secondary: '#059669',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      neutral: ['#0D1117', '#161B22', '#21262D', '#30363D', '#484F58', '#6E7681', '#8B949E', '#B1BAC4', '#C9D1D9', '#F0F6FC'],
    },
    fontFamily: 'JetBrains Mono, Fira Code, monospace',
    borderRadius: { sm: '4px', md: '6px', lg: '8px', xl: '12px', full: '9999px' },
    spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px', '2xl': '48px', '3xl': '64px' },
  },
  minimal: {
    name: 'Minimal Clean',
    colors: {
      primary: '#000000',
      secondary: '#333333',
      success: '#059669',
      warning: '#D97706',
      error: '#DC2626',
      neutral: ['#FFFFFF', '#FAFAFA', '#F5F5F5', '#E5E5E5', '#D4D4D4', '#A3A3A3', '#737373', '#525252', '#262626', '#171717'],
    },
    fontFamily: 'Georgia, serif',
    borderRadius: { sm: '0', md: '0', lg: '0', xl: '0', full: '9999px' },
    spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px', '2xl': '48px', '3xl': '64px' },
  },
};

function renderDesignMD(preset = 'modern', custom = {}) {
  const p = { ...PRESETS[preset], ...custom };
  const colors = p.colors;

  return `# Design System

> Generated: ${new Date().toISOString().split('T')[0]}
> Preset: ${p.name}

## Visual Theme & Atmosphere

This project uses a **${p.name.split(' ')[0].toLowerCase()}** design style with emphasis on clarity and consistency.

## Colors

### Semantic Tokens

\`\`\`
--color-primary: ${colors.primary}
--color-secondary: ${colors.secondary}
--color-success: ${colors.success}
--color-warning: ${colors.warning}
--color-error: ${colors.error}
\`\`\`

### Neutral Scale

\`\`\`
--color-gray-50: ${colors.neutral[0]}
--color-gray-100: ${colors.neutral[1]}
--color-gray-200: ${colors.neutral[2]}
--color-gray-300: ${colors.neutral[3]}
--color-gray-400: ${colors.neutral[4]}
--color-gray-500: ${colors.neutral[5]}
--color-gray-600: ${colors.neutral[6]}
--color-gray-700: ${colors.neutral[7]}
--color-gray-800: ${colors.neutral[8]}
--color-gray-900: ${colors.neutral[9]}
\`\`\`

## Typography

### Font Stack

\`\`\`
--font-family-base: ${p.fontFamily}
--font-family-mono: ${p.fontFamily.includes('Mono') ? p.fontFamily : 'JetBrains Mono, monospace'}
\`\`\`

### Type Scale

\`\`\`
--text-xs: 0.75rem     /* 12px */
--text-sm: 0.875rem    /* 14px */
--text-base: 1rem      /* 16px */
--text-lg: 1.125rem    /* 18px */
--text-xl: 1.25rem     /* 20px */
--text-2xl: 1.5rem     /* 24px */
--text-3xl: 1.875rem   /* 30px */
--text-4xl: 2.25rem    /* 36px */
--text-5xl: 3rem       /* 48px */
\`\`\`

## Spacing

\`\`\`
--spacing-xs: ${p.spacing.xs}
--spacing-sm: ${p.spacing.sm}
--spacing-md: ${p.spacing.md}
--spacing-lg: ${p.spacing.lg}
--spacing-xl: ${p.spacing.xl}
--spacing-2xl: ${p.spacing['2xl']}
--spacing-3xl: ${p.spacing['3xl']}
\`\`\`

## Border Radius

\`\`\`
--radius-sm: ${p.borderRadius.sm}
--radius-md: ${p.borderRadius.md}
--radius-lg: ${p.borderRadius.lg}
--radius-xl: ${p.borderRadius.xl}
--radius-full: ${p.borderRadius.full}
\`\`\`

## Component Guidelines

### Buttons

- Primary buttons use \`--color-primary\` background with white text
- Secondary buttons use \`--color-secondary\` background
- Border radius: \`--radius-md\`
- Padding: \`--spacing-sm\` \`--spacing-md\`
- Hover: Darken background by 10%

### Inputs

- Border: 1px solid \`--color-gray-300\`
- Border radius: \`--radius-md\`
- Padding: \`--spacing-sm\` \`--spacing-md\`
- Focus: Outline with \`--color-primary\`

### Cards

- Background: \`--color-gray-50\`
- Border: 1px solid \`--color-gray-200\`
- Border radius: \`--radius-lg\`
- Padding: \`--spacing-lg\`

## Layout Principles

- Max content width: 1200px
- Grid system: 12 columns
- Gutter: \`--spacing-md\`
- Container padding: \`--spacing-lg\`

## Responsive Breakpoints

\`\`\`
--breakpoint-sm: 640px
--breakpoint-md: 768px
--breakpoint-lg: 1024px
--breakpoint-xl: 1280px
\`\`\`

## Do's and Don'ts

\`\`\`
✓ DO use semantic color tokens
✓ DO follow the spacing scale
✓ DO maintain consistent border radius
✗ DON'T use arbitrary hex values
✗ DON'T mix fonts within components
✗ DON'T create custom spacing values
\`\`\`

## Agent Prompt Guide

When generating UI code:

1. Always use CSS variables from this design system
2. Follow component guidelines for consistency
3. Use semantic color names, not hex values
4. Apply spacing from the defined scale
5. Match border radius to component type

---

*This DESIGN.md should be updated when design requirements change.*
`;
}

class DesignCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.designPath = path.join(cwd, 'DESIGN.md');
  }

  async execute(action = 'create', args = [], options = {}) {
    switch (action) {
      case 'create':
      case 'init':
      case 'generate':
        return await this.create(options);
      case 'show':
      case 'view':
        return this.show(options);
      case 'check':
        return this.check(options);
      case 'update':
        return await this.update(options);
      default:
        return await this.create(options);
    }
  }

  async create(options = {}) {
    if (fs.existsSync(this.designPath) && !options.force) {
      throw new Error(`DESIGN.md already exists. Use --force to overwrite.`);
    }

    const techStack = _detectTechStack ? await _detectTechStack(this.cwd) : TechStackDetector.analyze(this.cwd);
    const preset = options.preset || options.p || 'modern';

    if (!PRESETS[preset]) {
      throw new Error(`Unknown preset: ${preset}. Available: ${Object.keys(PRESETS).join(', ')}`);
    }

    const content = renderDesignMD(preset);
    fs.writeFileSync(this.designPath, content, 'utf8');

    if (options.json) {
      console.log(JSON.stringify({ path: this.designPath, preset, created: true }, null, 2));
    } else {
      console.log(chalk.bold('\n✓ DESIGN.md created\n'));
      console.log(`  ${chalk.cyan(path.relative(this.cwd, this.designPath))}`);
      console.log(`  Preset: ${chalk.cyan(preset)} (${PRESETS[preset].name})`);
      console.log(chalk.dim('\n  AI agents will now use this design system for UI generation.\n'));
    }
    return { path: this.designPath, preset, created: true };
  }

  show(options = {}) {
    if (!fs.existsSync(this.designPath)) {
      if (options.json) {
        console.log(JSON.stringify({ exists: false, message: 'No DESIGN.md found. Run "stdd design create" to create one.' }, null, 2));
      } else {
        console.log(chalk.yellow('\nNo DESIGN.md found.\n'));
        console.log('  Run ' + chalk.cyan('stdd design create') + ' to create one.\n');
      }
      return { exists: false };
    }

    const content = fs.readFileSync(this.designPath, 'utf8');
    if (options.json) {
      console.log(JSON.stringify({ exists: true, path: this.designPath, content }, null, 2));
    } else {
      console.log(chalk.bold('\n' + path.relative(this.cwd, this.designPath) + '\n'));
      console.log(chalk.dim('─'.repeat(50)));
      console.log(content);
      console.log(chalk.dim('─'.repeat(50) + '\n'));
    }
    return { exists: true, path: this.designPath, content };
  }

  check(options = {}) {
    if (!fs.existsSync(this.designPath)) {
      throw new Error(`No DESIGN.md found. Run "stdd design create" first.`);
    }

    const content = fs.readFileSync(this.designPath, 'utf8');
    const issues = [];
    const checks = {
      hasColors: /##\s*Colors/i.test(content) && /--color-/.test(content),
      hasTypography: /##\s*Typography/i.test(content) && /--text-/.test(content),
      hasSpacing: /##\s*Spacing/i.test(content) && /--spacing-/.test(content),
      hasBorderRadius: /##\s*Border Radius/i.test(content) && /--radius-/.test(content),
      hasComponents: /##\s*Component Guidelines/i.test(content),
      hasResponsive: /##\s*Responsive/i.test(content) || /breakpoint/i.test(content),
      usesCssVars: /--[\w-]+:/g.test(content),
    };

    if (!checks.hasColors) issues.push('Colors section missing or incomplete');
    if (!checks.hasTypography) issues.push('Typography section missing or incomplete');
    if (!checks.hasSpacing) issues.push('Spacing section missing or incomplete');
    if (!checks.hasBorderRadius) issues.push('Border Radius section missing or incomplete');
    if (!checks.hasComponents) issues.push('Component Guidelines section missing');
    if (!checks.hasResponsive) issues.push('Responsive breakpoints missing');
    if (!checks.usesCssVars) issues.push('No CSS variables found (use --var-name: value format)');

    const result = {
      path: this.designPath,
      checks,
      issues,
      score: Math.max(0, 100 - issues.length * 12),
      complete: issues.length === 0,
    };

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.bold('\nDESIGN.md Check\n'));
      console.log(`  Score: ${result.score >= 70 ? chalk.green(result.score) : chalk.yellow(result.score)}/100\n`);

      Object.entries(checks).forEach(([key, value]) => {
        console.log(`  ${value ? chalk.green('✓') : chalk.yellow('○')} ${key}`);
      });

      if (issues.length > 0) {
        console.log(chalk.yellow('\n  Issues:\n'));
        issues.forEach(issue => console.log(`    • ${issue}`));
      }
      console.log('');
    }
    return result;
  }

  async update(options = {}) {
    if (!fs.existsSync(this.designPath)) {
      throw new Error(`No DESIGN.md found. Run "stdd design create" first.`);
    }

    const preset = options.preset || options.p;
    if (!preset) {
      throw new Error('Specify a preset with --preset to update. Available: modern, dark, minimal');
    }

    if (!PRESETS[preset]) {
      throw new Error(`Unknown preset: ${preset}`);
    }

    const content = renderDesignMD(preset);
    fs.writeFileSync(this.designPath, content, 'utf8');

    if (options.json) {
      console.log(JSON.stringify({ path: this.designPath, preset, updated: true }, null, 2));
    } else {
      console.log(chalk.bold('\n✓ DESIGN.md updated\n'));
      console.log(`  ${chalk.cyan(path.relative(this.cwd, this.designPath))}`);
      console.log(`  Preset: ${chalk.cyan(preset)} (${PRESETS[preset].name})\n`);
    }
    return { path: this.designPath, preset, updated: true };
  }
}

module.exports = { DesignCommand };
