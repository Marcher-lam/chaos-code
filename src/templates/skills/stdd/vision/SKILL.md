---
id: stdd.vision
command: /stdd:vision
description: 维护项目愿景、北极星原则和成功指标（语言无关）
version: "3.0"
category: documentation
phase: documentation
read_only: true
risk_level: low
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.init]
next: []
on_failure: []
inputs:
  - README
  - 项目目标
  - 用户画像
  - 约束
outputs:
  - stdd/vision.md
  - alignment report
evidence:
  required: false
  path: stdd/evidence/
constitution_articles:
  blocking: []
  warning: []
  suggestion: [5, 8]
graph:
  node_id: stdd.vision
  parallelizable: false
  resumable: true
  checkpoint: none
---

# STDD Skill: /stdd:vision

## Purpose
**维护项目愿景、北极星原则和成功指标**。这是 Chaos Code 的愿景 skill，定义项目方向和成功标准。

**核心设计原则：**
- **语言无关**：适用于任何编程语言
- **方向明确**：清晰的项目方向
- **可度量**：可量化的成功指标
- **对齐一致**：与 specs 和 roadmap 一致

## When to Use
- 项目启动时
- 需要明确方向时
- 需要对齐时
- 需要更新愿景时

## CLI Runtime

```bash
# 创建/更新愿景
chaos vision

# 从 README 生成
chaos vision --from-readme

# 导出愿景
chaos vision --export

# 检查对齐
chaos vision --check-alignment

# Workspace 支持
chaos vision --workspace packages/api
```

## 愿景模板

### vision.md
```markdown
# 项目愿景

## 问题
<我们解决什么问题？>

### 痛状
- <痛状 1>
- <痛状 2>

### 影响
<这个问题影响谁？影响多大？>

## 用户
<我们的用户是谁？>

### 用户画像
- **画像 1**: <描述>
- **画像 2**: <描述>

## 价值主张
<我们为用户带来什么价值？>

### 核心价值
- <价值 1>
- <价值 2>

## 技术北极星
<我们的技术方向是什么？>

### 技术原则
- <原则 1>
- <原则 2>

### 技术栈
<主要技术栈>

## 非目标
<我们不做什么？>

- <非目标 1>
- <非目标 2>

## 成功指标
<如何衡量成功？>

### 业务指标
| 指标 | 当前 | 目标 | 时间 |
|------|------|------|------|
| <指标 1> | <值> | <值> | <日期> |

### 技术指标
| 指标 | 当前 | 目标 | 时间 |
|------|------|------|------|
| 测试覆盖率 | 80% | 95% | Q2 |
| 性能 (p95) | 500ms | 200ms | Q2 |

## 路线图
<我们的计划是什么？>

### Q1
- [ ] <里程碑 1>
- [ ] <里程碑 2>

### Q2
- [ ] <里程碑 3>
- [ ] <里程碑 4>
```

## 愿景组件

### 问题定义
```markdown
## 问题

### 痛状
当前用户面临的核心痛点：
1. **痛点 1**: 描述
2. **痛点 2**: 描述

### 影响
- 受影响人群：X 万用户
- 业务损失：Y 万元/月
- 用户流失：Z%
```

### 用户画像
```markdown
## 用户画像

### 主要用户 (Primary)
- **角色**: <开发者/产品经理/终端用户>
- **目标**: <他们想要达成什么>
- **痛点**: <他们的痛点>
- **技能**: <技能水平>

### 次要用户 (Secondary)
- **角色**: <运维/管理员>
- **目标**: <他们想要达成什么>
```

### 价值主张
```markdown
## 价值主张

### 核心价值
1. **价值 1**: 描述 - 对用户的益处
2. **价值 2**: 描述 - 对用户的益处

### 差异化
- <我们与竞争对手的区别>
- <我们的独特优势>
```

### 技术北极星
```markdown
## 技术北极星

### 技术原则
- **语言无关**: 支持所有编程语言
- **测试优先**: TDD 驱动开发
- **质量第一**: 不妥协质量

### 技术栈
| 层级 | 技术 | 原因 |
|------|------|------|
| 语言 | TypeScript/Python/Go | 团队熟悉 |
| 测试 | Jest/pytest/go test | 成熟稳定 |
| CI/CD | GitHub Actions | 易用集成 |
```

### 非目标
```markdown
## 非目标

明确我们不做什么，避免范围蔓延：

- ❌ <非目标 1>: <为什么不做的理由>
- ❌ <非目标 2>: <为什么不做的理由>

### 未来考虑
- 📋 <未来可能考虑的功能 1>
- 📋 <未来可能考虑的功能 2>
```

### 成功指标
```markdown
## 成功指标

### 业务指标
| 指标 | 当前 | 目标 | 时间 | 负责人 |
|------|------|------|------|--------|
| DAU | 1000 | 5000 | Q2 | @alice |
| 转化率 | 5% | 10% | Q2 | @bob |

### 技术指标
| 指标 | 当前 | 目标 | 时间 | 负责人 |
|------|------|------|------|--------|
| 测试覆盖率 | 80% | 95% | Q2 | @charlie |
| 分支覆盖 | 75% | 90% | Q2 | @charlie |
| 性能 (p95) | 500ms | 200ms | Q2 | @david |
```

## 对齐检查

### 与 Specs 对齐
```bash
chaos vision --check-alignment --specs
```
检查所有 specs 是否与愿景一致。

### 与 Roadmap 对齐
```bash
chaos vision --check-alignment --roadmap
```
检查 roadmap 是否与愿景一致。

### 与 Constitution 对齐
```bash
chaos vision --check-alignment --constitution
```
检查 Constitution 是否与愿景一致。

## Graph Semantics
- 节点 ID 为 stdd.vision，由 frontmatter 暴露给 Skill Graph。
- checkpoint=none；resumable=true；parallelizable=false。
- 依赖 init，无下一步。

## Constitution Gates
- **Suggestion 条例 5 (Documentation)**: 愿景应有清晰文档
- **Suggestion 条例 8 (Simplicity)**: 愿景应简洁明了

## Evidence Contract
- 愿景写入 `stdd/vision.md`
- 对齐报告写入 `stdd/evidence/alignment-*.json`

## Related Skills
- **stdd.init** - 初始化
- **stdd.context** - 项目上下文
- **stdd.spec** - 规格应对齐

## 参考资源

### 产品愿景
- [Product Vision](https://www.productplan.com/learn/how-to-write-product-vision/)
- [OKR Framework](https://www.rework.ai/guide/okr-framework)

### 北极星指标
- [North Star Metric](https://www.amplitude.com/blog/north-star-metric)
- [Product Metrics](https://www.productplan.com/learn/product-metrics/)

## 设计决策

### Why 愿景？
- **方向**: 明确项目方向
- **对齐**: 团队对齐一致
- **决策**: 指导决策

### Why 北极星？
- **聚焦**: 聚焦核心价值
- **度量**: 可度量成功
- **激励**: 激励团队

### Why 非目标？
- **边界**: 明确边界
- **避免**: 避免范围蔓延
- **聚焦**: 聚焦核心价值
