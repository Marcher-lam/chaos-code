---
id: stdd.supervisor
command: /stdd:supervisor
description: 协调多 Agent 任务委派、同步和失败升级（语言无关）
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
  - 任务队列
  - 角色
  - 依赖图
  - rounds
outputs:
  - assignment plan
  - agent status
  - completion report
evidence:
  required: true
  path: stdd/changes/<change-id>/evidence/
constitution_articles:
  blocking: []
  warning: [4, 6]
  suggestion: []
graph:
  node_id: stdd.supervisor
  parallelizable: false
  resumable: true
  checkpoint: per-phase
---

# STDD Skill: /stdd:supervisor

## Purpose
**协调多 Agent 任务委派、同步和失败升级**。这是 Chaos Code 的编排 skill，负责多 Agent 协作和任务分发。

**核心设计原则：**
- **语言无关**：适用于任何编程语言
- **多 Agent**：支持多个 Agent 并行工作
- **失败升级**：自动处理失败并升级
- **可恢复**：支持中断恢复

## When to Use
- 需要多 Agent 协作时
- 需要任务分发时
- 需要失败恢复时
- 需要进度跟踪时

## CLI Runtime

```bash
# 启动 supervisor
chaos supervisor start <change-id> --rounds 3

# 查看状态
chaos supervisor status <change-id>

# 继续执行
chaos supervisor next <change-id>

# 停止执行
chaos supervisor stop <change-id>

# Workspace 支持
chaos supervisor start <change-id> --workspace packages/api
```

## Agent 角色

### 开发 Agent
- 编写代码
- 运行测试
- 修复 bug

### 审查 Agent
- 代码审查
- 安全检查
- 性能分析

### 测试 Agent
- 编写测试
- 运行 mutation
- 覆盖率分析

## 协作模式

### 并行执行
```
Agent 1 ──┐
          ├──> Supervisor ──> Result
Agent 2 ──┘
```

### 串行执行
```
Agent 1 ──> Agent 2 ──> Agent 3 ──> Result
```

### 混合执行
```
Agent 1 ──┐
          ├──> Agent 4 ──> Result
Agent 2 ──┤
          ├──> Agent 5 ──> Result
Agent 3 ──┘
```

## 失败处理

### 重试策略
| 策略 | 描述 | 适用场景 |
|------|------|----------|
| immediate | 立即重试 | 瞬时故障 |
| backoff | 指数退避 | 网络问题 |
| escalate | 升级处理 | 持续失败 |

### 熔断机制
- 连续失败 3 次
- 触发熔断
- 生成 fix-packet
- 等待人工介入

## Graph Semantics
- 节点 ID 为 stdd.supervisor，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-phase；resumable=true；parallelizable=false。
- 依赖 graph，下一步是 verify。

## Constitution Gates
- **Warning 条例 4 (Code Style)**: 代码应遵循风格
- **Warning 条例 6 (Error Handling)**: 错误应正确处理

## Evidence Contract
- 分配计划写入 `stdd/changes/<change-id>/evidence/assignment-*.json`
- 状态报告写入 `stdd/changes/<change-id>/evidence/supervisor-*.json`
- 完成报告写入 `stdd/changes/<change-id>/evidence/completion-*.json`

## Related Skills
- **stdd.graph** - 依赖图
- **stdd.verify** - 综合验证
- **stdd.fix-packet** - 失败修复

## 参考资源

### 多 Agent 系统
- [Multi-Agent Systems](https://en.wikipedia.org/wiki/Multi-agent_system)
- [Orchestration Patterns](https://www.patterns.dev/)

## 设计决策

### Why Supervisor？
- **协调**: 多 Agent 需要协调
- **跟踪**: 进度需要跟踪
- **恢复**: 失败需要恢复

### Why 失败升级？
- **智能**: 自动处理简单失败
- **人工**: 复杂问题人工介入
- **效率**: 减少人工干预
