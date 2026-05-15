# STDD Copilot 全斜杠命令实操验证文档

> **验证项目**: EvoAgent — 基于 RL/GA 的可进化 Agent 协作平台
> **验证日期**: 2026-05-15
> **验证环境**: Claude Code
> **覆盖范围**: 69 个 `/stdd:` 斜杠命令 (Command 模板 + Skill 模板) + CLI 命令
> **测试用例数**: 110
> **质量基线**: `npm run premerge` (audit + zero-warning lint + docs + coverage + 77 suites / 888 tests)

---

## 验证项目描述

**EvoAgent** — 一个用户通过前端界面创建和管理 Agent 的平台。Agent 可在群组中 Slack 风格讨论，支持 1v1/1v多对话，并通过 RL 策略优化和 GA 交叉变异实现自进化。

| 模块 | 技术栈 |
|------|--------|
| 前端 | React + TypeScript + Vite |
| 后端 | Express + Node.js + WebSocket |
| 数据库 | SQLite (记忆) + Redis (消息队列) |
| AI | RL 策略梯度 + GA 交叉变异 |
| 测试 | Vitest + Playwright |

**功能清单**:
1. 用户注册/登录 (JWT 鉴权)
2. Agent 创建与管理 (CRUD)
3. 群组管理 (创建/加入/退出)
4. Slack 风格群聊 (Agent 在群组中讨论交流)
5. 1v1 / 1v多 讨论
6. Agent 自进化 (RL 策略优化 + GA 交叉变异)

---

## 环境准备

### 安装 STDD Copilot (三选一)

**方式 A: npm 全局安装**
```bash
npm install -g @marcher-lam/stdd-copilot@latest
stdd --version
```

**方式 B: 源码安装**
```bash
git clone https://github.com/Marcher-lam/STDD-COPILOT.git ~/stdd-copilot
cd ~/stdd-copilot && npm install && npm link
stdd --version
```

**方式 C: Docker — 隔离运行 / CI smoke**
```bash
docker pull marcher-lam/stdd-copilot:latest
docker run --rm -v "$PWD:/workspace" marcher-lam/stdd-copilot:latest --help
```
> Docker 适合 CI 验证和企业内网分发。常规开发推荐 npm 全局安装。

### 创建验证项目

```bash
mkdir ~/evo-agent && cd ~/evo-agent
git init && npm init -y
```

在 `~/evo-agent` 目录下打开 Claude Code 开始验证。

---

## 测试约定

| 标记 | 含义 |
|------|------|
| `[PASS]` | 命令执行成功，输出/产物符合预期 |
| `[PASS*]` | 核心功能正常，部分行为有差异 |
| `[FAIL]` | 命令报错或产物异常 |
| `[SKIP]` | 前置条件不满足 (需 Playwright/Stryker 等) |

每个测试用例格式：
```
### T## — /stdd:xxx
用户场景 → 输入命令 → 预期产物 → 验证点
```

---

# Part I: 项目初始化与第一个功能 (Day 1)

> **场景**: 小明刚创建了一个空项目，准备引入 STDD 规范化开发。今天的目标是完成第一个功能：用户注册登录。

## Phase 0: 项目初始化

### T01 — /stdd:init
> **场景**: 小明在空目录中打开 Claude Code，输入第一条 STDD 命令

```
/stdd:init
```
**预期产物**: `stdd/` 目录结构 + `stdd/config.yaml` + `.claude/commands/stdd/` + `.claude/skills/`
**验证点**:
- [ ] `stdd/` 下存在 `changes/`, `specs/`, `memory/`, `graph/`
- [ ] `stdd/config.yaml` 存在且为合法 YAML
- [ ] `.claude/commands/stdd/` 下有 20 个 `.md` 命令模板
- [ ] `.claude/skills/stdd/` 下有技能定义目录

### T02 — /stdd:vision
> **场景**: 小明想先明确项目的长期目标

```
/stdd:vision EvoAgent — 一个基于强化学习和遗传算法的可进化多Agent协作平台
```
**预期产物**: `stdd/vision.md`
**验证点**:
- [ ] 包含 EvoAgent 的长期目标、架构北极星、战略方向

### T03 — /stdd:help
> **场景**: 小明不太确定下一步该做什么

```
/stdd:help
```
**预期产物**: 上下文感知的帮助信息
**验证点**:
- [ ] 检测到项目刚初始化，推荐下一步命令
- [ ] 显示相关命令和示例

---

## Phase 1: 需求探索

### T04 — /stdd:explore
> **场景**: 小明想了解当前项目状态和技术选型建议

```
/stdd:explore 分析当前项目结构和已有的代码，给出技术选型建议
```
**预期产物**: `stdd/explorations/explore-*.md` 探索报告
**验证点**:
- [ ] 输出项目类型检测结果
- [ ] 报告写入 `stdd/explorations/`
- [ ] 未修改任何业务代码 (只读)

### T05 — /stdd:explore --deep
> **场景**: 小明想深入分析认证模块的技术选型

```
/stdd:explore 深入分析用户认证相关的技术选型和架构决策 --deep
```
**预期产物**: 深度探索报告
**验证点**:
- [ ] 包含技术选型建议 (JWT vs Session 等)
- [ ] 包含架构影响分析

### T06 — /stdd:brainstorm
> **场景**: 小明在动手之前想听听多维度分析

```
/stdd:brainstorm
```
**预期产物**: 多维度分析报告 (架构洞察/代码质量/技术评估/重构建议)
**验证点**:
- [ ] 输出纯分析建议，零文件修改
- [ ] 覆盖多个分析维度

---

## Phase 2: 需求提案与澄清

### T07 — /stdd:new
> **场景**: 小明决定从最基础的用户认证功能开始

```
/stdd:new 用户注册和登录系统，支持邮箱密码注册、JWT鉴权、Token刷新
```
**预期产物**: `stdd/changes/change-*/proposal.md` + `.status.yaml`
**验证点**:
- [ ] 创建变更目录 `stdd/changes/change-*/`
- [ ] `proposal.md` 包含需求描述
- [ ] `.status.yaml` 初始状态为 proposal 阶段

### T08 — /stdd:propose
> **场景**: 小明详细描述需求，包含边界条件

```
/stdd:propose 实现完整的用户认证系统：邮箱注册、密码bcrypt加密存储、JWT签发与刷新、登出Token失效、密码重置
```
**预期产物**: 更新 `proposal.md`，含 Epic 检测和边界分析
**验证点**:
- [ ] 自动检测是否需要拆分为多个 Epic
- [ ] 包含边界条件和隐式约束分析

### T09 — /stdd:clarify
> **场景**: AI 助手识别到模糊点，需要小明澄清

```
/stdd:clarify
```
**预期产物**: 多轮澄清记录，更新 `proposal.md`
**验证点**:
- [ ] 识别模糊点、边缘场景、非功能需求
- [ ] 提出澄清问题 (如社交登录、Token过期时间等)

### T10 — /stdd:confirm
> **场景**: 需求足够清晰，小明确认推进

```
/stdd:confirm
```
**预期产物**: 确认门，等待人类 yes/no
**验证点**:
- [ ] 显示 proposal 摘要和范围
- [ ] 回复「确认」后推进到 spec 阶段

### T11 — /stdd:prp
> **场景**: 确认后，小明做一次结构化规划梳理

```
/stdd:prp
```
**预期产物**: What/Why/How/Success 结构化规划文档
**验证点**:
- [ ] 输出四段式规划 (What/Why/How/Success)
- [ ] 便于干系人对齐

---

## Phase 3: 规格生成 (BDD)

### T12 — /stdd:spec
> **场景**: 进入规格阶段，生成 BDD feature 文件

```
/stdd:spec
```
**预期产物**: `specs/` 下的 BDD `.feature` 文件 (Given/When/Then)
**验证点**:
- [ ] 生成 delta specs，含 ADDED/MODIFIED/REMOVED 标记
- [ ] 每个 scenario 遵循 Given/When/Then 格式

### T13 — /stdd:validate
> **场景**: 小明想确保规格质量

```
/stdd:validate
```
**预期产物**: 规格合规诊断报告
**验证点**:
- [ ] 检查 BDD 格式合规
- [ ] 检查 RFC 2119 关键词使用
- [ ] 检测覆盖缺口和跨变更冲突

### T14 — /stdd:validate --spec-guardian --fix
> **场景**: 小明检测并修复规格中的实现细节泄漏

```
/stdd:validate --spec-guardian --fix
```
**预期产物**: Spec Guardian 泄漏检测 + 自动修复
**验证点**:
- [ ] 检测 specs 中是否泄漏了实现细节 (路径、DB 表名、类名)
- [ ] `--fix` 自动写入 rewrite suggestions

### T15 — /stdd:api-spec
> **场景**: 前后端分离项目需要清晰的 API 定义

```
/stdd:api-spec 为 user-auth 生成 OpenAPI 规范，包含 /auth/register、/auth/login、/auth/refresh、/auth/logout
```
**预期产物**: `api-spec.yaml` (OpenAPI 规范) + TypeScript 类型定义
**验证点**:
- [ ] 包含所有认证端点
- [ ] 生成 `src/types/api.ts` 类型定义

### T16 — /stdd:schema
> **场景**: 生成数据校验结构

```
/stdd:schema 为 User、LoginRequest、AuthResponse、JWTPayload 创建 JSON Schema 和 Zod 校验
```
**预期产物**: JSON Schema + Zod 运行时校验 + TypeScript 类型
**验证点**:
- [ ] 生成 `{User,LoginRequest,AuthResponse}.schema.json`
- [ ] 生成 `src/schemas/{type}.ts` Zod schema

### T17 — /stdd:contract
> **场景**: 前后端需要消费者驱动契约

```
/stdd:contract generate user-auth
/stdd:contract verify user-auth
```
**预期产物**: 消费者驱动契约测试 (Pact 格式)
**验证点**:
- [ ] 生成 `{consumer}-{provider}.pact.json`
- [ ] 包含注册/登录的请求响应契约

---

## Phase 4: 设计与任务拆解

### T18 — /stdd:plan
> **场景**: 将需求拆解为可执行的微任务

```
/stdd:plan
```
**预期产物**: `tasks.md` (5-6 个原子微任务，每个约 30 分钟)
**验证点**:
- [ ] 每个任务有明确描述和验收标准
- [ ] 任务粒度在 5-6 个左右
- [ ] `.status.yaml` 更新到 design 阶段

### T19 — /stdd:design
> **场景**: 生成详细技术设计文档

```
/stdd:design
```
**预期产物**: `design.md` (技术设计文档 + ADR)
**验证点**:
- [ ] 包含 Context/Decision/Rationale/Consequences ADR 格式
- [ ] 包含数据模型、API 设计、文件级变更

---

## Phase 5: TDD 实现

### T20 — /stdd:guard on
> **场景**: 小明准备编码，先启用 TDD 守护

```
/stdd:guard on
```
**预期产物**: TDD 守护规则启用
**验证点**:
- [ ] 启用 test-first (Blocking)、minimal-impl (Warning)、test-must-fail (Warning)、no-skip-refactor (Suggestion)

### T21 — /stdd:apply
> **场景**: 进入 Ralph Loop TDD 循环

```
/stdd:apply
```
**预期产物**: Ralph Loop TDD 循环 (RED → CHECK → GREEN → MUTATION → REFACTOR)
**验证点**:
- [ ] 先生成失败测试 (RED)
- [ ] 运行静态检查 (CHECK)
- [ ] 最简实现通过测试 (GREEN)
- [ ] 变异审查 (MUTATION)
- [ ] 代码重构 (REFACTOR)

### T22 — /stdd:apply --task=TASK-002
> **场景**: 小明想单独实现 TASK-002

```
/stdd:apply --task=TASK-002
```
**预期产物**: 执行指定任务
**验证点**:
- [ ] 跳到 TASK-002 执行，不影响 TASK-001 状态

### T23 — /stdd:apply --fix
> **场景**: 测试失败，需要修复

```
/stdd:apply --fix
```
**预期产物**: 修复失败测试
**验证点**:
- [ ] 识别当前失败测试并修复

### T24 — /stdd:execute
> **场景**: 小明也尝试了 execute (apply 的别名)

```
/stdd:execute
```
**预期产物**: Ralph Loop 执行循环
**验证点**:
- [ ] 同样执行 RED → GREEN → REFACTOR 循环

### T25 — /stdd:mock
> **场景**: 外部依赖需要 mock

```
/stdd:mock
```
**预期产物**: `src/__mocks__/{service}.mock.ts`
**验证点**:
- [ ] 为外部依赖生成 mock 实现
- [ ] mock 文件可被测试框架自动加载

### T26 — /stdd:mock --all --fake
> **场景**: 扫描所有依赖并生成 working fakes

```
/stdd:mock --all --fake
```
**预期产物**: 全面 mock 覆盖
**验证点**:
- [ ] `--all` 扫描所有外部依赖
- [ ] `--fake` 生成可运行的 fake 而非 stub

### T27 — /stdd:factory
> **场景**: 需要大量测试数据

```
/stdd:factory
```
**预期产物**: `src/__factories__/{Type}Factory.ts` + `scenarios.ts`
**验证点**:
- [ ] 使用 Builder pattern + Faker.js 生成测试数据工厂
- [ ] 覆盖正常/边界/异常场景

### T28 — /stdd:mutation
> **场景**: 检查是否有"骗绿灯"断言

```
/stdd:mutation
```
**预期产物**: 变异测试报告 (Quick 启发式)
**验证点**:
- [ ] Quick 模式生成启发式 mutation score
- [ ] 输出 anti-fake-green 检测结果

### T29 — /stdd:outside-in
> **场景**: 有清晰 API 边界的功能适合 outside-in

```
/stdd:outside-in
```
**预期产物**: 从 E2E → 集成 → 单元层层推进的 TDD 实现
**验证点**:
- [ ] 从用户可见行为开始写测试
- [ ] 逐步向内驱动实现

---

## Phase 6: 验证与质量

### T30 — /stdd:verify
> **场景**: 全面验证实现与规格的一致性

```
/stdd:verify
```
**预期产物**: 5 维验证报告
**验证点**:
- [ ] 检查实现与规格的一致性
- [ ] 输出逐项验证结果

### T31 — /stdd:verify --all --fix
> **场景**: 验证所有变更 + 自动修复

```
/stdd:verify --all --fix
```
**预期产物**: 全面验证 + 自动修复
**验证点**:
- [ ] `--all` 验证所有活跃变更
- [ ] `--fix` 自动修复不一致

### T32 — /stdd:metrics
> **场景**: 查看质量指标

```
/stdd:metrics
```
**预期产物**: 质量指标仪表板
**验证点**:
- [ ] 显示测试覆盖率、mutation score
- [ ] 显示 lint 警告、类型错误、复杂度

### T33 — /stdd:metrics --export
> **场景**: 导出质量报告到文件

```
/stdd:metrics --export
```
**预期产物**: 导出质量报告文件
**验证点**:
- [ ] 生成可归档的指标报告文件

### T34 — /stdd:complexity
> **场景**: 代码复杂度分析

```
/stdd:complexity
```
**预期产物**: 代码复杂度分析 + Top-10 热点
**验证点**:
- [ ] 圈复杂度、认知复杂度、APP Mass 分析
- [ ] 输出重构建议

### T35 — /stdd:certainty
> **场景**: 5 维度置信度评分

```
/stdd:certainty
```
**预期产物**: 置信度评分 (需求清晰度/技术可行性/风险/测试覆盖/愿景对齐)
**验证点**:
- [ ] 每个维度 1-5 分评分
- [ ] 低于阈值时暂停请求人类确认

---

## Phase 7: 提交与归档

### T36 — /stdd:user-test
> **场景**: 小明想让产品经理也能验证功能

```
/stdd:user-test
```
**预期产物**: `user-test.md` 人类可读的验收测试脚本
**验证点**:
- [ ] 从 BDD 规格生成自然语言测试步骤
- [ ] 非技术人员可执行

### T37 — /stdd:final-doc
> **场景**: 聚合所有产物为最终文档

```
/stdd:final-doc
```
**预期产物**: `FINAL_REQUIREMENT.md` 综合文档
**验证点**:
- [ ] 聚合 proposal + specs + design + tasks + 实现记录 + 质量指标

### T38 — /stdd:commit
> **场景**: 原子化提交，TDG 阶段前缀

```
/stdd:commit
```
**预期产物**: 原子化 git commit (red:/green:/refactor: 前缀)
**验证点**:
- [ ] 提交信息遵循 TDG 阶段前缀格式
- [ ] 提交前通过 Constitution 规则验证

### T39 — /stdd:archive
> **场景**: 第一个功能完成，归档

```
/stdd:archive
```
**预期产物**: 变更归档 + delta specs 合并
**验证点**:
- [ ] 变更目录移动到 `stdd/changes/archive/`
- [ ] ADDED specs 追加、MODIFIED specs 替换、REMOVED specs 删除
- [ ] 生成 `spec-merge-report.json`

### T40 — /stdd:guard status
> **场景**: 查看 guard 规则状态

```
/stdd:guard status
```
**预期产物**: 当前 guard 规则状态
**验证点**:
- [ ] 显示四条规则的启用/禁用状态

---

# Part II: 快捷流程与 Bug 修复 (Day 2-3)

> **场景**: 有了第一天的经验，小明开始使用快捷命令加速开发。遇到 WebSocket Bug 时用 issue 流程修复。

## Phase 8: 快捷入口

### T41 — /stdd:ff (Fast-Forward)
> **场景**: 需求明确，快速生成所有产物 — Agent CRUD

```
/stdd:ff 实现Agent创建与管理，支持CRUD操作，每个Agent有名称、描述、配置参数
```
**预期产物**: 一次性生成 proposal + specs + design + tasks
**验证点**:
- [ ] 四个文件全部生成
- [ ] 变更目录结构完整
- [ ] 控制台提示可执行 `/stdd:apply`

### T42 — /stdd:ff --dry-run
> **场景**: 预览群组功能将要生成的产物

```
/stdd:ff 实现群组管理功能 --dry-run
```
**预期产物**: 仅预览不执行
**验证点**:
- [ ] 显示将要生成的产物列表
- [ ] 未创建任何文件

### T43 — /stdd:continue
> **场景**: 自动推进到下一个缺失产物

```
/stdd:continue
```
**预期产物**: 自动检测 `.status.yaml`，推进到下一个缺失产物
**验证点**:
- [ ] 正确识别当前阶段
- [ ] 生成下一个产物并更新状态

### T44 — /stdd:continue --specs
> **场景**: 强制生成 specs 产物

```
/stdd:continue --specs
```
**预期产物**: 强制生成 specs
**验证点**:
- [ ] 跳过其他阶段，直接生成 specs

### T45 — /stdd:turbo
> **场景**: 核心功能需求清晰，一键全流程 — 遗传进化引擎

```
/stdd:turbo 实现Agent遗传进化引擎，包含基因组编码、适应度函数、选择/交叉/变异算子、进化循环
```
**预期产物**: 串行执行 propose → clarify → confirm → spec → plan 全流程
**验证点**:
- [ ] 所有前置阶段产物完整
- [ ] 在确认门暂停等待人类确认

---

## Phase 9: Bug 修复

### T46 — /stdd:issue
> **场景**: 群组功能上线后发现 WebSocket 消息丢失

```
/stdd:issue Agent群组通信时偶发消息丢失，WebSocket连接不稳定，需要添加可靠投递和重连机制
```
**预期产物**: TDD Bug 修复流程
**验证点**:
- [ ] 引导用户描述 bug
- [ ] 自动分类 bug 类型
- [ ] 先写失败测试 (RED)，再最小修复 (GREEN)
- [ ] 回归验证

---

# Part III: Graph 引擎与多 Agent 协作 (Day 5)

> **场景**: 核心功能完成后，小明利用 Graph 引擎和多 Agent 角色协作来优化项目。

## Phase 10: Graph 引擎

### T47 — /stdd:graph visualize
> **场景**: 小明想了解当前项目的 Skill Graph 状态

```
/stdd:graph visualize
```
**预期产物**: Skill Graph 依赖图 (Mermaid 格式)
**验证点**:
- [ ] 显示 Skill 的 DAG 依赖关系
- [ ] 当前阶段高亮

### T48 — /stdd:graph visualize --format=html
> **场景**: 生成浏览器可打开的可视化

```
/stdd:graph visualize --format=html
```
**预期产物**: HTML 格式可视化
**验证点**:
- [ ] 生成可浏览器打开的 HTML 文件

### T49 — /stdd:graph analyze
> **场景**: 分析当前项目状态

```
/stdd:graph analyze
```
**预期产物**: 当前状态分析 + 可执行路径
**验证点**:
- [ ] 分析当前项目状态
- [ ] 列出可执行的 Skill 路径

### T50 — /stdd:graph analyze --bottlenecks
> **场景**: 识别工作流瓶颈

```
/stdd:graph analyze --bottlenecks
```
**预期产物**: 瓶颈分析
**验证点**:
- [ ] 识别工作流瓶颈

### T51 — /stdd:graph run feature
> **场景**: 按 feature intent DAG 执行完整 workflow

```
/stdd:graph run feature
```
**预期产物**: 按 feature intent DAG 执行
**验证点**:
- [ ] 按 ff → spec → outside-in → apply → verify → archive 路径执行

### T52 — /stdd:graph run --intent repair
> **场景**: RL 引擎测试失败，用 repair intent 修复

```
/stdd:graph run --intent repair --change-name <change>
```
**预期产物**: 按 repair intent 走 fix-packet → apply → verify
**验证点**:
- [ ] 从 fix-packet 开始修复流程

### T53 — /stdd:graph parallel --detect
> **场景**: 检测可并行的 Skill

```
/stdd:graph parallel --detect
```
**预期产物**: 检测可并行的 Skill
**验证点**:
- [ ] 列出无依赖关系的 Skill 组

### T54 — /stdd:graph parallel --execute
> **场景**: 并行执行独立 Skill

```
/stdd:graph parallel --execute --max-workers=4
```
**预期产物**: 并行执行独立 Skill
**验证点**:
- [ ] 并行执行无依赖任务

### T55 — /stdd:graph history
> **场景**: 查看执行历史

```
/stdd:graph history
```
**预期产物**: 执行历史记录
**验证点**:
- [ ] 显示时间戳、执行状态、Skill 名称

### T56 — /stdd:graph history --failures
> **场景**: 只看失败记录

```
/stdd:graph history --failures
```
**预期产物**: 仅显示失败记录
**验证点**:
- [ ] 过滤只显示失败项

### T57 — /stdd:graph recommend
> **场景**: 智能推荐下一步

```
/stdd:graph recommend
```
**预期产物**: 智能推荐下一步
**验证点**:
- [ ] 基于当前状态推荐命令和原因

---

## Phase 11: 多 Agent 与角色协作

### T58 — /stdd:roles list
> **场景**: 查看可用的 12 个 Agent 角色

```
/stdd:roles list
```
**预期产物**: 12 个 Agent 角色列表
**验证点**:
- [ ] 显示 po, developer, tester, reviewer, architect, security, devops, ux, ba, techwriter, qalead, dataanalyst

### T59 — /stdd:roles party
> **场景**: 多角色讨论 Agent 自进化的 RL 奖励函数设计

```
/stdd:roles party 讨论Agent自进化的RL奖励函数设计 --roles=architect,developer,security
```
**预期产物**: 多 Agent 辩论记录
**验证点**:
- [ ] 三个角色依次发言
- [ ] 观点有冲突和收敛

### T60 — /stdd:roles adversarial
> **场景**: 安全角色对 RL 引擎做对抗式审查

```
/stdd:roles adversarial src/rl/
```
**预期产物**: 对抗式安全审查报告
**验证点**:
- [ ] 扫描 risk-pattern
- [ ] 输出安全风险和建议

### T61 — /stdd:supervisor start
> **场景**: 启动 Supervisor 协调多个模块开发

```
/stdd:supervisor start
```
**预期产物**: 启动 Supervisor 协调器
**验证点**:
- [ ] 显示协调器状态

### T62 — /stdd:supervisor status
> **场景**: 查看 agent 任务分配状态

```
/stdd:supervisor status
```
**预期产物**: 当前 agent 任务分配状态
**验证点**:
- [ ] 显示各 agent 工作状态

### T63 — /stdd:parallel
> **场景**: 并行执行独立任务

```
/stdd:parallel
```
**预期产物**: DAG 分析 + 并行执行独立任务
**验证点**:
- [ ] 识别可并行的任务组
- [ ] 并行执行并聚合结果

---

# Part IV: 学习、记忆与迭代 (Day 6)

> **场景**: 项目接近尾声，小明做最后的质量治理和学习记录。

## Phase 12: 记忆系统

### T64 — /stdd:memory save
> **场景**: 将高价值上下文持久化

```
/stdd:memory save
```
**预期产物**: 持久化记忆条目
**验证点**:
- [ ] 存储到记忆系统

### T65 — /stdd:memory search
> **场景**: 语义搜索之前的架构决策

```
/stdd:memory search Agent自进化架构决策
```
**预期产物**: 语义搜索结果
**验证点**:
- [ ] 返回相关记忆条目

### T66 — /stdd:memory stats
> **场景**: 查看记忆系统统计

```
/stdd:memory stats
```
**预期产物**: 记忆系统统计
**验证点**:
- [ ] 显示存储条目数和占用空间

---

## Phase 13: 自适应学习

### T67 — /stdd:learn scan
> **场景**: 提取项目代码风格 pattern

```
/stdd:learn scan
```
**预期产物**: `code-patterns.json` + `styleguide.md`
**验证点**:
- [ ] 提取命名/模块/测试/错误处理风格
- [ ] 输出可复用的 pattern

### T68 — /stdd:learn good
> **场景**: 记录正面反馈

```
/stdd:learn good "TDD 循环中红绿重构的节奏控制得很好"
```
**预期产物**: 记录正面反馈
**验证点**:
- [ ] 反馈被记录到学习系统

### T69 — /stdd:learn bad
> **场景**: 记录负面反馈 — mock 不够真实

```
/stdd:learn bad "mock 数据不够真实，导致集成测试通过了但生产环境失败"
```
**预期产物**: 记录负面反馈
**验证点**:
- [ ] 反馈被记录，影响后续行为

### T70 — /stdd:learn suggest
> **场景**: 记录改进建议 — 消息队列替代直接推送

```
/stdd:learn suggest "群聊消息应该使用消息队列而不是直接 WebSocket 推送"
```
**预期产物**: 记录改进建议
**验证点**:
- [ ] 建议被记录

### T71 — /stdd:learn status
> **场景**: 查看学习系统状态

```
/stdd:learn status --json
```
**预期产物**: 学习系统状态
**验证点**:
- [ ] 显示已学习的 pattern 数量和反馈统计

---

## Phase 14: 上下文与迭代

### T72 — /stdd:context
> **场景**: 加载项目三层文档上下文

```
/stdd:context
```
**预期产物**: 三层文档上下文 (Foundation + Component + Feature)
**验证点**:
- [ ] 加载 foundation.md、components.md、contracts.md
- [ ] 总 token 不超过 ~3500

### T73 — /stdd:context --export
> **场景**: 导出上下文到文件

```
/stdd:context --export
```
**预期产物**: 导出上下文文件
**验证点**:
- [ ] 生成可共享的上下文文件

### T74 — /stdd:iterate
> **场景**: 对 RL 引擎做最后一轮迭代

```
/stdd:iterate
```
**预期产物**: Plan-Execute-Reflect 自主迭代循环
**验证点**:
- [ ] 自动迭代改进实现质量
- [ ] 检测质量退化时停止

### T75 — /stdd:iterate --max 5
> **场景**: 限制最多 5 轮迭代

```
/stdd:iterate --max 5
```
**预期产物**: 限制 5 轮迭代
**验证点**:
- [ ] 5 轮后自动停止

---

# Part V: Constitution 治理 (Day 6)

> **场景**: 小明做 Constitution 合规检查，为 RL 引擎申请临时豁免。

## Phase 15: Constitution 管理

### T76 — /stdd:constitution
> **场景**: 查看 9 篇条例概览

```
/stdd:constitution
```
**预期产物**: 显示 9 篇条例概览
**验证点**:
- [ ] 列出全部 9 篇，含优先级 (Blocking/Warning/Suggestion)

### T77 — /stdd:constitution show 2
> **场景**: 查看 TDD 条例详情

```
/stdd:constitution show 2
```
**预期产物**: TDD 条例 (Article 2) 详情
**验证点**:
- [ ] 显示测试先行、覆盖率 gate、mutation evidence gate 规则

### T78 — /stdd:constitution check
> **场景**: 逐条合规检查

```
/stdd:constitution check
```
**预期产物**: 逐条合规检查结果
**验证点**:
- [ ] 每篇条例显示通过/失败

### T79 — /stdd:constitution check --changed
> **场景**: 仅检查有变更的条例

```
/stdd:constitution check --changed
```
**预期产物**: 仅检查有变更的条例
**验证点**:
- [ ] 过滤只检查变更相关条例

### T80 — /stdd:constitution waivers
> **场景**: 查看当前豁免列表

```
/stdd:constitution waivers
```
**预期产物**: 当前豁免列表
**验证点**:
- [ ] 显示已申请的豁免及有效期

### T81 — /stdd:constitution waive
> **场景**: RL 引擎测试覆盖率暂不达标，申请 7 天豁免

```
/stdd:constitution waive --article=2 --reason="RL引擎还在迭代中" --days=7
```
**预期产物**: 创建临时豁免
**验证点**:
- [ ] 写入豁免记录，7 天后自动过期
- [ ] 审计追踪完整

---

# Part VI: 辅助 CLI 验证 (终端执行)

> 以下命令需在终端执行 (Claude Code 中用 `!` 前缀)，用于辅助验证斜杠命令产生的产物。

### T82 — stdd list / status
> **场景**: 确认斜杠命令创建的变更在 list/status 中可见

```bash
! stdd list
! stdd list --specs
! stdd list --archived
! stdd list --json
! stdd status
! stdd status --json
```
**验证点**: 确认变更可见

### T83 — stdd skills / commands
> **场景**: Skills 和斜杠命令列表完整

```bash
! stdd skills
! stdd commands
```
**验证点**: Skills 和斜杠命令列表完整

### T84 — stdd hooks
> **场景**: Hook 系统安装/验证/状态/切换

```bash
! stdd hooks install
! stdd hooks verify
! stdd hooks status
! stdd hooks disable
! stdd hooks enable
```
**验证点**: Hook 系统完整流程

### T85 — stdd workspace
> **场景**: Workspace 管理三件套

```bash
! stdd workspace list
! stdd workspace validate
! stdd workspace repair
```
**验证点**: Workspace 管理正常

### T86 — stdd recommend / depcheck / doctor
> **场景**: 推荐/依赖检查/诊断 (含深度检查)

```bash
! stdd recommend
! stdd depcheck
! stdd doctor
! stdd doctor --deep
```
**验证点**: 三个辅助命令正常，`--deep` 输出 lint/audit/changes/progress/evidence

### T87 — stdd constitution (CLI 侧)
> **场景**: Constitution 完整 CLI 流程

```bash
! stdd constitution
! stdd constitution show 2
! stdd constitution status
! stdd constitution audit --json
! stdd constitution fix --article 2 --dry-run
```
**验证点**: Constitution CLI 完整流程

### T88 — stdd runtime
> **场景**: Agent 状态机 (Party Mode) 运行时

```bash
! stdd runtime agent start "Agent 通信协议选型" --rounds 3
! stdd runtime agent next --json
! stdd runtime agent stop
```
**验证点**: Agent 状态机运行

### T89 — stdd browser
> **场景**: 浏览器自动化 + 诊断 (需 Playwright)

```bash
! stdd browser doctor
! stdd browser doctor --json
! stdd doctor --deep
# (需要前端 dev server 运行)
! stdd browser snapshot http://localhost:3000
! stdd browser inspect http://localhost:3000
```
**验证点**: 浏览器工具可用

---

# Part VII: 实时进度追踪与断点续传

> **场景**: `stdd progress` 命令 + `stdd/progress.jsonl` 全局进度日志。小明在第 3 天下班时终端意外关闭，第 4 天回来需要断点恢复。

### T90 — stdd progress
> **场景**: 小明结束一天工作前，查看今日命令历史

```bash
! stdd progress
```
**预期产物**: 显示最近 20 条进度记录 (▶start ✓complete ✗fail ⚡interrupt)
**验证点**:
- [ ] 显示每条命令的类型、时间、命令名、关联 change
- [ ] 包含之前所有已执行命令的记录

### T91 — stdd progress --last 50
> **场景**: 查看更多历史记录

```bash
! stdd progress --last 50
```
**预期产物**: 显示最近 50 条记录
**验证点**:
- [ ] 数量上限正确

### T92 — stdd progress --summary
> **场景**: 查看进度总览

```bash
! stdd progress --summary
```
**预期产物**: 进度总览 (总命令数/成功/失败/中断/未完成)
**验证点**:
- [ ] `Completed` 数量 >= 0
- [ ] 如有未完成命令，显示 `⚠ N incomplete → stdd progress --resume`

### T93 — stdd progress --resume
> **场景**: 第 4 天回来，小明需要断点恢复

```bash
! stdd progress --resume
```
**预期产物**: 显示上次中断命令的恢复上下文 + 推荐的 resume 命令
**验证点**:
- [ ] 如有未完成命令：显示 command、timestamp、推荐 `stdd continue`
- [ ] 如无未完成：显示 `✅ No incomplete commands.`

### T94 — stdd progress --json
> **场景**: JSON 格式输出

```bash
! stdd progress --json
```
**预期产物**: JSON 格式输出最近进度
**验证点**:
- [ ] 输出为合法 JSON 数组
- [ ] 每条记录含 id/ts/ev/cmd 字段

### T95 — stdd progress --clear
> **场景**: 全部完成后清空进度日志

```bash
! stdd progress --clear
```
**预期产物**: 清空进度日志
**验证点**:
- [ ] `stdd/progress.jsonl` 文件被清空
- [ ] `stdd progress` 显示 `No progress recorded.`

### T96 — 进度文件持久化验证
> **场景**: 验证进度确实写入了文件

```bash
# 1. 执行一个命令
! stdd ff "测试进度追踪" --change-name test-progress-track

# 2. 查看原始进度文件
! cat stdd/progress.jsonl

# 3. 确认包含 ff 命令的 start 和 complete 记录
```
**预期产物**: `stdd/progress.jsonl` 中包含 JSONL 格式的进度记录
**验证点**:
- [ ] 每行是合法 JSON
- [ ] ff 命令有对应的 `{"ev":"start","cmd":"ff",...}` 和 `{"ev":"complete",...}` 两行
- [ ] `args` 字段包含 changeName 信息

### T97 — 中断恢复场景模拟
> **场景**: 模拟失败命令，验证 fail 记录

```bash
# 模拟：执行一个会失败的命令
! stdd apply nonexistent-change 2>/dev/null; true

# 查看进度
! stdd progress --last 5

# 查看恢复上下文
! stdd progress --resume
```
**预期产物**: 失败命令被记录为 `✗ fail`
**验证点**:
- [ ] 进度日志中出现 `ev: "fail"` 记录
- [ ] `stdd progress --resume` 能识别失败并提供恢复建议

---

# Part VIII: 补全 CLI 命令覆盖

> **场景**: 补全 12 个 CLI 命令，确保全部 69 个命令覆盖。

### T98 — stdd update
> **场景**: 检查是否有可更新的模板文件

```bash
! stdd update --dry-run
```
**预期产物**: 显示将要更新的文件列表
**验证点**:
- [ ] 输出 diff 列表或 "Already up to date"
- [ ] `--dry-run` 模式未修改任何文件

### T99 — stdd fix-packet
> **场景**: TASK-004 (Token 刷新) 测试失败，获取修复上下文

```bash
! stdd fix-packet
```
**预期产物**: Golden Packet 风格的失败修复上下文
**验证点**:
- [ ] 检测当前活跃变更
- [ ] 输出包含 task 描述、测试命令、环境信息

### T100 — stdd ci
> **场景**: 配置 GitHub CI

```bash
! stdd ci github
```
**预期产物**: `.github/workflows/ci.yml`
**验证点**:
- [ ] 文件存在且为合法 YAML
- [ ] 包含 test、lint、verify 步骤

### T101 — stdd starters
> **场景**: 查看 Starter 模板

```bash
! stdd starters list
```
**预期产物**: 可用 starter 模板列表
**验证点**:
- [ ] 输出至少一个 starter 类型
- [ ] 显示使用说明

### T102 — stdd extensions
> **场景**: 扩展管理

```bash
! stdd extensions list
! stdd extensions validate
```
**预期产物**: 扩展列表 + 验证结果
**验证点**:
- [ ] `list` 显示已安装扩展 (可能为空)
- [ ] `validate` 检查扩展结构合规

### T103 — stdd story
> **场景**: 创建用户旅程映射

```bash
! stdd story create evo-journey --persona "AI Researcher"
```
**预期产物**: `stdd/journeys/evo-journey.yaml` 故事映射文件
**验证点**:
- [ ] 生成 YAML 文件包含 persona、episodes、steps
- [ ] 格式可被 `stdd story bdd` 解析

### T104 — stdd pipeline
> **场景**: 从 specs 生成 pipeline IR

```bash
! stdd pipeline
```
**预期产物**: parser IR 和验收测试骨架
**验证点**:
- [ ] 扫描活跃变更的 specs
- [ ] 输出 pipeline IR 或测试骨架文件

### T105 — stdd tdd-init
> **场景**: 生成 TDD 测试脚手架

```bash
! stdd tdd-init --dry-run
```
**预期产物**: 显示将要生成的测试脚手架
**验证点**:
- [ ] 扫描 src/ 下的源文件
- [ ] `--dry-run` 不写入文件

### T106 — stdd audit
> **场景**: 历史合规审计

```bash
! stdd audit --json
```
**预期产物**: 历史合规审计报告 (JSON)
**验证点**:
- [ ] 输出合法 JSON
- [ ] 包含 constitution 合规历史记录

### T107 — stdd baby-steps
> **场景**: 小步 TDD 引导

```bash
! stdd baby-steps "实现 Agent 通信总线"
```
**预期产物**: 交互式 TDD 小步引导
**验证点**:
- [ ] 检测到活跃变更
- [ ] 输出 TDD 步骤提示

### T108 — stdd sudo run
> **场景**: 执行 SudoLang 伪代码

```bash
! stdd sudo run evorl.sudo
```
**预期产物**: 执行 SudoLang 逻辑
**验证点**:
- [ ] 文件不存在时输出错误信息
- [ ] 文件存在时解析并执行伪代码逻辑

### T109 — stdd start
> **场景**: 快速启动向导

```bash
! stdd start
```
**预期产物**: 非 TTY 环境输出帮助文本
**验证点**:
- [ ] Claude Code 中 (`!` 前缀) 输出帮助文本
- [ ] 终端中启动交互式 quick-start 向导

---

# Part IX: 产品方案与收尾

> **场景**: 所有功能完成，小明生成产品方案报告并做最终回顾。

### T110 — /stdd:product-proposal
> **场景**: 聚合所有产物，生成产品方案

```
/stdd:product-proposal
```
**预期产物**: `PRODUCT-PROPOSAL.md` (15 章产品方案报告)
**验证点**:
- [ ] 扫描所有 `stdd/` 产物 (vision, proposals, specs, designs, tasks, evidence, progress)
- [ ] 生成 15 章节报告，含 artifact 覆盖率、质量指标、PM 能力矩阵、路线图
- [ ] CLI 版本: `stdd product-proposal --json` 或 `stdd product-proposal --output my-report.md`

---

# 验证结果汇总

| # | 命令 | 状态 | 备注 |
|---|------|------|------|
| T01 | `/stdd:init` | | Day 1 初始化 |
| T02 | `/stdd:vision` | | Day 1 愿景 |
| T03 | `/stdd:help` | | Day 1 帮助 |
| T04 | `/stdd:explore` | | Day 1 探索 |
| T05 | `/stdd:explore --deep` | | Day 1 深度探索 |
| T06 | `/stdd:brainstorm` | | Day 1 头脑风暴 |
| T07 | `/stdd:new` | | Day 1 创建变更 |
| T08 | `/stdd:propose` | | Day 1 需求提案 |
| T09 | `/stdd:clarify` | | Day 1 需求澄清 |
| T10 | `/stdd:confirm` | | Day 1 确认需求 |
| T11 | `/stdd:prp` | | Day 1 结构化规划 |
| T12 | `/stdd:spec` | | Day 1 BDD 规格 |
| T13 | `/stdd:validate` | | Day 1 规格验证 |
| T14 | `/stdd:validate --spec-guardian --fix` | | Day 1 Spec Guardian |
| T15 | `/stdd:api-spec` | | Day 1 API 规范 |
| T16 | `/stdd:schema` | | Day 1 Schema |
| T17 | `/stdd:contract` | | Day 1 契约测试 |
| T18 | `/stdd:plan` | | Day 1 任务拆解 |
| T19 | `/stdd:design` | | Day 1 技术设计 |
| T20 | `/stdd:guard on` | | Day 1 TDD 守护 |
| T21 | `/stdd:apply` | | Day 1 TDD 实现 |
| T22 | `/stdd:apply --task=TASK-002` | | Day 1 指定任务 |
| T23 | `/stdd:apply --fix` | | Day 1 修复 |
| T24 | `/stdd:execute` | | Day 2 Ralph Loop |
| T25 | `/stdd:mock` | | Day 1 Mock |
| T26 | `/stdd:mock --all --fake` | | Day 1 Fake |
| T27 | `/stdd:factory` | | Day 1 工厂 |
| T28 | `/stdd:mutation` | | Day 1 变异测试 |
| T29 | `/stdd:outside-in` | | Day 2 外向内 |
| T30 | `/stdd:verify` | | Day 1 验证 |
| T31 | `/stdd:verify --all --fix` | | Day 1 全面验证 |
| T32 | `/stdd:metrics` | | Day 1 质量指标 |
| T33 | `/stdd:metrics --export` | | Day 1 导出指标 |
| T34 | `/stdd:complexity` | | Day 1/4 复杂度 |
| T35 | `/stdd:certainty` | | Day 1/4 置信度 |
| T36 | `/stdd:user-test` | | Day 3 用户测试 |
| T37 | `/stdd:final-doc` | | Day 6 最终文档 |
| T38 | `/stdd:commit` | | Day 1 提交 |
| T39 | `/stdd:archive` | | Day 1 归档 |
| T40 | `/stdd:guard status` | | Day 3 Guard 状态 |
| T41 | `/stdd:ff` | | Day 2 快速生成 |
| T42 | `/stdd:ff --dry-run` | | Day 2 预览 |
| T43 | `/stdd:continue` | | Day 4/6 继续 |
| T44 | `/stdd:continue --specs` | | Day 6 强制 specs |
| T45 | `/stdd:turbo` | | Day 4 一键全流程 |
| T46 | `/stdd:issue` | | Day 3 Bug 修复 |
| T47 | `/stdd:graph visualize` | | Day 5 Graph |
| T48 | `/stdd:graph visualize --format=html` | | Day 5 HTML |
| T49 | `/stdd:graph analyze` | | Day 5 分析 |
| T50 | `/stdd:graph analyze --bottlenecks` | | Day 5 瓶颈 |
| T51 | `/stdd:graph run feature` | | Day 5 Feature |
| T52 | `/stdd:graph run --intent repair` | | Day 5 Repair |
| T53 | `/stdd:graph parallel --detect` | | Day 5 并行检测 |
| T54 | `/stdd:graph parallel --execute` | | Day 5 并行执行 |
| T55 | `/stdd:graph history` | | Day 5 历史 |
| T56 | `/stdd:graph history --failures` | | Day 5 失败历史 |
| T57 | `/stdd:graph recommend` | | Day 5 推荐 |
| T58 | `/stdd:roles list` | | Day 5 角色列表 |
| T59 | `/stdd:roles party` | | Day 5 多角色讨论 |
| T60 | `/stdd:roles adversarial` | | Day 5 对抗式审查 |
| T61 | `/stdd:supervisor start` | | Day 5 Supervisor |
| T62 | `/stdd:supervisor status` | | Day 5 Supervisor 状态 |
| T63 | `/stdd:parallel` | | Day 5 并行 |
| T64 | `/stdd:memory save` | | Day 6 记忆保存 |
| T65 | `/stdd:memory search` | | Day 6 记忆搜索 |
| T66 | `/stdd:memory stats` | | Day 6 记忆统计 |
| T67 | `/stdd:learn scan` | | Day 6 学习扫描 |
| T68 | `/stdd:learn good` | | Day 6 正面反馈 |
| T69 | `/stdd:learn bad` | | Day 6 负面反馈 |
| T70 | `/stdd:learn suggest` | | Day 6 改进建议 |
| T71 | `/stdd:learn status` | | Day 6 学习状态 |
| T72 | `/stdd:context` | | Day 6 上下文 |
| T73 | `/stdd:context --export` | | Day 6 导出上下文 |
| T74 | `/stdd:iterate` | | Day 6 迭代 |
| T75 | `/stdd:iterate --max 5` | | Day 6 限制迭代 |
| T76 | `/stdd:constitution` | | Day 6 条例概览 |
| T77 | `/stdd:constitution show 2` | | Day 6 TDD 条例 |
| T78 | `/stdd:constitution check` | | Day 6 合规检查 |
| T79 | `/stdd:constitution check --changed` | | Day 6 变更检查 |
| T80 | `/stdd:constitution waivers` | | Day 6 豁免列表 |
| T81 | `/stdd:constitution waive` | | Day 6 创建豁免 |
| T82 | `stdd list/status` | | CLI 辅助 |
| T83 | `stdd skills/commands` | | CLI 辅助 |
| T84 | `stdd hooks` | | CLI Hook |
| T85 | `stdd workspace` | | CLI 工作区 |
| T86 | `stdd recommend/depcheck/doctor` | | CLI 辅助 |
| T87 | `stdd constitution (CLI)` | | CLI Constitution |
| T88 | `stdd runtime agent` | | CLI Runtime |
| T89 | `stdd browser` | | CLI 浏览器 |
| T90 | `stdd progress` | | Day 1 进度 |
| T91 | `stdd progress --last 50` | | Day 6 进度历史 |
| T92 | `stdd progress --summary` | | Day 6 进度总览 |
| T93 | `stdd progress --resume` | | Day 4 断点恢复 |
| T94 | `stdd progress --json` | | Day 6 JSON 输出 |
| T95 | `stdd progress --clear` | | Day 6 清空 |
| T96 | 进度文件持久化验证 | | 持久化验证 |
| T97 | 中断恢复场景模拟 | | 中断恢复 |
| T98 | `stdd update --dry-run` | | CLI 更新 |
| T99 | `stdd fix-packet` | | CLI 修复 |
| T100 | `stdd ci github` | | CLI CI |
| T101 | `stdd starters list` | | CLI Starter |
| T102 | `stdd extensions list/validate` | | CLI 扩展 |
| T103 | `stdd story create` | | CLI Story |
| T104 | `stdd pipeline` | | CLI Pipeline |
| T105 | `stdd tdd-init --dry-run` | | CLI TDD Init |
| T106 | `stdd audit --json` | | CLI 审计 |
| T107 | `stdd baby-steps` | | CLI Baby Steps |
| T108 | `stdd sudo run` | | CLI Sudo |
| T109 | `stdd start` | | CLI Start |
| T110 | `/stdd:product-proposal` | | Day 6 产品方案 |

**总计**: 110 个测试用例
- 斜杠命令: 81 个 (T01-T81)
- 辅助 CLI: 8 个 (T82-T89)
- 进度追踪: 8 个 (T90-T97)
- 补全 CLI: 12 个 (T98-T109)
- 产品方案: 1 个 (T110)
- 覆盖全部 `/stdd:` 斜杠命令 + CLI 命令 (registry 注册 40+)

---

## 推荐执行顺序

```
Part I    (T01-T40)  → Day 1: 初始化 → 用户认证全链路 (init → new → apply → verify → archive)
Part II   (T41-T46)  → Day 2-3: 快捷流程 (ff/continue/turbo) + Bug 修复 (issue)
Part III  (T47-T63)  → Day 5: Graph 引擎 + 多 Agent (graph/roles/supervisor/parallel)
Part IV   (T64-T75)  → Day 6: 学习记忆 (memory/learn/context/iterate)
Part V    (T76-T81)  → Day 6: Constitution 治理
Part VI   (T82-T89)  → 辅助 CLI 验证
Part VII  (T90-T97)  → 进度追踪与断点续传
Part VIII (T98-T109) → 补全 CLI 命令: update/fix-packet/ci/starters/extensions/story/pipeline/tdd-init/audit/baby-steps/sudo/start
Part IX   (T110)     → 产品方案报告
```

---

> 本文档模拟了真实用户在 Claude Code 中使用 STDD Copilot 斜杠命令构建 EvoAgent 项目的完整验证旅程。
> 每个测试用例都附带了真实使用场景描述，按 Day 1-6 的开发节奏编排。
> 共覆盖 69 个斜杠命令 + CLI 命令，110 个测试用例。
> 请在 Claude Code 中按 Part 顺序逐条执行。
