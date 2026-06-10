---
id: stdd.archive
command: /stdd:archive
description: 归档完成变更并合并 delta specs 到主规格（语言无关）
version: "3.0"
category: lifecycle
phase: archive
read_only: false
risk_level: high
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.verify]
next: [stdd.commit]
on_failure: []
inputs:
  - verify 报告
  - delta specs
  - evidence
  - 用户归档确认
outputs:
  - stdd/specs/ 更新
  - stdd/changes/archive/YYYY-MM-DD-<change-id>/
  - summary.md
  - spec-merge-report.json
evidence:
  required: true
  path: stdd/changes/<change-id>/evidence/
constitution_articles:
  blocking: [2, 7, 9]
  warning: []
  suggestion: []
graph:
  node_id: stdd.archive
  parallelizable: false
  resumable: true
  checkpoint: per-change
---

# STDD Skill: /stdd:archive

## Purpose
归档完成变更并合并 **delta specs 到主规格**。这是 Chaos Code 的 Spec-First + TDD CLI skill，服务 Skill Graph 编排、Constitution gate、evidence 留痕和 workspace 作用域。

**核心设计原则：**
- **语言无关**：适用于任何编程语言和框架
- **Delta 合并**：ADDED/MODIFIED/REMOVED 规格自动合并到主规格
- **完整归档**：保留所有证据、规格和元数据
- **可追溯**：时间戳命名和完整的 audit trail

## When to Use
- 需要执行 /stdd:archive 对应能力时。
- greenfield 项目用于建立或推进规范化工作流。
- brownfield 项目先读取现有代码、测试、README 和约定后再行动。
- monorepo 中使用 --workspace <path-or-package> 限定作用域。

## Preconditions
- 已在仓库根或目标 workspace 中运行 chaos init；只读技能例外但仍应识别项目状态。
- 明确 <change-id>、scope 或 topic；未明确时先询问或运行 chaos status / chaos recommend。
- 不得伪造 evidence；缺失测试、mutation 或 Constitution 结果必须显式标记。
- 所有任务必须完成（tasks.md 中全部标记为 `[x]`）。

## Inputs
- verify 报告
- delta specs
- evidence
- 用户归档确认

## Workflow

### 1. 前置检查
- 验证所有任务已完成（`[x]` 标记）
- 如有未完成任务，提示完成或运行 `chaos verify`

### 2. Delta Specs 合并

从 `stdd/changes/<change-id>/specs/` 合并到 `stdd/specs/`：

```markdown
## ADDED
# 新增规格内容

## MODIFIED
# 修改的规格内容

## REMOVED
# 移除的规格内容
```

合并策略：
- **ADDED**: 用 `<!-- STDD:ADDED:start -->` 标记包裹
- **MODIFIED**: 用 `<!-- STDD:MODIFIED:start -->` 标记包裹
- **REMOVED**: 用 `<!-- STDD:REMOVED:start -->` 标记包裹

### 3. 生成归档摘要

生成 `summary.md` 包含：
- 归档时间戳
- Proposal 标题
- 任务完成统计
- Spec 文件列表
- Verification 状态
- Constitution 结果
- Workspace 信息

### 4. 移动到归档目录

```
stdd/changes/<change-id>/
  → stdd/changes/archive/<change-id>-<timestamp>/
```

时间戳格式：`YYYYMMDDHHMMSS`（如 `20260519143022`）

### 5. 清理临时目录

删除 `stdd/specs/<change-id>/` 临时规格目录（如果存在）

## CLI Runtime

```bash
# 归档指定变更
chaos archive <change-id>

# 归档当前活跃变更
chaos archive

# 强制归档（跳过某些检查）
chaos archive <change-id> --force
```

## Outputs

### 归档结构
```
stdd/
├── specs/                           # 主规格目录（已合并 delta）
│   ├── user-management.feature
│   └── auth.feature
└── changes/
    └── archive/
        └── add-user-login-20260519143022/
            ├── proposal.md
            ├── design.md
            ├── tasks.md
            ├── specs/              # Delta specs（原始）
            ├── evidence/
            │   ├── verify-*.json
            │   ├── guard-*.json
            │   └── delegation-*.json
            ├── summary.md          # 归档摘要
            ├── spec-merge-report.json
            └── apply.log
```

### summary.md 示例
```markdown
# Archive Summary: Add User Login

- **Archived at**: 2026-05-19T14:30:22.000Z
- **Status**: Verification Passed
- **Proposal**: Add User Login

## Tasks
- 5/5 completed (100%)

## Specs
- `specs/user-login.feature`
- `specs/api-spec.yaml`

## Verification Evidence
- Constitution Status: PASS (Score: 95%)
- Test Runner: Jest

## Workspaces
- Involved: `packages/api`, `packages/web`
- Test Results:
  - packages/api: PASS
  - packages/web: PASS
```

## Graph Semantics
- 节点 ID 为 stdd.archive，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-change；resumable=true；parallelizable=false。
- Graph 必须尊重 depends_on/next，不得越过 confirm、verify、archive 等 gate。

## Constitution Gates
- Blocking 条例失败时停止并返回修复建议。
- Warning 条例必须在报告中列出，可由用户决定是否继续。
- Suggestion 条例用于改进可维护性和文档质量，不应伪装成已完成工作。

## Evidence Contract
- 默认证据路径：stdd/changes/<change-id>/evidence/
- 变更级 evidence 使用 stdd/changes/<change-id>/evidence/；全局 guard/audit 使用 stdd/evidence/。
- 证据文件应包含 command、timestamp、workspace、input summary、result、exit code 和关键 stdout/stderr 摘要。

## Error Handling
- 缺少 STDD 初始化时提示 chaos init。
- 缺少 change-id 时列出 chaos list / chaos status 的下一步。
- 任务未完成时列出待完成任务并退出。
- workspace 不存在时提示 chaos workspace validate / repair。

## Archive 最佳实践

基于业界归档最佳实践：

### 1. 3-2-1 原则
- **3 份副本**：原始 + 归档 + 远程备份
- **2 种介质**：本地磁盘 + 版本控制
- **1 份异地**：Git remote 或云存储

### 2. 完整性保护
- 时间戳命名防止覆盖
- 保留所有原始文件
- 维护完整的 audit trail

### 3. 可检索性
- 结构化的 summary.md
- 元数据标记（workspace, language, framework）
- Spec merge report 追踪变更

### 4. 保留策略
- **活跃项目**：保留所有归档
- **维护期项目**：按季度归档旧变更
- **归档项目**：压缩或移至冷存储

## Related Skills
- **stdd.commit** - Git commit 归档的变更
- **stdd.verify** - 归档前验证
- **stdd.final-doc** - 生成最终文档

## 参考资源

### 归档最佳实践
- [How to Archive a Completed Project: A Guide for PMOs](https://www.pmmajik.com/how-to-archive-a-completed-project-a-guide-for-pmos/)
- [Document Lifecycle with Version Control](https://clickhelp.com/clickhelp-technical-writing-blog/document-lifecycle-with-version-control-from-creation-to-archiving/)
- [Best Practice for Archiving Completed Projects](https://granicus.com/blog/best-practice-for-archiving-completed-projects/)

### Git 分支归档
- [Git Workflows: Archiving Old Branches](https://www.aaronwest.net/blog/git-workflows-archiving-old-branches/)
- [Feature Branch Workflow](https://www.atlassian.com/git/tutorials/comparing-workflows/feature-branch-workflow)
- [Delete Git Branches: Clean-Up Strategies](https://pullpanda.io/blog/deleting-feature-branches-cleanup-strategies)

## 设计决策

### 为什么合并 Delta Specs？
- **单一真实来源**：主规格反映当前系统状态
- **变更追踪**：Delta 标记（ADDED/MODIFIED/REMOVED）保留历史
- **文档进化**：规格随代码演变

### 为什么时间戳命名？
- **防止冲突**：同名变更多次归档
- **时间排序**：按时间顺序浏览归档
- **唯一标识**：精确定位特定归档版本

### 为什么保留所有原始文件？
- **审计需求**：合规性和问题调查
- **知识复用**：未来类似变更参考
- **完整性**：不丢失任何上下文
