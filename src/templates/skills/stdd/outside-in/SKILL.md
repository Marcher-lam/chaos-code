---
id: stdd.outside-in
command: /stdd:outside-in
description: 建立 E2E 到集成到单元的外向内 TDD 骨架（语言无关）
version: "3.0"
category: tdd
phase: planning
read_only: false
risk_level: medium
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.plan]
next: [stdd.apply]
on_failure: []
inputs:
  - BDD specs
  - layer registry
  - workspace
outputs:
  - layer registry
  - E2E/integration/unit scaffolds
evidence:
  required: true
  path: stdd/changes/<change-id>/evidence/
constitution_articles:
  blocking: []
  warning: []
  suggestion: []
graph:
  node_id: stdd.outside-in
  parallelizable: false
  resumable: true
  checkpoint: per-task
---

# STDD Skill: /stdd:outside-in

## Purpose
**建立 E2E 到集成到单元的外向内 TDD 骨架**。这是 Chaos Code 的 Outside-In TDD skill，从外向内建立测试骨架。

**核心设计原则：**
- **语言无关**：适用于任何编程语言
- **外向内**：从 E2E 开始到单元测试
- **分层实现**：逐层向内实现
- **骨架先行**：先生成测试骨架

## When to Use
- 开始新功能开发时
- 需要端到端测试时
- 复杂业务逻辑时
- 需要验证集成时

## Outside-In TDD 流程

### 三层测试金字塔

```
        ┌─────────────┐
        │    E2E      │  用户场景（少量）
        │  (BDD)      │  端到端测试
        └──────┬──────┘
               │
        ┌──────▼──────┐
        │ Integration │  服务交互（中等）
        │  (API)       │  集成测试
        └──────┬──────┘
               │
        ┌──────▼──────┐
        │    Unit     │  函数/类（大量）
        │  (TDD)       │  单元测试
        └─────────────┘
```

### 实现顺序

1. **E2E 层**（最外层）
   - 描述用户场景
   - 定义接口
   - 验证整体行为

2. **Integration 层**（中间层）
   - 测试服务交互
   - 验证 API 契约
   - 测试数据流

3. **Unit 层**（最内层）
   - 测试单个函数/类
   - 验证业务逻辑
   - 覆盖边界情况

## CLI Runtime

```bash
# 初始化 Outside-In
chaos outside-in init

# 生成测试骨架
chaos outside-in scaffold <change-id>

# 查看层级状态
chaos outside-in status

# 添加 E2E 场景
chaos outside-in add-e2e <change-id> "User login flow"

# Workspace 支持
chaos outside-in scaffold <change-id> --workspace packages/web
```

## 多语言 E2E 测试

### JavaScript/TypeScript (Playwright)
```typescript
// e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test('user login flow', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name=email]', 'user@example.com');
  await page.fill('[name=password]', 'password');
  await page.click('button[type=submit]');
  
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('h1')).toContainText('Welcome');
});
```

### Python (pytest + playwright)
```python
# e2e/test_login.py
from playwright.sync_api import Page, expect

def test_user_login_flow(page: Page):
    page.goto("/login")
    page.fill("[name=email]", "user@example.com")
    page.fill("[name=password]", "password")
    page.click("button[type=submit]")
    
    expect(page).to_have_url("/dashboard")
    expect(page.locator("h1")).to_contain_text("Welcome")
```

### Java (JUnit + Selenium)
```java
// e2e/LoginE2ETest.java
@Test
@DisplayName("User login flow")
void userLoginFlow() {
    driver.get("/login");
    driver.findElement(By.name("email")).sendKeys("user@example.com");
    driver.findElement(By.name("password")).sendKeys("password");
    driver.findElement(By.cssSelector("button[type=submit]")).click();
    
    assertThat(driver.getCurrentUrl()).endsWith("/dashboard");
    assertThat(driver.findElement(By.tagName("h1")).getText())
        .contains("Welcome");
}
```

## Layer Registry

### 层级注册表
```yaml
# layers.yaml
layers:
  e2e:
    path: e2e/
    framework: playwright
    scenarios:
      - user-login
      - user-registration
  
  integration:
    path: integration/
    framework: supertest
    services:
      - auth-service
      - user-service
  
  unit:
    path: unit/
    framework: jest
    modules:
      - auth
      - validation
```

## Graph Semantics
- 节点 ID 为 stdd.outside-in，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-task；resumable=true；parallelizable=false。

## Constitution Gates
- 无直接条例检查

## Evidence Contract
- 层级配置写入 `stdd/changes/<change-id>/layers.yaml`
- 骨架证据写入 `stdd/changes/<change-id>/evidence/`

## Related Skills
- **stdd.apply** - 实现测试
- **stdd.plan** - 生成任务
- **stdd.spec** - BDD 规格

## 参考资源

### Outside-In TDD
- [Outside-In Development](https://www.growing-object-oriented-software.com/)
- [Testing Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)

### E2E Testing
| 语言 | 框架 |
|------|------|
| JavaScript/TypeScript | Playwright, Cypress, Puppeteer |
| Python | Playwright, Selenium |
| Java | Selenium, Playwright |
| Go | agouti, selenium |
| C# | Selenium, Playwright |

## Page Object Model (POM)

### 为什么使用 POM？
- **可维护性**: UI 变更只影响 Page Objects
- **可复用性**: 页面元素和操作可复用
- **清晰性**: 测试代码更清晰

### Playwright POM 示例
```typescript
// pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async fillForm(email: string, password: string) {
    await this.page.fill('[name=email]', email);
    await this.page.fill('[name=password]', password);
  }

  async submit() {
    await this.page.click('button[type=submit]');
  }

  async getErrorMessage() {
    return await this.page.locator('.error-message').textContent();
  }
}

// e2e/login.spec.ts
test('user login with invalid credentials', async ({ page }) => {
  const loginPage = new LoginPage(page);
  
  await loginPage.goto();
  await loginPage.fillForm('user@example.com', 'wrong-password');
  await loginPage.submit();
  
  expect(await loginPage.getErrorMessage()).toBe('Invalid credentials');
});
```

### Cypress POM 示例
```javascript
// pages/LoginPage.js
export class LoginPage {
  visit() {
    cy.visit('/login');
  }

  fillForm(email, password) {
    cy.get('[name=email]').type(email);
    cy.get('[name=password]').type(password);
  }

  submit() {
    cy.get('button[type=submit]').click();
  }

  getErrorMessage() {
    return cy.get('.error-message');
  }
}

// e2e/login.cy.js
const { Given, When, Then } = require('@badeball/cypress-cucumber-preprocessor');
const LoginPage = require('../../pages/LoginPage');

Given('the user is on the login page', () => {
  const loginPage = new LoginPage();
  loginPage.visit();
});

When('the user enters invalid credentials', () => {
  const loginPage = new LoginPage();
  loginPage.fillForm('user@example.com', 'wrong-password');
  loginPage.submit();
});

Then('an error message should be displayed', () => {
  const loginPage = new LoginPage();
  loginPage.getErrorMessage().should('contain', 'Invalid credentials');
});
```

## 测试数据管理

### Fixtures 和 Data 驱动测试
```typescript
// fixtures/users.ts
export const users = {
  valid: {
    email: 'test@example.com',
    password: 'ValidPassword123!',
    name: 'Test User'
  },
  invalid: {
    email: 'invalid-email',
    password: 'short',
    name: ''
  }
};

// e2e/login-data.spec.ts
test.describe('Data-driven login tests', () => {
  for (const [scenario, data] of Object.entries(users)) {
    test(`login with ${scenario} data`, async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.fillForm(data.email, data.password);
      await loginPage.submit();
      
      if (scenario === 'valid') {
        await expect(page).toHaveURL('/dashboard');
      } else {
        await expect(loginPage.getErrorMessage()).toBeVisible();
      }
    });
  }
});
```

## 测试组织结构

### 推荐目录结构
```
e2e/
├── fixtures/           # 测试数据
│   ├── users.ts
│   └── auth-tokens.json
├── pages/              # Page Objects
│   ├── LoginPage.ts
│   ├── DashboardPage.ts
│   └── components/
│       └── Header.ts
├── helpers/            # 辅助函数
│   ├── auth.ts
│   └── api.ts
├── specs/              # 测试规格
│   ├── auth/
│   │   ├── login.spec.ts
│   │   └── registration.spec.ts
│   └── user/
│       └── profile.spec.ts
└── playwright.config.ts
```

## Before/After Hooks

```typescript
// tests/auth.setup.ts
import { test as base } from '@playwright/test';

type AuthFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // 前置条件：登录
    await page.goto('/login');
    await page.fill('[name=email]', 'test@example.com');
    await page.fill('[name=password]', 'password');
    await page.click('button[type=submit]');
    await page.waitForURL('/dashboard');
    
    await use(page);
    
    // 清理：登出
    await page.click('[data-testid=logout]');
  }
});

// 使用
test('authenticated user can view profile', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/profile');
  await expect(authenticatedPage.locator('h1')).toContainText('Test User');
});
```

## API 集成测试

```typescript
// integration/auth.api.test.ts
import { request, expect } from '@playwright/test';

test('POST /api/auth/login - valid credentials', async ({ request }) => {
  const response = await request.post('/api/auth/login', {
    data: {
      email: 'test@example.com',
      password: 'password'
    }
  });
  
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body).toHaveProperty('token');
  expect(body.user.email).toBe('test@example.com');
});

test('POST /api/auth/login - invalid credentials', async ({ request }) => {
  const response = await request.post('/api/auth/login', {
    data: {
      email: 'test@example.com',
      password: 'wrong-password'
    }
  });
  
  expect(response.status()).toBe(401);
  const body = await response.json();
  expect(body.error).toBe('Invalid credentials');
});
```

## 可访问性测试

```typescript
// e2e/a11y/login.spec.ts
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test('login page is accessible', async ({ page }) => {
  await page.goto('/login');
  await injectAxe(page);
  await checkA11y(page);
});

test('login form has proper labels', async ({ page }) => {
  await page.goto('/login');
  
  // 检查输入框有 label
  await expect(page.locator('input[name=email]')).toHaveAttribute(
    'aria-label',
    'Email address'
  );
  
  // 检查按钮有 accessible name
  await expect(page.locator('button[type=submit]')).toHaveAccessibleName(
    'Sign in'
  );
});
```

## 视觉回归测试

```typescript
// e2e/visual/login.spec.ts
import { test, expect } from '@playwright/test';

test('login page visual snapshot', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveScreenshot('login-page.png');
});

test('dashboard visual snapshot - light theme', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveScreenshot('dashboard-light.png');
});

test('dashboard visual snapshot - dark theme', async ({ page }) => {
  await page.goto('/dashboard');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page).toHaveScreenshot('dashboard-dark.png');
});
```

## 性能测试

```typescript
// e2e/performance/load.spec.ts
import { test, expect } from '@playwright/test';

test('page load performance', async ({ page }) => {
  const startTime = Date.now();
  await page.goto('/dashboard');
  const loadTime = Date.now() - startTime;
  
  expect(loadTime).toBeLessThan(3000); // 3秒内加载完成
});

test('API response time', async ({ request }) => {
  const startTime = Date.now();
  const response = await request.get('/api/users');
  const responseTime = Date.now() - startTime;
  
  expect(responseTime).toBeLessThan(500); // 500ms 内响应
});
```

## 多浏览器测试配置

```javascript
// playwright.config.js
module.exports = {
  projects: [
    {
      name: 'chromium',
      use: { 
        browserName: 'chromium',
        viewport: { width: 1280, height: 720 }
      },
    },
    {
      name: 'firefox',
      use: { browserName: 'firefox' },
    },
    {
      name: 'webkit',
      use: { browserName: 'webkit' },
    },
    {
      name: 'Mobile Chrome',
      use: { 
        browserName: 'chromium',
        viewport: { width: 375, height: 667 },
        userAgent: 'Mozilla/5.0 ... iPhone'
      },
    },
  ],
};
```

## 设计决策

### 为什么 Outside-In？
- **用户导向**: 从用户视角开始
- **接口驱动**: 先定义接口
- **增量实现**: 逐层向内

### 为什么骨架先行？
- **结构**: 清晰的测试结构
- **文档**: 测试即文档
- **并行**: 团队可并行工作

### 为什么 POM？
- **维护**: UI 变更隔离
- **复用**: 页面操作复用
- **清晰**: 测试意图清晰

### 为什么分层测试？
- **速度**: 单元测试快速
- **覆盖**: 集成测试覆盖交互
- **信心**: E2E 测试提供完整信心
