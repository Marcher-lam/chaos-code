/**
 * IDE Adapters
 * Generate IDE-specific configuration files for cross-platform support.
 * Supports: Claude Code, Cursor, Windsurf, VS Code (Copilot), Augment
 */

const fs = require('fs');
const path = require('path');

const ADAPTERS = {
  'claude-code': {
    name: 'Claude Code',
    id: 'claude-code',
    configDir: '.claude',
    templates: {
      'commands': (stddDir) => `# STDD Commands\nCommands are auto-generated from ${stddDir}/templates/commands/`,
      'CLAUDE.md': (stddDir, projectName) => `# ${projectName}\n\nThis project uses STDD Copilot Ultra for Smart Team-Driven Development.\n\n## Quick Reference\n- Init: \`stdd init\`\n- New change: \`stdd new <description>\`\n- Status: \`stdd status\`\n- Dashboard: \`stdd dashboard open\`\n- Story board: \`stdd story board\`\n- Roles consult: \`stdd roles consult <role> <topic>\`\n`,
    },
    generate(cwd, projectName, stddDir) {
      const dir = path.join(cwd, '.claude');
      fs.mkdirSync(dir, { recursive: true });
      fs.mkdirSync(path.join(dir, 'commands'), { recursive: true });
      const md = this.templates['CLAUDE.md'](stddDir, projectName);
      fs.writeFileSync(path.join(dir, 'CLAUDE.md'), md, 'utf8');
      return ['.claude/CLAUDE.md', '.claude/commands/'];
    },
  },
  'cursor': {
    name: 'Cursor',
    id: 'cursor',
    configDir: '.cursor',
    templates: {
      '.cursorrules': (stddDir, projectName) => `# ${projectName} - Cursor Rules\n\n## STDD Integration\nThis project uses STDD Copilot Ultra.\n\n### Workflow\n1. Use \`stdd new\` to start changes\n2. Follow STDD lifecycle: propose -> clarify -> spec -> plan -> apply -> verify -> archive\n3. Run \`stdd verify\` before committing\n4. Use \`stdd roles consult\` for expert analysis\n\n### Quality Gates\n- All changes must pass Constitution checks\n- Mutation testing required for complex changes\n- Evidence required for verification\n\n### Commands\n- \`stdd status\` - Check project status\n- \`stdd dashboard open\` - View dashboard\n- \`stdd story board\` - View agile board\n`,
    },
    generate(cwd, projectName, stddDir) {
      const rules = this.templates['.cursorrules'](stddDir, projectName);
      fs.writeFileSync(path.join(cwd, '.cursorrules'), rules, 'utf8');
      return ['.cursorrules'];
    },
  },
  'windsurf': {
    name: 'Windsurf',
    id: 'windsurf',
    templates: {
      '.windsurfrules': (stddDir, projectName) => `# ${projectName} - Windsurf Rules\n\n## STDD Workflow\nFollow the STDD lifecycle for all changes.\nUse \`stdd status\` and \`stdd dashboard\` to track progress.\n`,
    },
    generate(cwd, projectName, stddDir) {
      const rules = this.templates['.windsurfrules'](stddDir, projectName);
      fs.writeFileSync(path.join(cwd, '.windsurfrules'), rules, 'utf8');
      return ['.windsurfrules'];
    },
  },
  'vscode': {
    name: 'VS Code (Copilot)',
    id: 'vscode',
    configDir: '.vscode',
    templates: {
      'settings.json': () => JSON.stringify({
        'github.copilot.chat.codeGeneration.instructions': [
          { text: 'Follow STDD Copilot Ultra workflow: propose -> clarify -> spec -> plan -> apply -> verify -> archive' },
          { text: 'Run `stdd verify` before committing changes' },
          { text: 'Use `stdd constitution` for quality gate checks' },
        ],
      }, null, 2),
    },
    generate(cwd) {
      const dir = path.join(cwd, '.vscode');
      fs.mkdirSync(dir, { recursive: true });
      const settings = this.templates['settings.json']();
      // Merge with existing settings
      const settingsPath = path.join(dir, 'settings.json');
      let existing = {};
      try { existing = JSON.parse(fs.readFileSync(settingsPath, 'utf8')); } catch (_) {}
      const merged = { ...existing, ...JSON.parse(settings) };
      fs.writeFileSync(settingsPath, JSON.stringify(merged, null, 2), 'utf8');
      return ['.vscode/settings.json'];
    },
  },
};

function generateForIDE(ide, cwd, projectName, stddDir) {
  const adapter = ADAPTERS[ide];
  if (!adapter) throw new Error('Unknown IDE: ' + ide + '. Available: ' + Object.keys(ADAPTERS).join(', '));
  return adapter.generate(cwd, projectName, stddDir);
}

function generateAll(cwd, projectName, stddDir) {
  const results = {};
  for (const [ide, adapter] of Object.entries(ADAPTERS)) {
    try {
      results[ide] = adapter.generate(cwd, projectName, stddDir);
    } catch (e) {
      results[ide] = { error: e.message };
    }
  }
  return results;
}

function listAdapters() {
  return Object.entries(ADAPTERS).map(([id, a]) => ({ id, name: a.name }));
}

module.exports = { ADAPTERS, generateForIDE, generateAll, listAdapters };
