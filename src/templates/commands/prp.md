---
description: What/Why/How/Success structured planning
---

# Command: /stdd:prp

## Usage
```
chaos prp create "<title>"                    # Create PRP document
chaos prp list                                # List all PRPs
chaos prp show <title>                        # Show specific PRP
chaos prp validate <title>                    # Validate PRP completeness
chaos prp template                            # Show PRP template
```

## Description
Generate structured planning document using What/Why/How/Success framework for clear requirement communication.

## Execution Flow
1. Parse title and optional content
2. Create PRP with template
3. Fill in What/Why/How sections
4. Define success criteria
5. Save to `stdd/prp/` directory

## Output
- PRP document in `stdd/prp/{date}-{title}.md`
- Structured requirement communication
- Stakeholder alignment artifact
