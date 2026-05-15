const GraphCacheManager = require('../src/utils/graph-cache');

describe('GraphCacheManager (中间件状态幂等缓存)', () => {
  let cacheManager;

  beforeEach(() => {
    cacheManager = new GraphCacheManager('test-project');
    cacheManager.clear(); // 清理残留
  });

  afterAll(() => {
    if (cacheManager) cacheManager.clear();
  });

  it('应该能精准击中具有相同 input 参数的缓存产物，避免二次计算', () => {
    const nodeName = 'stdd-plan';
    const inputs = { scope: 'auth-module', depth: 'high' };
    const simulatedOutputs = { tasks: ['A', 'B'] };

    // 此时不应有缓存
    expect(cacheManager.has(nodeName, inputs)).toBe(false);

    // 写入模拟计算后的闭环产出
    cacheManager.set(nodeName, inputs, simulatedOutputs);

    // 必须验证写入与 Hash 读取是否正确
    expect(cacheManager.has(nodeName, inputs)).toBe(true);

    const cachedData = cacheManager.get(nodeName, inputs);
    expect(cachedData.outputs).toEqual(simulatedOutputs);
    expect(cachedData.nodeName).toBe(nodeName);
  });

  it('输入的微小改变（如空格/顺序一致的语义等效处理后）应当引发隔离，防止污染', () => {
    const nodeName = 'stdd-apply';
    const inputsV1 = { code: 'function a() {}' };
    const inputsV2 = { code: 'function b() {}' };

    cacheManager.set(nodeName, inputsV1, { status: 'success' });
    
    // V2 变更了核心意图输入，绝对禁止打偏到 V1 的缓存上
    expect(cacheManager.has(nodeName, inputsV2)).toBe(false);
  });
});
