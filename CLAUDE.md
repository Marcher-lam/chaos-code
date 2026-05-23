# STDD Copilot - AI Agent 入口规则

> Version: 1.4 | Last Updated: 2026-05-24

## 概览

STDD Copilot 包含 80 个 /stdd:* 会话入口。

## 质量基线（2026-05-24）

| 指标 | 数值 |
|------|------|
| 测试套件 | 171 |
| 测试用例 | 3845 |
| 通过率 | 100% |
| 语句覆盖 | 97.33% |
| 分支覆盖 | 91.03% |
| 函数覆盖 | 97.15% |
| 行覆盖 | 97.87% |
| 命令文件 | 80 |
| Skill 模板 | 47 |
| Command 模板 | 80 |

## 入口 taxonomy（防漂移约定）

- 80 个 Command 模板文件 (`src/templates/commands/{name}.md`)
- 47 个 Skill 模板目录 (`src/templates/skills/stdd/{name}/SKILL.md`)
- command-file-backed 入口（80）：`/stdd:api-spec`, `/stdd:apply`, `/stdd:archive`, `/stdd:audit`, `/stdd:baby-steps`, `/stdd:brainstorm`, `/stdd:browser`, `/stdd:certainty`, `/stdd:ci`, `/stdd:ci-generator`, `/stdd:clarify`, `/stdd:complexity`, `/stdd:commands`, `/stdd:commit`, `/stdd:commit-msg`, `/stdd:commit-tdd`, `/stdd:confirm`, `/stdd:constitution`, `/stdd:context`, `/stdd:continue`, `/stdd:contract`, `/stdd:depcheck`, `/stdd:design`, `/stdd:doctor`, `/stdd:elicitation`, `/stdd:execute`, `/stdd:explore`, `/stdd:extensions`, `/stdd:factory`, `/stdd:ff`, `/stdd:final-doc`, `/stdd:fix-packet`, `/stdd:graph`, `/stdd:graph-history`, `/stdd:graph-run`, `/stdd:guard`, `/stdd:help`, `/stdd:hooks`, `/stdd:init`, `/stdd:issue`, `/stdd:iterate`, `/stdd:learn`, `/stdd:list`, `/stdd:memory`, `/stdd:memory-scan`, `/stdd:metrics`, `/stdd:mock`, `/stdd:mock-gen`, `/stdd:mutation`, `/stdd:new`, `/stdd:outside-in`, `/stdd:parallel`, `/stdd:pipeline`, `/stdd:plan`, `/stdd:prp`, `/stdd:product-proposal`, `/stdd:progress`, `/stdd:propose`, `/stdd:recommend`, `/stdd:roles`, `/stdd:runtime`, `/stdd:schema`, `/stdd:skills`, `/stdd:spec`, `/stdd:spec-generator`, `/stdd:start`, `/stdd:starters`, `/stdd:status`, `/stdd:story`, `/stdd:sudo`, `/stdd:supervisor`, `/stdd:tdd-init`, `/stdd:turbo`, `/stdd:update`, `/stdd:user-test`, `/stdd:validate`, `/stdd:verify`, `/stdd:vision`, `/stdd:waiver-manager`, `/stdd:workspace`
- skill-driven 入口（47）：`/stdd:api-spec`, `/stdd:apply`, `/stdd:archive`, `/stdd:brainstorm`, `/stdd:certainty`, `/stdd:clarify`, `/stdd:commit`, `/stdd:complexity`, `/stdd:confirm`, `/stdd:constitution`, `/stdd:context`, `/stdd:continue`, `/stdd:contract`, `/stdd:design`, `/stdd:execute`, `/stdd:explore`, `/stdd:factory`, `/stdd:ff`, `/stdd:final-doc`, `/stdd:fix-packet`, `/stdd:graph`, `/stdd:guard`, `/stdd:help`, `/stdd:init`, `/stdd:issue`, `/stdd:iterate`, `/stdd:learn`, `/stdd:memory`, `/stdd:metrics`, `/stdd:mock`, `/stdd:mutation`, `/stdd:new`, `/stdd:outside-in`, `/stdd:parallel`, `/stdd:plan`, `/stdd:product-proposal`, `/stdd:propose`, `/stdd:prp`, `/stdd:roles`, `/stdd:schema`, `/stdd:spec`, `/stdd:supervisor`, `/stdd:turbo`, `/stdd:user-test`, `/stdd:validate`, `/stdd:verify`, `/stdd:vision`

# currentDate
Today's date is 2026/05/19.
