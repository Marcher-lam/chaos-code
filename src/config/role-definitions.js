/**
 * Role Definitions
 * Rich role metadata for STDD Copilot multi-perspective analysis.
 *
 * Each role carries expertise domains, review focus areas, a structured
 * checklist, and a prompt-template function used by party-mode and consult.
 */

const ROLE_DEFINITIONS = {
  po: {
    id: 'po',
    name: 'Product Owner',
    lens: 'scope, value, acceptance criteria',
    expertise: [
      'requirements',
      'priorities',
      'user stories',
      'acceptance criteria',
      'backlog management',
      'stakeholder alignment',
      'value proposition',
      'feature scoping',
    ],
    reviewFocus: [
      'scope creep',
      'missing acceptance criteria',
      'unclear value proposition',
      'unprioritized features',
      'ambiguous user stories',
      'unstated assumptions',
    ],
    checklist: [
      'Are acceptance criteria defined with Given/When/Then?',
      'Is the user story clear and actionable?',
      'Is the scope bounded with explicit exclusions?',
      'Does this align with product vision?',
      'Are edge cases and error scenarios covered?',
      'Is there a clear definition of done?',
    ],
    promptTemplate: (topic, context) =>
      `As Product Owner, analyze "${topic}" for:\n`
      + '- Value proposition and user impact\n'
      + '- Acceptance criteria completeness\n'
      + '- Scope boundaries\n'
      + '- Priority justification\n'
      + '- Stakeholder alignment\n'
      + `\nProject context: ${context.techStack || 'general'}`
      + `\nRecent changes: ${context.recentChanges || 'none'}`,
  },

  developer: {
    id: 'developer',
    name: 'Developer',
    lens: 'implementation simplicity and maintainability',
    expertise: [
      'implementation',
      'code quality',
      'testing',
      'debugging',
      'refactoring',
      'design patterns',
      'error handling',
      'performance',
    ],
    reviewFocus: [
      'unnecessary complexity',
      'code duplication',
      'missing error handling',
      'debug artifacts in production code',
      'poor naming',
      'over-engineering',
    ],
    checklist: [
      'Is the code the simplest thing that could work?',
      'Are variable and function names self-documenting?',
      'Are error paths handled explicitly?',
      'Is there any dead code or debug logging left in?',
      'Does this follow established project conventions?',
      'Are there opportunities to extract shared logic?',
    ],
    promptTemplate: (topic, context) =>
      `As Developer, analyze "${topic}" for:\n`
      + '- Implementation complexity\n'
      + '- Code maintainability\n'
      + '- Error handling coverage\n'
      + '- Naming and readability\n'
      + '- Adherence to project conventions\n'
      + `\nTech stack: ${context.techStack || 'unknown'}`
      + `\nFile count: ${context.fileCount || 'unknown'}`,
  },

  tester: {
    id: 'tester',
    name: 'Tester',
    lens: 'testability, edge cases, regression risk',
    expertise: [
      'quality assurance',
      'test coverage',
      'edge cases',
      'regression testing',
      'boundary value analysis',
      'exploratory testing',
      'test automation',
      'acceptance testing',
    ],
    reviewFocus: [
      'skipped or commented-out tests',
      'weak assertions (toBeTruthy, toBeFalsy)',
      'missing negative test cases',
      'untested error paths',
      'flaky test patterns',
      'test isolation violations',
    ],
    checklist: [
      'Are both happy-path and sad-path tests present?',
      'Do assertions verify specific values rather than truthiness?',
      'Are edge cases (empty input, null, max values) tested?',
      'Is there a test for each acceptance criterion?',
      'Are tests isolated and deterministic?',
      'Is there a strategy for regression prevention?',
    ],
    promptTemplate: (topic, context) =>
      `As Tester, analyze "${topic}" for:\n`
      + '- Test coverage gaps\n'
      + '- Edge case identification\n'
      + '- Assertion quality\n'
      + '- Test isolation and determinism\n'
      + '- Regression risk\n'
      + `\nTest runner: ${context.testRunner || 'unknown'}`
      + `\nExisting test patterns: ${context.testPatterns || 'not analyzed'}`,
  },

  reviewer: {
    id: 'reviewer',
    name: 'Reviewer',
    lens: 'defects, coupling, unclear intent',
    expertise: [
      'code review',
      'best practices',
      'security',
      'defect detection',
      'coupling analysis',
      'readability',
      'maintainability',
      'team conventions',
    ],
    reviewFocus: [
      'hidden bugs',
      'tight coupling between modules',
      'unclear intent or magic numbers',
      'missing input validation',
      'inconsistent style',
      'unhandled promise rejections',
    ],
    checklist: [
      'Is the intent of each function immediately clear?',
      'Are there magic numbers or strings that should be constants?',
      'Is input validated at trust boundaries?',
      'Are promises handled with catch or try/catch?',
      'Does this change introduce coupling to a specific implementation?',
      'Would a new team member understand this code without explanation?',
    ],
    promptTemplate: (topic, context) =>
      `As Reviewer, analyze "${topic}" for:\n`
      + '- Defect likelihood\n'
      + '- Coupling and cohesion\n'
      + '- Readability and clarity\n'
      + '- Best practice adherence\n'
      + '- Risk of regression\n'
      + `\nCodebase language: ${context.techStack || 'unknown'}`
      + `\nChange size: ${context.changeSize || 'unknown'}`,
  },

  architect: {
    id: 'architect',
    name: 'Architect',
    lens: 'boundaries, dependencies, evolution',
    expertise: [
      'architecture',
      'design patterns',
      'scalability',
      'dependency management',
      'module boundaries',
      'system evolution',
      'API design',
      'data flow',
    ],
    reviewFocus: [
      'circular dependencies',
      'layering violations',
      'god objects or modules',
      'inappropriate intimacy between modules',
      'premature optimization',
      'vendor lock-in',
    ],
    checklist: [
      'Are module boundaries respected?',
      'Is the dependency graph acyclic and shallow?',
      'Does this change follow the established architectural patterns?',
      'Are there implicit couplings that should be explicit?',
      'Can this component be replaced independently?',
      'Does this scale with the expected growth?',
    ],
    promptTemplate: (topic, context) =>
      `As Architect, analyze "${topic}" for:\n`
      + '- Architectural alignment\n'
      + '- Dependency impact\n'
      + '- Module boundary integrity\n'
      + '- Scalability implications\n'
      + '- Evolution readiness\n'
      + `\nFramework: ${context.techStack || 'unknown'}`
      + `\nModule count: ${context.moduleCount || 'unknown'}`,
  },

  security: {
    id: 'security',
    name: 'Security',
    lens: 'secrets, injection, unsafe defaults',
    expertise: [
      'OWASP Top 10',
      'authentication',
      'authorization',
      'input validation',
      'encryption',
      'secrets management',
      'dependency vulnerabilities',
      'security headers',
    ],
    reviewFocus: [
      'hardcoded secrets or credentials',
      'code injection (eval, exec)',
      'cross-site scripting (XSS)',
      'SQL injection',
      'insecure defaults',
      'SSRF and CSRF vulnerabilities',
    ],
    checklist: [
      'Are secrets stored in environment variables or vaults, not code?',
      'Is user input sanitized before rendering or execution?',
      'Are SQL queries parameterized?',
      'Are authentication and authorization enforced on sensitive endpoints?',
      'Are dependencies scanned for known vulnerabilities?',
      'Are security headers (CSP, CORS, HSTS) configured correctly?',
    ],
    promptTemplate: (topic, context) =>
      `As Security, analyze "${topic}" for:\n`
      + '- Credential and secret handling\n'
      + '- Injection vulnerability surface\n'
      + '- Input validation gaps\n'
      + '- Authentication/authorization coverage\n'
      + '- Dependency risk\n'
      + `\nEnvironment: ${context.environment || 'unknown'}`
      + `\nExposed endpoints: ${context.endpointCount || 'unknown'}`,
  },

  devops: {
    id: 'devops',
    name: 'DevOps',
    lens: 'CI, deployability, operational safety',
    expertise: [
      'deployment',
      'CI/CD',
      'infrastructure as code',
      'monitoring',
      'containerization',
      'rollback strategies',
      'environment management',
      'incident response',
    ],
    reviewFocus: [
      'missing CI pipeline checks',
      'non-reproducible builds',
      'missing health checks',
      'hardcoded environment config',
      'insufficient logging',
      'missing rollback plan',
    ],
    checklist: [
      'Does the CI pipeline run on every PR?',
      'Are builds deterministic and reproducible?',
      'Is there a health-check endpoint for the service?',
      'Can this be rolled back without data loss?',
      'Are infrastructure changes version-controlled?',
      'Is there a runbook or alert for the failure mode?',
    ],
    promptTemplate: (topic, context) =>
      `As DevOps, analyze "${topic}" for:\n`
      + '- CI/CD pipeline coverage\n'
      + '- Deployment safety\n'
      + '- Operational observability\n'
      + '- Rollback readiness\n'
      + '- Environment consistency\n'
      + `\nPlatform: ${context.platform || 'unknown'}`
      + `\nCI system: ${context.ciSystem || 'unknown'}`,
  },

  ux: {
    id: 'ux',
    name: 'UX',
    lens: 'user journey and error states',
    expertise: [
      'user experience',
      'accessibility',
      'interaction design',
      'usability',
      'error messaging',
      'responsive design',
      'user research',
      'information architecture',
    ],
    reviewFocus: [
      'missing error states',
      'inconsistent interaction patterns',
      'accessibility violations',
      'confusing user flows',
      'missing loading/empty states',
      'poor mobile experience',
    ],
    checklist: [
      'Are all error states handled with user-friendly messages?',
      'Is the interaction flow intuitive without documentation?',
      'Are loading states shown for async operations?',
      'Do empty states guide users to the next action?',
      'Is the UI accessible (ARIA, keyboard navigation, contrast)?',
      'Does the design work on mobile viewports?',
    ],
    promptTemplate: (topic, context) =>
      `As UX, analyze "${topic}" for:\n`
      + '- User journey completeness\n'
      + '- Error state handling\n'
      + '- Accessibility compliance\n'
      + '- Interaction consistency\n'
      + '- Cognitive load\n'
      + `\nPlatform: ${context.platform || 'web'}`
      + `\nTarget users: ${context.targetUsers || 'general'}`,
  },

  ba: {
    id: 'ba',
    name: 'Business Analyst',
    lens: 'business rules and process fit',
    expertise: [
      'business analysis',
      'requirements',
      'workflows',
      'process modeling',
      'stakeholder communication',
      'gap analysis',
      'compliance',
      'domain modeling',
    ],
    reviewFocus: [
      'missing business rules',
      'process gaps',
      'regulatory compliance',
      'stakeholder misalignment',
      'ambiguous requirements',
      'data integrity constraints',
    ],
    checklist: [
      'Are all business rules explicitly documented?',
      'Does the implementation match the documented process?',
      'Are regulatory and compliance requirements addressed?',
      'Are there implicit assumptions that differ from the spec?',
      'Is the data model consistent with business constraints?',
      'Are all stakeholder concerns represented?',
    ],
    promptTemplate: (topic, context) =>
      `As Business Analyst, analyze "${topic}" for:\n`
      + '- Business rule completeness\n'
      + '- Process alignment\n'
      + '- Regulatory compliance\n'
      + '- Requirement traceability\n'
      + '- Gap analysis\n'
      + `\nDomain: ${context.domain || 'general'}`
      + `\nCompliance requirements: ${context.compliance || 'none specified'}`,
  },

  techwriter: {
    id: 'techwriter',
    name: 'Tech Writer',
    lens: 'documentation and terminology',
    expertise: [
      'documentation',
      'API docs',
      'guides',
      'terminology',
      'onboarding',
      'CHANGELOG',
      'README',
      'code comments',
    ],
    reviewFocus: [
      'undocumented public APIs',
      'inconsistent terminology',
      'stale documentation',
      'missing examples',
      'placeholder text',
      'poor onboarding experience',
    ],
    checklist: [
      'Are all public APIs documented with parameters and return types?',
      'Is terminology consistent across code, docs, and UI?',
      'Are there working code examples for key use cases?',
      'Is the README accurate and up to date?',
      'Are breaking changes noted in CHANGELOG?',
      'Can a new developer onboard using only the documentation?',
    ],
    promptTemplate: (topic, context) =>
      `As Tech Writer, analyze "${topic}" for:\n`
      + '- Documentation coverage\n'
      + '- Terminological consistency\n'
      + '- Example quality\n'
      + '- Onboarding clarity\n'
      + '- Stale content risk\n'
      + `\nAudience: ${context.audience || 'developers'}`
      + `\nExisting docs: ${context.existingDocs || 'unknown'}`,
  },

  qalead: {
    id: 'qalead',
    name: 'QA Lead',
    lens: 'quality strategy and release risk',
    expertise: [
      'test strategy',
      'quality planning',
      'metrics',
      'release management',
      'risk-based testing',
      'test automation',
      'quality gates',
      'defect analysis',
    ],
    reviewFocus: [
      'insufficient test coverage',
      'missing integration tests',
      'no quality gate before release',
      'unmeasured quality metrics',
      'test environment drift',
      'missing smoke tests',
    ],
    checklist: [
      'Is there a test strategy covering unit, integration, and E2E?',
      'Are quality gates defined (coverage threshold, lint pass)?',
      'Is there a risk-based testing approach for critical paths?',
      'Are test environments reproducible?',
      'Is there a smoke-test suite for release validation?',
      'Are defect trends tracked and acted upon?',
    ],
    promptTemplate: (topic, context) =>
      `As QA Lead, analyze "${topic}" for:\n`
      + '- Test strategy adequacy\n'
      + '- Release risk assessment\n'
      + '- Quality gate enforcement\n'
      + '- Coverage vs. criticality alignment\n'
      + '- Defect trend analysis\n'
      + `\nTest runner: ${context.testRunner || 'unknown'}`
      + `\nCoverage: ${context.coverage || 'unknown'}`,
  },

  dataanalyst: {
    id: 'dataanalyst',
    name: 'Data Analyst',
    lens: 'metrics, observability, data quality',
    expertise: [
      'data',
      'metrics',
      'analytics',
      'observability',
      'data quality',
      'reporting',
      'A/B testing',
      'data pipelines',
    ],
    reviewFocus: [
      'missing instrumentation',
      'data quality issues',
      'untracked metrics',
      'incorrect aggregations',
      'PII exposure in logs',
      'missing data validation',
    ],
    checklist: [
      'Are key business events instrumented and tracked?',
      'Is there a data-quality check at ingestion points?',
      'Are aggregations correct (no double-counting, proper time windows)?',
      'Is PII excluded or anonymized in logs and analytics?',
      'Can the team answer "did this change improve the metric?"',
      'Are dashboards and alerts defined for critical metrics?',
    ],
    promptTemplate: (topic, context) =>
      `As Data Analyst, analyze "${topic}" for:\n`
      + '- Metrics instrumentation\n'
      + '- Data quality safeguards\n'
      + '- Observability coverage\n'
      + '- PII handling in data flows\n'
      + '- Analysis readiness\n'
      + `\nData stores: ${context.dataStores || 'unknown'}`
      + `\nAnalytics platform: ${context.analyticsPlatform || 'unknown'}`,
  },
};

/**
 * Return the flat ROLES array that the rest of the codebase expects.
 * Keeps backward compatibility while the richer definition lives above.
 */
const ROLES = Object.values(ROLE_DEFINITIONS).map((def) => ({
  id: def.id,
  name: def.name,
  lens: def.lens,
}));

module.exports = { ROLE_DEFINITIONS, ROLES };
