# STDD Copilot CLI 使用指南

> 完整的 CLI 工具使用文档，涵盖安装、配置、使用和卸载。

---

## 目录

- [系统要求](#系统要求)
- [安装](#安装)
- [验证安装](#验证安装)
- [初始化项目](#初始化项目)
- [命令参考](#命令参考)
- [配置](#配置)
- [与 Claude Code 配合使用](#与-claude-code-配合使用)
- [常见问题](#常见问题)
- [卸载](#卸载)
- [清除项目配置](#清除项目配置)

---

## 系统要求

| 要求 | 版本 |
|------|------|
| Node.js | >= 20.0.0 |
| npm | >= 9.0.0 |
| Git | >= 2.0.0 |
| Claude Code | >= 2.0.0 (可选) |

### 检查系统要求

```bash
# 检查 Node.js 版本
node --version
# 应输出 v20.x.x 或更高

# 检查 npm 版本
npm --version
# 应输出 9.x.x 或更高

# 检查 Git 版本
git --version
# 应输出 git version 2.x.x
```

---

## 安装

### 方式 1: 全局安装 (推荐)

```bash
# 1. 克隆仓库
git clone https://github.com/Marcher-lam/STDD-COPILOT.git ~/stdd-copilot

# 2. 进入目录
cd ~/stdd-copilot

# 3. 安装依赖
npm install

# 4. 创建全局链接
npm link

# 5. 验证安装
stdd --version
# 输出: 1.0.0
```

### 方式 2: 使用 npx (无需安装)

```bash
# 直接使用，无需全局安装
npx ~/stdd:copilot/cli.js init

# 或设置别名
alias stdd='npx ~/stdd:copilot/cli.js'
```

### 方式 3: 本地项目安装

```bash
# 在项目中作为开发依赖安装
cd your-project
npm install ~/stdd-copilot --save-dev

# 使用 npx 运行
npx stdd init
```

### 方式 4: 从 npm 安装 (即将支持)

```bash
# 未来将支持
npm install -g stdd-copilot
```

---

## 验证安装

### 检查 CLI 是否可用

```bash
# 查看帮助
stdd --help
```

**预期输出:**

```
Usage: stdd [options] [command]

STDD Copilot - Spec + Test Driven Development Framework

Options:
  -V, --version              output the version number
  --no-color                 Disable color output
  -h, --help                 display help for command

Commands:
  init [options] [path]      Initialize STDD Copilot in your project
  update [options] [path]    Update STDD Copilot files in your project
  list|ls [options]          List all changes or specs
  status [options] [change]  Show status of a change or current work
  new                        Create new items
  skills [options]           List all available STDD skills
  commands                   List all Claude Code slash commands
  hooks [options]            Manage Hooks for AI Code engines
  help [command]             display help for command
```

### 检查版本

```bash
stdd --version
# 输出: 1.0.0
```

### 检查命令列表

```bash
stdd commands
```

**预期输出:**

```
🔧 STDD Copilot Commands

  /stdd:init            Initialize STDD workspace
  /stdd:new             Create new change proposal
  /stdd:explore         Explore requirements
  /stdd:ff              Fast-forward generation
  /stdd:continue        Continue paused work
  /stdd:apply           Execute TDD cycle
  /stdd:verify          Verify implementation
  /stdd:archive        Archive completed change
  /stdd:graph *         Graph engine commands

Use these commands in Claude Code conversations.
```

---

## 初始化项目

### 基础初始化

```bash
# 在当前目录初始化
cd your-project
stdd init
```

**创建的文件结构:**

```
your-project/
├── .claude/
│   └── commands/
│       └── stdd/           # 19 个命令文件
│           ├── init.md
│           ├── new.md
│           ├── explore.md
│           ├── ff.md
│           ├── continue.md
│           ├── apply.md
│           ├── verify.md
│           ├── archive.md
│           ├── graph.md
│           ├── propose.md
│           ├── clarify.md
│           ├── confirm.md
│           ├── spec.md
│           ├── plan.md
│           ├── execute.md
│           ├── brainstorm.md
│           ├── issue.md
│           ├── final-doc.md
│           └── constitution.md
├── .gitignore              # 已更新 (追加 STDD 相关条目)
├── AGENTS.md               # AI 代理指令文件
├── schemas/
│   └── spec-driven/
│       ├── schema.yaml     # 规格模式定义
│       └── templates/
│           ├── proposal.md
│           ├── spec.md
│           ├── design.md
│           └── tasks.md
└── stdd/
    ├── specs/              # Source of Truth
    ├── changes/            # 变更管理
    │   └── archive/        # 归档变更
    ├── memory/             # 记忆系统
    ├── graph/              # Graph 配置
    ├── explorations/       # 探索文档
    └── config.yaml         # 项目配置
```

### 初始化选项

```bash
# 强制覆盖已存在的文件
stdd init --force

# 在指定目录初始化
stdd init /path/to/project

# 跳过复制 skills 目录
stdd init --skip-skills

# 组合选项
stdd init /path/to/project --force --skip-skills
```

### 初始化后验证

```bash
# 检查初始化状态
stdd status

# 预期输出:
# 📊 STDD Copilot Status
#
# ✅ STDD initialized
# 📚 Specs: 0 domains
# 🔄 Active changes: 0
#
# 🧠 Memory: 0 files
```

---

## 命令参考

### 核心命令

#### `stdd init`

初始化 STDD Copilot 工作区。

```bash
stdd init [path] [options]

选项:
  --force          覆盖已存在的文件
  --skip-skills    跳过复制 skills 目录

示例:
  stdd init                        # 当前目录
  stdd init --force                # 强制覆盖
  stdd init ~/projects/my-app      # 指定目录
```

#### `stdd list` / `stdd ls`

列出变更或规格。

```bash
stdd list [options]

选项:
  --specs          列出规格而非变更
  --changes        列出变更 (默认)
  --archived       包含已归档的变更
  --json           JSON 格式输出

示例:
  stdd list                        # 列出活跃变更
  stdd list --specs                # 列出规格
  stdd list --archived             # 包含归档变更
  stdd list --json                 # JSON 输出
```

**输出示例:**

```
📋 Active Changes

  📝 add-dark-mode
     Add dark mode support for the UI
     Tasks: 3/5

  📝 user-authentication
     Implement OAuth2 login flow
     Tasks: 0/0
```

#### `stdd status`

显示变更或整体状态。

```bash
stdd status [change] [options]

选项:
  --json           JSON 格式输出

示例:
  stdd status                      # 整体状态
  stdd status add-dark-mode        # 特定变更状态
  stdd status --json               # JSON 输出
```

**输出示例 (整体状态):**

```
📊 STDD Copilot Status

✅ STDD initialized
📚 Specs: 2 domains
🔄 Active changes: 1

  Current Changes:

    🔧 add-dark-mode
       Tasks: 3/5
       Phase: Phase 4: Implementation

🧠 Memory: 3 files
```

**输出示例 (特定变更):**

```
📋 Change: add-dark-mode

  Artifacts:
    ✅ proposal.md
    ✅ specs/
    ✅ design.md
    ✅ tasks.md

  Tasks:
    Progress: 3/5
    [████████████████░░░░░░░░░░░░] 60%

  Current Phase:
    Phase 4: Implementation
```

### 创建命令

#### `stdd new change`

创建新变更。

```bash
stdd new change <name> [options]

选项:
  --title <title>       变更标题
  --description <desc>   变更描述

示例:
  stdd new change add-dark-mode
  stdd new change add-auth --title "用户认证"
  stdd new change api-v2 --description "API 版本 2"
```

**创建的文件:**

```
stdd/changes/add-dark-mode/
├── proposal.md        # 提案模板
├── specs/             # 空目录 (待填充)
└── tasks.md           # 空任务列表
```

#### `stdd new spec`

创建新规格。

```bash
stdd new spec <domain> [options]

示例:
  stdd new spec auth        # 创建 auth 域规格
  stdd new spec payment      # 创建 payment 域规格
  stdd new spec ui           # 创建 ui 域规格
```

**创建的文件:**

```
stdd/specs/auth/
└── spec.md            # 规格模板
```

### 信息命令

#### `stdd skills`

列出所有可用技能。

```bash
stdd skills [options]

选项:
  --phase <number>    按阶段筛选 (1-5)

示例:
  stdd skills              # 所有技能
  stdd skills --phase 1    # 仅 Phase 1 技能
  stdd skills --phase 4    # 仅 Phase 4 技能
```

**输出示例:**

```
📚 STDD Copilot Skills

Core Skills:
  • module.yaml

Phase-based Skills:
  Phase 1 (Proposal):
    • 1-proposal
  Phase 2 (Specification):
    • 2-specification
  Phase 3 (Design):
    • 3-design
  Phase 4 (Implementation):
    • 4-implementation
  Phase 5 (Verification):
    • 5-verification

Use in Claude Code: /stdd:<skill-name>
```

#### `stdd commands`

列出所有 Claude Code 斜杠命令。

```bash
stdd commands
```

**输出示例:**

```
🔧 STDD Copilot Commands

  /stdd:init            Initialize STDD workspace
  /stdd:new             Create new change proposal
  /stdd:explore         Explore requirements
  /stdd:ff              Fast-forward generation
  /stdd:continue        Continue paused work
  /stdd:apply           Execute TDD cycle
  /stdd:verify          Verify implementation
  /stdd:archive         Archive completed change
  /stdd:graph *         Graph engine commands

Use these commands in Claude Code conversations.
```

### 更新命令

#### `stdd update`

更新 STDD Copilot 文件。

```bash
stdd update [path] [options]

选项:
  --force          强制更新所有文件

示例:
  stdd update                # 更新当前目录
  stdd update --force        # 强制覆盖
  stdd update ~/my-app       # 更新指定目录
```

---

## 配置

### config.yaml

项目配置文件位于 `stdd/config.yaml`。

```yaml
# STDD Copilot Configuration
version: "1.0"
name: "my-project"

# 项目设置
project:
  type: "${PROJECT_TYPE:-node}"      # 项目类型
  language: "${LANGUAGE:-typescript}" # 编程语言

# Graph 引擎配置
graph:
  max_parallel: 4          # 最大并行任务数
  timeout: 3600            # 超时时间 (秒)
  history_limit: 100       # 历史记录限制

# TDD 配置
tdd:
  ralph_loop:
    max_iterations: 10     # 最大迭代次数
    failure_threshold: 3    # 失败熔断阈值
    auto_rollback: true     # 自动回滚

  mutation:
    enabled: true           # 启用变异测试
    threshold: 80           # 变异覆盖率阈值

# 防御机制配置
defense:
  confirm_gate:
    enabled: true           # 启用确认门

  micro_task:
    max_tasks: 6            # 最大任务数

  failure_rollback:
    threshold: 3            # 回滚阈值

# 记忆系统配置
memory:
  enabled: true             # 启用记忆系统
  persist: true             # 持久化存储
  vector_db: false          # 向量数据库 (高级)
```

### AGENTS.md

AI 代理指令文件，位于项目根目录。

```markdown
# STDD Copilot - AI Agent Instructions

> Version: 1.0 | Last Updated: 2026-03-27

## Overview

STDD Copilot (Spec + Test Driven Development) 是一个融合了 SDD 和 TDD 最佳实践的 AI 辅助开发框架。

## 核心原则

1. **Spec-First**: 需求规格是 Source of Truth
2. **Test-Driven**: Ralph Loop 5步 TDD 循环
3. **Delta Specs**: 增量式变更管理
4. **5-Level Defense**: 防跑偏机制

## 可用命令

在 Claude Code 中使用以下斜杠命令：

| 命令 | 说明 |
|------|------|
| `/stdd:init` | 初始化 STDD 工作区 |
| `/stdd:new` | 创建新变更提案 |
| ... | ... |

## 工作流程

```
/stdd:new → /stdd:apply → /stdd:archive
```
```

### .gitignore

STDD 相关的 gitignore 条目：

```gitignore
# STDD Copilot
stdd/graph/cache/
stdd/memory/*.bin
.claude/tdd-guard/
```

---

## 与 Claude Code 配合使用

### 基本工作流

```bash
# 1. 使用 CLI 初始化项目
stdd init

# 2. 创建变更
stdd new change add-dark-mode

# 3. 在 Claude Code 中使用斜杠命令
# /stdd:new add-dark-mode
# /stdd:apply
# /stdd:archive

# 4. 使用 CLI 查看状态
stdd status
```

### 完整示例

```bash
# 步骤 1: 初始化项目
cd ~/projects/my-app
stdd init

# 步骤 2: 创建变更
stdd new change user-authentication --title "用户认证功能"

# 步骤 3: 在 Claude Code 中
# 输入: /stdd:new user-authentication
# AI 会生成 proposal.md, specs/, design.md, tasks.md

# 步骤 4: 查看生成的产物
stdd status user-authentication

# 步骤 5: 实现 (在 Claude Code 中)
# 输入: /stdd:apply
# AI 会执行 TDD 循环实现任务

# 步骤 6: 验证
# 输入: /stdd:verify

# 步骤 7: 归档
# 输入: /stdd:archive

# 步骤 8: 确认归档
stdd list --archived
```

---

## 常见问题

### Q: `stdd: command not found`

**原因:** CLI 未正确安装或未在 PATH 中。

**解决方案:**

```bash
# 检查安装
which stdd

# 重新安装
cd ~/stdd-copilot
npm link

# 或使用完整路径
~/stdd:copilot/cli.js init
```

### Q: `stdd init` 报错 "STDD already initialized"

**原因:** 项目已经初始化过。

**解决方案:**

```bash
# 使用 --force 选项
stdd init --force
```

### Q: 如何在多个项目中使用？

```bash
# 每个项目独立初始化
cd ~/projects/project-a
stdd init

cd ~/projects/project-b
stdd init
```

### Q: 如何更新到最新版本？

```bash
# 更新仓库
cd ~/stdd-copilot
git pull origin master

# 重新安装依赖
npm install

# 重新链接
npm link

# 更新项目中的文件
cd ~/projects/my-app
stdd update --force
```

### Q: 如何在不同 AI 工具中使用？

STDD Copilot 主要设计用于 Claude Code，但也可以：

1. **Cursor:** 复制 `.claude/commands/` 到 `.cursor/commands/`
2. **Copilot:** 使用 `AGENTS.md` 作为上下文
3. **其他:** 参考 `AGENTS.md` 和 `stdd/` 目录中的规格

---

## 卸载

### 卸载全局 CLI

```bash
# 1. 取消全局链接
npm unlink -g stdd

# 2. 验证卸载
which stdd
# 应输出: stdd not found

# 3. 删除仓库 (可选)
rm -rf ~/stdd-copilot
```

### 卸载步骤详解

```bash
# 步骤 1: 取消全局链接
cd ~/stdd-copilot
npm unlink

# 步骤 2: 检查是否还有残留
npm list -g --depth=0 | grep stdd

# 步骤 3: 如有残留，手动删除
npm unlink -g stdd-copilot

# 步骤 4: 删除本地仓库
rm -rf ~/stdd-copilot

# 步骤 5: 删除 npm 缓存 (可选)
npm cache clean --force
```

---

## 清除项目配置

### 清除单个项目的 STDD 配置

```bash
# 在项目目录中执行
cd your-project

# 删除 STDD 工作目录
rm -rf stdd/

# 删除 Claude Code 配置
rm -rf .claude/

# 删除 AI 指令文件
rm -f AGENTS.md

# 删除规格模式
rm -rf schemas/

# 从 .gitignore 中移除 STDD 相关行 (手动编辑)
```

### 一键清除脚本

```bash
#!/bin/bash
# clean-stdd.sh - 清除项目中的 STDD 配置

PROJECT_DIR=${1:-.}

echo "🧹 Cleaning STDD Copilot from $PROJECT_DIR..."

# 删除目录
rm -rf "$PROJECT_DIR/stdd"
rm -rf "$PROJECT_DIR/.claude"
rm -rf "$PROJECT_DIR/schemas"

# 删除文件
rm -f "$PROJECT_DIR/AGENTS.md"

# 从 .gitignore 中移除 STDD 相关行
if [ -f "$PROJECT_DIR/.gitignore" ]; then
  # macOS 兼容的 sed 命令
  sed -i '' '/# STDD Copilot/,+3d' "$PROJECT_DIR/.gitignore"
  echo "✅ Removed STDD entries from .gitignore"
fi

echo "✅ STDD Copilot cleaned from $PROJECT_DIR"
```

### 使用方式

```bash
# 保存脚本
cat > clean-stdd.sh << 'EOF'
#!/bin/bash
PROJECT_DIR=${1:-.}
echo "🧹 Cleaning STDD Copilot from $PROJECT_DIR..."
rm -rf "$PROJECT_DIR/stdd"
rm -rf "$PROJECT_DIR/.claude"
rm -rf "$PROJECT_DIR/schemas"
rm -f "$PROJECT_DIR/AGENTS.md"
if [ -f "$PROJECT_DIR/.gitignore" ]; then
  sed -i '' '/# STDD Copilot/,+3d' "$PROJECT_DIR/.gitignore"
  echo "✅ Removed STDD entries from .gitignore"
fi
echo "✅ STDD Copilot cleaned from $PROJECT_DIR"
EOF

# 添加执行权限
chmod +x clean-stdd.sh

# 执行清除
./clean-stdd.sh ~/projects/my-app
```

### 仅清除变更历史 (保留配置)

```bash
# 仅删除变更目录
rm -rf stdd/changes/*

# 仅删除归档
rm -rf stdd/changes/archive/*

# 仅删除内存
rm -rf stdd/memory/*
```

---

## 附录

### 命令快速参考表

| 命令 | 说明 |
|------|------|
| `stdd init` | 初始化项目 |
| `stdd update` | 更新配置 |
| `stdd list` | 列出变更 |
| `stdd list --specs` | 列出规格 |
| `stdd status` | 查看状态 |
| `stdd new change <name>` | 创建变更 |
| `stdd new spec <domain>` | 创建规格 |
| `stdd skills` | 列出技能 |
| `stdd commands` | 列出命令 |
| `stdd hooks install` | 安装 Hooks |
| `stdd hooks verify` | 验证 Hooks |
| `stdd hooks status` | Hooks 状态 |
| `stdd hooks enable` | 恢复并启用 Hooks |
| `stdd hooks disable` | 禁用 Hooks |
| `stdd constitution` | 查看条例 |
| `stdd constitution show <n>` | 查看特定条例 |
| `stdd --version` | 查看版本 |
| `stdd --help` | 查看帮助 |

---

## Constitution 命令

### 查看开发条例

```bash
# 查看所有 9 篇条例
stdd constitution

# 查看特定条例详情
stdd constitution show 2    # Article 2: TDD
stdd constitution show 7    # Article 7: Security
```

**输出示例:**

```
📋 STDD Constitution - 9 篇开发条例

Priority 1 (Blocking):
  Article 2: TDD (测试先行) - 所有生产代码必须在失败测试之后编写
  Article 7: Security (安全优先) - 安全从设计阶段考虑
  Article 9: CI/CD (自动化流水线) - 所有变更通过自动化流水线

Priority 2 (Warning):
  Article 1: Library-First (优先使用成熟库)
  Article 3: Small Commits (原子提交)
  Article 4: Code Style (统一风格)
  Article 6: Error Handling (显式错误处理)

Priority 3 (Suggestion):
  Article 5: Documentation (文档即代码)
  Article 8: Performance (性能默认)
```

---

## Hooks 命令

### 安装 Hooks

```bash
# 安装到当前项目
stdd hooks install

# 安装到全局配置
stdd hooks install --global

# 强制覆盖现有配置
stdd hooks install --force
```

**输出:**

```
🔧 STDD Hooks 安装

📁 Hooks 脚本位置: /path/to/stdd-copilot/.claude/hooks

🎯 检测到目标引擎配置: .claude/settings.json
   📝 配置文件: .claude/settings.json

✅ Hooks 安装成功!

已安装的 Hooks:
  • PreToolUse: Article 2, 4, 7 (TDD, Style, Security)
  • PostToolUse: Article 5, 6, 8 (Docs, Errors, Performance)

配置位置: .claude/settings.json
验证安装: stdd hooks verify
禁用 Hooks: stdd hooks disable
```

### 验证 Hooks

```bash
stdd hooks verify
```

**输出:**

```
🔍 验证 STDD Hooks 安装

✅ PreToolUse Hook: 已配置
✅ PostToolUse Hook: 已配置
✅ pre-file-write.js: 存在
✅ post-file-write.js: 存在

✅ 所有 Hooks 验证通过!
```

### 管理 Hooks

```bash
# 查看状态
stdd hooks status

# 临时禁用
stdd hooks disable

# 重新启用
stdd hooks enable

# 禁用特定条例 (当前版本仅保留兼容提示)
stdd hooks disable --article=4
```

### 禁用 Hooks (紧急情况)

```bash
# 方式 1: 使用 CLI
stdd hooks disable

# 方式 2: 设置环境变量 (当前会话)
export STDD_HOOKS_DISABLED=1

# 方式 3: 在 Claude Code 中
# /stdd:guard off
```

> ⚠️ **警告**: 禁用 Hooks 会绕过安全检查，仅用于紧急情况。

### 文件结构速查

```
your-project/
├── .claude/
│   ├── commands/stdd/       # Claude Code 命令
│   ├── hooks/               # Hook 脚本
│   │   ├── pre-file-write.js
│   │   └── post-file-write.js
│   └── settings.json        # Hook 配置
├── AGENTS.md                # AI 指令文件
├── schemas/
│   ├── spec-driven/         # 规格模板
│   ├── constitution/        # Constitution 条例
│   │   ├── constitution.yaml
│   │   └── articles/        # 9 篇开发条例
│   └── hooks/               # Hooks 配置
└── stdd/
    ├── specs/               # 规格文件
    ├── changes/             # 变更管理
    ├── memory/              # 记忆系统
    ├── graph/               # Graph 配置
    ├── constitution/        # 豁免管理
    │   ├── waivers.yaml
    │   └── .waivers.lock
    └── config.yaml          # 项目配置
```

---

> Generated by STDD Copilot
> Document Version: 2.0
> Last Updated: 2026-04-02
