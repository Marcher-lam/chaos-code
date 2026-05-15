# STDD Hook System Configuration
# Version: 1.0
# Reference: https://docs.anthropic.com/claude-code/hooks

## 概述

Hook 系统是 STDD Constitution 的执行层，通过 Claude Code 的 Hook 机制
在关键操作前后拦截、验证、强制执行开发规范。

## Hook 类型

### 1. PreToolUse (工具执行前)

在工具执行前拦截，用于：
- 阻止违规操作
- 验证前置条件
- 记录操作日志

```yaml
# settings.json 中的配置示例
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/pre-file-write.js"
          }
        ]
      }
    ]
  }
}
```

### 2. PostToolUse (工具执行后)

在工具执行后拦截，用于：
- 验证执行结果
- 触发后续检查
- 更新状态

```yaml
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/post-file-write.js"
          }
        ]
      }
    ]
  }
}
```

### 3. Notification (通知)

在特定事件时触发，用于：
- 记录操作日志
- 发送通知
- 更新仪表板

```yaml
{
  "hooks": {
    "Notification": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/notification.js"
          }
        ]
      }
    ]
  }
}
```

## Hook 脚本

### pre-file-write.js

```javascript
#!/usr/bin/env node

/**
 * PreToolUse Hook - 文件写入前检查
 *
 * 执行的 Constitution Articles:
 * - Article 2: TDD (测试先行)
 * - Article 4: Code Style (代码风格)
 * - Article 7: Security (安全检查)
 */

const fs = require('fs');
const path = require('path');

// 从 stdin 读取 hook 数据
let inputData = '';
process.stdin.on('data', chunk => {
  inputData += chunk;
});

process.stdin.on('end', async () => {
  try {
    const data = JSON.parse(inputData);
    const result = await runChecks(data);

    // 输出结果
    console.log(JSON.stringify(result));

    // 非 0 退出码会阻止操作
    process.exit(result.block ? 1 : 0);
  } catch (error) {
    console.error('Hook error:', error.message);
    process.exit(0); // 错误不阻止操作
  }
});

async function runChecks(data) {
  const { tool_input, tool_name } = data;

  // 只检查写入文件的操作
  if (!['Write', 'Edit'].includes(tool_name)) {
    return { block: false };
  }

  const filePath = tool_input.file_path || '';
  const content = tool_input.content || tool_input.new_string || '';

  const violations = [];

  // Article 2: TDD 检查
  if (isImplementationFile(filePath)) {
    const testFile = getCorrespondingTestFile(filePath);
    if (!fs.existsSync(testFile)) {
      violations.push({
        article: 2,
        level: 'error',
        message: `测试文件不存在: ${testFile}`,
        suggestion: `请先运行: /stdd:apply 创建对应测试`
      });
    }
  }

  // Article 4: Code Style 检查
  const styleViolations = checkCodeStyle(content, filePath);
  violations.push(...styleViolations);

  // Article 7: Security 检查
  const securityViolations = checkSecurity(content, filePath);
  violations.push(...securityViolations);

  // 决定是否阻止
  const hasErrors = violations.some(v => v.level === 'error');

  return {
    block: hasErrors,
    violations,
    message: hasErrors
      ? formatViolationMessage(violations)
      : null
  };
}

function isImplementationFile(filePath) {
  // 检查是否是实现文件（非测试文件）
  const srcPattern = /\/src\//;
  const testPattern = /\.(test|spec)\./;
  return srcPattern.test(filePath) && !testPattern.test(filePath);
}

function getCorrespondingTestFile(filePath) {
  // src/services/UserService.ts -> src/__tests__/services/UserService.test.ts
  return filePath
    .replace('/src/', '/src/__tests__/')
    .replace('.ts', '.test.ts');
}

function checkCodeStyle(content, filePath) {
  const violations = [];

  // 检查文件长度
  const lines = content.split('\n');
  if (lines.length > 500) {
    violations.push({
      article: 4,
      level: 'warning',
      message: `文件过长: ${lines.length} 行 (建议 < 500)`,
      suggestion: '考虑拆分为更小的模块'
    });
  }

  // 检查函数长度
  const functionMatches = content.match(/function\s+\w+\s*\([^)]*\)\s*\{/g) || [];
  // 简化检查，实际需要更复杂的解析

  return violations;
}

function checkSecurity(content, filePath) {
  const violations = [];

  // 检查硬编码的敏感信息
  const sensitivePatterns = [
    { pattern: /password\s*=\s*['"][^'"]+['"]/i, name: 'password' },
    { pattern: /api[_-]?key\s*=\s*['"][^'"]+['"]/i, name: 'API key' },
    { pattern: /secret\s*=\s*['"][^'"]+['"]/i, name: 'secret' },
    { pattern: /token\s*=\s*['"][a-zA-Z0-9]{20,}['"]/i, name: 'token' }
  ];

  for (const { pattern, name } of sensitivePatterns) {
    if (pattern.test(content)) {
      violations.push({
        article: 7,
        level: 'error',
        message: `检测到硬编码的敏感信息: ${name}`,
        suggestion: '请使用环境变量替代硬编码的敏感信息'
      });
    }
  }

  return violations;
}

function formatViolationMessage(violations) {
  const errors = violations.filter(v => v.level === 'error');
  const warnings = violations.filter(v => v.level === 'warning');

  let message = '❌ [STDD Guard] Constitution 违规检测\n\n';

  if (errors.length > 0) {
    message += '🚫 阻断性问题:\n';
    errors.forEach(e => {
      message += `  - Article ${e.article}: ${e.message}\n`;
      message += `    建议: ${e.suggestion}\n`;
    });
  }

  if (warnings.length > 0) {
    message += '\n⚠️ 警告:\n';
    warnings.forEach(w => {
      message += `  - Article ${w.article}: ${w.message}\n`;
    });
  }

  return message;
}
```

### post-file-write.js

```javascript
#!/usr/bin/env node

/**
 * PostToolUse Hook - 文件写入后检查
 *
 * 执行的 Constitution Articles:
 * - Article 5: Documentation (文档同步)
 * - Article 6: Error Handling (错误处理)
 * - Article 8: Performance (性能检查)
 */

const fs = require('fs');
const path = require('path');

let inputData = '';
process.stdin.on('data', chunk => {
  inputData += chunk;
});

process.stdin.on('end', async () => {
  try {
    const data = JSON.parse(inputData);
    const suggestions = await analyzeCode(data);

    if (suggestions.length > 0) {
      console.log(JSON.stringify({
        message: formatSuggestions(suggestions),
        suggestions
      }));
    }

    process.exit(0); // PostHook 通常不阻止操作
  } catch (error) {
    console.error('Hook error:', error.message);
    process.exit(0);
  }
});

async function analyzeCode(data) {
  const { tool_input, tool_name } = data;

  if (!['Write', 'Edit'].includes(tool_name)) {
    return [];
  }

  const filePath = tool_input.file_path || '';
  const content = tool_input.content || tool_input.new_string || '';

  const suggestions = [];

  // Article 5: Documentation 检查
  if (isSourceFile(filePath) && !hasDocumentation(content)) {
    suggestions.push({
      article: 5,
      level: 'suggestion',
      message: '检测到未注释的公共 API',
      suggestion: '考虑添加 JSDoc/TSDoc 注释'
    });
  }

  // Article 6: Error Handling 检查
  if (hasEmptyCatch(content)) {
    suggestions.push({
      article: 6,
      level: 'warning',
      message: '发现空的 catch 块',
      suggestion: '请处理错误或添加注释说明为什么忽略'
    });
  }

  // Article 8: Performance 检查
  if (hasNPlusOnePattern(content)) {
    suggestions.push({
      article: 8,
      level: 'warning',
      message: '可能存在 N+1 查询问题',
      suggestion: '考虑使用批量查询或 JOIN'
    });
  }

  return suggestions;
}

function isSourceFile(filePath) {
  return /\.(ts|js|py|go|java)$/.test(filePath);
}

function hasDocumentation(content) {
  // 检查是否有 JSDoc/TSDoc 注释
  return /\/\*\*[\s\S]*?\*\//.test(content);
}

function hasEmptyCatch(content) {
  return /catch\s*\([^)]*\)\s*\{\s*\}/.test(content);
}

function hasNPlusOnePattern(content) {
  // 简化检测，实际需要更复杂的分析
  const loopPatterns = /for\s*\(.*await.*\)/;
  const dbPatterns = /\.findMany\(|\.findById\(/;
  return loopPatterns.test(content) && dbPatterns.test(content);
}

function formatSuggestions(suggestions) {
  let message = '💡 [STDD Guard] 代码改进建议\n\n';

  suggestions.forEach(s => {
    const icon = s.level === 'warning' ? '⚠️' : '💡';
    message += `${icon} Article ${s.article}: ${s.message}\n`;
    message += `   建议: ${s.suggestion}\n\n`;
  });

  return message;
}
```

## 安装 Hooks

### 通过 CLI 安装

```bash
# 安装 hooks 到当前项目
stdd hooks install

# 安装到全局
stdd hooks install --global

# 验证 hooks 配置
stdd hooks verify
```

### 手动安装

将以下内容添加到 `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "node /path/to/stdd-copilot/.claude/hooks/pre-file-write.js"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "node /path/to/stdd-copilot/.claude/hooks/post-file-write.js"
          }
        ]
      }
    ]
  }
}
```

## Hook 配置选项

```yaml
# stdd/config.yaml
hooks:
  enabled: true

  # 阻断级别
  block_level: error  # error | warning | none

  # 豁免模式
  bypass_mode: false  # true 时只警告不阻断

  # 特定条例控制
  articles:
    2:  # TDD
      enabled: true
      block: true
    4:  # Code Style
      enabled: true
      block: false  # 只警告
    7:  # Security
      enabled: true
      block: true
```

## 禁用 Hooks

```bash
# 临时禁用 (当前会话)
STDD_HOOKS_DISABLED=1

# 永久禁用 (修改配置)
stdd hooks disable

# 禁用特定条例
stdd hooks disable --article=4
```

## 调试 Hooks

```bash
# 查看-hook 日志
cat ~/.claude/logs/hooks.log

# 测试 hook 脚本
echo '{"tool_name":"Write","tool_input":{"file_path":"test.ts"}}' | \
  node .claude/hooks/pre-file-write.js
```

## 与 Constitution 的关系

```
┌─────────────────────────────────────────────────────────────┐
│                    STDD Constitution                         │
│                    (9 篇开发条例)                            │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    Hook System                          │ │
│  │                    (执行层)                             │ │
│  │                                                         │ │
│  │   PreToolUse  →  Article 2, 4, 7 (阻断检查)            │ │
│  │   PostToolUse →  Article 5, 6, 8 (建议检查)            │ │
│  │   PreCommit   →  Article 1, 3, 4 (提交检查)            │ │
│  │   PrePush     →  Article 2, 9 (推送检查)               │ │
│  │                                                         │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

> "Hooks are not restrictions, they are guardrails that keep you on the path to quality code."
