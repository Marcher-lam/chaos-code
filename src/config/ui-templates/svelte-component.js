/**
 * Svelte Component Templates
 * Generates Svelte components with <script>, template, and <style>
 */

const { tokensToCSS } = require('./css-tokens');

function pascalCase(str) {
  return str.replace(/(^|[-_]\w)/g, m => m.replace(/[-_]/, '').toUpperCase());
}

function kebabCase(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').toLowerCase();
}

const generators = {
  button(name) {
    return {
      template: '<button\n  class="btn btn-{variant} btn-{size}"\n  on:click\n  {disabled}\n>\n  <slot>Button</slot>\n</button>',
      script: '  export let variant = "primary";\n  export let size = "medium";\n  export let disabled = false;',
      css: '.btn {\n  display: inline-flex; align-items: center; justify-content: center;\n  border: none; border-radius: var(--radius-md, 6px); cursor: pointer;\n  font-family: var(--font-family-base, sans-serif); transition: all 0.2s ease;\n}\n.btn-primary { background: var(--color-primary, #3b82f6); color: white; }\n.btn-secondary { background: var(--color-gray-200, #e5e7eb); color: var(--color-gray-800, #1f2937); }\n.btn-danger { background: var(--color-error, #ef4444); color: white; }\n.btn-small { padding: 4px 12px; font-size: 0.8rem; }\n.btn-medium { padding: 8px 16px; font-size: 0.9rem; }\n.btn-large { padding: 12px 24px; font-size: 1rem; }\n.btn:disabled { opacity: 0.5; cursor: not-allowed; }',
    };
  },
  card(name) {
    return {
      template: '<div class="card">\n  <div class="card-header">\n    <slot name="header"></slot>\n  </div>\n  <div class="card-body">\n    <slot>No content</slot>\n  </div>\n  <div class="card-footer">\n    <slot name="footer"></slot>\n  </div>\n</div>',
      script: '',
      css: '.card {\n  background: var(--color-bg-elevated, #fff); border: 1px solid var(--color-border, #e5e7eb);\n  border-radius: var(--radius-lg, 8px); overflow: hidden;\n}\n.card-header { padding: 12px 16px; border-bottom: 1px solid var(--color-border, #e5e7eb); font-weight: 600; }\n.card-body { padding: 16px; }\n.card-footer { padding: 12px 16px; border-top: 1px solid var(--color-border, #e5e7eb); background: var(--color-bg-muted, #f9fafb); }',
    };
  },
  form(name) {
    return {
      template: '<form class="form" on:submit|preventDefault>\n  <slot></slot>\n  <div class="form-actions">\n    <slot name="actions">\n      <button type="submit" class="btn btn-primary">Submit</button>\n    </slot>\n  </div>\n</form>',
      script: '  import { createEventDispatcher } from \'svelte\';\n  const dispatch = createEventDispatcher();',
      css: '.form { display: flex; flex-direction: column; gap: 16px; }\n.form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }',
    };
  },
  input(name) {
    return {
      template: '<div class="input-group">\n  {#if label}\n    <label for={inputId} class="input-label">{label}</label>\n  {/if}\n  <input\n    id={inputId}\n    type={type}\n    bind:value\n    {placeholder}\n    {disabled}\n    class="input-field"\n  />\n  {#if error}\n    <span class="input-error">{error}</span>\n  {/if}\n</div>',
      script: '  export let value = \'\';\n  export let type = \'text\';\n  export let label = \'\';\n  export let placeholder = \'\';\n  export let disabled = false;\n  export let error = \'\';\n  const inputId = \'input-\' + Math.random().toString(36).slice(2, 8);',
      css: '.input-group { display: flex; flex-direction: column; gap: 4px; }\n.input-label { font-size: 0.875rem; font-weight: 500; color: var(--color-text, #374151); }\n.input-field {\n  padding: 8px 12px; border: 1px solid var(--color-border, #d1d5db);\n  border-radius: var(--radius-md, 6px); font-size: 0.9rem; outline: none;\n}\n.input-field:focus { border-color: var(--color-primary, #3b82f6); }\n.input-error { color: var(--color-error, #ef4444); font-size: 0.8rem; }',
    };
  },
  modal(name) {
    return {
      template: '{#if open}\n  <div class="modal-overlay" on:click|self={close}>\n    <div class="modal modal-{size}">\n      <div class="modal-header">\n        <h3 class="modal-title">{title}</h3>\n        <button class="modal-close" on:click={close}>&times;</button>\n      </div>\n      <div class="modal-body"><slot></slot></div>\n      <div class="modal-footer"><slot name="footer"></slot></div>\n    </div>\n  </div>\n{/if}',
      script: '  export let open = false;\n  export let title = \'\';\n  export let size = \'medium\';\n  import { createEventDispatcher } from \'svelte\';\n  const dispatch = createEventDispatcher();\n  function close() { dispatch(\'close\'); }',
      css: '.modal-overlay {\n  position: fixed; inset: 0; background: rgba(0,0,0,0.5);\n  display: flex; align-items: center; justify-content: center; z-index: 1000;\n}\n.modal { background: var(--color-bg-elevated, #fff); border-radius: var(--radius-lg, 8px); max-height: 80vh; overflow: auto; }\n.modal-small { width: 320px; }\n.modal-medium { width: 480px; }\n.modal-large { width: 640px; }\n.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid var(--color-border, #e5e7eb); }\n.modal-title { margin: 0; font-size: 1.1rem; }\n.modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; }\n.modal-body { padding: 16px; }\n.modal-footer { padding: 12px 16px; border-top: 1px solid var(--color-border, #e5e7eb); display: flex; justify-content: flex-end; gap: 8px; }',
    };
  },
  nav(name) {
    return {
      template: '<nav class="nav">\n  <div class="nav-brand"><slot name="brand">{brand}</slot></div>\n  <div class="nav-links">\n    {#each items as item}\n      <a href={item.href || \'#\'} class="nav-link" class:active={item.active}\n        on:click|preventDefault>{item.label}</a>\n    {/each}\n  </div>\n  <div class="nav-actions"><slot name="actions"></slot></div>\n</nav>',
      script: '  export let brand = \'App\';\n  export let items = [];',
      css: '.nav { display: flex; align-items: center; padding: 0 16px; height: 56px; background: var(--color-bg-elevated, #fff); border-bottom: 1px solid var(--color-border, #e5e7eb); }\n.nav-brand { font-weight: 700; font-size: 1.1rem; margin-right: 24px; }\n.nav-links { display: flex; gap: 4px; flex: 1; }\n.nav-link { padding: 8px 12px; border-radius: var(--radius-md, 6px); color: var(--color-text, #374151); text-decoration: none; font-size: 0.9rem; }\n.nav-link:hover { background: var(--color-bg-muted, #f3f4f6); }\n.nav-link.active { background: var(--color-primary, #3b82f6); color: white; }',
    };
  },
  table(name) {
    return {
      template: '<div class="table-wrapper">\n  <table class="table">\n    <thead><tr>{#each columns as col}<th>{col.label}</th>{/each}</tr></thead>\n    <tbody>\n      {#each data as row}\n        <tr>{#each columns as col}<td>{row[col.key]}</td>{/each}</tr>\n      {:else}\n        <tr><td colspan={columns.length} class="table-empty">No data</td></tr>\n      {/each}\n    </tbody>\n  </table>\n</div>',
      script: '  export let columns = [];\n  export let data = [];',
      css: '.table-wrapper { overflow-x: auto; }\n.table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }\n.table th, .table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--color-border, #e5e7eb); }\n.table th { background: var(--color-bg-muted, #f9fafb); font-weight: 600; }\n.table tr:hover { background: var(--color-bg-muted, #f9fafb); }',
    };
  },
  list(name) {
    return {
      template: '<ul class="list list-{variant}">\n  {#each items as item, idx}\n    <li class="list-item"><slot {item} {idx}>{item}</slot></li>\n  {:else}\n    <li class="list-empty"><slot name="empty">No items</slot></li>\n  {/each}\n</ul>',
      script: '  export let items = [];\n  export let variant = \'default\';',
      css: '.list { list-style: none; padding: 0; margin: 0; }\n.list-item { padding: 10px 12px; border-bottom: 1px solid var(--color-border, #e5e7eb); }\n.list-item:hover { background: var(--color-bg-muted, #f9fafb); }\n.list-empty { padding: 24px; text-align: center; color: var(--color-text-muted, #6b7280); }',
    };
  },
};

function generateSvelteComponent(name, options = {}, tokens = {}) {
  const pascalName = pascalCase(name);
  const kebabName = kebabCase(name);
  const type = options.type || 'button';

  const gen = generators[type] || generators.button;
  const result = gen(pascalName);
  const tokenCSS = tokensToCSS(tokens);
  const fullCSS = tokenCSS + '\n' + result.css;

  const svelte = '<script>\n' + result.script + '\n</script>\n\n'
    + result.template + '\n\n'
    + '<style>\n' + fullCSS + '\n</style>\n';

  return {
    svelte,
    css: fullCSS,
    cssFileName: kebabName + '.svelte.css',
  };
}

module.exports = { generateSvelteComponent };
