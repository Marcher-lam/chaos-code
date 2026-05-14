# Commands Reference

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
stdd new spec auth
stdd skills
stdd skills --phase 4
stdd commands
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
stdd new change add-dark-mode
stdd new spec auth

## 斜杠命令清单
/stdd:init /stdd:new /stdd:propose /stdd:clarify /stdd:confirm /stdd:spec /stdd:plan /stdd:apply /stdd:execute /stdd:verify /stdd:archive /stdd:final-doc /stdd:brainstorm /stdd:issue /stdd:constitution /stdd:ff /stdd:continue /stdd:explore /stdd:graph /stdd:turbo /stdd:api-spec /stdd:certainty /stdd:commit /stdd:complexity /stdd:context /stdd:contract /stdd:design /stdd:factory /stdd:guard /stdd:help /stdd:iterate /stdd:learn /stdd:memory /stdd:metrics /stdd:mock /stdd:mutation /stdd:outside-in /stdd:parallel /stdd:prp /stdd:roles /stdd:schema /stdd:supervisor /stdd:user-test /stdd:validate /stdd:vision

## Graph Runtime 补强

- feature intent: `stdd-propose → stdd-spec → stdd-plan → stdd-outside-in → stdd-apply → stdd-verify`
- repair intent: `stdd-fix-packet → stdd-apply → stdd-verify`
- `stdd fix-packet [change]` 生成 Golden Packet 风格失败修复上下文；`stdd apply` 测试失败时自动生成。
- `stdd outside-in init/scaffold/status` 生成外向内 TDD registry 与分层测试骨架。

## 文档导航
- [项目首页](../README.md) - 项目概览和顶层示例
- [使用手册](../USAGE.md) - 完整使用指南
- [快速开始](getting-started.md) - 首次使用流程和 CLI 速查
- [CLI 使用指南](cli-guide.md) - CLI 完整文档
- [工作流程](workflows.md) - 常见工作流程
- [核心概念](concepts.md) - 深入理解 specs、changes 和 schemas
- [命令参考](commands.md) - 统一会话入口参考
- [英文文档入口](en/README.md) - English docs index
