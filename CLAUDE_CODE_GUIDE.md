# STDD Copilot - Claude Code Guide

> 本指南描述 STDD Copilot 在 Claude Code 环境下的实现细节。

## 文件结构约定

- 命令模板位于 `src/templates/commands/{指令名称}.md`，初始化后写入 `.claude/commands/stdd/{指令名称}.md`
- Skill 模板位于 `src/templates/skills/stdd/{指令名称}/SKILL.md`，初始化后写入 `.claude/skills/stdd/{指令名称}/SKILL.md`

## 核心工作流

核心入口包括 `init`、`new`、`ff`、`continue`、`explore`、`graph` 以及 `apply`、`verify`、`archive` 等。

注意：不要假定 command 模板与 Skill 模板一一对应；当前入口由 20 个 command 模板和 47 个 Skill 模板共同组成，去重后提供 47 个 `/stdd:*` 会话入口。

## Agent 自主编排

STDD Copilot 2.0 支持 Agent 自主编排工作流。Agent 应主动读取 Skill Graph（`stdd/graph/skills.yaml`），根据当前变更状态自动推进工作流，仅在关键确认点（Confirm Gate）暂停等待用户输入。用户无需记住全部 65+ 个命令。

## 最近更新 (2026-05-14)

- 测试基线: `npm run premerge` 质量门禁统一覆盖审计、lint、文档与 Jest 回归测试
- 当前全部测试套件通过，零 warning ESLint
- CI/CD: 矩阵测试 Node.js 18/20/22, 覆盖率收集
- 新增模块: error-handler, logger, security, command-registry, command-loader, types
- 新增文件: Dockerfile, docker-compose.yml, CHANGELOG.md, docs/EvoRL.md
- npm 脚本: test:all, test:coverage, test:benchmark, audit, premerge
