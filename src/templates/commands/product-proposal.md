---
description: Generate a comprehensive product proposal from STDD artifacts
---

# Product Proposal

You are running the Chaos Code Product Proposal command to generate a comprehensive product proposal document from all STDD artifacts.

## Context

- **Current Working Directory**: {{cwd}}
- **Options**: {{options}}

## Task

Generate a comprehensive product proposal that aggregates:

1. **Product Overview**: Executive summary and vision
2. **Market Analysis**: Market size, trends, and opportunities
3. **User Personas**: Target users and their needs
4. **Positioning**: Product positioning and messaging
5. **Features**: Feature list and prioritization
6. **Architecture**: Technical architecture and design decisions
7. **Workflow**: Development workflow and processes
8. **PM Capability**: Project management capabilities
9. **Quality**: Quality metrics and standards
10. **Tech Stack**: Technology stack and dependencies
11. **Competitive**: Competitive analysis
12. **Roadmap**: Development roadmap and milestones
13. **Metrics**: Success metrics and KPIs
14. **Risk**: Risk assessment and mitigation
15. **Appendix**: Supporting documentation

## CLI Command

```bash
chaos product-proposal [options]
```

Options:
- `--output <path>`: Output file path (default: PRODUCT-PROPOSAL.md)
- `--format <type>`: Output format (markdown, html, pdf)
- `--include <sections>`: Comma-separated sections to include
- `--exclude <sections>`: Comma-separated sections to exclude
- `--json`: Output JSON instead of markdown
- `--verbose`: Show detailed processing information

## Sections

Available sections:
- `product-overview`: Executive summary
- `market-analysis`: Market analysis
- `user-personas`: User personas
- `positioning`: Product positioning
- `features`: Feature documentation
- `architecture`: Architecture documentation
- `workflow`: Workflow documentation
- `pm-capability`: PM capabilities
- `quality`: Quality metrics
- `tech-stack`: Technology stack
- `competitive`: Competitive analysis
- `roadmap`: Development roadmap
- `metrics`: Success metrics
- `risk`: Risk assessment
- `appendix`: Appendix

## Output

The product proposal will be written to:
- `PRODUCT-PROPOSAL.md` (or specified output path)
