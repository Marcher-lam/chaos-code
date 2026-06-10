---
id: stdd.plan
command: /stdd:plan
description: 从规格生成技术设计和原子 TDD tasks（语言无关）
version: "3.0"
category: lifecycle
phase: planning
read_only: false
risk_level: medium
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.spec]
next: [stdd.apply]
on_failure: []
inputs:
  - proposal.md
  - specs/
  - 技术栈
  - workspace
outputs:
  - stdd/changes/<change-id>/design.md
  - stdd/changes/<change-id>/tasks.md
evidence:
  required: true
  path: stdd/changes/<change-id>/evidence/
constitution_articles:
  blocking: []
  warning: [1, 4, 6]
  suggestion: []
graph:
  node_id: stdd.plan
  parallelizable: false
  resumable: true
  checkpoint: per-change
---

# STDD Skill: /stdd:plan

## Purpose
**从规格生成技术设计和原子 TDD tasks**。这是 Chaos Code 的计划 skill，将规格转化为可执行的任务。

**核心设计原则：**
- **语言无关**：适用于任何编程语言
- **原子任务**：每个任务可独立 TDD
- **技术设计**：包含架构和风险
- **可追溯**：任务回溯到规格

## When to Use
- 有完整规格后需要任务分解时
- 需要技术设计文档时
- 需要评估工作量时
- 需要团队协作时

## 设计文档

### design.md 结构
```markdown
# Design: <change-id>

## Architecture Overview
- 系统边界
- 模块划分
- 通信方式

## Data Models
- 实体定义
- 关系图
- 存储策略

## API Design
- 端点列表
- 请求/响应格式
- 错误处理

## Risks
- 技术风险
- 业务风险
- 依赖风险

## Test Strategy
- 单元测试
- 集成测试
- E2E 测试
```

## 任务分解原则

### 原子任务特征
1. **独立**: 可单独实现和测试
2. **TDD 友好**: 适合 Red-Green-Refactor
3. **可验证**: 有明确的验收标准
4. **合理粒度**: 1-4 小时完成

### 任务数量
- **小型变更**: 3-5 个任务
- **中型变更**: 5-10 个任务
- **大型变更**: 10+ 个任务（建议拆分）

## CLI Runtime

```bash
# 生成计划和任务
chaos plan <change-id>

# 从规格生成
chaos plan <change-id> --from-specs

# 包含 ADR
chaos plan <change-id> --adr

# 指定任务数量
chaos plan <change-id> --tasks 8

# 恢复计划
chaos plan --resume <change-id>

# Workspace 支持
chaos plan <change-id> --workspace packages/api
```

## 任务模板

### tasks.md
```markdown
# Tasks: <change-id>

## Phase 1: Foundation
- [ ] TASK-001: 设置项目结构和配置
- [ ] TASK-002: 配置测试环境
- [ ] TASK-003: 定义数据模型

## Phase 2: Core Features
- [ ] TASK-004: 实现 API 端点框架
- [ ] TASK-005: 实现业务逻辑
- [ ] TASK-006: 实现数据访问层

## Phase 3: Integration
- [ ] TASK-007: 集成外部服务
- [ ] TASK-008: 实现错误处理

## Phase 4: Testing & Polish
- [ ] TASK-009: 完善测试覆盖
- [ ] TASK-010: 性能优化和文档

## Dependencies
- TASK-004 depends on: TASK-001, TASK-002
- TASK-005 depends on: TASK-003, TASK-004
- TASK-007 depends on: TASK-005, TASK-006
```

## Graph Semantics
- 节点 ID 为 stdd.plan，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-change；resumable=true；parallelizable=false。
- 依赖 spec，下一步是 apply。

## Constitution Gates
- **Warning 条例 1 (Library-First)**: 评估是否使用现有库
- **Warning 条例 4 (Code Style)**: 设计应包含代码风格
- **Warning 条例 6 (Error Handling)**: 设计应包含错误处理

## Evidence Contract
- 设计文档写入 `stdd/changes/<change-id>/design.md`
- 任务列表写入 `stdd/changes/<change-id>/tasks.md`
- 计划证据写入 `stdd/changes/<change-id>/evidence/plan-*.json`

## Related Skills
- **stdd.apply** - 执行任务
- **stdd.spec** - 输入规格
- **stdd.design** - 详细设计

## 参考资源

### 任务分解
- [User Story Mapping](https://www.userstorymap.com/)
- [WBS (Work Breakdown Structure)](https://en.wikipedia.org/wiki/Work_breakdown_structure)

### 技术设计
- [C4 Model](https://c4model.com/)
- [ADR (Architecture Decision Record)](https://adr.github.io/)

## 设计决策

### 为什么原子任务？
- **并行**: 团队可并行工作
- **独立**: 任务互不影响
- **TDD**: 适合 TDD 循环

### 为什么技术设计？
- **指导**: 为实现提供指导
- **风险**: 识别技术风险
- **协作**: 团队达成共识

### 为什么 5-10 个任务？
- **合理**: 不太大不太小
- **可追踪**: 容易跟踪进度
- **完成感**: 阶段性完成
