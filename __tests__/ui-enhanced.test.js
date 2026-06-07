const fs = require('fs');
const path = require('path');
const os = require('os');

jest.mock('chalk', () => {
  const fn = (...args) => args.join('');
  fn.bold = fn;
  fn.green = fn;
  fn.yellow = fn;
  fn.cyan = fn;
  fn.red = fn;
  fn.dim = fn;
  return fn;
});

const { UICommand } = require('../src/cli/commands/ui');
const { extractTokensFromDesignMD, tokensToCSS } = require('../src/config/ui-templates/css-tokens');
const { generateReactComponent } = require('../src/config/ui-templates/react-component');
const { generateVueComponent } = require('../src/config/ui-templates/vue-component');
const { generateVuePage } = require('../src/config/ui-templates/vue-page');
const { generateTailwindComponent, generateTailwindPage } = require('../src/config/ui-templates/tailwind-templates');
const { PAGE_TYPES } = require('../src/config/ui-templates/page-templates');
const { generateUIState, UI_STATES } = require('../src/config/ui-templates/ui-states');

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-ui-test-'));
}

describe('UICommand - Framework routing', () => {
  let tmpDir;
  let cmd;

  beforeEach(() => {
    tmpDir = makeTempDir();
    cmd = new UICommand(tmpDir);
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('generates React page correctly', () => {
    const result = cmd.page('home', { framework: 'react' });
    expect(result.generated).toBe(true);
    expect(result.framework).toBe('react');
    expect(result.files.length).toBe(2);
    expect(result.files[0]).toMatch(/\.jsx$/);
    const jsxContent = fs.readFileSync(path.join(tmpDir, result.files[0]), 'utf8');
    expect(jsxContent).toContain('import React');
    expect(jsxContent).toContain('export default function Home');
  });

  test('generates Vue page correctly (real SFC, not React)', () => {
    const result = cmd.page('dashboard', { framework: 'vue' });
    expect(result.generated).toBe(true);
    expect(result.framework).toBe('vue');
    expect(result.files.length).toBeGreaterThanOrEqual(1);
    expect(result.files[0]).toMatch(/\.vue$/);
    const vueContent = fs.readFileSync(path.join(tmpDir, result.files[0]), 'utf8');
    expect(vueContent).toContain('<template>');
    expect(vueContent).toContain('<script setup>');
    expect(vueContent).toContain('<style scoped>');
    expect(vueContent).not.toContain('import React');
  });

  test('generates Angular page correctly', () => {
    const result = cmd.page('users', { framework: 'angular' });
    expect(result.generated).toBe(true);
    expect(result.framework).toBe('angular');
    expect(result.files.some(f => f.endsWith('.component.ts'))).toBe(true);
    expect(result.files.some(f => f.endsWith('.component.html'))).toBe(true);
    expect(result.files.some(f => f.endsWith('.component.css'))).toBe(true);
  });

  test('generates Svelte page correctly', () => {
    const result = cmd.page('about', { framework: 'svelte' });
    expect(result.generated).toBe(true);
    expect(result.framework).toBe('svelte');
    expect(result.files[0]).toMatch(/\.svelte$/);
    const content = fs.readFileSync(path.join(tmpDir, result.files[0]), 'utf8');
    expect(content).toContain('<script>');
    expect(content).toContain('class="page-layout"');
  });

  test('generates Vanilla HTML page correctly', () => {
    const result = cmd.page('landing', { framework: 'vanilla' });
    expect(result.generated).toBe(true);
    expect(result.files[0]).toMatch(/\.html$/);
    const html = fs.readFileSync(path.join(tmpDir, result.files[0]), 'utf8');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('--color-primary');
  });

  test('generates React component correctly', () => {
    const result = cmd.component('SubmitBtn', { type: 'button', framework: 'react' });
    expect(result.generated).toBe(true);
    expect(result.framework).toBe('react');
    const jsxContent = fs.readFileSync(path.join(tmpDir, result.files[0]), 'utf8');
    expect(jsxContent).toContain('import React');
    expect(jsxContent).toContain('aria-busy');
    expect(jsxContent).toContain('aria-disabled');
  });

  test('generates Vue component correctly (real SFC)', () => {
    const result = cmd.component('UserCard', { type: 'card', framework: 'vue' });
    expect(result.generated).toBe(true);
    expect(result.files[0]).toMatch(/\.vue$/);
    const vueContent = fs.readFileSync(path.join(tmpDir, result.files[0]), 'utf8');
    expect(vueContent).toContain('<template>');
    expect(vueContent).toContain('<script setup>');
    expect(vueContent).not.toContain('import React');
  });

  test('generates Svelte component correctly', () => {
    const result = cmd.component('DataTable', { type: 'table', framework: 'svelte' });
    expect(result.generated).toBe(true);
    expect(result.files[0]).toMatch(/\.svelte$/);
  });

  test('throws on missing page name', () => {
    expect(() => cmd.page()).toThrow('Page name is required');
  });

  test('throws on missing component name', () => {
    expect(() => cmd.component()).toThrow('Component name is required');
  });

  test('throws on invalid component type', () => {
    expect(() => cmd.component('Foo', { type: 'invalid' })).toThrow('Unknown component type');
  });
});

describe('UICommand - Page types', () => {
  let tmpDir;
  let cmd;

  beforeEach(() => {
    tmpDir = makeTempDir();
    cmd = new UICommand(tmpDir);
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('generates landing page type', () => {
    const result = cmd.page('myapp', { pageType: 'landing', framework: 'react' });
    expect(result.pageType).toBe('landing');
    const content = fs.readFileSync(path.join(tmpDir, result.files[0]), 'utf8');
    expect(content).toContain('hero');
    expect(content).toContain('features');
  });

  test('generates dashboard page type', () => {
    const result = cmd.page('admin', { pageType: 'dashboard', framework: 'react' });
    expect(result.pageType).toBe('dashboard');
    const content = fs.readFileSync(path.join(tmpDir, result.files[0]), 'utf8');
    expect(content).toContain('sidebar');
    expect(content).toContain('aria-current');
  });

  test('generates auth page type', () => {
    const result = cmd.page('login', { pageType: 'auth', authVariant: 'login', framework: 'react' });
    expect(result.pageType).toBe('auth');
    const content = fs.readFileSync(path.join(tmpDir, result.files[0]), 'utf8');
    expect(content).toContain('Sign In');
    expect(content).toContain('htmlFor');
  });

  test('generates settings page type', () => {
    const result = cmd.page('prefs', { pageType: 'settings', framework: 'react' });
    expect(result.pageType).toBe('settings');
    const content = fs.readFileSync(path.join(tmpDir, result.files[0]), 'utf8');
    expect(content).toContain('role="tablist"');
    expect(content).toContain('aria-selected');
  });

  test('generates pricing page type', () => {
    const result = cmd.page('plans', { pageType: 'pricing', framework: 'react' });
    expect(result.pageType).toBe('pricing');
    const content = fs.readFileSync(path.join(tmpDir, result.files[0]), 'utf8');
    expect(content).toContain('pricing');
  });

  test('generates all page types without error', () => {
    for (const pt of Object.keys(PAGE_TYPES)) {
      const result = cmd.page('test-' + pt, { pageType: pt, framework: 'react' });
      expect(result.generated).toBe(true);
      expect(result.pageType).toBe(pt);
    }
  });
});

describe('UICommand - Tailwind output', () => {
  let tmpDir;
  let cmd;

  beforeEach(() => {
    tmpDir = makeTempDir();
    cmd = new UICommand(tmpDir);
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('generates Tailwind page with utility classes', () => {
    const result = cmd.page('home', { style: 'tailwind', framework: 'react' });
    const content = fs.readFileSync(path.join(tmpDir, result.files[0]), 'utf8');
    expect(content).toContain('className=');
    expect(content).toMatch(/bg-gray/);
    expect(content).toMatch(/rounded/);
  });

  test('generates Tailwind component with utility classes', () => {
    const result = cmd.component('MyBtn', { type: 'button', style: 'tailwind' });
    const content = fs.readFileSync(path.join(tmpDir, result.files[0]), 'utf8');
    expect(content).toMatch(/rounded/);
    expect(content).toContain('aria-busy');
    expect(content).toContain('focus:ring');
  });

  test('generates Tailwind modal with focus trap', () => {
    const result = cmd.component('MyModal', { type: 'modal', style: 'tailwind' });
    const content = fs.readFileSync(path.join(tmpDir, result.files[0]), 'utf8');
    expect(content).toContain('aria-modal');
    expect(content).toContain('aria-labelledby');
    expect(content).toContain('Escape');
    expect(content).toContain('Tab');
  });

  test('generates Tailwind nav with aria-expanded', () => {
    const result = cmd.component('MyNav', { type: 'nav', style: 'tailwind' });
    const content = fs.readFileSync(path.join(tmpDir, result.files[0]), 'utf8');
    expect(content).toContain('aria-expanded');
    expect(content).toContain('aria-controls');
  });

  test('generates Tailwind table with caption and scope', () => {
    const result = cmd.component('MyTable', { type: 'table', style: 'tailwind' });
    const content = fs.readFileSync(path.join(tmpDir, result.files[0]), 'utf8');
    expect(content).toContain('scope="col"');
    expect(content).toContain('caption');
  });
});

describe('UICommand - State generation', () => {
  let tmpDir;
  let cmd;

  beforeEach(() => {
    tmpDir = makeTempDir();
    cmd = new UICommand(tmpDir);
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('generates loading state', () => {
    const result = cmd.state('app', { type: 'loading' });
    expect(result.generated).toBe(true);
    expect(result.stateType).toBe('loading');
    const content = fs.readFileSync(path.join(tmpDir, result.files[0]), 'utf8');
    expect(content).toContain('role="status"');
    expect(content).toContain('aria-live');
  });

  test('generates error state', () => {
    const result = cmd.state('app', { type: 'error' });
    expect(result.generated).toBe(true);
    const content = fs.readFileSync(path.join(tmpDir, result.files[0]), 'utf8');
    expect(content).toContain('role="alert"');
  });

  test('generates all state types', () => {
    for (const st of Object.keys(UI_STATES)) {
      const result = cmd.state('test-' + st, { type: st });
      expect(result.generated).toBe(true);
      expect(result.stateType).toBe(st);
    }
  });

  test('throws on invalid state type', () => {
    expect(() => cmd.state('app', { type: 'invalid' })).toThrow('Unknown state type');
  });

  test('throws on missing state name', () => {
    expect(() => cmd.state()).toThrow('State name is required');
  });
});

describe('UICommand - Scaffold', () => {
  let tmpDir;
  let cmd;

  beforeEach(() => {
    tmpDir = makeTempDir();
    cmd = new UICommand(tmpDir);
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('scaffolds React app with states', () => {
    const result = cmd.scaffold('react');
    expect(result.scaffolded).toBe(true);
    expect(result.files.some(f => f.includes('global.css'))).toBe(true);
    expect(result.files.some(f => f.includes('Button'))).toBe(true);
    expect(result.files.some(f => f.includes('LoadingState'))).toBe(true);
    expect(result.files.some(f => f.includes('EmptyState'))).toBe(true);
    expect(result.files.some(f => f.includes('ErrorState'))).toBe(true);
  });

  test('scaffolds Vue app with real SFC', () => {
    const result = cmd.scaffold('vue');
    expect(result.scaffolded).toBe(true);
    expect(result.files.some(f => f.endsWith('.vue'))).toBe(true);
    const vueFile = result.files.find(f => f.endsWith('Button.vue'));
    const content = fs.readFileSync(path.join(tmpDir, vueFile), 'utf8');
    expect(content).toContain('<template>');
    expect(content).toContain('<script setup>');
  });

  test('scaffolds Tailwind app with Tailwind components', () => {
    const result = cmd.scaffold('react', { style: 'tailwind' });
    expect(result.scaffolded).toBe(true);
    expect(result.files.some(f => f.endsWith('.jsx'))).toBe(true);
    const jsxContent = fs.readFileSync(path.join(tmpDir, result.files.find(f => f.includes('Button'))), 'utf8');
    expect(jsxContent).toMatch(/rounded/);
  });

  test('scaffolds Angular app', () => {
    const result = cmd.scaffold('angular');
    expect(result.scaffolded).toBe(true);
    expect(result.files.some(f => f.endsWith('.component.ts'))).toBe(true);
  });

  test('scaffolds Svelte app', () => {
    const result = cmd.scaffold('svelte');
    expect(result.scaffolded).toBe(true);
    expect(result.files.some(f => f.endsWith('.svelte'))).toBe(true);
  });
});

describe('CSS Token Extraction - JSON block support', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('extracts tokens from Markdown table format', () => {
    const designPath = path.join(tmpDir, 'DESIGN.md');
    fs.writeFileSync(designPath, [
      '| `--color-primary` | `#FF0000` | primary |',
      '--font-family-base: Roboto, sans-serif',
      '--spacing-xs: 0.125rem',
      '--radius-lg: 1rem',
    ].join('\n'));
    const tokens = extractTokensFromDesignMD(designPath);
    expect(tokens.colors.primary).toBe('#FF0000');
    expect(tokens.fonts.familyBase).toBe('Roboto, sans-serif');
    expect(tokens.spacing.xs).toBe('0.125rem');
    expect(tokens.radius.lg).toBe('1rem');
  });

  test('extracts tokens from JSON code block', () => {
    const designPath = path.join(tmpDir, 'DESIGN.md');
    fs.writeFileSync(designPath, [
      '# Design System',
      '```json',
      '{"colors": {"primary": "#FF5500"}, "spacing": {"md": "1.5rem"}}',
      '```',
    ].join('\n'));
    const tokens = extractTokensFromDesignMD(designPath);
    expect(tokens.colors.primary).toBe('#FF5500');
    expect(tokens.spacing.md).toBe('1.5rem');
  });

  test('extracts tokens from HTML comment block', () => {
    const designPath = path.join(tmpDir, 'DESIGN.md');
    fs.writeFileSync(designPath, [
      '# Design System',
      '<!-- design-tokens -->',
      '{"radius": {"xl": "2rem"}}',
      '<!-- /design-tokens -->',
    ].join('\n'));
    const tokens = extractTokensFromDesignMD(designPath);
    expect(tokens.radius.xl).toBe('2rem');
  });

  test('returns defaults when no DESIGN.md', () => {
    const tokens = extractTokensFromDesignMD('/nonexistent/DESIGN.md');
    expect(tokens.colors.primary).toBe('#3B82F6');
    expect(tokens.fonts.familyBase).toBeTruthy();
  });

  test('tokensToCSS produces valid CSS', () => {
    const tokens = extractTokensFromDesignMD('/nonexistent');
    const css = tokensToCSS(tokens);
    expect(css).toContain(':root {');
    expect(css).toContain('--color-primary');
    expect(css).toContain('}');
  });
});

describe('React component a11y', () => {
  test('Button has loading state with aria-busy and spinner', () => {
    const result = generateReactComponent('TestBtn', { type: 'button', style: 'css' }, {});
    expect(result.jsx).toContain('loading');
    expect(result.jsx).toContain('aria-busy');
    expect(result.jsx).toContain('aria-disabled');
    expect(result.jsx).toContain('spinner');
    expect(result.css).toContain('@keyframes');
  });

  test('Modal has focus trap, Escape, aria-labelledby', () => {
    const result = generateReactComponent('TestModal', { type: 'modal', style: 'css' }, {});
    expect(result.jsx).toContain('useRef');
    expect(result.jsx).toContain('Escape');
    expect(result.jsx).toContain('Tab');
    expect(result.jsx).toContain('aria-labelledby');
    expect(result.jsx).toContain('aria-modal');
    expect(result.jsx).toContain('focus()');
    expect(result.jsx).toContain('previousFocus');
  });

  test('Nav has aria-expanded, aria-controls, aria-label', () => {
    const result = generateReactComponent('TestNav', { type: 'nav', style: 'css' }, {});
    expect(result.jsx).toContain('aria-expanded');
    expect(result.jsx).toContain('aria-controls');
    expect(result.jsx).toContain('Toggle navigation menu');
    expect(result.jsx).toContain('role="menubar"');
    expect(result.jsx).toContain('role="menuitem"');
  });

  test('Table has caption, scope, empty state', () => {
    const result = generateReactComponent('TestTable', { type: 'table', style: 'css' }, {});
    expect(result.jsx).toContain('caption');
    expect(result.jsx).toContain('scope="col"');
    expect(result.jsx).toContain('No data available');
    expect(result.css).toContain('__caption');
    expect(result.css).toContain('__empty');
  });

  test('Input has aria-invalid and error with role alert', () => {
    const result = generateReactComponent('TestInput', { type: 'input', style: 'css' }, {});
    expect(result.jsx).toContain('aria-invalid');
    expect(result.jsx).toContain('role="alert"');
    expect(result.jsx).toContain('htmlFor');
  });
});

describe('Vue component a11y', () => {
  test('Button has loading state with aria-busy', () => {
    const result = generateVueComponent('TestBtn', { type: 'button' }, {});
    expect(result.vue).toContain('loading');
    expect(result.vue).toContain('aria-busy');
    expect(result.vue).toContain('btn-spinner');
  });

  test('Modal has focus trap and aria-labelledby', () => {
    const result = generateVueComponent('TestModal', { type: 'modal' }, {});
    expect(result.vue).toContain('Escape');
    expect(result.vue).toContain('Tab');
    expect(result.vue).toContain('aria-labelledby');
    expect(result.vue).toContain('aria-modal');
    expect(result.vue).toContain('previousFocus');
  });

  test('Nav has aria-expanded and responsive toggle', () => {
    const result = generateVueComponent('TestNav', { type: 'nav' }, {});
    expect(result.vue).toContain('aria-expanded');
    expect(result.vue).toContain('aria-controls');
    expect(result.vue).toContain('aria-label');
    expect(result.vue).toContain('@media (max-width: 768px)');
  });

  test('Table has caption and scope', () => {
    const result = generateVueComponent('TestTable', { type: 'table' }, {});
    expect(result.vue).toContain('caption');
    expect(result.vue).toContain('scope="col"');
    expect(result.vue).toContain('sr-only');
  });
});

describe('Vue SFC page generation', () => {
  test('generates valid Vue SFC structure', () => {
    const result = generateVuePage('test', { layout: 'full' }, {});
    expect(result.vue).toContain('<template>');
    expect(result.vue).toContain('<script setup>');
    expect(result.vue).toContain('<style scoped>');
    expect(result.vue).toContain('defineOptions');
    expect(result.vue).not.toContain('import React');
  });

  test('supports sidebar layout', () => {
    const result = generateVuePage('test', { layout: 'sidebar' }, {});
    expect(result.vue).toContain('page-sidebar');
    expect(result.vue).toContain('grid-template-columns');
  });

  test('supports custom sections', () => {
    const result = generateVuePage('test', { sections: ['Hero', 'Features'] }, {});
    expect(result.vue).toContain('Hero');
    expect(result.vue).toContain('Features');
    expect(result.vue).toContain('slot name="section-');
  });
});

describe('Tailwind templates', () => {
  test('generates real Tailwind utility classes for all component types', () => {
    const types = ['button', 'card', 'form', 'input', 'modal', 'nav', 'table', 'list'];
    for (const type of types) {
      const result = generateTailwindComponent('Test' + type.charAt(0).toUpperCase() + type.slice(1), { type });
      expect(result.jsx).toBeTruthy();
      expect(result.jsx.length).toBeGreaterThan(100);
    }
  });

  test('generates Tailwind page with layout classes', () => {
    const result = generateTailwindPage('home', { layout: 'sidebar', sections: ['content'] });
    expect(result.jsx).toContain('grid-cols');
    expect(result.jsx).toContain('import React');
  });
});

describe('Page template coverage', () => {
  test('all page types generate non-empty output', () => {
    for (const [type, fn] of Object.entries(PAGE_TYPES)) {
      const result = fn('test-' + type, {}, {});
      expect(result.jsx).toBeTruthy();
      expect(result.css).toBeTruthy();
      expect(result.cssFileName).toBeTruthy();
    }
  });
});

describe('UI state coverage', () => {
  test('all UI states generate non-empty output', () => {
    for (const type of Object.keys(UI_STATES)) {
      const result = generateUIState(type, 'test-' + type, {}, {});
      expect(result).not.toBeNull();
      expect(result.jsx).toBeTruthy();
      expect(result.css).toBeTruthy();
    }
  });
});

describe('UICommand - List and Preview', () => {
  let tmpDir;
  let cmd;

  beforeEach(() => {
    tmpDir = makeTempDir();
    cmd = new UICommand(tmpDir);
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('list returns empty when no artifacts', () => {
    const result = cmd.list();
    expect(result.artifacts).toEqual([]);
    expect(result.designMD).toBe(false);
  });

  test('list finds generated artifacts', () => {
    cmd.page('home', { framework: 'react' });
    cmd.component('Btn', { type: 'button', framework: 'react' });
    const result = cmd.list();
    expect(result.artifacts.length).toBeGreaterThanOrEqual(2);
  });

  test('preview generates HTML file', () => {
    const result = cmd.preview();
    expect(result.preview).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, result.path))).toBe(true);
    const html = fs.readFileSync(path.join(tmpDir, result.path), 'utf8');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Preview Gallery');
  });

  test('detectFramework returns null without package.json', () => {
    expect(cmd.detectFramework()).toBeNull();
  });

  test('detectFramework detects react', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ dependencies: { react: '^18' } }));
    expect(cmd.detectFramework()).toBe('react');
  });

  test('detectFramework detects vue', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ dependencies: { vue: '^3' } }));
    expect(cmd.detectFramework()).toBe('vue');
  });

  test('detectFramework detects angular', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ dependencies: { '@angular/core': '^16' } }));
    expect(cmd.detectFramework()).toBe('angular');
  });

  test('detectFramework detects svelte', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ dependencies: { svelte: '^4' } }));
    expect(cmd.detectFramework()).toBe('svelte');
  });

  test('detectFramework detects next over react', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ dependencies: { next: '^14', react: '^18' } }));
    expect(cmd.detectFramework()).toBe('next');
  });
});
