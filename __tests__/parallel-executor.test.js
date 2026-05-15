const ParallelExecutor = require('../src/utils/parallel-executor');
const HeterogeneousAdapter = require('../src/utils/heterogeneous-adapter');

// 构建测试用 DAG（含并行组）
function buildParallelTestGraph() {
  return {
    version: '1.0',
    config: { max_parallel: 4, retry_count: 3 },
    skills: {
      'stdd-propose': {
        phase: 'propose',
        metadata: { category: 'requirement' },
        depends_on: [],
      },
      'stdd-spec': {
        phase: 'spec',
        metadata: { category: 'specification' },
        depends_on: ['stdd-propose'],
      },
      'stdd-plan': {
        phase: 'plan',
        metadata: { category: 'planning' },
        depends_on: ['stdd-spec'],
      },
      'stdd-apply': {
        phase: 'execute',
        metadata: { category: 'execution' },
        depends_on: ['stdd-plan'],
      },
      'stdd-mutation': {
        phase: 'verify',
        metadata: { category: 'testing', parallel_group: 'verification' },
        depends_on: ['stdd-apply'],
        outputs: ['stdd/reports/mutation.html'],
      },
      'stdd-validate': {
        phase: 'verify',
        metadata: { category: 'verification', parallel_group: 'verification' },
        depends_on: ['stdd-apply'],
        outputs: ['stdd/reports/validation.json'],
      },
      'stdd-contract': {
        phase: 'verify',
        metadata: { category: 'testing', parallel_group: 'verification' },
        depends_on: ['stdd-apply'],
        outputs: ['stdd/reports/contract.json'],
        condition: '${has_api} == true',
      },
    },
  };
}

describe('ParallelExecutor', () => {
  it('应正确进行拓扑分层', () => {
    const graph = buildParallelTestGraph();
    const adapter = new HeterogeneousAdapter();
    const pe = new ParallelExecutor(graph, adapter);

    const layers = pe._topologicalLayers();

    expect(layers.length).toBeGreaterThanOrEqual(3);

    // Layer 0: stdd-propose（无依赖）
    expect(layers[0]).toContain('stdd-propose');

    // Layer 1: stdd-spec（依赖 propose）
    expect(layers[1]).toContain('stdd-spec');

    // stdd-mutation/validate/contract 应在同一层（都依赖 apply）
    const verifyLayer = layers.find(l =>
      l.includes('stdd-mutation') || l.includes('stdd-validate')
    );
    expect(verifyLayer).toBeDefined();
    expect(verifyLayer).toContain('stdd-mutation');
    expect(verifyLayer).toContain('stdd-validate');
  });

  it('应分层执行整个 DAG', async () => {
    const graph = buildParallelTestGraph();
    const adapter = new HeterogeneousAdapter();
    const executionLog = [];

    const pe = new ParallelExecutor(graph, adapter, {
      executeFn: async (nodeName) => {
        executionLog.push(nodeName);
        return { success: true, generator: nodeName };
      },
    });

    const { results, conflicts } = await pe.executeAll({});

    // 所有节点应都已执行
    expect(Object.keys(results).length).toBe(7);
    expect(executionLog.length).toBe(7);

    // 无文件冲突（各验证节点输出不同文件）
    expect(conflicts.length).toBe(0);
  });

  it('应检测文件输出冲突', () => {
    const graph = {
      version: '1.0',
      config: { max_parallel: 4 },
      skills: {
        'node-a': {
          phase: 'exec',
          metadata: { category: 'exec' },
          depends_on: [],
          outputs: ['shared/output.json'],
        },
        'node-b': {
          phase: 'exec',
          metadata: { category: 'exec' },
          depends_on: [],
          outputs: ['shared/output.json'],
        },
      },
    };

    const adapter = new HeterogeneousAdapter();
    const pe = new ParallelExecutor(graph, adapter);

    const conflicts = pe._detectFileConflicts(['node-a', 'node-b'], {});

    expect(conflicts.length).toBe(1);
    expect(conflicts[0].filePath).toBe('shared/output.json');
    expect(conflicts[0].conflictingNodes).toContain('node-a');
    expect(conflicts[0].conflictingNodes).toContain('node-b');
  });

  it('应执行并行组（all 策略）', async () => {
    const graph = buildParallelTestGraph();
    const adapter = new HeterogeneousAdapter();

    const pe = new ParallelExecutor(graph, adapter, {
      executeFn: async (nodeName) => {
        return { success: true, generator: nodeName };
      },
    });

    const result = await pe.executeParallelGroup('verification', { has_api: true });

    expect(result.strategy).toBe('all');
    expect(result.passed).toBe(true);
    expect(result.totalCount).toBe(3); // mutation, validate, contract
  });

  it('并行组失败时应正确报告（all 策略下部分失败）', async () => {
    const graph = buildParallelTestGraph();
    const adapter = new HeterogeneousAdapter();

    const pe = new ParallelExecutor(graph, adapter, {
      executeFn: async (nodeName) => {
        if (nodeName === 'stdd-mutation') throw new Error('Mutation failed');
        return { success: true, generator: nodeName };
      },
    });

    const result = await pe.executeParallelGroup('verification', {});

    expect(result.strategy).toBe('all');
    expect(result.passed).toBe(false); // all 策略要求全部成功
    expect(result.successCount).toBeLessThan(result.totalCount);
  });

  it('应处理空并行组', async () => {
    const graph = { version: '1.0', config: {}, skills: {} };
    const adapter = new HeterogeneousAdapter();
    const pe = new ParallelExecutor(graph, adapter);

    await expect(pe.executeParallelGroup('nonexistent')).rejects.toThrow('not found');
  });

  it('maxParallel 应限制每批并发数', async () => {
    const graph = {
      version: '1.0',
      config: {},
      skills: {
        a: { phase: 'x', metadata: {}, depends_on: [] },
        b: { phase: 'x', metadata: {}, depends_on: [] },
        c: { phase: 'x', metadata: {}, depends_on: [] },
        d: { phase: 'x', metadata: {}, depends_on: [] },
        e: { phase: 'x', metadata: {}, depends_on: [] },
      },
    };
    const adapter = new HeterogeneousAdapter();
    const batches = [];

    const pe = new ParallelExecutor(graph, adapter, {
      maxParallel: 2,
      executeFn: async (nodeName) => {
        batches.push(nodeName);
        return { success: true };
      },
    });

    await pe.executeAll({});

    // 5 个节点，maxParallel=2，应分 3 批
    expect(batches.length).toBe(5);
  });
});
