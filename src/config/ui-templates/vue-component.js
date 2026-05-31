/**
 * Vue SFC Component Templates
 * Generates Vue 3 Single File Components with <script setup>
 */

const { tokensToCSS } = require('./css-tokens');

function pascalCase(str) {
  return str.replace(/(^|[-_]\w)/g, m => m.replace(/[-_]/, '').toUpperCase());
}

function kebabCase(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').toLowerCase();
}

const generators = {
  button(_name, _tokens) {
    return {
      template: `    <button\n      :class="['btn', 'btn-' + variant, 'btn-' + size, { 'btn-loading': loading }]"\n      :disabled="disabled || loading"\n      :aria-busy="loading || undefined"\n      :aria-disabled="disabled || loading || undefined"\n      @click="$emit('click', $event)"\n    >\n      <span v-if="loading" class="btn-spinner" aria-hidden="true"></span>\n      <span :class="['btn-text', { 'btn-text--loading': loading }]"><slot>Button</slot></span>\n    </button>`,
      script: `    const props = defineProps({\n      variant: { type: String, default: 'primary' },\n      size: { type: String, default: 'medium' },\n      disabled: { type: Boolean, default: false },\n      loading: { type: Boolean, default: false },\n    });\n    defineEmits(['click']);`,
      css: `.btn {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  border: none;\n  border-radius: var(--radius-md, 6px);\n  cursor: pointer;\n  font-family: var(--font-family-base, sans-serif);\n  transition: all 0.2s ease;\n  position: relative;\n  gap: 0.5rem;\n}\n.btn-spinner {\n  width: 1em;\n  height: 1em;\n  border: 2px solid currentColor;\n  border-right-color: transparent;\n  border-radius: 50%;\n  animation: btn-spin 0.6s linear infinite;\n}\n.btn-text--loading { opacity: 0.7; }\n@keyframes btn-spin { to { transform: rotate(360deg); } }\n.btn-primary { background: var(--color-primary, #3b82f6); color: white; }\n.btn-secondary { background: var(--color-gray-200, #e5e7eb); color: var(--color-gray-800, #1f2937); }\n.btn-danger { background: var(--color-error, #ef4444); color: white; }\n.btn-small { padding: 4px 12px; font-size: 0.8rem; }\n.btn-medium { padding: 8px 16px; font-size: 0.9rem; }\n.btn-large { padding: 12px 24px; font-size: 1rem; }\n.btn:disabled { opacity: 0.5; cursor: not-allowed; }`,
    };
  },

  card(_name, _tokens) {
    return {
      template: `    <div class="card" role="region" :aria-label="title || 'Card'">\n      <div v-if="title" class="card-header">\n        <h3 class="card-title">{{ title }}</h3>\n      </div>\n      <div v-if="$slots.header && !title" class="card-header">\n        <slot name="header"></slot>\n      </div>\n      <div class="card-body"><slot>No content</slot></div>\n      <div v-if="$slots.footer" class="card-footer">\n        <slot name="footer"></slot>\n      </div>\n    </div>`,
      script: `    const props = defineProps({\n      title: { type: String, default: '' },\n    });`,
      css: `.card {\n  background: var(--color-bg-elevated, #fff);\n  border: 1px solid var(--color-border, #e5e7eb);\n  border-radius: var(--radius-lg, 8px);\n  overflow: hidden;\n}\n.card-header { padding: 12px 16px; border-bottom: 1px solid var(--color-border, #e5e7eb); font-weight: 600; }\n.card-title { margin: 0; font-size: 1.1rem; }\n.card-body { padding: 16px; }\n.card-footer { padding: 12px 16px; border-top: 1px solid var(--color-border, #e5e7eb); background: var(--color-bg-muted, #f9fafb); }`,
    };
  },

  form(_name, _tokens) {
    return {
      template: `    <form class="form" :aria-label="title || 'Form'" novalidate @submit.prevent="$emit('submit', $event)">\n      <h2 v-if="title" class="form-title">{{ title }}</h2>\n      <div class="form-fields"><slot></slot></div>\n      <div class="form-actions">\n        <slot name="actions">\n          <button type="submit" class="btn btn-primary" :aria-label="title ? 'Submit ' + title : 'Submit form'">Submit</button>\n        </slot>\n      </div>\n    </form>`,
      script: `    const props = defineProps({\n      title: { type: String, default: '' },\n    });\n    defineEmits(['submit']);`,
      css: `.form { display: flex; flex-direction: column; gap: 16px; }\n.form-title { margin: 0 0 8px; font-size: 1.25rem; font-weight: 600; }\n.form-fields { display: flex; flex-direction: column; gap: 12px; }\n.form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }`,
    };
  },

  input(_name, _tokens) {
    return {
      template: `    <div class="input-group">\n      <label v-if="label" :for="inputId" class="input-label">{{ label }}</label>\n      <input\n        :id="inputId"\n        :type="type"\n        :value="modelValue"\n        :placeholder="placeholder"\n        :disabled="disabled"\n        :aria-invalid="!!error"\n        :aria-describedby="error ? inputId + '-error' : undefined"\n        class="input-field"\n        @input="$emit('update:modelValue', $event.target.value)"\n      />\n      <span v-if="error" :id="inputId + '-error'" class="input-error" role="alert">{{ error }}</span>\n    </div>`,
      script: `    import { computed } from 'vue';\n    const props = defineProps({\n      modelValue: { type: [String, Number], default: '' },\n      type: { type: String, default: 'text' },\n      label: { type: String, default: '' },\n      placeholder: { type: String, default: '' },\n      disabled: { type: Boolean, default: false },\n      error: { type: String, default: '' },\n    });\n    defineEmits(['update:modelValue']);\n    const inputId = computed(() => 'input-' + Math.random().toString(36).slice(2, 8));`,
      css: `.input-group { display: flex; flex-direction: column; gap: 4px; }\n.input-label { font-size: 0.875rem; font-weight: 500; color: var(--color-text, #374151); }\n.input-field {\n  padding: 8px 12px; border: 1px solid var(--color-border, #d1d5db);\n  border-radius: var(--radius-md, 6px); font-size: 0.9rem; outline: none;\n  transition: border-color 0.2s;\n}\n.input-field:focus { border-color: var(--color-primary, #3b82f6); box-shadow: 0 0 0 2px rgba(59,130,246,0.1); }\n.input-field:disabled { opacity: 0.5; cursor: not-allowed; }\n.input-error { color: var(--color-error, #ef4444); font-size: 0.8rem; }`,
    };
  },

  modal(_name, _tokens) {
    return {
      template: `    <Teleport to="body">\n      <div v-if="open" class="modal-overlay" @click.self="close" @keydown="handleKeyDown" ref="overlayRef" role="dialog" :aria-modal="true" :aria-labelledby="'modal-title-' + _uid">\n        <div class="modal" :class="'modal-' + size" ref="modalRef" tabindex="-1">\n          <div class="modal-header">\n            <h3 :id="'modal-title-' + _uid" class="modal-title">{{ title }}</h3>\n            <button class="modal-close" @click="close" aria-label="Close dialog">&times;</button>\n          </div>\n          <div class="modal-body"><slot></slot></div>\n          <div v-if="$slots.footer" class="modal-footer"><slot name="footer"></slot></div>\n        </div>\n      </div>\n    </Teleport>`,
      script: `    import { ref, watch, nextTick, onBeforeUnmount } from 'vue';\n    const props = defineProps({\n      open: { type: Boolean, default: false },\n      title: { type: String, default: '' },\n      size: { type: String, default: 'medium' },\n    });\n    const emit = defineEmits(['close']);\n    const overlayRef = ref(null);\n    const modalRef = ref(null);\n    let previousFocus = null;\n    const close = () => emit('close');\n    const handleKeyDown = (e) => {\n      if (e.key === 'Escape') { close(); return; }\n      if (e.key !== 'Tab' || !modalRef.value) return;\n      const focusable = modalRef.value.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');\n      const first = focusable[0];\n      const last = focusable[focusable.length - 1];\n      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }\n      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }\n    };\n    watch(() => props.open, (val) => {\n      if (val) {\n        previousFocus = document.activeElement;\n        document.body.style.overflow = 'hidden';\n        nextTick(() => modalRef.value?.focus());\n      } else {\n        document.body.style.overflow = '';\n        previousFocus?.focus();\n      }\n    });\n    onBeforeUnmount(() => { document.body.style.overflow = ''; });`,
      css: `.modal-overlay {\n  position: fixed; inset: 0; background: rgba(0,0,0,0.5);\n  display: flex; align-items: center; justify-content: center; z-index: 1000;\n}\n.modal { background: var(--color-bg-elevated, #fff); border-radius: var(--radius-lg, 8px); max-height: 80vh; overflow: auto; outline: none; }\n.modal-small { width: 320px; }\n.modal-medium { width: 480px; }\n.modal-large { width: 640px; }\n.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid var(--color-border, #e5e7eb); }\n.modal-title { margin: 0; font-size: 1.1rem; }\n.modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--color-text-muted, #6b7280); }\n.modal-body { padding: 16px; }\n.modal-footer { padding: 12px 16px; border-top: 1px solid var(--color-border, #e5e7eb); display: flex; justify-content: flex-end; gap: 8px; }`,
    };
  },

  nav(_name, _tokens) {
    return {
      template: `    <nav class="nav" aria-label="Main navigation" role="navigation">\n      <div class="nav-brand"><slot name="brand">{{ brand }}</slot></div>\n      <button\n        class="nav-toggle"\n        :aria-expanded="menuOpen"\n        :aria-controls="'nav-menu'"\n        @click="menuOpen = !menuOpen"\n        aria-label="Toggle navigation menu"\n      >\n        <span class="nav-bar"></span>\n        <span class="nav-bar"></span>\n        <span class="nav-bar"></span>\n      </button>\n      <ul :id="'nav-menu'" :class="['nav-links', { 'nav-links--open': menuOpen }]" role="menubar">\n        <li v-for="item in items" :key="item.key || item.label" role="none">\n          <a :href="item.href || '#'" :class="['nav-link', { active: item.active }]"\n            role="menuitem"\n            @click.prevent="$emit('navigate', item)">{{ item.label }}</a>\n        </li>\n      </ul>\n      <div class="nav-actions"><slot name="actions"></slot></div>\n    </nav>`,
      script: `    import { ref } from 'vue';\n    const props = defineProps({\n      brand: { type: String, default: 'App' },\n      items: { type: Array, default: () => [] },\n    });\n    defineEmits(['navigate']);\n    const menuOpen = ref(false);`,
      css: `.nav {\n  display: flex; align-items: center; padding: 0 16px; height: 56px;\n  background: var(--color-bg-elevated, #fff); border-bottom: 1px solid var(--color-border, #e5e7eb);\n}\n.nav-brand { font-weight: 700; font-size: 1.1rem; margin-right: 24px; }\n.nav-toggle { display: none; flex-direction: column; gap: 4px; background: none; border: none; cursor: pointer; padding: 4px; }\n.nav-bar { width: 20px; height: 2px; background: var(--color-text, #374151); }\n.nav-links { display: flex; gap: 4px; flex: 1; list-style: none; margin: 0; padding: 0; }\n.nav-link {\n  padding: 8px 12px; border-radius: var(--radius-md, 6px);\n  color: var(--color-text, #374151); text-decoration: none; font-size: 0.9rem; transition: background 0.2s;\n}\n.nav-link:hover { background: var(--color-bg-muted, #f3f4f6); }\n.nav-link.active { background: var(--color-primary, #3b82f6); color: white; }\n.nav-actions { display: flex; gap: 8px; }\n@media (max-width: 768px) {\n  .nav-toggle { display: flex; }\n  .nav-links { display: none; position: absolute; top: 56px; left: 0; right: 0; background: white; flex-direction: column; padding: 16px; border-bottom: 1px solid var(--color-border, #e5e7eb); box-shadow: 0 8px 24px rgba(0,0,0,.10); }\n  .nav-links--open { display: flex; }\n}`,
    };
  },

  table(_name, _tokens) {
    return {
      template: `    <div class="table-wrapper">\n      <table class="table">\n        <caption v-if="caption" class="sr-only">{{ caption }}</caption>\n        <thead><tr><th v-for="col in columns" :key="col.key" scope="col">{{ col.label }}</th></tr></thead>\n        <tbody>\n          <tr v-for="(row, idx) in data" :key="idx">\n            <td v-for="col in columns" :key="col.key">{{ row[col.key] }}</td>\n          </tr>\n          <tr v-if="data.length === 0"><td :colspan="columns.length" class="table-empty">No data available</td></tr>\n        </tbody>\n      </table>\n    </div>`,
      script: `    const props = defineProps({\n      caption: { type: String, default: '' },\n      columns: { type: Array, default: () => [] },\n      data: { type: Array, default: () => [] },\n    });`,
      css: `.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }\n.table-wrapper { overflow-x: auto; }\n.table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }\n.table th, .table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--color-border, #e5e7eb); }\n.table th { background: var(--color-bg-muted, #f9fafb); font-weight: 600; }\n.table tr:hover { background: var(--color-bg-muted, #f9fafb); }\n.table-empty { text-align: center; color: var(--color-text-muted, #6b7280); padding: 24px; }`,
    };
  },

  list(_name, _tokens) {
    return {
      template: `    <ul :class="['list', 'list-' + variant]" :aria-label="label || undefined">\n      <li v-for="(item, idx) in items" :key="idx" class="list-item">\n        <slot :item="item" :index="idx"><span class="list-item-content">{{ item }}</span></slot>\n      </li>\n      <li v-if="items.length === 0" class="list-empty"><slot name="empty">No items</slot></li>\n    </ul>`,
      script: `    const props = defineProps({\n      items: { type: Array, default: () => [] },\n      variant: { type: String, default: 'default' },\n      label: { type: String, default: '' },\n    });`,
      css: `.list { list-style: none; padding: 0; margin: 0; }\n.list-item { padding: 10px 12px; border-bottom: 1px solid var(--color-border, #e5e7eb); }\n.list-item:last-child { border-bottom: none; }\n.list-item:hover { background: var(--color-bg-muted, #f9fafb); }\n.list-empty { padding: 24px; text-align: center; color: var(--color-text-muted, #6b7280); }\n.list-compact .list-item { padding: 6px 12px; }`,
    };
  },
};

function generateVueComponent(name, options = {}, tokens = {}) {
  const pascalName = pascalCase(name);
  const kebabName = kebabCase(name);
  const type = options.type || 'button';

  const gen = generators[type];
  if (!gen) {
    return generateVueComponent(name, { ...options, type: 'button' }, tokens);
  }

  const result = gen(pascalName, tokens);
  const tokenCSS = tokensToCSS(tokens);
  const fullCSS = tokenCSS + '\n' + result.css;

  const vue = '<template>\n' + result.template + '\n</template>\n\n'
    + '<script setup>\ndefineOptions({ name: \'' + pascalName + '\' });\n'
    + result.script + '\n</script>\n\n'
    + '<style scoped>\n' + fullCSS + '\n</style>\n';

  return {
    vue,
    css: fullCSS,
    cssFileName: kebabName + '.vue.css',
  };
}

module.exports = { generateVueComponent };
