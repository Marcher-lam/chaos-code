const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { createLogger } = require('./logger');
const _log = createLogger('WorkflowDslInterpreter');

class WorkflowDslInterpreter {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
  }

  /**
   * Load and parse a workflow YAML file
   * @param {string} filePath - Absolute or relative path to workflow YAML
   * @returns {Object} Parsed workflow JSON
   */
  load(filePath) {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(this.cwd, filePath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Workflow file not found: ${filePath}`);
    }
    try {
      const content = fs.readFileSync(absolutePath, 'utf8');
      return yaml.load(content);
    } catch (err) {
      throw new Error(`Failed to parse workflow YAML: ${err.message}`);
    }
  }

  /**
   * Compiles the workflow into a validated topological order (DAG) using Kahn's algorithm
   * @param {Object} workflow - Parsed workflow object
   * @returns {Object} Compiled DAG with { name, description, steps: string[] }
   */
  compile(workflow) {
    if (!workflow || typeof workflow !== 'object') {
      throw new Error('Invalid workflow object');
    }

    const name = workflow.name || 'Custom Workflow';
    const description = workflow.description || '';
    const skills = workflow.skills || {};
    const nodes = Object.keys(skills);

    if (nodes.length === 0) {
      return { name, description, steps: [] };
    }

    // Build standard dependency mappings: node -> Set of dependencies
    const dependencies = {};
    for (const node of nodes) {
      dependencies[node] = new Set();
    }

    // 1. Gather dependencies from skill nodes: depends_on
    for (const node of nodes) {
      const nodeDef = skills[node];
      if (nodeDef.depends_on && Array.isArray(nodeDef.depends_on)) {
        for (const dep of nodeDef.depends_on) {
          if (skills[dep]) {
            dependencies[node].add(dep);
          }
        }
      }
    }

    // 2. Gather dependencies from skill nodes: next (node -> next implies next depends on node)
    for (const node of nodes) {
      const nodeDef = skills[node];
      if (nodeDef.next && Array.isArray(nodeDef.next)) {
        for (const nextNode of nodeDef.next) {
          if (skills[nextNode]) {
            dependencies[nextNode].add(node);
          }
        }
      }
    }

    // 3. Gather dependencies from explicit root level dependencies block
    if (workflow.dependencies && typeof workflow.dependencies === 'object') {
      for (const [node, depDef] of Object.entries(workflow.dependencies)) {
        if (skills[node] && depDef && Array.isArray(depDef.requires)) {
          for (const dep of depDef.requires) {
            if (skills[dep]) {
              dependencies[node].add(dep);
            }
          }
        }
      }
    }

    // --- Kahn's Topological Sorting Algorithm ---
    const inDegree = {};
    const adjacencyList = {};

    // Initialize
    for (const node of nodes) {
      inDegree[node] = 0;
      adjacencyList[node] = [];
    }

    // Populate adjacency list and compute in-degrees
    for (const node of nodes) {
      for (const dep of dependencies[node]) {
        adjacencyList[dep].push(node);
        inDegree[node]++;
      }
    }

    // Collect all nodes with 0 dependencies
    const queue = [];
    for (const node of nodes) {
      if (inDegree[node] === 0) {
        queue.push(node);
      }
    }

    // Process queue
    const steps = [];
    while (queue.length > 0) {
      // Sort queue to keep the order deterministic
      queue.sort();
      const u = queue.shift();
      steps.push(u);

      for (const v of adjacencyList[u]) {
        inDegree[v]--;
        if (inDegree[v] === 0) {
          queue.push(v);
        }
      }
    }

    // If topological sort does not contain all nodes, there is a cycle!
    if (steps.length !== nodes.length) {
      const cyclicNodes = nodes.filter(n => inDegree[n] > 0);
      throw new Error(`Cyclic dependency detected in workflow among nodes: ${cyclicNodes.join(', ')}`);
    }

    return {
      name,
      description,
      steps,
      skills
    };
  }
}

module.exports = { WorkflowDslInterpreter };
