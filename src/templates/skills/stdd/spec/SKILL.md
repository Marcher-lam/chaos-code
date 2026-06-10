---
id: stdd.spec
command: /stdd:spec
description: 从已确认需求生成可测试 BDD delta specs（语言无关）
version: "3.0"
category: lifecycle
phase: specification
read_only: false
risk_level: medium
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.confirm]
next: [stdd.validate, stdd.plan]
on_failure: []
inputs:
  - proposal.md
  - .status.yaml
  - 领域边界
outputs:
  - stdd/changes/<change-id>/specs/*.feature
  - spec evidence
evidence:
  required: true
  path: stdd/changes/<change-id>/evidence/
constitution_articles:
  blocking: []
  warning: [5, 6]
  suggestion: []
graph:
  node_id: stdd.spec
  parallelizable: false
  resumable: true
  checkpoint: per-change
---

# STDD Skill: /stdd:spec

## Purpose
**从已确认需求生成可测试 BDD delta specs**。这是 Chaos Code 的规格 skill，使用 BDD 格式编写行为规格。

**核心设计原则：**
- **语言无关**：BDD 适用于任何编程语言
- **行为驱动**：从用户行为角度描述
- **可测试**：Given/When/Then 格式
- **Delta specs**：只描述变更部分

## When to Use
- 需求确认后需要规格时
- 需要自动化测试场景时
- 需要用户验收标准时
- 需要文档化行为时

## BDD 格式

### Gherkin 语法
```gherkin
Feature: User Authentication
  作为系统用户
  我想要登录系统
  以便访问我的个人数据

  Scenario: 成功登录
    Given 用户已注册
    And 用户在登录页面
    When 用户输入有效的用户名和密码
    And 点击登录按钮
    Then 应该跳转到首页
    And 应该显示欢迎消息

  Scenario: 登录失败
    Given 用户已注册
    And 用户在登录页面
    When 用户输入无效的密码
    Then 应该显示错误消息
    And 保持在登录页面
```

### Delta Specs
```
ADDED - 新功能
MODIFIED - 现有功能变更
REMOVED - 删除功能
```

## CLI Runtime

```bash
# 生成规格
chaos spec <change-id>

# 合并到全局 specs
chaos spec <change-id> --merge

# 指定输出格式
chaos spec <change-id> --format gherkin
chaos spec <change-id> --format markdown

# Workspace 支持
chaos spec <change-id> --workspace packages/api
```

## 多语言 BDD 框架

### JavaScript/TypeScript (Cucumber)
```javascript
// features/login.feature
Feature: User Login

// support/steps.ts
import { Given, When, Then } from '@cucumber/cucumber';

Given('用户已注册', async function () {
  // setup code
});

When('用户输入有效的用户名和密码', async function () {
  // test code
});

Then('应该跳转到首页', async function () {
  // assertion
});
```

### Python (behave)
```python
# features/login.feature
Feature: User Login

# features/steps/login_steps.py
from behave import given, when, then

@given('用户已注册')
def step_impl(context):
    # setup code
    pass

@when('用户输入有效的用户名和密码')
def step_impl(context):
    # test code
    pass

@then('应该跳转到首页')
def step_impl(context):
    # assertion
    pass
```

### Java (JUnit 5 + Cucumber)
```java
// features/login.feature
Feature: User Login

// src/test/java/steps/LoginSteps.java
import io.cucumber.java.en.Given;
import io.cucumber.java.en.When;
import io.cucumber.java.en.Then;

public class LoginSteps {
    @Given("用户已注册")
    public void userRegistered() {
        // setup code
    }

    @When("用户输入有效的用户名和密码")
    public void userEnterCredentials() {
        // test code
    }

    @Then("应该跳转到首页")
    public void shouldRedirectToHome() {
        // assertion
    }
}
```

### Go (godog)
```go
// features/login.feature
Feature: User Login

// steps/login_steps.go
package steps

import (
    "github.com/cucumber/godog"
)

func InitializeScenario(ctx *godog.ScenarioContext) {
    ctx.Given("^用户已注册$", userRegistered)
    ctx.When("^用户输入有效的用户名和密码$", userEnterCredentials)
    ctx.Then("^应该跳转到首页$", shouldRedirectToHome)
}

func userRegistered(ctx context) error {
    // setup code
    return nil
}

func userEnterCredentials(ctx context) error {
    // test code
    return nil
}

func shouldRedirectToHome(ctx context) error {
    // assertion
    return nil
}
```

### Rust (cucumber-rust)
```rust
// features/login.feature
Feature: User Login

// tests/steps/login_steps.rs
use cucumber_rust::{given, when, then};

mod steps {
    #[given("用户已注册")]
    fn user_registered(world: &mut MyWorld) {
        // setup code
    }

    #[when("用户输入有效的用户名和密码")]
    fn user_enter_credentials(world: &mut MyWorld) {
        // test code
    }

    #[then("应该跳转到首页")]
    fn should_redirect_to_home(world: &mut MyWorld) {
        // assertion
    }
}
```

## Spec 类型

### 功能规格
描述系统功能和行为

### 验收规格
定义验收标准和边界条件

### 边界规格
覆盖边界情况和错误场景

## Graph Semantics
- 节点 ID 为 stdd.spec，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-change；resumable=true；parallelizable=false。
- 依赖 confirm，下一步是 validate 和 plan。

## Constitution Gates
- **Warning 条例 5 (Documentation)**: Spec 应清晰描述行为
- **Warning 条例 6 (Error Handling)**: Spec 应包含错误场景

## Evidence Contract
- Spec 文件写入 `stdd/changes/<change-id>/specs/*.feature`
- 证据写入 `stdd/changes/<change-id>/evidence/spec-*.json`

## Related Skills
- **stdd.confirm** - 确认需求
- **stdd.plan** - 生成任务
- **stdd.validate** - 验证规格
- **stdd.outside-in** - Outside-In TDD

## 参考资源

### BDD
- [Cucumber](https://cucumber.io/docs/) - BDD 框架
- [Gherkin Syntax](https://cucumber.io/docs/gherkin/)
- [BDD by Example](https://bddbyexample.com/)

### 测试框架
| 语言 | BDD 框架 |
|------|---------|
| JavaScript/TypeScript | Cucumber, Jest-cucumber |
| Python | behave, pytest-bdd |
| Java | Cucumber-JVM, JUnit 5 |
| Go | godog |
| Rust | cucumber-rust |
| C# | SpecFlow |

## 设计决策

### Why BDD？
- **通用**: 跨语言通用格式
- **可读**: 非技术人员可读
- **可测试**: 直接转换为测试

### Why Delta Specs？
- **聚焦**: 只关注变更
- **简洁**: 减少维护
- **可追溯**: 明确变更范围
