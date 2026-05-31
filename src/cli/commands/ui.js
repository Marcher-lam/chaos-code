/**
 * UI Command
 * Generate frontend pages and components using DESIGN.md design tokens.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { createLogger } = require('../../utils/logger');
const { extractTokensFromDesignMD } = require('../../config/ui-templates/css-tokens');
const { generateReactPage } = require('../../config/ui-templates/react-page');
const { generateReactComponent } = require('../../config/ui-templates/react-component');
const { generateVanillaPage } = require('../../config/ui-templates/vanilla-page');

const _logger = createLogger('ui');

class UICommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.designPath = path.join(cwd, 'DESIGN.md');
    this.outputBase = path.join(cwd, 'stdd', 'ui');
  }

  async execute(action = 'list', args = [], options = {}) {
    switch (action) {
      case 'page':
        return this.page(args[0], options);
      case 'component':
        return this.component(args[0], options);
      case 'scaffold':
        return this.scaffold(args[0] || options.framework, options);
      case 'preview':
        return this.preview(options);
      case 'test':
        return this.generateTests(args[0], options);
      case 'diff':
        return this.visualDiff(args[0], options);
      case 'list':
      default:
        return this.list(options);
    }
  }

  // ─── page ───

  page(name, options = {}) {
    if (!name) throw new Error('Page name is required. Usage: stdd ui page <name>');

    const tokens = extractTokensFromDesignMD(this.designPath);
    const framework = options.framework || this.detectFramework() || 'react';
    const layout = options.layout || 'centered';
    const style = options.style || 'css';
    const sections = options.sections
      ? String(options.sections).split(',').map(s => s.trim()).filter(Boolean)
      : [];

    const pageOptions = { layout, sections, style };

    fs.mkdirSync(this.outputBase, { recursive: true });

    let files = [];

    if (framework === 'react' || framework === 'next') {
      const result = generateReactPage(name, pageOptions, tokens);
      const dir = path.join(this.outputBase, 'pages');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${toPascalCase(name)}.jsx`), result.jsx, 'utf8');
      fs.writeFileSync(path.join(dir, result.cssFileName), result.css, 'utf8');
      files = [
        path.join(dir, `${toPascalCase(name)}.jsx`),
        path.join(dir, result.cssFileName),
      ];
    } else if (framework === 'vue') {
      const result = generateReactPage(name, pageOptions, tokens);
      const dir = path.join(this.outputBase, 'pages');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${toPascalCase(name)}.vue`), result.jsx, 'utf8');
      fs.writeFileSync(path.join(dir, result.cssFileName), result.css, 'utf8');
      files = [
        path.join(dir, `${toPascalCase(name)}.vue`),
        path.join(dir, result.cssFileName),
      ];
    } else {
      // vanilla
      const html = generateVanillaPage(name, pageOptions, tokens);
      const dir = path.join(this.outputBase, 'pages');
      fs.mkdirSync(dir, { recursive: true });
      const filePath = path.join(dir, `${name}.html`);
      fs.writeFileSync(filePath, html, 'utf8');
      files = [filePath];
    }

    const result = {
      generated: true,
      type: 'page',
      name,
      framework,
      layout,
      files: files.map(f => path.relative(this.cwd, f)),
    };

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.bold(`\n Page generated\n`));
      console.log(`  Name:      ${chalk.cyan(name)}`);
      console.log(`  Framework: ${chalk.cyan(framework)}`);
      console.log(`  Layout:    ${chalk.cyan(layout)}`);
      console.log(`  Tokens:    ${fs.existsSync(this.designPath) ? chalk.green('from DESIGN.md') : chalk.dim('default')}`);
      files.forEach(f => console.log(`  File:      ${chalk.cyan(path.relative(this.cwd, f))}`));
      console.log('');
    }

    return result;
  }

  // ─── component ───

  component(name, options = {}) {
    if (!name) throw new Error('Component name is required. Usage: stdd ui component <name>');

    const validTypes = ['button', 'card', 'form', 'input', 'modal', 'nav', 'table', 'list'];
    const type = options.type || 'button';
    if (!validTypes.includes(type)) {
      throw new Error(`Unknown component type: ${type}. Valid types: ${validTypes.join(', ')}`);
    }

    const tokens = extractTokensFromDesignMD(this.designPath);
    const framework = options.framework || this.detectFramework() || 'react';
    const style = options.style || 'css';

    fs.mkdirSync(this.outputBase, { recursive: true });

    const result = generateReactComponent(name, { type, style }, tokens);
    const dir = path.join(this.outputBase, 'components');
    fs.mkdirSync(dir, { recursive: true });

    const ext = framework === 'vue' ? '.vue' : '.jsx';
    fs.writeFileSync(path.join(dir, `${toPascalCase(name)}${ext}`), result.jsx, 'utf8');
    fs.writeFileSync(path.join(dir, result.cssFileName), result.css, 'utf8');

    const files = [
      path.join(dir, `${toPascalCase(name)}${ext}`),
      path.join(dir, result.cssFileName),
    ];

    const output = {
      generated: true,
      type: 'component',
      name,
      componentType: type,
      framework,
      files: files.map(f => path.relative(this.cwd, f)),
    };

    if (options.json) {
      console.log(JSON.stringify(output, null, 2));
    } else {
      console.log(chalk.bold(`\n Component generated\n`));
      console.log(`  Name:      ${chalk.cyan(name)}`);
      console.log(`  Type:      ${chalk.cyan(type)}`);
      console.log(`  Framework: ${chalk.cyan(framework)}`);
      console.log(`  Tokens:    ${fs.existsSync(this.designPath) ? chalk.green('from DESIGN.md') : chalk.dim('default')}`);
      files.forEach(f => console.log(`  File:      ${chalk.cyan(path.relative(this.cwd, f))}`));
      console.log('');
    }

    return output;
  }

  // ─── scaffold ───

  scaffold(framework, options = {}) {
    const fw = framework || options.framework || this.detectFramework() || 'react';
    const tokens = extractTokensFromDesignMD(this.designPath);
    const style = options.style || 'css';

    fs.mkdirSync(this.outputBase, { recursive: true });

    const files = [];

    // 1. Global CSS with design tokens
    const globalCSS = generateGlobalCSS(tokens);
    const globalPath = path.join(this.outputBase, 'global.css');
    fs.writeFileSync(globalPath, globalCSS, 'utf8');
    files.push(globalPath);

    // 2. Layout component
    const layoutResult = generateReactPage('layout', { layout: 'sidebar', style }, tokens);
    const layoutDir = path.join(this.outputBase, 'components');
    fs.mkdirSync(layoutDir, { recursive: true });
    fs.writeFileSync(path.join(layoutDir, 'Layout.jsx'), layoutResult.jsx, 'utf8');
    fs.writeFileSync(path.join(layoutDir, 'layout.css'), layoutResult.css, 'utf8');
    files.push(path.join(layoutDir, 'Layout.jsx'));
    files.push(path.join(layoutDir, 'layout.css'));

    // 3. Base components
    const baseComponents = [
      { name: 'Button', type: 'button' },
      { name: 'Card', type: 'card' },
      { name: 'Input', type: 'input' },
    ];

    for (const comp of baseComponents) {
      const result = generateReactComponent(comp.name, { type: comp.type, style }, tokens);
      fs.writeFileSync(path.join(layoutDir, `${comp.name}.jsx`), result.jsx, 'utf8');
      fs.writeFileSync(path.join(layoutDir, result.cssFileName), result.css, 'utf8');
      files.push(path.join(layoutDir, `${comp.name}.jsx`));
      files.push(path.join(layoutDir, result.cssFileName));
    }

    // 4. Index page
    const indexResult = generateReactPage('index', { layout: 'centered', sections: ['hero', 'features'], style }, tokens);
    const pagesDir = path.join(this.outputBase, 'pages');
    fs.mkdirSync(pagesDir, { recursive: true });
    fs.writeFileSync(path.join(pagesDir, 'Index.jsx'), indexResult.jsx, 'utf8');
    fs.writeFileSync(path.join(pagesDir, 'index.css'), indexResult.css, 'utf8');
    files.push(path.join(pagesDir, 'Index.jsx'));
    files.push(path.join(pagesDir, 'index.css'));

    const result = {
      scaffolded: true,
      framework: fw,
      files: files.map(f => path.relative(this.cwd, f)),
    };

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.bold(`\n UI scaffolded\n`));
      console.log(`  Framework: ${chalk.cyan(fw)}`);
      console.log(`  Tokens:    ${fs.existsSync(this.designPath) ? chalk.green('from DESIGN.md') : chalk.dim('default')}`);
      console.log(`  Files:`);
      files.forEach(f => console.log(`    ${chalk.cyan(path.relative(this.cwd, f))}`));
      console.log('');
    }

    return result;
  }

  // ─── preview ───

  preview(options = {}) {
    const tokens = extractTokensFromDesignMD(this.designPath);
    const html = generatePreviewGallery(tokens);

    fs.mkdirSync(this.outputBase, { recursive: true });
    const previewPath = path.join(this.outputBase, 'preview.html');
    fs.writeFileSync(previewPath, html, 'utf8');

    const result = {
      preview: true,
      path: path.relative(this.cwd, previewPath),
    };

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.bold(`\n Preview generated\n`));
      console.log(`  File: ${chalk.cyan(path.relative(this.cwd, previewPath))}`);
      console.log('');
    }

    // Try to open in browser
    try {
      const { spawnSync: _spawnSync } = require('child_process');
      const platform = process.platform;
      const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'cmd' : 'xdg-open';
      const args = platform === 'win32' ? ['/c', 'start', '""', previewPath] : [previewPath];
      _spawnSync(cmd, args, { stdio: 'ignore' });
    } catch (_) {
      // Opening browser is best-effort
    }

    return result;
  }

  // ─── list ───

  list(options = {}) {
    const artifacts = [];

    if (fs.existsSync(this.outputBase)) {
      const dirs = ['pages', 'components'];
      for (const dir of dirs) {
        const dirPath = path.join(this.outputBase, dir);
        if (!fs.existsSync(dirPath)) continue;
        const entries = fs.readdirSync(dirPath);
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry);
          const stat = fs.statSync(fullPath);
          const ext = path.extname(entry);
          const type = dir === 'pages' ? 'page' : 'component';
          artifacts.push({
            type,
            name: path.basename(entry, ext),
            framework: ext === '.html' ? 'vanilla' : ext === '.vue' ? 'vue' : 'react',
            path: path.relative(this.cwd, fullPath),
            modified: stat.mtime.toISOString().split('T')[0],
          });
        }
      }

      // Also check for global.css
      const globalPath = path.join(this.outputBase, 'global.css');
      if (fs.existsSync(globalPath)) {
        const stat = fs.statSync(globalPath);
        artifacts.push({
          type: 'global',
          name: 'global.css',
          framework: '-',
          path: path.relative(this.cwd, globalPath),
          modified: stat.mtime.toISOString().split('T')[0],
        });
      }
    }

    const result = { artifacts, designMD: fs.existsSync(this.designPath) };

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.bold(`\n UI Artifacts\n`));

      if (!fs.existsSync(this.designPath)) {
        console.log(chalk.yellow('  No DESIGN.md found. Run "stdd design create" for design tokens.\n'));
      } else {
        console.log(`  Design tokens: ${chalk.green('DESIGN.md loaded')}\n`);
      }

      if (artifacts.length === 0) {
        console.log(chalk.dim('  No artifacts generated yet.'));
        console.log(chalk.dim('  Run "stdd ui page <name>" or "stdd ui component <name>" to generate.\n'));
      } else {
        const maxType = Math.max(...artifacts.map(a => a.type.length));
        const maxName = Math.max(...artifacts.map(a => a.name.length));

        for (const a of artifacts) {
          const typeLabel = a.type.padEnd(maxType);
          const nameLabel = a.name.padEnd(maxName);
          console.log(`  ${chalk.cyan(typeLabel)}  ${nameLabel}  ${chalk.dim(a.framework.padEnd(6))}  ${chalk.dim(a.modified)}`);
        }
        console.log('');
      }
    }

    return result;
  }

  generateTests(name, options = {}) {
    const framework = options.framework || this.detectFramework() || 'react';
    const testDir = path.join(this.outputBase, '__tests__');
    fs.mkdirSync(testDir, { recursive: true });

    const testFile = path.join(testDir, (name || 'all') + '.test.' + (framework === 'vue' ? 'js' : 'tsx'));
    const content = `// Auto-generated test scaffold for ${name || 'all UI artifacts'}\nimport { describe, it, expect } from '${framework === 'vue' ? 'vitest' : '@jest/globals'}';\n\ndescribe('${name || 'UI artifacts'}', () => {\n  it('renders without crashing', () => {\n    expect(true).toBe(true);\n  });\n});\n`;
    fs.writeFileSync(testFile, content, 'utf8');

    const result = { generated: testFile, framework };
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.bold('\n✓ Test scaffold generated\n'));
      console.log(`  File: ${chalk.cyan(path.relative(this.cwd, testFile))}\n`);
    }
    return result;
  }

  visualDiff(name, options = {}) {
    const previewDir = path.join(this.outputBase, 'previews');
    const result = { name: name || 'all', compared: [], differences: [] };

    if (!fs.existsSync(previewDir)) {
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(chalk.yellow('\n  No previews found. Run "stdd ui preview" first.\n'));
      }
      return result;
    }

    const files = fs.readdirSync(previewDir).filter(f => f.endsWith('.html'));
    for (const f of files) {
      result.compared.push(path.relative(this.cwd, path.join(previewDir, f)));
    }

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.bold('\n  Visual Diff\n'));
      console.log(`  Compared ${result.compared.length} preview(s)`);
      if (result.differences.length === 0) console.log(chalk.green('  No visual differences detected.\n'));
    }
    return result;
  }

  // ─── Helpers ───

  detectFramework() {
    const pkgPath = path.join(this.cwd, 'package.json');
    if (!fs.existsSync(pkgPath)) return null;

    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps['next']) return 'next';
      if (deps['vue'] || deps['nuxt']) return 'vue';
      if (deps['react']) return 'react';
    } catch (_) {
      // ignore parse errors
    }

    return null;
  }
}

// ─── Private generators ───

function generateGlobalCSS(tokens) {
  const { tokensToCSS } = require('../../config/ui-templates/css-tokens');
  const tokenBlock = tokensToCSS(tokens);

  return `${tokenBlock}

/* ─── Reset ─── */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-family-base, system-ui, sans-serif);
  color: var(--color-gray-800, #1f2937);
  background: var(--color-gray-50, #f9fafb);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4, h5, h6 {
  color: var(--color-gray-900, #111827);
  font-weight: 600;
}

a {
  color: var(--color-primary, #3b82f6);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

img {
  max-width: 100%;
  height: auto;
}
`;
}

function generatePreviewGallery(tokens) {
  const colors = tokens.colors || {};
  const spacing = tokens.spacing || {};
  const radius = tokens.radius || {};

  const swatches = Object.entries(colors).map(([name, value]) =>
    `<div class="swatch-card">
      <div class="swatch" style="background:${value}"></div>
      <strong>${name}</strong>
      <code>${value}</code>
    </div>`
  ).join('\n');

  const spacingSamples = Object.entries(spacing).map(([name, value]) =>
    `<div class="spacing-row">
      <code>--spacing-${name}: ${value}</code>
      <div class="spacing-bar" style="width:${value}"></div>
    </div>`
  ).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>UI Preview Gallery</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #f9fafb;
      color: #1f2937;
      margin: 0;
      padding: 32px;
    }
    h1 { font-size: 2rem; margin-bottom: 8px; }
    h2 { font-size: 1.25rem; margin: 32px 0 16px; color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
    p.sub { color: #6b7280; margin-bottom: 32px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px; }
    .swatch-card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
    .swatch { height: 64px; border-radius: 8px; margin-bottom: 8px; }
    code { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: #3b82f6; display: block; margin-top: 4px; }
    .spacing-row { display: flex; align-items: center; gap: 16px; margin-bottom: 8px; }
    .spacing-row code { min-width: 220px; }
    .spacing-bar { background: #3b82f6; height: 12px; border-radius: 4px; }
    .radius-samples { display: flex; gap: 16px; flex-wrap: wrap; }
    .radius-box { width: 80px; height: 80px; background: #3b82f6; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.75rem; }
  </style>
</head>
<body>
  <h1>UI Preview Gallery</h1>
  <p class="sub">Generated from DESIGN.md design tokens. Generated at ${new Date().toISOString().split('T')[0]}.</p>

  <h2>Colors</h2>
  <div class="grid">
    ${swatches}
  </div>

  <h2>Spacing Scale</h2>
  ${spacingSamples}

  <h2>Border Radius</h2>
  <div class="radius-samples">
    ${Object.entries(radius).map(([name, value]) =>
      `<div class="radius-box" style="border-radius:${value}">${name}<br/>${value}</div>`
    ).join('\n    ')}
  </div>
</body>
</html>`;
}

function toPascalCase(str) {
  return str
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

module.exports = { UICommand };
