/**
 * Tailwind Templates
 * Generates components using real Tailwind CSS utility classes
 */

function pascalCase(str) {
  return str.split(/[-_\s]+/).filter(Boolean).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join('');
}

function kebabCase(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').toLowerCase();
}

const generators = {
  button(name) {
    const pascal = pascalCase(name);
    const jsx = `import React from 'react';

export default function ${pascal}({ children, variant = 'primary', size = 'md', disabled = false, loading = false, onClick, ...props }) {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200 focus:ring-gray-400',
    outline: 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs sm:text-sm',
    md: 'px-4 py-2 text-sm sm:text-base',
    lg: 'px-5 py-2.5 sm:px-6 sm:py-3 text-base',
  };

  return (
    <button
      className={\`\${base} \${variants[variant] || variants.primary} \${sizes[size] || sizes.md}\`}
      disabled={disabled || loading}
      onClick={onClick}
      aria-busy={loading}
      aria-disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
`;
    return { jsx };
  },

  card(name) {
    const pascal = pascalCase(name);
    const jsx = `import React from 'react';

export default function ${pascal}({ title, children, footer, className = '', ...props }) {
  return (
    <div className={\`bg-white border border-gray-200 rounded-xl overflow-hidden \${className}\`} role="region" aria-label={title || 'Card'} {...props}>
      {title && (
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">{title}</h3>
        </div>
      )}
      <div className="px-4 py-3 sm:px-6 sm:py-4">{children}</div>
      {footer && (
        <div className="px-4 py-2 sm:px-6 sm:py-3 bg-gray-50 border-t border-gray-200">{footer}</div>
      )}
    </div>
  );
}
`;
    return { jsx };
  },

  form(name) {
    const pascal = pascalCase(name);
    const jsx = `import React from 'react';

export default function ${pascal}({ children, onSubmit, title, className = '', ...props }) {
  return (
    <form
      className={\`w-full sm:max-w-lg bg-white border border-gray-200 rounded-xl p-4 sm:p-6 space-y-4 \${className}\`}
      onSubmit={e => { e.preventDefault(); onSubmit && onSubmit(e); }}
      aria-label={title || 'Form'}
      noValidate
      {...props}
    >
      {title && <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">{title}</h2>}
      <div className="space-y-4">{children}</div>
      <div className="flex flex-col sm:flex-row gap-3 justify-end pt-2">
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">Submit</button>
      </div>
    </form>
  );
}
`;
    return { jsx };
  },

  input(name) {
    const pascal = pascalCase(name);
    const jsx = `import React from 'react';

export default function ${pascal}({ label, error, type = 'text', id, className = '', ...props }) {
  const inputId = id || (label ? label.toLowerCase().replace(/\\s+/g, '-') : undefined);
  return (
    <div className={\`flex flex-col gap-1 \${error ? '' : ''} \${className}\`}>
      {label && (
        <label htmlFor={inputId} className="text-xs sm:text-sm font-medium text-gray-700">{label}</label>
      )}
      <input
        id={inputId}
        type={type}
        className={\`w-full px-3 py-1.5 sm:py-2 border rounded-lg text-sm text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 \${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}\`}
        aria-invalid={!!error}
        aria-describedby={error ? inputId + '-error' : undefined}
        {...props}
      />
      {error && (
        <span id={inputId + '-error'} className="text-sm text-red-600" role="alert">{error}</span>
      )}
    </div>
  );
}
`;
    return { jsx };
  },

  modal(name) {
    const pascal = pascalCase(name);
    const jsx = `import React, { useEffect, useRef, useCallback } from 'react';

export default function ${pascal}({ isOpen, onClose, title, children, actions }) {
  const overlayRef = useRef(null);
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      document.body.style.overflow = 'hidden';
      modalRef.current?.focus();
    } else {
      document.body.style.overflow = '';
      previousFocusRef.current?.focus();
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key !== 'Tab' || !modalRef.current) return;

    const focusable = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6"
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="${kebabCase(name)}-modal-title"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="bg-white rounded-xl shadow-2xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto focus:outline-none"
      >
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200">
          <h2 id="${kebabCase(name)}-modal-title" className="text-base sm:text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            aria-label="Close dialog"
          >
            &times;
          </button>
        </div>
        <div className="px-4 py-3 sm:px-6 sm:py-4">{children}</div>
        {actions && (
          <div className="flex justify-end gap-3 px-4 py-3 sm:px-6 border-t border-gray-200">{actions}</div>
        )}
      </div>
    </div>
  );
}
`;
    return { jsx };
  },

  nav(name) {
    const pascal = pascalCase(name);
    const jsx = `import React, { useState } from 'react';

export default function ${pascal}({ brand = 'App', items = [] }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-gray-200" role="navigation" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-14 px-6">
        <div className="text-lg font-bold text-gray-900">{brand}</div>
        <button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-expanded={menuOpen}
          aria-controls="${kebabCase(name)}-menu"
          aria-label="Toggle navigation menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            {menuOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            }
          </svg>
        </button>
        <ul
          id="${kebabCase(name)}-menu"
          className={\`flex gap-1 list-none m-0 p-0 \${menuOpen ? 'flex-col absolute top-14 left-0 right-0 bg-white border-b border-gray-200 p-4 shadow-lg z-40' : 'hidden md:flex'}\`}
          role="menubar"
        >
          {items.map((item, i) => (
            <li key={i} role="none">
              <a
                href={item.href || '#'}
                className="block px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                role="menuitem"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
`;
    return { jsx };
  },

  table(name) {
    const pascal = pascalCase(name);
    const jsx = `import React from 'react';

export default function ${pascal}({ caption, headers = [], rows = [] }) {
  return (
    <div className="overflow-x-auto border border-gray-200 rounded-xl -mx-4 sm:mx-0">
      <table className="w-full text-sm min-w-[500px] sm:min-w-0">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} scope="col" className="px-3 py-2 sm:px-4 sm:py-3 text-left font-semibold text-gray-700 bg-gray-50 border-b border-gray-200">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 sm:px-4 sm:py-3 text-gray-800">{cell}</td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={headers.length} className="px-4 py-6 sm:py-8 text-center text-gray-400">No data available</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
`;
    return { jsx };
  },

  list(name) {
    const pascal = pascalCase(name);
    const jsx = `import React from 'react';

export default function ${pascal}({ items = [], ordered = false, renderItem, label }) {
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <Tag className={\`list-none m-0 p-0 flex flex-col gap-0.5 \${ordered ? 'list-decimal pl-5' : ''}\`} aria-label={label || undefined}>
      {items.map((item, i) => (
        <li key={i} className="px-3 py-2 sm:py-2.5 border-b border-gray-100 text-sm text-gray-800 hover:bg-gray-50 transition-colors last:border-b-0">
          {renderItem ? renderItem(item, i) : item}
        </li>
      ))}
      {items.length === 0 && (
        <li className="px-3 py-4 sm:py-6 text-center text-sm text-gray-400">No items</li>
      )}
    </Tag>
  );
}
`;
    return { jsx };
  },
};

function generateTailwindComponent(name, options = {}) {
  const type = options.type || 'button';
  const gen = generators[type] || generators.button;
  return gen(name);
}

function generateTailwindPage(name, options = {}) {
  const pascal = pascalCase(name);
  const layout = options.layout || 'centered';
  const sections = options.sections || [];

  const sectionBlocks = sections.length > 0
    ? sections.map(sec => {
        const secPascal = pascalCase(sec);
        return `      <section className="mb-6 p-6 bg-white border border-gray-200 rounded-xl" aria-label="${secPascal}">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">${secPascal}</h2>
        <p className="text-gray-600">${secPascal} content</p>
      </section>`;
      }).join('\n')
    : `      <section className="mb-6 p-6 bg-white border border-gray-200 rounded-xl">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome</h2>
        <p className="text-gray-600">Content goes here</p>
      </section>`;

  const mainClasses = layout === 'sidebar'
    ? 'grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4 p-6'
    : layout === 'full'
    ? 'p-6 w-full'
    : 'max-w-5xl mx-auto p-6 w-full';

  const jsx = `import React from 'react';

export default function ${pascal}() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans text-gray-800">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">${pascal}</h1>
      </header>
      <main className="${mainClasses} flex-1">
${sectionBlocks}
      </main>
      <footer className="border-t border-gray-200 px-6 py-4 text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} ${pascal}
      </footer>
    </div>
  );
}
`;

  return { jsx, css: '', cssFileName: null };
}

module.exports = { generateTailwindComponent, generateTailwindPage, generators };
