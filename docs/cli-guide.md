# STDD Copilot Ultra CLI 使用指南

## CLI 命令速查
stdd init
stdd init /path/to/project
stdd init --force
stdd list
stdd list --specs
stdd list --archived
stdd list --json
stdd status
stdd status add-dark-mode
stdd new change add-dark-mode
stdd skills
stdd commands
stdd fix-packet add-dark-mode
stdd outside-in init
stdd outside-in scaffold add-dark-mode
stdd constitution
stdd constitution show 2
stdd constitution check
stdd hooks install
stdd hooks verify
stdd hooks status
stdd hooks disable
stdd hooks enable
stdd progress
stdd progress --summary
stdd progress --resume
stdd progress --json
stdd progress --clear
stdd product-proposal
stdd product-proposal --json
stdd product-proposal --output my-report.md
stdd doctor
stdd doctor --deep
stdd apply <name> --allow-no-tests

## TDD 增强命令
- `stdd fix-packet [change]` — Golden Packet 风格失败修复上下文
- `stdd outside-in init/scaffold/status` — 外向内 TDD 分层测试骨架

## 文档导航
- [项目首页](../README.md) - 项目概览和顶层示例
- [使用手册](../USAGE.md) - 完整使用指南
- [快速开始](getting-started.md) - 首次使用流程和 CLI 速查
- [工作流程](workflows.md) - 常见模式和使用场景
- [命令参考](commands.md) - 完整命令参考
- [英文文档入口](en/README.md) - English docs index
