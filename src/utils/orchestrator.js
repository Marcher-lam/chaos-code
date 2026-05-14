const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Auto-orchestration Engine
 *
 * Reads the Skill Graph and current project state to determine the next
 * autonomous action. Used by AI agents (Claude Code) to drive the STDD
 * workflow without requiring the user to remember all 65+ commands.
 */

// Skill Graph → Phase mapping
const SKILL_GRAPH = {
  init: { next: 'propose', phase: 0, label: '初始化' },
  propose: { next: 'clarify', phase: 1, label: '需求提案' },
  clarify: { next: 'confirm', phase: 1, label: '需求澄清', gate: true },
  confirm: { next: 'spec', phase: 1, label: '需求确认', gate: true },
  spec: { next: 'plan', phase: 2, label: 'BDD 规格' },
  plan: { next: 'apply', phase: 3, label: '任务拆解' },
  apply: { next: 'verify', phase: 4, label: 'TDD 实现', loop: true },
  verify: { next: 'archive', phase: 4, label: '验证' },
  archive: { next: null, phase: 5, label: '归档', gate: true },
};

// Intent-based shortcuts
const INTENT_MAP = {
  feature: ['init', 'new', 'propose', 'clarify', 'confirm', 'spec', 'plan', 'apply', 'verify', 'archive'],
  hotfix: ['init', 'issue', 'apply', 'verify', 'archive'],
  turbo: ['init', 'new', 'propose', 'spec', 'plan', 'apply', 'verify', 'archive'],
  explore: ['init', 'explore', 'brainstorm', 'final-doc'],
};

// Files that indicate completion of each phase
const PHASE_COMPLETION_MARKERS = {
  init: ['stdd/config.yaml'],
  propose: (dir) => fs.existsSync(path.join(dir, 'proposal.md')),
  clarify: (dir) => fs.existsSync(path.join(dir, 'clarification.json')),
  spec: (dir) => {
    const specsDir = path.join(dir, 'specs');
    return fs.existsSync(specsDir) && fs.readdirSync(specsDir).some(f => f.endsWith('.feature'));
  },
  plan: (dir) => {
    const tasksPath = path.join(dir, 'tasks.md');
    const designPath = path.join(dir, 'design.md');
    return fs.existsSync(tasksPath) || fs.existsSync(designPath);
  },
  apply: (dir) => {
    const tasksPath = path.join(dir, 'tasks.md');
    if (!fs.existsSync(tasksPath)) return false;
    const content = fs.readFileSync(tasksPath, 'utf-8');
    const total = (content.match(/\[[ x~]\]/g) || []).length;
    const done = (content.match(/\[x\]/g) || []).length;
    return total > 0 && done >= total;
  },
  verify: (dir) => {
    const evidenceDir = path.join(dir, 'evidence');
    return fs.existsSync(evidenceDir) && fs.readdirSync(evidenceDir).some(f => f.startsWith('verify-'));
  },
  archive: (dir) => {
    const archiveDir = path.join(path.dirname(dir), 'archive', path.basename(dir));
    return fs.existsSync(archiveDir);
  },
};

class Orchestrator {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.stddDir = path.join(cwd, 'stdd');
    this.graph = this.loadGraph();
  }

  loadGraph() {
    const graphPath = path.join(this.stddDir, 'graph', 'skills.yaml');
    if (!fs.existsSync(graphPath)) return SKILL_GRAPH;
    try {
      return yaml.load(fs.readFileSync(graphPath, 'utf-8'));
    } catch {
      return SKILL_GRAPH;
    }
  }

  /**
   * Get current active change
   */
  getActiveChange() {
    const changesDir = path.join(this.stddDir, 'changes');
    if (!fs.existsSync(changesDir)) return null;
    try {
      const entries = fs.readdirSync(changesDir, { withFileTypes: true });
      const active = entries
        .filter(e => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'archive')
        .sort((a, b) => a.name.localeCompare(b.name));
      return active.length > 0 ? active[0].name : null;
    } catch {
      return null;
    }
  }

  /**
   * Determine current phase of a change
   * @param {string} changeName
   * @returns {string|null}
   */
  detectPhase(changeName) {
    if (!changeName) return 'init';
    
    const changeDir = path.join(this.stddDir, 'changes', changeName);
    if (!fs.existsSync(changeDir)) return 'init';

    // Check phases in reverse order (most complete first)
    const checkOrder = ['archive', 'verify', 'apply', 'plan', 'spec', 'clarify', 'propose'];
    
    for (const phase of checkOrder) {
      const marker = PHASE_COMPLETION_MARKERS[phase];
      if (!marker) continue;
      if (typeof marker === 'function') {
        if (marker(changeDir)) return phase;
      }
    }

    return 'propose'; // Default: needs proposal
  }

  /**
   * Determine the next recommended action
   * @returns {object} { action, command, reason, phase, nextPhase }
   */
  recommend() {
    const change = this.getActiveChange();
    
    // No change yet → create one
    if (!change) {
      return {
        action: 'new',
        command: '/stdd:new',
        reason: '尚未创建任何变更。请描述你想实现的功能，我将自动创建并推进。',
        phase: 'init',
        progress: '0/8',
        instructions: '向用户询问需求描述，然后执行 /stdd:new <需求描述>',
      };
    }

    const phase = this.detectPhase(change);
    const changeDir = path.join(this.stddDir, 'changes', change);

    // Build phase progress
    const phases = ['propose', 'clarify', 'spec', 'plan', 'apply', 'verify'];
    const completedCount = phases.filter(p => {
      const marker = PHASE_COMPLETION_MARKERS[p];
      return marker && typeof marker === 'function' ? marker(changeDir) : false;
    }).length;

    switch (phase) {
      case 'propose':
        return {
          action: 'propose',
          command: '/stdd:propose',
          reason: `变更 "${change}" 已创建，需求草案尚未填写。`,
          phase: 'propose',
          progress: `${completedCount}/${phases.length}`,
          instructions: '自动执行 /stdd:propose 填写需求提案',
        };
      case 'clarify':
        return {
          action: 'clarify',
          command: '/stdd:clarify',
          reason: '需求提案已完成，需要多轮澄清确保理解正确。',
          phase: 'clarify',
          progress: `${completedCount}/${phases.length}`,
          instructions: '自动执行 /stdd:clarify 进行需求澄清',
        };
      case 'spec':
        return {
          action: 'plan',
          command: '/stdd:plan',
          reason: 'BDD 规格已生成，需要拆解为可执行任务。',
          phase: 'spec',
          progress: `${completedCount}/${phases.length}`,
          instructions: '自动执行 /stdd:plan 生成 tasks.md 和 design.md',
        };
      case 'plan':
        return {
          action: 'apply',
          command: '/stdd:apply',
          reason: '任务已拆解，可以开始 TDD 实现。',
          phase: 'plan',
          progress: `${completedCount}/${phases.length}`,
          instructions: '自动执行 /stdd:apply 开始 TDD 循环',
        };
      case 'apply': {
        const tasksPath = path.join(changeDir, 'tasks.md');
        let pendingTask = null;
        let allDone = false;
        if (fs.existsSync(tasksPath)) {
          const content = fs.readFileSync(tasksPath, 'utf-8');
          const match = content.match(/- \[[ ~]\] (.+)/);
          if (match) pendingTask = match[1];
          const total = (content.match(/\[[ x~]\]/g) || []).length;
          const done = (content.match(/\[x\]/g) || []).length;
          allDone = total > 0 && done >= total;
        }
        if (allDone) {
          return {
            action: 'verify',
            command: '/stdd:verify',
            reason: '所有任务已完成，需要验证。',
            phase: 'apply',
            progress: `${completedCount}/${phases.length}`,
            instructions: '自动执行 /stdd:verify 验证实现',
          };
        }
        return {
          action: 'apply',
          command: '/stdd:apply',
          reason: pendingTask 
            ? `待实现任务: "${pendingTask}"`
            : '有未完成的任务，继续 TDD 实现',
          phase: 'apply',
          progress: `${completedCount}/${phases.length}`,
          instructions: pendingTask
            ? `自动执行 /stdd:apply 实现任务 "${pendingTask}"`
            : '自动执行 /stdd:apply',
        };
      }
      case 'verify':
        return {
          action: 'archive',
          command: '/stdd:archive',
          reason: '验证通过，等待用户确认归档。',
          phase: 'verify',
          progress: `${completedCount}/${phases.length}`,
          instructions: '向用户展示验证结果，等待确认后执行 /stdd:archive',
          gate: true,
        };
      case 'archive':
        return {
          action: 'archive',
          command: '/stdd:archive',
          reason: '变更已准备好归档。',
          phase: 'archive',
          progress: `${phases.length}/${phases.length}`,
          instructions: '归档变更并等待新需求',
          gate: true,
        };
      default:
        return {
          action: 'unknown',
          command: '/stdd:recommend',
          reason: '无法确定当前状态，请运行 stdd recommend。',
          phase: 'unknown',
          progress: '?/8',
        };
    }
  }

  /**
   * Print a friendly progress report
   */
  printProgress() {
    const rec = this.recommend();
    const phaseLabels = {
      init: '🔧 初始化',
      propose: '📝 需求提案',
      clarify: '❓ 需求澄清',
      spec: '📋 BDD 规格',
      plan: '🎨 任务拆解',
      apply: '🔧 TDD 实现',
      verify: '✅ 验证',
      archive: '📦 归档',
    };

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📍 当前阶段: ${phaseLabels[rec.phase] || rec.phase}`);
    console.log(`📊 进度:     ${rec.progress}`);
    console.log(`💡 建议:     ${rec.reason}`);
    console.log(`▶️  命令:     ${rec.command}`);
    if (rec.instructions) {
      console.log(`📋 指令:     ${rec.instructions}`);
    }
    if (rec.gate) {
      console.log(`⚠️  确认门:   需要用户确认后继续`);
    }
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  }

  /**
   * Get the full workflow plan for an intent
   * @param {string} intent - feature | hotfix | turbo | explore
   * @returns {string[]} ordered list of phases
   */
  getPlan(intent = 'feature') {
    return INTENT_MAP[intent] || INTENT_MAP.feature;
  }
}

module.exports = { Orchestrator };
