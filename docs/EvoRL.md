# EvoAgent: 使用 STDD Copilot 从零构建可进化 Agent 框架

> **真实用户实操指南** | 模拟在 Claude Code 中使用 `/stdd:*` 斜杠命令的完整开发旅程
>
> 本文档以一位开发者「小明」构建 **EvoAgent** 项目为主线，按 Day 1-6 叙事结构展示真实使用场景。
> **请在 Claude Code 中按顺序执行。** CLI 命令与斜杠命令一一对应，均可使用。

---

## 项目描述

**EvoAgent** — 基于 RL + GA 的可进化多 Agent 协作平台。

用户通过前端界面注册登录，创建和管理 Agent，将 Agent 加入群组进行 Slack 风格的讨论交流，支持 1v1 和 1v多对话。每个 Agent 拥有独立的 MCP 能力、Skill 库和长期记忆，能通过强化学习策略优化和遗传算法交叉变异实现自进化。

### 核心功能

1. 用户注册/登录 (JWT 鉴权)
2. Agent 创建与管理 (CRUD)
3. 群组管理 (创建/加入/退出)
4. Slack 风格群聊 (Agent 在群组中讨论交流)
5. 1v1 / 1v多 讨论
6. Agent 自进化 (RL 策略优化 + GA 交叉变异)

### 技术栈

| 层面 | 技术 |
|------|------|
| 前端 | React + TypeScript + Vite |
| 后端 | Express + Node.js + WebSocket |
| 数据库 | SQLite (记忆存储) + Redis (消息队列) |
| AI | OpenAI API / Claude API (可插拔) |
| 测试 | Vitest + Playwright |

---

## 环境准备

### 安装 STDD Copilot (三选一)

**A: npm 全局安装 (推荐)**
```bash
npm install -g @marcher-lam/stdd-copilot@latest
stdd --version
```

**B: 源码安装 (可二次开发)**
```bash
git clone https://github.com/Marcher-lam/STDD-COPILOT.git ~/stdd-copilot
cd ~/stdd-copilot && npm install && npm link
stdd --version
```

**C: Docker — 隔离运行 / CI smoke**
```bash
docker pull marcher-lam/stdd-copilot:latest
docker run --rm -v "$PWD:/workspace" marcher-lam/stdd-copilot:latest --help
```
> Docker 适合 CI 验证和企业内网分发。常规开发推荐 npm 全局安装。

### 创建项目

```bash
mkdir ~/evo-agent && cd ~/evo-agent
git init && npm init -y
```

然后在 `~/evo-agent` 目录下打开 Claude Code，准备开始。

---

# Day 1: 项目初始化与用户认证

> 小明刚创建了一个空项目，准备引入 STDD 进行规范化开发。今天的目标是搭好项目骨架，完成第一个功能：用户注册登录。

## 1.1 初始化 STDD 工作区

> 小明在 Claude Code 中输入第一条 STDD 命令，初始化项目结构

```
/stdd:init
```

**预期**: 生成 `stdd/` 目录结构 + `stdd/config.yaml` + `.claude/commands/stdd/` (20 个命令模板) + `.claude/skills/stdd/` (技能定义)

## 1.2 写下项目愿景

> 小明想先明确项目的长期目标和方向

```
/stdd:vision EvoAgent — 一个基于强化学习和遗传算法的可进化多Agent协作平台。用户通过前端界面创建和管理Agent，Agent可以在群组中类似Slack的方式讨论交流，支持1v1和1v多对话。Agent拥有独立的MCP能力、Skill库和长期记忆，能通过RL策略优化和GA交叉变异实现自进化。
```

**预期**: 生成 `stdd/vision.md`，包含项目长期目标、架构北极星、战略方向

## 1.3 快速探索项目

> 初始化完成后，小明想了解当前项目状态和技术选型建议

```
/stdd:explore 分析当前项目结构和已有的代码，给出技术选型建议
```

**预期**: 生成 `stdd/explorations/explore-*.md` 探索报告 (只读，不修改代码)

## 1.4 查看帮助

> 小明不太确定下一步该做什么

```
/stdd:help
```

**预期**: 检测到项目刚初始化，推荐下一步命令 (如 `/stdd:new`)

## 1.5 创建第一个变更：用户注册登录

> 小明决定从最基础的用户认证功能开始

```
/stdd:new 用户注册和登录系统，支持邮箱密码注册、JWT鉴权、Token刷新
```

**预期**: 创建 `stdd/changes/user-auth/proposal.md` + `.status.yaml` (初始状态: proposal)

## 1.6 需求提案

> 小明详细描述需求

```
/stdd:propose 实现完整的用户认证系统：邮箱注册、密码bcrypt加密存储、JWT签发与刷新、登出时Token失效、密码重置邮件
```

**预期**: 更新 `proposal.md`，包含 Epic 检测和边界分析

## 1.7 需求澄清

> AI 助手会识别模糊点并提出澄清问题

```
/stdd:clarify
```

**预期**: AI 提出一系列问题：
- 是否支持社交登录 (Google/GitHub)?
- Token 过期时间多久?
- 是否限制并发登录?
- 密码强度策略是什么?
小明逐一回答后，`proposal.md` 更新

## 1.8 确认需求

> 小明确认需求已经足够清晰

```
/stdd:confirm
```

**预期**: 显示 proposal 摘要和范围，小明回复「确认」后推进到 spec 阶段

## 1.9 结构化规划

> 小明想在确认后做一次结构化梳理

```
/stdd:prp
```

**预期**: 输出 What/Why/How/Success 四段式规划文档

## 1.10 生成 BDD 规格

> 进入规格阶段，生成行为驱动开发的 feature 文件

```
/stdd:spec
```

**预期**: 在 `stdd/changes/user-auth/specs/` 下生成 BDD `.feature` 文件 (Given/When/Then 格式)

## 1.11 规格验证

> 小明想确保规格质量

```
/stdd:validate
/stdd:validate --spec-guardian --fix
```

**预期**: 检查 BDD 格式合规、RFC 2119 关键词使用、Spec Guardian 检测实现细节泄漏

## 1.12 API 规范生成

> 用户认证需要清晰的 API 定义

```
/stdd:api-spec 为 user-auth 生成 OpenAPI 规范，包含 /auth/register、/auth/login、/auth/refresh、/auth/logout 四个端点
```

**预期**: 生成 `api-spec.yaml` (OpenAPI 规范) + TypeScript 类型定义

## 1.13 Schema 定义

> 生成数据结构的 JSON Schema 和 Zod 校验

```
/stdd:schema 为 User、LoginRequest、AuthResponse、JWTPayload 创建 JSON Schema 和 Zod 运行时校验
```

**预期**: 生成 `*.schema.json` + Zod schema 文件

## 1.14 契约测试

> 前后端分离项目需要消费者驱动契约

```
/stdd:contract generate user-auth
/stdd:contract verify user-auth
```

**预期**: 生成 Pact 格式契约文件，验证前后端一致性

## 1.15 任务拆解

> 将需求拆解为可执行的微任务

```
/stdd:plan
```

**预期**: 生成 `tasks.md` (5-6 个原子微任务):
- TASK-001: User Model + Repository
- TASK-002: 注册 API + 输入验证
- TASK-003: 登录 API + JWT 签发
- TASK-004: Token 刷新与登出
- TASK-005: 密码重置流程
- TASK-006: 集成测试

## 1.16 技术设计

> 生成详细的技术设计文档

```
/stdd:design
```

**预期**: 生成 `design.md` (含 Context/Decision/Rationale ADR 格式)

## 1.17 启用 TDD 守护

> 小明准备开始编码，先启用 TDD 守护

```
/stdd:guard on
```

**预期**: 启用 test-first (Blocking)、minimal-impl (Warning)、test-must-fail (Warning)、no-skip-refactor (Suggestion)

## 1.18 TDD 实现 — Ralph Loop 开始!

> 进入 TDD 红→绿→重构循环

```
/stdd:apply
```

**预期**: 依次对每个 TASK 执行:
1. RED — 生成失败测试
2. CHECK — 静态语法/类型检查
3. GREEN — 最简实现让测试通过
4. MUTATION — 变异审查 (anti-fake-green)
5. REFACTOR — 重构优化

## 1.19 指定任务实现

> 小明想单独实现 TASK-003 (JWT 签发)

```
/stdd:apply --task=TASK-003
```

**预期**: 跳到 TASK-003 执行，不影响其他任务状态

## 1.20 生成 Mock 数据

> 外部依赖 (数据库、邮件服务) 需要 mock

```
/stdd:mock user-auth
/stdd:mock --all --fake
```

**预期**: 生成 `src/__mocks__/` 下的 mock 实现

## 1.21 生成测试数据工厂

> 需要大量测试数据

```
/stdd:factory user-auth
```

**预期**: 生成 Builder 模式的测试数据工厂 + scenarios (正常/边界/异常)

## 1.22 遇到测试失败 — 使用修复工具

> TASK-004 (Token 刷新) 测试始终失败，小明用 fix-packet 获取修复上下文

```
/stdd:fix-packet user-auth
```

**预期**: 输出 Golden Packet 风格的失败修复上下文 (task 描述、测试命令、环境信息)

## 1.23 修复后继续

```
/stdd:apply --fix
```

**预期**: 识别当前失败测试并修复

## 1.24 变异测试

> 实现完成后，检查是否有"骗绿灯"的断言

```
/stdd:mutation user-auth
```

**预期**: Quick 模式生成启发式 mutation score + anti-fake-green 检测

## 1.25 验证

> 全面验证实现与规格的一致性

```
/stdd:verify user-auth
```

**预期**: 5 维验证报告 (API 签名/BDD 覆盖/类型/边界异常/文档一致性)

## 1.26 质量检查

> 查看质量指标

```
/stdd:metrics user-auth
/stdd:complexity user-auth
/stdd:certainty user-auth
```

**预期**: 测试覆盖率、mutation score、代码复杂度、5 维置信度评分

## 1.27 提交

```
/stdd:commit user-auth --tdd --phase green --issue 1
```

**预期**: 原子化 git commit，`green:` 前缀

## 1.28 归档

> 第一个功能完成，归档并合并 Delta Specs

```
/stdd:archive user-auth
```

**预期**: 变更目录移至 `stdd/changes/archive/`，Delta Specs 合并到 `stdd/specs/`

## 1.29 查看今日进度

> 小明结束 Day 1 前，查看今日工作记录

```
/stdd:progress
/stdd:progress --summary
```

**预期**: 显示今日执行的命令历史和总览 (成功/失败/中断数)

---

# Day 2: Agent 管理与群组功能

> 有了 Day 1 的经验，小明今天要完成两个功能：Agent CRUD 和群组管理。流程已经熟悉，可以适当使用快捷命令。

## 2.1 快速功能 — Agent CRUD (Fast-Forward)

> 需求很明确，小明用 ff 一次生成所有产物

```
/stdd:ff 实现Agent创建与管理，支持CRUD操作，每个Agent有名称、描述、配置参数、MCP能力列表
```

**预期**: 一次性生成 proposal + specs + design + tasks 四个核心产物

## 2.2 外向内 TDD

> Agent 管理有清晰的 API 边界，适合 outside-in

```
/stdd:outside-in init
/stdd:outside-in scaffold agent-management
/stdd:outside-in status
```

**预期**: 从 E2E → 集成 → 单元层层推进的 TDD 骨架

## 2.3 TDD 实现 Agent 管理

```
/stdd:apply agent-management
```

## 2.4 execute — Ralph Loop 执行循环

> 小明也尝试了 execute 命令 (apply 的别名)

```
/stdd:execute agent-management
```

**预期**: 同样执行 RED → GREEN → REFACTOR 循环

## 2.5 验证与归档

```
/stdd:verify agent-management
/stdd:archive agent-management
```

## 2.6 群组管理 — 先头脑风暴

> 群组功能涉及复杂交互 (Agent 加入/退出、权限、消息路由)，小明先用头脑风暴分析

```
/stdd:brainstorm 群组管理功能的架构设计，考虑Agent加入退出的竞态条件、权限控制模型、消息路由策略
```

**预期**: 多维度分析 (架构洞察/代码质量/技术评估/重构建议)，零文件修改

## 2.7 创建群组变更

```
/stdd:new 群组管理：创建群组、加入/退出、角色权限(管理员/成员)、群组设置(公开/私有)
```

## 2.8 全流程推进

```
/stdd:propose
/stdd:clarify
/stdd:confirm
/stdd:spec
/stdd:plan
/stdd:design
```

## 2.9 生成 API 规范

```
/stdd:api-spec 为 group-management 生成 OpenAPI 规范，包含群组 CRUD、成员管理、权限校验接口
```

## 2.10 Schema 定义

```
/stdd:schema 为 Group、GroupMember、Permission 创建类型定义
```

## 2.11 契约测试

```
/stdd:contract generate group-management
/stdd:contract verify group-management
```

## 2.12 规格验证

```
/stdd:validate group-management
/stdd:validate --spec-guardian --fix
```

## 2.13 Mock + Factory

```
/stdd:mock group-management
/stdd:factory group-management
```

## 2.14 变异测试

```
/stdd:mutation group-management
```

## 2.15 TDD 实现

```
/stdd:apply group-management
```

## 2.16 验证、提交、归档

```
/stdd:verify group-management
/stdd:metrics group-management
/stdd:commit group-management --tdd --phase refactor
/stdd:archive group-management
```

## 2.17 查看进度

```
/stdd:progress
```

---

# Day 3: Slack 风格群聊与实时通信

> 今天要做群聊功能，这是项目的核心交互。小明会遇到 WebSocket 问题，体验 STDD 的 Bug 修复流程。

## 3.1 Bug — WebSocket 消息丢失

> 昨天的群组功能上线后，测试发现消息偶尔丢失

```
/stdd:issue Agent群组通信时偶发消息丢失，WebSocket连接不稳定导致消息未送达，需要添加可靠投递和重连机制
```

**预期**: TDD Bug 修复流程 — 自动分类 bug → 先写失败测试 (RED) → 最小修复 (GREEN) → 回归验证

## 3.2 修复后验证

```
/stdd:fix-packet group-management --test-command "npx vitest run"
```

## 3.3 快速功能 — 聊天界面

> Bug 修好后，小明继续实现聊天前端

```
/stdd:ff 实现Slack风格群聊界面，包含消息列表、输入框、@提及、消息搜索、频道切换、未读标记
```

## 3.4 Baby Steps — 小步 TDD

> 聊天界面组件复杂，小明用 baby-steps 一步步来

```
/stdd:baby-steps "实现消息列表组件，支持滚动加载和历史消息分页"
```

**预期**: 交互式 TDD 小步引导

## 3.5 1v1 / 1v多 对话模式

> 新增私聊和多播功能

```
/stdd:new 实现一对一会话和一对多广播，私聊消息仅双方可见，多播支持@指定Agent群发
```

```
/stdd:propose
/stdd:clarify
/stdd:confirm
/stdd:spec
```

## 3.6 API 规范

```
/stdd:api-spec 为 chat-system 生成 API 规范，包含会话创建、消息发送/接收、WebSocket 事件定义
```

## 3.7 任务拆解与实现

```
/stdd:plan
/stdd:apply chat-system
/stdd:mutation chat-system --mode stryker
/stdd:verify chat-system
```

## 3.8 浏览器验证

> 小明启动前端 dev server，用 STDD 浏览器工具验证界面

```
/stdd:browser doctor
/stdd:browser snapshot http://localhost:5173 --width 1920 --height 1080
/stdd:browser inspect http://localhost:5173
```

**预期**: 检查 Playwright 环境、截图页面、审查 DOM (需 dev server 运行)

## 3.9 用户测试脚本

> 小明想让产品经理也能验证聊天功能

```
/stdd:user-test chat-system
```

**预期**: 生成 `user-test.md` 人类可读的验收测试脚本 (非技术人员可执行)

## 3.10 Story Mapping

```
/stdd:story create chat-journey --persona "普通用户"
/stdd:story bdd stdd/journeys/chat-journey.yaml
```

**预期**: 生成用户旅程 YAML → BDD feature files

## 3.11 Pipeline 生成

```
/stdd:pipeline chat-system
```

**预期**: 从 specs 生成 parser IR 和验收测试骨架

## 3.12 归档

```
/stdd:archive chat-system
```

## 3.13 Guard 状态检查

```
/stdd:guard status
```

**预期**: 显示 TDD 守护四条规则的启用/禁用状态

---

# Day 4: Agent 自进化 — 遗传算法与强化学习

> 今天是核心 AI 功能。遗传进化引擎和 RL 引擎，小明会用 turbo 和 graph 引擎来加速。

## 4.1 Turbo — 遗传进化引擎一键全流程

> 核心功能，需求清晰，用 turbo 串行跑完全阶段

```
/stdd:turbo 实现Agent遗传进化引擎，包含基因组编码(Agent参数序列化)、适应度函数框架(自定义评估指标)、选择算子(轮盘赌/锦标赛/精英)、交叉算子(单点/多点/均匀)、变异算子(高斯/均匀/位翻转)、进化循环(世代交替/种群管理)
```

**预期**: 串行执行 propose → clarify → confirm → spec → plan 全流程，在确认门暂停等待小明确认

## 4.2 确认后继续

> 小明回复确认后，turbo 自动继续

```
/stdd:continue evolution-engine
```

## 4.3 Schema 定义

> 进化引擎需要精确的数据结构

```
/stdd:schema 为 EvoRL 创建核心类型定义：AgentConfig、Genome、Environment、FitnessScore、EvolutionConfig、SelectionOperator
```

## 4.4 TDD 实现进化引擎

```
/stdd:apply evolution-engine
```

## 4.5 变异测试 — Stryker 模式

> 进化引擎的算法正确性至关重要，用 Stryker 做真实变异测试

```
/stdd:mutation evolution-engine --mode stryker
```

## 4.6 强化学习引擎

> 单独创建 RL 引擎

```
/stdd:new 强化学习引擎：环境抽象层(Env基类/gym接口)、DQN算法(经验回放/目标网络)、PPO算法(Actor-Critic/GAE)、多Agent RL协调(MADDPG/共享经验池)、RL训练可视化(TensorBoard集成)
```

```
/stdd:propose
/stdd:clarify
/stdd:confirm
```

## 4.7 多角度分析

> RL 引擎设计复杂，小明想听听不同视角的建议

```
/stdd:brainstorm --method first-principles "RL奖励函数设计的最佳实践：如何平衡探索与利用"
```

**预期**: 纯分析建议，零文件修改

## 4.8 置信度评估

```
/stdd:certainty 评估 evolution-engine 当前实现的置信度
```

**预期**: 5 维度评分 (需求清晰度/技术可行性/风险/测试覆盖/愿景对齐)

## 4.9 代码复杂度

```
/stdd:complexity 评估 evolution-engine 的代码复杂度
```

**预期**: APP Mass 代码质量分析 + Top-10 热点

## 4.10 生成规格与设计

```
/stdd:spec rl-engine
/stdd:validate rl-engine
/stdd:plan rl-engine
/stdd:design rl-engine
```

## 4.11 API 规范

```
/stdd:api-spec 为 rl-engine 生成 OpenAPI 规范，包含环境注册、训练任务提交、训练状态查询接口
```

## 4.12 TDD 实现 RL 引擎

```
/stdd:apply rl-engine
/stdd:mutation rl-engine
/stdd:verify rl-engine
```

## 4.13 RL 训练监控前端

```
/stdd:ff RL训练监控面板，显示 episode 进度、奖励曲线、损失函数变化、超参数调整历史
```

```
/stdd:apply rl-dashboard
/stdd:verify rl-dashboard
/stdd:archive rl-dashboard
```

## 4.14 进化仪表板

```
/stdd:ff 进化仪表板前端，显示世代进度、适应度曲线、基因树可视化、种群多样性指标
```

```
/stdd:apply evolution-dashboard
/stdd:verify evolution-dashboard
/stdd:archive evolution-dashboard
```

## 4.15 归档 RL 引擎

```
/stdd:archive rl-engine
/stdd:archive evolution-engine
```

---

# Day 5: Graph 引擎与多 Agent 协作

> 小明今天利用 STDD 的 Graph 引擎和多 Agent 角色协作来优化项目。

## 5.1 Graph 可视化

> 小明想了解当前项目的 Skill Graph 状态

```
/stdd:graph visualize
/stdd:graph visualize --format=html
```

**预期**: Mermaid 格式依赖图 + HTML 可视化文件

## 5.2 Graph 分析

```
/stdd:graph analyze
/stdd:graph analyze --bottlenecks
```

**预期**: 当前状态分析 + 可执行路径 + 瓶颈识别

## 5.3 Graph 智能推荐

```
/stdd:graph recommend
/stdd:recommend
/stdd:recommend --json
```

**预期**: 基于当前状态推荐下一步命令和原因

## 5.4 Graph 执行 — Feature 流

> 小明用 graph run 执行完整的 feature 工作流

```
/stdd:graph run feature --change-name agent-self-evolution
```

**预期**: 按 ff → spec → outside-in → apply → verify → archive 路径执行

## 5.5 Graph 执行 — Repair 流

> RL 引擎有测试失败，用 repair intent 修复

```
/stdd:graph run --intent repair --change-name rl-engine
```

**预期**: 按 fix-packet → apply → verify 路径修复

## 5.6 Graph 并行检测与执行

```
/stdd:graph parallel --detect
/stdd:graph parallel --execute --max-workers=4
```

**预期**: 检测可并行 Skill 组 → 并行执行无依赖任务

## 5.7 Graph 历史

```
/stdd:graph history
/stdd:graph history --failures
```

**预期**: 执行历史记录 (时间戳、状态、Skill 名称)

## 5.8 多 Agent 角色协作

> 小明邀请多个角色讨论 Agent 自进化的架构

```
/stdd:roles list
/stdd:roles party 讨论Agent自进化的RL奖励函数设计，如何平衡探索与利用 --roles=architect,developer,security
```

**预期**: 三个角色 (架构师/开发者/安全) 依次发言，观点有冲突和收敛

## 5.9 对抗式安全审查

> 安全角色对 RL 引擎做对抗式审查

```
/stdd:roles adversarial src/rl/
```

**预期**: 扫描 risk-pattern，输出安全风险和建议

## 5.10 Supervisor 协调

> 小明启动 Supervisor 协调多个模块的开发

```
/stdd:supervisor start
/stdd:supervisor status
```

**预期**: 启动多 Agent 协调器，显示各 agent 工作状态

## 5.11 并行执行

```
/stdd:parallel
```

**预期**: DAG 分析 + 并行执行独立任务并聚合结果

## 5.12 多 Agent 辩论

> 使用 Party Mode 进行深度讨论

```
/stdd:runtime agent start "EvoAgent 架构设计评审：微服务 vs 单体" --rounds 3
/stdd:runtime agent next
/stdd:runtime agent stop
```

**预期**: Party Mode 多 Agent 状态机运行

## 5.13 SudoLang 伪代码执行

> 小明用 SudoLang 写了一段伪代码描述进化逻辑

```
/stdd:runtime sudo evorl.sudo --generate
/stdd:runtime sudo evorl.sudo
```

**预期**: 解析 SudoLang 伪代码为 STDD 结构化产物

---

# Day 6: 质量治理、学习与收尾

> 最后一天。小明做 Constitution 合规检查、学习系统记录、进度回顾，最后生成产品方案报告。

## 6.1 Constitution 合规检查

```
/stdd:constitution
/stdd:constitution show 2
/stdd:constitution show 7
/stdd:constitution check
/stdd:constitution status
```

**预期**: 9 篇条例概览 → TDD/Security 条例详情 → 逐条合规检查 → 健康状态

## 6.2 Constitution 审计

```
/stdd:constitution audit --json
/stdd:audit --json
```

**预期**: 审计趋势报告 (JSON)

## 6.3 Constitution 修复

```
/stdd:constitution fix
/stdd:constitution fix --article 2 --dry-run
```

## 6.4 临时豁免

> RL 引擎的测试覆盖率暂时不达标 (还在迭代中)

```
/stdd:constitution waive 2 --reason="RL引擎还在迭代中，覆盖率暂时不达标" --days=7
/stdd:constitution waivers
```

**预期**: 写入豁免记录，7 天后自动过期

## 6.5 Hook 管理

```
/stdd:hooks install
/stdd:hooks verify
/stdd:hooks status
```

**预期**: 安装/验证/查看 Hook 状态

## 6.6 学习系统

> 小明记录本次开发的正反面经验

```
/stdd:learn scan
/stdd:learn good "TDD红绿重构节奏控制得很好，每个微任务30分钟内完成"
/stdd:learn bad "mock数据不够真实，导致集成测试通过了但生产环境WebSocket偶尔断连"
/stdd:learn suggest "群聊消息应该使用消息队列(Redis Streams)而不是直接WebSocket推送"
/stdd:learn status
```

**预期**: 代码风格提取 + 正面/负面反馈记录 + 改进建议

## 6.7 记忆系统

```
/stdd:memory scan
/stdd:memory list
/stdd:memory save
/stdd:memory search Agent自进化架构决策
```

**预期**: 语义搜索记忆条目

## 6.8 上下文管理

```
/stdd:context
/stdd:context --export
/stdd:context --json
```

**预期**: 三层文档上下文加载 (Foundation + Component + Feature)

## 6.9 迭代优化

> 小明对 RL 引擎做最后一轮迭代

```
/stdd:iterate rl-engine
/stdd:iterate --max 3
```

**预期**: Plan-Execute-Reflect 自主迭代循环

## 6.10 状态检查

> 查看所有变更和规格状态

```
/stdd:status
/stdd:status --json
/stdd:list
/stdd:list --specs
/stdd:list --archived
/stdd:list --json
/stdd:skills
/stdd:skills --phase 4
/stdd:commands
```

## 6.11 Workspace 管理

```
/stdd:workspace list
/stdd:workspace validate
/stdd:workspace repair
/stdd:workspace list --json
```

## 6.12 CI 配置

```
/stdd:ci github
```

**预期**: 生成 `.github/workflows/ci.yml`

## 6.13 Starter 模板

```
/stdd:starters list
/stdd:starters create evo-agent-app --type typescript
```

## 6.14 扩展管理

```
/stdd:extensions list
/stdd:extensions validate
/stdd:extensions install ./my-extension
```

## 6.15 诊断与依赖检查
> 终验诊断，--deep 模式会额外检查 lint/audit/changes/progress/evidence

```
/stdd:doctor
/stdd:doctor --deep
/stdd:depcheck
/stdd:depcheck --json
```
/stdd:doctor
/stdd:doctor --deep
/stdd:depcheck
```

**预期**: 项目健康诊断 + 深度检查(lint/audit/changes/progress/evidence) + 未使用依赖检测

## 6.16 TDD 脚手架

```
/stdd:tdd-init
/stdd:tdd-init --dry-run
```

**预期**: 扫描源文件，生成测试脚手架

## 6.17 提交剩余变更

```
/stdd:commit rl-engine --tdd --phase green --issue 42
/stdd:commit evolution-engine --tdd --phase refactor
```

## 6.18 最终文档

```
/stdd:final-doc rl-engine
/stdd:final-doc evolution-engine
```

**预期**: 生成 `FINAL_REQUIREMENT.md` 综合文档

## 6.19 产品方案报告

> 所有功能完成后，小明生成产品方案

```
/stdd:product-proposal
```

> 也可以用 CLI: `stdd product-proposal` 或 `stdd product-proposal --json`

**预期**: 扫描所有 `stdd/` 产物，生成 15 章产品方案报告 (`PRODUCT-PROPOSAL.md`)

## 6.20 进度总览与断点续传

> 小明查看完整开发进度

```
/stdd:progress
/stdd:progress --summary
/stdd:progress --json
```

**预期**: 显示全部命令历史、总览统计、JSON 格式输出

## 6.21 快速启动向导

> 小明想看看新用户视角

```
/stdd:start
```

**预期**: TTY 环境启动交互向导，非 TTY 输出帮助文本

---

# 模拟中断恢复场景

> 小明在第 3 天下班时终端意外关闭。第 4 天回来后：

## 6.22 断点续传

```
/stdd:progress --resume
```

**预期**: 显示上次中断命令的恢复上下文 + 推荐的 resume 命令 (如 `stdd continue`)

## 6.23 继续中断的变更

```
/stdd:continue evolution-engine
```

**预期**: 检测 `.status.yaml`，推进到下一个缺失产物

## 6.24 强制生成特定产物

```
/stdd:continue --specs
```

**预期**: 跳过其他阶段，直接生成 specs

## 6.25 清空进度

> 全部完成后清空进度日志

```
/stdd:progress --clear
```

---

# 更新与维护

## 6.26 更新检查

```
/stdd:update --dry-run
```

**预期**: 显示将要更新的文件列表，不实际写入

---

# 预期产出

执行以上所有命令后，应产生以下产物：

| 目录/文件 | 来源命令 |
|-----------|----------|
| `stdd/` 目录结构 + `config.yaml` | `/stdd:init` |
| `stdd/vision.md` | `/stdd:vision` |
| `stdd/explorations/` | `/stdd:explore` |
| `stdd/changes/user-auth/` | `/stdd:new` → `/stdd:archive` |
| `stdd/changes/agent-management/` | `/stdd:ff` → `/stdd:archive` |
| `stdd/changes/group-management/` | `/stdd:new` → `/stdd:archive` |
| `stdd/changes/chat-system/` | `/stdd:new` → `/stdd:archive` |
| `stdd/changes/evolution-engine/` | `/stdd:turbo` → `/stdd:archive` |
| `stdd/changes/rl-engine/` | `/stdd:new` → `/stdd:archive` |
| `stdd/specs/` (合并后的 BDD 规格) | `/stdd:archive` |
| `stdd/changes/archive/` | `/stdd:archive` |
| `stdd/schemas/` | `/stdd:schema` |
| `stdd/contracts/` | `/stdd:contract` |
| `src/__mocks__/` | `/stdd:mock` |
| `src/__factories__/` | `/stdd:factory` |
| `stdd/memory/` | `/stdd:memory` |
| `stdd/journeys/chat-journey.yaml` | `/stdd:story` |
| `stdd/tdd-registry.yaml` | `/stdd:outside-in init` |
| `stdd/evidence/` | `/stdd:guard` `/stdd:verify` |
| `stdd/progress.jsonl` | 自动记录 |
| `.github/workflows/ci.yml` | `/stdd:ci` |
| `PRODUCT-PROPOSAL.md` | `/stdd:product-proposal` |
| `FINAL_REQUIREMENT.md` | `/stdd:final-doc` |
| `stdd/constitution/waivers.yaml` | `/stdd:constitution waive` |

---

## 覆盖统计

| # | `/stdd:` 命令 | 使用场景 |
|---|--------------|----------|
| 1 | `/stdd:init` | Day 1 初始化项目 |
| 2 | `/stdd:vision` | Day 1 写项目愿景 |
| 3 | `/stdd:explore` | Day 1 探索项目 |
| 4 | `/stdd:help` | Day 1 查看帮助 |
| 5 | `/stdd:new` | Day 1-4 创建变更 |
| 6 | `/stdd:propose` | Day 1-4 需求提案 |
| 7 | `/stdd:clarify` | Day 1-4 需求澄清 |
| 8 | `/stdd:confirm` | Day 1-4 确认需求 |
| 9 | `/stdd:prp` | Day 1 结构化规划 |
| 10 | `/stdd:spec` | Day 1-4 生成 BDD 规格 |
| 11 | `/stdd:validate` | Day 1-4 规格验证 |
| 12 | `/stdd:api-spec` | Day 1-4 API 规范 |
| 13 | `/stdd:schema` | Day 1/4 Schema 定义 |
| 14 | `/stdd:contract` | Day 1-2 契约测试 |
| 15 | `/stdd:plan` | Day 1-4 任务拆解 |
| 16 | `/stdd:design` | Day 1-4 技术设计 |
| 17 | `/stdd:guard` | Day 1/3 TDD 守护 |
| 18 | `/stdd:apply` | Day 1-4 TDD 实现 |
| 19 | `/stdd:execute` | Day 2 Ralph Loop |
| 20 | `/stdd:mock` | Day 1-2 Mock 生成 |
| 21 | `/stdd:factory` | Day 1-2 测试工厂 |
| 22 | `/stdd:fix-packet` | Day 1/3 修复上下文 |
| 23 | `/stdd:mutation` | Day 1-4 变异测试 |
| 24 | `/stdd:outside-in` | Day 2 外向内 TDD |
| 25 | `/stdd:verify` | Day 1-4 验证 |
| 26 | `/stdd:metrics` | Day 1/2 质量指标 |
| 27 | `/stdd:complexity` | Day 1/4 代码复杂度 |
| 28 | `/stdd:certainty` | Day 1/4 置信度评估 |
| 29 | `/stdd:commit` | Day 1/4/6 提交 |
| 30 | `/stdd:archive` | Day 1-4 归档 |
| 31 | `/stdd:ff` | Day 2-4 快速生成 |
| 32 | `/stdd:turbo` | Day 4 一键全流程 |
| 33 | `/stdd:continue` | Day 4/6 继续/断点恢复 |
| 34 | `/stdd:issue` | Day 3 Bug 修复 |
| 35 | `/stdd:baby-steps` | Day 3 小步 TDD |
| 36 | `/stdd:brainstorm` | Day 2/4 头脑风暴 |
| 37 | `/stdd:browser` | Day 3 浏览器验证 |
| 38 | `/stdd:user-test` | Day 3 用户测试脚本 |
| 39 | `/stdd:story` | Day 3 Story Mapping |
| 40 | `/stdd:pipeline` | Day 3 Pipeline 生成 |
| 41 | `/stdd:graph` | Day 5 Graph 引擎 |
| 42 | `/stdd:recommend` | Day 5 智能推荐 |
| 43 | `/stdd:roles` | Day 5 角色协作 |
| 44 | `/stdd:supervisor` | Day 5 Supervisor |
| 45 | `/stdd:parallel` | Day 5 并行执行 |
| 46 | `/stdd:runtime` | Day 5 Party Mode |
| 47 | `/stdd:constitution` | Day 6 Constitution |
| 48 | `/stdd:audit` | Day 6 审计 |
| 49 | `/stdd:hooks` | Day 6 Hook 管理 |
| 50 | `/stdd:learn` | Day 6 学习系统 |
| 51 | `/stdd:memory` | Day 6 记忆系统 |
| 52 | `/stdd:context` | Day 6 上下文管理 |
| 53 | `/stdd:iterate` | Day 6 迭代优化 |
| 54 | `/stdd:status` | Day 6 状态检查 |
| 55 | `/stdd:list` | Day 6 列表查看 |
| 56 | `/stdd:skills` | Day 6 技能列表 |
| 57 | `/stdd:commands` | Day 6 命令列表 |
| 58 | `/stdd:workspace` | Day 6 工作区管理 |
| 59 | `/stdd:ci` | Day 6 CI 配置 |
| 60 | `/stdd:starters` | Day 6 Starter 模板 |
| 61 | `/stdd:extensions` | Day 6 扩展管理 |
| 62 | `/stdd:doctor` | Day 6 诊断 |
| 63 | `/stdd:depcheck` | Day 6 依赖检查 |
| 64 | `/stdd:tdd-init` | Day 6 TDD 脚手架 |
| 65 | `/stdd:final-doc` | Day 6 最终文档 |
| 66 | `/stdd:product-proposal` | Day 6 产品方案 |
| 67 | `/stdd:progress` | Day 1/2/6 进度追踪 |
| 68 | `/stdd:start` | Day 6 快速启动向导 |
| 69 | `/stdd:update` | Day 6 更新检查 |

> **全部 69 个 `/stdd:` 命令覆盖完毕。** 每个命令都融入了真实用户场景。

---

> 本文档模拟了一位真实用户在 Claude Code 中使用 STDD Copilot 斜杠命令构建 EvoAgent 项目的完整旅程。
> 按真实开发节奏编排：从初始化到第一个功能、Bug 修复、核心 AI 功能、Graph 引擎协作，到最终的质量治理与收尾。
> 所有 CLI 命令与斜杠命令一一对应。
> 请在 Claude Code 中按 Day 顺序执行。
