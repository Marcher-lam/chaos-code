---
id: stdd.brainstorm
command: /stdd:brainstorm
description: 多视角头脑风暴与方案对比分析（语言无关）
version: "3.0"
category: documentation
phase: discovery
read_only: true
risk_level: low
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: []
next: [stdd.propose, stdd.new]
on_failure: []
inputs:
  - 主题/问题
  - 项目上下文
  - 约束条件
  - 分析视角
outputs:
  - 方案对比
  - 风险评估
  - 推荐建议
evidence:
  required: false
  path: stdd/evidence/
constitution_articles:
  blocking: []
  warning: []
  suggestion: [8]
graph:
  node_id: stdd.brainstorm
  parallelizable: true
  resumable: false
  checkpoint: per-session
---

# STDD Skill: /stdd:brainstorm

## Purpose
**多视角头脑风暴与方案对比分析**。这是 Chaos Code 的只读分析 skill，服务技术决策、方案评估和风险识别。

**核心设计原则：**
- **语言无关**：适用于任何技术栈和项目类型
- **多视角分析**：从 7+ 个角度全面评估
- **结构化输出**：Pros/Cons 对比 + 风险评估
- **只读操作**：不修改代码或配置

## When to Use
- 需要评估多个技术方案时
- 需要识别技术风险和权衡时
- 需要生成 ADR (Architecture Decision Record) 时
- 需要进行 SWOT 分析时
- 项目初期探索可行方案时

## Preconditions
- 无需 STDD 初始化（只读 skill）
- 明确分析主题或问题

## Inputs
- 主题/问题
- 项目上下文（可选，自动检测）
- 约束条件（可选）
- 分析视角（可选，默认全部）

## 分析视角

### 1. 🔧 Technical (技术视角)
- 技术要求和约束
- 合适的技术和框架
- 潜在技术风险
- 与现有系统的集成

### 2. 👤 User Experience (用户体验)
- 目标用户是谁
- 用户痛点是什么
- 用户如何交互
- 如何保证直观和可访问

### 3. 💼 Business (业务视角)
- 业务价值是什么
- 成功指标如何定义
- 成本效益分析
- 与业务目标的一致性

### 4. 🔒 Security (安全视角)
- 安全要求是什么
- 潜在漏洞有哪些
- 如何保护用户数据
- 需要什么认证/授权

### 5. ⚡ Performance (性能视角)
- 性能要求是什么
- 预期的负载模式
- 如何优化速度/效率
- 可扩展性考虑

### 6. 🛠 Maintainability (可维护性)
- 如何保持代码可维护
- 需要什么测试策略
- 如何处理未来变更
- 需要什么文档

### 7. 📈 Scalability (可扩展性)
- 如何随增长扩展
- 瓶颈是什么
- 如何处理增加的负载
- 扩展策略是什么

## 方案模板

### Minimal Viable Approach (最小可行方案)
**描述**: 从满足核心需求的最简单实现开始
- **优点**: 快速实现、易于理解、低风险
- **缺点**: 可能需要后续重构、功能有限

### Comprehensive Approach (完整方案)
**描述**: 从一开始构建包含所有功能的完整解决方案
- **优点**: 功能完整、面向未来、用户体验完善
- **缺点**: 开发时间长、复杂度高、需要更多测试

### Iterative Approach (迭代方案)
**描述**: 分阶段构建，从核心开始逐步扩展
- **优点**: 早期反馈、灵活变更、风险缓解
- **缺点**: 需要规划、多次部署周期

### Integration Approach (集成方案)
**描述**: 利用现有工具/服务而不是从零开始构建
- **优点**: 快速上市、减少维护、成熟方案
- **缺点**: 依赖第三方、潜在成本、定制受限

### Custom Solution (定制方案)
**描述**: 为此用例构建专门的解决方案
- **优点**: 完全控制、为需求优化、无外部依赖
- **缺点**: 开发成本高、维护负担、重复造轮

## CLI Runtime

```bash
# 基础用法 - 所有视角分析
chaos brainstorm "添加用户登录功能"

# 指定分析视角
chaos brainstorm "微服务架构迁移" --angles technical,business,scalability

# 生成更多方案
chaos brainstorm "API 网关选型" --solutions 5

# JSON 格式输出
chaos brainstorm "数据库选型" --format json

# 输出到文件
chaos brainstorm "缓存策略" --format json > brainstorm-result.json
```

### 分析视角组合
```bash
# 技术决策
chaos brainstorm "技术选型" --angles technical,performance,scalability

# 产品决策
chaos brainstorm "新功能" --angles user,business,security

# 架构决策
chaos brainstorm "系统重构" --angles technical,maintainability,scalability
```

## 输出格式

### 文本格式（默认）
```
🧠 Brainstorm Analysis
══════════════════════════════════════════════════

Topic: 添加用户登录功能

🔧 Technical Perspective
────────────────────────────────────────────────
  ❓ What are the technical requirements and constraints?
     💡 Consider the impact on 添加

  ...

💡 Solution Alternatives
══════════════════════════════════════════════════

1. Minimal Viable Approach
   Start with the simplest implementation that meets core requirements

   ✓ Pros:
     • Fast to implement
     • Easy to understand
     • Low risk

   ✗ Cons:
     • May need refactoring later
     • Limited functionality
```

### JSON 格式
```json
{
  "topic": "添加用户登录功能",
  "timestamp": "2026-05-19T14:30:22.000Z",
  "analysis": {
    "technical": {
      "name": "Technical",
      "icon": "🔧",
      "considerations": [...]
    },
    ...
  },
  "solutions": [...]
}
```

## 与 ADR 集成

Brainstorm 输出可作为 ADR (Architecture Decision Record) 的输入：

```markdown
# ADR-001: 选择 JWT 作为认证方案

## Context
需要为 API 添加用户认证功能...

## Decision
使用 JWT (JSON Web Token) 进行认证...

## Consequences
### Positive
- 无状态、可扩展
- 跨域友好
- 标准化

### Negative
- Token 撤销复杂
- Payload 大小限制
```

## Graph Semantics
- 节点 ID 为 stdd.brainstorm，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-session；resumable=false；parallelizable=true。
- 无依赖约束，可随时运行。

## Related Skills
- **stdd.propose** - 生成正式提案
- **stdd.new** - 创建变更
- **stdd.design** - 技术设计

## 参考资源

### 头脑风暴技术
- [25 Brainstorming Techniques to Run Productive Sessions - MockFlow](https://mockflow.com/blog/brainstorming-techniques)
- [Asana Brainstorming Guide](https://asana.com/resources/brainstorming-techniques)

### 决策框架
- [Architecture Decision Records (ADR)](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [Software Architecture Decision Making](https://www.sei.cmu.edu/publications/books/201009decision.cfm)

### SWOT 分析
- [Advantages & Disadvantages Of SWOT Analysis - Real Business](https://realbusiness.co.uk/advantages-and-disadvantages-of-swot-analysis)

## 设计决策

### 为什么 7 个分析视角？
- **全面覆盖**：技术、用户、业务、安全、性能、可维护性、可扩展性
- **避免盲点**：每个视角关注不同维度
- **灵活组合**：可根据需要选择子集

### 为什么包含 Pros/Cons？
- **结构化对比**：清晰展示每个方案的优缺点
- **决策支持**：帮助权衡不同选项
- **风险识别**：提前发现潜在问题

### 为什么是只读 skill？
- **无副作用**：不修改代码或配置
- **随时可用**：无需 STDD 初始化
- **探索性**：鼓励尝试不同方案
