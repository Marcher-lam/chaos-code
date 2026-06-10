---
id: stdd.factory
command: /stdd:factory
description: 生成可复用测试数据工厂与场景 fixture（语言无关）
version: "3.0"
category: tdd
phase: implementation
read_only: false
risk_level: medium
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.spec]
next: [stdd.apply]
on_failure: []
inputs:
  - domain types
  - schema
  - 测试场景
outputs:
  - factory 文件
  - fixture scenarios
  - seed 配置
evidence:
  required: true
  path: stdd/changes/<change-id>/evidence/
constitution_articles:
  blocking: []
  warning: [4]
  suggestion: []
graph:
  node_id: stdd.factory
  parallelizable: false
  resumable: true
  checkpoint: per-change
---

# STDD Skill: /stdd:factory

## Purpose
**生成可复用测试数据工厂与场景 fixture**。这是 Chaos Code 的测试数据生成 skill，为 TDD 提供一致、可复用的测试数据。

**核心设计原则：**
- **语言无关**：适用于任何编程语言
- **可复用性**：一次定义，多处使用
- **确定性**：固定 seed，测试可复现
- **场景化**：支持 valid、edge、invalid 场景

## When to Use
- 需要创建测试数据时
- 需要统一测试数据格式时
- 需要支持多种测试场景时
- 需要保证测试可复现时

## 测试数据工厂模式

### 什么是 Factory Pattern？
Factory Pattern 是一种创建测试数据的模式，提供：
- **Builder API**: 链式调用构建复杂对象
- **默认值**: 合理的默认配置
- **可变性**: 覆盖特定字段
- **场景支持**: valid/edge/invalid 场景

### 为什么需要 Factory？
- **一致性**: 所有测试使用相同的数据格式
- **可维护性**: 数据定义集中管理
- **灵活性**: 轻松创建变体
- **可读性**: 测试代码更清晰

## 多语言实现

### JavaScript/TypeScript

```typescript
// factories/user.factory.ts
import { Faker } from '@faker-js/faker';

export class UserFactory {
  static valid(overrides: Partial<User> = {}): User {
    return {
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      email: faker.internet.email(),
      role: 'user',
      ...overrides
    };
  }

  static withAdminRole(): User {
    return this.valid({ role: 'admin' });
  }

  static withInvalidEmail(): User {
    return this.valid({ email: 'invalid-email' });
  }
}

// Usage
const user = UserFactory.valid({ name: 'John' });
```

### Python

```python
# factories/user_factory.py
from faker import Faker

fake = Faker()

class UserFactory:
    @staticmethod
    def valid(**overrides):
        return {
            'id': fake.uuid4(),
            'name': fake.name(),
            'email': fake.email(),
            'role': 'user',
            **overrides
        }

    @staticmethod
    def with_admin_role():
        return UserFactory.valid(role='admin')

    @staticmethod
    def with_invalid_email():
        return UserFactory.valid(email='invalid-email')

# Usage
user = UserFactory.valid(name='John')
```

### Java

```java
// factories/UserFactory.java
import com.github.javafaker.Faker;

public class UserFactory {
    private static final Faker faker = new Faker();

    public static User valid() {
        return valid(new UserOverrides());
    }

    public static User valid(UserOverrides overrides) {
        User user = new User();
        user.setId(faker.internet().uuid());
        user.setName(faker.name().fullName());
        user.setEmail(faker.internet().emailAddress());
        user.setRole("user");
        overrides.apply(user);
        return user;
    }

    public static User withAdminRole() {
        return valid(new UserOverrides().role("admin"));
    }
}

// Usage
User user = UserFactory.valid().name("John");
```

### Go

```go
// factories/user_factory.go
import "github.com/brianvoe/gofakeit"

type UserOption func(*User)

func WithName(name string) UserOption {
    return func(u *User) {
        u.Name = name
    }
}

func WithRole(role string) UserOption {
    return func(u *User) {
        u.Role = role
    }
}

func ValidUser(opts ...UserOption) *User {
    user := &User{
        ID:    gofakeit.UUID(),
        Name:  gofakeit.Name(),
        Email: gofakeit.Email(),
        Role:  "user",
    }
    for _, opt := range opts {
        opt(user)
    }
    return user
}

// Usage
user := ValidUser(WithName("John"))
```

### Rust

```rust
// factories/user_factory.rs
use fake::{Fake, Faker};

pub struct UserBuilder {
    user: User,
}

impl UserBuilder {
    pub fn new() -> Self {
        Self {
            user: User {
                id: Faker.fake::<Uuid>(),
                name: Faker.fake::<String>(),
                email: Faker.fake::<String>(),
                role: "user".to_string(),
            }
        }
    }

    pub fn name(mut self, name: String) -> Self {
        self.user.name = name;
        self
    }

    pub fn role(mut self, role: String) -> Self {
        self.user.role = role;
        self
    }

    pub fn build(self) -> User {
        self.user
    }
}

// Usage
let user = UserBuilder::new().name("John".to_string()).build();
```

### C#

```csharp
// Factories/UserFactory.cs
using Bogus;

public static class UserFactory
{
    private static readonly Faker<User> Faker = new Faker<User>()
        .RuleFor(u => u.Id, f => f.Random.Guid())
        .RuleFor(u => u.Name, f => f.Person.FullName)
        .RuleFor(u => u.Email, f => f.Person.Email)
        .RuleFor(u => u.Role, "user");

    public static User Valid(Action<UserCustomizer> customize = null)
    {
        var user = Faker.Generate();
        customize?.Invoke(new UserCustomizer(user));
        return user;
    }

    public static User WithAdminRole()
    {
        return Valid(u => u.Role = "admin");
    }
}

// Usage
var user = UserFactory.Valid(u => u.Name = "John");
```

### PHP

```php
// factories/UserFactory.php
use Faker\Factory as Faker;

class UserFactory
{
    private static $faker;

    public static function valid(array $overrides = []): array
    {
        if (!self::$faker) {
            self::$faker = Faker::create();
        }

        return array_merge([
            'id' => self::$faker->uuid(),
            'name' => self::$faker->name(),
            'email' => self::$faker->email(),
            'role' => 'user',
        ], $overrides);
    }

    public static function withAdminRole(): array
    {
        return self::valid(['role' => 'admin']);
    }
}

// Usage
$user = UserFactory::valid(['name' => 'John']);
```

## 测试场景

### Valid 场景
符合所有规则的正常数据：
- 必填字段完整
- 格式正确
- 值在有效范围内

### Edge 场景
边界值测试：
- 最小值/最大值
- 空值
- 零长度字符串
- 最大长度字符串

### Invalid 场景
不符合规则的数据：
- 必填字段缺失
- 格式错误
- 值超出范围

## CLI Runtime

```bash
# 生成工厂文件
chaos factory <change-id>

# 指定实体类型
chaos factory <change-id> --entity User

# 指定场景
chaos factory <change-id> --scenario valid,edge,invalid

# 指定输出路径
chaos factory <change-id> --output tests/factories

# 使用特定 Faker 库
chaos factory <change-id> --faker-type @faker-js/faker

# Workspace 支持
chaos factory <change-id> --workspace packages/api
```

## 多语言 Faker 库

| 语言 | Faker 库 | 安装命令 |
|------|----------|----------|
| JavaScript/TypeScript | [@faker-js/faker](https://fakerjs.dev/) | `npm install @faker-js/faker` |
| Python | [Faker](https://faker.readthedocs.io/) | `pip install faker` |
| Java | [JavaFaker](https://github.com/datafaker-net/datafaker) | Maven/Gradle |
| Go | [gofakeit](https://github.com/brianvoe/gofakeit) | `go get github.com/brianvoe/gofakeit/v6` |
| Rust | [fake](https://github.com/cksac/fake-rs) | `cargo add fake` |
| C# | [Bogus](https://github.com/bchavez/Bogus) | `dotnet add package Bogus` |
| PHP | [Faker](https://github.com/FakerPHP/Faker) | `composer require fakerphp/faker` |
| Ruby | [Faker](https://github.com/faker-ruby/faker) | `gem install faker` |

## Seed 管理

### 为什么需要固定 Seed？
- **可复现性**: 相同 seed 生成相同数据
- **调试**: 在 CI 和本地生成相同数据
- **稳定性**: 避免随机测试失败

### 多语言 Seed 设置
```javascript
// JavaScript/TypeScript
import { Faker } from '@faker-js/faker';
const faker = new Faker({ locale: 'zh_CN' });
faker.seed(12345);
```

```python
# Python
from faker import Faker
fake = Faker()
Faker.seed(12345)
```

```java
// Java
Faker faker = new Faker();
faker.seed(12345);
```

```go
// Go
gofakeit.Seed(12345)
```

```rust
// Rust
let user = fake::Faker::with_seed(12345).fake::<User>();
```

```csharp
// C#
Randomizer.Seed = new Random(12345);
```

## Graph Semantics
- 节点 ID 为 stdd.factory，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-change；resumable=true；parallelizable=false。
- 依赖 spec，为 apply 提供测试数据。

## Constitution Gates
- **Warning 条例 4 (Code Style)**: 工厂代码应遵循代码规范

## Evidence Contract
- 工厂文件写入 `tests/factories/` 或相应目录
- 场景配置写入 `tests/fixtures/`
- Seed 配置写入测试配置文件

## Related Skills
- **stdd.spec** - 生成数据模型规格
- **stdd.apply** - 使用工厂数据编写测试
- **stdd.mock** - 生成 Mock 服务

## 参考资源

### Factory Pattern
- [Test Data Builders - Martin Fowler](https://martinfowler.com/bliki/TestDataBuilder.html)
- [Factory Pattern in Testing](https://testing.googleblog.com/2015/02/testing-state-of-affairs-2015-edition.html)

### Faker Libraries
- [@faker-js/faker](https://fakerjs.dev/) - JavaScript/TypeScript
- [Faker (Python)](https://faker.readthedocs.io/)
- [DataFaker (Java)](https://www.datafaker.net/)

### Test Fixtures
- [pytest fixtures](https://docs.pytest.org/en/stable/fixture.html)
- [JUnit 5 Parameterized Tests](https://junit.org/junit5/docs/current/user-guide/#writing-tests-parameterized-tests)

## 设计决策

### 为什么使用 Factory 而不是硬编码数据？
- **灵活性**: 轻松创建数据变体
- **一致性**: 数据格式统一
- **可维护性**: 数据定义集中

### 为什么需要固定 Seed？
- **可复现**: CI 和本地结果一致
- **调试**: 稳定的失败用例
- **稳定性**: 避免随机性导致的测试失败

### 为什么支持多种场景？
- **覆盖全面**: valid/edge/invalid 全覆盖
- **清晰意图**: 测试意图明确
- **可扩展**: 易于添加新场景
