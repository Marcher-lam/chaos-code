/**
 * New Command
 * Create new changes or specs
 */

const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const { validateChangeName } = require('../../utils/change-utils');

class NewCommand {
  constructor(spinner) {
    this.spinner = spinner;
  }

  async ensureWorkspaceDir(dirPath) {
    try {
      await fs.access(dirPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('STDD not initialized. Run `stdd init` first.');
      }
      throw error;
    }
  }

  validateName(name) {
    validateChangeName(name);
  }

  async createChange(name, options = {}) {
    this.validateName(name);

    const changesDir = path.join(process.cwd(), 'stdd', 'changes');
    const changeDir = path.join(changesDir, name);

    await this.ensureWorkspaceDir(changesDir);

    // 原子创建：直接 mkdir，如果已存在则报错
    try {
      await fs.mkdir(changeDir, { recursive: false });
    } catch (error) {
      if (error.code === 'EEXIST') {
        throw new Error(`Change '${name}' already exists.`);
      }
      throw error;
    }

    // Create proposal.md
    const title = options.title || name;
    const description = options.description || '';
    const proposalContent = this.generateProposalTemplate(name, title, description);
    await fs.writeFile(path.join(changeDir, 'proposal.md'), proposalContent);

    // Create empty specs directory
    await fs.mkdir(path.join(changeDir, 'specs'), { recursive: true });

    // Create empty tasks.md with a sample task
    const tasksContent = `# Tasks: ${name}

- [ ] TASK-001 Setup project structure
- [ ] TASK-002 Implement core functionality
- [ ] TASK-003 Add tests
- [ ] TASK-004 Update documentation
`;
    await fs.writeFile(path.join(changeDir, 'tasks.md'), tasksContent);

    console.log(chalk.green(`\n✅ Change '${name}' created at stdd/changes/${name}/\n`));
    console.log('Next steps:');
    console.log(chalk.cyan(`  1. Edit proposal.md to define your change`));
    console.log(chalk.cyan(`  2. In Claude Code: /stdd:explore ${name}`));
    console.log(chalk.cyan(`  3. Or: /stdd:apply ${name}`));
  }

  async createSpec(domain, _options = {}) {
    this.validateName(domain);

    const specsDir = path.join(process.cwd(), 'stdd', 'specs');
    const specDir = path.join(specsDir, domain);
    const specFile = path.join(specDir, 'spec.md');

    await this.ensureWorkspaceDir(specsDir);

    // 检查 spec 文件是否已存在
    try {
      await fs.access(specFile);
      throw new Error(`Spec '${domain}' already exists.`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }

    // Create spec directory and file
    await fs.mkdir(specDir, { recursive: true });

    const specContent = this.generateSpecTemplate(domain);
    await fs.writeFile(specFile, specContent);

    console.log(chalk.green(`\n✅ Spec '${domain}' created at stdd/specs/${domain}/spec.md\n`));
    console.log('Next steps:');
    console.log(chalk.cyan(`  1. Edit spec.md to define your domain`));
    console.log(chalk.cyan(`  2. Create changes to implement requirements`));
  }

  generateProposalTemplate(name, title, description) {
    const timestamp = new Date().toISOString();
    return `# Proposal: ${title}

## Intent

> 这个变更要解决什么问题？为什么现在要做？

${description || '[描述问题背景、用户痛点、业务价值]'}

## Scope

### In Scope

> 这次变更包含哪些功能？具体边界在哪里？

- [ ] [功能点 1]
- [ ] [功能点 2]
- [ ] [功能点 3]

### Out of Scope

> 明确排除的内容，防止范围蔓延

- [排除项 1]
- [排除项 2]

### Target Users

> 谁会使用这个功能？

- [用户角色 1]: [使用场景]
- [用户角色 2]: [使用场景]

## Approach

### Technical Strategy

> 高层次的技术方案描述

[技术选型、架构方向、关键设计决策]

### Key Decisions

| 决策点 | 选择 | 理由 |
|--------|------|------|
| [决策 1] | [选择] | [理由] |
| [决策 2] | [选择] | [理由] |

### Dependencies

> 需要的前置条件、外部依赖

- [ ] [依赖 1]
- [ ] [依赖 2]

## Success Criteria

> 如何验证这个变更成功完成？

### Functional

- [ ] [功能验收条件 1]
- [ ] [功能验收条件 2]

### Non-Functional

- [ ] 性能: [指标]
- [ ] 安全: [要求]
- [ ] 兼容性: [要求]

### Quality

- [ ] 测试覆盖率 ≥ 80%
- [ ] 所有测试通过
- [ ] 无 TypeScript 错误
- [ ] 无 ESLint 警告

## Risks

> 潜在风险和应对策略

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| [风险 1] | H/M/L | H/M/L | [措施] |

## Timeline

> 预估时间线

| 阶段 | 预估时间 |
|------|----------|
| 规格定义 | [时间] |
| 设计 | [时间] |
| 实现 | [时间] |
| 测试 | [时间] |
| 总计 | [时间] |

## Open Questions

> 待确认的问题

- [ ] [问题 1] - @owner
- [ ] [问题 2] - @owner

## References

> 相关文档、设计稿、参考链接

- [参考 1]
- [参考 2]

---

## Metadata

| Field | Value |
|-------|-------|
| Created | ${timestamp.split('T')[0]} |
| Author | [作者] |
| Status | 📝 Draft |
| Change ID | ${name} |
`;
  }

  generateSpecTemplate(domain) {
    return `# Spec: ${domain}

> Source of Truth for ${domain} domain
> Version: 1.0 | Last Updated: ${new Date().toISOString().split('T')[0]}

---

## Requirements

### Requirement: [需求名称]

The system SHALL [行为描述].

**Priority**: High | Medium | Low

**Rationale**: [为什么需要这个需求]

#### Scenario: [场景名称]

- **GIVEN** [前置条件]
- **WHEN** [触发动作]
- **THEN** [期望结果]

---

## Data Models

### [Model Name]

\`\`\`typescript
interface ${domain}Model {
  id: string;
  // ... other fields
}
\`\`\`

---

## API Contracts

### [Endpoint Name]

\`\`\`
METHOD /api/${domain.toLowerCase()}/resource
\`\`\`

**Request**:
\`\`\`json
{
  // request body
}
\`\`\`

**Response**:
\`\`\`json
{
  // response body
}
\`\`\`

---

## Notes

- [重要说明 1]
- [重要说明 2]

---

> Generated by STDD Copilot
`;
  }
}

module.exports = { NewCommand };
