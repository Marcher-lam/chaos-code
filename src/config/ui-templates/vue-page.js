/**
 * Vue SFC Page Templates
 * Generates Vue 3 page components with layout support
 */

const { tokensToCSS } = require('./css-tokens');

function pascalCase(str) {
  return str.replace(/(^|[-_]\w)/g, m => m.replace(/[-_]/, '').toUpperCase());
}

function kebabCase(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').toLowerCase();
}

function generatePageCSS(name, tokens, layout) {
  const tokenCSS = tokensToCSS(tokens);
  const layoutCSS = layout === 'sidebar'
    ? '\n.page-layout { display: grid; grid-template-columns: 260px 1fr; min-height: 100vh; }'
      + '\n.page-sidebar { padding: 20px; border-right: 1px solid var(--color-border, #e5e7eb); background: var(--color-bg-muted, #f9fafb); }'
      + '\n.page-main { padding: 24px; }'
    : layout === 'centered'
    ? '\n.page-layout { display: flex; justify-content: center; padding: 40px 20px; min-height: 100vh; }'
      + '\n.page-main { max-width: 800px; width: 100%; }'
    : '\n.page-layout { min-height: 100vh; }'
      + '\n.page-main { padding: 24px; max-width: 1200px; margin: 0 auto; }';

  return tokenCSS + '\n'
    + '.page-header { padding: 16px 24px; border-bottom: 1px solid var(--color-border, #e5e7eb); background: var(--color-bg-elevated, #fff); }\n'
    + '.page-header h1 { margin: 0; font-size: 1.5rem; color: var(--color-text, #111827); }\n'
    + '.page-section { margin-bottom: 32px; }\n'
    + '.page-section h2 { font-size: 1.2rem; color: var(--color-text, #111827); border-bottom: 1px solid var(--color-border, #e5e7eb); padding-bottom: 8px; margin-bottom: 16px; }\n'
    + '.page-footer { padding: 16px 24px; border-top: 1px solid var(--color-border, #e5e7eb); color: var(--color-text-muted, #6b7280); font-size: 0.8rem; }\n'
    + layoutCSS;
}

function generateVuePage(name, options = {}, tokens = {}) {
  const pascalName = pascalCase(name);
  const kebabName = kebabCase(name);
  const layout = options.layout || 'full';
  const sections = options.sections || ['Overview', 'Details', 'Configuration'];

  const sidebarSlot = layout === 'sidebar'
    ? '\n      <aside class="page-sidebar">\n        <slot name="sidebar"></slot>\n      </aside>'
    : '';

  const sectionBlocks = sections.map(s =>
    '      <section class="page-section">\n'
    + '        <h2>' + s + '</h2>\n'
    + '        <slot name="section-' + kebabCase(s) + '"></slot>\n'
    + '      </section>'
  ).join('\n\n');

  const css = generatePageCSS(name, tokens, layout);

  const vue = '<template>\n'
    + '  <div class="page-layout">\n'
    + sidebarSlot + '\n'
    + '    <div class="page-main">\n'
    + '      <header class="page-header">\n'
    + '        <h1>' + pascalName + '</h1>\n'
    + '      </header>\n\n'
    + sectionBlocks + '\n\n'
    + '      <footer class="page-footer">\n'
    + '        <slot name="footer">&copy; ' + new Date().getFullYear() + '</slot>\n'
    + '      </footer>\n'
    + '    </div>\n'
    + '  </div>\n'
    + '</template>\n\n'
    + '<script setup>\n'
    + 'defineOptions({ name: \'' + pascalName + 'Page\' });\n'
    + '</script>\n\n'
    + '<style scoped>\n'
    + css + '\n</style>\n';

  return {
    vue,
    css,
    cssFileName: kebabName + '-page.vue.css',
  };
}

module.exports = { generateVuePage };
