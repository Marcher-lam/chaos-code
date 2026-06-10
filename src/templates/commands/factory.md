---
description: Generate reusable test data factories and fixtures (language-agnostic)
---

# Command: /stdd:factory

## Usage
```bash
chaos factory <change-id>                      # Generate factory
chaos factory <change-id> --entity User        # Specify entity type
chaos factory <change-id> --scenario valid,edge,invalid  # Test scenarios
chaos factory <change-id> --output tests/factories  # Output path
chaos factory <change-id> --faker-type @faker-js/faker  # Faker library
chaos factory <change-id> --workspace packages/api  # Workspace scope
```

## Description
Generate reusable test data factories with Builder pattern, Faker integration, and scenario support (valid/edge/invalid).

## Factory Pattern by Language

### JavaScript/TypeScript
```typescript
export class UserFactory {
  static valid(overrides: Partial<User> = {}): User {
    return {
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      email: faker.internet.email(),
      ...overrides
    };
  }
}
```

### Python
```python
class UserFactory:
    @staticmethod
    def valid(**overrides):
        return {
            'id': fake.uuid4(),
            'name': fake.name(),
            'email': fake.email(),
            **overrides
        }
```

### Go
```go
func ValidUser(opts ...UserOption) *User {
    user := &User{
        ID: gofakeit.UUID(),
        Name: gofakeit.Name(),
        Email: gofakeit.Email(),
    }
    for _, opt := range opts {
        opt(user)
    }
    return user
}
```

## Faker Libraries by Language
| Language | Library | Install |
|----------|---------|---------|
| JavaScript/TypeScript | @faker-js/faker | `npm install @faker-js/faker` |
| Python | Faker | `pip install faker` |
| Java | JavaFaker/DataFaker | Maven/Gradle |
| Go | gofakeit | `go get github.com/brianvoe/gofakeit/v6` |
| Rust | fake | `cargo add fake` |
| C# | Bogus | `dotnet add package Bogus` |
| PHP | FakerPHP/Faker | `composer require fakerphp/faker` |

## Test Scenarios
- **valid**: Normal data meeting all requirements
- **edge**: Boundary values (min/max, empty, zero-length)
- **invalid**: Data violating rules (missing required, wrong format)

## Referenced Skill
- `/stdd:factory`

## Output
- Factory file in `tests/factories/` or equivalent
- Fixture scenarios in `tests/fixtures/`
- Seed configuration for reproducibility

## Related Commands
- `/stdd:spec` - Generate data models
- `/stdd:apply` - Write tests using factories
- `/stdd:mock` - Generate mock services
