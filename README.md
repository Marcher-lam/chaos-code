<div align="center">

# STDD Copilot

**Specification & Test-Driven Development Copilot**

基于 Skill Graph 的全链路自动化开发框架

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-green.svg)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[**简体中文**](./README.md) · [**English**](./README_EN.md)

</div>

---

### 简介

STDD Copilot 是一套基于 **Skill Graph（技能图谱）** 的全链路自动化开发框架。它将 **Spec-First (需求规范优先)** 与 **TDD (测试驱动开发)** 深度融合，通过文件化规格、CLI 工作流、Constitution 审计和外部 AI 代码助手协作，让开发过程从"模糊对话"转向"可验证工程"。

当前版本已经将大量能力 CLI 化：变更创建、fast-forward、spec/api-spec 生成、TDD apply/continue、mutation/verify/archive、Constitution check/status/fix/audit/waive、guard、hooks、Graph run/history/recommend、workspace registry、metrics/context、CI、starter 模板、Spec Guardian、Pattern Teaching、Party/Adversarial roles、story mapping、user-test、pipeline builder、schema workflow 和 extension marketplace 均可通过 `stdd` 命令执行。真实 AI 自动编码、完整多 Agent runtime、factory 深度生成等仍主要依赖 Skill/外部 AI 执行器；mutation CLI 提供 quick 启发式门禁，并在项目安装 Stryker 时委托真实 mutation runner。

### 核心特性
| 特性 | 描述 |
|------|------|
| **内置浏览器驱动** | 原生集成 Playwright API，TDD 循环中无需胶水代码即可进行截图和页面检查 (`stdd browser`) |
| **规范先行、提案驱动** | 用文件化管理，让 AI 编程从 "模糊对话" 走向 "可控工程" |
| **Spec-First 需求驱动** | 通过多轮智能澄清 (78 种结构化推理方法) 与确认门 (Confirm Gate)，将模糊语言转化为严谨的 BDD 规范 |
| **Ralph Loop 自动化 TDD** | 红灯 (生成测试) → 静态检查 → 绿灯 (实现代码) → 变异审查/evidence → 重构 |
| **5 级防跑偏防御体系** | 人机确认门 · 微任务隔离 · 连续失败回滚 · 静态质检门 · 伪变异审查 |
| **Constitution + Hook 一体化** | 9 篇开发条例 + Pre/Post Hook 自动执行 + 豁免审计追踪 |
| **CLI 化工作流** | `stdd apply/verify/archive/continue/ff/turbo/issue/spec/api-spec` 等已实现为 CLI 命令 |
| **Workspace / Monorepo 支持** | `stdd workspace` 注册表、`--workspace` 作用域、按包检测测试命令与证据 |
| **Dependency / Schema 检查** | `stdd depcheck` 检测未使用依赖、`stdd schema validate` 验证 schema 语法 |
| **38 个 Skills + 12 Agent 角色** | 完整的会话入口覆盖，从需求到提交；部分仍由外部 AI 执行 |
| **Graph Engine** | `stdd graph run/history/recommend` 已实现；GraphExecutor 保留可插拔 runtime 能力 |
| **4-Tier AI 引擎适配边界** | 引擎注册与兼容映射存在，真实多引擎自动编码 runtime 仍需外部 AI 工具 |
| **双入口设计** | CLI (Commander.js) + Claude Code Skills 斜杠命令 |

### 当前验证状态

- `stdd fix-packet [change]` 已实现 Golden Packet 风格失败修复上下文，`stdd apply` 测试失败时会自动写入 `stdd/changes/<change>/evidence/fix-packet-*.md/json`。
- `stdd outside-in init/scaffold/status` 已实现 layer registry 与 E2E/集成/单元测试骨架生成。
- Skill Graph 已体现新增能力：feature intent 包含 `stdd-outside-in`，repair intent 为 `stdd-fix-packet → stdd-apply → stdd-verify`。
- 完整测试已通过：`npm test`，61 个测试套件、764 个测试全部通过，npm audit 零漏洞。

### 目录

- [安装](#安装)
- [快速开始](#快速开始)
- [核心工作流](#核心工作流)
- [全部命令](#全部命令)
- [项目结构](#项目结构)
- [Constitution + Hook](#constitution--hook-enforcement)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

### 安装

#### 方式 A：npm 全局安装 (推荐)

> 适用于你只想一行命令安装并在任意项目中使用 `stdd`。

```bash
npm install -g @marcher-lam/stdd-copilot@latest
stdd --help
```

说明：如果你的 npm 账号开启了 2FA，发布者在 `npm publish` 时需要提供 `--otp` 或使用支持 bypass 2FA 的 token。

#### 方式 B：源码安装 (开发/贡献)

```bash
# 克隆仓库
git clone https://github.com/Marcher-lam/STDD-COPILOT.git ~/stdd-copilot
cd ~/stdd-copilot

# 安装依赖
npm install

# 配置全局 CLI (可选)
npm link
```

#### 方式 C：Docker 部署

```bash
# 构建镜像
docker build -t stdd-copilot .

# 使用 docker-compose 启动
docker-compose up -d
```

详细安装说明请参阅 **[INSTALL.md](./INSTALL.md)**

### 快速开始

#### CLI 工具 (推荐)

```bash
# 1. 在项目中初始化 STDD
cd your-project
stdd init

# 2. 创建新变更
stdd new change add-dark-mode

# 3. 在 Claude Code 中使用斜杠命令
# /stdd:new add-dark-mode
# /stdd:apply
# /stdd:archive

# 4. 使用 CLI 查看状态
stdd status
stdd list
```

#### Claude Code 斜杠命令

```bash
# 1. 初始化项目 (首次使用)
/stdd:init

# 2. 创建新变更 (两种方式)

# 方式 A: 需求明确 → Fast-Forward 一键生成
/stdd:ff 实现一个支持 Markdown 导出的 todo-list

# 方式 B: 需求模糊 → 逐步澄清
/stdd:new 实现用户认证功能
/stdd:continue  # 逐步生成 proposal → specs → design → tasks

# 3. 实现任务 (TDD 循环)
/stdd:apply

# 4. 验证并归档
/stdd:verify
/stdd:archive
```

### 核心工作流

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  /stdd:init │───▶│/stdd:propose│───▶│/stdd:clarify│───▶│/stdd:confirm│
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                │
                                                                ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│/stdd:commit │◀───│/stdd:final- │◀───│/stdd:execute│◀───│  /stdd:spec │
│             │    │    doc      │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                            │              │
                                            ▼              ▼
                                     ┌─────────────┐ ┌─────────────┐
                                     │ Ralph Loop  │ │ /stdd:plan  │
                                     │  🔴 → 🟢 → 🔵 │ └─────────────┘
                                     └─────────────┘
```

### 典型执行路径

```
# 场景1：简单明确需求
/stdd:new --> /stdd:ff --> /stdd:apply --> stdd mutation --> /stdd:verify --> /stdd:archive

# 场景2：需求表达不出来
/stdd:explore --> /stdd:new --> /stdd:continue --> ... --> /stdd:apply --> /stdd:archive

# 场景3：一键 Turbo
/stdd:turbo "实现用户登录" --> 自动完成所有阶段 --> /stdd:commit

# 场景4：Bug 修复
/stdd:issue --> Bug 分类 → 失败测试 → 最小修复 → 回归验证 --> /stdd:archive
```

### 全部命令

> **注意**：STDD Copilot 提供两种命令入口：
> - **CLI 命令**（`stdd xxx`）：通过终端直接执行，工具自身实现
> - **斜杠命令**（`/stdd:xxx`）：在 Claude Code 等 AI 编码工具中使用，AI 执行模板
>
> 下表列出所有命令及其执行方式。

#### 核心流程

下表列出核心命令。斜杠命令（`/stdd:xxx`）需在 Claude Code 等 AI 编码工具中使用。

| 斜杠命令 | CLI 等价命令 | 入口 | 说明 |
|---------|-------------|------|------|
| `/stdd:init` | `stdd init` | CLI | 初始化项目，创建目录结构和配置 |
| `/stdd:new` | `stdd new change <name>` | CLI | 创建新变更提案 |
| `/stdd:propose` | — | AI | 提出需求草案（Claude Code 斜杠命令） |
| `/stdd:clarify` | — | AI | 需求澄清 (78 种结构化推理方法) |
| `/stdd:confirm` | — | AI | 需求确认门 |
| `/stdd:spec` | `stdd spec <change>` | CLI | 生成 BDD 规格 + Test Pipeline |
| `/stdd:plan` | — | AI | 任务拆解 + ADR 记录 |
| `/stdd:apply` | `stdd apply <change> [--phase]` | CLI | 实现任务 (TDD Red→Green→Refactor) |
| `/stdd:execute` | — | AI | Ralph Loop 执行循环 |
| `/stdd:verify` | `stdd verify <change>` | CLI | 验证规范一致性 (含 3D 验证) |
| `/stdd:archive` | `stdd archive <change>` | CLI | 归档变更 |
| `/stdd:ff` | `stdd ff <desc>` | CLI | Fast-Forward 快速生成所有产物 |
| `/stdd:continue` | `stdd continue <change>` | CLI | 继续生成下一个产物 |
| `/stdd:explore` | `stdd explore [scope]` | CLI | 自由探索模式 (只读) |
| `/stdd:turbo` | `stdd turbo <desc>` | CLI | One-Shot 一键全流程 |
| `/stdd:brainstorm` | `stdd brainstorm <topic>` | CLI | 纯分析建议模式 (多角度) |
| `/stdd:issue` | `stdd issue <desc>` | CLI | Bug/Issue TDD 修复流程 |

#### Graph 引擎

| 命令 | 入口 | 说明 |
|------|------|------|
| `stdd graph run` | CLI ⚠️ | 从指定 Skill 开始执行（需外部执行器） |
| `stdd graph history` | CLI | 查看执行历史 |
| `stdd graph recommend` | CLI | 智能推荐下一步 |
| `/stdd:graph visualize` | AI | 可视化 Skill 依赖图 |
| `/stdd:graph analyze` | AI | 分析当前状态和可执行路径 |
| `/stdd:graph parallel` | AI | 识别并执行可并行的 Skill |
| `/stdd:graph replay` | AI | 回放历史执行 |

#### SDD 增强

| 命令 | 入口 | 说明 |
|------|------|------|
| `stdd api-spec [change]` | CLI | API 规范先行 (OpenAPI/TypeScript) |
| `/stdd:api-spec` | AI | API 规范生成 |
| `stdd schema validate` | CLI | 类型规范先行 (JSON Schema/Zod) |
| `/stdd:schema` | AI | JSON Schema/Zod 类型生成 |
| `stdd contract <action>` | CLI | 契约测试 (5 种消息模式) |
| `/stdd:contract` | AI | 消费者驱动契约 |
| `stdd validate [change]` | CLI | 规范验证 + Spec Guardian |
| `/stdd:validate` | AI | 规范验证 |

#### TDD 增强

| 命令 | 入口 | 说明 |
|------|------|------|
| `stdd outside-in <action>` | CLI | 外向内 TDD (E2E → 集成 → 单元) |
| `/stdd:outside-in` | AI | 外向内 TDD |
| `stdd mutation [change]` | CLI | 变异测试 (Quick 启发式 + Stryker) |
| `/stdd:mutation` | AI | 变异测试 |
| `stdd fix-packet [change]` | CLI | 生成 Golden Packet 失败修复上下文 |
| `/stdd:mock` | AI | Mock 生成 |
| `/stdd:factory` | AI | 测试数据工厂 |

#### 质量门禁与配置

| 命令 | 入口 | 说明 |
|------|------|------|
| `stdd guard` | CLI | TDD 守护钩子 + Anti-Bypass 防绕过 |
| `/stdd:guard` | AI | TDD 守护 |
| `stdd constitution` | CLI | Constitution 管理 (9 篇条例 + 豁免) |
| `/stdd:constitution` | AI | Constitution 管理 |
| `stdd hooks` | CLI | Hook 管理 |
| `stdd workspace` | CLI | 工作区/monorepo 支持 |
| `stdd doctor` | CLI | 诊断项目健康 |
| `stdd metrics` | CLI | 质量指标仪表板 |
| `/stdd:metrics` | AI | 质量指标仪表板 |

#### 高级功能（按需使用）

| 命令 | 入口 | 说明 |
|------|------|------|
| `stdd learn` | CLI | 自适应学习 + Pattern Teaching |
| `/stdd:learn` | AI | 自适应学习 |
| `stdd roles` | CLI | 12 Agent 角色协作 (含对抗式审查) |
| `/stdd:roles` | AI | 角色协作 |
| `stdd story` | CLI | Story Mapping |
| `stdd user-test` | CLI | 用户测试脚本生成 |
| `/stdd:user-test` | AI | 用户测试 |
| `stdd commit` | CLI | 原子化提交 (red:/green:/refactor: 前缀) |
| `/stdd:commit` | AI | 原子化提交 |
| `/stdd:design` | AI | 技术设计文档 (ADR) |
| `/stdd:final-doc` | AI | 最终文档 |
| `/stdd:prp` | AI | PRP 结构化规划 |
| `/stdd:supervisor` | AI | 多 Agent 协调器 |
| `/stdd:context` | AI | 三层文档架构 |
| `/stdd:iterate` | AI | 自主迭代循环 |
| `/stdd:memory` | AI | 向量数据库记忆 |
| `/stdd:parallel` | AI | 并行执行模式 |
| `/stdd:certainty` | AI | 5 维度置信度评分 |
| `/stdd:complexity` | AI | APP Mass 代码质量计算 |
| `/stdd:vision` | AI | 项目愿景文档管理 |
| `/stdd:help` | AI | 上下文感知帮助系统 |

---

### CLI 命令

```bash
stdd init                    # 初始化项目
stdd init /path/to/project   # 指定目录
stdd init --force            # 强制覆盖

stdd list                    # 列出活跃变更
stdd list --specs            # 列出规格
stdd list --archived         # 包含已归档
stdd list --json             # JSON 格式

stdd status                  # 整体状态
stdd status add-dark-mode    # 特定变更状态

stdd ff "add dark mode"      # 快速创建 proposal/tasks/specs 基础产物
stdd spec add-dark-mode      # 从 tasks.md 生成 BDD feature
stdd api-spec add-dark-mode  # 从 feature 生成 OpenAPI 规范
stdd apply add-dark-mode     # 执行下一个任务并运行测试
stdd apply add-dark-mode --delegate              # 失败时写入跨模型委托 evidence
stdd apply add-dark-mode --e2e-command "npm run e2e"  # 运行 E2E probe 并保存 evidence
stdd fix-packet add-dark-mode  # 手动生成失败修复上下文包 (Golden Packet)
stdd mutation add-dark-mode  # quick 启发式 mutation score / anti-fake-green，并保存 evidence
stdd continue add-dark-mode  # 从最近任务状态继续
stdd verify add-dark-mode    # 验证任务、测试、Constitution、证据
stdd archive add-dark-mode   # 归档完成变更并合并 delta specs 到 stdd/specs
stdd commit add-dark-mode --tdd --phase red --issue 42  # 生成 TDG 阶段前缀提交信息

stdd issue "login crashes"   # 创建 bugfix TDD 变更
stdd turbo "add login"       # FF + spec + TDD scaffold
stdd explore auth            # 只读探索并输出建议

stdd new change add-dark-mode      # 创建新变更
stdd new spec auth                 # 创建新规格

stdd tdd init                # 为缺失测试生成脚手架
stdd guard                   # 全局质量门禁，含 coverage report-aware 测试比率估计
stdd metrics                 # 项目/变更质量指标
stdd context --export        # 导出 STDD 上下文
stdd ci                      # 生成 CI 配置并集成 guard
stdd starters list           # 列出 starter 模板
stdd starters create my-app --type typescript

stdd workspace list          # 列出 workspace registry 或动态检测结果
stdd workspace validate      # 校验 monorepo workspace registry
stdd workspace repair        # 刷新 stdd/config.yaml workspace registry

stdd depcheck [path]         # 检测未使用的 dependencies (支持 workspace)
stdd schema validate [file]  # 验证 JSON/YAML schemas 语法
stdd schema create custom-flow     # 创建 workflow schema
stdd schema fork schemas/spec-driven/schema.yaml custom-flow  # fork workflow schema

stdd contract generate add-dark-mode   # 从 API 规格生成消费者契约
stdd contract verify add-dark-mode     # 验证契约与规格一致性
stdd validate add-dark-mode --spec-guardian --fix  # Spec Guardian + rewrite suggestions
stdd mock add-dark-mode                # 生成 Mock 数据和 Stubs

stdd story create checkout-flow        # 创建 Story Mapping YAML
stdd story bdd stdd/journeys/checkout-flow.yaml  # 从 journey 生成 BDD
stdd user-test add-dark-mode           # 生成人工/AI 双模式用户测试脚本
stdd pipeline add-dark-mode            # 生成 parser IR 和 acceptance test skeleton
stdd outside-in init                   # 创建 stdd/tdd-registry.yaml 分层 TDD registry
stdd outside-in scaffold add-dark-mode # 生成外向内 TDD plan 和分层测试骨架
stdd extensions list                   # 查看 extension catalog
stdd extensions install ./my-extension # 安装本地 extension
stdd extensions validate               # 校验 extension manifests

stdd graph run feature       # 基于动态 DAG 执行 workflow，含 outside-in 节点
stdd graph run --intent repair --change-name add-dark-mode  # 从 fix-packet 修复上下文开始
stdd graph history           # 查看 graph 执行历史
stdd graph recommend         # 推荐下一步
stdd recommend               # CLI 侧下一步推荐

stdd skills                  # 列出所有技能
stdd skills --phase 4        # 按阶段筛选

stdd commands                # 列出 Claude Code 斜杠命令
stdd constitution            # 查看所有条例
stdd constitution show 2     # 查看 Article 2 详情
stdd constitution check      # 触发 CLI 侧合规检查入口
stdd constitution status     # 查看合规健康状态
stdd constitution fix        # 自动修复/生成部分合规产物
stdd constitution audit      # 聚合 evidence 审计趋势
stdd constitution waive 2 --reason "Legacy migration" --days 7
stdd hooks install           # 安装 Hooks
stdd hooks verify            # 验证 Hooks
stdd hooks status            # 查看 Hooks 状态
stdd hooks disable           # 禁用 Hooks
stdd hooks enable            # 恢复 Hooks
stdd runtime agent start "Topic" --rounds 3  # 启动多 Agent 交互模拟 (Party Mode)
stdd runtime agent next                      # 推进下一个 Agent 发言
stdd runtime sudo <file.sudo> --generate     # 解析 SudoLang 伪代码生成产物
```

### 项目结构

```
stdd-copilot/
├── .claude/
│   ├── commands/stdd/           # 20 个斜杠命令模板初始化后的副本
│   │   ├── init.md
│   │   ├── new.md
│   │   ├── apply.md
│   │   ├── brainstorm.md
│   │   ├── clarify.md
│   │   ├── confirm.md
│   │   ├── constitution.md
│   │   ├── continue.md
│   │   ├── execute.md
│   │   ├── explore.md
│   │   ├── ff.md
│   │   ├── final-doc.md
│   │   ├── graph.md
│   │   ├── issue.md
│   │   ├── plan.md
│   │   ├── propose.md
│   │   ├── spec.md
│   │   ├── verify.md
│   │   └── archive.md
│   ├── hooks/                  # Hook 脚本
│   │   └── pre-file-write.js
│   └── skills/                 # 38 个技能定义
│       ├── stdd-init/
│       ├── stdd-spec/
│       ├── stdd-execute/
│       ├── stdd-guard/
│       ├── stdd-turbo/
│       ├── stdd-brainstorm/
│       ├── stdd-issue/
│       └── ... (共 38 个)
├── .github/
│   └── workflows/ci.yml        # CI/CD (Node.js 18/20/22 矩阵测试)
├── src/
│   ├── cli/
│   │   ├── commands/           # CLI 命令实现
│   │   └── registry/           # 命令注册与动态加载
│   │       ├── command-registry.js
│   │       └── command-loader.js
│   ├── utils/                  # 工具模块 (19 个)
│   │   ├── error-handler.js    # 结构化错误处理 + 重试包装
│   │   ├── logger.js           # 多级日志 + 轮转
│   │   ├── security.js         # 输入清理 + 密钥检测 + 路径安全
│   │   ├── test-command-resolver.js  # 共享测试命令解析
│   │   ├── graph-executor.js   # Graph 执行引擎 (含自愈)
│   │   ├── command-runner.js   # 安全命令执行
│   │   └── ... (共 19 个)
│   └── types/
│       └── index.js            # TypeScript/JSDoc 类型定义
├── __tests__/                  # 测试套件 (61 个)
│   └── integration.test.js     # 集成测试 (7 个场景)
├── test-support/               # 测试辅助
│   ├── integration-helper.js   # 集成测试工具
│   └── benchmark.js            # 性能基准套件
├── stdd/                       # 工作目录
│   ├── changes/                # 变更管理
│   │   └── archive/            # 归档变更
│   ├── specs/                  # BDD 规格文件
│   ├── memory/                 # 持久化记忆
│   ├── graph/                  # Graph 配置
│   ├── config/                 # 引擎配置
│   │   └── engines.yaml        # 22 个 AI 引擎
│   ├── templates/              # 模板系统
│   │   ├── starters/           # 5 种语言 Starter
│   │   ├── docs-site/          # 文档站点模板
│   │   └── devcontainer/       # DevContainer
│   ├── presets/                # 预设配置
│   ├── extensions/             # 扩展系统
│   ├── reporters/              # 测试报告器 (6 种)
│   ├── constitution/           # 豁免管理
│   └── config.yaml             # 项目配置
├── schemas/                    # JSON/YAML Schema
│   ├── spec-driven/            # 规格模板
│   ├── constitution/           # 9 篇条例
│   └── hooks/                  # Hooks 配置
├── docs/                       # 文档
│   ├── getting-started.md
│   ├── concepts.md
│   ├── workflows.md
│   ├── commands.md
│   └── cli-guide.md
├── Dockerfile                  # 多阶段生产构建
├── docker-compose.yml          # 容器编排
├── CHANGELOG.md                # 版本历史
├── docs/EvoRL.md                    # 65 条斜杠命令验证文档
├── AGENTS.md                   # AI 代理指令
├── README_EN.md                # 英文说明文档
├── ARCHITECTURE.md             # 系统架构
├── INSTALL.md                  # 安装指南
├── USAGE.md                    # 使用手册
├── CONTRIBUTING.md             # 贡献指南
├── fix.md                      # 修复跟踪
```

### Constitution + Hook Enforcement

STDD Copilot 引入了 **9 篇开发条例 (Constitution)** 和 **Hook Enforcement System**，实现自动化代码质量管控。

#### 9 篇开发条例

| 优先级 | 条例 | 核心原则 | 执行方式 |
|--------|------|----------|----------|
| **Blocking** | Article 2: TDD | 测试先行 + 覆盖率 gate + mutation evidence gate | Pre Hook/CI 阻断 |
| **Blocking** | Article 7: Security | 安全优先 | Pre Hook 阻断 |
| **Blocking** | Article 9: CI/CD | 自动化流水线 | CI 门禁 |
| Warning | Article 1: Library-First | 优先使用成熟库 | 警告提示 |
| Warning | Article 3: Small Commits | 原子提交 | 警告提示 |
| Warning | Article 4: Code Style | 统一风格 | Hook 检查 |
| Warning | Article 6: Error Handling | 显式错误处理 | 建议提示 |
| Suggestion | Article 5: Documentation | 文档即代码 | Post Hook 建议 |
| Suggestion | Article 8: Performance | 性能默认 | Post Hook 建议 |

#### Hook 集成

```bash
# 安装 Hooks
stdd hooks install

# 验证配置
stdd hooks verify

# 查看条例
stdd constitution
stdd constitution show 2
stdd constitution check
stdd constitution status
stdd constitution fix --article 2 --dry-run
stdd constitution audit --json
stdd constitution waive 2 --reason "Legacy migration" --days 7

# 管理 Hooks
stdd hooks status
stdd hooks disable
stdd hooks enable

# Git hooks / CI 场景
stdd guard --strict
stdd ci github

# 申请临时豁免
/stdd:constitution waiver --article=2 --reason="Legacy migration"
```

### Workspace / Monorepo

STDD Copilot 支持单仓多包工作区。`stdd init` 会保留项目级 `stdd/config.yaml`，`stdd workspace repair` 可根据 `package.json` workspaces、常见 `packages/*` 结构动态刷新 registry；`apply`、`verify`、`metrics`、`context`、`constitution status/fix/audit`、`recommend`、`ff`、`issue`、`spec`、`api-spec` 和 `turbo` 支持 `--workspace <path-or-package>` 作用域。

```bash
stdd workspace list
stdd workspace validate
stdd workspace repair

stdd ff "add billing webhook" --workspace packages/api
stdd spec add-billing-webhook --workspace packages/api
stdd apply add-billing-webhook --workspace packages/api
stdd mutation add-billing-webhook --workspace packages/api
stdd verify add-billing-webhook --workspace packages/api
stdd metrics --workspace packages/api
stdd graph recommend --workspace packages/api
```

### 已实现边界

已 CLI 化：文件化 change/spec workflow、TDD apply/continue 的测试执行与状态更新、apply 失败委托 evidence、E2E probe evidence、mutation quick/Stryker 委托、verify/archive delta spec merge、Constitution check/status/fix/audit/waiver、hooks、guard、evidence/reporter、Graph run/history/recommend、workspace registry、metrics/context/ci/starters/explore/update、Spec Guardian、Pattern Teaching、Party/Adversarial roles、Story Mapping、User Test、Pipeline Builder、schema create/fork/validate 和 extension marketplace。

Runtime 引擎：**Agent 状态机 (Party Mode)**、**SudoLang 解析与执行**、**内置浏览器驱动**、**BMAD 启发式引导库**以及 **Baby Steps TDD 教学** 均已实现完整 CLI 运行时。系统级增强：**结构化错误处理与重试** (`error-handler.js`)、**多级日志与轮转** (`logger.js`)、**输入清理/密钥检测/路径安全** (`security.js`)、**集中式命令注册与动态加载** (`command-registry.js`, `command-loader.js`)、**TypeScript/JSDoc 类型定义** (`types/index.js`)。

仍需外部 AI 执行器或 Skill：真实 AI 自动编码、完整多 agent runtime、factory 深度生成、远程 extension registry、跨引擎自动调度执行。`stdd mutation` 的 quick 模式是启发式 mutation score / anti-fake-green 检查，不是完整跨语言 mutation 引擎；真实 mutation 依赖项目中安装并配置 Stryker。

### Mutation Gate

`stdd mutation [change]` 在 `stdd apply` 后、`stdd verify` 前运行，输出 mutation evidence 到 change evidence 目录，供 Article 2 和 `constitution audit` 使用。

```bash
stdd apply add-dark-mode
stdd mutation add-dark-mode
stdd mutation add-dark-mode --mode quick
stdd mutation add-dark-mode --mode stryker
stdd mutation add-dark-mode --workspace packages/api
stdd verify add-dark-mode
```

quick 模式基于测试/源码信号生成启发式 mutation score，并检查空断言、跳过测试、无效 expect 等 anti-fake-green 风险；stryker 模式在项目安装 Stryker 时运行真实 mutation 测试，否则回退为可审计的失败/跳过 evidence。

### 变更管理流程

| 流程阶段 | 对应文件/操作 | 状态标识 |
|----------|---------------|----------|
| 创建提案 | `proposal.md` | 待启动 |
| 生成规格 | `specs/*.feature` | 规格中 |
| 设计方案 | `design.md` | 设计中 |
| 任务拆解 | `tasks.md` | 任务就绪 |
| 实现变更 | `/stdd:apply` → `stdd mutation` → `/stdd:verify` | 实现中 |
| 归档完成 | `archive/` | 已完成 |

### 技术栈

- **运行时**: Node.js >= 20.0.0
- **核心引擎**: Skill Graph 动态编排 + **Agent 状态机 (Runtime Agent)** + **SudoLang 解析引擎**
- **TDD 框架**: 框架无关 (Vitest/Jest/pytest/go test/cargo test)
- **AI 集成**: 22 个引擎，4 级兼容体系

### 详细文档

| 文档 | 说明 |
|------|------|
| [English Docs Index](./docs/en/README.md) | English documentation hub and entry-point map |
| [Getting Started](./docs/en/getting-started.md) | First-run workflow and quick CLI reference |
| [CLI Guide](./docs/en/cli-guide.md) | Full CLI command reference |
| [安装指南](./INSTALL.md) | 安装步骤和系统要求 |
| [使用手册](./USAGE.md) | 完整使用指南 |
| [系统架构](./ARCHITECTURE.md) | 架构设计和组件说明 |
| [示例集](./EXAMPLES.md) | 社区示例和学习资源 |
| [CLI 使用指南](./docs/cli-guide.md) | CLI 完整文档 |
| [快速开始](./docs/getting-started.md) | 首次使用流程和 CLI 速查 |
| [核心概念](./docs/concepts.md) | Specs、Changes、Schemas 详解 |
| [工作流程](./docs/workflows.md) | 8 种常见工作流模式 |
| [命令参考](./docs/commands.md) | 40+ 命令完整参考 |
| [框架对比](./docs/comprehensive-framework-comparison.md) | 与 12 个框架对比 |
| [EvoRL 验证文档](./docs/EvoRL.md) | 覆盖全部 65 条斜杠命令的验证示例 |
| [变更日志](./CHANGELOG.md) | 版本历史 |

### 贡献指南

欢迎提交 Issue 和 Pull Request！请参阅 [CONTRIBUTING.md](./CONTRIBUTING.md)。

### 许可证

[MIT License](LICENSE)

---

<div align="center">

**STDD Copilot** — 让每个开发者都能拥有一个不跑偏、不产生"屎山"的超级 AI 结对编程专家

Made with ❤️ by [Marcher-lam](https://github.com/Marcher-lam)

</div>
