---
id: stdd.new
command: /stdd:new
description: 创建变更工作区并启动 Spec-First 需求流（语言无关）
version: "3.0"
category: lifecycle
phase: discovery
read_only: false
risk_level: medium
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.init]
next: [stdd.propose]
on_failure: []
inputs:
  - change-id 或需求描述
  - 项目状态
  - 可选 --title/--description
outputs:
  - stdd/changes/<change-id>/proposal.md
  - stdd/changes/<change-id>/.status.yaml
  - stdd/changes/<change-id>/evidence/
evidence:
  required: true
  path: stdd/changes/<change-id>/evidence/
constitution_articles:
  blocking: []
  warning: []
  suggestion: []
graph:
  node_id: stdd.new
  parallelizable: false
  resumable: true
  checkpoint: per-change
---

# STDD Skill: /stdd:new

## Purpose
**创建变更工作区并启动 Spec-First 需求流**。这是 Chaos Code 的变更创建 skill，初始化新的开发任务。

**核心设计原则：**
- **语言无关**：适用于任何编程语言
- **Spec-First**：从规格开始
- **目录隔离**：每个变更独立目录
- **状态追踪**：.status.yaml 追踪进度

## When to Use
- 开始新功能开发时
- 修复 bug 时
- 重构代码时
- 任何需要追踪的变更

## 变更目录结构

```
stdd/changes/<change-id>/
├── proposal.md          # 需求提案
├── .status.yaml         # 状态文件
├── specs/               # 规格
│   └── .gitkeep
├── design.md            # 设计文档（可选）
├── tasks.md             # 任务列表
├── evidence/            # 证据目录
│   └── .gitkeep
└── apply.log            # 执行日志
```

## CLI Runtime

```bash
# 创建新变更
chaos new <change-id>

# 带标题
chaos new <change-id> --title "Add user login"

# 带描述
chaos new <change-id> --description "Implement OAuth2 login"

# 从需求描述生成 ID
chaos new "Add user authentication"

# 指定 workspace
chaos new <change-id> --workspace packages/api

# 列出变更
chaos new --list

# 查看状态
chaos status <change-id>
```

## 状态文件

### .status.yaml
```yaml
change_id: add-user-login
created_at: "2025-05-19T10:30:00Z"
status: in_progress
phase: apply

artifacts:
  proposal: true
  specs: true
  design: true
  tasks: true

tasks:
  total: 10
  completed: 6
  pending: 4
```

## Proposal 模板

### proposal.md
```markdown
# Proposal: <change-id>

## Summary
<功能摘要>

## Background
<背景信息>

## Goals
- <目标 1>
- <目标 2>

## Non-Goals
- <不包含的内容>

## Approach
<实现方法概述>

## Alternatives Considered
- <替代方案 1>
- <替代方案 2>

## Risks
- <风险 1>
- <风险 2>

## Success Criteria
- <成功标准 1>
- <成功标准 2>
```

## Graph Semantics
- 节点 ID 为 stdd.new，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-change；resumable=true；parallelizable=false。
- 依赖 init，下一步是 propose。

## Constitution Gates
- 无直接条例检查

## Evidence Contract
- 创建记录写入 `stdd/changes/<change-id>/evidence/new-*.json`

## Related Skills
- **stdd.init** - 初始化项目
- **stdd.propose** - 生成提案
- **stdd.ff** - 快速通道

## 参考资源

### 变更管理
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Keep a Changelog](https://keepachangelog.com/)

## 设计决策

### 为什么每个变更独立目录？
- **隔离**: 变更互不影响
- **清晰**: 明确的边界
- **可删除**: 完成后可归档

### 为什么需要状态文件？
- **追踪**: 了解当前进度
- **恢复**: 断点续传
- **报告**: 生成状态报告
