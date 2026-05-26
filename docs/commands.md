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
stdd skills
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

## 斜杠命令清单
/stdd:api-spec /stdd:apply /stdd:archive /stdd:audit /stdd:baby-steps /stdd:brainstorm /stdd:browser /stdd:builder /stdd:certainty /stdd:ci /stdd:ci-generator /stdd:clarify /stdd:commands /stdd:commit /stdd:commit-msg /stdd:commit-tdd /stdd:complexity /stdd:confirm /stdd:constitution /stdd:context /stdd:continue /stdd:contract /stdd:dashboard /stdd:depcheck /stdd:design /stdd:docs /stdd:doctor /stdd:elicitation /stdd:execute /stdd:explore /stdd:extensions /stdd:factory /stdd:ff /stdd:final-doc /stdd:fix-packet /stdd:graph /stdd:graph-history /stdd:graph-run /stdd:guard /stdd:help /stdd:hooks /stdd:init /stdd:issue /stdd:iterate /stdd:learn /stdd:list /stdd:memory /stdd:memory-scan /stdd:metrics /stdd:mock /stdd:mock-gen /stdd:modules /stdd:mutation /stdd:new /stdd:outside-in /stdd:parallel /stdd:pipeline /stdd:plan /stdd:prp /stdd:product-proposal /stdd:profile /stdd:progress /stdd:propose /stdd:recommend /stdd:roles /stdd:runtime /stdd:schema /stdd:skills /stdd:spec /stdd:spec-generator /stdd:start /stdd:starters /stdd:status /stdd:story /stdd:sudo /stdd:supervisor /stdd:tdd-init /stdd:turbo /stdd:ui /stdd:update /stdd:user-test /stdd:validate /stdd:verify /stdd:vision /stdd:waiver-manager /stdd:workspace

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
