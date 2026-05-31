/**
 * Svelte Page Templates
 */

const { tokensToCSS } = require('./css-tokens');

function pascalCase(str) {
  return str.replace(/(^|[-_]\w)/g, m => m.replace(/[-_]/, '').toUpperCase());
}

function kebabCase(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').toLowerCase();
}

function generateSveltePage(name, options = {}, tokens = {}) {
  const pascalName = pascalCase(name);
  const kebabName = kebabCase(name);
  const layout = options.layout || 'full';
  const sections = options.sections || ['Overview', 'Details', 'Configuration'];

  const tokenCSS = tokensToCSS(tokens);

  const layoutStyle = layout === 'sidebar'
    ? '.page-layout { display: grid; grid-template-columns: 1fr; min-height: 100vh; }\n.page-sidebar { padding: 20px; border-right: 1px solid var(--color-border, #e5e7eb); display: none; }\n.page-main { padding: 24px; }\n@media (min-width: 768px) {\n  .page-layout { grid-template-columns: 260px 1fr; }\n  .page-sidebar { display: block; }\n}'
    : layout === 'centered'
    ? '.page-layout { display: flex; justify-content: center; padding: 24px 16px; min-height: 100vh; }\n.page-main { max-width: 800px; width: 100%; }\n@media (min-width: 768px) { .page-layout { padding: 40px 20px; } }'
    : '.page-layout { min-height: 100vh; }\n.page-main { padding: 16px; max-width: 1200px; margin: 0 auto; }\n@media (min-width: 768px) { .page-main { padding: 24px; } }';

  const sidebarBlock = layout === 'sidebar'
    ? '\n  <aside class="page-sidebar" aria-label="Sidebar navigation">\n    <slot name="sidebar"></slot>\n  </aside>'
    : '';

  const sectionBlocks = sections.map(s =>
    '  <section class="page-section" aria-label="' + s + '">\n    <h2>' + s + '</h2>\n    <slot name="section-' + kebabCase(s) + '"></slot>\n  </section>'
  ).join('\n\n');

  const css = tokenCSS + '\n'
    + '.page-header { padding: 12px 16px; border-bottom: 1px solid var(--color-border, #e5e7eb); }\n'
    + '.page-header h1 { margin: 0; font-size: 1.25rem; }\n'
    + '@media (min-width: 768px) { .page-header { padding: 16px 24px; } .page-header h1 { font-size: 1.5rem; } }\n'
    + '.page-section { margin-bottom: 24px; }\n'
    + '.page-section h2 { font-size: 1.1rem; border-bottom: 1px solid var(--color-border, #e5e7eb); padding-bottom: 8px; }\n'
    + '.page-footer { padding: 16px 24px; border-top: 1px solid var(--color-border, #e5e7eb); color: var(--color-text-muted, #6b7280); font-size: 0.8rem; }\n'
    + layoutStyle;

  const svelte = '<script>\n'
    + '  export let pageTitle = \'' + pascalName + '\';\n'
    + '</script>\n\n'
    + '<div class="page-layout">\n'
    + sidebarBlock + '\n'
    + '  <div class="page-main" role="main">\n'
    + '    <header class="page-header" role="banner">\n'
    + '      <h1>{pageTitle}</h1>\n'
    + '    </header>\n\n'
    + sectionBlocks + '\n\n'
    + '    <footer class="page-footer" role="contentinfo">\n'
    + '      <slot name="footer">&copy; ' + new Date().getFullYear() + '</slot>\n'
    + '    </footer>\n'
    + '  </div>\n'
    + '</div>\n\n'
    + '<style>\n' + css + '\n</style>\n';

  return {
    svelte,
    css,
    cssFileName: kebabName + '-page.svelte.css',
  };
}

module.exports = { generateSveltePage };
