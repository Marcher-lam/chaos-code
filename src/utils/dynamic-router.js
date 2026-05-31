const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
const { getPackageRoot } = require('./path-resolver');
const { ProfileEngine } = require('./profile-engine');
const { CONDITION_ENGINE, PROFILES } = require('../config/planning-profiles');

class DynamicGraphRouter {
  constructor(configPath = 'stdd/graph/skills.yaml') {
    this.rawGraph = this.loadGraph(configPath);
    this.intentPathways = {
      'hotfix': ['stdd-issue', 'stdd-apply', 'stdd-verify', 'stdd-archive'],
      'feature': ['stdd-propose', 'stdd-spec', 'stdd-plan', 'stdd-outside-in', 'stdd-apply', 'stdd-verify'],
      'brownfield': ['stdd-explore', 'stdd-init', 'stdd-propose', 'stdd-spec', 'stdd-plan', 'stdd-apply', 'stdd-verify'],
      'repair': ['stdd-fix-packet', 'stdd-apply', 'stdd-verify'],
      'research': ['stdd-explore', 'stdd-brainstorm', 'stdd-final-doc'],
    };
  }

  loadGraph(configPath) {
    try {
      const fullPath = path.isAbsolute(configPath) ? configPath : path.join(getPackageRoot(), configPath);
      const content = fs.readFileSync(fullPath, 'utf8');
      return yaml.load(content) || { skills: {} };
    } catch (e) {
      return { version: '1.0', config: {}, skills: {} };
    }
  }

  compile(intent = 'feature') {
    const pathway = this.intentPathways[intent] || this.intentPathways['feature'];
    let dynamicGraph = {
      version: this.rawGraph.version || '1.0',
      name: `STDD Dynamic Graph - [${intent.toUpperCase()}]`,
      config: this.rawGraph.config || {},
      skills: {}
    };

    pathway.forEach((skillName, index) => {
      let nodeRef = this.rawGraph.skills && this.rawGraph.skills[skillName] 
          ? JSON.parse(JSON.stringify(this.rawGraph.skills[skillName])) 
          : { description: `Auto-generated node for ${skillName}` };
          
      // 动态重组拓扑前置依赖
      nodeRef.depends_on = index === 0 ? [] : [pathway[index - 1]];
      dynamicGraph.skills[skillName] = nodeRef;
    });

    return dynamicGraph;
  }

  /**
   * Compile a profile-aware dynamic graph.
   * Takes the base pathway from compile() and adjusts it according to the
   * selected planning profile (quick / standard / thorough / enterprise).
   *
   * @param {string} intent   Change intent (hotfix, feature, brownfield, …)
   * @param {string} profileId  Profile id from planning-profiles.js
   * @returns {object} Dynamic graph with the same structure as compile() output
   */
  compileWithProfile(intent = 'feature', profileId = 'standard') {
    const baseGraph = this.compile(intent);

    const profileEngine = new ProfileEngine();
    const phaseConfig = profileEngine.getPhaseConfig(profileId);
    if (!phaseConfig) {
      // Unknown profile — fall back to unmodified graph
      return baseGraph;
    }

    // ---- helpers ----
    const phaseToSkill = (phase) => `stdd-${phase}`;

    // Rebuild skill list preserving order
    const skillNames = Object.keys(baseGraph.skills);

    // Build a set of phases to skip from the profile definition
    const profile = PROFILES[profileId];
    const skipPhases = new Set(profile.phases.skip);

    // Map skip phases to skill names
    const skipSkills = new Set();
    for (const phase of skipPhases) {
      skipSkills.add(phaseToSkill(phase));
    }

    // Profile-specific adjustments
    let filtered = skillNames.filter(s => !skipSkills.has(s));

    // -- quick profile --
    if (profileId === 'quick') {
      // Ensure stdd-clarify and stdd-mutation are removed
      filtered = filtered.filter(s => s !== 'stdd-clarify' && s !== 'stdd-mutation');
    }

    // -- thorough profile --
    const insertions = []; // { after: skillName, skillName, nodeRef }
    if (profileId === 'thorough') {
      // Insert extra review node after stdd-apply
      insertions.push({
        after: 'stdd-apply',
        skillName: 'stdd-review',
        nodeRef: {
          description: 'Thorough review gate — mandatory after apply',
          phase: 'review',
        },
      });
      // Require stdd-mutation — insert after stdd-apply
      insertions.push({
        after: 'stdd-apply',
        skillName: 'stdd-mutation',
        nodeRef: {
          description: 'Required mutation testing for thorough profile',
          phase: 'mutation',
        },
      });
    }

    // -- enterprise profile --
    if (profileId === 'enterprise') {
      // Insert stdd-guard after every apply-like node
      const applyNodes = filtered.filter(s => s.startsWith('stdd-apply') || s === 'stdd-apply');
      for (const applyNode of applyNodes) {
        insertions.push({
          after: applyNode,
          skillName: `stdd-guard`,
          nodeRef: {
            description: 'Enterprise guard gate — compliance and policy check',
            phase: 'guard',
          },
        });
      }
      // Insert stdd-constitution before archive
      insertions.push({
        after: '__before_archive__',
        skillName: 'stdd-constitution',
        nodeRef: {
          description: 'Enterprise constitution check — final governance gate',
          phase: 'constitution-check',
        },
      });
    }

    // Apply insertions
    const expanded = [];
    for (let i = 0; i < filtered.length; i++) {
      expanded.push(filtered[i]);
      // Insert nodes that go after the current skill
      for (const ins of insertions) {
        if (ins.after === filtered[i]) {
          expanded.push(ins.skillName);
        }
      }
      // Special: insert before archive
      if (filtered[i] === 'stdd-archive') {
        for (const ins of insertions) {
          if (ins.after === '__before_archive__') {
            expanded.pop(); // remove archive temporarily
            expanded.push(ins.skillName);
            expanded.push('stdd-archive');
          }
        }
      }
    }

    // Build final graph with correct depends_on chains
    const dynamicGraph = {
      version: baseGraph.version,
      name: `${baseGraph.name} [${profileId.toUpperCase()}]`,
      config: { ...baseGraph.config, profileId },
      skills: {},
    };

    for (let i = 0; i < expanded.length; i++) {
      const skillName = expanded[i];
      let nodeRef;
      // Check if this was an insertion
      const insertion = insertions.find(ins => ins.skillName === skillName);
      if (insertion) {
        nodeRef = { ...insertion.nodeRef };
      } else {
        nodeRef = JSON.parse(JSON.stringify(baseGraph.skills[skillName]));
      }
      nodeRef.depends_on = i === 0 ? [] : [expanded[i - 1]];
      dynamicGraph.skills[skillName] = nodeRef;
    }

    return dynamicGraph;
  }
  compileConditional(intent = 'feature', context = {}) {
    const profileId = context.profileId || 'standard';
    const profileGraph = this.compileWithProfile(intent, profileId);
    const phases = Object.keys(profileGraph.skills);
    const evaluatedPhases = [];

    for (const phase of phases) {
      const condition = this._getPhaseCondition(phase);
      const shouldExecute = CONDITION_ENGINE.evaluate(condition, context);
      evaluatedPhases.push({
        phase,
        status: shouldExecute ? 'execute' : 'skip',
        condition,
        skill: shouldExecute ? profileGraph.skills[phase] : null,
      });
    }

    return { ...profileGraph, conditionalPhases: evaluatedPhases, context, compilationType: 'conditional' };
  }

  _getPhaseCondition(phase) {
    const map = {
      'stdd-clarify': 'profile:thorough || profile:enterprise',
      'stdd-mutation': 'complexity>30',
      'stdd-adr': 'complexity>60',
      'stdd-security-audit': 'complexity>80',
      'stdd-multi-role-review': 'complexity>60',
    };
    return map[phase] || null;
  }
}

module.exports = DynamicGraphRouter;
