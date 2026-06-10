---
description: Story Mapping to BDD conversion
---

# Command: /stdd:story

## Usage
```
chaos story <action>              # Story mapping action
chaos story create                # Create user story map
chaos story convert               # Convert to BDD
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
