---
id: stdd.validate
command: /stdd:validate
description: 验证规格一致性并运行 Spec Guardian 泄漏检测（语言无关）
version: "3.0"
category: spec-first
phase: verification
read_only: true
risk_level: low
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.spec]
next: [stdd.plan]
on_failure: []
inputs:
  - specs/
  - proposal.md
  - 可选 --fix
outputs:
  - validation report
  - Spec Guardian diagnostics
  - fix suggestions
evidence:
  required: true
  path: stdd/changes/<change-id>/evidence/
constitution_articles:
  blocking: [2]
  warning: []
  suggestion: []
graph:
  node_id: stdd.validate
  parallelizable: true
  resumable: true
  checkpoint: per-change
---

# STDD Skill: /stdd:validate

## Purpose
**验证规格一致性并运行 Spec Guardian 泄漏检测**。这是 Chaos Code 的验证 skill，确保规格质量和一致性。

**核心设计原则：**
- **语言无关**：适用于任何编程语言
- **规格优先**：验证规格质量
- **泄漏检测**：阻止实现细节泄漏
- **可修复**：自动修复简单问题

## When to Use
- 规格编写完成后
- 需要验证规格质量时
- 需要检测泄漏时
- 需要确保一致性时

## CLI Runtime

```bash
# 验证规格
chaos validate <change-id>

# 运行 Spec Guardian
chaos validate <change-id> --spec-guardian

# 自动修复
chaos validate <change-id> --fix

# JSON 输出
chaos validate <change-id> --json

# Workspace 支持
chaos validate <change-id> --workspace packages/api
```

## 验证维度

### BDD 格式验证
| 检查项 | 描述 | 严重性 |
|--------|------|--------|
| Feature 语法 | Feature 关键字存在 | error |
| Scenario 语法 | Scenario 关键字存在 | error |
| Given/When/Then | 步骤格式正确 | error |
| 缩进 | Gherkin 缩进正确 | warning |

### RFC 2119 验证
| 检查项 | 描述 | 严重性 |
|--------|------|--------|
| MUST | "MUST" 使用正确 | error |
| MUST NOT | "MUST NOT" 使用正确 | error |
| SHOULD | "SHOULD" 使用正确 | warning |
| MAY | "MAY" 使用正确 | info |

### 覆盖率验证
| 检查项 | 描述 | 阈值 |
|--------|------|------|
| 场景覆盖 | 所有功能有场景 | 100% |
| 步骤覆盖 | 所有步骤有定义 | 100% |
| 边界覆盖 | 边界情况覆盖 | ≥80% |

### 冲突检测
| 检查项 | 描述 |
|--------|------|
| 场景冲突 | 场景名称冲突 |
| 步骤冲突 | 步骤定义冲突 |
| 期望冲突 | 冲突的期望结果 |

## Spec Guardian

### 泄漏检测
Spec Guardian 检测实现细节泄漏到需求规格：

#### 检测模式
```yaml
# 实现细节关键词
implementation_keywords:
  - function
  - class
  - method
  - variable
  - const
  - let
  - var
  - import
  - require
  - export
  - database
  - table
  - column
  - api
  - endpoint
  - route

# 数据结构关键词
structure_keywords:
  - array
  - object
  - map
  - list
  - dict
  - struct
  - interface
```

#### 检测示例
```gherkin
# ❌ 错误：包含实现细节
Scenario: 用户登录
  Given 用户在 login.html 页面
  When 调用 POST /api/login 接口
  Then 查询 users 表返回 user_id

# ✅ 正确：用户视角
Scenario: 用户登录
  Given 用户在登录页面
  When 用户输入有效的用户名和密码
  Then 用户成功登录并跳转到首页
```

### 修复建议
```json
{
  "file": "login.feature",
  "line": 10,
  "severity": "error",
  "message": "检测到实现细节泄漏",
  "found": "调用 POST /api/login 接口",
  "suggestion": "用户输入有效的用户名和密码"
}
```

## 多语言 BDD 验证

### JavaScript/TypeScript (Cucumber)
```bash
# 验证 Cucumber 格式
chaos validate <change-id> --framework cucumber
```

### Python (behave)
```bash
# 验证 behave 格式
chaos validate <change-id> --framework behave
```

### Java (Cucumber-JVM)
```bash
# 验证 Cucumber-JVM 格式
chaos validate <change-id> --framework cucumber-jvm
```

### Go (godog)
```bash
# 验证 godog 格式
chaos validate <change-id> --framework godog
```

### Rust (cucumber-rust)
```bash
# 验证 cucumber-rust 格式
chaos validate <change-id> --framework cucumber-rust
```

## Graph Semantics
- 节点 ID 为 stdd.validate，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-change；resumable=true；parallelizable=true。
- 依赖 spec，下一步是 plan。

## Constitution Gates
- **Blocking 条例 2 (Test First)**: 规格必须先于实现

## Evidence Contract
- 验证报告写入 `stdd/changes/<change-id>/evidence/validate-*.json`
- Spec Guardian 诊断写入 `stdd/changes/<change-id>/evidence/spec-guardian-*.json`

## Related Skills
- **stdd.spec** - 输入规格
- **stdd.plan** - 生成计划
- **stdd.guard** - 质量门禁

## 参考资源

### BDD 规范
- [Gherkin Syntax](https://cucumber.io/docs/gherkin/)
- [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119)

### 验证工具
| 语言 | 验证工具 |
|------|----------|
| 通用 | Cucumber lint, Gherkin lint |
| JavaScript/TypeScript | @cucumber/lint |
| Python | behave --dry-run |
| Java | Cucumber-JVM --dry-run |

## 设计决策

### Why Spec Guardian？
- **质量**: 确保规格质量
- **纯度**: 阻止实现泄漏
- **可读**: 保持用户可读

### Why 多维度验证？
- **全面**: 覆盖各方面
- **严格**: 发现所有问题
- **可信**: 确保规格可信
