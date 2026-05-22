# STDD Copilot 产品方案

> **Product Proposal Document** | Version 1.0 | 2026-05-15
>
> 文档类型：产品方案报告
> 产品名称：STDD Copilot — Specification & Test-Driven Development Copilot
> 产品版本：v1.0.4-preview
> 作者：Marcher-lam
> 仓库：https://github.com/Marcher-lam/STDD-COPILOT

---

## 目录

1. [产品概述](#1-产品概述)
2. [市场分析](#2-市场分析)
3. [用户画像与场景](#3-用户画像与场景)
4. [产品定位与价值主张](#4-产品定位与价值主张)
5. [核心功能清单](#5-核心功能清单)
6. [产品架构](#6-产品架构)
7. [工作流设计](#7-工作流设计)
8. [PM 能力矩阵](#8-pm-能力矩阵)
9. [质量保障体系](#9-质量保障体系)
10. [技术栈与依赖](#10-技术栈与依赖)
11. [竞品对比](#11-竞品对比)
12. [产品路线图](#12-产品路线图)
13. [成功指标与 KPI](#13-成功指标与-kpi)
14. [风险分析](#14-风险分析)
15. [附录](#15-附录)

---

## 1. 产品概述

### 1.1 一句话描述

STDD Copilot 是一套基于 **Skill Graph（技能图谱）** 的全链路自动化开发框架，将 **Spec-First（需求规范优先）** 与 **TDD（测试驱动开发）** 深度融合，通过文件化规格、CLI 工作流、Constitution 审计和外部 AI 代码助手协作，将开发过程从「模糊对话」转向「可验证工程」。

### 1.2 产品本质

STDD Copilot **不是一个 AI**，而是一个 **AI 编码助手的流程控制框架**。它提供：

- **模板系统**：75 个命令模板 + 47 个技能模板 = 122 个定义入口（去重后 76 个唯一）
- **CLI 工具**：67 个命令，终端直接执行
- **状态管理**：变更生命周期追踪、文件化 Source of Truth
- **质量门禁**：9 篇 Constitution 条例 + Hook 自动执行
- **进度追踪**：实时 JSONL 日志，崩溃后断点续传

### 1.3 核心数据

| 指标 | 数值 |
|------|------|
| 命令模板 | 75 个 |
| 技能模板 | 47 个 |
| CLI 命令 | 67 个 |
| 测试套件 | 171 个 |
| 测试用例 | 3810 个 |
| 覆盖率 (Stmts/Branch) | 97.33% / 91.03% |
| Agent 角色 | 12 个 |
| Constitution 条例 | 9 篇 |
| 技术栈 | Node.js >= 20.0.0，CommonJS，零构建步骤 |

---

## 2. 市场分析

### 2.1 行业背景

2024-2026 年，AI 编码助手（Cursor、Claude Code、GitHub Copilot、Windsurf 等）快速普及。然而行业面临一个核心矛盾：

> **AI 代码生成速度 >> 人类审查和验证速度**

这导致：
- AI 生成的代码缺乏测试覆盖，技术债务堆积
- AI 对需求理解存在偏差，产出与预期不符
- 多人协作时需求变更失控，缺乏追踪
- AI 上下文窗口有限，重启后丢失项目理解

### 2.2 目标市场规模

| 维度 | 估算 |
|------|------|
| 全球 AI 编码工具用户 | ~3000 万（2026 估计） |
| 其中使用 TDD 的开发者 | ~15%（~450 万） |
| 对「AI + 规范化」有需求 | ~30%（~135 万潜在用户） |
| 开源工具早期采纳者 | ~5 万 |

### 2.3 市场趋势

| 趋势 | 影响 |
|------|------|
| AI 编码助手成为标配 | 需要配套的流程控制工具 |
| Spec-Driven Development 兴起 | BDD/Gherkin 被广泛采纳 |
| Agent-based 开发增长 | 多 Agent 协作需要编排框架 |
| 合规与审计趋严 | 需要可追溯的开发过程 |

---

## 3. 用户画像与场景

### 3.1 主要用户画像

#### 画像 A：技术负责人 / Tech Lead

| 维度 | 描述 |
|------|------|
| **角色** | 5-15 人团队的技术负责人 |
| **痛点** | AI 生成的代码质量参差不齐，Review 压力大 |
| **需求** | 强制 TDD 流程、质量门禁、合规审计 |
| **使用方式** | `stdd init` → 配置 Constitution → 团队使用模板 |
| **核心价值** | 统一团队开发标准，减少 Code Review 负担 |

#### 画像 B：独立开发者 / Indie Hacker

| 维度 | 描述 |
|------|------|
| **角色** | 使用 AI 编码助手的独立开发者 |
| **痛点** | AI 帮写代码但容易跑偏，需求越改越多 |
| **需求** | 快速将想法转化为可验证的代码 |
| **使用方式** | `stdd ff "需求"` → `stdd apply` → `stdd archive` |
| **核心价值** | 5 分钟从想法到可验证的实现 |

#### 画像 C：AI Agent 开发者

| 维度 | 描述 |
|------|------|
| **角色** | 构建 AI Agent 的开发者 |
| **痛点** | Agent 行为不可控，缺乏结构化流程 |
| **需求** | Agent 工作流编排、多 Agent 协作 |
| **使用方式** | Skill Graph DAG → `stdd graph run` → Party Mode |
| **核心价值** | 为 Agent 提供可验证的工作流框架 |

#### 画像 D：产品经理（技术型 PM）

| 维度 | 描述 |
|------|------|
| **角色** | 有技术背景的产品经理 |
| **痛点** | 需求文档与代码实现脱节 |
| **需求** | 需求→规格→实现的完整追溯链 |
| **使用方式** | `/stdd:propose` → `/stdd:spec` → `/stdd:user-test` |
| **核心价值** | 需求驱动的可追溯开发 |

### 3.2 典型使用场景

| 场景 | 用户 | 工作流 | 耗时 |
|------|------|--------|------|
| 新功能开发 | 独立开发者 | `ff → apply → verify → archive` | 30 min |
| 需求模糊 | Tech Lead | `new → propose → clarify → confirm → spec → plan → apply → verify → archive` | 2-4 hr |
| Bug 修复 | 任意 | `issue → TDD fix → verify → archive` | 15 min |
| 一键全流程 | 独立开发者 | `turbo "需求"` → 确认门 → 自动完成 | 1 hr |
| 技术探索 | PM | `explore → brainstorm → prp` | 20 min |
| 接手已有项目 | Tech Lead | 自动检测 Brownfield → 阅读报告 → 确认 → 标准 STDD | 1-2 hr |

---

## 4. 产品定位与价值主张

### 4.1 产品定位

```
STDD Copilot = AI 编码助手的「流程操作系统」
```

STDD Copilot 不是另一个 AI 编码工具，而是 **所有 AI 编码工具的流程控制层**。它定义了「AI 应该怎么写代码」，而非「AI 怎么写代码」。

### 4.2 价值主张

| 对谁 | 价值 | 证据 |
|------|------|------|
| **对开发者** | AI 不再跑偏，代码质量有保障 | 5 级防跑偏防御 + TDD Ralph Loop |
| **对团队** | 开发标准机器化执行，Review 效率翻倍 | 9 篇 Constitution + Hook 自动化 |
| **对项目** | 需求到代码全程可追溯 | 文件化规格 + Evidence + `FINAL_REQUIREMENT.md` |
| **对 AI** | 提供结构化上下文，减少幻觉 | 3 层文档上下文 + 向量记忆 |

### 4.3 独特卖点 (USP)

1. **Spec-First**：78 种结构化推理方法，将模糊需求转化为 BDD 规范
2. **Ralph Loop TDD**：红灯→静态检查→绿灯→变异审查→重构，强制测试先行
3. **双入口设计**：CLI（终端）+ 斜杠命令（AI 编码工具）统一体验
4. **Skill Graph DAG**：动态拓扑编排，意图自适应（feature/fix/repair/research）
5. **Constitution 治理**：9 篇条例 + 豁免审计 + Hook 自动执行
6. **断点续传**：实时进度追踪，崩溃后不丢上下文

---

## 5. 核心功能清单

### 5.1 功能全景图

按产品能力域组织，标注优先级和成熟度：

| 能力域 | 功能 | 入口 | 优先级 | 成熟度 |
|--------|------|------|--------|--------|
| **项目管理** | 项目初始化 | `stdd init` | P0 | 稳定 |
| | 项目更新 | `stdd update` | P1 | 稳定 |
| | 健康诊断 | `stdd doctor` | P1 | 稳定 |
| | 快速启动向导 | `stdd start` | P1 | 稳定 |
| **需求工程** | 需求提案 | `/stdd:propose` | P0 | 稳定 |
| | 需求澄清 | `/stdd:clarify` | P0 | 稳定 |
| | 需求确认 | `/stdd:confirm` | P0 | 稳定 |
| | 结构化规划 | `/stdd:prp` | P1 | 稳定 |
| | 产品愿景 | `/stdd:vision` | P2 | 稳定 |
| | 探索分析 | `stdd explore` | P1 | 稳定 |
| | 头脑风暴 | `stdd brainstorm` | P1 | 稳定 |
| **规格管理** | BDD 规格生成 | `stdd spec` | P0 | 稳定 |
| | API 规范 | `stdd api-spec` | P1 | 稳定 |
| | 规范验证 | `stdd validate` | P0 | 稳定 |
| | JSON Schema | `stdd schema` | P1 | 稳定 |
| | 契约测试 | `stdd contract` | P2 | 稳定 |
| **任务管理** | 任务拆解 | `/stdd:plan` | P0 | 稳定 |
| | 技术设计 | `/stdd:design` | P1 | 稳定 |
| | 变更创建 | `stdd new change` | P0 | 稳定 |
| | 变更列表 | `stdd list` | P0 | 稳定 |
| | 变更状态 | `stdd status` | P0 | 稳定 |
| **TDD 实现** | TDD 循环 | `stdd apply` | P0 | 核心 |
| | 继续工作 | `stdd continue` | P0 | 稳定 |
| | 变异测试 | `stdd mutation` | P1 | 稳定 |
| | Mock 生成 | `stdd mock` | P1 | 稳定 |
| | 外向内 TDD | `stdd outside-in` | P2 | 稳定 |
| | 测试脚手架 | `stdd tdd-init` | P2 | 稳定 |
| | Baby Steps | `stdd baby-steps` | P2 | 稳定 |
| **质量治理** | 验证 | `stdd verify` | P0 | 核心 |
| | TDD 守护 | `stdd guard` | P0 | 稳定 |
| | Constitution | `stdd constitution` | P0 | 核心 |
| | Hook 管理 | `stdd hooks` | P1 | 稳定 |
| | 质量指标 | `stdd metrics` | P1 | 稳定 |
| | 依赖检查 | `stdd depcheck` | P2 | 稳定 |
| | 合规审计 | `stdd audit` | P1 | 稳定 |
| **工作流编排** | Skill Graph | `stdd graph` | P0 | 核心 |
| | 快速生成 | `stdd ff` | P0 | 稳定 |
| | 一键全流程 | `stdd turbo` | P1 | 稳定 |
| | Bug 修复 | `stdd issue` | P1 | 稳定 |
| | 推荐引擎 | `stdd recommend` | P1 | 稳定 |
| | 进度追踪 | `stdd progress` | P1 | 核心 |
| **协作** | 多角色 | `stdd roles` | P1 | 稳定 |
| | 多 Agent 协调 | `/stdd:supervisor` | P2 | 稳定 |
| | 并行执行 | `/stdd:parallel` | P2 | 稳定 |
| | Party Mode | `stdd runtime agent` | P2 | 稳定 |
| **知识管理** | 向量记忆 | `stdd memory` | P2 | 稳定 |
| | 上下文管理 | `stdd context` | P1 | 稳定 |
| | 学习反馈 | `stdd learn` | P2 | 稳定 |
| | 自主迭代 | `/stdd:iterate` | P2 | 稳定 |
| **文档** | 最终文档 | `/stdd:final-doc` | P1 | 稳定 |
| | 提交生成 | `stdd commit` | P1 | 稳定 |
| | Story Map | `stdd story` | P2 | 稳定 |
| | 用户测试 | `stdd user-test` | P2 | 稳定 |
| **基础设施** | CI 生成 | `stdd ci` | P2 | 稳定 |
| | Workspace | `stdd workspace` | P1 | 稳定 |
| | 扩展管理 | `stdd extensions` | P2 | 稳定 |
| | Starter | `stdd starters` | P2 | 稳定 |
| | 浏览器驱动 | `stdd browser` | P2 | 稳定 |
| | SudoLang | `stdd sudo` | P2 | 稳定 |
| | Pipeline | `stdd pipeline` | P2 | 稳定 |

### 5.2 P0 核心功能详解

#### 5.2.1 TDD Ralph Loop（`stdd apply`）

这是产品的核心引擎。执行流程：

```
┌─────────────────────────────────────────────────────────┐
│                    Ralph Loop                            │
│                                                          │
│  🔴 RED                                                 │
│  ├── 读取 TASK-NNN 描述                                  │
│  ├── AI 生成失败测试                                     │
│  ├── 运行测试 → 确认失败                                 │
│  └── 记录 evidence/red-{task}.log                       │
│                                                          │
│  🔍 CHECK                                               │
│  ├── ESLint / 类型检查                                   │
│  └── 记录 evidence/check-{task}.log                     │
│                                                          │
│  🟢 GREEN                                               │
│  ├── AI 最简实现通过测试                                  │
│  ├── 运行测试 → 确认通过                                 │
│  └── 记录 evidence/green-{task}.log                     │
│                                                          │
│  🧬 MUTATION                                            │
│  ├── Quick AI 启发式变异审查                              │
│  └── anti-fake-green 检测                                │
│                                                          │
│  🔵 REFACTOR                                            │
│  ├── AI 重构（保持测试通过）                               │
│  └── 记录 evidence/refactor-{task}.log                  │
│                                                          │
│  ✅ 完成 → 更新 .status.yaml → 推进下一个 TASK           │
└─────────────────────────────────────────────────────────┘
```

**防跑偏 5 级防御**：

| 级别 | 机制 | 说明 |
|------|------|------|
| 1 | 人机确认门 | confirm 阶段需人类确认 |
| 2 | 微任务隔离 | 每个任务 ~30 分钟，独立验证 |
| 3 | 连续失败回滚 | 3 次失败自动熔断 |
| 4 | 静态质检门 | Constitution + Guard 自动检查 |
| 5 | 伪变异审查 | anti-fake-green 检测 |

#### 5.2.2 Skill Graph DAG（`stdd graph`）

基于有向无环图的工作流编排引擎：

```
                     ┌──────────┐
                     │   init   │
                     └────┬─────┘
                          │
                     ┌────▼─────┐
                     │   new    │
                     └────┬─────┘
                          │
               ┌──────────┼──────────┐
               │          │          │
          ┌────▼───┐ ┌───▼────┐ ┌──▼───┐
          │propose │ │clarify │ │ ff   │
          └────┬───┘ └───┬────┘ └──┬───┘
               │         │         │
          ┌────▼─────────▼─────┐   │
          │      confirm       │   │
          └────────┬───────────┘   │
                   │               │
              ┌────▼────┐          │
              │  spec   │◄─────────┘
              └────┬────┘
                   │
              ┌────▼────┐
              │  plan   │
              └────┬────┘
                   │
         ┌─────────┼─────────┐
         │         │         │
    ┌────▼───┐ ┌──▼───┐ ┌──▼──────┐
    │ apply  │ │issue │ │outside-in│
    └────┬───┘ └──┬───┘ └────┬─────┘
         │        │          │
    ┌────▼────────▼──────────▼────┐
    │          verify             │
    └────────────┬────────────────┘
                 │
            ┌────▼────┐
            │ archive │
            └─────────┘
```

**意图自适应拓扑**：

| 意图 | 路径 |
|------|------|
| `feature` | ff → spec → outside-in → apply → verify → archive |
| `repair` | fix-packet → apply → verify |
| `research` | explore → brainstorm → final-doc |
| `hotfix` | issue → apply → verify → archive |

---

## 6. 产品架构

### 6.1 系统架构图

```
┌──────────────────────────────────────────────────────────────────┐
│                        外部 AI 编码工具                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │Claude    │  │Cursor    │  │Copilot   │  │Windsurf  │  ...   │
│  │Code      │  │          │  │          │  │          │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │              │              │              │              │
│       └──────────────┴──────┬───────┴──────────────┘              │
│                             │                                      │
│                   斜杠命令 `/stdd:*`                               │
│                             │                                      │
├─────────────────────────────┼──────────────────────────────────────┤
│                             │                                      │
│  ┌──────────────────────────▼──────────────────────────────────┐  │
│  │                    模板层 (Templates)                        │  │
│  │  ┌─────────────────────┐  ┌─────────────────────┐          │  │
│  │  │  20 个命令模板       │  │  47 个技能模板        │          │  │
│  │  │  /stdd:propose      │  │  /stdd:api-spec      │          │  │
│  │  │  /stdd:clarify      │  │  /stdd:design        │          │  │
│  │  │  /stdd:confirm      │  │  /stdd:vision        │          │  │
│  │  │  /stdd:spec         │  │  /stdd:roles         │          │  │
│  │  │  /stdd:plan         │  │  /stdd:metrics       │          │  │
│  │  │  ...                │  │  ...                 │          │  │
│  │  └─────────────────────┘  └─────────────────────┘          │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    CLI 层 (Commander.js)                    │  │
│  │  66 个命令文件 │ 47 个 Skill 模板                            │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │  │
│  │  │ init   │ │ apply  │ │ verify │ │ graph  │ │ const. │  │  │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘  │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │  │
│  │  │ guard  │ │ ff     │ │ turbo  │ │ status │ │ doctor │  │  │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    引擎层 (Engines)                         │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │  │
│  │  │ Skill Graph  │  │ Agent 状态机  │  │ Constitution │    │  │
│  │  │ DAG 编排     │  │ Party Mode   │  │ 9 篇条例     │    │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │  │
│  │  │ 进度追踪     │  │ SudoLang     │  │ 浏览器驱动   │    │  │
│  │  │ JSONL + 续传 │  │ 伪代码解析   │  │ Playwright   │    │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    工具层 (Utils)                           │  │
│  │  21 个工具模块                                               │  │
│  │  file-walker │ security │ evidence-capture │ session-prog.  │  │
│  │  change-utils │ graph-router │ ...                           │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    存储层 (Storage)                         │  │
│  │  ┌────────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │  │
│  │  │ stdd/      │ │ schemas/ │ │ .claude/ │ │ evidence/  │  │  │
│  │  │ changes/   │ │          │ │ commands/│ │            │  │  │
│  │  │ specs/     │ │          │ │ skills/  │ │            │  │  │
│  │  │ graph/     │ │          │ │          │ │            │  │  │
│  │  │ memory/    │ │          │ │          │ │            │  │  │
│  │  │ progress   │ │          │ │          │ │            │  │  │
│  │  └────────────┘ └──────────┘ └──────────┘ └────────────┘  │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 6.2 目录结构

```
stdd-copilot/
├── cli.js                       # CLI 入口 (1109 行)
├── src/
│   ├── cli/commands/            # 66 个命令实现文件
│   ├── cli/registry/            # 命令注册与动态加载
│   ├── utils/                   # 21 个工具模块
│   ├── runtime/                 # 浏览器驱动、Agent 引擎
│   └── templates/
│       ├── skills/              # 47 个 Skill 定义目录
│       └── commands/            # 20 个斜杠命令模板
├── __tests__/                   # 171 个测试套件 / 3810 个用例
├── schemas/                     # JSON/YAML Schema
├── docs/                        # 文档集
├── stdd/                        # 运行时工作目录
└── package.json                 # @marcher-lam/stdd-copilot v1.0.0
```

---

## 7. 工作流设计

### 7.1 标准工作流（核心闭环）

```
init → new → propose → clarify → confirm → spec → plan → apply → verify → archive
  │                 │           │                                        │
  │                 └─ AI 澄清 ─┘                                 mutation
  │                                                                evidence
  └── stdd ff "需求" ──→ 一键跳过中间阶段 ─────────────────────────┘
```

### 7.2 双模式设计

| 模式 | 触发 | 行为 |
|------|------|------|
| **用户交互** | `/stdd:xxx` 斜杠命令 | 立即执行指定命令，不额外编排 |
| **Agent 自主编排** | 自然语言描述需求 | 读取 Skill Graph，自动推进每个 Phase，确认门暂停 |

### 7.3 双场景支持

| 场景 | 触发 | 流程 |
|------|------|------|
| **Greenfield**（从 0 到 1） | 空目录 | `init` → 技术栈交互 → DESIGN.md → 标准工作流 |
| **Brownfield**（接手已有） | 有代码但无 stdd/ | 深度阅读 → 理解报告 → 用户确认 → init → 标准工作流 |

### 7.4 场景化路径

| 用户说 | 自动选择路径 |
|--------|-------------|
| "实现登录功能" | 标准 STDD 全流程 |
| "修复xx bug" | `issue` → `apply` → `verify` → `archive` |
| "快速开发xx" | `turbo` 全流程（仅确认门暂停） |
| "分析xx可行性" | `explore` → `brainstorm` → `final-doc` |

---

## 8. PM 能力矩阵

### 8.1 已覆盖的 PM 能力

| PM 能力 | 支持命令 | 成熟度 |
|---------|---------|--------|
| 需求获取 | `/stdd:propose` + `/stdd:clarify`（78 种方法） | 强 |
| 需求澄清 | 多轮澄清 + 边界/边缘/非功能需求发现 | 强 |
| 干系人审批 | `/stdd:confirm` — Human-in-the-Loop 确认门 | 强 |
| 行为规格 | `/stdd:spec` — Given/When/Then + RFC 2119 | 强 |
| 验收标准 | PRP (What/Why/How/Success) + BDD + user-test | 强 |
| 产品愿景 | `/stdd:vision` — 目标、受众、指标、里程碑 | 中 |
| 结构化规划 | `/stdd:prp` (What/Why/How/Success) | 中 |
| 任务拆解 | `/stdd:plan` (5-6 原子任务，每任务 ~30 min) | 中 |
| 用户故事 | `stdd story` (Journey YAML + BDD 转换) | 中 |
| 风险评估 | `/stdd:certainty` (5 维度置信度) | 中 |
| UAT | `/stdd:user-test` (自然语言脚本) | 中 |
| 跨职能协作 | `/stdd:roles` (12 角色，含 PO/BA/UX/QA) | 中 |
| 质量指标 | `/stdd:metrics` (覆盖率、变异分数、复杂度) | 中 |
| 技术可行性 | `/stdd:explore` (只读代码库分析) | 中 |
| 创意评估 | `/stdd:brainstorm` (多选项 Pros/Cons) | 中 |
| 决策置信 | `/stdd:certainty` (评分 + 自动暂停) | 中 |
| 文档交付 | `/stdd:final-doc` (全量聚合) | 强 |
| 可追溯性 | `/stdd:commit` (TDD 前缀 + 常规提交) | 强 |
| 发布就绪 | `/stdd:verify` + `/stdd:guard` + Constitution | 强 |

### 8.2 PM 能力缺口

| 缺失能力 | 说明 | 优先级 |
|---------|------|--------|
| 路线图/时间线 | 无 Gantt 图、发布路线图、里程碑排期 | P2 |
| 优先级/Backlog | 无产品 Backlog、RICE/MoSCoW 评分 | P2 |
| 用户画像库 | Story 支持单 persona，无结构化画像库 | P3 |
| 市场分析 | 无竞品对标、市场定位、SWOT 模板 | P3 |
| 客户反馈 | learn 记录团队反馈，无客户反馈管道 | P3 |
| Sprint 规划 | iterate 是代码级循环，非 PM 级冲刺 | P3 |
| OKR 追踪 | Vision 有指标，无持续追踪 | P3 |
| 成本估算 | 无故事点、资源分配、成本效益分析 | P3 |

> **结论**：STDD Copilot 在「技术产品管理」（需求工程、规格质量、验收标准、可追溯性）方面能力强大，在「战略产品管理」（路线图、市场定位、优先级排序）方面存在缺口。这是设计选择 — STDD 专注于开发流程，而非产品战略。

---

## 9. 质量保障体系

### 9.1 Constitution 9 篇条例

| 优先级 | 条例 | 核心原则 | 执行方式 |
|--------|------|---------|---------|
| **Blocking** | Article 2: TDD | 测试先行 + 覆盖率 gate + mutation evidence | Hook 阻断 |
| **Blocking** | Article 7: Security | 安全优先 | Hook 阻断 |
| **Blocking** | Article 9: CI/CD | 自动化流水线 | CI 门禁 |
| Warning | Article 1: Library-First | 优先使用成熟库 | 警告提示 |
| Warning | Article 3: Small Commits | 原子提交 | 警告提示 |
| Warning | Article 4: Code Style | 统一风格 | Hook 检查 |
| Warning | Article 6: Error Handling | 显式错误处理 | 建议提示 |
| Suggestion | Article 5: Documentation | 文档即代码 | 建议提示 |
| Suggestion | Article 8: Performance | 性能默认 | 建议提示 |

### 9.2 质量门禁流程

```
代码变更 → Constitution Check → Guard 检查 → 测试运行 → 变异审查 → Evidence 记录
    │            │                    │            │           │            │
    │       3 Blocking          Anti-Bypass     覆盖率    Quick AI     文件化
    │       4 Warning           4 条规则        >= 80%    变异分数      证据链
    │       2 Suggestion                                                    │
    │                                                                      │
    └──── 不通过 → 阻断 / 警告 ──────────────────────────────────────────────┘
         通过 → 允许提交 / 归档
```

### 9.3 测试体系

| 层级 | 工具 | 说明 |
|------|------|------|
| 单元测试 | Jest (171 套件 / 3810 用例 / Branch 91.03%) | 全命令覆盖 |
| 变异测试 | Quick AI + Stryker | anti-fake-green 检测 |
| 契约测试 | Pact 格式 | 消费者驱动 |
| 用户测试 | 自然语言脚本 | 非技术人员可执行 |
| 验收测试 | Pipeline BDD → 测试骨架 | Spec-to-Test 自动化 |

### 9.4 合规审计

```bash
stdd constitution check          # 逐条合规检查
stdd constitution audit --json   # 审计趋势
stdd constitution waive 2 --reason "Legacy" --days 7  # 临时豁免
stdd constitution fix --article 2 --dry-run            # 修复建议
```

---

## 10. 技术栈与依赖

### 10.1 技术选型

| 层面 | 技术 | 选型理由 |
|------|------|---------|
| 运行时 | Node.js >= 20.0.0 | 广泛安装基础，无需额外运行时 |
| 模块系统 | CommonJS | 零构建步骤，直接运行 |
| CLI 框架 | Commander.js | 成熟、文档完善、子命令支持好 |
| 测试框架 | Jest | 社区标准，开箱即用 |
| 终端输出 | chalk | 跨平台颜色支持 |
| 浏览器 | Playwright | 内置浏览器驱动 |
| 容器化 | Docker + docker-compose | 可选部署方式 |

### 10.2 设计原则

| 原则 | 实现 |
|------|------|
| 零构建 | CommonJS，无 TypeScript/Babel/webpack |
| 框架无关 | 支持 Jest/Vitest/pytest/go test/cargo test |
| 双入口 | CLI + 斜杠命令统一体验 |
| 文件即合约 | YAML/Markdown/JSON 作为 Source of Truth |
| AI 无关 | 支持 22 种 AI 引擎，4 级兼容体系 |

---

## 11. 竞品对比

### 11.1 纵向对比（AI 开发流程工具）

| 维度 | STDD Copilot | Cursor Rules | Aider | Continue.dev |
|------|-------------|-------------|-------|-------------|
| **定位** | 流程控制框架 | IDE 规则 | AI 配对编程 | IDE 扩展 |
| **TDD 强制** | 5 级防御 | 无 | 无 | 无 |
| **规格管理** | BDD + Delta Spec | 无 | 无 | 无 |
| **质量门禁** | Constitution 9 篇 | 自定义规则 | 无 | 无 |
| **工作流编排** | Skill Graph DAG | 无 | 无 | 无 |
| **进度追踪** | JSONL + 断点续传 | 无 | 无 | 无 |
| **多 Agent** | 12 角色 + Party Mode | 无 | 无 | 无 |
| **合规审计** | 9 篇条例 + 豁免 | 无 | 无 | 无 |
| **AI 无关** | 支持 22 种引擎 | Cursor 专属 | OpenAI/Anthropic | IDE 内置 |
| **开源** | MIT | - | Apache 2.0 | Apache 2.0 |

### 11.2 STDD Copilot 独有优势

1. **唯一提供完整 TDD 强制流程的框架**
2. **唯一提供 Constitution 合规治理的开发工具**
3. **唯一提供 Skill Graph 动态编排的 CLI 框架**
4. **唯一同时支持 CLI 和 AI 斜杠命令的双入口设计**

---

## 12. 产品路线图

### 12.1 已完成（v1.0.0）

| 阶段 | 交付物 |
|------|--------|
| 核心引擎 | Skill Graph DAG + Agent 状态机 + SudoLang 解析 |
| 完整 CLI | 66 个命令文件，47 个 Skill 模板 |
| 模板系统 | 20 命令模板 + 38 技能模板 |
| 质量体系 | Constitution 9 篇 + Hook + Guard + Evidence |
| 进度系统 | JSONL 实时追踪 + 断点续传 |
| 测试覆盖 | 171 套件 / 3810 用例，Branch 91.03%，全部通过 |
| 文档 | README / USAGE / ARCHITECTURE / CONTRIBUTING / CHANGELOG |

### 12.2 近期计划（v1.1.0）

| 功能 | 优先级 | 说明 |
|------|--------|------|
| AI 自动编码集成 | P0 | 对接真实 AI 模型执行 apply |
| 远程 Extension Registry | P1 | 社区共享技能模板 |
| Web UI Dashboard | P1 | 可视化进度和指标 |
| DESIGN.md 生成增强 | P2 | 自动分析代码生成设计规范 |

### 12.3 中期计划（v1.2.0）

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 多项目 Portfolio 视图 | P2 | 跨项目进度和指标聚合 |
| 优先级评分框架 | P2 | RICE/MoSCoW 集成 |
| Sprint 规划模式 | P2 | 代码级 → PM 级迭代管理 |
| 协作多人模式 | P2 | 多人同时操作不同变更 |

### 12.4 远期愿景（v2.0.0）

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 全自主 Agent | P3 | 从需求到部署的端到端自主执行 |
| 市场分析集成 | P3 | 竞品分析、市场定位模板 |
| 客户反馈管道 | P3 | 用户反馈 → Backlog → Spec 自动流转 |
| OKR 追踪 | P3 | 产品指标持续监控和趋势分析 |

---

## 13. 成功指标与 KPI

### 13.1 产品指标

| 指标 | 目标（6 个月） | 衡量方式 |
|------|---------------|---------|
| npm 周下载量 | >= 500 | npm downloads |
| GitHub Stars | >= 1,000 | GitHub API |
| 活跃贡献者 | >= 20 | GitHub Contributors |
| 测试覆盖率 | >= 90% | Jest coverage |
| CLI 命令覆盖 | 100% (67/67) | 已达成 |
| 文档完整度 | 100% 命令有文档 | 已达成 |

### 13.2 质量指标

| 指标 | 当前值 | 目标 |
|------|--------|------|
| 测试套件 | 171 | >= 150 |
| 测试用例 | 3810 | >= 3000 |
| 测试通过率 | 100% | 100% |
| 分支覆盖率 | 91.03% | >= 90% |
| npm audit 漏洞 | 0 | 0 |
| Constitution 合规 | 9/9 | 9/9 |

### 13.3 用户价值指标

| 指标 | 目标 | 衡量方式 |
|------|------|---------|
| AI 代码跑偏率降低 | >= 50% | 用户调研 |
| TDD 采用率提升 | >= 30% | 用户调研 |
| 开发到发布时间 | 减少 20% | A/B 对比 |
| 用户满意度 (NPS) | >= 40 | 季度调研 |

---

## 14. 风险分析

### 14.1 产品风险

| 风险 | 可能性 | 影响 | 缓解策略 |
|------|--------|------|---------|
| AI 编码工具内置流程控制 | 中 | 高 | 保持 AI 无关，做好「胶水层」定位 |
| 用户认为学习曲线陡峭 | 高 | 中 | `stdd start` 向导 + 5 分钟上手 + turbo 一键 |
| 78 种推理方法过重 | 中 | 低 | ff/turbo 提供快速路径，推理方法仅在 clarify 时使用 |
| Constitution 过于严格 | 低 | 中 | 豁免机制 + 3 级优先级（Blocking/Warning/Suggestion） |

### 14.2 技术风险

| 风险 | 可能性 | 影响 | 缓解策略 |
|------|--------|------|---------|
| CommonJS 限制扩展性 | 低 | 中 | 计划 v2.0 迁移 ESM |
| 22 种 AI 引擎兼容性维护 | 中 | 中 | 4 级兼容体系，优先维护 Tier 1 |
| 浏览器驱动依赖 Playwright | 低 | 低 | 可选依赖，`stdd browser doctor` 诊断 |

### 14.3 市场风险

| 风险 | 可能性 | 影响 | 缓解策略 |
|------|--------|------|---------|
| 竞品（Cursor 等）内置类似功能 | 中 | 高 | 保持开源 + 多 AI 引擎支持 |
| 开源社区活跃度不足 | 中 | 中 | 文档驱动 + 低门槛贡献 |
| AI 能力快速进化使框架过时 | 低 | 高 | 持续更新模板，跟进行业标准 |

---

## 15. 附录

### 15.1 完整 CLI 命令列表（67 个命令）

```
init, update, list, status, skills, commands, new, ff, issue, turbo,
apply, verify, archive, validate, fix-packet, outside-in, roles, guard,
metrics, depcheck, schema, constitution, graph, workspace, context,
explore, ci, starters, extensions, story, user-test, pipeline, hooks,
recommend, memory, learn, commit, spec, api-spec, contract, mock,
tdd-init, audit, continue, mutation, runtime, brainstorm, baby-steps,
sudo, browser, progress, start, doctor
```

### 15.2 完整斜杠命令列表（122 个唯一入口，去重后 76 个）

**Command 模板 (75)**:

```
/stdd:init  /stdd:new  /stdd:propose  /stdd:clarify  /stdd:confirm
/stdd:spec  /stdd:plan  /stdd:apply  /stdd:execute  /stdd:verify
/stdd:archive  /stdd:final-doc  /stdd:brainstorm  /stdd:issue
/stdd:constitution  /stdd:ff  /stdd:continue  /stdd:explore
/stdd:graph  /stdd:turbo
```

**Skill 模板 (47)**:

```
/stdd:api-spec  /stdd:apply  /stdd:archive  /stdd:brainstorm
/stdd:certainty  /stdd:commit  /stdd:complexity  /stdd:context
/stdd:continue  /stdd:contract  /stdd:design  /stdd:explore
/stdd:factory  /stdd:ff  /stdd:final-doc  /stdd:graph  /stdd:guard
/stdd:help  /stdd:init  /stdd:issue  /stdd:iterate  /stdd:learn
/stdd:memory  /stdd:metrics  /stdd:mock  /stdd:mutation  /stdd:new
/stdd:outside-in  /stdd:parallel  /stdd:prp  /stdd:roles
/stdd:schema  /stdd:spec  /stdd:supervisor  /stdd:turbo
/stdd:user-test  /stdd:validate  /stdd:vision
```

### 15.3 Agent 角色（12 个）

```
PO (Product Owner)     — 需求定义、优先级排序
Developer              — 代码实现、技术决策
Tester                 — 测试策略、用例设计
Reviewer               — 代码审查、质量把关
Architect              — 架构设计、技术选型
Security               — 安全审查、风险评估
DevOps                 — 部署运维、CI/CD
UX                     — 用户体验、交互设计
BA (Business Analyst)  — 业务分析、流程建模
Tech Writer            — 文档编写、知识管理
QA Lead                — 质量管理、测试规划
Data Analyst           — 数据分析、指标监控
```

### 15.4 产物清单

| 产物 | 来源命令 |
|------|---------|
| `stdd/config.yaml` | `stdd init` |
| `stdd/changes/{name}/proposal.md` | `/stdd:propose` |
| `stdd/changes/{name}/specs/*.feature` | `/stdd:spec` |
| `stdd/changes/{name}/design.md` | `/stdd:design` `/stdd:plan` |
| `stdd/changes/{name}/tasks.md` | `/stdd:plan` |
| `stdd/changes/{name}/evidence/` | `stdd apply` / `stdd verify` |
| `stdd/changes/archive/` | `stdd archive` |
| `stdd/specs/openapi.yaml` | `stdd api-spec` |
| `stdd/schemas/` | `stdd schema` |
| `stdd/contracts/` | `stdd contract` |
| `stdd/memory/` | `stdd memory` |
| `stdd/progress.jsonl` | `stdd progress` |
| `stdd/vision.md` | `/stdd:vision` |
| `stdd/journeys/` | `stdd story` |
| `FINAL_REQUIREMENT.md` | `/stdd:final-doc` |
| `.github/workflows/ci.yml` | `stdd ci` |
| `.claude/commands/stdd/*.md` | `stdd init` |
| `.claude/skills/stdd/**/*.md` | `stdd init` |

### 15.5 关键文件索引

| 文件 | 作用 | 行数 |
|------|------|------|
| `cli.js` | CLI 入口，所有命令注册 | 1109 |
| `src/cli/commands/constitution-checker.js` | 9 篇条例检查器 | 1535 |
| `src/cli/commands/apply.js` | TDD Ralph Loop 引擎 | ~800 |
| `src/cli/commands/start.js` | 交互式快速启动向导 | ~200 |
| `src/cli/commands/doctor.js` | 项目健康诊断 | ~150 |
| `src/utils/session-progress.js` | 实时进度追踪 | ~300 |
| `src/utils/file-walker.js` | 共享目录遍历 | ~50 |
| `src/utils/security.js` | 敏感信息脱敏 | ~100 |
| `AGENTS.md` | AI Agent 指令文档 | ~700 |

---

> **STDD Copilot** — 让每个开发者都能拥有一个不跑偏、不产生「屎山」的超级 AI 结对编程专家。
>
> Made with love by [Marcher-lam](https://github.com/Marcher-lam)
> License: MIT
> Repository: https://github.com/Marcher-lam/STDD-COPILOT
