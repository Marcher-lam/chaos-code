---
id: stdd.help
command: /stdd:help
description: 根据当前状态提供上下文感知帮助和下一步建议（语言无关）
version: "3.0"
category: documentation
phase: all
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
  - 当前状态
  - topic
  - workspace
outputs:
  - terminal help
  - next-step recommendation
evidence:
  required: false
  path: stdd/evidence/
constitution_articles:
  blocking: []
  warning: []
  suggestion: [5]
graph:
  node_id: stdd.help
  parallelizable: true
  resumable: false
  checkpoint: none
---

# STDD Skill: /stdd:help

## Purpose
**根据当前状态提供上下文感知帮助和下一步建议**。这是 Chaos Code 的帮助 skill，根据项目当前状态提供智能建议。

**核心设计原则：**
- **语言无关**：适用于任何编程语言
- **上下文感知**：根据项目状态定制建议
- **阶段引导**：按开发阶段提供帮助
- **主题聚焦**：支持特定主题深入

## When to Use
- 不确定下一步该做什么时
- 需要了解 STDD 工作流时
- 需要查看可用命令时
- 需要特定主题帮助时

## 状态感知帮助

### 未初始化项目
```
👋 Welcome to STDD!

Your project is not yet initialized. Get started:

  chaos init

This will set up the STDD directory structure and configuration.
```

### 已初始化，无变更
```
📋 STDD is ready!

Create your first change:

  chaos new "Add user login"

Or use fast-forward for clear requirements:

  chaos ff "Simple bug fix"
```

### 有活跃变更
```
🔄 Active change: add-user-login

Current phase: apply

Next steps:
  chaos apply add-user-login          # Continue implementation
  chaos status                        # View progress
  stdd tasks add-user-login          # View tasks
```

### 验证阶段
```
✅ Ready to verify!

Run verification:

  chaos verify add-user-login

This checks:
  - All tasks completed
  - Tests passing
  - Coverage adequate
  - Constitution compliance
```

## CLI Runtime

```bash
# 通用帮助
chaos help

# 列出所有技能
chaos skills

# 列出所有命令
chaos commands

# 获取推荐
chaos recommend

# 特定主题帮助
chaos help tdd
chaos help graph
chaos help constitution
chaos help workspace

# 查看状态
chaos status

# 查看进度
chaos progress
```

## 主题帮助

### TDD 主题
```
🧪 TDD Workflow

The Ralph Loop cycle:

  1. RED    - Write failing test
  2. CHECK  - Static analysis
  3. GREEN  - Make tests pass
  4. MUTATION - Verify test quality
  5. REFACTOR - Optimize code

Commands:
  chaos apply <change-id>      # Execute TDD cycle
  chaos guard                  # Check TDD compliance
  chaos mutation <change-id>   # Mutation testing
```

### Graph 主题
```
📊 Skill Graph

The STDD skill dependency graph:

  init → propose → clarify → confirm → spec → plan → apply → verify → archive

Commands:
  chaos graph run feature       # Run full workflow
  chaos graph analyze           # Analyze dependencies
  chaos graph history           # View execution history
```

### Constitution 主题
```
⚖️ Constitution

9 quality articles organized by priority:

  Blocking (must pass):
    - Article 2: TDD
    - Article 7: Security
    - Article 9: CI/CD

  Warning (should pass):
    - Article 1: Library-First
    - Article 3: Small Commits
    - Article 4: Code Style
    - Article 6: Error Handling

  Suggestion (improvements):
    - Article 5: Documentation
    - Article 8: Performance

Commands:
  chaos constitution show        # View articles
  chaos constitution check       # Check compliance
  chaos constitution waive      # Request waiver
```

### Workspace 主题
```
📦 Workspace

Monorepo workspace management:

Commands:
  chaos workspace list          # List workspaces
  chaos workspace validate      # Validate configuration
  chaos workspace repair        # Auto-fix configuration
```

## 推荐系统

### 智能推荐逻辑
```javascript
function recommend(projectState) {
  if (!projectState.initialized) {
    return "chaos init";
  }

  if (!projectState.activeChange) {
    return "chaos new or chaos ff";
  }

  const change = projectState.activeChange;

  if (!change.proposal) {
    return "chaos propose " + change.id;
  }

  if (!change.confirmed) {
    return "chaos confirm " + change.id;
  }

  if (!change.specs) {
    return "chaos spec " + change.id;
  }

  if (!change.tasks) {
    return "chaos plan " + change.id;
  }

  if (change.pendingTasks > 0) {
    return "chaos apply " + change.id;
  }

  if (!change.verified) {
    return "chaos verify " + change.id;
  }

  return "chaos archive " + change.id;
}
```

## Graph Semantics
- 节点 ID 为 stdd.help，由 frontmatter 暴露给 Skill Graph。
- checkpoint=none；resumable=false；parallelizable=true。
- 无依赖，为所有 skill 提供帮助。

## Constitution Gates
- **Suggestion 条例 5 (Documentation)**: 帮助输出应包含必要文档

## Evidence Contract
- 不写入 evidence（帮助技能）

## Related Skills
- **stdd.status** - 状态查询
- **stdd.progress** - 进度查询
- **stdd.recommend** - 推荐系统

## 参考资源

### CLI 设计
- [CLI Design Patterns](https://clig.dev/)
- [Command Line Interface Guidelines](https://github.com/clibs/clib/wiki/CLI-Design-Guidelines)

### 帮助系统
- [GNU Help Standards](https://www.gnu.org/prep/standards/html_node/_002d_002dhelp.html)
- [Help Command Design](https://berthold-sick.com/2019/02/26/a-better-help-for-your-command-line-programs/)

## 设计决策

### 为什么上下文感知？
- **相关性**: 只显示相关的命令
- **简洁**: 不显示不必要的信息
- **智能**: 理解用户当前状态

### 为什么分主题？
- **深度**: 特定主题可以深入
- **专注**: 不被无关信息干扰
- **学习**: 帮助用户理解特定概念

### 为什么推荐系统？
- **引导**: 帮助新手入门
- **效率**: 减少思考时间
- **发现**: 发现可能不知道的命令

## tldr 风格帮助

### 常用命令快速参考
```bash
# 初始化项目
chaos init

# 创建新变更
chaos new "feature description"

# 快速完成（明确需求）
chaos ff "fix bug in login"

# 查看状态
chaos status

# 继续/恢复
chaos continue

# 执行 TDD
chaos apply <change-id>

# 验证变更
chaos verify <change-id>

# 归档完成
chaos archive <change-id>
```

### TDD 快速参考
```bash
# RED - 写失败测试
chaos apply <change-id> --phase red

# GREEN - 最少实现
chaos apply <change-id> --phase green

# REFACTOR - 重构
chaos apply <change-id> --phase refactor

# MUTATION - 变异测试
chaos mutation <change-id>

# GUARD - 质量检查
chaos guard
```

### 测试命令快速参考
```bash
# 生成 BDD 规格
chaos spec <change-id>

# 生成测试骨架
chaos outside-in scaffold <change-id>

# 生成测试数据工厂
chaos factory <change-id>

# 生成 Mock
chaos mock <change-id>

# 运行测试验证
chaos verify <change-id>
```

### Graph 工作流快速参考
```bash
# 完整工作流
chaos graph run <intent> --full

# 热修复流程
chaos graph run hotfix --fast-track

# 分析依赖
chaos graph analyze

# 查看历史
chaos graph history

# 重放执行
chaos graph replay <session-id>
```

### Monorepo 快速参考
```bash
# 列出 workspace
chaos workspace list

# 指定 workspace 执行
stdd <command> --workspace packages/api

# 验证配置
chaos workspace validate

# 自动修复配置
chaos workspace repair
```

## 交互式帮助

### 对话式引导
```bash
$ chaos help --interactive

? 你想做什么？
  📝 创建新功能
  🐛 修复 Bug
  ♻️ 重构代码
  📊 查看状态
  ❓ 获取帮助

❯ 📝 创建新功能

? 请描述功能：
❯ 用户登录功能

? 选择工作流：
  标准 (spec → plan → apply)
  快速 (ff 直接生成)
  Turbo (全自动化)
❯ 标准

✓ 建议执行流程：

1. chaos new "用户登录功能"
2. chaos propose user-login-001
3. chaos clarify user-login-001
4. chaos confirm user-login-001
5. chaos spec user-login-001
6. chaos plan user-login-001
7. chaos apply user-login-001
8. chaos verify user-login-001
9. chaos archive user-login-001

? 是否现在开始？ Yes
```

## 按场景帮助

### 新手入门
```bash
$ chaos help --scenario getting-started

🎯 STDD 新手入门

第 1 步：初始化项目
  chaos init

第 2 步：创建第一个变更
  chaos new "添加用户登录"

第 3 步：编写规格
  chaos spec <change-id>

第 4 步：生成任务
  chaos plan <change-id>

第 5 步：执行实现
  chaos apply <change-id>

第 6 步：验证完成
  chaos verify <change-id>

第 7 步：归档变更
  chaos archive <change-id>

📚 更多信息：chaos help tutorial
```

### 紧急修复
```bash
$ chaos help --scenario hotfix

🔥 紧急修复流程

对于生产环境的紧急 Bug：

1. 创建热修复变更
   chaos new --type hotfix "修复登录崩溃"

2. 快速生成修复代码
   chaos ff <change-id>

3. 快速验证
   chaos verify <change-id> --fast

4. 紧急归档
   chaos archive <change-id> --hotfix

⚠️ 热修复后记得补充测试！
```

### 代码审查准备
```bash
$ chaos help --scenario code-review

📋 代码审查准备清单

在创建 PR 前：

□ chaos verify <change-id>      # 验证通过
□ chaos mutation <change-id>    # mutation 测试
□ chaos constitution check      # 合规检查
□ chaos final-doc <change-id>   # 生成文档

然后创建 PR：
  stdd pr create <change-id>
```
