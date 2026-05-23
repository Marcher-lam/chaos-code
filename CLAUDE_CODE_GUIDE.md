# STDD Copilot - Claude Code Guide

> 本指南描述 STDD Copilot 在 Claude Code 环境下的实现细节。

## 文件结构约定

- 命令模板位于 `src/templates/commands/{指令名称}.md`，初始化后写入 `.claude/commands/stdd/{指令名称}.md`
- Skill 模板位于 `src/templates/skills/stdd/{指令名称}/SKILL.md`，初始化后写入 `.claude/skills/stdd/{指令名称}/SKILL.md`

## 核心工作流

核心入口包括 `init`、`new`、`ff`、`continue`、`explore`、`graph` 以及 `apply`、`verify`、`archive` 等。

注意：不要假定 command 模板与 Skill 模板一一对应；当前入口由 80 个 command 模板和 47 个 Skill 模板共同组成，去重后提供 80 个 `/stdd:*` 会话入口。

## Agent 自主编排

STDD Copilot 2.0 支持 Agent 自主编排工作流。Agent 应主动读取 Skill Graph（`stdd/graph/skills.yaml`），根据当前变更状态自动推进工作流，仅在关键确认点（Confirm Gate）暂停等待用户输入。用户无需记住全部 80 个斜杠命令。

## 质量基线（2026-05-24）

- 测试: 171 套件 / 3845 用例 / 100% 通过率
- 覆盖率: Stmts 97.33% | Branch 91.03% | Funcs 97.15% | Lines 97.87%
- 质量门禁: `npm run premerge` 覆盖审计、lint、文档契约和 Jest 回归测试
- CI/CD: 矩阵测试 Node.js 20/22
- 核心模块: logger, security, command-registry, command-loader, types, file-walker, evidence-capture, error-propagator, session-progress
- npm 脚本: test, test:all, test:coverage, test:benchmark, audit, premerge
