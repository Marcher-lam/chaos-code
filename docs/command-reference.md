# STDD Copilot 全部命令清单

## 1. 核心 STDD 工作流 (11 个)

| 斜杠命令 | CLI 命令 | 功能 |
|---------|---------|------|
| `/stdd:init` | `stdd init [path]` | 初始化 STDD 项目目录结构 (specs/changes/memory/graph/config.yaml) + `.claude/commands/` + `.claude/skills/` |
| `/stdd:new` | `stdd new change <name>` | 创建新变更提案，生成 proposal.md + .status.yaml，引导需求收集与澄清 |
| `/stdd:propose` | — | 提出新功能需求草案，边界澄清，自动检测过大 Epic 并建议拆分 |
| `/stdd:clarify` | — | 多轮需求澄清对话 (78 种结构化推理方法)，解决歧义与边界情况 |
| `/stdd:confirm` | — | 人机确认门，展示提案摘要并请求用户审批，回复确认后推进到 spec 阶段 |
| `/stdd:spec` | `stdd spec <change>` | 将需求提案转化为 BDD (Given/When/Then) Delta Specs，含 ADDED/MODIFIED/REMOVED 标记 |
| `/stdd:plan` | — | 评估架构变更，生成 5-6 个细粒度微任务清单 (每任务约 30 分钟) + ADR 记录 |
| `/stdd:apply` | `stdd apply [change]` | 执行 Ralph Loop TDD 循环：红灯→检查→绿灯→变异→重构，支持 `--task`/`--fix`/`--phase` |
| `/stdd:execute` | — | 严格 Ralph Loop TDD 闭环执行 (apply 的别名) |
| `/stdd:verify` | `stdd verify [change]` | 5 维验证：API 签名/BDD 覆盖/类型/边界异常/文档一致性 + Constitution 合规 + Evidence |
| `/stdd:archive` | `stdd archive [change]` | 完成变更：合并 Delta Spec 到主规格，移至归档，生成 spec-merge-report.json |

## 2. 工作流增强 (6 个)

| 斜杠命令 | CLI 命令 | 功能 |
|---------|---------|------|
| `/stdd:ff` | `stdd ff <desc>` | Fast-Forward 快速生成：一次性生成全部四项核心产物 (提案/规格/设计/任务)，支持 `--dry-run` |
| `/stdd:continue` | `stdd continue [change]` | 自动检测 `.status.yaml` 工作流状态机，推进到下一个缺失产物并生成，支持 `--specs` 强制跳转 |
| `/stdd:explore` | `stdd explore [scope]` | 只读探索模式：分析现有代码架构、模式、约束，写入 `stdd/explorations/`，支持 `--deep` |
| `/stdd:turbo` | `stdd turbo <desc>` | One-Shot 一键执行所有实现前阶段 (propose→clarify→confirm→spec→plan)，在确认门暂停 |
| `/stdd:brainstorm` | `stdd brainstorm <topic>` | 只读头脑风暴，多维度分析 (架构洞察/代码质量/技术评估/重构建议)，零文件修改，支持 `--method` |
| `/stdd:issue` | `stdd issue <desc>` | Bug TDD 修复：分类缺陷，先写失败测试 (RED)，最小修复 (GREEN)，验证无回归 |

## 3. SDD 增强 — 规格驱动 (4 个)

| 斜杠命令 | CLI 命令 | 功能 |
|---------|---------|------|
| `/stdd:api-spec` | `stdd api-spec [change]` | 生成 OpenAPI 格式 API 规格 + TypeScript 类型定义，支持多端点批量生成 |
| `/stdd:schema` | `stdd schema validate/create/fork` | 生成 JSON Schema 和 Zod 类型校验，支持 create/fork 自定义 artifact DAG workflow |
| `/stdd:contract` | `stdd contract <action>` | 生成和管理消费者驱动契约测试 (5 种消息模式)，支持 generate/verify 子命令 |
| `/stdd:validate` | `stdd validate [change]` | 验证规格一致性 + Spec Guardian 泄漏检测 + RFC 2119 关键词检查，支持 `--fix` 自动修复 |

## 4. TDD 增强 — 测试驱动 (6 个)

| 斜杠命令 | CLI 命令 | 功能 |
|---------|---------|------|
| `/stdd:outside-in` | `stdd outside-in <action>` | 由外向内 TDD：从 E2E 测试开始，再到集成测试，最后单元测试。支持 init/scaffold/status |
| `/stdd:mutation` | `stdd mutation [change]` | 变异测试：Quick 启发式 anti-fake-green 检测 + Stryker 委托深度分析 (`--mode stryker`) |
| `/stdd:mock` | `stdd mock [change]` | 自动生成外部依赖的 Mock 实现，支持 `--all` 扫描全量 + `--fake` 生成可运行 fake |
| `/stdd:factory` | — | 测试数据工厂：Builder 模式 + Faker.js + 嵌套 Fixture，覆盖正常/边界/异常场景 |
| — | `stdd tdd-init [path]` | 为已有源码文件初始化测试脚手架，支持 `--dry-run` |
| — | `stdd baby-steps [task]` | 交互式 TDD 小步引导，适合复杂组件的渐进式实现 |

## 5. 质量与治理 (8 个)

| 斜杠命令 | CLI 命令 | 功能 |
|---------|---------|------|
| `/stdd:guard` | `stdd guard` | TDD 守护钩子：强制测试先行 (Blocking) + 最小实现 (Warning) + 反绕过，支持 on/off/status |
| `/stdd:constitution` | `stdd constitution <action>` | 管理 9 篇开发条例：show/check/status/fix/audit/waive，支持豁免追踪和审计趋势 |
| `/stdd:metrics` | `stdd metrics [change]` | 质量指标仪表板：测试覆盖率、变异得分、代码复杂度、TDD 合规率，支持 `--export` |
| `/stdd:fix-packet` | `stdd fix-packet [change]` | 生成诊断修复包 (Golden Packet)，从失败任务收集修复上下文，支持 `--test-command` |
| — | `stdd hooks install/verify/status/disable/enable` | 管理 STDD Hook 系统 (Pre/Post ToolUse)，多引擎支持 (Claude Code/Cursor/Windsurf) |
| — | `stdd audit` | Constitution 条例历史合规审计，支持 `--json` |
| — | `stdd depcheck [path]` | 检查未使用/过期的依赖包，支持 `--json` |
| — | `stdd doctor` | 项目健康诊断：10 项检查 (STDD 目录/配置/Node 版本/Git Hooks/测试框架等) |

## 6. Graph 引擎 — DAG 编排 (8 个子命令)

| 斜杠命令 | CLI 命令 | 功能 |
|---------|---------|------|
| `/stdd:graph` | `stdd graph <subcommand>` | DAG 技能编排引擎总入口，动态拓扑裁剪 |
| — | `stdd graph visualize` | 输出编译后图谱 (Mermaid/JSON/HTML 格式) |
| — | `stdd graph analyze` | 打印图谱节点、边、入口、终端、层级摘要 + 瓶颈分析 (`--bottlenecks`) |
| — | `stdd graph run --intent <intent>` | 按意图 DAG 执行全工作流 (feature/hotfix/research/repair)，动态路由拓扑 |
| — | `stdd graph parallel --detect/--execute` | 检查图谱并行化机会和可并行层，支持 `--max-workers` |
| — | `stdd graph history` | 查看执行历史 (从证据文件)，支持 `--failures` 过滤 |
| — | `stdd graph replay <id>` | 查看详情或重新执行过去的运行 |
| — | `stdd graph recommend` | 根据项目状态推荐下一步 Skill 和原因 |

## 7. 协作与文档 (9 个)

| 斜杠命令 | CLI 命令 | 功能 |
|---------|---------|------|
| `/stdd:commit` | `stdd commit [change]` | 原子化 Git 提交：red:/green:/refactor: 前缀 (Conventional Commits + TDD)，支持 `--tdd`/`--phase`/`--issue` |
| `/stdd:final-doc` | — | 聚合所有阶段产物为 FINAL_REQUIREMENT.md 综合文档 |
| `/stdd:design` | — | 将规格转化为技术设计文档，含 Context/Decision/Rationale/Consequences ADR 格式 |
| `/stdd:prp` | — | What/Why/How/Success 结构化规划框架，便于干系人对齐 |
| `/stdd:product-proposal` | `stdd product-proposal` | 扫描所有 stdd/ 产物，生成 15 章产品方案报告 (PRODUCT-PROPOSAL.md)，含覆盖率、质量指标、路线图，支持 `--json`/`--output` |
| `/stdd:context` | `stdd context [layer]` | 三层文档上下文管理 (Foundation~500t + Component~1000t + Feature~2000t)，支持 `--export`/`--json` |
| `/stdd:user-test` | `stdd user-test [change]` | 从 BDD 规格生成人类可读验收测试脚本 (非技术人员可执行) + AI agent 自动化脚本 |
| — | `stdd story <action>` | Story Mapping：创建用户故事地图 (journey YAML) 并转化为 BDD feature files |
| — | `stdd pipeline [change]` | 从规格生成 parser IR 和验收测试骨架 |

## 8. 高级与 AI Agent (10 个)

| 斜杠命令 | CLI 命令 | 功能 |
|---------|---------|------|
| `/stdd:supervisor` | — | 多 Agent 协调器 (Supervisor 模式)，跨领域并行工作，管理 start/status |
| `/stdd:iterate` | — | Plan-Execute-Reflect 自主迭代循环，渐进式质量提升，支持 `--max` 限制轮数 |
| `/stdd:memory` | `stdd memory <action>` | 向量数据库记忆系统：save/search/stats/scan/list 语义搜索和持久化记忆存储 |
| `/stdd:parallel` | — | DAG 并行执行引擎：识别并并行执行独立任务，聚合结果 |
| `/stdd:roles` | `stdd roles <action>` | 12 个专业 Agent 角色 (4 基础 + 8 专用)，Party Mode 辩论 + 对抗式安全审查 |
| `/stdd:learn` | `stdd learn <action>` | 自适应学习：scan/good/bad/suggest/status，Pattern Teaching 扫描项目本地惯例 |
| `/stdd:vision` | — | 创建和维护项目愿景文档 (长期目标、架构北极星、战略方向) |
| `/stdd:help` | — | 基于当前项目状态的上下文感知帮助系统，推荐下一步命令 |
| — | `stdd runtime agent <action>` | Party Mode 多 Agent 状态机：start/next/stop/run，支持 `--rounds`/`--role` |
| — | `stdd runtime sudo <file>` | SudoLang 伪代码解析引擎，将伪代码解析为 STDD 结构化产物，支持 `--generate` |

## 9. 评估与决策支持 (3 个)

| 斜杠命令 | CLI 命令 | 功能 |
|---------|---------|------|
| `/stdd:complexity` | — | 代码复杂度评估 (APP Mass 圈复杂度/认知复杂度分析) + Top-10 热点 + 重构建议 |
| `/stdd:certainty` | — | 5 维度置信度评分 (需求清晰度/技术可行性/风险/测试覆盖/愿景对齐)，低于阈值暂停 |
| `/stdd:vision` | — | 项目愿景文档管理 (同第 8 类) |

## 10. 辅助工具 (15 个)

| CLI 命令 | 功能 |
|---------|------|
| `stdd status [change]` | 查看变更状态 (支持 `--json`) |
| `stdd list` / `stdd ls` | 列出所有变更/规格，支持 `--archived`/`--json`/`--specs` |
| `stdd skills [--phase N]` | 列出所有可用技能，支持按阶段过滤 |
| `stdd commands` | 列出所有 Claude Code 斜杠命令 |
| `stdd recommend` | 根据项目状态智能推荐下一步，支持 `--json` |
| `stdd update [path]` | 更新 STDD Copilot 模板文件，支持 `--force`/`--dry-run` |
| `stdd progress` | 实时进度追踪：JSONL 持久化日志，start/complete/fail/interrupt 四态记录，断点续传 (`--resume`)，支持 `--summary`/`--json`/`--last N`/`--clear`，SIGINT/SIGTERM 信号捕获 |
| `stdd start` | 交互式快速启动向导 (TTY) / 帮助文本 (非 TTY) |
| `stdd workspace list/validate/repair` | Monorepo 工作空间注册表管理，支持 `--json` |
| `stdd extensions list/install/validate` | STDD 扩展管理：列出/安装/验证扩展 |
| `stdd starters list/create` | 项目启动模板管理 (TS/JS/Python/Go/Rust 5 种) |
| `stdd ci [platform]` | 生成 CI 配置文件 (支持 github) |
| `stdd browser snapshot/inspect/doctor` | 内置浏览器驱动 (Playwright)：截图/检查/健康诊断，支持 `--width`/`--height` |
| `stdd graph recommend` | 智能推荐下一步 Skill (同第 6 类) |
| `stdd constitution audit` | Constitution 合规审计 (同第 5 类) |

---

## 统计总览

| 指标 | 数量 | 说明 |
|------|------|------|
| **Skill 模板** (SKILL.md) | **47** | `src/templates/skills/stdd/{name}/SKILL.md` |
| **Command 模板** (.md) | **75** | `src/templates/commands/{name}.md` |
| **唯一斜杠命令** (`/stdd:*`) | **76** | 去重后的 Skill + Command 入口 |
| **CLI 命令** (含子命令) | **75** | `stdd xxx` 终端命令 |
| **Skill 驱动入口** | **47** | 有 Skill 模板的命令 |
| **Command 文件入口** | **75** | 有 Command 模板的命令 |
| **总入口** | **127** | 80 Command + 47 Skill，去重后 80 个唯一入口 |
| **AI 引擎适配** | **22** | 4 Tier 兼容体系 |
| **Constitution 条例** | **9** | 3 Blocking + 4 Warning + 2 Suggestion |
| **Agent 角色** | **12** | 4 基础 + 8 专用 |
| **Graph Intent** | **4** | feature/hotfix/repair/research |
| **测试基线** | **171 套件 / 3810 测试** | Branch 91.03%，`npm test` 全部通过 |

---

## 按使用场景速查

### 需求明确的快速开发
```
stdd init → stdd ff "描述" → stdd apply → stdd verify → stdd archive
```

### 需求模糊的渐进式开发
```
stdd init → stdd new → /stdd:propose → /stdd:clarify → /stdd:confirm → /stdd:spec → /stdd:plan → stdd apply → stdd verify → stdd archive
```

### Bug 修复
```
stdd issue "Bug描述" → TDD 最小修复 → stdd verify → stdd archive
```

### 一键全流程
```
stdd turbo "需求描述" → 自动完成所有阶段 → stdd commit
```

### 断点恢复
```
stdd progress --resume → stdd continue <change>
```
