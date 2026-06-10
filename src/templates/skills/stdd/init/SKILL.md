---
id: stdd.init
command: /stdd:init
description: 初始化 STDD 项目结构、配置、workspace 与 greenfield/brownfield 基线（语言无关）
version: "3.0"
category: lifecycle
phase: init
read_only: false
risk_level: medium
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: []
next: [stdd.new, stdd.ff]
on_failure: []
inputs:
  - 项目路径
  - 可选 --force
  - 可选 --with-memory
  - workspace 检测结果
outputs:
  - stdd/config.yaml
  - stdd/specs/
  - stdd/changes/
  - stdd/memory/
  - stdd/graph/
  - stdd/evidence/
evidence:
  required: true
  path: stdd/changes/<change-id>/evidence/
constitution_articles:
  blocking: []
  warning: []
  suggestion: []
graph:
  node_id: stdd.init
  parallelizable: false
  resumable: true
  checkpoint: per-change
---

# STDD Skill: /stdd:init

## Purpose
**初始化 STDD 项目结构、配置、workspace 与 greenfield/brownfield 基线**。这是 Chaos Code 的初始化 skill，设置项目所需的目录结构和配置。

**核心设计原则：**
- **语言无关**：适用于任何编程语言
- **自动检测**：识别项目类型和技术栈
- **最小侵入**：不修改现有代码
- **可配置**：支持自定义配置

## When to Use
- 新项目首次使用 STDD 时
- 需要设置 STDD 配置时
- 需要重新初始化时
- 需要修复配置时

## 项目类型检测

### Greenfield 项目
空目录或新项目：
1. 检测技术栈
2. 创建推荐目录结构
3. 生成 starter 模板
4. 配置测试框架

### Brownfield 项目
已有代码的项目：
1. 分析现有结构
2. 识别技术栈
3. 创建 STDD 目录
4. 生成配置文件

### Monorepo 项目
多包项目：
1. 识别 workspace 结构
2. 配置包边界
3. 设置独立配置
4. 支持包间依赖

## 目录结构

### 创建的目录
```
stdd/
├── config.yaml           # STDD 配置
├── specs/                # 全局规格
├── changes/              # 变更目录
│   └── .gitkeep
├── memory/               # 项目记忆
│   ├── foundation.md     # 基础信息
│   ├── components.md     # 组件清单
│   └── contracts.md      # 契约定义
├── graph/                # Skill Graph
│   ├── history.jsonl     # 执行历史
│   └── state.json        # 当前状态
├── evidence/             # 全局证据
│   └── .gitkeep
└── workspaces.yaml       # Workspace 配置（monorepo）
```

## CLI Runtime

```bash
# 交互式初始化
chaos init

# 快速初始化（使用默认值）
chaos init --yes

# 初始化指定路径
chaos init /path/to/project

# 强制重新初始化
chaos init --force

# 包含项目记忆
chaos init --with-memory

# 指定项目类型
chaos init --type greenfield
chaos init --type brownfield

# 指定技术栈
chaos init --stack typescript
chaos init --stack python
chaos init --stack go

# 使用预设模板
chaos init --preset minimal
chaos init --preset full
chaos init --preset monorepo

# 初始化后操作
chaos init && chaos new "First feature"
```

## 交互式初始化流程

### 完整交互式流程
```bash
$ chaos init

? 项目名称: my-awesome-app
? 项目类型: 
  ○ greenfield (全新项目)
  ● brownfield (已有代码)
  ○ monorepo (多包项目)

? 编程语言: 
  ○ TypeScript
  ○ JavaScript
  ○ Python
  ● Java
  ○ Go
  ○ Rust
  ○ C#
  ○ PHP

? 测试框架:
  ● JUnit 5
  ○ TestNG

? 构建工具:
  ● Maven
  ○ Gradle

? 覆盖率目标: 80%

? 启用 mutation 测试: Yes

? 创建示例文件: No

✓ 初始化完成！

下一步：
  chaos new "First feature"
```

### 快速模式
```bash
$ chaos init --yes

✓ 使用默认配置初始化完成

配置:
  项目类型: brownfield
  语言: TypeScript (自动检测)
  测试框架: Jest (自动检测)
  覆盖率目标: 80%
```

## 预设模板

### Minimal 预设
```yaml
# 最小化配置
preset: minimal

创建:
  - stdd/config.yaml (基础配置)
  - stdd/specs/ (空目录)
  - stdd/changes/ (空目录)

跳过:
  - Constitution (可选)
  - Memory (可选)
  - Graph history (可选)
```

### Full 预设
```yaml
# 完整配置
preset: full

创建:
  - stdd/config.yaml (完整配置)
  - stdd/constitution/ (9 篇条例)
  - stdd/specs/ (含示例)
  - stdd/changes/ (含模板)
  - stdd/memory/ (含模板)
  - stdd/graph/ (含历史)
  - stdd/evidence/ (含报告模板)
  - .stdd/ (钩子脚本)
```

### Monorepo 预设
```yaml
# Monorepo 配置
preset: monorepo

创建:
  - stdd/config.yaml (根配置)
  - stdd/workspaces.yaml (workspace 定义)
  - stdd/packages/ (包级配置模板)

结构:
  packages/
    api/     → stdd/package.yaml
    web/     → stdd/package.yaml
    shared/  → stdd/package.yaml
```

## Starter 模板

### TypeScript Express 模板
```bash
chaos init --stack typescript-express
```

创建:
```
my-app/
├── src/
│   ├── __tests__/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   ├── controllers/
│   ├── services/
│   ├── repositories/
│   └── routes/
├── stdd/
├── jest.config.js
├── tsconfig.json
└── package.json
```

### Python FastAPI 模板
```bash
chaos init --stack python-fastapi
```

创建:
```
my-app/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── app/
│   ├── api/
│   ├── core/
│   ├── models/
│   └── services/
├── stdd/
├── pytest.ini
├── pyproject.toml
└── requirements/
    ├── dev.txt
    └── prod.txt
```

### Go Gin 模板
```bash
chaos init --stack go-gin
```

创建:
```
my-app/
├── internal/
│   ├── handlers/
│   ├── services/
│   ├── models/
│   └── middleware/
├── tests/
│   ├── unit/
│   └── integration/
├── stdd/
├── go.mod
└── main.go
```

## 配置文件

### config.yaml (完整版)
```yaml
# STDD Configuration
version: "3.0"

project:
  name: my-project
  type: brownfield
  language: typescript
  framework: express
  version: "1.0.0"

# Testing 配置
testing:
  command: npm test
  coverage:
    statement: 80
    branch: 75
    function: 80
    line: 80
  mutation:
    enabled: true
    tool: stryker
    threshold: 70
  frameworks:
    unit: jest
    integration: supertest
    e2e: playwright

# Constitution 配置
constitution:
  enabled: true
  strict: false
  blocking: [2, 7, 9]
  warning: [1, 3, 4, 6]
  suggestion: [5, 8]

# Workspace 配置
workspaces:
  enabled: false
  root: .
  pattern: "packages/*"
  inherit_config: true

# Graph 配置
graph:
  enabled: true
  history_limit: 100
  auto_resume: true

# Output 配置
output:
  changes_dir: stdd/changes
  evidence_dir: stdd/evidence
  memory_dir: stdd/memory
  specs_dir: stdd/specs
  reports_format: [json, html]

# Git 钩子
git_hooks:
  pre_commit: chaos guard
  pre_push: chaos verify
  commit_msg: chaos commit --validate

# Memory 配置
memory:
  enabled: true
  auto_learn: true
  max_entries: 1000
```

### workspaces.yaml (Monorepo)
```yaml
version: "3.0"

root:
  path: .
  config: stdd/config.yaml

workspaces:
  - name: api
    path: packages/api
    language: typescript
    test_command: npm test
    coverage:
      statement: 85
      branch: 80
    dependencies:
      - shared
    
  - name: web
    path: packages/web
    language: typescript
    test_command: npm test
    coverage:
      statement: 75
      branch: 70
    dependencies:
      - shared
      - api
    
  - name: shared
    path: packages/shared
    language: typescript
    test_command: npm test
    coverage:
      statement: 90
      branch: 85
    dependencies: []
```

## 钩子脚本

### Git Hooks 自动配置
```bash
# 初始化时自动配置
chaos init --with-hooks

# 创建 .git/hooks/pre-commit
#!/bin/bash
set -e
chaos guard || exit 1

# 创建 .git/hooks/pre-push
#!/bin/bash
set -e
chaos verify --all || exit 1

# 创建 .git/hooks/commit-msg
#!/bin/bash
set -e
chaos commit --validate "$1" || exit 1
```

## 设计决策

### 为什么需要初始化？
- **一致性**: 统一的目录结构
- **配置**: 集中管理配置
- **可发现**: 明确的文件位置

### 为什么自动检测？
- **便利**: 减少手动配置
- **准确**: 基于实际项目状态
- **智能**: 推荐合理默认值

### 为什么支持 Workspace？
- **Monorepo**: 现代项目结构
- **隔离**: 包独立配置
- **共享**: 全局配置继承

### 为什么提供预设？
- **快速**: 快速开始
- **最佳实践**: 预配置最佳实践
- **灵活性**: 可自定义覆盖

### 为什么交互式？
- **新手友好**: 引导式配置
- **透明**: 清楚每个选项
- **灵活**: 按需选择

## 配置文件

### config.yaml
```yaml
# STDD Configuration
project:
  name: my-project
  type: brownfield  # greenfield | brownfield | monorepo
  language: typescript
  framework: express

# Testing
testing:
  command: npm test
  coverage:
    statement: 80
    branch: 75
    function: 80
  mutation:
    enabled: true
    threshold: 70

# Constitution
constitution:
  enabled: true
  strict: false  # warning → blocking

# Workspace (monorepo)
workspaces:
  enabled: false
  root: .
  pattern: "packages/*"

# Output
output:
  changes_dir: stdd/changes
  evidence_dir: stdd/evidence
  memory_dir: stdd/memory
```

## 技术栈检测

### 自动检测
| 语言 | 检测文件 |
|------|----------|
| JavaScript/TypeScript | package.json, tsconfig.json |
| Python | pyproject.toml, requirements.txt, setup.py |
| Java | pom.xml, build.gradle, *.java |
| Go | go.mod |
| Rust | Cargo.toml |
| C# | *.csproj, *.sln |
| PHP | composer.json |
| Ruby | Gemfile |

### 测试框架检测
| 语言 | 框架 | 检测方式 |
|------|------|----------|
| JavaScript/TypeScript | Jest | devDependencies.jest |
| JavaScript/TypeScript | Vitest | devDependencies.vitest |
| Python | pytest | setup.py, pytest.ini |
| Java | JUnit | build.gradle, pom.xml |
| Go | testing | *_test.go 文件 |
| Rust | Rusttest | Cargo.toml |

## Workspace 支持

### Monorepo 结构
```
my-monorepo/
├── packages/
│   ├── api/           # Workspace 1
│   ├── web/           # Workspace 2
│   └── shared/        # Workspace 3
├── stdd/
│   ├── config.yaml    # Root config
│   └── workspaces.yaml
└── package.json
```

### workspaces.yaml
```yaml
workspaces:
  - name: api
    path: packages/api
    language: typescript
    test_command: npm test

  - name: web
    path: packages/web
    language: typescript
    test_command: npm test

  - name: shared
    path: packages/shared
    language: typescript
    test_command: npm test
```

## Graph Semantics
- 节点 ID 为 stdd.init，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-change；resumable=true；parallelizable=false。
- 无依赖，是所有 skill 的前置条件。

## Constitution Gates
- 无直接条例检查
- 创建默认 Constitution 配置

## Evidence Contract
- 初始化记录写入 `stdd/evidence/init-*.json`

## Related Skills
- **stdd.new** - 创建新变更
- **stdd.ff** - 快速通道
- **stdd.workspace** - Workspace 管理
- **stdd.learn** - 从代码学习

## 参考资源

### 项目初始化
- [Project Scaffolding](https://yeoman.io/)
- [npm init](https://docs.npmjs.com/cli/v9/commands/npm-init)

### 配置管理
- [YAML Specification](https://yaml.org/)
- [Configuration Best Practices](https://12factor.net/config)

