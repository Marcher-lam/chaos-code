---
id: stdd.apply
command: /stdd:apply
description: 按 Red-Green-Refactor 循环执行语言无关的 TDD 实现
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
next: [stdd.mutation, stdd.verify]
on_failure: [stdd.fix-packet]
inputs:
  - tasks.md
  - specs/
  - design.md
  - 测试命令
  - workspace
  - 目标语言 (自动检测或手动指定)
outputs:
  - 测试文件
  - 实现代码
  - tasks.md 更新
  - apply evidence
evidence:
  required: true
  path: stdd/changes/<change-id>/evidence/
constitution_articles:
  blocking: [2, 7, 9]
  warning: []
  suggestion: []
graph:
  node_id: stdd.apply
  parallelizable: false
  resumable: true
  checkpoint: per-task
---

# STDD Skill: /stdd:apply

## Purpose
按 Red-Green-Refactor 循环执行**语言无关的 TDD 实现**。这是 STDD Copilot 的 Spec-First + TDD CLI skill，服务 Skill Graph 编排、Constitution gate、evidence 留痕和 workspace 作用域。

**核心设计原则：**
- **语言无关**：支持任何编程语言的测试框架
- **TDD 纪律**：强制执行 Red-Green-Refactor 循环
- **自动化检测**：自动识别项目语言和测试命令
- **测试驱动**：没有测试命令时失败（除非显式豁免）

## When to Use
- 需要执行 /stdd:apply 对应能力时。
- greenfield 项目用于建立或推进规范化工作流。
- brownfield 项目先读取现有代码、测试、README 和约定后再行动。
- monorepo 中使用 --workspace <path-or-package> 限定作用域。

## Preconditions
- 已在仓库根或目标 workspace 中运行 stdd init；只读技能例外但仍应识别项目状态。
- 明确 <change-id>、scope 或 topic；未明确时先询问或运行 stdd status / stdd recommend。
- 不得伪造 evidence；缺失测试、mutation 或 Constitution 结果必须显式标记。

## Inputs
- tasks.md
- specs/
- design.md
- 测试命令
- workspace
- 目标语言 (自动检测或手动指定)

## Workflow

### 1. 语言与测试框架检测

自动检测项目编程语言和默认测试命令（按优先级）：

1. **手动指定** (`--test-command`)
2. **STDD 配置文件** (`stdd.config.yml`)
3. **项目文件检测**:
   - TypeScript/JavaScript: `package.json` → `npm test` / `yarn test` / `pnpm test`
   - Python: `requirements.txt` / `pyproject.toml` → `pytest` / `python -m unittest`
   - Java: `pom.xml` / `build.gradle` → `mvn test` / `gradle test`
   - Go: `go.mod` → `go test ./...`
   - Rust: `Cargo.toml` → `cargo test`
   - C#: `*.csproj` → `dotnet test`
   - PHP: `composer.json` → `vendor/bin/phpunit` / `pest`

### 2. Red-Green-Refactor 循环

#### 🔴 RED Phase - 写失败测试
```bash
stdd apply <change-id> --task TASK-001 --phase red
```

**目标**: 写一个**失败**的测试，定义期望行为。
- **验证**: 测试**必须**失败（TDD 纪律）
- **违反处理**: 如果测试通过，报错并阻止进入 GREEN 阶段
- **输出**: `[phase:green]` 标记写入 tasks.md
- **增强 (取自 Vitest/pytest)**:
  - 自动生成测试骨架（参数化测试支持）
  - 智能测试发现和分组

#### 🟢 GREEN Phase - 最小实现
```bash
stdd apply <change-id> --task TASK-001 --phase green
```

**目标**: 写**最少**代码让测试通过。
- **验证**: 所有测试必须通过
- **失败处理**: 保持在 GREEN 阶段，生成 fix-packet
- **输出**: `[phase:refactor]` 标记写入 tasks.md
- **增强 (取自 Jest/Vitest)**:
  - Snapshot 测试支持
  - 并行测试执行（worker threads）
  - 智能重跑失败的测试

#### 🔵 REFACTOR Phase - 重构优化
```bash
stdd apply <change-id> --task TASK-001 --phase refactor
```

**目标**: 改进代码结构，**保持测试全绿**。
- **验证**: 所有测试必须仍然通过
- **失败处理**: 重构破坏了行为，需要回退
- **输出**: `[phase:done]` + `[x]` 标记写入 tasks.md
- **增强 (取自 pytest)**:
  - Coverage-aware 重构建议
  - 模块化 fixtures 支持

### 3. Legacy 模式（无 phase 标签）

对于没有 phase 标签的旧任务，直接运行测试并标记完成：

```bash
stdd apply <change-id> --test-command "npm test"
```

## CLI Runtime

### 基础用法
```bash
# 自动检测语言和测试命令
stdd apply <change-id>

# 指定测试命令
stdd apply <change-id> --test-command "pytest"

# TDD 模式 - Red phase
stdd apply <change-id> --task TASK-001 --phase red

# TDD 模式 - Green phase
stdd apply <change-id> --task TASK-001 --phase green

# TDD 模式 - Refactor phase
stdd apply <change-id> --task TASK-001 --phase refactor
```

### 语言特定示例

#### TypeScript/JavaScript
```bash
# 自动检测 npm/yarn/pnpm
stdd apply <change-id>

# 显式指定测试命令
stdd apply <change-id> --test-command "npm test"

# Jest with coverage
stdd apply <change-id> --test-command "npm test -- --coverage"

# Vitest
stdd apply <change-id> --test-command "npx vitest run"
```

#### Python
```bash
# 自动检测 pytest
stdd apply <change-id>

# 显式指定 pytest
stdd apply <change-id> --test-command "pytest"

# Pytest with coverage
stdd apply <change-id> --test-command "pytest --cov=src tests/"

# unittest
stdd apply <change-id> --test-command "python -m unittest discover"
```

#### Java
```bash
# 自动检测 Maven/Gradle
stdd apply <change-id>

# Maven
stdd apply <change-id> --test-command "mvn test"

# Gradle
stdd apply <change-id> --test-command "gradle test"

# 特定测试类
stdd apply <change-id> --test-command "mvn test -Dtest=UserServiceTest"
```

#### Go
```bash
# 自动检测 go test
stdd apply <change-id>

# 运行所有测试
stdd apply <change-id> --test-command "go test ./..."

# 带覆盖率
stdd apply <change-id> --test-command "go test -cover ./..."

# 带详细输出
stdd apply <change-id> --test-command "go test -v ./..."
```

#### Rust
```bash
# 自动检测 cargo test
stdd apply <change-id>

# 运行所有测试
stdd apply <change-id> --test-command "cargo test"

# 带输出
stdd apply <change-id> --test-command "cargo test -- --nocapture"
```

#### C#
```bash
# 自动检测 dotnet test
stdd apply <change-id>

# 运行所有测试
stdd apply <change-id> --test-command "dotnet test"

# 特定项目
stdd apply <change-id> --test-command "dotnet test src/Tests/Tests.csproj"
```

#### PHP
```bash
# 自动检测 PHPUnit/Pest
stdd apply <change-id>

# PHPUnit
stdd apply <change-id> --test-command "vendor/bin/phpunit"

# Pest
stdd apply <change-id> --test-command "vendor/bin/pest"
```

### Monorepo Workspace
```bash
# 限定作用域到特定 workspace
stdd apply <change-id> --workspace packages/api

# 在多个 workspace 中运行测试
stdd apply <change-id>  # 自动检测所有 workspaces
```

### 其他选项
```bash
# Dry run - 只显示会执行的命令
stdd apply <change-id> --dry-run

# 运行 E2E 探针测试
stdd apply <change-id> --e2e-command "npx cypress run"

# 允许无测试任务（文档任务等）
stdd apply <change-id> --allow-no-tests

# 委托给其他 AI 引擎
stdd apply <change-id> --delegate
```

## Graph Semantics
- 节点 ID 为 stdd.apply，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-task；resumable=true；parallelizable=false。
- Graph 必须尊重 depends_on/next，不得越过 confirm、verify、archive 等 gate。

## Constitution Gates
- Blocking 条例失败时停止并返回修复建议。
- Warning 条例必须在报告中列出，可由用户决定是否继续。
- Suggestion 条例用于改进可维护性和文档质量，不应伪装成已完成工作。

## Evidence Contract
- 默认证据路径：stdd/changes/<change-id>/evidence/
- 变更级 evidence 使用 stdd/changes/<change-id>/evidence/；全局 guard/audit 使用 stdd/evidence/。
- 证据文件应包含 command、timestamp、workspace、input summary、result、exit code 和关键 stdout/stderr 摘要。

## Error Handling
- 缺少 STDD 初始化时提示 stdd init。
- 缺少 change-id 时列出 stdd list / stdd status 的下一步。
- 连续失败 3 次触发熔断，生成或建议 stdd fix-packet <change-id>。
- workspace 不存在时提示 stdd workspace validate / repair。
- 缺少测试命令时失败（TDD 纪律），除非使用 --allow-no-tests。

## Outputs

### 产物结构
```
stdd/changes/<change-id>/
├── tasks.md                    # 任务列表（含 phase 标记）
├── apply.log                   # 执行日志
└── evidence/
    ├── apply-*.json            # Apply evidence
    ├── delegation-*.json       # 委托建议
    └── e2e-*.json              # E2E 探针结果
```

### 任务状态标记
```markdown
- [ ] TASK-001 [phase:red]    # RED phase - 写失败测试
- [ ] TASK-001 [phase:green]  # GREEN phase - 实现代码
- [ ] TASK-001 [phase:refactor] # REFACTOR phase - 重构
- [x] TASK-001 [phase:done]   # DONE - 完成
```

## Related Skills
- **stdd.fix-packet** - 失败时生成修复包
- **stdd.mutation** - 变异测试检测 fake-green
- **stdd.plan** - 技术设计和 TDD tasks
- **stdd.verify** - 完整性验证

## 参考工具（按语言）

| 语言 | 主要测试框架 | CLI 命令 | TDD 支持 |
|------|-------------|---------|---------|
| TypeScript | Jest, Vitest, Mocha | `npm test` | ✅ |
| Python | pytest, unittest | `pytest` | ✅ |
| Java | JUnit, TestNG | `mvn test` | ✅ |
| Go | testing package | `go test` | ✅ |
| Rust | built-in test | `cargo test` | ✅ |
| C# | xUnit, NUnit | `dotnet test` | ✅ |
| PHP | PHPUnit, Pest | `vendor/bin/phpunit` | ✅ |

## 设计决策

### 为什么强制 Red-Green-Refactor？
- **TDD 纪律**: 防止跳过测试直接写实现
- **测试先行**: 保证测试覆盖率和代码质量
- **小步前进**: 每个阶段都有明确目标，减少认知负担

### 为什么没有测试命令时失败？
- **TDD 要求**: 没有测试就不是 TDD
- **质量保证**: 防止无测试代码进入代码库
- **显式豁免**: 文档任务等可使用 --allow-no-tests

### 为什么支持多语言？
- STDD 是**通用 TDD 工具**，不绑定特定技术栈
- 不同团队使用不同语言（前端 TS，后端 Go/Python/Java）
- 统一的 TDD 工作流，语言特定的测试命令
