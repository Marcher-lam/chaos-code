---
id: stdd.clarify
command: /stdd:clarify
description: 结构化需求澄清与歧义消除（语言无关）
version: "3.0"
category: lifecycle
phase: clarification
read_only: false
risk_level: medium
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.propose]
next: [stdd.confirm, stdd.spec]
on_failure: []
inputs:
  - proposal.md
  - 用户回答
  - 项目约束
  - 现有代码（brownfield）
outputs:
  - 更新后的 proposal.md
  - 澄清问题清单
  - 澄清记录
evidence:
  required: true
  path: stdd/changes/<change-id>/evidence/
constitution_articles:
  blocking: []
  warning: [5, 6]
  suggestion: []
graph:
  node_id: stdd.clarify
  parallelizable: false
  resumable: true
  checkpoint: per-change
---

# STDD Skill: /stdd:clarify

## Purpose
**结构化需求澄清与歧义消除**。这是 Chaos Code 的需求精化 skill，通过多维度追问发现需求缺口和隐含假设。

**核心设计原则：**
- **语言无关**：适用于任何技术栈和项目类型
- **结构化追问**：5 大澄清维度，全面覆盖
- **闭环管理**：问题 → 回答 → 验证 → 确认
- **上下文感知**：brownfield 项目分析现有代码

## When to Use
- 需求草案存在模糊之处时
- 需要识别边界条件和异常场景时
- 需要明确非功能性需求时
- 需要识别集成点和依赖时
- 进入 confirm 前的必要步骤

## Preconditions
- 已创建 proposal.md
- 有待澄清的需求内容

## 五大澄清维度

### 1. Boundary Conditions (边界条件)
**目标**: 明确输入输出的有效范围

**关键问题**:
- 输入边界是什么？（最小/最大值、格式）
- 输出边界是什么？
- 系统约束是什么？（内存、时间、资源）
- 访问控制边界是什么？
- 并发访问的边界是什么？

**参考**: [When and How to Ask Clarifying Questions About Edge Cases](https://algocademy.com/blog/when-and-how-to-ask-clarifying-questions-about-edge-cases/)

### 2. Edge Cases (边界情况)
**目标**: 识别极端和异常场景

**关键问题**:
- 空值/null 输入时会发生什么？
- 格式错误的数据如何处理？
- 并发访问场景有哪些？
- 失败场景有哪些？
- 极端值场景有哪些？（如零、负数、最大值）

**参考**: [Edge Case Testing Explained](https://www.virtuosoqa.com/post/edge-case-testing)

### 3. Implicit Constraints (隐含约束)
**目标**: 发现未明确说明的约束

**关键问题**:
- 有性能要求吗？
- 有安全要求吗？
- 有合规要求吗？
- 有向后兼容要求吗？
- 有技术栈限制吗？

### 4. Non-Functional Requirements (非功能性需求)
**目标**: 明确质量属性要求

**关键问题**:
- 预期响应时间是多少？
- 预期吞吐量是多少？
- 可用性目标是什么？
- 可维护性目标是什么？
- 可扩展性要求是什么？

### 5. Integration Points (集成点)
**目标**: 识别外部系统依赖

**关键问题**:
- 需要集成哪些外部系统？
- 涉及哪些 API/协议？
- 数据格式是什么？
- 错误处理策略是什么？
- 降级策略是什么？

## CLI Runtime

```bash
# 澄清当前活跃变更的需求
chaos clarify

# 澄清指定变更
chaos clarify <change-id>

# Dry run - 不修改文件
chaos clarify --dry-run
```

## 输出格式

### 澄清问题清单
```markdown
## Clarification

Generated: 2026-05-19T14:30:22.000Z

### Boundary Conditions
- [ ] What are the input boundaries (min/max values, formats)?
- [ ] What are the output boundaries?
- [ ] What are the system constraints (memory, time, resources)?
- [ ] What are the access control boundaries?

### Edge Cases
- [ ] What happens with empty/null inputs?
- [ ] What happens with malformed data?
- [ ] What are the concurrent access scenarios?
- [ ] What are the failure scenarios?

### Implicit Constraints
- [ ] Are there performance requirements?
- [ ] Are there security requirements?
- [ ] Are there compliance requirements?
- [ ] Are there backward compatibility requirements?

### Non Functional Requirements
- [ ] What is the expected response time?
- [ ] What is the expected throughput?
- [ ] What is the availability target?
- [ ] What is the maintainability target?

### Integration Points
- [ ] What external systems need to be integrated?
- [ ] What are the APIs/protocols involved?
- [ ] What are the data formats?
- [ ] What are the error handling strategies?
```

## 工作流程

### 1. 生成问题
```bash
chaos clarify
```
系统自动生成 5 大维度的澄清问题

### 2. 回答问题
在 proposal.md 中回答问题，将 `[ ]` 改为 `[x]`

### 3. 迭代澄清
```bash
chaos clarify  # 再次运行，补充未覆盖的问题
```

### 4. 进入确认
```bash
chaos confirm  # 所有关键问题已回答后
```

## Brownfield 增强

对于 brownfield 项目，clarify 会：
1. 分析现有代码结构
2. 识别潜在兼容性问题
3. 发现隐含的技术约束
4. 提示可能的影响范围

## Graph Semantics
- 节点 ID 为 stdd.clarify，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-change；resumable=true；parallelizable=false。
- 依赖 propose，完成前进入 confirm。

## Constitution Gates
- **Warning 条例 5**: 需求模糊时警告
- **Warning 条例 6**: 边界条件未定义时警告

## Evidence Contract
- 澄清记录写入 `stdd/changes/<change-id>/evidence/clarification-*.json`
- 包含生成的问题、用户回答、时间戳

## Related Skills
- **stdd.propose** - 生成初始提案
- **stdd.confirm** - 确认需求
- **stdd.spec** - 生成规格

## 参考资源

### 需求获取技术
- [An Overview of Requirements Elicitation Techniques in Software Engineering (IEEE)](https://ieeexplore.ieee.org/document/9676192/)
- [Requirements Elicitation: A Survey of Techniques, Approaches](https://opus.lib.uts.edu.au/bitstream/10453/11626/1/2005003295.pdf)
- [Requirements Elicitation - Software Engineering (GeeksforGeeks)](https://www.geeksforgeeks.org/software-engineering/software-engineering-requirements-elicitation/)

### 边界情况分析
- [When and How to Ask Clarifying Questions About Edge Cases](https://algocademy.com/blog/when-and-how-to-ask-clarifying-questions-about-edge-cases/)
- [Edge Case Testing Explained](https://www.virtuosoqa.com/post/edge-case-testing)
- [Edge Cases in Programming: Definition and Scenario Examples](https://testomat.io/blog/edge-cases-in-software-development/)
- [What Is an Edge Case in Software Testing?](https://www.testdevlab.com/blog/what-is-an-edge-case)

### 现代需求发现
- [Requirements Elicitation in Modern Product Discovery (IREB)](https://re-magazine.ireb.org/articles/requirements-elicitation-in-modern-product-discovery)
- [A Guide to Requirements Elicitation for Product Teams](https://www.jamasoftware.com/requirements-management-guide/requirements-gathering-and-management-processes/a-guide-to-requirements-elicitation-for-product-teams)

## 设计决策

### 为什么是 5 个维度？
- **边界条件**: 定义"正常"范围
- **边界情况**: 测试"异常"情况
- **隐含约束**: 发现"隐藏"限制
- **非功能需求**: 明确"质量"要求
- **集成点**: 识别"外部"依赖

### 为什么用 checklist 格式？
- **可追踪**: 清楚哪些已回答，哪些待定
- **可复用**: 模板化问题，提高效率
- **可验证**: 明确的完成标准

### 为什么需要迭代澄清？
- **需求进化**: 理解加深后产生新问题
- **上下文变化**: 项目进展可能暴露新风险
- **渐进精化**: 从粗到细，逐步完善
