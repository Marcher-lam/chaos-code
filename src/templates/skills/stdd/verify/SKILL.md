---
id: stdd.verify
command: /stdd:verify
description: 验证任务、测试、Constitution 与 evidence 完整性（语言无关）
version: "3.0"
category: lifecycle
phase: verification
read_only: true
risk_level: low
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.apply]
next: [stdd.archive, stdd.final-doc]
on_failure: [stdd.fix-packet]
inputs:
  - tasks.md
  - 测试输出
  - mutation evidence
  - Constitution 状态
outputs:
  - verify report
  - stdd/changes/<change-id>/evidence/verify-*.json
evidence:
  required: true
  path: stdd/changes/<change-id>/evidence/
constitution_articles:
  blocking: [2, 7, 9]
  warning: []
  suggestion: []
graph:
  node_id: stdd.verify
  parallelizable: false
  resumable: true
  checkpoint: per-change
---

# STDD Skill: /stdd:verify

## Purpose
**验证任务、测试、Constitution 与 evidence 完整性**。这是 Chaos Code 的综合验证 skill，确保变更满足所有质量标准。

**核心设计原则：**
- **语言无关**：适用于任何编程语言
- **综合验证**：多维度验证
- **证据完整**：确保证据完整
- **门禁严格**：严格执行门禁

## When to Use
- 变更完成后
- 需要综合验证时
- 需要归档前
- 需要质量门禁时

## CLI Runtime

```bash
# 综合验证
chaos verify <change-id>

# 包含 lint
chaos verify <change-id> --lint

# 跳过 Constitution
chaos verify <change-id> --no-constitution

# 跳过 mutation
chaos verify <change-id> --no-mutation

# Workspace 支持
chaos verify <change-id> --workspace packages/api

# 详细输出
chaos verify <change-id> --verbose

# JSON 输出
chaos verify <change-id> --json
```

## 验证维度

### 任务验证
| 检查项 | 描述 | 标准 |
|--------|------|------|
| 完成状态 | 所有任务完成 | 100% |
| 无 pending | 无待办任务 | 0 |
| 无 failing | 无失败任务 | 0 |
| 证据完整 | 任务有证据 | 100% |

### 测试验证
| 检查项 | 描述 | 阈值 |
|--------|------|------|
| 通过率 | 测试通过率 | 100% |
| 覆盖率 | 代码覆盖率 | ≥90% |
| 分支覆盖 | 分支覆盖率 | ≥85% |

### 多语言测试命令

#### JavaScript/TypeScript
```bash
# Jest
npm test

# Vitest
npm run test

# 覆盖率
npm run test:coverage
```

#### Python
```bash
# pytest
pytest

# 覆盖率
pytest --cov

# 全部
pytest --cov=. --cov-report=html
```

#### Java
```bash
# Maven
mvn test

# 覆盖率
mvn jacoco:report

# Gradle
./gradlew test
./gradlew jacocoTestReport
```

#### Go
```bash
# 测试
go test ./...

# 覆盖率
go test -cover ./...
go test -coverprofile=coverage.out ./...
```

#### Rust
```bash
# 测试
cargo test

# 覆盖率
cargo tarpaulin --out Html
```

### Lint 验证

| 语言 | Lint 工具 | 命令 |
|------|-----------|------|
| JavaScript/TypeScript | ESLint | `eslint .` |
| Python | Flake8, Black | `flake8 .`, `black --check .` |
| Java | Checkstyle | `mvn checkstyle:check` |
| Go | gofmt, golangci-lint | `gofmt -l .`, `golangci-lint run` |
| Rust | rustfmt, clippy | `rustfmt --check`, `cargo clippy` |

### Mutation 验证
| 检查项 | 描述 | 阈值 |
|--------|------|------|
| Mutation 得分 | 变异测试得分 | ≥80% |
|存活变异数 | 存活变异 | 最小化 |
| 超时变异 | 超时变异 | 0 |

### Constitution 验证
| 层级 | 条例 | 状态 |
|------|------|------|
| Blocking | 条例 2 (Test First) | ✅ |
| Blocking | 条例 7 (Security) | ✅ |
| Blocking | 条例 9 (Evidence) | ✅ |
| Warning | 条例 4 (Code Style) | ⚠️ |
| Warning | 条例 5 (Documentation) | ⚠️ |
| Warning | 条例 6 (Error Handling) | ✅ |

### Evidence 验证
| 检查项 | 描述 | 标准 |
|--------|------|------|
| 存在性 | 证据文件存在 | 100% |
| 完整性 | 证据内容完整 | 100% |
| 可追溯 | 可追溯到任务 | 100% |
| 时间戳 | 有时间戳 | 100% |

## 验证报告

### 报告格式
```json
{
  "changeId": "user-login-001",
  "timestamp": "2025-05-19T10:30:00Z",
  "overall": "pass",
  "summary": {
    "tasks": { "total": 10, "completed": 10, "pass": true },
    "tests": { "total": 25, "passed": 25, "coverage": 95.5, "pass": true },
    "mutation": { "score": 85.2, "pass": true },
    "constitution": { "blocking": 3, "passed": 3, "pass": true },
    "evidence": { "total": 15, "complete": 15, "pass": true }
  },
  "details": {
    "tasks": { "pending": [], "failing": [] },
    "tests": { "failed": [] },
    "mutation": { "surviving": [] },
    "constitution": { "warnings": ["条例 4: 部分 code style 问题"] },
    "evidence": { "missing": [] }
  },
  "recommendation": "proceed_to_archive"
}
```

## Graph Semantics
- 节点 ID 为 stdd.verify，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-change；resumable=true；parallelizable=false。
- 依赖 apply，下一步是 archive 和 final-doc。

## Constitution Gates
- **Blocking 条例 2 (Test First)**: 必须先写测试
- **Blocking 条例 7 (Security)**: 必须检查安全
- **Blocking 条例 9 (Evidence)**: 必须保留证据

## Evidence Contract
- 验证报告写入 `stdd/changes/<change-id>/evidence/verify-*.json`
- 包含所有验证维度结果

## Related Skills
- **stdd.apply** - 输入
- **stdd.archive** - 下一步
- **stdd.final-doc** - 下一步
- **stdd.fix-packet** - 失败处理
- **stdd.guard** - 质量门禁

## 参考资源

### 测试覆盖率
- [Code Coverage](https://en.wikipedia.org/wiki/Code_coverage)
- [Mutation Testing](https://en.wikipedia.org/wiki/Mutation_testing)

### 质量门禁
| 工具 | 语言 | 用途 |
|------|------|------|
| SonarQube | 多语言 | 代码质量 |
| Codacy | 多语言 | 代码分析 |
| Coveralls | 多语言 | 覆盖率 |

## 设计决策

### Why 综合验证？
- **全面**: 覆盖所有质量维度
- **严格**: 确保质量标准
- **可信**: 验证结果可信

### Why 门禁严格？
- **质量**: 确保高质量
- **合规**: 符合规范
- **可追溯**: 完整证据链
