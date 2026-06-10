---
id: stdd.continue
command: /stdd:continue
description: 根据状态机恢复并推进下一个 STDD 产物（语言无关）
version: "3.0"
category: lifecycle
phase: all
read_only: false
risk_level: medium
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.init]
next: [stdd.apply, stdd.verify, stdd.archive]
on_failure: [stdd.fix-packet]
inputs:
  - change-id
  - status/progress
  - 可选 override flags
outputs:
  - 下一个产物
  - 状态更新
  - 下一步建议
evidence:
  required: true
  path: stdd/changes/<change-id>/evidence/
constitution_articles:
  blocking: []
  warning: []
  suggestion: []
graph:
  node_id: stdd.continue
  parallelizable: false
  resumable: true
  checkpoint: per-phase
---

# STDD Skill: /stdd:continue

## Purpose
**根据状态机恢复并推进下一个 STDD 产物**。这是 Chaos Code 的会话恢复 skill，智能检测项目状态并继续工作。

**核心设计原则：**
- **语言无关**：适用于任何编程语言和项目
- **状态感知**：自动检测当前进度
- **智能恢复**：从上次中断处继续
- **灵活控制**：支持 override 和 force 标志

## When to Use
- 需要恢复中断的工作时
- 需要推进到下一个阶段时
- 需要查看当前进度时
- 需要跳过某个阶段时（使用 --force）

## STDD 状态机

```
┌─────────────┐
│   propose   │ ← 提案阶段
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   clarify   │ ← 澄清阶段
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   confirm   │ ← 确认门（HITL）
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    spec     │ ← 规格阶段
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    plan     │ ← 计划阶段
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   apply     │ ← 实现阶段（TDD 循环）
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   verify    │ ← 验证阶段
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   archive   │ ← 归档阶段
└─────────────┘
```

## CLI Runtime

```bash
# 自动检测并继续
chaos continue

# 继续指定变更
chaos continue <change-id>

# 强制跳过当前阶段
chaos continue --force

# 覆盖测试命令
chaos continue --test-command "pytest"

# 查看进度（不执行）
chaos continue --dry-run

# 指定工作空间
chaos continue --workspace packages/api
```

## 状态检测

### 自动检测逻辑
1. **查找活跃变更**: 搜索有未完成任务或最近活动的变更
2. **读取状态文件**: 解析 .status.yaml、progress.jsonl、apply.log
3. **确定当前阶段**: 根据产物存在情况判断
4. **推荐下一步**: 输出下一个命令或产物

### 优先级规则
| 优先级 | 检测条件 | 说明 |
|--------|----------|------|
| 1 | apply.log 存在且有失败记录 | 继续失败的 apply |
| 2 | tasks.md 有未完成任务 | 继续 apply |
| 3 | proposal.md 存在但未 confirm | 进入 confirm |
| 4 | specs/ 存在但无 tasks.md | 进入 plan |
| 5 | 无任何产物 | 建议运行 new/propose |

## TDD 循环恢复

### Apply 阶段恢复
```bash
# 检测 TDD 阶段
chaos continue

# 输出示例：
# 📌 Continuing change: add-user-login
# 🔵 Current phase: GREEN
# 📝 Task: TASK-001 Implement login endpoint
# 💡 Next: chaos apply add-user-login --phase green
```

### 任务状态恢复
- **[ ]** 未开始 → 继续执行
- **[~]** 进行中 → 从中断处恢复
- **[x]** 已完成 → 跳到下一个任务

## 熔断机制

### 三次失败规则
- 连续 3 次 apply 失败触发熔断
- 生成 fix-packet
- 暂停自动继续

### 熔断后恢复
```bash
# 查看修复包
chaos fix-packet <change-id>

# 修复后继续
chaos continue <change-id>
```

## Graph Semantics
- 节点 ID 为 stdd.continue，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-phase；resumable=true；parallelizable=false。
- 依赖 init，可进入 apply/verify/archive。

## Constitution Gates
- 无直接条例检查
- 依赖下游阶段（verify、archive）的 gate

## Evidence Contract
- 状态记录写入 `stdd/changes/<change-id>/evidence/continue-*.json`
- 包含恢复时间、检测到的状态、下一步建议

## Related Skills
- **stdd.apply** - TDD 实现
- **stdd.verify** - 综合验证
- **stdd.progress** - 进度查询
- **stdd.fix-packet** - 失败修复包

## 参考资源

### 状态机设计
- [State Machine Pattern](https://refactoring.guru/design-patterns/state)
- [Workflow Orchestration](https://www.temporal.io/blog/workflow-orchestration)

### 恢复模式
- [Checkpoint-Restore Pattern](https://en.wikipedia.org/wiki/Checkpoint_(science))
- [Session Management](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Rebuilding/Updates/Session_restoration)

## 设计决策

### 为什么需要状态机？
- **可预测性**: 清晰的阶段顺序
- **可恢复性**: 随时可以中断和恢复
- **可审计性**: 记录每个阶段的状态

### 为什么自动检测？
- **便利性**: 用户无需记住当前状态
- **智能化**: AI 可以根据状态做出决策
- **错误预防**: 防止跳过必要的阶段

### 为什么需要熔断？
- **质量控制**: 防止无限重试
- **人工介入**: 复杂问题需要人工分析
- **资源保护**: 避免浪费计算资源
