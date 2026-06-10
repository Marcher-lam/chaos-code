---
id: stdd.explore
command: /stdd:explore
description: 只读探索现有系统、约束和可行路径（语言无关）
version: "3.0"
category: documentation
phase: discovery
read_only: true
risk_level: low
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: []
next: []
on_failure: []
inputs:
  - scope
  - 项目文件
  - 测试与入口
outputs:
  - exploration report
  - constraints/options
evidence:
  required: false
  path: stdd/changes/<change-id>/evidence/
constitution_articles:
  blocking: []
  warning: []
  suggestion: [8]
graph:
  node_id: stdd.explore
  parallelizable: true
  resumable: true
  checkpoint: per-change
---

# STDD Skill: /stdd:explore

## Purpose
**只读探索现有系统、约束和可行路径**。这是 Chaos Code 的探索 skill，对现有项目进行只读分析，生成架构摘要、质量热点和可操作建议。

**核心设计原则：**
- **语言无关**：适用于任何编程语言和项目类型
- **只读操作**：不修改任何代码或配置
- **深度分析**：识别架构、依赖、测试覆盖和质量问题
- **可操作建议**：提供具体的改进方向

## When to Use
- 接手 brownfield 项目需要了解现状时
- 需要评估代码质量和风险时
- 需要识别重构机会时
- 需要理解项目架构时
- 需要为提案收集背景信息时

## 探索维度

### 1. 架构分析
**目标**：理解项目结构和组织方式

**分析内容**：
- 目录结构
- 模块划分
- 入口文件
- 依赖关系

**多语言入口文件识别**：
| 语言 | 常见入口文件 |
|------|--------------|
| JavaScript/TypeScript | index.js, main.js, app.js, server.js, cli.js |
| Python | __main__.py, main.py, app.py, manage.py |
| Java | Main.java, Application.java, *Servlet.java |
| Go | main.go, cmd/*/main.go |
| Rust | main.rs, lib.rs |
| C# | Program.cs, Startup.cs |
| PHP | index.php, artisan |
| Ruby | main.rb, application.rb |

### 2. 技术栈检测
**目标**：识别使用的技术和框架

**检测项**：
- 编程语言
- 框架和库
- 构建工具
- 测试框架
- 包管理器

**多语言配置文件识别**：
| 语言 | 配置文件 | 包管理器 |
|------|----------|----------|
| JavaScript/TypeScript | package.json | npm, yarn, pnpm |
| Python | pyproject.toml, requirements.txt, setup.py | pip, poetry |
| Java | pom.xml, build.gradle | Maven, Gradle |
| Go | go.mod | go modules |
| Rust | Cargo.toml | cargo |
| C# | .csproj, package.json | dotnet, NuGet |
| PHP | composer.json | composer |
| Ruby | Gemfile | bundler |

### 3. 测试覆盖分析
**目标**：评估测试覆盖情况

**分析内容**：
- 未测试的源文件
- 测试文件分布
- 测试模式识别

**多语言测试文件识别**：
| 语言 | 测试文件模式 |
|------|--------------|
| JavaScript/TypeScript | *.test.js, *.spec.js, *.test.ts, *.spec.ts, __tests__/*.js |
| Python | test_*.py, *_test.py, tests/*.py |
| Java | *Test.java, *Tests.java, **/test/*.java |
| Go | *_test.go |
| Rust | *_test.rs, tests/*.rs |
| C# | *.Tests.cs, *Test.cs, **/Test/*.cs |
| PHP | *Test.php, tests/*.php |
| Ruby | *_test.rb, spec/*_spec.rb |

### 4. 质量热点分析
**目标**：识别潜在的代码质量问题

**分析内容**：
- 过长文件（>500 行）
- 高复杂度文件
- 过多导出/公共成员
- 重复代码

**多语言代码复杂度分析**：
| 语言 | 复杂度工具 |
|------|------------|
| JavaScript/TypeScript | ESLint (complexity rule), eslint-plugin-complexity |
| Python | pylint, radon, mccabe |
| Java | PMD, SonarQube |
| Go | gocyclo, golangci-lint |
| Rust | clippy |
| C# | SonarQube, StyleCop |
| PHP | PHPMD, phpcodesniffer |

### 5. 依赖分析
**目标**：理解项目依赖关系

**分析内容**：
- 核心依赖
- 传递依赖
- 依赖版本
- 潜在冲突

## CLI Runtime

```bash
# 探索整个项目
chaos explore

# 探索特定范围
chaos explore src
chaos explore auth
chaos explore "src/**/*.ts"

# 输出到文件
chaos explore --output stdd/explorations/architecture.md

# JSON 格式输出
chaos explore --json

# 深度分析
chaos explore --deep

# Workspace 支持
chaos explore --workspace packages/api
```

## 探索报告格式

### Markdown 格式
```markdown
# STDD Project Exploration Report

## Architecture Summary
- **Language:** TypeScript
- **Framework:** Express.js
- **Test Runner:** Jest
- **Test Command:** npm test

### Entry Files
- `src/index.js`
- `src/cli.js`

### Core Dependencies
- express
- lodash
- axios

## Quality Hotspots

### Untested Files
- `src/utils/logger.js`
- `src/middleware/auth.js`

### Long Files (>500 lines)
- `src/controllers/user.js` (650 lines)

### Files with Many Exports (>10)
- `src/services/api.js` (15 exports)

## Suggestions
- 建议优先为 src/utils/logger.js 编写测试
- 建议重构 src/controllers/user.js (650 行)
- 建议拆分 src/services/api.js (导出了 15 个模块)
```

### JSON 格式
```json
{
  "techStack": {
    "language": "TypeScript",
    "framework": "Express.js",
    "testRunner": "Jest",
    "testCommand": "npm test"
  },
  "entryFiles": ["src/index.js"],
  "coreDependencies": ["express", "lodash"],
  "untestedFiles": ["src/utils/logger.js"],
  "longFiles": [{"file": "src/controllers/user.js", "lineCount": 650}],
  "highExportFiles": [{"file": "src/services/api.js", "exportCount": 15}],
  "suggestions": [
    {
      "type": "untested",
      "message": "建议优先为 src/utils/logger.js 编写测试",
      "priority": "high"
    }
  ]
}
```

## Graph Semantics
- 节点 ID 为 stdd.explore，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-change；resumable=true；parallelizable=true。
- 无依赖，为其他 skill 提供项目上下文。

## Constitution Gates
- **Suggestion 条例 8 (Performance)**: 探索报告包含性能相关建议

## Evidence Contract
- 探索报告可选写入 `stdd/changes/<change-id>/evidence/explore-*.json`
- 支持输出到自定义路径

## Related Skills
- **stdd.init** - 初始化项目
- **stdd.context** - 上下文管理
- **stdd.memory** - 项目记忆
- **stdd.learn** - 从代码学习

## 参考资源

### 代码分析工具
- [SonarQube](https://www.sonarqube.org/) - 多语言代码质量平台
- [CodeQL](https://codeql.github.com/) - 代码查询和安全分析
- [Understand](https://scitools.com/) - 商业代码分析工具

### 架构分析
- [C4 Model](https://c4model.com/) - 架构图模型
- [Structure101](https://structure101.com/) - 架构分析工具

### 测试覆盖
- [Coverage.py](https://coverage.readthedocs.io/) - Python 覆盖率
- [Istanbul/NYC](https://istanbul.js.org/) - JavaScript 覆盖率
- [JaCoCo](https://www.jacoco.org/) - Java 覆盖率

## 设计决策

### 为什么是只读操作？
- **安全**: 不修改任何代码
- **快速**: 可以随时运行
- **信任**: 用户可以放心使用

### 为什么需要多语言支持？
- **通用性**: STDD 应该支持任何编程语言
- **灵活性**: 适应不同项目的技术栈
- **可扩展**: 容易添加对新语言的支持

### 为什么分析质量热点？
- **快速识别问题**: 找出需要改进的地方
- **优先级排序**: 帮助团队决定下一步工作
- **持续改进**: 为重构提供数据支持
