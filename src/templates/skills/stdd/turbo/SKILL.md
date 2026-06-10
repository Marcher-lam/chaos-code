---
id: stdd.turbo
command: /stdd:turbo
description: 一键编排从需求到 TDD scaffold 与验证准备（语言无关）
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
next: [stdd.verify]
on_failure: [stdd.fix-packet]
inputs:
  - 需求描述
  - 自动化策略
  - workspace
  - HITL 策略
outputs:
  - 核心产物
  - TDD scaffold
  - graph/progress/evidence
evidence:
  required: true
  path: stdd/changes/<change-id>/evidence/
constitution_articles:
  blocking: [2, 7, 9]
  warning: []
  suggestion: []
graph:
  node_id: stdd.turbo
  parallelizable: false
  resumable: true
  checkpoint: per-phase
---

# STDD Skill: /stdd:turbo

## Purpose
**一键编排从需求到 TDD scaffold 与验证准备**。这是 Chaos Code 的 Turbo skill，提供端到端的自动化工作流。

**核心设计原则：**
- **语言无关**：适用于任何编程语言
- **端到端**：从需求到验证准备
- **可暂停**：在关键门禁暂停
- **可恢复**：支持中断恢复

## When to Use
- 需要快速开始新功能时
- 需要自动化工作流时
- 需要完整 TDD 流程时
- 需要验证准备时

## CLI Runtime

```bash
# 完整 turbo 流程
chaos turbo "添加用户登录功能"

# 指定 workspace
chaos turbo "添加用户登录功能" --workspace packages/api

# 跳过 spec 阶段
chaos turbo "修复登录bug" --no-spec

# 指定自动化策略
chaos turbo "添加用户登录功能" --strategy full-auto
chaos turbo "添加用户登录功能" --strategy hitl-confirm
chaos turbo "添加用户登录功能" --strategy hitl-apply

# 继续中断的 turbo
chaos turbo resume <change-id>
```

## Turbo 流程

### 完整流程
```
需求
  │
  ▼
┌─────────────┐
│  Fast-Forward│
│  (ff)       │
└─────────────┘
  │
  ▼
┌─────────────┐
│  Spec 校验  │
│  (spec)     │
└─────────────┘
  │
  ▼
┌─────────────┐
│  TDD Scaffold│
│  (plan)     │
└─────────────┘
  │
  ▼
┌─────────────┐
│  可选 Apply │
│  (execute)  │
└─────────────┘
  │
  ▼
┌─────────────┐
│  Mutation   │
│  (mutation) │
└─────────────┘
  │
  ▼
┌─────────────┐
│  Verify     │
│  (verify)   │
└─────────────┘
```

### HITL 策略

#### full-auto
- 全自动执行
- 仅在门禁暂停
- 适合小变更

#### hitl-confirm
- 需求确认时暂停
- 等待人工确认
- 适合中等变更

#### hitl-apply
- 需求和实现确认时暂停
- 等待人工确认
- 适合大变更

## 多语言支持

### JavaScript/TypeScript
```bash
chaos turbo "添加用户登录" --lang typescript
```
- 生成 Jest/Vitest 测试
- 生成 TypeScript 类型
- ESLint 配置

### Python
```bash
chaos turbo "添加用户登录" --lang python
```
- 生成 pytest 测试
- 生成类型注解
- Black/flake8 配置

### Java
```bash
chaos turbo "添加用户登录" --lang java
```
- 生成 JUnit 测试
- 生成 Java 类型
- Checkstyle 配置

### Go
```bash
chaos turbo "添加用户登录" --lang go
```
- 生成 testing 测试
- 生成 Go 类型
- gofmt 配置

### Rust
```bash
chaos turbo "添加用户登录" --lang rust
```
- 生成内置测试
- 生成 Rust 类型
- rustfmt 配置

## Graph Semantics
- 节点 ID 为 stdd.turbo，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-phase；resumable=true；parallelizable=false。
- 依赖 init，下一步是 verify。

## Constitution Gates
- **Blocking 条例 2 (Test First)**: 必须先写测试
- **Blocking 条例 7 (Security)**: 必须检查安全
- **Blocking 条例 9 (Evidence)**: 必须保留证据

## Evidence Contract
- 所有证据写入 `stdd/changes/<change-id>/evidence/`
- 包含每个阶段的输出和状态

## Related Skills
- **stdd.ff** - Fast Forward
- **stdd.spec** - 规格
- **stdd.plan** - 计划
- **stdd.execute** - 执行
- **stdd.mutation** - 变异测试
- **stdd.verify** - 验证
- **stdd.fix-packet** - 失败修复

## 参考资源

### CI/CD
- [CI/CD Patterns](https://www.patterns.dev/)
- [GitHub Actions](https://docs.github.com/en/actions)

## 设计决策

### Why Turbo？
- **快速**: 一键启动
- **完整**: 覆盖全流程
- **灵活**: 可配置策略

### Why HITL？
- **控制**: 人工控制关键点
- **质量**: 确保质量
- **学习**: 团队学习
