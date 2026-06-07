const fs = require('fs');
const path = require('path');
const os = require('os');
const WorkspaceCache = require('../src/utils/workspace-cache');

describe('WorkspaceCache', () => {
  let tempDirs = [];

  function createProject(setupFn) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-workspace-cache-'));
    tempDirs.push(root);
    if (setupFn) setupFn(root);
    return root;
  }

  function writeJson(filePath, data) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  afterAll(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('calculates workspace hash and detects changes', () => {
    const project = createProject((root) => {
      fs.mkdirSync(path.join(root, 'stdd'), { recursive: true });
      fs.mkdirSync(path.join(root, 'packages', 'api', 'src'), { recursive: true });
      writeJson(path.join(root, 'packages', 'api', 'package.json'), { name: 'api' });
      fs.writeFileSync(path.join(root, 'packages', 'api', 'src', 'index.js'), 'console.log("hello");');
    });

    const ws = {
      name: 'api',
      root: path.join(project, 'packages', 'api'),
      sourceDir: path.join(project, 'packages', 'api', 'src'),
    };

    const cache = new WorkspaceCache(project);
    const hash1 = cache.calculateWorkspaceHash(ws);
    expect(hash1).toBeTruthy();

    // Re-calculating should give the same hash
    const hash2 = cache.calculateWorkspaceHash(ws);
    expect(hash1).toBe(hash2);

    // Modify a source file
    fs.writeFileSync(path.join(project, 'packages', 'api', 'src', 'index.js'), 'console.log("hello world");');
    const hash3 = cache.calculateWorkspaceHash(ws);
    expect(hash1).not.toBe(hash3);
  });

  it('stores and retrieves cache correctly', () => {
    const project = createProject((root) => {
      fs.mkdirSync(path.join(root, 'stdd'), { recursive: true });
      fs.mkdirSync(path.join(root, 'packages', 'api', 'src'), { recursive: true });
      writeJson(path.join(root, 'packages', 'api', 'package.json'), { name: 'api' });
      // Needs stdd/config.yaml for resolveWorkspace
      fs.writeFileSync(path.join(root, 'stdd', 'config.yaml'), `workspaces:
  enabled: true
  items:
    - name: "api"
      root: "packages/api"
`);
    });

    const cache = new WorkspaceCache(project);
    
    // Set verify cache
    const testVerifyData = { healthy: true, tests: { passed: true } };
    cache.setCache('api', 'verify', testVerifyData);

    const retrieved = cache.getValidCache('api', 'verify');
    expect(retrieved).toEqual(testVerifyData);

    // If file changes, cached value becomes invalid (null)
    fs.writeFileSync(path.join(project, 'packages', 'api', 'package.json'), JSON.stringify({ name: 'api', version: '1.0.1' }));
    const retrievedAfterChange = cache.getValidCache('api', 'verify');
    expect(retrievedAfterChange).toBeNull();
  });

  it('invalidates cache correctly', () => {
    const project = createProject((root) => {
      fs.mkdirSync(path.join(root, 'stdd'), { recursive: true });
      fs.mkdirSync(path.join(root, 'packages', 'api', 'src'), { recursive: true });
      writeJson(path.join(root, 'packages', 'api', 'package.json'), { name: 'api' });
      fs.writeFileSync(path.join(root, 'stdd', 'config.yaml'), `workspaces:
  enabled: true
  items:
    - name: "api"
      root: "packages/api"
`);
    });

    const cache = new WorkspaceCache(project);
    cache.setCache('api', 'verify', { healthy: true });
    expect(cache.getValidCache('api', 'verify')).toEqual({ healthy: true });

    cache.invalidateCache('api');
    expect(cache.getValidCache('api', 'verify')).toBeNull();
  });

  it('keeps cache entries separate for workspaces with the same name but different roots', () => {
    const project = createProject((root) => {
      fs.mkdirSync(path.join(root, 'stdd'), { recursive: true });
      fs.mkdirSync(path.join(root, 'packages', 'api-a'), { recursive: true });
      fs.mkdirSync(path.join(root, 'packages', 'api-b'), { recursive: true });
      writeJson(path.join(root, 'packages', 'api-a', 'package.json'), { name: 'api' });
      writeJson(path.join(root, 'packages', 'api-b', 'package.json'), { name: 'api' });
      fs.writeFileSync(path.join(root, 'stdd', 'config.yaml'), `workspaces:
  enabled: true
  items:
    - name: "api"
      root: "packages/api-a"
    - name: "api"
      root: "packages/api-b"
`);
    });

    const cache = new WorkspaceCache(project);
    const wsA = { name: 'api', root: path.join(project, 'packages', 'api-a') };
    const wsB = { name: 'api', root: path.join(project, 'packages', 'api-b') };

    expect(cache.cacheKey(wsA)).not.toBe(cache.cacheKey(wsB));

    cache.setCache('packages/api-a', 'verify', { marker: 'a' });
    cache.setCache('packages/api-b', 'verify', { marker: 'b' });

    expect(cache.getValidCache('packages/api-a', 'verify')).toEqual({ marker: 'a' });
    expect(cache.getValidCache('packages/api-b', 'verify')).toEqual({ marker: 'b' });
  });
});
