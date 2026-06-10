---
id: stdd.mutation
command: /stdd:mutation
description: 生成 mutation evidence 以检验测试有效性（语言无关）
version: "3.0"
category: tdd
phase: verification
read_only: false
risk_level: medium
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.apply]
next: [stdd.verify]
on_failure: [stdd.fix-packet]
inputs:
  - change-id
  - 测试命令
  - 源码/测试 diff
outputs:
  - mutation report
  - surviving mutants
  - mutation evidence
evidence:
  required: true
  path: stdd/changes/<change-id>/evidence/
constitution_articles:
  blocking: [2]
  warning: []
  suggestion: []
graph:
  node_id: stdd.mutation
  parallelizable: true
  resumable: true
  checkpoint: per-change
---

# STDD Skill: /stdd:mutation

## Purpose
**生成 mutation evidence 以检验测试有效性**。这是 Chaos Code 的变异测试 skill，通过代码变异来验证测试质量。

**核心设计原则：**
- **语言无关**：支持多种编程语言的变异测试
- **测试有效性**：检验测试是否真正验证代码
- **渐进式**：从快速模式到完整模式
- **可修复**：识别存活变异并提供修复建议

## When to Use
- 需要验证测试质量时
- 需要发现测试漏洞时
- 需要提高代码覆盖率质量时
- 需要生成 mutation evidence 时

## CLI Runtime

```bash
# Quick 模式（启发式检查）
chaos mutation <change-id> --mode quick

# 完整模式（运行真实 mutation）
chaos mutation <change-id> --mode full

# 指定工具
chaos mutation <change-id> --tool stryker
chaos mutation <change-id> --tool pit
chaos mutation <change-id> --tool cargo-mutants
chaos mutation <change-id> --tool infection

# Workspace 支持
chaos mutation <change-id> --workspace packages/api

# 设置阈值
chaos mutation <change-id> --threshold 80

# 并发执行
chaos mutation <change-id> --concurrent 4

# 增量模式（只测试变更文件）
chaos mutation <change-id> --incremental

# 输出 HTML 报告
chaos mutation <change-id> --html

# 输出 JSON
chaos mutation <change-id> --json
```

## 多语言 Mutation 工具

### JavaScript/TypeScript - StrykerJS
```bash
# 安装
npm install --save-dev @stryker-mutator/core

# 初始化
npx stryker init

# 运行
npx stryker run

# 配置示例 stryker.config.mjs
export default {
  coverageAnalysis: 'perTest',
  mutate: ['src/**/*.js'],
  testRunner: 'jest',
  reporters: ['html', 'clear-text', 'json'],
  thresholds: {
    high: 80,
    low: 60,
    break: 70
  }
};
```

### Python - MutPy
```bash
# 安装
pip install mutpy

# 运行
mutpy --runner pytest --target src/ --unit-test tests/

# 配置
--mutation-generator: all
--ratio: 100
```

### Java - PIT (Pitest)
```bash
# Maven 配置
<plugin>
    <groupId>org.pitest</groupId>
    <artifactId>pitest-maven</artifactId>
    <version>1.15.0</version>
    <configuration>
        <targetClasses>
            <param>com.example.*</param>
        </targetClasses>
        <mutationThreshold>80</mutationThreshold>
        <coverageThreshold>90</coverageThreshold>
    </configuration>
</plugin>

# 运行
mvn org.pitest:pitest-maven:mutationCoverage
```

### Go - go-mutesting
```bash
# 安装
go install github.com/kryptXX/go-mutesting/cmd/go-mutesting@latest

# 运行
go-mutesting ./...

# 配置
go-mutesting -mutators=all ./...
```

### Rust - cargo-mutants
```bash
# 安装
cargo install cargo-mutants

# 运行
cargo mutants

# 配置
cargo mutants --no-capture --list
cargo mutants --no-capture --jobs 4
```

### PHP - Infection
```bash
# 安装
composer require --dev infection/infection

# 运行
./vendor/bin/infection

# 配置 infection.json
{
    "source": {
        "directories": ["src"]
    },
    "timeout": 10,
    "mutators": {
        "@default": true
    },
    "testFramework": "phpunit",
    "minMsi": 80,
    "minCoveredMsi": 80
}
```

### C# - Stryker.NET
```bash
# 安装
dotnet add package Stryker.Core

# 运行
dotnet stryker

# 配置 stryker-config.json
{
  "mutation-level": "Standard",
  "thresholds": {
    "high": 80,
    "low": 60,
    "break": 70
  },
  "test-projects": [
    "tests/MyProject.Tests.csproj"
  ]
}
```

## Mutation 类型

### 算术变异
| 原始 | 变异 | 描述 |
|------|------|------|
| `+` | `-`, `*`, `/` | 替换运算符 |
| `-` | `+`, `*`, `/` | 替换运算符 |
| `*` | `/`, `+`, `-` | 替换运算符 |
| `/` | `*`, `+`, `-` | 替换运算符 |
| `%` | `*`, `/` | 替换运算符 |

### 逻辑变异
| 原始 | 变异 | 描述 |
|------|------|------|
| `&&` | `\|\|` | 与变或 |
| `\|\|` | `&&` | 或变与 |
| `!` | (删除) | 删除非 |
| `<` | `<=`, `>=`, `==` | 比较变体 |
| `>` | `>=`, `<=`, `==` | 比较变体 |

### 值变异
| 原始 | 变异 | 描述 |
|------|------|------|
| `true` | `false` | 布尔反转 |
| `false` | `true` | 布尔反转 |
| `x` | `x - 1`, `x + 1` | 整数变异 |
| `s` | `""` | 空字符串 |

### 控制流变异
| 原始 | 变异 | 描述 |
|------|------|------|
| `if (c) stmt` | `if (true) stmt` | 条件为真 |
| `if (c) stmt` | `stmt` | 删除条件 |
| `return x` | `return` | 删除返回值 |

## Mutation 报告

### 报告格式
```json
{
  "changeId": "user-login-001",
  "timestamp": "2025-05-19T10:30:00Z",
  "tool": "stryker",
  "mode": "full",
  "summary": {
    "total": 156,
    "killed": 132,
    "survived": 15,
    "timeout": 5,
    "noCoverage": 4,
    "score": 84.6,
    "threshold": 80,
    "status": "pass"
  },
  "survivingMutants": [
    {
      "file": "src/auth/service.ts",
      "line": 45,
      "mutator": "BinaryOperator",
      "original": "x >= 0",
      "mutation": "x < 0",
      "reason": "No test for negative values",
      "suggestion": "Add test case for negative input"
    }
  ],
  "recommendations": [
    "Add tests for edge cases in auth service",
    "Consider increasing coverage for error paths"
  ]
}
```

### HTML 报告
- 可视化 mutation 结果
- 文件级覆盖率
- 存活变异高亮
- 测试用例映射

## Quick 模式

Quick 模式使用启发式检查，无需运行完整 mutation：

```yaml
quick_checks:
  # 反向断言检查
  - check: "no_negative_assertions"
    description: "检查是否有反向断言（如 assertNotXxx）"

  # 空测试检查
  - check: "no_empty_tests"
    description: "检查是否有空测试"

  # 硬编码期望检查
  - check: "no_hardcoded_expectations"
    description: "检查是否有硬编码的期望值"

  # Mock 过度使用检查
  - check: "no_over_mocking"
    description: "检查是否过度使用 mock"

  # 异常测试检查
  - check: "exception_tests_exist"
    description: "检查是否有异常测试"
```

## 增量 Mutation

```bash
# 只测试变更的文件
chaos mutation <change-id> --incremental

# 基于 Git diff
chaos mutation <change-id> --from-ref HEAD~1 --to-ref HEAD
```

## Graph Semantics
- 节点 ID 为 stdd.mutation，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-change；resumable=true；parallelizable=true。
- 依赖 apply，下一步是 verify。

## Constitution Gates
- **Blocking 条例 2 (Test First)**: 必须先写测试

## Evidence Contract
- Mutation 报告写入 `stdd/changes/<change-id>/evidence/mutation-*.json`
- HTML 报告写入 `stdd/changes/<change-id>/evidence/mutation-report.html`

## Related Skills
- **stdd.apply** - 输入
- **stdd.fix-packet** - 失败处理
- **stdd.verify** - 验证
- **stdd.guard** - 质量门禁

## 参考资源

### Mutation Testing 工具
| 语言 | 工具 | 链接 |
|------|------|------|
| JavaScript/TypeScript | StrykerJS | [stryker-mutator.io](https://stryker-mutator.io/) |
| Java | PIT | [pitest.org](https://pitest.org/) |
| Python | MutPy | [github.com/mutpy/mutpy](https://github.com/mutpy/mutpy) |
| Go | go-mutesting | [github.com/kryptXX/go-mutesting](https://github.com/kryptXX/go-mutesting) |
| Rust | cargo-mutants | [github.com/sourcefrog/cargo-mutants](https://github.com/sourcefrog/cargo-mutants) |
| PHP | Infection | [infection.github.io](https://infection.github.io/) |
| C# | Stryker.NET | [stryker-mutator.io](https://stryker-mutator.io/docs/stryker-net) |
| Scala | Stryker4s | [github.com/stryker-mutator/stryker4s](https://github.com/stryker-mutator/stryker4s) |

### 学习资源
- [Mutation Testing Guide](https://martinfowler.com/articles/mutation-testing.html)
- [Stryker Documentation](https://stryker-mutator.io/docs/)

## 设计决策

### Why Mutation Testing？
- **测试质量**: 验证测试有效性
- **漏洞发现**: 找出测试漏洞
- **改进指导**: 提供改进方向

### Why 多工具支持？
- **语言适配**: 不同语言不同工具
- **最佳工具**: 使用生态最佳工具
- **灵活性**: 团队选择适合的

### Why Quick 模式？
- **速度**: 快速反馈
- **门槛**: 降低使用门槛
- **渐进**: 从快速到完整
