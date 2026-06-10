---
id: stdd.constitution
command: /stdd:constitution
description: 管理 9 篇 Constitution 条例与质量门禁（语言无关）
version: "3.0"
category: governance
phase: governance
read_only: false
risk_level: high
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.init]
next: [stdd.verify, stdd.guard]
on_failure: []
inputs:
  - article 编号
  - 源码/测试/CI
  - waiver 参数
outputs:
  - compliance report
  - waiver/audit records
evidence:
  required: true
  path: stdd/evidence/
constitution_articles:
  blocking: [2, 7, 9]
  warning: [1, 3, 4, 6]
  suggestion: [5, 8]
graph:
  node_id: stdd.constitution
  parallelizable: false
  resumable: true
  checkpoint: per-run
---

# STDD Skill: /stdd:constitution

## Purpose
**管理 9 篇 Constitution 条例与质量门禁**。这是 Chaos Code 的治理 skill，定义和执行项目开发规范。

**核心设计原则：**
- **语言无关**：条例适用于任何编程语言
- **分层治理**：Blocking、Warning、Suggestion 三级
- **可豁免**：特殊情况下可申请豁免
- **审计追踪**：所有检查和豁免都有记录

## 9 篇 Constitution 条例

### Blocking 条例（必须通过）

#### Article 2: TDD
**描述**: 测试先行 + 覆盖率 gate + mutation evidence

**检查项**:
- ✅ 测试先于实现编写
- ✅ 代码覆盖率达标（默认 80%）
- ✅ Mutation testing 通过（可选）
- ✅ 无 fake-green（测试通过但代码有误）

**失败后果**: 阻止合并，要求补充测试

#### Article 7: Security
**描述**: 安全优先，禁止硬编码密钥

**检查项**:
- ✅ 无硬编码密钥/密码
- ✅ 敏感数据不进入版本控制
- ✅ 使用环境变量或密钥管理
- ✅ 输入验证和输出编码

**失败后果**: 阻止合并，立即修复

#### Article 9: CI/CD
**描述**: 自动化流水线，PR 前必须通过 CI

**检查项**:
- ✅ CI 配置存在且有效
- ✅ 所有检查通过
- ✅ 自动化测试运行
- ✅ 无 CI 绕过记录

**失败后果**: 阻止合并，修复 CI

### Warning 条例（建议遵守）

#### Article 1: Library-First
**描述**: 优先使用成熟库而非重新实现

**检查项**:
- ⚠️ 检查是否有现成库可用
- ⚠️ 评估重复造轮子的必要性

**失败后果**: 警告，可选择忽略

#### Article 3: Small Commits
**描述**: 原子化提交，每次提交应可独立运行

**检查项**:
- ⚠️ 提交粒度适中
- ⚠️ 单次提交不超过 500 行
- ⚠️ 提交信息清晰

**失败后果**: 警告，建议改进

#### Article 4: Code Style
**描述**: 统一代码风格，遵循 Linter 规则

**检查项**:
- ⚠️ 代码格式统一
- ⚠️ 无 Linter 错误
- ⚠️ 命名规范一致

**失败后果**: 警告，建议格式化

#### Article 6: Error Handling
**描述**: 显式错误处理，禁止空 catch 块

**检查项**:
- ⚠️ 所有异常被处理
- ⚠️ 无空 catch 块
- ⚠️ 错误信息有意义

**失败后果**: 警告，建议改进

### Suggestion 条例（改进建议）

#### Article 5: Documentation
**描述**: 文档即代码，公共 API 必须有文档

**检查项**:
- 💡 公共 API 有注释
- 💡 复杂逻辑有说明
- 💡 README 保持更新

**失败后果**: 建议，不影响合并

#### Article 8: Performance
**描述**: 性能默认，避免 N+1 查询

**检查项**:
- 💡 无明显性能问题
- 💡 避免 N+1 查询
- 💡 合理使用缓存

**失败后果**: 建议，后续优化

## CLI Runtime

```bash
# 显示特定条例
chaos constitution show 2
chaos constitution show --all

# 检查合规性
chaos constitution check
chaos constitution check --article 2,7,9

# 查看状态
chaos constitution status
chaos constitution status --json

# 修复违规
chaos constitution fix --article 2
chaos constitution fix --dry-run

# 申请豁免
chaos constitution waive 2 --reason "Legacy code" --days 7

# 查看豁免列表
chaos constitution waivers

# 审计历史
chaos constitution audit
chaos constitution audit --json
```

## 豁免管理

### 豁免条件
- **reason**: 必须说明豁免原因
- **expiry**: 必须设置过期时间
- **approval**: 可能需要团队批准

### 豁免记录
```json
{
  "article": 2,
  "reason": "Legacy system, gradual migration",
  "requestedBy": "developer@example.com",
  "approvedBy": "tech-lead@example.com",
  "createdAt": "2026-05-19T14:30:22.000Z",
  "expiresAt": "2026-06-19T14:30:22.000Z",
  "status": "active"
}
```

## 质量门禁

### 门禁级别
| 级别 | 条例 | 失败后果 |
|------|------|----------|
| Blocking | 2, 7, 9 | 阻止合并 |
| Warning | 1, 3, 4, 6 | 警告显示 |
| Suggestion | 5, 8 | 建议改进 |

### 合规报告
```
Constitution Compliance Report

  Blocking Articles:
    ✅ Article 2 (TDD): PASS
    ✅ Article 7 (Security): PASS
    ❌ Article 9 (CI/CD): FAIL - CI not configured

  Warning Articles:
    ⚠️  Article 3 (Small Commits): 3 large commits found
    ✅ Article 4 (Code Style): PASS
    ...

  Suggestion Articles:
    💡 Article 5 (Documentation): Consider adding API docs
    ...

  Overall Status: FAIL (1 blocking violation)

  Run: chaos constitution fix --article 9
```

## Graph Semantics
- 节点 ID 为 stdd.constitution，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-run；resumable=true；parallelizable=false。
- 依赖 init，为 verify 和 guard 提供规则。

## Constitution Gates
- **Blocking 条例失败**: 停止并返回修复建议
- **Warning 条例失败**: 在报告中列出，可由用户决定
- **Suggestion 条例失败**: 改进建议，不阻塞

## Evidence Contract
- 合规报告写入 `stdd/evidence/constitution-*.json`
- 豁免记录写入 `stdd/config/waivers.json`
- 审计历史写入 `stdd/evidence/constitution-audit.jsonl`

## Related Skills
- **stdd.init** - 初始化 Constitution
- **stdd.verify** - 综合验证
- **stdd.guard** - 实时门禁检查

## 参考资源

### 代码治理
- [Software Governance Best Practices](https://www.sonarsource.com/resources/quality-gates/)
- [Quality Gates in CI/CD](https://www.sonarsource.com/resources/quality-gates/)

### TDD 实践
- [Test-Driven Development Best Practices](https://martinfowler.com/bliki/TestDrivenDevelopment.html)

### 安全实践
- [OWASP Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)

## 设计决策

### 为什么是 9 篇条例？
- **全面覆盖**：TDD、安全、CI、代码质量、文档、性能
- **分级管理**：不同优先级不同处理方式
- **可操作**：每条条例都有明确检查项

### 为什么允许豁免？
- **现实考虑**：遗留代码可能暂时无法满足
- **渐进改进**：给团队时间逐步改善
- **审计追踪**：所有豁免都有记录和期限

### 为什么分层治理？
- **Blocking**: 核心原则，不可妥协
- **Warning**: 重要但可权衡
- **Suggestion**: 改进方向，不强制
