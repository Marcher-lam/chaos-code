/**
 * Angular Standalone Component Templates
 * Generates Angular components with TypeScript, template, and styles
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
      template: '<button\n  [class]="\'btn btn-\' + variant + \' btn-\' + size"\n  [disabled]="disabled"\n  (click)="onClick($event)"\n>\n  <ng-content>Button</ng-content>\n</button>',
      tsExtra: '  @Input() variant = \'primary\';\n  @Input() size = \'medium\';\n  @Input() disabled = false;\n  @Output() btnClick = new EventEmitter<Event>();\n\n  onClick(event: Event) { this.btnClick.emit(event); }',
      css: '.btn { display: inline-flex; align-items: center; justify-content: center; border: none; border-radius: var(--radius-md, 6px); cursor: pointer; font-family: var(--font-family-base, sans-serif); transition: all 0.2s; }\n.btn-primary { background: var(--color-primary, #3b82f6); color: white; }\n.btn-secondary { background: var(--color-gray-200, #e5e7eb); color: var(--color-gray-800, #1f2937); }\n.btn-danger { background: var(--color-error, #ef4444); color: white; }\n.btn-small { padding: 4px 12px; font-size: 0.8rem; }\n.btn-medium { padding: 8px 16px; font-size: 0.9rem; }\n.btn-large { padding: 12px 24px; font-size: 1rem; }\n.btn:disabled { opacity: 0.5; cursor: not-allowed; }',
    };
  },
  card(name) {
    return {
      template: '<div class="card">\n  <div class="card-header" *ngIf="hasHeaderSlot">\n    <ng-content select="[header]"></ng-content>\n  </div>\n  <div class="card-body"><ng-content>No content</ng-content></div>\n  <div class="card-footer" *ngIf="hasFooterSlot">\n    <ng-content select="[footer]"></ng-content>\n  </div>\n</div>',
      tsExtra: '  @Input() hasHeaderSlot = false;\n  @Input() hasFooterSlot = false;',
      css: '.card { background: var(--color-bg-elevated, #fff); border: 1px solid var(--color-border, #e5e7eb); border-radius: var(--radius-lg, 8px); overflow: hidden; }\n.card-header { padding: 12px 16px; border-bottom: 1px solid var(--color-border, #e5e7eb); font-weight: 600; }\n.card-body { padding: 16px; }\n.card-footer { padding: 12px 16px; border-top: 1px solid var(--color-border, #e5e7eb); background: var(--color-bg-muted, #f9fafb); }',
    };
  },
  form(name) {
    return {
      template: '<form class="form" (ngSubmit)="onSubmit($event)">\n  <ng-content></ng-content>\n  <div class="form-actions">\n    <ng-content select="[actions]">\n      <button type="submit" class="btn btn-primary">Submit</button>\n    </ng-content>\n  </div>\n</form>',
      tsExtra: '  @Output() formSubmit = new EventEmitter<Event>();\n  onSubmit(event: Event) { this.formSubmit.emit(event); }',
      css: '.form { display: flex; flex-direction: column; gap: 16px; }\n.form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }',
    };
  },
  input(name) {
    return {
      template: '<div class="input-group">\n  <label *ngIf="label" [for]="inputId" class="input-label">{{ label }}</label>\n  <input\n    [id]="inputId"\n    [type]="type"\n    [value]="value"\n    [placeholder]="placeholder"\n    [disabled]="disabled"\n    class="input-field"\n    (input)="onInput($event)"\n  />\n  <span *ngIf="error" class="input-error">{{ error }}</span>\n</div>',
      tsExtra: '  @Input() value = \'\';\n  @Input() type = \'text\';\n  @Input() label = \'\';\n  @Input() placeholder = \'\';\n  @Input() disabled = false;\n  @Input() error = \'\';\n  @Output() valueChange = new EventEmitter<string>();\n  inputId = \'input-\' + Math.random().toString(36).slice(2, 8);\n  onInput(event: Event) { this.valueChange.emit((event.target as HTMLInputElement).value); }',
      css: '.input-group { display: flex; flex-direction: column; gap: 4px; }\n.input-label { font-size: 0.875rem; font-weight: 500; color: var(--color-text, #374151); }\n.input-field { padding: 8px 12px; border: 1px solid var(--color-border, #d1d5db); border-radius: var(--radius-md, 6px); font-size: 0.9rem; outline: none; }\n.input-field:focus { border-color: var(--color-primary, #3b82f6); }\n.input-error { color: var(--color-error, #ef4444); font-size: 0.8rem; }',
    };
  },
  modal(name) {
    return {
      template: '<div *ngIf="open" class="modal-overlay" (click)="onOverlayClick()">\n  <div class="modal" [class]="\'modal-\' + size">\n    <div class="modal-header">\n      <h3 class="modal-title">{{ title }}</h3>\n      <button class="modal-close" (click)="close()">&times;</button>\n    </div>\n    <div class="modal-body"><ng-content></ng-content></div>\n    <div class="modal-footer"><ng-content select="[footer]"></ng-content></div>\n  </div>\n</div>',
      tsExtra: '  @Input() open = false;\n  @Input() title = \'\';\n  @Input() size = \'medium\';\n  @Output() closeEvent = new EventEmitter<void>();\n  close() { this.closeEvent.emit(); }\n  onOverlayClick() { this.close(); }',
      css: '.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }\n.modal { background: var(--color-bg-elevated, #fff); border-radius: var(--radius-lg, 8px); max-height: 80vh; overflow: auto; }\n.modal-small { width: 320px; }\n.modal-medium { width: 480px; }\n.modal-large { width: 640px; }\n.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid var(--color-border, #e5e7eb); }\n.modal-title { margin: 0; font-size: 1.1rem; }\n.modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; }\n.modal-body { padding: 16px; }\n.modal-footer { padding: 12px 16px; border-top: 1px solid var(--color-border, #e5e7eb); display: flex; justify-content: flex-end; gap: 8px; }',
    };
  },
  nav(name) {
    return {
      template: '<nav class="nav">\n  <div class="nav-brand"><ng-content select="[brand]">{{ brand }}</ng-content></div>\n  <div class="nav-links">\n    <a *ngFor="let item of items" [href]="item.href || \'#\'"\n      [class.active]="item.active" class="nav-link"\n      (click)="onNavigate(item)">{{ item.label }}</a>\n  </div>\n  <div class="nav-actions"><ng-content select="[actions]"></ng-content></div>\n</nav>',
      tsExtra: '  @Input() brand = \'App\';\n  @Input() items: Array<{label: string; href?: string; active?: boolean}> = [];\n  @Output() navigate = new EventEmitter<any>();\n  onNavigate(item: any) { this.navigate.emit(item); }',
      css: '.nav { display: flex; align-items: center; padding: 0 16px; height: 56px; background: var(--color-bg-elevated, #fff); border-bottom: 1px solid var(--color-border, #e5e7eb); }\n.nav-brand { font-weight: 700; font-size: 1.1rem; margin-right: 24px; }\n.nav-links { display: flex; gap: 4px; flex: 1; }\n.nav-link { padding: 8px 12px; border-radius: var(--radius-md, 6px); color: var(--color-text, #374151); text-decoration: none; font-size: 0.9rem; }\n.nav-link:hover { background: var(--color-bg-muted, #f3f4f6); }\n.nav-link.active { background: var(--color-primary, #3b82f6); color: white; }',
    };
  },
  table(name) {
    return {
      template: '<div class="table-wrapper">\n  <table class="table">\n    <thead><tr><th *ngFor="let col of columns">{{ col.label }}</th></tr></thead>\n    <tbody>\n      <tr *ngFor="let row of data">\n        <td *ngFor="let col of columns">{{ row[col.key] }}</td>\n      </tr>\n      <tr *ngIf="data.length === 0">\n        <td [attr.colspan]="columns.length" class="table-empty">No data</td>\n      </tr>\n    </tbody>\n  </table>\n</div>',
      tsExtra: '  @Input() columns: Array<{key: string; label: string}> = [];\n  @Input() data: any[] = [];',
      css: '.table-wrapper { overflow-x: auto; }\n.table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }\n.table th, .table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--color-border, #e5e7eb); }\n.table th { background: var(--color-bg-muted, #f9fafb); font-weight: 600; }\n.table tr:hover { background: var(--color-bg-muted, #f9fafb); }',
    };
  },
  list(name) {
    return {
      template: '<ul [class]="\'list list-\' + variant">\n  <li *ngFor="let item of items" class="list-item">\n    <ng-container *ngTemplateOutlet="itemTemplate; context: { $implicit: item }"></ng-container>\n    <span *ngIf="!itemTemplate">{{ item }}</span>\n  </li>\n  <li *ngIf="items.length === 0" class="list-empty">\n    <ng-content select="[empty]">No items</ng-content>\n  </li>\n</ul>',
      tsExtra: '  @Input() items: any[] = [];\n  @Input() variant = \'default\';\n  @ContentChild(\'itemTemplate\') itemTemplate!: TemplateRef<any>;',
      css: '.list { list-style: none; padding: 0; margin: 0; }\n.list-item { padding: 10px 12px; border-bottom: 1px solid var(--color-border, #e5e7eb); }\n.list-item:hover { background: var(--color-bg-muted, #f9fafb); }\n.list-empty { padding: 24px; text-align: center; color: var(--color-text-muted, #6b7280); }',
    };
  },
};

function generateAngularComponent(name, options = {}, tokens = {}) {
  const pascalName = pascalCase(name);
  const kebabName = kebabCase(name);
  const type = options.type || 'button';

  const gen = generators[type] || generators.button;
  const result = gen(pascalName);
  const tokenCSS = tokensToCSS(tokens);
  const fullCSS = tokenCSS + '\n' + result.css;

  const ts = "import { Component, Input, Output, EventEmitter, ContentChild, TemplateRef } from '@angular/core';\n\n"
    + "@Component({\n  selector: 'app-" + kebabName + "',\n  standalone: true,\n  template: `\n" + result.template.split('\n').map(l => '    ' + l).join('\n') + "\n  `,\n  styles: [`\n" + fullCSS.split('\n').map(l => '    ' + l).join('\n') + "\n  `],\n})\nexport class " + pascalName + "Component {\n" + result.tsExtra + "\n}\n";

  const html = result.template;
  const css = fullCSS;

  return {
    ts,
    html,
    css,
    cssFileName: kebabName + '.component.css',
  };
}

module.exports = { generateAngularComponent };
