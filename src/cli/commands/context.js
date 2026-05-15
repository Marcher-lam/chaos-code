const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const { execSync } = require('child_process');
const { MemoryScanner } = require('./memory-scan');
const { resolveWorkspace } = require('../../utils/workspace-detector');
const { workspaceToScope } = require('../../utils/workspace-scope');

const LAYERS = ['foundation', 'components', 'contracts'];

const CLIP_COMMANDS = {
  darwin: 'pbcopy',
  win32: 'clip',
  linux: 'xclip -selection clipboard',
};

class ContextCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.memoryDir = path.join(this.cwd, 'stdd', 'memory');
  }

  async execute(options = {}) {
    const workspace = await this.resolveWorkspaceOption(options);
    if (workspace && workspace.status === 'error') return workspace;
    const scopedOptions = { ...options, workspace };

    if (options.mode === 'export') {
      return this.executeExport(scopedOptions);
    }
    const layer = options.layer || null;
    const jsonOutput = options.json || false;

    if (layer && !LAYERS.includes(layer)) {
      throw new Error(`Unknown layer '${layer}'. Valid layers: ${LAYERS.join(', ')}`);
    }

    const layers = layer ? [layer] : LAYERS;

    if (jsonOutput) {
      await this.printJson(layers, workspace);
    } else {
      await this.printMarkdown(layers, workspace);
    }
  }

  async resolveWorkspaceOption(options = {}) {
    if (!options.workspace) return null;
    if (typeof options.workspace === 'object') return options.workspace;

    const workspace = resolveWorkspace(this.cwd, options.workspace);
    if (!workspace) {
      const errorResult = {
        status: 'error',
        error: `Workspace '${options.workspace}' not found.`,
        workspace: null,
      };

      if (options.json || options.format === 'json') {
        const outputStr = JSON.stringify(errorResult, null, 2);
        if (options.mode === 'export') {
          process.stdout.write(outputStr);
        } else {
          console.log(outputStr);
        }
        return errorResult;
      }

      throw new Error(errorResult.error);
    }

    return workspace;
  }

  async executeExport(options = {}) {
    const format = options.format || 'markdown';
    const output = options.output || null;
    const copy = options.copy || false;

    const layers = options.workspace ? { workspace: workspaceToScope(this.cwd, options.workspace) } : {};
    for (const layer of LAYERS) {
      const content = await this.readLayer(layer, options.workspace || null);
      if (content !== null) {
        layers[layer] = content;
      }
    }

    let outputStr;
    if (format === 'json') {
      outputStr = JSON.stringify(layers, null, 2);
    } else {
      const sections = [];
      const titles = { foundation: 'Foundation', components: 'Components', contracts: 'Contracts' };
      let index = 0;
      for (const layer of LAYERS) {
        if (layers[layer] !== undefined) {
          sections.push(`## ${index + 1}. ${titles[layer]}\n${layers[layer]}`);
          index++;
        }
      }
      const title = options.workspace ? `# Workspace Context: ${layers.workspace.name}\n\nWorkspace: ${layers.workspace.path}` : '# Project Context';
      outputStr = `${title}\n\n${sections.join('\n\n')}`;
    }

    if (copy) {
      const clipCmd = CLIP_COMMANDS[process.platform];
      if (clipCmd) {
        try {
          execSync(clipCmd, { input: outputStr, timeout: 3000 });
          console.error(`✓ Copied to clipboard (${process.platform})`);
        } catch (err) {
          console.error(chalk.yellow(`⚠ Clipboard copy failed on ${process.platform}. Try: echo '...' | ${clipCmd}`));
          process.stdout.write(outputStr);
          return outputStr;
        }
      } else {
        console.error(chalk.yellow(`⚠ Clipboard not supported on ${process.platform}. Output to stdout instead.`));
        process.stdout.write(outputStr);
        return outputStr;
      }
    } else if (output) {
      const outPath = path.resolve(output);
      await fs.writeFile(outPath, outputStr, 'utf-8');
      console.error(`✓ Written to ${outPath}`);
    } else {
      process.stdout.write(outputStr);
    }

    return outputStr;
  }

  async printJson(layers, workspace = null) {
    const result = workspace ? { workspace: workspaceToScope(this.cwd, workspace) } : {};
    for (const layer of layers) {
      const content = await this.readLayer(layer, workspace);
      if (content !== null) {
        result[layer] = content;
      }
    }
    console.log(JSON.stringify(result, null, 2));
  }

  async printMarkdown(layers, workspace = null) {
    if (workspace) {
      const scope = workspaceToScope(this.cwd, workspace);
      console.log(chalk.dim(`Workspace: ${scope.name} (${scope.path})`));
    }

    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const content = await this.readLayer(layer, workspace);
      if (content === null) continue;
      if (i > 0) console.log('');
      console.log(chalk.bold(`\n--- [${layer.charAt(0).toUpperCase() + layer.slice(1)}] ---\n`));
      console.log(content);
    }
  }

  async readLayer(layer, workspace = null) {
    if (workspace) {
      return this.readWorkspaceLayer(layer, workspace);
    }

    const filePath = path.join(this.memoryDir, `${layer}.md`);
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async readWorkspaceLayer(layer, workspace) {
    if (layer === 'foundation') return this.buildWorkspaceFoundation(workspace);

    const scanner = new MemoryScanner(this.cwd);
    const files = await scanner.findSourceFiles(workspace.root);
    if (layer === 'components') return scanner.generateComponentsMd(files);
    if (layer === 'contracts') return scanner.generateContractsMd(files);
    return null;
  }

  async buildWorkspaceFoundation(workspace) {
    const sections = [];
    const rootFoundation = await this.readLayer('foundation');
    if (rootFoundation !== null) sections.push(rootFoundation.trim());

    const scope = workspaceToScope(this.cwd, workspace);
    const pkg = await this.readPackageJson(workspace.packageJsonPath);
    const lines = [
      '# Workspace Foundation',
      '',
      `- Name: ${scope.name}`,
      `- Path: ${scope.path}`,
    ];

    if (pkg && pkg.version) lines.push(`- Version: ${pkg.version}`);
    if (pkg && pkg.description) lines.push(`- Description: ${pkg.description}`);
    const deps = pkg ? Object.keys({ ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }).sort() : [];
    if (deps.length > 0) lines.push(`- Dependencies: ${deps.join(', ')}`);

    sections.push(lines.join('\n'));
    return sections.join('\n\n');
  }

  async readPackageJson(filePath) {
    try {
      return JSON.parse(await fs.readFile(filePath, 'utf-8'));
    } catch (_) {
      return null;
    }
  }

  async getMissingLayers(layers) {
    const missing = [];
    for (const layer of layers) {
      const content = await this.readLayer(layer);
      if (content === null) {
        missing.push(layer);
      }
    }
    return missing;
  }

  static async readLayerByPath(memoryDir, layer) {
    const filePath = path.join(memoryDir, `${layer}.md`);
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }
}

module.exports = { ContextCommand };
