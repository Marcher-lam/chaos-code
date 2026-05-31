# STDD Copilot Ultra — AI Agent 指令协议

> **Package**: `@marcher-lam/stdd-copilot-ultra` v2.0.0  
> **Last Updated**: 2026-06-01  
> **适用对象**: AI Agent（Claude Code / Cursor / Copilot / Aider 等）  
> **适用版本**: 所有支持 Skill 模板 + CLI 的 Tier 1-4 引擎

---

## 目录

1. [概述](#1-概述)
2. [双模式设计](#2-双模式设计用户驱动--agent-驱动)
3. [双场景支持](#3-双场景支持greenfield--brownfield)
4. [DESIGN.md 设计系统集成](#4-designmd-设计系统集成)
5. [UI 生成能力](#5-ui-生成能力)
6. [Agent 编排协议](#6-agent-编排协议)
7. [Skill Graph 路径选择](#7-skill-graph-路径选择)
8. [上下文感知与推荐引擎](#8-上下文感知与推荐引擎)
9. [错误恢复](#9-错误恢复)
10. [辅助功能](#10-辅助功能按上下文自动调用)
11. [Turbo 模式](#11-turbo-模式)
12. [完整能力清单](#12-完整能力清单)

---

## 1. 概述

STDD Copilot Ultra 是一个 **Spec-First + TDD 全生命周期 AI 开发平台**，从需求构想到验证交付提供完整的工具链。核心数据：

| 指标 | 数值 |
|------|------|
| 顶层 CLI 命令 | 83 个 |
| Slash 命令模板（`.md`） | 86 个 |
| Skill 模板（`SKILL.md`） | 53 个 |
| 命令实现文件 | 88 个（`src/cli/commands/`） |
| 测试文件 | 197 个 |
| Constitution 条例 | 9 篇（3 Blocking + 4 Warning + 2 Suggestion） |
| AI 引擎支持 | 4 Tier，22+ 引擎 |
| Agent 角色 | 12 个（4 基础 + 8 专用） |

### 核心架构边界

CLI 负责**产物生成、测试执行、mutation evidence、证据采集、质量门禁和工作区编排**。真实 AI 编码、多 Agent runtime、contract/mock/factory 等由 Skill 和外部 AI 执行器承载。

```
用户 ──→ CLI / IDE ──→ Skill Graph 引擎 ──→ 运行时工具链
              │                │                    │
         命令模板          DAG 编排          异构引擎适配
         命令实现          条件引擎          并行执行器
         53 Skills        拓扑排序          断点缓存
```

---

## 2. 双模式设计：用户驱动 + Agent 驱动

STDD Copilot Ultra 支持**两种并行模式**，Agent 根据用户输入自动选择。

### 模式 A：用户驱动模式（User-Driven）

**触发条件**：用户明确输入 `/stdd:` 斜杠命令。

**行为**：
- 立即执行用户指定的命令，不做额外编排
- 执行完成后汇报结果
- 如果当前项目状态与命令不匹配，**友好提示**下一步建议，但**不强制推进**

```
用户: /stdd:apply
Agent: ✅ 执行 TASK-003...
       💡 提示: 当前还有 2 个待完成任务，完成后可以 /stdd:verify
```

### 模式 B：Agent 驱动模式（Agent-Driven）

**触发条件**：用户通过自然语言描述需求（非 `/stdd:` 命令），或明确说 "自动推进"/"继续"。

**行为**：
- 读取 Skill Graph，规划完整执行路径
- 自动推进每个 Phase，在确认门暂停
- 汇报进度，让用户随时了解当前状态

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
... (自动澄清)

⚠️ 确认门: 请确认以上需求理解是否正确？
   回复 "确认" 继续，或提出修改意见。
```

### 模式自动切换规则

| 用户输入 | 模式 | 行为 |
|---------|------|------|
| `/stdd:apply` | 用户驱动 | 立即执行 apply |
| `/stdd:status` | 用户驱动 | 展示状态，不推进 |
| "实现登录" | Agent 驱动 | 从当前状态自动推进全流程 |
| "继续" / "下一步" | Agent 驱动 | 推进到下一个 Phase |
| "自动完成" | Agent 驱动 | 推进到下一个确认门 |
| "帮我看看项目状态" | Agent 驱动 | 读取状态后推荐下一步 |

**核心规则**：

1. `/stdd:` 命令优先级最高 — 用户明确指令立即执行
2. 自然语言触发 Agent 编排 — Agent 决定最优路径
3. 两种模式可随时切换 — 用户可以随时介入或退出编排

---

## 3. 双场景支持：Greenfield + Brownfield

Agent 根据项目目录状态自动选择场景。

### 场景 1：Greenfield（从 0 到 1）

**触发条件**：空目录或全新项目，用户执行 `stdd init` 后开始。

**行为**：初始化 → 技术栈交互 → 设计规范 → 标准工作流。

```
stdd init → 技术栈交互 (⚠️ 确认门) → DESIGN.md → new → propose → clarify → confirm → spec → plan → apply → verify → archive
```

#### Greenfield 初始化流程

**Step 1: `stdd init`** — 创建 `stdd/` 目录结构。

**Step 2: 技术栈交互 ⚠️ 确认门** — Agent 必须与用户对话确定：

| 维度 | 选项 | 影响 |
|------|------|------|
| 项目类型 | Web 应用 / CLI 工具 / API 服务 / 库 | 目录结构、入口文件 |
| 语言 | TypeScript / JavaScript / Python / Go / Rust | 测试框架、类型系统 |
| 前端框架 | React / Vue / Angular / Svelte / Next.js / 无前端 | DESIGN.md 生成、UI 命令 |
| 后端框架 | Express / FastAPI / Gin / Actix / 无后端 | API 规范、测试命令 |
| 测试框架 | Vitest / Jest / pytest / go test / cargo test | 测试命令解析 |
| 包管理器 | npm / yarn / pnpm | 安装命令、脚本 |
| 设计风格 | modern / dark / minimal | DESIGN.md 预设 |
| 数据库 | PostgreSQL / MySQL / SQLite / MongoDB / 无 | Schema、Migration |

**Step 3: 生成配置** — 更新 `stdd/config.yaml`：

```yaml
project:
  type: "web"
  language: "typescript"
  framework: "react"
  backend: "express"
  test_framework: "vitest"
  package_manager: "pnpm"
  design_preset: "modern"
  database: "postgresql"
```

**Step 4: 生成 DESIGN.md**（如有前端）。

**Step 5: 进入标准 STDD 工作流**。

#### 技术栈交互示例

```
Agent: ✅ STDD 已初始化。让我们确定技术栈。

       📋 请确认以下配置（直接回复"确认"使用推荐值，或逐项修改）：

       ┌─────────────────────────────────────────┐
       │ 🏷️  项目类型:   Web 应用 (推荐)           │
       │ 💻 语言:       TypeScript (推荐)          │
       │ 🎨 前端框架:    React + Vite (推荐)        │
       │ ⚙️  后端框架:    Express (推荐)            │
       │ 🧪 测试框架:    Vitest (推荐)              │
       │ 📦 包管理器:    pnpm (推荐)                │
       │ 🎨 设计风格:    modern (推荐)              │
       │ 🗄️  数据库:     PostgreSQL (推荐)         │
       └─────────────────────────────────────────┘

       你可以说：
       - "确认" → 使用推荐配置
       - "改为 Python + FastAPI" → 修改后端
       - "纯前端，不需要后端" → 移除外端
       - "用 Jest 代替 Vitest" → 修改测试框架

用户: "用 Next.js 代替 React + Vite，其他确认"

Agent: ✅ 已更新：前端框架: Next.js (用户指定)，其他保持推荐值
       📄 正在生成 DESIGN.md (modern 预设)...
       ✅ DESIGN.md 已生成
       🚀 技术栈配置完成，准备开始开发！
```

### 场景 2：Brownfield（接手已有项目）

**触发条件**：目录中已有代码（`src/`、`package.json` 等），但无 `stdd/` 配置。

**行为**：深度阅读 → 理解架构 → 用户交互确认意图 → 初始化 STDD → 按需修改。

```
┌─────────────────────────────────────────────────────────────┐
│                    Brownfield 工作流                          │
│                                                              │
│  Step 1: 深度阅读项目                                         │
│  ├── 读取 package.json → 了解技术栈                           │
│  ├── 读取目录结构 → 理解项目组织                               │
│  ├── 读取关键入口文件 → 理解核心逻辑                           │
│  └── 读取已有测试 → 了解测试覆盖                              │
│                                                              │
│  Step 2: 生成项目理解报告                                     │
│  ├── 技术栈总结                                               │
│  ├── 模块依赖图                                               │
│  ├── 已有测试覆盖情况                                         │
│  └── 潜在风险点                                               │
│                                                              │
│  Step 3: 与用户交互确认意图 ⚠️ 确认门                         │
│  ├── "我看到这是一个 React + Express 项目..."                  │
│  ├── "你想做什么修改？"                                       │
│  └── 确认修改范围和影响                                       │
│                                                              │
│  Step 4: 初始化 STDD                                          │
│  └── stdd init → 创建 stdd/ 目录结构                          │
│                                                              │
│  Step 5: 执行标准 STDD 工作流                                  │
│  └── new → propose → clarify → confirm → spec → plan          │
│      → apply → verify → archive                              │
└─────────────────────────────────────────────────────────────┘
```

### Brownfield 自动检测规则

| 检测条件 | 项目类型 | Agent 行为 |
|---------|---------|-----------|
| 有 `src/` 但无 `stdd/config.yaml` | Brownfield | 先阅读项目，再交互确认 |
| 有 `package.json` 但无 `stdd/config.yaml` | Brownfield | 先阅读项目，再交互确认 |
| 无任何代码文件 | Greenfield | 直接开始标准 STDD 工作流 |
| 有 `stdd/config.yaml` | 已初始化 | 根据状态推进工作流 |

### Brownfield 阅读清单

Agent 进入已有项目时，必须阅读以下内容：

```bash
# 1. 项目元信息
cat package.json                    # 技术栈、脚本、依赖
cat README.md                       # 项目说明
cat tsconfig.json 2>/dev/null       # TypeScript 配置（如有）

# 2. 项目结构
ls -la src/                         # 源码目录
find src -name "*.ts" -o -name "*.js" | head -30
find . -name "*.test.*" -o -name "*.spec.*" | head -20

# 3. 关键入口
cat src/index.ts 2>/dev/null || cat src/index.js 2>/dev/null || cat src/main.ts 2>/dev/null
cat src/App.tsx 2>/dev/null || cat src/App.jsx 2>/dev/null

# 4. 已有测试
cat jest.config.js 2>/dev/null || cat vitest.config.ts 2>/dev/null
npm test -- --listTests 2>/dev/null || npx vitest --list 2>/dev/null
```

### Brownfield 交互示例

```
用户: "帮我在这个项目里添加用户权限管理"

Agent: [自动检测到这是 Brownfield 项目]
       正在阅读项目...

       📊 项目理解报告
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       🏗️  技术栈:   React 18 + Express + PostgreSQL
       📁 模块:     src/components/ (12 个)
                   src/services/ (5 个)
                   src/api/ (3 个路由)
       🧪 测试:     23 个测试文件，覆盖率 ~65%
       🔑 入口:     src/index.tsx → src/App.tsx
       ⚠️  注意:    已有 auth middleware (src/api/middleware/auth.ts)
                   已有 User model (src/models/User.ts)
                   未检测到 DESIGN.md（前端设计规范缺失）
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

       💬 根据项目现状，我建议：
       1. 扩展已有 User model 添加角色字段
       2. 在 auth middleware 基础上增加权限检查
       3. 创建 PermissionGuard 组件用于前端路由守卫
       4. ⚠️ 建议先生成 DESIGN.md 统一前端设计规范

       ⚠️ 确认门: 以上理解是否正确？是否按此方向推进？
```

---

## 4. DESIGN.md 设计系统集成

STDD Copilot Ultra 集成了 [DESIGN.md](https://github.com/VoltAgent/awesome-design-md) 设计系统规范。`DESIGN.md` 是一个纯 Markdown 格式的设计系统文档，放置于项目根目录，AI Agent 读取后即可生成视觉一致的前端 UI。

### 内置设计预设

STDD 提供 3 套设计预设，Agent 根据项目类型自动选择或用户手动指定：

| 预设 | 风格名 | 主色调 | 字体 | 圆角 | 适用场景 |
|------|--------|--------|------|------|----------|
| `modern` | Modern SaaS | `#3B82F6` 蓝色 | Inter, system-ui | 4/8/12/16px | 企业应用、管理后台、SaaS |
| `dark` | Dark Developer | `#10B981` 绿色 | JetBrains Mono, Fira Code | 4/6/8/12px | 开发者工具、终端风格、IDE |
| `minimal` | Minimal Clean | `#000000` 黑白 | Georgia, serif | 全 0（无圆角） | 内容网站、文档站、极简风格 |

每套预设包含：
- **10 级 Neutral 灰度色阶**（gray-50 到 gray-900）
- **4 个语义色**：primary / secondary / success / warning / error
- **7 级间距系统**：xs(4px) / sm(8px) / md(16px) / lg(24px) / xl(32px) / 2xl(48px) / 3xl(64px)
- **5 级圆角**：sm / md / lg / xl / full(9999px)

### 自动检测与生成

Agent 在以下时机自动处理 DESIGN.md：

| 时机 | 行为 |
|------|------|
| Brownfield 项目检测到前端代码（React/Vue/Angular/Svelte/HTML）但无 DESIGN.md | 提示用户生成 |
| `stdd init` 检测到前端框架 | 自动生成 DESIGN.md |
| 用户说 "生成设计规范" 或执行 `stdd design` | 手动触发 |
| `stdd ui` 生成组件/页面时 | 自动读取 DESIGN.md 中的 Token |

### DESIGN.md 结构

| 章节 | 内容 |
|------|------|
| Visual Theme & Atmosphere | 视觉风格、密度、设计哲学 |
| Colors | 语义颜色 Token + 十六进制值 |
| Typography | 字体栈 + 9 级层级表 |
| Spacing | 7 级间距系统 |
| Border Radius | 5 级圆角 |
| Components | 按钮、输入框、卡片、导航 |
| Layout Principles | 最大宽度、网格、空白哲学 |
| Responsive Behavior | 断点、触摸目标、折叠策略 |
| Do's and Don'ts | 设计护栏和反模式 |
| Agent Prompt Guide | AI 快速参考和提示词 |

### CLI 命令

```bash
# 创建设计系统
stdd design create                          # 默认 modern 预设
stdd design create --preset modern          # Modern SaaS
stdd design create --preset dark            # Dark Developer
stdd design create --preset minimal         # Minimal Clean

# 查看与管理
stdd design show                            # 显示当前设计文档
stdd design check                           # 检查设计完整性
stdd design update                          # 更新设计文档
stdd design presets                         # 列出所有可用预设
stdd design preview                         # 生成预览 HTML

# 技术栈自动检测
stdd design --visual --workspace packages/web
```

### Design Token 输出示例

生成 DESIGN.md 后，UI 命令自动提取 Token 并转换为 CSS 自定义属性：

```css
:root {
  --color-primary: #3B82F6;
  --color-secondary: #6366F1;
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-error: #EF4444;
  --font-family-base: Inter, system-ui, -apple-system, sans-serif;
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
}
```

所有生成的 UI 组件和页面均引用这些 CSS 变量，通过更新 DESIGN.md 即可全局切换主题。

---

## 5. UI 生成能力

`/stdd:ui` 提供完整的前端 UI 代码生成，从 DESIGN.md 设计 Token 生成生产级组件和页面。

### 5.1 支持的前端框架

| 框架 | 页面 | 组件 | UI State | Scaffold | 样式输出 |
|------|------|------|----------|----------|----------|
| **React** / Next.js | `.jsx` | `.jsx` + `.css` | `.jsx` | ✅ | css / scss / tailwind / css-modules |
| **Vue** / Nuxt | `.vue` (SFC) | `.vue` (SFC) | `.vue` | ✅ | css / scss / tailwind / css-modules |
| **Angular** | `.component.ts` + `.html` + `.css` | 同左 | ✅ | ✅ | css / scss |
| **Svelte** | `.svelte` | `.svelte` | ✅ | ✅ | css / scss / tailwind |
| **Vanilla** HTML | `.html` | — | — | — | 内联 CSS |

框架自动检测逻辑（从 `package.json` 的 dependencies/devDependencies）：

```
next → @angular/core → svelte/@sveltejs/kit → vue/nuxt → react → vanilla
```

### 5.2 组件类型（8 种）

| 类型 | 说明 | 核心特性 |
|------|------|----------|
| `button` | 样式按钮 | primary / secondary / outline / danger 变体，loading 状态，disabled 支持 |
| `card` | 内容卡片 | header / body / footer 插槽，边框变体 |
| `form` | 表单容器 | submit handler，表单验证集成 |
| `input` | 输入框 | label + error state，`aria-invalid` + `aria-describedby` |
| `modal` | 弹窗对话框 | 焦点陷阱（focus trap），Escape 关闭，`role="dialog"` + `aria-modal` |
| `nav` | 响应式导航栏 | 移动端汉堡菜单，`aria-expanded` + `aria-controls`，`role="navigation"` |
| `table` | 数据表格 | 表头 + 行渲染，语义化 `<table>` 结构 |
| `list` | 列表组件 | 有序/无序，`aria-label` 标注 |

**所有组件均具备完整无障碍支持**：
- `aria-*` 属性（`aria-label`、`aria-invalid`、`aria-busy`、`aria-disabled`、`aria-hidden`、`aria-modal`、`aria-expanded`、`aria-controls`、`aria-describedby`）
- 语义化 `role`（`role="dialog"`、`role="navigation"`、`role="alert"`、`role="region"`、`role="menubar"`、`role="menuitem"`）
- 焦点管理（Modal 焦点陷阱、打开时聚焦、关闭后恢复焦点）
- `sr-only` 屏幕阅读器专用类

**所有模板均内置响应式设计**：
- 移动端优先，sm / md / lg / xl / 2xl 断点
- 触摸友好（最小 44px 触摸目标）
- 汉堡菜单折叠策略（Nav 组件）

### 5.3 页面类型（5 种）

| 页面类型 | 说明 | 典型 sections |
|---------|------|---------------|
| `landing` | 落地页 | hero / features / testimonials / pricing / cta |
| `dashboard` | 仪表板 | sidebar / header / main content / widgets |
| `auth` | 认证页 | login / register / forgot-password 变体 |
| `settings` | 设置页 | profile / security / notifications / billing |
| `pricing` | 定价页 | tiers / features comparison / cta |

### 5.4 UI 状态组件（6 种）

| 状态 | 说明 | 使用场景 |
|------|------|----------|
| `loading` | 加载中状态 | 数据请求、异步操作 |
| `empty` | 空状态 | 列表为空、无数据 |
| `error` | 错误状态 | 请求失败、异常处理 |
| `permission` | 权限不足 | 未授权访问 |
| `offline` | 离线状态 | 网络断开 |
| `success` | 成功状态 | 操作完成确认 |

### 5.5 Tailwind CSS 支持

通过 `--style tailwind` 生成使用真实 Tailwind utility class 的组件：

```bash
stdd ui component PrimaryButton --type button --style tailwind
stdd ui page dashboard --style tailwind
stdd ui scaffold --style tailwind
```

Tailwind 组件特性：
- 使用 `focus:ring-2`、`focus:ring-offset-2` 等真实 utility class
- 完整的 `aria-*` 无障碍属性
- 响应式断点（`sm:`、`md:`、`lg:` 前缀）
- 状态变体（`hover:`、`focus:`、`disabled:`）
- 深色模式支持（`dark:` 前缀）

### 5.6 CLI 命令一览

```bash
# 页面生成
stdd ui page <name>                                # 生成通用页面
stdd ui page <name> --type landing                 # 落地页
stdd ui page <name> --type dashboard               # 仪表板
stdd ui page <name> --type auth --auth-variant login  # 登录页
stdd ui page <name> --type settings                # 设置页
stdd ui page <name> --type pricing                 # 定价页
stdd ui page <name> --framework vue                # Vue 页面
stdd ui page <name> --framework angular            # Angular 页面
stdd ui page <name> --framework svelte             # Svelte 页面
stdd ui page <name> --layout sidebar               # 侧边栏布局
stdd ui page <name> --sections hero,features,cta   # 指定 sections
stdd ui page <name> --style tailwind               # Tailwind CSS

# 组件生成
stdd ui component <name> --type button             # 按钮组件
stdd ui component <name> --type card               # 卡片组件
stdd ui component <name> --type form               # 表单组件
stdd ui component <name> --type input              # 输入框组件
stdd ui component <name> --type modal              # 弹窗组件
stdd ui component <name> --type nav                # 导航组件
stdd ui component <name> --type table              # 表格组件
stdd ui component <name> --type list               # 列表组件

# UI 状态
stdd ui state <name> --type loading                # 加载状态
stdd ui state <name> --type empty                  # 空状态
stdd ui state <name> --type error                  # 错误状态
stdd ui state <name> --type permission             # 权限状态
stdd ui state <name> --type offline                # 离线状态
stdd ui state <name> --type success                # 成功状态

# 脚手架
stdd ui scaffold                                   # 全框架脚手架（自动检测）
stdd ui scaffold react                             # React 脚手架
stdd ui scaffold vue                               # Vue 脚手架
stdd ui scaffold angular                           # Angular 脚手架
stdd ui scaffold svelte                            # Svelte 脚手架

# 预览与管理
stdd ui preview                                    # 生成预览画廊（自动打开浏览器）
stdd ui list                                       # 列出所有已生成产物
stdd ui test <name>                                # 生成测试脚手架
stdd ui diff <name>                                # 视觉差异对比
```

### 5.7 输出目录结构

```
stdd/ui/
├── global.css                 # 全局 CSS（含 Design Token）
├── preview.html               # 预览画廊
├── pages/                     # 生成的页面
│   ├── Dashboard.jsx
│   ├── Login.vue
│   ├── Settings/              # Angular 分目录
│   │   ├── Settings.component.ts
│   │   ├── Settings.component.html
│   │   └── Settings.component.css
│   └── Index.svelte
├── components/                # 生成的组件
│   ├── Button.jsx
│   ├── Card.vue
│   ├── Input.svelte
│   └── Layout.jsx
├── states/                    # UI 状态组件
│   ├── LoadingState.jsx
│   ├── EmptyState.jsx
│   └── ErrorState.jsx
├── __tests__/                 # 测试脚手架
└── previews/                  # 视觉预览快照
```

---

## 6. Agent 编排协议

### Phase 过渡规则

Agent 在自主编排模式下**自动进入下一 Phase**，仅在确认门暂停：

| 当前 Phase | 完成条件 | 自动进入 |
|-----------|---------|---------|
| `/stdd:init` | config.yaml + 目录结构就绪 | 等待用户需求 → `/stdd:new` |
| `/stdd:new` | change 目录 + proposal.md 创建 | `/stdd:propose` |
| `/stdd:propose` | proposal.md 填写完毕 | `/stdd:clarify` |
| `/stdd:clarify` | 澄清问题全部回答 | `/stdd:confirm` ⚠️ 需用户确认 |
| `/stdd:confirm` | 用户确认通过 | `/stdd:spec` |
| `/stdd:spec` | BDD feature 文件生成 | `/stdd:plan` |
| `/stdd:plan` | tasks.md + design.md 生成 | `/stdd:apply`（逐个 task） |
| `/stdd:apply` | 当前 task 测试通过 | 下一个 task 或 `/stdd:verify` |
| `/stdd:verify` | 所有检查通过 | `/stdd:mutation` |
| `/stdd:mutation` | mutation score ≥ 阈值 | `/stdd:archive` ⚠️ 需用户确认 |
| `/stdd:archive` | 归档完成 | 等待新需求 |

### 进度汇报格式

每次 Phase 切换时：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Phase 2/7: 需求澄清 (clarify)
✅ 上一阶段: proposal 已生成 (stdd/changes/login/proposal.md)
🔜 下一阶段: 需求确认 (confirm) ⚠️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 确认门（Human-in-the-Loop）

仅在以下节点暂停，等待用户确认（**仅 Agent 驱动模式**）：

1. **`/stdd:confirm`** — 需求确认门。展示澄清结果，等待用户说 "确认" 或提出修改。
2. **`/stdd:archive`** — 归档确认门。展示验证结果，等待用户说 "归档"。
3. **连续失败 3 次** — 熔断。展示失败证据，请求用户决策。

### Constitution 门禁

9 篇条例在编排流程中自动执行：

| 优先级 | Article | 名称 | 执行时机 | 行为 |
|--------|---------|------|----------|------|
| **Blocking** | 2 | TDD（测试先行） | `stdd apply` Pre Hook | 阻断：无测试则不允许实现 |
| **Blocking** | 7 | Security（安全优先） | `stdd apply` Pre Hook | 頂断：检测到安全风险 |
| **Blocking** | 9 | CI/CD（自动化流水线） | CI 门禁 | 阻断：流水线检查不通过 |
| Warning | 1 | Library-First（优先使用成熟库） | Post Hook | 警告：建议使用成熟库 |
| Warning | 3 | Small Commits（原子提交） | Post Hook | 警告：提交过大 |
| Warning | 4 | Code Style（统一风格） | Pre Hook | 警告：风格不一致 |
| Warning | 6 | Error Handling（显式错误处理） | Post Hook | 警告：缺少错误处理 |
| Suggestion | 5 | Documentation（文档即代码） | Post Hook | 建议：补充文档 |
| Suggestion | 8 | Performance（性能默认） | Post Hook | 建议：性能优化 |

### Hook 检查流程

```
用户写入代码
     │
     ▼
┌─────────────────┐
│ PreToolUse Hook │
│ Article 2, 4, 7 │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
   PASS      FAIL → 阻断 + 错误提示
    │
    ▼
 执行写入操作
    │
    ▼
┌──────────────────┐
│ PostToolUse Hook │
│ Article 5, 6, 8  │
└────────┬─────────┘
         │
         ▼
   建议提示 (不阻断)
```

### Ralph Loop（TDD 循环）

```
┌──────────────────────────────────────────────────────────┐
│                    Ralph Loop                              │
│                                                            │
│  🔴 红灯       →    🔍 静态检查    →    🟢 绿灯           │
│  生成失败测试        语法/类型检查       最简实现           │
│                                                            │
│       →    🧪 Mutation Gate   →    🔵 重构    →    ✅ 完成 │
│           evidence/anti-fake-green   优化代码              │
│                                                            │
│  ⚠️ 容错机制:                                               │
│     失败 1 次 → 策略调整                                     │
│     失败 2 次 → 跨模型降级 (Opus→Sonnet / Full→Baby Step)   │
│     失败 3 次 → 🔴 熔断 + 自动回滚                          │
└──────────────────────────────────────────────────────────┘
```

**5 级防跑偏防御体系**：

1. **人机确认门** — 关键决策需人类确认（HITL 3 模式可配置）
2. **微任务隔离** — 5~6 个原子任务，降低上下文迷失
3. **连续失败回滚** — 4 阶段容错（策略调整 → 降级 → 熔断 → 回滚）
4. **静态质检门** — 语法/类型检查在测试前执行
5. **伪变异审查** — 通过 quick 启发式或 Stryker evidence 检测骗绿灯断言

---

## 7. Skill Graph 路径选择

根据用户意图和项目状态，自动选择对应的 Skill Graph 路径。Graph 引擎核心使用 DAG（有向无环图）编译 + 拓扑排序执行。

### 路径一览

| 意图 | 触发关键词 | Graph 路径 |
|------|-----------|-----------|
| **新功能** (feature) | "实现xx"、"开发xx" | `ff → spec → plan → apply → mutation → verify → archive` |
| **快速修复** (hotfix) | "修复xx bug"、"紧急修复" | `issue → fix-packet → apply → verify → archive` |
| **探索分析** (explore) | "分析xx"、"可行性研究" | `explore → brainstorm → final-doc` |
| **一键全流程** (turbo) | "快速开发xx"、"turbo" | `turbo`（全阶段自动串行，仅确认门暂停） |

### Graph 运行时模块

| 模块 | 职责 | 源文件 |
|------|------|--------|
| Dynamic Router | 意图自适应拓扑裁剪 | `src/utils/dynamic-router.js` |
| Graph Cache | DAG 幂等断点缓存（SHA256 指纹） | `src/utils/graph-cache.js` |
| Evidence Capture | 结构化错误证据采集 | `src/utils/evidence-capture.js` |
| Error Propagator | 多跳向上传播 + 决策点定位 | `src/utils/error-propagator.js` |
| Heterogeneous Adapter | 异构引擎适配 + Tier 降级链 | `src/utils/heterogeneous-adapter.js` |
| Parallel Executor | DAG 分层并行执行（Kahn's 算法） | `src/utils/parallel-executor.js` |

### 异构并行执行

```
DAG 拓扑分层 (Kahn's Algorithm)
     │
     ▼
Layer 0: [stdd-propose] ←── HeterogeneousAdapter 分配引擎
     │
Layer 1: [stdd-spec]
     │
Layer 2: [stdd-plan]
     │
Layer 3: [stdd-apply]
     │
Layer 4: [stdd-mutation, stdd-validate, stdd-contract] ←── 同层并行
     │
     ▼
结果聚合 + 文件冲突检测
```

### 反向自愈流程

```
节点执行失败
     │
     ▼
EvidenceCapture 截取证据
     │
     ▼
ErrorPropagator 多跳传播 ──→ 寻找决策点（planning/gate/扇出）
     │                            │
     │                     找到决策点
     │                            │
     ▼                            ▼
  部分缓存清理 ←──── 注入证据链到策划节点
     │
     ▼
策划节点回炉重造 → 重新执行下游
```

### AI 引擎适配（4 Tier）

| Tier | 引擎 | 兼容等级 |
|------|------|----------|
| **Tier 1** | Claude Code, Cursor, Windsurf | 完整适配（Skill 模板 + CLI + Hook） |
| **Tier 2** | Copilot, Aider, Cline, Continue, Amazon Q | 高兼容（CLI + 部分 Skill） |
| **Tier 3** | Qwen, Doubao, Baidu, Gemini, Codex, Devin, Sweep | 基础支持（CLI） |
| **Tier 4** | Augment, PearAI, Melty, Ellipsis, Bolt, Cody, Tabnine | 实验性 |

完整引擎注册见 `stdd/config/engines.yaml`（22 个引擎）。

### Graph CLI 命令

```bash
# 可视化
stdd graph visualize                        # Mermaid 格式
stdd graph visualize --format=html          # HTML 交互式
stdd graph visualize --output=graph.svg     # SVG 输出

# 分析
stdd graph analyze                          # 状态分析
stdd graph analyze --paths                  # 路径分析
stdd graph analyze --bottlenecks            # 瓶颈分析

# 执行
stdd graph run stdd-spec                    # 从 spec 阶段开始
stdd graph run --full                       # 全流程执行
stdd graph run --skip-completed             # 跳过已完成
stdd graph run --dry-run                    # 预览执行计划

# 并行
stdd graph parallel --detect                # 检测可并行任务
stdd graph parallel --execute               # 执行并行任务
stdd graph parallel --max-workers=4         # 指定并行度

# 历史
stdd graph history                          # 全部历史
stdd graph history --last=10                # 最近 10 次
stdd graph history --failures               # 仅失败记录

# 重放
stdd graph replay <exec-id>                 # 重放执行
stdd graph replay <exec-id> --re-execute    # 重新执行

# 推荐
stdd graph recommend                        # 基于状态推荐下一步
stdd graph recommend --goal="Complete auth" # 目标驱动推荐
```

---

## 8. 上下文感知与推荐引擎

### 推荐引擎

当不确定下一步时，调用推荐引擎：

```bash
stdd recommend                   # 基于项目状态推荐下一步
stdd recommend --json            # JSON 格式输出
stdd graph recommend             # Graph 引擎推荐
stdd graph recommend --goal="..." # 目标驱动推荐
```

推荐引擎分析维度：
- 当前活跃变更状态
- 已完成和待完成的 Phase
- 项目技术栈特征
- Constitution 合规状态
- 测试覆盖率和 mutation evidence

### 三层上下文架构

```
Foundation (~500 tokens)  ─── 项目基础约束、技术栈
Component  (~1000 tokens) ─── 组件架构、模块依赖
Feature    (~2000 tokens) ─── 当前功能需求、变更上下文
```

```bash
stdd context                     # 显示所有层
stdd context foundation          # 显示基础层
stdd context --export            # 导出上下文
stdd context --json              # JSON 格式
```

### 规划深度配置文件（Profile）

Profile 系统根据复杂度和置信度自动适配规划深度：

| Profile | 深度 | 最大任务数 | 测试阈值 | 适用场景 |
|---------|------|-----------|----------|----------|
| `quick` | 1 | 3 | 80% | Bugfix / Hotfix |
| `standard` | 2 | 6 | 90% | 普通功能 |
| `thorough` | 3 | 9 | 95% | 复杂功能 / 架构变更 |
| `enterprise` | 4 | 12 | 98% | 跨切面 / 合规需求 |

```bash
stdd profile detect                          # 自动检测 Profile
stdd profile set standard                    # 手动设置
stdd profile list                            # 列出所有 Profile
stdd profile recommend                       # 检测 + 推荐阶段配置
stdd profile recommend --change feature      # 针对变更类型推荐
```

检测逻辑：
- 读取 `stdd/reports/complexity.json` 获取复杂度分数
- 读取 `stdd/memory/certainty-history.jsonl` 获取置信度分数
- 变更类型覆盖：`hotfix → quick`、`feature → standard`、`refactor → thorough`、`compliance → enterprise`

### 进度追踪与断点续传

```bash
stdd progress                    # 查看进度
stdd progress --summary          # 进度概览
stdd progress --resume           # 从上次断点恢复
stdd progress --last 10          # 最近 10 条
stdd progress --clear            # 清除进度
```

特性：
- **JSONL 持久化**：进度日志写入 `stdd/progress.jsonl`
- **信号捕获**：捕获 `SIGINT`/`SIGTERM` 信号，记录中断状态
- **四态记录**：`start` / `complete` / `fail` / `interrupt`
- **断点续传**：`stdd progress --resume` 从最后中断点恢复

### 记忆系统

```bash
stdd memory scan                             # 扫描并索引
stdd memory search "<query>"                 # 语义搜索
stdd memory add "<content>"                  # 添加记忆
stdd memory list                             # 列出所有记忆
stdd memory status                           # 统计信息
stdd memory export                           # 导出记忆
stdd memory import                           # 导入记忆
```

记忆存储于 `stdd/memory/`，包含：
- `foundation.md` — 项目基础约束
- `components.md` — 组件架构
- `contracts.md` — 接口契约
- `arch-evolution.md` — 架构演进日志

---

## 9. 错误恢复

### 3 级容错机制

```
失败 1 次 → 分析错误，调整策略后重试
失败 2 次 → 生成 fix-packet，尝试降级策略
失败 3 次 → 🔴 熔断，向用户汇报完整证据链
```

### Fix Packet（Golden Packet）

当 `/stdd:apply` 失败时，自动生成修复上下文包：

```bash
stdd fix-packet <change-id>                      # 生成修复包
stdd fix-packet <change-id> --task TASK-001       # 特定任务
stdd fix-packet <change-id> --full-source         # 包含完整源码
stdd fix-packet <change-id> --workspace packages/api  # 工作区作用域
```

Fix Packet 自动采集：
1. 失败任务信息（从 tasks.md）
2. 测试输出（从 apply.log 或实时运行）
3. Spec 摘要（从 specs/）
4. Design 摘要（从 design.md）
5. 源码片段
6. 错误消息和堆栈跟踪
7. 失败历史

输出：
- `stdd/changes/<change-id>/evidence/fix-packet-*.md`（Markdown 格式）
- `stdd/changes/<change-id>/evidence/fix-packet-*.json`（JSON 格式）

### 熔断器（Circuit Breaker）

连续失败 3 次触发熔断：

```
🔴 熔断触发
     │
     ▼
生成完整证据链报告
     │
     ▼
向用户展示失败摘要 + 可能原因 + 修复建议
     │
     ▼
等待用户决策：
  a) 手动修复后重试
  b) 降级策略（Baby Steps）
  c) 跳过当前任务
  d) 中止变更
```

### 跨模型降级

```
失败 2 次 → 自动降级：
  - Opus → Sonnet（降低推理层级）
  - Full → Baby Steps（分解为更小步骤）
  - 独立任务 → 串行执行（关闭并行）
```

---

## 10. 辅助功能（按上下文自动调用）

| 场景 | 自动调用 | 说明 |
|------|---------|------|
| 代码完成后 | `/stdd:guard` | TDD 守护钩子 + Anti-Bypass 防绕过 |
| 验证前 | `/stdd:mutation` | 变异测试 evidence（quick 启发式 / Stryker 委托） |
| 有 API 需求 | `/stdd:api-spec` | OpenAPI / TypeScript 规范生成 |
| 有类型需求 | `/stdd:schema` | JSON Schema / Zod 类型生成 |
| 有 API 契约 | `/stdd:contract` | 消费者驱动契约测试（5 种消息模式） |
| 需要 Mock | `/stdd:mock` | 自动 Mock 生成 |
| 需要测试数据 | `/stdd:factory` | 测试数据工厂（Builder / Faker / Nested Fixture） |
| 归档前 | `/stdd:constitution check` | 合规检查 |
| 定期（每 5 个 task） | `/stdd:metrics` | 质量指标仪表板 |
| 规格完成后 | `/stdd:validate` | 规范一致性验证 + Spec Guardian |
| 多角度分析 | `/stdd:brainstorm` | 纯分析建议模式 |
| 需求不清晰 | `/stdd:clarify` | 78 种结构化推理方法 |
| 复杂度评估 | `/stdd:complexity` | APP Mass 代码质量计算 |
| 置信度评估 | `/stdd:certainty` | 5 维度置信度评分 |

---

## 11. Turbo 模式

当用户使用 "快速"、"一键"、"turbo" 等关键词，或需求非常明确时，启用 Turbo 模式。

### 触发方式

```bash
# CLI
stdd turbo "添加用户登录功能"
stdd turbo "修复登录bug" --no-spec
stdd turbo "添加支付" --workspace packages/api
stdd turbo "添加用户登录" --strategy full-auto
stdd turbo "添加用户登录" --strategy hitl-confirm
stdd turbo "添加用户登录" --strategy hitl-apply
stdd turbo resume <change-id>              # 恢复中断的 turbo

# Slash 命令
/stdd:turbo <需求描述>
```

### Turbo 流程

```
需求
  │
  ▼
┌─────────────┐
│  Fast-Forward│  (ff)
└─────────────┘
  │
  ▼
┌─────────────┐
│  Spec 校验  │  (spec)
└─────────────┘
  │
  ▼
┌─────────────┐
│  TDD Scaffold│ (plan)
└─────────────┘
  │
  ▼
┌─────────────┐
│  可选 Apply │  (execute)
└─────────────┘
  │
  ▼
┌─────────────┐
│  Mutation   │  (mutation)
└─────────────┘
  │
  ▼
┌─────────────┐
│  Verify     │  (verify)
└─────────────┘
```

### HITL 策略

| 策略 | 暂停点 | 适用场景 |
|------|--------|----------|
| `full-auto` | 仅在门禁暂停 | 小变更，需求明确 |
| `hitl-confirm` | 需求确认时暂停 | 中等变更，需确认理解 |
| `hitl-apply` | 需求 + 实现确认时暂停 | 大变更，需双重确认 |

### 多语言支持

Turbo 自动适配测试框架和工具链：

| 语言 | 测试框架 | 配置工具 |
|------|---------|---------|
| TypeScript / JavaScript | Jest / Vitest | ESLint |
| Python | pytest | Black / flake8 |
| Java | JUnit | Checkstyle |
| Go | testing | gofmt |
| Rust | 内置测试 | rustfmt |

---

## 12. 完整能力清单

### SDD & TDD 核心流程

```
/stdd:init /stdd:new /stdd:propose /stdd:clarify /stdd:confirm
/stdd:spec /stdd:plan /stdd:apply /stdd:execute /stdd:verify /stdd:archive
```

| 命令 | 说明 |
|------|------|
| `stdd init` | 项目初始化，创建 `stdd/` 目录结构 |
| `stdd new <name>` | 创建新变更 |
| `stdd propose` | 需求提案 |
| `stdd clarify` | 需求澄清（78 种推理方法） |
| `stdd confirm` | 需求确认门 ⚠️ |
| `stdd spec` | 生成 BDD 规格 + Test Pipeline |
| `stdd plan` | 任务微隔离拆解 + ADR 记录 |
| `stdd apply` | 选择微任务执行（TDD 红灯→绿灯→重构） |
| `stdd execute` | Ralph Loop TDD 执行 |
| `stdd verify` | 验证阶段（evidence 采集） |
| `stdd archive` | Delta Spec Merge，归档变更 ⚠️ |

### 工作流增强

```
/stdd:ff /stdd:continue /stdd:explore /stdd:turbo /stdd:brainstorm /stdd:issue
/stdd:adapt /stdd:start /stdd:baby-steps /stdd:story
```

| 命令 | 说明 |
|------|------|
| `stdd ff` | Fast Forward 快速推进 |
| `stdd continue` | 继续上一次未完成的变更 |
| `stdd explore` | 探索性分析 |
| `stdd turbo` | 一键全流程（详见 [第 11 节](#11-turbo-模式)） |
| `stdd brainstorm` | 多角度分析建议 |
| `stdd issue` | Bug TDD 修复流程 |
| `stdd adapt` | 自适应策略调整 |
| `stdd start` | 快速开始向导 |
| `stdd baby-steps` | 极小步骤执行（降级策略） |
| `stdd story` | Story Mapping，生成 journey YAML + BDD feature |

### SDD 增强

```
/stdd:api-spec /stdd:schema /stdd:contract /stdd:validate
/stdd:spec-generator /stdd:pipeline
```

| 命令 | 说明 |
|------|------|
| `stdd api-spec` | OpenAPI / TypeScript API 规范生成 |
| `stdd schema` | JSON Schema / Zod 类型生成，支持自定义 Workflow DAG |
| `stdd contract` | 消费者驱动契约测试（5 种消息模式） |
| `stdd validate` | 规范一致性验证 + 3D 验证 + Spec Guardian |
| `stdd spec-generator` | 规格生成器 |
| `stdd pipeline` | 从 specs 生成 parser IR 和 acceptance test seeds |

### TDD 增强

```
/stdd:outside-in /stdd:mutation /stdd:mock /stdd:factory
/stdd:mock-gen /stdd:tdd-init
```

| 命令 | 说明 |
|------|------|
| `stdd outside-in` | E2E → 集成 → 单元 层层推进 |
| `stdd mutation` | 变异测试 evidence（quick 启发式 / Stryker 委托） |
| `stdd mock` | 自动 Mock 生成 |
| `stdd factory` | 测试数据工厂（Builder / Faker / Nested Fixture） |
| `stdd mock-gen` | Mock 代码生成 |
| `stdd tdd-init` | TDD 环境初始化 |

### 质量门禁

```
/stdd:guard /stdd:constitution /stdd:hooks /stdd:audit
/stdd:depcheck /stdd:waiver-manager
```

| 命令 | 说明 |
|------|------|
| `stdd guard` | TDD 守护钩子 + Anti-Bypass 防绕过 + coverage report-aware 门禁 |
| `stdd constitution` | 9 篇条例管理 + 豁免机制（`waivers.yaml`） |
| `stdd hooks` | Pre/Post ToolUse Hook 管理 |
| `stdd audit` | 聚合 compliance / top violations / riskiest files / workspace breakdown |
| `stdd depcheck` | 依赖检查 |
| `stdd waiver-manager` | 豁免记录管理 |

### Graph 引擎

```
/stdd:graph /stdd:graph-run /stdd:graph-history
```

| 命令 | 说明 |
|------|------|
| `stdd graph` | 可视化 / 分析 / 并行 / 历史 / 重放 / 推荐 |
| `stdd graph run` | DAG 编排执行入口（feature / hotfix / repair / research 意图） |
| `stdd graph history` | 执行历史追踪 |

### 设计与 UI 生成

```
/stdd:design /stdd:ui
```

| 命令 | 说明 |
|------|------|
| `stdd design` | DESIGN.md 视觉设计系统 + 技术设计文档（详见 [第 4 节](#4-designmd-设计系统集成)） |
| `stdd ui` | UI 组件 / 页面 / 状态 / 脚手架 / 预览（详见 [第 5 节](#5-ui-生成能力)） |

### 生成与预览

```
/stdd:builder /stdd:modules /stdd:dashboard /stdd:docs /stdd:profile
```

| 命令 | 说明 |
|------|------|
| `stdd builder` | 自定义 Agent / 工作流 / Skill 构建器（create / list / validate / share / export） |
| `stdd modules` | 模块市场管理（list / install / info / uninstall / registry） |
| `stdd dashboard` | 项目健康仪表板（静态 HTML，generate / open / serve） |
| `stdd docs` | 文档站点生成（静态 HTML，Astro + Starlight 风格，generate / serve） |
| `stdd profile` | 规划深度配置文件（detect / set / list / recommend，详见 [第 8 节](#8-上下文感知与推荐引擎)） |

### 协作与文档

```
/stdd:commit /stdd:final-doc /stdd:prp /stdd:supervisor
/stdd:context /stdd:iterate /stdd:memory /stdd:parallel /stdd:roles
/stdd:product-proposal /stdd:vision /stdd:docs
```

| 命令 | 说明 |
|------|------|
| `stdd commit` | 原子化提交（red: / green: / refactor: 前缀），支持 `--tdd` / `--phase` / `--issue` |
| `stdd final-doc` | 生成最终文档 |
| `stdd prp` | What / Why / How / Success 规划 |
| `stdd supervisor` | Supervisor 多 Agent 协调 |
| `stdd context` | 三层文档架构加载（Foundation / Component / Feature） |
| `stdd iterate` | Plan-Execute-Reflect 循环 |
| `stdd memory` | 向量数据库语义搜索（save / search / stats / scan / list） |
| `stdd parallel` | DAG 并行执行 |
| `stdd roles` | 12 Agent 角色协作（4 基础 + 8 专用，含对抗式审查） |
| `stdd product-proposal` | 聚合所有产物生成 15 章产品方案报告 |
| `stdd vision` | 项目愿景文档管理 |

### 12 Agent 角色

| 类型 | 角色 | 职责 |
|------|------|------|
| **基础** | PO (Product Owner) | 需求定义、优先级排序 |
| **基础** | Developer | 代码实现、重构 |
| **基础** | Tester | 测试编写、质量保障 |
| **基础** | Reviewer | 代码审查（含对抗式审查） |
| **专用** | Architect | 架构决策、ADR 记录 |
| **专用** | Security | 安全审计、漏洞检测 |
| **专用** | DevOps | CI/CD、部署策略 |
| **专用** | UX | 用户体验、交互设计 |
| **专用** | BA (Business Analyst) | 业务分析、流程建模 |
| **专用** | Tech Writer | 技术文档、API 文档 |
| **专用** | QA Lead | 测试策略、质量规划 |
| **专用** | Data Analyst | 数据分析、指标监控 |

### 评估与学习

```
/stdd:metrics /stdd:learn /stdd:certainty /stdd:complexity
```

| 命令 | 说明 |
|------|------|
| `stdd metrics` | 质量指标仪表板 |
| `stdd learn` | 自适应学习 + Pattern Teaching（提取命名/模块/测试风格） |
| `stdd certainty` | 5 维度置信度评分 |
| `stdd complexity` | APP Mass 代码质量计算 |

### 测试与运维

```
/stdd:user-test /stdd:ci /stdd:ci-generator /stdd:browser
/stdd:depcheck /stdd:doctor /stdd:fix-packet /stdd:mutation
```

| 命令 | 说明 |
|------|------|
| `stdd user-test` | 双模式测试（Human think-aloud script + AI agent script） |
| `stdd ci` | CI/CD 集成 |
| `stdd ci-generator` | CI 配置生成 |
| `stdd browser` | 浏览器测试 |
| `stdd depcheck` | 依赖检查 |
| `stdd doctor` | 环境诊断 |
| `stdd fix-packet` | 失败任务修复上下文包（详见 [第 9 节](#9-错误恢复)） |

### 运行时引擎

```
/stdd:runtime
```

| 子命令 | 说明 |
|--------|------|
| `stdd runtime agent start <topic>` | 启动 Party Mode 多 Agent 模拟 |
| `stdd runtime agent next` | 推进一轮辩论 |
| `stdd runtime agent stop` | 停止模拟 |
| `stdd runtime agent run --role <r>` | 单 Agent 执行 |
| `stdd runtime sudo <file>` | SudoLang 伪代码解析 |
| `stdd runtime sudo <file> --generate` | 解析并生成 STDD 产物 |

**Party Mode 收敛机制**：
- 关键词检测
- 结构化三信号：参与度覆盖、内容稳定性 Jaccard、全体一致投票

**SudoLang 解析器**：将 Sudo 伪代码解析为 STDD 结构化产物（Spec / Design / API）。

### 辅助工具

```
/stdd:help /stdd:status /stdd:list /stdd:recommend /stdd:skills
/stdd:commands /stdd:workspace /stdd:extensions /stdd:progress
/stdd:stdd-init /stdd:starters /stdd:update /stdd:hooks
/stdd:elicitation /stdd:confirm
```

| 命令 | 说明 |
|------|------|
| `stdd help` | 上下文感知帮助系统 |
| `stdd status` | 变更状态查看 |
| `stdd list` | 列出所有变更 |
| `stdd recommend` | 智能推荐下一步 |
| `stdd skills` | Skill 列表与详情 |
| `stdd commands` | 命令列表与详情 |
| `stdd workspace` | Monorepo 工作区管理（list / validate / repair） |
| `stdd extensions` | 本地扩展市场 |
| `stdd progress` | 实时进度追踪 + 断点续传 |
| `stdd starters` | 5 种语言 Starter（TS / JS / Python / Go / Rust） |
| `stdd update` | STDD 自更新 |
| `stdd elicitation` | 需求引导 |

### Workspace / Monorepo 支持

```bash
stdd workspace list                           # 列出工作区
stdd workspace validate                       # 验证一致性
stdd workspace repair                         # 修复注册

# --workspace 作用域
stdd apply <change> --workspace packages/api
stdd mutation <change> --workspace packages/api
stdd verify <change> --workspace packages/api
stdd graph run --workspace packages/web
```

---

## 附录：存储架构

```
stdd/
├── changes/                    # 变更管理
│   ├── <change-name>/          # 活跃变更
│   │   ├── .state.yaml         # 持久计划状态
│   │   ├── proposal.md         # 需求提案
│   │   ├── specs/              # Delta Specs
│   │   ├── design.md           # 设计文档
│   │   ├── tasks.md            # 任务列表
│   │   ├── arch-decisions.md   # ADR 记录
│   │   ├── implementation_log.md
│   │   └── evidence/           # 证据文件
│   └── archive/                # 归档变更
├── specs/                      # BDD 规格文件（Source of Truth）
├── memory/                     # 持久化记忆
├── graph/                      # Skill Graph 配置
│   ├── skills.yaml             # 53 Skills 节点定义
│   ├── config.json             # 引擎配置
│   ├── conditions.json         # 条件引擎配置
│   └── cache/                  # DAG 幂等执行缓存
├── config/                     # 配置文件
│   └── engines.yaml            # 22 个 AI 引擎注册
├── templates/                  # 模板系统
│   ├── starters/               # 5 种语言 Starter
│   ├── docs-site/              # Astro+Starlight 文档站点
│   └── devcontainer/           # DevContainer 配置
├── ui/                         # UI 生成产物
│   ├── pages/                  # 页面组件
│   ├── components/             # UI 组件
│   ├── states/                 # UI 状态组件
│   ├── global.css              # 全局 CSS（Design Token）
│   └── preview.html            # 预览画廊
├── presets/                    # 预设配置（react / express / fastapi）
├── extensions/                 # 扩展系统 + Marketplace
├── builders/                   # 自定义构建产物（agents / workflows / skills）
├── exports/                    # 构建器导出产物
├── runtime/                    # 核心运行时引擎（Party Mode / SudoLang）
├── reporters/                  # 测试报告器（vitest / jest / pytest / go / rust / php）
├── evidence/                   # 全局证据
├── dashboard/                  # 项目仪表板（静态 HTML）
├── docs-site/                  # 文档站点静态输出
├── profile/                    # 规划配置文件
├── history/                    # 执行历史
├── constitution/               # Constitution 豁免管理
│   ├── waivers.yaml
│   └── .waivers.lock
├── progress.jsonl              # 实时进度日志（断点续传）
└── config.yaml                 # 项目主配置
```
