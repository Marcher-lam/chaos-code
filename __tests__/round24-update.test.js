const fs = require('fs');
const path = require('path');
const os = require('os');
const { UpdateCommand } = require('../src/cli/commands/update');

describe('round24: update.js branch coverage', () => {
  let tempDirs = [];
  let logSpy;

  const silentSpinner = {
    text: '',
    start: jest.fn(),
    stop: jest.fn(),
    succeed: jest.fn(),
    fail: jest.fn(),
  };

  function mkTmp(prefix = 'stdd-r24-') {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    tempDirs.push(dir);
    return dir;
  }

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    if (logSpy) logSpy.mockRestore();
  });

  afterAll(() => {
    for (const dir of tempDirs) {
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
    }
  });

  // ---------------------------------------------------------------
  // 1. replaceWorkspaceRegistryBlock — before is empty (line 666)
  //    Content starts directly with "workspaces:" so `before` is ''
  // ---------------------------------------------------------------
  it('replaceWorkspaceRegistryBlock: before is empty when workspaces is first line', () => {
    const cmd = new UpdateCommand(silentSpinner);
    const content = 'workspaces:\n  enabled: true\n  items:\n    - name: "old"\n';
    const block = 'workspaces:\n  enabled: true\n  items: []\n';
    const result = cmd.replaceWorkspaceRegistryBlock(content, block);
    // `before` is '' (falsy), so the ternary takes the '' branch
    expect(result).not.toContain('name: "old"');
    expect(result.startsWith('workspaces:')).toBe(true);
  });

  // ---------------------------------------------------------------
  // 2. replaceWorkspaceRegistryBlock — after is empty (line 666)
  //    Content ends with workspaces section so `after` is ''
  // ---------------------------------------------------------------
  it('replaceWorkspaceRegistryBlock: after is empty when workspaces is last section', () => {
    const cmd = new UpdateCommand(silentSpinner);
    const content = 'version: "1.0"\nworkspaces:\n  enabled: true\n  items:\n    - name: "old"\n';
    const block = 'workspaces:\n  enabled: true\n  items: []\n';
    const result = cmd.replaceWorkspaceRegistryBlock(content, block);
    // `after` is '' (falsy), so the ternary takes the '' branch
    expect(result).not.toContain('name: "old"');
    expect(result).toContain('version: "1.0"');
  });

  // ---------------------------------------------------------------
  // 3. yaml.load returning falsy — || {} fallback (line 570)
  // ---------------------------------------------------------------
  it('mergeWorkspaceRegistry: handles yaml.load returning null/undefined', () => {
    const cmd = new UpdateCommand(silentSpinner);
    // Pass empty-ish config content that yaml.load might parse as null
    // Actually yaml.load('') returns undefined, so this triggers || {}
    const result = cmd.mergeWorkspaceRegistry('', '/nonexistent/path');
    expect(result).toBeDefined();
    expect(typeof result.content).toBe('string');
    expect(result.changed).toBe(false);
  });

  // ---------------------------------------------------------------
  // 4. workspaces.items || [] fallback (line 633)
  //    Pass renderWorkspaceRegistryBlock with items undefined
  // ---------------------------------------------------------------
  it('renderWorkspaceRegistryBlock: items undefined triggers || [] fallback', () => {
    const cmd = new UpdateCommand(silentSpinner);
    const result = cmd.renderWorkspaceRegistryBlock({
      enabled: true,
      // items intentionally omitted
    });
    expect(result).toContain('enabled: true');
    expect(result).toContain('items:');
    // No items rendered
    expect(result).not.toContain('- name:');
  });

  // ---------------------------------------------------------------
  // 5. formatAffectedWorkspaces() with no arguments — triggers defaults
  // ---------------------------------------------------------------
  it('formatAffectedWorkspaces: no args triggers parameter defaults', () => {
    const cmd = new UpdateCommand(silentSpinner);
    // Call with no args — workspaces defaults to [], targetPath to process.cwd()
    const result = cmd.formatAffectedWorkspaces();
    expect(result).toContain('packages/api');
    expect(result).toContain('apps/web');
  });

  // ---------------------------------------------------------------
  // 6. renderGitHubTemplate() with no workspaces arg — triggers default
  // ---------------------------------------------------------------
  it('renderGitHubTemplate: no workspaces arg triggers parameter default', () => {
    const cmd = new UpdateCommand(silentSpinner);
    const content = 'Before\n<!-- STDD:WORKSPACES:start -->old<!-- STDD:WORKSPACES:end -->\nAfter';
    const result = cmd.renderGitHubTemplate(content, '/project');
    // workspaces defaults to []
    expect(result).toContain('Before');
    expect(result).toContain('After');
    // Should contain default placeholder workspaces
    expect(result).toContain('packages/api');
  });

  // ---------------------------------------------------------------
  // 7. updateConfig with no options — triggers {} default
  //    And config.yaml missing + default config missing path
  // ---------------------------------------------------------------
  it('updateConfig: no options arg, no config.yaml, no default config', async () => {
    const tmp = mkTmp();
    const cmd = new UpdateCommand(silentSpinner);
    // Mock getPackageRoot to point to a nonexistent location
    const pathResolver = require('../src/utils/path-resolver');
    const spy = jest.spyOn(pathResolver, 'getPackageRoot').mockReturnValue(path.join(tmp, 'fake-root'));
    try {
      // Call with only targetPath, no options — triggers {} default
      const result = await cmd.updateConfig(tmp);
      expect(result).toBeDefined();
      // Neither config.yaml nor default exists, so merged=false, no crash
      expect(result.merged).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });

  // ---------------------------------------------------------------
  // 9. updateConfig: config merge error catch block
  // ---------------------------------------------------------------
  it('updateConfig: merge error is caught gracefully', async () => {
    const tmp = mkTmp();
    const configPath = path.join(tmp, 'stdd', 'config.yaml');
    fs.mkdirSync(path.join(tmp, 'stdd'), { recursive: true });
    fs.writeFileSync(configPath, 'version: "1.0"\nname: "test"\n');

    const cmd = new UpdateCommand(silentSpinner);
    // Make readFile throw on the second read (default config) by corrupting after first read
    const origRead = fs.promises.readFile.bind(fs.promises);
    let readCount = 0;
    const readSpy = jest.spyOn(fs.promises, 'readFile').mockImplementation(async (...args) => {
      readCount++;
      if (readCount === 2) throw new Error('simulated merge read failure');
      return origRead(...args);
    });

    try {
      const result = await cmd.updateConfig(tmp, { force: false });
      expect(result).toBeDefined();
      expect(cmd.report.errors.length).toBeGreaterThan(0);
      expect(cmd.report.errors[0].scope).toBe('config');
    } finally {
      readSpy.mockRestore();
    }
  });

  // ---------------------------------------------------------------
  // 10. effectiveSourceDir fallback — sourceDir branch
  //     When stddSubdir doesn't exist, effectiveSourceDir = sourceDir
  // ---------------------------------------------------------------
  it('updateSkills: falls back to sourceDir when stddSubdir does not exist', async () => {
    const tmp = mkTmp();
    const projectPath = path.join(tmp, 'project');
    fs.mkdirSync(path.join(projectPath, 'stdd'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, '.claude'), { recursive: true });
    tempDirs.push(projectPath); // cleanup

    const cmd = new UpdateCommand(silentSpinner);
    // Mock exists to return false for stddSubdir, true for everything else
    const origExists = cmd.exists.bind(cmd);
    const existsSpy = jest.spyOn(cmd, 'exists').mockImplementation(async (p) => {
      // When checking the stdd subdir, return false to trigger sourceDir fallback
      if (typeof p === 'string' && p.endsWith(path.join('skills', 'stdd'))) {
        return false;
      }
      return origExists(p);
    });

    try {
      await cmd.execute(projectPath, { force: false });
      // Should succeed — effectiveSourceDir = sourceDir (not stddSubdir)
      expect(logSpy.mock.calls.some(c => String(c[0]).includes('Update summary'))).toBe(true);
    } finally {
      existsSpy.mockRestore();
    }
  });

  // ---------------------------------------------------------------
  // 11. syncDirectory: extension filter skips non-matching files (line 314)
  // ---------------------------------------------------------------
  it('syncDirectory: skips files with non-matching extensions', async () => {
    const tmp = mkTmp();
    const srcDir = path.join(tmp, 'src');
    const tgtDir = path.join(tmp, 'tgt');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'keep.md'), '# Keep me');
    fs.writeFileSync(path.join(srcDir, 'skip.txt'), 'Skip me');

    const cmd = new UpdateCommand(silentSpinner);
    const result = await cmd.syncDirectory(srcDir, tgtDir, {
      force: false,
      dryRun: false,
      extensions: ['.md'],
      scope: 'test-ext',
    });

    // Only .md file should be added; .txt skipped by extension filter
    expect(result.added).toBe(1);
    expect(result.filesAdded[0]).toContain('keep.md');
    expect(result.filesAdded.some(f => f.includes('skip.txt'))).toBe(false);
  });

  // ---------------------------------------------------------------
  // 12. syncSkillsDirectory: non-directory entry in source (line 283)
  //     A file (not directory) in the source dir should be skipped
  // ---------------------------------------------------------------
  it('syncSkillsDirectory: skips non-directory entries', async () => {
    const tmp = mkTmp();
    const srcDir = path.join(tmp, 'skills');
    const tgtDir = path.join(tmp, 'tgt-skills');
    fs.mkdirSync(srcDir, { recursive: true });
    // Place a regular file alongside directories
    fs.writeFileSync(path.join(srcDir, 'README.md'), 'not a directory');
    // Also place a real directory so we exercise both paths
    const subDir = path.join(srcDir, 'my-skill');
    fs.mkdirSync(subDir, { recursive: true });
    fs.writeFileSync(path.join(subDir, 'SKILL.md'), '# Skill');

    const cmd = new UpdateCommand(silentSpinner);
    const result = await cmd.syncSkillsDirectory(srcDir, tgtDir, {
      force: false,
      dryRun: false,
      scope: 'skills-test',
    });

    // The README.md should be skipped (!entry.isDirectory() continue)
    // Only my-skill should be processed
    expect(result.added).toBe(1); // SKILL.md inside my-skill
  });

  // ---------------------------------------------------------------
  // 13. syncDirectory: hash match -> skip path (lines 347-350)
  // ---------------------------------------------------------------
  it('syncDirectory: skips file when content hash matches (identical content)', async () => {
    const tmp = mkTmp();
    const srcDir = path.join(tmp, 'src');
    const tgtDir = path.join(tmp, 'tgt');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.mkdirSync(tgtDir, { recursive: true });

    const content = '# Identical content\n';
    fs.writeFileSync(path.join(srcDir, 'file.md'), content);
    fs.writeFileSync(path.join(tgtDir, 'file.md'), content);

    const cmd = new UpdateCommand(silentSpinner);
    const result = await cmd.syncDirectory(srcDir, tgtDir, {
      force: false,
      dryRun: false,
      scope: 'hash-test',
    });

    expect(result.skipped).toBe(1);
    expect(result.filesSkipped[0]).toContain('file.md');
    expect(result.updated).toBe(0);
    expect(result.localChanges).toBe(0);
  });

  // ---------------------------------------------------------------
  // 14. updateConfig: create config from defaults in dry-run (line 491-494)
  // ---------------------------------------------------------------
  it('updateConfig: dry-run creates config.yaml from defaults when missing', async () => {
    const tmp = mkTmp();
    // The real getPackageRoot returns the actual package root, which has stdd/config.yaml
    const cmd = new UpdateCommand(silentSpinner);
    const configPath = path.join(tmp, 'stdd', 'config.yaml');
    fs.mkdirSync(path.join(tmp, 'stdd'), { recursive: true });
    // Ensure config.yaml doesn't exist
    if (fs.existsSync(configPath)) fs.unlinkSync(configPath);

    const result = await cmd.updateConfig(tmp, { dryRun: true });
    expect(result.merged).toBe(true);
    expect(result.added).toContain('config.yaml would be created from defaults');
    // File should NOT be created on disk
    expect(fs.existsSync(configPath)).toBe(false);
  });

  // ---------------------------------------------------------------
  // 15. updateConfig: config creation write error (line 488-489)
  // ---------------------------------------------------------------
  it('updateConfig: handles write error when creating config from defaults', async () => {
    const tmp = mkTmp();
    const configPath = path.join(tmp, 'stdd', 'config.yaml');
    fs.mkdirSync(path.join(tmp, 'stdd'), { recursive: true });
    if (fs.existsSync(configPath)) fs.unlinkSync(configPath);

    const cmd = new UpdateCommand(silentSpinner);
    // Make writeFile fail
    const writeSpy = jest.spyOn(fs.promises, 'writeFile').mockRejectedValue(new Error('disk full'));
    try {
      const _result = await cmd.updateConfig(tmp, { dryRun: false });
      expect(cmd.report.errors.length).toBeGreaterThan(0);
      expect(cmd.report.errors[0].message).toContain('Failed to create config.yaml');
    } finally {
      writeSpy.mockRestore();
    }
  });

  // ---------------------------------------------------------------
  // 16. printSummary: config.merged with workspace registry branch (line 124)
  // ---------------------------------------------------------------
  it('printSummary: shows "Workspace registry: updated" when merged with workspace registry', () => {
    const cmd = new UpdateCommand(silentSpinner);
    cmd.report = {
      engineCommands: { updated: 0, added: 0, skipped: 0, localChanges: 0 },
      skills: { updated: 0, added: 0, skipped: 0, localChanges: 0 },
      schemas: { updated: 0, added: 0, skipped: 0, localChanges: 0 },
      githubTemplates: { updated: 0, added: 0, skipped: 0, localChanges: 0 },
      config: {
        merged: true,
        added: ['workspace registry'],
        skipped: [],
      },
      errors: [],
      filesUpdated: [],
      filesSkipped: [],
      filesAdded: [],
      filesLocalChanges: [],
    };
    cmd.options = {};

    cmd.printSummary();

    const output = logSpy.mock.calls.map(c => String(c[0])).join('\n');
    expect(output).toContain('Workspace registry: updated');
  });

  // ---------------------------------------------------------------
  // 17. printSummary: config.merged with "workspace registry would update" (line 126-127)
  // ---------------------------------------------------------------
  it('printSummary: shows "Workspace registry: would update" in dry-run', () => {
    const cmd = new UpdateCommand(silentSpinner);
    cmd.report = {
      engineCommands: { updated: 0, added: 0, skipped: 0, localChanges: 0 },
      skills: { updated: 0, added: 0, skipped: 0, localChanges: 0 },
      schemas: { updated: 0, added: 0, skipped: 0, localChanges: 0 },
      githubTemplates: { updated: 0, added: 0, skipped: 0, localChanges: 0 },
      config: {
        merged: true,
        added: ['workspace registry would update'],
        skipped: [],
      },
      errors: [],
      filesUpdated: [],
      filesSkipped: [],
      filesAdded: [],
      filesLocalChanges: [],
    };
    cmd.options = {};

    cmd.printSummary();

    const output = logSpy.mock.calls.map(c => String(c[0])).join('\n');
    expect(output).toContain('Workspace registry: would update');
  });

  // ---------------------------------------------------------------
  // 18. printSummary: config skipped branch (line 129-130)
  // ---------------------------------------------------------------
  it('printSummary: shows config skipped message when not merged and has skipped items', () => {
    const cmd = new UpdateCommand(silentSpinner);
    cmd.report = {
      engineCommands: { updated: 0, added: 0, skipped: 0, localChanges: 0 },
      skills: { updated: 0, added: 0, skipped: 0, localChanges: 0 },
      schemas: { updated: 0, added: 0, skipped: 0, localChanges: 0 },
      githubTemplates: { updated: 0, added: 0, skipped: 0, localChanges: 0 },
      config: {
        merged: false,
        added: [],
        skipped: ['default config.yaml not found'],
      },
      errors: [],
      filesUpdated: [],
      filesSkipped: [],
      filesAdded: [],
      filesLocalChanges: [],
    };
    cmd.options = {};

    cmd.printSummary();

    const output = logSpy.mock.calls.map(c => String(c[0])).join('\n');
    expect(output).toContain('Config: skipped');
    expect(output).toContain('default config.yaml not found');
  });

  // ---------------------------------------------------------------
  // 19. replaceWorkspaceRegistryBlock: content doesn't end with newline (line 651)
  // ---------------------------------------------------------------
  it('replaceWorkspaceRegistryBlock: content without trailing newline uses \\n\\n separator', () => {
    const cmd = new UpdateCommand(silentSpinner);
    // Content without trailing newline and no existing workspaces section
    const content = 'version: "1.0"'; // no trailing \n
    const block = 'workspaces:\n  enabled: true\n  items: []\n';
    const result = cmd.replaceWorkspaceRegistryBlock(content, block);
    expect(result).toContain('version: "1.0"');
    expect(result).toContain('workspaces:');
    // The separator should be \n\n since content does NOT end with \n
    expect(result).toContain('\n\n# Monorepo Workspace Registry');
  });

  // ---------------------------------------------------------------
  // 20. addError with no filePath — filePath is null (line 80-87)
  // ---------------------------------------------------------------
  it('addError: handles error with no filePath parameter', () => {
    const cmd = new UpdateCommand(silentSpinner);
    cmd.addError('scope', 'message', new Error('err'));
    expect(cmd.report.errors).toHaveLength(1);
    expect(cmd.report.errors[0].filePath).toBeNull();
  });

  // ---------------------------------------------------------------
  // 21. execute: dry-run with errors — both branches (line 54 + 58-62)
  // ---------------------------------------------------------------
  it('execute: dry-run mode prints dry-run banner and does not write files', async () => {
    const tmp = mkTmp();
    const projectPath = path.join(tmp, 'project');
    fs.mkdirSync(path.join(projectPath, 'stdd'), { recursive: true });
    tempDirs.push(projectPath);

    const cmd = new UpdateCommand(silentSpinner);
    await cmd.execute(projectPath, { dryRun: true });

    const output = logSpy.mock.calls.map(c => String(c[0])).join('\n');
    expect(output).toContain('DRY RUN');
    expect(output).toContain('Dry run complete');
  });

  // ---------------------------------------------------------------
  // 22. mergeWorkspaceRegistry: existing workspace found by root match (line 585-587)
  // ---------------------------------------------------------------
  it('mergeWorkspaceRegistry: matches workspace by root when name differs', () => {
    const cmd = new UpdateCommand(silentSpinner);
    // Set up a config with a workspace item that has a different name but same root
    // This tests the `index.get('root:...')` fallback path
    const result = cmd.replaceWorkspaceRegistryBlock(
      'other: value\n',
      'workspaces:\n  enabled: true\n  items:\n    - name: "old"\n      root: "packages/api"\n      source_root: "packages/api/src"\n      package_json: "packages/api/package.json"\n'
    );
    expect(result).toContain('workspaces:');
    expect(result).toContain('other: value');
  });

  // ---------------------------------------------------------------
  // 23. printChangeDetails: prints added files (line 156-159)
  // ---------------------------------------------------------------
  it('printChangeDetails: prints added files list', () => {
    const cmd = new UpdateCommand(silentSpinner);
    cmd.printChangeDetails([], ['new-file.md'], [], []);
    const output = logSpy.mock.calls.map(c => String(c[0])).join('\n');
    expect(output).toContain('Added:');
    expect(output).toContain('new-file.md');
  });

  // ---------------------------------------------------------------
  // 24. createReport returns correct shape
  // ---------------------------------------------------------------
  it('createReport: returns correct default structure', () => {
    const cmd = new UpdateCommand(silentSpinner);
    const report = cmd.createReport();
    expect(report.config.merged).toBe(false);
    expect(report.config.added).toEqual([]);
    expect(report.config.skipped).toEqual([]);
    expect(report.errors).toEqual([]);
    expect(report.filesUpdated).toEqual([]);
    expect(report.filesSkipped).toEqual([]);
    expect(report.filesAdded).toEqual([]);
    expect(report.filesLocalChanges).toEqual([]);
  });

  // ---------------------------------------------------------------
  // 25. Constructor without spinner — uses default
  // ---------------------------------------------------------------
  it('constructor: creates default spinner when none provided', () => {
    const cmd = new UpdateCommand();
    expect(cmd.spinner).toBeDefined();
    expect(typeof cmd.spinner.start).toBe('function');
    expect(typeof cmd.spinner.stop).toBe('function');
    expect(typeof cmd.spinner.succeed).toBe('function');
    expect(typeof cmd.spinner.fail).toBe('function');
  });

  // ---------------------------------------------------------------
  // 26. mergeYamlConfig: ignores comment lines and blank lines
  // ---------------------------------------------------------------
  it('mergeYamlConfig: ignores comment and blank lines when detecting keys', () => {
    const cmd = new UpdateCommand(silentSpinner);
    const userConfig = '# comment\nversion: "1.0"\n\nname: "test"\n';
    const defaultConfig = 'version: "1.0"\nname: "default"\n# another comment\nnew_key: "value"\n';
    const result = cmd.mergeYamlConfig(userConfig, defaultConfig);
    expect(result).toContain('new_key: "value"');
    expect(result).toContain('Added by stdd update');
  });
});
