const MODES = new Set(['suggest', 'guarded', 'autonomous']);

class PermissionPolicy {
  constructor(options = {}) {
    this.mode = MODES.has(options.mode) ? options.mode : 'guarded';
    this.allowedTools = new Set(options.allowedTools || []);
    this.deniedTools = new Set(options.deniedTools || []);
  }

  decide(tool) {
    if (!tool || !tool.name) {
      return { decision: 'deny', reason: 'unknown-tool' };
    }
    if (this.deniedTools.has(tool.name)) {
      return { decision: 'deny', reason: 'explicit-deny' };
    }
    if (this.allowedTools.has(tool.name)) {
      return { decision: 'allow', reason: 'explicit-allow' };
    }
    if (this.mode === 'suggest') {
      return tool.risk === 'safe'
        ? { decision: 'allow', reason: 'safe-read' }
        : { decision: 'ask', reason: 'suggest-mode-no-write' };
    }
    if (this.mode === 'autonomous') {
      return tool.risk === 'dangerous'
        ? { decision: 'deny', reason: 'dangerous-tool' }
        : { decision: tool.requiresApproval ? 'ask' : 'allow', reason: tool.requiresApproval ? 'approval-required' : 'autonomous-safe' };
    }
    if (tool.risk === 'safe') {
      return { decision: 'allow', reason: 'safe-tool' };
    }
    if (tool.risk === 'guarded' && tool.requiresApproval === false) {
      return { decision: 'allow', reason: 'guarded-tool-without-approval' };
    }
    if (tool.risk === 'dangerous') {
      return { decision: 'deny', reason: 'dangerous-tool' };
    }
    return { decision: 'ask', reason: 'guarded-mode' };
  }
}

module.exports = { PermissionPolicy };
