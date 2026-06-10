---
id: stdd.issue
command: /stdd:issue
description: 用失败测试先行的 TDD 流程处理 bug 或回归（语言无关）
version: "3.0"
category: lifecycle
phase: discovery
read_only: false
risk_level: medium
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.init]
next: [stdd.apply]
on_failure: [stdd.fix-packet]
inputs:
  - bug 描述
  - 复现步骤
  - severity
  - workspace
outputs:
  - bugfix change
  - 失败测试任务
  - 回归证据
evidence:
  required: true
  path: stdd/changes/<change-id>/evidence/
constitution_articles:
  blocking: [2, 7]
  warning: []
  suggestion: []
graph:
  node_id: stdd.issue
  parallelizable: false
  resumable: true
  checkpoint: per-change
---

# STDD Skill: /stdd:issue

## Purpose
**用失败测试先行的 TDD 流程处理 bug 或回归**。这是 Chaos Code 的 bug 修复 skill，确保 bug 修复符合 TDD 原则。

**核心设计原则：**
- **语言无关**：适用于任何编程语言
- **测试先行**：先写失败测试复现 bug
- **最小修复**：只修复必要代码
- **防回归**：保留测试防止再次发生

## When to Use
- 需要修复 bug 时
- 需要处理回归时
- 需要复现问题时
- 需要验证修复时

## Bug 修复 TDD 流程

### 1. 复现阶段（RED）
```
┌─────────────┐
│  报告 Bug   │ 用户报告问题
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  编写测试   │ 编写能复现问题的测试
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  确认失败   │ 测试确实失败
└─────────────┘
```

### 2. 修复阶段（GREEN）
```
┌─────────────┐
│  最小修复   │ 编写最少代码
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  测试通过   │ 测试变绿
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  回归测试   │ 运行所有测试
└─────────────┘
```

### 3. 验证阶段（REFACTOR）
```
┌─────────────┐
│  优化代码   │ 如果需要
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  提交修复   │ 包含测试
└─────────────┘
```

## CLI Runtime

```bash
# 创建 bug 修复
chaos issue "用户登录失败" --severity high

# 指定标题
chaos issue "Bug description" --title "fix-login-failure"

# 指定严重级别
chaos issue "..." --severity critical
chaos issue "..." --severity high
chaos issue "..." --severity medium
chaos issue "..." --severity low

# 提供复现步骤
chaos issue "..." --steps "1. Go to /login\n2. Enter invalid creds\n3. Click submit"

# 指定 workspace
chaos issue "..." --workspace packages/api

# 包含日志/截图
chaos issue "..." --attach error.log
chaos issue "..." --attach screenshot.png
```

## Bug 报告模板

### 生成的 issue.md
```markdown
# Bug: <title>

## Description
<bug description>

## Severity
<severity level>

## Reproduction Steps
1. <step 1>
2. <step 2>
3. <step 3>

## Expected Behavior
<what should happen>

## Actual Behavior
<what actually happens>

## Environment
- Language: <detected language>
- Framework: <detected framework>
- Version: <version info>

## Attachments
- <error log>
- <screenshots>
```

## 测试先行修复

### 多语言测试示例

#### JavaScript/TypeScript
```javascript
// 先写失败的测试
describe('Bug: Login with special characters', () => {
  it('should handle email with + sign', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'user+tag@example.com', password: 'password123' });

    // 这个测试会失败，因为当前代码不支持 + 号
    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
  });
});
```

#### Python
```python
# 先写失败的测试
def test_login_with_special_characters():
    """Bug: Login fails with email containing + sign"""
    response = client.post('/auth/login', json={
        'email': 'user+tag@example.com',
        'password': 'password123'
    })

    # 这个测试会失败
    assert response.status_code == 200
    assert 'token' in response.json()
```

#### Java
```java
// 先写失败的测试
@Test
@DisplayName("Bug: Login should handle email with + sign")
void loginWithEmailWithPlusSign() {
    LoginRequest request = new LoginRequest();
    request.setEmail("user+tag@example.com");
    request.setPassword("password123");

    ResponseEntity<LoginResponse> response = authService.login(request);

    // 这个测试会失败
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(response.getBody().getToken()).isNotEmpty();
}
```

## 回归证据

### 证据收集
1. **失败截图**: 测试失败时的截图
2. **错误日志**: 完整的错误堆栈
3. **复现步骤**: 明确的步骤说明
4. **修复记录**: 修复前后对比
5. **回归测试**: 确保不再发生

### 证据文件结构
```
stdd/changes/bugfix-<issue-id>/evidence/
├── bug-report.md           # 原始 bug 报告
├── reproduction-test.md    # 复现测试
├── failure-evidence.json   # 失败证据
├── fix-record.md           # 修复记录
└── regression-test.md      # 回归测试
```

## Graph Semantics
- 节点 ID 为 stdd.issue，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-change；resumable=true；parallelizable=false。
- 依赖 init，直接进入 apply。

## Constitution Gates
- **Blocking 条例 2 (TDD)**: 必须先写测试
- **Blocking 条例 7 (Security)**: 安全相关的 bug 优先

## Evidence Contract
- Bug 报告写入 `stdd/changes/bugfix-<issue-id>/issue.md`
- 证据写入 `stdd/changes/bugfix-<issue-id>/evidence/`

## Related Skills
- **stdd.apply** - 执行修复
- **stdd.fix-packet** - 失败修复包
- **stdd.init** - 初始化项目

## 参考资源

### Bug 追踪
- [Bug Tracking Best Practices](https://www.atlassian.com/agile/project-management/bug-tracking)
- [Writing Good Bug Reports](https://bugzilla.mozilla.org/page.cgi?id=bug-writing.html)

### TDD Bug 修复
- [TDD for Bug Fixing](https://martinfowler.com/bliki/TestDrivenDevelopment.html)
- [Regression Testing](https://en.wikipedia.org/wiki/Regression_testing)

## 设计决策

### 为什么测试先行修复 bug？
- **确认复现**: 测试证明 bug 存在
- **明确边界**: 测试定义修复目标
- **防回归**: 测试防止再次发生

### 为什么需要复现步骤？
- **可验证**: 清晰的复现路径
- **高效**: 快速定位问题
- **文档**: 帮助团队理解

### 为什么收集证据？
- **追溯**: 了解问题原因
- **学习**: 防止类似问题
- **审计**: 修复记录完整
