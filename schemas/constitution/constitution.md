# STDD Constitution - 开发宪法
# Version: 1.0
# Last Updated: 2026-03-27

## 概述

STDD Constitution 定义了所有开发活动必须遵循的 9 篇核心条例。
这些条例由 Hook 系统强制执行，确保代码质量和开发流程的一致性。

## 9 篇条例

### Article 1: Library-First Development
- **核心**: 优先使用成熟库，而非从头实现
- **强制**: 在 `stdd-design` 阶段检查
- **文档**: [articles/01-library-first.md](./articles/01-library-first.md)

### Article 2: Test-Driven Development
- **核心**: 所有生产代码必须在失败测试之后编写
- **强制**: Hook 拦截 + Ralph Loop 集成
- **文档**: [articles/02-test-driven-development.md](./articles/02-test-driven-development.md)

### Article 3: Small, Atomic Commits
- **核心**: 每次提交是独立、可回滚的变更单元
- **强制**: Pre-commit Hook 检查
- **文档**: [articles/03-small-commits.md](./articles/03-small-commits.md)

### Article 4: Consistent Code Style
- **核心**: 代码风格由工具强制，统一执行
- **强制**: Pre-commit Hook + CI
- **文档**: [articles/04-code-style.md](./articles/04-code-style.md)

### Article 5: Documentation as Code
- **核心**: 文档与代码同步，纳入版本控制
- **强制**: Pre-commit 检查 + Code Review
- **文档**: [articles/05-documentation.md](./articles/05-documentation.md)

### Article 6: Error Handling & Logging
- **核心**: 错误处理显式、可预测、可恢复
- **强制**: 静态分析 + 测试覆盖
- **文档**: [articles/06-error-handling.md](./articles/06-error-handling.md)

### Article 7: Security by Design
- **核心**: 安全从设计阶段考虑
- **强制**: Hook 检查 + Security Audit
- **文档**: [articles/07-security-first.md](./articles/07-security-first.md)

### Article 8: Performance by Default
- **核心**: 性能是设计决策的一部分
- **强制**: 性能测试 + 预算检查
- **文档**: [articles/08-performance.md](./articles/08-performance.md)

### Article 9: Continuous Integration & Delivery
- **核心**: 所有变更通过自动化流水线
- **强制**: CI/CD Pipeline
- **文档**: [articles/09-continuous-integration.md](./articles/09-continuous-integration.md)

## 执行优先级

```
Priority 1 (Blocking - 阻断):
  - Article 2: TDD (测试先行)
  - Article 7: Security (安全检查)
  - Article 9: CI (流水线必须通过)

Priority 2 (Warning - 警告):
  - Article 1: Library-First
  - Article 3: Small Commits
  - Article 4: Code Style

Priority 3 (Suggestion - 建议):
  - Article 5: Documentation
  - Article 6: Error Handling
  - Article 8: Performance
```

## 豁免机制

### 临时豁免

```yaml
# stdd/constitution/waivers.yaml
waivers:
  - article: 2  # TDD
    reason: "Legacy code migration"
    expires: 2024-06-01
    approved_by: team-lead

  - article: 8  # Performance
    reason: "MVP phase optimization"
    expires: 2024-04-01
    approved_by: tech-lead
```

### 永久豁免

以下场景可豁免部分条例：
- 原型/实验代码 (标记为 `@prototype`)
- 第三方库包装器 (已有测试)
- 配置文件 (非执行代码)
- 文档文件

## Constitution 检查命令

```bash
# 检查当前代码是否符合所有条例
/stdd:constitution check

# 检查特定条例
/stdd:constitution check --article=2

# 申请豁免
/stdd:constitution waiver --article=2 --reason="..."

# 查看条例详情
/stdd:constitution show 2
```

## 与 Hook 系统集成

Constitution 通过 Hook 系统在以下时机强制执行：

| Hook | 执行的条例 |
|------|-----------|
| PreToolUse | Art 2, 4, 7 |
| PostToolUse | Art 5, 6, 8 |
| PreCommit | Art 1, 3, 4 |
| PrePush | Art 2, 9 |
| CI Pipeline | All Articles |

## 更新记录

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0 | 2026-03-27 | 初始版本，9 篇条例 |

---

> "Constitution is not a set of rules, but a set of principles that guide every decision."
