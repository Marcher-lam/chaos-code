const { ConstitutionChecker } = require('../commands/constitution-checker');
const { resolveWorkspace } = require('../../utils/workspace-detector');
const WorkspaceCache = require('../../utils/workspace-cache');

async function checkConstitutionAction(args) {
  const cwd = process.cwd();
  const options = {
    workspace: args.workspace || null,
    force: !!args.force
  };
  const resolvedWorkspace = options.workspace ? resolveWorkspace(cwd, options.workspace) : null;
  const wsCache = new WorkspaceCache(cwd);

  if (options.workspace && !options.force) {
    const cached = wsCache.getValidCache(options.workspace, 'constitution');
    if (cached) {
      const violations = cached.issues;
      const all = [...(violations.blocking || []), ...(violations.warning || []), ...(violations.suggestion || [])];
      all.forEach(v => console.log(`  ${v.severity === 'blocking' ? '✗' : v.severity === 'warning' ? '⚠' : 'ℹ'} Article ${v.article}: ${v.message}`));
      console.log(all.length ? '' : '✓ All articles pass\n');
      console.log('Constitution check passed [Cached]');
      return;
    }
  }

  const checker = new ConstitutionChecker(cwd, { ...options, workspace: resolvedWorkspace });
  checker.loadWaivers();
  checker.run();
  const violations = checker.issues;
  const hasBlocking = (violations.blocking || []).length > 0;

  if (options.workspace && !hasBlocking) {
    wsCache.setCache(options.workspace, 'constitution', { status: 'pass', issues: violations });
  }

  const all = [...(violations.blocking || []), ...(violations.warning || []), ...(violations.suggestion || [])];
  all.forEach(v => console.log(`  ${v.severity === 'blocking' ? '✗' : v.severity === 'warning' ? '⚠' : 'ℹ'} Article ${v.article}: ${v.message}`));
  console.log(all.length ? '' : '✓ All articles pass\n');
  console.log(hasBlocking ? 'Constitution check completed with violations' : 'Constitution check passed');
}

module.exports = { checkConstitutionAction };
