---
id: stdd.graph
command: /stdd:graph
description: Skill Graph 的 DAG 分析、推荐、运行、历史和 replay（语言无关）
version: "3.0"
category: orchestration
phase: orchestration
read_only: true
risk_level: low
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.init]
next: [stdd.parallel]
on_failure: []
inputs:
  - skill metadata
  - status
  - progress
  - intent
outputs:
  - DAG analysis
  - execution logs
  - recommendations
evidence:
  required: true
  path: stdd/evidence/
constitution_articles:
  blocking: []
  warning: []
  suggestion: []
graph:
  node_id: stdd.graph
  parallelizable: true
  resumable: true
  checkpoint: per-phase
---

# STDD Skill: /stdd:graph

## Purpose
**Skill Graph 的 DAG 分析、推荐、运行、历史和 replay**。这是 Chaos Code 的编排 skill，管理技能依赖图并智能执行工作流。

**核心设计原则：**
- **语言无关**：适用于任何编程语言
- **DAG 编排**：基于有向无环图的依赖管理
- **智能推荐**：根据状态推荐下一步
- **可追溯**：完整的执行历史记录

## When to Use
- 需要自动化执行多个技能时
- 需要分析技能依赖关系时
- 需要查看执行历史时
- 需要回放执行流程时

## Skill Graph 架构

### DAG 结构
```
        ┌─────────────┐
        │    init     │ 初始化
        └──────┬──────┘
               │
        ┌──────▼──────┐
        │  new/propose│ 提案
        └──────┬──────┘
               │
        ┌──────▼──────┐
        │   clarify   │ 澄清
        └──────┬──────┘
               │
        ┌──────▼──────┐
        │   confirm   │ 确认门（HITL）
        └──────┬──────┘
               │
        ┌──────▼──────┐
        │    spec     │ 规格
        └──────┬──────┘
               │
        ┌──────▼──────┐
        │  api-spec   │ API规范
        └──────┬──────┘
               │
        ┌──────▼──────┐
        │   design    │ 设计
        └──────┬──────┘
               │
        ┌──────▼──────┐
        │    plan     │ 计划
        └──────┬──────┘
               │
        ┌──────▼──────┐
        │   apply     │ 实现（TDD循环）
        └──────┬──────┘
               │
        ┌──────▼──────┐
        │   verify    │ 验证
        └──────┬──────┘
               │
        ┌──────▼──────┐
        │   archive   │ 归档
        └─────────────┘
```

### Intent 驱动执行

#### Feature Intent
完整功能开发流程，包含 outside-in 分析：
```
init → propose → clarify → confirm → spec → api-spec → design → plan → apply → verify → archive
```

#### Repair Intent
修复模式，从 fix-packet 开始：
```
fix-packet → apply → verify
```

#### Hotfix Intent
快速修复通道：
```
issue → apply → verify
```

## CLI Runtime

```bash
# 运行完整流程
chaos graph run feature --change-name <change-id>

# 修复模式
chaos graph run --intent repair --change-name <change-id>

# 热修复模式
chaos graph run --intent hotfix --change-name <change-id>

# 分析依赖
chaos graph analyze

# 推荐下一步
chaos graph recommend

# 查看历史
chaos graph history

# 回放执行
chaos graph replay <session-id>
```

## Graph 语义

### 节点属性
每个技能节点包含：
- `node_id`: 唯一标识符
- `parallelizable`: 是否可并行执行
- `resumable`: 是否可恢复
- `checkpoint`: 检查点粒度
- `depends_on`: 依赖的技能列表
- `next`: 下一步技能列表

### 执行规则
1. **依赖优先**: 先执行 depends_on 中的技能
2. **门禁检查**: 在 confirm、verify 等 gate 点检查
3. **并行执行**: parallelizable=true 的技能可并行
4. **失败处理**: 失败时触发 on_failure 技能
5. **检查点**: 在 checkpoint 点保存状态

## 推荐系统

### 基于状态的推荐
```javascript
if (noChange) {
  recommend("chaos new 或 chaos ff");
} else if (noProposal) {
  recommend("chaos propose");
} else if (notConfirmed) {
  recommend("chaos confirm");
} else if (noSpecs) {
  recommend("chaos spec");
} else if (noTasks) {
  recommend("chaos plan");
} else if (hasPendingTasks) {
  recommend("chaos apply");
} else if (notVerified) {
  recommend("chaos verify");
} else {
  recommend("chaos archive");
}
```

## 历史与回放

### 执行历史
```json
{
  "sessionId": "20250519-103000",
  "changeId": "add-user-login",
  "intent": "feature",
  "startTime": "2025-05-19T10:30:00Z",
  "endTime": "2025-05-19T14:30:00Z",
  "skills": [
    { "name": "propose", "status": "completed", "duration": 300 },
    { "name": "spec", "status": "completed", "duration": 600 },
    { "name": "apply", "status": "in_progress", "duration": null }
  ]
}
```

### 回放功能
- 查看完整执行流程
- 分析时间分布
- 识别瓶颈
- 重现执行路径

## Graph Semantics
- 节点 ID 为 stdd.graph，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-phase；resumable=true；parallelizable=true。
- 尊重 depends_on/next，不越过 gate。

## Constitution Gates
- 无直接条例检查
- 依赖下游技能的 gate 检查

## Evidence Contract
- 执行历史写入 `stdd/graph/history.jsonl`
- 分析报告写入 `stdd/evidence/graph-*.json`

## Related Skills
- **stdd.init** - 初始化项目
- **stdd.parallel** - 并行执行
- **stdd.turbo** - 全流程自动化

## 参考资源

### DAG 编排
- [Apache Airflow](https://airflow.apache.org/) - 工作流编排
- [Temporal](https://temporal.io/) - 持久化执行
- [DAG](https://en.wikipedia.org/wiki/Directed_acyclic_graph) - 有向无环图

### 工作流引擎
- [GitHub Actions](https://github.com/features/actions)
- [GitLab CI](https://docs.gitlab.com/ee/ci/)
- [CircleCI](https://circleci.com/)

## 设计决策

### 为什么使用 DAG？
- **依赖管理**: 清晰表达技能依赖
- **并行执行**: 识别可并行的工作
- **可视化**: 易于理解和调试

### 为什么需要 Intent？
- **灵活性**: 不同场景不同流程
- **优化**: 跳过不必要的步骤
- **清晰**: 明确执行意图

### 为什么需要历史记录？
- **审计**: 完整的执行追踪
- **调试**: 分析失败原因
- **优化**: 识别性能瓶颈
