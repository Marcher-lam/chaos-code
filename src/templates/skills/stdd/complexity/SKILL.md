---
id: stdd.complexity
command: /stdd:complexity
description: 代码复杂度分析与热点检测（语言无关）
version: "3.0"
category: evidence
phase: verification
read_only: true
risk_level: low
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: []
next: [stdd.plan, stdd.refactor]
on_failure: []
inputs:
  - 源码路径
  - workspace
  - 复杂度阈值
outputs:
  - complexity report
  - hotspot list
  - trend analysis
evidence:
  required: true
  path: stdd/reports/complexity.json
constitution_articles:
  blocking: []
  warning: [4, 8]
  suggestion: []
graph:
  node_id: stdd.complexity
  parallelizable: true
  resumable: true
  checkpoint: none
---

# STDD Skill: /stdd:complexity

## Purpose
**代码复杂度分析与热点检测**。这是 Chaos Code 的只读分析 skill，通过多种指标识别技术债务和重构机会。

**核心设计原则：**
- **语言无关**：支持多种编程语言
- **多维度分析**：圈复杂度、认知复杂度、代码行数
- **热点识别**：找出最需要重构的代码
- **趋势追踪**：监控代码质量变化

## When to Use
- 需要识别代码中的复杂热点时
- 需要评估技术债务时
- 需要规划重构工作时
- 需要监控代码质量趋势时
- Code Review 前的质量检查

## 复杂度指标

### 1. Cyclomatic Complexity (圈复杂度)
**定义**: 代码中线性独立路径的数量

**计算公式**: `CC = 决策点数量 + 1`

**决策点包括**: `if`, `else if`, `for`, `while`, `switch`, `case`, `catch`, `三元运算符`, `&&`, `||`

**阈值**:
| 级别 | 范围 | 含义 |
|------|------|------|
| Low | 1-5 | 简单，易于测试 |
| Moderate | 6-10 | 中等，可接受 |
| High | 11-20 | 复杂，需要关注 |
| Very High | >20 | 过于复杂，需要重构 |

**质量门禁**: 新代码应保持在 10-15 以下，超过 20 应标记重构

**参考**: [Cyclomatic Complexity Guide | Sonar](https://www.sonarsource.com/resources/library/cyclomatic-complexity/)

### 2. Cognitive Complexity (认知复杂度)
**定义**: 人类阅读理解代码的难度

**特点**:
- 考虑嵌套深度
- 考虑代码中断（break, continue, return）
- 更贴近人类感知

**阈值**:
| 级别 | 范围 | 含义 |
|------|------|------|
| Low | 1-10 | 易于理解 |
| Moderate | 11-15 | 中等 |
| High | 16-30 | 难以理解 |
| Very High | >30 | 非常难懂 |

### 3. APP Mass (Absolute Public Methods)
**定义**: 公开方法的数量

**含义**: 衡量 API 表面积和模块复杂度

### 4. Code Churn (代码变动率)
**公式**: `热点风险 = 复杂度 × 变动频率`

**含义**: 高复杂度 + 高变动 = 重构优先级高

**参考**: [What Are the 7 Axes of Code Quality? - CodeAnt AI](https://www.codeant.ai/blogs/seven-axes-of-code-quality)

## CLI Runtime

```bash
# 分析当前项目
chaos complexity analyze

# 分析特定目录
chaos complexity analyze src/

# JSON 格式输出
chaos complexity analyze --json

# 查看最新报告
chaos complexity report

# 查看热点
chaos complexity hotspots

# 查看趋势
chaos complexity trend

# 限制趋势条目
chaos complexity trend --limit 10
```

## 输出格式

### 复杂度报告
```
Complexity Analysis Report

  Overview:
    Files analyzed: 42
    Total LOC: 8,234
    Functions: 156
    APP Mass: 156

  Complexity:
    Avg Cyclomatic: 8.5
    Avg Cognitive: 12.3
    Score: 72/100

  Top Complexity Hotspots:
    1. src/auth/service.js
        CC: 24 · Cog: 35 · Functions: 8
        → High complexity: Consider extracting methods
        → Deep nesting: Consider early returns

    2. src/api/handlers/user.js
        CC: 18 · Cog: 22 · Functions: 5

  Recommendations:
    • Consider refactoring high-complexity files
    • Break down large functions into smaller units
    • Reduce nesting depth in complex areas
```

### 热点详情
```
Complexity Hotspots

  1. src/auth/service.js
      Cyclomatic: 24 (very-high)
      Cognitive: 35 (very-high)
      Nesting: 6 · Functions: 8 · LOC: 234
      → High complexity: Consider extracting methods
      → Deep nesting: Consider early returns

  2. src/payment/processor.js
      Cyclomatic: 19 (high)
      Cognitive: 28 (high)
      Nesting: 5 · Functions: 6 · LOC: 189
      → High complexity: Consider extracting methods
```

## 重构建议

### 高圈复杂度 (>20)
- **提取方法**: 将大函数拆分成小函数
- **策略模式**: 用多态替代复杂的条件语句
- **状态机**: 用状态机简化复杂状态转换

### 深度嵌套 (>5)
- **提前返回**: 使用 guard clauses
- **提取条件**: 将复杂条件提取为命名变量
- **扁平化**: 重构嵌套结构为线性流程

### 高认知复杂度
- **减少嵌套**: 扁平化代码结构
- **命名中间变量**: 提高可读性
- **注释辅助**: 添加解释性注释

## Graph Semantics
- 节点 ID 为 stdd.complexity，由 frontmatter 暴露给 Skill Graph。
- checkpoint=none；resumable=true；parallelizable=true。
- 无依赖，可随时运行。

## Constitution Gates
- **Warning 条例 4**: 复杂度超标时警告
- **Warning 条例 8**: 代码质量问题警告

## Evidence Contract
- 报告保存到 `stdd/reports/complexity.json`
- 趋势数据保存到 `stdd/reports/complexity-trend.jsonl`
- 包含时间戳、指标、热点列表

## Related Skills
- **stdd.plan** - 规划重构工作
- **stdd.refactor** - 执行重构
- **stdd.mutation** - 变异测试

## 参考资源

### 复杂度指标
- [Cyclomatic Complexity Guide | Sonar](https://www.sonarsource.com/resources/library/cyclomatic-complexity/)
- [How to Reduce Cyclomatic Complexity | Augment Code](https://www.augmentcode.com/learn/how-to-reduce-cyclomatic-complexity)
- [7 Code Complexity Metrics - daily.dev](https://daily.dev/blog/7-code-complexity-metrics-developers-must-track)

### 热点检测
- [Identify Refactoring Targets - CodeScene](https://codescene.com/use-cases/refactoring-targets)
- [Code Health – CodeScene](https://codescene.io/docs/guides/technical/code-health.html)
- [GitHub - hotspots CLI](https://github.com/Stephen-Collins-tech/hotspots)

### 代码质量
- [What Are the 7 Axes of Code Quality? - CodeAnt AI](https://www.codeant.ai/blogs/seven-axes-of-code-quality)
- [Source Code Hotspots Research - arXiv](https://arxiv.org/html/2602.13170v1)

## 多语言复杂度工具

### JavaScript/TypeScript
```bash
# ESLint Complexity Plugin
npm install --save-dev eslint-plugin-complexity

# .eslintrc.json
{
  "rules": {
    "complexity": ["error", 10],
    "max-depth": ["error", 4],
    "max-nested-callbacks": ["error", 3],
    "max-params": ["error", 4],
    "max-statements": ["error", 30]
  }
}

# 运行
eslint src/ --report-unused-disable-directives
```

### Python
```bash
# Radon - 复杂度分析
pip install radon

# 圈复杂度
radon cc src/ -a

# 认知复杂度（需要 xenon）
pip install xenon
xenon --max-absolute A --max-modules A --max-average A src/

# Lizard - 多语言复杂度
pip install lizard
lizard src/ -l python --CCN 15
```

### Java
```bash
# Maven PMD 插件
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-pmd-plugin</artifactId>
    <version>3.19.0</version>
    <configuration>
        <rulesets>
            <ruleset>/rulesets/java/quickstart.xml</ruleset>
        </rulesets>
        <exfailOnViolation>false</exfailOnViolation>
    </configuration>
</plugin>

# 运行
mvn pmd:check

# SonarQube Scanner
mvn sonar:sonar
```

### Go
```bash
# Gocyclo - 圈复杂度
go install github.com/fzipp/gocyclo/cmd/gocyclo@latest
gocyclo -over 15 src/

# Gocognite - 认知复杂度
go install github.com/uudashr/gocognite/cmd/gocognite@latest
gocognite src/

# Complexity - 综合分析
go install github.com/timtadh/complexity@latest
complexity src/
```

### Rust
```bash
# Cargo complexitate
cargo install complexitate
cargo complexitate

# 手动配置（使用 clippy）
cargo clippy -- -W clippy::cognitive_complexity
```

### C#
```bash
# dotnet format + 分析
dotnet format --verify --no-restore

# SonarAnalyzer
dotnet add package SonarAnalyzer.CSharp

# .editorconfig
dotnet_style.readability_preference = true
```

### PHP
```bash
# PHP Mess Detector
composer require --dev phpmd/phpmd

vendor/bin/phpmd src/ text rulesets/codesize.xml

# PHP Copy/Paste Detector
composer require --dev sebastian/phpcpd
vendor/bin/phpcpd src/
```

## SonarQube 集成

### Quality Profile 配置
```yaml
# sonar-project.properties
sonar.projectKey=my-project
sonar.sources=src
sonar.tests=tests
sonar.language=ts

# 复杂度阈值
sonar.sonar.cpp.complexity.threshold=15
sonar.sonar.java.complexity.threshold=15
sonar.sonar.javascript.complexity.threshold=10
sonar.sonar.python.complexity.threshold=10

# 认知复杂度
sonar.sonar.cpp.complexity.cognitive.threshold=15
sonar.sonar.java.complexity.cognitive.threshold=15

# 质量门禁
sonar.qualitygate.wait=true
```

### SonarQube 规则
```json
{
  "rules": [
    {
      "key": "cpp:S134",
      "name": "Control flow statements should not be nested too deeply",
      "severity": "MAJOR",
      "params": {
        "maxNestingLevel": 3
      }
    },
    {
      "key": "java:S3776",
      "name": "Cognitive Complexity of functions should not be too high",
      "severity": "CRITICAL",
      "params": {
        "threshold": 15
      }
    },
    {
      "key": "typescript:S3776",
      "name": "Cognitive Complexity of functions should not be too high",
      "severity": "CRITICAL",
      "params": {
        "threshold": 15
      }
    }
  ]
}
```

## Code Quality Dashboard

### 指标汇总
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "project": "my-app",
  "overall": {
    "quality_score": 72,
    "rating": "B",
    "status": "warning"
  },
  "metrics": {
    "complexity": {
      "cyclomatic": {
        "avg": 8.5,
        "max": 24,
        "rating": "C"
      },
      "cognitive": {
        "avg": 12.3,
        "max": 35,
        "rating": "D"
      }
    },
    "duplication": {
      "ratio": 3.2,
      "blocks": 5,
      "rating": "A"
    },
    "maintainability": {
      "rating": "B",
      "debt_ratio": "2.5%"
    }
  },
  "hotspots": [
    {
      "file": "src/auth/service.ts",
      "complexity": 24,
      "cognitive": 35,
      "churn": 15,
      "risk_score": 95,
      "recommendation": "Extract authentication logic into separate methods"
    }
  ]
}
```

## 设计决策

### 为什么使用多个复杂度指标？
- **圈复杂度**: 测试覆盖的基准
- **认知复杂度**: 可维护性的指标
- **结合使用**: 全面评估代码质量

### 为什么追踪热点？
- **优先级排序**: 有限资源优先处理最严重的问题
- **风险控制**: 高复杂度 + 高变动 = 高风险
- **持续改进**: 跟踪重构效果

### 为什么是只读 skill？
- **安全**: 不修改代码
- **灵活**: 用户决定如何处理问题
- **分析**: 专注于评估和报告

### 为什么集成 SonarQube？
- **业界标准**: 广泛采用的质量平台
- **多维度**: 不仅复杂度，还有重复代码、安全等
- **CI 集成**: 易于集成到开发流程
