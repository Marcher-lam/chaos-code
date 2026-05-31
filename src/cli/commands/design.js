/**
 * Design Command
 * DESIGN.md generation for frontend design system specification.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { createLogger } = require('../../utils/logger');
const { TechStackDetector, detectTechStack: _detectTechStack } = require('../../utils/tech-stack-detector');
const _logger = createLogger('design');

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

### Design Philosophy

- Density: balanced, scannable, suitable for product UI and technical workflows
- Tone: precise, trustworthy, and implementation-ready
- Visual rhythm: repeatable spacing, restrained contrast, clear hierarchy
- AI usage: this file is the source of truth for generated UI decisions

## Color Palette & Roles

### Semantic Tokens

| Token | Value | Role |
|-------|-------|------|
| \`--color-primary\` | \`${colors.primary}\` | Primary CTA, active navigation, focus ring |
| \`--color-secondary\` | \`${colors.secondary}\` | Secondary CTA, accent panels, badges |
| \`--color-success\` | \`${colors.success}\` | Success states, completed tasks, passing checks |
| \`--color-warning\` | \`${colors.warning}\` | Warnings, pending reviews, soft alerts |
| \`--color-error\` | \`${colors.error}\` | Errors, failed checks, destructive actions |

### Neutral Scale

| Token | Value | Typical Use |
|-------|-------|-------------|
| \`--color-gray-50\` | \`${colors.neutral[0]}\` | App background / lowest surface |
| \`--color-gray-100\` | \`${colors.neutral[1]}\` | Subtle surface |
| \`--color-gray-200\` | \`${colors.neutral[2]}\` | Border / divider |
| \`--color-gray-300\` | \`${colors.neutral[3]}\` | Strong border |
| \`--color-gray-400\` | \`${colors.neutral[4]}\` | Muted text |
| \`--color-gray-500\` | \`${colors.neutral[5]}\` | Secondary text |
| \`--color-gray-600\` | \`${colors.neutral[6]}\` | Body text on light surfaces |
| \`--color-gray-700\` | \`${colors.neutral[7]}\` | Headings / emphasis |
| \`--color-gray-800\` | \`${colors.neutral[8]}\` | High emphasis |
| \`--color-gray-900\` | \`${colors.neutral[9]}\` | Maximum contrast text |

## Typography Rules

### Font Stack

\`\`\`
--font-family-base: ${p.fontFamily}
--font-family-mono: ${p.fontFamily.includes('Mono') ? p.fontFamily : 'JetBrains Mono, monospace'}
\`\`\`

### Type Scale

| Token | Size | Use |
|-------|------|-----|
| \`--text-xs\` | 0.75rem / 12px | Captions, metadata |
| \`--text-sm\` | 0.875rem / 14px | Secondary labels |
| \`--text-base\` | 1rem / 16px | Body text |
| \`--text-lg\` | 1.125rem / 18px | Lead body |
| \`--text-xl\` | 1.25rem / 20px | Section heading |
| \`--text-2xl\` | 1.5rem / 24px | Card title |
| \`--text-3xl\` | 1.875rem / 30px | Page title |
| \`--text-4xl\` | 2.25rem / 36px | Hero heading |
| \`--text-5xl\` | 3rem / 48px | Marketing display |

## Layout Principles

### Spacing Scale

\`\`\`
--spacing-xs: ${p.spacing.xs}
--spacing-sm: ${p.spacing.sm}
--spacing-md: ${p.spacing.md}
--spacing-lg: ${p.spacing.lg}
--spacing-xl: ${p.spacing.xl}
--spacing-2xl: ${p.spacing['2xl']}
--spacing-3xl: ${p.spacing['3xl']}
\`\`\`

- Max content width: 1200px
- Grid system: 12 columns
- Gutter: \`--spacing-md\`
- Container padding: \`--spacing-lg\`
- Prefer fewer, stronger layout regions over many small boxes

## Border Radius

\`\`\`
--radius-sm: ${p.borderRadius.sm}
--radius-md: ${p.borderRadius.md}
--radius-lg: ${p.borderRadius.lg}
--radius-xl: ${p.borderRadius.xl}
--radius-full: ${p.borderRadius.full}
\`\`\`

## Component Stylings

### Buttons

- Primary buttons use \`--color-primary\` background with white text
- Secondary buttons use \`--color-secondary\` background
- Border radius: \`--radius-md\`
- Padding: \`--spacing-sm\` \`--spacing-md\`
- Hover: darken background by 10% or raise elevation subtly
- Disabled: 50% opacity, no hover movement

### Inputs

- Border: 1px solid \`--color-gray-300\`
- Border radius: \`--radius-md\`
- Padding: \`--spacing-sm\` \`--spacing-md\`
- Focus: Outline with \`--color-primary\`
- Error: Border and helper text use \`--color-error\`

### Cards

- Background: \`--color-gray-50\`
- Border: 1px solid \`--color-gray-200\`
- Border radius: \`--radius-lg\`
- Padding: \`--spacing-lg\`
- Hover: elevate one level only when card is interactive

### Navigation

- Active item: \`--color-primary\` text or subtle primary background
- Inactive item: secondary text, no heavy borders
- Mobile navigation collapses into a drawer or compact menu

## Depth & Elevation

| Token | Shadow | Use |
|-------|--------|-----|
| \`--shadow-sm\` | \`0 1px 2px rgba(0,0,0,.06)\` | Inputs, subtle surfaces |
| \`--shadow-md\` | \`0 8px 24px rgba(0,0,0,.10)\` | Cards, menus |
| \`--shadow-lg\` | \`0 20px 48px rgba(0,0,0,.16)\` | Dialogs, command palettes |

- Avoid stacking more than two elevated layers at once
- Prefer border + background for static sections
- Use shadow only to communicate interactivity or overlay depth

## Responsive Behavior

\`\`\`
--breakpoint-sm: 640px
--breakpoint-md: 768px
--breakpoint-lg: 1024px
--breakpoint-xl: 1280px
\`\`\`

- Touch targets: minimum 44px height on mobile
- Tables collapse into cards below \`--breakpoint-md\`
- Primary action stays visible above the fold
- Use one-column forms on mobile, two-column forms only on desktop

## Do's and Don'ts

| Do | Don't |
|----|-------|
| Use semantic color tokens | Use arbitrary hex values in components |
| Follow the spacing scale | Invent custom spacing per component |
| Maintain consistent radius | Mix square and rounded styles randomly |
| Keep hierarchy explicit | Rely on color alone for meaning |
| Use clear empty/error states | Hide failure states or use vague copy |

## Agent Prompt Guide

When generating UI code:

1. Always use CSS variables from this design system
2. Follow component guidelines for consistency
3. Use semantic color names, not hex values
4. Apply spacing from the defined scale
5. Match border radius to component type
6. Preserve responsive behavior and touch targets
7. Generate accessible labels, focus states, and error states

### Ready-to-use Prompt

\`\`\`
Use DESIGN.md as the visual source of truth. Build the UI with the defined color roles, type scale, spacing, radius, elevation, responsive behavior, and component states. Do not introduce unapproved colors, fonts, or spacing values.
\`\`\`

---

*This DESIGN.md should be updated when design requirements change.*
`;
}

function renderPreviewHTML(preset = 'modern', dark = false) {
  const p = PRESETS[preset] || PRESETS.modern;
  const colors = p.colors;
  const bg = dark ? colors.neutral[0] : colors.neutral[0];
  const surface = dark ? colors.neutral[1] : '#ffffff';
  const text = dark ? colors.neutral[9] : colors.neutral[8];
  const muted = dark ? colors.neutral[6] : colors.neutral[5];
  const border = dark ? colors.neutral[3] : colors.neutral[2];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${p.name} Design Preview</title>
  <style>
    :root {
      --color-primary: ${colors.primary};
      --color-secondary: ${colors.secondary};
      --color-success: ${colors.success};
      --color-warning: ${colors.warning};
      --color-error: ${colors.error};
      --bg: ${bg};
      --surface: ${surface};
      --text: ${text};
      --muted: ${muted};
      --border: ${border};
      --font: ${p.fontFamily};
      --radius: ${p.borderRadius.lg};
    }
    body { margin: 0; background: var(--bg); color: var(--text); font-family: var(--font); }
    main { max-width: 1120px; margin: 0 auto; padding: 48px 24px; }
    .hero { display: grid; gap: 16px; margin-bottom: 32px; }
    h1 { font-size: clamp(2rem, 5vw, 4rem); line-height: 1; margin: 0; letter-spacing: -0.04em; }
    p { color: var(--muted); line-height: 1.7; max-width: 680px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; box-shadow: 0 8px 24px rgba(0,0,0,.08); }
    .swatch { height: 72px; border-radius: 12px; margin-bottom: 12px; }
    .actions { display: flex; flex-wrap: wrap; gap: 12px; margin: 24px 0; }
    button { border: 0; border-radius: ${p.borderRadius.md}; padding: 10px 16px; font: inherit; cursor: pointer; }
    .primary { background: var(--color-primary); color: white; }
    .secondary { background: var(--color-secondary); color: white; }
    .ghost { background: transparent; color: var(--text); border: 1px solid var(--border); }
    input { width: 100%; box-sizing: border-box; padding: 12px 14px; border-radius: ${p.borderRadius.md}; border: 1px solid var(--border); background: var(--surface); color: var(--text); }
    code { color: var(--color-primary); }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <h1>${p.name}</h1>
      <p>Visual catalog generated from DESIGN.md tokens. Use it to verify color roles, type scale, components, cards, and form states.</p>
      <div class="actions"><button class="primary">Primary Action</button><button class="secondary">Secondary</button><button class="ghost">Ghost</button></div>
    </section>
    <section class="grid">
      ${Object.entries({ primary: colors.primary, secondary: colors.secondary, success: colors.success, warning: colors.warning, error: colors.error }).map(([name, value]) => `<div class="card"><div class="swatch" style="background:${value}"></div><strong>${name}</strong><p><code>${value}</code></p></div>`).join('')}
    </section>
    <section class="card" style="margin-top:16px"><h2>Form Preview</h2><p>Inputs use semantic borders, radius, focus, and spacing.</p><input placeholder="Email address" /></section>
  </main>
</body>
</html>`;
}

class DesignCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.designPath = path.join(cwd, 'DESIGN.md');
  }

  async execute(action = 'create', args = [], options = {}) {
    let safeArgs = [];
    if (Array.isArray(args)) {
      safeArgs = args;
    } else if (typeof args === 'string') {
      safeArgs = [args];
    }
    switch (action) {
      case 'create':
      case 'init':
      case 'generate':
        return await this.create(options);
      case 'show':
      case 'view':
        return this.show(options);
      case 'list':
      case 'presets':
        return this.list(options);
      case 'check':
        return this.check(options);
      case 'update':
        return await this.update(options);
      case 'reverse-scan':
      case 'reverse_scan':
      case 'reverseScan':
      case 'scan':
        return await this.reverseScan(safeArgs[0], options);
      default:
        return await this.create(options);
    }
  }

  async create(options = {}) {
    if (fs.existsSync(this.designPath) && !options.force) {
      throw new Error(`DESIGN.md already exists. Use --force to overwrite.`);
    }

    const _techStack = _detectTechStack ? await _detectTechStack(this.cwd) : TechStackDetector.analyze(this.cwd);
    const preset = options.preset || options.p || 'modern';

    if (!PRESETS[preset]) {
      throw new Error(`Unknown preset: ${preset}. Available: ${Object.keys(PRESETS).join(', ')}`);
    }

    const content = renderDesignMD(preset);
    fs.writeFileSync(this.designPath, content, 'utf8');
    const previews = this.writePreviews(preset, options);

    if (options.json) {
      console.log(JSON.stringify({ path: this.designPath, preset, created: true, previews }, null, 2));
    } else {
      console.log(chalk.bold('\n✓ DESIGN.md created\n'));
      console.log(`  ${chalk.cyan(path.relative(this.cwd, this.designPath))}`);
      console.log(`  Preset: ${chalk.cyan(preset)} (${PRESETS[preset].name})`);
      previews.forEach(file => console.log(`  Preview: ${chalk.cyan(path.relative(this.cwd, file))}`));
      console.log(chalk.dim('\n  AI agents will now use this design system for UI generation.\n'));
    }
    return { path: this.designPath, preset, created: true, previews };
  }

  writePreviews(preset, options = {}) {
    if (options.preview === false || options.noPreview) return [];
    const lightPath = path.join(this.cwd, 'preview.html');
    const darkPath = path.join(this.cwd, 'preview-dark.html');
    fs.writeFileSync(lightPath, renderPreviewHTML(preset, false), 'utf8');
    fs.writeFileSync(darkPath, renderPreviewHTML(preset, true), 'utf8');
    return [lightPath, darkPath];
  }

  list(options = {}) {
    const presets = Object.entries(PRESETS).map(([key, value]) => ({ key, name: value.name }));
    if (options.json) {
      console.log(JSON.stringify({ presets }, null, 2));
    } else {
      console.log(chalk.bold('\nAvailable DESIGN.md presets\n'));
      presets.forEach(preset => console.log(`  ${chalk.cyan(preset.key)} - ${preset.name}`));
      console.log('');
    }
    return presets;
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
      hasColors: (/##\s*Colors/i.test(content) || /##\s*Color Palette & Roles/i.test(content)) && /--color-/.test(content),
      hasTypography: /##\s*Typography/i.test(content) && /--text-/.test(content),
      hasSpacing: (/##\s*Spacing/i.test(content) || /###\s*Spacing Scale/i.test(content)) && /--spacing-/.test(content),
      hasBorderRadius: /##\s*Border Radius/i.test(content) && /--radius-/.test(content),
      hasComponents: /##\s*Component (Guidelines|Stylings)/i.test(content),
      hasElevation: /##\s*Depth & Elevation/i.test(content) && /--shadow-/.test(content),
      hasResponsive: /##\s*Responsive/i.test(content) || /breakpoint/i.test(content),
      hasPromptGuide: /##\s*Agent Prompt Guide/i.test(content),
      usesCssVars: /--[\w-]+:/g.test(content),
    };

    if (!checks.hasColors) issues.push('Colors section missing or incomplete');
    if (!checks.hasTypography) issues.push('Typography section missing or incomplete');
    if (!checks.hasSpacing) issues.push('Spacing section missing or incomplete');
    if (!checks.hasBorderRadius) issues.push('Border Radius section missing or incomplete');
    if (!checks.hasComponents) issues.push('Component Stylings section missing');
    if (!checks.hasElevation) issues.push('Depth & Elevation section missing or incomplete');
    if (!checks.hasResponsive) issues.push('Responsive breakpoints missing');
    if (!checks.hasPromptGuide) issues.push('Agent Prompt Guide section missing');
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
    const previews = this.writePreviews(preset, options);

    if (options.json) {
      console.log(JSON.stringify({ path: this.designPath, preset, updated: true, previews }, null, 2));
    } else {
      console.log(chalk.bold('\n✓ DESIGN.md updated\n'));
      console.log(`  ${chalk.cyan(path.relative(this.cwd, this.designPath))}`);
      console.log(`  Preset: ${chalk.cyan(preset)} (${PRESETS[preset].name})\n`);
    }
    return { path: this.designPath, preset, updated: true, previews };
  }

  async reverseScan(targetDir, options = {}) {
    const { CssExtractor } = require('../../utils/css-extractor');
    const scanDir = targetDir ? path.resolve(this.cwd, targetDir) : this.cwd;

    if (!options.json) {
      console.log(chalk.bold('\n🔍 Reverse scanning project style design tokens...\n'));
      console.log(`  Target Directory: ${chalk.cyan(scanDir)}`);
    }

    const extractor = new CssExtractor(this.cwd);
    const extracted = extractor.extract(scanDir);

    const custom = {
      name: 'Self-Healed Design',
      colors: extracted.colors,
      fontFamily: extracted.fontFamily,
      borderRadius: extracted.borderRadius,
      spacing: extracted.spacing,
    };

    // Save to DESIGN.md using modern preset as base structure
    const content = renderDesignMD('modern', custom);
    fs.writeFileSync(this.designPath, content, 'utf8');

    // Generate previews with forced overwrite
    const previews = this.writePreviews('modern', { ...options, force: true });

    if (options.json) {
      console.log(JSON.stringify({ path: this.designPath, extracted, updated: true, previews }, null, 2));
    } else {
      console.log(chalk.bold('\n✓ DESIGN.md successfully self-healed and updated via reverse-scan\n'));
      console.log(`  ${chalk.cyan(path.relative(this.cwd, this.designPath))}`);
      console.log(`  Source: Analyzed CSS/SCSS and Tailwind tokens in ${chalk.cyan(path.relative(this.cwd, scanDir))}`);
      previews.forEach(file => console.log(`  Preview: ${chalk.cyan(path.relative(this.cwd, file))}`));
      console.log(chalk.dim('\n  STDD design auto-tuned design variables to align perfectly with your source code.\n'));
    }

    return { path: this.designPath, extracted, updated: true, previews };
  }
}

module.exports = { DesignCommand, renderDesignMD, renderPreviewHTML };
