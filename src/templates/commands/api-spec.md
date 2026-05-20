---
description: Generate OpenAPI format API specifications
---

# Command: /stdd:api-spec

## Usage
```
stdd api-spec [change]           # Generate API spec for change
stdd api-spec --format=openapi   # Specify output format
stdd api-spec --output=file.yaml # Specify output file
```

## Description
Generates OpenAPI format API specifications and TypeScript type definitions from BDD specifications. Supports multi-endpoint batch generation.

## Execution Flow
1. Read BDD specifications from `stdd/changes/<change>/specs/`
2. Extract API endpoints and data models
3. Generate OpenAPI 3.0 specification
4. Generate TypeScript type definitions
5. Output to specified file or default location

## Output
- OpenAPI YAML specification
- TypeScript type definitions
