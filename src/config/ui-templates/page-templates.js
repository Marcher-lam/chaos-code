/**
 * Rich Page Templates
 * Production-grade page layouts: landing, dashboard, auth, settings, pricing
 */

const { tokensToCSS } = require('./css-tokens');

function pascalCase(str) {
  return str.split(/[-_\s]+/).filter(Boolean).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join('');
}

function kebabCase(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').toLowerCase();
}

const PAGE_TYPES = {
  landing: generateLandingPage,
  dashboard: generateDashboardPage,
  auth: generateAuthPage,
  settings: generateSettingsPage,
  pricing: generatePricingPage,
};

function generatePageByType(pageType, name, options, tokens) {
  const gen = PAGE_TYPES[pageType];
  if (!gen) return null;
  return gen(name, options, tokens);
}

function generateLandingPage(name, options, tokens) {
  const pascal = pascalCase(name);
  const t = tokens || {};
  const primaryColor = (t.colors && t.colors.primary) || '#3B82F6';
  const fontBase = (t.fonts && t.fonts.familyBase) || 'Inter, system-ui, sans-serif';

  const css = `${tokensToCSS(tokens)}

.${kebabCase(name)}-landing {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: var(--font-family-base, ${fontBase});
  color: var(--color-gray-800, #1f2937);
  background: white;
}

.${kebabCase(name)}-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 6rem 2rem 4rem;
  background: linear-gradient(135deg, ${primaryColor}08 0%, ${primaryColor}15 100%);
}

.${kebabCase(name)}-hero h1 {
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 800;
  line-height: 1.15;
  color: var(--color-gray-900, #111827);
  max-width: 700px;
  margin: 0 auto 1rem;
  letter-spacing: -0.025em;
}

.${kebabCase(name)}-hero p {
  font-size: 1.2rem;
  color: var(--color-gray-600, #4b5563);
  max-width: 560px;
  margin: 0 auto 2rem;
  line-height: 1.6;
}

.${kebabCase(name)}-hero-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: center;
}

.${kebabCase(name)}-btn-primary {
  display: inline-flex;
  align-items: center;
  padding: 0.75rem 1.75rem;
  background: var(--color-primary, ${primaryColor});
  color: white;
  border: none;
  border-radius: var(--radius-md, 0.5rem);
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: opacity 0.15s;
}
.${kebabCase(name)}-btn-primary:hover { opacity: 0.9; }

.${kebabCase(name)}-btn-secondary {
  display: inline-flex;
  align-items: center;
  padding: 0.75rem 1.75rem;
  background: white;
  color: var(--color-gray-700, #374151);
  border: 1px solid var(--color-gray-300, #d1d5db);
  border-radius: var(--radius-md, 0.5rem);
  font-weight: 500;
  font-size: 1rem;
  cursor: pointer;
  transition: border-color 0.15s;
}
.${kebabCase(name)}-btn-secondary:hover { border-color: var(--color-gray-500, #6b7280); }

.${kebabCase(name)}-features {
  padding: 5rem 2rem;
  background: var(--color-gray-50, #f9fafb);
}

.${kebabCase(name)}-features-inner {
  max-width: 1100px;
  margin: 0 auto;
}

.${kebabCase(name)}-features h2 {
  text-align: center;
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 1rem;
  color: var(--color-gray-900, #111827);
}

.${kebabCase(name)}-features-subtitle {
  text-align: center;
  color: var(--color-gray-500, #6b7280);
  margin: 0 0 3rem;
  font-size: 1.1rem;
}

.${kebabCase(name)}-features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
}

.${kebabCase(name)}-feature-card {
  background: white;
  border: 1px solid var(--color-gray-200, #e5e7eb);
  border-radius: var(--radius-lg, 0.75rem);
  padding: 1.75rem;
}

.${kebabCase(name)}-feature-card h3 {
  font-size: 1.15rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
  color: var(--color-gray-900, #111827);
}

.${kebabCase(name)}-feature-card p {
  color: var(--color-gray-600, #4b5563);
  line-height: 1.6;
  margin: 0;
}

.${kebabCase(name)}-cta {
  text-align: center;
  padding: 5rem 2rem;
}

.${kebabCase(name)}-cta h2 {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 1rem;
  color: var(--color-gray-900, #111827);
}

.${kebabCase(name)}-cta p {
  color: var(--color-gray-500, #6b7280);
  margin: 0 0 2rem;
  font-size: 1.1rem;
}

.${kebabCase(name)}-footer {
  border-top: 1px solid var(--color-gray-200, #e5e7eb);
  padding: 2rem;
  text-align: center;
  color: var(--color-gray-500, #6b7280);
  font-size: 0.85rem;
}

@media (max-width: 768px) {
  .${kebabCase(name)}-hero { padding: 4rem 1.5rem 3rem; }
  .${kebabCase(name)}-features { padding: 3rem 1.5rem; }
  .${kebabCase(name)}-cta { padding: 3rem 1.5rem; }
}`;

  const jsx = `import React from 'react';
import './${kebabCase(name)}.css';

export default function ${pascal}() {
  return (
    <div className="${kebabCase(name)}-landing">
      <section className="${kebabCase(name)}-hero" aria-label="Hero">
        <h1>{/* Your headline here */}</h1>
        <p>{/* Your subtitle here */}</p>
        <div className="${kebabCase(name)}-hero-actions">
          <button className="${kebabCase(name)}-btn-primary">Get Started</button>
          <button className="${kebabCase(name)}-btn-secondary">Learn More</button>
        </div>
      </section>

      <section className="${kebabCase(name)}-features" aria-label="Features">
        <div className="${kebabCase(name)}-features-inner">
          <h2>Features</h2>
          <p className="${kebabCase(name)}-features-subtitle">{/* Subtitle */}</p>
          <div className="${kebabCase(name)}-features-grid">
            {[].map((feature, i) => (
              <div key={i} className="${kebabCase(name)}-feature-card">
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="${kebabCase(name)}-cta" aria-label="Call to action">
        <h2>Ready to get started?</h2>
        <p>Join thousands who are already using ${pascal}.</p>
        <button className="${kebabCase(name)}-btn-primary">Start Free Trial</button>
      </section>

      <footer className="${kebabCase(name)}-footer">
        <p>&copy; {new Date().getFullYear()} ${pascal}. All rights reserved.</p>
      </footer>
    </div>
  );
}
`;

  return { jsx, css, cssFileName: `${kebabCase(name)}.css` };
}

function generateDashboardPage(name, options, tokens) {
  const pascal = pascalCase(name);
  const kb = kebabCase(name);

  const css = `${tokensToCSS(tokens)}

.${kb}-dashboard {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-rows: 56px 1fr;
  font-family: var(--font-family-base, system-ui, sans-serif);
  background: var(--color-gray-50, #f9fafb);
  color: var(--color-gray-800, #1f2937);
}

.${kb}-topbar {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  background: white;
  border-bottom: 1px solid var(--color-gray-200, #e5e7eb);
}

.${kb}-topbar h1 {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
}

.${kb}-sidebar {
  padding: 1rem 0;
  border-right: 1px solid var(--color-gray-200, #e5e7eb);
  background: white;
  overflow-y: auto;
}

.${kb}-nav-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  color: var(--color-gray-600, #4b5563);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: var(--radius-md, 0.375rem);
  margin: 0.125rem 0.5rem;
  transition: background 0.15s, color 0.15s;
  cursor: pointer;
  border: none;
  background: none;
  width: calc(100% - 1rem);
  text-align: left;
}

.${kb}-nav-item:hover {
  background: var(--color-gray-100, #f3f4f6);
  color: var(--color-gray-900, #111827);
}

.${kb}-nav-item[aria-current="page"] {
  background: var(--color-primary, #3b82f6);
  color: white;
}

.${kb}-main {
  padding: 1.5rem;
  overflow-y: auto;
}

.${kb}-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.${kb}-stat-card {
  background: white;
  border: 1px solid var(--color-gray-200, #e5e7eb);
  border-radius: var(--radius-lg, 0.75rem);
  padding: 1.25rem;
}

.${kb}-stat-card h3 {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-gray-500, #6b7280);
  margin: 0 0 0.5rem;
}

.${kb}-stat-card .value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-gray-900, #111827);
}

.${kb}-content-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1rem;
}

.${kb}-panel {
  background: white;
  border: 1px solid var(--color-gray-200, #e5e7eb);
  border-radius: var(--radius-lg, 0.75rem);
  padding: 1.25rem;
}

.${kb}-panel h2 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 1rem;
}

@media (max-width: 768px) {
  .${kb}-dashboard {
    grid-template-columns: 1fr;
  }
  .${kb}-sidebar { display: none; }
  .${kb}-content-grid { grid-template-columns: 1fr; }
}`;

  const jsx = `import React, { useState } from 'react';
import './${kb}.css';

export default function ${pascal}() {
  const [activeNav, setActiveNav] = useState('overview');
  const navItems = ['overview', 'analytics', 'reports', 'settings'];

  return (
    <div className="${kb}-dashboard">
      <header className="${kb}-topbar">
        <h1>${pascal}</h1>
        <nav aria-label="User menu">
          <button className="${kb}-nav-item" aria-label="User profile">{/* Avatar */}</button>
        </nav>
      </header>

      <aside className="${kb}-sidebar" aria-label="Sidebar navigation">
        <nav aria-label="Main navigation" role="navigation">
          {navItems.map(item => (
            <button
              key={item}
              className="${kb}-nav-item"
              aria-current={activeNav === item ? 'page' : undefined}
              onClick={() => setActiveNav(item)}
            >
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </button>
          ))}
        </nav>
      </aside>

      <main className="${kb}-main">
        <div className="${kb}-stats-grid">
          {[
            { label: 'Total Users', value: '12,345' },
            { label: 'Revenue', value: '$48.2K' },
            { label: 'Active Now', value: '573' },
            { label: 'Growth', value: '+12.5%' },
          ].map(stat => (
            <div key={stat.label} className="${kb}-stat-card">
              <h3>{stat.label}</h3>
              <div className="value">{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="${kb}-content-grid">
          <div className="${kb}-panel">
            <h2>Recent Activity</h2>
            {/* Activity list or chart placeholder */}
          </div>
          <div className="${kb}-panel">
            <h2>Quick Actions</h2>
            {/* Quick actions placeholder */}
          </div>
        </div>
      </main>
    </div>
  );
}
`;

  return { jsx, css, cssFileName: `${kb}.css` };
}

function generateAuthPage(name, options, tokens) {
  const pascal = pascalCase(name);
  const kb = kebabCase(name);
  const primaryColor = (tokens && tokens.colors && tokens.colors.primary) || '#3B82F6';

  const authVariant = options.authVariant || 'login';
  const isLogin = authVariant === 'login';
  const isRegister = authVariant === 'register';
  const isForgot = authVariant === 'forgot';

  const formTitle = isLogin ? 'Sign In' : isRegister ? 'Create Account' : 'Reset Password';
  const formSubtitle = isLogin
    ? 'Welcome back! Please enter your credentials.'
    : isRegister
    ? 'Create your account to get started.'
    : 'Enter your email to receive a reset link.';
  const submitLabel = isLogin ? 'Sign In' : isRegister ? 'Create Account' : 'Send Reset Link';

  const nameField = isRegister
    ? `          <div className="${kb}-field">
            <label htmlFor="name" className="${kb}-label">Full Name</label>
            <input id="name" type="text" className="${kb}-input" placeholder="John Doe" required autoComplete="name" />
          </div>\n`
    : '';
  const passwordField = !isForgot
    ? `          <div className="${kb}-field">
            <label htmlFor="password" className="${kb}-label">Password</label>
            <input id="password" type="password" className="${kb}-input" placeholder="••••••••" required autoComplete="${isLogin ? 'current-password' : 'new-password'}" />
          </div>\n`
    : '';
  const extras = isLogin
    ? `          <div className="${kb}-row">
            <label className="${kb}-checkbox-label">
              <input type="checkbox" /> Remember me
            </label>
            <a href="#" className="${kb}-link">Forgot password?</a>
          </div>\n`
    : isRegister
    ? `          <label className="${kb}-checkbox-label">
              <input type="checkbox" required /> I agree to the Terms of Service and Privacy Policy
            </label>\n`
    : '';

  const css = `${tokensToCSS(tokens)}

.${kb}-auth {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-gray-50, #f9fafb);
  font-family: var(--font-family-base, system-ui, sans-serif);
  padding: 1.5rem;
}

.${kb}-card {
  width: 100%;
  max-width: 420px;
  background: white;
  border: 1px solid var(--color-gray-200, #e5e7eb);
  border-radius: var(--radius-xl, 1rem);
  padding: 2.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06);
}

.${kb}-card h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.25rem;
  color: var(--color-gray-900, #111827);
}

.${kb}-subtitle {
  color: var(--color-gray-500, #6b7280);
  font-size: 0.9rem;
  margin: 0 0 1.75rem;
}

.${kb}-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.${kb}-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.${kb}-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-gray-700, #374151);
}

.${kb}-input {
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--color-gray-300, #d1d5db);
  border-radius: var(--radius-md, 0.5rem);
  font-size: 0.9rem;
  color: var(--color-gray-900, #111827);
  transition: border-color 0.15s, box-shadow 0.15s;
  background: white;
}

.${kb}-input:focus {
  outline: none;
  border-color: ${primaryColor};
  box-shadow: 0 0 0 3px ${primaryColor}26;
}

.${kb}-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.${kb}-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.${kb}-checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: var(--color-gray-600, #4b5563);
}

.${kb}-link {
  color: ${primaryColor};
  font-size: 0.85rem;
  text-decoration: none;
}
.${kb}-link:hover { text-decoration: underline; }

.${kb}-submit {
  padding: 0.65rem 1rem;
  background: ${primaryColor};
  color: white;
  border: none;
  border-radius: var(--radius-md, 0.5rem);
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: opacity 0.15s;
}
.${kb}-submit:hover { opacity: 0.9; }
.${kb}-submit:disabled { opacity: 0.5; cursor: not-allowed; }

.${kb}-alt {
  text-align: center;
  margin-top: 1.25rem;
  font-size: 0.85rem;
  color: var(--color-gray-500, #6b7280);
}

.${kb}-alt a {
  color: ${primaryColor};
  font-weight: 500;
  text-decoration: none;
}
.${kb}-alt a:hover { text-decoration: underline; }

.${kb}-social-divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1rem 0;
  color: var(--color-gray-400, #9ca3af);
  font-size: 0.8rem;
}
.${kb}-social-divider::before,
.${kb}-social-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-gray-200, #e5e7eb);
}

@media (max-width: 480px) {
  .${kb}-card { padding: 1.5rem; border-radius: var(--radius-lg, 0.75rem); }
  .${kb}-card h1 { font-size: 1.25rem; }
  .${kb}-submit { width: 100%; }
  .${kb}-row { flex-direction: column; gap: 0.5rem; align-items: flex-start; }
}`;

  const jsx = `import React from 'react';
import './${kb}.css';

export default function ${pascal}() {
  return (
    <main className="${kb}-auth" aria-label="${formTitle}">
      <div className="${kb}-card">
        <h1>${formTitle}</h1>
        <p className="${kb}-subtitle">${formSubtitle}</p>
        <form className="${kb}-form" onSubmit={e => e.preventDefault()}>
          <div className="${kb}-field">
            <label htmlFor="email" className="${kb}-label">Email</label>
            <input id="email" type="email" className="${kb}-input" placeholder="you@example.com" required autoComplete="email" />
          </div>
${nameField}${passwordField}${extras}
          <button type="submit" className="${kb}-submit">${submitLabel}</button>
        </form>
        <div className="${kb}-alt">
          ${isLogin ? "Don't have an account? <a href=\"#\">Sign up</a>" : isRegister ? 'Already have an account? <a href="#">Sign in</a>' : '<a href="#">Back to sign in</a>'}
        </div>
      </div>
    </main>
  );
}
`;

  return { jsx, css, cssFileName: `${kb}.css` };
}

function generateSettingsPage(name, options, tokens) {
  const pascal = pascalCase(name);
  const kb = kebabCase(name);

  const css = `${tokensToCSS(tokens)}

.${kb}-settings {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: var(--font-family-base, system-ui, sans-serif);
  background: var(--color-gray-50, #f9fafb);
  color: var(--color-gray-800, #1f2937);
}

.${kb}-header {
  background: white;
  border-bottom: 1px solid var(--color-gray-200, #e5e7eb);
  padding: 1rem 2rem;
}

.${kb}-header h1 {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
}

.${kb}-body {
  display: grid;
  grid-template-columns: 220px 1fr;
  flex: 1;
  max-width: 960px;
  width: 100%;
  margin: 0 auto;
  padding: 2rem;
  gap: 2rem;
}

.${kb}-tabs {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.${kb}-tab {
  padding: 0.5rem 0.75rem;
  border: none;
  background: none;
  text-align: left;
  border-radius: var(--radius-md, 0.375rem);
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--color-gray-600, #4b5563);
  transition: background 0.15s, color 0.15s;
}

.${kb}-tab:hover { background: var(--color-gray-100, #f3f4f6); }
.${kb}-tab[aria-selected="true"] { background: var(--color-gray-100, #f3f4f6); color: var(--color-gray-900, #111827); font-weight: 600; }

.${kb}-content {
  background: white;
  border: 1px solid var(--color-gray-200, #e5e7eb);
  border-radius: var(--radius-lg, 0.75rem);
  padding: 1.75rem;
}

.${kb}-section {
  margin-bottom: 2rem;
}

.${kb}-section:last-child { margin-bottom: 0; }

.${kb}-section h2 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.25rem;
}

.${kb}-section p {
  font-size: 0.85rem;
  color: var(--color-gray-500, #6b7280);
  margin: 0 0 1rem;
}

.${kb}-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 1rem;
}

.${kb}-field label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-gray-700, #374151);
}

.${kb}-field input,
.${kb}-field select,
.${kb}-field textarea {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-gray-300, #d1d5db);
  border-radius: var(--radius-md, 0.5rem);
  font-size: 0.9rem;
  color: var(--color-gray-900, #111827);
  background: white;
  max-width: 400px;
}

.${kb}-field input:focus,
.${kb}-field select:focus,
.${kb}-field textarea:focus {
  outline: none;
  border-color: var(--color-primary, #3b82f6);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.${kb}-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid var(--color-gray-200, #e5e7eb);
}

.${kb}-btn-save {
  padding: 0.5rem 1rem;
  background: var(--color-primary, #3b82f6);
  color: white;
  border: none;
  border-radius: var(--radius-md, 0.5rem);
  font-weight: 500;
  cursor: pointer;
}
.${kb}-btn-save:hover { opacity: 0.9; }

.${kb}-btn-cancel {
  padding: 0.5rem 1rem;
  background: white;
  color: var(--color-gray-700, #374151);
  border: 1px solid var(--color-gray-300, #d1d5db);
  border-radius: var(--radius-md, 0.5rem);
  cursor: pointer;
}

.${kb}-toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--color-gray-100, #f3f4f6);
}

.${kb}-toggle-label {
  font-size: 0.9rem;
  color: var(--color-gray-700, #374151);
}

.${kb}-toggle-desc {
  font-size: 0.8rem;
  color: var(--color-gray-500, #6b7280);
}

@media (max-width: 768px) {
  .${kb}-body {
    grid-template-columns: 1fr;
    padding: 1rem;
  }
  .${kb}-tabs { flex-direction: row; overflow-x: auto; }
}`;

  const jsx = `import React, { useState } from 'react';
import './${kb}.css';

export default function ${pascal}() {
  const [activeTab, setActiveTab] = useState('profile');
  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'account', label: 'Account' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'danger', label: 'Danger Zone' },
  ];

  return (
    <div className="${kb}-settings">
      <header className="${kb}-header">
        <h1>Settings</h1>
      </header>
      <div className="${kb}-body">
        <nav className="${kb}-tabs" aria-label="Settings navigation" role="tablist">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className="${kb}-tab"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="${kb}-content" role="tabpanel">
          <div className="${kb}-section">
            <h2>Profile</h2>
            <p>Update your personal information.</p>
            <div className="${kb}-field">
              <label htmlFor="displayName">Display Name</label>
              <input id="displayName" type="text" placeholder="Your name" />
            </div>
            <div className="${kb}-field">
              <label htmlFor="bio">Bio</label>
              <textarea id="bio" rows={3} placeholder="Tell us about yourself" />
            </div>
            <div className="${kb}-field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" placeholder="you@example.com" />
            </div>
          </div>
          <div className="${kb}-section">
            <h2>Preferences</h2>
            <p>Manage your notification preferences.</p>
            <div className="${kb}-toggle-row">
              <div>
                <div className="${kb}-toggle-label">Email notifications</div>
                <div className="${kb}-toggle-desc">Receive updates via email</div>
              </div>
              {/* Toggle switch placeholder */}
            </div>
            <div className="${kb}-toggle-row">
              <div>
                <div className="${kb}-toggle-label">Marketing emails</div>
                <div className="${kb}-toggle-desc">Receive promotional content</div>
              </div>
              {/* Toggle switch placeholder */}
            </div>
          </div>
          <div className="${kb}-actions">
            <button className="${kb}-btn-cancel">Cancel</button>
            <button className="${kb}-btn-save">Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

  return { jsx, css, cssFileName: `${kb}.css` };
}

function generatePricingPage(name, options, tokens) {
  const pascal = pascalCase(name);
  const kb = kebabCase(name);
  const primaryColor = (tokens && tokens.colors && tokens.colors.primary) || '#3B82F6';

  const css = `${tokensToCSS(tokens)}

.${kb}-pricing {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: var(--font-family-base, system-ui, sans-serif);
  color: var(--color-gray-800, #1f2937);
  background: white;
}

.${kb}-header {
  text-align: center;
  padding: 5rem 2rem 3rem;
}

.${kb}-header h1 {
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 800;
  margin: 0 0 0.75rem;
  color: var(--color-gray-900, #111827);
}

.${kb}-header p {
  color: var(--color-gray-500, #6b7280);
  font-size: 1.15rem;
  max-width: 500px;
  margin: 0 auto;
}

.${kb}-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  max-width: 960px;
  margin: 0 auto;
  padding: 0 2rem 5rem;
  align-items: start;
}

.${kb}-plan {
  background: white;
  border: 1px solid var(--color-gray-200, #e5e7eb);
  border-radius: var(--radius-xl, 1rem);
  padding: 2rem;
  position: relative;
}

.${kb}-plan--featured {
  border-color: ${primaryColor};
  box-shadow: 0 8px 32px ${primaryColor}20;
}

.${kb}-plan-badge {
  position: absolute;
  top: -0.75rem;
  left: 50%;
  transform: translateX(-50%);
  background: ${primaryColor};
  color: white;
  padding: 0.2rem 1rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.${kb}-plan h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
}

.${kb}-plan-price {
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--color-gray-900, #111827);
  margin: 0 0 0.25rem;
}

.${kb}-plan-price span {
  font-size: 0.9rem;
  font-weight: 400;
  color: var(--color-gray-500, #6b7280);
}

.${kb}-plan-desc {
  font-size: 0.9rem;
  color: var(--color-gray-500, #6b7280);
  margin: 0 0 1.5rem;
}

.${kb}-plan-features {
  list-style: none;
  padding: 0;
  margin: 0 0 1.75rem;
}

.${kb}-plan-features li {
  padding: 0.35rem 0;
  font-size: 0.9rem;
  color: var(--color-gray-700, #374151);
}

.${kb}-plan-features li::before {
  content: '\\2713';
  margin-right: 0.5rem;
  color: ${primaryColor};
  font-weight: 700;
}

.${kb}-plan-btn {
  display: block;
  width: 100%;
  padding: 0.65rem 1rem;
  text-align: center;
  border-radius: var(--radius-md, 0.5rem);
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: opacity 0.15s;
  border: 1px solid ${primaryColor};
  color: ${primaryColor};
  background: white;
}

.${kb}-plan-btn:hover { opacity: 0.85; }

.${kb}-plan--featured .${kb}-plan-btn {
  background: ${primaryColor};
  color: white;
}

.${kb}-footer {
  border-top: 1px solid var(--color-gray-200, #e5e7eb);
  padding: 2rem;
  text-align: center;
  color: var(--color-gray-500, #6b7280);
  font-size: 0.85rem;
}

@media (max-width: 768px) {
  .${kb}-header { padding: 3rem 1.5rem 2rem; }
  .${kb}-grid { padding: 0 1.5rem 3rem; }
}`;

  const jsx = `import React from 'react';
import './${kb}.css';

export default function ${pascal}() {
  const plans = [
    { name: 'Starter', price: '$0', period: '/month', desc: 'Perfect for trying things out.', features: ['5 projects', '1 GB storage', 'Community support', 'Basic analytics'], featured: false },
    { name: 'Pro', price: '$29', period: '/month', desc: 'For growing teams and businesses.', features: ['Unlimited projects', '50 GB storage', 'Priority support', 'Advanced analytics', 'Custom domains', 'Team collaboration'], featured: true },
    { name: 'Enterprise', price: '$99', period: '/month', desc: 'For large organizations.', features: ['Everything in Pro', 'Unlimited storage', '24/7 dedicated support', 'SLA guarantee', 'SSO & SAML', 'Custom integrations', 'Dedicated account manager'], featured: false },
  ];

  return (
    <div className="${kb}-pricing">
      <header className="${kb}-header">
        <h1>Simple, transparent pricing</h1>
        <p>Choose the plan that fits your needs. Upgrade or downgrade anytime.</p>
      </header>

      <section className="${kb}-grid" aria-label="Pricing plans">
        {plans.map(plan => (
          <div key={plan.name} className={\`${kb}-plan \${plan.featured ? '${kb}-plan--featured' : ''}\`}>
            {plan.featured && <div className="${kb}-plan-badge">Most Popular</div>}
            <h2>{plan.name}</h2>
            <div className="${kb}-plan-price">{plan.price}<span>{plan.period}</span></div>
            <p className="${kb}-plan-desc">{plan.desc}</p>
            <ul className="${kb}-plan-features">
              {plan.features.map(f => <li key={f}>{f}</li>)}
            </ul>
            <button className="${kb}-plan-btn">{plan.price === '$0' ? 'Get Started Free' : 'Start Trial'}</button>
          </div>
        ))}
      </section>

      <footer className="${kb}-footer">
        <p>&copy; {new Date().getFullYear()} ${pascal}. All plans include a 14-day free trial.</p>
      </footer>
    </div>
  );
}
`;

  return { jsx, css, cssFileName: `${kb}.css` };
}

module.exports = { generatePageByType, PAGE_TYPES };
