---
id: stdd.roles
command: /stdd:roles
description: 启用 12 Agent 角色、Party Mode 和对抗式审查（语言无关）
version: "3.0"
category: collaboration
phase: collaboration
read_only: true
risk_level: low
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: []
next: []
on_failure: []
inputs:
  - role/topic/path
  - 参与角色
  - 输出格式
outputs:
  - role output
  - party brief
  - adversarial findings
evidence:
  required: false
  path: stdd/evidence/
constitution_articles:
  blocking: []
  warning: [7]
  suggestion: []
graph:
  node_id: stdd.roles
  parallelizable: true
  resumable: true
  checkpoint: per-run
---

# STDD Skill: /stdd:roles

## Purpose
**启用 12 Agent 角色、Party Mode 和对抗式审查**。这是 Chaos Code 的协作 skill，提供多角色视角进行代码审查和讨论。

**核心设计原则：**
- **语言无关**：适用于任何编程语言
- **多角色**：12 种专业角色
- **Party Mode**：多角色辩论
- **对抗式**：风险优先审查

## When to Use
- 需要多视角审查时
- 需要团队讨论时
- 需要安全审查时
- 需要质量审查时

## 12 角色

### 产品角色
- **PO (Product Owner)**: 产品负责人视角
- **BA (Business Analyst)**: 业务分析师视角

### 开发角色
- **Developer**: 开发者视角
- **Architect**: 架构师视角

### 质量角色
- **Tester**: 测试工程师视角
- **QA Lead**: QA 负责人视角

### 专项角色
- **Security**: 安全专家视角
- **DevOps**: 运维专家视角
- **UX**: 用户体验设计师视角
- **Tech Writer**: 技术文档作者视角
- **Data Analyst**: 数据分析师视角

## CLI Runtime

```bash
# 列出角色
chaos roles list

# Party Mode（多角色辩论）
chaos roles party "添加用户登录功能" --roles po,architect,security,tester

# 单角色视角
chaos roles architect <topic>
chaos roles security <path>

# 对抗式审查
chaos roles adversarial src/auth
chaos roles adversarial <change-id>

# JSON 输出
chaos roles party <topic> --json
```

## Party Mode

### 多角色辩论
```
主题: 添加用户登录功能

┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│     PO      │  │  Architect  │  │   Security  │
│ 产品负责人   │  │   架构师    │  │   安全专家   │
└─────────────┘  └─────────────┘  └─────────────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
                   ┌────▼────┐
                   │  Brief  │
                   │  总结   │
                   └─────────┘
```

### 输出格式
```markdown
# Party Brief: <topic>

## Participants
- PO: 产品负责人观点
- Architect: 架构师观点
- Security: 安全专家观点

## Discussion
### PO 观点
- 用户价值: ...
- 优先级: ...

### Architect 观点
- 技术方案: ...
- 架构影响: ...

### Security 观点
- 安全风险: ...
- 建议措施: ...

## Consensus
- 达成共识点
- 待讨论问题
- 后续行动
```

## 对抗式审查

### 风险优先扫描
```bash
chaos roles adversarial <path>
```

### 扫描维度
| 维度 | 检查项 |
|------|--------|
| 安全 | SQL 注入、XSS、认证 |
| 性能 | N+1 查询、内存泄漏 |
| 可靠性 | 错误处理、边界条件 |
| 可维护性 | 代码重复、复杂度 |
| 合规 | 数据保护、隐私 |

### 输出格式
```json
{
  "path": "src/auth",
  "timestamp": "2025-05-19T10:30:00Z",
  "findings": [
    {
      "severity": "high",
      "category": "security",
      "issue": "SQL injection vulnerability",
      "location": "src/auth/service.ts:45",
      "recommendation": "Use parameterized queries"
    }
  ]
}
```

## Graph Semantics
- 节点 ID 为 stdd.roles，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-run；resumable=true；parallelizable=true。

## Constitution Gates
- **Warning 条例 7 (Security)**: 安全角色应检查安全问题

## Evidence Contract
- Party brief 写入 `stdd/evidence/party-*.md`
- 审查发现写入 `stdd/evidence/adversarial-*.json`

## Related Skills
- **stdd.guard** - 质量门禁
- **stdd.verify** - 综合验证

## 参考资源

### 角色定义
- [Scrum Roles](https://www.scrum.org/resources/scrum-guide)
- [Role-Based Access Control](https://en.wikipedia.org/wiki/Role-based_access_control)

### 代码审查
- [Google Code Review](https://google.github.io/eng-practices/review/)

## 设计决策

### Why 12 角色？
- **全面**: 覆盖项目各维度
- **专业**: 每个角色专业视角
- **灵活**: 选择需要的角色

### Why Party Mode？
- **辩论**: 多视角碰撞
- **共识**: 寻找共同点
- **高效**: 一次性收集多方意见

### Why 对抗式？
- **风险**: 优先发现风险
- **质量**: 提高代码质量
- **学习**: 团队学习机会
