# STDD Copilot Ultra v2.0.0 CLI 使用指南

> Smart Team-Driven Development Framework — 完整命令行参考手册

## 目录

- [全局选项](#全局选项)
- [环境变量](#环境变量)
- [配置文件参考](#配置文件参考)
- [1. 核心 STDD 工作流](#1-核心-stdd-工作流)
- [2. TDD 增强](#2-tdd-增强)
- [3. 规格与验证](#3-规格与验证)
- [4. 质量治理](#4-质量治理)
- [5. UI 生成](#5-ui-生成)
- [6. 生成与预览](#6-生成与预览)
- [7. Graph 引擎](#7-graph-引擎)
- [8. 协作与文档](#8-协作与文档)
- [9. 高级 AI Agent](#9-高级-ai-agent)
- [10. 辅助工具](#10-辅助工具)
- [11. 评估决策](#11-评估决策)
- [典型工作流速查](#典型工作流速查)

---

## 全局选项

以下选项适用于大部分 `stdd` 命令：

| 选项 | 说明 |
|------|------|
| `--json` | 以 JSON 格式输出结果，方便脚本集成 |
| `--force` | 强制执行，覆盖已有文件或跳过确认门 |
| `--dry-run` | 预演模式，仅展示将执行的操作但不实际修改文件 |
| `--no-color` | 禁用彩色输出 |
| `--workspace <name>` | 指定 Monorepo 工作空间名称 |

---

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PROJECT_TYPE` | `node` | 项目类型：`web` / `cli` / `api` / `lib` |
| `LANGUAGE` | `typescript` | 开发语言：`typescript` / `javascript` / `python` / `go` / `rust` |
| `FRAMEWORK` | `react` | 前端框架：`react` / `vue` / `nextjs` / `express` / `fastapi` |
| `BACKEND` | `express` | 后端框架：`express` / `fastapi` / `gin` / `actix` / `none` |
| `TEST_FRAMEWORK` | `jest` | 测试框架：`jest` / `vitest` / `pytest` / `go test` / `cargo test` |
| `PKG_MANAGER` | `npm` | 包管理器：`npm` / `yarn` / `pnpm` |
| `DESIGN_PRESET` | `modern` | 设计预设（前端项目生效）：`modern` / `dark` / `minimal` |
| `DATABASE` | `postgresql` | 数据库：`postgresql` / `mysql` / `sqlite` / `mongodb` / `none` |
| `VECTOR_DB` | `none` | 向量数据库：`none` / `pinecone` / `weaviate` / `qdrant` |
| `EMBEDDING_MODEL` | `none` | 嵌入模型标识 |
| `CLAUDE_MODEL` | `claude-sonnet-4-6` | Claude 模型版本 |

---

## 配置文件参考

配置文件位于 `stdd/config.yaml`，在 `stdd init` 时根据交互流程自动生成。主要配置段：

```yaml
version: "1.0"
name: "STDD Copilot"

project:          # 项目技术栈（init 时确定）
  type: node
  language: typescript
  framework: react
  test_framework: jest

graph:            # DAG 引擎配置
  max_parallel: 4
  timeout: 3600000
  retry_count: 3
  on_failure: "rollback"

changes:          # 变更管理
  dir: "stdd/changes"
  archive_dir: "stdd/changes/archive"
  auto_archive_after_days: 30

specs:            # 规格管理
  dir: "stdd/specs"
  format: "gherkin"

tdd:              # TDD 与 Ralph Loop 配置
  ralph_loop:
    max_iterations: 10
    failure_threshold: 3
    auto_rollback: true
  hitl:
    mode: "end-of-cycle"       # every-phase / end-of-cycle / off
  mutation:
    enabled: true
    mode: "auto"               # auto / quick / deep
    threshold: 80

defense:          # 5 级防跑偏
  confirm_gate: { enabled: true }
  micro_task: { max_tasks: 6, min_granularity: "30min" }
  failure_rollback: { threshold: 3 }
  static_quality: { enabled: true }
  mutation_review: { enabled: true }

ai_engines:       # AI 引擎注册
  claude_code: { enabled: true }
```

---

## 1. 核心 STDD 工作流

核心工作流覆盖从项目初始化到变更归档的完整生命周期。

### `stdd init`

初始化 STDD 项目目录结构，生成 `stdd/` 目录（含 `specs/`、`changes/`、`memory/`、`graph/`、`config.yaml`）及 `.claude/commands/`、`.claude/skills/`。

```bash
stdd init                          # 在当前目录初始化
stdd init /path/to/project         # 指定项目路径
stdd init --force                  # 强制重新初始化（覆盖已有配置）
```

### `stdd new`

创建新变更提案，生成 `proposal.md` 和 `.status.yaml`，引导需求收集与澄清。

```bash
stdd new change add-dark-mode      # 创建名为 add-dark-mode 的变更
stdd new change user-auth --force  # 强制创建（覆盖已有同名变更）
```

### `stdd ff`

Fast-Forward 快速生成：一次性生成全部四项核心产物（提案/规格/设计/任务）。

```bash
stdd ff "添加暗色主题支持"           # 快速生成所有产物
stdd ff "实现用户认证" --dry-run    # 预演模式，不写入文件
```

### `stdd issue`

Bug TDD 修复：分类缺陷，先写失败测试（RED），再最小修复（GREEN），验证无回归。

```bash
stdd issue "登录页面白屏崩溃"        # 从 Bug 描述开始 TDD 修复
stdd issue "分页查询返回重复数据" --dry-run
```

### `stdd turbo`

One-Shot 一键执行所有实现前阶段（propose → clarify → confirm → spec → plan），在确认门暂停。

```bash
stdd turbo "用户注册功能"            # 自动完成所有前置阶段
stdd turbo "支付集成" --dry-run     # 预演模式
```

### `stdd apply`

执行 Ralph Loop TDD 循环：红灯 → 检查 → 绿灯 → 变异 → 重构。

```bash
stdd apply                          # 自动检测活跃变更并执行
stdd apply add-dark-mode            # 指定变更执行
stdd apply --task 1                 # 执行指定任务编号
stdd apply --fix                    # 修复模式
stdd apply --phase green            # 从指定阶段继续
stdd apply --allow-no-tests         # 允许无测试执行（特殊场景）
```

### `stdd verify`

5 维验证：API 签名 / BDD 覆盖 / 类型 / 边界异常 / 文档一致性 + Constitution 合规 + Evidence 证据记录。

```bash
stdd verify                         # 验证当前活跃变更
stdd verify add-dark-mode           # 验证指定变更
stdd verify --json                  # JSON 格式输出验证结果
```

### `stdd archive`

完成变更：合并 Delta Spec 到主规格，移至归档目录，生成 `spec-merge-report.json`。

```bash
stdd archive                        # 归档当前活跃变更
stdd archive add-dark-mode          # 归档指定变更
stdd archive --force                # 强制归档（跳过验证）
```

### `stdd list`

列出所有变更和规格。

```bash
stdd list                           # 列出所有活跃变更
stdd ls                             # 别名
stdd list --specs                   # 列出所有规格
stdd list --archived                # 列出已归档变更
stdd list --json                    # JSON 格式输出
stdd list --changes                 # 显式列出变更（默认）
```

### `stdd status`

查看变更的工作流状态机当前状态。

```bash
stdd status                         # 查看当前活跃变更状态
stdd status add-dark-mode           # 查看指定变更状态
stdd status --json                  # JSON 格式输出
```

### `stdd recommend`

根据项目状态智能推荐下一步操作。

```bash
stdd recommend                      # 查看全局推荐
stdd recommend add-dark-mode        # 针对指定变更推荐
stdd recommend --json               # JSON 格式输出
```

---

## 2. TDD 增强

测试驱动开发增强工具集。

### `stdd outside-in`

由外向内 TDD：从 E2E 测试开始，再到集成测试，最后单元测试。

```bash
stdd outside-in init                # 初始化外向内 TDD 配置
stdd outside-in scaffold add-dark-mode  # 为变更生成分层测试骨架
stdd outside-in status              # 查看外向内测试状态
```

### `stdd fix-packet`

生成 Golden Packet 风格诊断修复包，从失败任务收集修复上下文。

```bash
stdd fix-packet add-dark-mode       # 为指定变更生成修复包
stdd fix-packet --test-command "npm test"  # 指定测试命令
stdd fix-packet --json              # JSON 格式输出
```

### `stdd tdd-init`

为已有源码文件初始化测试脚手架。

```bash
stdd tdd-init                       # 为所有源码文件生成测试骨架
stdd tdd-init src/utils/auth.ts     # 为指定文件生成测试
stdd tdd-init --dry-run             # 预演模式
```

### `stdd baby-steps`

交互式 TDD 小步引导，适合复杂组件的渐进式实现。

```bash
stdd baby-steps                     # 引导当前活跃变更的下一步
stdd baby-steps "实现支付校验逻辑"    # 指定任务描述
```

### `stdd mutation`

变异测试：Quick 启发式 anti-fake-green 检测 + Stryker 委托深度分析。

```bash
stdd mutation                       # 对当前变更运行变异测试
stdd mutation add-dark-mode         # 对指定变更运行
stdd mutation --mode stryker        # 使用 Stryker 深度分析模式
stdd mutation --mode quick          # 快速启发式模式
stdd mutation --json                # JSON 格式输出
```

### `stdd mock`

自动生成外部依赖的 Mock 实现。

```bash
stdd mock                           # 为当前变更生成 Mock
stdd mock add-dark-mode             # 为指定变更生成
stdd mock --all                     # 扫描全量外部依赖并生成
stdd mock --fake                    # 生成可运行的 fake 实现
stdd mock --json                    # JSON 格式输出
```

---

## 3. 规格与验证

规格驱动开发（SDD）工具集。

### `stdd spec`

将需求提案转化为 BDD（Given/When/Then）Delta Specs，含 ADDED/MODIFIED/REMOVED 标记。

```bash
stdd spec add-dark-mode             # 为指定变更生成 BDD 规格
stdd spec --format yaml             # 指定输出格式（gherkin/yaml/markdown）
stdd spec --json                    # JSON 格式输出
```

### `stdd api-spec`

生成 OpenAPI 格式 API 规格 + TypeScript 类型定义。

```bash
stdd api-spec                       # 为当前变更生成 API 规格
stdd api-spec add-dark-mode         # 为指定变更生成
stdd api-spec --json                # JSON 格式输出
```

### `stdd contract`

生成和管理消费者驱动契约测试（5 种消息模式）。

```bash
stdd contract generate              # 生成契约测试
stdd contract verify                # 验证契约合规性
stdd contract verify --json         # JSON 格式输出
```

### `stdd validate`

验证规格一致性 + Spec Guardian 泄漏检测 + RFC 2119 关键词检查。

```bash
stdd validate                       # 验证当前变更的规格一致性
stdd validate add-dark-mode         # 验证指定变更
stdd validate --fix                 # 自动修复检测到的问题
stdd validate --json                # JSON 格式输出
```

### `stdd schema`

生成 JSON Schema 和 Zod 类型校验，支持 create/fork 自定义 artifact DAG workflow。

```bash
stdd schema validate                # 验证现有 Schema
stdd schema create                  # 创建新 Schema
stdd schema fork                    # Fork 并自定义 Schema
stdd schema --json                  # JSON 格式输出
```

---

## 4. 质量治理

项目质量保障与治理工具集。

### `stdd guard`

TDD 守护钩子：强制测试先行（Blocking）+ 最小实现（Warning）+ 反绕过。

```bash
stdd guard on                       # 启用守护模式
stdd guard off                      # 关闭守护模式
stdd guard status                   # 查看守护状态
```

### `stdd constitution`

管理 9 篇开发条例（3 Blocking + 4 Warning + 2 Suggestion），支持豁免追踪和审计趋势。

```bash
stdd constitution                   # 显示所有条例概览
stdd constitution show              # 显示所有条例
stdd constitution show 2            # 显示第 2 条条例详情
stdd constitution check             # 执行合规检查
stdd constitution check --json      # JSON 格式输出
stdd constitution fix               # 自动修复违规项
stdd constitution fix --article 3   # 修复指定条例
stdd constitution fix --dry-run     # 预演修复
stdd constitution status            # 查看合规状态
stdd constitution audit             # 历史合规审计
stdd constitution audit --json      # JSON 格式输出
stdd constitution waive <target> --reason "原因"  # 豁免指定条例
```

### `stdd hooks`

管理 STDD Hook 系统（Pre/Post ToolUse），多引擎支持（Claude Code / Cursor / Windsurf）。

```bash
stdd hooks install                  # 安装 Hook
stdd hooks verify                   # 验证 Hook 配置
stdd hooks status                   # 查看 Hook 状态
stdd hooks disable                  # 禁用 Hook
stdd hooks enable                   # 启用 Hook
```

### `stdd audit`

Constitution 条例历史合规审计。

```bash
stdd audit                          # 执行合规审计
stdd audit --json                   # JSON 格式输出
```

### `stdd depcheck`

检查未使用/过期的依赖包。

```bash
stdd depcheck                       # 检查当前项目依赖
stdd depcheck src/                  # 检查指定目录的依赖引用
stdd depcheck --json                # JSON 格式输出
```

### `stdd doctor`

项目健康诊断：10 项检查（STDD 目录 / 配置 / Node 版本 / Git Hooks / 测试框架等）。

```bash
stdd doctor                         # 标准健康检查
stdd doctor --deep                  # 深度检查（含 audit 和 lint 可用性）
stdd doctor --json                  # JSON 格式输出
```

### `stdd metrics`

质量指标仪表板：测试覆盖率、变异得分、代码复杂度、TDD 合规率。

```bash
stdd metrics                        # 显示当前变更的质量指标
stdd metrics add-dark-mode          # 显示指定变更的质量指标
stdd metrics --export               # 导出指标报告
stdd metrics --json                 # JSON 格式输出
```

---

## 5. UI 生成

多框架 UI 页面/组件生成引擎，支持 React、Vue、Angular、Svelte。

### 命令语法

```bash
stdd ui <action> [type] [name] [options]
```

### 可用操作

| 操作 | 说明 |
|------|------|
| `page` | 生成页面组件 |
| `component` | 生成 UI 组件 |
| `scaffold` | 生成完整脚手架 |
| `preview` | 启动组件预览 |
| `test` | 生成组件测试 |
| `diff` | 对比 UI 变更差异 |
| `list` | 列出可用模板 |

### 支持的框架（`--framework`）

| 框架 | 值 |
|------|------|
| React | `react` |
| Vue | `vue` |
| Angular | `angular` |
| Svelte | `svelte` |

### 组件类型

| 类型 | 说明 |
|------|------|
| `button` | 按钮组件 |
| `card` | 卡片组件 |
| `form` | 表单组件 |
| `input` | 输入框组件 |
| `modal` | 模态框组件 |
| `nav` | 导航组件 |
| `table` | 表格组件 |
| `list` | 列表组件 |

### 页面类型

| 类型 | 说明 |
|------|------|
| `landing` | 落地页 |
| `dashboard` | 仪表板页 |
| `auth` | 认证页（登录/注册） |
| `settings` | 设置页 |
| `pricing` | 定价页 |

### UI 状态（`--state`）

| 状态 | 说明 |
|------|------|
| `loading` | 加载中状态 |
| `empty` | 空数据状态 |
| `error` | 错误状态 |
| `permission` | 权限不足状态 |
| `offline` | 离线状态 |
| `success` | 成功状态 |

### 样式方案（`--style`）

| 方案 | 值 |
|------|------|
| 原生 CSS | `css` |
| SCSS | `scss` |
| Tailwind CSS | `tailwind` |
| CSS Modules | `css-modules` |

### 使用示例

```bash
stdd ui component Button --framework react          # 生成 React 按钮组件
stdd ui component Form --framework vue --style scss # 生成 Vue 表单组件（SCSS）
stdd ui page dashboard --framework react --style tailwind  # 生成 React 仪表板页
stdd ui page auth --framework angular               # 生成 Angular 认证页
stdd ui page landing --framework svelte             # 生成 Svelte 落地页
stdd ui component Modal --state loading             # 生成含加载状态的模态框
stdd ui component Table --state empty --state error # 生成含空数据和错误状态的表格
stdd ui scaffold --framework react --style tailwind # 生成 React + Tailwind 完整脚手架
stdd ui preview Button                              # 预览组件
stdd ui test Button --framework react               # 生成组件测试
stdd ui diff Button                                 # 对比组件变更
stdd ui list                                        # 列出所有可用模板
stdd ui list --framework vue                        # 列出 Vue 可用模板
```

---

## 6. 生成与预览

项目产物生成与预览工具集。

### `stdd builder`

自定义 Agent、工作流、Skill 构建器。

```bash
stdd builder agent <name>           # 构建自定义 Agent
stdd builder workflow <name>        # 构建自定义工作流
stdd builder skill <name>           # 构建自定义 Skill
stdd builder list                   # 列出已构建的产物
stdd builder validate <name>        # 验证构建产物
stdd builder test <name>            # 测试构建产物
stdd builder share <name>           # 分享构建产物
stdd builder export <name>          # 导出构建产物
```

### `stdd dashboard`

项目健康仪表板（静态 HTML）。

```bash
stdd dashboard generate             # 生成仪表板 HTML
stdd dashboard open                 # 在浏览器中打开仪表板
stdd dashboard serve                # 启动本地服务预览仪表板
```

### `stdd docs`

文档站点生成（Astro + Starlight 风格）。

```bash
stdd docs generate                  # 生成文档站点
stdd docs serve                     # 启动本地服务预览文档
```

### `stdd modules`

模块市场管理。

```bash
stdd modules                        # 显示精选/官方模块
stdd modules featured               # 显示精选模块
stdd modules search <keyword>       # 搜索模块
stdd modules search tdd --category workflow  # 按分类搜索
stdd modules install <name>         # 安装模块
stdd modules info <name>            # 查看模块详情
stdd modules list                   # 列出已安装模块
stdd modules publish <path>         # 发布模块
stdd modules categories             # 列出所有分类
```

### `stdd profile`

规划配置文件管理，自适应规划深度。

```bash
stdd profile                        # 自动检测当前配置
stdd profile detect                 # 检测规划深度
stdd profile create                 # 创建新配置
stdd profile select <name>          # 选择配置
stdd profile show                   # 显示当前配置详情
stdd profile list                   # 列出所有配置
stdd profile edit                   # 编辑当前配置
stdd profile --change <type>        # 针对变更类型分析
stdd profile --force                # 强制覆盖
stdd profile --json                 # JSON 格式输出
```

---

## 7. Graph 引擎

DAG 技能编排引擎，支持动态拓扑裁剪和意图路由。

### 命令语法

```bash
stdd graph <subcommand> [options]
```

### `stdd graph visualize`

输出编译后图谱，支持多种格式。

```bash
stdd graph visualize                # 默认 Mermaid 格式
stdd graph visualize --format json  # JSON 格式
stdd graph visualize --format html  # HTML 格式
```

### `stdd graph analyze`

打印图谱节点、边、入口、终端、层级摘要。

```bash
stdd graph analyze                  # 输出图谱分析摘要
stdd graph analyze --bottlenecks    # 含瓶颈分析
```

### `stdd graph run`

按意图 DAG 执行全工作流，动态路由拓扑。

```bash
stdd graph run --intent feature     # 功能开发工作流
stdd graph run --intent hotfix      # 热修复工作流
stdd graph run --intent research    # 研究探索工作流
stdd graph run --intent repair      # 修复工作流
```

### `stdd graph parallel`

检查图谱并行化机会和可并行层。

```bash
stdd graph parallel --detect        # 检测并行化机会
stdd graph parallel --execute       # 执行并行化
stdd graph parallel --max-workers 4 # 限制最大并行数
```

### `stdd graph history`

查看执行历史（从证据文件）。

```bash
stdd graph history                  # 查看所有执行历史
stdd graph history --failures       # 仅查看失败的执行
stdd graph history --json           # JSON 格式输出
stdd graph history --change <name>  # 按变更名称过滤
```

### `stdd graph replay`

查看详情或重新执行过去的运行。

```bash
stdd graph replay <id>              # 查看指定运行的详情
stdd graph replay <id> --verbose    # 详细模式
```

### `stdd graph recommend`

根据项目状态推荐下一步 Skill 和原因。

```bash
stdd graph recommend                # 获取推荐
```

---

## 8. 协作与文档

团队协作与文档生成工具集。

### `stdd commit`

原子化 Git 提交：red:/green:/refactor: 前缀（Conventional Commits + TDD）。

```bash
stdd commit                         # 为当前变更生成原子提交
stdd commit add-dark-mode           # 为指定变更生成提交
stdd commit --tdd                   # TDD 模式提交（自动检测阶段前缀）
stdd commit --phase green           # 指定阶段前缀
stdd commit --issue 42              # 关联 Issue 编号
```

### `stdd commit-tdd`

TDD 专用提交，自动添加 red/green/refactor 前缀和测试上下文。

```bash
stdd commit-tdd                     # TDD 模式提交当前变更
stdd commit-tdd --phase red         # 标记为红灯阶段
stdd commit-tdd --phase green       # 标记为绿灯阶段
stdd commit-tdd --phase refactor    # 标记为重构阶段
```

### `stdd final-doc`

聚合所有阶段产物为 FINAL_REQUIREMENT.md 综合文档。

```bash
stdd final-doc                      # 为当前变更生成综合文档
stdd final-doc --json               # JSON 格式输出
```

### `stdd design`

将规格转化为技术设计文档，含 Context/Decision/Rationale/Consequences ADR 格式。

```bash
stdd design                         # 生成设计文档
stdd design create                  # 创建新设计文档
stdd design create --preset modern  # 使用设计预设
stdd design create --no-preview     # 跳过预览 HTML 生成
stdd design --json                  # JSON 格式输出
stdd design --force                 # 强制覆盖
```

### `stdd prp`

What/Why/How/Success 结构化规划框架，便于干系人对齐。

```bash
stdd prp                            # 创建 PRP 规划
stdd prp create "用户认证系统"       # 指定标题创建
stdd prp create --what "实现JWT" --why "安全性需求" --how "OAuth2"  # 指定各段内容
stdd prp --json                     # JSON 格式输出
stdd prp --force                    # 强制覆盖
```

### `stdd product-proposal`

扫描所有 stdd/ 产物，生成 15 章产品方案报告（PRODUCT-PROPOSAL.md），含覆盖率、质量指标、路线图。

```bash
stdd product-proposal               # 生成产品方案报告
stdd product-proposal --json        # JSON 格式输出
stdd product-proposal --output my-report.md  # 指定输出文件名
```

### `stdd context`

三层文档上下文管理（Foundation ~500t + Component ~1000t + Feature ~2000t）。

```bash
stdd context                        # 显示当前上下文
stdd context foundation             # 管理 Foundation 层上下文
stdd context component              # 管理 Component 层上下文
stdd context feature                # 管理 Feature 层上下文
stdd context --export               # 导出上下文
stdd context --json                 # JSON 格式输出
```

### `stdd user-test`

从 BDD 规格生成人类可读验收测试脚本（非技术人员可执行）+ AI agent 自动化脚本。

```bash
stdd user-test                      # 为当前变更生成验收测试
stdd user-test add-dark-mode        # 为指定变更生成
stdd user-test --json               # JSON 格式输出
```

---

## 9. 高级 AI Agent

多 Agent 协作与智能增强工具集。

### `stdd roles`

12 个专业 Agent 角色（4 基础 + 8 专用），Party Mode 辩论 + 对抗式安全审查。

```bash
stdd roles                          # 列出所有可用角色
stdd roles list                     # 列出角色详情
stdd roles start <topic>            # 启动 Party Mode 讨论
stdd roles start <topic> --rounds 5 # 指定讨论轮数
stdd roles start <topic> --role architect  # 指定角色发言
```

### `stdd runtime`

AI 运行时引擎交互。

```bash
stdd runtime agent start <topic>    # 启动多 Agent 模拟（Party Mode）
stdd runtime agent start <topic> --rounds 5  # 指定轮数
stdd runtime agent next             # 推进下一轮发言
stdd runtime agent record "<name>|<msg>"     # 记录 Agent 发言
stdd runtime agent stop             # 强制停止模拟
stdd runtime agent run <goal>       # 使用执行器运行 Agent
stdd runtime agent run <goal> --executor shell --command "npm test"  # Shell 执行器
stdd runtime agent run <goal> --role developer  # 指定角色
stdd runtime sudo <file>            # 解析 SudoLang 伪代码
stdd runtime sudo <file> --generate # 解析并生成 STDD 产物
```

### `stdd memory`

向量数据库记忆系统：语义搜索和持久化记忆存储。

```bash
stdd memory save                    # 保存记忆
stdd memory search <query>          # 语义搜索记忆
stdd memory stats                   # 记忆统计信息
stdd memory list                    # 列出所有记忆
stdd memory --source-dir src/       # 指定源码目录
stdd memory --json                  # JSON 格式输出
```

### `stdd memory-scan`

扫描项目源码到记忆产物。

```bash
stdd memory-scan                    # 扫描并索引项目源码
stdd memory-scan scan               # 显式扫描
stdd memory-scan list               # 列出已扫描的记忆
stdd memory-scan --source-dir src/  # 指定源码目录
stdd memory-scan --json             # JSON 格式输出
```

### `stdd parallel`

DAG 并行执行引擎：识别并并行执行独立任务，聚合结果。

```bash
stdd parallel                       # 查看并行状态
stdd parallel status                # 查看状态
stdd parallel run <intent>          # 按意图并行执行
stdd parallel run feature -p 4      # 限制最大并行数
stdd parallel run feature --strategy all    # 策略：全部完成
stdd parallel run feature --strategy race   # 策略：竞速
stdd parallel run feature --dry-run # 预演模式
stdd parallel --json                # JSON 格式输出
```

### `stdd supervisor`

多 Agent 协调器（Supervisor 模式），跨领域并行工作。

```bash
stdd supervisor                     # 查看 Supervisor 状态
stdd supervisor status              # 查看状态
stdd supervisor start               # 启动 Supervisor
stdd supervisor start --roles "architect,qa,security"  # 指定角色
stdd supervisor start --rounds 3    # 指定讨论轮数
stdd supervisor stop                # 停止 Supervisor
stdd supervisor --json              # JSON 格式输出
```

### `stdd iterate`

Plan-Execute-Reflect 自主迭代循环，渐进式质量提升。

```bash
stdd iterate                        # 查看迭代状态
stdd iterate status                 # 查看当前迭代状态
stdd iterate start --plan "实现用户认证"  # 启动迭代（含计划）
stdd iterate start --max 5          # 限制最大迭代轮数
stdd iterate reflect --reflection "性能不足"  # 添加反思
stdd iterate next --next "优化查询"  # 设置下一步
stdd iterate --json                 # JSON 格式输出
```

---

## 10. 辅助工具

项目管理和开发辅助工具集。

### `stdd progress`

实时进度追踪：JSONL 持久化日志，start/complete/fail/interrupt 四态记录，断点续传。

```bash
stdd progress                       # 显示进度日志
stdd progress --summary             # 显示进度摘要
stdd progress --resume              # 从断点恢复
stdd progress --json                # JSON 格式输出
stdd progress --clear               # 清除进度日志
```

### `stdd start`

交互式快速启动向导（TTY）/ 帮助文本（非 TTY）。

```bash
stdd start                          # 启动交互式向导
stdd start --json                   # JSON 格式输出
```

### `stdd workspace`

Monorepo 工作空间注册表管理。

```bash
stdd workspace list                 # 列出所有工作空间
stdd workspace validate             # 验证工作空间配置
stdd workspace repair               # 修复工作空间配置
stdd workspace list --json          # JSON 格式输出
```

### `stdd extensions`

STDD 扩展管理：列出/安装/验证扩展。

```bash
stdd extensions list                # 列出已安装扩展
stdd extensions install <name>      # 安装扩展
stdd extensions validate            # 验证所有扩展
```

### `stdd starters`

项目启动模板管理（TS / JS / Python / Go / Rust 5 种）。

```bash
stdd starters list                  # 列出所有可用启动模板
stdd starters create <template>     # 从模板创建项目
```

### `stdd ci`

生成 CI 配置文件。

```bash
stdd ci                             # 生成默认 CI 配置
stdd ci github                      # 生成 GitHub Actions 配置
```

### `stdd browser`

内置浏览器驱动（Playwright）：截图/检查/健康诊断。

```bash
stdd browser snapshot               # 截取页面快照
stdd browser inspect                # 检查页面元素
stdd browser doctor                 # 浏览器驱动健康诊断
stdd browser snapshot --width 1920 --height 1080  # 指定视口尺寸
```

### `stdd story`

Story Mapping：创建用户故事地图并转化为 BDD feature files。

```bash
stdd story create                   # 创建新用户故事地图
stdd story list                     # 列出故事地图
stdd story export                   # 导出为 BDD feature files
```

### `stdd pipeline`

从规格生成 parser IR 和验收测试骨架。

```bash
stdd pipeline                       # 为当前变更生成管道
stdd pipeline add-dark-mode         # 为指定变更生成
```

### `stdd learn`

自适应学习：Pattern Teaching 扫描项目本地惯例。

```bash
stdd learn scan                     # 扫描项目模式
stdd learn good <pattern>           # 标记为良好模式
stdd learn bad <pattern>            # 标记为不良模式
stdd learn suggest                  # 基于已学模式提供建议
stdd learn status                   # 查看学习状态
```

### `stdd help`

基于当前项目状态的上下文感知帮助系统，推荐下一步命令。

```bash
stdd help                           # 显示上下文感知帮助
stdd help <topic>                   # 查看指定主题的帮助
stdd help --json                    # JSON 格式输出
```

### `stdd skills`

列出所有可用的 STDD Skill 模板。

```bash
stdd skills                         # 列出所有 Skill 模板
stdd skills --json                  # JSON 格式输出
```

### `stdd commands`

列出所有可用的 Claude Code / AI 助手斜杠命令模板。

```bash
stdd commands                       # 列出所有命令模板
stdd commands --json                # JSON 格式输出
```

### `stdd explore`

只读探索模式：分析现有代码架构、模式、约束，写入 `stdd/explorations/`。

```bash
stdd explore                        # 探索当前项目架构
stdd explore src/                   # 探索指定目录
stdd explore --deep                 # 深度探索（含依赖分析）
```

---

## 11. 评估决策

项目评估与决策支持工具集。

### `stdd complexity`

代码复杂度评估（APP Mass 圈复杂度/认知复杂度分析）+ Top-10 热点 + 重构建议。

```bash
stdd complexity                     # 分析当前项目复杂度
stdd complexity analyze             # 执行复杂度分析
stdd complexity analyze src/        # 分析指定目录
stdd complexity --limit 10          # 限制热点数量
stdd complexity --json              # JSON 格式输出
```

### `stdd certainty`

5 维度置信度评分（需求清晰度/技术可行性/风险/测试覆盖/愿景对齐），低于阈值暂停。

```bash
stdd certainty                      # 评估当前置信度
stdd certainty assess               # 执行 5 维度评估
stdd certainty --scores "req:4,tech:5,risk:3,test:4,vision:5"  # 预设评分
stdd certainty --set "confirm:0.7,warning:0.85,auto:0.95"  # 配置阈值
stdd certainty --json               # JSON 格式输出
```

### `stdd vision`

创建和维护项目愿景文档（长期目标、架构北极星、战略方向）。

```bash
stdd vision                         # 显示当前愿景
stdd vision show                    # 显示愿景文档
stdd vision create                  # 创建愿景文档
stdd vision update                  # 更新愿景文档
stdd vision --force                 # 强制覆盖
stdd vision --json                  # JSON 格式输出
```

---

## 典型工作流速查

### 需求明确的快速开发

```bash
stdd init → stdd ff "需求描述" → stdd apply → stdd verify → stdd archive
```

### 需求模糊的渐进式开发

```bash
stdd init → stdd new change <name> → stdd spec <name> → stdd apply <name> → stdd verify <name> → stdd archive <name>
```

### Bug TDD 修复

```bash
stdd issue "Bug 描述" → stdd verify → stdd archive
```

### 一键全流程

```bash
stdd turbo "需求描述" → stdd commit
```

### 断点恢复

```bash
stdd progress --resume → stdd recommend
```

### 外向内 TDD 开发

```bash
stdd outside-in init → stdd outside-in scaffold <name> → stdd apply → stdd verify
```

### Graph 工作流编排

```bash
stdd graph analyze → stdd graph run --intent feature → stdd graph history → stdd graph recommend
```

---

## 文档导航
- [项目首页](../README.md) - 项目概览和顶层示例
- [快速开始](getting-started.md) - 首次使用流程和 CLI 速查
- [使用手册](../USAGE.md) - 完整使用指南

> **相关文档**：[快速开始](getting-started.md) | [工作流程](workflows.md) | [命令参考](commands.md) | [核心概念](concepts.md) | [英文文档](en/README.md)

<!--
stdd init
stdd init /path/to/project
stdd init --force
stdd list
stdd list --specs
stdd list --archived
stdd list --json
stdd status
stdd status add-dark-mode
stdd new change add-dark-mode
stdd skills
stdd commands
stdd constitution
stdd constitution show 2
stdd constitution check
stdd hooks install
stdd hooks verify
stdd hooks status
stdd hooks disable
stdd hooks enable
-->

