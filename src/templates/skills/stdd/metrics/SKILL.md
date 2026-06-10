---
id: stdd.metrics
command: /stdd:metrics
description: 汇总项目、变更和 workspace 质量指标（语言无关）
version: "3.0"
category: evidence
phase: verification
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
  - change-id
  - workspace
  - evidence
  - 源码/测试
outputs:
  - metrics dashboard
  - JSON report
evidence:
  required: true
  path: stdd/evidence/
constitution_articles:
  blocking: []
  warning: [1, 4, 6]
  suggestion: []
graph:
  node_id: stdd.metrics
  parallelizable: true
  resumable: true
  checkpoint: per-run
---

# STDD Skill: /stdd:metrics

## Purpose
**汇总项目、变更和 workspace 质量指标**。这是 Chaos Code 的指标 skill，聚合和展示项目质量数据。

**核心设计原则：**
- **语言无关**：适用于任何编程语言
- **多维指标**：覆盖代码、测试、质量
- **趋势分析**：追踪变化趋势
- **可导出**：支持 JSON 集成

## When to Use
- 需要查看项目质量时
- 需要生成报告时
- 需要追踪进度时
- 需要识别热点时

## 指标类别

### 1. 测试指标
| 指标 | 说明 | 目标 |
|------|------|------|
| 测试文件比例 | test/src 文件比 | ≥ 0.8 |
| 语句覆盖率 | 代码覆盖百分比 | ≥ 80% |
| 分支覆盖率 | 条件分支覆盖 | ≥ 75% |
| 函数覆盖率 | 函数覆盖百分比 | ≥ 80% |
| Mutation 分数 | 突变测试分数 | ≥ 70% |

### 2. 代码指标
| 指标 | 说明 | 阈值 |
|------|------|------|
| 文件数 | 源文件总数 | - |
| 总行数 | 代码总行数 | - |
| 平均文件长度 | 每文件平均行数 | < 500 |
| 最大文件长度 | 最长文件行数 | < 1000 |
| 圈复杂度 | 平均复杂度 | < 10 |

### 3. 质量指标
| 指标 | 说明 | 状态 |
|------|------|------|
| Linter 状态 | 代码检查 | ✅/❌ |
| 类型检查 | 类型验证 | ✅/❌ |
| Constitution | 合规状态 | Pass/Fail |
| 技术债务 | 待处理项 | 数量 |

### 4. 变更指标
| 指标 | 说明 |
|------|------|
| 活跃变更 | 进行中的变更 |
| 完成任务 | 已完成任务数 |
| 待处理任务 | 待处理任务数 |
| 平均周期 | 平均完成时间 |

## CLI Runtime

```bash
# 查看变更指标
chaos metrics <change-id>

# 查看项目指标
chaos metrics --project

# JSON 输出
chaos metrics <change-id> --json

# 指定 workspace
chaos metrics --workspace packages/api

# 趋势报告
chaos metrics <change-id> --trend

# 导出报告
chaos metrics <change-id> --output report.json
```

## 报告格式

### 终端输出
```
📊 STDD Metrics Report

Change: add-user-login
Date: 2025-05-19

Test Metrics:
  ✅ Test/Source Ratio: 1.2 (target: 0.8)
  ✅ Statement Coverage: 87.5% (target: 80%)
  ✅ Branch Coverage: 78.3% (target: 75%)
  ⚠️  Mutation Score: 68.2% (target: 70%)

Code Metrics:
  Files: 42
  Total Lines: 8,432
  Avg File Length: 201
  Max File Length: 450 (auth/service.ts)
  Cyclomatic Complexity: 6.2 (avg)

Quality Metrics:
  ✅ Linter: Pass
  ✅ Type Check: Pass
  ⚠️  Constitution: 1 warning
  Technical Debt: 3 items

Change Progress:
  Tasks: 8/10 completed
  Progress: 80%
```

### JSON 输出
```json
{
  "changeId": "add-user-login",
  "timestamp": "2025-05-19T10:30:00Z",
  "metrics": {
    "test": {
      "testSourceRatio": 1.2,
      "statementCoverage": 87.5,
      "branchCoverage": 78.3,
      "mutationScore": 68.2
    },
    "code": {
      "files": 42,
      "totalLines": 8432,
      "avgFileLength": 201,
      "maxFileLength": 450,
      "cyclomaticComplexity": 6.2
    },
    "quality": {
      "linter": "pass",
      "typeCheck": "pass",
      "constitution": "warning",
      "technicalDebt": 3
    }
  }
}
```

## Graph Semantics
- 节点 ID 为 stdd.metrics，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-run；resumable=true；parallelizable=true。

## Constitution Gates
- **Warning 条例 1 (Library-First)**: 检查是否有重复造轮子
- **Warning 条例 4 (Code Style)**: 检查代码风格
- **Warning 条例 6 (Error Handling)**: 检查错误处理

## Evidence Contract
- 指标报告写入 `stdd/evidence/metrics-*.json`

## Related Skills
- **stdd.init** - 初始化
- **stdd.verify** - 验证阶段

## 参考资源

### 代码指标
- [Cyclomatic Complexity](https://en.wikipedia.org/wiki/Cyclomatic_complexity)
- [Code Coverage](https://en.wikipedia.org/wiki/Code_coverage)

### 质量门禁
- [SonarQube Metrics](https://www.sonarqube.org/)
- [Code Climate](https://codeclimate.com/)

## 设计决策

### 为什么多维度指标？
- **全面**: 不只看单一指标
- **平衡**: 平衡不同质量维度
- **实用**: 可操作的指标

### 为什么趋势分析？
- **追踪**: 看到质量变化
- **预警**: 及时发现问题
- **验证**: 验证改进效果
