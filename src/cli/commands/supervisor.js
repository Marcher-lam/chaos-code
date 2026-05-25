/**
 * Supervisor Command
 * Multi-agent coordination and supervision with deep role-based analysis,
 * structured debate simulation, and contextual review.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { createLogger } = require('../../utils/logger');
const inquirer = require('inquirer');
const { AgentEngine } = require('../../runtime/agent-simulator');
const logger = createLogger('supervisor');

const ROLES = {
  'Product Owner': { color: 'blue', expertise: 'requirements, priorities, business value' },
  'Developer': { color: 'green', expertise: 'implementation, code quality, testing' },
  'Tester': { color: 'yellow', expertise: 'quality assurance, test coverage, edge cases' },
  'Reviewer': { color: 'red', expertise: 'code review, best practices, security' },
  'Architect': { color: 'cyan', expertise: 'architecture, design patterns, scalability' },
  'Security': { color: 'magenta', expertise: 'security, vulnerabilities, compliance' },
  'DevOps': { color: 'white', expertise: 'deployment, CI/CD, infrastructure' },
  'UX': { color: 'brightBlue', expertise: 'user experience, accessibility, design' },
  'BA': { color: 'brightGreen', expertise: 'business analysis, requirements, workflows' },
  'Tech Writer': { color: 'brightYellow', expertise: 'documentation, API docs, guides' },
  'QA Lead': { color: 'brightRed', expertise: 'test strategy, quality planning, metrics' },
  'Data Analyst': { color: 'brightMagenta', expertise: 'data, metrics, analytics' },
};

// ---------------------------------------------------------------------------
// Role-specific analysis patterns for deep contextual analysis
// ---------------------------------------------------------------------------
const ROLE_ANALYSIS_PATTERNS = {
  'Product Owner': {
    focusAreas: ['business value', 'user impact', 'scope alignment', 'priority', 'ROI'],
    riskPatterns: ['scope creep', 'misaligned priorities', 'unvalidated assumptions', 'stakeholder conflict'],
    promptTemplate: (query, ctx) => {
      const arch = ctx.architecture || 'the current system';
      return `Analyzing "${query}" through a product lens.\n`
        + `System context: ${typeof arch === 'string' ? arch : 'multi-module architecture'}.\n`
        + `Key considerations:\n`
        + `1. Does this align with the product vision and current sprint goals?\n`
        + `2. What is the user impact — who benefits and how?\n`
        + `3. What is the expected ROI vs. development effort?\n`
        + `4. Are there scope boundaries that need definition before proceeding?`;
    },
    reviewStrategy: (content, ctx) => {
      const findings = [];
      if (/TODO|FIXME/i.test(content)) findings.push({ severity: 'medium', message: 'Unresolved TODOs may indicate scope gaps', category: 'scope' });
      if (!/requirement|spec|acceptance/i.test(content)) findings.push({ severity: 'low', message: 'No explicit requirement references found', category: 'traceability' });
      return findings;
    },
  },
  'Developer': {
    focusAreas: ['implementation complexity', 'code quality', 'technical feasibility', 'dependencies', 'maintainability'],
    riskPatterns: ['over-engineering', 'tight coupling', 'missing error handling', 'untested code', 'dependency bloat'],
    promptTemplate: (query, ctx) => {
      const deps = ctx.dependencies || [];
      const depNote = deps.length > 0 ? `Dependencies in scope: ${deps.slice(0, 5).join(', ')}` : 'No dependency data available';
      return `Evaluating "${query}" for implementation feasibility.\n`
        + `${depNote}.\n`
        + `Key considerations:\n`
        + `1. What is the implementation complexity (simple/moderate/complex)?\n`
        + `2. Which modules or files need changes?\n`
        + `3. Are there existing patterns in the codebase to follow?\n`
        + `4. What is the testing strategy for the changes?`;
    },
    reviewStrategy: (content, ctx) => {
      const findings = [];
      const lines = content.split('\n');
      if (lines.length > 300) findings.push({ severity: 'medium', message: `File is ${lines.length} lines — consider splitting into modules`, category: 'maintainability' });
      const complexityMarkers = (content.match(/\bif\s*\(/g) || []).length;
      if (complexityMarkers > 15) findings.push({ severity: 'medium', message: `High cyclomatic complexity (${complexityMarkers} conditionals)`, category: 'complexity' });
      if (/console\.log|console\.debug|console\.warn(?!\s*\(\s*['"]deprecated)/i.test(content)) findings.push({ severity: 'low', message: 'Console statements should be removed before production', category: 'quality' });
      if (!/try\s*\{|catch\s*\(|\.catch\(/i.test(content) && lines.length > 50) findings.push({ severity: 'high', message: 'No error handling detected in substantial code', category: 'reliability' });
      const asyncOps = (content.match(/\basync\b|\bawait\b|\.then\(/g) || []).length;
      if (asyncOps > 0 && !/Promise\.all|Promise\.allSettled|Promise\.race/i.test(content) && asyncOps > 4) findings.push({ severity: 'low', message: 'Multiple async operations without Promise.all — consider parallelization', category: 'performance' });
      return findings;
    },
  },
  'Tester': {
    focusAreas: ['edge cases', 'failure scenarios', 'test coverage', 'validation', 'regression risk'],
    riskPatterns: ['untested paths', 'missing edge cases', 'flaky tests', 'inadequate coverage', 'race conditions'],
    promptTemplate: (query, ctx) => {
      return `Testing perspective on "${query}".\n`
        + `Key considerations:\n`
        + `1. What are the critical test scenarios (happy path, edge cases, failure modes)?\n`
        + `2. What existing tests might be affected by this change?\n`
        + `3. Are there boundary conditions or race conditions to test?\n`
        + `4. What integration tests are needed?`;
    },
    reviewStrategy: (content, ctx) => {
      const findings = [];
      if (!/describe\s*\(|it\s*\(|test\s*\(|expect\s*\(/i.test(content)) findings.push({ severity: 'high', message: 'No test structures detected', category: 'coverage' });
      if (/\.only\(|\.skip\(/i.test(content)) findings.push({ severity: 'high', message: 'Test has .only() or .skip() — will not run in CI correctly', category: 'ci' });
      if (/sleep|setTimeout|delay/i.test(content) && /test|spec/i.test(content)) findings.push({ severity: 'medium', message: 'Test uses timing-based waits — may be flaky', category: 'stability' });
      return findings;
    },
  },
  'Reviewer': {
    focusAreas: ['code quality', 'best practices', 'naming conventions', 'DRY', 'readability'],
    riskPatterns: ['code duplication', 'poor naming', 'magic numbers', 'deeply nested code', 'dead code'],
    promptTemplate: (query, ctx) => {
      return `Code review perspective on "${query}".\n`
        + `Key considerations:\n`
        + `1. Does the code follow established conventions and style guides?\n`
        + `2. Are there DRY violations or code that should be abstracted?\n`
        + `3. Is the code readable and self-documenting?\n`
        + `4. Are there any anti-patterns or code smells?`;
    },
    reviewStrategy: (content, ctx) => {
      const findings = [];
      const lines = content.split('\n');
      // Check for deeply nested code
      let maxIndent = 0;
      for (const line of lines) {
        const indent = line.match(/^(\s*)/)[1].length;
        if (indent > maxIndent) maxIndent = indent;
      }
      if (maxIndent > 24) findings.push({ severity: 'medium', message: `Deep nesting detected (${Math.floor(maxIndent / 2)} levels) — consider early returns or extraction`, category: 'readability' });
      // Magic numbers
      const magicNumbers = content.match(/(?<![.\w])\d{2,}(?!\w*[.:=])/g);
      if (magicNumbers && magicNumbers.length > 3) findings.push({ severity: 'low', message: `${magicNumbers.length} potential magic numbers found — consider named constants`, category: 'readability' });
      // Duplicate lines
      const lineCounts = {};
      for (const line of lines.map(l => l.trim()).filter(l => l.length > 10)) {
        lineCounts[line] = (lineCounts[line] || 0) + 1;
      }
      const duplicates = Object.entries(lineCounts).filter(([, c]) => c > 2);
      if (duplicates.length > 3) findings.push({ severity: 'medium', message: `${duplicates.length} duplicated lines detected — consider extracting shared logic`, category: 'dry' });
      return findings;
    },
  },
  'Architect': {
    focusAreas: ['module coupling', 'interface boundaries', 'data flow', 'scalability', 'design patterns'],
    riskPatterns: ['circular dependencies', 'tight coupling', 'leaky abstractions', 'scalability bottlenecks', 'missing interfaces'],
    promptTemplate: (query, ctx) => {
      const arch = ctx.architecture || 'N/A';
      const archStr = typeof arch === 'string' ? arch : JSON.stringify(arch);
      return `Architectural analysis of "${query}".\n`
        + `Current architecture context: ${archStr.slice(0, 200)}\n`
        + `Key considerations:\n`
        + `1. How does this affect module coupling and cohesion?\n`
        + `2. Are interface boundaries clearly defined?\n`
        + `3. What is the data flow direction — are there any circular dependencies?\n`
        + `4. Does this introduce scalability concerns?\n`
        + `5. Which design pattern applies here?`;
    },
    reviewStrategy: (content, ctx) => {
      const findings = [];
      // Check require/import patterns for coupling
      const imports = content.match(/require\(['"]([^'"]+)['"]\)/g) || [];
      const importPaths = imports.map(i => i.match(/require\(['"]([^'"]+)['"]\)/)[1]);
      if (importPaths.length > 10) findings.push({ severity: 'medium', message: `High number of dependencies (${importPaths.length}) — evaluate coupling`, category: 'coupling' });
      // Check for cross-layer imports (heuristic)
      const crossLayer = importPaths.filter(p => /controller|route|model|view/i.test(p) && importPaths.some(q => q !== p && /controller|route|model|view/i.test(q)));
      if (crossLayer.length > 0) findings.push({ severity: 'medium', message: 'Potential cross-layer dependency detected', category: 'architecture' });
      // Class size
      const classMatches = content.match(/class\s+\w+/g);
      if (classMatches && classMatches.length === 1 && content.split('\n').length > 200) {
        findings.push({ severity: 'medium', message: 'Single class in a large file — may violate SRP', category: 'srp' });
      }
      return findings;
    },
  },
  'Security': {
    focusAreas: ['vulnerabilities', 'input validation', 'authentication', 'authorization', 'data exposure'],
    riskPatterns: ['SQL injection', 'XSS', 'CSRF', 'insecure defaults', 'hardcoded secrets', 'path traversal'],
    promptTemplate: (query, ctx) => {
      return `Security assessment of "${query}".\n`
        + `Key considerations:\n`
        + `1. Are all inputs validated and sanitized?\n`
        + `2. Is authentication and authorization properly enforced?\n`
        + `3. Could this introduce data exposure or leakage?\n`
        + `4. Are there dependency vulnerabilities to check?\n`
        + `5. Does this handle sensitive data correctly (encryption, hashing)?`;
    },
    reviewStrategy: (content, ctx) => {
      const findings = [];
      // Hardcoded secrets
      if (/password\s*[:=]\s*['"][^'"]+['"]|api_?key\s*[:=]\s*['"][^'"]+['"]|secret\s*[:=]\s*['"][^'"]+['"]|token\s*[:=]\s*['"][^'"]+['"]/i.test(content)) findings.push({ severity: 'high', message: 'Potential hardcoded secret or credential detected', category: 'secrets' });
      // SQL injection
      if (/query\s*\(|\.raw\s*\(|string\s*concatenation.*(?:SELECT|INSERT|UPDATE|DELETE)/i.test(content)) findings.push({ severity: 'high', message: 'Potential SQL injection — use parameterized queries', category: 'injection' });
      // eval usage
      if (/\beval\s*\(/i.test(content)) findings.push({ severity: 'high', message: 'eval() usage detected — major security risk', category: 'code-execution' });
      // Path traversal
      if (/path\.join.*\.\.|\.\.\/|\.\.\\/i.test(content) && !/resolve|normalize/i.test(content)) findings.push({ severity: 'medium', message: 'Potential path traversal — ensure paths are sanitized', category: 'traversal' });
      // Command injection
      if (/exec\s*\(|spawn\s*\(|execSync\s*\(/i.test(content)) findings.push({ severity: 'high', message: 'Command execution detected — validate all inputs', category: 'injection' });
      return findings;
    },
  },
  'DevOps': {
    focusAreas: ['deployment', 'CI/CD', 'infrastructure', 'monitoring', 'rollback strategy'],
    riskPatterns: ['manual deployment steps', 'missing health checks', 'no rollback plan', 'configuration drift', 'insufficient monitoring'],
    promptTemplate: (query, ctx) => {
      return `DevOps perspective on "${query}".\n`
        + `Key considerations:\n`
        + `1. What are the deployment requirements and rollout strategy?\n`
        + `2. Are there CI/CD pipeline changes needed?\n`
        + `3. What monitoring and alerting should be in place?\n`
        + `4. What is the rollback plan if things go wrong?\n`
        + `5. Are there infrastructure or environment changes required?`;
    },
    reviewStrategy: (content, ctx) => {
      const findings = [];
      if (!/health|readiness|liveness/i.test(content) && /server|app|listen/i.test(content)) findings.push({ severity: 'medium', message: 'No health check endpoint detected for service', category: 'monitoring' });
      if (/process\.env\./i.test(content)) {
        const envVars = (content.match(/process\.env\.(\w+)/g) || []).map(e => e.replace('process.env.', ''));
        if (envVars.length > 0 && !/\.env\.example|\.env\.sample/i.test(content)) findings.push({ severity: 'low', message: `Uses ${envVars.length} env vars — ensure .env.example is documented`, category: 'configuration' });
      }
      return findings;
    },
  },
  'UX': {
    focusAreas: ['user experience', 'accessibility', 'design consistency', 'interaction patterns', 'feedback'],
    riskPatterns: ['poor error messages', 'missing loading states', 'inconsistent UI', 'accessibility barriers', 'slow perceived performance'],
    promptTemplate: (query, ctx) => {
      return `UX perspective on "${query}".\n`
        + `Key considerations:\n`
        + `1. How does this affect the user journey and workflow?\n`
        + `2. Are loading states and error feedback properly handled?\n`
        + `3. Is this accessible (WCAG compliance)?\n`
        + `4. Does this maintain design consistency with the rest of the application?`;
    },
    reviewStrategy: (content, ctx) => {
      const findings = [];
      if (/alert\s*\(/i.test(content)) findings.push({ severity: 'medium', message: 'alert() breaks user flow — use custom notification component', category: 'ux' });
      if (!/aria-|role=|alt=|label/i.test(content) && /<\w+[^>]*>/i.test(content)) findings.push({ severity: 'medium', message: 'HTML elements without ARIA attributes — check accessibility', category: 'accessibility' });
      return findings;
    },
  },
  'BA': {
    focusAreas: ['business processes', 'requirements', 'workflows', 'stakeholder impact', 'acceptance criteria'],
    riskPatterns: ['ambiguous requirements', 'missing acceptance criteria', 'unmapped workflows', 'stakeholder gaps'],
    promptTemplate: (query, ctx) => {
      return `Business analysis of "${query}".\n`
        + `Key considerations:\n`
        + `1. Are the business requirements clearly defined and measurable?\n`
        + `2. What workflows or processes does this affect?\n`
        + `3. Who are the stakeholders and how are they impacted?\n`
        + `4. What are the acceptance criteria for success?`;
    },
    reviewStrategy: (content, ctx) => {
      return [];
    },
  },
  'Tech Writer': {
    focusAreas: ['documentation', 'API docs', 'guides', 'code comments', 'examples'],
    riskPatterns: ['missing docs', 'outdated comments', 'undocumented APIs', 'no examples'],
    promptTemplate: (query, ctx) => {
      return `Documentation perspective on "${query}".\n`
        + `Key considerations:\n`
        + `1. What documentation needs to be created or updated?\n`
        + `2. Are API changes documented with examples?\n`
        + `3. Is the user-facing documentation clear and accurate?\n`
        + `4. Are there migration or upgrade guides needed?`;
    },
    reviewStrategy: (content, ctx) => {
      const findings = [];
      const lines = content.split('\n');
      const commentLines = lines.filter(l => /^\s*(\/\/|\/\*|\*|#)/.test(l)).length;
      const ratio = lines.length > 0 ? commentLines / lines.length : 0;
      if (lines.length > 50 && ratio < 0.05) findings.push({ severity: 'medium', message: 'Low comment ratio — consider adding documentation comments', category: 'documentation' });
      if (/module\.exports|exports\.\w+/i.test(content) && !/@param|@returns|@example/i.test(content)) findings.push({ severity: 'low', message: 'Exported module without JSDoc documentation', category: 'api-docs' });
      return findings;
    },
  },
  'QA Lead': {
    focusAreas: ['test strategy', 'quality planning', 'metrics', 'test automation', 'release criteria'],
    riskPatterns: ['insufficient test coverage', 'no regression suite', 'missing integration tests', 'no performance tests'],
    promptTemplate: (query, ctx) => {
      return `Quality strategy perspective on "${query}".\n`
        + `Key considerations:\n`
        + `1. What test levels are needed (unit, integration, E2E)?\n`
        + `2. What are the quality gates for release?\n`
        + `3. What metrics should we track?\n`
        + `4. Are there regression risks from this change?`;
    },
    reviewStrategy: (content, ctx) => {
      return [];
    },
  },
  'Data Analyst': {
    focusAreas: ['data quality', 'metrics', 'analytics', 'reporting', 'data pipelines'],
    riskPatterns: ['data quality issues', 'missing validation', 'incorrect aggregations', 'data leakage'],
    promptTemplate: (query, ctx) => {
      return `Data perspective on "${query}".\n`
        + `Key considerations:\n`
        + `1. What data is involved and how should it be validated?\n`
        + `2. Are there metrics or analytics that need updating?\n`
        + `3. How does this affect data pipelines or reporting?\n`
        + `4. Are there data privacy or retention implications?`;
    },
    reviewStrategy: (content, ctx) => {
      return [];
    },
  },
};

// ---------------------------------------------------------------------------
// Grade calculation helper
// ---------------------------------------------------------------------------
function computeGrade(findings) {
  const high = findings.filter(f => f.severity === 'high').length;
  const medium = findings.filter(f => f.severity === 'medium').length;
  const low = findings.filter(f => f.severity === 'low').length;
  if (high >= 3) return 'F';
  if (high >= 1) return 'D';
  if (medium >= 4) return 'D';
  if (medium >= 2) return 'C';
  if (medium >= 1) return 'B';
  if (low >= 3) return 'B';
  return 'A';
}

function severityIcon(severity) {
  switch (severity) {
    case 'high': return chalk.red('H');
    case 'medium': return chalk.yellow('M');
    case 'low': return chalk.green('L');
    default: return chalk.dim('-');
  }
}

function gradeColor(grade) {
  switch (grade) {
    case 'A': return chalk.green;
    case 'B': return chalk.blue;
    case 'C': return chalk.yellow;
    case 'D': return chalk.red;
    case 'F': return chalk.bgRed.white;
    default: return chalk.white;
  }
}

// ---------------------------------------------------------------------------
// SupervisorCommand
// ---------------------------------------------------------------------------
class SupervisorCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.supervisorDir = path.join(cwd, 'stdd', 'supervisor');
    this.sessionsPath = path.join(this.supervisorDir, 'sessions.jsonl');
    this.reportsDir = path.join(cwd, 'stdd', 'reports');
  }

  execute(action = 'start', args = [], options = {}) {
    switch (action) {
      case 'start':
      case 'begin':
        return this.start(args.join(' '), options);
      case 'consult':
        return this.consult(args.join(' '), options);
      case 'review':
        return this.review(args[0], options);
      case 'debate':
        return this.debate(args.join(' '), options);
      case 'roles':
        return this.listRoles(options);
      case 'status':
        return this.status(options);
      case 'history':
        return this.history(options);
      default:
        return this.start(action, options);
    }
  }

  // -------------------------------------------------------------------------
  // start — launch a supervisor session
  // -------------------------------------------------------------------------
  async start(topic, options = {}) {
    fs.mkdirSync(this.supervisorDir, { recursive: true });

    // Accept --context <topic> option to set initial discussion context
    const contextTopic = options.context || null;

    if (!topic && process.stdout.isTTY) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'topic',
          message: 'What topic should the agents discuss?',
        },
        {
          type: 'checkbox',
          name: 'roles',
          message: 'Select participating roles:',
          choices: Object.keys(ROLES),
          default: ['Product Owner', 'Developer', 'Tester', 'Architect'],
        },
        {
          type: 'number',
          name: 'rounds',
          message: 'How many discussion rounds?',
          default: 3,
        },
      ]);
      topic = answers.topic;
      options.roles = answers.roles;
      options.rounds = answers.rounds;
    }

    if (!topic) {
      throw new Error('Topic is required. Usage: stdd supervisor start "<topic>"');
    }

    const roles = options.roles || ['Product Owner', 'Developer', 'Tester', 'Architect'];
    const rounds = options.rounds || 3;

    // Gather project context to enrich the session
    const ctx = this.gatherSupervisorContext(this.cwd);

    const engine = new AgentEngine(this.cwd);
    const agents = roles.map(r => ({
      id: r.toLowerCase().replace(/\s+/g, '-'),
      name: r,
      role: ROLES[r]?.expertise || 'general analysis',
    }));
    const state = engine.start(topic, { agents, rounds });
    // Store context topic in state for later reference
    if (contextTopic) {
      state.contextTopic = contextTopic;
      engine.saveState(state);
    }

    this.recordSession({
      id: state.id || Date.now().toString(36),
      topic,
      roles,
      rounds,
      started: new Date().toISOString(),
      status: 'in-progress',
      contextTopic: contextTopic || null,
    });

    if (options.json) {
      console.log(JSON.stringify({ session: state }, null, 2));
    } else {
      console.log(chalk.bold('\nSupervisor Session Started\n'));
      console.log(`  Topic: ${chalk.cyan(topic)}`);
      if (contextTopic) console.log(`  Context: ${chalk.dim(contextTopic)}`);
      console.log(`  Roles: ${roles.map(r => chalk.cyan(r)).join(', ')}`);
      console.log(`  Rounds: ${chalk.cyan(rounds.toString())}`);
      console.log(`  Session ID: ${chalk.dim(state.id || 'N/A')}\n`);

      // Show initial context summary
      if (ctx.packageName) {
        console.log(chalk.dim(`  Project: ${ctx.packageName} v${ctx.version || '?'}`));
      }
      if (ctx.architecture) {
        const archPreview = typeof ctx.architecture === 'string' ? ctx.architecture.slice(0, 80) + '...' : 'loaded';
        console.log(chalk.dim(`  Architecture context: ${archPreview}`));
      }
      console.log('');
      console.log(chalk.dim('  Use "stdd supervisor status" to see the current state'));
      console.log(chalk.dim('  Use "stdd supervisor consult" to get recommendations'));
      console.log(chalk.dim('  Use "stdd supervisor debate <topic>" to simulate multi-role debate\n'));
    }

    return { session: state };
  }

  // -------------------------------------------------------------------------
  // consult — get structured role-based analysis
  // -------------------------------------------------------------------------
  async consult(query, options = {}) {
    if (!query && !options.file && !options.change) {
      throw new Error('Query is required. Usage: stdd supervisor consult "<query>" [--file <path>] [--change <name>]');
    }

    const roles = options.roles || ['Product Owner', 'Developer', 'Tester'];
    const ctx = this.gatherSupervisorContext(this.cwd);

    // --file option: read file content and include in context
    if (options.file) {
      const filePath = path.resolve(options.file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${options.file}`);
      }
      ctx.fileContent = fs.readFileSync(filePath, 'utf8');
      ctx.filePath = filePath;
    }

    // --change option: read change proposal context
    if (options.change) {
      const changeDir = path.join(this.cwd, 'stdd', 'changes', options.change);
      if (fs.existsSync(changeDir)) {
        const proposalPath = path.join(changeDir, 'proposal.md');
        const specPath = path.join(changeDir, 'spec.md');
        const tasksPath = path.join(changeDir, 'tasks.md');
        if (fs.existsSync(proposalPath)) ctx.changeProposal = fs.readFileSync(proposalPath, 'utf8');
        if (fs.existsSync(specPath)) ctx.changeSpec = fs.readFileSync(specPath, 'utf8');
        if (fs.existsSync(tasksPath)) ctx.changeTasks = fs.readFileSync(tasksPath, 'utf8');
      }
    }

    if (options.json) {
      const results = roles.map(role => this.generateRoleAnalysis(role, query || 'file analysis', ctx));
      console.log(JSON.stringify({ query, roles, results }, null, 2));
      return { query, roles, results };
    }

    console.log(chalk.bold('\nSupervisor Consultation\n'));
    console.log(`  Query: ${chalk.cyan(query || 'file/change analysis')}`);
    if (options.file) console.log(`  File: ${chalk.dim(options.file)}`);
    if (options.change) console.log(`  Change: ${chalk.dim(options.change)}`);
    console.log(`  Consulting: ${roles.join(', ')}\n`);

    console.log(chalk.bold('Structured Analysis:\n'));

    const allResults = [];
    for (const role of roles) {
      const result = this.generateRoleAnalysis(role, query || 'file analysis', ctx);
      allResults.push({ role, ...result });
      const color = ROLES[role]?.color || 'white';
      console.log(`  ${chalk[color]('---')} ${chalk.bold(role)} ${chalk[color]('---')}`);
      console.log(`    ${result.summary}`);
      if (result.risks.length > 0) {
        console.log(`    ${chalk.yellow('Risks:')}`);
        result.risks.forEach(r => console.log(`      ${chalk.yellow('-')} ${r}`));
      }
      if (result.recommendations.length > 0) {
        console.log(`    ${chalk.green('Recommendations:')}`);
        result.recommendations.forEach(r => console.log(`      ${chalk.green('+')} ${r}`));
      }
      if (result.questions.length > 0) {
        console.log(`    ${chalk.blue('Open Questions:')}`);
        result.questions.forEach(q => console.log(`      ${chalk.blue('?')} ${q}`));
      }
      console.log('');
    }

    // Save consultation report
    this.saveConsultReport(query || 'analysis', roles, allResults, ctx, options);

    return { query, roles, results: allResults, consulted: true };
  }

  // -------------------------------------------------------------------------
  // generateRoleAnalysis — deep contextual analysis per role
  // -------------------------------------------------------------------------
  generateRoleAnalysis(role, query, context = {}) {
    const pattern = ROLE_ANALYSIS_PATTERNS[role];
    const roleInfo = ROLES[role] || { expertise: 'general analysis' };

    if (!pattern) {
      // Fallback for roles without dedicated patterns
      return {
        summary: `From the ${role} perspective, "${query}" should be evaluated against ${roleInfo.expertise}.`,
        risks: ['Insufficient context for detailed risk analysis'],
        recommendations: ['Gather more specific requirements before proceeding', 'Cross-reference with existing documentation'],
        questions: [`What are the ${roleInfo.expertise} implications of this change?`],
      };
    }

    // Generate summary using the prompt template
    const promptOutput = pattern.promptTemplate(query, context);
    const summaryLines = promptOutput.split('\n');
    const summary = summaryLines[0];

    // Build risks based on role patterns and context
    const risks = [];
    pattern.riskPatterns.slice(0, 3).forEach(rp => {
      risks.push(`Potential ${rp} — review carefully`);
    });

    // If file content is in context, run the review strategy for additional findings
    if (context.fileContent) {
      const fileFindings = pattern.reviewStrategy(context.fileContent, context);
      fileFindings.forEach(f => {
        risks.push(`${f.severity.toUpperCase()}: ${f.message}`);
      });
    }

    // Build recommendations from focus areas
    const recommendations = pattern.focusAreas.slice(0, 3).map(fa =>
      `Evaluate ${fa} in relation to "${query}"`
    );

    // Build open questions
    const questions = [
      `What specific ${pattern.focusAreas[0]} constraints apply?`,
      `Are there existing decisions that affect ${pattern.focusAreas[1] || 'this area'}?`,
    ];

    if (context.architecture) {
      questions.push('Does the current architecture documentation need updating?');
    }

    return { summary, risks, recommendations, questions };
  }

  // Legacy method kept as fallback
  getRoleAdvice(role, query) {
    const analysis = this.generateRoleAnalysis(role, query, {});
    return analysis.summary;
  }

  // -------------------------------------------------------------------------
  // review — multi-role structured code review
  // -------------------------------------------------------------------------
  review(filePath, options = {}) {
    if (!filePath) {
      throw new Error('File path is required. Usage: stdd supervisor review <file>');
    }

    const fullPath = path.resolve(filePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const roles = options.roles || ['Developer', 'Reviewer', 'Tester'];
    const ctx = this.gatherSupervisorContext(this.cwd);
    ctx.filePath = fullPath;

    if (options.json) {
      const results = roles.map(role => this.analyzeFromPerspective(role, content, ctx));
      const allFindings = results.flatMap(r => r.findings);
      console.log(JSON.stringify({ file: filePath, roles, results, overallGrade: computeGrade(allFindings) }, null, 2));
      return { file: filePath, roles, results, reviewed: true };
    }

    console.log(chalk.bold('\nSupervisor Review\n'));
    console.log(`  File: ${chalk.cyan(filePath)}`);
    console.log(`  Lines: ${chalk.dim(content.split('\n').length)}`);
    console.log(`  Reviewers: ${roles.join(', ')}\n`);

    const allResults = [];
    for (const role of roles) {
      const result = this.analyzeFromPerspective(role, content, ctx);
      allResults.push({ role, ...result });
      const color = ROLES[role]?.color || 'white';
      console.log(`  ${chalk[color]('---')} ${chalk.bold(role)} — Grade: ${gradeColor(result.grade)(result.grade)} ${chalk[color]('---')}`);

      if (result.findings.length === 0) {
        console.log(`    ${chalk.green('No issues found.')}`);
      } else {
        for (const finding of result.findings) {
          const loc = finding.line ? chalk.dim(`L${finding.line}: `) : '';
          console.log(`    ${severityIcon(finding.severity)} ${loc}${finding.message}`);
          if (finding.suggestion) {
            console.log(`      ${chalk.dim('Suggestion: ' + finding.suggestion)}`);
          }
        }
      }
      console.log(`    ${chalk.dim(result.summary)}`);
      console.log('');
    }

    // Overall grade
    const allFindings = allResults.flatMap(r => r.findings);
    const overallGrade = computeGrade(allFindings);
    console.log(`  Overall Grade: ${gradeColor(overallGrade)(overallGrade)}`);
    console.log(`  Total Findings: ${allFindings.length} (${allFindings.filter(f => f.severity === 'high').length} high, ${allFindings.filter(f => f.severity === 'medium').length} medium, ${allFindings.filter(f => f.severity === 'low').length} low)\n`);

    return { file: filePath, roles, results: allResults, overallGrade, reviewed: true };
  }

  // -------------------------------------------------------------------------
  // analyzeFromPerspective — structured code review per role
  // -------------------------------------------------------------------------
  analyzeFromPerspective(role, content, context = {}) {
    const pattern = ROLE_ANALYSIS_PATTERNS[role];
    const lines = content.split('\n');

    if (!pattern) {
      return {
        findings: [],
        summary: `No specific review strategy for ${role}. General review: ${lines.length} lines analyzed.`,
        grade: 'B',
      };
    }

    // Run role-specific review strategy
    const findings = pattern.reviewStrategy(content, context).map(f => ({
      line: f.line || null,
      severity: f.severity || 'low',
      message: f.message,
      suggestion: f.suggestion || null,
      category: f.category || 'general',
    }));

    // Add line numbers to findings where possible
    findings.forEach(finding => {
      if (!finding.line) {
        // Try to find the relevant line
        const keyword = finding.message.split(' ')[0];
        if (keyword) {
          const idx = content.toLowerCase().indexOf(keyword.toLowerCase());
          if (idx >= 0) {
            finding.line = content.substring(0, idx).split('\n').length;
          }
        }
      }
    });

    // Generate summary
    const highCount = findings.filter(f => f.severity === 'high').length;
    const medCount = findings.filter(f => f.severity === 'medium').length;
    const lowCount = findings.filter(f => f.severity === 'low').length;
    let summary;
    if (findings.length === 0) {
      summary = `No issues detected from ${role} perspective. Code appears well-structured.`;
    } else {
      summary = `${findings.length} finding(s): ${highCount} high, ${medCount} medium, ${lowCount} low severity.`;
    }

    const grade = computeGrade(findings);

    return { findings, summary, grade };
  }

  // Legacy method kept as fallback
  getReviewComments(role, content) {
    const result = this.analyzeFromPerspective(role, content, {});
    if (result.findings.length === 0) return 'No issues found.';
    return result.findings.map(f => `[${f.severity.toUpperCase()}] ${f.message}`).join('. ');
  }

  // -------------------------------------------------------------------------
  // debate — simulated multi-round structured debate
  // -------------------------------------------------------------------------
  async debate(topic, options = {}) {
    if (!topic) {
      throw new Error('Topic is required. Usage: stdd supervisor debate "<topic>"');
    }

    const roles = options.roles || ['Developer', 'Architect', 'Tester'];
    const rounds = options.rounds || 3;
    const ctx = this.gatherSupervisorContext(this.cwd);

    // Round 1: Opening positions
    const openingPositions = [];
    for (const role of roles) {
      const pattern = ROLE_ANALYSIS_PATTERNS[role];
      const position = pattern
        ? pattern.promptTemplate(topic, ctx)
        : `From the ${role} perspective, consider the implications of "${topic}".`;

      const supportingArguments = pattern
        ? pattern.focusAreas.slice(0, 2).map(fa => `This affects ${fa} directly`)
        : ['Requires further analysis'];

      const concerns = pattern
        ? pattern.riskPatterns.slice(0, 2).map(rp => `Risk of ${rp}`)
        : ['General concern about implementation approach'];

      openingPositions.push({
        role,
        position: position.split('\n')[0],
        supportingArguments,
        concerns,
      });
    }

    // Round 2: Rebuttals — each role responds to others
    const rebuttals = [];
    for (const role of roles) {
      const othersPositions = openingPositions.filter(p => p.role !== role);
      const pattern = ROLE_ANALYSIS_PATTERNS[role];
      const agreements = [];
      const disagreements = [];

      for (const otherPos of othersPositions) {
        // Find alignment based on shared focus areas
        const otherPattern = ROLE_ANALYSIS_PATTERNS[otherPos.role];
        if (otherPattern && pattern) {
          const sharedAreas = pattern.focusAreas.filter(fa => otherPattern.focusAreas.includes(fa));
          if (sharedAreas.length > 0) {
            agreements.push(`Agree with ${otherPos.role} on ${sharedAreas[0]}`);
          } else {
            disagreements.push(`${otherPos.role}'s focus on ${otherPattern.focusAreas[0]} may conflict with ${pattern.focusAreas[0]}`);
          }
        }
        // Reference specific concerns
        if (otherPos.concerns.length > 0) {
          agreements.push(`Acknowledge ${otherPos.role}'s concern: "${otherPos.concerns[0]}"`);
        }
      }

      rebuttals.push({
        role,
        agreements,
        disagreements,
        summary: pattern
          ? `${role} responds: balancing ${pattern.focusAreas.slice(0, 2).join(' and ')} with the team input.`
          : `${role} acknowledges other perspectives and provides additional context.`,
      });
    }

    // Round 3: Synthesis — consensus and open questions
    const recommendations = [];
    const openQuestions = [];

    // Collect all concerns as potential recommendations
    for (const pos of openingPositions) {
      pos.concerns.forEach(c => {
        recommendations.push({ source: pos.role, text: `Address: ${c}` });
      });
      pos.supportingArguments.forEach(a => {
        recommendations.push({ source: pos.role, text: `Validate: ${a}` });
      });
    }

    // Open questions from disagreements
    for (const rebuttal of rebuttals) {
      rebuttal.disagreements.forEach(d => {
        openQuestions.push({ source: rebuttal.role, text: d });
      });
    }

    // Add synthesis questions if few disagreements
    if (openQuestions.length === 0) {
      openQuestions.push(
        { source: 'Synthesis', text: `What is the priority order for addressing "${topic}"?` },
        { source: 'Synthesis', text: 'What resources and timeline are needed?' },
        { source: 'Synthesis', text: 'Who should own each action item?' },
      );
    }

    const debateResult = {
      topic,
      roles,
      rounds,
      timestamp: new Date().toISOString(),
      openingPositions,
      rebuttals,
      synthesis: { recommendations, openQuestions },
    };

    if (options.json) {
      console.log(JSON.stringify(debateResult, null, 2));
      return debateResult;
    }

    // Print formatted debate
    console.log(chalk.bold('\nSupervisor Debate\n'));
    console.log(`  Topic: ${chalk.cyan(topic)}`);
    console.log(`  Participants: ${roles.join(', ')}\n`);

    // Round 1
    console.log(chalk.bold(`  ${'='.repeat(50)}`));
    console.log(chalk.bold('  ROUND 1: Opening Positions'));
    console.log(chalk.bold(`  ${'='.repeat(50)}\n`));
    for (const pos of openingPositions) {
      const color = ROLES[pos.role]?.color || 'white';
      console.log(`  ${chalk[color]('>>>')} ${chalk.bold(pos.role)}`);
      console.log(`    ${pos.position}`);
      console.log(`    ${chalk.green('Supporting:')}`);
      pos.supportingArguments.forEach(a => console.log(`      ${chalk.green('+')} ${a}`));
      console.log(`    ${chalk.red('Concerns:')}`);
      pos.concerns.forEach(c => console.log(`      ${chalk.red('!')} ${c}`));
      console.log('');
    }

    // Round 2
    console.log(chalk.bold(`  ${'='.repeat(50)}`));
    console.log(chalk.bold('  ROUND 2: Rebuttals & Responses'));
    console.log(chalk.bold(`  ${'='.repeat(50)}\n`));
    for (const rebuttal of rebuttals) {
      const color = ROLES[rebuttal.role]?.color || 'white';
      console.log(`  ${chalk[color]('>>>')} ${chalk.bold(rebuttal.role)}`);
      if (rebuttal.agreements.length > 0) {
        console.log(`    ${chalk.green('Agreements:')}`);
        rebuttal.agreements.forEach(a => console.log(`      ${chalk.green('v')} ${a}`));
      }
      if (rebuttal.disagreements.length > 0) {
        console.log(`    ${chalk.red('Disagreements:')}`);
        rebuttal.disagreements.forEach(d => console.log(`      ${chalk.red('x')} ${d}`));
      }
      console.log(`    ${chalk.dim(rebuttal.summary)}`);
      console.log('');
    }

    // Round 3
    console.log(chalk.bold(`  ${'='.repeat(50)}`));
    console.log(chalk.bold('  ROUND 3: Synthesis'));
    console.log(chalk.bold(`  ${'='.repeat(50)}\n`));
    console.log(`  ${chalk.green('Recommendations (Agreed):')}`);
    recommendations.forEach(r => console.log(`    ${chalk.green('*')} [${r.source}] ${r.text}`));
    console.log('');
    console.log(`  ${chalk.yellow('Open Questions (Needing Decision):')}`);
    openQuestions.forEach(q => console.log(`    ${chalk.yellow('?')} [${q.source}] ${q.text}`));
    console.log('');

    // Save debate transcript
    this.saveDebateTranscript(debateResult);

    return debateResult;
  }

  // -------------------------------------------------------------------------
  // listRoles
  // -------------------------------------------------------------------------
  listRoles(options = {}) {
    if (options.json) {
      console.log(JSON.stringify({ roles: ROLES }, null, 2));
    } else {
      console.log(chalk.bold('\nAvailable Agent Roles\n'));

      for (const [role, info] of Object.entries(ROLES)) {
        const color = info.color || 'white';
        const pattern = ROLE_ANALYSIS_PATTERNS[role];
        console.log(`  ${chalk[color]('***')} ${chalk.bold(role)}`);
        console.log(`      ${chalk.dim(info.expertise)}`);
        if (pattern) {
          console.log(`      ${chalk.dim('Focus: ' + pattern.focusAreas.join(', '))}`);
        }
      }
      console.log('');
    }

    return { roles: Object.keys(ROLES) };
  }

  // -------------------------------------------------------------------------
  // status
  // -------------------------------------------------------------------------
  status(options = {}) {
    const sessions = this.loadSessions();
    const current = sessions.find(s => s.status === 'in-progress');

    if (options.json) {
      console.log(JSON.stringify({ current, total: sessions.length }, null, 2));
    } else {
      console.log(chalk.bold('\nSupervisor Status\n'));

      if (current) {
        console.log(`  Current session: ${chalk.cyan(current.topic)}`);
        console.log(`  Roles: ${current.roles.join(', ')}`);
        console.log(`  Started: ${chalk.dim(new Date(current.started).toLocaleString())}`);
        console.log(`  Session ID: ${chalk.dim(current.id)}\n`);
      } else {
        console.log(`  ${chalk.yellow('No active session')}`);
        console.log(`  ${chalk.dim('Run "stdd supervisor start <topic>" to begin')}\n`);
      }

      console.log(`  Total sessions: ${chalk.cyan(sessions.length.toString())}\n`);
    }

    return { current, total: sessions.length };
  }

  // -------------------------------------------------------------------------
  // history
  // -------------------------------------------------------------------------
  history(options = {}) {
    const sessions = this.loadSessions().slice(-(options.limit || 20));

    if (options.json) {
      console.log(JSON.stringify({ sessions, count: sessions.length }, null, 2));
    } else {
      console.log(chalk.bold('\nSupervisor Session History\n'));

      if (sessions.length === 0) {
        console.log(chalk.dim('  No sessions found.\n'));
      } else {
        sessions.forEach(session => {
          const status = session.status === 'completed' ? chalk.green('done') :
                         session.status === 'in-progress' ? chalk.yellow('active') :
                         chalk.red('stopped');
          const date = new Date(session.started).toLocaleDateString();
          console.log(`  ${status} ${chalk.cyan(session.topic)}`);
          console.log(`      ${chalk.dim(date)} . ${session.roles.length} roles . ${session.status}\n`);
        });
      }
    }

    return { sessions, count: sessions.length };
  }

  // -------------------------------------------------------------------------
  // gatherSupervisorContext — read project context files
  // -------------------------------------------------------------------------
  gatherSupervisorContext(cwd) {
    const ctx = {};

    // package.json
    const pkgPath = path.join(cwd, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        ctx.packageName = pkg.name || null;
        ctx.version = pkg.version || null;
        ctx.dependencies = Object.keys(pkg.dependencies || {});
        ctx.devDependencies = Object.keys(pkg.devDependencies || {});
      } catch (_) { /* ignore parse errors */ }
    }

    // ARCHITECTURE.md
    const archPath = path.join(cwd, 'ARCHITECTURE.md');
    if (fs.existsSync(archPath)) {
      try {
        const arch = fs.readFileSync(archPath, 'utf8');
        ctx.architecture = arch.slice(0, 2000); // Cap to avoid excessive size
      } catch (_) { /* ignore */ }
    }

    // DESIGN.md
    const designPath = path.join(cwd, 'DESIGN.md');
    if (fs.existsSync(designPath)) {
      try {
        ctx.design = fs.readFileSync(designPath, 'utf8').slice(0, 2000);
      } catch (_) { /* ignore */ }
    }

    // Recent change proposals
    const changesDir = path.join(cwd, 'stdd', 'changes');
    if (fs.existsSync(changesDir)) {
      try {
        const changes = fs.readdirSync(changesDir).filter(d => {
          const p = path.join(changesDir, d);
          return fs.statSync(p).isDirectory() && d !== 'archive';
        });
        ctx.recentChanges = changes.slice(0, 5);
      } catch (_) { /* ignore */ }
    }

    return ctx;
  }

  // -------------------------------------------------------------------------
  // saveDebateTranscript — write debate to markdown report
  // -------------------------------------------------------------------------
  saveDebateTranscript(debateResult) {
    fs.mkdirSync(this.reportsDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(this.reportsDir, `debate-${ts}.md`);

    const lines = [
      `# Debate Transcript`,
      ``,
      `**Topic:** ${debateResult.topic}`,
      `**Participants:** ${debateResult.roles.join(', ')}`,
      `**Date:** ${debateResult.timestamp}`,
      ``,
      `## Round 1: Opening Positions`,
      ``,
    ];

    for (const pos of debateResult.openingPositions) {
      lines.push(`### ${pos.role}`);
      lines.push(`**Position:** ${pos.position}`);
      lines.push(``);
      lines.push(`**Supporting Arguments:**`);
      pos.supportingArguments.forEach(a => lines.push(`- ${a}`));
      lines.push(``);
      lines.push(`**Concerns:**`);
      pos.concerns.forEach(c => lines.push(`- ${c}`));
      lines.push(``);
    }

    lines.push(`## Round 2: Rebuttals & Responses`);
    lines.push(``);

    for (const rebuttal of debateResult.rebuttals) {
      lines.push(`### ${rebuttal.role}`);
      if (rebuttal.agreements.length > 0) {
        lines.push(`**Agreements:**`);
        rebuttal.agreements.forEach(a => lines.push(`- ${a}`));
      }
      if (rebuttal.disagreements.length > 0) {
        lines.push(`**Disagreements:**`);
        rebuttal.disagreements.forEach(d => lines.push(`- ${d}`));
      }
      lines.push(`> ${rebuttal.summary}`);
      lines.push(``);
    }

    lines.push(`## Round 3: Synthesis`);
    lines.push(``);
    lines.push(`### Recommendations`);
    debateResult.synthesis.recommendations.forEach(r => lines.push(`- **[${r.source}]** ${r.text}`));
    lines.push(``);
    lines.push(`### Open Questions`);
    debateResult.synthesis.openQuestions.forEach(q => lines.push(`- **[${q.source}]** ${q.text}`));
    lines.push(``);

    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');

    console.log(chalk.dim(`  Debate transcript saved to: ${path.relative(this.cwd, filePath)}\n`));
  }

  // -------------------------------------------------------------------------
  // saveConsultReport — write consultation to markdown report
  // -------------------------------------------------------------------------
  saveConsultReport(query, roles, results, ctx, options) {
    fs.mkdirSync(this.reportsDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const primaryRole = roles[0].toLowerCase().replace(/\s+/g, '-');
    const filePath = path.join(this.reportsDir, `consult-${primaryRole}-${ts}.md`);

    const lines = [
      `# Consultation Report`,
      ``,
      `**Query:** ${query}`,
      `**Roles Consulted:** ${roles.join(', ')}`,
      `**Date:** ${new Date().toISOString()}`,
      ``,
    ];

    if (options.file) {
      lines.push(`**File Analyzed:** ${options.file}`);
      lines.push(``);
    }
    if (options.change) {
      lines.push(`**Change Proposal:** ${options.change}`);
      lines.push(``);
    }

    for (const result of results) {
      lines.push(`## ${result.role}`);
      lines.push(``);
      lines.push(result.summary);
      lines.push(``);

      if (result.risks && result.risks.length > 0) {
        lines.push(`### Risks`);
        result.risks.forEach(r => lines.push(`- ${r}`));
        lines.push(``);
      }

      if (result.recommendations && result.recommendations.length > 0) {
        lines.push(`### Recommendations`);
        result.recommendations.forEach(r => lines.push(`- ${r}`));
        lines.push(``);
      }

      if (result.questions && result.questions.length > 0) {
        lines.push(`### Open Questions`);
        result.questions.forEach(q => lines.push(`- ${q}`));
        lines.push(``);
      }
    }

    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');

    console.log(chalk.dim(`  Consultation report saved to: ${path.relative(this.cwd, filePath)}\n`));
  }

  // -------------------------------------------------------------------------
  // Session persistence
  // -------------------------------------------------------------------------
  loadSessions() {
    if (!fs.existsSync(this.sessionsPath)) {
      return [];
    }
    return fs.readFileSync(this.sessionsPath, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line));
  }

  recordSession(session) {
    fs.mkdirSync(this.supervisorDir, { recursive: true });
    fs.appendFileSync(this.sessionsPath, JSON.stringify(session) + '\n', 'utf8');
  }
}

module.exports = { SupervisorCommand, ROLES, ROLE_ANALYSIS_PATTERNS };
