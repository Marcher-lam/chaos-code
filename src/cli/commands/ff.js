/**
 * FF Command (Fast-Forward)
 * Generate a change with pre-populated tasks for immediate apply
 */

const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const { resolveWorkspace } = require('../../utils/workspace-detector');
const { validateChangeName } = require('../../utils/change-utils');
const { generateChangeName: _genChangeName, toSafeFilename: _toSafe, workspaceContext: _wsCtx } = require('../../utils/change-helpers');
const { ProfileEngine } = require('../../utils/profile-engine');

const PROFILE_TASK_LIMITS = { quick: 2, standard: 3, thorough: 5, enterprise: 8 };

class FFCommand {
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







  generateProposal(description, workspace = null) {
    const timestamp = new Date().toISOString();
    const workspaceSection = workspace ? `
## Workspace

- Path: ${workspace.path}
- Package: ${workspace.name}
` : '';
    const workspaceRow = workspace ? `| Workspace | ${workspace.path} |
` : '';
    return `# Proposal: ${description}

## Intent

> 这个变更要解决什么问题？为什么现在要做？

${description}

## Scope

### In Scope

- [ ] 核心功能实现
- [ ] 基础单元测试

### Out of Scope

- 高级特性
- 性能优化

## Success Criteria

- [ ] 所有测试通过
- [ ] 无 ESLint 警告
${workspaceSection}

---

## Metadata

| Field | Value |
|-------|-------|
| Created | ${timestamp.split('T')[0]} |
| Author | [作者] |
| Status |  Draft |
${workspaceRow}
`;
  }

  generateTasks(description, workspace = null, profileId = 'standard') {
    const maxTasks = PROFILE_TASK_LIMITS[profileId] || 3;
    const workspaceHeader = workspace ? `
> Workspace: ${workspace.path}
` : '';
    const tasks = [
      'TASK-001: 环境准备与脚手架搭建',
      `TASK-002: ${description} 核心逻辑实现`,
    ];
    if (maxTasks >= 3) tasks.push('TASK-003: 单元测试编写与验证');
    if (maxTasks >= 4) tasks.push('TASK-004: 集成测试与边界条件验证');
    if (maxTasks >= 5) tasks.push('TASK-005: 性能测试与优化审查');
    if (maxTasks >= 6) tasks.push('TASK-006: 安全审查与漏洞扫描');
    if (maxTasks >= 7) tasks.push('TASK-007: 文档更新与 API 规范对齐');
    if (maxTasks >= 8) tasks.push('TASK-008: 合规检查与审计日志验证');
    const taskLines = tasks.slice(0, maxTasks).map((t, _i) => `- [ ] ${t}`).join('\n');
    return `# Tasks
${workspaceHeader}

${taskLines}
`;
  }

  async execute(description, options = {}) {
    if (!description || typeof description !== 'string') {
      throw new Error('Description is required.');
    }

    // Auto-detect profile
    let profileId = options.profile || null;
    let profileSource = 'cli-override';
    if (!profileId) {
      const engine = new ProfileEngine();
      const detected = engine.detectFromProject(process.cwd());
      profileId = detected.profileId;
      profileSource = detected.source;
    }

    const changesDir = await this.ensureChangesDir();
    const workspace = options.workspace ? resolveWorkspace(process.cwd(), options.workspace) : null;
    if (options.workspace && !workspace) {
      throw new Error(`Workspace '${options.workspace}' not found.`);
    }
    const workspaceMeta = _wsCtx(workspace);

    const changeName = options.changeName || _genChangeName('ff');
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

    await fs.writeFile(path.join(changeDir, 'proposal.md'), this.generateProposal(description, workspaceMeta));
    await fs.writeFile(path.join(changeDir, 'tasks.md'), this.generateTasks(description, workspaceMeta, profileId));

    console.log(chalk.green(`\n✅ Fast-forward change '${changeName}' created at stdd/changes/${changeName}/\n`));
    console.log(chalk.cyan(`Profile: ${profileId} (${profileSource})`));
    if (workspaceMeta) {
      console.log(chalk.cyan(`Workspace: ${workspaceMeta.path}`));
    }
    console.log('Next steps:');
    const workspaceArg = workspaceMeta ? ` --workspace ${workspaceMeta.path}` : '';
    console.log(chalk.cyan(`  stdd apply ${changeName}${workspaceArg}`));

    return { changeName, workspace: workspaceMeta };
  }
}

module.exports = { FFCommand };
