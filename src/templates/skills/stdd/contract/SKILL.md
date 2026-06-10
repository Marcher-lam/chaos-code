---
id: stdd.contract
command: /stdd:contract
description: 消费者驱动契约（CDC）生成与验证（语言无关）
version: "3.0"
category: spec-first
phase: verification
read_only: false
risk_level: medium
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.api-spec]
next: [stdd.verify]
on_failure: [stdd.fix-packet]
inputs:
  - api-spec (OpenAPI)
  - 消费者期望
  - provider 响应
  - consumer/provider 名称
outputs:
  - pact/contract JSON
  - provider verification report
  - contract evidence
evidence:
  required: true
  path: stdd/changes/<change-id>/evidence/
constitution_articles:
  blocking: [7]
  warning: []
  suggestion: []
graph:
  node_id: stdd.contract
  parallelizable: true
  resumable: true
  checkpoint: per-contract
---

# STDD Skill: /stdd:contract

## Purpose
**消费者驱动契约（CDC）生成与验证**。这是 Chaos Code 的契约测试 skill，确保服务间接口一致性。

**核心设计原则：**
- **语言无关**：Pact 支持多种编程语言
- **消费者优先**：以消费者期望定义契约
- **契约驱动**：先定义契约，再实现服务
- **独立测试**：服务可独立开发和测试

## When to Use
- 微服务架构中服务间通信
- 需要 API 契约测试时
- 前后端分离开发
- 需要确保 API 兼容性时

## 消费者驱动契约（CDC）概述

### 什么是 CDC？
CDC 是一种测试模式，由**消费者**定义接口期望，**提供者**验证实现是否符合契约。

### CDC 工作流程
```
┌─────────────┐    1. 定义期望    ┌─────────────┐
│  Consumer   │ ────────────────> │   Pact 文件  │
│  (前端)      │                  │  (契约)       │
└─────────────┘                   └─────────────┘
                                           │
                                           │ 2. 发布契约
                                           ▼
                                    ┌─────────────┐
                                    │  Pact Broker│
                                    │ (契约仓库)   │
                                    └─────────────┘
                                           │
                                           │ 3. 验证契约
                                           ▼
┌─────────────┐    4. 验证实现    ┌─────────────┐
│  Provider   │ <──────────────── │   Pact 文件  │
│  (后端 API)  │                  │  (契约)       │
└─────────────┘                   └─────────────┘
```

## CLI Runtime

### 生成契约
```bash
# 从 api-spec 生成契约
chaos contract generate <change-id>

# 指定 consumer/provider
chaos contract generate <change-id> --consumer frontend --provider api-service

# 指定 workspace
chaos contract generate <change-id> --workspace packages/api

# 输出 JSON 格式
chaos contract generate <change-id> --format json
```

### 验证契约
```bash
# 验证 provider 实现
chaos contract verify <change-id>

# 指定 provider URL
chaos contract verify <change-id> --provider-url http://localhost:3000

# 指定状态
chaos contract verify <change-id> --state "user exists"
```

## 契约格式

### Pact JSON 示例
```json
{
  "consumer": "frontend",
  "provider": "api-service",
  "interactions": [
    {
      "description": "A request for a user",
      "providerState": "user with ID 1 exists",
      "request": {
        "method": "GET",
        "path": "/api/users/1"
      },
      "response": {
        "status": 200,
        "headers": {
          "Content-Type": "application/json"
        },
        "body": {
          "id": 1,
          "name": "John Doe",
          "email": "john@example.com"
        }
      }
    }
  ]
}
```

## 语言支持

### JavaScript/TypeScript
```bash
npm install --save-dev @pact-foundation/pact
```

### Python
```bash
pip install pact-python
```

### Java
```xml
<dependency>
    <groupId>au.com.dius</groupId>
    <artifactId>pact-jvm-provider_2.12</artifactId>
    <version>4.0.0</version>
</dependency>
```

### Go
```bash
go get github.com/pact-foundation/pact-go/v2
```

### .NET
```bash
dotnet add package PactNet
```

## 验证报告

### 成功示例
```
Contract Verification Report

✓ GET /api/users/1 - 200 OK
  ✓ Status code matches
  ✓ Content-Type matches
  ✓ Body schema matches

Summary: 1 interactions, 1 passed, 0 failed
```

### 失败示例
```
Contract Verification Report

✗ GET /api/users/1 - Response mismatch
  ✗ Status code expected 200, got 404
  ✗ Body missing field: email

Summary: 1 interactions, 0 passed, 1 failed

Run: chaos fix-packet <change-id>
```

## Graph Semantics
- 节点 ID 为 stdd.contract，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-contract；resumable=true；parallelizable=true。
- 依赖 api-spec，为 verify 提供契约证据。

## Constitution Gates
- **Blocking 条例 7**: Security - API 契约必须符合安全要求

## Evidence Contract
- 契约文件保存到 `stdd/changes/<change-id>/specs/contracts/`
- 验证报告写入 `stdd/changes/<change-id>/evidence/contract-*.json`

## Related Skills
- **stdd.api-spec** - 生成 OpenAPI 规范
- **stdd.mock** - 生成 Mock 服务
- **stdd.verify** - 综合验证

## 参考资源

### Pact 官方文档
- [Pact.io](https://pact.io/) - Official website
- [Pact Documentation](https://docs.pact.io/) - Complete documentation
- [Pact Broker](https://docs.pact.io/pact_broker/) - Contract repository

### CDC 实践
- [Consumer-Driven Contracts - Martin Fowler](https://martinfowler.com/articles/consumerDrivenContracts.html)
- [Contract Testing vs Schema Validation](https://pact.io/blog/2022/06/20/contract-testing-vs-schema-validation.html)

## 设计决策

### 为什么使用 CDC？
- **解耦开发**: 消费者和提供者可独立开发
- **快速反馈**: 契约测试比集成测试更快
- **版本管理**: 清晰追踪 API 变更

### 为什么消费者优先？
- **需求驱动**: 消费者最清楚需要什么
- **实用主义**: 只定义实际使用的接口
- **可测试性**: 消费者可以基于契约编写测试

### 为什么需要 Pact Broker？
- **契约共享**: 团队间共享契约文件
- **版本管理**: 追踪契约历史和变更
- **CI 集成**: 自动化验证流程
