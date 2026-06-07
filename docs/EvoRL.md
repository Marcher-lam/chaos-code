# STDD Copilot Ultra 用户实操手册：从零构建一个完整项目

> **版本**: v2.0.0 | **更新日期**: 2026-06-01
> **适用场景**: 从零开始的新项目，完整掌握 STDD Copilot Ultra 工作流

---

## 你将学到什么

通过本手册，你将完整掌握以下能力：

- **STDD 核心工作流**：`init → ff → spec → apply → verify → archive` 全生命周期
- **快捷命令**：`ff`（快速生成）、`turbo`（一键全流程）、`issue`（Bug 修复）
- **质量治理**：Constitution 9 篇条例、`guard` 守护、`mutation` 变异测试、`doctor` 诊断
- **Graph 引擎**：`graph run` DAG 编排、`graph recommend` 智能推荐、`graph history` 历史回溯
- **UI 生成引擎**：4 框架、8 组件、5 页面类型，`DESIGN.md` Token 驱动
- **多 Agent 协作**：12 角色、Party Mode、对抗式安全审查
- **进度追踪**：JSONL 实时日志、断点续传、`progress --resume`

---

## 前置条件与安装

### 前置条件

| 依赖 | 版本要求 |
|------|----------|
| Node.js | >= 20.0.0 |
| Git | 任意现代版本 |
| AI 编码助手 | Claude Code / Cursor / 其他（可选） |

### 安装（三选一）

```bash
# A: npm 全局安装（推荐）
npm install -g @marcher-lam/stdd-copilot-ultra@latest
stdd --version
# 输出: 2.0.0

# B: 源码安装
git clone https://github.com/Marcher-lam/STDD-COPILOT-ULTRA.git ~/stdd-copilot-ultra
cd ~/stdd-copilot-ultra && npm install && npm link
stdd --version

# C: Docker
docker pull marcher-lam/stdd-copilot-ultra:latest
docker run --rm -v "$PWD:/workspace" marcher-lam/stdd-copilot-ultra:latest --help
```

---

## 准备演示项目

```bash
mkdir ~/my-stdd-project && cd ~/my-stdd-project
git init && npm init -y
```

创建一个最小计算器示例：

```bash
mkdir -p src test
cat > src/calculator.js << 'EOF'
function add(a, b) { return a + b; }
function subtract(a, b) { return a - b; }
module.exports = { add, subtract };
EOF

cat > test/calculator.test.js << 'EOF'
const test = require('node:test');
const assert = require('node:assert/strict');
const { add, subtract } = require('../src/calculator');
test('add returns sum', () => { assert.equal(add(2, 3), 5); });
test('subtract returns difference', () => { assert.equal(subtract(7, 4), 3); });
EOF

node --test
# 应该看到: tests 2, pass 2, fail 0
```

---

## 第 1 章：初始化项目

### 1.1 运行 init

```bash
stdd init
```

**你会看到：**
```
✓ STDD 工作区已初始化
  stdd/config.yaml    — 项目配置
  stdd/changes/       — 变更管理
  stdd/specs/         — BDD 规格
  stdd/memory/        — 项目记忆
  stdd/graph/         — Skill Graph 配置
```

**验证：**
```bash
ls stdd/
# 应该看到: changes  config.yaml  graph  memory  specs
cat stdd/config.yaml
# 确认 test.command 存在
```

### 1.2 配置测试命令

打开 `stdd/config.yaml`，确认测试命令正确：

```yaml
test:
  command: "node --test"
```

### 1.3 检查项目健康

```bash
stdd doctor
```

输出多项检查结果（STDD 目录、配置、Node 版本、Git 状态等）。

```bash
stdd doctor --deep
```

深度模式额外检查 lint、npm audit、活跃变更、Constitution、覆盖率报告。

**输出示例：**
```
STDD Doctor — 项目健康检查
━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ STDD 目录结构完整
✓ config.yaml 存在且有效
✓ Node.js v20.11.0 (>= 20.0.0)
✓ Git 仓库已初始化
✓ 测试命令配置: node --test
⚠ 活跃变更: 0 个
✓ Constitution: 9/9 条例就绪
```

### 1.4 查看可用命令

```bash
stdd skills        # 列出 53 个 Skill 模板
stdd commands      # 列出 86 个斜杠命令模板
stdd --help        # 列出顶级 CLI 命令和帮助入口
```

---

## 第 2 章：创建第一个变更

有两种方式：标准流程（逐步）和快速流程（一键）。

### 2.1 方式 A：标准流程

```bash
stdd new change user-auth
stdd list
# 输出: user-auth  [待启动]

stdd status user-auth
```

### 2.2 方式 B：快速生成（推荐）

用 `ff` 一次性生成所有产物：

```bash
stdd ff "为 calculator 增加乘法能力" --change-name add-multiply
```

**你会看到：**
```
Created fast-forward: add-multiply
```

**生成的文件：**
```bash
stdd/changes/add-multiply/
├── proposal.md    # 需求提案
├── specs/         # BDD 规格目录
└── tasks.md       # 任务列表（4 个待办任务）
```

**验证：**
```bash
cat stdd/changes/add-multiply/tasks.md
# 看到类似:
# - [ ] TASK-001 Setup project structure
# - [ ] TASK-002 Implement core functionality
# - [ ] TASK-003 Add tests
# - [ ] TASK-004 Update documentation
```

---

## 第 3 章：生成规格

### 3.1 从任务生成 BDD Feature 文件

```bash
stdd spec add-multiply
```

**生成：**
```bash
stdd/changes/add-multiply/specs/
└── calculator.feature
```

内容是 Given/When/Then 格式的行为描述：

```gherkin
Feature: Calculator multiplication
  Scenario: Multiply two positive numbers
    Given a calculator
    When I multiply 3 by 4
    Then the result should be 12
```

### 3.2 验证规格质量

```bash
stdd validate add-multiply
```

检查 BDD 格式合规、实现细节泄漏。

```bash
stdd validate add-multiply --spec-guardian --fix
```

检测并自动修复规格中的实现细节泄漏。

---

## 第 4 章：TDD 实现

### 4.1 预览（Dry Run）

```bash
stdd apply add-multiply --dry-run
```

输出将要执行的命令，不修改任何状态。

### 4.2 逐任务执行（Ralph Loop）

```bash
stdd apply add-multiply
```

自动选择第一个待办任务，运行 TDD Ralph Loop：

1. 🔴 **RED** — 先写失败测试
2. 🔍 **CHECK** — 静态检查（ESLint / 类型检查）
3. 🟢 **GREEN** — 最简实现使测试通过
4. 🧬 **MUTATION** — Quick AI 启发式变异审查 + anti-fake-green 检测
5. 🔵 **REFACTOR** — 重构代码结构

重复执行直到所有任务完成：

```bash
stdd apply add-multiply   # 执行 TASK-002
stdd apply add-multiply   # 执行 TASK-003
```

### 4.3 指定任务和阶段

```bash
stdd apply add-multiply --task TASK-002
stdd apply add-multiply --phase red
stdd apply add-multiply --phase green
stdd apply add-multiply --phase refactor
```

### 4.4 允许无测试通过

文档或配置变更可以跳过测试：

```bash
stdd apply add-multiply --allow-no-tests
```

### 4.5 继续中断的工作

```bash
stdd continue add-multiply
```

自动检测上次中断位置，从下一个待办任务继续。

---

## 第 5 章：质量治理

### 5.1 变异测试

```bash
stdd mutation add-multiply
```

Quick 模式生成启发式 mutation score，检测 anti-fake-green：

```
Mutation Gate
  Mode:        quick
  Score:       77% (threshold 80%)
  Status:      PASS
  Evidence:    stdd/changes/add-multiply/evidence/
```

可以设置阈值：

```bash
stdd mutation add-multiply --threshold 70
stdd mutation add-multiply --mode stryker    # 集成 Stryker（需安装）
```

### 5.2 验证

```bash
stdd verify add-multiply
```

验证维度：
- **Tasks**：全部完成
- **Tests**：通过
- **Constitution**：合规
- **Coverage**：覆盖率达标
- **Evidence**：证据完整

可选参数：

```bash
stdd verify add-multiply --no-constitution    # 跳过 Constitution 检查
stdd verify add-multiply --lint               # 带 lint 检查
stdd verify add-multiply --lint-command "eslint ."   # 自定义 lint 命令
```

### 5.3 质量门禁

```bash
stdd guard
```

全局质量门禁。可作为 Git pre-commit hook 使用。

```bash
stdd guard --strict
```

严格模式，所有检查均为 blocking（Warning 也阻断）。

### 5.4 Constitution 条例检查

查看 9 篇条例概览：

```bash
stdd constitution
```

查看单条详情：

```bash
stdd constitution show 2    # Article 2: TDD 详情
```

逐条合规检查：

```bash
stdd constitution check
```

临时豁免（7 天自动过期，审计可追溯）：

```bash
stdd constitution waive 2 --reason "Legacy 迁移中" --days 7
```

### 5.5 质量指标

```bash
stdd metrics add-multiply
stdd metrics add-multiply --json
```

---

## 第 6 章：UI 生成

STDD Copilot Ultra 内置全栈前端生成引擎，基于 `DESIGN.md` Design Token 驱动。

### 6.1 生成设计系统

```bash
stdd design create
```

生成 `DESIGN.md`，包含 Design Tokens（颜色、排版、间距、圆角）。

可选预设：

```bash
stdd design create --preset modern    # 现代风格
stdd design create --preset dark      # 暗色主题
stdd design create --preset minimal   # 极简风格
```

### 6.2 生成页面

```bash
# 着陆页
stdd ui page home --framework react --type landing

# 仪表板页面
stdd ui page dashboard --framework vue --type dashboard --layout sidebar

# 认证页面
stdd ui page login --framework angular --type auth --authVariant login

# 设置页面
stdd ui page settings --framework svelte --type settings

# 定价页
stdd ui page pricing --framework react --type pricing --style tailwind
```

**支持的页面类型：**

| 类型 | 说明 |
|------|------|
| `landing` | 着陆页（Hero + Features + CTA） |
| `dashboard` | 仪表板（侧边栏 + 数据卡片 + 图表区） |
| `auth` | 认证页（login/register/forgot 变体） |
| `settings` | 设置页（Profile/Security/Notifications 分区） |
| `pricing` | 定价页（Plan 对比 + FAQ） |

### 6.3 生成组件

```bash
stdd ui component MyButton --type button --framework react --style tailwind
stdd ui component UserCard --type card --framework vue
stdd ui component SearchInput --type input --framework svelte
stdd ui component DataTable --type table --framework angular
stdd ui component LoginForm --type form --framework react
stdd ui component ConfirmModal --type modal --framework vue
stdd ui component NavBar --type nav --framework react --style tailwind
stdd ui component UserList --type list --framework svelte
```

**支持的组件类型（8 种）：**

`button` · `card` · `form` · `input` · `modal` · `nav` · `table` · `list`

**支持的样式方案：**

| 方案 | 说明 |
|------|------|
| `css` | 标准 CSS（默认） |
| `scss` | Sass 预处理器 |
| `tailwind` | Tailwind CSS 工具类 |
| `css-modules` | CSS Modules（React 专用） |

### 6.4 脚手架完整应用

```bash
stdd ui scaffold react --style tailwind
stdd ui scaffold vue --style scss
stdd ui scaffold angular
stdd ui scaffold svelte
```

生成的文件结构：

```
stdd/ui/
├── global.css              # 全局 CSS + Design Tokens
├── components/
│   ├── Layout.jsx          # 布局组件
│   ├── Button.jsx          # 按钮组件
│   ├── Card.jsx            # 卡片组件
│   └── Input.jsx           # 输入框组件
├── pages/
│   └── Index.jsx           # 首页
└── preview.html            # 预览画廊
```

### 6.5 预览和测试

```bash
stdd ui preview       # 生成预览画廊（自动打开浏览器）
stdd ui list          # 列出所有已生成的 UI 工件
stdd ui test Button   # 生成测试脚手架
stdd ui diff Button   # 视觉回归对比
```

### 6.6 UI 状态生成

为组件生成不同状态变体：

```bash
stdd ui state AppLoading --type loading       # 加载骨架屏
stdd ui state EmptyList --type empty          # 空状态占位
stdd ui state ErrorPage --type error          # 错误提示与重试
stdd ui state NoPermission --type permission  # 权限不足提示
stdd ui state OfflineBanner --type offline    # 离线状态提示
stdd ui state SuccessToast --type success     # 操作成功反馈
```

---

## 第 7 章：Graph 引擎

### 7.1 可视化 Skill Graph

```bash
stdd graph visualize              # Mermaid 格式
stdd graph visualize --format html    # HTML 交互视图
stdd graph visualize --format json    # JSON 结构
```

### 7.2 分析项目状态

```bash
stdd graph analyze                # 当前状态 + 可执行路径
stdd graph analyze --bottlenecks  # 识别瓶颈
```

### 7.3 DAG 执行

```bash
# Feature 流：ff → spec → apply → verify → archive
stdd graph run feature

# Hotfix 流：快速修复路径
stdd graph run --intent hotfix

# Repair 流：fix-packet → apply → verify
stdd graph run --intent repair

# Research 流：探索分析
stdd graph run --intent research

# Brownfield 流：接手遗留项目
stdd graph run --intent brownfield
```

### 7.4 智能推荐

```bash
stdd graph recommend    # 基于当前状态推荐下一步
stdd recommend          # CLI 侧推荐
stdd recommend --json
```

### 7.5 执行历史

```bash
stdd graph history              # 查看历史
stdd graph history --failures   # 只看失败
stdd graph replay <id>          # 回放历史执行
```

---

## 第 8 章：多 Agent 协作

### 8.1 角色列表

```bash
stdd roles list
# 12 个角色: po, developer, tester, reviewer, architect, security,
#            devops, ux, ba, techwriter, qalead, dataanalyst
```

### 8.2 Party Mode 多角色讨论

```bash
stdd roles party 讨论 API 设计风格 --roles=architect,developer,security
```

模拟多角色辩论，自动收敛决策。

### 8.3 对抗式安全审查

```bash
stdd roles adversarial src/
```

扫描 risk-pattern，输出安全风险报告。

### 8.4 Runtime Agent 状态机

```bash
stdd runtime agent start "架构选型讨论" --rounds 3
stdd runtime agent next
stdd runtime agent stop
```

### 8.5 SudoLang 伪代码

```bash
echo 'DEFINE Calculator { add(a, b) => a + b }' > calc.sudo
stdd sudo run calc.sudo
```

---

## 第 9 章：进度追踪

### 9.1 查看进度

```bash
stdd progress              # 最近 20 条
stdd progress --last 50    # 最近 50 条
stdd progress --summary    # 总览（成功/失败/中断）
stdd progress --json       # JSON 格式
```

### 9.2 断点续传

如果终端意外关闭：

```bash
stdd progress --resume
# 输出: 上次中断命令 + 推荐恢复命令
stdd continue add-multiply
```

### 9.3 清空进度

```bash
stdd progress --clear
```

---

## 第 10 章：归档

### 10.1 生成提交信息

```bash
stdd commit add-multiply
```

输出 Conventional Commits 格式的提交信息（不自动执行 `git commit`）。

TDD 阶段前缀：

```bash
stdd commit add-multiply --tdd --phase green
# 输出: green: implement multiply function
```

### 10.2 归档变更

```bash
stdd archive add-multiply
```

**执行操作：**
1. 检查所有 tasks 是否完成
2. 合并 Delta Specs 到 `stdd/specs/`
3. 移动到 `stdd/changes/archive/`
4. 生成归档报告

**验证：**
```bash
stdd list --archived
# 输出: add-multiply-20260601xxxxx

stdd list
# 输出: No active changes
```

### 10.3 Bug 修复流程

```bash
stdd issue "calculator subtract returns wrong result when a < b" --severity high
stdd apply fix-subtract-sign
stdd mutation fix-subtract-sign --threshold 50
stdd verify fix-subtract-sign --no-constitution
stdd archive fix-subtract-sign
```

---

## 附录：完整命令参考

### 核心工作流（11 个）

| 命令 | 说明 |
|------|------|
| `stdd init` | 初始化 STDD 工作区 |
| `stdd new change <name>` | 创建变更 |
| `stdd propose` | 需求提案 |
| `stdd clarify` | 需求澄清 |
| `stdd confirm` | 人类确认门 |
| `stdd spec <change>` | 生成 BDD 规格 |
| `stdd plan <change>` | 任务拆解 |
| `stdd apply <change>` | TDD Ralph Loop 实现 |
| `stdd verify <change>` | 5 维验证 |
| `stdd archive <change>` | 归档合并 |
| `stdd execute <change>` | Ralph Loop 闭环执行器 |

### 工作流增强（6 个）

| 命令 | 说明 |
|------|------|
| `stdd ff "描述"` | 快速生成（提案→规格→任务） |
| `stdd continue <change>` | 断点续传 |
| `stdd explore` | 深度项目探索 |
| `stdd turbo "描述"` | 一键全流程 |
| `stdd brainstorm` | 多策略头脑风暴 |
| `stdd issue "描述"` | Bug 修复入口 |

### 质量治理（8 个）

| 命令 | 说明 |
|------|------|
| `stdd guard` | TDD 质量守护 |
| `stdd constitution` | 9 条宪法管理 |
| `stdd metrics` | 质量指标 |
| `stdd fix-packet` | 修复上下文包 |
| `stdd hooks` | Hook 管理 |
| `stdd audit` | 历史合规审计 |
| `stdd depcheck` | 依赖检查 |
| `stdd doctor` | 项目健康检查 |

### UI 生成（8 个 Action）

| 命令 | 说明 |
|------|------|
| `stdd ui page <name>` | 生成页面 |
| `stdd ui component <name>` | 生成组件 |
| `stdd ui scaffold` | 脚手架应用 |
| `stdd ui preview` | 预览画廊 |
| `stdd ui test <name>` | 生成测试 |
| `stdd ui diff <name>` | 视觉回归对比 |
| `stdd ui list` | 列出工件 |
| `stdd design create` | 生成设计系统 |

### Graph 引擎（8 个子命令）

| 命令 | 说明 |
|------|------|
| `stdd graph visualize` | DAG 可视化 |
| `stdd graph analyze` | 图结构分析 |
| `stdd graph run` | DAG 工作流执行 |
| `stdd graph parallel` | 并行化分析 |
| `stdd graph history` | 执行历史 |
| `stdd graph replay <id>` | 历史回放 |
| `stdd graph recommend` | 智能推荐 |
| `stdd recommend` | CLI 侧推荐 |

### 辅助工具

| 命令 | 说明 |
|------|------|
| `stdd status` | 变更状态 |
| `stdd list` | 列出变更 |
| `stdd progress` | 进度追踪 |
| `stdd context` | 上下文管理 |
| `stdd memory` | 记忆系统 |
| `stdd learn` | 自适应学习 |
| `stdd workspace` | 工作区管理 |
| `stdd ci` | CI 配置生成 |
| `stdd commit` | 提交信息生成 |
| `stdd product-proposal` | 产品方案报告 |

---

## 在 AI 编码助手中使用斜杠命令

`stdd init` 安装后，以下斜杠命令在 Claude Code 会话中直接使用：

| 斜杠命令 | 用途 | 对应 CLI |
|----------|------|----------|
| `/stdd:init` | 初始化项目 | `stdd init` |
| `/stdd:new` | 创建变更 | `stdd new change <name>` |
| `/stdd:ff 需求描述` | 快速生成产物 | `stdd ff "描述"` |
| `/stdd:spec` | 生成 BDD 规格 | `stdd spec <change>` |
| `/stdd:apply` | TDD 实现 | `stdd apply <change>` |
| `/stdd:verify` | 验证 | `stdd verify <change>` |
| `/stdd:archive` | 归档 | `stdd archive <change>` |
| `/stdd:turbo 需求` | 一键全流程 | `stdd turbo "描述"` |
| `/stdd:issue 描述` | Bug 修复 | `stdd issue "描述"` |
| `/stdd:brainstorm 主题` | 多维度分析 | `stdd brainstorm 主题` |
| `/stdd:explore 范围` | 只读探索 | `stdd explore 范围` |
| `/stdd:graph` | Graph 引擎 | `stdd graph <sub>` |
| `/stdd:roles` | 多 Agent 协作 | `stdd roles <action>` |
| `/stdd:constitution` | Constitution 治理 | `stdd constitution` |
| `/stdd:ui` | UI 生成 | `stdd ui <action>` |

---

## 完整复现命令

```bash
cd ~/my-stdd-project

# 1. 初始化
stdd init
stdd doctor

# 2. 创建变更
stdd ff "为 calculator 增加乘法能力" --change-name add-multiply
stdd spec add-multiply

# 3. 实现
stdd apply add-multiply --dry-run
stdd apply add-multiply
stdd apply add-multiply
stdd apply add-multiply

# 4. 变异测试
stdd mutation add-multiply --threshold 70

# 5. 验证
stdd verify add-multiply --no-constitution

# 6. 推荐
stdd recommend

# 7. 归档
stdd archive add-multiply

# 8. 确认
stdd list --archived --json
node --test
```

---

> **STDD Copilot Ultra v2.0.0**
> - 84 个顶级 CLI 命令 / 88 个命令实现文件
> - 86 个 Command 模板
> - 53 个 Skill 模板
> - 200 测试套件，4151+ 测试用例，100% 通过率
> - 97.7% 语句覆盖，93.2% 分支覆盖
>
> 完整列表见 `stdd --help`、`stdd skills`、`stdd commands`。
