# STDD Copilot 能力边界说明

> 本文档明确区分工具自身能力和需要外部 AI 执行器才能完成的功能

## 核心设计原则

STDD Copilot 是一个 **CLI 工具 + 模板框架**，它本身不提供 AI 编码能力，而是为你的 AI 编码助手（Claude Code、Cursor、Copilot 等）设定"交通规则"。

---

## ✅ 工具自身已实现的能力

### CLI 命令（可直接使用）

| 命令 | 功能 | 状态 |
|------|------|------|
| `stdd init` | 初始化项目结构 | ✅ 完全实现 |
| `stdd new <name>` | 创建变更目录和文件 | ✅ 完全实现 |
| `stdd apply <name> [--phase red|green|refactor] [--allow-no-tests]` | 运行测试并更新任务状态 | ✅ 完全实现 |
| `stdd verify <name>` | 验证变更（测试 + Constitution） | ✅ 完全实现 |
| `stdd archive <name>` | 归档变更 + Delta Spec 合并 | ✅ 完全实现 |
| `stdd list` | 列出所有变更 | ✅ 完全实现 |
| `stdd status [name]` | 显示变更状态 | ✅ 完全实现 |
| `stdd doctor [--deep]` | 综合健康检查 / 深度诊断 | ✅ 完全实现 |
| `stdd guard` | 质量门禁检查 | ✅ 完全实现 |
| `stdd constitution` | 查看/检查开发条例 | ✅ 完全实现 |
| `stdd mutation <name>` | Quick 启发式变异测试 | ✅ 部分实现 |
| `stdd workspace` | 工作区管理 | ✅ 完全实现 |
| `stdd metrics` | 质量指标 | ✅ 完全实现 |
| `stdd graph run` | Graph 引擎执行 | ⚠️ 需要外部执行器 |
| CommandLoader 模式 | ~50 个命令统一注册/发现/加载 | ✅ 完全实现 |

### Constitution 检查（9 篇条例）

| Article | 名称 | 检查能力 |
|---------|------|---------|
| 1 | Library-First | 检测未使用依赖、重复造轮子 | ✅ |
| 2 | TDD | 测试文件存在、反模式检查、阶段合规 | ✅ |
| 3 | Small Commits | Git 历史记录检查 | ✅ |
| 4 | Code Style | ESLint 集成、文件长度检查 | ✅ |
| 5 | Documentation | JSDoc 检查 | ✅ |
| 6 | Error Handling | 空 catch 块检测 | ✅ |
| 7 | Security | 硬编码密码、SQL 注入检测 | ✅ |
| 8 | Performance | useEffect 依赖、N+1 查询检测 | ✅ |
| 9 | CI/CD | CI 配置检测 | ✅ |

### 测试执行

- ✅ 自动检测测试命令（package.json、stdd/config.yaml）
- ✅ 支持多工作区测试
- ✅ 测试报告注入（Jest、Vitest、pytest 等）
- ✅ TDD 阶段强制（RED → GREEN → REFACTOR）

### Evidence 系统

- ✅ 结构化证据收集
- ✅ 审计追踪
- ✅ Shell 执行器审计日志（`stdd/logs/shell-executor-audit.jsonl`）
- ✅ Fix Packet 生成

### Workspace / Monorepo

- ✅ 自动检测 npm/pnpm workspaces
- ✅ `--workspace` 作用域
- ✅ Workspace registry 管理

---

## ⚠️ 需要外部 AI 执行器的能力

### Claude Code 斜杠命令（`/stdd:*`）

这些命令是 **markdown 模板**，需要在 Claude Code 会话中使用，由 AI 助手执行：

| 命令 | 功能 | 依赖 |
|------|------|------|
| `/stdd:propose` | 提出需求草案 | 🤖 AI 生成内容 |
| `/stdd:clarify` | 需求澄清（78 种方法） | 🤖 AI 生成内容 |
| `/stdd:confirm` | 需求确认门 | 🤖 AI 生成内容 |
| `/stdd:spec` | 生成 BDD 规格 | 🤖 AI 生成内容 |
| `/stdd:plan` | 任务拆解 + ADR | 🤖 AI 生成内容 |
| `/stdd:execute` | Ralph Loop TDD 执行 | 🤖 AI 编码 |
| `/stdd:ff` | Fast-Forward 快速生成 | 🤖 AI 生成内容 |
| `/stdd:continue` | 继续生成产物 | 🤖 AI 生成内容 |
| `/stdd:turbo` | 一键全流程 | 🤖 AI 编码 |

### Graph 引擎

| 功能 | 状态 |
|------|------|
| DAG 编译 | ✅ 工具实现 |
| 拓扑排序 | ✅ 工具实现 |
| 节点执行 | ⚠️ 需要外部执行器 |
| 自愈引擎 | ⚠️ 框架存在，需要执行器 |

### Mutation 测试

| 模式 | 状态 |
|------|------|
| Quick（启发式） | ✅ 工具实现 |
| Deep（Stryker） | ⚠️ 需要项目安装配置 Stryker |

### Agent 运行时

| 功能 | 状态 |
|------|------|
| 角色定义 | ✅ 模板存在 |
| Party Mode | ✅ 简单状态机 |
| 多 Agent 协作 | ❌ 未实现 |

---

## 📋 能力总结

### 工具能做什么

1. **管理 Spec 文件**：创建、组织、版本化
2. **执行测试**：运行测试、更新状态、收集证据
3. **强制 TDD 流程**：RED → GREEN → REFACTOR 阶段控制
4. **质量门禁**：9 篇 Constitution 条例检查
5. **证据收集**：结构化证据、审计追踪
6. **工作区管理**：Monorepo 支持

### 工具不能做什么

1. **AI 编码**：不能自动写代码
2. **需求分析**：不能自动分析需求
3. **Spec 生成**：不能自动生成规格文档
4. **任务拆解**：不能自动拆解任务

### 需要配合的 AI 工具

- **Claude Code**：主要支持的 AI 编码助手
- **Cursor**：支持的 IDE
- **GitHub Copilot**：支持的 IDE
- **其他 AI 工具**：可通过模板适配

---

## 🔧 典型工作流

### 场景 1：需求明确

```bash
# 1. 初始化（工具）
stdd init

# 2. 创建变更（工具）
stdd new add-login

# 3. 生成 Spec 和任务（AI - 使用 /stdd:ff）
# 在 Claude Code 中: /stdd:ff 实现用户登录

# 4. 执行 TDD 任务（工具 + 人类）
stdd apply add-login --phase red     # 写失败测试（人类）
stdd apply add-login --phase green   # 实现代码（人类/AI）
stdd apply add-login --phase refactor # 重构（人类/AI）

# 5. 验证（工具）
stdd verify add-login

# 6. 归档（工具）
stdd archive add-login
```

### 场景 2：需求模糊

```bash
# 1. 初始化（工具）
stdd init

# 2. 创建变更（工具）
stdd new auth-flow

# 3. 需求澄清（AI - 使用 /stdd:clarify）
# 在 Claude Code 中: /stdd:clarify 实现用户认证

# 4. 生成 Spec（AI - 使用 /stdd:spec）
# 在 Claude Code 中: /stdd:spec

# 5. 后续同场景 1
```

---

## 📚 相关文档

- [README.md](../README.md) - 项目介绍
- [USAGE.md](../USAGE.md) - 完整使用指南
- [ARCHITECTURE.md](../ARCHITECTURE.md) - 系统架构
- [AGENTS.md](../AGENTS.md) - AI Agent 指令
