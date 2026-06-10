---
id: stdd.user-test
command: /stdd:user-test
description: 从 BDD 场景生成人工验收测试脚本（语言无关）
version: "3.0"
category: collaboration
phase: verification
read_only: true
risk_level: low
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.spec]
next: []
on_failure: []
inputs:
  - BDD specs
  - 验收对象
  - 测试数据
outputs:
  - user-test.md
  - 验收数据说明
evidence:
  required: true
  path: stdd/changes/<change-id>/evidence/
constitution_articles:
  blocking: []
  warning: []
  suggestion: [5]
graph:
  node_id: stdd.user-test
  parallelizable: true
  resumable: true
  checkpoint: per-change
---

# STDD Skill: /stdd:user-test

## Purpose
**从 BDD 场景生成人工验收测试脚本**。这是 Chaos Code 的用户验收测试 skill，将技术规格转换为用户可执行的测试脚本。

**核心设计原则：**
- **语言无关**：适用于任何编程语言
- **用户友好**：非技术用户可执行
- **可追溯**：从 BDD 场景生成
- **可自动**：支持 AI/browser 自动化

## When to Use
- 需要用户验收测试时
- 需要人工验证时
- 需要演示脚本时
- 需要文档化验收流程时

## CLI Runtime

```bash
# 生成用户测试
chaos user-test <change-id>

# 指定输出格式
chaos user-test <change-id> --format markdown
chaos user-test <change-id> --format html

# 包含测试数据
chaos user-test <change-id> --with-data

# Workspace 支持
chaos user-test <change-id> --workspace packages/api
```

## 测试脚本格式

### Markdown 格式
```markdown
# 用户验收测试: <feature-name>

## 测试准备
- [ ] 准备测试账号: test@example.com / password123
- [ ] 清理浏览器缓存
- [ ] 打开应用

## 场景 1: 成功登录

### 步骤
1. 打开登录页面 `/login`
2. 输入用户名: `test@example.com`
3. 输入密码: `password123`
4. 点击"登录"按钮

### 预期结果
- [ ] 跳转到首页 `/dashboard`
- [ ] 显示欢迎消息"欢迎，Test User"
- [ ] 右上角显示用户头像

### 截图/录屏
- [ ] 截图: `login-success-1.png`
- [ ] 截图: `dashboard-after-login.png`

## 场景 2: 登录失败

### 步骤
1. 打开登录页面 `/login`
2. 输入用户名: `test@example.com`
3. 输入密码: `wrong-password`
4. 点击"登录"按钮

### 预期结果
- [ ] 保持在登录页面
- [ ] 显示错误消息"用户名或密码错误"
- [ ] 错误消息为红色

### 截图/录屏
- [ ] 截图: `login-error-1.png`

## 验收签字
- [ ] 通过: _____ 日期: _____
- [ ] 不通过: _____ 原因: _____
```

## 多语言测试数据

### 测试数据模板
```yaml
# stdd/changes/<change-id>/test-data.yaml
users:
  - id: "test-user-1"
    email: "test@example.com"
    password: "password123"
    name: "Test User"
  - id: "test-user-2"
    email: "admin@example.com"
    password: "admin456"
    name: "Admin User"
    role: "admin"
```

## 自动化集成

### Playwright (JavaScript/TypeScript)
```javascript
// 可选：从 user-test.md 生成 Playwright 测试
test('用户登录 - 成功', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('[type="submit"]');

  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('text=欢迎，Test User')).toBeVisible();
});
```

### Selenium (Python)
```python
# 可选：从 user-test.md 生成 Selenium 测试
def test_user_login_success():
    driver.get("/login")
    driver.find_element(By.NAME, "email").send_keys("test@example.com")
    driver.find_element(By.NAME, "password").send_keys("password123")
    driver.find_element(By.CSS_SELECTOR, "[type='submit']").click()

    assert "/dashboard" in driver.current_url
    assert "欢迎，Test User" in driver.page_source
```

### Selenium (Java)
```java
// 可选：从 user-test.md 生成 Selenium 测试
@Test
public void testUserLoginSuccess() {
    driver.get("/login");
    driver.findElement(By.name("email")).sendKeys("test@example.com");
    driver.findElement(By.name("password")).sendKeys("password123");
    driver.findElement(By.cssSelector("[type='submit']")).click();

    assertTrue(driver.getCurrentUrl().contains("/dashboard"));
    assertTrue(driver.getPageSource().contains("欢迎，Test User"));
}
```

## Graph Semantics
- 节点 ID 为 stdd.user-test，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-change；resumable=true；parallelizable=true。
- 依赖 spec，无下一步。

## Constitution Gates
- **Suggestion 条例 5 (Documentation)**: 测试脚本应有清晰文档

## Evidence Contract
- 用户测试脚本写入 `stdd/changes/<change-id>/user-test.md`
- 测试数据写入 `stdd/changes/<change-id>/test-data.yaml`
- 证据写入 `stdd/changes/<change-id>/evidence/user-test-*.json`

## Related Skills
- **stdd.spec** - 输入规格
- **stdd.validate** - 验证规格
- **stdd.browser** - 浏览器自动化

## 参考资源

### 验收测试
- [Acceptance Testing](https://en.wikipedia.org/wiki/Acceptance_testing)
- [UAT Best Practices](https://www.requirementsinc.com/)

### 浏览器自动化
| 语言 | 框架 |
|------|------|
| JavaScript/TypeScript | Playwright, Puppeteer, Cypress |
| Python | Selenium, Playwright Python |
| Java | Selenium, Selenide |
| Go | Selenium, rod |
| C# | Selenium, Playwright |

## 设计决策

### Why 用户测试？
- **验证**: 用户验证功能
- **沟通**: 用户和开发者沟通
- **文档**: 验收文档

### Why 人工 + 自动？
- **灵活**: 人工可处理复杂场景
- **高效**: 自动可处理重复场景
- **选择**: 团队选择适合的
