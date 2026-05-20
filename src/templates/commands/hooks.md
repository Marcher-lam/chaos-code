---
description: Hook system management
---

# Command: /stdd:hooks

## Usage
```
stdd hooks install               # Install hooks
stdd hooks verify                # Verify hooks
stdd hooks status                # Check status
stdd hooks disable               # Disable hooks
stdd hooks enable                # Re-enable hooks
```

## Description
Manages STDD Hook system (Pre/Post ToolUse) for multiple AI engines.

## Execution Flow
1. Detect AI engine type
2. Copy hook files to engine directory
3. Configure hook execution
4. Verify installation

## Output
- Hook installation status
- Verification results
