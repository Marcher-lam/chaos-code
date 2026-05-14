const GraphCacheManager = require('./graph-cache');
const DynamicGraphRouter = require('./dynamic-router');
const ErrorPropagator = require('./error-propagator');
const HeterogeneousAdapter = require('./heterogeneous-adapter');
const ParallelExecutor = require('./parallel-executor');

class GraphExecutor {
  constructor(intent = 'feature', projectId = 'default', options = {}) {
    this.router = new DynamicGraphRouter();
    this.graph = this.router.compile(intent);
    this.cache = new GraphCacheManager(projectId);
    this.maxRollbacks = this.graph.config.retry_count || 3;
    this.executeNode = options.executeNode;
    this.executors = options.executors || {};

    // 异构算力横向拓扑
    this.adapter = new HeterogeneousAdapter();
    this.parallel = new ParallelExecutor(this.graph, this.adapter, {
      maxParallel: this.graph.config?.max_parallel || 4,
      executeFn: (name, ctx) => this._executeNode(name, ctx),
    });
  }

  /**
   * 执行单个图节点。优先使用外部注入的执行器。
   * 如果没有配置执行器，保留轻量 fallback 以支持 graph runtime 测试和演示执行。
   * 真实编码节点仍应通过 executeNode 或 executors 注入外部执行器。
   * @param {string} nodeName
   * @param {object} inputs
   */
  async _executeNode(nodeName, inputs) {
    const meta = {
      graph: this.graph,
      node: this.graph.skills[nodeName],
      adapter: this.adapter,
    };

    if (typeof this.executeNode === 'function') {
      return this.executeNode(nodeName, inputs, meta);
    }

    const nodeExecutor = this.executors instanceof Map
      ? this.executors.get(nodeName)
      : this.executors[nodeName];

    if (typeof nodeExecutor === 'function') {
      return nodeExecutor(nodeName, inputs, meta);
    }

    // No external executor: keep deterministic fallback for tests/demo only.
    if (inputs.shouldFailOn === nodeName) {
      throw new Error(`Simulated failure for ${nodeName}`);
    }
    return { success: true, generator: nodeName };
  }

  /**
   * 反向自愈引擎（增强版）：多跳证据传播 + 智能决策点定位
   *
   * 底层逻辑变更（vs 旧版）：
   * 1. 不再只退一层，而是沿依赖链向上寻找真正的"策划节点"
   * 2. 逐跳累积结构化错误证据，而非只传递一层 message
   * 3. 只清理受影响节点的缓存，而非全量 clear
   */
  async _handleRollback(failedNode, errorInfo, context) {
    const propagator = new ErrorPropagator(this.graph, this.cache);

    // 执行多跳传播
    const result = propagator.propagate(failedNode, errorInfo, {
      inputs: context,
      partialOutput: null,
      retriesSoFar: context._rollbackCount || 0,
    });

    // 熔断：传播到根节点仍无法自愈
    if (result.exhausted && !result.targetNode) {
      const report = result.report;
      throw new Error(
        `Fatal: Auto-healing exhausted. Evidence chain:\n` +
        report.timeline.map(t => `  [${t.node}] ${t.error}`).join('\n') +
        `\nInstruction: ${report.instruction}`
      );
    }

    // 部分缓存清理：只清理受影响的节点
    propagator.clearAffectedCache(result.affectedNodes);

    return {
      targetNode: result.targetNode,
      report: result.report,
      affectedNodes: result.affectedNodes,
      hops: result.hops || 0,
      // 保留兼容旧接口
      predecessor: result.targetNode,
      rollbackEvidence: result.report,
    };
  }

  /**
   * 运行整个生命周期
   */
  async runUntil(targetNode, initialInputs = {}) {
    let currentInputs = { ...initialInputs };
    let rollbacks = 0;

    const nodes = Object.keys(this.graph.skills);
    let i = 0;

    while (i < nodes.length) {
      const nodeName = nodes[i];
      if (nodeName === targetNode) break;

      // 如果有缓存且没有携带自愈强制刷新指令
      if (this.cache.has(nodeName, currentInputs) && !currentInputs.rollbackEvidence) {
        currentInputs = this.cache.get(nodeName, currentInputs).outputs;
        i++;
        continue;
      }

      try {
        const outputs = await this._executeNode(nodeName, currentInputs);
        this.cache.set(nodeName, currentInputs, outputs);
        currentInputs = { ...currentInputs, ...outputs };
        // 成功后清除自愈证据（进入正常流程）
        delete currentInputs.rollbackEvidence;
        delete currentInputs._rollbackCount;
        i++;
      } catch (err) {
        if (rollbacks >= this.maxRollbacks) {
          throw new Error(`System exhausted max rollbacks (${this.maxRollbacks}). Last fail at ${nodeName}`);
        }

        rollbacks++;
        currentInputs._rollbackCount = rollbacks;
        const healingData = await this._handleRollback(nodeName, err, currentInputs);

        // 寻找回炉目标节点的索引
        const targetIndex = nodes.indexOf(healingData.targetNode);
        if (targetIndex === -1) throw err;

        // 回滚游标到决策点，注入完整证据链
        i = targetIndex;
        currentInputs = {
          ...initialInputs,
          ...currentInputs,
          rollbackEvidence: healingData.report,
          _rollbackCount: rollbacks,
          _healingMeta: {
            hops: healingData.hops,
            affectedNodes: healingData.affectedNodes,
            originalFailure: nodeName,
          },
        };

        // 移除故障触发锚（模拟上一层给出正确新方案）
        delete currentInputs.shouldFailOn;
      }
    }

    return currentInputs;
  }
}

module.exports = GraphExecutor;
