/**
 * Dashboard Command
 * Generates a static HTML dashboard showing project health, changes, and evidence.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const http = require('http');
const chalk = require('chalk');
const { createLogger } = require('../../utils/logger');
const { generateDashboardHTML, generateEmptyDashboard } = require('../../config/dashboard-templates');
const { CONSTITUTION_ARTICLES } = require('../helpers/constitution-data');
const logger = createLogger('dashboard');

class DashboardCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.stddDir = path.join(cwd, 'stdd');
  }

  async execute(action = 'generate', _args = [], options = {}) {
    switch (action) {
      case 'generate':
      case 'create':
      case 'build':
        return this.generate(options);
      case 'open':
      case 'view':
        return this.open(options);
      case 'serve':
      case 'watch':
        return this.serve(options);
      default:
        return this.generate(options);
    }
  }

  /**
   * Gather data from the project for the dashboard.
   * Gracefully handles missing files — returns empty defaults.
   */
  gatherData(cwd) {
    const data = {
      projectName: path.basename(cwd),
      version: '0.0.0',
      changes: { active: [], verified: [], archived: [] },
      quality: { complexityScore: null, certaintyScore: null, compositeScore: null },
      progress: [],
      constitution: { articles: [], healthPercent: null },
      evidence: [],
    };

    // package.json → projectName, version
    try {
      const pkgPath = path.join(cwd, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        data.projectName = pkg.name || data.projectName;
        data.version = pkg.version || data.version;
      }
    } catch (err) {
      logger.warn(`Failed to read package.json: ${err.message}`);
    }

    // stdd/changes/ → active changes with status
    const changesDir = path.join(this.stddDir, 'changes');
    try {
      if (fs.existsSync(changesDir)) {
        const entries = fs.readdirSync(changesDir).filter(e => {
          const full = path.join(changesDir, e);
          return fs.statSync(full).isDirectory();
        });

        for (const entry of entries) {
          const changeDir = path.join(changesDir, entry);
          const changeInfo = { name: entry, status: 'active', phase: '' };

          // Read .status.yaml if exists
          const statusFile = path.join(changeDir, '.status.yaml');
          if (fs.existsSync(statusFile)) {
            try {
              const content = fs.readFileSync(statusFile, 'utf8');
              const statusMatch = content.match(/status:\s*(\S+)/);
              if (statusMatch) changeInfo.status = statusMatch[1];
              const phaseMatch = content.match(/phase:\s*(\S+)/);
              if (phaseMatch) changeInfo.phase = phaseMatch[1];
            } catch (_) { /* ignore parse errors */ }
          }

          // Read CHANGE.md for title
          const changeMd = path.join(changeDir, 'CHANGE.md');
          if (fs.existsSync(changeMd)) {
            try {
              const firstLine = fs.readFileSync(changeMd, 'utf8').split('\n')[0] || '';
              const titleMatch = firstLine.match(/^#\s+(.+)/);
              if (titleMatch) changeInfo.title = titleMatch[1];
            } catch (_) { /* ignore */ }
          }

          if (changeInfo.status === 'verified' || changeInfo.status === 'complete') {
            data.changes.verified.push(changeInfo);
          } else {
            data.changes.active.push(changeInfo);
          }
        }
      }
    } catch (err) {
      logger.warn(`Failed to scan changes: ${err.message}`);
    }

    // stdd/changes/archive/ → count archived
    const archiveDir = path.join(changesDir, 'archive');
    try {
      if (fs.existsSync(archiveDir)) {
        data.changes.archived = fs.readdirSync(archiveDir)
          .filter(e => fs.statSync(path.join(archiveDir, e)).isDirectory())
          .length;
      }
    } catch (_) { /* ignore */ }

    // stdd/reports/complexity.json → complexity score
    try {
      const complexityPath = path.join(this.stddDir, 'reports', 'complexity.json');
      if (fs.existsSync(complexityPath)) {
        const report = JSON.parse(fs.readFileSync(complexityPath, 'utf8'));
        if (report.summary) {
          data.quality.complexityScore = report.summary.score != null
            ? report.summary.score
            : report.summary.averageComplexity != null
              ? Math.min(100, Math.round(100 - report.summary.averageComplexity))
              : null;
        }
      }
    } catch (err) {
      logger.warn(`Failed to read complexity report: ${err.message}`);
    }

    // stdd/memory/certainty-history.jsonl → last certainty score
    try {
      const certaintyPath = path.join(this.stddDir, 'memory', 'certainty-history.jsonl');
      if (fs.existsSync(certaintyPath)) {
        const lines = fs.readFileSync(certaintyPath, 'utf8').trim().split('\n').filter(Boolean);
        if (lines.length > 0) {
          const last = JSON.parse(lines[lines.length - 1]);
          data.quality.certaintyScore = last.compositeScore != null
            ? Math.round(last.compositeScore)
            : null;
        }
      }
    } catch (err) {
      logger.warn(`Failed to read certainty history: ${err.message}`);
    }

    // Composite score: average of complexity and certainty (inverted complexity)
    const scores = [data.quality.complexityScore, data.quality.certaintyScore].filter(s => s != null);
    if (scores.length > 0) {
      data.quality.compositeScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }

    // stdd/progress.jsonl → last 20 entries
    try {
      const progressPath = path.join(this.stddDir, 'progress.jsonl');
      if (fs.existsSync(progressPath)) {
        const lines = fs.readFileSync(progressPath, 'utf8').trim().split('\n').filter(Boolean);
        const recent = lines.slice(-20);
        data.progress = recent.map(line => {
          try {
            const entry = JSON.parse(line);
            return {
              timestamp: entry.ts || '',
              phase: entry.cmd || entry.phase || '',
              change: entry.args?.change || entry.args?.name || '',
              status: entry.ev === 'complete' ? 'complete' : entry.ev === 'fail' ? 'fail' : entry.ev || '',
            };
          } catch (_) {
            return null;
          }
        }).filter(Boolean).reverse();
      }
    } catch (err) {
      logger.warn(`Failed to read progress: ${err.message}`);
    }

    // Constitution articles — static list + check evidence
    try {
      const articles = CONSTITUTION_ARTICLES.map(a => ({
        id: a.n,
        title: a.name,
        status: 'pass', // default to pass; real check would run constitution checker
        waived: false,
      }));

      // Check for waiver data
      const waiverPath = path.join(this.stddDir, 'waivers.yaml');
      if (fs.existsSync(waiverPath)) {
        try {
          const content = fs.readFileSync(waiverPath, 'utf8');
          for (const article of articles) {
            if (content.includes(`article: ${article.id}`) || content.includes(`article: '${article.id}'`)) {
              article.waived = true;
            }
          }
        } catch (_) { /* ignore */ }
      }

      data.constitution.articles = articles;
      const passedCount = articles.filter(a => a.status === 'pass' || a.waived).length;
      data.constitution.healthPercent = Math.round((passedCount / Math.max(articles.length, 1)) * 100);
    } catch (err) {
      logger.warn(`Failed to process constitution: ${err.message}`);
    }

    // Evidence files
    try {
      const evidenceList = [];

      // stdd/evidence/
      const evidenceDir = path.join(this.stddDir, 'evidence');
      if (fs.existsSync(evidenceDir)) {
        this._scanEvidenceDir(evidenceDir, '', evidenceList);
      }

      // stdd/changes/*/evidence/
      if (fs.existsSync(changesDir)) {
        const changeDirs = fs.readdirSync(changesDir).filter(e => {
          const full = path.join(changesDir, e);
          return fs.statSync(full).isDirectory() && e !== 'archive';
        });
        for (const change of changeDirs) {
          const evDir = path.join(changesDir, change, 'evidence');
          if (fs.existsSync(evDir)) {
            this._scanEvidenceDir(evDir, change, evidenceList);
          }
        }
      }

      data.evidence = evidenceList;
    } catch (err) {
      logger.warn(`Failed to scan evidence: ${err.message}`);
    }

    return data;
  }

  /**
   * Recursively scan an evidence directory for files.
   */
  _scanEvidenceDir(dir, changeName, results) {
    try {
      const entries = fs.readdirSync(dir);
      for (const entry of entries) {
        const full = path.join(dir, entry);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          this._scanEvidenceDir(full, changeName, results);
        } else {
          results.push({
            type: path.extname(entry).replace('.', '') || 'file',
            change: changeName,
            timestamp: stat.mtime.toISOString().split('T')[0],
            status: 'pass',
            path: path.relative(this.cwd, full),
          });
        }
      }
    } catch (_) { /* ignore scan errors */ }
  }

  /**
   * Parse design tokens from DESIGN.md if present.
   */
  _parseDesignTokens() {
    const designPath = path.join(this.cwd, 'DESIGN.md');
    if (!fs.existsSync(designPath)) return {};

    try {
      const content = fs.readFileSync(designPath, 'utf8');
      const tokens = { colors: {} };

      // Extract color values
      const colorMap = {
        '--color-primary': 'primary',
        '--color-secondary': 'secondary',
        '--color-success': 'success',
        '--color-warning': 'warning',
        '--color-error': 'error',
      };

      for (const [token, key] of Object.entries(colorMap)) {
        const match = content.match(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + `[^'#]*('|\`|)(#[0-9a-fA-F]{3,8})`));
        if (match) tokens.colors[key] = match[2];
      }

      // Dark theme detection — use dark defaults if DESIGN.md is dark
      if (content.includes('Dark Developer') || content.includes('#0D1117') || content.includes('#161B22')) {
        tokens.colors.bg = '#0D1117';
        tokens.colors.surface = '#161B22';
        tokens.colors.surfaceAlt = '#21262D';
        tokens.colors.border = '#30363D';
        tokens.colors.text = '#F0F6FC';
        tokens.colors.muted = '#8B949E';
        tokens.colors.textSecondary = '#C9D1D9';
      }

      return Object.keys(tokens.colors).length > 0 ? tokens : {};
    } catch (_) {
      return {};
    }
  }

  /**
   * Generate the dashboard HTML file.
   */
  generate(options = {}) {
    // Check for --json raw data output
    if (options.json) {
      const data = this.gatherData(this.cwd);
      console.log(JSON.stringify(data, null, 2));
      return data;
    }

    const stddExists = fs.existsSync(this.stddDir);
    const projectName = path.basename(this.cwd);
    let html;

    if (!stddExists) {
      html = generateEmptyDashboard(projectName);
    } else {
      const data = this.gatherData(this.cwd);
      // Check if we have any real data
      const hasData = data.changes.active.length > 0
        || data.changes.verified.length > 0
        || data.changes.archived > 0
        || data.quality.compositeScore != null
        || data.progress.length > 0
        || data.evidence.length > 0;

      if (hasData) {
        html = generateDashboardHTML(data);
      } else {
        html = generateEmptyDashboard(projectName);
      }
    }

    // Determine output path
    const outputPath = options.output
      ? path.resolve(options.output)
      : path.join(this.stddDir, 'dashboard', 'index.html');

    // Ensure output directory exists
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, html, 'utf8');

    const relativePath = path.relative(this.cwd, outputPath);
    console.log(chalk.bold('\n  Dashboard generated\n'));
    console.log(`  ${chalk.cyan(relativePath)}`);
    console.log(chalk.dim(`  Open in browser: stdd dashboard open\n`));

    return { path: outputPath, relativePath, generated: true };
  }

  /**
   * Generate and open the dashboard in the default browser.
   */
  open(options = {}) {
    const result = this.generate({ ...options, json: false });
    if (!result || !result.path) return result;

    const filePath = result.path;

    const command = process.platform === 'darwin'
      ? `open "${filePath}"`
      : process.platform === 'win32'
        ? `start "" "${filePath}"`
        : `xdg-open "${filePath}"`;

    exec(command, (err) => {
      if (err) {
        logger.warn(`Failed to open browser: ${err.message}`);
        console.log(chalk.yellow(`  Could not open browser. Open manually: ${filePath}`));
      } else {
        console.log(chalk.green(`  Opened in browser: ${path.relative(this.cwd, filePath)}`));
      }
    });

    return result;
  }

  /**
   * Serve the dashboard with live reload on a local HTTP server.
   * Watches stdd/ directory for changes and auto-regenerates.
   */
  async serve(options = {}) {
    const port = options.port || 3456;
    const outputPath = path.join(this.stddDir, 'dashboard', 'index.html');
    let lastRegenerate = 0;

    // Initial generation
    try {
      this.generate({ ...options, silent: true });
    } catch (_) {}

    const server = http.createServer((req, res) => {
      // Re-generate on each request for fresh data
      const now = Date.now();
      if (now - lastRegenerate > 3000) {
        try { this.generate({ ...options, silent: true }); lastRegenerate = now; }
        catch (_) {}
      }

      let html;
      try {
        html = fs.readFileSync(outputPath, 'utf8');
      } catch (_) {
        html = '<html><body><h1>Dashboard not generated yet. Run stdd init first.</h1></body></html>';
      }

      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      res.end(html);
    });

    // Watch stdd/ directory for changes
    let debounceTimer = null;
    try {
      fs.watch(this.stddDir, { recursive: true }, (_eventType, _filename) => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          try {
            this.generate({ ...options, silent: true });
            logger.info('Dashboard auto-regenerated');
          } catch (_) {}
        }, 300);
      });
    } catch (_) {
      // fs.watch may fail if stdd dir doesn't exist
    }

    server.listen(port, () => {
      console.log(chalk.green.bold('\n  Dashboard Server\n'));
      console.log(chalk.cyan(`  URL: http://localhost:${port}`));
      console.log(chalk.dim('  Watching stdd/ for changes...'));
      console.log(chalk.dim('  Press Ctrl+C to stop\n'));
    });

    // Graceful shutdown
    const shutdown = () => {
      console.log(chalk.dim('\n  Shutting down dashboard server...'));
      server.close();
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    return { serving: true, port, url: `http://localhost:${port}` };
  }


}
module.exports = { DashboardCommand };
