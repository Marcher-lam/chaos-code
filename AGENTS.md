# STDD Copilot - AI Agent Instructions

> Version: 2.1 | Last Updated: 2026-05-14

---

## 全部能力入口 (45 个 = 20 Command 模板 + 38 Skill 模板，去重后)

### Command 模板入口 (20)
- `/stdd:init` `/stdd:new` `/stdd:propose` `/stdd:clarify` `/stdd:confirm`
- `/stdd:spec` `/stdd:plan` `/stdd:apply` `/stdd:execute` `/stdd:verify` `/stdd:archive`
- `/stdd:final-doc` `/stdd:brainstorm` `/stdd:issue` `/stdd:constitution`
- `/stdd:ff` `/stdd:continue` `/stdd:explore` `/stdd:graph` `/stdd:turbo`

---

## 双模式设计：用户交互 + Agent 自主编排

STDD Copilot 支持 **两种并行模式**，Agent 根据用户输入自动选择：

### 模式 A：用户交互模式 (User-Driven)

**触发条件**：用户明确输入 `/stdd:` 斜杠命令

**行为**：
- 立即执行用户指定的命令，不做额外编排
- 执行完成后汇报结果
- 如果当前项目状态与命令不匹配，**友好提示**下一步建议，但**不强制推进**

```
用户: /stdd:apply
Agent: ✅ 执行 TASK-003...
       💡 提示: 当前还有 2 个待完成任务，完成后可以 /stdd:verify
```

### 模式 B：Agent 自主编排模式 (Agent-Driven)

**触发条件**：用户通过自然语言描述需求（非 `/stdd:` 命令），或明确说 "自动推进"/"继续"

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
| `/stdd:apply` | 用户交互 | 立即执行 apply |
| `/stdd:status` | 用户交互 | 展示状态，不推进 |
| "实现登录" | 自主编排 | 从当前状态自动推进全流程 |
| "继续" / "下一步" | 自主编排 | 推进到下一个 Phase |
| "自动完成" | 自主编排 | 推进到下一个确认门 |
| "帮我看看项目状态" | 自主编排 | 读取状态后推荐下一步 |

**核心规则**：
1. `/stdd:` 命令优先级最高 — 用户明确指令立即执行
2. 自然语言触发自主编排 — Agent 决定最优路径
3. 两种模式可随时切换 — 用户可以随时介入或退出编排

---

## 双场景支持：从0到1 + 接手已有项目

STDD Copilot 支持 **两种项目场景**，Agent 根据项目状态自动选择：

### 场景 1：从 0 到 1（Greenfield）

**触发条件**：空目录或全新项目，用户执行 `stdd init` 后开始

**行为**：初始化 → 技术栈交互 → 设计规范 → 标准工作流

```
stdd init → 技术栈交互 (⚠️ 确认门) → DESIGN.md → new → propose → clarify → confirm → spec → plan → apply → verify → archive
```

#### Greenfield 初始化流程详解

**Step 1: `stdd init`** — 创建目录结构

**Step 2: 技术栈交互 ⚠️ 确认门** — Agent 必须与用户对话确定：

| 维度 | 选项 | 影响 |
|------|------|------|
| 项目类型 | Web 应用 / CLI 工具 / API 服务 / 库 | 目录结构、入口文件 |
| 语言 | TypeScript / JavaScript / Python / Go / Rust | 测试框架、类型系统 |
| 前端框架 | React / Vue / Next.js / 无前端 | DESIGN.md 生成、测试命令 |
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

**Step 4: 生成 DESIGN.md**（如有前端）

**Step 5: 进入标准 STDD 工作流**

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

       推荐理由: TypeScript 提供类型安全，React 生态成熟，
       Vite 构建快速，Vitest 与 Vite 深度集成。

       你可以说：
       - "确认" → 使用推荐配置
       - "改为 Python + FastAPI" → 修改后端
       - "纯前端，不需要后端" → 移除外端
       - "用 Jest 代替 Vitest" → 修改测试框架

用户: "用 Next.js 代替 React + Vite，其他确认"

Agent: ✅ 已更新：
       前端框架: Next.js (用户指定)
       其他保持推荐值
       
       📄 正在生成 DESIGN.md (modern 预设)...
       ✅ DESIGN.md 已生成
       
       🚀 技术栈配置完成，准备开始开发！
       请描述你想实现的功能。
```

### 场景 2：接手已有项目（Brownfield）

**触发条件**：目录中已有代码（src/、package.json 等），但无 `stdd/` 配置

**行为**：深度阅读 → 理解架构 → 用户交互确认意图 → 初始化 STDD → 按需修改

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
find src -name "*.ts" -o -name "*.js" | head -30  # 源文件列表
find . -name "*.test.*" -o -name "*.spec.*" | head -20  # 测试文件

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
       回复 "确认" 继续，或提出修改意见。
```

---

## 前端设计能力：DESIGN.md

STDD Copilot 集成了 Google Stitch 的 [DESIGN.md](https://github.com/VoltAgent/awesome-design-md) 设计系统规范。

### 什么是 DESIGN.md

`DESIGN.md` 是一个纯文本设计系统文档，AI Agent 读取后即可生成一致的前端 UI。它是前端项目的"视觉宪法"。

**核心原则**：
- 纯 Markdown 格式，AI 无需解析 Figma 或 JSON
- 定义颜色、字体、间距、组件样式、响应式行为
- 放在项目根目录，AI 编码助手自动读取

### 内置设计预设

STDD 提供 3 套设计预设，Agent 根据项目类型自动选择：

| 预设 | 风格 | 适用于 |
|------|------|--------|
| `modern` | 蓝色主调 SaaS 风格 | 企业应用、管理后台 |
| `dark` | 暗色主题、绿色点缀 | 开发者工具、终端风格 |
| `minimal` | 极简黑白、精确排版 | 内容网站、文档站 |

### 自动检测与生成

Agent 在以下时机自动处理 DESIGN.md：

1. **Brownfield 项目** — 检测到前端代码（React/Vue/HTML）但无 DESIGN.md → 提示用户生成
2. **新项目** — `stdd init` 检测到前端框架 → 自动生成
3. **手动触发** — 用户说 "生成设计规范" 或 `stdd design`

```
用户: "帮我创建一个 React 管理后台"

Agent: [检测到前端项目，无 DESIGN.md]
       建议使用 modern 预设生成设计规范...
       ✅ DESIGN.md 已生成，包含:
          🎨 10 个语义颜色 Token
          📝 9 级字体层级
          📐 7 级间距系统
          🧩 按钮/输入框/卡片/导航组件
          📱 3 个响应式断点
```

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

---

## Agent 自主编排协议

### Phase 过渡规则

当在自主编排模式下，Agent **自动进入下一 Phase**，仅在确认门暂停：

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

### 暂停确认规则（Human-in-the-Loop）

仅在以下节点暂停，等待用户确认（**仅自主编排模式**）：

1. **`/stdd:confirm`** — 需求确认门。展示澄清结果，等待用户说 "确认" 或提出修改
2. **`/stdd:archive`** — 归档确认门。展示验证结果，等待用户说 "归档" 
3. **连续失败 3 次** — 熔断。展示失败证据，请求用户决策

---

## Skill Graph 路径选择

根据用户意图和项目状态，自动选择对应的 Skill Graph 路径：

### 新功能开发（默认，从0到1）
```
init → new → propose → clarify → confirm → spec → plan → apply → verify → archive
```

### 接手已有项目（Brownfield）
```
探索阅读 → 理解报告 → 用户确认 → init → new → propose → clarify → confirm → spec → plan → apply → verify → archive
```

### 快速修复（用户说 "修复xx bug"）
```
init → issue → apply → verify → archive
```

### 一键全流程（用户说 "快速开发xx"）
```
turbo（自动完成所有阶段，仅在最终确认时暂停）
```

### 探索分析（用户说 "分析xx可行性"）
```
explore → brainstorm → final-doc
```

---

## 上下文感知

### 读取变更状态

在执行任何操作前，先读取当前变更状态：

```bash
stdd status          # 查看所有变更
stdd status <name>   # 查看特定变更
cat stdd/changes/<name>/tasks.md  # 查看任务进度
```

### 使用推荐引擎

当不确定下一步时，调用：

```bash
stdd recommend       # 获取下一步推荐
stdd graph recommend # Graph 引擎推荐
```

---

## 错误恢复

### 自动重试

```
失败 1 次 → 分析错误，调整策略后重试
失败 2 次 → 读取 fix-packet，尝试降级策略
失败 3 次 → 🔴 熔断，向用户汇报完整证据链
```

### Fix Packet 使用

当 `/stdd:apply` 失败时，自动读取：

```bash
stdd fix-packet <change>  # 生成修复上下文
cat stdd/changes/<change>/evidence/fix-packet-*.md  # 分析失败原因
```

---

## 辅助功能（按需自动调用）

| 场景 | 自动调用 |
|------|---------|
| 代码完成后 | `/stdd:guard` — 质量门禁 |
| 验证前 | `/stdd:mutation` — 变异测试 |
| 有 API 需求 | `/stdd:api-spec` — API 规范 |
| 有类型需求 | `/stdd:schema` — 类型定义 |
| 需要 Mock | `/stdd:mock` — Mock 生成 |
| 需要测试数据 | `/stdd:factory` — 数据工厂 |
| 归档前 | `/stdd:constitution check` — 合规检查 |
| 定期（每 5 个 task） | `/stdd:metrics` — 指标仪表板 |

---

## 一键 Turbo 模式

当用户使用 "快速"、"一键"、"turbo" 等关键词，或需求非常明确时：

```
/stdd:turbo <需求描述>
```

这会自动执行全流程（propose → spec → plan → apply → verify → archive），仅在以下节点暂停：
- 需求确认
- 归档确认

---

## 能力清单（Agent 可自主调用）

### SDD & TDD 核心流程
`/stdd:init` `/stdd:new` `/stdd:propose` `/stdd:clarify` `/stdd:confirm`
`/stdd:spec` `/stdd:plan` `/stdd:apply` `/stdd:execute` `/stdd:verify` `/stdd:archive`

### 工作流增强
`/stdd:ff` `/stdd:continue` `/stdd:explore` `/stdd:turbo` `/stdd:brainstorm` `/stdd:issue`

### SDD 增强
`/stdd:api-spec` `/stdd:schema` `/stdd:contract` `/stdd:validate`

### TDD 增强
`/stdd:outside-in` `/stdd:mutation` `/stdd:mock` `/stdd:factory`

### 质量门禁
`/stdd:guard` `/stdd:constitution` `/stdd:hooks`

### Graph 引擎
`/stdd:graph`

### 协作与文档
`/stdd:commit` `/stdd:final-doc` `/stdd:design` `/stdd:prp` `/stdd:supervisor`
`/stdd:context` `/stdd:iterate` `/stdd:memory` `/stdd:parallel` `/stdd:roles`

### 评估与学习
`/stdd:metrics` `/stdd:learn` `/stdd:certainty` `/stdd:complexity` `/stdd:vision`

### 测试与运维
`/stdd:user-test` `/stdd:ci` `/stdd:browser` `/stdd:depcheck` `/stdd:doctor`

### 辅助
`/stdd:help` `/stdd:status` `/stdd:list` `/stdd:recommend` `/stdd:skills`
`/stdd:commands` `/stdd:workspace` `/stdd:extensions` `/stdd:story`
`/stdd:pipeline` `/stdd:baby-steps` `/stdd:starters` `/stdd:tdd-init`
`/stdd:fix-packet` `/stdd:update` `/stdd:audit` `/stdd:runtime`
