/**
 * Planning Profiles
 * Adaptive planning depth profiles that unify complexity analysis and certainty scoring.
 */

const PROFILES = {
  quick: {
    id: 'quick',
    name: 'Quick',
    depth: 1,
    description: 'Bugfix/hotfix: minimal ceremony, fast turnaround',
    phases: {
      skip: ['clarify', 'mutation', 'adr', 'security-audit', 'multi-role-review', 'full-docs'],
      require: ['verify', 'test'],
    },
    phaseConfig: {
      maxTasks: 3,
      reviewRounds: 1,
      requireMutation: false,
      requireADR: false,
      requireSecurityAudit: false,
      requireMultiRoleReview: false,
      requireFullDocs: false,
      testThreshold: 80,
      clarifyRequired: false,
      planRequired: false,
    },
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    depth: 2,
    description: 'Normal features: full lifecycle with optional mutation and clarify',
    phases: {
      skip: ['adr', 'security-audit', 'multi-role-review', 'full-docs'],
      require: ['spec', 'plan', 'verify', 'test'],
    },
    phaseConfig: {
      maxTasks: 6,
      reviewRounds: 2,
      requireMutation: false,
      requireADR: false,
      requireSecurityAudit: false,
      requireMultiRoleReview: false,
      requireFullDocs: false,
      testThreshold: 90,
      clarifyRequired: false,
      planRequired: true,
    },
  },
  thorough: {
    id: 'thorough',
    name: 'Thorough',
    depth: 3,
    description: 'Complex features/architecture: mandatory mutation + ADR + multi-role review',
    phases: {
      skip: ['security-audit', 'full-docs'],
      require: ['clarify', 'spec', 'plan', 'mutation', 'adr', 'multi-role-review', 'verify', 'test'],
    },
    phaseConfig: {
      maxTasks: 9,
      reviewRounds: 3,
      requireMutation: true,
      requireADR: true,
      requireSecurityAudit: false,
      requireMultiRoleReview: true,
      requireFullDocs: false,
      testThreshold: 95,
      clarifyRequired: true,
      planRequired: true,
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    depth: 4,
    description: 'Cross-cutting/compliance: full docs + security audit + Constitution enforcement',
    phases: {
      skip: [],
      require: ['clarify', 'spec', 'plan', 'mutation', 'adr', 'security-audit', 'multi-role-review', 'full-docs', 'verify', 'test', 'constitution-check'],
    },
    phaseConfig: {
      maxTasks: 12,
      reviewRounds: 4,
      requireMutation: true,
      requireADR: true,
      requireSecurityAudit: true,
      requireMultiRoleReview: true,
      requireFullDocs: true,
      testThreshold: 98,
      clarifyRequired: true,
      planRequired: true,
    },
  },
};

const CHANGE_TYPE_OVERRIDES = {
  hotfix: 'quick',
  bugfix: 'quick',
  fix: 'quick',
  feature: 'standard',
  enhancement: 'standard',
  refactor: 'thorough',
  architecture: 'thorough',
  migration: 'thorough',
  compliance: 'enterprise',
  security: 'enterprise',
  audit: 'enterprise',
};

const STANDARD_PHASES = [
  'propose',
  'clarify',
  'confirm',
  'spec',
  'plan',
  'execute',
  'mutation',
  'adr',
  'security-audit',
  'multi-role-review',
  'verify',
  'test',
  'full-docs',
  'constitution-check',
  'archive',
];

module.exports = { PROFILES, CHANGE_TYPE_OVERRIDES, STANDARD_PHASES };
