---
id: stdd.prp
command: /stdd:prp
description: 生成 What/Why/How/Success 结构化规划（语言无关）
version: "3.0"
category: spec-first
phase: proposal
read_only: false
risk_level: medium
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.new]
next: [stdd.confirm]
on_failure: []
inputs:
  - 需求描述
  - 业务目标
  - 约束
outputs:
  - PRP document
  - acceptance checklist
evidence:
  required: true
  path: stdd/changes/<change-id>/evidence/
constitution_articles:
  blocking: []
  warning: []
  suggestion: [5]
graph:
  node_id: stdd.prp
  parallelizable: false
  resumable: true
  checkpoint: per-change
---

# STDD Skill: /stdd:prp

## Purpose
**生成 What/Why/How/Success 结构化规划**。这是 Chaos Code 的 PRP（Problem-Resolution-Plan）skill，提供结构化的规划框架。

**核心设计原则：**
- **语言无关**：适用于任何编程语言
- **四段结构**：What/Why/How/Success
- **高层方案**：不涉及具体实现
- **可检查**：Success 必须可验证

## When to Use
- 需要结构化规划时
- 需要明确问题和解法时
- 需要定义成功标准时
- 需要团队对齐时

## PRP 结构

### What（问题）
```
- 当前问题是什么？
- 影响范围多大？
- 谁受影响？
- 现状如何？
```

### Why（原因）
```
- 为什么需要解决这个问题？
- 业务价值是什么？
- 优先级如何？
- 不解决的后果？
```

### How（方案）
```
- 高层解决方案
- 技术方向
- 实现策略
- 不涉及具体代码
```

### Success（成功）
```
- 可量化的指标
- 可验证的标准
- 可映射到 BDD 场景
- 明确的时间表
```

## CLI Runtime

```bash
# 生成 PRP
chaos prp <change-id>

# 从描述生成
chaos prp <change-id> --description "用户登录失败"

# 指定业务目标
chaos prp <change-id> --goal "提高用户转化率 20%"

# 指定约束
chaos prp <change-id> --constraint "预算有限"
chaos prp <change-id> --constraint "时间紧迫"

# Workspace 支持
chaos prp <change-id> --workspace packages/api
```

## PRP 模板

### PRP 文档
```markdown
# PRP: <change-id>

## What（问题）
<描述当前问题>

### 痛状
- <症状 1>
- <症状 2>

### 影响
- <影响范围>
- <受影响用户>

## Why（原因）
<解释为什么重要>

### 业务价值
- <价值 1>
- <价值 2>

### 优先级
- <优先级说明>

## How（方案）
<高层解决方案>

### 技术方向
- <方向 1>
- <方向 2>

### 实现策略
- <策略 1>
- <策略 2>

## Success（成功）
<可检查的成功标准>

### 量化指标
- <指标 1>: <目标值>
- <指标 2>: <目标值>

### 验证标准
- <标准 1>
- <标准 2>

### BDD 映射
- <场景 1>
- <场景 2>
```

## Graph Semantics
- 节点 ID 为 stdd.prp，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-change；resumable=true；parallelizable=false。
- 依赖 new，下一步是 confirm。

## Constitution Gates
- **Suggestion 条例 5 (Documentation)**: PRP 应有清晰文档

## Evidence Contract
- PRP 文档写入 `stdd/changes/<change-id>/prp.md`
- 验收清单写入 `stdd/changes/<change-id>/acceptance.md`

## Related Skills
- **stdd.confirm** - 确认 PRP
- **stdd.new** - 创建变更
- **stdd.spec** - 生成 BDD 规格

## 参考资源

### 问题解决
- [Problem Solving Frameworks](https://www.mindtools.com/pages/article/newTON_44.htm)
- [Root Cause Analysis](https://en.wikipedia.org/wiki/Root_cause_analysis)

## 设计决策

### Why PRP 结构？
- **清晰**: 四段结构清晰
- **完整**: 覆盖问题到方案
- **可执行**: 明确的成功标准

### Why 高层方案？
- **灵活**: 不限制实现方式
- **讨论**: 便于团队讨论
- **决策**: 聚焦方向而非细节
