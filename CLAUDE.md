# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目简介

STDD Copilot 是一套基于 **Skill Graph** 的全链路自动化开发框架，将 Spec-First（需求规范优先）与 TDD（测试驱动开发）深度融合。它既是一个独立 CLI 工具，也是一套为 Claude Code 和其他 AI 编码助手设计的 Skill/命令体系。

## 常用命令

### CLI 工具

```bash
# 安装依赖
npm install

# 运行 CLI（无需编译，直接 Node.js 运行）
node cli.js --help

# 全局链接（使 stdd 命令全局可用）
npm link

# 初始化目标项目
stdd init
stdd init /path/to/project --force

# 查看变更和状态
stdd list
stdd list --specs
stdd status
stdd status <change-name>

# 创建新变更/规格
stdd new change <name>
stdd new spec <name>

# Hook 管理
stdd hooks install
stdd hooks verify

# 查看 Constitution 条例
stdd constitution
```

### Claude Code 斜杠命令（主要入口）

```bash
/stdd:init                      # 初始化 STDD 工作区
/stdd:new <description>         # 创建新变更提案
/stdd:ff <description>          # Fast-Forward：一键生成所有产物
/stdd:continue                  # 继续生成下一个产物
/stdd:apply                     # 实现任务（Ralph Loop TDD）
/stdd:verify                    # 验证规范一致性
/stdd:archive                   # 归档变更
/stdd:explore                   # 只读探索模式
/stdd:issue                     # Bug TDD 修复流程
/stdd:graph visualize|analyze|run|parallel|history|replay|recommend
/stdd:constitution waiver --article=2 --reason="..."  # 申请豁免
```

**典型路径：**
- 需求明确：`/stdd:new` → `/stdd:ff` → `/stdd:apply` → `/stdd:archive`
- 需求模糊：`/stdd:explore` → `/stdd:new` → `/stdd:continue` → `/stdd:apply` → `/stdd:archive`
- 一键全流：`/stdd:turbo "描述"` → 自动完成所有阶段

## 架构概览

### 目录结构（关键部分）

```
stdd-copilot/
├── cli.js                       # CLI 入口（Commander.js）
├── src/
│   ├── cli/commands/            # CLI 子命令：init, new, status, list, hooks, update
│   ├── utils/                   # Graph 运行时核心模块
│   │   ├── graph-executor.js    # 生命周期执行 + 反向自愈引擎
│   │   ├── graph-cache.js       # DAG 幂等断点缓存（SHA256 指纹化）
│   │   ├── dynamic-router.js    # 意图自适应拓扑裁剪（hotfix/feature/research）
│   │   ├── evidence-capture.js  # 结构化错误证据采集器
│   │   ├── error-propagator.js  # 多跳向上传播引擎（智能决策点定位）
│   │   ├── heterogeneous-adapter.js  # 异构引擎适配层（22 引擎 Tier 降级链）
│   │   ├── parallel-executor.js # DAG 分层并行执行器（Kahn's 拓扑分层）
│   │   └── path-resolver.js     # NPM 全局链接路径穿透解析
│   └── stdd-skills/             # STDD Skill 定义，按 5 阶段组织
│       ├── 1-proposal/          # propose/clarify/confirm
│       ├── 2-specification/     # spec
│       ├── 3-design/            # plan/design
│       ├── 4-implementation/    # apply/execute (Ralph Loop)
│       └── 5-verification/      # verify/validate
├── .claude/
│   ├── commands/stdd/           # 19 个 /stdd:* 斜杠命令（.md 文件）
│   ├── hooks/                   # Pre/PostToolUse Hook 脚本
│   └── skills/                  # 38 个 Skill 定义目录
├── schemas/
│   ├── spec-driven/templates/   # proposal.md / tasks.md 等模板
│   └── constitution/articles/   # Article 1-9 条例定义
└── stdd/                        # 运行时工作目录（被 .gitignore 部分排除）
    ├── specs/                   # BDD 规格 Source of Truth
    ├── changes/                 # 活跃变更（每个变更一个子目录）
    │   └── <change-name>/
    │       ├── .state.yaml      # 跨 session 持久状态
    │       ├── proposal.md
    │       ├── specs/           # Delta Specs
    │       ├── design.md
    │       └── tasks.md
    ├── memory/                  # 持久化记忆（foundation/components/contracts）
    ├── graph/                   # Skill Graph 配置（skills.yaml / conditions.json）
    ├── config/engines.yaml      # 22 个 AI 引擎注册表（4 Tier）
    └── constitution/            # 豁免记录（waivers.yaml）
```

### 核心概念

**Skill Graph 引擎**：整个框架的调度核心，包含 Visualizer / Analyzer / Scheduler / Tracker / Condition Engine / Parallel Executor / Recommender 七个子组件。所有 Skill 以 DAG 形式组织，支持并行执行和条件分支。

**Ralph Loop（TDD 循环）**：`/stdd:apply` 的核心执行模型：
1. 🔴 红灯 — 生成失败测试
2. 🔍 静态检查 — 语法/类型验证
3. 🟢 绿灯 — 最小实现
4. 🧪 伪变异审查 — 检测骗绿灯断言（Quick AI + Deep Stryker 双模式）
5. 🔵 重构 — 优化

失败容错：策略调整 → 跨模型降级（Opus→Sonnet）→ 熔断 → 自动回滚（3 次失败触发）。

**Constitution + Hooks**：代码写入时自动执行 Pre/PostToolUse Hook：
- **Blocking（Pre Hook）**：Article 2（TDD 先行）、Article 7（安全）— 违反则阻断写入
- **Warning**：Article 1（Library-First）、Article 3（原子提交）、Article 4（代码风格）
- **Suggestion（Post Hook）**：Article 5（文档）、Article 6（错误处理）、Article 8（性能）
- 可通过 `waivers.yaml` 申请临时豁免，有审计追踪

**Delta Specs**：变更中的规格采用增量描述（ADDED/MODIFIED/REMOVED 章节），`/stdd:archive` 时自动合并到 `stdd/specs/` 主规格库。

**双入口设计**：CLI（`cli.js` + Commander.js）和 Claude Code 斜杠命令（`.claude/commands/stdd/*.md`）共享同一套业务逻辑，但斜杠命令是主要交互方式，CLI 主要用于项目初始化和状态查询。

### 入口 taxonomy（防漂移约定）

为避免把 slash command、command 文件和 skill 目录混为一谈，本仓库按以下三类理解 `/stdd:*` 入口：

- **command-only 快捷入口（4）**：`/stdd:new`、`/stdd:ff`、`/stdd:continue`、`/stdd:explore`
  - 有 `.claude/commands/stdd/*.md`
  - 不要求存在同名 `.claude/skills/stdd-*` 目录
- **command-file-backed 入口（15）**：`/stdd:init`、`/stdd:propose`、`/stdd:clarify`、`/stdd:confirm`、`/stdd:spec`、`/stdd:plan`、`/stdd:apply`、`/stdd:execute`、`/stdd:verify`、`/stdd:archive`、`/stdd:final-doc`、`/stdd:graph`、`/stdd:brainstorm`、`/stdd:issue`、`/stdd:constitution`
  - 这些入口至少有明确的 command 文件承载交互协议
- **skill-driven 入口（其余 25 个）**
  - 主要由 `.claude/skills/` 驱动，如 `/stdd:turbo`、`/stdd:guard`、`/stdd:commit`、`/stdd:help`
  - 文档中统一继续使用 `/stdd:*` 作为用户可见入口名

### 技术栈

- **运行时**：Node.js >= 20.0.0（无编译步骤，直接运行 `.js`）
- **CLI 框架**：Commander.js + Inquirer.js + Ora（spinner）+ Chalk
- **TDD 框架**：框架无关，适配 Vitest / Jest / pytest / go test / cargo test
- **提交规范**：Conventional Commits，额外支持 `red:` / `green:` / `refactor:` TDD 前缀

## 开发本仓库时的注意事项

- **修改斜杠命令**：编辑 `.claude/commands/stdd/*.md`，这些文件直接被 Claude Code 加载，无需构建
- **修改 CLI 命令**：编辑 `src/cli/commands/`，运行 `node cli.js` 立即生效
- **Constitution 条例**：在 `schemas/constitution/articles/` 下修改，Hook 脚本在 `.claude/hooks/` 下
- **Skill 定义**：`src/stdd-skills/` 按 5 阶段组织，每个阶段目录有独立的 `SKILL.md`
- `.gitignore` 排除了 `stdd/graph/cache/`、`stdd/memory/*.bin`、`.claude/tdd-guard/`
