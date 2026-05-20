---
description: Story Mapping to BDD conversion
---

# Command: /stdd:story

## Usage
```
stdd story <action>              # Story mapping action
stdd story create                # Create user story map
stdd story convert               # Convert to BDD
```

## Description
Story Mapping: creates user story maps (journey YAML) and converts to BDD feature files.

## Execution Flow
1. Parse user stories
2. Create journey map
3. Convert to BDD features
4. Output to specs directory

## Output
- Journey YAML
- BDD feature files
