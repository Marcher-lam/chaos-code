---
id: stdd.context
command: /stdd:context
description: 装配三层上下文（Foundation/Components/Contracts）用于 AI 交互（语言无关）
version: "3.0"
category: workspace
phase: all
read_only: true
risk_level: low
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.init]
next: []
on_failure: []
inputs:
  - layer 选择
  - change-id
  - workspace
  - export 选项
outputs:
  - assembled context
  - exported context (JSON/Markdown)
evidence:
  required: false
  path: stdd/memory/
constitution_articles:
  blocking: []
  warning: [5]
  suggestion: []
graph:
  node_id: stdd.context
  parallelizable: true
  resumable: true
  checkpoint: none
---

# STDD Skill: /stdd:context

## Purpose
**装配三层上下文用于 AI 交互**。这是 Chaos Code 的上下文管理 skill，为 AI 助手提供精确、相关的项目上下文，避免信息过载。

**核心设计原则：**
- **语言无关**：适用于任何编程语言和项目类型
- **三层架构**：Foundation、Components、Contracts 分层管理
- **按需加载**：只提供相关上下文，不塞入全仓库
- **AI 优化**：专为 AI 对话和 handoff 设计

## When to Use
- 需要 AI 理解项目结构时
- 需要提供代码上下文给 AI 助手时
- 需要导出项目文档时
- 在 monorepo 中需要 workspace 上下文时
- AI 需要了解当前变更背景时

## 三层上下文架构

### Layer 1: Foundation (基础层)
**文件**: `stdd/memory/foundation.md`

**内容**:
- 项目概述
- 技术栈
- 架构原则
- 开发约定
- 构建和测试命令

**示例**:
```markdown
# Project Foundation

## Tech Stack
- Language: TypeScript
- Framework: React + Node.js
- Testing: Jest + Playwright
- Build: Vite

## Architecture Principles
- Spec-First TDD
- Component-based architecture
- Separation of concerns

## Development Conventions
- Conventional Commits
- ESLint + Prettier
- Git flow workflow

## Common Commands
- `npm test` - Run tests
- `npm run lint` - Check code style
- `npm run build` - Build for production
```

### Layer 2: Components (组件层)
**文件**: `stdd/memory/components.md`

**内容**:
- 组件列表
- 模块结构
- 关键类和函数
- 依赖关系

**示例**:
```markdown
# Components

## Core Modules
- `src/auth/` - Authentication module
  - `AuthService` - Login/logout logic
  - `JwtMiddleware` - JWT validation
  
- `src/api/` - API layer
  - `router.ts` - Route definitions
  - `handlers/` - Request handlers

## Utilities
- `src/utils/logger.ts` - Logging utility
- `src/utils/config.ts` - Configuration management
```

### Layer 3: Contracts (契约层)
**文件**: `stdd/memory/contracts.md`

**内容**:
- API 端点
- 数据模型
- 接口定义
- 消息格式

**示例**:
```markdown
# Contracts

## API Endpoints
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `GET /users/:id` - Get user by ID

## Data Models
- `User` - User entity
  - `id: string`
  - `email: string`
  - `name: string`

## Interfaces
- `IAuthService` - Authentication service interface
- `IConfigService` - Configuration service interface
```

## CLI Runtime

```bash
# 显示所有层
chaos context

# 显示特定层
chaos context --layer foundation
chaos context --layer components
chaos context --layer contracts

# JSON 格式输出
chaos context --json

# 导出上下文
chaos context --export
chaos context --export --format json
chaos context --export --output context.md

# 复制到剪贴板
chaos context --export --copy

# Workspace 上下文
chaos context --workspace packages/api
chaos context --workspace packages/web --export
```

## 导出格式

### Markdown 格式（默认）
```markdown
# Project Context

## 1. Foundation

## Tech Stack
- Language: TypeScript
...

## 2. Components

## Core Modules
...

## 3. Contracts

## API Endpoints
...
```

### JSON 格式
```json
{
  "foundation": "# Foundation\n...",
  "components": "# Components\n...",
  "contracts": "# Contracts\n...",
  "workspace": {
    "name": "api",
    "path": "packages/api"
  }
}
```

## Monorepo 支持

### Workspace 上下文
```bash
# 获取特定 workspace 的上下文
chaos context --workspace packages/api

# Workspace 上下文包含：
# - Workspace 名称和路径
# - Workspace 特定的 foundation
# - Workspace 范围内的 components
# - Workspace 特定的 contracts
```

## AI 交互集成

### 用于 AI 助手
```bash
# 导出上下文供 AI 使用
chaos context --export --copy

# 在 AI 对话中引用
# "Here's the project context:\n\n<PASTE CONTEXT>"
```

### Context 优化原则
- **精确性**: 只包含相关代码
- **简洁性**: 避免冗余信息
- **结构化**: 使用标准格式
- **可更新**: 定期同步代码变化

## Graph Semantics
- 节点 ID 为 stdd.context，由 frontmatter 暴露给 Skill Graph。
- checkpoint=none；resumable=true；parallelizable=true。
- 依赖 init，无下游依赖。

## Constitution Gates
- **Warning 条例 5**: 文档缺失时警告

## Evidence Contract
- 上下文文件保存在 `stdd/memory/`
- foundation.md, components.md, contracts.md
- 导出的上下文保存在用户指定位置

## Related Skills
- **stdd.init** - 初始化上下文文件
- **stdd.memory** - 管理项目记忆
- **stdd.learn** - 从代码学习上下文

## 参考资源

### 上下文管理
- [AI Context Management Best Practices](https://platform.openai.com/docs/guides/prompt-engineering)
- [Codebase Context for AI Assistants](https://codeium.com/blog/context-aware-code-assist)

### 文档架构
- [Diátaxis Framework](https://diataxis.fr/) - Documentation framework
- [C4 Model](https://c4model.com/) - Architecture diagram model

## 设计决策

### 为什么分三层？
- **Foundation**: 静态的基础信息
- **Components**: 动态的代码结构
- **Contracts**: 接口和 API 定义

### 为什么需要导出？
- **AI 交互**: 方便粘贴给 AI 助手
- **文档生成**: 生成项目文档
- **团队共享**: 共享项目知识

### 为什么是只读 skill？
- **安全**: 不修改代码
- **灵活**: 由其他技能更新上下文
- **快速**: 专注于读取和导出
