---
id: stdd.fix-packet
command: /stdd:fix-packet
description: 为失败任务生成 Golden Packet 风格修复上下文（语言无关）
version: "3.0"
category: evidence
phase: verification
read_only: false
risk_level: medium
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.apply]
next: [stdd.apply]
on_failure: []
inputs:
  - 失败任务
  - test output
  - spec/design/tasks
  - 相关源码
outputs:
  - fix-packet-*.md
  - fix-packet-*.json
evidence:
  required: true
  path: stdd/changes/<change-id>/evidence/
constitution_articles:
  blocking: []
  warning: []
  suggestion: []
graph:
  node_id: stdd.fix-packet
  parallelizable: false
  resumable: true
  checkpoint: per-change
---

# STDD Skill: /stdd:fix-packet

## Purpose
**为失败任务生成 Golden Packet 风格修复上下文**。这是 Chaos Code 的失败修复 skill，聚合所有相关信息用于诊断和修复失败的任务。

**核心设计原则：**
- **语言无关**：适用于任何编程语言
- **完整上下文**：包含所有相关诊断信息
- **双格式输出**：Markdown（人类）+ JSON（机器）
- **可重放**：包含足够信息独立复现问题

## When to Use
- 任务执行失败时
- 需要诊断测试失败时
- 需要人工介入分析时
- 熔断机制触发时

## Golden Packet 格式

### 什么是 Golden Packet？
Golden Packet 是一个包含所有必要诊断信息的独立数据包，设计为：
- **自包含**: 包含所有相关代码和配置
- **可重放**: 可以独立于原始环境复现
- **双格式**: Markdown（人类可读）+ JSON（机器可解析）

### 修复包结构

#### Markdown 格式 (fix-packet-<timestamp>.md)
```markdown
# Fix Packet: <change-id> - <timestamp>

## 失败概要

### 任务信息
- **任务 ID**: TASK-001
- **任务标题**: 实现用户登录
- **失败阶段**: GREEN
- **失败次数**: 3

### 失败摘要
测试失败：期望返回 200，实际返回 401

---

## 上下文信息

### Spec 片段
\`\`\`
Feature: User Login
  Scenario: Valid credentials
    When POST /auth/login with valid credentials
    Then should return 200
    And should return JWT token
\`\`\`

### 设计片段
\`\`\`
## Authentication Flow
1. Validate credentials
2. Generate JWT token
3. Return token in response
\`\`\`

### 任务描述
\`\`\`
实现用户登录端点：
1. 接收用户名和密码
2. 验证凭据
3. 生成 JWT token
4. 返回 token
\`\`\`

---

## 失败详情

### 测试输出
\`\`\`
FAIL src/auth/__tests__/login.test.js
  ✕ should login with valid credentials (45 ms)

    Expected: 200
    Received: 401

      at Object.<anonymous> (src/auth/__tests__/login.test.js:25:32)
\`\`\`

### 错误信息
```
AuthenticationError: Invalid credentials
    at AuthService.login (src/auth/service.js:15:12)
```

### 堆栈跟踪
\`\`\`
Error: Invalid credentials
    at AuthService.validate (src/auth/service.js:15:12)
    at AuthService.login (src/auth/service.js:25:8)
    at AuthController.login (src/auth/controller.js:10:5)
\`\`\`

---

## 相关代码

### 源码片段
\`\`\`javascript
// src/auth/service.js
export class AuthService {
  async login(username, password) {
    const user = await this.userRepo.findByUsername(username);
    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }
    // Bug: 密码比较使用了错误的逻辑
    if (user.password !== hash(password)) {  // ← 错误：应该用 bcrypt.compare
      throw new AuthenticationError('Invalid credentials');
    }
    return this.generateToken(user);
  }
}
\`\`\`

### 测试代码
\`\`\`javascript
// src/auth/__tests__/login.test.js
describe('POST /auth/login', () => {
  it('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ username: 'test', password: 'password123' });
    expect(response.status).toBe(200);
  });
});
\`\`\`

---

## 诊断建议

### 可能原因
1. 密码比较逻辑错误
2. 测试数据密码未正确哈希
3. Mock 数据与实际格式不匹配

### 修复建议
1. 使用 bcrypt.compare 替直接比较
2. 确保测试数据密码使用正确格式
3. 检查测试 fixture 数据

---

## 修复记录

### 尝试历史
| 次数 | 时间 | 尝试 | 结果 |
|------|------|------|------|
| 1 | 10:00 | 重写密码比较 | 失败 |
| 2 | 10:15 | 更新测试数据 | 失败 |
| 3 | 10:30 | 检查 bcrypt 配置 | 失败 |

### 下一步行动
- [ ] 检查 bcrypt 配置
- [ ] 验证测试数据格式
- [ ] 添加调试日志
```

#### JSON 格式 (fix-packet-<timestamp>.json)
```json
{
  "packetId": "fix-packet-20250519-103000",
  "changeId": "add-user-login",
  "timestamp": "2025-05-19T10:30:00Z",
  "task": {
    "id": "TASK-001",
    "title": "实现用户登录",
    "phase": "GREEN",
    "failureCount": 3
  },
  "failure": {
    "summary": "测试失败：期望返回 200，实际返回 401",
    "stage": "GREEN",
    "testOutput": "...",
    "errorMessage": "AuthenticationError: Invalid credentials",
    "stackTrace": "..."
  },
  "context": {
    "spec": "...",
    "design": "...",
    "taskDescription": "..."
  },
  "code": {
    "sourceFile": "src/auth/service.js",
    "sourceSnippet": "...",
    "testFile": "src/auth/__tests__/login.test.js",
    "testSnippet": "..."
  },
  "diagnostics": {
    "possibleCauses": [
      "密码比较逻辑错误",
      "测试数据密码未正确哈希"
    ],
    "suggestions": [
      "使用 bcrypt.compare",
      "检查测试数据格式"
    ]
  },
  "history": [
    {
      "attempt": 1,
      "time": "10:00",
      "action": "重写密码比较",
      "result": "failed"
    }
  ]
}
```

## CLI Runtime

```bash
# 生成修复包
chaos fix-packet <change-id>

# 指定任务
chaos fix-packet <change-id> --task TASK-001

# 只生成 JSON
chaos fix-packet <change-id> --json-only

# 包含完整源码
chaos fix-packet <change-id> --full-source

# 指定输出目录
chaos fix-packet <change-id> --output stdd/fix-packets/

# Workspace 支持
chaos fix-packet <change-id> --workspace packages/api
```

## 诊断信息收集

### 自动收集内容
1. **失败任务信息**: 从 tasks.md 读取
2. **测试输出**: 从 apply.log 或运行测试收集
3. **Spec 片段**: 从 specs/ 目录读取相关规格
4. **设计片段**: 从 design.md 读取相关设计
5. **源码片段**: 读取失败的源文件
6. **堆栈跟踪**: 从错误输出提取
7. **失败历史**: 从 apply.log 读取

### 多语言错误处理
| 语言 | 错误格式 | 堆栈跟踪 |
|------|----------|----------|
| JavaScript/TypeScript | Error: message | at Function (file:line) |
| Python | Exception: message | Traceback (most recent call last) |
| Java | Exception: message | at Class.method(file:line) |
| Go | error message | goroutine, file:line |
| Rust | error message | backtrace |
| C# | Exception: message | at Class.Method() |

## Graph Semantics
- 节点 ID 为 stdd.fix-packet，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-change；resumable=true；parallelizable=false。
- 由 apply 失败触发，为修复提供上下文。

## Constitution Gates
- 无直接条例检查
- 产物用于指导修复工作

## Evidence Contract
- 修复包写入 `stdd/changes/<change-id>/evidence/fix-packet-*.json`
- Markdown 版本写入 `stdd/changes/<change-id>/evidence/fix-packet-*.md`

## Related Skills
- **stdd.apply** - 失败来源
- **stdd.verify** - 验证修复
- **stdd.guard** - 实时门禁检查

## 参考资源

### 调试实践
- [Debugging Best Practices](https://martinfowler.com/articles/origin-story.html)
- [Post-Mortem Culture](https://codeascraft.com/2015/04/20/blameless-postmortem/)

### 错误处理
- [Error Handling in Various Languages](https://en.wikibooks.org/wiki/Computer_Programming/Error_Handling)

## 设计决策

### 为什么叫 Golden Packet？
- **Golden**: 包含所有有价值的信息
- **Packet**: 独立、可传输的数据包
- 类似网络中的"金包"概念，携带完整诊断信息

### 为什么需要双格式？
- **Markdown**: 人类可读，便于人工诊断
- **JSON**: 机器可解析，便于自动化处理
- **灵活性**: 满足不同使用场景

### 为什么包含历史记录？
- **模式识别**: 发现重复失败模式
- **避免重复**: 知道什么已经尝试过
- **学习机会**: 从失败中学习
