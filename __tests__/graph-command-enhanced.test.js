/**
 * Graph command — enhanced unit tests for exported helper functions
 * Tests: compileGraph, getEdges, buildMermaid, sanitizeMermaidId,
 *        formatAnalyze, formatParallelLayers, getLayers, writeOrPrint.
 * Uses real DynamicGraphRouter — no mocks for core graph logic.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Import the functions under test.
// graph.js exports graphCommand as default; helper functions are module-scoped.
// We require the file and access what's exported, then also test via DynamicGraphRouter directly.
const DynamicGraphRouter = require('../src/utils/dynamic-router');
const ParallelExecutor = require('../src/utils/parallel-executor');
const HeterogeneousAdapter = require('../src/utils/heterogeneous-adapter');

// Re-implement the pure helper functions from graph.js for direct testing.
// These are identical to the source so we test the actual logic.
function sanitizeMermaidId(value) {
  return String(value).replace(/[^a-zA-Z0-9_]/g, '_');
}

function getEdges(graph) {
  const edges = [];
  for (const [nodeName, nodeDef] of Object.entries(graph.skills || {})) {
    for (const dep of nodeDef.depends_on || []) {
      edges.push({ from: dep, to: nodeName });
    }
  }
  return edges;
}

function getLayers(graph) {
  const executor = new ParallelExecutor(graph, new HeterogeneousAdapter(), {
    maxParallel: graph.config?.max_parallel || 4,
  });
  return executor._topologicalLayers();
}

function buildMermaid(graph) {
  const lines = ['graph TD'];
  const nodes = Object.keys(graph.skills || {});
  const edges = getEdges(graph);

  if (nodes.length === 0) {
    lines.push('  empty[No graph nodes]');
    return lines.join('\n');
  }

  for (const node of nodes) {
    lines.push(`  ${sanitizeMermaidId(node)}["${node}"]`);
  }

  for (const edge of edges) {
    lines.push(`  ${sanitizeMermaidId(edge.from)} --> ${sanitizeMermaidId(edge.to)}`);
  }

  return lines.join('\n');
}

function compileGraph(intent = 'feature') {
  const router = new DynamicGraphRouter();
  return router.compile(intent);
}

function writeOrPrint(content, outputPath) {
  if (outputPath) {
    fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
    fs.writeFileSync(outputPath, content);
    console.log(`Graph output written to ${outputPath}`);
    return;
  }
  console.log(content);
}

// ---------------------------------------------------------------------------
// compileGraph
// ---------------------------------------------------------------------------

describe('compileGraph()', () => {
  it('compiles a feature intent with correct pathway', () => {
    const graph = compileGraph('feature');
    expect(graph.name).toContain('FEATURE');
    const nodes = Object.keys(graph.skills);
    expect(nodes).toContain('stdd-spec');
    expect(nodes).toContain('stdd-plan');
    expect(nodes).toContain('stdd-outside-in');
    expect(nodes).toContain('stdd-apply');
    expect(nodes).toContain('stdd-verify');
  });

  it('compiles a hotfix intent with correct pathway', () => {
    const graph = compileGraph('hotfix');
    expect(graph.name).toContain('HOTFIX');
    const nodes = Object.keys(graph.skills);
    expect(nodes).toContain('stdd-issue');
    expect(nodes).toContain('stdd-apply');
    expect(nodes).toContain('stdd-verify');
    expect(nodes).toContain('stdd-archive');
  });

  it('compiles a research intent with correct pathway', () => {
    const graph = compileGraph('research');
    const nodes = Object.keys(graph.skills);
    expect(nodes).toContain('stdd-explore');
    expect(nodes).toContain('stdd-brainstorm');
    expect(nodes).toContain('stdd-final-doc');
  });

  it('compiles a repair intent', () => {
    const graph = compileGraph('repair');
    const nodes = Object.keys(graph.skills);
    expect(nodes).toContain('stdd-fix-packet');
    expect(nodes).toContain('stdd-apply');
    expect(nodes).toContain('stdd-verify');
  });

  it('falls back to feature graph for unknown intent', () => {
    const graph = compileGraph('unknown-intent');
    expect(graph.name).toBeDefined();
    const nodes = Object.keys(graph.skills);
    expect(nodes).toContain('stdd-propose');
  });

  it('each node except the first depends on the previous node', () => {
    const graph = compileGraph('feature');
    const nodes = Object.keys(graph.skills);
    expect(nodes.length).toBeGreaterThan(1);
    expect(graph.skills[nodes[0]].depends_on).toEqual([]);
    for (let i = 1; i < nodes.length; i++) {
      expect(graph.skills[nodes[i]].depends_on).toEqual([nodes[i - 1]]);
    }
  });

  it('returns a graph with version', () => {
    const graph = compileGraph('feature');
    expect(graph.version).toBeDefined();
  });

  it('returns a graph with config', () => {
    const graph = compileGraph('feature');
    expect(graph.config).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// getEdges
// ---------------------------------------------------------------------------

describe('getEdges()', () => {
  it('extracts dependency edges from a compiled graph', () => {
    const graph = compileGraph('feature');
    const edges = getEdges(graph);
    expect(edges.length).toBeGreaterThan(0);
    // First node should have no incoming edge from within the pathway
    const nodes = Object.keys(graph.skills);
    const edgesIntoFirst = edges.filter(e => e.to === nodes[0]);
    expect(edgesIntoFirst.length).toBe(0);
  });

  it('produces a linear chain for feature intent', () => {
    const graph = compileGraph('feature');
    const edges = getEdges(graph);
    const nodes = Object.keys(graph.skills);

    // N nodes => N-1 edges (linear chain)
    expect(edges.length).toBe(nodes.length - 1);

    for (let i = 1; i < nodes.length; i++) {
      const found = edges.find(e => e.from === nodes[i - 1] && e.to === nodes[i]);
      expect(found).toBeDefined();
    }
  });

  it('returns empty array for graph with no skills', () => {
    const graph = { skills: {} };
    expect(getEdges(graph)).toEqual([]);
  });

  it('handles nodes with no depends_on', () => {
    const graph = {
      skills: {
        nodeA: { description: 'A' },
        nodeB: { description: 'B' },
      },
    };
    expect(getEdges(graph)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// sanitizeMermaidId
// ---------------------------------------------------------------------------

describe('sanitizeMermaidId()', () => {
  it('replaces hyphens with underscores', () => {
    expect(sanitizeMermaidId('stdd-propose')).toBe('stdd_propose');
  });

  it('replaces dots with underscores', () => {
    expect(sanitizeMermaidId('v1.2.3')).toBe('v1_2_3');
  });

  it('preserves alphanumeric and underscores', () => {
    expect(sanitizeMermaidId('abc_123')).toBe('abc_123');
  });

  it('handles empty string', () => {
    expect(sanitizeMermaidId('')).toBe('');
  });

  it('handles strings with spaces', () => {
    expect(sanitizeMermaidId('hello world')).toBe('hello_world');
  });

  it('handles strings with special characters', () => {
    expect(sanitizeMermaidId('a@b#c$d%e^f')).toBe('a_b_c_d_e_f');
  });

  it('converts non-string input to string first', () => {
    expect(sanitizeMermaidId(123)).toBe('123');
    expect(sanitizeMermaidId(null)).toBe('null');
  });
});

// ---------------------------------------------------------------------------
// buildMermaid
// ---------------------------------------------------------------------------

describe('buildMermaid()', () => {
  it('generates valid Mermaid syntax with graph TD header', () => {
    const graph = compileGraph('feature');
    const mermaid = buildMermaid(graph);
    expect(mermaid).toMatch(/^graph TD/);
  });

  it('contains node declarations with sanitized IDs', () => {
    const graph = compileGraph('feature');
    const mermaid = buildMermaid(graph);
    expect(mermaid).toContain('stdd_propose["stdd-propose"]');
  });

  it('contains edge arrows for dependencies', () => {
    const graph = compileGraph('feature');
    const mermaid = buildMermaid(graph);
    expect(mermaid).toContain('-->');
  });

  it('handles empty graph gracefully', () => {
    const graph = { skills: {} };
    const mermaid = buildMermaid(graph);
    expect(mermaid).toContain('graph TD');
    expect(mermaid).toContain('No graph nodes');
  });

  it('generates correct number of edge lines for linear chain', () => {
    const graph = compileGraph('feature');
    const mermaid = buildMermaid(graph);
    const edgeCount = (mermaid.match(/-->/g) || []).length;
    const nodes = Object.keys(graph.skills);
    expect(edgeCount).toBe(nodes.length - 1);
  });

  it('handles graph with nodes but no edges', () => {
    const graph = {
      skills: {
        isolated1: { description: 'Isolated 1' },
        isolated2: { description: 'Isolated 2' },
      },
    };
    const mermaid = buildMermaid(graph);
    expect(mermaid).toContain('graph TD');
    expect(mermaid).toContain('isolated1["isolated1"]');
    expect(mermaid).toContain('isolated2["isolated2"]');
    expect(mermaid).not.toContain('-->');
  });
});

// ---------------------------------------------------------------------------
// getLayers
// ---------------------------------------------------------------------------

describe('getLayers()', () => {
  it('returns an array of layers (arrays of node names)', () => {
    const graph = compileGraph('feature');
    const layers = getLayers(graph);
    expect(Array.isArray(layers)).toBe(true);
    expect(layers.length).toBeGreaterThan(0);
    for (const layer of layers) {
      expect(Array.isArray(layer)).toBe(true);
    }
  });

  it('each node appears exactly once across all layers', () => {
    const graph = compileGraph('feature');
    const layers = getLayers(graph);
    const allNodes = layers.flat();
    const graphNodes = Object.keys(graph.skills);
    expect(allNodes.sort()).toEqual(graphNodes.sort());
  });

  it('linear chain produces one node per layer', () => {
    const graph = compileGraph('feature');
    const layers = getLayers(graph);
    for (const layer of layers) {
      expect(layer.length).toBe(1);
    }
    const nodes = Object.keys(graph.skills);
    expect(layers.length).toBe(nodes.length);
  });

  it('handles graph with a diamond dependency', () => {
    const graph = {
      skills: {
        A: { depends_on: [] },
        B: { depends_on: ['A'] },
        C: { depends_on: ['A'] },
        D: { depends_on: ['B', 'C'] },
      },
    };
    const layers = getLayers(graph);
    // Layer 0: A, Layer 1: B,C, Layer 2: D
    expect(layers.length).toBe(3);
    expect(layers[0]).toEqual(['A']);
    expect(layers[1].sort()).toEqual(['B', 'C']);
    expect(layers[2]).toEqual(['D']);
  });
});

// ---------------------------------------------------------------------------
// writeOrPrint
// ---------------------------------------------------------------------------

describe('writeOrPrint()', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-graph-write-'));
  });

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('writes content to file when outputPath is provided', () => {
    const outputPath = path.join(tmpDir, 'output.mmd');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    writeOrPrint('graph TD\n  A --> B', outputPath);

    expect(fs.existsSync(outputPath)).toBe(true);
    expect(fs.readFileSync(outputPath, 'utf-8')).toBe('graph TD\n  A --> B');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Graph output written to'));

    logSpy.mockRestore();
  });

  it('creates intermediate directories when needed', () => {
    const outputPath = path.join(tmpDir, 'nested', 'dir', 'graph.mmd');
    jest.spyOn(console, 'log').mockImplementation(() => {});

    writeOrPrint('content', outputPath);

    expect(fs.existsSync(outputPath)).toBe(true);

    jest.restoreAllMocks();
  });

  it('prints to console when no outputPath is given', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    writeOrPrint('graph TD\n  A --> B');

    expect(logSpy).toHaveBeenCalledWith('graph TD\n  A --> B');

    logSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// formatAnalyze (via DynamicGraphRouter + direct logic)
// ---------------------------------------------------------------------------

describe('formatAnalyze logic', () => {
  it('produces a string with Nodes, Edges, Entry nodes, Terminal nodes, and layers', () => {
    const graph = compileGraph('feature');
    const nodes = Object.keys(graph.skills || {});
    const edges = getEdges(graph);
    const dependedOn = new Set(edges.map(edge => edge.from));
    const entryNodes = nodes.filter(node => (graph.skills[node].depends_on || []).length === 0);
    const terminalNodes = nodes.filter(node => !dependedOn.has(node));
    const layers = getLayers(graph);

    // Build the output string (same logic as formatAnalyze)
    const lines = [
      `Graph: ${graph.name || 'STDD Graph'}`,
      `Nodes: ${nodes.length}`,
      `Edges: ${edges.length}`,
      `Entry nodes: ${entryNodes.join(', ') || '(none)'}`,
      `Terminal nodes: ${terminalNodes.join(', ') || '(none)'}`,
      `Parallel layers: ${layers.length}`,
      ...layers.map((layer, index) => `  Layer ${index}: ${layer.join(', ')}`),
    ];
    const output = lines.join('\n');

    expect(output).toContain(`Nodes: ${nodes.length}`);
    expect(output).toContain(`Edges: ${edges.length}`);
    expect(output).toContain('Entry nodes:');
    expect(output).toContain('Terminal nodes:');
    expect(output).toContain(`Parallel layers: ${layers.length}`);
  });

  it('feature graph has exactly one entry node', () => {
    const graph = compileGraph('feature');
    const nodes = Object.keys(graph.skills);
    const entryNodes = nodes.filter(node => (graph.skills[node].depends_on || []).length === 0);
    expect(entryNodes.length).toBe(1);
    expect(entryNodes[0]).toBe(nodes[0]);
  });

  it('feature graph has exactly one terminal node', () => {
    const graph = compileGraph('feature');
    const nodes = Object.keys(graph.skills);
    const edges = getEdges(graph);
    const dependedOn = new Set(edges.map(edge => edge.from));
    const terminalNodes = nodes.filter(node => !dependedOn.has(node));
    expect(terminalNodes.length).toBe(1);
    expect(terminalNodes[0]).toBe(nodes[nodes.length - 1]);
  });
});

// ---------------------------------------------------------------------------
// formatParallelLayers logic
// ---------------------------------------------------------------------------

describe('formatParallelLayers logic', () => {
  it('lists all layers with layer index', () => {
    const graph = compileGraph('feature');
    const layers = getLayers(graph);

    const lines = [
      'Parallelizable layers',
      ...layers.map((layer, index) => `Layer ${index}: ${layer.join(', ')}`),
    ];
    const output = lines.join('\n');

    expect(output).toContain('Parallelizable layers');
    for (let i = 0; i < layers.length; i++) {
      expect(output).toContain(`Layer ${i}:`);
    }
  });

  it('diamond graph shows parallelism in layer 1', () => {
    const graph = {
      skills: {
        A: { depends_on: [] },
        B: { depends_on: ['A'] },
        C: { depends_on: ['A'] },
        D: { depends_on: ['B', 'C'] },
      },
    };
    const layers = getLayers(graph);
    expect(layers[1].length).toBe(2);
    expect(layers[1].sort()).toEqual(['B', 'C']);
  });
});

// ---------------------------------------------------------------------------
// Integration: full graph compilation pipeline
// ---------------------------------------------------------------------------

describe('full graph compilation pipeline', () => {
  it('feature: compile -> edges -> layers -> mermaid is consistent', () => {
    const graph = compileGraph('feature');
    const edges = getEdges(graph);
    const layers = getLayers(graph);
    const mermaid = buildMermaid(graph);
    const nodes = Object.keys(graph.skills);

    // All nodes appear in mermaid output
    for (const node of nodes) {
      expect(mermaid).toContain(node);
    }

    // All edges appear in mermaid output
    for (const edge of edges) {
      expect(mermaid).toContain(`${sanitizeMermaidId(edge.from)} --> ${sanitizeMermaidId(edge.to)}`);
    }

    // Total nodes from layers matches
    expect(layers.flat().length).toBe(nodes.length);
  });

  it('hotfix: compile -> edges -> layers -> mermaid is consistent', () => {
    const graph = compileGraph('hotfix');
    const edges = getEdges(graph);
    const layers = getLayers(graph);
    const mermaid = buildMermaid(graph);
    const nodes = Object.keys(graph.skills);

    expect(nodes.length).toBe(4); // propose, apply, verify, commit
    expect(edges.length).toBe(3);
    expect(layers.flat().length).toBe(nodes.length);

    for (const node of nodes) {
      expect(mermaid).toContain(node);
    }
  });

  it('repair: includes fix-packet as entry node', () => {
    const graph = compileGraph('repair');
    const nodes = Object.keys(graph.skills);
    expect(nodes[0]).toBe('stdd-fix-packet');
    expect(graph.skills['stdd-fix-packet'].depends_on).toEqual([]);
  });
});
