/**
 * Issue Command
 * Create a bug-fix change with TDD-first task structure (Reproduction → Fix → Regression)
 */

const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const { resolveWorkspace } = require('../../utils/workspace-detector');
const { validateChangeName } = require('../../utils/change-utils');
const { generateChangeName: _genChangeName, toSafeFilename: _toSafe, workspaceContext: _wsCtx } = require('../../utils/change-helpers');

class IssueCommand {
  constructor(spinner) {
    this.spinner = spinner;
  }

  async ensureChangesDir() {
    const changesDir = path.join(process.cwd(), 'stdd', 'changes');
    try {
      await fs.access(changesDir);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('STDD not initialized. Run `stdd init` first.');
      }
      throw new Error(`Cannot access changes directory: ${error.message}`);
    }
    return changesDir;
  }

  workspaceContext(workspace) {
    if (!workspace) return null;
    const root = path.relative(process.cwd(), workspace.root).replace(/\\/g, '/') || workspace.name;
    return {
      name: workspace.name,
      path: root,
      tag: _toSafe(root),
    };
  }

  generateProposal(description, title, severity, workspace = null) {
    const timestamp = new Date().toISOString();
    const workspaceSection = workspace ? `
## Workspace

- Path: ${workspace.path}
- Package: ${workspace.name}
` : '';
    const workspaceRow = workspace ? `| Workspace | ${workspace.path} |
` : '';
    return `# Bug: ${title || description}

## Bug Description

${description}

## Steps to Reproduce

> 请提供复现该 Bug 的具体步骤

1. [步骤 1]
2. [步骤 2]
3. [步骤 3]

## Expected Behavior

> 系统应该表现出什么行为

[描述期望的正确行为]

## Actual Behavior

> 系统实际表现出什么行为

[描述实际观察到的错误行为]

## Severity

${severity || 'medium'}

## Environment

- OS: [操作系统]
- Node: [Node 版本]
- Browser: [浏览器，如适用]
${workspaceSection}

---

## Metadata

| Field | Value |
|-------|-------|
| Created | ${timestamp.split('T')[0]} |
| Author | [作者] |
| Status | 🔴 New |
| Severity | ${severity || 'medium'} |
${workspaceRow}
`;
  }

  generateTasks(changeName, workspace = null) {
    const workspaceHeader = workspace ? `
> Workspace: ${workspace.path}
` : '';
    const workspaceHint = workspace ? `
> Scoped workflow: use \`stdd apply ${changeName} --workspace ${workspace.path}\` and \`stdd verify ${changeName} --workspace ${workspace.path}\`.
` : '';
    return `# Tasks: Bug Fix
${workspaceHeader}

> Bug 修复必须遵循 TDD 原则：先有失败测试 (Red)，再有修复代码 (Green)，最后回归验证 (Blue)。
${workspaceHint}

- [ ] TASK-001: 编写失败测试重现 Bug (Red)
- [ ] TASK-002: 代码修复使测试通过 (Green)
- [ ] TASK-003: 补充边界测试与回归验证
`;
  }

  async execute(description, options = {}) {
    if (!description || typeof description !== 'string') {
      throw new Error('Description is required.');
    }

    const changesDir = await this.ensureChangesDir();
    const workspace = options.workspace ? resolveWorkspace(process.cwd(), options.workspace) : null;
    if (options.workspace && !workspace) {
      throw new Error(`Workspace '${options.workspace}' not found.`);
    }
    const workspaceMeta = _wsCtx(workspace);

    const changeName = options.changeName || _genChangeName('bugfix');
    validateChangeName(changeName);
    const changeDir = path.join(changesDir, changeName);

    try {
      await fs.mkdir(changeDir, { recursive: false });
    } catch (error) {
      if (error.code === 'EEXIST') {
        throw new Error(`Change '${changeName}' already exists.`);
      }
      throw error;
    }

    await fs.mkdir(path.join(changeDir, 'specs'), { recursive: true });

    await fs.writeFile(
      path.join(changeDir, 'proposal.md'),
      this.generateProposal(description, options.title, options.severity, workspaceMeta)
    );
    await fs.writeFile(path.join(changeDir, 'tasks.md'), this.generateTasks(changeName, workspaceMeta));

    console.log(chalk.green(`\n✅ Bug fix change '${changeName}' created at stdd/changes/${changeName}/\n`));
    if (workspaceMeta) {
      console.log(chalk.cyan(`Workspace: ${workspaceMeta.path}`));
    }
    console.log('Next steps:');
    console.log(chalk.cyan(`  1. Edit proposal.md with reproduction steps`));
    const workspaceArg = workspaceMeta ? ` --workspace ${workspaceMeta.path}` : '';
    console.log(chalk.cyan(`  2. stdd apply ${changeName}${workspaceArg}  # TDD: Red → Green → Blue`));

    return { changeName, workspace: workspaceMeta };
  }
}

module.exports = { IssueCommand };
