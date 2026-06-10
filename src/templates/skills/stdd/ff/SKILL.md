---
id: stdd.ff
command: /stdd:ff
description: Fast-Forward 为明确需求一次性生成核心产物（语言无关）
version: "3.0"
category: lifecycle
phase: orchestration
read_only: false
risk_level: high
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.init]
next: [stdd.apply]
on_failure: []
inputs:
  - 需求描述
  - 可选 change-name
  - workspace
outputs:
  - proposal.md
  - specs/
  - design.md
  - tasks.md
evidence:
  required: true
  path: stdd/changes/<change-id>/evidence/
constitution_articles:
  blocking: [2]
  warning: []
  suggestion: []
graph:
  node_id: stdd.ff
  parallelizable: false
  resumable: true
  checkpoint: per-phase
---

# STDD Skill: /stdd:ff

## Purpose
**Fast-Forward 为明确需求一次性生成核心产物**。这是 Chaos Code 的快速通道 skill，跳过人工交互步骤，直接生成核心产物。

**核心设计原则：**
- **语言无关**：适用于任何编程语言
- **快速通道**：跳过 confirm/clarify 门禁
- **明确需求**：仅适用于边界清晰的小需求
- **产物完整**：一次生成 proposal、specs、design、tasks

## When to Use
- 需求边界明确，无需澄清时
- 小型功能开发，风险可控时
- 快速原型验证时
- 紧急 bug 修复时

## Fast-Forward 流程

```
┌─────────────┐
│    输入     │ 需求描述
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  创建变更   │ 创建 change 目录
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  生成提案   │ proposal.md
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  生成规格   │ specs/
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  生成设计   │ design.md
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  生成任务   │ tasks.md
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  停在 apply │ 准备开始实现
└─────────────┘
```

## 适用场景

### ✅ 适合 Fast-Forward
- **明确的 bug 修复**：错误信息清晰，修复路径明确
- **小型功能**：添加简单字段或端点
- **配置更新**：修改配置文件或环境变量
- **文档更新**：更新 README 或注释

### ❌ 不适合 Fast-Forward
- **需求模糊**：需要澄清的需求
- **架构变更**：影响多个模块
- **高风险变更**：需要设计评审
- **跨团队协作**：需要多方确认

## CLI Runtime

```bash
# Fast-Forward 模式
chaos ff "添加用户登录功能" --change-name add-user-login

# 使用默认 change-name
chaos ff "修复登录页面样式问题"

# 指定 workspace
chaos ff "添加 API 限流" --workspace packages/api

# 包含设计文档
chaos ff "添加用户注册" --include-design

# 跳过设计文档
chaos ff "修改错误提示" --skip-design

# 输出到指定目录
chaos ff "功能描述" --output custom/path
```

## 生成的产物

### 1. proposal.md
```markdown
# Proposal: <change-name>

## Summary
<需求摘要>

## Background
<背景信息>

## Solution
<解决方案概述>

## Alternatives Considered
<替代方案>

## Risks
<风险分析>
```

### 2. specs/
```markdown
# Spec: <feature-name>

## Requirements
<需求列表>

## Acceptance Criteria
<验收标准>

## Edge Cases
<边界情况>
```

### 3. design.md（可选）
```markdown
# Design: <feature-name>

## Architecture Overview
<架构概述>

## Data Models
<数据模型>

## API Design
<API 设计>

## Test Strategy
<测试策略>
```

### 4. tasks.md
```markdown
# Tasks: <change-name>

## Phase 1: Foundation
- [ ] TASK-001: 设置项目结构
- [ ] TASK-002: 配置测试环境

## Phase 2: Core Features
- [ ] TASK-003: 实现核心功能
- [ ] TASK-004: 添加验证逻辑

## Phase 3: Testing
- [ ] TASK-005: 编写单元测试
- [ ] TASK-006: 编写集成测试
```

## Graph Semantics
- 节点 ID 为 stdd.ff，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-phase；resumable=true；parallelizable=false。
- 跳过 confirm/clarify，直接生成核心产物。

## Constitution Gates
- **Blocking 条例 2 (TDD)**: 生成的任务必须包含测试

## Evidence Contract
- 所有产物写入 `stdd/changes/<change-id>/`
- 生成记录写入 `stdd/changes/<change-id>/evidence/ff-*.json`

## Related Skills
- **stdd.new** - 创建新变更（包含 confirm）
- **stdd.propose** - 生成提案
- **stdd.spec** - 生成规格
- **stdd.plan** - 生成任务
- **stdd.turbo** - 全流程自动化

## 参考资源

### 快速开发实践
- [Rapid Application Development](https://en.wikipedia.org/wiki/Rapid_application_development)
- [Agile Development Practices](https://www.agilealliance.org/agile101/)

### 自动化代码生成
- [Yeoman](https://yeoman.io/) - Scaffolding tool
- [Plop](https://plopjs.com/) - Micro-generator framework

## 设计决策

### 为什么需要 Fast-Forward？
- **效率**: 明确需求无需多轮交互
- **速度**: 快速生成产物，立即开始实现
- **灵活性**: 提供快速通道，但不强制使用

### 什么时候不应该使用 Fast-Forward？
- **需求不明确**: 需要澄清时用 new/clarify
- **高风险**: 需要设计评审时走完整流程
- **协作**: 需要团队确认时用 confirm

### 为什么停在 apply 前？
- **人工审查**: 生成产物需要确认
- **灵活性**: 允许修改后再实现
- **安全**: 避免直接修改代码
