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
});
