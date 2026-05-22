---
id: stdd.api-spec
command: /stdd:api-spec
description: 从 BDD 规格生成多语言 OpenAPI 规范、类型定义、Mock 与验证器
version: "4.0"
category: spec-first
phase: specification
read_only: false
risk_level: medium
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.spec]
next: [stdd.contract, stdd.plan, stdd.mock]
on_failure: []
inputs:
  - BDD specs (*.feature)
  - schema 约束
  - workspace
  - target language (自动检测或手动指定)
outputs:
  - api-spec.yaml / api-spec.json
  - types/* (语言特定)
  - mocks/* (语言特定)
  - validators/* (语言特定)
  - validation report
evidence:
  required: true
  path: stdd/changes/<change-id>/evidence/
constitution_articles:
  blocking: [7]
  warning: []
  suggestion: []
graph:
  node_id: stdd.api-spec
  parallelizable: false
  resumable: true
  checkpoint: per-change
---

# STDD Skill: /stdd:api-spec

## Purpose
从 BDD 规格生成**语言无关的 OpenAPI 规范**以及**多语言的类型定义、Mock 代码和验证器**。这是 STDD Copilot 的 Spec-First + TDD CLI skill，支持任何编程语言和框架。

**核心设计原则：**
- OpenAPI 规范作为**单一真实来源** (Single Source of Truth)
- 语言检测自动化，可手动覆盖
- 每种语言都有对应的生成器
- 遵循各语言生态的最佳实践

## When to Use
- 需要执行 /stdd:api-spec 对应能力时。
- greenfield 项目用于建立或推进规范化工作流。
- brownfield 项目先读取现有代码、测试、README 和约定后再行动。
- monorepo 中使用 --workspace <path-or-package> 限定作用域。
- 需要生成类型安全的 API 客户端代码时。

## Preconditions
- 已在仓库根或目标 workspace 中运行 stdd init；只读技能例外但仍应识别项目状态。
- 明确 <change-id>、scope 或 topic；未明确时先询问或运行 stdd status / stdd recommend。
- 不得伪造 evidence；缺失测试、mutation 或 Constitution 结果必须显式标记。

## Inputs
- BDD specs (*.feature)
- schema 约束
- workspace (可选，monorepo 中)
- target language (自动检测或手动指定)

## Workflow

### 1. 语言检测
自动检测项目编程语言（按优先级）：
1. 手动指定 (`--language` 或 `--lang`)
2. STDD 配置文件 (`stdd.config.yml`)
3. 项目文件检测 (package.json, requirements.txt, pom.xml, go.mod, etc.)
4. 默认: OpenAPI only

### 2. 解析 BDD Specs
从 .feature 文件提取：
- HTTP 方法和路径 (GET /api/users/{id})
- 请求体 hints (request body, payload)
- 响应状态码和 body (200 OK, 404 NotFound)
- 路径参数、查询参数、请求头
- JSON 示例（从 Then 步骤中提取）

### 3. 生成 OpenAPI 3.x 规范 (语言无关)
```bash
stdd api-spec <change-id>
# 生成: stdd/changes/<change-id>/specs/api-spec.yaml
```

产物示例：
```yaml
openapi: 3.0.0
info:
  title: API Spec for <change-id>
  version: 0.1.0
paths:
  /api/users:
    get:
      summary: List users
      responses:
        '200':
          description: Successful response
components:
  schemas:
    User:
      type: object
      properties:
        id: { type: integer }
        name: { type: string }
```

### 4. 生成语言特定产物

#### TypeScript/JavaScript (--language ts)
```bash
stdd api-spec <change-id> --language ts --full
```

产物结构：
```
stdd/changes/<change-id>/specs/
├── api-spec.yaml
├── types/
│   └── api-types.ts       # TypeScript interfaces (零运行时开销)
├── client/
│   ├── react-query.ts     # React Query hooks (type-safe)
│   ├── swr.ts             # SWR hooks
│   ├── vue-query.ts       # Vue Query hooks
│   ├── svelte-query.ts    # Svelte Query hooks
│   └── fetch-client.ts    # 原生 fetch wrapper
├── mocks/
│   ├── msw-handlers.ts    # MSW handlers
│   └── faker-fixtures.ts  # Faker.js 自动生成测试数据
└── validators/
    └── zod-schemas.ts     # Zod schemas (运行时验证)
```

**框架原生支持 (取自 Orval):**
- React Query / TanStack Query
- SWR
- Vue Query
- Svelte Query
- Solid Query
- Angular HttpClient
- Axios interceptors

**灵感来源:** Orval, openapi-typescript

**新增能力:**
- 自动生成响应式 hooks（stale-while-revalidate 策略）
- 自动 MSW handlers + Faker.js 随机数据
- Zod 运行时验证（与 TS 类型双保险）
- 零运行时类型推断（使用 TypeScript 类型推导）

#### Python (--language py)
```bash
stdd api-spec <change-id> --language py --full
```

产物结构：
```
stdd/changes/<change-id>/specs/
├── api-spec.yaml
├── types/
│   └── models.py          # Pydantic models / dataclasses
├── mocks/
│   └── fixtures.py        # pytest fixtures / responses
└── validators/
    └── schemas.py         # Pydantic validators (built-in)
```

**灵感来源:** Pydantic, pydantic-openapi, datamodel-code-generator

#### Java (--language java)
```bash
stdd api-spec <change-id> --language java --full
```

产物结构：
```
stdd/changes/<change-id>/specs/
├── api-spec.yaml
├── types/
│   └── User.java          # POJOs / Records
├── mocks/
│   └── MockServer.java    # WireMock stubs
└── validators/
    └── UserValidator.java # Bean Validation annotations
```

**灵感来源:** OpenAPI Generator, Springdoc

#### Go (--language go)
```bash
stdd api-spec <change-id> --language go --full
```

产物结构：
```
stdd/changes/<change-id>/specs/
├── api-spec.yaml
├── types/
│   └── types.go           # Go structs
├── mocks/
│   └── handlers_test.go   # httptest handlers
└── validators/
    └── validators.go      # validator library tags
```

**灵感来源:** oapi-codegen, go-swagger

#### C# (--language csharp)
```bash
stdd api-spec <change-id> --language csharp --full
```

产物结构：
```
stdd/changes/<change-id>/specs/
├── api-spec.yaml
├── types/
│   └── User.cs            # Classes / Records
├── mocks/
│   └── MockServer.cs      # NSubstitute / Moq
└── validators/
    └── UserValidator.cs   # Data Annotations
```

**灵感来源:** NSwag, Swashbuckle

#### Rust (--language rust)
```bash
stdd api-spec <change-id> --language rust --full
```

产物结构：
```
stdd/changes/<change-id>/specs/
├── api-spec.yaml
├── types/
│   └── types.rs           # Structs with serde derives
├── mocks/
│   └── handlers_test.rs   # Mock HTTP responses
└── validators/
    └── validators.rs      # serde validators
```

**灵感来源:** proteus,.openapi

#### PHP (--language php)
```bash
stdd api-spec <change-id> --language php --full
```

产物结构：
```
stdd/changes/<change-id>/specs/
├── api-spec.yaml
├── types/
│   └── UserDTO.php        # DTO classes
├── mocks/
│   └── MockHandler.php    # PHPUnit mocks
└── validators/
    └── UserValidator.php  # Symfony/Laravel validation
```

**灵感来源:** json-schema-php-generator, openapi-code-generator

## CLI Runtime

```bash
# 基础用法 - 只生成 OpenAPI spec (语言无关)
stdd api-spec <change-id>

# 自动检测语言并生成完整产物
stdd api-spec <change-id> --full

# 指定目标语言
stdd api-spec <change-id> --language python
stdd api-spec <change-id> --lang go

# 生成特定类型的产物
stdd api-spec <change-id> --language rust --types-only
stdd api-spec <change-id> --language java --mocks-only

# 指定输出目录
stdd api-spec <change-id> --output-dir src/api

# 指定框架/库 (取自 Orval + OpenAPI Generator)
stdd api-spec <change-id> --language ts --framework react-query  # React Query hooks
stdd api-spec <change-id> --language ts --framework swr          # SWR hooks
stdd api-spec <change-id> --language ts --framework vue-query    # Vue Query hooks
stdd api-spec <change-id> --language ts --framework angular      # Angular HttpClient
stdd api-spec <change-id> --language py --framework fastapi     # FastAPI 路由
stdd api-spec <change-id> --language java --framework spring     # Spring Boot

# 自定义模板 (取自 OpenAPI Generator)
stdd api-spec <change-id> --template-dir ./templates

# Monorepo workspace
stdd api-spec <change-id> --workspace packages/api

# 验证现有 API spec 与 BDD 一致性
stdd api-spec <change-id> --validate-existing

# 输出格式
stdd api-spec <change-id> --format json

# 集成插件 (取自 OpenAPI Generator)
stdd api-spec <change-id> --plugin maven       # Maven 插件集成
stdd api-spec <change-id> --plugin gradle      # Gradle 插件集成
stdd api-spec <change-id> --plugin bazel       # Bazel 插件集成

# IoC 模式 (取自 OpenAPI Generator)
stdd api-spec <change-id> --ioc                # Inversion of Control，保留业务逻辑代码
```

## Graph Semantics
- 节点 ID 为 stdd.api-spec，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-change；resumable=true；parallelizable=false。
- Graph 必须尊重 depends_on/next，不得越过 confirm、verify、archive 等 gate。

## Constitution Gates
- Blocking 条例失败时停止并返回修复建议。
- Warning 条例必须在报告中列出，可由用户决定是否继续。
- Suggestion 条例用于改进可维护性和文档质量，不应伪装成已完成工作。

## Evidence Contract
- 默认证据路径：stdd/changes/<change-id>/evidence/
- 变更级 evidence 使用 stdd/changes/<change-id>/evidence/；全局 guard/audit 使用 stdd/evidence/。
- 证据文件应包含 command、timestamp、workspace、input summary、result、exit code 和关键 stdout/stderr 摘要。
- 生成的产物清单（OpenAPI、语言、产物类型）

## Error Handling
- 缺少 STDD 初始化时提示 stdd init。
- 缺少 change-id 时列出 stdd list / stdd status 的下一步。
- 连续失败 3 次触发熔断，生成或建议 stdd fix-packet <change-id>。
- workspace 不存在时提示 stdd workspace validate / repair。
- BDD 场景中缺少必要信息时给出警告和修复建议。
- 不支持的语言时给出建议和替代方案。

## Outputs

### 产物结构 (语言无关)
```
stdd/changes/<change-id>/
├── specs/
│   ├── api-spec.yaml           # OpenAPI 3.x 规范 (语言无关)
│   └── <language>/             # 语言特定目录
│       ├── types/              # 类型定义
│       ├── mocks/              # Mock 代码
│       └── validators/         # 验证器
└── evidence/
    └── api-spec.json           # 生成证据
```

## Related Skills
- **stdd.contract** - 消费者驱动契约测试 (Pact)
- **stdd.mock** - Mock、Stub 与 Fake 生成
- **stdd.schema** - JSON Schema 与语言特定验证
- **stdd.plan** - 技术设计和 TDD tasks

## 设计决策

### 为什么以 OpenAPI 为核心？
- **语言无关**: JSON/YAML 格式，所有语言都能解析
- **生态成熟**: 大量工具支持 (swagger, redoc, etc.)
- **标准化**: 行业标准，便于团队协作

### 为什么支持多语言？
- STDD 是**通用 TDD 工具**，不绑定特定技术栈
- 不同团队使用不同语言 (前端 TS, 后端 Go/Python/Java)
- 多语言项目需要统一的 API 规范

### 语言检测策略
1. **用户明确指定** - 最高优先级
2. **配置文件** - stdd.config.yml 中的 language 字段
3. **文件检测** - package.json (TS), requirements.txt (Python), pom.xml (Java)
4. **默认** - 只生成 OpenAPI spec

### 未来扩展
- 支持更多语言 (Ruby, Kotlin, Scala, Elixir, etc.)
- 框架特定生成器 (FastAPI, Spring Boot, Gin, etc.)
- 客户端 SDK 生成 (React Query hooks, axios wrappers, etc.)

## 参考工具 (按语言)

| 语言 | 类型生成 | Mock 生成 | 验证器 | OpenAPI 工具 |
|------|---------|----------|--------|-------------|
| TypeScript | openapi-typescript | MSW | Zod | Orval |
| Python | datamodel-code-generator | pytest-responses | Pydantic | pydantic-openapi |
| Java | OpenAPI Generator | WireMock | Bean Validation | Springdoc |
| Go | oapi-codegen | httptest | validator | go-swagger |
| C# | NSwag | Moq/NSubstitute | Data Annotations | Swashbuckle |
| Rust | proteus | httptest | serde | openapi |
| PHP | json-schema-php-generator | PHPUnit | Symfony Validator | openapi-code-generator |
