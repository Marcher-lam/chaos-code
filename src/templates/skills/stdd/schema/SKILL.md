---
id: stdd.schema
command: /stdd:schema
description: 生成和验证 JSON Schema、Zod 与类型约束（语言无关）
version: "3.0"
category: spec-first
phase: specification
read_only: false
risk_level: medium
supports:
  greenfield: true
  brownfield: true
  monorepo: true
depends_on: [stdd.spec]
next: [stdd.plan]
on_failure: []
inputs:
  - 类型名/字段
  - spec 约束
  - schema 文件
outputs:
  - JSON Schema
  - Zod schema
  - schema validation report
evidence:
  required: true
  path: stdd/changes/<change-id>/evidence/
constitution_articles:
  blocking: []
  warning: [4, 6]
  suggestion: []
graph:
  node_id: stdd.schema
  parallelizable: false
  resumable: true
  checkpoint: per-change
---

# STDD Skill: /stdd:schema

## Purpose
**生成和验证 JSON Schema、Zod 与类型约束**。这是 Chaos Code 的 Schema skill，提供跨语言的数据结构定义和验证。

**核心设计原则：**
- **语言无关**：支持多种 schema 格式
- **类型安全**：强类型约束
- **可验证**：运行时验证
- **可转换**：格式互转

## When to Use
- 需要定义数据结构时
- 需要验证输入数据时
- 需要生成类型定义时
- 需要跨语言共享 schema 时

## Schema 格式

### JSON Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "email", "name"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid"
    },
    "email": {
      "type": "string",
      "format": "email"
    },
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100
    },
    "age": {
      "type": "integer",
      "minimum": 0,
      "maximum": 150
    }
  }
}
```

### Zod (TypeScript)
```typescript
import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  age: z.number().int().min(0).max(150).optional(),
});

export type User = z.infer<typeof UserSchema>;
```

### 其他语言 Schema

#### Python (Pydantic)
```python
from pydantic import BaseModel, EmailStr, Field
from uuid import UUID

class User(BaseModel):
    id: UUID
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=100)
    age: int | None = Field(None, ge=0, le=150)
```

#### Java (JSON Schema Annotation)
```java
import javax.validation.constraints.*;

public class User {
    @NotNull
    private String id;
    
    @Email
    @NotNull
    private String email;
    
    @Size(min = 1, max = 100)
    @NotNull
    private String name;
    
    @Min(0) @Max(150)
    private Integer age;
}
```

#### Go (validator)
```go
type User struct {
    ID    string `json:"id" validate:"required,uuid"`
    Email string `json:"email" validate:"required,email"`
    Name  string `json:"name" validate:"required,min=1,max=100"`
    Age   int    `json:"age" validate:"min=0,max=150"`
}
```

#### Rust (serde + validator)
```rust
use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct User {
    #[validate(length(min = 1))]
    pub id: String,
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 1, max = 100))]
    pub name: String,
    #[validate(range(min = 0, max = 150))]
    pub age: Option<u8>,
}
```

## CLI Runtime

```bash
# 创建 schema
chaos schema create User

# 验证 schema
chaos schema validate schemas/

# Fork 现有 schema
chaos schema fork User UserWithRole

# 从 spec 生成
chaos schema generate --from-spec <change-id>

# 转换格式
chaos schema convert user.schema.json --to zod
chaos schema convert user.schema.json --to pydantic

# Workspace 支持
chaos schema create User --workspace packages/api
```

## Schema 操作

### 创建
```bash
chaos schema create User \
  --field id:uuid:required \
  --field email:string:email:required \
  --field name:string:min=1,max=100:required
```

### 验证
```bash
chaos schema validate schemas/user.schema.json
chaos schema validate --data user-data.json
```

### 转换
```bash
chaos schema convert user.json-schema --to zod
chaos schema convert user.json-schema --to pydantic
chaos schema convert user.json-schema --to java
```

## Graph Semantics
- 节点 ID 为 stdd.schema，由 frontmatter 暴露给 Skill Graph。
- checkpoint=per-change；resumable=true；parallelizable=false。

## Constitution Gates
- **Warning 条例 4 (Code Style)**: Schema 应遵循代码风格
- **Warning 条例 6 (Error Handling)**: Schema 应包含验证规则

## Evidence Contract
- Schema 文件写入 `schemas/` 或相应目录
- 验证报告写入 `stdd/changes/<change-id>/evidence/schema-*.json`

## Related Skills
- **stdd.spec** - 输入规格
- **stdd.plan** - 使用 schema
- **stdd.api-spec** - OpenAPI 集成

## 参考资源

### Schema 标准
- [JSON Schema](https://json-schema.org/)
- [OpenAPI Schema](https://swagger.io/specification/)
- [Zod](https://zod.dev/)

### 验证库
| 语言 | 验证库 |
|------|--------|
| JavaScript/TypeScript | Zod, Joi, Yup |
| Python | Pydantic, Marshmallow |
| Java | Hibernate Validator, Jakarta |
| Go | validator, go-playground |
| Rust | validator, garde |

## 设计决策

### Why Schema？
- **类型安全**: 编译时和运行时检查
- **文档**: Schema 即文档
- **验证**: 自动数据验证

### Why 多格式？
- **兼容**: 不同语言不同偏好
- **转换**: 跨语言共享
- **选择**: 团队选择适合的
