# STDD Copilot Ultra v2.0.0 — 核心概念

> **Smart Team-Driven Development · AI 全生命周期开发平台**
> 最后更新：2026-06-01 · 适用于 `@marcher-lam/stdd-copilot-ultra@2.0.0`

实践用法请参阅 [快速开始](getting-started.md) 和 [工作流程](workflows.md)。

---


## 1. STDD — Smart Team-Driven Development

**STDD（智能团队驱动开发）** 是一套面向 AI 编码助手的**过程控制层和质量保证系统**。

### 核心定位

STDD Copilot Ultra 不是 AI 本身，而是 AI 编码助手的「交通规则」：

```
构思  →  规格  →  代码
PM/Architect/UX/QA 多角色协作  →  BDD + 任务拆解  →  Ralph Loop TDD 闭环
```

| 阶段 | 人做什么 | STDD 做什么 |
|------|---------|------------|
| **探索** | 描述想法 | 多角色 Agent 协作、头脑风暴、复杂度评估 |
| **规格** | 确认需求 | Spec-First 方法论、BDD 规格、任务拆解 |
| **执行** | Code Review | Ralph Loop TDD、变异测试、宪法检查、证据链 |

### 技术栈

| 项目 | 详情 |
|------|------|
| 包名 | `@marcher-lam/stdd-copilot-ultra` |
| 运行时 | Node.js CLI（≥ 20.0.0） |
| 运行依赖 | `chalk` `commander` `inquirer` `js-yaml`（共 4 个） |
| AI 引擎 | 4 层 22 种（Claude Code、Cursor、Windsurf、Copilot 等） |

---

## 2. 变更（Changes）— 核心工作单元

变更是 STDD 的核心工作单元，所有开发活动围绕变更展开。

### 变更生命周期

```
proposal → spec → plan → apply → verify → archive
```

每个变更对应 `stdd/changes/<name>/` 目录：

```
stdd/changes/
├── <change-name>/
│   ├── .state.yaml              # 持久计划状态
│   ├── proposal.md              # 需求提案
│   ├── specs/                   # Delta Specs
│   ├── design.md                # 设计文档
│   ├── tasks.md                 # 任务列表
│   ├── arch-decisions.md        # ADR 记录
│   ├── implementation_log.md    # 实现日志
│   ├── evidence/                # 执行证据
│   └── progress.jsonl           # 进度日志
└── archive/                     # 归档变更
```

### 变更管理命令

| 命令 | 说明 |
|------|------|
| `stdd new change <name>` | 创建新变更 |
| `stdd status [change]` | 查看变更状态 |
| `stdd list` | 列出所有变更 |
| `stdd archive [change]` | 归档变更 |
| `stdd recommend [change]` | 推荐下一步操作 |

---

## 3. 规格（Specs）— BDD Gherkin 格式

规格是需求的形式化表达，使用 BDD Gherkin 格式（Given-When-Then）。

### Delta Spec 机制

每次变更产生 **Delta Spec**，使用三种标记：

| 标记 | 含义 |
|------|------|
| `ADDED` | 新增的场景/功能 |
| `MODIFIED` | 修改的已有场景 |
| `REMOVED` | 删除的场景 |

归档时，Delta Spec 自动合并到主规格库 `stdd/specs/`，生成 `spec-merge-report.json`。

### 规格工具链

| 命令 | 说明 |
|------|------|
| `stdd spec <change>` | 从任务生成 BDD 规格 |
| `stdd api-spec [change]` | 生成 OpenAPI 3.0 规范 |
| `stdd validate [change]` | 规格一致性验证 + Spec Guardian 泄漏检测 |
| `stdd contract <action>` | 消费者驱动契约测试 |

### Delta Spec 示例

```gherkin
@ADDED
Feature: 深色模式
  Scenario: 用户切换深色模式
    Given 用户在设置页面
    When 用户点击"深色模式"开关
    Then 页面背景变为深色
    And 文字颜色变为浅色

@MODIFIED
Feature: 主题系统
  Scenario: 系统加载主题
    Given 系统存在主题配置
    When 应用启动
    Then 加载用户偏好主题
    And 支持深色模式选项
```

---

## 4. 宪法（Constitution）— 9 条条例

Constitution 是 STDD 的质量宪法，定义了所有开发活动必须遵循的 9 条核心条例。

### 条例概览

| # | 条例 | 优先级 | 核心规则 |
|---|------|--------|---------|
| 1 | Library-First | 🟡 Warning | 优先使用成熟库，避免重复造轮子 |
| 2 | TDD | 🔴 Blocking | 测试先行 + 覆盖率门禁 + 变异证据 |
| 3 | Small Commits | 🟡 Warning | 原子化提交，每个 commit 只做一件事 |
| 4 | Code Style | 🟡 Warning | 统一代码格式，遵循项目 lint 规则 |
| 5 | Documentation | 🟢 Suggestion | 文档即代码，保持文档与代码同步 |
| 6 | Error Handling | 🟡 Warning | 禁止空 catch，必须有错误处理策略 |
| 7 | Security | 🔴 Blocking | 禁止硬编码密钥、注入、不安全路径 |
| 8 | Performance | 🟢 Suggestion | 合理默认性能，避免不必要优化 |
| 9 | CI/CD | 🔴 Blocking | 自动化流水线必需，禁止手动部署 |

### 三级执行机制

- **🔴 Blocking**（阻断）：验证时强制通过，否则阻止归档
- **🟡 Warning**（警告）：验证时报告警告，不阻止归档
- **🟢 Suggestion**（建议）：验证时提供建议，不阻止归档

### Hook 执行时机

| Hook | 执行的条例 |
|------|-----------|
| PreToolUse | Article 2, 4, 7 |
| PostToolUse | Article 5, 6, 8 |
| PreCommit | Article 1, 3, 4 |
| PrePush | Article 2, 9 |
| CI Pipeline | All Articles |

### 豁免机制

```yaml
# stdd/constitution/waivers.yaml
waivers:
  - article: 2
    reason: "历史遗留代码迁移"
    expires: 2026-06-01
    approved_by: team-lead
```

```bash
stdd constitution waive <target> --reason "原因" --days 7
```

---

## 5. TDD Ralph Loop — 红→绿→重构循环

Ralph Loop 是 STDD 的核心 TDD 执行引擎。

### 循环流程

```
🔴 红灯（写失败测试）→ 🔍 静态检查 → 🟢 绿灯（最简实现）→ 🧪 Mutation Gate → 🔵 重构 → ✅ 完成
```

### 5 级防跑偏防御体系

| 层级 | 机制 | 说明 |
|------|------|------|
| 1 | 人机确认门 | 关键决策需人类确认（HITL 3 模式可配置） |
| 2 | 微任务隔离 | 5~6 个原子任务，降低上下文迷失 |
| 3 | 连续失败回滚 | 4 阶段容错（策略调整→降级→熔断→回滚） |
| 4 | 静态质检门 | 语法/类型检查在测试前执行 |
| 5 | 伪变异审查 | Quick 启发式或 Stryker evidence 检测骗绿灯 |

### 容错机制

- 失败 **1 次** → 策略调整
- 失败 **2 次** → 跨模型降级（Opus→Sonnet / Full→Baby Step）
- 失败 **3 次** → 熔断 + 自动回滚

### 相关命令

```bash
stdd apply [change]                    # 执行 Ralph Loop
stdd apply --phase red                 # 仅红灯阶段
stdd apply --phase green               # 仅绿灯阶段
stdd apply --phase refactor            # 仅重构阶段
stdd mutation [change]                 # 变异测试
stdd apply --allow-no-tests            # 特殊场景：允许无测试
```

---

## 6. DESIGN.md — 前端视觉宪法

DESIGN.md 是前端项目的视觉宪法，定义了 Design Token 系统。

### 3 种预设

| 预设 | 风格 |
|------|------|
| `modern` | 现代风格，明亮色彩（默认） |
| `dark` | 暗色主题 |
| `minimal` | 极简风格 |

### Token 系统

```css
:root {
  --color-primary: #3B82F6;
  --color-secondary: #6366F1;
  --color-gray-*: ...;
  --font-family-base: Inter, system-ui, sans-serif;
  --font-size-*: ...;
  --spacing-xs ~ --spacing-3xl: ...;
  --radius-sm ~ --radius-full: ...;
}
```

### Token 提取优先级

1. JSON 代码块提取（最高优先级）
2. HTML 注释提取（次优先级）
3. Markdown 表格提取（最低优先级）

### 相关命令

```bash
stdd design create                     # 生成设计系统
stdd design create --preset modern     # 使用现代预设
stdd design create --preset dark       # 使用暗色预设
stdd design create --preset minimal    # 使用极简预设
stdd design create --no-preview        # 跳过预览 HTML
```

---

## 7. UI 生成 — 全栈前端生成引擎

### 4 种框架支持

| 框架 | 文件格式 |
|------|---------|
| React / Next | `.jsx` + `.css` |
| Vue / Nuxt | `.vue` 单文件组件 |
| Angular | `.component.ts` + `.html` + `.css` |
| Svelte | `.svelte` |

### 8 种组件类型

| 类型 | 说明 |
|------|------|
| `button` | 按钮（主要/次要/危险/禁用变体） |
| `card` | 卡片（内容/产品/用户卡片） |
| `form` | 表单（含验证逻辑） |
| `input` | 输入框（文本/密码/搜索/数字） |
| `modal` | 模态对话框（含焦点陷阱） |
| `nav` | 导航栏（响应式 + 移动端汉堡菜单） |
| `table` | 数据表格（排序/筛选/分页） |
| `list` | 列表（虚拟滚动支持） |

### 5 种页面类型

| 类型 | 说明 |
|------|------|
| `landing` | 着陆页（Hero + Features + CTA） |
| `dashboard` | 仪表板（侧边栏 + 数据卡片 + 图表区） |
| `auth` | 认证页（login/register/forgot 变体） |
| `settings` | 设置页（Profile/Security/Notifications 分区） |
| `pricing` | 定价页（Plan 对比 + FAQ） |

### 6 种 UI 状态

| 状态 | 说明 |
|------|------|
| `loading` | 加载骨架屏/Spinner |
| `empty` | 空状态占位 |
| `error` | 错误提示与重试 |
| `permission` | 权限不足提示 |
| `offline` | 离线状态提示 |
| `success` | 操作成功反馈 |

### 样式方案

| 方案 | 说明 |
|------|------|
| `css` | 标准 CSS（默认） |
| `scss` | Sass 预处理器 |
| `tailwind` | Tailwind CSS 工具类 |
| `css-modules` | CSS Modules（React 专用） |

### 无障碍（a11y）

- 完整 `aria-*` 属性（`aria-label`、`aria-describedby`、`aria-live`）
- 语义化 ARIA roles（`role="dialog"`、`role="navigation"`）
- 焦点陷阱（Modal 自动捕获/释放焦点）
- 键盘导航（Tab/Shift+Tab/Escape）
- Screen-reader only 工具类（`.sr-only`）

### 响应式支持

- 移动优先设计
- Tailwind 断点：`sm:`（640px）、`md:`（768px）、`lg:`（1024px）
- 弹性网格布局

---

## 8. Graph 引擎 — DAG 编排

Graph 引擎是基于 DAG（有向无环图）的工作流编排引擎。

### 核心能力

| 能力 | 说明 |
|------|------|
| DAG 编译 | 完整的 DAG 编译和验证 |
| 拓扑排序 | 自动拓扑排序和循环检测（Kahn's Algorithm） |
| 可视化 | Mermaid/JSON/HTML 格式 |
| 分析 | 依赖分析和瓶颈识别 |
| 并行执行 | DAG 分层并行执行 |
| 历史记录 | 执行历史追踪和回放 |

### 5 种意图模式

| 意图 | 路径 |
|------|------|
| `feature` | propose → spec → plan → outside-in → apply → verify |
| `hotfix` | issue → apply → verify → archive |
| `repair` | fix-packet → apply → verify |
| `research` | explore → brainstorm → final-doc |
| `brownfield` | explore → init → propose → ... → archive |

### 运行时模块

| 模块 | 职责 |
|------|------|
| `dynamic-router.js` | 意图自适应拓扑裁剪 |
| `graph-cache.js` | 幂等断点缓存（SHA256 指纹） |
| `evidence-capture.js` | 结构化错误证据采集 |
| `error-propagator.js` | 多跳向上传播 + 决策点定位 |
| `heterogeneous-adapter.js` | 异构引擎适配 + Tier 降级 |
| `parallel-executor.js` | DAG 分层并行执行 |

### 相关命令

```bash
stdd graph visualize --format html     # HTML 可视化
stdd graph analyze --intent feature    # 分析结构
stdd graph run --intent feature        # 执行工作流
stdd graph parallel --detect           # 并行化检测
stdd graph history                     # 执行历史
stdd graph replay <id>                 # 历史回放
stdd graph recommend                   # 智能推荐
```

---

## 9. 证据系统 — 结构化证明

证据系统为所有关键操作提供结构化证明和审计追踪。

### 证据流

```
stdd apply → Reporter 注入 → EvidenceCapture → stdd/evidence/
stdd verify → Reporter 注入 → EvidenceCapture → stdd/evidence/
stdd guard → EvidenceCapture → stdd/evidence/
stdd mutation → EvidenceCapture → stdd/evidence/
stdd constitution audit ← 聚合所有证据
```

### 证据存储

| 路径 | 内容 |
|------|------|
| `stdd/evidence/` | 全局证据 |
| `stdd/changes/<change>/evidence/` | 变更级证据 |
| `stdd/graph/history.jsonl` | Graph 执行历史 |

### Fix-Packet（修复包）

Fix-Packet 是 Golden Packet 风格的失败修复上下文包：

```bash
stdd fix-packet [change]               # 生成修复上下文
stdd fix-packet --test-command "npm test"
stdd fix-packet --json
```

包含：测试输出、代码差异、规格、错误快照、指纹去重。

---

## 10. Workspace / Monorepo

STDD 自动检测和适配 npm/pnpm workspace 结构。

### 自动检测

`workspace-detector.js` 扫描 `package.json` 中的 `workspaces` 字段和 `pnpm-workspace.yaml`。

### Workspace Registry

```yaml
# stdd/config.yaml
workspaces:
  enabled: true
  items:
    - name: "api"
      root: "packages/api"
      source_root: "packages/api/src"
      package_json: "packages/api/package.json"
```

### 相关命令

```bash
stdd workspace list                    # 列出工作空间
stdd workspace validate                # 验证注册表
stdd workspace repair                  # 修复配置
stdd apply --workspace packages/api    # 指定工作空间
```

`--workspace` 支持的命令：`ff`、`issue`、`spec`、`api-spec`、`apply`、`mutation`、`verify`、`metrics`、`context`、`constitution`、`recommend`、`graph recommend/run`。

---

## 11. 进度跟踪 — JSONL 持久化

进度系统使用 JSONL 格式记录所有命令执行状态，支持断点续传。

### 4 种状态

| 状态 | 说明 |
|------|------|
| `start` | 命令开始执行 |
| `complete` | 命令成功完成 |
| `fail` | 命令执行失败 |
| `interrupt` | 命令被中断（SIGINT/SIGTERM） |

### 相关命令

```bash
stdd progress                          # 显示进度日志
stdd progress --summary                # 进度摘要
stdd progress --resume                 # 断点恢复
stdd progress --json                   # JSON 输出
stdd progress --clear                  # 清除日志
```

---

## 12. 记忆系统

记忆系统维护跨会话的项目知识和历史决策。

### 记忆类型

| 类型 | 说明 |
|------|------|
| **决策记忆** | 技术选型、架构决策、设计权衡、拒绝的方案 |
| **模式记忆** | 设计模式、反模式、惯用法、最佳实践 |
| **失败记忆** | Bug 根因、修复方案、防回归措施 |

### 相关命令

```bash
stdd memory search "authentication"    # 语义搜索
stdd memory stats                      # 统计信息
stdd memory list                       # 列出所有记忆
stdd memory scan --source-dir src/     # 扫描源码
stdd memory-scan                       # 源码记忆扫描
```

### 安全规则

禁止存储密码、API Token、私人证书、敏感用户数据。自动脱敏替换。

---

## 13. Agent 角色 — 12 个角色

STDD 定义了 12 个专业 Agent 角色，支持 Party Mode 多角色辩论和对抗式安全审查。

### 4 个基础角色

| 角色 | 职责 |
|------|------|
| **PO (Product Owner)** | 需求定义、优先级排序 |
| **Developer** | 代码实现、重构 |
| **Tester** | 测试编写、质量保障 |
| **Reviewer** | 代码审查（含对抗式审查） |

### 8 个专用角色

| 角色 | 职责 |
|------|------|
| **Architect** | 架构决策、ADR 记录 |
| **Security** | 安全审计、漏洞检测 |
| **DevOps** | CI/CD、部署策略 |
| **UX** | 用户体验、交互设计 |
| **BA (Business Analyst)** | 业务分析、流程建模 |
| **Tech Writer** | 技术文档、API 文档 |
| **QA Lead** | 测试策略、质量规划 |
| **Data Analyst** | 数据分析、指标监控 |

### Party Mode

```bash
stdd roles party "添加用户登录" --roles po,architect,security,tester
```

多角色辩论，生成 Party Brief（共识 + 待讨论 + 行动项）。

### 对抗式审查

```bash
stdd roles adversarial src/auth       # 风险优先扫描
```

扫描维度：安全、性能、可靠性、可维护性、合规。

---

## 文档导航
- [快速开始](getting-started.md) - 实践第一步
- [工作流程](workflows.md) - 常见模式和使用场景
- [命令参考](commands.md) - 完整命令参考
- [CLI 使用指南](cli-guide.md) - CLI 完整文档
- [项目首页](../README.md) - 项目概览和顶层示例
- [快速开始](getting-started.md) - 首次使用流程和 CLI 速查
- [使用手册](../USAGE.md) - 完整使用指南
- [英文文档入口](en/README.md) - English docs index
