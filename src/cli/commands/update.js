/**
 * Update Command
 * Safe update mechanism for STDD Copilot files in a project
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const yaml = require('js-yaml');
const { getPackageRoot } = require('../../utils/path-resolver');
const { detectWorkspaces } = require('../../utils/workspace-detector');
const chalk = require('chalk');

const enginesConfig = require('../../config/engines.json');

class UpdateCommand {
  constructor(spinner) {
    this.spinner = spinner || { text: '', start() {}, stop() {}, succeed() {}, fail() {} };
    this.report = this.createReport();
  }

  async execute(targetPath, options = {}) {
    this.report = this.createReport();
    this.options = options;
    const stddDir = path.join(targetPath, 'stdd');

    if (!await this.exists(stddDir)) {
      throw new Error('STDD not initialized. Run `stdd init` first.');
    }

    if (options.dryRun) {
      console.log(chalk.yellow('\n=== DRY RUN - no files will be modified ===\n'));
    }

    this.spinner.text = 'Scanning engine commands...';
    this.report.engineCommands = await this.updateEngineCommands(targetPath, options);

    this.spinner.text = 'Scanning skills...';
    this.report.skills = await this.updateSkills(targetPath, options);

    this.spinner.text = 'Scanning schemas...';
    this.report.schemas = await this.updateSchemas(targetPath, options);

    this.spinner.text = 'Scanning GitHub templates...';
    this.report.githubTemplates = await this.updateGitHubTemplates(targetPath, options);

    this.spinner.text = 'Checking config.yaml...';
    this.report.config = await this.updateConfig(targetPath, options);

    this.printSummary();

    if (this.report.errors.length > 0) {
      throw new Error(`Update completed with ${this.report.errors.length} error(s).`);
    }

    if (!options.dryRun) {
      console.log(chalk.green('\n✅ STDD Copilot updated!'));
    } else {
      console.log(chalk.yellow('\n✅ Dry run complete. No files were modified.'));
    }
  }

  createReport() {
    return {
      engineCommands: { updated: 0, skipped: 0, added: 0, localChanges: 0, targetsVisited: 0, targetsMissing: 0 },
      skills: { updated: 0, skipped: 0, added: 0, localChanges: 0, targetsVisited: 0, targetsMissing: 0 },
      schemas: { updated: 0, skipped: 0, added: 0, localChanges: 0 },
      githubTemplates: { updated: 0, skipped: 0, added: 0, localChanges: 0 },
      config: { merged: false, added: [], skipped: [] },
      errors: [],
      filesUpdated: [],
      filesSkipped: [],
      filesAdded: [],
      filesLocalChanges: []
    };
  }

  addError(scope, message, error, filePath = null) {
    this.report.errors.push({
      scope,
      message,
      filePath,
      error: error?.message || 'Unknown error'
    });
  }

  printSummary() {
    const { engineCommands, skills, schemas, githubTemplates, config, errors, filesUpdated, filesSkipped, filesAdded, filesLocalChanges } = this.report;

    console.log(chalk.bold('\n📊 Update summary'));

    console.log(
      `  Engine commands: updated ${chalk.cyan(engineCommands.updated)}, ` +
      `added ${chalk.green(engineCommands.added)}, ` +
      `skipped ${chalk.yellow(engineCommands.skipped)}, ` +
      `local changes ${chalk.red(engineCommands.localChanges)}`
    );

    console.log(
      `  Skills: updated ${chalk.cyan(skills.updated)}, ` +
      `added ${chalk.green(skills.added)}, ` +
      `skipped ${chalk.yellow(skills.skipped)}, ` +
      `local changes ${chalk.red(skills.localChanges)}`
    );

    console.log(
      `  Schemas: updated ${chalk.cyan(schemas.updated)}, ` +
      `added ${chalk.green(schemas.added)}, ` +
      `skipped ${chalk.yellow(schemas.skipped)}, ` +
      `local changes ${chalk.red(schemas.localChanges)}`
    );

    console.log(
      `  GitHub templates: updated ${chalk.cyan(githubTemplates.updated)}, ` +
      `added ${chalk.green(githubTemplates.added)}, ` +
      `skipped ${chalk.yellow(githubTemplates.skipped)}, ` +
      `local changes ${chalk.red(githubTemplates.localChanges)}`
    );

    if (config.merged) {
      console.log(chalk.green(`  Config: merged ${config.added.length} new field(s)`));
      if (config.added.includes('workspace registry')) {
        console.log(chalk.green('  Workspace registry: updated'));
      } else if (config.added.includes('workspace registry would update')) {
        console.log(chalk.yellow('  Workspace registry: would update'));
      }
    } else if (config.skipped.length > 0) {
      console.log(chalk.yellow(`  Config: skipped (${config.skipped.join(', ')})`));
    }

    if (this.options.dryRun) {
      this.printChangeDetails(filesUpdated, filesAdded, filesSkipped, filesLocalChanges);
    }

    if (errors.length > 0) {
      console.log(chalk.red(`  Errors: ${errors.length}`));
      errors.slice(0, 5).forEach((entry, index) => {
        const fileHint = entry.filePath ? ` (${entry.filePath})` : '';
        console.log(chalk.red(`    ${index + 1}. [${entry.scope}] ${entry.message}${fileHint}`));
        console.log(chalk.red(`       ${entry.error}`));
      });
      if (errors.length > 5) {
        console.log(chalk.red(`    ...and ${errors.length - 5} more`));
      }
    }

    if (filesLocalChanges.length > 0 && !this.options.force && !this.options.dryRun) {
      console.log(chalk.yellow(`\n⚠️  ${filesLocalChanges.length} file(s) skipped due to local modifications.`));
      console.log(chalk.yellow('   Use --force to overwrite them.'));
    }
  }

  printChangeDetails(updated, added, skipped, localChanges) {
    if (added.length > 0) {
      console.log(chalk.green('\n  Added:'));
      added.forEach(f => console.log(`    + ${f}`));
    }
    if (updated.length > 0) {
      console.log(chalk.cyan('\n  Updated:'));
      updated.forEach(f => console.log(`    ~ ${f}`));
    }
    if (localChanges.length > 0) {
      console.log(chalk.red('\n  Skipped (Local changes):'));
      localChanges.forEach(f => console.log(`    ! ${f}`));
    }
  }

  async exists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  hashContent(content) {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  async detectEngineDirs(targetPath) {
    const engines = enginesConfig.engines.map(e => e.value);
    const found = [];
    for (const engine of engines) {
      const engineDir = path.join(targetPath, engine);
      if (await this.exists(engineDir)) {
        found.push(engine);
      }
    }
    return found;
  }

  async updateEngineCommands(targetPath, options = {}) {
    const summary = { updated: 0, skipped: 0, added: 0, localChanges: 0, targetsVisited: 0, targetsMissing: 0 };
    const sourceDir = path.join(getPackageRoot(), 'src', 'templates', 'commands');

    if (!await this.exists(sourceDir)) {
      this.addError('engine-commands', 'Source template command directory not found', null, sourceDir);
      return summary;
    }

    const engineDirs = await this.detectEngineDirs(targetPath);
    if (engineDirs.length === 0) {
      return summary;
    }

    for (const engine of engineDirs) {
      const targetDir = path.join(targetPath, engine, 'commands', 'stdd');

      const result = await this.syncDirectory(sourceDir, targetDir, {
        force: options.force,
        dryRun: options.dryRun,
        extensions: ['.md'],
        scope: `engine-commands:${engine}`
      });

      summary.updated += result.updated;
      summary.skipped += result.skipped;
      summary.added += result.added;
      summary.localChanges += result.localChanges;
      summary.targetsVisited++;

      this.report.filesUpdated.push(...result.filesUpdated);
      this.report.filesAdded.push(...result.filesAdded);
      this.report.filesSkipped.push(...result.filesSkipped);
      this.report.filesLocalChanges.push(...result.filesLocalChanges);
    }

    return summary;
  }

  async updateSkills(targetPath, options = {}) {
    const summary = { updated: 0, skipped: 0, added: 0, localChanges: 0, targetsVisited: 0, targetsMissing: 0 };
    const sourceDir = path.join(getPackageRoot(), 'src', 'templates', 'skills');

    if (!await this.exists(sourceDir)) {
      this.addError('skills', 'Source skills directory not found', null, sourceDir);
      return summary;
    }

    const engineDirs = await this.detectEngineDirs(targetPath);
    if (engineDirs.length === 0) {
      return summary;
    }

    const stddSubdir = path.join(sourceDir, 'stdd');
    const effectiveSourceDir = await this.exists(stddSubdir) ? stddSubdir : sourceDir;

    for (const engine of engineDirs) {
      const targetDir = path.join(targetPath, engine, 'skills', 'stdd');

      const result = await this.syncSkillsDirectory(effectiveSourceDir, targetDir, {
        force: options.force,
        dryRun: options.dryRun,
        scope: `skills:${engine}:stdd`
      });

      summary.updated += result.updated;
      summary.skipped += result.skipped;
      summary.added += result.added;
      summary.localChanges += result.localChanges;
      summary.targetsVisited++;

      this.report.filesUpdated.push(...result.filesUpdated);
      this.report.filesAdded.push(...result.filesAdded);
      this.report.filesSkipped.push(...result.filesSkipped);
      this.report.filesLocalChanges.push(...result.filesLocalChanges);
    }

    return summary;
  }

  async syncSkillsDirectory(sourceDir, targetDir, options = {}) {
    const { force = false, dryRun = false, scope = 'sync' } = options;
    const result = { updated: 0, skipped: 0, added: 0, localChanges: 0, filesUpdated: [], filesAdded: [], filesSkipped: [], filesLocalChanges: [] };

    const entries = await fs.readdir(sourceDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const skillName = entry.name;
      const sourceSkillDir = path.join(sourceDir, skillName);
      const targetSkillDir = path.join(targetDir, skillName);

      const skillFiles = await this.collectFiles(sourceSkillDir);

      for (const srcFile of skillFiles) {
        const relativePath = path.relative(sourceSkillDir, srcFile);
        const targetFile = path.join(targetSkillDir, relativePath);
        const displayPath = `${scope}/${skillName}/${relativePath}`;

        const targetExists = await this.exists(targetFile);

        if (!targetExists) {
          if (!dryRun) {
            await fs.mkdir(path.dirname(targetFile), { recursive: true });
            try {
              const content = await fs.readFile(srcFile, 'utf-8');
              await fs.writeFile(targetFile, content);
              result.added++;
              result.filesAdded.push(displayPath);
            } catch (error) {
              this.addError(scope, `Failed to add file '${relativePath}'`, error, targetFile);
            }
          } else {
            result.added++;
            result.filesAdded.push(displayPath);
          }
          continue;
        }

        const srcContent = await fs.readFile(srcFile, 'utf-8');
        const targetContent = await fs.readFile(targetFile, 'utf-8');

        if (this.hashContent(srcContent) === this.hashContent(targetContent)) {
          result.skipped++;
          result.filesSkipped.push(displayPath);
          continue;
        }

        if (!force) {
          result.localChanges++;
          result.filesLocalChanges.push(displayPath);
          continue;
        }

        if (!dryRun) {
          try {
            await fs.writeFile(targetFile, srcContent);
            result.updated++;
            result.filesUpdated.push(displayPath);
          } catch (error) {
            this.addError(scope, `Failed to update file '${relativePath}'`, error, targetFile);
          }
        } else {
          result.updated++;
          result.filesUpdated.push(displayPath);
        }
      }
    }

    return result;
  }

  async syncDirectory(sourceDir, targetDir, options = {}) {
    const { force = false, dryRun = false, extensions = null, scope = 'sync', transformContent = null } = options;
    const result = { updated: 0, skipped: 0, added: 0, localChanges: 0, filesUpdated: [], filesAdded: [], filesSkipped: [], filesLocalChanges: [] };

    const files = await this.collectFiles(sourceDir);

    for (const srcFile of files) {
      if (extensions && !extensions.includes(path.extname(srcFile))) {
        continue;
      }

      const relativePath = path.relative(sourceDir, srcFile);
      const targetFile = path.join(targetDir, relativePath);
      const displayPath = `${scope}/${relativePath}`;

      const targetExists = await this.exists(targetFile);

      if (!targetExists) {
        if (!dryRun) {
          await fs.mkdir(path.dirname(targetFile), { recursive: true });
          try {
            let content = await fs.readFile(srcFile, 'utf-8');
            if (transformContent) content = transformContent(content, relativePath);
            await fs.writeFile(targetFile, content);
            result.added++;
            result.filesAdded.push(displayPath);
          } catch (error) {
            this.addError(scope, `Failed to add file '${relativePath}'`, error, targetFile);
          }
        } else {
          result.added++;
          result.filesAdded.push(displayPath);
        }
        continue;
      }

      let srcContent = await fs.readFile(srcFile, 'utf-8');
      if (transformContent) srcContent = transformContent(srcContent, relativePath);
      const targetContent = await fs.readFile(targetFile, 'utf-8');

      if (this.hashContent(srcContent) === this.hashContent(targetContent)) {
        result.skipped++;
        result.filesSkipped.push(displayPath);
        continue;
      }

      if (!force) {
        result.localChanges++;
        result.filesLocalChanges.push(displayPath);
        continue;
      }

      if (!dryRun) {
        try {
          await fs.writeFile(targetFile, srcContent);
          result.updated++;
          result.filesUpdated.push(displayPath);
        } catch (error) {
          this.addError(scope, `Failed to sync file '${relativePath}'`, error, targetFile);
        }
      } else {
        result.updated++;
        result.filesUpdated.push(displayPath);
      }
    }

    return result;
  }

  async collectFiles(dir) {
    const files = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...await this.collectFiles(fullPath));
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
    return files;
  }

  async updateSchemas(targetPath, options = {}) {
    const summary = { updated: 0, skipped: 0, added: 0, localChanges: 0 };
    const sourceSchema = path.join(getPackageRoot(), 'schemas');
    const targetSchema = path.join(targetPath, 'schemas');

    if (!await this.exists(sourceSchema)) {
      this.addError('schemas', 'Source schema directory not found', null, sourceSchema);
      return summary;
    }

    const result = await this.syncDirectory(sourceSchema, targetSchema, {
      force: options.force,
      dryRun: options.dryRun,
      scope: 'schemas'
    });

    summary.updated = result.updated;
    summary.skipped = result.skipped;
    summary.added = result.added;
    summary.localChanges = result.localChanges;

    this.report.filesUpdated.push(...result.filesUpdated);
    this.report.filesAdded.push(...result.filesAdded);
    this.report.filesSkipped.push(...result.filesSkipped);
    this.report.filesLocalChanges.push(...result.filesLocalChanges);

    return summary;
  }

  async updateGitHubTemplates(targetPath, options = {}) {
    const summary = { updated: 0, skipped: 0, added: 0, localChanges: 0 };
    const sourceDir = path.join(getPackageRoot(), 'src', 'templates', 'github');
    const targetDir = path.join(targetPath, '.github');
    const workspaces = detectWorkspaces(targetPath, { refresh: true });

    if (!await this.exists(sourceDir)) {
      this.addError('github-templates', 'Source GitHub templates directory not found', null, sourceDir);
      return summary;
    }

    const result = await this.syncDirectory(sourceDir, targetDir, {
      force: options.force,
      dryRun: options.dryRun,
      extensions: ['.md'],
      scope: 'github-templates',
      transformContent: content => this.renderGitHubTemplate(content, targetPath, workspaces)
    });

    summary.updated = result.updated;
    summary.skipped = result.skipped;
    summary.added = result.added;
    summary.localChanges = result.localChanges;

    this.report.filesUpdated.push(...result.filesUpdated);
    this.report.filesAdded.push(...result.filesAdded);
    this.report.filesSkipped.push(...result.filesSkipped);
    this.report.filesLocalChanges.push(...result.filesLocalChanges);

    return summary;
  }

  formatAffectedWorkspaces(workspaces = [], targetPath = process.cwd()) {
    if (!workspaces.length) {
      return [
        '- [ ] packages/api',
        '- [ ] apps/web',
        '- [ ] root/shared'
      ].join('\n');
    }

    return workspaces
      .map(workspace => `- [ ] ${this.relativePath(targetPath, workspace.root)}`)
      .join('\n');
  }

  renderGitHubTemplate(content, targetPath, workspaces = []) {
    const workspaceBlock = this.formatAffectedWorkspaces(workspaces, targetPath);
    return content.replace(
      /(<!-- STDD:WORKSPACES:start -->)([\s\S]*?)(<!-- STDD:WORKSPACES:end -->)/,
      `$1\n${workspaceBlock}\n$3`
    );
  }

  async updateConfig(targetPath, options = {}) {
    const result = { merged: false, added: [], skipped: [] };
    const configPath = path.join(targetPath, 'stdd', 'config.yaml');
    const defaultConfigPath = path.join(getPackageRoot(), 'stdd', 'config.yaml');

    if (!await this.exists(configPath)) {
      if (!await this.exists(defaultConfigPath)) {
        return result;
      }
      if (!options.dryRun) {
        try {
          const content = await fs.readFile(defaultConfigPath, 'utf-8');
          await fs.writeFile(configPath, content);
          result.merged = true;
          result.added.push('config.yaml created from defaults');
        } catch (error) {
          this.addError('config', 'Failed to create config.yaml', error, configPath);
        }
      } else {
        result.merged = true;
        result.added.push('config.yaml would be created from defaults');
      }
      return result;
    }

    if (!await this.exists(defaultConfigPath)) {
      result.skipped.push('default config.yaml not found');
      return result;
    }

    try {
      const userConfig = await fs.readFile(configPath, 'utf-8');
      const defaultConfig = await fs.readFile(defaultConfigPath, 'utf-8');
      let merged = this.mergeYamlConfig(userConfig, defaultConfig);
      const workspaceResult = this.mergeWorkspaceRegistry(merged, targetPath);
      merged = workspaceResult.content;

      if (merged !== userConfig) {
        if (!options.dryRun) {
          await fs.writeFile(configPath, merged);
          result.merged = true;
          result.added = this.detectNewYamlKeys(merged, userConfig);
          if (workspaceResult.changed) result.added.push('workspace registry');
        } else {
          result.merged = true;
          result.added = this.detectNewYamlKeys(merged, userConfig);
          if (workspaceResult.changed) result.added.push('workspace registry would update');
        }
      } else {
        result.skipped.push('config.yaml already up to date');
      }
    } catch (error) {
      this.addError('config', 'Failed to merge config.yaml', error, configPath);
    }

    return result;
  }

  mergeYamlConfig(userConfig, defaultConfig) {
    const userKeys = new Set();
    for (const line of userConfig.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes(':')) {
        const key = trimmed.split(':')[0].trim();
        if (key) userKeys.add(key);
      }
    }

    const newLines = [];
    for (const line of defaultConfig.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes(':')) {
        const key = trimmed.split(':')[0].trim();
        if (key && !userKeys.has(key)) {
          newLines.push(line);
        }
      }
    }

    if (newLines.length === 0) {
      return userConfig;
    }

    let merged = userConfig;
    if (!merged.endsWith('\n')) merged += '\n';
    merged += '\n# Added by stdd update\n';
    merged += newLines.join('\n') + '\n';

    return merged;
  }

  mergeWorkspaceRegistry(configContent, targetPath) {
    const detectedWorkspaces = detectWorkspaces(targetPath, { refresh: true });
    if (detectedWorkspaces.length === 0) {
      return { content: configContent, changed: false };
    }

    const config = yaml.load(configContent) || {};
    const existingWorkspaces = config.workspaces && typeof config.workspaces === 'object'
      ? config.workspaces
      : {};
    const existingItems = Array.isArray(existingWorkspaces.items) ? existingWorkspaces.items : [];
    const mergedItems = existingItems.map(item => ({ ...item }));
    const index = new Map();

    mergedItems.forEach((item, itemIndex) => {
      if (item && item.name) index.set(`name:${item.name}`, itemIndex);
      if (item && item.root) index.set(`root:${item.root}`, itemIndex);
    });

    for (const workspace of detectedWorkspaces) {
      const standardItem = this.workspaceToRegistryItem(targetPath, workspace);
      const itemIndex = index.has(`name:${standardItem.name}`)
        ? index.get(`name:${standardItem.name}`)
        : index.get(`root:${standardItem.root}`);

      if (itemIndex === undefined) {
        index.set(`name:${standardItem.name}`, mergedItems.length);
        index.set(`root:${standardItem.root}`, mergedItems.length);
        mergedItems.push(standardItem);
      } else {
        mergedItems[itemIndex] = {
          ...mergedItems[itemIndex],
          ...standardItem,
        };
      }
    }

    const nextBlock = this.renderWorkspaceRegistryBlock({
      ...existingWorkspaces,
      enabled: true,
      items: mergedItems,
    });
    const nextContent = this.replaceWorkspaceRegistryBlock(configContent, nextBlock);
    return {
      content: nextContent,
      changed: nextContent !== configContent,
    };
  }

  workspaceToRegistryItem(targetPath, workspace) {
    return {
      name: workspace.name,
      root: this.relativePath(targetPath, workspace.root),
      source_root: this.relativePath(targetPath, workspace.sourceDir),
      package_json: this.relativePath(targetPath, workspace.packageJsonPath),
    };
  }

  relativePath(basePath, absolutePath) {
    return path.relative(basePath, absolutePath).replace(/\\/g, '/');
  }

  renderWorkspaceRegistryBlock(workspaces) {
    const lines = [
      'workspaces:',
      `  enabled: ${workspaces.enabled !== false ? 'true' : 'false'}`,
      '  items:'
    ];

    for (const item of workspaces.items || []) {
      const customKeys = Object.keys(item).filter(key => !['name', 'root', 'source_root', 'package_json'].includes(key));
      lines.push(`    - name: "${item.name}"`);
      lines.push(`      root: "${item.root}"`);
      lines.push(`      source_root: "${item.source_root}"`);
      lines.push(`      package_json: "${item.package_json}"`);
      for (const key of customKeys) {
        lines.push(`      ${key}: ${this.formatYamlScalar(item[key])}`);
      }
    }

    return `${lines.join('\n')}\n`;
  }

  replaceWorkspaceRegistryBlock(configContent, nextBlock) {
    const lines = configContent.split('\n');
    const start = lines.findIndex(line => /^workspaces:\s*$/.test(line));
    if (start === -1) {
      const separator = configContent.endsWith('\n') ? '\n' : '\n\n';
      return `${configContent}${separator}# Monorepo Workspace Registry\n${nextBlock}`;
    }

    let end = start + 1;
    while (end < lines.length) {
      const line = lines[end];
      if (line.trim() && !line.startsWith(' ') && !line.startsWith('\t') && !line.trim().startsWith('#')) {
        break;
      }
      end++;
    }

    const before = lines.slice(0, start).join('\n');
    const after = lines.slice(end).join('\n');
    return `${before}${before ? '\n' : ''}${nextBlock}${after ? after : ''}`;
  }

  formatYamlScalar(value) {
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return String(value);
    if (value === null || value === undefined) return 'null';
    return String(value).match(/^[A-Za-z0-9_./@-]+$/) ? String(value) : JSON.stringify(String(value));
  }

  detectNewYamlKeys(merged, original) {
    const originalLines = new Set(original.split('\n').map(l => l.trim()));
    const newKeys = [];
    for (const line of merged.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes(':')) {
        const key = trimmed.split(':')[0].trim();
        if (key && !originalLines.has(trimmed)) {
          newKeys.push(key);
        }
      }
    }
    return [...new Set(newKeys)];
  }
}

module.exports = { UpdateCommand };
