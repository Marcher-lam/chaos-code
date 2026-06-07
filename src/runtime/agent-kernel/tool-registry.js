const DEFAULT_TOOLS = [
  {
    name: 'stdd.status',
    description: 'Inspect active STDD change state and workflow position.',
    category: 'stdd',
    risk: 'safe',
    requiresApproval: false,
  },
  {
    name: 'stdd.recommend',
    description: 'Recommend the next STDD workflow step from current artifacts.',
    category: 'stdd',
    risk: 'safe',
    requiresApproval: false,
  },
  {
    name: 'stdd.apply',
    description: 'Advance a task through the Ralph Loop TDD phase gate.',
    category: 'stdd',
    risk: 'guarded',
    requiresApproval: true,
  },
  {
    name: 'stdd.verify',
    description: 'Run verification and Constitution quality checks.',
    category: 'stdd',
    risk: 'guarded',
    requiresApproval: false,
  },
  {
    name: 'fs.read',
    description: 'Read files inside the workspace for context gathering.',
    category: 'filesystem',
    risk: 'safe',
    requiresApproval: false,
  },
  {
    name: 'fs.search',
    description: 'Search workspace files by pattern or content.',
    category: 'filesystem',
    risk: 'safe',
    requiresApproval: false,
  },
  {
    name: 'fs.patch',
    description: 'Apply a reviewed patch to workspace files.',
    category: 'filesystem',
    risk: 'write',
    requiresApproval: true,
  },
  {
    name: 'shell.run',
    description: 'Run a bounded shell command through the command runner.',
    category: 'shell',
    risk: 'write',
    requiresApproval: true,
  },
  {
    name: 'test.run',
    description: 'Run configured tests and normalize the result as evidence.',
    category: 'quality',
    risk: 'guarded',
    requiresApproval: false,
  },
  {
    name: 'git.diff',
    description: 'Inspect working tree diff before and after agent changes.',
    category: 'git',
    risk: 'safe',
    requiresApproval: false,
  },
];

class ToolRegistry {
  constructor(tools = DEFAULT_TOOLS) {
    this.tools = new Map();
    for (const tool of tools) {
      this.register(tool);
    }
  }

  register(tool) {
    if (!tool || !tool.name) {
      throw new Error('Tool requires a name.');
    }
    this.tools.set(tool.name, {
      category: 'custom',
      risk: 'guarded',
      requiresApproval: true,
      ...tool,
    });
    return this;
  }

  get(name) {
    return this.tools.get(name) || null;
  }

  list(filter = {}) {
    const values = Array.from(this.tools.values()).sort((a, b) => a.name.localeCompare(b.name));
    return values.filter(tool => {
      if (filter.category && tool.category !== filter.category) return false;
      if (filter.risk && tool.risk !== filter.risk) return false;
      return true;
    });
  }

  toPromptCatalog() {
    return this.list().map(tool => ({
      name: tool.name,
      description: tool.description,
      risk: tool.risk,
      requiresApproval: Boolean(tool.requiresApproval),
    }));
  }
}

module.exports = { DEFAULT_TOOLS, ToolRegistry };
