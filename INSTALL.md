# STDD Copilot 安装指南

STDD Copilot 采用轻量化、本地化的安装方式，兼容 macOS、Linux 和 Windows (WSL)。

## 1. 前置依赖

| 依赖 | 版本要求 | 说明 |
|------|----------|------|
| **Node.js** | >= 20.0.0 | 推荐 LTS 版本 |
| **Git** | 任意现代版本 | 变更管理和归档 |
| **npm** | >= 9.0.0 | 包管理器 |
| **AI 编码助手** | (可选) | Claude Code、Cursor、Windsurf 等 |

## 2. 安装方式

### 2.1 npm 全局安装 (推荐日常开发)

适用于你只想一行命令安装并在任意项目目录使用 `stdd`：

```bash
npm install -g @marcher-lam/stdd-copilot@latest
stdd --help
```

注意：如果发布者的 npm 账号开启了 2FA，发布时需要提供 `--otp` 或使用允许 bypass 2FA 的 granular token。

### 2.2 Docker 部署 (推荐 CI / 隔离试用)

适用场景：CI 冒烟测试、企业内部分发、临时隔离评估。镜像默认以非 root 用户运行，只打包运行所需 CLI、模板、schemas 和 reporters。

```bash
# 从 Docker Hub 拉取
docker pull marcher-lam/stdd-copilot:latest

# 挂载项目目录使用 CLI
docker run --rm -it \
  -v "$PWD:/workspace" \
  marcher-lam/stdd-copilot:latest \
  --help

# 或本地构建
git clone https://github.com/Marcher-lam/STDD-COPILOT.git ~/stdd-copilot
cd ~/stdd-copilot
docker build -t stdd-copilot .
docker-compose up -d
docker exec -it stdd-copilot stdd --help
```

### 2.3 源码安装 (推荐贡献者)

### 第一步：克隆仓库

```bash
git clone https://github.com/Marcher-lam/STDD-COPILOT.git ~/stdd-copilot
cd ~/stdd-copilot
```

### 第二步：安装 Node 依赖

```bash
npm install
```

### 第三步：配置全局 CLI (可选)

```bash
npm link
```

链接后即可在任意项目目录中使用 `stdd` 命令：

```bash
stdd --help
stdd init
stdd status
```

## 3. 在目标项目中初始化

进入你的业务项目目录，使用 CLI 或 Claude Code 斜杠命令初始化：

### 方式 A: 使用 CLI

```bash
cd /path/to/your/project
stdd init
```

### 方式 B: 使用 Claude Code

```bash
cd /path/to/your/project
# 在 Claude Code 中输入:
/stdd:init
```

初始化会自动完成以下操作：

1. 检测项目类型 (Node.js/Python/Go/Rust) 和技术栈
2. 创建 `stdd/` 工作目录结构 (specs/, changes/, memory/, graph/)
3. 生成 `stdd/config.yaml` 项目配置
4. 生成 `stdd/memory/foundation.md` 项目基础约束
5. 复制 `.claude/commands/stdd/` 命令文件 (20 个)
6. 复制 `schemas/` 规格模板和 Constitution 条例

## 4. 初始化选项

```bash
stdd init                    # 当前目录初始化
stdd init /path/to/project   # 指定目录
stdd init --force            # 强制覆盖已存在的文件
stdd init --skip-skills      # 跳过复制 skills 目录
```

## 5. AI 引擎兼容性

STDD Copilot 不绑定单一 AI 引擎，通过 `stdd/config/engines.yaml` 注册 22 个引擎，采用 4 级兼容体系：

| Tier | 引擎 | 说明 |
|------|------|------|
| Tier 1 | Claude Code, Cursor, Windsurf | 完整适配 |
| Tier 2 | Copilot, Aider, Cline, Continue, Amazon Q | 高兼容 |
| Tier 3 | Qwen, Doubao, Gemini, Codex, Devin 等 | 基础支持 |
| Tier 4 | Augment, PearAI, Melty 等 | 实验性 |

在 Claude Code 中，所有 47 个 Skills 通过 `/stdd:*` 斜杠命令直接使用。其他引擎可通过 `AGENTS.md` 和 `.claude/` 目录结构适配。

## 6. 下一步

安装完成后，请参阅：

- [快速开始](docs/getting-started.md) — 5 分钟上手
- [使用手册](USAGE.md) — 完整命令参考
- [架构文档](ARCHITECTURE.md) — 系统架构说明
