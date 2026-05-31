/**
 * Artifact Registry
 * Central registry for STDD artifact types, their dependencies, lifecycle, and validation rules.
 * Implements the Artifact Map from the improvement proposal.
 */

const fs = require('fs');
const path = require('path');
const { createLogger } = require('./logger');
const _logger = createLogger('artifact-registry');

const ARTIFACT_TYPES = {
  'product-vision': {
    id: 'product-vision',
    phase: 'discovery',
    category: 'vision',
    description: 'Long-term project goals and direction',
    directory: 'stdd/vision',
    filename: 'product-vision.md',
    dependsOn: [],
    produces: ['stdd/vision/product-vision.md'],
    requiredFields: ['goal', 'targetUsers', 'successMetrics'],
    optionalFields: ['constraints', 'timeline', 'stakeholders'],
    agents: ['pm', 'analyst'],
    lifecycle: 'project',
  },
  'product-brief': {
    id: 'product-brief',
    phase: 'discovery',
    category: 'vision',
    description: 'Product scope, users, and value proposition',
    directory: 'stdd/vision',
    filename: 'product-brief.md',
    dependsOn: ['product-vision'],
    produces: ['stdd/vision/product-brief.md'],
    requiredFields: ['scope', 'targetUsers', 'valueProposition'],
    optionalFields: ['competitors', 'risks', 'assumptions'],
    agents: ['pm', 'analyst'],
    lifecycle: 'project',
  },
  'prd': {
    id: 'prd',
    phase: 'requirements',
    category: 'requirements',
    description: 'Product Requirements Document with functional and non-functional requirements',
    directory: 'stdd/requirements',
    filename: 'prd.md',
    dependsOn: ['product-brief'],
    produces: ['stdd/requirements/prd.md'],
    requiredFields: ['requirements', 'constraints', 'acceptanceCriteria'],
    optionalFields: ['nonFunctionalRequirements', 'assumptions', 'dependencies'],
    agents: ['pm', 'analyst'],
    lifecycle: 'change',
  },
  'user-stories': {
    id: 'user-stories',
    phase: 'requirements',
    category: 'requirements',
    description: 'User stories with acceptance criteria',
    directory: 'stdd/requirements',
    filename: 'user-stories.md',
    dependsOn: ['prd'],
    produces: ['stdd/requirements/user-stories.md'],
    requiredFields: ['stories'],
    optionalFields: ['priorities', 'estimates'],
    agents: ['analyst', 'pm'],
    lifecycle: 'change',
  },
  'clarification-log': {
    id: 'clarification-log',
    phase: 'requirements',
    category: 'requirements',
    description: 'Structured requirement clarification records',
    directory: 'stdd/requirements',
    filename: 'clarification-log.md',
    dependsOn: ['prd'],
    produces: ['stdd/requirements/clarification-log.md'],
    requiredFields: ['questions', 'answers'],
    optionalFields: ['decisions', 'assumptions'],
    agents: ['analyst'],
    lifecycle: 'change',
  },
  'domain-model': {
    id: 'domain-model',
    phase: 'domain',
    category: 'domain',
    description: 'DDD domain model with entities, value objects, and aggregates',
    directory: 'stdd/domain',
    filename: 'domain-model.md',
    dependsOn: ['prd'],
    produces: ['stdd/domain/domain-model.md'],
    requiredFields: ['entities', 'relationships'],
    optionalFields: ['valueObjects', 'aggregates', 'invariants'],
    agents: ['domain-expert', 'architect'],
    lifecycle: 'project',
  },
  'ubiquitous-language': {
    id: 'ubiquitous-language',
    phase: 'domain',
    category: 'domain',
    description: 'Shared domain glossary with consistent terminology',
    directory: 'stdd/domain',
    filename: 'ubiquitous-language.md',
    dependsOn: ['prd'],
    produces: ['stdd/domain/ubiquitous-language.md'],
    requiredFields: ['terms'],
    optionalFields: ['aliases', 'examples'],
    agents: ['domain-expert', 'analyst'],
    lifecycle: 'project',
  },
  'bounded-contexts': {
    id: 'bounded-contexts',
    phase: 'domain',
    category: 'domain',
    description: 'Bounded context map with context boundaries',
    directory: 'stdd/domain',
    filename: 'bounded-contexts.md',
    dependsOn: ['domain-model'],
    produces: ['stdd/domain/bounded-contexts.md'],
    requiredFields: ['contexts', 'relationships'],
    optionalFields: ['contextMap', 'sharedKernels'],
    agents: ['domain-expert', 'architect'],
    lifecycle: 'project',
  },
  'architecture': {
    id: 'architecture',
    phase: 'architecture',
    category: 'architecture',
    description: 'System architecture with boundaries, dependencies, and tech stack',
    directory: 'stdd/architecture',
    filename: 'architecture.md',
    dependsOn: ['prd', 'domain-model'],
    produces: ['stdd/architecture/architecture.md'],
    requiredFields: ['components', 'boundaries', 'dependencies'],
    optionalFields: ['techStack', 'deployment', 'scalability'],
    agents: ['architect'],
    lifecycle: 'project',
  },
  'adr': {
    id: 'adr',
    phase: 'architecture',
    category: 'architecture',
    description: 'Architecture Decision Records',
    directory: 'stdd/architecture/adr',
    filename: null,
    dependsOn: ['architecture'],
    produces: ['stdd/architecture/adr/*.md'],
    requiredFields: ['context', 'decision', 'consequences'],
    optionalFields: ['status', 'alternatives', 'compliance'],
    agents: ['architect', 'reviewer'],
    lifecycle: 'change',
  },
  'risk-map': {
    id: 'risk-map',
    phase: 'architecture',
    category: 'architecture',
    description: 'Technical risk assessment and mitigation strategies',
    directory: 'stdd/architecture',
    filename: 'risk-map.md',
    dependsOn: ['architecture'],
    produces: ['stdd/architecture/risk-map.md'],
    requiredFields: ['risks', 'likelihood', 'impact'],
    optionalFields: ['mitigations', 'owners', 'timeline'],
    agents: ['architect', 'security-auditor'],
    lifecycle: 'change',
  },
  'feature-spec': {
    id: 'feature-spec',
    phase: 'specification',
    category: 'specs',
    description: 'BDD feature specifications (Given/When/Then)',
    directory: 'stdd/specs/features',
    filename: null,
    dependsOn: ['prd', 'user-stories'],
    produces: ['stdd/specs/features/*.feature'],
    requiredFields: ['scenarios'],
    optionalFields: ['background', 'tags', 'parameters'],
    agents: ['analyst', 'test-architect'],
    lifecycle: 'change',
  },
  'contract-spec': {
    id: 'contract-spec',
    phase: 'specification',
    category: 'specs',
    description: 'Consumer-driven contract specifications',
    directory: 'stdd/specs/contracts',
    filename: null,
    dependsOn: ['feature-spec'],
    produces: ['stdd/specs/contracts/*.json'],
    requiredFields: ['provider', 'consumer', 'interactions'],
    optionalFields: ['metadata', 'version'],
    agents: ['test-architect', 'developer'],
    lifecycle: 'change',
  },
  'test-strategy': {
    id: 'test-strategy',
    phase: 'specification',
    category: 'tests',
    description: 'Risk-driven test strategy and test matrix',
    directory: 'stdd/tests',
    filename: 'test-strategy.md',
    dependsOn: ['feature-spec', 'risk-map'],
    produces: ['stdd/tests/test-strategy.md'],
    requiredFields: ['riskLevels', 'testTypes'],
    optionalFields: ['testMatrix', 'priorities', 'tools'],
    agents: ['test-architect'],
    lifecycle: 'change',
  },
  'test-matrix': {
    id: 'test-matrix',
    phase: 'specification',
    category: 'tests',
    description: 'Requirement-to-test mapping matrix',
    directory: 'stdd/tests',
    filename: 'test-matrix.md',
    dependsOn: ['test-strategy'],
    produces: ['stdd/tests/test-matrix.md'],
    requiredFields: ['requirements', 'testCases'],
    optionalFields: ['riskMapping', 'ownerAssignment'],
    agents: ['test-architect'],
    lifecycle: 'change',
  },
  'task-plan': {
    id: 'task-plan',
    phase: 'planning',
    category: 'tasks',
    description: 'Micro-task breakdown with TDD phase annotations',
    directory: 'stdd/tasks',
    filename: 'task-plan.md',
    dependsOn: ['feature-spec', 'architecture'],
    produces: ['stdd/tasks/task-plan.md'],
    requiredFields: ['tasks'],
    optionalFields: ['estimates', 'dependencies', 'assignees'],
    agents: ['developer', 'architect'],
    lifecycle: 'change',
  },
  'proposal': {
    id: 'proposal',
    phase: 'proposal',
    category: 'changes',
    description: 'Change proposal with scope, approach, and risks',
    directory: 'stdd/changes/{change}',
    filename: 'proposal.md',
    dependsOn: [],
    produces: ['stdd/changes/{change}/proposal.md'],
    requiredFields: ['intent', 'scope', 'approach'],
    optionalFields: ['risks', 'successCriteria', 'timeline'],
    agents: ['pm', 'analyst'],
    lifecycle: 'change',
  },
  'design': {
    id: 'design',
    phase: 'planning',
    category: 'changes',
    description: 'Technical design document for a change',
    directory: 'stdd/changes/{change}',
    filename: 'design.md',
    dependsOn: ['proposal'],
    produces: ['stdd/changes/{change}/design.md'],
    requiredFields: ['context', 'decision'],
    optionalFields: ['alternatives', 'consequences'],
    agents: ['architect', 'developer'],
    lifecycle: 'change',
  },
  'delta-spec': {
    id: 'delta-spec',
    phase: 'specification',
    category: 'changes',
    description: 'Delta BDD specifications for a change (ADDED/MODIFIED/REMOVED)',
    directory: 'stdd/changes/{change}/specs',
    filename: null,
    dependsOn: ['proposal'],
    produces: ['stdd/changes/{change}/specs/*.feature'],
    requiredFields: ['scenarios'],
    optionalFields: ['markers'],
    agents: ['analyst', 'developer'],
    lifecycle: 'change',
  },
  'evidence': {
    id: 'evidence',
    phase: 'verification',
    category: 'evidence',
    description: 'Verification and test evidence artifacts',
    directory: 'stdd/evidence',
    filename: null,
    dependsOn: ['task-plan'],
    produces: ['stdd/evidence/*.json'],
    requiredFields: ['type', 'status', 'timestamp'],
    optionalFields: ['coverage', 'mutationScore'],
    agents: ['test-architect', 'reviewer'],
    lifecycle: 'change',
  },
  'evidence-ledger': {
    id: 'evidence-ledger',
    phase: 'verification',
    category: 'evidence',
    description: 'Append-only evidence ledger for full audit trail',
    directory: 'stdd/evidence',
    filename: 'evidence-ledger.jsonl',
    dependsOn: [],
    produces: ['stdd/evidence/evidence-ledger.jsonl'],
    requiredFields: [],
    optionalFields: [],
    agents: ['release-manager'],
    lifecycle: 'project',
  },
  'archive': {
    id: 'archive',
    phase: 'archive',
    category: 'archive',
    description: 'Archived change with delta spec merge and summary',
    directory: 'stdd/archive/{change}',
    filename: 'summary.md',
    dependsOn: ['evidence'],
    produces: ['stdd/archive/{change}/summary.md'],
    requiredFields: ['summary', 'status'],
    optionalFields: ['deltaSpec', 'lessonsLearned'],
    agents: ['release-manager'],
    lifecycle: 'change',
  },
};

const LIFECYCLE_ORDER = [
  'discovery',
  'requirements',
  'domain',
  'architecture',
  'specification',
  'planning',
  'proposal',
  'verification',
  'archive',
];

class ArtifactRegistry {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.types = { ...ARTIFACT_TYPES };
  }

  getType(artifactId) {
    return this.types[artifactId] || null;
  }

  getAllTypes() {
    return Object.values(this.types);
  }

  getTypesByPhase(phase) {
    return Object.values(this.types).filter(t => t.phase === phase);
  }

  getTypesByCategory(category) {
    return Object.values(this.types).filter(t => t.category === category);
  }

  getTypesByAgent(agentId) {
    return Object.values(this.types).filter(t => t.agents.includes(agentId));
  }

  getDependencies(artifactId) {
    const type = this.types[artifactId];
    if (!type) return [];
    return type.dependsOn.map(id => this.types[id]).filter(Boolean);
  }

  getDependents(artifactId) {
    return Object.values(this.types).filter(t => t.dependsOn.includes(artifactId));
  }

  resolvePath(artifactId, changeName) {
    const type = this.types[artifactId];
    if (!type) return null;
    let dir = type.directory.replace('{change}', changeName || '');
    let filePath = type.filename
      ? path.join(dir, type.filename)
      : dir;
    return path.resolve(this.cwd, filePath);
  }

  exists(artifactId, changeName) {
    const resolved = this.resolvePath(artifactId, changeName);
    if (!resolved) return false;
    return fs.existsSync(resolved);
  }

  checkPreconditions(artifactId, changeName) {
    const type = this.types[artifactId];
    if (!type) return { met: false, missing: [`Unknown artifact: ${artifactId}`] };
    const missing = [];
    for (const depId of type.dependsOn) {
      if (!this.exists(depId, changeName)) {
        missing.push(depId);
      }
    }
    return { met: missing.length === 0, missing };
  }

  getArtifactGraph() {
    const nodes = [];
    const edges = [];
    for (const [id, type] of Object.entries(this.types)) {
      nodes.push({ id, phase: type.phase, category: type.category, agents: type.agents });
      for (const depId of type.dependsOn) {
        edges.push({ from: depId, to: id });
      }
    }
    return { nodes, edges };
  }

  getPhaseProgress(changeName) {
    const progress = {};
    for (const phase of LIFECYCLE_ORDER) {
      const types = this.getTypesByPhase(phase);
      progress[phase] = {
        total: types.length,
        existing: types.filter(t => this.exists(t.id, changeName)).length,
        artifacts: types.map(t => ({
          id: t.id,
          exists: this.exists(t.id, changeName),
          dependsOn: t.dependsOn,
        })),
      };
    }
    return progress;
  }

  scanProject() {
    const stddDir = path.join(this.cwd, 'stdd');
    if (!fs.existsSync(stddDir)) {
      return { initialized: false, artifacts: [], missing: [] };
    }

    const found = [];
    const missing = [];
    for (const [id, type] of Object.entries(this.types)) {
      if (this.exists(id)) {
        found.push({ id, path: this.resolvePath(id), phase: type.phase });
      } else if (type.lifecycle === 'project') {
        missing.push({ id, phase: type.phase, expectedPath: this.resolvePath(id) });
      }
    }
    return { initialized: true, artifacts: found, missing };
  }

  renderStatus(changeName) {
    const progress = this.getPhaseProgress(changeName);
    const lines = ['\nArtifact Map Status\n'];
    for (const phase of LIFECYCLE_ORDER) {
      const p = progress[phase];
      if (p.total === 0) continue;
      const icon = p.existing === p.total ? '✅' : p.existing > 0 ? '🔄' : '⬜';
      lines.push(`  ${icon} ${phase.padEnd(14)} ${p.existing}/${p.total}`);
      for (const a of p.artifacts) {
        const status = a.exists ? '✓' : `requires: ${a.dependsOn.join(', ') || 'none'}`;
        lines.push(`     ${a.exists ? '✓' : '○'} ${a.id.padEnd(22)} ${status}`);
      }
    }
    return lines.join('\n');
  }
}

module.exports = { ArtifactRegistry, ARTIFACT_TYPES, LIFECYCLE_ORDER };
