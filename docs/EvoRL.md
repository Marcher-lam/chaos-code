# STDD Copilot 用户实操手册：从零构建一个完整项目

> **版本**: v1.0.5 | **更新日期**: 2026-05-24
> **适用场景**: 从零开始的新项目，完整掌握 STDD Copilot 工作流

---

## 你将学到什么

- STDD 的核心工作流：`init → ff → spec → apply → verify → archive`
- 快捷命令：`ff`（快速生成）、`turbo`（一键全流程）、`issue`（Bug 修复）
- 质量治理：`constitution`、`guard`、`mutation`、`doctor`
- Graph 引擎：`graph run`、`graph recommend`、`graph history`
- 多 Agent 协作：`roles`、`runtime agent`、`supervisor`
- 进度追踪与断点续传：`progress`

---

## 前置条件

| 依赖 | 版本要求 |
|------|----------|
| Node.js | >= 20.0.0 |
| Git | 任意现代版本 |
| AI 编码助手 | Claude Code / Cursor / 其他（可选） |

---

## 安装 STDD Copilot

三种方式任选其一：

```bash
# A: npm 全局安装（推荐）
npm install -g @marcher-lam/stdd-copilot@latest
stdd --version

# B: 源码安装
git clone https://github.com/Marcher-lam/STDD-COPILOT.git ~/stdd-copilot
cd ~/stdd-copilot && npm install && npm link
stdd --version

# C: Docker
docker pull marcher-lam/stdd-copilot:latest
docker run --rm -v "$PWD:/workspace" marcher-lam/stdd-copilot:latest --help
```

---

## 准备演示项目

```bash
mkdir ~/my-stdd-project && cd ~/my-stdd-project
git init && npm init -y
```

创建一个最小源文件用于演示：

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

# 第 1 章：初始化项目

## 1.1 运行 init

```bash
stdd init
```

**你会看到：**
- STDD 目录结构创建：`stdd/changes/`、`stdd/specs/`、`stdd/memory/`、`stdd/graph/`
- 配置文件生成：`stdd/config.yaml`
- AGENTS.md 创建（AI 助手指令文件）

**验证：**
```bash
ls stdd/
# 应该看到: changes  config.yaml  graph  memory  specs
cat stdd/config.yaml
# 确认 test.command 存在
```

## 1.2 配置测试命令

打开 `stdd/config.yaml`，确认测试命令正确：

```yaml
test:
  command: "node --test"
```

## 1.3 检查项目健康

```bash
stdd doctor
```

输出多项检查结果（STDD 目录、配置、Node 版本、Git 状态等）。

```bash
stdd doctor --deep
```

深度模式额外检查 lint、npm audit、活跃变更、Constitution、覆盖率报告。

## 1.4 查看可用命令

```bash
stdd skills        # 列出 47 个 Skill 模板
stdd commands      # 列出 75 个斜杠命令模板
stdd --help        # 列出全部 CLI 命令
```

---

# 第 2 章：创建第一个变更

有两种方式：标准流程（逐步）和快速流程（一键）。

## 2.1 方式 A：标准流程

```bash
# 创建变更目录
stdd new change user-auth

# 查看变更列表
stdd list
# 输出: user-auth  [待启动]

# 查看变更状态
stdd status user-auth
```

## 2.2 方式 B：快速生成（推荐）

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

# 第 3 章：生成规格

## 3.1 从任务生成 BDD Feature 文件

```bash
stdd spec add-multiply
```

**生成：**
```bash
stdd/changes/add-multiply/specs/
└── calculator.feature
```

内容是 Given/When/Then 格式的行为描述。

## 3.2 验证规格质量

```bash
stdd validate add-multiply
```

检查 BDD 格式合规、实现细节泄漏。

```bash
stdd validate add-multiply --spec-guardian --fix
```

检测并自动修复规格中的实现细节泄漏。

---

# 第 4 章：TDD 实现

## 4.1 预览（Dry Run）

```bash
stdd apply add-multiply --dry-run
```

输出将要执行的命令，不修改任何状态。

## 4.2 逐任务执行（Ralph Loop）

```bash
stdd apply add-multiply
```

自动选择第一个待办任务，运行 TDD Ralph Loop：

1. 🔴 **RED** — 先写失败测试
2. 🟢 **GREEN** — 最简实现使测试通过
3. 🔵 **REFACTOR** — 重构代码结构

重复执行直到所有任务完成：

```bash
stdd apply add-multiply   # 执行 TASK-002
stdd apply add-multiply   # 执行 TASK-003
```

## 4.3 指定任务和阶段

```bash
stdd apply add-multiply --task TASK-002
# 或指定 TDD 阶段：
stdd apply add-multiply --phase red
```

## 4.4 允许无测试通过

文档或配置变更可以跳过测试：

```bash
stdd apply add-multiply --allow-no-tests
```

## 4.5 继续中断的工作

```bash
stdd continue add-multiply
```

自动检测上次中断位置，从下一个待办任务继续。

---

# 第 5 章：变异测试与验证

## 5.1 变异测试

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
```

## 5.2 验证

```bash
stdd verify add-multiply
```

验证维度：
- Tasks：全部完成
- Tests：通过
- Constitution：合规

跳过 Constitution 检查：

```bash
stdd verify add-multiply --no-constitution
```

带 lint 检查：

```bash
stdd verify add-multiply --lint
```

## 5.3 质量门禁

```bash
stdd guard
```

全局质量门禁。

```bash
stdd guard --strict
```

严格模式，所有检查均为 blocking。

## 5.4 质量指标

```bash
stdd metrics add-multiply
stdd metrics add-multiply --json
```

---

# 第 6 章：提交与归档

## 6.1 生成提交信息

```bash
stdd commit add-multiply
```

输出 Conventional Commits 格式的提交信息（不自动执行 `git commit`）。

TDD 阶段前缀：

```bash
stdd commit add-multiply --tdd --phase green
```

## 6.2 归档变更

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
# 输出: add-multiply-20260519xxxxx

stdd list
# 输出: No active changes
```

---

# 第 7 章：Bug 修复流程

## 7.1 创建 Bug 变更

```bash
stdd issue "calculator subtract returns wrong result when a < b" --severity high --title "Fix subtract sign"
```

生成包含复现步骤、期望/实际行为的 bugfix change。

## 7.2 修复后验证

```bash
stdd apply fix-subtract-sign
stdd mutation fix-subtract-sign --threshold 50
stdd verify fix-subtract-sign --no-constitution
stdd archive fix-subtract-sign
```

## 7.3 修复上下文包

如果测试失败无法理解原因：

```bash
stdd fix-packet fix-subtract-sign
```

生成 Golden Packet 风格的修复上下文（任务描述、测试命令、环境信息）。

---

# 第 8 章：一键全流程（Turbo）

当需求非常明确时：

```bash
stdd turbo "为 calculator 增加 divide 方法，支持除零保护"
```

自动执行全流程：生成提案 → 规格 → 任务拆解。

---

# 第 9 章：Constitution 治理

## 9.1 查看条例

```bash
stdd constitution           # 9 篇条例概览
stdd constitution show 2    # Article 2: TDD 详情
```

## 9.2 合规检查

```bash
stdd constitution check     # 逐条检查
```

## 9.3 临时豁免

```bash
stdd constitution waive 2 --reason "Legacy 迁移中" --days 7
```

7 天后自动过期，审计可追溯。

## 9.4 合规审计

```bash
stdd audit --json
```

---

# 第 10 章：Graph 引擎

## 10.1 可视化 Skill Graph

```bash
stdd graph visualize              # Mermaid 格式
```

## 10.2 分析项目状态

```bash
stdd graph analyze                # 当前状态 + 可执行路径
stdd graph analyze --bottlenecks  # 识别瓶颈
```

## 10.3 DAG 执行

```bash
# Feature 流：ff → spec → apply → verify → archive
stdd graph run feature

# Hotfix 流：快速修复路径
stdd graph run --intent hotfix

# Repair 流：fix-packet → apply → verify
stdd graph run --intent repair

# Research 流：探索分析
stdd graph run --intent research
```

## 10.4 智能推荐

```bash
stdd graph recommend    # 基于当前状态推荐下一步
stdd recommend          # CLI 侧推荐
stdd recommend --json
```

## 10.5 执行历史

```bash
stdd graph history              # 查看历史
stdd graph history --failures   # 只看失败
```

---

# 第 11 章：多 Agent 协作

## 11.1 角色列表

```bash
stdd roles list
# 12 个角色: po, developer, tester, reviewer, architect, security, devops, ux, ba, techwriter, qalead, dataanalyst
```

## 11.2 Party Mode 多角色讨论

```bash
stdd roles party 讨论 API 设计风格 --roles=architect,developer,security
```

## 11.3 对抗式安全审查

```bash
stdd roles adversarial src/
```

扫描 risk-pattern，输出安全风险报告。

## 11.4 Runtime Agent 状态机

```bash
stdd runtime agent start "架构选型讨论" --rounds 3
stdd runtime agent next
stdd runtime agent stop
```

## 11.5 SudoLang 伪代码

```bash
echo 'DEFINE Calculator { add(a, b) => a + b }' > calc.sudo
stdd sudo run calc.sudo
```

---

# 第 12 章：进度追踪

## 12.1 查看进度

```bash
stdd progress              # 最近 20 条
stdd progress --last 50    # 最近 50 条
stdd progress --summary    # 总览（成功/失败/中断）
stdd progress --json       # JSON 格式
```

## 12.2 断点续传

如果终端意外关闭：

```bash
stdd progress --resume
# 输出: 上次中断命令 + 推荐恢复命令
stdd continue add-multiply
```

## 12.3 清空进度

```bash
stdd progress --clear
```

---

# 第 13 章：辅助工具

## 13.1 探索项目

```bash
stdd explore                  # 只读探索，输出架构分析
stdd explore auth --json      # 指定范围
```

## 13.2 上下文管理

```bash
stdd context                  # 加载项目上下文
stdd context --export         # 导出上下文
stdd context --json
```

## 13.3 API 规范生成

```bash
stdd api-spec add-multiply    # 从 BDD feature 生成 OpenAPI
```

## 13.4 Schema 管理

```bash
stdd schema validate                    # 验证所有 schemas
stdd schema validate schemas/           # 验证指定目录
stdd schema create custom-flow         # 创建 workflow schema
stdd schema fork existing-flow new-flow # fork 现有 schema
```

## 13.5 契约测试

```bash
stdd contract generate add-multiply   # 从 API 规格生成契约
stdd contract verify add-multiply     # 验证契约一致性
```

## 13.6 Mock 生成

```bash
stdd mock add-multiply    # 为变更生成 mock 数据
```

## 13.7 用户测试脚本

```bash
stdd user-test add-multiply    # 生成人类可读的验收脚本
```

## 13.8 Story Mapping

```bash
stdd story create login-journey --persona "普通用户"
stdd story bdd stdd/journeys/login-journey.yaml
```

## 13.9 CI 配置

```bash
stdd ci github    # 生成 .github/workflows/ci.yml
```

## 13.10 依赖检查

```bash
stdd depcheck
stdd depcheck --json
```

## 13.11 Workspace 管理（Monorepo）

```bash
stdd workspace list       # 列出工作区
stdd workspace validate   # 验证注册表
stdd workspace repair     # 刷新注册表
```

## 13.12 产品方案报告

```bash
stdd product-proposal     # 聚合所有产物生成产品方案
stdd product-proposal --json
```

---

# 第 14 章：学习与记忆

## 14.1 自适应学习

```bash
stdd learn scan                           # 扫描项目代码风格
stdd learn good "TDD 节奏控制得很好"        # 记录正面反馈
stdd learn bad "mock 数据不够真实"         # 记录负面反馈
stdd learn suggest "使用消息队列替代推送"   # 记录改进建议
stdd learn status                         # 查看学习状态
```

## 14.2 记忆系统

```bash
stdd memory scan                         # 扫描项目组件
stdd memory save                         # 持久化记忆
stdd memory search "认证架构决策"          # 语义搜索
stdd memory list                         # 列出记忆
stdd memory stats                        # 查看统计
```

---

# 完整复现命令

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
# (实现 multiply 函数和测试)
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

# 在 AI 编码助手中使用斜杠命令

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

---

> **STDD Copilot v1.0.5**
> - 75 个 CLI 命令
> - 80 个 Command 模板
> - 47 个 Skill 模板
> - 171 测试套件，3810 测试用例，100% 通过率
> - 97.33% 语句覆盖，91.03% 分支覆盖
>
> 完整列表见 `stdd --help`、`stdd skills`、`stdd commands`。
