/**
 * React Component Generator
 * Generates typed React components (button, card, form, input, modal, nav, table, list).
 */

const { tokensToCSS } = require('./css-tokens');

/**
 * Generate a React component and its CSS based on type.
 * @param {string} name - Component name (kebab-case or PascalCase)
 * @param {object} options - { type: 'button'|'card'|'form'|'input'|'modal'|'nav'|'table'|'list', style: string }
 * @param {object} tokens - Design tokens
 * @returns {{ jsx: string, css: string, cssFileName: string }}
 */
function generateReactComponent(name, options = {}, tokens = {}) {
  const type = options.type || 'button';
  const pascalName = toPascalCase(name);
  const kebabName = toKebabCase(name);
  const style = options.style || 'css';
  const cssFileName = style === 'css-modules' ? `${kebabName}.module.css` : `${kebabName}.css`;
  const importPath = `./${cssFileName}`;

  const generators = {
    button: () => generateButton(pascalName, kebabName, importPath),
    card: () => generateCard(pascalName, kebabName, importPath),
    form: () => generateForm(pascalName, kebabName, importPath),
    input: () => generateInput(pascalName, kebabName, importPath),
    modal: () => generateModal(pascalName, kebabName, importPath),
    nav: () => generateNav(pascalName, kebabName, importPath),
    table: () => generateTable(pascalName, kebabName, importPath),
    list: () => generateList(pascalName, kebabName, importPath),
  };

  const gen = generators[type] || generators.button;
  const { jsx, cssBody } = gen();

  const css = tokensToCSS(tokens) + '\n\n' + cssBody;

  return { jsx, css, cssFileName };
}

// ─── Button ───

function generateButton(pascal, kebab, importPath) {
  const jsx = [
    `import React from 'react';`,
    `import '${importPath}';`,
    ``,
    `export default function ${pascal}({ children, variant = 'primary', size = 'md', disabled = false, loading = false, onClick, ...props }) {`,
    `  const classNames = [`,
    `    '${kebab}',`,
    `    '${kebab}--' + variant,`,
    `    '${kebab}--' + size,`,
    `    loading && '${kebab}--loading',`,
    `  ].filter(Boolean).join(' ');`,
    ``,
    `  return (`,
    `    <button`,
    `      className={classNames}`,
    `      disabled={disabled || loading}`,
    `      aria-busy={loading || undefined}`,
    `      aria-disabled={disabled || loading || undefined}`,
    `      onClick={onClick}`,
    `      {...props}`,
    `    >`,
    `      {loading && <span className="${kebab}__spinner" aria-hidden="true" />}`,
    `      <span className={loading ? '${kebab}__text ${kebab}__text--loading' : '${kebab}__text'}>{children}</span>`,
    `    </button>`,
    `  );`,
    `}`,
    ``,
  ].join('\n');

  const cssBody = `.${kebab} {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-md, 0.5rem);
  font-family: var(--font-family-base, system-ui, sans-serif);
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
  position: relative;
  gap: 0.5rem;
}

.${kebab}__spinner {
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: ${kebab}-spin 0.6s linear infinite;
}

.${kebab}__text--loading {
  opacity: 0.7;
}

@keyframes ${kebab}-spin {
  to { transform: rotate(360deg); }
}

.${kebab}--primary {
  background: var(--color-primary, #3b82f6);
  color: white;
}

.${kebab}--primary:hover:not(:disabled) {
  opacity: 0.9;
}

.${kebab}--secondary {
  background: var(--color-secondary, #6366f1);
  color: white;
}

.${kebab}--secondary:hover:not(:disabled) {
  opacity: 0.9;
}

.${kebab}--outline {
  background: transparent;
  color: var(--color-primary, #3b82f6);
  border: 1px solid var(--color-primary, #3b82f6);
}

.${kebab}--outline:hover:not(:disabled) {
  background: var(--color-primary, #3b82f6);
  color: white;
}

.${kebab}--sm { padding: var(--spacing-xs, 0.25rem) var(--spacing-sm, 0.5rem); font-size: var(--text-sm, 0.875rem); }
.${kebab}--md { padding: var(--spacing-sm, 0.5rem) var(--spacing-md, 1rem); font-size: var(--text-base, 1rem); }
.${kebab}--lg { padding: var(--spacing-sm, 0.5rem) var(--spacing-lg, 1.5rem); font-size: var(--text-lg, 1.125rem); }

.${kebab}:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}`;

  return { jsx, cssBody };
}

// ─── Card ───

function generateCard(pascal, kebab, importPath) {
  const jsx = [
    `import React from 'react';`,
    `import '${importPath}';`,
    ``,
    `export default function ${pascal}({ title, children, footer, className = '', ...props }) {`,
    `  return (`,
    `    <div className={\`${kebab} \${className}\`.trim()} role="region" aria-label={title || 'Card'} {...props}>`,
    `      {title && (`,
    `        <div className="${kebab}__header">`,
    `          <h3 className="${kebab}__title">{title}</h3>`,
    `        </div>`,
    `      )}`,
    `      <div className="${kebab}__body">`,
    `        {children}`,
    `      </div>`,
    `      {footer && (`,
    `        <div className="${kebab}__footer">`,
    `          {footer}`,
    `        </div>`,
    `      )}`,
    `    </div>`,
    `  );`,
    `}`,
    ``,
  ].join('\n');

  const cssBody = `.${kebab} {
  background: white;
  border: 1px solid var(--color-gray-200, #e5e7eb);
  border-radius: var(--radius-lg, 0.75rem);
  overflow: hidden;
}

.${kebab}__header {
  padding: var(--spacing-md, 1rem) var(--spacing-lg, 1.5rem);
  border-bottom: 1px solid var(--color-gray-200, #e5e7eb);
}

.${kebab}__title {
  margin: 0;
  font-size: var(--text-lg, 1.125rem);
  font-weight: 600;
  color: var(--color-gray-900, #111827);
}

.${kebab}__body {
  padding: var(--spacing-lg, 1.5rem);
}

.${kebab}__footer {
  padding: var(--spacing-md, 1rem) var(--spacing-lg, 1.5rem);
  border-top: 1px solid var(--color-gray-200, #e5e7eb);
  background: var(--color-gray-50, #f9fafb);
}`;

  return { jsx, cssBody };
}

// ─── Form ───

function generateForm(pascal, kebab, importPath) {
  const jsx = [
    `import React from 'react';`,
    `import '${importPath}';`,
    ``,
    `export default function ${pascal}({ children, onSubmit, title, className = '', ...props }) {`,
    `  const handleSubmit = (e) => {`,
    `    e.preventDefault();`,
    `    if (onSubmit) onSubmit(e);`,
    `  };`,
    ``,
    `  return (`,
    `    <form className={\`${kebab} \${className}\`.trim()} onSubmit={handleSubmit} aria-label={title || 'Form'} noValidate {...props}>`,
    `      {title && <h2 className="${kebab}__title">{title}</h2>}`,
    `      <div className="${kebab}__fields">`,
    `        {children}`,
    `      </div>`,
    `      <div className="${kebab}__actions">`,
    `        <button type="submit" className="${kebab}__submit" aria-label={title ? 'Submit ' + title : 'Submit form'}>Submit</button>`,
    `      </div>`,
    `    </form>`,
    `  );`,
    `}`,
    ``,
  ].join('\n');

  const cssBody = `.${kebab} {
  max-width: 600px;
  padding: var(--spacing-lg, 1.5rem);
  background: white;
  border: 1px solid var(--color-gray-200, #e5e7eb);
  border-radius: var(--radius-lg, 0.75rem);
}

.${kebab}__title {
  margin: 0 0 var(--spacing-lg, 1.5rem);
  font-size: var(--text-xl, 1.25rem);
  font-weight: 600;
  color: var(--color-gray-900, #111827);
}

.${kebab}__fields {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md, 1rem);
}

.${kebab}__actions {
  margin-top: var(--spacing-lg, 1.5rem);
  display: flex;
  gap: var(--spacing-sm, 0.5rem);
  justify-content: flex-end;
}

.${kebab}__submit {
  padding: var(--spacing-sm, 0.5rem) var(--spacing-md, 1rem);
  background: var(--color-primary, #3b82f6);
  color: white;
  border: none;
  border-radius: var(--radius-md, 0.5rem);
  cursor: pointer;
  font-weight: 500;
}

.${kebab}__submit:hover {
  opacity: 0.9;
}`;

  return { jsx, cssBody };
}

// ─── Input ───

function generateInput(pascal, kebab, importPath) {
  const jsx = [
    `import React from 'react';`,
    `import '${importPath}';`,
    ``,
    `export default function ${pascal}({ label, error, type = 'text', id, className = '', ...props }) {`,
    `  const inputId = id || label?.toLowerCase().replace(/\\s+/g, '-');`,
    `  const errorId = inputId + '-error';`,
    `  const classNames = [`,
    `    '${kebab}',`,
    `    error && '${kebab}--error',`,
    `    className,`,
    `  ].filter(Boolean).join(' ');`,
    ``,
    `  return (`,
    `    <div className={classNames}>`,
    `      {label && <label className="${kebab}__label" htmlFor={inputId}>{label}</label>}`,
    `      <input`,
    `        id={inputId}`,
    `        type={type}`,
    `        className="${kebab}__input"`,
    `        aria-invalid={!!error}`,
    `        aria-describedby={error ? errorId : undefined}`,
    `        {...props}`,
    `      />`,
    `      {error && <span id={errorId} className="${kebab}__error" role="alert">{error}</span>}`,
    `    </div>`,
    `  );`,
    `}`,
    ``,
  ].join('\n');

  const cssBody = `.${kebab} {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs, 0.25rem);
}

.${kebab}__label {
  font-size: var(--text-sm, 0.875rem);
  font-weight: 500;
  color: var(--color-gray-700, #374151);
}

.${kebab}__input {
  padding: var(--spacing-sm, 0.5rem) var(--spacing-md, 1rem);
  border: 1px solid var(--color-gray-300, #d1d5db);
  border-radius: var(--radius-md, 0.5rem);
  font-family: var(--font-family-base, system-ui, sans-serif);
  font-size: var(--text-base, 1rem);
  color: var(--color-gray-900, #111827);
  background: white;
  transition: border-color 0.15s;
}

.${kebab}__input:focus {
  outline: none;
  border-color: var(--color-primary, #3b82f6);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.${kebab}--error .${kebab}__input {
  border-color: var(--color-error, #ef4444);
}

.${kebab}__error {
  font-size: var(--text-sm, 0.875rem);
  color: var(--color-error, #ef4444);
}`;

  return { jsx, cssBody };
}

// ─── Modal ───

function generateModal(pascal, kebab, importPath) {
  const jsx = [
    `import React, { useEffect, useRef, useCallback } from 'react';`,
    `import '${importPath}';`,
    ``,
    `export default function ${pascal}({ isOpen, onClose, title, children, actions, className = '' }) {`,
    `  const overlayRef = useRef(null);`,
    `  const modalRef = useRef(null);`,
    `  const previousFocusRef = useRef(null);`,
    `  const titleId = '${kebab}-title';`,
    ``,
    `  useEffect(() => {`,
    `    if (isOpen) {`,
    `      previousFocusRef.current = document.activeElement;`,
    `      document.body.style.overflow = 'hidden';`,
    `      modalRef.current?.focus();`,
    `    } else {`,
    `      document.body.style.overflow = '';`,
    `      previousFocusRef.current?.focus();`,
    `    }`,
    `    return () => { document.body.style.overflow = ''; };`,
    `  }, [isOpen]);`,
    ``,
    `  const handleKeyDown = useCallback((e) => {`,
    `    if (e.key === 'Escape') { onClose(); return; }`,
    `    if (e.key !== 'Tab' || !modalRef.current) return;`,
    `    const focusable = modalRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');`,
    `    const first = focusable[0];`,
    `    const last = focusable[focusable.length - 1];`,
    `    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }`,
    `    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }`,
    `  }, [onClose]);`,
    ``,
    `  if (!isOpen) return null;`,
    ``,
    `  return (`,
    `    <div`,
    `      ref={overlayRef}`,
    `      className="${kebab}__overlay"`,
    `      onClick={e => { if (e.target === overlayRef.current) onClose(); }}`,
    `      onKeyDown={handleKeyDown}`,
    `      role="dialog"`,
    `      aria-modal="true"`,
    `      aria-labelledby={titleId}`,
    `    >`,
    `      <div ref={modalRef} className={\`${kebab} \${className}\`.trim()} tabIndex={-1}>`,
    `        <div className="${kebab}__header">`,
    `          <h2 id={titleId} className="${kebab}__title">{title}</h2>`,
    `          <button className="${kebab}__close" onClick={onClose} aria-label="Close dialog">&times;</button>`,
    `        </div>`,
    `        <div className="${kebab}__content">`,
    `          {children}`,
    `        </div>`,
    `        {actions && (`,
    `          <div className="${kebab}__actions">`,
    `            {actions}`,
    `          </div>`,
    `        )}`,
    `      </div>`,
    `    </div>`,
    `  );`,
    `}`,
    ``,
  ].join('\n');

  const cssBody = `.${kebab}__overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
}

.${kebab} {
  background: white;
  border-radius: var(--radius-lg, 0.75rem);
  box-shadow: 0 20px 48px rgba(0,0,0,0.16);
  max-width: 560px;
  width: 90%;
  max-height: 85vh;
  overflow-y: auto;
}

.${kebab}__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md, 1rem) var(--spacing-lg, 1.5rem);
  border-bottom: 1px solid var(--color-gray-200, #e5e7eb);
}

.${kebab}__title {
  margin: 0;
  font-size: var(--text-lg, 1.125rem);
  font-weight: 600;
}

.${kebab}__close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--color-gray-500, #6b7280);
  padding: 0;
  line-height: 1;
}

.${kebab}__content {
  padding: var(--spacing-lg, 1.5rem);
}

.${kebab}__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm, 0.5rem);
  padding: var(--spacing-md, 1rem) var(--spacing-lg, 1.5rem);
  border-top: 1px solid var(--color-gray-200, #e5e7eb);
}`;

  return { jsx, cssBody };
}

// ─── Nav ───

function generateNav(pascal, kebab, importPath) {
  const jsx = [
    `import React, { useState } from 'react';`,
    `import '${importPath}';`,
    ``,
    `export default function ${pascal}({ brand, items = [], className = '' }) {`,
    `  const [menuOpen, setMenuOpen] = useState(false);`,
    `  const menuClasses = [`,
    `    '${kebab}__menu',`,
    `    menuOpen && '${kebab}__menu--open',`,
    `  ].filter(Boolean).join(' ');`,
    ``,
    `  return (`,
    `    <nav className={\`${kebab} \${className}\`.trim()} role="navigation" aria-label="Main navigation">`,
    `      <div className="${kebab}__inner">`,
    `        <div className="${kebab}__brand">{brand || 'App'}</div>`,
    `        <button`,
    `          className="${kebab}__toggle"`,
    `          onClick={() => setMenuOpen(!menuOpen)}`,
    `          aria-expanded={menuOpen}`,
    `          aria-controls="${kebab}-menu"`,
    `          aria-label="Toggle navigation menu"`,
    `        >`,
    `          <span className="${kebab}__bar" />`,
    `          <span className="${kebab}__bar" />`,
    `          <span className="${kebab}__bar" />`,
    `        </button>`,
    `        <ul id="${kebab}-menu" className={menuClasses} role="menubar">`,
    `          {items.map((item, i) => (`,
    `            <li key={i} className="${kebab}__item" role="none">`,
    `              <a href={item.href || '#'} className="${kebab}__link" role="menuitem">{item.label}</a>`,
    `            </li>`,
    `          ))}`,
    `        </ul>`,
    `      </div>`,
    `    </nav>`,
    `  );`,
    `}`,
    ``,
  ].join('\n');

  const cssBody = `.${kebab} {
  background: white;
  border-bottom: 1px solid var(--color-gray-200, #e5e7eb);
}

.${kebab}__inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-lg, 1.5rem);
  height: 56px;
}

.${kebab}__brand {
  font-size: var(--text-lg, 1.125rem);
  font-weight: 700;
  color: var(--color-gray-900, #111827);
}

.${kebab}__menu {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: var(--spacing-md, 1rem);
}

.${kebab}__link {
  color: var(--color-gray-600, #4b5563);
  text-decoration: none;
  font-size: var(--text-sm, 0.875rem);
  font-weight: 500;
  transition: color 0.15s;
}

.${kebab}__link:hover {
  color: var(--color-primary, #3b82f6);
}

.${kebab}__toggle {
  display: none;
  flex-direction: column;
  gap: 4px;
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--spacing-xs, 0.25rem);
}

.${kebab}__bar {
  width: 20px;
  height: 2px;
  background: var(--color-gray-700, #374151);
}

@media (max-width: 768px) {
  .${kebab}__toggle { display: flex; }
  .${kebab}__menu {
    display: none;
    position: absolute;
    top: 56px;
    left: 0;
    right: 0;
    background: white;
    flex-direction: column;
    padding: var(--spacing-md, 1rem);
    border-bottom: 1px solid var(--color-gray-200, #e5e7eb);
    box-shadow: 0 8px 24px rgba(0,0,0,.10);
  }
  .${kebab}__menu--open { display: flex; }
}`;

  return { jsx, cssBody };
}

// ─── Table ───

function generateTable(pascal, kebab, importPath) {
  const jsx = [
    `import React from 'react';`,
    `import '${importPath}';`,
    ``,
    `export default function ${pascal}({ caption, headers = [], rows = [], className = '' }) {`,
    `  return (`,
    `    <div className={\`${kebab}__wrapper \${className}\`.trim()}>`,
    `      <table className="${kebab}">`,
    `        {caption && <caption className="${kebab}__caption">{caption}</caption>}`,
    `        <thead>`,
    `          <tr>`,
    `            {headers.map((h, i) => (`,
    `              <th key={i} scope="col" className="${kebab}__th">{h}</th>`,
    `            ))}`,
    `          </tr>`,
    `        </thead>`,
    `        <tbody>`,
    `          {rows.map((row, ri) => (`,
    `            <tr key={ri} className="${kebab}__tr">`,
    `              {row.map((cell, ci) => (`,
    `                <td key={ci} className="${kebab}__td">{cell}</td>`,
    `              ))}`,
    `            </tr>`,
    `          ))}`,
    `          {rows.length === 0 && (`,
    `            <tr>`,
    `              <td colSpan={headers.length} className="${kebab}__empty">No data available</td>`,
    `            </tr>`,
    `          )}`,
    `        </tbody>`,
    `      </table>`,
    `    </div>`,
    `  );`,
    `}`,
    ``,
  ].join('\n');

  const cssBody = `.${kebab}__wrapper {
  overflow-x: auto;
  border: 1px solid var(--color-gray-200, #e5e7eb);
  border-radius: var(--radius-lg, 0.75rem);
}

.${kebab} {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm, 0.875rem);
}

.${kebab}__caption {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.${kebab}__th {
  padding: var(--spacing-sm, 0.5rem) var(--spacing-md, 1rem);
  text-align: left;
  background: var(--color-gray-50, #f9fafb);
  border-bottom: 1px solid var(--color-gray-200, #e5e7eb);
  font-weight: 600;
  color: var(--color-gray-700, #374151);
}

.${kebab}__tr:hover {
  background: var(--color-gray-50, #f9fafb);
}

.${kebab}__td {
  padding: var(--spacing-sm, 0.5rem) var(--spacing-md, 1rem);
  border-bottom: 1px solid var(--color-gray-100, #f3f4f6);
  color: var(--color-gray-800, #1f2937);
}

.${kebab}__empty {
  padding: var(--spacing-xl, 2rem);
  text-align: center;
  color: var(--color-gray-400, #9ca3af);
}`;

  return { jsx, cssBody };
}

// ─── List ───

function generateList(pascal, kebab, importPath) {
  const jsx = [
    `import React from 'react';`,
    `import '${importPath}';`,
    ``,
    `export default function ${pascal}({ items = [], ordered = false, className = '', renderItem, label }) {`,
    `  const Tag = ordered ? 'ol' : 'ul';`,
    `  return (`,
    `    <Tag className={\`${kebab} \${className}\`.trim()} aria-label={label || undefined}>`,
    `      {items.map((item, i) => (`,
    `        <li key={i} className="${kebab}__item">`,
    `          {renderItem ? renderItem(item, i) : item}`,
    `        </li>`,
    `      ))}`,
    `    </Tag>`,
    `  );`,
    `}`,
    ``,
  ].join('\n');

  const cssBody = `.${kebab} {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs, 0.25rem);
}

.${kebab}__item {
  padding: var(--spacing-sm, 0.5rem) var(--spacing-md, 1rem);
  border-bottom: 1px solid var(--color-gray-100, #f3f4f6);
  font-size: var(--text-sm, 0.875rem);
  color: var(--color-gray-800, #1f2937);
  transition: background 0.1s;
}

.${kebab}__item:hover {
  background: var(--color-gray-50, #f9fafb);
}

.${kebab}__item:last-child {
  border-bottom: none;
}`;

  return { jsx, cssBody };
}

// ─── Helpers ───

function toPascalCase(str) {
  return str
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

function toKebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

module.exports = { generateReactComponent };
