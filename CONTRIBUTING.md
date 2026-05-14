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
| `npm test` | 运行全部测试 (80 套件, 893 测试) |
| `npm run test:all` | 完整测试套件 (含集成测试) |
| `npm run test:coverage` | 生成覆盖率报告 (text/lcov/html) |
| `npm run test:benchmark` | 运行性能基准套件 |
| `npm run audit` | npm 安全审计 |
| `npm run premerge` | 合并前全检 (lint + test + audit) |

## 测试与质量门禁

- **测试基线**: 80 个测试套件、893 个测试，CI 矩阵 (Node.js 18/20/22) 全绿
- **覆盖率**: `jest.config.js` 配置 `collectCoverageFrom` 收集 `src/**/*.js`，生成 text/lcov/html 报告
- **安全**: `npm audit` 零漏洞，`security.js` 提供输入清理、密钥检测、路径安全
- **基准**: `test-support/benchmark.js` 性能回归监控
- **CI**: `.github/workflows/ci.yml` 矩阵测试，含 `premerge` 脚本

## 提交规范

请使用约定式提交格式：

- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档更新
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建/工具相关

## 添加新的 Skill

1. 在 `.claude/skills/` 下创建新目录
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

## 代码风格

- 保持 Markdown 文档格式整洁
- SKILL.md 中的步骤要清晰、可执行
- 避免过度抽象，保持简单

## 问题反馈

- 使用 GitHub Issues 提交 bug 报告或功能建议
- 请提供复现步骤和环境信息
