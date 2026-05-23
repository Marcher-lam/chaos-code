/**
 * Spec Generator
 * Auto-generate BDD *.feature files from tasks.md
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { resolveWorkspace } = require('../../utils/workspace-detector');
const { resolveChangeDir } = require('../../utils/change-utils');
const { toSafeFilename: _toSafe, toTitleCase: _toTitle, workspaceContext: _wsCtx } = require('../../utils/change-helpers');

class SpecGenerator {
  constructor() {
    this.keywordTemplates = this._loadTemplates();
    this.defaultTemplate = {
      feature: 'Feature',
      given: [
        'Given the system is ready'
      ],
      when: [
        'When the user performs the action'
      ],
      then: [
        'Then the result is expected'
      ]
    };
  }

  _loadTemplates() {
    const yaml = require('js-yaml');
    const path = require('path');
    // Try project-local templates first, then fallback to built-in
    const localPath = path.join(process.cwd(), 'stdd', 'templates', 'bdd-templates.yaml');
    const builtinPath = path.join(__dirname, '..', '..', '..', 'stdd', 'templates', 'bdd-templates.yaml');
    for (const p of [localPath, builtinPath]) {
      try {
        if (require('fs').existsSync(p)) {
          const content = require('fs').readFileSync(p, 'utf8');
          return yaml.load(content) || {};
        }
      } catch (_) { /* ignore */ }
    }
    // Fallback minimal templates
    return {
      login: { feature: 'User Login', given: ['Given a valid user exists'], when: ['When the user authenticates'], then: ['Then access is granted'] },
      create: { feature: 'Create Resource', given: ['Given the user is authenticated'], when: ['When valid data is submitted'], then: ['Then the resource is created'] },
    };
  }

  async ensureChangesDir(changeName) {
    const changesDir = path.join(process.cwd(), 'stdd', 'changes');
    try {
      await fs.access(changesDir);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('STDD not initialized. Run `stdd init` first.');
      }
      throw error;
    }

    const changeDir = resolveChangeDir(path.join(process.cwd(), 'stdd'), changeName, { mustExist: false });
    try {
      await fs.access(changeDir);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Change '${changeName}' does not exist in stdd/changes/.`);
      }
      throw error;
    }

    return changeDir;
  }

  parseTasks(content) {
    const tasks = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const match = line.match(/- \[[ xX]\]\s*(TASK-\d+):\s*(.+)/);
      if (match) {
        tasks.push({
          id: match[1],
          description: match[2].trim()
        });
      }
    }

    return tasks;
  }


  toFeatureTitle(str) {
    return str
      .trim()
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  matchTemplate(description) {
    const lower = description.toLowerCase();
    for (const [keyword, template] of Object.entries(this.keywordTemplates)) {
      if (lower.includes(keyword)) {
        return template;
      }
    }
    return null;
  }

  generateFeatureContent(task, workspace = null) {
    const template = this.matchTemplate(task.description);
    const featureTitle = this.toFeatureTitle(task.description);
    const scenarioTitle = featureTitle;
    const workspaceMeta = _wsCtx(workspace);

    let givenSteps;
    let whenSteps;
    let thenSteps;

    if (template) {
      givenSteps = template.given;
      whenSteps = template.when;
      thenSteps = template.then;
    } else {
      givenSteps = this.defaultTemplate.given;
      whenSteps = this.defaultTemplate.when;
      thenSteps = this.defaultTemplate.then;
    }

    const stripKeyword = (s) => s.replace(/^(Given|When|Then|And)\s+/, '');
    const givenLines = givenSteps.map((s, i) => i === 0 ? `  Given ${stripKeyword(s)}` : `  And ${stripKeyword(s)}`).join('\n');
    const whenLines = whenSteps.map((s, i) => i === 0 ? `  When ${stripKeyword(s)}` : `  And ${stripKeyword(s)}`).join('\n');
    const thenLines = thenSteps.map((s, i) => i === 0 ? `  Then ${stripKeyword(s)}` : `  And ${stripKeyword(s)}`).join('\n');

    const metadataLines = [`# Task: ${task.id} - ${task.description}`];
    if (workspaceMeta) metadataLines.push(`# Workspace: ${workspaceMeta.path}`);
    const tags = [`@${task.id.toLowerCase()}`];
    if (workspaceMeta) tags.push(`@workspace:${workspaceMeta.tag}`);

    return `${metadataLines.join('\n')}

Feature: ${featureTitle}
  As a user
  I want to ${task.description.toLowerCase()}
  So that I can achieve my goal

  ${tags.join(' ')}
  Scenario: ${scenarioTitle}
${givenLines}
${whenLines}
${thenLines}
`;
  }

  async execute(changeName, options = {}) {
    const result = await this.generateFromTasks(changeName, options);
    if (result.generated.length > 0) {
      console.log(`Generated ${result.generated.length} spec(s) for '${changeName}'.`);
    }
    if (result.skipped.length > 0) {
      console.log(`Skipped ${result.skipped.length} existing spec(s).`);
    }
    return result;
  }

  async generateFromTasks(changeName, options = {}) {
    const changeDir = await this.ensureChangesDir(changeName);
    const workspace = options.workspace ? resolveWorkspace(process.cwd(), options.workspace) : null;
    if (options.workspace && !workspace) {
      throw new Error(`Workspace '${options.workspace}' not found.`);
    }
    const workspaceMeta = _wsCtx(workspace);
    const tasksPath = path.join(changeDir, 'tasks.md');

    let tasksContent;
    try {
      tasksContent = await fs.readFile(tasksPath, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`tasks.md not found in change '${changeName}'.`);
      }
      throw error;
    }

    const tasks = this.parseTasks(tasksContent);
    if (tasks.length === 0) {
      throw new Error(`No tasks found in tasks.md for change '${changeName}'.`);
    }

    const specsDir = path.join(changeDir, 'specs');
    await fs.mkdir(specsDir, { recursive: true });

    const generated = [];
    const skipped = [];

    for (const task of tasks) {
      const baseFilename = _toSafe(task.description);
      const filename = workspaceMeta ? `${workspaceMeta.tag}-${baseFilename}` : baseFilename;
      const featurePath = path.join(specsDir, `${filename}.feature`);

      if (fsSync.existsSync(featurePath)) {
        skipped.push({
          id: task.id,
          description: task.description,
          file: `${filename}.feature`
        });
        continue;
      }

      const content = this.generateFeatureContent(task, workspace);
      await fs.writeFile(featurePath, content, 'utf8');
      generated.push({
        id: task.id,
        description: task.description,
        file: `${filename}.feature`
      });
    }

    return { generated, skipped, workspace: workspaceMeta };
  }
}

module.exports = { SpecGenerator };
