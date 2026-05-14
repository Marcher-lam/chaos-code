<div align="center">

# STDD Copilot

**Specification & Test-Driven Development Copilot**

基于 Skill Graph 的全链路自动化开发框架

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-green.svg)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/tests-831%20passed-brightgreen.svg)](./CONTRIBUTING.md)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[**简体中文**](./README.md) · [**English**](./README_EN.md)

</div>

---

## 简介

STDD Copilot 是一套基于 **Skill Graph（技能图谱）** 的全链路自动化开发框架。它将 **Spec-First (需求规范优先)** 与 **TDD (测试驱动开发)** 深度融合，通过文件化规格、CLI 工作流、Constitution 审计和外部 AI 代码助手协作，让开发过程从"模糊对话"转向"可验证工程"。

**当前验证状态**: 80 个测试套件、893 个测试全部通过，npm audit 零漏洞。

## 为什么选择 STDD Copilot?

| 痛点 | STDD 的解法 |
|------|------------|
| AI 编码"跑偏"，需求理解偏差 | 多轮智能澄清 + 确认门 (Confirm Gate) 将模糊需求转为严谨 BDD 规范 |
| 没有测试就写代码，技术债务堆积 | TDD Ralph Loop：红灯 → 绿灯 → 变异审查 → 重构，强制测试先行 |
| 代码质量靠人工 Review，标准不一致 | 9 篇 Constitution 条例 + Hook 自动执行，机器化质量门禁 |
| 多人协作需求变更失控 | 文件化规格 (Source of Truth) + Delta Spec Merge 追踪所有变更 |
| 重启终端后丢失上下文 | 实时进度追踪 (`stdd progress`)，断点续传 |

## CLI 命令速查

```
stdd init                    # 初始化项目
stdd init /path/to/project   # 指定目录
stdd init --force            # 强制覆盖

stdd list                    # 列出活跃变更
stdd list --specs            # 列出规格
stdd list --archived         # 包含已归档
stdd list --json             # JSON 格式

stdd status                  # 整体状态
stdd status add-dark-mode    # 特定变更状态

stdd new change add-dark-mode
stdd new spec auth
stdd skills                  # 列出所有技能
stdd skills --phase 4        # 按阶段筛选
stdd commands                # 列出斜杠命令

stdd ff "add dark mode"      # 快速生成所有产物
stdd spec add-dark-mode      # 生成 BDD feature
stdd apply add-dark-mode     # TDD 实现
stdd continue add-dark-mode  # 继续
stdd verify add-dark-mode    # 验证
stdd archive add-dark-mode   # 归档

stdd constitution            # 查看所有条例
stdd constitution show 2     # 查看 Article 2
stdd constitution check      # 合规检查

stdd hooks install           # 安装 Hooks
stdd hooks verify            # 验证 Hooks
stdd hooks status            # 查看 Hooks 状态
stdd hooks disable           # 禁用 Hooks
stdd hooks enable            # 恢复 Hooks

stdd progress                # 进度历史
stdd progress --summary      # 进度总览
stdd progress --resume       # 断点恢复
stdd progress --json         # JSON 输出
stdd progress --clear        # 清空进度
```

## 核心特性

### 全部斜杠命令 (58 个)

**Command 模板 (20)**: `/stdd:init` `/stdd:new` `/stdd:propose` `/stdd:clarify` `/stdd:confirm` `/stdd:spec` `/stdd:plan` `/stdd:apply` `/stdd:execute` `/stdd:verify` `/stdd:archive` `/stdd:final-doc` `/stdd:brainstorm` `/stdd:issue` `/stdd:constitution` `/stdd:ff` `/stdd:continue` `/stdd:explore` `/stdd:graph` `/stdd:turbo`

**Skill 模板 (38)**: `/stdd:api-spec` `/stdd:certainty` `/stdd:commit` `/stdd:complexity` `/stdd:context` `/stdd:contract` `/stdd:design` `/stdd:factory` `/stdd:guard` `/stdd:help` `/stdd:iterate` `/stdd:learn` `/stdd:memory` `/stdd:metrics` `/stdd:mock` `/stdd:mutation` `/stdd:outside-in` `/stdd:parallel` `/stdd:prp` `/stdd:roles` `/stdd:schema` `/stdd:supervisor` `/stdd:user-test` `/stdd:validate` `/stdd:vision`

| 特性 | 描述 |
|------|------|
| **Spec-First 需求驱动** | 78 种结构化推理方法 + Confirm Gate，将模糊语言转化为 BDD 规范 |
| **Ralph Loop TDD** | 🔴红灯 (生成测试) → 静态检查 → 🟢绿灯 (实现) → 变异审查 → 🔵重构 |
| **5 级防跑偏防御** | 人机确认门 · 微任务隔离 · 连续失败回滚 · 静态质检门 · 伪变异审查 |
| **Constitution + Hook** | 9 篇开发条例 + Pre/Post Hook 自动执行 + 豁免审计追踪 |
| **38 Skills + 12 Agent 角色** | 完整会话入口覆盖，从需求到提交 |
| **Skill Graph 引擎** | 动态 DAG 编排，意图自适应拓扑 (hotfix/feature/repair/research) |
| **双入口设计** | CLI (`stdd`) + AI 编码工具斜杠命令 (`/stdd:*`) |
| **实时进度追踪** | `stdd progress` 自动记录命令执行，崩溃后可断点续传 |
| **Workspace / Monorepo** | `--workspace` 作用域，按包检测测试命令与证据 |
| **内置浏览器驱动** | Playwright 集成，TDD 循环中直接截图和页面检查 |

## 快速开始

### 安装

```bash
# npm 全局安装 (推荐)
npm install -g @marcher-lam/stdd-copilot@latest

# 或源码安装
git clone https://github.com/Marcher-lam/STDD-COPILOT.git
cd STDD-COPILOT && npm install && npm link
```

### 5 分钟上手

```bash
# 1. 在项目中初始化
cd your-project
stdd init

# 2. 创建变更
stdd new change add-dark-mode

# 3. 快速生成所有产物 (需求明确时)
stdd ff "添加暗色模式支持"

# 4. TDD 实现
stdd apply add-dark-mode

# 5. 验证并归档
stdd verify add-dark-mode
stdd archive add-dark-mode
```

### 在 AI 编码工具中使用

在 Claude Code 等 AI 编码工具中，使用斜杠命令触发 STDD 工作流：

```bash
/stdd:init                              # 初始化项目
/stdd:ff 实现一个支持 Markdown 导出的 todo-list  # 一键全流程
/stdd:apply                             # TDD 实现
/stdd:verify                            # 验证
/stdd:archive                           # 归档
```

## 核心工作流

```
init → new → propose → clarify → confirm → spec → plan → apply → verify → archive
  │                 │           │                                        │
  │                 └─── AI 澄清 ───┘                               mutation
  │                                                                evidence
  └── stdd ff "需求" ──→ 一键跳过中间阶段 ──────────────────────────┘
```

**典型场景**:

| 场景 | 命令路径 |
|------|---------|
| 需求明确 | `stdd ff "描述"` → `stdd apply` → `stdd verify` → `stdd archive` |
| 需求模糊 | `stdd new` → `stdd continue` (逐步) → `stdd apply` → ... |
| Bug 修复 | `stdd issue "描述"` → TDD 最小修复 → `stdd verify` → `stdd archive` |
| 一键完成 | `stdd turbo "描述"` → 自动完成所有阶段 → `stdd commit` |

## 全部命令

### 核心流程

| CLI 命令 | 斜杠命令 | 说明 |
|----------|---------|------|
| `stdd init` | `/stdd:init` | 初始化项目 |
| `stdd new change <name>` | `/stdd:new` | 创建变更 |
| `stdd spec <change>` | `/stdd:spec` | 生成 BDD 规格 |
| `stdd apply <change>` | `/stdd:apply` | TDD 实现 (Red→Green→Refactor) |
| `stdd verify <change>` | `/stdd:verify` | 验证 (测试 + Constitution + Evidence) |
| `stdd archive <change>` | `/stdd:archive` | 归档并合并 Delta Specs |
| `stdd continue <change>` | `/stdd:continue` | 继续生成下一个产物 |
| `stdd ff <desc>` | `/stdd:ff` | Fast-Forward 快速生成 |
| `stdd turbo <desc>` | `/stdd:turbo` | 一键全流程 |
| `stdd issue <desc>` | `/stdd:issue` | Bug TDD 修复流程 |
| `stdd explore [scope]` | `/stdd:explore` | 只读探索模式 |
| `stdd brainstorm <topic>` | `/stdd:brainstorm` | 多角度分析 |

### SDD 增强

| CLI 命令 | 说明 |
|----------|------|
| `stdd api-spec [change]` | API 规范 (OpenAPI/TypeScript) |
| `stdd schema validate` | JSON Schema/Zod 验证 |
| `stdd contract <action>` | 契约测试 (5 种消息模式) |
| `stdd validate [change]` | Spec Guardian 规范验证 |
| `stdd fix-packet [change]` | Golden Packet 失败修复上下文 |

### TDD 增强

| CLI 命令 | 说明 |
|----------|------|
| `stdd mutation [change]` | 变异测试 (Quick 启发式 + Stryker) |
| `stdd outside-in <action>` | 外向内 TDD (E2E→集成→单元) |
| `stdd tdd init` | 测试脚手架生成 |

### 质量与治理

| CLI 命令 | 说明 |
|----------|------|
| `stdd guard` | TDD 守护 + Anti-Bypass |
| `stdd constitution` | 9 篇条例管理 (check/status/fix/audit/waive) |
| `stdd hooks` | Hook 管理 (install/verify/enable/disable) |
| `stdd progress` | 实时进度追踪 (--summary/--resume/--clear) |
| `stdd metrics` | 质量指标仪表板 |
| `stdd doctor` | 项目健康诊断 |
| `stdd depcheck` | 未使用依赖检测 |

### Graph 引擎

| CLI 命令 | 说明 |
|----------|------|
| `stdd graph run <intent>` | 动态 DAG 执行 |
| `stdd graph history` | 执行历史 |
| `stdd graph recommend` | 智能推荐下一步 |

### 工作区与高级功能

| CLI 命令 | 说明 |
|----------|------|
| `stdd workspace` | Monorepo 注册表 (list/validate/repair) |
| `stdd learn` | Pattern Teaching + 风格提取 |
| `stdd roles` | 12 Agent 角色协作 (含对抗式审查) |
| `stdd story` | Story Mapping → BDD |
| `stdd commit` | 原子化提交 (red:/green:/refactor: 前缀) |
| `stdd runtime agent` | Party Mode 多 Agent 状态机 |
| `stdd runtime sudo` | SudoLang 伪代码解析引擎 |

<details>
<summary>查看完整 CLI 命令列表 (55 个)</summary>

```bash
# 核心流程
stdd init / stdd init --force
stdd new change <name> / stdd new spec <name>
stdd ff <desc> / stdd turbo <desc> / stdd issue <desc>
stdd spec <change> / stdd api-spec <change>
stdd apply <change> [--phase] [--delegate] [--e2e-command "..."]
stdd continue <change>
stdd mutation <change> [--mode quick|stryker]
stdd verify <change>
stdd archive <change>
stdd commit <change> [--tdd] [--phase red|green|refactor]

# SDD 增强
stdd api-spec <change>
stdd schema create <name> / validate <file> / fork <src> <name>
stdd contract generate <change> / verify <change>
stdd validate <change> [--spec-guardian] [--fix]
stdd fix-packet <change>

# TDD 增强
stdd mutation <change>
stdd outside-in init / scaffold <change> / status
stdd tdd init
stdd mock <change>

# 质量治理
stdd guard [--strict]
stdd constitution [show|check|status|fix|audit|waive]
stdd hooks [install|verify|status|enable|disable]
stdd progress [--summary|--resume|--clear|--json]
stdd metrics [--workspace <pkg>]
stdd doctor
stdd depcheck [path]

# Graph 引擎
stdd graph run <intent> [--change-name <name>]
stdd graph history
stdd graph recommend
stdd recommend

# 工作区
stdd workspace list / validate / repair

# 高级
stdd learn / stdd roles / stdd story / stdd user-test / stdd pipeline
stdd extensions list / install / validate
stdd context --export / stdd ci / stdd starters list / create
stdd runtime agent start <topic> / next / stop
stdd runtime sudo <file> --generate

# 信息
stdd status / stdd list / stdd skills / stdd commands
stdd progress
```

</details>

## Constitution + Hook Enforcement

### 9 篇开发条例

| 优先级 | 条例 | 核心原则 |
|--------|------|----------|
| **Blocking** | Article 2: TDD | 测试先行 + 覆盖率 gate + mutation evidence |
| **Blocking** | Article 7: Security | 安全优先 |
| **Blocking** | Article 9: CI/CD | 自动化流水线 |
| Warning | Article 1: Library-First | 优先使用成熟库 |
| Warning | Article 3: Small Commits | 原子提交 |
| Warning | Article 4: Code Style | 统一风格 |
| Warning | Article 6: Error Handling | 显式错误处理 |
| Suggestion | Article 5: Documentation | 文档即代码 |
| Suggestion | Article 8: Performance | 性能默认 |

```bash
# 使用
stdd constitution check          # 合规检查
stdd constitution status         # 健康状态
stdd constitution audit --json   # 审计趋势
stdd constitution waive 2 --reason "Legacy" --days 7  # 临时豁免
```

## 项目结构

```
stdd-copilot/
├── cli.js                       # CLI 入口 (Commander.js)
├── src/
│   ├── cli/commands/            # 55 个命令实现 (57 个注册含 start/doctor)
│   ├── cli/registry/            # 命令注册与动态加载
│   ├── utils/                   # 22 个工具模块
│   │   ├── graph-executor.js    #   Graph 执行引擎 (含自愈)
│   │   ├── session-progress.js  #   实时进度追踪
│   │   ├── file-walker.js      #   共享目录遍历
│   │   ├── evidence-capture.js  #   证据采集
│   │   └── ...
│   └── types/                   # TypeScript/JSDoc 类型定义
├── src/templates/
│   ├── skills/                  # 38 个 Skill 定义
│   └── commands/                # 20 个斜杠命令模板
├── __tests__/                   # 80 个测试套件
├── stdd/                        # 运行时工作目录
│   ├── changes/                 # 变更管理
│   ├── specs/                   # BDD 规格文件 (Source of Truth)
│   ├── graph/                   # Graph 配置与缓存
│   ├── config.yaml              # 项目配置
│   └── progress.jsonl           # 进度日志
├── schemas/                     # JSON/YAML Schema
│   ├── spec-driven/             # 规格模板
│   └── constitution/            # 9 篇条例
└── docs/                        # 文档
```

## 已实现边界

**已 CLI 化** (57 个命令): init、start、doctor、new、ff、spec、api-spec、apply、continue、mutation、verify、archive、commit、constitution (check/status/fix/audit/waive)、guard、hooks、graph (run/history/recommend)、workspace、metrics、context、ci、starters、depcheck、schema、contract、validate、fix-packet、outside-in、learn、roles、story、user-test、pipeline、extensions、progress、recommend、explore、brainstorm、issue、turbo、runtime (agent/sudo) 等。

**Runtime 引擎**: Agent 状态机 (Party Mode)、SudoLang 解析引擎、内置浏览器驱动 (Playwright)、动态 Graph 编排 (DAG)、断点续传进度追踪、证据采集与审计。

**仍需外部 AI 执行器**: 真实 AI 自动编码、完整多 Agent runtime、factory 深度生成、远程 extension registry。

## 技术栈

| 层面 | 技术 |
|------|------|
| 运行时 | Node.js >= 20.0.0 (CommonJS, 无构建步骤) |
| CLI 框架 | Commander.js |
| 核心引擎 | Skill Graph 动态 DAG + Agent 状态机 + SudoLang |
| 测试框架 | 框架无关 (默认 Jest, 支持 Vitest/pytest/go test) |
| AI 集成 | 22 个引擎，4 级兼容体系 |
| 容器化 | Docker + docker-compose |

## 详细文档

| 文档 | 说明 |
|------|------|
| [CLI 使用指南](./docs/cli-guide.md) | CLI 完整文档 |
| [快速开始](./docs/getting-started.md) | 首次使用流程和 CLI 速查 |
| [使用手册](./USAGE.md) | 完整使用指南 |
| [系统架构](./ARCHITECTURE.md) | 架构设计和组件说明 |
| [示例集](./EXAMPLES.md) | 社区示例和学习资源 |
| [命令参考](./docs/commands.md) | 完整命令参考 |
| [工作流程](./docs/workflows.md) | 常见工作流模式 |
| [变更日志](./CHANGELOG.md) | 版本历史 |
| [贡献指南](./CONTRIBUTING.md) | 如何贡献 |

## 贡献指南

欢迎提交 Issue 和 Pull Request！请参阅 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 许可证

[MIT License](LICENSE)

---

<div align="center">

**STDD Copilot** — 让每个开发者都能拥有一个不跑偏、不产生"屎山"的超级 AI 结对编程专家

Made with ❤️ by [Marcher-lam](https://github.com/Marcher-lam)

</div>
