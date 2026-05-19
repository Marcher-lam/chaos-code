# 贡献指南

感谢你对 STDD Copilot 的关注！欢迎提交 Issue 和 Pull Request。

## 开发环境设置

```bash
# 克隆仓库
git clone https://github.com/Marcher-lam/STDD-COPILOT.git
cd STDD-COPILOT

# 安装依赖
npm install

# 链接全局 CLI (可选)
npm link
```

## 常用 npm 脚本

| 命令 | 说明 |
|------|------|
| `npm test` | 运行全部测试 (171 套件, 3810 测试) |
| `npm run test:all` | 完整测试套件 (含集成测试) |
| `npm run test:coverage` | 生成覆盖率报告 (text/lcov/html) |
| `npm run test:benchmark` | 运行性能基准套件 |
| `npm run audit` | npm 安全审计 |
| `npm run premerge` | 合并前全检 (audit + lint + docs + coverage + Jest) |

## 测试与质量门禁

- **测试基线**: 171 个测试套件、3810 个测试，100% 通过率
- **覆盖率**: Stmts 97.33% | Branch 91.03% | Funcs 97.15% | Lines 97.87%
- **Lint**: 零警告 ESLint（`npm run lint`），纳入 `premerge` 门禁
- **安全**: `npm audit` 零漏洞，`security.js` 提供输入清理、密钥检测、路径安全
- **基准**: `test-support/benchmark.js` 性能回归监控
- **CI**: `.github/workflows/ci.yml` 矩阵测试 (Node.js 20/22)，含 `premerge` 脚本

## 提交规范

请使用约定式提交格式：

- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档更新
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建/工具相关

## 添加新的 Skill

1. 在 `src/templates/skills/stdd/` 下创建新目录（`stdd init` 会自动安装到 `.claude/skills/stdd/`）
2. 添加 `SKILL.md` 文件，格式如下：

```yaml
---
name: stdd-xxx
description: |
  功能描述。
  触发场景：用户说 '/stdd:xxx', 'xxx', ...
metadata:
  author: your-name
  version: "1.0.0"
---

# Skill 标题

[具体步骤...]
```

## 添加新的 CLI 命令

CLI 命令统一使用 CommandLoader 模式注册，新增命令请参考 `src/cli/commands/` 目录下现有命令的实现方式。

## 代码风格

- 保持 Markdown 文档格式整洁
- SKILL.md 中的步骤要清晰、可执行
- 避免过度抽象，保持简单

## 问题反馈

- 使用 GitHub Issues 提交 bug 报告或功能建议
- 请提供复现步骤和环境信息
