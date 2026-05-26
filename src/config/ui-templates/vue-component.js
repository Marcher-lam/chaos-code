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
  button(name, tokens) {
    return {
      template: `    <button\n      :class="['btn', 'btn-' + variant, 'btn-' + size]"\n      :disabled="disabled"\n      @click="$emit('click', $event)"\n    >\n      <slot>Button</slot>\n    </button>`,
      script: `    const props = defineProps({\n      variant: { type: String, default: 'primary' },\n      size: { type: String, default: 'medium' },\n      disabled: { type: Boolean, default: false },\n    });\n    defineEmits(['click']);`,
      css: `.btn {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  border: none;\n  border-radius: var(--radius-md, 6px);\n  cursor: pointer;\n  font-family: var(--font-family-base, sans-serif);\n  transition: all 0.2s ease;\n}\n.btn-primary { background: var(--color-primary, #3b82f6); color: white; }\n.btn-secondary { background: var(--color-gray-200, #e5e7eb); color: var(--color-gray-800, #1f2937); }\n.btn-danger { background: var(--color-error, #ef4444); color: white; }\n.btn-small { padding: 4px 12px; font-size: 0.8rem; }\n.btn-medium { padding: 8px 16px; font-size: 0.9rem; }\n.btn-large { padding: 12px 24px; font-size: 1rem; }\n.btn:disabled { opacity: 0.5; cursor: not-allowed; }`,
    };
  },

  card(name, tokens) {
    return {
      template: `    <div class="card">\n      <div v-if="$slots.header" class="card-header">\n        <slot name="header"></slot>\n      </div>\n      <div class="card-body"><slot>No content</slot></div>\n      <div v-if="$slots.footer" class="card-footer">\n        <slot name="footer"></slot>\n      </div>\n    </div>`,
      script: '',
      css: `.card {\n  background: var(--color-bg-elevated, #fff);\n  border: 1px solid var(--color-border, #e5e7eb);\n  border-radius: var(--radius-lg, 8px);\n  overflow: hidden;\n}\n.card-header { padding: 12px 16px; border-bottom: 1px solid var(--color-border, #e5e7eb); font-weight: 600; }\n.card-body { padding: 16px; }\n.card-footer { padding: 12px 16px; border-top: 1px solid var(--color-border, #e5e7eb); background: var(--color-bg-muted, #f9fafb); }`,
    };
  },

  form(name, tokens) {
    return {
      template: `    <form class="form" @submit.prevent="$emit('submit', $event)">\n      <slot></slot>\n      <div class="form-actions">\n        <slot name="actions">\n          <button type="submit" class="btn btn-primary">Submit</button>\n        </slot>\n      </div>\n    </form>`,
      script: `    defineEmits(['submit']);`,
      css: `.form { display: flex; flex-direction: column; gap: 16px; }\n.form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }`,
    };
  },

  input(name, tokens) {
    return {
      template: `    <div class="input-group">\n      <label v-if="label" :for="inputId" class="input-label">{{ label }}</label>\n      <input\n        :id="inputId"\n        :type="type"\n        :value="modelValue"\n        :placeholder="placeholder"\n        :disabled="disabled"\n        class="input-field"\n        @input="$emit('update:modelValue', $event.target.value)"\n      />\n      <span v-if="error" class="input-error">{{ error }}</span>\n    </div>`,
      script: `    import { computed } from 'vue';\n    const props = defineProps({\n      modelValue: { type: [String, Number], default: '' },\n      type: { type: String, default: 'text' },\n      label: { type: String, default: '' },\n      placeholder: { type: String, default: '' },\n      disabled: { type: Boolean, default: false },\n      error: { type: String, default: '' },\n    });\n    defineEmits(['update:modelValue']);\n    const inputId = computed(() => 'input-' + Math.random().toString(36).slice(2, 8));`,
      css: `.input-group { display: flex; flex-direction: column; gap: 4px; }\n.input-label { font-size: 0.875rem; font-weight: 500; color: var(--color-text, #374151); }\n.input-field {\n  padding: 8px 12px; border: 1px solid var(--color-border, #d1d5db);\n  border-radius: var(--radius-md, 6px); font-size: 0.9rem; outline: none;\n  transition: border-color 0.2s;\n}\n.input-field:focus { border-color: var(--color-primary, #3b82f6); box-shadow: 0 0 0 2px rgba(59,130,246,0.1); }\n.input-field:disabled { opacity: 0.5; cursor: not-allowed; }\n.input-error { color: var(--color-error, #ef4444); font-size: 0.8rem; }`,
    };
  },

  modal(name, tokens) {
    return {
      template: `    <Teleport to="body">\n      <div v-if="open" class="modal-overlay" @click.self="close">\n        <div class="modal" :class="'modal-' + size">\n          <div class="modal-header">\n            <h3 class="modal-title">{{ title }}</h3>\n            <button class="modal-close" @click="close">&times;</button>\n          </div>\n          <div class="modal-body"><slot></slot></div>\n          <div v-if="$slots.footer" class="modal-footer"><slot name="footer"></slot></div>\n        </div>\n      </div>\n    </Teleport>`,
      script: `    const props = defineProps({\n      open: { type: Boolean, default: false },\n      title: { type: String, default: '' },\n      size: { type: String, default: 'medium' },\n    });\n    const emit = defineEmits(['close']);\n    const close = () => emit('close');`,
      css: `.modal-overlay {\n  position: fixed; inset: 0; background: rgba(0,0,0,0.5);\n  display: flex; align-items: center; justify-content: center; z-index: 1000;\n}\n.modal { background: var(--color-bg-elevated, #fff); border-radius: var(--radius-lg, 8px); max-height: 80vh; overflow: auto; }\n.modal-small { width: 320px; }\n.modal-medium { width: 480px; }\n.modal-large { width: 640px; }\n.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid var(--color-border, #e5e7eb); }\n.modal-title { margin: 0; font-size: 1.1rem; }\n.modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--color-text-muted, #6b7280); }\n.modal-body { padding: 16px; }\n.modal-footer { padding: 12px 16px; border-top: 1px solid var(--color-border, #e5e7eb); display: flex; justify-content: flex-end; gap: 8px; }`,
    };
  },

  nav(name, tokens) {
    return {
      template: `    <nav class="nav">\n      <div class="nav-brand"><slot name="brand">{{ brand }}</slot></div>\n      <div class="nav-links">\n        <a v-for="item in items" :key="item.key || item.label"\n          :href="item.href || '#'" :class="['nav-link', { active: item.active }]"\n          @click.prevent="$emit('navigate', item)">{{ item.label }}</a>\n      </div>\n      <div class="nav-actions"><slot name="actions"></slot></div>\n    </nav>`,
      script: `    const props = defineProps({\n      brand: { type: String, default: 'App' },\n      items: { type: Array, default: () => [] },\n    });\n    defineEmits(['navigate']);`,
      css: `.nav {\n  display: flex; align-items: center; padding: 0 16px; height: 56px;\n  background: var(--color-bg-elevated, #fff); border-bottom: 1px solid var(--color-border, #e5e7eb);\n}\n.nav-brand { font-weight: 700; font-size: 1.1rem; margin-right: 24px; }\n.nav-links { display: flex; gap: 4px; flex: 1; }\n.nav-link {\n  padding: 8px 12px; border-radius: var(--radius-md, 6px);\n  color: var(--color-text, #374151); text-decoration: none; font-size: 0.9rem; transition: background 0.2s;\n}\n.nav-link:hover { background: var(--color-bg-muted, #f3f4f6); }\n.nav-link.active { background: var(--color-primary, #3b82f6); color: white; }\n.nav-actions { display: flex; gap: 8px; }`,
    };
  },

  table(name, tokens) {
    return {
      template: `    <div class="table-wrapper">\n      <table class="table">\n        <thead><tr><th v-for="col in columns" :key="col.key">{{ col.label }}</th></tr></thead>\n        <tbody>\n          <tr v-for="(row, idx) in data" :key="idx">\n            <td v-for="col in columns" :key="col.key">{{ row[col.key] }}</td>\n          </tr>\n          <tr v-if="data.length === 0"><td :colspan="columns.length" class="table-empty">No data</td></tr>\n        </tbody>\n      </table>\n    </div>`,
      script: `    const props = defineProps({\n      columns: { type: Array, default: () => [] },\n      data: { type: Array, default: () => [] },\n    });`,
      css: `.table-wrapper { overflow-x: auto; }\n.table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }\n.table th, .table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--color-border, #e5e7eb); }\n.table th { background: var(--color-bg-muted, #f9fafb); font-weight: 600; }\n.table tr:hover { background: var(--color-bg-muted, #f9fafb); }\n.table-empty { text-align: center; color: var(--color-text-muted, #6b7280); }`,
    };
  },

  list(name, tokens) {
    return {
      template: `    <ul :class="['list', 'list-' + variant]">\n      <li v-for="(item, idx) in items" :key="idx" class="list-item">\n        <slot :item="item" :index="idx"><span class="list-item-content">{{ item }}</span></slot>\n      </li>\n      <li v-if="items.length === 0" class="list-empty"><slot name="empty">No items</slot></li>\n    </ul>`,
      script: `    const props = defineProps({\n      items: { type: Array, default: () => [] },\n      variant: { type: String, default: 'default' },\n    });`,
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
