const EvidenceCapture = require('./evidence-capture');

/**
 * ErrorPropagator - 多跳向上传播引擎
 *
 * 当节点执行失败时，不是简单地退一层，而是沿依赖链向上
 * 寻找真正的"决策点"（策划节点），将累积的错误证据传导
 * 到该节点，触发回炉重造。
 *
 * 核心能力：
 * 1. 多跳传播 —— 逐层向上，而非只退一步
 * 2. 智能决策点定位 —— 找到有多个后继或标记为 planner 的节点
 * 3. 证据逐跳增强 —— 每经过一层，补充该层的上下文
 * 4. 根节点熔断 —— 到达根节点仍无法自愈时，输出结构化失败报告
 */
class ErrorPropagator {
  /**
   * @param {object} graph  编译后的 DAG（含 skills 字典）
   * @param {object} cache  GraphCacheManager 实例（用于部分清理）
   * @param {number} maxHops 最大传播跳数（防无限循环）
   */
  constructor(graph, cache, maxHops = 5) {
    this.graph = graph;
    this.cache = cache;
    this.maxHops = maxHops;
    this.evidence = new EvidenceCapture();
  }

  /**
   * 执行反向传播，找到最佳回炉节点
   * @param {string} failedNode  初始失败节点
   * @param {Error}  error       原始错误
   * @param {object} context     执行上下文
   * @returns {object} { targetNode, report, affectedNodes }
   */
  propagate(failedNode, error, context = {}) {
    this.evidence.reset();

    let currentNode = failedNode;
    let hops = 0;
    const affectedNodes = [failedNode];

    // 首跳：捕获失败节点的证据
    this.evidence.capture(currentNode, error, {
      ...context,
      phase: this._getPhase(currentNode),
    });

    // 逐跳向上寻找决策点
    while (hops < this.maxHops) {
      const predecessor = this._findPredecessor(currentNode);
      if (!predecessor) {
        // 已到达根节点，无法继续传播
        return {
          targetNode: null,
          report: this.evidence.buildReport(),
          affectedNodes,
          exhausted: true,
          message: `Root node reached after ${hops} hops. Cannot auto-heal.`,
        };
      }

      hops++;
      currentNode = predecessor;
      affectedNodes.push(currentNode);

      // 检查当前节点是否为决策点
      if (this._isDecisionPoint(currentNode)) {
        // 找到策划节点，构建报告
        const report = this.evidence.buildReport();
        return {
          targetNode: currentNode,
          report,
          affectedNodes,
          exhausted: false,
          hops,
          message: `Decision point "${currentNode}" found after ${hops} hops. Re-planning with evidence.`,
        };
      }

      // 非决策点：继续向上传播，记录中间节点的"传导证据"
      const hopError = new Error(
        `Propagation through "${currentNode}": downstream "${affectedNodes[affectedNodes.length - 2]}" failed.`
      );
      this.evidence.capture(currentNode, hopError, {
        phase: this._getPhase(currentNode),
        retriesSoFar: hops,
      });
    }

    // 超过最大跳数，返回最后到达的节点作为降级方案
    return {
      targetNode: currentNode,
      report: this.evidence.buildReport(),
      affectedNodes,
      exhausted: true,
      hops,
      message: `Max hops (${this.maxHops}) reached. Falling back to "${currentNode}" as rework target.`,
    };
  }

  /**
   * 清理受影响节点的缓存（部分清理，非全量）
   * @param {string[]} affectedNodes 需要清理的节点列表
   */
  clearAffectedCache(_affectedNodes) {
    // 当前 cache.clear() 是全量清理；后续可优化为按节点精准清理
    // 目前保持全量清理以确保一致性
    this.cache.clear();
  }

  /**
   * 获取证据报告（供外部查询）
   */
  getReport() {
    return this.evidence.buildReport();
  }

  /**
   * 查找节点的直接前置依赖
   * 优先使用 depends_on，其次使用 DAG 线性序列
   */
  _findPredecessor(nodeName) {
    const nodeDef = this.graph.skills?.[nodeName];
    if (nodeDef?.depends_on?.length > 0) {
      return nodeDef.depends_on[0];
    }

    // 线性降级：从 skills 字典的 key 序列中推断
    const keys = Object.keys(this.graph.skills || {});
    const idx = keys.indexOf(nodeName);
    if (idx > 0) return keys[idx - 1];

    return null; // 根节点
  }

  /**
   * 判断节点是否为"决策点"
   * 决策点定义：
   * 1. 有多个后继节点（扇出点）
   * 2. 标记为 planner/planning/requirement 类别
   * 3. 有 gate 标记（人工审批门）
   */
  _isDecisionPoint(nodeName) {
    const nodeDef = this.graph.skills?.[nodeName];
    if (!nodeDef) return false;

    // 规则 1：有 gate 标记
    if (nodeDef.metadata?.gate) return true;

    // 规则 2：类别为 planning/requirement
    const cat = nodeDef.metadata?.category;
    if (cat === 'planning' || cat === 'requirement') return true;

    // 规则 3：扇出点 —— 有多个后继依赖此节点
    const keys = Object.keys(this.graph.skills || {});
    let fanout = 0;
    for (const key of keys) {
      const def = this.graph.skills[key];
      if (def?.depends_on?.includes(nodeName)) fanout++;
    }
    if (fanout > 1) return true;

    return false;
  }

  /**
   * 获取节点所属阶段
   */
  _getPhase(nodeName) {
    return this.graph.skills?.[nodeName]?.phase || null;
  }
}

module.exports = ErrorPropagator;
