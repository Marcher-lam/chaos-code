---
id: stdd.iterate
command: /stdd:iterate
description: 执行 Plan-Execute-Reflect 自主迭代循环（语言无关）
version: "3.0"
category: orchestration
phase: orchestration
read_only: false
risk_level: high
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.graph]
next: [stdd.verify]
on_failure: []
inputs:
  - 目标
  - 成功标准
  - max iterations
  - 当前状态
outputs:
  - iteration log
  - reflection report
evidence:
  required: true
  path: stdd/changes/<change-id>/evidence/
constitution_articles:
  blocking: []
  warning: []
  suggestion: [8]
graph:
  node_id: stdd.iterate
  parallelizable: false
  resumable: true
  checkpoint: per-phase
---

# STDD Skill: /stdd:iterate

## Purpose
**执行 Plan-Execute-Reflect 自主迭代循环**。这是 Chaos Code 的迭代 skill，实现自主学习和改进循环。

**核心设计原则：**
- **语言无关**：适用于任何编程语言
- **自主循环**：Plan → Execute → Reflect
- **目标驱动**：明确的成功标准
- **可追溯**：完整的迭代记录

## When to Use
- 需要自主迭代优化时
- 需要渐进式改进时
- 需要系统化探索解决方案时
- 需要记录迭代过程时

## PER 迭代循环

### Plan（计划）
```
┌─────────────┐
│  定义目标   │ 明确本轮目标
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  设定范围   │ 确定作用域
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  规划动作   │ 列出具体步骤
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  验收标准   │ 定义成功条件
└─────────────┘
```

### Execute（执行）
```
┌─────────────┐
│  执行计划   │ 按步骤执行
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  收集数据   │ 记录执行结果
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  运行测试   │ 验证结果
└─────────────┘
```

### Reflect（反思）
```
┌─────────────┐
│  分析结果   │ 对比预期与实际
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  识别模式   │ 发现成功/失败模式
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  调整策略   │ 规划下一轮
└─────────────┘
```

## CLI Runtime

```bash
# 启动迭代
chaos iterate <change-id>

# 指定目标
chaos iterate <change-id> --goal "提高覆盖率到 90%"

# 指定成功标准
chaos iterate <change-id> --success "coverage >= 90"

# 最大迭代次数
chaos iterate <change-id> --max-iterations 10

# 指定 workspace
chaos iterate <change-id> --workspace packages/api
```

## 停止条件

### 成功停止
- 达到成功标准
- 质量指标满足要求

### 失败停止
- 达到最大迭代次数
- 质量指标退化
- 连续 N 次无进展

### 手动停止
- 用户中断
- 达到时间限制

## Graph Semantics
- 节点 ID 为 stdd.iterate，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-phase；resumable=true；parallelizable=false。

## Constitution Gates
- **Suggestion 条例 8 (Performance)**: 迭代应考虑性能指标

## Evidence Contract
- 迭代日志写入 `stdd/changes/<change-id>/evidence/iterate-*.jsonl`
- 反思报告写入 `stdd/changes/<change-id>/evidence/reflection-*.md`

## Related Skills
- **stdd.graph** - 图编排
- **stdd.verify** - 验证结果

## 参考资源

### 迭代方法
- [Plan-Do-Check-Act](https://en.wikipedia.org/wiki/PDCA) - PDCA 循环
- [Agile Iterative Development](https://www.agilealliance.org/

## 设计决策

### 为什么 PER 循环？
- **简单**: 易于理解和实施
- **有效**: 经过验证的方法
- **灵活**: 适应各种场景

### 为什么需要停止条件？
- **资源保护**: 防止无限循环
- **成本控制**: 限制计算资源
- **时间管理**: 明确时间边界
