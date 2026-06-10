/**
 * Init Command
 * Initialize STDD Copilot in a project
 */

const fs = require('fs').promises;
const path = require('path');
const { getPackageRoot } = require('../../utils/path-resolver');
const { TechStackDetector } = require('../../utils/tech-stack-detector');
const { detectWorkspaces } = require('../../utils/workspace-detector');
const chalk = require('chalk');
const { createLogger } = require('../../utils/logger');
const logger = createLogger('init');

// Template files
const AGENTS_MD_TEMPLATE = `# STDD Copilot - AI Agent Instructions

> Version: 1.0 | Last Updated: ${new Date().toISOString().split('T')[0]}

## Overview

STDD Copilot (Spec + Test Driven Development) 是一个融合了 SDD 和 TDD 最佳实践的 AI 辅助开发框架。

## 核心原则

1. **Spec-First**: 需求规格是 Source of Truth
2. **Test-Driven**: Ralph Loop 5步 TDD 循环
3. **Delta Specs**: 增量式变更管理
4. **5-Level Defense**: 防跑偏机制

## 可用命令

在支持的 AI Code 终端（Claude Code, Qwen Code, Cursor 等）中使用以下斜杠命令：

| 命令 | 说明 |
|------|------|
| \`/stdd:init\` | 初始化 STDD 工作区 |
| \`/stdd:new\` | 创建新变更提案 |
| \`/stdd:explore\` | 探索需求 |
| \`/stdd:ff\` | 快速生成 |
| \`/stdd:continue\` | 继续工作 |
| \`/stdd:apply\` | 执行 TDD 循环 |
| \`/stdd:verify\` | 验证实现 |
| \`/stdd:archive\` | 归档变更 |
| \`/stdd:graph *\` | Graph 引擎 |

## 工作流程

\`\`\`
/stdd:new → /stdd:apply → /stdd:archive
\`\`\`

详见: https://github.com/Marcher-lam/chaos-code
`;

function formatWorkspaceRegistry(workspaces, targetPath) {
  if (!workspaces.length) return '';

  const lines = [
    '',
    '# Monorepo Workspace Registry',
    'workspaces:',
    '  enabled: true',
    '  items:'
  ];

  for (const workspace of workspaces) {
    const root = normalizeRelativePath(targetPath, workspace.root);
    const sourceRoot = normalizeRelativePath(targetPath, workspace.sourceDir);
    const packageJson = normalizeRelativePath(targetPath, workspace.packageJsonPath);
    lines.push(`    - name: "${workspace.name}"`);
    lines.push(`      root: "${root}"`);
    lines.push(`      source_root: "${sourceRoot}"`);
    lines.push(`      package_json: "${packageJson}"`);
  }

  return `${lines.join('\n')}\n`;
}

function normalizeRelativePath(basePath, absolutePath) {
  return path.relative(basePath, absolutePath).replace(/\\/g, '/');
}

function buildConfigYamlTemplate(projectName, techStack = {}, workspaces = [], targetPath = process.cwd()) {
  const language = techStack.language === 'unknown' ? '${LANGUAGE:-typescript}' : techStack.language;
  const testCommand = techStack.testCommand || '${TEST_COMMAND:-npm test}';
  return `# STDD Copilot Configuration
version: "1.0"
name: "${projectName}"

project:
  type: "\${PROJECT_TYPE:-${language}}"
  language: "${language}"

# Test Configuration
test:
  command: "${testCommand}"
  runner: "${techStack.testRunner || 'unknown'}"

# Graph Configuration
graph:
  max_parallel: 4
  timeout: 3600
  history_limit: 100

# TDD Configuration
tdd:
  ralph_loop:
    max_iterations: 10
    failure_threshold: 3
    auto_rollback: true

  mutation:
    enabled: true
    threshold: 80

# Defense Mechanisms
defense:
  confirm_gate:
    enabled: true

  micro_task:
    max_tasks: 6
    max_time_minutes: 30

  failure_rollback:
    threshold: 3

# Memory System
memory:
  enabled: true
  persist: true
${formatWorkspaceRegistry(workspaces, targetPath)}`;
}

const GITIGNORE_ENTRIES = `
# STDD Copilot
stdd/graph/cache/
stdd/memory/*.bin
stdd/evidence/
stdd/changes/*/evidence/
`;

const enginesConfig = require('../../config/engines.json');

class InitCommand {
  constructor(spinner) {
    this.spinner = spinner || { text: '', start() {}, stop() {}, succeed() {}, fail() {} };
  }

  getDefaultSelectedAgents() {
    const defaults = enginesConfig.engines.filter(e => e.checked).map(e => e.value);
    if (defaults.length > 0) {
      return defaults;
    }
    if (enginesConfig.engines[0]?.value) {
      return [enginesConfig.engines[0].value];
    }
    return ['.claude'];
  }

  shouldPromptForAgents(options = {}) {
    const nonInteractive = Boolean(options.yes || options.nonInteractive);
    return !nonInteractive && Boolean(process.stdin.isTTY && process.stdout.isTTY);
  }

  async execute(targetPath, options = {}) {
    // Check if already initialized
    const stddDir = path.join(targetPath, 'stdd');
    // Dynamic agent dirs

    // Check if already initialized
    const stddExists = await this.exists(stddDir);

    if (stddExists && !options.force) {
      throw new Error('STDD already initialized. Use --force to overwrite.');
    }

    // Detect tech stack
    this.spinner.text = 'Detecting tech stack...';
    const techStack = TechStackDetector.analyze(targetPath);
    if (techStack.language !== 'unknown') {
      this.spinner.text = `Detected: ${this.formatTechStack(techStack)}`;
    }

    const workspaces = detectWorkspaces(targetPath, { refresh: true });

    const SUPPORTED_AGENTS = enginesConfig.engines.map(e => ({ ...e }));
    // Add a disabled "Exit" option at the bottom
    SUPPORTED_AGENTS.push({ name: '── Exit (no engines) ──', value: '__exit__', disabled: true });

    let selectedAgents = this.getDefaultSelectedAgents();

    // In interactive mode, prompt user for engines
    if (this.shouldPromptForAgents(options)) {
      try {
        const inquirer = require('inquirer');
        if (this.spinner.stop) this.spinner.stop();
        console.log('\n  ' + chalk.dim('Use `chaos init -y` to skip this prompt and use defaults.'));
        const answers = await inquirer.prompt([
          {
            type: 'checkbox',
            message: 'Select the AI CLI engines you want to support:',
            name: 'agents',
            choices: SUPPORTED_AGENTS,
            loop: false,
            pageSize: 10,
          },
        ]);
        // Filter out the exit placeholder
        selectedAgents = (answers.agents || []).filter(v => v !== '__exit__');
      } catch (err) {
        // Inquirer may fail in non-interactive terminals; fall back to defaults
        if (this.spinner.start) this.spinner.start();
        console.log(chalk.dim('\n  Interactive prompt unavailable, using default engine (.claude).'));
        selectedAgents = this.getDefaultSelectedAgents();
      } finally {
        if (this.spinner.start) this.spinner.start();
      }
    }

    // If user made no selection, exit gracefully without initializing anything
    if (!Array.isArray(selectedAgents) || selectedAgents.length === 0) {
      console.log(chalk.yellow('\n  No AI engine selected. Initialization cancelled.'));
      console.log(chalk.dim('  Run `stdd init -y` to initialize with default engine.\n'));
      return;
    }

    // Create directory structure
    this.spinner.text = 'Creating directory structure...';
    await this.createDirectories(targetPath, selectedAgents);

    // Create AGENTS.md
    this.spinner.text = 'Creating AGENTS.md...';
    await this.createAgentsMd(targetPath);

    // Create stdd/config.yaml
    this.spinner.text = 'Creating config.yaml...';
    await this.createConfigYaml(targetPath, techStack, workspaces);

    // Create memory/foundation.md
    this.spinner.text = 'Creating foundation.md...';
    await this.createFoundationMd(targetPath, techStack, workspaces);

    // Copy Engine commands
    this.spinner.text = 'Copying Claude commands...';
    await this.copyClaudeCommands(targetPath, selectedAgents);

    // Copy skills payload
    if (options.skipSkills) {
      this.spinner.text = 'Skipping STDD skills copy (--skip-skills)...';
    } else {
      this.spinner.text = 'Copying STDD skills...';
      await this.copySkills(targetPath, selectedAgents);
    }

    // Copy schemas
    this.spinner.text = 'Copying schemas...';
    await this.copySchemas(targetPath);

    // Copy hooks
    this.spinner.text = 'Copying hooks...';
    await this.copyHooks(targetPath, selectedAgents);

    // Update .gitignore
    this.spinner.text = 'Updating .gitignore...';
    await this.updateGitignore(targetPath, selectedAgents);

    // Create GitHub templates
    this.spinner.text = 'Creating GitHub templates...';
    await this.copyGitHubTemplates(targetPath, workspaces);

    // Print next steps
    this.printNextSteps(selectedAgents, techStack);
  }

  async exists(path) {
    try {
      await fs.access(path);
      return true;
    } catch (_) {
      return false;
    }
  }

  async createDirectories(targetPath, selectedAgents) {
    const baseDirs = [
      'stdd',
      'stdd/specs',
      'stdd/changes',
      'stdd/changes/archive',
      'stdd/memory',
      'stdd/graph',
      'stdd/explorations'
    ];

    for (const dir of baseDirs) {
      await fs.mkdir(path.join(targetPath, dir), { recursive: true });
    }

    for (const agent of selectedAgents) {
      await fs.mkdir(path.join(targetPath, agent, 'commands', 'stdd'), { recursive: true });
      await fs.mkdir(path.join(targetPath, agent, 'skills'), { recursive: true });
    }
  }

  async createAgentsMd(targetPath) {
    await fs.writeFile(
      path.join(targetPath, 'AGENTS.md'),
      AGENTS_MD_TEMPLATE
    );
  }

  async createConfigYaml(targetPath, techStack = {}, workspaces = []) {
    const projectName = path.basename(path.resolve(targetPath)) || 'project';
    await fs.writeFile(
      path.join(targetPath, 'stdd', 'config.yaml'),
      buildConfigYamlTemplate(projectName, techStack, workspaces, targetPath)
    );
  }

  async createFoundationMd(targetPath, techStack = {}, workspaces = []) {
    const langLabel = techStack.language === 'unknown' ? 'Unknown language' : techStack.language;
    const fwLabel = techStack.framework !== 'unknown' ? ` using ${techStack.framework} framework` : '';
    const trLabel = techStack.testRunner !== 'unknown' ? ` with ${techStack.testRunner}` : '';
    const workspaceSection = workspaces.length > 0 ? `
## Monorepo/Workspaces

Detected ${workspaces.length} workspace(s):

${workspaces.map(workspace => `- ${workspace.name}: ${normalizeRelativePath(targetPath, workspace.root)}`).join('\n')}
` : '';
    const content = `# Project Foundation

## Tech Stack

Detected: ${langLabel}${fwLabel}${trLabel}.

## Language

${techStack.language === 'node' ? 'Node.js (JavaScript/TypeScript)' : techStack.language === 'python' ? 'Python' : techStack.language === 'rust' ? 'Rust' : techStack.language === 'go' ? 'Go' : 'Not detected'}

## Framework

${techStack.framework !== 'unknown' ? techStack.framework : 'Not detected'}

## Test Runner

${techStack.testCommand || 'Not detected'}
${workspaceSection}
`;
    await fs.writeFile(
      path.join(targetPath, 'stdd', 'memory', 'foundation.md'),
      content
    );
  }

  
  
  async copySkills(targetPath, selectedAgents) {
    const sourceDir = path.join(getPackageRoot(), 'src', 'templates', 'skills', 'stdd');

    for (const agent of selectedAgents) {
      const targetDir = path.join(targetPath, agent, 'skills', 'stdd');
      if (await this.exists(sourceDir)) {
        await fs.mkdir(targetDir, { recursive: true });
        await fs.cp(sourceDir, targetDir, { recursive: true });
      }
    }
  }

  async copyClaudeCommands(targetPath, selectedAgents) {
    const sourceDir = path.join(getPackageRoot(), 'src', 'templates', 'commands');

    for (const agent of selectedAgents) {
      const targetDir = path.join(targetPath, agent, 'commands', 'stdd');
      await this.copyDirContents(sourceDir, targetDir);
    }
  }

  async copyHooks(targetPath, selectedAgents) {
    const sourceDir = path.join(getPackageRoot(), 'src', 'templates', 'hooks');

    if (!await this.exists(sourceDir)) {
      return;
    }

    for (const agent of selectedAgents) {
      const targetHookDir = path.join(targetPath, agent, 'hooks');
      await fs.mkdir(targetHookDir, { recursive: true });

      const files = await fs.readdir(sourceDir);
      for (const file of files) {
        if (file.endsWith('.js')) {
          const content = await fs.readFile(path.join(sourceDir, file), 'utf-8');
          await fs.writeFile(path.join(targetHookDir, file), content);
        }
      }
    }
  }

  async copyDirContents(sourceDir, targetDir) {
    if (await this.exists(sourceDir)) {
      await fs.mkdir(targetDir, { recursive: true });
      const files = await fs.readdir(sourceDir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          const content = await fs.readFile(path.join(sourceDir, file), 'utf-8');
          await fs.writeFile(path.join(targetDir, file), content);
        }
      }
    }
  }

  async copySchemas(targetPath) {
    const sourceSchema = path.join(getPackageRoot(), 'schemas');
    const targetSchema = path.join(targetPath, 'schemas');

    if (await this.exists(sourceSchema)) {
      await fs.mkdir(targetSchema, { recursive: true });

      // Copy schema.yaml
      const schemaPath = path.join(sourceSchema, 'spec-driven', 'schema.yaml');
      if (await this.exists(schemaPath)) {
        await fs.mkdir(path.join(targetSchema, 'spec-driven'), { recursive: true });
        const content = await fs.readFile(schemaPath, 'utf-8');
        await fs.writeFile(path.join(targetSchema, 'spec-driven', 'schema.yaml'), content);
      }

      // Copy templates
      const templatesDir = path.join(sourceSchema, 'spec-driven', 'templates');
      if (await this.exists(templatesDir)) {
        await fs.mkdir(path.join(targetSchema, 'spec-driven', 'templates'), { recursive: true });
        const files = await fs.readdir(templatesDir);
        for (const file of files) {
          if (file.endsWith('.md')) {
            const content = await fs.readFile(path.join(templatesDir, file), 'utf-8');
            await fs.writeFile(
              path.join(targetSchema, 'spec-driven', 'templates', file),
              content
            );
          }
        }
      }
    }
  }

  async updateGitignore(targetPath, selectedAgents = []) {
    const gitignorePath = path.join(targetPath, '.gitignore');

    let content = '';
    if (await this.exists(gitignorePath)) {
      content = await fs.readFile(gitignorePath, 'utf-8');
    }

    if (!content.includes('# STDD Copilot')) {
      let entries = GITIGNORE_ENTRIES;
      for (const agent of selectedAgents) {
        entries += `${agent}/tdd-guard/\n`;
      }
      await fs.appendFile(gitignorePath, entries);
    }
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
      .map(workspace => `- [ ] ${normalizeRelativePath(targetPath, workspace.root)}`)
      .join('\n');
  }

  renderGitHubTemplate(content, targetPath, workspaces = []) {
    const workspaceBlock = this.formatAffectedWorkspaces(workspaces, targetPath);
    return content.replace(
      /(<!-- STDD:WORKSPACES:start -->)([\s\S]*?)(<!-- STDD:WORKSPACES:end -->)/,
      `$1\n${workspaceBlock}\n$3`
    );
  }

  async copyGitHubTemplates(targetPath, workspaces = []) {
    const sourceDir = path.join(getPackageRoot(), 'src', 'templates', 'github');

    if (!await this.exists(sourceDir)) {
      return;
    }

    const targetDir = path.join(targetPath, '.github');
    const self = this;

    async function copyRecursive(src, dest) {
      await fs.mkdir(dest, { recursive: true });
      const entries = await fs.readdir(src, { withFileTypes: true });

      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
          await copyRecursive(srcPath, destPath);
        } else {
          if (!await self.exists(destPath)) {
            const content = await fs.readFile(srcPath, 'utf-8');
            await fs.writeFile(destPath, self.renderGitHubTemplate(content, targetPath, workspaces));
          }
        }
      }
    }

    await copyRecursive(sourceDir, targetDir);
  }

  formatTechStack(techStack) {
    const lang = techStack.language === 'node' ? 'Node.js' : techStack.language === 'python' ? 'Python' : techStack.language === 'rust' ? 'Rust' : techStack.language === 'go' ? 'Go' : techStack.language;
    let desc = `${lang} project`;
    if (techStack.framework !== 'unknown') {
      desc += ` using ${techStack.framework} framework`;
    }
    if (techStack.testRunner !== 'unknown') {
      desc += ` with ${techStack.testRunner}`;
    }
    return desc;
  }

  printNextSteps(selectedAgents = [], techStack = {}) {
    console.log(chalk.green('\n✅ Chaos Code initialized!\n'));
    console.log(chalk.bold('Next steps:\n'));

    if (techStack.language !== 'unknown') {
      console.log(chalk.dim(`Tech stack: ${this.formatTechStack(techStack)}\n`));
    }

    if (selectedAgents.length > 0) {
      console.log(chalk.dim(`Enabled engines: ${selectedAgents.join(', ')}\n`));
    }

    console.log('  1. Start a new change:');
    console.log(chalk.cyan('     /stdd:new your-first-feature\n'));
    console.log('  2. Or explore an existing codebase:');
    console.log(chalk.cyan('     /stdd:explore understand the codebase\n'));
    console.log('  3. View all commands:');
    console.log(chalk.cyan('     chaos commands\n'));
    console.log(chalk.dim('Documentation: https://github.com/Marcher-lam/chaos-code'));
  }
}

module.exports = { InitCommand };
