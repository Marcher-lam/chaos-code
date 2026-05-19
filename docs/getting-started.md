# Getting Started

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
stdd doctor
stdd doctor --deep
stdd apply <name> --allow-no-tests

## Docker 快速启动

docker run --rm -v "$PWD:/workspace" marcher-lam/stdd-copilot:latest --help

## 文档导航
- [项目首页](../README.md) - 项目概览和顶层示例
- [使用手册](../USAGE.md) - 完整使用指南
- [CLI 使用指南](cli-guide.md) - CLI 完整文档
- [工作流程](workflows.md) - 常见模式和使用场景
- [命令参考](commands.md) - 统一会话入口参考
- [核心概念](concepts.md) - 深入理解 specs、changes 和 schemas
- [英文文档入口](en/README.md) - English docs index
