---
id: stdd.guard
command: /stdd:guard
description: 执行 TDD 守护、coverage-aware 质量门禁与 Anti-Bypass（语言无关）
version: "3.0"
category: tdd
phase: governance
read_only: false
risk_level: high
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.init]
next: [stdd.verify]
on_failure: [stdd.fix-packet]
inputs:
  - 项目文件
  - 测试 evidence
  - Constitution 配置
outputs:
  - guard report
  - stdd/evidence/guard-*.json
evidence:
  required: true
  path: stdd/evidence/
constitution_articles:
  blocking: [2, 7, 9]
  warning: []
  suggestion: []
graph:
  node_id: stdd.guard
  parallelizable: false
  resumable: true
  checkpoint: per-run
---

# STDD Skill: /stdd:guard

## Purpose
**执行 TDD 守护、coverage-aware 质量门禁与 Anti-Bypass**。这是 Chaos Code 的质量守卫 skill，确保代码符合 TDD 原则和质量标准。

**核心设计原则：**
- **语言无关**：适用于任何编程语言
- **TDD 强制**：测试先行原则
- **Coverage 感知**：基于覆盖率的门禁
- **Anti-Bypass**：防止绕过质量检查

## When to Use
- 需要强制执行 TDD 规则时
- 需要检查覆盖率时
- 需要在 CI 中设置质量门禁时
- 需要防止绕过测试时

## 质量门禁检查

### 1. TDD 检查（Article 2）
**目标**：确保测试先行

**检查项**：
- ✅ 测试文件早于实现文件创建
- ✅ 测试文件与源文件比例合理
- ✅ 没有无测试的实现

**多语言测试文件检测**：
| 语言 | 测试文件模式 | 源文件模式 |
|------|--------------|------------|
| JavaScript/TypeScript | *.test.js, *.spec.ts | *.js, *.ts |
| Python | test_*.py, *_test.py | *.py |
| Java | *Test.java, *Tests.java | *.java |
| Go | *_test.go | *.go |
| Rust | *_test.rs, tests/*.rs | *.rs |
| C# | *.Tests.cs, *Test.cs | *.cs |
| PHP | *Test.php, tests/*.php | *.php |

### 2. Coverage 门禁
**目标**：确保足够的测试覆盖

**检查项**：
- 语句覆盖率达标（默认 80%）
- 分支覆盖率达标（默认 75%）
- 函数覆盖率达标（默认 80%）

**多语言覆盖率工具**：
| 语言 | 工具 | 命令 |
|------|------|------|
| JavaScript/TypeScript | NYC/Istanbul | `npx nyc npm test` |
| Python | Coverage.py | `pytest --cov` |
| Java | JaCoCo | `mvn jacoco:report` |
| Go | go test -cover | `go test -cover ./...` |
| Rust | tarpaulin | `cargo tarpaulin` |
| C# | dotcover/coverlet | `dotnet test --collect:"XPlat Code Coverage"` |
| PHP | PHPUnit coverage | `vendor/bin/phpunit --coverage-html` |

### 3. Mutation Evidence（可选）
**目标**：验证测试质量

**检查项**：
- Mutation 测试已运行
- Mutation 分数达标（默认 70%）

### 4. Anti-Bypass 检查
**目标**：防止绕过质量检查

**检测信号**：
- 测试被禁用（skip, xit, todo）
- 断言被注释
- Mock 覆盖真实实现
- 条件编译跳过测试

## CLI Runtime

```bash
# 运行 guard 检查
chaos guard

# 安装 Git hooks（类似 pre-commit install）
chaos guard install
chaos guard install --hook-type pre-commit
chaos guard install --hook-type pre-push
chaos guard install --hook-types pre-commit,pre-push,commit-msg

# 卸载 Git hooks
chaos guard uninstall

# 运行所有 hooks
chaos guard run --all-files
chaos guard run <hook-id>

# 更新 hooks 到最新版本
chaos guard autoupdate
chaos guard autoupdate --bleeding-edge
chaos guard autoupdate --freeze

# 严格模式（warning 升级为 blocking）
chaos guard --strict

# 指定 workspace
chaos guard --workspace packages/api

# 跳过 Constitution 检查
chaos guard --no-constitution

# 自定义覆盖率阈值
chaos guard --coverage-threshold 85

# 输出 JSON
chaos guard --json

# CI 模式（零容忍）
chaos guard --ci
```

## Guard 配置文件

### .stdd-guard.yaml
参考 pre-commit 的配置模式：

```yaml
# 全局配置
default_language_version:
  python: python3.11
  node: lts
  ruby: 3.2

default_stages: [pre-commit, pre-push]
fail_fast: false

# Hooks 仓库
repos:
  # STDD 内置 hooks
  - repo: https://github.com/stdd-copilot/stdd-hooks
    rev: v1.0.0
    hooks:
      - id: tdd-check
        stages: [pre-commit]
      - id: coverage-check
        args: [--threshold=80]
      - id: mutation-evidence
        stages: [pre-push]

  # ESLint
  - repo: https://github.com/pre-commit/mirrors-eslint
    rev: v8.57.0
    hooks:
      - id: eslint
        args: [--fix]

  # Python hooks
  - repo: https://github.com/psf/black
    rev: 24.3.0
    hooks:
      - id: black
      - id: black-doc

  # 本地 hooks（项目特定）
  - repo: local
    hooks:
      - id: custom-tdd-check
        name: Custom TDD Check
        entry: scripts/tdd-check.sh
        language: script
        files: \.(js|ts|py)$
```

## Git Hooks 集成

### 支持的 Hook 类型
| Hook 类型 | 触发时机 | 用途 |
|-----------|----------|------|
| pre-commit | commit 前 | 代码质量、格式检查 |
| pre-push | push 前 | 完整测试套件、mutation |
| commit-msg | commit 消息后 | 提交信息规范 |
| pre-merge-commit | merge commit 前 | 合并质量检查 |
| post-commit | commit 后 | 通知、日志 |
| post-checkout | checkout 后 | 依赖安装提示 |

### Hook Stages 配置
```yaml
# 在不同阶段运行不同的检查
repos:
  - repo: local
    hooks:
      # 快速检查：每次 commit
      - id: quick-lint
        name: Quick Lint
        entry: eslint
        language: node
        stages: [pre-commit]
        types: [javascript]

      # 完整检查：push 前运行
      - id: full-test-suite
        name: Full Test Suite
        entry: npm test
        language: system
        stages: [pre-push]

      # 手动运行：不自动触发
      - id: heavy-analysis
        name: Heavy Analysis
        entry: scripts/analyze.sh
        language: script
        stages: [manual]
```

## 临时禁用 Hooks

```bash
# 跳过特定 hook（类似 SKIP=flake8）
STDD_SKIP=eslint,tdd-check git commit -m "message"

# 跳过所有 guards
git commit --no-verify -m "message"
```

## 多语言 Hooks

### 支持的语言
| 语言 | 包管理器 | 安装方式 |
|------|----------|----------|
| node | npm | package.json |
| python | pip | setup.py / pyproject.toml |
| ruby | gem | *.gemspec |
| go | go mod | go.mod |
| rust | cargo | Cargo.toml |
| dart | pub | pubspec.yaml |
| dotnet | nuget | *.csproj |
| php | composer | composer.json |

### Hook 定义示例
```yaml
repos:
  # JavaScript/TypeScript
  - repo: local
    hooks:
      - id: typescript-check
        name: TypeScript Check
        entry: tsc --noEmit
        language: node
        types: [typescript]

  # Python
  - repo: local
    hooks:
      - id: mypy-check
        name: MyPy Type Check
        entry: mypy
        language: python
        types: [python]

  # Go
  - repo: local
    hooks:
      - id: go-vet
        name: Go Vet
        entry: go vet
        language: golang
        types: [go]

  # Rust
  - repo: local
    hooks:
      - id: clippy
        name: Clippy Lint
        entry: cargo clippy
        language: rust
        types: [rust]
```

## Guard 报告

### 通过示例
```
✅ TDD Guard Report

  TDD Check: PASS
    ✓ Test-first detected
    ✓ Test/source ratio: 1.2 (OK)

  Coverage: PASS
    ✓ Statement: 87.5% (target: 80%)
    ✓ Branch: 78.3% (target: 75%)
    ✓ Function: 85.0% (target: 80%)

  Mutation: PASS
    ✓ Mutation score: 75.2% (target: 70%)

  Anti-Bypass: PASS
    ✓ No disabled tests
    ✓ No commented assertions

  Overall: PASS ✓
```

### 失败示例
```
❌ TDD Guard Report

  TDD Check: FAIL
    ✗ src/auth.js created before test
    ✗ Test/source ratio: 0.5 (too low)

  Coverage: FAIL
    ✗ Statement: 65.3% (target: 80%)
    ✓ Branch: 78.3% (target: 75%)
    ✗ Function: 72.0% (target: 80%)

  Mutation: SKIPPED
    ℹ No mutation evidence found

  Anti-Bypass: WARNING
    ⚠ 2 tests skipped
    ⚠ 1 commented assertion

  Overall: FAIL ✗

  Run: chaos fix-packet <change-id>
```

## Graph Semantics
- 节点 ID 为 stdd.guard，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-run；resumable=true；parallelizable=false。
- 可在 hooks/CI/verify 前运行。

## Constitution Gates
- **Blocking 条例 2 (TDD)**: 强制测试先行
- **Blocking 条例 7 (Security)**: 安全检查
- **Blocking 条例 9 (CI/CD)**: CI 集成

## Evidence Contract
- Guard 报告写入 `stdd/evidence/guard-*.json`
- 变更级 evidence 写入 `stdd/changes/<change-id>/evidence/guard-*.json`

## Related Skills
- **stdd.fix-packet** - 生成修复包
- **stdd.init** - 初始化配置
- **stdd.verify** - 综合验证
- **stdd.mutation** - 突变测试

## 参考资源

### Git Hooks 工具
- [pre-commit](https://pre-commit.com/) - 多语言 Git hooks 框架
- [Husky](https://typicode.github.io/husky/) - Node.js Git hooks
- [lint-staged](https://github.com/okonet/lint-staged) - 只检查暂存文件
- [simple-git-hooks](https://github.com/toplenboren/simple-git-hooks) - 轻量级 hooks

### TDD 实践
- [Test-Driven Development](https://martinfowler.com/bliki/TestDrivenDevelopment.html)
- [TDD Best Practices](https://docs.google.com/document/d/1GfjFjQ7XOSqkxe4XsTm7wzM7t4BP_aPK7NqK7_Gj5fE/)

### 覆盖率工具
- [Istanbul/NYC](https://istanbul.js.org/) - JavaScript
- [Coverage.py](https://coverage.readthedocs.io/) - Python
- [JaCoCo](https://www.jacoco.org/) - Java
- [go cover](https://go.dev/testing/coverage/) - Go
- [tarpaulin](https://github.com/xd009642/tarpaulin) - Rust

### CI 集成
- [GitHub Actions](https://docs.github.com/en/actions)
- [GitLab CI/CD](https://docs.gitlab.com/ee/ci/)
- [pre-commit.ci](https://pre-commit.ci/) - 免费预提交 CI 服务

## 设计决策

### 为什么需要 TDD Guard？
- **强制执行**: 确保团队遵守 TDD 原则
- **自动化**: 在 CI 中自动检查
- **快速反馈**: 立即发现问题

### 为什么类似 pre-commit 的配置？
- **声明式**: 配置即文档
- **多语言**: 支持任何语言的 hooks
- **可组合**: 灵活组合不同检查
- **隔离**: 每个 hook 独立环境

### 为什么 Anti-Bypass？
- **真实性**: 防止假装测试
- **完整性**: 确保测试真正运行
- **可靠性**: 信任测试结果

### 为什么 Coverage 感知？
- **质量**: 足够的覆盖才能信任
- **可配置**: 不同项目不同要求
- **渐进**: 可以逐步提高标准

## 最佳实践（来自 pre-commit）

### 1. Hooks 应该快速
- pre-commit hooks 应该在几秒内完成
- 把耗时检查放到 pre-push 或 manual 阶段

### 2. 使用 fail_fast
- 在关键检查失败时立即停止
- 节省开发者时间

### 3. 分阶段检查
```yaml
# 快速：每次 commit
stages: [pre-commit]

# 中等：每次 push
stages: [pre-push]

# 慢速：手动或 CI
stages: [manual]
```

### 4. 利用缓存
- hook 环境会被缓存
- 首次运行慢，后续快

### 5. CI 中运行所有文件
```bash
# 本地：只检查暂存文件
chaos guard run

# CI：检查所有文件
chaos guard run --all-files
```

