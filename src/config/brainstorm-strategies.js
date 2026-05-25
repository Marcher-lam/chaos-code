/**
 * Brainstorm Analysis Strategies
 * Context-aware analysis per angle, driven by project metadata.
 */

const ANGLE_STRATEGIES = {
  technical: {
    analyzeFunction: (topic, context) => {
      const stack = context.techStack || {};
      const deps = stack.dependencies || [];
      const lang = detectLanguage(deps);
      const hints = [];

      if (lang === 'typescript') {
        hints.push('Leverage TypeScript strict mode and type guards for compile-time safety');
        hints.push('Consider discriminated unions for state modeling');
      }
      if (lang === 'python') {
        hints.push('Use type hints and Pydantic models for runtime validation');
      }
      if (deps.some(d => d.includes('react') || d.includes('vue') || d.includes('svelte'))) {
        hints.push('Evaluate component boundaries and state management patterns');
      }
      if (deps.some(d => d.includes('express') || d.includes('fastify') || d.includes('koa'))) {
        hints.push('Review middleware chain, error handling, and request validation');
      }
      if (deps.some(d => d.includes('prisma') || d.includes('typeorm') || d.includes('sequelize'))) {
        hints.push('Assess database schema design, migration strategy, and query performance');
      }
      if (deps.some(d => d.includes('graphql'))) {
        hints.push('Review schema design, resolver complexity, and N+1 query prevention');
      }
      if (context.complexity && context.complexity.highRiskFiles && context.complexity.highRiskFiles.length > 0) {
        hints.push(`High complexity in ${context.complexity.highRiskFiles.slice(0, 3).join(', ')} - plan refactoring carefully`);
      }

      return hints;
    },

    promptTemplate: (topic, ctx) => {
      const stack = ctx.techStack || {};
      const parts = [`Analyze the technical feasibility of "${topic}".`];
      if (stack.name) parts.push(`Project: ${stack.name}.`);
      if (stack.dependencies && stack.dependencies.length > 0) {
        parts.push(`Key dependencies: ${stack.dependencies.slice(0, 10).join(', ')}.`);
      }
      if (ctx.architecture) parts.push(`Architecture context: ${ctx.architecture.substring(0, 200)}.`);
      parts.push('Identify technical risks, integration points, and implementation trade-offs.');
      return parts.join(' ');
    },

    checklistItems: [
      'Verify dependency compatibility and version constraints',
      'Assess error handling and failure modes',
      'Evaluate test coverage requirements',
      'Consider backward compatibility impact',
    ],
  },

  user: {
    analyzeFunction: (topic, context) => {
      const hints = [];

      if (context.designSystem) {
        hints.push(`Align with existing design tokens in DESIGN.md (${context.designSystem.tokenCount || 'multiple'} tokens defined)`);
        hints.push('Verify component variants match the design system palette');
      } else {
        hints.push('No DESIGN.md found - consider establishing a design system first');
      }
      if (context.techStack && context.techStack.dependencies) {
        const deps = context.techStack.dependencies;
        if (deps.some(d => d.includes('storybook'))) {
          hints.push('Document new component stories in Storybook for design review');
        }
        if (deps.some(d => d.includes('tailwind'))) {
          hints.push('Use Tailwind utility classes consistently with existing patterns');
        }
        if (deps.some(d => d.includes('material-ui') || d.includes('antd'))) {
          hints.push('Follow the UI library theming conventions');
        }
      }
      hints.push('Consider accessibility requirements (WCAG 2.1 AA minimum)');
      hints.push('Validate interaction patterns with user research data');

      return hints;
    },

    promptTemplate: (topic, ctx) => {
      const parts = [`Analyze the user experience implications of "${topic}".`];
      if (ctx.designSystem) {
        parts.push('A design system exists - ensure visual and interaction consistency.');
      }
      parts.push('Focus on user flows, accessibility, and intuitive interactions.');
      return parts.join(' ');
    },

    checklistItems: [
      'Define user personas and their goals',
      'Map the primary user journey',
      'Identify accessibility barriers',
      'Plan for responsive and adaptive layouts',
    ],
  },

  business: {
    analyzeFunction: (topic, context) => {
      const hints = [];

      if (context.recentChanges && context.recentChanges.length > 0) {
        const changeNames = context.recentChanges.map(c => c.name).join(', ');
        hints.push(`Recent project activity (${changeNames}) may affect priority - check alignment`);
      }
      if (context.techStack && context.techStack.scripts) {
        const scripts = context.techStack.scripts;
        if (scripts['deploy'] || scripts['release'] || scripts['publish']) {
          hints.push('Deployment pipeline exists - factor in release coordination');
        }
      }
      hints.push('Define measurable success criteria before implementation');
      hints.push('Estimate ROI by comparing implementation cost to expected value');

      return hints;
    },

    promptTemplate: (topic, ctx) => {
      const parts = [`Evaluate the business impact of "${topic}".`];
      if (ctx.recentChanges && ctx.recentChanges.length > 0) {
        parts.push(`Ongoing work (${ctx.recentChanges.length} active changes) may influence prioritization.`);
      }
      parts.push('Quantify value, estimate effort, and assess strategic alignment.');
      return parts.join(' ');
    },

    checklistItems: [
      'Define clear success metrics',
      'Estimate development effort',
      'Assess market timing and competitive pressure',
      'Plan rollback strategy if business objectives are not met',
    ],
  },

  security: {
    analyzeFunction: (topic, context) => {
      const hints = [];
      const deps = (context.techStack && context.techStack.dependencies) || [];

      if (deps.some(d => d.includes('express') || d.includes('koa') || d.includes('fastify'))) {
        hints.push('Validate all HTTP inputs with schema validation (joi, zod, or similar)');
        hints.push('Configure CORS, CSP headers, and rate limiting');
      }
      if (deps.some(d => d.includes('jsonwebtoken') || d.includes('passport') || d.includes('auth'))) {
        hints.push('Review authentication flow for token handling vulnerabilities');
      }
      if (deps.some(d => d.includes('prisma') || d.includes('sequelize') || d.includes('typeorm'))) {
        hints.push('Guard against SQL injection - use parameterized queries');
      }
      if (context.complexity && context.complexity.highRiskFiles && context.complexity.highRiskFiles.length > 3) {
        hints.push('High code complexity increases attack surface - prioritize simplification');
      }
      hints.push('Perform threat modeling using STRIDE methodology');
      hints.push('Ensure secrets are not committed to version control');

      return hints;
    },

    promptTemplate: (topic, ctx) => {
      const parts = [`Conduct a security analysis of "${topic}".`];
      if (ctx.complexity && ctx.complexity.highRiskFiles && ctx.complexity.highRiskFiles.length > 0) {
        parts.push(`High complexity areas detected - focus on ${ctx.complexity.highRiskFiles.slice(0, 2).join(' and ')}.`);
      }
      parts.push('Identify vulnerabilities, data exposure risks, and mitigation strategies.');
      return parts.join(' ');
    },

    checklistItems: [
      'List all trust boundaries and data flows',
      'Check input validation and output encoding',
      'Verify authentication and authorization controls',
      'Review dependency audit for known vulnerabilities',
    ],
  },

  performance: {
    analyzeFunction: (topic, context) => {
      const hints = [];
      const deps = (context.techStack && context.techStack.dependencies) || [];

      if (deps.some(d => d.includes('react'))) {
        hints.push('Profile React rendering with React DevTools - watch for unnecessary re-renders');
        hints.push('Consider React.memo, useMemo, and useCallback for hot paths');
      }
      if (deps.some(d => d.includes('vue'))) {
        hints.push('Use Vue reactive system efficiently - avoid deep watchers on large objects');
      }
      if (deps.some(d => d.includes('express') || d.includes('fastify'))) {
        hints.push('Implement response caching and database query optimization');
        hints.push('Consider connection pooling and request batching');
      }
      if (context.architecture && context.architecture.toLowerCase().includes('microservice')) {
        hints.push('Minimize inter-service latency - evaluate service mesh or direct RPC');
      }
      if (context.complexity && context.complexity.avgComplexity && context.complexity.avgComplexity > 15) {
        hints.push('Average cyclomatic complexity is high - refactoring will improve runtime performance');
      }
      hints.push('Define performance budgets and monitor against them');

      return hints;
    },

    promptTemplate: (topic, ctx) => {
      const parts = [`Analyze performance implications of "${topic}".`];
      if (ctx.architecture) {
        parts.push(`Architecture: ${ctx.architecture.substring(0, 150)}.`);
      }
      parts.push('Identify bottlenecks, set performance targets, and propose optimization strategies.');
      return parts.join(' ');
    },

    checklistItems: [
      'Establish performance budget and SLA targets',
      'Profile critical path execution time',
      'Evaluate caching strategy',
      'Plan load testing scenarios',
    ],
  },

  maintainability: {
    analyzeFunction: (topic, context) => {
      const hints = [];

      if (context.complexity) {
        if (context.complexity.highRiskFiles && context.complexity.highRiskFiles.length > 0) {
          hints.push(`Refactor hotspots first: ${context.complexity.highRiskFiles.slice(0, 3).join(', ')}`);
        }
        if (context.complexity.avgComplexity !== undefined) {
          if (context.complexity.avgComplexity > 20) {
            hints.push('Average cyclomatic complexity is very high (>20) - strong refactoring candidate');
          } else if (context.complexity.avgComplexity > 10) {
            hints.push('Moderate complexity detected - watch for growing functions');
          } else {
            hints.push('Complexity is within healthy range - maintain current standards');
          }
        }
      }
      if (context.techStack && context.techStack.dependencies) {
        const deps = context.techStack.dependencies;
        if (deps.some(d => d.includes('jest') || d.includes('vitest') || d.includes('mocha'))) {
          hints.push('Test framework available - ensure new code follows existing test patterns');
        } else {
          hints.push('No test framework detected - consider adding one');
        }
      }
      hints.push('Document public APIs and architectural decisions');

      return hints;
    },

    promptTemplate: (topic, ctx) => {
      const parts = [`Assess maintainability impact of "${topic}".`];
      if (ctx.complexity) {
        const avg = ctx.complexity.avgComplexity;
        if (avg !== undefined) parts.push(`Current avg complexity: ${avg.toFixed(1)}.`);
      }
      parts.push('Focus on code clarity, testability, and long-term evolution.');
      return parts.join(' ');
    },

    checklistItems: [
      'Ensure functions stay under 50 lines',
      'Maintain test coverage above 80%',
      'Document non-obvious decisions inline',
      'Follow SOLID principles for module boundaries',
    ],
  },

  scalability: {
    analyzeFunction: (topic, context) => {
      const hints = [];
      const deps = (context.techStack && context.techStack.dependencies) || [];

      if (context.architecture) {
        const arch = context.architecture.toLowerCase();
        if (arch.includes('monolith') || arch.includes('single')) {
          hints.push('Monolithic architecture detected - plan horizontal scaling or module extraction');
        }
        if (arch.includes('microservice')) {
          hints.push('Microservice architecture - evaluate service boundaries and data consistency');
        }
        if (arch.includes('serverless') || arch.includes('lambda')) {
          hints.push('Serverless - account for cold starts and function timeout constraints');
        }
      }
      if (deps.some(d => d.includes('redis') || d.includes('ioredis'))) {
        hints.push('Redis available - use for distributed caching and session management');
      }
      if (deps.some(d => d.includes('rabbitmq') || d.includes('kafka') || d.includes('bull'))) {
        hints.push('Message queue available - offload async work for better throughput');
      }
      if (deps.some(d => d.includes('postgres') || d.includes('mysql'))) {
        hints.push('Plan database scaling: read replicas, connection pooling, query optimization');
      }
      hints.push('Design for 10x current load and plan capacity breakpoints');

      return hints;
    },

    promptTemplate: (topic, ctx) => {
      const parts = [`Evaluate scalability requirements for "${topic}".`];
      if (ctx.techStack && ctx.techStack.dependencies) {
        const infra = ctx.techStack.dependencies.filter(d =>
          /redis|kafka|rabbitmq|postgres|mysql|mongodb|elastic/.test(d)
        );
        if (infra.length > 0) {
          parts.push(`Infrastructure: ${infra.join(', ')}.`);
        }
      }
      parts.push('Identify scaling bottlenecks, capacity limits, and growth strategies.');
      return parts.join(' ');
    },

    checklistItems: [
      'Identify horizontal vs vertical scaling needs',
      'Evaluate database read/write patterns under load',
      'Plan for graceful degradation',
      'Document capacity planning thresholds',
    ],
  },
};

/**
 * Detect primary language from dependency list
 */
function detectLanguage(dependencies) {
  if (!dependencies || !Array.isArray(dependencies)) return null;
  const jsIndicators = ['react', 'vue', 'svelte', 'express', 'next', 'typescript', 'webpack', 'vite'];
  const pyIndicators = ['django', 'flask', 'fastapi', 'pytest', 'celery', 'pydantic'];
  if (dependencies.some(d => jsIndicators.some(i => d.includes(i)))) return 'typescript';
  if (dependencies.some(d => pyIndicators.some(i => d.includes(i)))) return 'python';
  return null;
}

/**
 * Context signal to hint mapping for the generic hint generator.
 * Each entry is tested against the context; the first match wins.
 */
const CONTEXT_HINT_SIGNALS = [
  {
    test: (ctx) => ctx.techStack && ctx.techStack.dependencies && ctx.techStack.dependencies.some(d => d.includes('react')),
    hint: 'Consider React component lifecycle, hooks, and re-render optimization',
  },
  {
    test: (ctx) => ctx.techStack && ctx.techStack.dependencies && ctx.techStack.dependencies.some(d => d.includes('vue')),
    hint: 'Evaluate Vue reactivity patterns and computed property efficiency',
  },
  {
    test: (ctx) => ctx.techStack && ctx.techStack.dependencies && ctx.techStack.dependencies.some(d => d.includes('svelte')),
    hint: 'Leverage Svelte compile-time optimization and reactive declarations',
  },
  {
    test: (ctx) => ctx.techStack && ctx.techStack.dependencies && ctx.techStack.dependencies.some(d => d.includes('next') || d.includes('nuxt')),
    hint: 'Consider SSR/SSG trade-offs, hydration strategy, and edge caching',
  },
  {
    test: (ctx) => ctx.complexity && ctx.complexity.highRiskFiles && ctx.complexity.highRiskFiles.length > 3,
    hint: 'Focus on reducing coupling in hotspot areas before adding new complexity',
  },
  {
    test: (ctx) => ctx.designSystem,
    hint: 'Align with existing design tokens and component patterns in DESIGN.md',
  },
  {
    test: (ctx) => ctx.recentChanges && ctx.recentChanges.length >= 3,
    hint: 'Multiple active changes detected - verify this work does not conflict with ongoing efforts',
  },
  {
    test: (ctx) => ctx.complexity && ctx.complexity.avgComplexity !== undefined && ctx.complexity.avgComplexity > 15,
    hint: 'Project-wide complexity is elevated - prioritize simplification alongside new features',
  },
  {
    test: (ctx) => ctx.techStack && ctx.techStack.dependencies && ctx.techStack.dependencies.some(d => d.includes('graphql')),
    hint: 'Review GraphQL schema evolution strategy and fragment composition',
  },
  {
    test: (ctx) => ctx.techStack && ctx.techStack.dependencies && ctx.techStack.dependencies.some(d => /prisma|sequelize|typeorm|mongoose/.test(d)),
    hint: 'Evaluate data model impact, migration path, and ORM query efficiency',
  },
  {
    test: (ctx) => ctx.techStack && ctx.techStack.dependencies && ctx.techStack.dependencies.some(d => /jest|vitest|mocha|pytest/.test(d)),
    hint: 'Extend existing test patterns - maintain coverage standards when adding new code',
  },
];

module.exports = { ANGLE_STRATEGIES, CONTEXT_HINT_SIGNALS, detectLanguage };
