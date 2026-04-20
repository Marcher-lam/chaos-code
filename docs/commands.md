# Commands Reference

STDD Copilot 统一会话入口参考。

## Taxonomy 说明

为避免 slash command 与 skill taxonomy 混淆，请先区分两层：

- 一部分入口在 `.claude/commands/stdd/` 下有独立命令文件
- 另一部分能力由 `.claude/skills/` 提供，并在对话中沿用 `/stdd:*` 作为用户可见入口名

本页统一使用 `/stdd:*` 记录用户侧入口；是否存在独立 command 文件，请以仓库目录为准。

## 命令格式

统一入口格式如下：

```bash
/stdd:<command> [arguments] [options]
```

---

## 核心流程命令

### /stdd:init

初始化 STDD 项目结构。

```bash
/stdd:init                    # 初始化项目
/stdd:init --force            # 强制重新初始化
/stdd:init --with-memory      # 启用向量数据库记忆
```

**生成目录结构:**

```
stdd/
├── specs/              # Source of Truth
├── changes/            # 变更管理
│   └── archive/        # 归档
├── memory/             # 记忆库
│   ├── foundation.md
│   ├── components.md
│   └── contracts.md
├── graph/              # Graph 配置
└── config.yaml         # 项目配置
```

---

### /stdd:new

创建新变更提案。

```bash
/stdd:new <需求描述>           # 创建变更
/stdd:new --bug <描述>         # Bug 修复
/stdd:new --refactor <描述>    # 重构任务
/stdd:new --feature <描述>     # 新功能
```

**输出:**
- `stdd/changes/change-YYYYMMDD-HHMMSS/proposal.md`
- `stdd/changes/change-YYYYMMDD-HHMMSS/.status.yaml`

---

### /stdd:explore

进入只读探索模式，探索**业务代码**和架构。

> ⚠️ **探索目标是必需的**。如果没有提供，系统会询问您想探索什么。

```bash
/stdd:explore <探索目标>       # 指定探索目标 (必需)
/stdd:explore --deep           # 深度探索
```

**探索范围:**

```
✅ 探索这些:
   - src/ 目录下的业务代码
   - 现有的组件、服务、工具
   - API 接口和数据模型
   - 测试文件和测试模式

❌ 不要探索这些:
   - .claude/ (STDD 命令配置)
   - stdd/ (STDD 工作目录)
   - schemas/ (规格模板)
   - AGENTS.md (AI 指令)
```

**示例:**
```bash
/stdd:explore 理解现有的用户认证流程
/stdd:explore 分析 API 错误处理模式
/stdd:explore 评估引入 Zustand 替代 Redux 的可行性
```

**输出:**
- `stdd/explorations/explore-YYYYMMDD-HHMMSS.md`

---

### /stdd:ff (Fast-Forward)

一键生成所有产物。

```bash
/stdd:ff <需求描述>            # 快速生成
/stdd:ff --dry-run             # 预览不执行
```

**生成产物:**
1. `proposal.md` - 需求提案
2. `specs/*.md` - Delta 规格
3. `design.md` - 设计文档
4. `tasks.md` - 任务列表

---

### /stdd:continue

继续生成下一个产物。

```bash
/stdd:continue                 # 自动检测下一步
/stdd:continue --proposal      # 生成提案
/stdd:continue --specs         # 生成规格
/stdd:continue --design        # 生成设计
/stdd:continue --tasks         # 生成任务
```

**状态机:**

```
proposal → specs → design → tasks → ready
```

---

### /stdd:apply

执行 TDD 实现循环。

```bash
/stdd:apply                    # 执行所有任务
/stdd:apply --task=TASK-001    # 执行特定任务
/stdd:apply --next             # 执行下一个任务
/stdd:apply --fix              # 修复模式
/stdd:apply --no-mutation      # 跳过变异测试
/stdd:apply --no-refactor      # 跳过重构
```

**Ralph Loop:**

```
🔴 RED → 🔍 CHECK → 🟢 GREEN → 🧪 MUTATION → 🔵 REFACTOR → ✅
```

---

### /stdd:verify

验证实现与规格一致性。

```bash
/stdd:verify                   # 验证当前变更
/stdd:verify --all             # 验证所有变更
/stdd:verify --fix             # 自动修复不一致
```

**验证维度:**

| 维度 | 检查项 |
|------|--------|
| 接口 | API 签名一致性 |
| 行为 | BDD 场景覆盖 |
| 类型 | TypeScript 类型 |
| 边界 | 空值/异常处理 |
| 文档 | 注释一致性 |

---

### /stdd:archive

归档变更。

```bash
/stdd:archive                  # 归档当前变更
/stdd:archive --force          # 强制归档（跳过验证）
```

**归档流程:**
1. 合并 delta specs 到主 specs
2. 移动到 `changes/archive/YYYY-MM-DD-{change-id}/`
3. 更新状态

---

## Graph 引擎命令

### /stdd:graph visualize

可视化 Skill 依赖图。

```bash
/stdd:graph visualize          # Mermaid 格式
/stdd:graph visualize --format=html    # HTML 可交互
/stdd:graph visualize --output=graph.svg
```

---

### /stdd:graph analyze

分析当前状态和可执行路径。

```bash
/stdd:graph analyze            # 状态分析
/stdd:graph analyze --paths    # 路径分析
/stdd:graph analyze --bottlenecks  # 瓶颈分析
```

---

### /stdd:graph run

从指定 Skill 开始执行。

```bash
/stdd:graph run stdd-spec      # 从规格阶段开始
/stdd:graph run --full         # 完整流程
/stdd:graph run --skip-completed
/stdd:graph run --dry-run      # 预览
```

---

### /stdd:graph parallel

识别并并行执行独立任务。

```bash
/stdd:graph parallel --detect  # 检测可并行
/stdd:graph parallel --execute # 执行
/stdd:graph parallel --max-workers=4
```

---

### /stdd:graph history

查看执行历史。

```bash
/stdd:graph history            # 所有历史
/stdd:graph history --last=10  # 最近 10 次
/stdd:graph history --failures # 失败记录
```

---

### /stdd:graph replay

回放历史执行。

```bash
/stdd:graph replay <exec-id>   # 回放
/stdd:graph replay <exec-id> --re-execute
```

---

### /stdd:graph recommend

智能推荐下一步。

```bash
/stdd:graph recommend          # 基于当前状态
/stdd:graph recommend --goal="完成认证功能"
```

---

## SDD 增强命令

### /stdd:api-spec

API 规范先行。

```bash
/stdd:api-spec                 # 生成 OpenAPI 规范
/stdd:api-spec --typescript    # 生成 TypeScript 类型
/stdd:api-spec --validate      # 验证规范一致性
```

---

### /stdd:schema

类型规范先行。

```bash
/stdd:schema <类型名>          # 生成 JSON Schema
/stdd:schema --zod             # 生成 Zod schema
/stdd:schema --typescript      # 生成 TypeScript 类型
```

---

### /stdd:contract

契约测试。

```bash
/stdd:contract                 # 生成消费者契约
/stdd:contract --provider      # 提供者验证
/stdd:contract --publish       # 发布契约
```

---

### /stdd:validate

规范验证。

```bash
/stdd:validate                 # 验证所有规范
/stdd:validate --fix           # 自动修复
```

---

## TDD 增强命令

### /stdd:outside-in

外向内 TDD。

```bash
/stdd:outside-in               # E2E → 集成 → 单元
/stdd:outside-in --e2e-only    # 仅 E2E
/stdd:outside-in --integration # 仅集成测试
```

---

### /stdd:mock

自动 Mock 生成。

```bash
/stdd:mock <服务名>            # 生成 Mock
/stdd:mock --all               # 生成所有依赖 Mock
/stdd:mock --fake              # Fake 实现
```

---

### /stdd:factory

测试数据工厂。

```bash
/stdd:factory <类型>           # 生成数据工厂
/stdd:factory --faker          # 使用 Faker.js
/stdd:factory --scenarios      # 生成预设场景
```

---

### /stdd:mutation

变异测试。

```bash
/stdd:mutation                 # 运行变异测试
/stdd:mutation --threshold=80  # 设置阈值
/stdd:mutation --report        # 查看报告
```

---

## 辅助功能入口（Skill 为主）

### /stdd:prp

PRP 结构化规划。

```bash
/stdd:prp <需求>               # What/Why/How/Success
```

**输出模板:**

```markdown
# PRP: [需求标题]

## What (做什么)
[功能描述]

## Why (为什么)
[业务价值]

## How (怎么做)
[技术方案]

## Success (成功标准)
- [ ] [验收条件 1]
- [ ] [验收条件 2]
```

---

### /stdd:supervisor

多 Agent 协调器。

```bash
/stdd:supervisor start         # 启动 Supervisor
/stdd:supervisor status        # 查看状态
/stdd:supervisor stop          # 停止
```

---

### /stdd:context

三层文档架构。

```bash
/stdd:context show             # 显示当前上下文
/stdd:context refresh          # 刷新上下文
/stdd:context export           # 导出上下文
```

**三层:**

| 层级 | 内容 | Token |
|------|------|-------|
| Foundation | 技术栈、规范 | ~500 |
| Component | 组件拓扑 | ~1000 |
| Feature | 当前任务 | ~2000 |

---

### /stdd:iterate

自主迭代循环。

```bash
/stdd:iterate                  # 启动迭代
/stdd:iterate --max=10         # 最大迭代次数
/stdd:iterate status           # 查看状态
/stdd:iterate pause            # 暂停
```

---

### /stdd:memory

向量数据库记忆。

```bash
/stdd:memory save "内容"       # 保存记忆
/stdd:memory search "查询"     # 语义搜索
/stdd:memory stats             # 统计信息
```

---

### /stdd:parallel

并行执行模式。

```bash
/stdd:parallel                 # 自动并行
/stdd:parallel --workers=4     # 指定 worker 数
```

---

### /stdd:roles

多角色协作。

```bash
/stdd:roles start              # 启动角色模式
/stdd:roles switch po          # 切换到 PO
/stdd:roles switch dev         # 切换到 Developer
/stdd:roles switch tester      # 切换到 Tester
/stdd:roles switch reviewer    # 切换到 Reviewer
```

---

### /stdd:metrics

质量指标仪表板。

```bash
/stdd:metrics                  # 显示仪表板
/stdd:metrics --export         # 导出报告
```

---

### /stdd:constitution

STDD Constitution 管理 - 9 篇开发条例的执行与豁免。

```bash
/stdd:constitution             # 查看所有条例
/stdd:constitution show 2      # 查看特定条例详情
/stdd:constitution check       # 检查代码合规
/stdd:constitution check --changed  # 只检查修改的文件
/stdd:constitution waivers     # 查看当前豁免
/stdd:constitution waiver --article=2 --reason="Legacy migration" --days=30  # 申请豁免
```

**9 篇条例优先级:**

| 优先级 | Article | 名称 | 强制方式 |
|--------|---------|------|----------|
| **Blocking** | 2 | TDD | Hook 阻断 |
| **Blocking** | 7 | Security | Hook 阻断 |
| **Blocking** | 9 | CI/CD | CI 门禁 |
| Warning | 1 | Library-First | 警告提示 |
| Warning | 3 | Small Commits | 警告提示 |
| Warning | 4 | Code Style | Hook 检查 |
| Warning | 6 | Error Handling | 建议提示 |
| Suggestion | 5 | Documentation | 建议提示 |
| Suggestion | 8 | Performance | 建议提示 |

**豁免管理:**

```yaml
# stdd/constitution/waivers.yaml
waivers:
  - id: waiver-2024-001
    article: 2
    reason: "Legacy migration phase 1"
    scope: "src/legacy/**"
    expires: 2024-06-01
    approved_by: team-lead
```

---

### /stdd:guard

TDD 守护钩子系统。

```bash
/stdd:guard on                 # 启用守护
/stdd:guard off                # 禁用守护
/stdd:guard status             # 查看状态
/stdd:guard disable rule:test-first  # 禁用特定规则
```

**守护规则:**

| Rule | 说明 | 行为 |
|------|------|------|
| test-first | 实现前必须有失败测试 | Blocking |
| minimal-impl | 检测过度实现 | Warning |
| test-must-fail | 新测试首次必须失败 | Warning |
| no-skip-refactor | 禁止跳过重构 | Suggestion |

---

### /stdd:learn

自适应学习。

```bash
/stdd:learn good "反馈"        # 正面反馈
/stdd:learn bad "反馈"         # 负面反馈
/stdd:learn suggest "建议"     # 改进建议
/stdd:learn status             # 学习状态
```

---

### /stdd:vision

项目愿景文档。

```bash
/stdd:vision                   # 创建/更新愿景
```

---

### /stdd:user-test

用户测试脚本。

```bash
/stdd:user-test                # 生成测试脚本
```

---

### /stdd:help

上下文感知帮助。

```bash
/stdd:help                     # 基于当前状态帮助
/stdd:help tdd                 # TDD 相关帮助
/stdd:help graph               # Graph 引擎帮助
```

---

## 常用入口速查表

> 以下表格是常用入口摘要，不是穷举清单；详细说明以上文章节为准。

| 类别 | 命令 | 说明 |
|------|------|------|
| **核心** | `/stdd:init` | 初始化项目 |
| | `/stdd:new` | 创建变更 |
| | `/stdd:explore` | 探索模式 |
| | `/stdd:ff` | 快速生成 |
| | `/stdd:continue` | 继续生成 |
| | `/stdd:apply` | TDD 实现 |
| | `/stdd:verify` | 验证一致性 |
| | `/stdd:archive` | 归档变更 |
| **Graph** | `/stdd:graph *` | Graph 引擎 |
| **SDD** | `/stdd:api-spec` | API 规范 |
| | `/stdd:schema` | 类型规范 |
| | `/stdd:contract` | 契约测试 |
| | `/stdd:validate` | 规范验证 |
| **TDD** | `/stdd:outside-in` | 外向内 TDD |
| | `/stdd:mock` | Mock 生成 |
| | `/stdd:factory` | 数据工厂 |
| | `/stdd:mutation` | 变异测试 |
| **Constitution** | `/stdd:constitution` | 9 篇开发条例 |
| | `/stdd:guard` | Hook 守护系统 |
| **辅助** | `/stdd:prp` | 结构化规划 |
| | `/stdd:supervisor` | 多 Agent |
| | `/stdd:context` | 上下文管理 |
| | `/stdd:iterate` | 迭代循环 |
| | `/stdd:memory` | 记忆系统 |
| | `/stdd:parallel` | 并行执行 |
| | `/stdd:roles` | 多角色 |
| | `/stdd:metrics` | 质量指标 |
| | `/stdd:learn` | 自适应学习 |
| | `/stdd:certainty` | 置信度评分 |
| | `/stdd:complexity` | 复杂度评估 |
| | `/stdd:vision` | 愿景文档 |
| | `/stdd:user-test` | 用户测试 |
| | `/stdd:help` | 帮助系统 |
| | `/stdd:final-doc` | 最终文档 |
| | `/stdd:commit` | 原子化提交 |

---

## 下一步

- [Workflows](workflows.md) - 常见工作流程
- [Concepts](concepts.md) - 核心概念
- [CLI Guide](cli-guide.md) - CLI 完整文档
