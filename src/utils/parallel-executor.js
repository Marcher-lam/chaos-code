/**
 * ParallelExecutor - DAG 分层并行执行器
 *
 * 将 DAG 拆分为拓扑层级，同层节点并行执行：
 * - Layer 0: 无依赖的根节点
 * - Layer 1: 只依赖 Layer 0 的节点
 * - Layer N: 只依赖 Layer 0..N-1 的节点
 *
 * 核心能力：
 * 1. 拓扑分层算法
 * 2. 异构引擎分配（同层节点可分配不同引擎）
 * 3. Worker 池管理（max_parallel 限制并发）
 * 4. 并行组策略执行（all/any/race）
 * 5. 结果聚合与文件冲突检测
 */
class ParallelExecutor {
  /**
   * @param {object}  graph       编译后的 DAG（含 skills 字典）
   * @param {object}  adapter     HeterogeneousAdapter 实例
   * @param {object}  options
   * @param {number}  options.maxParallel 最大并行数
   * @param {Function} options.executeFn  节点执行函数 (nodeName, inputs) => outputs
   */
  constructor(graph, adapter, options = {}) {
    this.graph = graph;
    this.adapter = adapter;
    this.maxParallel = options.maxParallel || graph.config?.max_parallel || 4;
    this.executeFn = options.executeFn || (async () => ({}));
  }

  /**
   * 执行整个 DAG（分层并行）
   * @param {object} initialInputs 初始输入
   * @returns {object} { results, layers, conflicts }
   */
  async executeAll(initialInputs = {}) {
    const layers = this._topologicalLayers();
    const results = {};
    let sharedContext = { ...initialInputs };
    const conflicts = [];

    for (let layerIdx = 0; layerIdx < layers.length; layerIdx++) {
      const layer = layers[layerIdx];

      // 为同层节点分配异构引擎
      const engineAssignment = this.adapter.assignEngines(layer);

      // 文件冲突预检
      const layerConflicts = this._detectFileConflicts(layer, results);
      conflicts.push(...layerConflicts);

      // 执行同层节点（受 maxParallel 限制）
      const layerResults = await this._executeLayer(layer, engineAssignment, sharedContext);

      // 聚合结果
      for (const [nodeName, output] of Object.entries(layerResults)) {
        results[nodeName] = output;
        sharedContext = { ...sharedContext, ...output };
      }
    }

    return { results, layers, conflicts };
  }

  /**
   * 执行并行组（从 skills.yaml parallel_groups 定义）
   * @param {string} groupName  并行组名
   * @param {object} inputs     共享输入
   * @returns {object} { results, strategy, allSucceeded }
   */
  async executeParallelGroup(groupName, inputs = {}) {
    const groups = this._getParallelGroups();
    const group = groups[groupName];
    if (!group) {
      throw new Error(`Parallel group "${groupName}" not found.`);
    }

    const strategy = group.strategy || 'all';
    const skills = group.skills;

    // 为组内 Skill 分配引擎
    const engineAssignment = this.adapter.assignEngines(skills);

    // 并行执行
    const rawResults = await this._executeLayer(skills, engineAssignment, inputs);

    // 标准化输出
    const results = {};
    for (const [nodeName, raw] of Object.entries(rawResults)) {
      results[nodeName] = this.adapter.normalizeOutput(
        engineAssignment.get(nodeName) || 'unknown',
        raw
      );
    }

    // 策略判定
    const successes = Object.values(results).filter(r => r.success);
    const allSucceeded = successes.length === skills.length;
    const anySucceeded = successes.length > 0;

    const passed = strategy === 'all' ? allSucceeded
      : strategy === 'any' ? anySucceeded
      : strategy === 'race' ? anySucceeded  // race: 第一个成功即可
      : allSucceeded;

    return { results, strategy, passed, successCount: successes.length, totalCount: skills.length };
  }

  /**
   * 拓扑分层算法
   * Kahn's Algorithm 变体：按层级输出而非线性排序
   * @returns {string[][]} 二维数组，每层为一组可并行节点
   */
  _topologicalLayers() {
    const skills = this.graph.skills || {};
    const nodes = Object.keys(skills);

    // 构建入度表
    const inDegree = {};
    const dependents = {}; // node → 被哪些节点依赖

    for (const node of nodes) {
      inDegree[node] = 0;
      dependents[node] = [];
    }

    for (const node of nodes) {
      const deps = skills[node].depends_on || [];
      inDegree[node] = deps.length;
      for (const dep of deps) {
        if (dependents[dep]) {
          dependents[dep].push(node);
        }
      }
    }

    // 逐层剥离
    const layers = [];
    let remaining = new Set(nodes);

    while (remaining.size > 0) {
      // 当前层：入度为 0 的节点
      const currentLayer = [];
      for (const node of remaining) {
        if (inDegree[node] === 0) {
          currentLayer.push(node);
        }
      }

      if (currentLayer.length === 0) {
        // 存在环路，强制拆解：取剩余中入度最小的
        const sorted = [...remaining].sort((a, b) => inDegree[a] - inDegree[b]);
        currentLayer.push(sorted[0]);
      }

      layers.push(currentLayer);

      // 减少后继节点的入度
      for (const node of currentLayer) {
        remaining.delete(node);
        for (const dep of (dependents[node] || [])) {
          if (inDegree[dep] > 0) inDegree[dep]--;
        }
      }
    }

    return layers;
  }

  /**
   * 执行一层节点（并行 + maxParallel 限制）
   */
  async _executeLayer(layerNodes, engineAssignment, context) {
    const results = {};

    // 分批执行，每批不超过 maxParallel
    for (let batch = 0; batch * this.maxParallel < layerNodes.length; batch++) {
      const batchNodes = layerNodes.slice(
        batch * this.maxParallel,
        (batch + 1) * this.maxParallel
      );

      // 并行执行当前批次
      const promises = batchNodes.map(async (nodeName) => {
        try {
          const output = await this.executeFn(nodeName, context);
          return { nodeName, output, error: null };
        } catch (err) {
          return { nodeName, output: null, error: err };
        }
      });

      const batchResults = await Promise.all(promises);

      for (const { nodeName, output, error } of batchResults) {
        if (error) {
          // 单节点失败：尝试引擎降级
          const degradedEngine = this.adapter.degrade(
            engineAssignment.get(nodeName) || 'unknown',
            nodeName
          );
          if (degradedEngine) {
            // 降级重试一次
            try {
              const retryOutput = await this.executeFn(nodeName, context);
              results[nodeName] = retryOutput;
            } catch {
              results[nodeName] = { success: false, error: error.message, degraded: true };
            }
          } else {
            results[nodeName] = { success: false, error: error.message };
          }
        } else {
          results[nodeName] = output;
        }
      }
    }

    return results;
  }

  /**
   * 检测并行节点间的文件输出冲突
   */
  _detectFileConflicts(layerNodes, _existingResults) {
    const conflicts = [];
    const outputMap = {}; // filePath → [nodeName]

    for (const nodeName of layerNodes) {
      const outputs = this.graph.skills?.[nodeName]?.outputs || [];
      for (const outPath of outputs) {
        if (!outputMap[outPath]) outputMap[outPath] = [];
        outputMap[outPath].push(nodeName);
      }
    }

    for (const [filePath, nodes] of Object.entries(outputMap)) {
      if (nodes.length > 1) {
        conflicts.push({ filePath, conflictingNodes: nodes });
      }
    }

    return conflicts;
  }

  /**
   * 获取并行组定义
   */
  _getParallelGroups() {
    // 从 DAG 的 raw 来源读取并行组；这里用 skills.yaml 的结构
    // ParallelExecutor 直接接收 graph 对象，parallel_groups 可能在 config 中
    // 降级：从节点 metadata.parallel_group 推断
    const groups = {};
    const skills = this.graph.skills || {};

    for (const [nodeName, nodeDef] of Object.entries(skills)) {
      const pg = nodeDef.metadata?.parallel_group;
      if (pg) {
        if (!groups[pg]) groups[pg] = { skills: [], strategy: 'all' };
        groups[pg].skills.push(nodeName);
      }
    }

    return groups;
  }
}

module.exports = ParallelExecutor;
