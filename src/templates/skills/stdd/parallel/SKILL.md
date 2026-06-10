---
id: stdd.parallel
command: /stdd:parallel
description: 基于 DAG waves 并行执行独立任务或 skill 节点（语言无关）
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
on_failure: [stdd.fix-packet]
inputs:
  - DAG
  - tasks
  - max-workers
  - workspace
outputs:
  - waves plan
  - worker results
  - merged report
evidence:
  required: true
  path: stdd/changes/<change-id>/evidence/
constitution_articles:
  blocking: []
  warning: [4, 6]
  suggestion: []
graph:
  node_id: stdd.parallel
  parallelizable: true
  resumable: true
  checkpoint: per-task
---

# STDD Skill: /stdd:parallel

## Purpose
**基于 DAG waves 并行执行独立任务或 skill 节点**。这是 Chaos Code 的并行执行 skill，提高执行效率。

**核心设计原则：**
- **语言无关**：适用于任何编程语言
- **DAG 波次**：按依赖关系分波执行
- **隔离工作区**：每个 worker 独立环境
- **结果合并**：汇总执行结果

## When to Use
- 需要并行执行独立任务时
- 需要加速 CI/CD 流程时
- 需要最大化资源利用时
- Monorepo 多包并行构建

## DAG Waves 执行

### 波次执行示例
```
Wave 1: [A, B, C]  (无依赖，并行)
   ↓
Wave 2: [D, E]     (依赖 A/B，并行)
   ↓
Wave 3: [F]        (依赖 D/E，执行)
```

### 执行规则
1. **无依赖节点**可并行
2. **有依赖节点**等待依赖完成
3. **每波完成后**合并结果
4. **失败节点**生成 fix-packet

## CLI Runtime

```bash
# 并行执行（自动 worker 数）
chaos graph run feature --parallel

# 指定 worker 数
chaos graph run feature --max-workers 4

# 查看执行计划
chaos graph plan --show-waves

# Workspace 并行
chaos graph run feature --workspace packages/api --parallel
```

## Worker 隔离

### 每个独立环境
- **工作目录**: 独立 temp 目录
- **配置**: 隔离的配置文件
- **日志**: 独立的日志文件
- **证据**: 独立的 evidence 目录

### 结果合并
```json
{
  "wave": 1,
  "workers": 4,
  "results": [
    { "task": "TASK-001", "status": "completed" },
    { "task": "TASK-002", "status": "completed" },
    { "task": "TASK-003", "status": "failed", "error": "..." },
    { "task": "TASK-004", "status": "completed" }
  ],
  "summary": {
    "total": 4,
    "completed": 3,
    "failed": 1
  }
}
```

## Graph Semantics
- 节点 ID 为 stdd.parallel，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-task；resumable=true；parallelizable=true。

## Constitution Gates
- **Warning 条例 4 (Code Style)**: 并行任务应遵循代码规范
- **Warning 条例 6 (Error Handling)**: 并行任务应有错误处理

## Evidence Contract
- 波次计划写入 `stdd/evidence/parallel-plan-*.json`
- 执行结果写入 `stdd/evidence/parallel-result-*.json`

## Related Skills
- **stdd.fix-packet** - 处理失败
- **stdd.graph** - DAG 分析
- **stdd.verify** - 验证结果

## 参考资源

### 并行执行
- [DAG Scheduling](https://en.wikipedia.org/wiki/Directed_acyclic_graph)
- [Parallel Computing](https://en.wikipedia.org/wiki/Parallel_computing)

### CI/CD 并行化
- [GitHub Actions Matrix](https://docs.github.com/en/actions/using-jobs/using-a-matrix-for-your-jobs)
- [GitLab CI Parallel](https://docs.gitlab.com/ee/ci/yaml/#parallel)

## 设计决策

### 为什么波次执行？
- **安全**: 尊重依赖关系
- **效率**: 最大化并行
- **可控**: 可预测的执行

### 为什么隔离环境？
- **独立**: 任务互不影响
- **可重跑**: 失败任务可单独重跑
- **调试**: 清晰的错误定位
