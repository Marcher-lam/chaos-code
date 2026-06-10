---
id: stdd.final-doc
command: /stdd:final-doc
description: 聚合变更产物生成最终交付文档（语言无关）
version: "3.0"
category: documentation
phase: documentation
read_only: true
risk_level: low
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.verify]
next: [stdd.archive]
on_failure: []
inputs:
  - change artifacts
  - evidence
  - metrics
outputs:
  - FINAL_REQUIREMENT.md
  - artifact coverage summary
evidence:
  required: true
  path: stdd/changes/<change-id>/evidence/
constitution_articles:
  blocking: []
  warning: []
  suggestion: [5]
graph:
  node_id: stdd.final-doc
  parallelizable: false
  resumable: true
  checkpoint: per-change
---

# STDD Skill: /stdd:final-doc

## Purpose
**聚合变更产物生成最终交付文档**。这是 Chaos Code 的文档聚合 skill，将整个开发周期的产物整合成完整的交付文档。

**核心设计原则：**
- **语言无关**：适用于任何编程语言
- **完整性**：聚合所有相关产物
- **真实性**：不伪造缺失的证据
- **可追溯**：每个部分都有来源

## When to Use
- 需要生成交付文档时
- 需要归档变更记录时
- 需要生成变更报告时
- 需要展示开发成果时

## 最终文档结构

### FINAL_REQUIREMENT.md
```markdown
# Final Requirement: <change-name>

## 1. Overview

### 1.1 Summary
<从 proposal.md 提取>

### 1.2 Background
<从 proposal.md 提取>

### 1.3 Objectives
<从 proposal.md 提取>

---

## 2. Requirements

### 2.1 Functional Requirements
<从 specs/ 提取>

### 2.2 Non-Functional Requirements
<从 specs/ 提取>

### 2.3 Acceptance Criteria
<从 specs/ 提取>

---

## 3. Design

### 3.1 Architecture
<从 design.md 提取>

### 3.2 Data Models
<从 design.md 提取>

### 3.3 API Design
<从 api-spec 或 design.md 提取>

---

## 4. Implementation

### 4.1 Tasks Completed
<从 tasks.md 提取已完成的任务>

### 4.2 Code Changes
<从 git diff 或 evidence 提取>

### 4.3 Dependencies
<新增或修改的依赖>

---

## 5. Testing

### 5.1 Test Coverage
<从 metrics 提取覆盖率信息>

### 5.2 Test Results
<从 evidence 提取测试结果>

### 5.3 Mutation Testing
<从 mutation evidence 提取>

---

## 6. Quality

### 6.1 Code Review
<代码审查状态>

### 6.2 Constitution Compliance
<Constitution 条例合规情况>

### 6.3 Issues Found
<发现的问题和解决方案>

---

## 7. Evidence

### 7.1 Artifacts Generated
- proposal.md
- specs/
- design.md
- tasks.md
- evidence/

### 7.2 Test Evidence
- 单元测试: <状态>
- 集成测试: <状态>
- 突变测试: <状态>

### 7.3 Coverage Summary
| 指标 | 数值 |
|------|------|
| 语句覆盖率 | XX% |
| 分支覆盖率 | XX% |
| 函数覆盖率 | XX% |

---

## 8. Deployment

### 8.1 Deployment Notes
<部署注意事项>

### 8.2 Migration Required
<是否需要数据迁移>

### 8.3 Rollback Plan
<回滚计划>

---

## 9. References
- 原始提案: proposal.md
- 详细规格: specs/
- 设计文档: design.md
- 任务列表: tasks.md
```

## CLI Runtime

```bash
# 生成最终文档
chaos final-doc <change-id>

# 输出到指定位置
chaos final-doc <change-id> --output docs/

# 包含代码差异
chaos final-doc <change-id> --include-diff

# 包含测试报告
chaos final-doc <change-id> --include-test-report

# JSON 格式
chaos final-doc <change-id> --json

# Workspace 支持
chaos final-doc <change-id> --workspace packages/api
```

## 产物聚合逻辑

### 自动提取内容
1. **proposal.md** → Overview, Objectives
2. **specs/** → Requirements, Acceptance Criteria
3. **design.md** → Design, Architecture
4. **tasks.md** → Implementation, Tasks
5. **evidence/** → Testing, Quality metrics
6. **git diff** → Code Changes

### 缺失产物处理
- **标注缺失**: 明确标记哪些产物缺失
- **不伪造**: 不编造不存在的证据
- **建议补充**: 提供补充建议

## Artifact Coverage Summary

### 完整性检查
```markdown
## Artifact Coverage

| 产物 | 状态 | 说明 |
|------|------|------|
| proposal.md | ✅ | 已生成 |
| specs/ | ✅ | 3 个规格文件 |
| design.md | ✅ | 包含架构设计 |
| tasks.md | ✅ | 5 个任务已完成 |
| evidence/ | ⚠️ | 部分证据缺失 |
| mutation report | ❌ | 未运行 |

### 缺失证据
- 突变测试报告未生成
- 建议运行: `chaos mutation <change-id>`
```

## Graph Semantics
- 节点 ID 为 stdd.final-doc，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-change；resumable=true；parallelizable=false。
- 依赖 verify，为 archive 提供完整文档。

## Constitution Gates
- **Suggestion 条例 5 (Documentation)**: 最终文档应包含必要的文档

## Evidence Contract
- 最终文档写入 `stdd/changes/<change-id>/FINAL_REQUIREMENT.md`
- 覆盖率报告写入 `stdd/changes/<change-id>/evidence/final-doc-*.json`

## Related Skills
- **stdd.verify** - 验证阶段
- **stdd.archive** - 归档阶段
- **stdd.product-proposal** - 产品提案

## 参考资源

### 技术文档
- [Diátaxis Framework](https://diataxis.fr/) - 文档结构框架
- [Google Technical Writing](https://developers.google.com/tech-writing) - 技术写作指南

### 交付文档
- [Software Release Notes Best Practices](https://www.bleepingcomputer.com/news/microsoft/software-release-notes-best-practices/)
- [Change Log Template](https://keepachangelog.com/)

## 设计决策

### 为什么需要最终文档？
- **交付物**: 向项目相关方展示成果
- **归档**: 记录完整的开发过程
- **追溯**: 便于后续查阅和维护

### 为什么不伪造缺失证据？
- **诚信**: 真实反映开发状态
- **质量**: 突出需要改进的地方
- **责任**: 明确哪些工作未完成

### 为什么聚合而不是重写？
- **效率**: 利用现有产物
- **一致性**: 保持内容一致
- **可追溯**: 明确内容来源
