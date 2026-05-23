const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
const { getPackageRoot } = require('./path-resolver');

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
}

module.exports = DynamicGraphRouter;
