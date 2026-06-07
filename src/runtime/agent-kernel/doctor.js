const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function checkStatus(value) {
  if (value === true) return 'pass';
  if (value === false) return 'fail';
  return 'warn';
}

class AgentDoctor {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
  }

  run() {
    const items = [];
    items.push(this.agentConfig());
    items.push(this.isGitRepo());
    items.push(this.testCommand());
    items.push(this.llmKey());
    items.push(this.nodeVersion());
    items.push(this.packageManager());
    items.push(this.runReports());
    items.push(this.mcpExposeWrite());
    items.push(this.patchApplyPolicy());
    items.push(this.workingTreeDirty());
    items.push(this.recommendNext());
    return items;
  }

  agentConfig() {
    const file = path.join(this.cwd, 'stdd', 'agent', 'config.yaml');
    return {
      id: 'agent-config',
      status: fs.existsSync(file) ? 'pass' : 'warn',
      message: fs.existsSync(file) ? 'Agent config present' : 'stdd/agent/config.yaml missing (run stdd agent --init-config)',
    };
  }

  isGitRepo() {
    try {
      execSync('git rev-parse --git-dir', { cwd: this.cwd, encoding: 'utf8', stdio: 'pipe' });
      return { id: 'git-repo', status: 'pass', message: 'Git repository detected' };
    } catch (_) {
      return { id: 'git-repo', status: 'warn', message: 'Not a git repository (git.diff will be unavailable)' };
    }
  }

  testCommand() {
    const defaults = this.tryReadConfigDefaults();
    if (defaults && defaults.test_command) {
      return { id: 'test-command', status: 'pass', message: `Test command configured: ${defaults.test_command}` };
    }
    const hasNpmTest = this.hasPackageJsonTest();
    if (hasNpmTest) {
      return { id: 'test-command', status: 'pass', message: 'Test command available via package.json scripts.test' };
    }
    return { id: 'test-command', status: 'warn', message: 'No test command configured in agent config or package.json' };
  }

  llmKey() {
    const hasKey = Boolean(process.env.STDD_LLM_API_KEY || process.env.OPENAI_API_KEY);
    return {
      id: 'llm-key',
      status: hasKey ? 'pass' : 'warn',
      message: hasKey ? 'LLM API key detected' : 'No LLM API key set (STDD_LLM_API_KEY or OPENAI_API_KEY)',
    };
  }

  nodeVersion() {
    const version = process.version;
    const major = parseInt(version.slice(1).split('.')[0], 10);
    return {
      id: 'node-version',
      status: major >= 18 ? 'pass' : 'fail',
      message: `Node.js ${version} (minimum 18 required)`,
    };
  }

  packageManager() {
    const detected = this.detectPackageManager();
    return {
      id: 'package-manager',
      status: detected ? 'pass' : 'warn',
      message: detected ? `Package manager: ${detected}` : 'No lockfile or package.json detected',
    };
  }

  runReports() {
    const dir = path.join(this.cwd, 'stdd', 'agent', 'runs');
    if (!fs.existsSync(dir)) {
      return { id: 'run-reports', status: 'info', message: 'No run reports yet (they will appear after --write-report)' };
    }
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    const failCount = files.filter(file => {
      try { return JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')).status === 'fail'; } catch (_) { return false; }
    }).length;
    return {
      id: 'run-reports',
      status: failCount > 0 ? 'warn' : 'pass',
      message: `${files.length} run reports, ${failCount} failed`,
    };
  }

  mcpExposeWrite() {
    const config = this.tryReadConfigDefaults();
    const exposeWrite = config && config.mcp && config.mcp.expose_write_tools;
    return {
      id: 'mcp-expose-write',
      status: exposeWrite ? 'warn' : 'pass',
      message: exposeWrite ? 'MCP exposes write-capable agent tools' : 'MCP write-capable tools are not exposed (safe default)',
    };
  }

  patchApplyPolicy() {
    const config = this.tryReadConfigDefaults();
    const setting = (config && config.tools && config.tools['fs.patch.apply']) || 'ask';
    return {
      id: 'patch-apply-policy',
      status: setting === 'ask' ? 'pass' : 'warn',
      message: `fs.patch.apply policy: ${setting} (ask is safest)`,
    };
  }

  workingTreeDirty() {
    try {
      const out = execSync('git status --porcelain', { cwd: this.cwd, encoding: 'utf8', stdio: 'pipe' }).trim();
      return {
        id: 'working-tree',
        status: out ? 'warn' : 'pass',
        message: out ? `Working tree has uncommitted changes (${out.split('\n').length} files)` : 'Working tree clean',
      };
    } catch (_) {
      return { id: 'working-tree', status: 'info', message: 'Could not check working tree (not a git repo)' };
    }
  }

  recommendNext() {
    const items = [];
    const configPath = path.join(this.cwd, 'stdd', 'agent', 'config.yaml');
    if (!fs.existsSync(configPath)) items.push('stdd agent --init-config');
    const hasKey = process.env.STDD_LLM_API_KEY || process.env.OPENAI_API_KEY;
    if (!hasKey) items.push('export STDD_LLM_API_KEY=...');
    const dir = path.join(this.cwd, 'stdd', 'agent', 'runs');
    const hasRuns = fs.existsSync(dir) && fs.readdirSync(dir).some(f => f.endsWith('.json'));
    if (hasRuns) items.push('stdd agent --history --json');
    else items.push('stdd agent "implement ..." to create native agent plan');
    return {
      id: 'recommend-next',
      status: 'info',
      message: items.join('; '),
    };
  }

  detectPackageManager() {
    if (fs.existsSync(path.join(this.cwd, 'pnpm-lock.yaml'))) return 'pnpm';
    if (fs.existsSync(path.join(this.cwd, 'yarn.lock'))) return 'yarn';
    if (fs.existsSync(path.join(this.cwd, 'bun.lockb'))) return 'bun';
    if (fs.existsSync(path.join(this.cwd, 'package.json'))) return 'npm';
    return null;
  }

  hasPackageJsonTest() {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(this.cwd, 'package.json'), 'utf8'));
      return Boolean(pkg.scripts && pkg.scripts.test);
    } catch (_) {
      return false;
    }
  }

  tryReadConfigDefaults() {
    try {
      const yaml = require('js-yaml');
      const file = path.join(this.cwd, 'stdd', 'agent', 'config.yaml');
      if (!fs.existsSync(file)) return null;
      return yaml.load(fs.readFileSync(file, 'utf8')) || {};
    } catch (_) {
      return null;
    }
  }
}

module.exports = { AgentDoctor };
