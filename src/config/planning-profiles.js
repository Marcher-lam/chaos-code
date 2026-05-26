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



// Condition engine for profile-adaptive workflow branching
const CONDITION_ENGINE = {
  evaluate(condition, context) {
    if (!condition) return true;
    const checks = {
      'complexity>30': () => (context.complexityScore || 0) > 30,
      'complexity>60': () => (context.complexityScore || 0) > 60,
      'complexity>80': () => (context.complexityScore || 0) > 80,
      'certainty<70': () => (context.certaintyScore || 80) < 70,
      'certainty>90': () => (context.certaintyScore || 80) > 90,
      'files>50': () => (context.fileCount || 0) > 50,
      'files>100': () => (context.fileCount || 0) > 100,
      'tests<10': () => (context.testFileCount || 0) < 10,
      'hasDesignMD': () => context.hasDesignMD === true,
      'noDesignMD': () => context.hasDesignMD === false,
      'profile:quick': () => context.profileId === 'quick',
      'profile:standard': () => context.profileId === 'standard',
      'profile:thorough': () => context.profileId === 'thorough',
      'profile:enterprise': () => context.profileId === 'enterprise',
      'changeType:bugfix': () => context.changeType === 'bugfix',
      'changeType:feature': () => context.changeType === 'feature',
      'changeType:refactor': () => context.changeType === 'refactor',
    };
    if (checks[condition]) return checks[condition]();
    // Logical operators: AND, OR
    if (condition.includes('&&')) {
      return condition.split('&&').every(c => CONDITION_ENGINE.evaluate(c.trim(), context));
    }
    if (condition.includes('||')) {
      return condition.split('||').some(c => CONDITION_ENGINE.evaluate(c.trim(), context));
    }
    return true;
  },
};

module.exports = { PROFILES, CHANGE_TYPE_OVERRIDES, STANDARD_PHASES, CONDITION_ENGINE };
