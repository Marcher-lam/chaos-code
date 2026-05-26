<div align="center">

# STDD Copilot Ultra

**Smart Team-Driven Development · AI 全生命周期开发平台**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-green.svg)](https://nodejs.org/)
[![npm](https://img.shields.io/npm/v/@marcher-lam/stdd-copilot-ultra)](https://www.npmjs.com/package/@marcher-lam/stdd-copilot-ultra)
[![Tests](https://img.shields.io/badge/tests-4158%2F4158%20passing-brightgreen.svg)](CONTRIBUTING.md)
[![Coverage](https://img.shields.io/badge/coverage-97%25%20stmts%20%7C%2093%25%20branch-brightgreen.svg)](CONTRIBUTING.md)

[简体中文](./README.md) · [English](./README_EN.md)

</div>

---

## 目录

- [什么是 STDD Copilot Ultra](#什么是-stdd-copilot-ultra)
- [为什么选择 Ultra](#为什么选择-ultra)
- [快速开始](#快速开始)
- [核心理念](#核心理念)
- [完整工作流](#完整工作流)
- [命令全景](#命令全景)
- [Constitution 质量宪法](#constitution-质量宪法)
- [架构概览](#架构概览)
- [项目结构](#项目结构)
- [文档导航](#文档导航)
- [安装与贡献](#安装与贡献)
- [从 STDD Copilot 升级](#从-stdd-copilot-升级)

---

## 什么是 STDD Copilot Ultra

**STDD Copilot Ultra** 是一个 AI 全生命周期开发平台，从产品构思到可验证交付的完整链路。

**STDD = Smart Team-Driven Development（智能团队驱动开发）**

它将三个维度融为一体：
- **上游探索** — 多角色 AI Agent 协作（PM、Architect、UX、QA），从需求构思到架构设计
- **规格驱动** — Spec-First 方法论，BDD 规格 + 任务拆解 + 设计文档
- **TDD 执行** — Ralph Loop 闭环实现，变异测试 + 证据链 + 质量门禁

> **STDD 不是 AI。** 它是 AI 编码助手的流程控制层和质量保证系统。

### 核心数据

| 指标 | 数值 |
|------|------|
| CLI 命令 | 86 个 |
| 命令模板 | 86 个（`/stdd:*` 斜杠命令） |
| Skill 模板 | 53 个 |
| 测试套件 | **191** 套，**4158** 条用例，100% 通过 |
| 语句覆盖率 | **97.7%** |
| 分支覆盖率 | **93.2%** |
| 支持的 AI 引擎 | 24 种（Claude Code、Cursor、Windsurf 等 4 层兼容） |
| 代码生成语言 | TypeScript/JS、Python、Java、Go、Rust、C#、PHP |

### 使用方式

两种等价入口，任选其一：

```bash
# 方式 1：CLI 命令行
stdd new change login
stdd apply login
stdd verify login

# 方式 2：AI 编码助手中的斜杠命令
/stdd:new login
/stdd:apply login
/stdd:verify login
```

---

## 为什么选择 Ultra

STDD Copilot Ultra 在原版 STDD Copilot 基础上，吸收了 BMAD-METHOD 的上游优势，形成从构思到交付的完整闭环：

| 能力维度 | 原版 STDD | Ultra 版 |
|----------|-----------|----------|
| 产品构思 | `brainstorm` 基础分析 | 多角色 Agent 协作探索（PM/Architect/UX/QA） |
| 需求管理 | proposal + clarify | 自适应规划深度（按项目复杂度自动调节） |
| 规格驱动 | BDD + Spec Guardian | BDD + Spec Guardian + 复杂度自适应 |
| TDD 执行 | Ralph Loop 完整闭环 | Ralph Loop + 变异测试 + 假绿灯防护 |
| 质量治理 | 9 条 Constitution | 9 条 Constitution + 审计 + 豁免 |
| 模块生态 | 内置命令 | 可扩展模块 + extensions registry |
| 可视化 | CLI 文本输出 | Graph 可视化 + DESIGN.md 预览 |

### 解决的痛点

| 痛点 | STDD Copilot Ultra 的解决方案 |
|------|-------------------------------|
| AI 误解你的意图 | 多轮需求澄清 → 确认门 → BDD 规格锁定 |
| AI 交付未测试代码 | Ralph Loop TDD 闭环：红灯 → 绿灯 → 变异 → 重构 |
| 缺乏统一质量基线 | 9 条 Constitution 条例 + 自动 Hook 执行 |
| 需求悄悄漂移 | `stdd/changes/` 文件化事实源 + Delta Spec 合并 |
| 崩溃/关闭后上下文丢失 | JSONL 实时进度日志 + 断点续传 |
| 过度实现超出范围 | 微型任务拆分（每任务 ~30 分钟）+ 确认门 |
| 假绿灯（测试通过但逻辑错误） | 变异测试（Quick Heuristic + Stryker） |
| 多个 AI 交叉修改同一区域 | Skill Graph 拓扑调度 + 并行执行器 |
| 需求源头不清晰 | 多角色 Agent 从产品构思开始协作 |

---

## 快速开始

### 安装

```bash
npm install -g @marcher-lam/stdd-copilot-ultra@latest
```

> 其他安装方式（源码构建、Docker）详见 [INSTALL.md](./INSTALL.md)

### 30 秒体验

```bash
cd your-project
stdd init                              # 初始化 STDD 目录结构

stdd new change add-dark-mode          # 创建一个变更
stdd ff "添加深色模式支持"              # 快速生成：提案 → 规格 → 任务
stdd apply add-dark-mode               # 执行 TDD 循环
stdd verify add-dark-mode              # 测试 + 宪法检查 + 证据收集
stdd archive add-dark-mode             # 归档并合并规格
```

### 在 AI 编码助手中

```
/stdd:ff 实现用户 OAuth 登录
/stdd:apply --phase red
/stdd:verify
/stdd:archive
```

---

## 核心理念

### 三阶段覆盖：构思 → 规格 → 执行

STDD Copilot Ultra 覆盖完整的开发生命周期：

```
┌─────────────────────────────────────────────────────────────┐
│  阶段 1: 探索与构思                                          │
│  brainstorm · roles party · explore · design · vision       │
│  多角色 Agent 协作，充分探索需求空间                           │
├─────────────────────────────────────────────────────────────┤
│  阶段 2: 规格与规划                                          │
│  propose → clarify → confirm → spec → plan                  │
│  Spec-First 方法论，BDD 规格锁定需求                         │
├─────────────────────────────────────────────────────────────┤
│  阶段 3: TDD 执行与验证                                      │
│  apply → verify → mutation → archive                        │
│  Ralph Loop 闭环 + 质量门禁 + 证据归档                       │
└─────────────────────────────────────────────────────────────┘
```

### 双模式：用户交互 + Agent 自主编排

STDD 根据你的输入自动切换行为模式：

| 输入方式 | 模式 | 行为 |
|---------|------|------|
| `/stdd:apply` 等斜杠命令 | **用户交互模式** | 立即执行指定命令，不额外编排 |
| "实现登录功能" 等自然语言 | **Agent 自主编排** | 自动规划完整执行路径，仅在确认门暂停 |
| "继续" / "下一步" | **Agent 自主编排** | 推进到下一个 Phase |

```
用户: 实现用户登录功能
Agent: [读取 Skill Graph] → [检测状态] → [自动推进全流程]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Phase 1/7: 需求提案 (propose)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
... (自动生成 proposal)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Phase 2/7: 需求澄清 (clarify)
✅ 上一阶段: proposal 已生成
🔜 下一阶段: 需求确认 (confirm) ⚠️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ 确认门: 请确认以上需求理解是否正确？
   回复 "确认" 继续，或提出修改意见。
```

### 双场景：从 0 到 1 + 接手已有项目

| 场景 | 触发条件 | 工作流 |
|------|---------|--------|
| **Greenfield（从 0 到 1）** | 空目录或全新项目 | `init` → 技术栈交互 → 标准 STDD 流 |
| **Brownfield（接手已有）** | 目录已有代码但无 `stdd/` | 深度阅读 → 理解报告 → 用户确认 → 标准 STDD 流 |

Brownfield 场景下，STDD 会自动：
1. 读取 `package.json`、目录结构、关键入口文件
2. 生成项目理解报告（技术栈、模块依赖、测试覆盖）
3. 等待你确认修改范围后再初始化 STDD

### 5 层防跑偏体系

```
第 1 层 — 确认门 (Confirm Gate)
         → 需求确认、归档确认，关键节点暂停等待你决策

第 2 层 — 微型任务 (Micro Tasks)
         → 每任务约 30 分钟，最多 6 个任务，防止过度实现

第 3 层 — 失败回滚 (Failure Rollback)
         → 连续 3 次失败自动熔断，自动 stash 保存现场

第 4 层 — 静态质量 (Static Quality)
         → ESLint、TypeScript 编译检查，阻塞错误自动中断

第 5 层 — 变异审查 (Mutation Review)
         → 检测假绿灯，变异评分 ≥ 阈值方可归档
```

---

## 完整工作流

```
init → new → propose → clarify → confirm → spec → plan → apply → verify → archive
  │                   │        │                                        │
  │                   └ AI 多轮澄清 ┘                            变异测试证据
  └── ff "desc" ──→ 跳过澄清直接生产 ───────────────────────────┘
```

### Phase 详解

| Phase | 命令 | 产物 | 说明 |
|-------|------|------|------|
| **Init** | `stdd init` | `stdd/config.yaml`、目录结构 | 初始化 STDD 项目骨架 |
| **New** | `stdd new change <name>` | `proposal.md`、`.status.yaml` | 创建变更目录和提案模板 |
| **Propose** | `stdd propose <req>` | 提案内容 | 需求草案，自动检测过大的 Epic 并建议拆分 |
| **Clarify** | `stdd clarify <change>` | 澄清记录 | 78 种结构化推理方法消除歧义 |
| **Confirm** | `stdd confirm <change>` | 确认通过 | ⚠️ 人机确认门，等待你审批 |
| **Spec** | `stdd spec <change>` | `.feature` BDD 文件 | Given/When/Then 规格 |
| **Plan** | `stdd plan <change>` | `tasks.md`、`design.md`、ADR | 5-6 个微任务 + 架构决策记录 |
| **Apply** | `stdd apply <change>` | 实现代码 | Ralph Loop: 红灯 → 检查 → 绿灯 → 变异 → 重构 |
| **Verify** | `stdd verify <change>` | 验证报告 | 测试 + Constitution + 证据 |
| **Archive** | `stdd archive <change>` | 归档 | ⚠️ 最终确认门，合并 Delta Spec |

### 快速通道

| 场景 | 快捷路径 |
|------|---------|
| 需求明确 | `stdd ff "描述"` → `apply` → `verify` → `archive` |
| 需要细化 | `stdd new change <name>` → `continue` → `apply` → … |
| Bug 修复 | `stdd issue "描述"` → TDD 修复 → `verify` → `archive` |
| 一键全流程 | `stdd turbo "描述"` 自动执行所有阶段 |

---

## 命令全景

### 核心工作流（14 个）

| CLI | 斜杠命令 | 用途 |
|-----|---------|------|
| `stdd init [path]` | `/stdd:init` | 初始化 STDD 项目 |
| `stdd new change <name>` | `/stdd:new` | 创建变更 |
| `stdd propose <req>` | `/stdd:propose` | 需求提案 |
| `stdd clarify <change>` | `/stdd:clarify` | 多轮需求澄清 |
| `stdd confirm <change>` | `/stdd:confirm` | 确认门 |
| `stdd spec <change>` | `/stdd:spec` | 生成 BDD 规格 |
| `stdd plan <change>` | `/stdd:plan` | 任务分解 + 架构决策 |
| `stdd apply <change>` | `/stdd:apply` | TDD 实现 |
| `stdd execute <change>` | `/stdd:execute` | Ralph Loop 严格闭环（apply 别名） |
| `stdd verify <change>` | `/stdd:verify` | 5 维验证 |
| `stdd archive <change>` | `/stdd:archive` | 归档合并 |
| `stdd continue <change>` | `/stdd:continue` | 恢复中断工作 |
| `stdd ff <desc>` | `/stdd:ff` | 快速生成（提案+规格+任务） |
| `stdd turbo <desc>` | `/stdd:turbo` | 一键全流程自动执行 |

### 探索与构思（Ultra 增强）

| CLI | 用途 |
|-----|------|
| `stdd brainstorm <topic>` | 60+ 结构化推理方法，多维度头脑风暴 |
| `stdd explore [scope]` | 只读项目探索，分析架构、模式、约束 |
| `stdd roles party / review` | 12 角色 Agent 协作模拟 |
| `stdd supervisor start / status / roles` | 多 Agent 监督协调 |
| `stdd design create / list` | DESIGN.md 设计系统生成（modern / dark / minimal 预设） |
| `stdd story create / to-bdd` | Story Mapping → BDD 转换 |
| `stdd vision show / update` | 项目愿景管理 |
| `stdd complexity analyze / hotspots / report` | 圈复杂度分析 |
| `stdd certainty assess / history / configure` | 置信度协议评估 |
| `stdd learn` | 模式提取与风格指南生成 |

### 规格驱动开发（SDD）

| CLI | 用途 |
|-----|------|
| `stdd api-spec [change]` | 从 BDD 生成 OpenAPI 3.0 + 多语言类型/桩/校验器 |
| `stdd schema create / validate / fork` | JSON Schema / Zod 类型定义 |
| `stdd contract generate / verify` | 消费者驱动契约测试 |
| `stdd validate [change]` | Spec Guardian 一致性检查 |
| `stdd final-doc <change>` | 生成聚合需求文档 |
| `stdd memory scan / search / forget` | 3 层项目记忆系统 |
| `stdd product-proposal` | 从全部 STDD 产物生成完整产品提案 |
| `stdd context --export` | 3 层项目上下文导出 |

### TDD 增强

| CLI | 用途 |
|-----|------|
| `stdd mutation [change]` | 变异测试（Quick Heuristic + Stryker 深度变异） |
| `stdd outside-in init / scaffold` | Outside-In TDD：E2E → 集成 → 单元 |
| `stdd tdd-init` | 测试脚手架生成（Jest/Vitest/pytest/go test） |
| `stdd mock <name>` | Mock 数据和桩生成 |
| `stdd mock-gen [change]` | 从规格生成 Mock（MSW、pytest fixtures 等） |
| `stdd factory <entity>` | 测试数据工厂（Factory Bot 风格） |
| `stdd baby-steps` | 7 步 TDD 入门引导 |
| `stdd commit-tdd` | TDD 阶段自动提交（red:/green:/refactor: 前缀） |

### 质量与治理

| CLI | 用途 |
|-----|------|
| `stdd guard` | TDD 守门员（调用测试 → 检查覆盖率 → 阻止脏提交） |
| `stdd constitution show / check / fix / waive / audit` | 9 条宪法系统 |
| `stdd hooks install / verify / disable / enable` | AI 编辑器 Hook 安装 |
| `stdd progress --summary / --resume / --clear` | 实时 JSONL 进度追踪 + 断点续传 |
| `stdd metrics` | 质量仪表板 |
| `stdd doctor` | 项目健康诊断 |
| `stdd depcheck` | 未使用依赖检测 |
| `stdd audit` | 历史合规审计 |
| `stdd ci` | CI 流水线配置生成 |
| `stdd update` | 框架版本更新检查 |

### 生成与预览（Ultra Phase 2-4 新增）

| CLI | 用途 |
|-----|------|
| `stdd builder agent / workflow / skill / list / validate / share / export` | 自定义 Agent、工作流、Skill 构建器 |
| `stdd ui generate <type> <name>` | 多框架 UI 页面/组件生成（React / Vue / Angular / Svelte） |
| `stdd modules list / install / info / uninstall / registry` | 模块市场管理 |
| `stdd dashboard generate / open / serve` | 项目健康仪表板（静态 HTML） |
| `stdd docs generate / serve` | 文档站点生成（Astro + Starlight 风格） |
| `stdd profile create / select / show / list / edit` | 规划配置文件管理 |
| `stdd adapt generate / list` | IDE 配置适配生成（多引擎自动配置） |

### Graph 引擎

| CLI | 用途 |
|-----|------|
| `stdd graph run <intent>` | 按意图执行 DAG（feature / hotfix / repair / research） |
| `stdd graph visualize` | 可视化当前 Skill Graph 拓扑 |
| `stdd graph history` | 执行历史与重放 |
| `stdd graph recommend` | 智能下一步推荐 |
| `stdd graph analyze` | 瓶颈分析与路径优化 |

### 协作与扩展

| CLI | 用途 |
|-----|------|
| `stdd workspace list / validate / repair` | Monorepo 工作区管理 |
| `stdd parallel <cmd>` | 跨 workspace 并行执行 |
| `stdd user-test [change]` | 人机协作测试 |
| `stdd pipeline [change]` | 从 Spec 生成 IR + Acceptance 测试骨架 |
| `stdd starters` | 项目启动模板（JS / TS / Python / Go / Rust） |
| `stdd extensions` | 社区扩展管理 |
| `stdd runtime agent start / next / stop` | Party Mode 多 Agent 模拟 |
| `stdd runtime sudo <file>` | SudoLang 解释器 |
| `stdd list` | 当前所有变更列表 |
| `stdd status` | 项目状态概览 |
| `stdd recommend` | 推荐下一步操作 |
| `stdd help [topic]` | 帮助系统 |

---

## Constitution 质量宪法

9 条条例，分为 **Blocking（阻塞）**、**Warning（警告）**、**Suggestion（建议）** 三级，在 `verify` 和 `guard` 时自动执行。

| 级别 | 条例 | 规则 |
|------|------|------|
| 🔴 Blocking | 2 — TDD | 测试先行 + 覆盖率门禁 + 变异证据 |
| 🔴 Blocking | 7 — Security | 禁止硬编码密钥、禁止注入、路径安全 |
| 🔴 Blocking | 9 — CI/CD | 需要自动化流水线 |
| 🟡 Warning | 1 — 库优先 | 优先使用成熟库，避免重复造轮子 |
| 🟡 Warning | 3 — 小提交 | 原子化、语义化提交 |
| 🟡 Warning | 4 — 代码风格 | 一致的代码格式 |
| 🟡 Warning | 6 — 错误处理 | 显式错误路径，禁止空 catch |
| 🟢 Suggestion | 5 — 文档 | 文档即代码 |
| 🟢 Suggestion | 8 — 性能 | 合理的默认性能 |

```bash
stdd constitution check                               # 全量合规检查
stdd constitution show 2                              # 查看第 2 条详情
stdd constitution fix --dry-run                       # 预览自动修复
stdd constitution waive 4 --reason "历史遗留" --days 7  # 临时豁免
stdd constitution status                              # 健康评分仪表板
stdd constitution audit                               # 历史合规审计
```

### 健康评分示例

```
Constitution Health
Workspace: @myapp/api (packages/api)
85%
  ✅  Art 1: Library-First
  ✅  Art 2: TDD
  ❌  Art 3: Small Commits (2 oversized commits found)
  ✅  Art 4: Code Style
  ⚠️  Art 5: Documentation (Waived for 14 days)
  ✅  Art 6: Error Handling
  ✅  Art 7: Security
  ✅  Art 8: Performance
  ❌  Art 9: CI/CD (No CI config found)
  6 passed, 2 failed, 1 waived
```

---

## 架构概览

STDD Copilot Ultra 基于 **Skill Graph（技能图谱）** 将探索、规格与 TDD 深度融合。架构分为四层：

```
┌──────────────────────────────────────────────────────────┐
│                  用户层 (User Layer)                       │
│  CLI (stdd)    │    IDE 集成 (Claude / Cursor / Windsurf) │
├──────────────────────────────────────────────────────────┤
│             Skill Graph 引擎 (Graph Engine)                │
│  DAG Runner  │  Visualizer  │  Analyzer  │  Recommender  │
├──────────────────────────────────────────────────────────┤
│              核心执行层 (Core Executors)                    │
│  86 命令模块  │  21 工具模块  │  Agent 模拟器  │  运行时    │
├──────────────────────────────────────────────────────────┤
│              基础设施层 (Infrastructure)                    │
│  模板引擎  │  Hook 系统  │  Logger  │  文件安全  │  记忆   │
└──────────────────────────────────────────────────────────┘
```

**关键设计决策：**
- 每个 CLI 命令是一个独立的 class 模块，通过 `CommandLoader` 动态加载
- Skill Graph 根据用户意图自动选择 DAG 路径
- 所有产物以文件形式持久化，AI 读取即可恢复上下文
- 支持 4 层 24 种外部 AI 引擎的适配
- 12 角色 Agent 协作（PM、Architect、UX、QA 等）

完整的架构文档见 [ARCHITECTURE.md](./ARCHITECTURE.md)。

---

## 项目结构

```
stdd-copilot-ultra/
├── cli.js                          # CLI 入口（Commander.js）
├── src/
│   ├── cli/
│   │   ├── commands/               # 86 个命令实现（每个一个 class）
│   │   ├── helpers/                # 共享 CLI 工具（spinner、安全包装器）
│   │   └── registry/               # CommandRegistry + CommandLoader
│   ├── utils/                      # 21 个共享工具模块
│   ├── runtime/                    # Agent 模拟器、SudoLang、browser
│   └── types/                      # JSDoc 类型定义
├── src/templates/
│   ├── commands/                   # 86 个斜杠命令模板（Markdown）
│   └── skills/stdd/                # 47 个 Skill 模板目录
├── stdd/                           # 运行时工作目录（用户项目中使用时生成）
│   ├── changes/                    # 变更生命周期
│   ├── specs/                      # BDD 规格事实源
│   ├── graph/                      # DAG 配置 + 缓存
│   ├── evidence/                   # guard / verify / mutation 输出
│   ├── memory/                     # 项目记忆存储
│   ├── config/                     # 额外配置（engines.yaml 等）
│   └── reporters/                  # 测试报告器插件
├── __tests__/                      # 191 套件 / 4158 个测试
├── docs/                           # 文档
│   ├── agent-protocol.md           # AI Agent 行为协议
│   ├── cli-guide.md                # 完整 CLI 参考
│   ├── getting-started.md          # 新手入门
│   ├── command-reference.md        # 命令详细参考
│   ├── concepts.md                 # 核心理念
│   ├── capabilities.md             # 能力清单
│   ├── workflows.md                # 工作流详解
│   └── en/                         # 英文文档
├── schemas/                        # JSON / YAML Schema
│   ├── spec-driven/                # 规格模板
│   └── constitution/               # 9 条宪法
└── tools/                          # 辅助脚本
```

---

## 文档导航

| 文档 | 内容 |
|------|------|
| [docs/getting-started.md](./docs/getting-started.md) | 首次运行工作流与快速参考 |
| [docs/cli-guide.md](./docs/cli-guide.md) | 完整 CLI 命令参考 |
| [docs/command-reference.md](./docs/command-reference.md) | 全部 80 个命令详细说明 |
| [docs/concepts.md](./docs/concepts.md) | 核心理念：Spec-First、Ralph Loop、Constitution |
| [docs/workflows.md](./docs/workflows.md) | 工作流详解：Greenfield / Brownfield / 快速修复 |
| [docs/capabilities.md](./docs/capabilities.md) | 全部能力清单 |
| [docs/agent-protocol.md](./docs/agent-protocol.md) | AI Agent 行为协议（Phase 过渡、确认门、路径选择） |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 系统架构（含 Mermaid 图） |
| [USAGE.md](./USAGE.md) | 完整使用指南 |
| [INSTALL.md](./INSTALL.md) | 安装指南（npm / 源码 / Docker） |
| [EXAMPLES.md](./EXAMPLES.md) | 多场景实战示例 |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | 贡献指南 |
| [CHANGELOG.md](./CHANGELOG.md) | 版本历史 |
| [fix.md](./fix.md) | 边际优化追踪 |
| [docs/en/](./docs/en/) | English documentation |

---

## 安装与贡献

### 安装

```bash
# npm 全局安装（推荐）
npm install -g @marcher-lam/stdd-copilot-ultra@latest

# 源码安装
git clone https://github.com/Marcher-lam/STDD-COPILOT-ULTRA.git
cd STDD-COPILOT-ULTRA && npm install && npm link

# Docker
docker compose up -d
```

详见 [INSTALL.md](./INSTALL.md)。

### 开发和测试

```bash
npm test                # 运行 191 套件 / 4158 个测试
npm run lint            # ESLint 检查
npm run premerge        # 合并前全量检查（audit + lint + docs + coverage）
npm run test:coverage   # 带覆盖率报告运行
```

### 贡献

欢迎提交 Issue 和 PR。详见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

---

## 从 STDD Copilot 升级

如果你已经在使用原版 STDD Copilot：

```bash
# 1. 安装 Ultra 版
npm install -g @marcher-lam/stdd-copilot-ultra@latest

# 2. CLI 命令不变，无需迁移
stdd status              # 所有命令保持一致
stdd list                # 已有变更继续可用
```

**完全向后兼容** — CLI 命令 `stdd` 和运行时目录 `stdd/` 保持不变。Ultra 版仅扩展了上游能力（探索、构思、多角色协作）。

---

## License

[MIT](LICENSE)

---

*STDD Copilot Ultra — 从构思到交付，让 AI 团队在正确的轨道上运行。*
