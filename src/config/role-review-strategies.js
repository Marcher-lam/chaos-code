/**
 * Role Review Strategies
 * Per-role pattern sets for adversarial code review.
 *
 * Each role has specialised regex patterns targeting its domain expertise.
 * The global REVIEW_PATTERNS array (backward-compatible) is derived from
 * the high-severity patterns across all roles.
 */

const ROLE_REVIEW_PATTERNS = {
  security: {
    patterns: [
      // OWASP Top 10 coverage
      { regex: /password\s*=\s*['"][^'"]+['"]/i, severity: 'high', message: 'Hardcoded password' },
      { regex: /api[_-]?key\s*=\s*['"][^'"]+['"]/i, severity: 'high', message: 'Hardcoded API key' },
      { regex: /eval\s*\(/, severity: 'high', message: 'eval() usage - code injection risk' },
      { regex: /new\s+Function\s*\(/, severity: 'high', message: 'new Function() - code injection risk' },
      { regex: /innerHTML\s*=/, severity: 'high', message: 'innerHTML assignment - XSS risk' },
      { regex: /document\.write\s*\(/, severity: 'medium', message: 'document.write - XSS risk' },
      { regex: /\$\{[^}]*\}.*innerHTML/, severity: 'high', message: 'Template literal in innerHTML - XSS risk' },
      { regex: /SELECT\s+\*\s+FROM/i, severity: 'medium', message: 'SELECT * - potential data exposure' },
      { regex: /exec\s*\(.*\+/, severity: 'high', message: 'String concatenation in exec - command injection' },
      { regex: /require\s*\(\s*[^'"]/, severity: 'medium', message: 'Dynamic require - module injection risk' },
      { regex: /\.exec\(|\.spawn\(|\.execSync\(|\.spawnSync\(/, severity: 'low', message: 'Process execution - review for injection' },
      { regex: /https?:\/\/.*\$\{/, severity: 'medium', message: 'Dynamic URL construction - SSRF risk' },
      { regex: /Access-Control-Allow-Origin.*\*/, severity: 'medium', message: 'Wildcard CORS - overly permissive' },
      { regex: /private[_-]?key|secret[_-]?key|token\s*=\s*['"]/, severity: 'high', message: 'Hardcoded secret/token' },
      { regex: /crypto\.createHash\(\s*['"](?:md5|sha1)['"]/, severity: 'medium', message: 'Weak hash algorithm (md5/sha1)' },
      { regex: /child_process/, severity: 'low', message: 'child_process import - review usage' },
      { regex: /\.env\.production|\.env\.local/, severity: 'low', message: 'Environment file reference - check .gitignore' },
    ],
  },

  tester: {
    patterns: [
      { regex: /\.skip\s*\(/, severity: 'high', message: 'Skipped test' },
      { regex: /\.only\s*\(/, severity: 'high', message: 'Exclusive test - will skip all others' },
      { regex: /expect\(true\)|expect\(\d+\)|expect\(['"][^'"]+['"]\)/, severity: 'medium', message: 'Hard-coded assertion - likely weak test' },
      { regex: /\.toBeTruthy\(\)|\.toBeFalsy\(\)/, severity: 'medium', message: 'Truthy/falsy assertion - may miss edge cases' },
      { regex: /catch\s*\(\s*\w*\s*\)\s*\{\s*\}/, severity: 'high', message: 'Empty catch block - swallowed error' },
      { regex: /console\.log\(.*\)/, severity: 'low', message: 'console.log in test - likely debug leftover' },
      { regex: /assert\(true\)/, severity: 'medium', message: 'Tautological assertion - test always passes' },
      { regex: /done\(\)|callback\(\)/, severity: 'low', message: 'Manual done() callback - consider async/await' },
      { regex: /setTimeout.*\d{4,}/, severity: 'medium', message: 'Long timeout in test - potential flakiness' },
    ],
  },

  architect: {
    patterns: [
      { regex: /import\s+.*\s+from\s+['"]\.(\.\.\/){3,}/, severity: 'medium', message: 'Deep relative import - potential layering violation' },
      { regex: /class\s+\w+\s+extends\s+\w+\s+extends/, severity: 'low', message: 'Check inheritance depth' },
      { regex: /singleton/i, severity: 'low', message: 'Singleton pattern - consider dependency injection' },
      { regex: /\/\/\s*TODO|\/\/\s*HACK|\/\/\s*FIXME/, severity: 'low', message: 'Technical debt marker' },
      { regex: /require\s*\(\s*['"]\.\/\w+['"]\s*\).*require\s*\(\s*['"]\.\/\w+['"]\s*\)/s, severity: 'medium', message: 'Multiple local imports - check for circular dependencies' },
      { regex: /export\s+default\s+class\s+\w+\s*\{[\s\S]{500,}/, severity: 'low', message: 'Large exported class - consider splitting responsibilities' },
      { regex: /global\./, severity: 'medium', message: 'Global namespace mutation - coupling risk' },
      { regex: /window\.\w+\s*=/, severity: 'low', message: 'Window assignment - global state pollution' },
    ],
  },

  developer: {
    patterns: [
      { regex: /console\.log\s*\(/, severity: 'low', message: 'Debug console.log should not ship' },
      { regex: /debugger;/, severity: 'low', message: 'debugger statement should be removed' },
      { regex: /var\s+\w+/, severity: 'medium', message: 'var usage - prefer const/let' },
      { regex: /==(?!=)/, severity: 'medium', message: 'Loose equality (==) - use strict equality (===)' },
      { regex: /\.then\s*\([^)]*\)(?!\s*\.catch)/, severity: 'medium', message: 'Unhandled promise - add .catch() or use try/catch' },
      { regex: /callback\s*\(/, severity: 'low', message: 'Callback pattern - consider Promise/async' },
      { regex: /\/\*[\s\S]*?\*\//g, severity: 'low', message: 'Block comment - verify it is not hiding dead code' },
    ],
  },

  devops: {
    patterns: [
      { regex: /latest['"]?\s*$/m, severity: 'medium', message: '"latest" tag in image reference - pin to digest or version' },
      { regex: /localhost|127\.0\.0\.1|0\.0\.0\.0/, severity: 'low', message: 'Localhost reference - check environment-specificity' },
      { regex: /npm\s+publish|yarn\s+publish/, severity: 'medium', message: 'Publish command - verify auth and scope' },
      { regex: /sudo\s+/, severity: 'medium', message: 'sudo usage in script - principle of least privilege' },
      { regex: /chmod\s+777/, severity: 'high', message: 'chmod 777 - overly permissive file access' },
      { regex: /curl\s+.*\|\s*sh/, severity: 'high', message: 'Piped curl to shell - remote code execution risk' },
      { regex: /docker\s+run.*--privileged/, severity: 'high', message: 'Privileged Docker container - security risk' },
      { regex: /:latest/, severity: 'low', message: 'Floating "latest" tag - prefer deterministic versions' },
    ],
  },

  ux: {
    patterns: [
      { regex: /alert\s*\(/, severity: 'medium', message: 'alert() blocks UI - use non-blocking notifications' },
      { regex: /confirm\s*\(/, severity: 'low', message: 'confirm() is browser-native - consider custom dialog' },
      { regex: /prompt\s*\(/, severity: 'low', message: 'prompt() is browser-native - consider custom input' },
      { regex: /color:\s*#[0-9a-f]{3,6}(?!;)/i, severity: 'low', message: 'Hardcoded color - use design tokens' },
      { regex: /font-size:\s*\d+px/, severity: 'low', message: 'Fixed px font-size - consider rem/em for accessibility' },
      { regex: /tabindex=["']-?\d+["']/, severity: 'low', message: 'Explicit tabindex - verify focus order is logical' },
    ],
  },

  reviewer: {
    patterns: [
      { regex: /catch\s*\(\s*\w*\s*\)\s*\{\s*(\/\/|\/\*)?\s*\}/, severity: 'high', message: 'Empty or comment-only catch block' },
      { regex: /any\s*[;:\)=]/, severity: 'medium', message: 'TypeScript "any" - loses type safety' },
      { regex: /@ts-ignore|@ts-nocheck/, severity: 'medium', message: 'TypeScript suppression directive - fix the underlying issue' },
      { regex: /\/\* eslint-disable/, severity: 'medium', message: 'ESLint disabled - prefer inline disable with reason' },
      { regex: /TODO|FIXME|HACK|XXX/, severity: 'low', message: 'Technical debt marker found' },
      { regex: /\bnull\s*!\s*\./, severity: 'medium', message: 'Non-null assertion - unsafe runtime access' },
    ],
  },

  qalead: {
    patterns: [
      { regex: /coverageThreshold/, severity: 'low', message: 'Coverage threshold config found - verify targets are adequate' },
      { regex: /\.skip\s*\(/, severity: 'high', message: 'Skipped test - release risk if not addressed' },
      { regex: /xit\(|xdescribe\(/, severity: 'high', message: 'Disabled test (xit/xdescribe) - release risk' },
      { regex: /pending\s*\(/, severity: 'medium', message: 'Pending test - needs implementation before release' },
      { regex: /setTimeout.*\d{5,}/, severity: 'medium', message: 'Very long timeout - potential flaky test' },
      { regex: /retry\s*\(\s*\d/, severity: 'low', message: 'Test retry configured - investigate flakiness root cause' },
    ],
  },

  techwriter: {
    patterns: [
      { regex: /TBD|TBC|TBR/i, severity: 'medium', message: 'Documentation placeholder (TBD/TBC/TBR)' },
      { regex: /lorem\s+ipsum/i, severity: 'high', message: 'Lorem ipsum placeholder - replace with real content' },
      { regex: /\bxxx+\b/i, severity: 'medium', message: 'xxx placeholder - replace with real content' },
      { regex: /\[.*\]\(\s*\)/, severity: 'medium', message: 'Empty markdown link - missing href' },
      { regex: /```(\w*\n)\s*```/, severity: 'low', message: 'Empty code block in documentation' },
      { regex: /WIP\b/i, severity: 'low', message: 'Work-in-progress marker in docs' },
    ],
  },

  po: {
    patterns: [
      { regex: /assume|assumption/i, severity: 'low', message: 'Assumption found - convert to explicit requirement' },
      { regex: /TODO.*requirement|TODO.*spec/i, severity: 'medium', message: 'Unfinished requirement work' },
      { regex: /out of scope/i, severity: 'low', message: '"Out of scope" mention - verify documented exclusion' },
      { regex: /as a user|i want|so that/i, severity: 'low', message: 'User story format detected - verify completeness' },
    ],
  },

  ba: {
    patterns: [
      { regex: /business\s*rule/i, severity: 'low', message: 'Business rule reference - verify documented' },
      { regex: /compliance|regulatory|GDPR|HIPAA|SOC\s*2/i, severity: 'medium', message: 'Compliance keyword - verify requirements addressed' },
      { regex: /stakeholder/i, severity: 'low', message: 'Stakeholder reference - verify sign-off status' },
    ],
  },

  dataanalyst: {
    patterns: [
      { regex: /console\.log\(.*\b(data|metric|analytics|event)\b/i, severity: 'medium', message: 'Data logged to console - may leak PII' },
      { regex: /track\(|analytics\.|gtag\(|mixpanel|segment/i, severity: 'low', message: 'Analytics call found - verify event schema' },
      { regex: /PII|personally\s+identifiable/i, severity: 'medium', message: 'PII reference - verify handling compliance' },
      { regex: /\.aggregate\(|\.group\(|\.sum\(|\.count\(/, severity: 'low', message: 'Aggregation call - verify correctness' },
    ],
  },
};

/**
 * Build the flat REVIEW_PATTERNS array that the original codebase exported.
 * Pulls the high-severity patterns from each role to maintain backward
 * compatibility while the richer role-specific sets live above.
 */
const REVIEW_PATTERNS = [];
for (const [roleId, strategy] of Object.entries(ROLE_REVIEW_PATTERNS)) {
  for (const p of strategy.patterns) {
    REVIEW_PATTERNS.push({
      role: roleId,
      severity: p.severity,
      pattern: p.regex,
      message: p.message,
    });
  }
}

module.exports = { ROLE_REVIEW_PATTERNS, REVIEW_PATTERNS };
