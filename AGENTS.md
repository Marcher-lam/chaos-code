# STDD Copilot - AI Agent Instructions

> Version: 2.1 | Last Updated: 2026-05-14

---

## 全部能力入口 (45 个 = 20 Command 模板 + 38 Skill 模板，去重后)

### Command 模板入口 (20)
- `/stdd:init` `/stdd:new` `/stdd:propose` `/stdd:clarify` `/stdd:confirm`
- `/stdd:spec` `/stdd:plan` `/stdd:apply` `/stdd:execute` `/stdd:verify` `/stdd:archive`
- `/stdd:final-doc` `/stdd:brainstorm` `/stdd:issue` `/stdd:constitution`
- `/stdd:ff` `/stdd:continue` `/stdd:explore` `/stdd:graph` `/stdd:turbo`

---

## 双模式设计：用户交互 + Agent 自主编排

STDD Copilot 支持 **两种并行模式**，Agent 根据用户输入自动选择：

### 模式 A：用户交互模式 (User-Driven)

**触发条件**：用户明确输入 `/stdd:` 斜杠命令

**行为**：
- 立即执行用户指定的命令，不做额外编排
- 执行完成后汇报结果
- 如果当前项目状态与命令不匹配，**友好提示**下一步建议，但**不强制推进**

```
用户: /stdd:apply
Agent: ✅ 执行 TASK-003...
       💡 提示: 当前还有 2 个待完成任务，完成后可以 /stdd:verify
```

### 模式 B：Agent 自主编排模式 (Agent-Driven)

**触发条件**：用户通过自然语言描述需求（非 `/stdd:` 命令），或明确说 "自动推进"/"继续"

**行为**：
- 读取 Skill Graph，规划完整执行路径
- 自动推进每个 Phase，在确认门暂停
- 汇报进度，让用户随时了解当前状态

```
用户: 实现用户登录功能
Agent: [读取 Skill Graph] → [检测状态] → [自动推进全流程]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Phase 1/7: 需求提案 (propose)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
... (自动生成 proposal)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Phase 2/7: 需求澄清 (clarify)
✅ 上一阶段: proposal 已生成
🔜 下一阶段: 需求确认 (confirm) ⚠️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
... (自动澄清)

⚠️ 确认门: 请确认以上需求理解是否正确？
   回复 "确认" 继续，或提出修改意见。
```

### 模式自动切换规则

| 用户输入 | 模式 | 行为 |
|---------|------|------|
| `/stdd:apply` | 用户交互 | 立即执行 apply |
| `/stdd:status` | 用户交互 | 展示状态，不推进 |
| "实现登录" | 自主编排 | 从当前状态自动推进全流程 |
| "继续" / "下一步" | 自主编排 | 推进到下一个 Phase |
| "自动完成" | 自主编排 | 推进到下一个确认门 |
| "帮我看看项目状态" | 自主编排 | 读取状态后推荐下一步 |

**核心规则**：
1. `/stdd:` 命令优先级最高 — 用户明确指令立即执行
2. 自然语言触发自主编排 — Agent 决定最优路径
3. 两种模式可随时切换 — 用户可以随时介入或退出编排

---

## Agent 自主编排协议

### Phase 过渡规则

当在自主编排模式下，Agent **自动进入下一 Phase**，仅在确认门暂停：

| 当前 Phase | 完成条件 | 自动进入 |
|-----------|---------|---------|
| `/stdd:init` | config.yaml + 目录结构就绪 | 等待用户需求 → `/stdd:new` |
| `/stdd:new` | change 目录 + proposal.md 创建 | `/stdd:propose` |
| `/stdd:propose` | proposal.md 填写完毕 | `/stdd:clarify` |
| `/stdd:clarify` | 澄清问题全部回答 | `/stdd:confirm` ⚠️ 需用户确认 |
| `/stdd:confirm` | 用户确认通过 | `/stdd:spec` |
| `/stdd:spec` | BDD feature 文件生成 | `/stdd:plan` |
| `/stdd:plan` | tasks.md + design.md 生成 | `/stdd:apply`（逐个 task） |
| `/stdd:apply` | 当前 task 测试通过 | 下一个 task 或 `/stdd:verify` |
| `/stdd:verify` | 所有检查通过 | `/stdd:mutation` |
| `/stdd:mutation` | mutation score ≥ 阈值 | `/stdd:archive` ⚠️ 需用户确认 |
| `/stdd:archive` | 归档完成 | 等待新需求 |

### 进度汇报格式

每次 Phase 切换时：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Phase 2/7: 需求澄清 (clarify)
✅ 上一阶段: proposal 已生成 (stdd/changes/login/proposal.md)
🔜 下一阶段: 需求确认 (confirm) ⚠️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 暂停确认规则（Human-in-the-Loop）

仅在以下节点暂停，等待用户确认（**仅自主编排模式**）：

1. **`/stdd:confirm`** — 需求确认门。展示澄清结果，等待用户说 "确认" 或提出修改
2. **`/stdd:archive`** — 归档确认门。展示验证结果，等待用户说 "归档" 
3. **连续失败 3 次** — 熔断。展示失败证据，请求用户决策

---

## Skill Graph 路径选择

根据用户意图，自动选择对应的 Skill Graph 路径：

### 新功能开发（默认）
```
init → new → propose → clarify → confirm → spec → plan → apply → verify → archive
```

### 快速修复（用户说 "修复xx bug"）
```
init → issue → apply → verify → archive
```

### 一键全流程（用户说 "快速开发xx"）
```
turbo（自动完成所有阶段，仅在最终确认时暂停）
```

### 探索分析（用户说 "分析xx可行性"）
```
explore → brainstorm → final-doc
```

---

## 上下文感知

### 读取变更状态

在执行任何操作前，先读取当前变更状态：

```bash
stdd status          # 查看所有变更
stdd status <name>   # 查看特定变更
cat stdd/changes/<name>/tasks.md  # 查看任务进度
```

### 使用推荐引擎

当不确定下一步时，调用：

```bash
stdd recommend       # 获取下一步推荐
stdd graph recommend # Graph 引擎推荐
```

---

## 错误恢复

### 自动重试

```
失败 1 次 → 分析错误，调整策略后重试
失败 2 次 → 读取 fix-packet，尝试降级策略
失败 3 次 → 🔴 熔断，向用户汇报完整证据链
```

### Fix Packet 使用

当 `/stdd:apply` 失败时，自动读取：

```bash
stdd fix-packet <change>  # 生成修复上下文
cat stdd/changes/<change>/evidence/fix-packet-*.md  # 分析失败原因
```

---

## 辅助功能（按需自动调用）

| 场景 | 自动调用 |
|------|---------|
| 代码完成后 | `/stdd:guard` — 质量门禁 |
| 验证前 | `/stdd:mutation` — 变异测试 |
| 有 API 需求 | `/stdd:api-spec` — API 规范 |
| 有类型需求 | `/stdd:schema` — 类型定义 |
| 需要 Mock | `/stdd:mock` — Mock 生成 |
| 需要测试数据 | `/stdd:factory` — 数据工厂 |
| 归档前 | `/stdd:constitution check` — 合规检查 |
| 定期（每 5 个 task） | `/stdd:metrics` — 指标仪表板 |

---

## 一键 Turbo 模式

当用户使用 "快速"、"一键"、"turbo" 等关键词，或需求非常明确时：

```
/stdd:turbo <需求描述>
```

这会自动执行全流程（propose → spec → plan → apply → verify → archive），仅在以下节点暂停：
- 需求确认
- 归档确认

---

## 能力清单（Agent 可自主调用）

### SDD & TDD 核心流程
`/stdd:init` `/stdd:new` `/stdd:propose` `/stdd:clarify` `/stdd:confirm`
`/stdd:spec` `/stdd:plan` `/stdd:apply` `/stdd:execute` `/stdd:verify` `/stdd:archive`

### 工作流增强
`/stdd:ff` `/stdd:continue` `/stdd:explore` `/stdd:turbo` `/stdd:brainstorm` `/stdd:issue`

### SDD 增强
`/stdd:api-spec` `/stdd:schema` `/stdd:contract` `/stdd:validate`

### TDD 增强
`/stdd:outside-in` `/stdd:mutation` `/stdd:mock` `/stdd:factory`

### 质量门禁
`/stdd:guard` `/stdd:constitution` `/stdd:hooks`

### Graph 引擎
`/stdd:graph`

### 协作与文档
`/stdd:commit` `/stdd:final-doc` `/stdd:design` `/stdd:prp` `/stdd:supervisor`
`/stdd:context` `/stdd:iterate` `/stdd:memory` `/stdd:parallel` `/stdd:roles`

### 评估与学习
`/stdd:metrics` `/stdd:learn` `/stdd:certainty` `/stdd:complexity` `/stdd:vision`

### 测试与运维
`/stdd:user-test` `/stdd:ci` `/stdd:browser` `/stdd:depcheck` `/stdd:doctor`

### 辅助
`/stdd:help` `/stdd:status` `/stdd:list` `/stdd:recommend` `/stdd:skills`
`/stdd:commands` `/stdd:workspace` `/stdd:extensions` `/stdd:story`
`/stdd:pipeline` `/stdd:baby-steps` `/stdd:starters` `/stdd:tdd-init`
`/stdd:fix-packet` `/stdd:update` `/stdd:audit` `/stdd:runtime`
