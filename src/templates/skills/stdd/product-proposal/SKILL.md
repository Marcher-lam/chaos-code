---
id: stdd.product-proposal
command: /stdd:product-proposal
description: 从全项目产物生成 15 章节产品方案报告（语言无关）
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
  - stdd/ 产物
  - archive
  - metrics
  - vision
outputs:
  - PRODUCT-PROPOSAL.md
  - JSON structured proposal
evidence:
  required: false
  path: stdd/evidence/
constitution_articles:
  blocking: []
  warning: []
  suggestion: [5, 8]
graph:
  node_id: stdd.product-proposal
  parallelizable: false
  resumable: true
  checkpoint: per-run
---

# STDD Skill: /stdd:product-proposal

## Purpose
**从全项目产物生成 15 章节产品方案报告**。这是 Chaos Code 的产品方案 skill，聚合项目信息生成完整的产品文档。

**核心设计原则：**
- **语言无关**：适用于任何编程语言
- **完整覆盖**：15 个章节全面覆盖
- **真实数据**：不编造数据，缺失用 TODO
- **结构化**：清晰的文档结构

## When to Use
- 需要生成产品方案时
- 需要项目总结时
- 需要向利益相关方汇报时
- 需要归档项目时

## 15 章节结构

### 1. 执行摘要
- 项目概述
- 核心价值
- 关键成果

### 2. 背景与动机
- 问题陈述
- 市场机会
- 用户痛点

### 3. 目标用户
- 用户画像
- 用户场景
- 用户需求

### 4. 产品概述
- 产品定位
- 核心功能
- 产品边界

### 5. 技术架构
- 系统架构
- 技术栈
- 设计决策

### 6. 功能规格
- 功能列表
- 优先级
- 依赖关系

### 7. 用户体验
- 用户流程
- 界面设计
- 交互设计

### 8. 数据模型
- 实体关系
- 数据流
- 存储策略

### 9. API 设计
- 端点列表
- 请求/响应
- 认证授权

### 10. 测试策略
- 测试类型
- 覆盖目标
- 质量门禁

### 11. 部署方案
- 部署架构
- CI/CD
- 监控告警

### 12. 运营计划
- 运营策略
- 维护计划
- 支持流程

### 13. 风险分析
- 技术风险
- 业务风险
- 缓解措施

### 14. 项目计划
- 里程碑
- 资源需求
- 时间表

### 15. 成功指标
- KPI 定义
- 测量方法
- 目标值

## CLI Runtime

```bash
# 生成产品方案
chaos product-proposal

# JSON 格式
chaos product-proposal --json

# 指定输出
chaos product-proposal --output docs/PRODUCT-PROPOSAL.md

# 指定语言
chaos product-proposal --lang en

# Workspace 支持
chaos product-proposal --workspace packages/api
```

## 数据来源

### 自动收集
- **vision**: 项目愿景
- **changes/**: 所有变更
- **specs/**: 功能规格
- **design.md**: 技术设计
- **tasks.md**: 任务完成情况
- **metrics/**: 质量指标
- **archive/**: 归档数据

### TODO 处理
- 缺失数据用 **TODO** 标记
- 不编造市场或竞品信息
- 明确说明需要补充的内容

## Graph Semantics
- 节点 ID 为 stdd.product-proposal，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-run；resumable=true；parallelizable=false。

## Constitution Gates
- **Suggestion 条例 5 (Documentation)**: 产品方案应包含必要文档
- **Suggestion 条例 8 (Performance)**: 应包含性能指标

## Evidence Contract
- 产品方案写入 `PRODUCT-PROPOSAL.md`
- JSON 版本写入 `PRODUCT-PROPOSAL.json`

## Related Skills
- **stdd.init** - 初始化
- **stdd.vision** - 项目愿景
- **stdd.final-doc** - 变更级文档

## 参考资源

### 产品文档
- [PRD Template](https://www.productboard.com/guides/product-requirements-document/)
- [Technical Design Document](https://www.atlassian.com/agile/project-management/technical-documentation)

## 设计决策

### 为什么 15 章节？
- **全面**: 覆盖产品所有方面
- **结构**: 清晰的文档结构
- **标准**: 行业标准模板

### 为什么不编造数据？
- **诚信**: 真实反映项目状态
- **责任**: 明确缺失信息
- **补充**: 引导用户补充
