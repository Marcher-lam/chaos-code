# STDD Copilot Ultra v2.0.0 — 命令速查

> **Spec + Test Driven Development · AI 全生命周期开发平台**
> 最后更新：2026-06-01 · 适用于 `@marcher-lam/stdd-copilot-ultra@2.0.0`

---

## 一、CLI 命令速查（83 个顶级命令）

### 1. 核心工作流（11 个）

| 命令 | 说明 |
|------|------|
| `stdd init [path]` | 初始化 STDD 工作区 |
| `stdd new change <name>` | 创建新变更 |
| `stdd propose [action] [name]` | 需求提案草拟 |
| `stdd clarify [action] [change]` | 多轮需求澄清 |
| `stdd confirm [change]` | 人类确认门 |
| `stdd spec <change>` | 生成 BDD 规格 |
| `stdd plan [action] [change]` | 架构评估与任务拆解 |
| `stdd apply [change]` | Ralph Loop TDD 实现 |
| `stdd execute [action] [change]` | Ralph Loop 闭环执行器 |
| `stdd verify [change]` | 5 维验证 + 宪法检查 |
| `stdd archive [change]` | Delta Spec Merge 归档 |

### 2. 工作流增强（6 个）

| 命令 | 说明 |
|------|------|
| `stdd ff <description>` | 快速通道：提案→规格→任务一步到位 |
| `stdd continue [change]` | 断点续传 |
| `stdd explore [scope]` | 深度项目探索 |
| `stdd turbo <description>` | 一键全流程 |
| `stdd brainstorm <topic>` | 多策略头脑风暴 |
| `stdd issue <description>` | Bug 修复入口 |

### 3. SDD 增强（4 个）

| 命令 | 说明 |
|------|------|
| `stdd api-spec [change]` | OpenAPI 规范生成 |
| `stdd schema <subcommand>` | 类型/数据 Schema 管理 |
| `stdd contract <action> [change]` | 契约测试 |
| `stdd validate [change]` | 规格验证 + Spec Guardian |

### 4. TDD 增强（6 个）

| 命令 | 说明 |
|------|------|
| `stdd outside-in [action] [change]` | 外向内 TDD |
| `stdd mutation [change]` | 变异测试 |
| `stdd mock [action] [target]` | Mock 生成 |
| `stdd factory [action] [typeName]` | 测试数据工厂 |
| `stdd tdd-init [path]` | TDD 脚手架初始化 |
| `stdd baby-steps [task]` | Baby Steps TDD 引导 |

### 5. 质量与治理（8 个）

| 命令 | 说明 |
|------|------|
| `stdd guard` | TDD 守护钩子 |
| `stdd constitution [action] [target]` | 9 条质量宪法管理 |
| `stdd metrics [change]` | 质量指标仪表板 |
| `stdd fix-packet [change]` | Golden Packet 失败修复上下文 |
| `stdd hooks <subcommand>` | AI Code Hook 系统 |
| `stdd audit` | 历史合规审计 |
| `stdd depcheck [path]` | 依赖检查 |
| `stdd doctor` | 项目健康检查 |

### 6. Graph 引擎（8 个子命令）

| 命令 | 说明 |
|------|------|
| `stdd graph <subcommand>` | Graph 引擎入口 |
| `stdd graph visualize` | DAG 可视化 |
| `stdd graph analyze` | 图结构分析 |
| `stdd graph run` | DAG 工作流执行 |
| `stdd graph parallel` | 并行化分析 |
| `stdd graph history` | 执行历史 |
| `stdd graph replay <id>` | 历史回放 |
| `stdd graph recommend [change]` | 智能推荐 |

### 7. 协作与文档（9 个）

| 命令 | 说明 |
|------|------|
| `stdd commit [change]` | 提交消息生成 |
| `stdd final-doc [change]` | 最终需求文档 |
| `stdd design [action] [dir]` | 设计系统文档 |
| `stdd prp [action] [title]` | PRP 结构化规划 |
| `stdd product-proposal` | 产品提案文档 |
| `stdd context [layer]` | 三层文档架构 |
| `stdd user-test [change]` | 用户测试脚本 |
| `stdd story [action] [name]` | 故事地图 |
| `stdd pipeline [change]` | Pipeline 骨架 |

### 8. 高级与 AI Agent（10 个）

| 命令 | 说明 |
|------|------|
| `stdd supervisor [action]` | 多 Agent 协调器 |
| `stdd iterate [action]` | Plan-Execute-Reflect 迭代循环 |
| `stdd memory <action>` | 记忆管理 |
| `stdd parallel [action] [intent]` | DAG 并行执行 |
| `stdd roles [action]` | 12 角色 Agent 协作 |
| `stdd learn [action]` | 自适应学习 |
| `stdd vision [action]` | 项目愿景文档 |
| `stdd help [topic]` | 上下文感知帮助 |
| `stdd runtime agent <action>` | Agent 运行时引擎 |
| `stdd runtime sudo [file]` | SudoLang 解释器 |

### 9. 评估与决策支持（3 个）

| 命令 | 说明 |
|------|------|
| `stdd complexity [action] [path]` | 代码复杂度分析 |
| `stdd certainty [action]` | 5 维度信心评分 |
| `stdd vision [action]` | 项目愿景管理（跨分类复用） |

### 10. 生成与预览（7 个）

| 命令 | 说明 |
|------|------|
| `stdd builder [action] [name]` | 自定义构建器 |
| `stdd ui [action] [name]` | 前端页面与组件生成 |
| `stdd modules [action]` | STDD 模块市场 |
| `stdd dashboard [action]` | 静态 HTML 仪表板 |
| `stdd docs [action]` | 静态文档站点 |
| `stdd profile [action]` | 自适应规划深度 |
| `stdd adapt [action]` | IDE 适配器 |

### 11. 辅助工具（15 个）

| 命令 | 说明 |
|------|------|
| `stdd status [change]` | 显示变更状态 |
| `stdd list` / `stdd ls` | 列出所有变更和规格 |
| `stdd skills` | 列出所有 STDD Skills |
| `stdd commands` | 列出所有斜杠命令 |
| `stdd recommend [change]` | 智能推荐下一步 |
| `stdd update [path]` | 更新 STDD 配置 |
| `stdd progress` | 进度跟踪 |
| `stdd start` | 交互式快速启动向导 |
| `stdd workspace <subcommand>` | 工作区管理 |
| `stdd extensions [action]` | 扩展管理 |
| `stdd starters <subcommand>` | 项目启动器模板 |
| `stdd ci [platform]` | CI 配置生成 |
| `stdd browser <subcommand>` | 内置浏览器驱动 |
| `stdd memory-scan [action]` | 源码记忆扫描 |

---

## 二、斜杠命令完整清单（86 个，按字母排序）

```
/stdd:api-spec         /stdd:apply            /stdd:archive
/stdd:audit            /stdd:baby-steps       /stdd:brainstorm
/stdd:browser          /stdd:builder          /stdd:certainty
/stdd:ci               /stdd:ci-generator     /stdd:clarify
/stdd:commands         /stdd:commit           /stdd:commit-msg
/stdd:commit-tdd       /stdd:complexity       /stdd:confirm
/stdd:constitution     /stdd:context          /stdd:continue
/stdd:contract         /stdd:dashboard        /stdd:depcheck
/stdd:design           /stdd:docs             /stdd:doctor
/stdd:elicitation      /stdd:execute          /stdd:explore
/stdd:extensions       /stdd:factory          /stdd:ff
/stdd:final-doc        /stdd:fix-packet       /stdd:graph
/stdd:graph-history    /stdd:graph-run        /stdd:guard
/stdd:help             /stdd:hooks            /stdd:init
/stdd:issue            /stdd:iterate          /stdd:learn
/stdd:list             /stdd:memory           /stdd:memory-scan
/stdd:metrics          /stdd:mock             /stdd:mock-gen
/stdd:modules          /stdd:mutation         /stdd:new
/stdd:outside-in       /stdd:parallel         /stdd:pipeline
/stdd:plan             /stdd:prp              /stdd:product-proposal
/stdd:profile          /stdd:progress         /stdd:propose
/stdd:recommend        /stdd:roles            /stdd:runtime
/stdd:schema           /stdd:skills           /stdd:spec
/stdd:spec-generator   /stdd:start            /stdd:starters
/stdd:status           /stdd:story            /stdd:sudo
/stdd:supervisor       /stdd:tdd-init         /stdd:turbo
/stdd:ui               /stdd:update           /stdd:user-test
/stdd:validate         /stdd:verify           /stdd:vision
/stdd:waiver-manager   /stdd:workspace
```

---

## 三、Graph Runtime 意图路径

### feature（新功能开发）

```
propose → spec → plan → outside-in → apply → verify
```

### hotfix（热修复）

```
fix-packet → apply → verify
```

### repair（修复模式）

```
fix-packet → apply → verify
```

### research（探索分析）

```
explore → brainstorm → final-doc
```

### brownfield（接手遗留项目）

```
explore → init → propose → ... → archive
```

---

## 四、统计总览

| 指标 | 数量 |
|------|------|
| CLI 命令实现 | **88** |
| 顶级 CLI 命令 | **83** |
| 斜杠命令模板 | **86** |
| Skill 模板 | **53** |
| 测试套件 / 用例 | **197** / **4151+** |
| 覆盖率 | **97.7% statements / 93% branches** |
| AI 引擎兼容 | **4 层 22 种** |
| 宪法条例 | **9 条** |
| Agent 角色 | **12 个** |
| Graph 意图模式 | **5 种** |

---

## 五、文档导航

- [核心概念](concepts.md) — STDD 核心理念深入解读
- [工作流程](workflows.md) — 常见工作流模式与实战示例
- [命令参考](command-reference.md) — 86 个命令完整详解
- [CLI 使用指南](cli-guide.md) — CLI 命令行完整手册
- [快速开始](getting-started.md) — 5 分钟上手指南
- [能力边界](capabilities.md) — 工具能力与 AI 职责边界
- [Agent 协议](agent-protocol.md) — Agent 行为协议规范
- [项目首页](../README.md) — 项目概览
- [使用手册](../USAGE.md) — 完整使用指南
- [英文文档](en/README.md) — English docs index
