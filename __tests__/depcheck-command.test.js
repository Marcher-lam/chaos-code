const fs = require('fs');
const path = require('path');
const { DepcheckCommand, isSafeListed } = require('../src/cli/commands/depcheck');

describe('DepcheckCommand', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'depcheck-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {
      // ignore cleanup errors
    }
  });

  function setupProject(deps, devDeps, srcFiles) {
    const pkgJson = {
      name: 'test-project',
      version: '1.0.0',
      dependencies: deps || {},
      devDependencies: devDeps || {},
    };
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify(pkgJson, null, 2));

    const srcDir = path.join(tmpDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });

    for (const [filename, content] of Object.entries(srcFiles || {})) {
      const fullPath = path.join(srcDir, filename);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath, content);
    }

    return srcDir;
  }

  describe('execute', () => {
    test('detects unused dependencies', async () => {
      setupProject(
        { 'lodash': '^4.17.0', 'unused-pkg': '^1.0.0' },
        {},
        { 'index.js': "const lodash = require('lodash');\nlodash.get(obj, 'key');" }
      );

      const cmd = new DepcheckCommand(tmpDir);
      const origExit = process.exit;
      process.exit = jest.fn();

      const result = await cmd.execute({ path: tmpDir, json: true });

      process.exit = origExit;
      expect(result.unused).toContain('unused-pkg');
    });

    test('detects missing dependencies', async () => {
      setupProject(
        { 'lodash': '^4.17.0' },
        {},
        { 'index.js': "import axios from 'axios';\naxios.get('/api');" }
      );

      const cmd = new DepcheckCommand(tmpDir);
      const result = await cmd.execute({ path: tmpDir, json: true });

      expect(result.missing).toContain('axios');
    });

    test('safe-listed packages are not reported as unused', async () => {
      setupProject(
        { 'eslint': '^8.0.0', 'typescript': '^5.0.0', 'jest': '^29.0.0' },
        {},
        { 'index.js': "const lodash = require('lodash');" }
      );

      const cmd = new DepcheckCommand(tmpDir);
      const result = await cmd.execute({ path: tmpDir, json: true });

      expect(result.unused).not.toContain('eslint');
      expect(result.unused).not.toContain('typescript');
      expect(result.unused).not.toContain('jest');
    });

    test('custom safe-list packages are excluded', async () => {
      setupProject(
        { 'my-internal-tool': '^1.0.0', 'lodash': '^4.17.0' },
        {},
        { 'index.js': "const lodash = require('lodash');" }
      );

      const cmd = new DepcheckCommand(tmpDir);
      const result = await cmd.execute({ path: tmpDir, json: true, safeList: 'my-internal-tool' });

      expect(result.unused).not.toContain('my-internal-tool');
    });
  });

  describe('JSON output', () => {
    test('returns structured result', async () => {
      setupProject({ 'unused-a': '^1.0.0', 'used-b': '^1.0.0' }, {}, {
        'a.js': "require('unused-a');",
        'b.js': "import usedB from 'used-b';",
      });

      const cmd = new DepcheckCommand(tmpDir);
      const result = await cmd.execute({ path: tmpDir, json: true });

      expect(result).toHaveProperty('unused');
      expect(result).toHaveProperty('missing');
      expect(result).toHaveProperty('directory');
      expect(result).toHaveProperty('totalDeps');
    });
  });

  describe('workspace mode', () => {
    test('scans specific workspace by directory name', async () => {
      const wsDir = path.join(tmpDir, 'packages', 'api');
      fs.mkdirSync(wsDir, { recursive: true });

      const pkgJson = {
        name: 'api',
        dependencies: { 'express': '^4.0.0', 'unused-ws-pkg': '^1.0.0' },
      };
      fs.writeFileSync(path.join(wsDir, 'package.json'), JSON.stringify(pkgJson, null, 2));

      const srcDir = path.join(wsDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'index.js'), "const express = require('express');");

      const rootPkg = {
        name: 'test-monorepo',
        workspaces: ['packages/*'],
      };
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify(rootPkg, null, 2));

      const cmd = new DepcheckCommand(tmpDir);
      const result = await cmd.execute({ workspace: 'api', json: true });

      expect(result.unused).toContain('unused-ws-pkg');
    });

    test('scans workspace by directory path', async () => {
      const wsDir = path.join(tmpDir, 'packages', 'worker');
      fs.mkdirSync(wsDir, { recursive: true });

      const pkgJson = {
        name: 'worker',
        dependencies: { 'bull': '^4.0.0', 'unused-dep': '^1.0.0' },
      };
      fs.writeFileSync(path.join(wsDir, 'package.json'), JSON.stringify(pkgJson, null, 2));

      const srcDir = path.join(wsDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'index.js'), "const Bull = require('bull');");

      const rootPkg = {
        name: 'test-monorepo',
        workspaces: ['packages/*'],
      };
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify(rootPkg, null, 2));

      const cmd = new DepcheckCommand(tmpDir);
      const result = await cmd.execute({ workspace: 'packages/worker', json: true });

      expect(result.unused).toContain('unused-dep');
    });
  });

  describe('evidence capture', () => {
    test('saves evidence to stdd/evidence/', async () => {
      const stddDir = path.join(tmpDir, 'stdd');
      fs.mkdirSync(stddDir, { recursive: true });

      setupProject({ 'lodash': '^4.0.0' }, {}, {
        'index.js': "const x = 1;",
      });

      const cmd = new DepcheckCommand(tmpDir);
      await cmd.execute({ path: tmpDir, json: true });

      const evidenceDir = path.join(stddDir, 'evidence');
      expect(fs.existsSync(evidenceDir)).toBe(true);

      const files = fs.readdirSync(evidenceDir);
      const depcheckFiles = files.filter(f => f.startsWith('depcheck-') && f.endsWith('.json'));
      expect(depcheckFiles.length).toBeGreaterThan(0);

      const evidence = JSON.parse(fs.readFileSync(path.join(evidenceDir, depcheckFiles[0]), 'utf8'));
      expect(evidence.type).toBe('depcheck');
      expect(evidence.data).toHaveProperty('unused');
    });
  });
});

describe('isSafeListed', () => {
  test('exact matches work', () => {
    expect(isSafeListed('eslint')).toBe(true);
    expect(isSafeListed('jest')).toBe(true);
    expect(isSafeListed('typescript')).toBe(true);
  });

  test('wildcard patterns work', () => {
    expect(isSafeListed('@types/node')).toBe(true);
    expect(isSafeListed('@types/lodash')).toBe(true);
    expect(isSafeListed('eslint-plugin-react')).toBe(true);
    expect(isSafeListed('eslint-config-airbnb')).toBe(true);
    expect(isSafeListed('@babel/core')).toBe(true);
    expect(isSafeListed('babel-loader')).toBe(true);
    expect(isSafeListed('webpack-cli')).toBe(true);
    expect(isSafeListed('@vitest/ui')).toBe(true);
  });

  test('non-safe-listed packages return false', () => {
    expect(isSafeListed('lodash')).toBe(false);
    expect(isSafeListed('express')).toBe(false);
    expect(isSafeListed('my-custom-pkg')).toBe(false);
  });
});
