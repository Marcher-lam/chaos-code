/**
 * Agent Contract System
 * Standardized agent role definitions with inputs, outputs, permissions,
 * stop conditions, handoff protocols, and quality gates.
 * Implements Agent Contract from the improvement proposal.
 */

const _fs = require('fs');
const _path = require('path');
const { createLogger } = require('../utils/logger');
const _logger = createLogger('agent-contracts');

const AGENT_CONTRACTS = {
  pm: {
    agent_id: 'pm',
    name: 'Product Manager',
    version: '1.0.0',
    responsibility: [
      'define product vision and goals',
      'prioritize requirements by value',
      'create and maintain product brief',
      'ensure stakeholder alignment',
      'approve requirement scope',
    ],
    inputs: [
      'brainstorm output',
      'user feedback',
      'market research',
      'stakeholder requests',
    ],
    outputs: [
      'stdd/vision/product-vision.md',
      'stdd/vision/product-brief.md',
      'stdd/requirements/prd.md',
    ],
    permissions: {
      can_modify: [
        'stdd/vision/**',
        'stdd/requirements/prd.md',
        'stdd/requirements/user-stories.md',
      ],
      cannot_modify: [
        'src/**',
        'tests/**',
        'stdd/architecture/**',
        'stdd/specs/**',
      ],
    },
    stop_conditions: [
      'product brief reviewed',
      'prd approved by stakeholder',
      'scope boundaries defined',
    ],
    handoff_to: ['analyst', 'architect', 'ux-designer'],
    quality_gates: [
      'requirement_clarity_gate',
      'scope_completeness_gate',
    ],
    risk_areas: ['scope creep', 'ambiguous requirements', 'missing stakeholders'],
  },

  analyst: {
    agent_id: 'analyst',
    name: 'Business Analyst',
    version: '1.0.0',
    responsibility: [
      'clarify and refine requirements',
      'identify edge cases and boundary conditions',
      'create user stories with acceptance criteria',
      'maintain clarification log',
      'validate requirement completeness',
    ],
    inputs: [
      'stdd/requirements/prd.md',
      'stdd/domain/ubiquitous-language.md',
      'user feedback',
    ],
    outputs: [
      'stdd/requirements/clarification-log.md',
      'stdd/requirements/user-stories.md',
      'stdd/requirements/acceptance-criteria.md',
    ],
    permissions: {
      can_modify: [
        'stdd/requirements/**',
      ],
      cannot_modify: [
        'src/**',
        'tests/**',
        'stdd/architecture/**',
      ],
    },
    stop_conditions: [
      'all ambiguities resolved',
      'acceptance criteria defined',
      'edge cases documented',
    ],
    handoff_to: ['domain-expert', 'test-architect'],
    quality_gates: [
      'requirement_clarity_gate',
      'acceptance_criteria_completeness_gate',
    ],
    risk_areas: ['unresolved ambiguities', 'hidden assumptions'],
  },

  'domain-expert': {
    agent_id: 'domain-expert',
    name: 'Domain Expert',
    version: '1.0.0',
    responsibility: [
      'define domain model',
      'establish ubiquitous language',
      'identify bounded contexts',
      'define business rules and invariants',
      'validate domain consistency',
    ],
    inputs: [
      'stdd/requirements/prd.md',
      'stdd/requirements/user-stories.md',
      'business domain knowledge',
    ],
    outputs: [
      'stdd/domain/domain-model.md',
      'stdd/domain/ubiquitous-language.md',
      'stdd/domain/bounded-contexts.md',
      'stdd/domain/business-rules.md',
    ],
    permissions: {
      can_modify: [
        'stdd/domain/**',
      ],
      cannot_modify: [
        'src/**',
        'tests/**',
        'stdd/requirements/**',
      ],
    },
    stop_conditions: [
      'domain model reviewed',
      'bounded contexts defined',
      'business rules documented',
    ],
    handoff_to: ['architect', 'test-architect'],
    quality_gates: [
      'domain_consistency_gate',
      'bounded_context_completeness_gate',
    ],
    risk_areas: ['incorrect abstractions', 'missing business rules'],
  },

  architect: {
    agent_id: 'architect',
    name: 'System Architect',
    version: '1.0.0',
    responsibility: [
      'analyze system boundaries',
      'design architecture',
      'create ADR records',
      'identify technical risks',
      'define dependency map',
    ],
    inputs: [
      'stdd/vision/product-brief.md',
      'stdd/requirements/prd.md',
      'stdd/domain/domain-model.md',
    ],
    outputs: [
      'stdd/architecture/architecture.md',
      'stdd/architecture/adr/*.md',
      'stdd/architecture/dependency-map.md',
      'stdd/architecture/risk-map.md',
    ],
    permissions: {
      can_modify: [
        'stdd/architecture/**',
      ],
      cannot_modify: [
        'src/**',
        'tests/**',
      ],
    },
    stop_conditions: [
      'architecture reviewed',
      'major risks documented',
      'downstream tasks unblocked',
    ],
    handoff_to: ['test-architect', 'developer', 'reviewer'],
    quality_gates: [
      'architecture_consistency_gate',
      'dependency_boundary_check',
      'adr_completeness_check',
    ],
    risk_areas: ['over-engineering', 'under-documented decisions'],
  },

  'ux-designer': {
    agent_id: 'ux-designer',
    name: 'UX Designer',
    version: '1.0.0',
    responsibility: [
      'design user flows',
      'define interaction patterns',
      'create UX specifications',
      'ensure accessibility',
    ],
    inputs: [
      'stdd/requirements/prd.md',
      'stdd/requirements/user-stories.md',
      'user research data',
    ],
    outputs: [
      'stdd/ux/ux-spec.md',
      'stdd/ux/user-flow.md',
      'DESIGN.md',
    ],
    permissions: {
      can_modify: [
        'stdd/ux/**',
        'DESIGN.md',
      ],
      cannot_modify: [
        'src/**',
        'tests/**',
      ],
    },
    stop_conditions: [
      'user flows reviewed',
      'interaction patterns defined',
    ],
    handoff_to: ['developer', 'test-architect'],
    quality_gates: [
      'ux_consistency_gate',
    ],
    risk_areas: ['usability gaps', 'accessibility non-compliance'],
  },

  'test-architect': {
    agent_id: 'test-architect',
    name: 'Test Architect',
    version: '1.0.0',
    responsibility: [
      'design test strategy based on risk assessment',
      'create test matrix',
      'define minimum acceptable test coverage',
      'design mutation testing strategy',
      'define release quality gates',
    ],
    inputs: [
      'stdd/requirements/prd.md',
      'stdd/requirements/acceptance-criteria.md',
      'stdd/architecture/risk-map.md',
      'stdd/specs/features/*.feature',
    ],
    outputs: [
      'stdd/tests/test-strategy.md',
      'stdd/tests/test-matrix.md',
    ],
    permissions: {
      can_modify: [
        'stdd/tests/**',
      ],
      cannot_modify: [
        'src/**',
        'stdd/requirements/**',
        'stdd/architecture/**',
      ],
    },
    stop_conditions: [
      'risk levels assessed',
      'test matrix complete',
      'quality gates defined',
    ],
    handoff_to: ['developer', 'reviewer'],
    quality_gates: [
      'risk_coverage_gate',
      'acceptance_mapping_gate',
    ],
    risk_areas: ['untested critical paths', 'inadequate mutation coverage'],
  },

  developer: {
    agent_id: 'developer',
    name: 'Developer',
    version: '1.0.0',
    responsibility: [
      'implement features using TDD (Ralph Loop)',
      'write tests before implementation',
      'maintain code quality',
      'follow architecture boundaries',
    ],
    inputs: [
      'stdd/specs/features/*.feature',
      'stdd/tasks/task-plan.md',
      'stdd/architecture/architecture.md',
    ],
    outputs: [
      'src/**',
      'tests/**',
    ],
    permissions: {
      can_modify: [
        'src/**',
        'tests/**',
      ],
      cannot_modify: [
        'stdd/requirements/**',
        'stdd/architecture/**',
        'stdd/specs/**',
      ],
    },
    stop_conditions: [
      'all tasks completed',
      'tests passing',
      'code reviewed',
    ],
    handoff_to: ['reviewer', 'test-architect'],
    quality_gates: [
      'red_green_refactor_gate',
      'constitution_gate',
    ],
    risk_areas: ['breaking architecture boundaries', 'insufficient test coverage'],
  },

  reviewer: {
    agent_id: 'reviewer',
    name: 'Code Reviewer',
    version: '1.0.0',
    responsibility: [
      'review code for quality and correctness',
      'check architecture boundary compliance',
      'verify spec-to-code traceability',
      'identify security risks',
    ],
    inputs: [
      'src/**',
      'tests/**',
      'stdd/specs/features/*.feature',
      'stdd/architecture/architecture.md',
    ],
    outputs: [
      'stdd/reviews/review-report.md',
    ],
    permissions: {
      can_modify: [
        'stdd/reviews/**',
      ],
      cannot_modify: [
        'src/**',
        'tests/**',
      ],
    },
    stop_conditions: [
      'review completed',
      'all issues categorized',
    ],
    handoff_to: ['developer', 'security-auditor'],
    quality_gates: [
      'review_completeness_gate',
    ],
    risk_areas: ['missed security issues', 'incomplete review coverage'],
  },

  'security-auditor': {
    agent_id: 'security-auditor',
    name: 'Security Auditor',
    version: '1.0.0',
    responsibility: [
      'threat modeling',
      'vulnerability scanning',
      'dependency security check',
      'security report generation',
    ],
    inputs: [
      'src/**',
      'stdd/architecture/architecture.md',
      'stdd/architecture/risk-map.md',
    ],
    outputs: [
      'stdd/security/security-report.md',
    ],
    permissions: {
      can_modify: [
        'stdd/security/**',
      ],
      cannot_modify: [
        'src/**',
        'tests/**',
      ],
    },
    stop_conditions: [
      'threat model complete',
      'critical vulnerabilities addressed',
    ],
    handoff_to: ['developer', 'release-manager'],
    quality_gates: [
      'security_gate',
      'dependency_risk_gate',
    ],
    risk_areas: ['undetected vulnerabilities', 'outdated dependencies'],
  },

  'devops': {
    agent_id: 'devops',
    name: 'DevOps Engineer',
    version: '1.0.0',
    responsibility: [
      'configure CI/CD pipelines',
      'manage deployment strategies',
      'environment configuration',
      'monitoring and alerting setup',
    ],
    inputs: [
      'stdd/architecture/architecture.md',
      'stdd/requirements/prd.md',
    ],
    outputs: [
      'stdd/devops/ci-report.md',
      'stdd/devops/deployment-plan.md',
    ],
    permissions: {
      can_modify: [
        'stdd/devops/**',
        '.github/**',
        'Dockerfile',
        'docker-compose.yml',
      ],
      cannot_modify: [
        'src/**',
        'tests/**',
      ],
    },
    stop_conditions: [
      'CI pipeline configured',
      'deployment plan reviewed',
    ],
    handoff_to: ['release-manager'],
    quality_gates: [
      'ci_cd_gate',
    ],
    risk_areas: ['deployment failures', 'environment drift'],
  },

  'release-manager': {
    agent_id: 'release-manager',
    name: 'Release Manager',
    version: '1.0.0',
    responsibility: [
      'generate release notes',
      'aggregate evidence for release',
      'sign off on release quality',
      'archive change artifacts',
    ],
    inputs: [
      'stdd/evidence/evidence-ledger.jsonl',
      'stdd/tests/coverage-report.md',
      'stdd/security/security-report.md',
    ],
    outputs: [
      'stdd/archive/delta-spec.md',
      'stdd/archive/change-log.md',
      'stdd/evidence/release-evidence.md',
    ],
    permissions: {
      can_modify: [
        'stdd/archive/**',
        'stdd/evidence/release-evidence.md',
      ],
      cannot_modify: [
        'src/**',
        'tests/**',
      ],
    },
    stop_conditions: [
      'all evidence collected',
      'release notes generated',
      'archive complete',
    ],
    handoff_to: [],
    quality_gates: [
      'evidence_completeness_gate',
      'archive_integrity_gate',
    ],
    risk_areas: ['missing evidence', 'incomplete archive'],
  },
};

class AgentContractRegistry {
  constructor() {
    this.contracts = { ...AGENT_CONTRACTS };
  }

  getContract(agentId) {
    return this.contracts[agentId] || null;
  }

  getAllContracts() {
    return Object.values(this.contracts);
  }

  getContractsForPhase(phase) {
    const phaseAgentMap = {
      discovery: ['pm', 'analyst', 'ux-designer'],
      requirements: ['pm', 'analyst'],
      domain: ['domain-expert', 'analyst'],
      architecture: ['architect', 'domain-expert'],
      specification: ['analyst', 'test-architect'],
      planning: ['developer', 'architect'],
      implementation: ['developer'],
      verification: ['test-architect', 'reviewer', 'security-auditor'],
      archive: ['release-manager'],
    };
    const agentIds = phaseAgentMap[phase] || [];
    return agentIds.map(id => this.contracts[id]).filter(Boolean);
  }

  canModify(agentId, filePath) {
    const contract = this.contracts[agentId];
    if (!contract) return false;

    const normalizedPath = filePath.replace(/\\/g, '/');
    for (const pattern of contract.permissions.cannot_modify) {
      if (this._matchGlob(normalizedPath, pattern)) return false;
    }
    for (const pattern of contract.permissions.can_modify) {
      if (this._matchGlob(normalizedPath, pattern)) return true;
    }
    return false;
  }

  _matchGlob(filePath, pattern) {
    if (pattern.endsWith('/**')) {
      return filePath.startsWith(pattern.slice(0, -3));
    }
    if (pattern.endsWith('/*')) {
      const dir = pattern.slice(0, -2);
      return filePath.startsWith(dir + '/') && filePath.indexOf('/', dir.length + 1) === -1;
    }
    return filePath === pattern;
  }

  getHandoffTargets(agentId) {
    const contract = this.contracts[agentId];
    if (!contract) return [];
    return contract.handoff_to
      .map(id => this.contracts[id])
      .filter(Boolean)
      .map(c => ({
        agent_id: c.agent_id,
        name: c.name,
        responsibility: c.responsibility,
      }));
  }

  renderAgentList() {
    const lines = ['\nAgent Contracts\n'];
    for (const contract of Object.values(this.contracts)) {
      lines.push(`  ${contract.agent_id.padEnd(18)} ${contract.name}`);
      lines.push(`    ${'Inputs:'.padEnd(12)} ${contract.inputs.length} items`);
      lines.push(`    ${'Outputs:'.padEnd(12)} ${contract.outputs.length} items`);
      lines.push(`    ${'Handoff to:'.padEnd(12)} ${contract.handoff_to.join(', ')}`);
      lines.push(`    ${'Quality gates:'.padEnd(12)} ${contract.quality_gates.join(', ')}`);
      lines.push('');
    }
    return lines.join('\n');
  }
}

module.exports = { AgentContractRegistry, AGENT_CONTRACTS };
