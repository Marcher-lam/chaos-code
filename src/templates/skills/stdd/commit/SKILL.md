---
id: stdd.commit
command: /stdd:commit
description: 生成符合 TDD 阶段和 Conventional Commits 规范的提交信息（语言无关）
version: "3.0"
category: governance
phase: archive
read_only: false
risk_level: high
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.verify]
next: []
on_failure: []
inputs:
  - change-id
  - verify evidence
  - git diff
  - issue id
  - TDD phase
outputs:
  - commit message
  - commit validation report
evidence:
  required: true
  path: stdd/changes/<change-id>/evidence/
constitution_articles:
  blocking: [3]
  warning: []
  suggestion: []
graph:
  node_id: stdd.commit
  parallelizable: false
  resumable: true
  checkpoint: per-commit
---

# STDD Skill: /stdd:commit

## Purpose
**生成符合 TDD 阶段和 Conventional Commits 规范的提交信息**。这是 Chaos Code 的 Git commit 规范化 skill，确保提交历史清晰、可追溯、可自动化。

**核心设计原则：**
- **语言无关**：适用于任何编程语言和项目
- **Conventional Commits**：遵循业界标准规范
- **TDD 感知**：支持 Red-Green-Refactor 阶段标记
- **Issue 关联**：自动关联 issue/ticket

## When to Use
- 完成变更后创建 Git commit 时
- 需要标准化提交信息格式时
- 需要关联 issue 时
- 需要遵循 TDD 提交模式时

## Preconditions
- 已完成 verify 阶段
- Git 仓库已初始化
- 有待提交的更改

## Conventional Commits 规范

### 基本格式
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### 类型 (Type)
| 类型 | 描述 | 示例 |
|------|------|------|
| `feat` | 新功能 | feat: add user login |
| `fix` | Bug 修复 | fix: handle null input |
| `docs` | 文档变更 | docs: update README |
| `style` | 代码格式 | style: format code |
| `refactor` | 重构 | refactor: simplify auth |
| `perf` | 性能优化 | perf: cache queries |
| `test` | 测试相关 | test: add unit tests |
| `build` | 构建系统 | build: upgrade webpack |
| `ci` | CI 配置 | ci: add GitHub Actions |
| `chore` | 杂项 | chore: update deps |

### Breaking Changes
```
feat(api): remove deprecated endpoint

BREAKING CHANGE: endpoint `/v1/users` no longer supported
```

**参考**: [Conventional Commits Specification](https://www.conventionalcommits.org/en/v1.0.0/)

## TDD 提交模式

### Red-Green-Refactor 标记

在开发过程中，可以使用 TDD 阶段前缀：

```bash
# RED 阶段 - 添加失败测试
git commit -m "[RED] add failing test for user login"

# GREEN 阶段 - 实现代码
git commit -m "[GREEN] implement user login logic"

# REFACTOR 阶段 - 重构
git commit -m "[REFACTOR] extract auth service"
```

### RGRC 模式 (Red-Green-Refactor-Commit)

扩展的 TDD 循环，包含明确的提交步骤：

1. **RED**: 写失败测试 → commit
2. **GREEN**: 写最少代码 → commit
3. **REFACTOR**: 改进结构 → commit
4. **COMMIT**: 推送到共享仓库（仅 GREEN 状态）

**参考**: [tdd-bdd-commit GitHub](https://github.com/matatk/tdd-bdd-commit)

## CLI Runtime

```bash
# 交互式生成提交信息
chaos commit

# 生成提交信息（不自动执行 git commit）
chaos commit <change-id>

# 指定 TDD 阶段
chaos commit <change-id> --tdd-phase green

# 关联 issue
chaos commit <change-id> --issue 42
chaos commit <change-id> --issue PROJ-123

# 要求必须有 issue
chaos commit <change-id> --require-issue

# JSON 格式输出
chaos commit <change-id> --format json

# 预览模式（不修改任何东西）
chaos commit <change-id> --dry-run

# 实际执行 git commit
chaos commit <change-id> --execute

# 使用 Commitizen 风格的交互式提示
chaos commit --interactive

# 验证提交信息
chaos commit --validate "feat: add new feature"

# 从模板生成
chaos commit --template feature
```

## 交互式提交 (Commitizen 风格)

### 交互式流程
```bash
$ chaos commit --interactive

? Select the type of change: 
  feat:     A new feature
  fix:      A bug fix
  docs:     Documentation only changes
  style:    Changes that do not affect the code meaning
  refactor: A code change that neither fixes a bug nor adds a feature
  perf:     A code change that improves performance
  test:     Adding missing tests or correcting existing tests
  build:    Changes that affect the build system or external dependencies
  ci:       Changes to CI configuration files and scripts
  chore:    Other changes that don't modify src or test files
❯ feat

? What is the scope of this change? (e.g. component or file name): 
❯ auth

? Write a short, imperative tense description of the change:
❯ add user login with JWT

? Provide a longer description of the change: (press enter to skip)
❯ Implement JWT-based authentication with:
  - Login endpoint POST /auth/login
  - Token generation and validation
  - Password hashing with bcrypt

? Are there any breaking changes? No
❯ Yes

? Describe the breaking changes:
❯ Removed deprecated /v1/auth endpoint

? Which issue(s) does this commit close? (e.g. #42, PROJ-123)
❯ #42

? Select TDD phase (optional):
  (none)
  RED
  GREEN
❯ REFACTOR

✓ Generated commit message:
[REFACTOR] feat(auth)!: add user login with JWT

Implement JWT-based authentication with:
- Login endpoint POST /auth/login
- Token generation and validation
- Password hashing with bcrypt

BREAKING CHANGE: Removed deprecated /v1/auth endpoint

Closes #42

? Execute git commit? Yes
❯ No
```

## Commit 配置文件

### .commitrc.json
```json
{
  "types": {
    "feat": { "description": "A new feature", "emoji": "✨" },
    "fix": { "description": "A bug fix", "emoji": "🐛" },
    "docs": { "description": "Documentation only changes", "emoji": "📚" },
    "style": { "description": "Changes that do not affect the code meaning", "emoji": "💄" },
    "refactor": { "description": "A code change that neither fixes a bug nor adds a feature", "emoji": "♻️" },
    "perf": { "description": "A code change that improves performance", "emoji": "⚡" },
    "test": { "description": "Adding missing tests", "emoji": "✅" },
    "build": { "description": "Changes that affect the build system", "emoji": "📦" },
    "ci": { "description": "Changes to CI configuration files", "emoji": "👷" },
    "chore": { "description": "Other changes", "emoji": "🔧" }
  },
  "scopes": ["auth", "user", "api", "ui", "database", "config"],
  "requireIssue": true,
  "issuePrefixes": ["#", "PROJ-", "JIRA-"],
  "tddPhases": ["RED", "GREEN", "REFACTOR"],
  "subjectMaxLength": 72,
  "bodyLineMaxLength": 100
}
```

## Commitlint 配置

### commitlint.config.js
```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', 'fix', 'docs', 'style', 'refactor',
        'perf', 'test', 'build', 'ci', 'chore', 'revert'
      ]
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'type-min-length': [2, 'always', 3],
    'scope-enum': [2, 'always', ['auth', 'user', 'api', 'ui', 'database', 'config']],
    'scope-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    'subject-case': [2, 'never', ['upper-case', 'sentence-case', 'start-case', 'pascal-case']],
    'subject-min-length': [2, 'always', 3],
    'subject-max-length': [2, 'always', 72],
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [2, 'always', 100],
    'footer-max-line-length': [2, 'always', 100],
    'body-required': [0],
    'footer-required': [0],
    'references-empty': [2, 'never']
  }
};
```

### Git Hooks 集成
```json
// package.json
{
  "hooks": {
    "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
  }
}
```

## 提交模板

### .gitcommit/README.template
```
# Subject (max 72 chars)

## Motivation
<!-- Why is this change needed? -->

## Changes
<!-- What does this change do? -->

## Testing
<!-- How was this change tested? -->

## Checklist
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No breaking changes (or documented)

## Issue
<!-- Related issue number -->
Closes #
```

## Emoji 支持

### 类型与 Emoji 映射
| 类型 | Emoji | Unicode |
|------|-------|---------|
| feat | ✨ | U+2728 |
| fix | 🐛 | U+1F41B |
| docs | 📚 | U+1F4DA |
| style | 💄 | U+1F484 |
| refactor | ♻️ | U+267B |
| perf | ⚡ | U+26A1 |
| test | ✅ | U+2705 |
| build | 📦 | U+1F4E6 |
| ci | 👷 | U+1F477 |
| chore | 🔧 | U+1F527 |

### Emoji 格式提交
```
✨ feat(auth): add user login

Implement JWT-based authentication
```

## Changelog 生成

### 基于 Conventional Commits
```bash
# 生成 changelog
stdd changelog generate

# 指定版本
stdd changelog generate --release 1.2.3

# 从特定 commit 生成
stdd changelog generate --from v1.0.0 --to HEAD
```

### Changelog 格式
```markdown
# Changelog

## [1.2.0] - 2024-01-15

### Added
- feat(auth): add user login with JWT (#42)
- feat(api): add user profile endpoint (#45)

### Fixed
- fix(auth): handle token expiration gracefully (#43)
- fix(ui): correct button alignment (#44)

### Changed
- refactor(auth): simplify token validation logic
- perf(database): add query caching

### Removed
- feat(auth)!: remove deprecated API endpoints
  BREAKING CHANGE: `/v1/auth` endpoints removed, use `/v2/auth`

## [1.1.0] - 2023-12-01
...
```

## 输出格式

### 标准提交信息
```
feat(auth): add user login with JWT

Implement JWT-based authentication with:
- Login endpoint POST /auth/login
- Token generation and validation
- Password hashing with bcrypt

Closes #42
```

### TDD 模式提交信息
```
[GREEN] feat(auth): implement user login

Add login endpoint with JWT token generation.
All tests passing.

Related: #42
```

## 提交信息验证

### Article 3: Issue 关联策略

Constitution Article 3 要求：
- 每个提交必须关联 issue（除非配置豁免）
- 格式：`Closes #123`, `Fixes #456`, `Related to #789`
- 缺少 issue 时阻塞并提示

### 验证规则
- **类型有效**：必须是允许的类型之一
- **格式正确**：遵循 `type: description` 格式
- **描述清晰**：不能为空，使用祈使句
- **Issue 关联**：如要求则必须包含

## Graph Semantics
- 节点 ID 为 stdd.commit，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-commit；resumable=true；parallelizable=false。
- 依赖 verify，完成变更后的最后步骤。

## Evidence Contract
- 提交信息记录写入 `stdd/changes/<change-id>/evidence/commit-*.json`
- 包含生成的提交信息、验证结果、关联的 issue

## Related Skills
- **stdd.verify** - 提交前验证
- **stdd.archive** - 归档变更
- **stdd.final-doc** - 生成最终文档

## 参考资源

### Conventional Commits
- [Conventional Commits Specification](https://www.conventionalcommits.org/en/v1.0.0/)
- [Conventional Commits Cheatsheet](https://gist.github.com/qoomon/5dfcdf8eec66a051ecd85625518cfd13)

### TDD 提交实践
- [Applying Test-Driven Development (Medium)](https://medium.com/@matatk/achieving-regular-small-commits-with-tdd-bdd-e233a5134c3c)
- [tdd-bdd-commit GitHub](https://github.com/matatk/tdd-bdd-commit)
- [Stack Overflow: TDD Commit Best Practices](https://stackoverflow.com/questions/43158275/tdd-best-practices-for-commits)

### 提交信息工具
- [commitlint](https://commitlint.js.org/) - Lint commit messages
- [conventional-changelog](https://github.com/conventional-changelog/conventional-changelog) - Generate changelogs

## 设计决策

### 为什么使用 Conventional Commits？
- **标准化**：业界广泛采用的格式
- **自动化友好**：支持自动生成 changelog、语义化版本
- **可搜索**：结构化格式便于搜索和过滤

### 为什么支持 TDD 阶段标记？
- **开发历史**：记录 TDD 循环的每个阶段
- **代码审查**：清楚看到每个提交的目的
- **回滚便利**：粒度更细的提交历史

### 为什么默认不自动执行 git commit？
- **安全**：让用户审查生成的提交信息
- **灵活**：用户可以手动修改或合并提交
- **控制**：用户决定何时提交到远程仓库

### 为什么强制关联 issue？
- **可追溯**：每个提交都可以追溯到需求
- **完整性**：确保没有"孤儿"提交
- **透明度**：清楚知道每个提交的原因
