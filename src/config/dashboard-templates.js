/**
 * Dashboard Templates
 * Static HTML dashboard generation for STDD project health visualization.
 */

function generateDashboardCSS(tokens = {}) {
  const colors = tokens.colors || {
    primary: '#3B82F6',
    secondary: '#6366F1',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    bg: '#0D1117',
    surface: '#161B22',
    surfaceAlt: '#21262D',
    border: '#30363D',
    text: '#F0F6FC',
    muted: '#8B949E',
    textSecondary: '#C9D1D9',
  };

  const radius = tokens.borderRadius || { sm: '4px', md: '6px', lg: '8px', xl: '12px' };
  const font = tokens.fontFamily || 'Inter, system-ui, -apple-system, sans-serif';

  return `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --c-primary: ${colors.primary};
      --c-secondary: ${colors.secondary};
      --c-success: ${colors.success};
      --c-warning: ${colors.warning};
      --c-error: ${colors.error};
      --c-bg: ${colors.bg};
      --c-surface: ${colors.surface};
      --c-surface-alt: ${colors.surfaceAlt};
      --c-border: ${colors.border};
      --c-text: ${colors.text};
      --c-muted: ${colors.muted};
      --c-text-secondary: ${colors.textSecondary};
      --r-sm: ${radius.sm};
      --r-md: ${radius.md};
      --r-lg: ${radius.lg};
      --r-xl: ${radius.xl};
      --font: ${font};
    }
    body {
      font-family: var(--font);
      background: var(--c-bg);
      color: var(--c-text);
      line-height: 1.6;
      min-height: 100vh;
    }
    a { color: var(--c-primary); text-decoration: none; }
    a:hover { text-decoration: underline; }

    /* Layout */
    .container { max-width: 1200px; margin: 0 auto; padding: 24px; }
    .grid { display: grid; gap: 16px; }
    .grid-2 { grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); }
    .grid-3 { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
    .grid-4 { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }

    /* Card */
    .card {
      background: var(--c-surface);
      border: 1px solid var(--c-border);
      border-radius: var(--r-lg);
      padding: 20px;
    }
    .card h3 { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--c-muted); margin-bottom: 12px; }
    .card-value { font-size: 1.8rem; font-weight: 700; }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--c-border);
    }
    .header-left h1 { font-size: 1.5rem; font-weight: 700; }
    .header-left .subtitle { color: var(--c-muted); font-size: 0.9rem; }
    .header-right { display: flex; align-items: center; gap: 12px; }

    /* Badges */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 600;
      white-space: nowrap;
    }
    .badge-success { background: rgba(16,185,129,0.15); color: var(--c-success); }
    .badge-warning { background: rgba(245,158,11,0.15); color: var(--c-warning); }
    .badge-error   { background: rgba(239,68,68,0.15); color: var(--c-error); }
    .badge-info    { background: rgba(59,130,246,0.15); color: var(--c-primary); }
    .badge-muted   { background: rgba(139,148,158,0.15); color: var(--c-muted); }

    /* Score Circle */
    .score-circle {
      position: relative;
      width: 140px;
      height: 140px;
    }
    .score-circle svg { transform: rotate(-90deg); }
    .score-circle-bg { fill: none; stroke: var(--c-border); stroke-width: 8; }
    .score-circle-fg { fill: none; stroke-width: 8; stroke-linecap: round; transition: stroke-dashoffset 0.6s ease; }
    .score-circle-label {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
    }
    .score-circle-label .value { font-size: 2rem; font-weight: 700; }
    .score-circle-label .unit { font-size: 0.75rem; color: var(--c-muted); }
    .score-wrap { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }

    /* Tabs */
    .tabs { display: flex; gap: 4px; margin-bottom: 24px; flex-wrap: wrap; }
    .tab {
      padding: 8px 16px;
      border-radius: var(--r-md);
      background: transparent;
      color: var(--c-muted);
      border: 1px solid transparent;
      cursor: pointer;
      font-size: 0.85rem;
      font-family: var(--font);
      transition: background 0.2s, color 0.2s;
    }
    .tab:hover { background: var(--c-surface-alt); color: var(--c-text); }
    .tab.active { background: var(--c-surface); color: var(--c-primary); border-color: var(--c-border); }
    .tab-panel { display: none; }
    .tab-panel.active { display: block; }

    /* Timeline */
    .timeline { position: relative; padding-left: 24px; }
    .timeline::before {
      content: '';
      position: absolute;
      left: 8px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: var(--c-border);
    }
    .timeline-entry {
      position: relative;
      padding-bottom: 16px;
    }
    .timeline-entry::before {
      content: '';
      position: absolute;
      left: -20px;
      top: 6px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--c-primary);
      border: 2px solid var(--c-surface);
    }
    .timeline-entry.fail::before { background: var(--c-error); }
    .timeline-entry.complete::before { background: var(--c-success); }
    .timeline-ts { font-size: 0.75rem; color: var(--c-muted); }
    .timeline-body { font-size: 0.9rem; color: var(--c-text-secondary); }

    /* Evidence list */
    .evidence-list { list-style: none; }
    .evidence-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid var(--c-border);
    }
    .evidence-item:last-child { border-bottom: none; }
    .evidence-path { font-family: monospace; font-size: 0.85rem; }
    .evidence-meta { font-size: 0.75rem; color: var(--c-muted); }

    /* Constitution */
    .constitution-list { list-style: none; }
    .constitution-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid var(--c-border);
    }
    .constitution-item:last-child { border-bottom: none; }
    .constitution-name { font-size: 0.9rem; }

    /* Change cards */
    .change-card {
      background: var(--c-surface-alt);
      border: 1px solid var(--c-border);
      border-radius: var(--r-md);
      padding: 14px;
      margin-bottom: 8px;
    }
    .change-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .change-name { font-weight: 600; font-size: 0.95rem; }
    .change-status { font-size: 0.8rem; }

    /* Empty state */
    .empty { text-align: center; padding: 48px 24px; color: var(--c-muted); }
    .empty-icon { font-size: 2.5rem; margin-bottom: 12px; }

    /* Responsive */
    @media (max-width: 768px) {
      .container { padding: 16px; }
      .header { flex-direction: column; align-items: flex-start; }
      .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; }
      .score-wrap { flex-direction: column; align-items: flex-start; }
    }

    /* Generated timestamp */
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid var(--c-border);
      text-align: center;
      font-size: 0.8rem;
      color: var(--c-muted);
    }
  `;
}

function generateDashboardHTML(data) {
  const {
    projectName = 'Unknown Project',
    version = '0.0.0',
    changes = { active: [], verified: [], archived: [] },
    quality = { complexityScore: null, certaintyScore: null, compositeScore: null },
    progress = [],
    constitution = { articles: [], healthPercent: null },
    evidence = [],
  } = data;

  const composite = quality.compositeScore;
  const scoreColor = composite >= 80 ? 'var(--c-success)' : composite >= 60 ? 'var(--c-warning)' : 'var(--c-error)';
  const circumference = 2 * Math.PI * 58;
  const scoreOffset = composite != null ? circumference - (composite / 100) * circumference : circumference;

  // Build change cards HTML
  const renderChanges = (list, emptyMsg) => {
    if (!list || list.length === 0) return `<div class="empty"><div class="empty-icon">-</div><p>${emptyMsg}</p></div>`;
    return list.map(c => {
      const statusClass = c.status === 'verified' ? 'badge-success' : c.status === 'active' ? 'badge-info' : c.status === 'failed' ? 'badge-error' : 'badge-muted';
      return `<div class="change-card">
        <div class="change-card-header">
          <span class="change-name">${escHtml(c.name)}</span>
          <span class="badge ${statusClass}">${escHtml(c.status || 'unknown')}</span>
        </div>
        ${c.phase ? `<span class="change-status" style="color:var(--c-muted)">Phase: ${escHtml(c.phase)}</span>` : ''}
      </div>`;
    }).join('\n');
  };

  // Build progress timeline
  const renderTimeline = (entries) => {
    if (!entries || entries.length === 0) return '<div class="empty"><div class="empty-icon">~</div><p>No progress entries yet</p></div>';
    return `<div class="timeline">${entries.map(e => {
      const cls = e.status === 'complete' ? 'complete' : e.status === 'fail' ? 'fail' : '';
      return `<div class="timeline-entry ${cls}">
        <div class="timeline-ts">${escHtml(e.timestamp || '')}</div>
        <div class="timeline-body"><strong>${escHtml(e.cmd || e.phase || '')}</strong>${e.change ? ' — ' + escHtml(e.change) : ''} ${e.status ? `<span class="badge ${e.status === 'complete' ? 'badge-success' : e.status === 'fail' ? 'badge-error' : 'badge-info'}" style="margin-left:6px">${escHtml(e.status)}</span>` : ''}</div>
      </div>`;
    }).join('\n')}</div>`;
  };

  // Build constitution list
  const renderConstitution = (articles, healthPercent) => {
    if (!articles || articles.length === 0) return '<div class="empty"><p>No constitution data available</p></div>';
    const healthBadge = healthPercent != null
      ? `<span class="badge ${healthPercent >= 80 ? 'badge-success' : healthPercent >= 60 ? 'badge-warning' : 'badge-error'}" style="margin-bottom:16px">Health: ${healthPercent}%</span>`
      : '';
    return `${healthBadge}<ul class="constitution-list">${articles.map(a => {
      const badgeCls = a.status === 'pass' ? 'badge-success' : a.status === 'fail' ? 'badge-error' : a.waived ? 'badge-warning' : 'badge-muted';
      const label = a.waived ? 'waived' : a.status || 'unknown';
      return `<li class="constitution-item">
        <span class="constitution-name">Article ${a.id}: ${escHtml(a.title)}</span>
        <span class="badge ${badgeCls}">${label}</span>
      </li>`;
    }).join('\n')}</ul>`;
  };

  // Build evidence list
  const renderEvidence = (items) => {
    if (!items || items.length === 0) return '<div class="empty"><div class="empty-icon">~</div><p>No evidence files found</p></div>';
    return `<ul class="evidence-list">${items.map(e => {
      const statusBadge = e.status
        ? `<span class="badge ${e.status === 'pass' ? 'badge-success' : 'badge-error'}">${escHtml(e.status)}</span>`
        : '';
      return `<li class="evidence-item">
        <div>
          <div class="evidence-path">${escHtml(e.path || e.type || '')}</div>
          <div class="evidence-meta">${escHtml(e.change || '')} ${e.timestamp ? ' — ' + escHtml(e.timestamp) : ''}</div>
        </div>
        ${statusBadge}
      </li>`;
    }).join('\n')}</ul>`;
  };

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escHtml(projectName)} — STDD Dashboard</title>
  <style>${generateDashboardCSS()}</style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        <h1>${escHtml(projectName)}</h1>
        <div class="subtitle">v${escHtml(version)} &middot; STDD Copilot Dashboard</div>
      </div>
      <div class="header-right">
        ${composite != null ? `<span class="badge ${composite >= 80 ? 'badge-success' : composite >= 60 ? 'badge-warning' : 'badge-error'}" style="font-size:1rem;padding:8px 16px">Quality: ${composite}/100</span>` : ''}
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button class="tab active" onclick="switchTab('overview')">Overview</button>
      <button class="tab" onclick="switchTab('quality')">Quality</button>
      <button class="tab" onclick="switchTab('progress')">Progress</button>
      <button class="tab" onclick="switchTab('performance')">Performance & Cost</button>
      <button class="tab" onclick="switchTab('constitution')">Constitution</button>
      <button class="tab" onclick="switchTab('evidence')">Evidence</button>
    </div>

    <!-- Tab: Overview -->
    <div id="tab-overview" class="tab-panel active">
      <div class="grid grid-3" style="margin-bottom:24px">
        <div class="card">
          <h3>Active Changes</h3>
          <div class="card-value" style="color:var(--c-primary)">${changes.active ? changes.active.length : 0}</div>
        </div>
        <div class="card">
          <h3>Verified</h3>
          <div class="card-value" style="color:var(--c-success)">${changes.verified ? changes.verified.length : 0}</div>
        </div>
        <div class="card">
          <h3>Archived</h3>
          <div class="card-value" style="color:var(--c-muted)">${changes.archived || 0}</div>
        </div>
      </div>
      <div class="card">
        <h3>Active Changes</h3>
        ${renderChanges(changes.active, 'No active changes')}
      </div>
    </div>

    <!-- Tab: Quality -->
    <div id="tab-quality" class="tab-panel">
      <div class="card">
        <h3>Quality Score</h3>
        <div class="score-wrap">
          <div class="score-circle">
            <svg width="140" height="140" viewBox="0 0 140 140">
              <circle class="score-circle-bg" cx="70" cy="70" r="58" />
              <circle class="score-circle-fg" cx="70" cy="70" r="58"
                stroke="${scoreColor}"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${scoreOffset}" />
            </svg>
            <div class="score-circle-label">
              <div class="value" style="color:${scoreColor}">${composite != null ? composite : '-'}</div>
              <div class="unit">/ 100</div>
            </div>
          </div>
          <div>
            <div style="margin-bottom:12px">
              <div style="color:var(--c-muted);font-size:0.8rem;margin-bottom:2px">Complexity Score</div>
              <div style="font-size:1.2rem;font-weight:600">${quality.complexityScore != null ? quality.complexityScore + '/100' : 'N/A'}</div>
            </div>
            <div>
              <div style="color:var(--c-muted);font-size:0.8rem;margin-bottom:2px">Certainty Score</div>
              <div style="font-size:1.2rem;font-weight:600">${quality.certaintyScore != null ? quality.certaintyScore + '/100' : 'N/A'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab: Progress -->
    <div id="tab-progress" class="tab-panel">
      <div class="card">
        <h3>Recent Progress</h3>
        ${renderTimeline(progress)}
      </div>
    </div>

    <!-- Tab: Performance & Cost -->
    <div id="tab-performance" class="tab-panel">
      <div class="card">
        <h3>Trace Duration (ms) & API Cost ($) Trend</h3>
        <svg id="trace-cost-svg" width="100%" height="200" viewBox="0 0 600 200" style="overflow: visible; margin-top: 20px;"></svg>
      </div>
    </div>

    <!-- Tab: Constitution -->
    <div id="tab-constitution" class="tab-panel">
      <div class="card">
        <h3>Constitution Status</h3>
        ${renderConstitution(constitution.articles, constitution.healthPercent)}
      </div>
    </div>

    <!-- Tab: Evidence -->
    <div id="tab-evidence" class="tab-panel">
      <div class="card">
        <h3>Evidence Gallery</h3>
        ${renderEvidence(evidence)}
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      Generated by STDD Copilot &middot; ${new Date().toISOString()}
    </div>
  </div>

  <script>
    const traceMetrics = ${JSON.stringify(data.traceMetrics || { dates: [], durations: [], costs: [] })};

    function renderTraceCostChart() {
      const svg = document.getElementById('trace-cost-svg');
      if (!svg || !traceMetrics.dates || traceMetrics.dates.length < 2) {
        if(svg) svg.innerHTML = '<text x="10" y="100" fill="var(--c-muted)">Not enough data to display trend.</text>';
        return;
      }
      const w = 560, h = 160, padX = 30, padY = 10;
      const maxDur = Math.max(...traceMetrics.durations, 1000);
      const maxCost = Math.max(...traceMetrics.costs, 0.001);
      
      const durPoints = traceMetrics.durations.map((d, i) => {
        const x = padX + (i / (traceMetrics.dates.length - 1)) * w;
        const y = padY + h - (d / maxDur) * h;
        return x + ',' + y;
      });
      
      const costPoints = traceMetrics.costs.map((c, i) => {
        const x = padX + (i / (traceMetrics.dates.length - 1)) * w;
        const y = padY + h - (c / maxCost) * h;
        return x + ',' + y;
      });

      svg.innerHTML = '<polyline points="' + durPoints.join(' ') + '" fill="none" stroke="var(--c-primary)" stroke-width="2"/>' +
        '<polyline points="' + costPoints.join(' ') + '" fill="none" stroke="var(--c-warning)" stroke-width="2"/>' +
        traceMetrics.durations.map((d, i) => {
          const x = padX + (i / (traceMetrics.dates.length - 1)) * w;
          const y = padY + h - (d / maxDur) * h;
          return '<circle cx="' + x + '" cy="' + y + '" r="3" fill="var(--c-primary)"/>' +
            '<text x="' + x + '" y="' + (y - 8) + '" font-size="9" fill="var(--c-muted)">' + d + 'ms</text>';
        }).join('') +
        traceMetrics.costs.map((c, i) => {
          const x = padX + (i / (traceMetrics.dates.length - 1)) * w;
          const y = padY + h - (c / maxCost) * h;
          return '<circle cx="' + x + '" cy="' + y + '" r="3" fill="var(--c-warning)"/>' +
            '<text x="' + x + '" y="' + (y + 12) + '" font-size="9" fill="var(--c-muted)">$' + c.toFixed(4) + '</text>';
        }).join('') +
        '<line x1="' + padX + '" y1="' + (padY + h) + '" x2="' + (padX + w) + '" y2="' + (padY + h) + '" stroke="var(--c-border)" stroke-width="1"/>' +
        '<text x="' + padX + '" y="195" font-size="10" fill="var(--c-primary)">● Duration (ms)</text>' +
        '<text x="' + (padX + 120) + '" y="195" font-size="10" fill="var(--c-warning)">● API Cost ($)</text>';
    }

    function switchTab(name) {
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.getElementById('tab-' + name).classList.add('active');
      event.target.classList.add('active');
    }

    // Initialize charts
    renderTraceCostChart();
  </script>
</body>
</html>`;
}

function generateEmptyDashboard(projectName = 'Unknown Project') {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escHtml(projectName)} — STDD Dashboard</title>
  <style>${generateDashboardCSS()}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-left">
        <h1>${escHtml(projectName)}</h1>
        <div class="subtitle">STDD Copilot Dashboard</div>
      </div>
    </div>
    <div class="card" style="margin-top:24px">
      <div class="empty">
        <div class="empty-icon" style="font-size:3rem">+</div>
        <h2 style="margin-bottom:8px;color:var(--c-text)">No STDD Data Yet</h2>
        <p>Run <code style="background:var(--c-surface-alt);padding:2px 8px;border-radius:4px">stdd init</code> to initialize your project, then use STDD commands to generate data.</p>
        <p style="margin-top:12px">This dashboard will populate automatically as you work.</p>
      </div>
    </div>
    <div class="footer">
      Generated by STDD Copilot &middot; ${new Date().toISOString()}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Minimal HTML entity escaping.
 */
function escHtml(str) {
  if (typeof str !== 'string') return String(str || '');
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = { generateDashboardCSS, generateDashboardHTML, generateEmptyDashboard };
