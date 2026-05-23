# STDD Copilot 边际优化追踪

> Last Updated: 2026-05-24 | Round 30+ 完成

## 当前质量基线

```
Test Suites: 171 passed
Tests:       3845 passed (100%)
Coverage:    97.33% Stmts | 91.03% Branch | 97.15% Funcs | 97.87% Lines
```

## 28 轮优化累计改动

| 类别 | 数量 |
|------|------|
| 新增测试用例 | +1310 (2535→3845) |
| 新增测试套件 | +43 (128→171) |
| 空 catch 块修复 | 52 |
| process.exit → exitCode | 14 |
| TODO → 数据驱动实现 | 6 |
| console.error → logger 迁移 | 92 |
| 未使用导出清理 | 13 |
| var → const/let | 9 |
| 结构化 logger 基础设施 | 1 (src/utils/logger.js) |
| Jest 覆盖率阈值更新 | 7 个模块 |

## 剩余边际优化项（按收益/成本排序）

### P2 — 分支覆盖 < 85% 的模块（12 个）

| 模块 | Branch% | 难度 | 预估时间 |
|------|---------|------|----------|
| cli.js | 81.60% | 高 | 1h |
| commit-msg.js | 85.71% | 低 | 15min |
| ff.js | 85.71% | 低 | 15min |
| coverage-parser.js | 85.91% | 低 | 15min |
| doctor.js | 85.39% | 中 | 30min |
| browser-controller.js | 86.66% | 中 | 30min |
| browser-doctor.js | 86.66% | 高 | 1h |
| explore.js | 86.41% | 中 | 30min |
| bdd-scenario-parser.js | 87.50% | 中 | 30min |
| elicitation-engine.js | 87.50% | 中 | 30min |
| contract.js | 87.05% | 中 | 30min |
| constitution-status.js | 88.13% | 低 | 15min |

### P2 — 分支覆盖 85-90% 的模块（27 个，可批量改善）

apply.js (88.59%), audit.js (88.28%), constitution-checker.js (88.25%),
constitution-fix.js (88.23%), context.js (88.34%), evidence-capture.js (87.87%),
graph-history.js (88.88%), graph.js (89.85% → 已近90%), guard.js (89.66%),
hooks.js (89.61%), init.js (89.80%), learn.js (87.5%), memory-scan.js (87.3%),
metrics.js (88.46%), mock-gen.js (87.5%), mutation.js (88.57%),
outside-in.js (89.13%), parallel-executor.js (87.5%), product-proposal.js (89.75%),
progress.js (89.29%), recommend.js (87.5%), roles.js (87.5%), schema.js (87.5%),
shell-executor.js (88.03%), skills.js (87.5%), spec-generator.js (88.46%),
starters.js (87.5%), status.js (87.5%), story.js (88.57%),
tdd-init.js (87.5%), update.js (89.53%), user-test.js (87.5%),
validate.js (87.5%), workspace-scope.js (88.6%)

### P3 — 代码质量打磨

| 项目 | 说明 | 预估时间 |
|------|------|----------|
| JSDoc | 54/58 个命令文件缺少公共 API 文档 | 2h（文档债务） |

## 各模块覆盖率详情（按分支覆盖排序）

### 100% 全覆盖的模块
command-runner.js, command-registry.js, dynamic-router.js, file-walker.js,
heterogeneous-adapter.js, index.js (commands), normalizer.js, path-resolver.js,
reporter-injector.js, security.js, sudolang-executor.js, tech-stack-detector.js,
test-command-resolver.js, baby-steps.js, commands.js, pipeline.js, new.js,
workspace.js, list.js, executor-interface.js, noop-executor.js, agents/index.js

### >90% 分支覆盖的模块
workspace-detector.js (94.68%), logger.js (95.83%), fix-packet.js (92.1),
session-progress.js (94.23%), graph-cache.js (93.33%), change-utils.js (93.18),
hooks.js (~90%), continue.js (~93%), graph-history.js (~85%+),
constitution-fix.js (~91%+), error-propagator.js (96.96%),
mutation/normalizer.js (98.11%), verify.js (92.03%), waiver-manager.js (90.32%)

### 85-90% 分支覆盖的模块
learn.js (87.5%), memory-scan.js (96.2%), metrics.js (81.92%), mock-gen.js (91.66%),
mutation.js (90.14%), recommend.js (88.8%), roles.js (88), schema.js (87.15%),
skills.js (84.21%), spec-generator.js (84.44%), start.js (90), starters.js (94.11%),
status.js (83.78%), story.js (94.11%), tdd-init.js (83.58%), turbo.js (100),
update.js (82.14%), user-test.js (88.88%), validate.js (88.88%),
shell-executor.js (82.92%), coverage-parser.js (85.91%), evidence-capture.js (86.36%),
file-walker.js (90.9%), parallel-executor.js (85.71%), parse-command.js (89.65%),
security.js (90.9%), workspace-scope.js (88.6%), bdd-scenario-parser.js (87.5%),
sudolang-parser.js (92.1%), elicitation-engine.js (87.5%)

## 已验证结论（不需要再做的项）

1. **console.log 迁移** — 28 个命令文件全部审计，确认只有用户可见的 CLI 输出，无需迁移到 logger
2. **JSON.parse 安全** — 15 处 JSON.parse 全部审计，13 处有 try/catch，2 处有上层 parseCoverage() 保护
3. **var 声明** — 全部清理完毕，0 个残留
4. **空 catch 块** — 仅剩合理保留项（JSON.parse fallback、signal handling）
5. **Registry 对齐** — 50 registry + 7 inline = 57 命令文件，全部对齐
6. **Skill 模板** — 47 个全部有效，无损坏引用
7. **Math.random** — 仅 1 处使用（随机选择方法），无安全风险
8. **cli.js 入口测试** — 33 个测试用例，覆盖 safeAction、createSpinner、program setup、constitution routing

## 继续优化的建议入口

```bash
# 1. 快速修复（< 30min 每项）
# commit-msg.js: 85.71% → 90%+
# coverage-parser.js: 85.91% → 90%+
# ff.js: 85.71% → 90%+
# constitution-status.js: 88.13% → 90%+

# 2. 中等难度（~30min 每项）
# explore.js: 86.41% → 90%+
# doctor.js: 85.39% → 90%+
# bdd-scenario-parser.js: 87.50% → 90%+

# 3. 高难度（需要特殊环境或大量分支）
# cli.js: 81.60% → 85%+（入口文件，私有分支多）
# browser-doctor.js: 86.66%（需 browser env mock）
```

## 预估完成时间

| 场景 | 预估 |
|------|------|
| 完成 P2 低难度项（分支覆盖全部 > 87%） | 1-2 小时 |
| 完成 P2 全部项（分支覆盖全部 > 90%） | 3-4 小时 |
| 完成 P2+P3 项（含 JSDoc） | 6-7 小时 |
| 全部边际项清零 | 8+ 小时（收益递减） |

当前状态已可交付。90%+ 分支覆盖里程碑已达成。
