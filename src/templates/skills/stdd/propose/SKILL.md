---
id: stdd.propose
command: /stdd:propose
description: 把用户意图整理为边界清晰的变更 proposal（语言无关）
version: "3.0"
category: lifecycle
phase: proposal
read_only: false
risk_level: medium
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.new]
next: [stdd.clarify]
on_failure: []
inputs:
  - proposal 草稿
  - 用户需求
  - 探索报告
  - vision/specs
outputs:
  - stdd/changes/<change-id>/proposal.md
  - proposal evidence
evidence:
  required: true
  path: stdd/changes/<change-id>/evidence/
constitution_articles:
  blocking: []
  warning: [5]
  suggestion: []
graph:
  node_id: stdd.propose
  parallelizable: false
  resumable: true
  checkpoint: per-change
---

# STDD Skill: /stdd:propose

## Purpose
**把用户意图整理为边界清晰的变更 proposal**。这是 Chaos Code 的提案 skill，将用户需求转化为结构化的提案文档。

**核心设计原则：**
- **语言无关**：适用于任何编程语言
- **边界清晰**：明确 In/Out of Scope
- **价值驱动**：突出用户价值
- **可追溯**：从需求到提案

## When to Use
- 有新功能想法时
- 需要记录变更提案时
- 需要团队评审时
- 需要追踪决策时

## Proposal 模板

### proposal.md
```markdown
# Proposal: <change-id>

## Summary
<功能摘要，1-2 句话>

## Background
<背景信息，为什么需要这个变更>

## Goals
<目标列表，我们想要实现什么>

## Non-Goals
<不包含的内容，明确边界>

## User Value
<对用户的价值>

## In Scope
<包含的功能>

## Out of Scope
<不包含的功能>

## Success Criteria
<成功标准，如何衡量完成>

## Risks
<潜在风险和缓解措施>

## Alternatives Considered
<考虑过的替代方案>

## Open Questions
<待澄清的问题>
```

## CLI Runtime

```bash
# 生成提案
chaos propose <change-id>

# 从描述生成
chaos propose <change-id> --description "Add user login"

# 从探索报告生成
chaos propose <change-id> --from-explore

# 指定类型
chaos propose <change-id> --type feature
chaos propose <change-id> --type bugfix
chaos propose <change-id> --type refactor

# Workspace 支持
chaos propose <change-id> --workspace packages/api
```

## 提案类型

### Feature（新功能）
- 新功能开发
- 用户价值明显
- 需要设计和实现

### Bugfix（Bug 修复）
- 修复问题
- 明确的复现步骤
- 快速修复

### Refactor（重构）
- 代码质量改进
- 不改变外部行为
- 技术债务清理

### Enhancement（增强）
- 现有功能改进
- 性能优化
- 用户体验提升

## 提案评估

### 评估维度
| 维度 | 说明 | 阈值 |
|------|------|------|
| 范围 | 功能范围大小 |适中|
| 复杂度 | 技术难度 |可控|
| 风险 | 潜在风险 |低-中|
| 价值 | 用户价值 |明确|

### Epic 检测
- 过大的提案会被标记为 Epic
- 建议拆分为多个小变更
- 每个 change 应可在 1-2 周完成

## Graph Semantics
- 节点 ID 为 stdd.propose，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-change；resumable=true；parallelizable=false。
- 依赖 new，下一步是 clarify。

## Constitution Gates
- **Suggestion 条例 5 (Documentation)**: 提案应有清晰文档

## Evidence Contract
- 提案写入 `stdd/changes/<change-id>/proposal.md`
- 证据写入 `stdd/changes/<change-id>/evidence/propose-*.json`

## Related Skills
- **stdd.new** - 创建变更
- **stdd.clarify** - 澄清需求
- **stdd.confirm** - 确认提案

## 参考资源

### 提案写作
- [RFC Template](https://github.com/rust-lang/rfcs)
- [Python PEP Process](https://www.python.org/dev/peps/)

## 设计决策

### 为什么边界清晰？
- **范围控制**: 防止范围蔓延
- **可估算**: 便于估算工作量
- **可验收**: 明确的完成标准

### 为什么 Non-Goals？
- **明确**: 清楚说明不做什么
- **避免**: 避免争论
- **聚焦**: 聚焦核心价值

### 为什么评估提案？
- **质量**: 确保提案质量
- **可管理**: 控制变更大小
- **优先级**: 帮助排优先级
