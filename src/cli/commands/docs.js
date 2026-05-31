/**
 * Docs Command
 * Generate a static HTML documentation site from existing project docs.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { spawnSync } = require('child_process');
const { createLogger } = require('../../utils/logger');
const {
  generateDocsCSS,
  generateIndexPage,
  generateSectionPage,
  simpleMarkdownToHTML,
  generateSearchIndex,
} = require('../../config/docs-templates');

const logger = createLogger('docs');

// Directories and files to scan for documentation
const ROOT_DOC_FILES = [
  { file: 'README.md', title: 'Overview', titleEn: 'Overview', section: 'overview' },
  { file: 'README_EN.md', title: 'Overview (EN)', titleEn: 'Overview', section: 'overview-en', lang: 'en' },
  { file: 'ARCHITECTURE.md', title: 'Architecture', titleEn: 'Architecture', section: 'architecture' },
  { file: 'USAGE.md', title: 'Usage Guide', titleEn: 'Usage Guide', section: 'usage' },
  { file: 'INSTALL.md', title: 'Installation', titleEn: 'Installation', section: 'install' },
  { file: 'CONTRIBUTING.md', title: 'Contributing', titleEn: 'Contributing', section: 'contributing' },
  { file: 'CHANGELOG.md', title: 'Changelog', titleEn: 'Changelog', section: 'changelog' },
];

const DOCS_DIR_PAGES = [
  { file: 'getting-started.md', title: 'Getting Started', titleEn: 'Getting Started', section: 'getting-started' },
  { file: 'cli-guide.md', title: 'CLI Guide', titleEn: 'CLI Guide', section: 'cli-guide' },
  { file: 'concepts.md', title: 'Concepts', titleEn: 'Concepts', section: 'concepts' },
  { file: 'workflows.md', title: 'Workflows', titleEn: 'Workflows', section: 'workflows' },
  { file: 'capabilities.md', title: 'Capabilities', titleEn: 'Capabilities', section: 'capabilities' },
  { file: 'agent-protocol.md', title: 'Agent Protocol', titleEn: 'Agent Protocol', section: 'agent-protocol' },
  { file: 'command-reference.md', title: 'Command Reference', titleEn: 'Command Reference', section: 'command-reference' },
];

class DocsCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.projectName = this.detectProjectName();
  }

  detectProjectName() {
    try {
      const pkgPath = path.join(this.cwd, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        return (pkg.name || 'STDD').replace(/^@[^/]+\//, '');
      }
    } catch (_) { /* ignore */ }
    return 'STDD';
  }

  async execute(action = 'generate', _args = [], options = {}) {
    switch (action) {
      case 'generate':
        return this.generate(options);
      case 'open':
        return this.open(options);
      case 'sources':
        return this.listSources(options);
      case 'deploy':
        return this.deploy(options);
      default:
        return this.generate(options);
    }
  }

  /**
   * Gather all documentation sources from the project.
   */
  gatherDocSources(cwd) {
    const sources = [];

    // Root-level doc files
    for (const def of ROOT_DOC_FILES) {
      const fullPath = path.join(cwd, def.file);
      if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');
        // Strip leading HTML if present (e.g. <div align="center">)
        content = content.replace(/^<div[^>]*>[\s\S]*?<\/div>\n*/i, '');
        sources.push({
          title: def.title,
          titleEn: def.titleEn,
          content,
          source: def.file,
          section: def.section,
          lang: def.lang || null,
        });
      }
    }

    // docs/ directory files
    const docsDir = path.join(cwd, 'docs');
    if (fs.existsSync(docsDir)) {
      for (const def of DOCS_DIR_PAGES) {
        const fullPath = path.join(docsDir, def.file);
        if (fs.existsSync(fullPath)) {
          sources.push({
            title: def.title,
            titleEn: def.titleEn,
            content: fs.readFileSync(fullPath, 'utf8'),
            source: `docs/${def.file}`,
            section: def.section,
            lang: null,
          });
        }
      }

      // Any other .md files in docs/ not already captured
      const knownFiles = new Set(DOCS_DIR_PAGES.map(d => d.file));
      const additional = fs.readdirSync(docsDir)
        .filter(f => f.endsWith('.md') && !knownFiles.has(f) && !f.startsWith('.'));
      for (const f of additional) {
        const name = path.basename(f, '.md');
        const title = name.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        sources.push({
          title,
          titleEn: title,
          content: fs.readFileSync(path.join(docsDir, f), 'utf8'),
          source: `docs/${f}`,
          section: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          lang: null,
        });
      }
    }

    // Commands listing from registry
    const commandsDir = path.join(__dirname, '..', '..', 'templates', 'commands');
    if (fs.existsSync(commandsDir)) {
      const commands = fs.readdirSync(commandsDir)
        .filter(f => f.endsWith('.md'))
        .map(f => {
          const name = f.replace(/\.md$/, '');
          const content = fs.readFileSync(path.join(commandsDir, f), 'utf8');
          const descMatch = content.match(/^description:\s*(.+)$/m);
          const desc = descMatch ? descMatch[1].trim().replace(/^['"]|['"]$/g, '') : '';
          return { name, description: desc };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      if (commands.length > 0) {
        let cmdContent = `# Commands Reference\n\n`;
        cmdContent += `${commands.length} slash commands available.\n\n`;
        for (const cmd of commands) {
          cmdContent += `## /stdd:${cmd.name}\n\n`;
          cmdContent += `${cmd.description || ''}\n\n`;
        }
        sources.push({
          title: 'Commands',
          titleEn: 'Commands',
          content: cmdContent,
          source: 'commands-registry',
          section: 'commands',
          lang: null,
        });
      }
    }

    // Skills listing from skills directory
    const skillsDir = path.join(__dirname, '..', '..', 'templates', 'skills', 'stdd');
    if (fs.existsSync(skillsDir)) {
      const skills = fs.readdirSync(skillsDir, { withFileTypes: true })
        .filter(e => e.isDirectory())
        .map(e => {
          const skillPath = path.join(skillsDir, e.name, 'SKILL.md');
          let content = '';
          let description = '';
          if (fs.existsSync(skillPath)) {
            content = fs.readFileSync(skillPath, 'utf8');
            const descMatch = content.match(/^description:\s*(.+)$/m);
            if (descMatch) description = descMatch[1].trim().replace(/^['"]|['"]$/g, '');
          }
          return { name: e.name, description, content };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      if (skills.length > 0) {
        let skillContent = `# Skills Reference\n\n`;
        skillContent += `${skills.length} skills available.\n\n`;
        for (const skill of skills) {
          skillContent += `## /stdd:${skill.name}\n\n`;
          skillContent += `${skill.description || ''}\n\n`;
          if (skill.content) {
            // Strip frontmatter and first heading for inclusion
            const stripped = skill.content.replace(/^---[\s\S]*?---\n?/, '');
            // Skip the first # heading (already used as section title)
            const body = stripped.replace(/^#\s+.*\n?/, '');
            skillContent += body.trim() + '\n\n';
          }
        }
        sources.push({
          title: 'Skills',
          titleEn: 'Skills',
          content: skillContent,
          source: 'skills-registry',
          section: 'skills',
          lang: null,
        });
      }
    }

    return sources;
  }

  /**
   * Read design tokens from DESIGN.md (optional).
   */
  readDesignTokens(cwd) {
    const designPath = path.join(cwd, 'DESIGN.md');
    if (!fs.existsSync(designPath)) return null;

    try {
      const content = fs.readFileSync(designPath, 'utf8');
      // Try to extract a JSON block from DESIGN.md
      const jsonMatch = content.match(/```json\n([\s\S]*?)```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
    } catch (_) { /* ignore */ }

    return null;
  }

  /**
   * Generate the full documentation site.
   */
  generate(options = {}) {
    const outputDir = options.output
      ? path.resolve(options.output)
      : path.join(this.cwd, 'stdd', 'docs-site');
    const lang = options.lang || null;

    // Gather sources
    const sources = this.gatherDocSources(this.cwd);

    if (options.json) {
      const listing = sources.map(s => ({
        title: s.title,
        source: s.source,
        section: s.section,
        lang: s.lang,
        length: s.content.length,
      }));
      console.log(JSON.stringify(listing, null, 2));
      return listing;
    }

    // Filter by language if requested
    let filtered = sources;
    if (lang === 'en') {
      // Prefer English variants; skip Chinese-only content
      filtered = sources.filter(s => s.lang === 'en' || (!s.lang && !containsCJK(s.content)));
    } else if (lang === 'zh') {
      filtered = sources.filter(s => s.lang !== 'en');
    }

    // Build nav items
    const navItems = [];
    for (const src of filtered) {
      navItems.push({
        title: src.title,
        path: `${src.section}.html`,
      });
    }

    // Read design tokens
    const tokens = this.readDesignTokens(this.cwd);

    // Ensure output directory
    fs.mkdirSync(outputDir, { recursive: true });

    // Generate CSS
    fs.writeFileSync(path.join(outputDir, 'style.css'), generateDocsCSS(tokens), 'utf8');

    // Generate index page
    const indexSections = navItems.map((n, i) => ({
      ...n,
      description: filtered[i] ? getDescription(filtered[i].content) : '',
    }));
    fs.writeFileSync(
      path.join(outputDir, 'index.html'),
      generateIndexPage(indexSections, this.projectName),
      'utf8',
    );

    // Generate section pages
    const searchPages = [];
    for (let i = 0; i < filtered.length; i++) {
      const src = filtered[i];
      const htmlContent = simpleMarkdownToHTML(src.content);
      const pageHtml = generateSectionPage(src.title, htmlContent, navItems, this.projectName);
      fs.writeFileSync(path.join(outputDir, `${src.section}.html`), pageHtml, 'utf8');

      searchPages.push({
        title: src.title,
        path: `${src.section}.html`,
        content: src.content,
      });
    }

    // Generate search index
    fs.writeFileSync(
      path.join(outputDir, 'search.json'),
      generateSearchIndex(searchPages),
      'utf8',
    );

    const fileCount = filtered.length + 2; // pages + index + style.css + search.json
    console.log(chalk.green(`\nDocumentation site generated:`));
    console.log(chalk.dim(`  Output: ${path.relative(this.cwd, outputDir)}`));
    console.log(chalk.dim(`  Pages:  ${filtered.length} sections + index`));
    console.log(chalk.dim(`  Files:  ${fileCount} total`));
    console.log(chalk.dim(`  Open:   stdd docs open\n`));

    return { outputDir, fileCount, pages: filtered.length };
  }

  /**
   * Generate and open in browser.
   */
  open(options = {}) {
    const result = this.generate(options);
    if (!result || !result.outputDir) return result;

    const indexPath = path.join(result.outputDir, 'index.html');
    if (!fs.existsSync(indexPath)) {
      logger.warn('index.html not found after generation');
      return result;
    }

    try {
      const platform = process.platform;
      const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'cmd' : 'xdg-open';
      const args = platform === 'win32' ? ['/c', 'start', '""', indexPath] : [indexPath];
      spawnSync(cmd, args, { stdio: 'ignore' });
      console.log(chalk.dim('  Opened in browser.'));
    } catch (err) {
      console.log(chalk.yellow(`  Could not open browser: ${err.message}`));
      console.log(chalk.dim(`  Open manually: file://${indexPath}`));
    }

    return result;
  }

  /**
   * List doc sources as JSON.
   */
  listSources(options = {}) {
    const sources = this.gatherDocSources(this.cwd);
    const listing = sources.map(s => ({
      title: s.title,
      source: s.source,
      section: s.section,
      lang: s.lang,
      length: s.content.length,
    }));

    if (options.json) {
      console.log(JSON.stringify(listing, null, 2));
    } else {
      console.log(chalk.bold(`\nDocumentation Sources (${listing.length})\n`));
      for (const item of listing) {
        const langTag = item.lang ? chalk.dim(` [${item.lang}]`) : '';
        console.log(`  ${chalk.cyan(item.title.padEnd(20))} ${chalk.dim(item.source)}${langTag}`);
      }
      console.log('');
    }

    return listing;
  }

  /**
   * Deploy the generated docs site.
   * Supports: gh-pages (default), netlify, custom.
   */
  async deploy(options = {}) {
    const provider = options.provider || 'gh-pages';
    const outputDir = options.output || path.join(this.cwd, 'stdd', 'docs-site');

    if (!fs.existsSync(path.join(outputDir, 'index.html'))) {
      console.log(chalk.dim('  Generating docs site first...'));
      this.generate({ ...options, output: outputDir });
    }

    if (!fs.existsSync(path.join(outputDir, 'index.html'))) {
      throw new Error('Docs site generation failed. Cannot deploy.');
    }

    console.log(chalk.bold('\n  Deploying docs site\n'));
    console.log(chalk.cyan('  Provider: ' + provider));
    console.log(chalk.cyan('  Directory: ' + path.relative(this.cwd, outputDir)));

    if (provider === 'gh-pages') {
      return this._deployGHPages(outputDir, options);
    } else if (provider === 'netlify') {
      return this._deployNetlify(outputDir, options);
    } else if (provider === 'custom') {
      return this._deployCustom(outputDir, options);
    }
    throw new Error('Unknown provider: ' + provider + '. Use: gh-pages, netlify, or custom.');
  }

  _git(args, options = {}) {
    const result = spawnSync('git', args, { cwd: options.cwd || this.cwd, encoding: 'utf8', stdio: options.stdio || 'pipe' });
    if (result.status !== 0 && !options.allowFail) {
      throw new Error(result.stderr || ('git ' + args.join(' ') + ' failed'));
    }
    return (result.stdout || '').trim();
  }

  _deployGHPages(outputDir, options = {}) {
    const branch = options.branch || 'gh-pages';
    const message = options.message || 'Deploy docs site';
    try {
      const currentBranch = this._git(['rev-parse', '--abbrev-ref', 'HEAD']);
      try {
        this._git(['rev-parse', '--verify', branch]);
        this._git(['checkout', branch]);
      } catch (_) {
        this._git(['checkout', '--orphan', branch]);
      }
      try { this._git(['rm', '-rf', '.'], { allowFail: true }); } catch (_) {}
      const files = fs.readdirSync(outputDir);
      for (const file of files) {
        fs.copyFileSync(path.join(outputDir, file), path.join(this.cwd, file));
        this._git(['add', file]);
      }
      this._git(['commit', '-m', message]);
      this._git(['push', 'origin', branch, '--force']);
      this._git(['checkout', currentBranch]);
      const remoteUrl = this._git(['remote', 'get-url', 'origin']);
      const repoMatch = remoteUrl.match(/[:/]([^/]+\/[^.]+)/);
      const repoPath = repoMatch ? repoMatch[1] : '';
      console.log(chalk.green('\n  Deployed to GitHub Pages!'));
      console.log(chalk.cyan('  URL: https://' + repoPath.replace('/', '.github.io/')));
      return { deployed: true, provider: 'gh-pages', branch };
    } catch (err) {
      try { this._git(['checkout', '-'], { allowFail: true }); } catch (_) {}
      throw new Error('GitHub Pages deploy failed: ' + err.message);
    }
  }

  _deployNetlify(outputDir) {
    const check = spawnSync('which', ['netlify'], { encoding: 'utf8', stdio: 'pipe' });
    if (check.status !== 0) throw new Error('Netlify CLI not found. Install: npm install -g netlify-cli');
    try {
      const result = spawnSync('netlify', ['deploy', '--prod', '--dir=' + outputDir], {
        encoding: 'utf8', cwd: this.cwd, stdio: ['pipe', 'pipe', 'pipe'],
      });
      if (result.status !== 0) throw new Error(result.stderr || 'netlify deploy failed');
      const output = result.stdout;
      const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.netlify\.app/);
      const deployUrl = urlMatch ? urlMatch[0] : 'unknown';
      console.log(chalk.green('\n  Deployed to Netlify!'));
      console.log(chalk.cyan('  URL: ' + deployUrl));
      return { deployed: true, provider: 'netlify', url: deployUrl };
    } catch (err) {
      throw new Error('Netlify deploy failed: ' + err.message);
    }
  }

  _deployCustom(outputDir, options = {}) {
    const command = options.deployCommand;
    if (!command) {
      throw new Error('--deploy-command is required for custom provider.');
    }
    try {
      const parts = command.split(/\s+/);
      const bin = parts[0];
      const cmdArgs = [...parts.slice(1), outputDir];
      const result = spawnSync(bin, cmdArgs, {
        encoding: 'utf8', cwd: this.cwd, stdio: 'inherit',
      });
      if (result.status !== 0) throw new Error('Custom deploy command exited non-zero');
      console.log(chalk.green('\n  Deployed via custom command!'));
      return { deployed: true, provider: 'custom', command };
    } catch (err) {
      throw new Error('Custom deploy failed: ' + err.message);
    }
  }
}

/**
 * Extract a short description from markdown content (first non-heading paragraph).
 */
function getDescription(content) {
  const lines = content.replace(/^---[\s\S]*?---\n?/, '').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('>') || trimmed.startsWith('---') || trimmed.startsWith('!')) continue;
    if (trimmed.length < 10) continue;
    return trimmed.substring(0, 120);
  }
  return '';
}

/**
 * Check if a string contains CJK characters.
 */
function containsCJK(str) {
  return /[一-鿿㐀-䶿]/.test(str);
}

module.exports = { DocsCommand };
