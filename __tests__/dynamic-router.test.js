let DynamicGraphRouter;

describe('DynamicGraphRouter (自适应动态拓扑)', () => {
  beforeEach(() => {
    jest.isolateModules(() => {
      DynamicGraphRouter = require('../src/utils/dynamic-router');
    });
  });

  it('should compile hotfix intent correctly for fast track', () => {
    // 拦截虚假的 fallback 文件以测试容错
    const router = new DynamicGraphRouter('non-existent-fallback.yaml');
    const graph = router.compile('hotfix');
    
    expect(graph.name).toContain('HOTFIX');
    // Hotfix 模式应该只保留 4 个核心节点，不需要繁重的 spec 和 plan
    expect(Object.keys(graph.skills)).toEqual(['stdd-issue', 'stdd-apply', 'stdd-verify', 'stdd-archive']);
    // 依赖必须自动重新首尾链接，apply 必须前置挂载 propose
    expect(graph.skills['stdd-apply'].depends_on).toEqual(['stdd-issue']);
  });

  it('should fallback to standard feature waterfall if intent is unknown', () => {
    const router = new DynamicGraphRouter('non-existent-fallback.yaml');
    const graph = router.compile('unknown');
    
    expect(graph.name).toContain('UNKNOWN');
    // 默认回落完整的特征瀑布流
    expect(Object.keys(graph.skills)).toEqual(['stdd-propose', 'stdd-spec', 'stdd-plan', 'stdd-outside-in', 'stdd-apply', 'stdd-verify']);
  });
});
