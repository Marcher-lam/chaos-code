---
id: stdd.certainty
command: /stdd:certainty
description: 五维置信度评分与 HITL 决策框架（语言无关）
version: "3.0"
category: evidence
phase: governance
read_only: true
risk_level: low
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: []
next: [stdd.confirm, stdd.propose]
on_failure: []
inputs:
  - 决策点/变更
  - 风险评估
  - 证据
  - 用户评分
outputs:
  - confidence report
  - HITL decision
  - certainty history
evidence:
  required: true
  path: stdd/memory/certainty-history.jsonl
constitution_articles:
  blocking: []
  warning: []
  suggestion: [8]
graph:
  node_id: stdd.certainty
  parallelizable: false
  resumable: true
  checkpoint: per-assessment
---

# STDD Skill: /stdd:certainty

## Purpose
**五维置信度评分与 HITL (Human-In-The-Loop) 决策框架**。这是 Chaos Code 的决策质量评估 skill，帮助团队在关键决策点评估信心水平。

**核心设计原则：**
- **语言无关**：适用于任何技术栈和项目类型
- **多维评估**：5 个维度全面评估决策信心
- **可配置阈值**：自定义置信度阈值
- **历史追踪**：记录评估历史，支持趋势分析

## When to Use
- 在开始重要变更前评估信心水平
- 需要团队对决策达成共识时
- 需要记录决策依据时
- 需要追踪项目信心趋势时
- 灰色地带需要 HITL 确认时

## Preconditions
- 无需 STDD 初始化（只读 skill）
- 明确要评估的决策或变更

## 五维评估框架

### 1. Requirement Clarity (需求清晰度)
**问题**: 需求定义有多清晰和完善？
- **1分**：需求模糊，需要大量澄清
- **3分**：需求基本明确，有一些细节待定
- **5分**：需求清晰完整，验收标准明确

### 2. Technical Feasibility (技术可行性)
**问题**: 我们对实现此功能有多大信心？
- **1分**：存在重大技术障碍
- **3分**：技术路径基本明确
- **5分**：技术方案成熟，团队有经验

### 3. Risk Level (风险水平)
**问题**: 此变更风险有多高？（分数越高 = 风险越低）
- **1分**：高风险，可能影响核心功能
- **3分**：中等风险，可控范围内
- **5分**：低风险，影响范围有限

### 4. Test Coverage (测试覆盖能力)
**问题**: 我们能多好地测试此实现？
- **1分**：难以自动化测试，依赖手工
- **3分**：可以编写大部分测试
- **5分**：可以完整覆盖所有场景

### 5. Vision Alignment (愿景一致性)
**问题**: 此变更与项目愿景一致程度如何？
- **1分**：偏离主方向
- **3分**：基本一致
- **5分**：完全符合战略方向

## 置信度阈值

| 级别 | 阈值 | 含义 | 操作 |
|------|------|------|------|
| PROCEED | ≥95% | 高置信度 | 可自动继续 |
| RECOMMEND | ≥85% | 良好置信度 | 建议继续，需监控 |
| CONFIRM | ≥70% | 中等置信度 | 需团队确认 |
| PAUSE | <70% | 低置信度 | 暂停，收集更多信息 |

## CLI Runtime

### 评估模式
```bash
# 交互式评估（推荐）
chaos certainty assess
chaos certainty evaluate "添加用户认证"

# 非交互式评估
chaos certainty assess --scores "req:4,tech:5,risk:3,test:4,vision:5"

# JSON 输出
chaos certainty assess --format json
```

### 查看状态
```bash
# 查看当前状态
chaos certainty check

# 查看历史
chaos certainty history
chaos certainty history --limit 50

# 查看阈值
chaos certainty thresholds
```

### 配置
```bash
# 自定义阈值
chaos certainty configure --set "auto=0.9,warning=0.8,confirm=0.7"
```

## 输出格式

### 文本格式
```
Certainty Assessment Report

  Overall: 85% █

  Dimensions:
    █ Requirement Clarity       4/5
      │ 需求明确，有清晰验收标准
    ▓ Technical Feasibility     5/5
      │ 技术方案成熟，团队有经验
    ...

  Recommendation: RECOMMEND
  Good confidence: Recommended with monitoring.
```

### JSON 格式
```json
{
  "timestamp": "2026-05-19T14:30:22.000Z",
  "context": "添加用户认证",
  "scores": {
    "requirementClarity": 4,
    "technicalFeasibility": 5,
    "riskLevel": 3,
    "testCoverage": 4,
    "visionAlignment": 5
  },
  "rationale": {
    "requirementClarity": "需求明确，有清晰验收标准"
  },
  "overall": 0.85,
  "recommendation": {
    "label": "RECOMMEND",
    "action": "Good confidence: Recommended with monitoring."
  }
}
```

## 与其他框架的对比

### ICE Scoring (Impact, Confidence, Ease)
- **相似点**: 都有 Confidence 维度
- **差异点**: Certainty 更关注决策质量，ICE 关注产品优先级
- **参考**: [ICE Scoring Model - ProductLift](https://www.productlift.dev/blog/product-prioritization-framework/)

### RICE Scoring (Reach, Impact, Confidence, Effort)
- **相似点**: 都有 Confidence 维度
- **差异点**: RICE 用于功能优先级排序，Certainty 用于决策信心评估
- **参考**: [RICE Scoring Framework - Unito](https://unito.io/blog/feature-prioritization-frameworks/)

## Graph Semantics
- 节点 ID 为 stdd.certainty，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-assessment；resumable=true；parallelizable=false。
- 无依赖约束，可在任何决策点运行。

## Evidence Contract
- 历史记录路径：stdd/memory/certainty-history.jsonl
- JSONL 格式，每行一个评估记录
- 包含时间戳、上下文、评分、理由和建议

## Related Skills
- **stdd.confirm** - 团队确认
- **stdd.propose** - 生成提案
- **stdd.risk** - 风险评估

## 参考资源

### 决策框架
- [ICE Scoring Model - ProductLift](https://www.productlift.dev/blog/product-prioritization-framework/)
- [RICE Scoring Framework - Unito](https://unito.io/blog/feature-prioritization-frameworks/)
- [A Decision Framework for Reliable Code Predictions (arXiv)](https://arxiv.org/html/2605.19369v1)

### 风险评估
- [Quality Risk Management 2026 | Decision Making Tools](https://qaresources.com/risk-based-quality-in-2026-smarter-tools-for-smarter-decision-making/)
- [How Confidence Intervals Enhance Project Risk Management](https://www.linkedin.com/advice/0/how-do-you-incorporate-confidence-intervals)
- [Decision and Risk Analysis for Projects - AIChE](https://www.aiche.org/ili/academy/courses/ela126/decision-and-risk-analysis-projects)

## 设计决策

### 为什么是 5 个维度？
- **全面覆盖**：需求、技术、风险、测试、愿景
- **可操作**：每个维度都有明确的改进方向
- **轻量级**：5 个维度足够全面，不会过于复杂

### 为什么使用 1-5 分制？
- **直观**：符合人类认知习惯
- **中等粒度**：比 1-3 更精确，比 1-10 更简单
- **易于决策**：每个分数段都有明确的含义

### 为什么需要 HITL？
- **上下文感知**：AI 无法完全理解项目背景
- **责任归属**：最终决策应由人类负责
- **团队共识**：促进团队讨论和共识

### 为什么记录历史？
- **趋势分析**：识别项目信心变化趋势
- **学习改进**：从历史评估中学习
- **审计追踪**：为决策提供依据
