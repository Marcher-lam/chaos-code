const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const DEFAULT_AGENT_CONFIG = {
  mode: 'guarded',
  defaults: {
    test_command: null,
    model: 'gpt-4o-mini',
    write_report: false,
  },
  tools: {
    'fs.patch.apply': 'ask',
    'test.run': 'allow',
    'git.diff': 'allow',
    'llm.diff': 'ask',
  },
  mcp: {
    expose_write_tools: false,
  },
};

class AgentConfig {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.configPath = path.join(cwd, 'stdd', 'agent', 'config.yaml');
  }

  load() {
    if (!fs.existsSync(this.configPath)) return clone(DEFAULT_AGENT_CONFIG);
    const loaded = yaml.load(fs.readFileSync(this.configPath, 'utf8')) || {};
    return mergeConfig(DEFAULT_AGENT_CONFIG, loaded);
  }

  writeDefault(options = {}) {
    if (fs.existsSync(this.configPath) && !options.force) {
      throw new Error('Agent config already exists. Use --force to overwrite.');
    }
    fs.mkdirSync(path.dirname(this.configPath), { recursive: true });
    fs.writeFileSync(this.configPath, yaml.dump(DEFAULT_AGENT_CONFIG, { lineWidth: 100 }), 'utf8');
    return path.relative(this.cwd, this.configPath).replace(/\\/g, '/');
  }
}

function mergeConfig(base, override) {
  return {
    ...clone(base),
    ...override,
    defaults: { ...base.defaults, ...(override.defaults || {}) },
    tools: { ...base.tools, ...(override.tools || {}) },
    mcp: { ...base.mcp, ...(override.mcp || {}) },
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

module.exports = { AgentConfig, DEFAULT_AGENT_CONFIG, mergeConfig };
