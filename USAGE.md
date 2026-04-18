# STDD Copilot 使用手册

STDD Copilot 提供双入口设计：CLI 命令行工具 (`stdd`) 和 Claude Code 斜杠命令 (`/stdd:*`)。

## 核心概念

| 概念 | 路径 | 说明 |
|------|------|------|
| **Commands** | `.claude/commands/stdd/` | 19 个 `/stdd:*` 斜杠命令 |
| **Skills** | `.claude/skills/` | 38 个可被命令调用的技能模块 |
| **Changes** | `stdd/changes/` | 变更管理 (提案→规格→实现→归档) |
| **Specs** | `stdd/specs/` | BDD 规格文件 (Source of Truth) |
| **Memory** | `stdd/memory/` | 持久化记忆库 |
| **Constitution** | `schemas/constitution/` | 9 篇开发条例 + 豁免机制 |
| **Config** | `stdd/config.yaml` | 项目配置 |

---

## 快速开始

### 场景 1: 简单明确需求

```bash
# 一键生成所有产物并实现
/stdd:ff 实现一个支持 Markdown 导出的 todo-list
```

### 场景 2: 需求需要澄清

```bash
# 1. 创建变更
/stdd:new 实现用户认证功能

# 2. 逐步生成产物
/stdd:continue  # 生成 proposal.md
/stdd:continue  # 生成 specs/*.feature
/stdd:continue  # 生成 design.md
/stdd:continue  # 生成 tasks.md

# 3. 实现
/stdd:apply

# 4. 验证并归档
/stdd:verify
/stdd:archive
```

### 场景 3: 需求表达不出来

```bash
# 1. 自由探索
/stdd:explore 理解现有的认证系统

# 2. 基于探索创建变更
/stdd:new 基于探索结果，优化认证流程

# 3. 后续同场景 2
...
```

### 场景 4: 一键 Turbo

```bash
# 自动完成所有阶段: propose → clarify → confirm → spec → plan → execute
/stdd:turbo "实现用户登录，支持邮箱和 OAuth"
```

### 场景 5: Bug 修复

```bash
/stdd:issue  # Bug 分类 → 失败测试先行 → 最小修复 → 回归验证
```

### 场景 6: 头脑风暴

```bash
/stdd:brainstorm  # 纯分析建议模式，5 维度分析 + 多方案对比
```

---

## 完整实战流

### 1. 初始化项目 (首次使用)

```bash
/stdd:init
```

**系统动作**:
- 检测项目类型 (Node.js/Java/Python/Rust)
- 识别技术栈 (框架/测试框架/构建工具)
- 创建目录结构
- 生成记忆文件 (`stdd/memory/foundation.md`)
- 检查项目愿景文档 (`vision.md`)
- 配置命令和技能

**输出示例**:
```
初始化 STDD Copilot

项目分析
┌─────────────────┬──────────────────────┐
│ 项目类型        │ Node.js               │
│ 框架            │ React 18 + TypeScript│
│ 测试框架        │ Vitest               │
│ 构建工具        │ Vite                 │
└─────────────────┴──────────────────────┘

初始化完成！

快速开始:
  /stdd:new <需求>    创建第一个变更
  /stdd:ff <需求>     快速生成所有产物
  /stdd:turbo <需求>  一键全流程
```

---

### 2. 创建变更提案

```bash
/stdd:new 实现一个支持 Markdown 导出的 todo-list
```

**生成文件**: `stdd/changes/change-YYYYMMDD-HHMMSS/proposal.md`

**自动触发澄清**:
```
> [系统]: 数据持久化方式是？(localStorage / IndexedDB)
> 你: localStorage
> [系统]: 导出触发点是按钮还是自动保存？
> 你: 按钮
```

---

### 3. Fast-Forward 快速模式

```bash
/stdd:ff 实现用户登录功能，支持邮箱密码和 OAuth
```

**一键生成**:
```
stdd/changes/change-YYYYMMDD-HHMMSS/
├── proposal.md      # 需求提案
├── specs/
│   └── login.feature   # BDD 规格
├── design.md        # 设计文档
└── tasks.md         # 任务列表
```

---

### 4. 实现 (TDD 循环)

```bash
/stdd:apply
```

**Ralph Loop 流程**:
```
┌──────────────────────────────────────────────────────┐
│                    Ralph Loop                         │
│                                                     │
│  🔴 红灯  →  🔍 静态检查  →  🟢 绿灯  →           │
│  生成失败测试    语法/类型检查    最简实现           │
│                                                     │
│  →  🧪 伪变异审查  →  🔵 重构  →  ✅ 完成           │
│     检测骗绿灯断言     优化代码                       │
│                                                     │
│  ⚠️ 容错: 策略调整 → 跨模型降级 → 🔴 熔断回滚      │
└──────────────────────────────────────────────────────┘
```

**选项**:
```bash
/stdd:apply                    # 执行所有待办任务
/stdd:apply --task=TASK-001    # 执行特定任务
/stdd:apply --next             # 执行下一个任务
/stdd:apply --fix              # 修复失败的测试
```

---

### 5. 验证

```bash
/stdd:verify
```

**验证维度**:
| 维度 | 检查项 |
|------|--------|
| 接口一致性 | API 签名与规范一致 |
| 行为一致性 | BDD 场景全部通过 |
| 类型一致性 | TypeScript 类型正确 |
| 边界条件 | 空值/异常/边界值处理 |
| 文档一致性 | 代码注释与规范匹配 |
| 3D 验证 | 完整性 + 正确性 + 一致性 |

---

### 6. 归档

```bash
/stdd:archive
```

**归档流程**:
```
1. 运行验证 /stdd:verify
2. 同步规格 sync → stdd/specs/
3. 生成总结 archive.md
4. 移动到 archive/
5. 状态更新 → 已完成
```

---

## 变更管理

### 变更状态流转

| 状态 | 标识 | 说明 |
|------|------|------|
| 待启动 | 📝 | proposal.md 创建 |
| 规格中 | 📋 | specs/*.feature 生成中 |
| 设计中 | 🎨 | design.md 生成中 |
| 任务就绪 | 📝 | tasks.md 生成完成 |
| 实现中 | 🔧 | /stdd:apply 执行中 |
| 已完成 | 📦 | 归档完成 |

### 持久计划状态

中断后可通过 `--resume` 恢复：

```bash
/stdd:plan --resume    # 从上次中断点继续
/stdd:plan --status    # 查看当前状态
```

状态保存在 `stdd/changes/<change-name>/.state.yaml`。

---

## 完整命令参考

### CLI 命令

```bash
stdd init                    # 初始化项目
stdd init /path/to/project   # 指定目录
stdd init --force            # 强制覆盖

stdd list                    # 列出活跃变更
stdd list --specs            # 列出规格
stdd list --archived         # 包含已归档
stdd list --json             # JSON 格式

stdd status                  # 整体状态
stdd status add-dark-mode    # 特定变更状态

stdd new change add-dark-mode      # 创建新变更
stdd new spec auth                 # 创建新规格

stdd skills                  # 列出所有技能
stdd skills --phase 4        # 按阶段筛选

stdd commands                # 列出 Claude Code 斜杠命令
stdd constitution            # 查看所有条例
stdd constitution show 2     # 查看 Article 2 详情
stdd hooks install           # 安装 Hooks
stdd hooks verify            # 验证 Hooks
```

### 核心流程

| 命令 | 说明 |
|------|------|
| `/stdd:init` | 初始化项目，创建目录结构和配置 |
| `/stdd:new <需求>` | 创建新变更提案 |
| `/stdd:propose` | 提出需求草案 |
| `/stdd:clarify` | 需求澄清 (78 种结构化推理方法) |
| `/stdd:confirm` | 需求确认门 |
| `/stdd:spec` | 生成 BDD 规格 + Test Pipeline |
| `/stdd:plan` | 任务拆解 + ADR 记录 + 持久状态 |
| `/stdd:apply` | 实现任务 (Ralph Loop TDD) |
| `/stdd:execute` | Ralph Loop 执行循环 |
| `/stdd:verify` | 验证规范一致性 (含 3D 验证) |
| `/stdd:archive` | 归档变更 |
| `/stdd:ff <需求>` | Fast-Forward 快速生成所有产物 |
| `/stdd:continue` | 继续生成下一个产物 |
| `/stdd:explore [目标]` | 自由探索模式 (只读) |
| `/stdd:turbo <需求>` | One-Shot 一键全流程 |
| `/stdd:brainstorm` | 纯分析建议模式 |
| `/stdd:issue` | Bug/Issue TDD 修复流程 |

### Graph 引擎

| 命令 | 说明 |
|------|------|
| `/stdd:graph visualize` | 可视化 Skill 依赖图 |
| `/stdd:graph analyze` | 分析当前状态 |
| `/stdd:graph run <skill>` | 从指定 Skill 开始执行 |
| `/stdd:graph parallel` | 并行执行 |
| `/stdd:graph history` | 执行历史 |
| `/stdd:graph replay <id>` | 回放执行 |
| `/stdd:graph recommend` | 智能推荐 |

### SDD 增强

| 命令 | 说明 |
|------|------|
| `/stdd:api-spec` | API 规范先行 (OpenAPI/TypeScript) |
| `/stdd:schema` | 类型规范先行 (JSON Schema/Zod) |
| `/stdd:contract` | 契约测试 (5 种消息模式) |
| `/stdd:validate` | 规范验证 + Spec Guardian |

### TDD 增强

| 命令 | 说明 |
|------|------|
| `/stdd:outside-in` | 外向内 TDD (E2E → 集成 → 单元) |
| `/stdd:mock` | 自动 Mock 生成 |
| `/stdd:factory` | 测试数据工厂 (Builder/Faker) |
| `/stdd:mutation` | 变异测试 (Quick + Deep 双模式) |

### 辅助功能

| 命令 | 说明 |
|------|------|
| `/stdd:guard` | TDD 守护钩子 + Anti-Bypass 防绕过 |
| `/stdd:constitution` | Constitution 管理 (9 篇条例 + 豁免) |
| `/stdd:prp` | PRP 结构化规划 (What/Why/How/Success) |
| `/stdd:supervisor` | 多 Agent 协调器 (Supervisor 模式) |
| `/stdd:context` | 三层文档架构 (渐进式加载) |
| `/stdd:iterate` | 自主迭代循环 (Plan-Execute-Reflect) |
| `/stdd:memory` | 向量数据库记忆 (语义搜索) |
| `/stdd:parallel` | 并行执行模式 (DAG 调度) |
| `/stdd:roles` | 12 Agent 角色协作 (含对抗式审查) |
| `/stdd:metrics` | 质量指标仪表板 |
| `/stdd:learn` | 自适应学习 + Pattern Teaching |
| `/stdd:certainty` | 5 维度置信度评分 |
| `/stdd:complexity` | APP Mass 代码质量计算 |
| `/stdd:vision` | 项目愿景文档管理 |
| `/stdd:user-test` | 用户测试脚本生成 |
| `/stdd:help` | 上下文感知帮助系统 |
| `/stdd:final-doc` | 生成最终文档 |
| `/stdd:commit` | 原子化提交 (red:/green:/refactor: 前缀) |

---

## 5 级防跑偏防御体系

| 级别 | 机制 | 说明 |
|------|------|------|
| 1 | 人机确认门 | 关键决策需人类确认 (HITL 3 模式可配置) |
| 2 | 微任务隔离 | 5~6 个原子任务，降低上下文迷失 |
| 3 | 连续失败回滚 | 4 阶段容错 (策略调整→降级→熔断→回滚) |
| 4 | 静态质检门 | 语法/类型检查在测试前执行 |
| 5 | 伪变异审查 | 检测骗绿灯断言 |

---

## 最佳实践

1. **首次使用先初始化** — 运行 `/stdd:init` 创建工作区
2. **简单需求用 ff** — 明确需求直接 `/stdd:ff` 一键完成
3. **一键全流程用 turbo** — `/stdd:turbo` 自动完成所有阶段
4. **复杂需求逐步生成** — 使用 `/stdd:continue` 允许中间干预
5. **启用守护** — 运行 `/stdd:guard on` 强制 TDD 纪律
6. **小步快跑** — 每个变更控制在 5~6 个任务
7. **测试先行** — 严格遵守 Ralph Loop，红灯 → 绿灯 → 重构
8. **持续验证** — 完成后运行 `/stdd:verify` 确保一致性
9. **监控质量** — 定期运行 `/stdd:metrics` 查看质量指标
10. **使用 Graph 引擎** — `/stdd:graph recommend` 获取智能推荐
11. **配置 HITL 粒度** — 在 `stdd/config.yaml` 调整人机交互频率

---

> 参考: 借鉴自 OpenSpec 规范先行理念和 Stryker 变异测试
