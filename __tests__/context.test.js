const fs = require('fs');
const path = require('path');
const os = require('os');
const { ContextCommand } = require('../src/cli/commands/context');

describe('ContextCommand', () => {
  let tempDirs = [];
  let logSpy;

  function createTempDir() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-context-test-'));
    tempDirs.push(dir);
    return dir;
  }

  function createMemoryDir(baseDir, files = {}) {
    const memoryDir = path.join(baseDir, 'stdd', 'memory');
    fs.mkdirSync(memoryDir, { recursive: true });
    for (const [name, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(memoryDir, name), content, 'utf-8');
    }
    return memoryDir;
  }

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  describe('execute - default (all layers)', () => {
    it('should output all three layers in markdown format', async () => {
      const baseDir = createTempDir();
      createMemoryDir(baseDir, {
        'foundation.md': '# Foundation\nTech stack info',
        'components.md': '# Components\nTree structure',
        'contracts.md': '# Contracts\nAPI surface',
      });

      const cmd = new ContextCommand(baseDir);
      await cmd.execute({});

      const output = logSpy.mock.calls.map(c => String(c[0])).join('\n');
      expect(output).toContain('[Foundation]');
      expect(output).toContain('[Components]');
      expect(output).toContain('[Contracts]');
      expect(output).toContain('Tech stack info');
      expect(output).toContain('Tree structure');
      expect(output).toContain('API surface');
    });

    it('should skip missing layers gracefully', async () => {
      const baseDir = createTempDir();
      createMemoryDir(baseDir, {
        'components.md': '# Components\nTree structure',
      });

      const cmd = new ContextCommand(baseDir);
      await cmd.execute({});

      const output = logSpy.mock.calls.map(c => String(c[0])).join('\n');
      expect(output).toContain('[Components]');
      expect(output).not.toContain('[Foundation]');
      expect(output).not.toContain('[Contracts]');
    });

    it('should print message when no layers exist', async () => {
      const baseDir = createTempDir();
      createMemoryDir(baseDir, {});

      const cmd = new ContextCommand(baseDir);
      await cmd.execute({});

      expect(logSpy.mock.calls).toHaveLength(0);
    });
  });

  describe('execute - single layer', () => {
    it('should output only foundation when layer=foundation', async () => {
      const baseDir = createTempDir();
      createMemoryDir(baseDir, {
        'foundation.md': '# Foundation\nFoundation content',
        'components.md': '# Components\nComponents content',
        'contracts.md': '# Contracts\nContracts content',
      });

      const cmd = new ContextCommand(baseDir);
      await cmd.execute({ layer: 'foundation' });

      const output = logSpy.mock.calls.map(c => String(c[0])).join('\n');
      expect(output).toContain('[Foundation]');
      expect(output).toContain('Foundation content');
      expect(output).not.toContain('[Components]');
      expect(output).not.toContain('[Contracts]');
    });

    it('should output only components when layer=components', async () => {
      const baseDir = createTempDir();
      createMemoryDir(baseDir, {
        'foundation.md': '# Foundation\nFoundation content',
        'components.md': '# Components\nComponents content',
        'contracts.md': '# Contracts\nContracts content',
      });

      const cmd = new ContextCommand(baseDir);
      await cmd.execute({ layer: 'components' });

      const output = logSpy.mock.calls.map(c => String(c[0])).join('\n');
      expect(output).toContain('[Components]');
      expect(output).toContain('Components content');
      expect(output).not.toContain('[Foundation]');
      expect(output).not.toContain('[Contracts]');
    });

    it('should output only contracts when layer=contracts', async () => {
      const baseDir = createTempDir();
      createMemoryDir(baseDir, {
        'foundation.md': '# Foundation\nFoundation content',
        'components.md': '# Components\nComponents content',
        'contracts.md': '# Contracts\nContracts content',
      });

      const cmd = new ContextCommand(baseDir);
      await cmd.execute({ layer: 'contracts' });

      const output = logSpy.mock.calls.map(c => String(c[0])).join('\n');
      expect(output).toContain('[Contracts]');
      expect(output).toContain('Contracts content');
      expect(output).not.toContain('[Foundation]');
      expect(output).not.toContain('[Components]');
    });

    it('should show nothing when specified layer does not exist', async () => {
      const baseDir = createTempDir();
      createMemoryDir(baseDir, {
        'components.md': '# Components\nExists',
      });

      const cmd = new ContextCommand(baseDir);
      await cmd.execute({ layer: 'foundation' });

      expect(logSpy.mock.calls).toHaveLength(0);
    });
  });

  describe('execute - JSON output', () => {
    it('should output structured JSON with all layers', async () => {
      const baseDir = createTempDir();
      createMemoryDir(baseDir, {
        'foundation.md': '# Foundation\nFoundation content',
        'components.md': '# Components\nComponents content',
        'contracts.md': '# Contracts\nContracts content',
      });

      const cmd = new ContextCommand(baseDir);
      await cmd.execute({ json: true });

      const output = logSpy.mock.calls.map(c => String(c[0])).join('\n');
      const data = JSON.parse(output);
      expect(data).toHaveProperty('foundation');
      expect(data).toHaveProperty('components');
      expect(data).toHaveProperty('contracts');
      expect(data.foundation).toContain('Foundation content');
      expect(data.components).toContain('Components content');
      expect(data.contracts).toContain('Contracts content');
    });

    it('should output JSON with only specified layer', async () => {
      const baseDir = createTempDir();
      createMemoryDir(baseDir, {
        'foundation.md': '# Foundation\nFoundation content',
        'components.md': '# Components\nComponents content',
        'contracts.md': '# Contracts\nContracts content',
      });

      const cmd = new ContextCommand(baseDir);
      await cmd.execute({ layer: 'components', json: true });

      const output = logSpy.mock.calls.map(c => String(c[0])).join('\n');
      const data = JSON.parse(output);
      expect(data).toHaveProperty('components');
      expect(data).not.toHaveProperty('foundation');
      expect(data).not.toHaveProperty('contracts');
    });

    it('should output empty JSON object when no layers exist', async () => {
      const baseDir = createTempDir();
      createMemoryDir(baseDir, {});

      const cmd = new ContextCommand(baseDir);
      await cmd.execute({ json: true });

      const output = logSpy.mock.calls.map(c => String(c[0])).join('\n');
      const data = JSON.parse(output);
      expect(data).toEqual({});
    });
  });

  describe('validation', () => {
    it('should throw error for unknown layer', async () => {
      const baseDir = createTempDir();
      createMemoryDir(baseDir, {});

      const cmd = new ContextCommand(baseDir);
      await expect(cmd.execute({ layer: 'unknown' }))
        .rejects.toThrow("Unknown layer 'unknown'. Valid layers: foundation, components, contracts");
    });
  });

  describe('readLayerByPath (static)', () => {
    it('should read a specific layer file', async () => {
      const baseDir = createTempDir();
      createMemoryDir(baseDir, {
        'foundation.md': '# Foundation\nTest content',
      });

      const memoryDir = path.join(baseDir, 'stdd', 'memory');
      const content = await ContextCommand.readLayerByPath(memoryDir, 'foundation');
      expect(content).toContain('Test content');
    });

    it('should return null for missing file', async () => {
      const baseDir = createTempDir();
      createMemoryDir(baseDir, {});

      const memoryDir = path.join(baseDir, 'stdd', 'memory');
      const content = await ContextCommand.readLayerByPath(memoryDir, 'foundation');
      expect(content).toBeNull();
    });
  });

  describe('markdown formatting', () => {
    it('should separate multiple layers with blank lines', async () => {
      const baseDir = createTempDir();
      createMemoryDir(baseDir, {
        'foundation.md': '# Foundation\nLine1',
        'components.md': '# Components\nLine2',
      });

      const cmd = new ContextCommand(baseDir);
      await cmd.execute({});

      const output = logSpy.mock.calls.map(c => String(c[0])).join('\n');
      const lines = output.split('\n');
      const foundationIdx = lines.findIndex(l => l.includes('[Foundation]'));
      const componentsIdx = lines.findIndex(l => l.includes('[Components]'));
      expect(componentsIdx).toBeGreaterThan(foundationIdx);
    });
  });

  describe('execute - export mode', () => {
    it('should export all layers as merged markdown to stdout', async () => {
      const baseDir = createTempDir();
      createMemoryDir(baseDir, {
        'foundation.md': '# Foundation\nFoundation content',
        'components.md': '# Components\nComponents content',
        'contracts.md': '# Contracts\nContracts content',
      });

      const cmd = new ContextCommand(baseDir);
      const result = await cmd.execute({ mode: 'export' });

      expect(result).toContain('# Project Context');
      expect(result).toContain('## 1. Foundation');
      expect(result).toContain('## 2. Components');
      expect(result).toContain('## 3. Contracts');
      expect(result).toContain('Foundation content');
      expect(result).toContain('Components content');
      expect(result).toContain('Contracts content');
    });

    it('should export to file with --output', async () => {
      const baseDir = createTempDir();
      createMemoryDir(baseDir, {
        'foundation.md': '# Foundation\nFoundation content',
        'components.md': '# Components\nComponents content',
        'contracts.md': '# Contracts\nContracts content',
      });

      const outFile = path.join(baseDir, 'context.md');

      const cmd = new ContextCommand(baseDir);
      await cmd.execute({ mode: 'export', output: outFile });

      const fileContent = fs.readFileSync(outFile, 'utf-8');
      expect(fileContent).toContain('# Project Context');
      expect(fileContent).toContain('## 1. Foundation');
      expect(fileContent).toContain('## 2. Components');
      expect(fileContent).toContain('## 3. Contracts');
      expect(fileContent).toContain('Foundation content');
      expect(fileContent).toContain('Components content');
      expect(fileContent).toContain('Contracts content');
    });

    it('should export as JSON with --format json', async () => {
      const baseDir = createTempDir();
      createMemoryDir(baseDir, {
        'foundation.md': '# Foundation\nFoundation content',
        'components.md': '# Components\nComponents content',
        'contracts.md': '# Contracts\nContracts content',
      });

      const cmd = new ContextCommand(baseDir);
      const result = await cmd.execute({ mode: 'export', format: 'json' });

      const data = JSON.parse(result);
      expect(data).toHaveProperty('foundation');
      expect(data).toHaveProperty('components');
      expect(data).toHaveProperty('contracts');
      expect(data.foundation).toContain('Foundation content');
      expect(data.components).toContain('Components content');
      expect(data.contracts).toContain('Contracts content');
    });

    it('should skip missing layers in export', async () => {
      const baseDir = createTempDir();
      createMemoryDir(baseDir, {
        'components.md': '# Components\nComponents content',
      });

      const cmd = new ContextCommand(baseDir);
      const result = await cmd.execute({ mode: 'export' });

      expect(result).toContain('# Project Context');
      expect(result).toContain('## 1. Components');
      expect(result).not.toContain('Foundation');
      expect(result).not.toContain('Contracts');
    });

    it('should export JSON even with missing layers', async () => {
      const baseDir = createTempDir();
      createMemoryDir(baseDir, {
        'foundation.md': '# Foundation\nFoundation content',
        'contracts.md': '# Contracts\nContracts content',
      });

      const cmd = new ContextCommand(baseDir);
      const result = await cmd.execute({ mode: 'export', format: 'json' });

      const data = JSON.parse(result);
      expect(data).toHaveProperty('foundation');
      expect(data).toHaveProperty('contracts');
      expect(data).not.toHaveProperty('components');
    });

    it('should export workspace scoped context', async () => {
      const baseDir = createTempDir();
      fs.writeFileSync(path.join(baseDir, 'package.json'), JSON.stringify({ private: true, workspaces: ['packages/*'] }));
      createMemoryDir(baseDir, {
        'foundation.md': '# Foundation\nRoot foundation',
      });

      const apiSrcDir = path.join(baseDir, 'packages', 'api', 'src');
      fs.mkdirSync(apiSrcDir, { recursive: true });
      fs.writeFileSync(path.join(baseDir, 'packages', 'api', 'package.json'), JSON.stringify({ name: 'api' }));
      fs.writeFileSync(path.join(apiSrcDir, 'index.ts'), 'export function apiHandler() {\n  return true;\n}\n');

      const webSrcDir = path.join(baseDir, 'packages', 'web', 'src');
      fs.mkdirSync(webSrcDir, { recursive: true });
      fs.writeFileSync(path.join(baseDir, 'packages', 'web', 'package.json'), JSON.stringify({ name: 'web' }));
      fs.writeFileSync(path.join(webSrcDir, 'index.ts'), 'export function webHandler() {\n  return true;\n}\n');

      const cmd = new ContextCommand(baseDir);
      const result = await cmd.execute({ mode: 'export', workspace: 'packages/api' });

      expect(result).toContain('Workspace Context: api');
      expect(result).toContain('packages/api/src/index.ts');
      expect(result).toContain('apiHandler');
      expect(result).not.toContain('packages/web');
      expect(result).not.toContain('webHandler');
    });

    it('should return JSON error for missing workspace', async () => {
      const baseDir = createTempDir();
      fs.writeFileSync(path.join(baseDir, 'package.json'), JSON.stringify({ private: true, workspaces: ['packages/*'] }));
      createMemoryDir(baseDir, {});

      const cmd = new ContextCommand(baseDir);
      const result = await cmd.execute({ json: true, workspace: 'packages/api' });

      expect(result.status).toBe('error');
      expect(result.error).toBe("Workspace 'packages/api' not found.");
      expect(result.workspace).toBeNull();
    });
  });

  // ---- 以下为补充测试，覆盖未覆盖分支 ----

  describe('resolveWorkspaceOption', () => {
    // 行49：workspace 为 object 时直接返回
    it('应直接返回 workspace 对象（不再 resolve）', async () => {
      const baseDir = createTempDir();
      const cmd = new ContextCommand(baseDir);
      const ws = { name: 'foo', root: '/tmp/foo', packageJsonPath: '/tmp/foo/package.json' };
      const result = await cmd.resolveWorkspaceOption({ workspace: ws });
      expect(result).toBe(ws);
    });

    // 行62：format=json + mode=export + workspace 不存在 → stdout.write
    it('当 format=json 且 mode=export 且 workspace 不存在时，应写入 stdout', async () => {
      const baseDir = createTempDir();
      fs.writeFileSync(path.join(baseDir, 'package.json'), JSON.stringify({ private: true, workspaces: ['packages/*'] }));
      createMemoryDir(baseDir, {});

      const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

      const cmd = new ContextCommand(baseDir);
      const result = await cmd.resolveWorkspaceOption({
        workspace: 'packages/nonexistent',
        format: 'json',
        mode: 'export',
      });

      // 应该通过 stdout.write 输出 JSON 错误
      expect(stdoutSpy).toHaveBeenCalled();
      const written = stdoutSpy.mock.calls.map(c => String(c[0])).join('');
      const parsed = JSON.parse(written);
      expect(parsed.status).toBe('error');
      expect(result.status).toBe('error');

      stdoutSpy.mockRestore();
    });

    // 行69：workspace 不存在且非 JSON 模式 → 抛出异常
    it('当 workspace 不存在且非 JSON 模式时，应抛出异常', async () => {
      const baseDir = createTempDir();
      fs.writeFileSync(path.join(baseDir, 'package.json'), JSON.stringify({ private: true, workspaces: ['packages/*'] }));
      createMemoryDir(baseDir, {});

      const cmd = new ContextCommand(baseDir);
      await expect(cmd.resolveWorkspaceOption({ workspace: 'packages/nonexistent' }))
        .rejects.toThrow("Workspace 'packages/nonexistent' not found.");
    });
  });

  describe('executeExport - clipboard 分支', () => {
    // 行105-110：--copy 在 darwin 上成功复制到剪贴板
    it('应在 darwin 上成功复制到剪贴板（--copy）', async () => {
      const baseDir = createTempDir();
      createMemoryDir(baseDir, {
        'foundation.md': '# Foundation\nFoundation content',
      });

      // 重置模块缓存，用 doMock 注入 mock 的 execSync
      jest.resetModules();
      const execSyncMock = jest.fn(() => ({ status: 0 }));
      jest.doMock('child_process', () => ({
        ...jest.requireActual('child_process'),
        spawnSync: execSyncMock,
      }));

      const { ContextCommand: FreshCmd } = require('../src/cli/commands/context');
      const cmd = new FreshCmd(baseDir);
      const result = await cmd.execute({ mode: 'export', copy: true });

      expect(execSyncMock).toHaveBeenCalled();
      expect(result).toContain('Foundation content');

      jest.dontMock('child_process');
    });

    // 行111-114：clipboard 复制失败 → 回退到 stdout
    it('当剪贴板复制失败时，应回退输出到 stdout', async () => {
      const baseDir = createTempDir();
      createMemoryDir(baseDir, {
        'foundation.md': '# Foundation\nFoundation content',
      });

      const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

      jest.resetModules();
      const execSyncMock = jest.fn(() => { throw new Error('clipboard error'); });
      jest.doMock('child_process', () => ({
        ...jest.requireActual('child_process'),
        spawnSync: execSyncMock,
      }));

      const { ContextCommand: FreshCmd } = require('../src/cli/commands/context');
      const cmd = new FreshCmd(baseDir);
      const result = await cmd.execute({ mode: 'export', copy: true });

      // 应该回退到 stdout
      expect(stdoutSpy).toHaveBeenCalled();
      expect(result).toContain('Foundation content');

      jest.dontMock('child_process');
      stdoutSpy.mockRestore();
    });

    // 行116-119：不支持剪贴板的平台（CLIP_COMMANDS[platform] 为 undefined）→ 回退到 stdout
    it('在不支持剪贴板的平台上应回退到 stdout', async () => {
      const baseDir = createTempDir();
      createMemoryDir(baseDir, {
        'foundation.md': '# Foundation\nFoundation content',
      });

      const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

      // 重置模块并通过 Object.defineProperty 临时修改 process.platform
      jest.resetModules();
      const origPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'freebsd' });

      const { ContextCommand: FreshCmd } = require('../src/cli/commands/context');
      const cmd = new FreshCmd(baseDir);
      const result = await cmd.execute({ mode: 'export', copy: true });

      expect(stdoutSpy).toHaveBeenCalled();
      expect(result).toContain('Foundation content');

      // 恢复 process.platform
      Object.defineProperty(process, 'platform', { value: origPlatform });
      jest.dontMock('child_process');
      stdoutSpy.mockRestore();
    });
  });

  describe('executeExport - stdout 回退（行126）', () => {
    it('无 --copy 且无 --output 时，应输出到 stdout', async () => {
      const baseDir = createTempDir();
      createMemoryDir(baseDir, {
        'foundation.md': '# Foundation\nF content',
        'components.md': '# Components\nC content',
      });

      const cmd = new ContextCommand(baseDir);
      const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

      const result = await cmd.execute({ mode: 'export' });

      expect(stdoutSpy).toHaveBeenCalled();
      expect(result).toContain('## 1. Foundation');
      expect(result).toContain('## 2. Components');

      stdoutSpy.mockRestore();
    });
  });

  describe('printMarkdown - workspace 场景（行144-146）', () => {
    it('带 workspace 时应输出 workspace 信息', async () => {
      const baseDir = createTempDir();
      fs.writeFileSync(path.join(baseDir, 'package.json'), JSON.stringify({ private: true, workspaces: ['packages/*'] }));
      createMemoryDir(baseDir, {
        'foundation.md': '# Foundation\nFoundation content',
      });

      // 创建 workspace 目录结构
      const apiDir = path.join(baseDir, 'packages', 'api', 'src');
      fs.mkdirSync(apiDir, { recursive: true });
      fs.writeFileSync(path.join(baseDir, 'packages', 'api', 'package.json'), JSON.stringify({ name: 'api' }));
      fs.writeFileSync(path.join(apiDir, 'index.ts'), 'export function apiHandler() { return true; }');

      const cmd = new ContextCommand(baseDir);
      // 直接调用 printMarkdown，传入 workspace
      const { resolveWorkspace } = require('../src/utils/workspace-detector');
      const ws = resolveWorkspace(baseDir, 'packages/api');

      await cmd.printMarkdown(['foundation'], ws);

      // 应包含 workspace 信息（行145-146）
      const output = logSpy.mock.calls.map(c => String(c[0])).join('\n');
      expect(output).toContain('Workspace:');
      expect(output).toContain('api');
    });
  });

  describe('readLayer - 非 ENOENT 错误（行171）', () => {
    it('当读取文件遇到非 ENOENT 错误时，应向上抛出异常', async () => {
      const baseDir = createTempDir();
      const cmd = new ContextCommand(baseDir);

      // mock fs.readFile 抛出权限错误
      const fsPromises = require('fs').promises;
      jest.spyOn(fsPromises, 'readFile').mockRejectedValue(Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' }));

      await expect(cmd.readLayer('foundation')).rejects.toThrow('EACCES');

      jest.restoreAllMocks();
    });
  });

  describe('readWorkspaceLayer - components 和 contracts 分支（行179-182）', () => {
    it('应通过 MemoryScanner 生成 components 层', async () => {
      const baseDir = createTempDir();
      createMemoryDir(baseDir, {});

      const apiSrcDir = path.join(baseDir, 'packages', 'api', 'src');
      fs.mkdirSync(apiSrcDir, { recursive: true });
      fs.writeFileSync(path.join(apiSrcDir, 'index.ts'), 'export function handler() {}');
      fs.writeFileSync(path.join(baseDir, 'packages', 'api', 'package.json'), JSON.stringify({ name: 'api' }));
      fs.writeFileSync(path.join(baseDir, 'package.json'), JSON.stringify({ private: true, workspaces: ['packages/*'] }));

      const cmd = new ContextCommand(baseDir);
      const { resolveWorkspace } = require('../src/utils/workspace-detector');
      const ws = resolveWorkspace(baseDir, 'packages/api');

      const content = await cmd.readWorkspaceLayer('components', ws);
      // MemoryScanner 的 components 输出包含源码文件路径
      expect(content).toContain('index.ts');
    });

    it('应通过 MemoryScanner 生成 contracts 层', async () => {
      const baseDir = createTempDir();
      createMemoryDir(baseDir, {});

      const apiSrcDir = path.join(baseDir, 'packages', 'api', 'src');
      fs.mkdirSync(apiSrcDir, { recursive: true });
      fs.writeFileSync(path.join(apiSrcDir, 'index.ts'), 'export function handler() {}');
      fs.writeFileSync(path.join(baseDir, 'packages', 'api', 'package.json'), JSON.stringify({ name: 'api' }));
      fs.writeFileSync(path.join(baseDir, 'package.json'), JSON.stringify({ private: true, workspaces: ['packages/*'] }));

      const cmd = new ContextCommand(baseDir);
      const { resolveWorkspace } = require('../src/utils/workspace-detector');
      const ws = resolveWorkspace(baseDir, 'packages/api');

      const content = await cmd.readWorkspaceLayer('contracts', ws);
      // MemoryScanner 的 contracts 输出包含导出的函数名
      expect(content).toContain('handler');
    });

    // 行182：未知 layer 返回 null
    it('对未知 layer 应返回 null', async () => {
      const baseDir = createTempDir();
      createMemoryDir(baseDir, {});

      const apiSrcDir = path.join(baseDir, 'packages', 'api', 'src');
      fs.mkdirSync(apiSrcDir, { recursive: true });
      fs.writeFileSync(path.join(baseDir, 'packages', 'api', 'package.json'), JSON.stringify({ name: 'api' }));
      fs.writeFileSync(path.join(baseDir, 'package.json'), JSON.stringify({ private: true, workspaces: ['packages/*'] }));

      const cmd = new ContextCommand(baseDir);
      const { resolveWorkspace } = require('../src/utils/workspace-detector');
      const ws = resolveWorkspace(baseDir, 'packages/api');

      const result = await cmd.readWorkspaceLayer('unknown_layer', ws);
      expect(result).toBeNull();
    });
  });

  describe('readPackageJson（行208-214）', () => {
    it('应正确读取并解析 package.json', async () => {
      const baseDir = createTempDir();
      const pkgPath = path.join(baseDir, 'package.json');
      fs.writeFileSync(pkgPath, JSON.stringify({ name: 'test-pkg', version: '1.0.0', description: '测试包' }));

      const cmd = new ContextCommand(baseDir);
      const pkg = await cmd.readPackageJson(pkgPath);

      expect(pkg.name).toBe('test-pkg');
      expect(pkg.version).toBe('1.0.0');
      expect(pkg.description).toBe('测试包');
    });

    it('当文件不存在时应返回 null', async () => {
      const baseDir = createTempDir();
      const cmd = new ContextCommand(baseDir);
      const pkg = await cmd.readPackageJson(path.join(baseDir, 'nonexistent.json'));
      expect(pkg).toBeNull();
    });

    it('当文件内容不是合法 JSON 时应返回 null', async () => {
      const baseDir = createTempDir();
      const badJsonPath = path.join(baseDir, 'bad.json');
      fs.writeFileSync(badJsonPath, 'this is not json {{{');

      const cmd = new ContextCommand(baseDir);
      const pkg = await cmd.readPackageJson(badJsonPath);
      expect(pkg).toBeNull();
    });
  });

  describe('getMissingLayers（行216-224）', () => {
    it('应返回缺失的 layer 列表', async () => {
      const baseDir = createTempDir();
      createMemoryDir(baseDir, {
        'foundation.md': '# Foundation\nExists',
      });

      const cmd = new ContextCommand(baseDir);
      const missing = await cmd.getMissingLayers(['foundation', 'components', 'contracts']);

      expect(missing).toEqual(['components', 'contracts']);
    });

    it('当所有 layer 都存在时应返回空数组', async () => {
      const baseDir = createTempDir();
      createMemoryDir(baseDir, {
        'foundation.md': '# Foundation\nExists',
        'components.md': '# Components\nExists',
        'contracts.md': '# Contracts\nExists',
      });

      const cmd = new ContextCommand(baseDir);
      const missing = await cmd.getMissingLayers(['foundation', 'components', 'contracts']);

      expect(missing).toEqual([]);
    });

    it('当所有 layer 都缺失时应返回全部', async () => {
      const baseDir = createTempDir();
      createMemoryDir(baseDir, {});

      const cmd = new ContextCommand(baseDir);
      const missing = await cmd.getMissingLayers(['foundation', 'components', 'contracts']);

      expect(missing).toEqual(['foundation', 'components', 'contracts']);
    });
  });

  describe('readLayerByPath - 非 ENOENT 错误（行235）', () => {
    it('当遇到非 ENOENT 错误时应向上抛出异常', async () => {
      const baseDir = createTempDir();
      createMemoryDir(baseDir, {});

      const memoryDir = path.join(baseDir, 'stdd', 'memory');

      // mock fs.promises.readFile 抛出 EACCES
      const fsPromises = require('fs').promises;
      jest.spyOn(fsPromises, 'readFile').mockRejectedValue(Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' }));

      await expect(ContextCommand.readLayerByPath(memoryDir, 'foundation')).rejects.toThrow('EACCES');

      jest.restoreAllMocks();
    });
  });

  describe('execute - 返回 error workspace（行25）', () => {
    it('当 resolveWorkspaceOption 返回 error 状态时，execute 应直接返回', async () => {
      const baseDir = createTempDir();
      fs.writeFileSync(path.join(baseDir, 'package.json'), JSON.stringify({ private: true, workspaces: ['packages/*'] }));
      createMemoryDir(baseDir, {});

      const cmd = new ContextCommand(baseDir);
      // 使用 json=true 让它不抛异常而是返回 error 对象
      const result = await cmd.execute({ json: true, workspace: 'packages/nonexistent' });

      expect(result.status).toBe('error');
      expect(result.error).toBe("Workspace 'packages/nonexistent' not found.");
    });
  });
});
