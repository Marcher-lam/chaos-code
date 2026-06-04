<div align="center">

# STDD Copilot Ultra

**Smart Team-Driven Development · AI 全生命周期开发平台**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-green.svg)](https://nodejs.org/)
[![npm](https://img.shields.io/npm/v/@marcher-lam/stdd-copilot-ultra)](https://www.npmjs.com/package/@marcher-lam/stdd-copilot-ultra)
[![Tests](https://img.shields.io/badge/tests-4151%2F4151%20passing-brightgreen.svg)](CONTRIBUTING.md)
[![Coverage](https://img.shields.io/badge/coverage-97%25%20stmts%20%7C%2093%25%20branch-brightgreen.svg)](CONTRIBUTING.md)

[简体中文](./README.md) · [English](./README_EN.md)

</div>

---

## STDD 是什么

**STDD = Smart Team-Driven Development（智能团队驱动开发）**

STDD Copilot Ultra 是一个 AI 全生命周期开发平台。它不是 AI 本身，而是 AI 编码助手的**流程控制层和质量保证系统**——覆盖从产品构思到可验证交付的完整链路。

```bash
npm install -g @marcher-lam/stdd-copilot-ultra@latest
cd your-project && stdd init
stdd ff "添加深色模式" && stdd apply && stdd verify && stdd archive
```

### 一眼看完

| 维度 | 数值 |
|------|------|
| CLI 命令 | **88** 个实现 / **86** 个斜杠命令模板 |
| Skill 模板 | **53** 个 |
| 测试 | **197** 套件 / **4151+** 用例 / 100% 通过 / 97.7% 覆盖 |
| AI 引擎 | 4 层兼容 **22** 种（Claude Code、Cursor、Windsurf、Copilot 等） |
| 语言 | TypeScript / JS / Python / Java / Go / Rust / C# / PHP |

---

## 三行理解

```
构思  →  规格  →  代码
PM/Architect/UX/QA 多角色协作  →  BDD + 任务拆解  →  Ralph Loop TDD 闭环
```

| 阶段 | 你做什么 | STDD 做什么 |
|------|---------|------------|
| **探索** | 描述想法 | 多角色 Agent 协作、头脑风暴、复杂度评估 |
| **规格** | 确认需求 | Spec-First 方法论、BDD 规格、任务拆解 |
| **执行** | Code Review | Ralph Loop TDD、变异测试、宪法检查、证据链 |

---

## 30 秒上手

### CLI 方式

```bash
stdd init                              # 初始化
stdd new change add-dark-mode          # 创建变更
stdd ff "添加深色模式支持"              # 快速生成：提案 → 规格 → 任务
stdd apply add-dark-mode               # TDD 循环
stdd verify add-dark-mode              # 测试 + 宪法 + 证据
stdd archive add-dark-mode             # 归档合并
```

### AI 助手方式（Claude Code / Cursor 等）

```
/stdd:init                             # 初始化项目并加载角色
/stdd:propose --desc "添加深色模式"       # 创建并澄清需求
/stdd:spec                             # 自动分析并提取规格
/stdd:plan                             # 任务拆解与设计决策
/stdd:apply --phase red                # 执行 TDD 红灯测试阶段
/stdd:verify                           # 执行多维度宪法验证
/stdd:archive                          # 归档已完成变更
/stdd:turbo "一键实现用户登录"            # 快速全流程执行
```

### 一键全流程

```bash
stdd turbo "用户注册功能"              # 自动执行所有阶段
```

---

## 解决什么问题

| 痛点 | 方案 |
|------|------|
| AI 误解意图 | 多轮澄清 → 确认门 → BDD 规格锁定 |
| AI 交付未测试代码 | Ralph Loop: 红 → 绿 → 变异 → 重构 |
| 需求悄悄漂移 | `stdd/changes/` 文件化事实源 + Delta Spec |
| 过度实现 | 微型任务拆分（每任务 ~30 min）+ 确认门 |
| 假绿灯 | 变异测试（Quick Heuristic + Stryker） |
| 上下文丢失 | JSONL 实时进度 + 断点续传 |
| 多 AI 冲突 | Skill Graph 拓扑调度 + 并行执行 |

---

## 命令全景

### 核心工作流

| 命令 | 说明 |
|------|------|
| `stdd init` | 初始化 STDD 目录 |
| `stdd new change <name>` | 创建变更 |
| `stdd propose / clarify / confirm` | 需求提案 → 澄清 → 确认 |
| `stdd spec <change>` | 生成 BDD 规格 |
| `stdd plan <change>` | 任务拆解 + ADR |
| `stdd apply <change>` | Ralph Loop TDD 实现 |
| `stdd verify <change>` | 5 维验证 + 宪法检查 |
| `stdd archive <change>` | 归档 + Delta Spec 合并 |
| `stdd ff <desc>` | 快速通道：提案→规格→任务一步到位 |
| `stdd turbo <desc>` | 一键全流程 |
| `stdd issue <desc>` | Bug 修复快捷入口 |
| `stdd continue <change>` | 断点续传 |

### 探索与构思

`brainstorm` · `explore` · `roles party` · `supervisor` · `design` · `vision` · `complexity` · `certainty` · `learn` · `story`

### 规格驱动（SDD）

`api-spec` · `schema` · `contract` · `validate` · `final-doc` · `memory` · `product-proposal` · `context`

### TDD 增强

`mutation` · `outside-in` · `tdd-init` · `mock` · `mock-gen` · `factory` · `baby-steps` · `commit-tdd`

### 质量与治理

`guard` · `constitution` · `hooks` · `progress` · `metrics` · `doctor` · `depcheck` · `audit` · `ci` · `update`

### 生成与可视化

`builder` · `ui` · `modules` · `dashboard` · `docs` · `profile` · `graph run` · `graph visualize` · `graph history`

### 协作与扩展

`workspace` · `parallel` · `user-test` · `pipeline` · `starters` · `extensions` · `runtime agent` · `runtime sudo` · `list` · `status` · `recommend` · `help`

> 完整命令参考：[docs/command-reference.md](./docs/command-reference.md) · [docs/cli-guide.md](./docs/cli-guide.md)

---

## Constitution 质量宪法

9 条条例，三级执行——Blocking / Warning / Suggestion：

| 级别 | 条例 | 核心规则 |
|------|------|---------|
| 🔴 Blocking | TDD | 测试先行 + 覆盖率门禁 + 变异证据 |
| 🔴 Blocking | Security | 禁止硬编码密钥、注入、不安全路径 |
| 🔴 Blocking | CI/CD | 自动化流水线必需 |
| 🟡 Warning | Library-First | 优先成熟库 |
| 🟡 Warning | Small Commits | 原子化提交 |
| 🟡 Warning | Code Style | 统一格式 |
| 🟡 Warning | Error Handling | 禁止空 catch |
| 🟢 Suggestion | Documentation | 文档即代码 |
| 🟢 Suggestion | Performance | 合理默认性能 |

```bash
stdd constitution check               # 合规检查
stdd constitution show 2              # 查看详情
stdd constitution fix --dry-run       # 预览修复
stdd constitution waive 4 --reason "历史遗留" --days 7
stdd constitution audit               # 历史审计
```

---

## 架构

```
┌──────────────────────────────────────────────────────────┐
│  用户层     CLI (stdd)  ·  IDE (Claude/Cursor/Windsurf)  │
├──────────────────────────────────────────────────────────┤
│  Skill Graph    DAG Runner · Visualizer · Analyzer       │
├──────────────────────────────────────────────────────────┤
│  执行层       88 Commands  ·  28 Utils  ·  Agent Runtime │
├──────────────────────────────────────────────────────────┤
│  基础设施     Templates · Hooks · Logger · Security      │
└──────────────────────────────────────────────────────────┘
```

- 每个 CLI 命令是独立 class，通过 `CommandLoader` 动态加载
- Skill Graph 根据用户意图自动选择 DAG 执行路径
- 所有产物以文件持久化，AI 读取即可恢复上下文
- 12 角色 Agent 协作（PM、Architect、UX、QA、Security 等）

详见 [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 项目结构

```
stdd-copilot-ultra/
├── cli.js                          # CLI 入口
├── src/
│   ├── cli/
│   │   ├── commands/               # 88 个命令实现
│   │   ├── helpers/                # 共享 CLI 工具
│   │   └── registry/               # CommandRegistry + CommandLoader
│   ├── utils/                      # 28 个工具模块
│   ├── runtime/                    # Agent 模拟器、SudoLang、browser
│   ├── config/                     # 角色定义、引擎配置、模板
│   └── templates/
│       ├── commands/               # 86 个斜杠命令模板
│       └── skills/stdd/            # 53 个 Skill 模板
├── stdd/                           # 运行时工作目录
│   ├── changes/                    # 变更生命周期
│   ├── specs/                      # BDD 规格
│   ├── graph/                      # DAG 配置
│   ├── memory/                     # 项目记忆
│   └── reporters/                  # 报告器
├── __tests__/                      # 197 套件 / 4151+ 测试
├── schemas/                        # JSON/YAML Schema
└── docs/                           # 文档
```

---

## 文档

| 文档 | 内容 |
|------|------|
| [docs/getting-started.md](./docs/getting-started.md) | 首次运行 |
| [docs/cli-guide.md](./docs/cli-guide.md) | CLI 命令参考 |
| [docs/command-reference.md](./docs/command-reference.md) | 86 个命令详解 |
| [docs/concepts.md](./docs/concepts.md) | 核心理念 |
| [docs/workflows.md](./docs/workflows.md) | 工作流详解 |
| [docs/capabilities.md](./docs/capabilities.md) | 能力清单 |
| [docs/agent-protocol.md](./docs/agent-protocol.md) | Agent 行为协议 |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 架构（Mermaid） |
| [USAGE.md](./USAGE.md) | 使用指南 |
| [INSTALL.md](./INSTALL.md) | 安装指南 |
| [EXAMPLES.md](./EXAMPLES.md) | 实战示例 |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | 贡献指南 |
| [CHANGELOG.md](./CHANGELOG.md) | 版本历史 |
| [docs/en/](./docs/en/) | English docs |

---

## 安装

```bash
npm install -g @marcher-lam/stdd-copilot-ultra@latest
```

源码 / Docker 方式见 [INSTALL.md](./INSTALL.md)。

### 开发

```bash
git clone https://github.com/Marcher-lam/STDD-COPILOT-ULTRA.git
cd STDD-COPILOT-ULTRA && npm install && npm link
npm test                # 197 套件 / 4151+ 测试
npm run lint            # ESLint
npm run premerge        # 全量检查
```

### 贡献

欢迎 Issue 和 PR → [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 从 STDD Copilot 升级

```bash
npm install -g @marcher-lam/stdd-copilot-ultra@latest
stdd status              # 完全向后兼容，所有命令不变
```

---

## License

[MIT](LICENSE)
