# STDD Copilot Ultra v2.0.0 — 工作流程

> **Spec + Test Driven Development · AI 全生命周期开发平台**
> 最后更新：2026-06-01 · 适用于 `@marcher-lam/stdd-copilot-ultra@2.0.0`

---

## 1. 从0到1新项目（Greenfield）

适用于全新项目，从零搭建。

```bash
stdd init                              # ① 初始化 STDD 工作区
stdd design create --preset modern     # ② 生成设计系统（前端项目）

# 在 AI 助手中（Claude Code / Cursor 等）：
# /stdd:new 创建变更

stdd new change add-user-auth          # ③ 创建变更
stdd propose draft add-user-auth       # ④ 需求提案
stdd clarify add-user-auth             # ⑤ 多轮需求澄清
stdd confirm add-user-auth             # ⑥ 人类确认门

stdd spec add-user-auth                # ⑦ 生成 BDD 规格
stdd plan add-user-auth                # ⑧ 任务拆解

stdd apply add-user-auth               # ⑨ TDD 循环实现
stdd verify add-user-auth              # ⑩ 5 维验证 + 宪法检查
stdd archive add-user-auth             # ⑪ 归档 + Delta Spec 合并
```

---

## 2. 接手已有项目（Brownfield）

适用于接手遗留项目或现有项目引入 STDD。

```bash
stdd explore                           # ① 深度项目探索（架构/技术栈/模式）
stdd explore src/ --deep               #    深度探索指定目录

stdd init                              # ② 初始化 STDD
stdd ff "修复登录模块 Bug"              # ③ 快速通道
stdd apply                             # ④ TDD 循环
stdd verify                            # ⑤ 验证
stdd archive                           # ⑥ 归档
```

---

## 3. 快速开发（需求明确）

适用于需求清晰、快速推进的场景。

```bash
stdd init                              # ① 初始化（仅首次）
stdd ff "添加深色模式支持"              # ② 一键：提案→规格→任务

stdd apply                             # ③ TDD 循环
stdd verify                            # ④ 验证
stdd archive                           # ⑤ 归档
```

或使用 AI 助手：

```
/stdd:ff 添加深色模式支持
/stdd:apply
/stdd:verify
/stdd:archive
```

---

## 4. 一键全流程（Turbo）

全自动执行所有阶段，仅在确认点和归档点暂停。

```bash
stdd turbo "用户注册功能"              # 全自动：propose→confirm→spec→plan→apply→verify→archive
stdd turbo "支付集成" --dry-run        # 预演模式
```

AI 助手方式：

```
/stdd:turbo 用户注册功能
```

---

## 5. Bug 修复

标准 TDD 修复流程：先写失败测试，再最小修复。

```bash
stdd issue "登录页面白屏崩溃"          # ① Bug 修复入口
stdd apply --phase red                 # ② 🔴 红灯：写失败测试
stdd apply --phase green               # ③ 🟢 绿灯：最小修复
stdd verify                            # ④ 验证无回归
stdd archive                           # ⑤ 归档
```

AI 助手方式：

```
/stdd:issue 登录页面白屏崩溃
/stdd:apply --phase red
/stdd:apply --phase green
/stdd:verify
/stdd:archive
```

---

## 6. UI 页面生成

多框架页面生成，基于 DESIGN.md Token 驱动。

```bash
stdd design create --preset modern     # ① 生成设计系统

stdd ui page dashboard --framework react --pageType dashboard
stdd ui page landing --framework vue --style scss
stdd ui page auth --framework angular --authVariant login
stdd ui page settings --framework svelte
stdd ui page pricing --framework react --style tailwind

stdd ui preview                        # 预览画廊
stdd ui test dashboard                 # 生成测试脚手架
```

---

## 7. UI 组件生成

生成带无障碍、响应式、Token 驱动的组件。

```bash
stdd ui component UserCard --type card --framework react
stdd ui component SearchModal --type modal --framework vue --style scss
stdd ui component DataTable --type table --framework react --style tailwind
stdd ui component LoginForm --type form --framework angular
stdd ui component NavBar --type nav --framework svelte
stdd ui component SubmitButton --type button --framework react --style tailwind

stdd ui component DataTable --state loading --state empty --state error
stdd ui preview DataTable              # 预览组件
stdd ui test DataTable                 # 生成测试
```

---

## 8. UI 脚手架

一键生成完整 UI 应用结构。

```bash
stdd ui scaffold --framework react --style tailwind
stdd ui scaffold --framework vue --style scss
stdd ui scaffold --framework angular --style css
stdd ui scaffold --framework svelte --style css

stdd ui preview                        # 预览画廊
stdd ui list                           # 列出所有已生成工件
```

---

## 9. 探索分析

深度分析项目架构、技术栈、代码模式。

```bash
stdd explore                           # ① 项目架构探索
stdd brainstorm "微服务架构迁移"        # ② 多策略头脑风暴
stdd brainstorm "性能优化" --method first-principles  # 指定方法
stdd brainstorm --list                 # 列出所有可用方法

stdd final-doc                         # ③ 生成最终分析报告
```

评估决策辅助：

```bash
stdd complexity analyze                # 代码复杂度分析
stdd certainty assess                  # 5 维度信心评分
stdd vision create                     # 项目愿景文档
```

---

## 10. 断点恢复

从中断的工作中恢复继续。

```bash
stdd progress                          # 查看进度日志
stdd progress --summary                # 进度摘要
stdd progress --resume                 # ① 从断点恢复
stdd continue                          # ② 继续执行
stdd recommend                         # ③ 推荐下一步操作
```

---

## 11. 质量治理

全面的质量保障和治理流程。

```bash
stdd hooks install --git               # ① 安装 hooks + Git pre-commit
stdd guard                             # ② TDD 守护检查
stdd constitution check                # ③ 宪法合规检查
stdd constitution show 2               # 查看 TDD 条例详情

stdd mutation --mode quick             # ④ 快速变异测试
stdd depcheck                          # ⑤ 依赖检查
stdd doctor --deep                     # ⑥ 深度健康检查
stdd metrics                           # ⑦ 质量指标仪表板
stdd dashboard generate                # ⑧ 生成项目仪表板
stdd dashboard open                    # 浏览器打开仪表板
```

---

## 12. Graph 工作流

基于 DAG 的工作流编排。

```bash
stdd graph visualize --format html     # ① DAG 可视化
stdd graph analyze --intent feature    # ② 分析结构

stdd graph run --intent feature        # ③ 功能开发工作流
stdd graph run --intent hotfix         #    热修复工作流
stdd graph run --intent repair         #    修复工作流
stdd graph run --intent research       #    探索分析工作流

stdd graph parallel --detect           # ④ 并行化检测
stdd graph history                     # ⑤ 执行历史
stdd graph replay <id>                 # ⑥ 历史回放
stdd graph recommend                   # ⑦ 智能推荐
```

---

## 13. 多 Agent 协作

利用 12 个 Agent 角色进行多视角分析和协作。

```bash
stdd roles list                        # ① 列出所有角色
stdd roles party "添加支付功能" --roles po,architect,security,tester

stdd supervisor start --roles "architect,qa,security" --rounds 3
stdd supervisor status
stdd supervisor review
stdd supervisor stop

stdd runtime agent start "讨论认证方案" --rounds 5
stdd runtime agent next
stdd runtime agent record "architect|建议使用 JWT"
stdd runtime agent stop
```

---

## 14. 文档生成

从项目文档生成可部署的静态文档站点。

```bash
stdd docs generate                     # 生成文档站点（Astro/Starlight 风格）
stdd docs generate --lang zh           # 中文文档
stdd docs generate --lang en           # 英文文档
stdd docs sources                      # 列出文档源文件
stdd docs open                         # 浏览器打开文档站点
```

最终文档聚合：

```bash
stdd final-doc                         # 聚合所有阶段产物为 FINAL_REQUIREMENT.md
stdd final-doc --include-evidence      # 包含执行证据
stdd product-proposal                  # 生成 15 章产品方案报告
```

---

## 15. 项目仪表板

生成项目健康度静态 HTML 仪表板。

```bash
stdd dashboard generate                # 生成仪表板
stdd dashboard open                    # 浏览器打开仪表板

stdd metrics                           # 质量指标
stdd metrics --export                  # 导出指标报告
stdd doctor --deep                     # 深度健康检查
```

---

## 文档导航

- [命令速查](commands.md) — CLI 命令与斜杠命令完整清单
- [核心概念](concepts.md) — STDD 核心理念深入解读
- [命令参考](command-reference.md) — 86 个命令完整详解
- [CLI 使用指南](cli-guide.md) — CLI 命令行完整手册
- [快速开始](getting-started.md) — 5 分钟上手指南
- [能力边界](capabilities.md) — 工具能力与 AI 职责边界
- [Agent 协议](agent-protocol.md) — Agent 行为协议规范
- [项目首页](../README.md) — 项目概览
- [使用手册](../USAGE.md) — 完整使用指南
- [英文文档](en/README.md) — English docs index
