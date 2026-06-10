---
id: stdd.execute
command: /stdd:execute
description: Ralph Loop TDD 执行编排器（语言无关）
version: "3.0"
category: lifecycle
phase: implementation
read_only: false
risk_level: high
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.plan]
next: [stdd.verify]
on_failure: [stdd.fix-packet]
inputs:
  - tasks.md
  - Skill Graph
  - apply 参数
  - progress 状态
outputs:
  - apply 编排记录
  - progress 记录
  - execution evidence
evidence:
  required: true
  path: stdd/changes/<change-id>/evidence/
constitution_articles:
  blocking: [2, 7, 9]
  warning: []
  suggestion: []
graph:
  node_id: stdd.execute
  parallelizable: false
  resumable: true
  checkpoint: per-task
---

# STDD Skill: /stdd:execute

## Purpose
**Ralph Loop TDD 执行编排器**。这是 Chaos Code 的执行 skill，围绕增强版 Red-Green-Refactor 循环进行 TDD 实践的编排和执行。

**核心设计原则：**
- **语言无关**：适用于任何编程语言的 TDD 实践
- **严格循环**：RED → CHECK → GREEN → MUTATION → REFACTOR
- **熔断保护**：连续失败触发熔断，防止无限重试
- **证据留痕**：每个阶段都有可追溯的执行记录

## When to Use
- 需要执行 TDD 循环时
- 需要按任务推进开发时
- 需要自动化测试验证时
- 需要突变测试验证时

## Ralph Loop：增强版 TDD 循环

### 什么是 Ralph Loop？
Ralph Loop 是 STDD 对经典 Red-Green-Refactor 的扩展，增加了 CHECK（静态检查）和 MUTATION（突变测试）阶段：

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌──────────┐    ┌──────────┐
│   RED   │ → │  CHECK  │ → │  GREEN  │ → │ MUTATION │ → │ REFACTOR │
│ 写失败测试│ → │ 静态分析 │ → │ 最小实现 │ → │ 突变测试 │ → │ 重构优化 │
└─────────┘    └─────────┘    └─────────┘    └──────────┘    └──────────┘
     ↓              ↓              ↓               ↓               ↓
  测试驱动       类型检查       实现驱动       质量验证       代码健康
```

### 各阶段详解

#### 1. RED 阶段（写失败测试）
**目标**：编写一个描述期望行为的失败测试

**原则**：
- 测试先于实现
- 测试应该明确描述 API
- 测试失败原因清晰

**多语言测试框架**：
| 语言 | 测试框架 | 命令示例 |
|------|----------|----------|
| JavaScript/TypeScript | Jest, Vitest, Mocha | `npm test` |
| Python | pytest, unittest | `pytest` |
| Java | JUnit, TestNG | `mvn test` |
| Go | testing | `go test ./...` |
| Rust | Rusttest | `cargo test` |
| C# | xUnit, NUnit | `dotnet test` |
| PHP | PHPUnit | `vendor/bin/phpunit` |

#### 2. CHECK 阶段（静态分析）
**目标**：验证代码质量、类型安全和风格一致性

**检查项**：
- 类型检查
- Linter 规则
- 代码格式
- 安全扫描

**多语言静态检查工具**：
| 语言 | 类型检查 | Linter | 格式化 |
|------|----------|--------|--------|
| JavaScript/TypeScript | tsc --noEmit | ESLint | Prettier |
| Python | mypy | pylint, ruff | Black |
| Java | javac | Checkstyle | Spotless |
| Go | go vet | golangci-lint | gofmt |
| Rust | rustc | clippy | rustfmt |
| C# | Roslyn | StyleCop | dotnet format |
| PHP | PHPStan | Psalm | PHP CS Fixer |

#### 3. GREEN 阶段（最小实现）
**目标**：编写最少代码使测试通过

**原则**：
- 最小化实现
- 不考虑优化
- 保持简单
- 专注通过测试

#### 4. MUTATION 阶段（突变测试）
**目标**：验证测试能检测代码缺陷（防假阳性）

**什么是突变测试？**
- 自动引入代码缺陷（mutation）
- 运行测试套件
- 如果测试仍然通过 → 测试不足（surviving mutant）
- 如果测试失败 → 测试有效（killed mutant）

**多语言突变测试工具**：
| 语言 | 工具 | 安装 | 命令 |
|------|------|------|------|
| JavaScript/TypeScript | [StrykerJS](https://stryker-mutator.io/) | `npm install --save-dev @stryker-mutator/core` | `npx stryker run` |
| Python | [Mutmut](https://github.com/mutmut/mutmut) | `pip install mutmut` | `mutmut run` |
| Java | [PIT](https://pitest.org/) | Maven plugin | `mvn org.pitest:pitest-maven:mutationCoverage` |
| Go | [Gremlins](https://github.com/go-gremlins/gremlins) | `go install github.com/go-gremlins/gremlins@latest` | `gremlins test` |
| Rust | [cargo-mutants](https://mutants.rs/) | `cargo install cargo-mutants` | `cargo mutants` |
| C# | [Stryker.NET](https://stryker-mutator.io/) | `dotnet add package Stryker.Mutator` | `dotnet stryker` |
| PHP | [Humbug](https://github.com/infection/infection) | `composer require --dev infection/infection` | `vendor/bin/infection` |

#### 5. REFACTOR 阶段（重构优化）
**目标**：优化代码结构，保持测试通过

**原则**：
- 测试必须保持绿色
- 改善内部结构
- 不改变外部行为
- 消除代码异味

## CLI Runtime

```bash
# 执行所有待处理任务
chaos execute <change-id>

# 执行特定任务
chaos execute <change-id> --task TASK-001

# 执行下一阶段
chaos execute <change-id> --next

# 从特定阶段开始
chaos execute <change-id> --phase GREEN

# 指定测试命令
chaos execute <change-id> --test-command "pytest"

# Workspace 支持
chaos execute <change-id> --workspace packages/api
```

## 熔断机制

### 三次失败规则
- 连续 3 次阶段失败触发熔断
- 防止无限重试浪费资源
- 提示人工介入

### 熔断状态
```
┌─────────────┐
│   Normal    │ ← 正常执行
└──────┬──────┘
       │ 失败计数 < 3
       │
┌──────▼──────┐
│  Warning    │ ← 1-2 次失败，记录警告
└──────┬──────┘
       │ 失败计数 ≥ 3
       │
┌──────▼──────┐
│  Open       │ ← 熔断触发，停止执行
└─────────────┘
```

### 熔断恢复
```bash
# 查看修复包
chaos fix-packet <change-id>

# 修复后继续
chaos execute <change-id> --reset-count
```

## Graph Semantics
- 节点 ID 为 stdd.execute，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-task；resumable=true；parallelizable=false。
- 依赖 plan，为 verify 提供执行证据。

## Constitution Gates
- **Blocking 条例 2 (TDD)**: 必须先写测试
- **Blocking 条例 7 (Security)**: CHECK 阶段包含安全检查
- **Blocking 条例 9 (CI/CD)**: 确保自动化测试通过

## Evidence Contract
- 执行日志写入 `stdd/changes/<change-id>/apply.log`
- 阶段结果写入 `stdd/changes/<change-id>/evidence/execute-*.json`
- 熔断记录写入 `stdd/changes/<change-id>/circuit-breaker.json`

## Related Skills
- **stdd.apply** - 任务级 TDD 执行
- **stdd.plan** - 生成任务列表
- **stdd.verify** - 综合验证
- **stdd.fix-packet** - 失败修复包
- **stdd.mutation** - 突变测试详情

## 参考资源

### TDD 实践
- [Test-Driven Development by Example](https://www.amazon.com/Test-Driven-Development-Kent-Beck/dp/0321146530) - Kent Beck
- [Growing Object-Oriented Software, Guided by Tests](https://www.amazon.com/Growing-Object-Oriented-Software-Guided-Tests/dp/0321503627) - Steve Freeman

### 突变测试
- [Awesome Mutation Testing](https://github.com/theofidry/awesome-mutation-testing) - 多语言突变测试工具列表
- [Stryker Mutator](https://stryker-mutator.io/) - JavaScript/TypeScript/.NET/Scala
- [cargo-mutants](https://mutants.rs/) - Rust 突变测试
- [Gremlins](https://github.com/go-gremlins/gremlins) - Go 突变测试

### 熔断模式
- [Circuit Breaker Pattern - Azure](https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker)
- [Circuit Breaker Pattern - AWS](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/circuit-breaker.html)

## 设计决策

### 为什么是 5 阶段而非 3 阶段？
- **CHECK**: 静态分析在测试前发现问题，节省时间
- **MUTATION**: 验证测试质量，防止假阳性
- 5 阶段是 STDD 对 TDD 的增强，保证更高代码质量

### 为什么需要熔断？
- **资源保护**: 防止无限重试浪费 CI 资源
- **快速反馈**: 及时通知开发者问题
- **人工介入**: 复杂问题需要人工分析

### 为什么 execute 与 apply 分离？
- **execute**: 编排器，管理 Ralph Loop 流程
- **apply**: 执行器，处理具体任务实现
- 分离关注点，使代码更清晰
