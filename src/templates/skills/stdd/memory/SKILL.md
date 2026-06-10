---
id: stdd.memory
command: /stdd:memory
description: 保存和检索跨会话语义记忆与决策（语言无关）
version: "3.0"
category: workspace
phase: all
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
  - topic
  - content/query
  - change-id
  - workspace
outputs:
  - stored memory
  - search results
  - stats
evidence:
  required: false
  path: stdd/evidence/
constitution_articles:
  blocking: []
  warning: [7]
  suggestion: []
graph:
  node_id: stdd.memory
  parallelizable: true
  resumable: true
  checkpoint: none
---

# STDD Skill: /stdd:memory

## Purpose
**保存和检索跨会话语义记忆与决策**。这是 Chaos Code 的记忆 skill，维护项目的历史决策和知识。

**核心设计原则：**
- **语言无关**：适用于任何编程语言
- **语义索引**：按主题和内容索引
- **跨会话**：持久化存储
- **安全**：不存储敏感信息

## When to Use
- 需要记录重要决策时
- 需要查找历史决策时
- 需要查看项目统计时
- 需要搜索相关知识时

## 记忆类型

### 1. 决策记忆
记录重要的架构和技术决策：
- 技术选型
- 架构决策
- 设计权衡
- 拒绝的方案

### 2. 模式记忆
记录发现的代码模式：
- 设计模式
- 反模式
- 惯用法
- 最佳实践

### 3. 失败记忆
记录失败和修复：
- Bug 根因
- 修复方案
- 防回归措施

## CLI Runtime

```bash
# 搜索记忆
chaos memory search "decision"
chaos memory search "authentication"

# 查看统计
chaos memory stats

# 查看最近记忆
chaos memory recent

# 按主题查看
chaos memory topic architecture
chaos memory topic testing

# 按变更查看
chaos memory change add-user-login

# 导出记忆
chaos memory export --format json
chaos memory export --output memory-backup.json
```

## 记忆结构

### 记忆条目
```json
{
  "id": "mem-20250519-001",
  "timestamp": "2025-05-19T10:30:00Z",
  "type": "decision",
  "topic": "authentication",
  "content": "选择 JWT 作为认证方案",
  "changeId": "add-user-login",
  "workspace": "packages/api",
  "tags": ["security", "jwt", "auth"],
  "importance": "high"
}
```

### 统计信息
```json
{
  "totalMemories": 42,
  "byType": {
    "decision": 15,
    "pattern": 18,
    "failure": 9
  },
  "byTopic": {
    "authentication": 8,
    "testing": 12,
    "architecture": 10
  },
  "recentActivity": "2025-05-19T10:30:00Z"
}
```

## 安全规则

### 禁止存储
- 密码和密钥
- API Token
- 私人证书
- 敏感用户数据

### 脱敏规则
- 替换真实邮箱为 `user@example.com`
- 替换真实密码为 `***`
- 替换 Token 为 `TOKEN`

## Graph Semantics
- 节点 ID 为 stdd.memory，由 frontmatter 暴露给 Skill Graph。
- checkpoint=none；resumable=true；parallelizable=true。

## Constitution Gates
- **Warning 条例 7 (Security)**: 不存储敏感信息

## Evidence Contract
- 记忆存储在 `stdd/memory/`
- 索引在 `stdd/memory/index.json`

## Related Skills
- **stdd.init** - 初始化
- **stdd.learn** - 学习并存储

## 参考资源

### 知识管理
- [Zettelkasten Method](https://en.wikipedia.org/wiki/Zettelkasten)
- [Second Brain](https://fortelabs.co/)

### 语义搜索
- [Vector Embeddings](https://openai.com/research/better-language-models/)
- [Semantic Search](https://en.wikipedia.org/wiki/Semantic_search)

## 设计决策

### 为什么需要记忆？
- **持久化**: 跨会话保留知识
- **共享**: 团队共享决策
- **追溯**: 了解历史原因

### 为什么语义索引？
- **搜索**: 快速找到相关内容
- **关联**: 发现相关决策
- **组织**: 自动分类
