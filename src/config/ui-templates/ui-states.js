/**
 * UI State Templates
 * Reusable loading, empty, error, permission, offline, success state components
 */

const { tokensToCSS } = require('./css-tokens');

function kebabCase(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').toLowerCase();
}

function pascalCase(str) {
  return str.split(/[-_\s]+/).filter(Boolean).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join('');
}

const UI_STATES = {
  loading: generateLoadingState,
  empty: generateEmptyState,
  error: generateErrorState,
  permission: generatePermissionState,
  offline: generateOfflineState,
  success: generateSuccessState,
};

function generateUIState(stateType, name, options, tokens) {
  const gen = UI_STATES[stateType];
  if (!gen) return null;
  return gen(name, options, tokens);
}

function _generateStateReact(pascal, kb, iconSvg, title, description, actionLabel, actionFn, extraJSX, tokens) {
  const primaryColor = (tokens && tokens.colors && tokens.colors.primary) || '#3B82F6';

  const jsx = `import React from 'react';
import './${kb}.css';

export default function ${pascal}({ title, description, actionLabel, onAction }) {
  return (
    <div className="${kb}" role="status">
      <div className="${kb}-icon" aria-hidden="true">${iconSvg}</div>
      <h2 className="${kb}-title">{title || '${title}'}</h2>
      <p className="${kb}-desc">{description || '${description}'}</p>
      ${extraJSX}
      {actionLabel && (
        <button className="${kb}-action" onClick={onAction} type="button">
          {actionLabel || '${actionLabel}'}
        </button>
      )}
    </div>
  );
}
`;

  const css = `${tokensToCSS(tokens)}

.${kb} {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 3rem 2rem;
  min-height: 200px;
  font-family: var(--font-family-base, system-ui, sans-serif);
}

.${kb}-icon {
  width: 64px;
  height: 64px;
  margin-bottom: 1rem;
  color: var(--color-gray-400, #9ca3af);
}

.${kb}-title {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--color-gray-900, #111827);
  margin: 0 0 0.5rem;
}

.${kb}-desc {
  font-size: 0.9rem;
  color: var(--color-gray-500, #6b7280);
  max-width: 400px;
  margin: 0 0 1.25rem;
  line-height: 1.5;
}

.${kb}-action {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1.25rem;
  background: ${primaryColor};
  color: white;
  border: none;
  border-radius: var(--radius-md, 0.5rem);
  font-weight: 500;
  font-size: 0.9rem;
  cursor: pointer;
  transition: opacity 0.15s;
}
.${kb}-action:hover { opacity: 0.9; }
`;

  return { jsx, css, cssFileName: `${kb}.css` };
}

function _spinnerSVG() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" strokeDasharray="31.4 31.4" strokeDashoffset="10"><animateTransform attributeName="transform" type="rotate" values="0 12 12;360 12 12" dur="1s" repeatCount="indefinite" /></circle></svg>`;
}

function _emptyBoxSVG() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>`;
}

function _errorSVG() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>`;
}

function _lockSVG() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>`;
}

function _offlineSVG() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23" /><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" /><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" /><path d="M10.71 5.05A16 16 0 0 1 22.56 9" /><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" /></svg>`;
}

function _successSVG() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>`;
}

function generateLoadingState(name, options, tokens) {
  const pascal = pascalCase(name) + 'Loading';
  const kb = kebabCase(name) + '-loading';
  const skeletonRows = options && options.skeletonRows ? options.skeletonRows : 3;

  let extraJSX = '      <div className="' + kb + '-skeleton" aria-hidden="true">\n';
  for (let i = 0; i < skeletonRows; i++) {
    extraJSX += `        <div className="${kb}-skeleton-line" style={{ width: '${80 - i * 15}%'` + '} />\n';
  }
  extraJSX += '      </div>';

  const primaryColor = (tokens && tokens.colors && tokens.colors.primary) || '#3B82F6';

  const jsx = `import React from 'react';
import './${kb}.css';

export default function ${pascal}({ message }) {
  return (
    <div className="${kb}" role="status" aria-live="polite">
      <div className="${kb}-spinner" aria-hidden="true">${_spinnerSVG()}</div>
      <p className="${kb}-message">{message || 'Loading...'}</p>
      <span className="${kb}-sr-only">Loading</span>
${extraJSX}
    </div>
  );
}
`;

  const css = `${tokensToCSS(tokens)}

.${kb} {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  min-height: 200px;
  font-family: var(--font-family-base, system-ui, sans-serif);
}

.${kb}-spinner {
  width: 40px;
  height: 40px;
  color: ${primaryColor};
  animation: ${kb}-spin 1s linear infinite;
}

@keyframes ${kb}-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.${kb}-message {
  margin-top: 1rem;
  color: var(--color-gray-500, #6b7280);
  font-size: 0.9rem;
}

.${kb}-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.${kb}-skeleton {
  margin-top: 1.25rem;
  width: 100%;
  max-width: 320px;
}

.${kb}-skeleton-line {
  height: 12px;
  background: linear-gradient(90deg, var(--color-gray-200, #e5e7eb) 25%, var(--color-gray-100, #f3f4f6) 50%, var(--color-gray-200, #e5e7eb) 75%);
  background-size: 200% 100%;
  animation: ${kb}-shimmer 1.5s infinite;
  border-radius: var(--radius-md, 0.375rem);
  margin-bottom: 0.5rem;
}

@keyframes ${kb}-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}`;

  return { jsx, css, cssFileName: `${kb}.css` };
}

function generateEmptyState(name, options, tokens) {
  return _generateStateReact(
    pascalCase(name) + 'Empty', kebabCase(name) + '-empty',
    _emptyBoxSVG(), 'Nothing here yet', 'No items to display. Try creating your first one.',
    'Create New', null, '', tokens
  );
}

function generateErrorState(name, options, tokens) {
  const kb = kebabCase(name) + '-error';
  const pascal = pascalCase(name) + 'Error';
  const primaryColor = (tokens && tokens.colors && tokens.colors.primary) || '#3B82F6';

  const jsx = `import React from 'react';
import './${kb}.css';

export default function ${pascal}({ title, message, onRetry }) {
  return (
    <div className="${kb}" role="alert">
      <div className="${kb}-icon" aria-hidden="true">${_errorSVG()}</div>
      <h2 className="${kb}-title">{title || 'Something went wrong'}</h2>
      <p className="${kb}-desc">{message || 'An unexpected error occurred. Please try again.'}</p>
      {onRetry && (
        <button className="${kb}-action" onClick={onRetry} type="button">Try Again</button>
      )}
    </div>
  );
}
`;

  const css = `${tokensToCSS(tokens)}

.${kb} {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 3rem 2rem;
  min-height: 200px;
  font-family: var(--font-family-base, system-ui, sans-serif);
}

.${kb}-icon {
  width: 64px;
  height: 64px;
  margin-bottom: 1rem;
  color: var(--color-error, #ef4444);
}

.${kb}-title {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--color-gray-900, #111827);
  margin: 0 0 0.5rem;
}

.${kb}-desc {
  font-size: 0.9rem;
  color: var(--color-gray-500, #6b7280);
  max-width: 400px;
  margin: 0 0 1.25rem;
  line-height: 1.5;
}

.${kb}-action {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1.25rem;
  background: ${primaryColor};
  color: white;
  border: none;
  border-radius: var(--radius-md, 0.5rem);
  font-weight: 500;
  font-size: 0.9rem;
  cursor: pointer;
  transition: opacity 0.15s;
}
.${kb}-action:hover { opacity: 0.9; }`;

  return { jsx, css, cssFileName: `${kb}.css` };
}

function generatePermissionState(name, options, tokens) {
  return _generateStateReact(
    pascalCase(name) + 'Permission', kebabCase(name) + '-permission',
    _lockSVG(), 'Access Denied', 'You do not have permission to view this resource.',
    'Request Access', null, '', tokens
  );
}

function generateOfflineState(name, options, tokens) {
  return _generateStateReact(
    pascalCase(name) + 'Offline', kebabCase(name) + '-offline',
    _offlineSVG(), 'You are offline', 'Check your internet connection and try again.',
    'Retry', null, '', tokens
  );
}

function generateSuccessState(name, options, tokens) {
  const kb = kebabCase(name) + '-success';
  const pascal = pascalCase(name) + 'Success';
  const successColor = (tokens && tokens.colors && tokens.colors.success) || '#10B981';

  const jsx = `import React from 'react';
import './${kb}.css';

export default function ${pascal}({ title, message, actionLabel, onAction }) {
  return (
    <div className="${kb}" role="status">
      <div className="${kb}-icon" aria-hidden="true">${_successSVG()}</div>
      <h2 className="${kb}-title">{title || 'Success!'}</h2>
      <p className="${kb}-desc">{message || 'Your action was completed successfully.'}</p>
      {actionLabel && onAction && (
        <button className="${kb}-action" onClick={onAction} type="button">{actionLabel}</button>
      )}
    </div>
  );
}
`;

  const css = `${tokensToCSS(tokens)}

.${kb} {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 3rem 2rem;
  min-height: 200px;
  font-family: var(--font-family-base, system-ui, sans-serif);
}

.${kb}-icon {
  width: 64px;
  height: 64px;
  margin-bottom: 1rem;
  color: ${successColor};
}

.${kb}-title {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--color-gray-900, #111827);
  margin: 0 0 0.5rem;
}

.${kb}-desc {
  font-size: 0.9rem;
  color: var(--color-gray-500, #6b7280);
  max-width: 400px;
  margin: 0 0 1.25rem;
  line-height: 1.5;
}

.${kb}-action {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1.25rem;
  background: ${successColor};
  color: white;
  border: none;
  border-radius: var(--radius-md, 0.5rem);
  font-weight: 500;
  font-size: 0.9rem;
  cursor: pointer;
  transition: opacity 0.15s;
}
.${kb}-action:hover { opacity: 0.9; }`;

  return { jsx, css, cssFileName: `${kb}.css` };
}

module.exports = { generateUIState, UI_STATES };
