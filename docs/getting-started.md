# STDD Copilot Ultra 快速开始

> **版本**: v2.0.0 | **更新日期**: 2026-06-01
> 5 分钟从零到可验证交付

---

## 前置条件

| 依赖 | 版本要求 | 说明 |
|------|----------|------|
| Node.js | >= 20.0.0 | LTS 版本推荐 |
| Git | 任意现代版本 | 变更追踪必需 |
| AI 编码助手 | 可选 | Claude Code / Cursor / Windsurf / Copilot 等 22 种引擎 |

验证环境：

```bash
node --version    # v20.x.x 或更高
git --version     # 任意版本
```

---

## 安装

### 方式 A：npm 全局安装（推荐）

```bash
npm install -g @marcher-lam/stdd-copilot-ultra@latest
stdd --version
# 输出: 2.0.0
```

### 方式 B：源码安装

```bash
git clone https://github.com/Marcher-lam/STDD-COPILOT-ULTRA.git ~/stdd-copilot-ultra
cd ~/stdd-copilot-ultra && npm install && npm link
stdd --version
```

### 方式 C：Docker

```bash
docker pull marcher-lam/stdd-copilot-ultra:latest
docker run --rm -v "$PWD:/workspace" marcher-lam/stdd-copilot-ultra:latest --help
```

---

## 5 分钟快速开始

### 1. 初始化项目

```bash
cd your-project
stdd init
```

输出：
```
✓ STDD 工作区已初始化
  stdd/config.yaml    — 项目配置
  stdd/changes/       — 变更管理
  stdd/specs/         — BDD 规格
  stdd/memory/        — 项目记忆
  stdd/graph/         — Skill Graph 配置
```

### 2. 健康检查

```bash
stdd doctor
```

输出多项检查结果：STDD 目录、配置文件、Node 版本、Git 状态等。

### 3. 创建变更

```bash
stdd new change my-feature
```

### 4. 快速生成

```bash
stdd ff "实现用户登录功能，支持邮箱和手机号" --change-name my-feature
```

一键生成：提案 → 规格 → 任务列表

### 5. TDD 实现

```bash
stdd apply my-feature
```

自动执行 Ralph Loop：🔴 RED → 🔍 CHECK → 🟢 GREEN → 🧬 MUTATION → 🔵 REFACTOR

### 6. 验证

```bash
stdd verify my-feature
```

5 维验证：测试通过、覆盖率、Constitution 合规、证据完整、Lint

### 7. 归档

```bash
stdd archive my-feature
```

Delta Spec 合并 → 归档 → 生成报告

---

## UI 生成快速开始

STDD Copilot Ultra 内置全栈前端生成引擎，支持 4 种框架、8 种组件、5 种页面。

### 生成设计系统

```bash
stdd design create
```

### 生成页面

```bash
stdd ui page home --framework react --type landing
stdd ui page dashboard --framework vue --type dashboard --layout sidebar
stdd ui page login --framework angular --type auth --authVariant login
```

### 生成组件

```bash
stdd ui component MyButton --type button --framework react --style tailwind
stdd ui component UserCard --type card --framework vue
stdd ui component SearchBar --type input --framework svelte
```

### 脚手架完整应用

```bash
stdd ui scaffold react --style tailwind
stdd ui scaffold vue --style scss
```

### 预览和测试

```bash
stdd ui preview       # 生成预览画廊（自动打开浏览器）
stdd ui list          # 列出所有生成的 UI 工件
stdd ui test Button   # 生成测试脚手架
```

### 支持的框架

| 框架 | 文件格式 |
|------|---------|
| React / Next.js | `.jsx` + `.css` |
| Vue / Nuxt.js | `.vue` 单文件组件 |
| Angular | `.component.ts` + `.html` + `.css` |
| Svelte | `.svelte` |

### 支持的组件类型

`button` · `card` · `form` · `input` · `modal` · `nav` · `table` · `list`

### 支持的页面类型

`landing` · `dashboard` · `auth` · `settings` · `pricing`

---

## CLI 速查表

### 核心工作流

| 命令 | 说明 |
|------|------|
| `stdd init` | 初始化 STDD 工作区 |
| `stdd doctor` | 项目健康检查 |
| `stdd new change <name>` | 创建变更 |
| `stdd ff "需求描述"` | 快速生成（提案→规格→任务） |
| `stdd spec <change>` | 生成 BDD 规格 |
| `stdd apply <change>` | TDD Ralph Loop 实现 |
| `stdd verify <change>` | 5 维验证 |
| `stdd archive <change>` | 归档 + Delta Spec 合并 |
| `stdd turbo "需求"` | 一键全流程 |
| `stdd issue "Bug 描述"` | Bug 修复入口 |

### 质量治理

| 命令 | 说明 |
|------|------|
| `stdd guard` | TDD 质量守护 |
| `stdd constitution check` | 9 条宪法合规检查 |
| `stdd mutation <change>` | 变异测试 |
| `stdd metrics <change>` | 质量指标仪表板 |
| `stdd hooks install --git` | 安装 Git pre-commit hook |

### 高级功能

| 命令 | 说明 |
|------|------|
| `stdd graph run --intent feature` | DAG 工作流执行 |
| `stdd graph recommend` | 智能推荐下一步 |
| `stdd roles party --roles=architect,developer` | 多 Agent 讨论 |
| `stdd progress` | 进度追踪 |
| `stdd continue <change>` | 断点续传 |

### UI 生成

| 命令 | 说明 |
|------|------|
| `stdd ui page <name>` | 生成页面 |
| `stdd ui component <name> --type <t>` | 生成组件 |
| `stdd ui scaffold <framework>` | 脚手架应用 |
| `stdd ui preview` | 预览画廊 |
| `stdd ui list` | 列出 UI 工件 |

---

## 配置

核心配置文件位于 `stdd/config.yaml`：

```yaml
# stdd/config.yaml 关键配置项

test:
  command: "node --test"          # 测试运行命令

constitution:
  enabled: true                   # 启用宪法检查
  strict: false                   # 严格模式（Warning 也阻断）

workspaces:
  enabled: false                  # Monorepo 支持
  items: []

hooks:
  preToolUse: true                # AI 写入前 Hook
  postToolUse: true               # AI 写入后 Hook

progress:
  enabled: true                   # 实时进度追踪
  file: "stdd/progress.jsonl"    # 进度日志路径

ui:
  framework: "react"              # 默认 UI 框架
  style: "css"                    # 默认样式方案
```

---

## 下一步

| 文档 | 内容 |
|------|------|
| [实操手册](EvoRL.md) | 从零构建完整项目的分步教程 |
| [产品方案](PRODUCT-PROPOSAL.md) | 产品定位、架构、功能详解 |
| [命令参考](command-reference.md) | 88 个命令完整参考 |
| [CLI 指南](cli-guide.md) | CLI 使用详解 |
| [核心概念](concepts.md) | STDD 核心理念 |
| [工作流](workflows.md) | 工作流模式详解 |
| [架构文档](../ARCHITECTURE.md) | 系统架构（Mermaid 图） |
| [使用手册](../USAGE.md) | 完整使用指南 |
| [英文文档](en/README.md) | English Documentation |
