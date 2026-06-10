# Foundation Memory - 项目基础约束

> 此文件由 Chaos Code 自动生成，记录项目的基础约束和配置。

## 项目识别

| 属性 | 值 |
|------|-----|
| 项目类型 | Node.js |
| 语言 | TypeScript |
| 框架 | 待检测 |
| 测试框架 | 待检测 |
| 包管理器 | 待检测 |

## 技术栈约束

### 运行时
- Node.js >= 20.0.0
- TypeScript >= 5.0.0

### 构建工具
- 待检测

### 代码规范
- 待检测

## 目录结构约束

```
项目根目录/
├── src/                    # 源代码
├── tests/                  # 测试代码
├── stdd/                   # STDD 工作目录
│   ├── changes/           # 变更管理
│   ├── specs/             # 规格文件
│   ├── memory/            # 记忆库
│   └── config.yaml        # 配置
└── .claude/               # Claude Code 配置
    ├── commands/          # 命令定义
    └── skills/            # 技能定义
```

## 命名规范

### 文件命名
- 组件: PascalCase.tsx
- 工具: camelCase.ts
- 测试: *.test.ts / *.spec.ts
- 规格: *.feature

### 变量命名
- 变量: camelCase
- 常量: UPPER_SNAKE_CASE
- 类型: PascalCase
- 接口: IPascalCase

## TDD 约束

### Ralph Loop
1. 🔴 红灯 - 先写失败测试
2. 🔍 静态检查 - 语法/类型检查
3. 🟢 绿灯 - 最小实现
4. 🧪 变异审查 - 检测骗绿灯
5. 🔵 重构 - 优化代码

### 防跑偏
- 连续失败 3 次自动熔断
- 关键决策需人工确认
- 任务粒度 ≤ 6 个

## 外部依赖

待检测...

## 更新记录

| 时间 | 更新内容 |
|------|----------|
| 2026-03-27 | 初始化创建 |

---

> 运行 `/stdd:init` 更新此文件
