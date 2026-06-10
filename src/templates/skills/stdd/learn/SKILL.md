---
id: stdd.learn
command: /stdd:learn
description: 从项目代码和反馈学习本地模式与偏好（语言无关）
version: "3.0"
category: workspace
phase: all
read_only: false
risk_level: medium
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.init]
next: []
on_failure: []
inputs:
  - 源码/测试
  - 用户反馈
  - 已有学习状态
outputs:
  - feedback.jsonl
  - code-patterns.json
  - styleguide.md
evidence:
  required: true
  path: stdd/evidence/
constitution_articles:
  blocking: []
  warning: [4, 6]
  suggestion: []
graph:
  node_id: stdd.learn
  parallelizable: true
  resumable: true
  checkpoint: none
---

# STDD Skill: /stdd:learn

## Purpose
**从项目代码和反馈学习本地模式与偏好**。这是 Chaos Code 的学习 skill，通过分析代码和反馈来理解项目约定。

**核心设计原则：**
- **语言无关**：适用于任何编程语言
- **模式识别**：自动识别代码模式
- **反馈驱动**：从用户反馈学习
- **增量更新**：持续改进

## When to Use
- 需要了解项目代码风格时
- 需要记录团队偏好时
- 需要提供反馈时
- 需要更新风格指南时

## 学习维度

### 1. 代码模式
- 命名约定
- 文件组织
- 导入模式
- 错误处理

### 2. 测试模式
- 测试框架
- 测试结构
- Mock 模式
- 断言风格

### 3. 用户反馈
- good: 正向强化
- bad: 负向标记
- suggest: 改进建议

## CLI Runtime

```bash
# 扫描代码模式
chaos learn scan

# 分析模式
chaos learn analyze-patterns

# 记录反馈
chaos learn good "prefer explicit errors"
chaos learn bad "avoid implicit any"
chaos learn suggest "add more tests"

# 查看状态
chaos learn status --json

# 更新风格指南
chaos learn update-styleguide
```

## 多语言模式识别

### JavaScript/TypeScript
```typescript
// 检测到的模式
{
  "naming": "camelCase",
  "imports": "ES6 import",
  "exports": "named exports",
  "async": "async/await",
  "errorHandling": "explicit Error types"
}
```

### Python
```python
# 检测到的模式
{
  "naming": "snake_case",
  "imports": "PEP 8 imports",
  "exports": "__all__",
  "async": "async/await",
  "errorHandling": "exceptions"
}
```

### Go
```go
// 检测到的模式
{
  "naming": "PascalCase for exported",
  "imports": "grouped imports",
  "exports": "capitalized",
  "errorHandling": "explicit error returns"
}
```

## 反馈系统

### 反馈类型
| 类型 | 用途 | 权重 |
|------|------|------|
| good | 强化正确模式 | +1 |
| bad | 标记不良模式 | -1 |
| suggest | 改进建议 | 0 |

### 反馈记录
```json
{
  "timestamp": "2025-05-19T10:30:00Z",
  "type": "good",
  "pattern": "explicit errors",
  "context": "auth/login",
  "weight": 1
}
```

## Graph Semantics
- 节点 ID 为 stdd.learn，由 frontmatter 暴露给 Skill Graph。
- checkpoint=none；resumable=true；parallelizable=true。

## Constitution Gates
- **Warning 条例 4 (Code Style)**: 学习应遵循代码规范
- **Warning 条例 6 (Error Handling)**: 学习应包含错误处理模式

## Evidence Contract
- 反馈写入 `stdd/feedback.jsonl`
- 模式写入 `stdd/code-patterns.json`
- 风格指南写入 `stdd/styleguide.md`

## Related Skills
- **stdd.init** - 初始化
- **stdd.memory** - 存储学习结果

## 参考资源

### 代码分析
- [AST Parsing](https://en.wikipedia.org/wiki/Abstract_syntax_tree)
- [Code Pattern Recognition](https://en.wikipedia.org/wiki/Pattern_recognition)

### 机器学习
- [Incremental Learning](https://en.wikipedia.org/wiki/Online_machine_learning)

## 设计决策

### 为什么需要学习？
- **适应性**: 适应项目特定风格
- **一致性**: 保持代码一致
- **效率**: 减少重复配置

### 为什么反馈驱动？
- **准确性**: 用户反馈最准确
- **灵活性**: 可以随时调整
- **透明**: 明确的偏好记录
