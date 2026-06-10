---
id: stdd.confirm
command: /stdd:confirm
description: 人类确认门，冻结需求范围后进入规格阶段（语言无关）
version: "3.0"
category: lifecycle
phase: confirmation
read_only: false
risk_level: medium
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.clarify]
next: [stdd.spec]
on_failure: [stdd.propose]
inputs:
  - 已澄清 proposal
  - 风险与假设
  - 用户确认
outputs:
  - 确认状态
  - proposal.md 状态更新
  - .status.yaml 更新
evidence:
  required: true
  path: stdd/changes/<change-id>/evidence/
constitution_articles:
  blocking: []
  warning: [5, 6]
  suggestion: []
graph:
  node_id: stdd.confirm
  parallelizable: false
  resumable: true
  checkpoint: per-change
---

# STDD Skill: /stdd:confirm

## Purpose
**人类确认门 (HITL)**，冻结需求范围后进入规格阶段。这是 Chaos Code 的关键 gate skill，确保需求明确、完整、可验证后再进入实施。

**核心设计原则：**
- **语言无关**：适用于任何技术栈和项目类型
- **HITL 强制**：必须人类确认，AI 不得跳过
- **需求冻结**：确认后锁定范围，防止范围蔓延
- **双向反馈**：否决时回到 propose/clarify

## When to Use
- 完成需求澄清后
- 准备进入规格阶段前
- 需要团队对需求达成共识时
- 需要正式冻结需求范围时

## Preconditions
- 已完成 clarify 阶段
- proposal.md 包含必需章节
- 所有关键问题已回答

## 必需章节

| 章节 | 描述 | 验证规则 |
|------|------|----------|
| `title` | 需求标题 | 非空 |
| `description` | 需求描述 | 非空，>50 字 |
| `scope` | 范围定义 | 非空 |
| `success_criteria` | 验收标准 | 非空，可验证 |

## 确认门验证

### 结构验证
- ✅ 所有必需章节存在
- ✅ 描述足够详细（>50 字）
- ✅ 验收标准可验证

### 质量警告
- ⚠️ 需求描述过短
- ⚠️ 缺少风险评估
- ⚠️ 缺少假设说明
- ⚠️ 验收标准模糊

### Constitution 条例
- **Warning 条例 5**: 需求模糊时警告
- **Warning 条例 6**: 边界条件未定义时警告

## CLI Runtime

```bash
# 确认当前活跃变更
chaos confirm

# 确认指定变更
chaos confirm <change-id>

# Dry run - 只显示验证结果
chaos confirm --dry-run

# 非交互模式（自动确认）
chaos confirm --yes
```

## 确认流程

### 1. 显示摘要
```
📋 Proposal Confirmation Gate
══════════════════════════════════════════════════

Title: Add User Login

Description:
Implement JWT-based authentication with email/password
login, password reset, and session management...

Scope:
- Login endpoint POST /auth/login
- Password reset endpoint POST /auth/reset
- JWT token generation and validation
...

Success Criteria:
- User can login with valid credentials
- Invalid credentials return appropriate error
- Password reset flow completes successfully
...
```

### 2. 验证检查
```
⚠ Warnings:
   • No risk assessment section
   • Edge cases not fully documented
```

### 3. 人类确认
```
? Do you confirm this proposal and proceed to specification? (y/N)
```

### 4a. 确认成功
```
✓ Proposal confirmed!

Next step: chaos spec add-user-login
```

### 4b. 确认失败
```
⚠ Confirmation cancelled. Return to proposal phase.

Next step: /stdd:propose to revise
```

## 状态更新

### proposal.md
```markdown
# Add User Login

...

status: confirmed
confirmed_at: 2026-05-19T14:30:22.000Z
```

### .status.yaml
```yaml
active_change: add-user-login
status: confirmed
confirmed_at: 2026-05-19T14:30:22.000Z
```

## HITL 强制要求

### 交互模式 (TTY)
- 必须显式用户确认
- AI 不得自动跳过

### 非交互模式 (CI/CD)
- 使用 `--yes` 标志
- 假设已在外部完成确认

### 自然语言编排
- **禁止**跳过确认门
- **禁止**自动确认 proposal
- **必须**尊重人类否决

## Graph Semantics
- 节点 ID 为 stdd.confirm，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-change；resumable=true；parallelizable=false。
- 依赖 clarify，确认后进入 spec。

## Evidence Contract
- 确认记录写入 `stdd/changes/<change-id>/evidence/confirmation-*.json`
- 包含确认时间、用户选择、验证结果

## Related Skills
- **stdd.propose** - 生成提案
- **stdd.clarify** - 澄清需求
- **stdd.spec** - 生成规格

## 参考资源

### 需求验证
- [Requirements Validation Techniques](https://www.seilevel.com/blog/requirements-validation-techniques/)
- [Acceptance Criteria Best Practices](https://www.agilealliance.org/resources/sessions/acceptance-criteria/)

### 门禁模式
- [Gatekeeping in Software Development](https://www.atlassian.com/agile/project-gatekeeping)
- [Quality Gates in CI/CD](https://www.sonarsource.com/resources/quality-gates/)

## 设计决策

### 为什么需要 HITL？
- **责任归属**：最终决策由人类负责
- **上下文理解**：AI 无法完全理解业务背景
- **团队共识**：促进团队讨论和共识

### 为什么冻结需求？
- **防止范围蔓延**：明确边界，避免无限扩展
- **可计划性**：固定的范围便于估算和规划
- **可验证性**：明确的验收标准

### 为什么允许否决？
- **迭代改进**：需求不是一次完美的
- **反馈循环**：从确认失败中学习
- **质量控制**：不完美的需求不应进入实施
