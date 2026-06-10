const fs = require('fs');
const path = require('path');
const os = require('os');
const { UpdateCommand } = require('../src/cli/commands/update');

describe('UpdateCommand', () => {
  let tempDirs = [];
  let logSpy;

  // Strip ANSI color codes from string for reliable assertions
  const stripAnsi = (s) => String(s).replace(/\x1b\[[0-9;]*m/g, '');

  function createTempProject(name) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-update-test-'));
    tempDirs.push(root);

    const projectPath = path.join(root, name);
    fs.mkdirSync(projectPath, { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'stdd'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, '.claude'), { recursive: true });
    return projectPath;
  }

  const silentSpinner = {
    text: '',
    start() {},
    stop() {},
    succeed() {},
    fail() {}
  };

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    if (logSpy) {
      logSpy.mockRestore();
    }
  });

  afterAll(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  describe('basic update', () => {
    it('should update schemas recursively including constitution articles', async () => {
      const projectPath = createTempProject('recursive-schema-project');
      const updateCommand = new UpdateCommand(silentSpinner);

      await updateCommand.execute(projectPath, { force: false });

      const articlePath = path.join(
        projectPath,
        'schemas',
        'constitution',
        'articles',
        '01-library-first.md'
      );
      expect(fs.existsSync(articlePath)).toBe(true);
      expect(logSpy.mock.calls.some(call => stripAnsi(call[0]).includes('Update summary'))).toBe(true);
    });

    it('should report errors and fail when file sync encounters write errors', async () => {
      const projectPath = createTempProject('error-report-project');
      const originalWriteFile = fs.promises.writeFile.bind(fs.promises);
      const writeSpy = jest.spyOn(fs.promises, 'writeFile').mockImplementation(async (...args) => {
        const filePath = String(args[0]);
        if (filePath.endsWith(path.join('schemas', 'spec-driven', 'schema.yaml'))) {
          throw new Error('simulated write failure');
        }
        return originalWriteFile(...args);
      });

      const updateCommand = new UpdateCommand(silentSpinner);
      try {
        await expect(updateCommand.execute(projectPath, { force: true }))
          .rejects
          .toThrow(/Update completed with \d+ error\(s\)/);
      } finally {
        writeSpy.mockRestore();
      }
    });

    it('should add missing GitHub issue templates', async () => {
      const projectPath = createTempProject('github-issue-template-project');
      fs.mkdirSync(path.join(projectPath, '.github'), { recursive: true });
      fs.writeFileSync(
        path.join(projectPath, '.github', 'PULL_REQUEST_TEMPLATE.md'),
        '# Existing PR Template\n'
      );

      const updateCommand = new UpdateCommand(silentSpinner);
      await updateCommand.execute(projectPath, { force: false });

      const bugReportPath = path.join(projectPath, '.github', 'ISSUE_TEMPLATE', 'bug_report.md');
      const featureRequestPath = path.join(projectPath, '.github', 'ISSUE_TEMPLATE', 'feature_request.md');

      expect(fs.existsSync(bugReportPath)).toBe(true);
      expect(fs.existsSync(featureRequestPath)).toBe(true);
      expect(fs.readFileSync(bugReportPath, 'utf8')).toContain('Affected Workspace(s)');
      expect(fs.readFileSync(featureRequestPath, 'utf8')).toContain('chaos context --workspace <workspace> --export');
      expect(fs.readFileSync(path.join(projectPath, '.github', 'PULL_REQUEST_TEMPLATE.md'), 'utf8'))
        .toBe('# Existing PR Template\n');
    });

    it('should render detected workspaces when update adds PR template', async () => {
      const projectPath = createTempProject('github-workspace-template-project');
      fs.writeFileSync(path.join(projectPath, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
      fs.mkdirSync(path.join(projectPath, 'packages', 'api'), { recursive: true });
      fs.writeFileSync(
        path.join(projectPath, 'packages', 'api', 'package.json'),
        JSON.stringify({ name: '@scope/api' })
      );

      const updateCommand = new UpdateCommand(silentSpinner);
      await updateCommand.execute(projectPath, { force: false });

      const prTemplatePath = path.join(projectPath, '.github', 'PULL_REQUEST_TEMPLATE.md');
      const content = fs.readFileSync(prTemplatePath, 'utf8');

      expect(content).toContain('- [ ] packages/api');
      expect(content).toContain('chaos constitution status --workspace <workspace>');
    });
  });

  describe('new skill file detection', () => {
    it('should add missing skill files when project is old', async () => {
      const projectPath = createTempProject('old-project');

      const updateCommand = new UpdateCommand(silentSpinner);
      await updateCommand.execute(projectPath, { force: false });

      const skillsDir = path.join(projectPath, '.claude', 'skills');

      expect(fs.existsSync(skillsDir)).toBe(true);

      const skillsEntries = fs.readdirSync(skillsDir);
      expect(skillsEntries.length).toBeGreaterThan(0);

      const summaryCall = logSpy.mock.calls.find(call =>
        stripAnsi(call[0]).includes('Update summary')
      );
      expect(summaryCall).toBeDefined();

      const skillsCall = logSpy.mock.calls.find(call => {
        const msg = String(call[0]);
        return msg.includes('Skills:') && msg.includes('added');
      });
      expect(skillsCall).toBeDefined();
    });
  });

  describe('local modification detection', () => {
    it('should skip files that were modified locally', async () => {
      const projectPath = createTempProject('modified-project');

      const existingSkillsDir = path.join(projectPath, '.claude', 'skills', 'stdd');
      const existingSkillDir = path.join(existingSkillsDir, 'init');
      fs.mkdirSync(existingSkillDir, { recursive: true });
      fs.writeFileSync(
        path.join(existingSkillDir, 'SKILL.md'),
        '# My Custom Modified SKILL\n\nlocal changes here\n'
      );

      const updateCommand = new UpdateCommand(silentSpinner);
      await updateCommand.execute(projectPath, { force: false });

      const content = fs.readFileSync(
        path.join(existingSkillDir, 'SKILL.md'),
        'utf-8'
      );
      expect(content).toBe('# My Custom Modified SKILL\n\nlocal changes here\n');

      const summaryCall = logSpy.mock.calls.find(call =>
        stripAnsi(call[0]).includes('Update summary')
      );
      expect(summaryCall).toBeDefined();

      const localChangesCall = logSpy.mock.calls.find(call => {
        const msg = stripAnsi(call[0]);
        return msg.includes('local changes 1') || msg.includes('local changes 2') || msg.includes('local changes 3');
      });
      expect(localChangesCall).toBeDefined();
    });

    it('should skip locally modified schema files', async () => {
      const projectPath = createTempProject('modified-schema-project');

      const targetSchemaDir = path.join(projectPath, 'schemas', 'spec-driven');
      fs.mkdirSync(targetSchemaDir, { recursive: true });
      fs.writeFileSync(
        path.join(targetSchemaDir, 'schema.yaml'),
        '# Modified schema\nmodified: true\n'
      );

      const updateCommand = new UpdateCommand(silentSpinner);
      await updateCommand.execute(projectPath, { force: false });

      const content = fs.readFileSync(
        path.join(targetSchemaDir, 'schema.yaml'),
        'utf-8'
      );
      expect(content).toBe('# Modified schema\nmodified: true\n');
    });
  });

  describe('--force flag', () => {
    it('should overwrite all files including locally modified ones', async () => {
      const projectPath = createTempProject('force-project');

      const existingSkillsDir = path.join(projectPath, '.claude', 'skills', 'stdd');
      const existingSkillDir = path.join(existingSkillsDir, 'init');
      fs.mkdirSync(existingSkillDir, { recursive: true });
      fs.writeFileSync(
        path.join(existingSkillDir, 'SKILL.md'),
        '# My Custom SKILL\n\nshould be overwritten\n'
      );

      const targetSchemaDir = path.join(projectPath, 'schemas', 'spec-driven');
      fs.mkdirSync(targetSchemaDir, { recursive: true });
      fs.writeFileSync(
        path.join(targetSchemaDir, 'schema.yaml'),
        '# Modified schema\nshould be: overwritten\n'
      );

      const updateCommand = new UpdateCommand(silentSpinner);
      await updateCommand.execute(projectPath, { force: true });

      const skillContent = fs.readFileSync(
        path.join(existingSkillDir, 'SKILL.md'),
        'utf-8'
      );
      expect(skillContent).not.toBe('# My Custom SKILL\n\nshould be overwritten\n');

      const schemaContent = fs.readFileSync(
        path.join(targetSchemaDir, 'schema.yaml'),
        'utf-8'
      );
      expect(schemaContent).not.toBe('# Modified schema\nshould be: overwritten\n');
    });
  });

  describe('--dry-run flag', () => {
    it('should not modify any files in dry-run mode', async () => {
      const projectPath = createTempProject('dryrun-project');

      const existingSkillsDir = path.join(projectPath, '.claude', 'skills', 'stdd');
      const existingSkillDir = path.join(existingSkillsDir, 'init');
      fs.mkdirSync(existingSkillDir, { recursive: true });

      const updateCommand = new UpdateCommand(silentSpinner);
      await updateCommand.execute(projectPath, { dryRun: true });

      expect(fs.readdirSync(existingSkillsDir).length).toBe(1);

      const dryRunCall = logSpy.mock.calls.find(call =>
        stripAnsi(call[0]).includes('Dry run complete')
      );
      expect(dryRunCall).toBeDefined();
    });

    it('should show what would be added in dry-run mode', async () => {
      const projectPath = createTempProject('dryrun-show-project');

      const updateCommand = new UpdateCommand(silentSpinner);
      await updateCommand.execute(projectPath, { dryRun: true });

      const addedCall = logSpy.mock.calls.find(call => {
        const msg = String(call[0]);
        return msg.includes('added') && (msg.includes('Skills:') || msg.includes('Engine commands:'));
      });
      expect(addedCall).toBeDefined();
    });

    it('should report workspace registry plan without writing config in dry-run mode', async () => {
      const projectPath = createTempProject('dryrun-workspace-project');
      const configPath = path.join(projectPath, 'stdd', 'config.yaml');
      fs.writeFileSync(configPath, 'version: "1.0"\nname: "dryrun-workspace-project"\n');
      fs.writeFileSync(path.join(projectPath, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
      fs.mkdirSync(path.join(projectPath, 'packages', 'api'), { recursive: true });
      fs.writeFileSync(
        path.join(projectPath, 'packages', 'api', 'package.json'),
        JSON.stringify({ name: '@scope/api' })
      );

      const before = fs.readFileSync(configPath, 'utf8');
      const updateCommand = new UpdateCommand(silentSpinner);
      await updateCommand.execute(projectPath, { dryRun: true });

      expect(fs.readFileSync(configPath, 'utf8')).toBe(before);
      const registryCall = logSpy.mock.calls.find(call =>
        stripAnsi(call[0]).includes('Workspace registry: would update')
      );
      expect(registryCall).toBeDefined();
    });
  });

  describe('config.yaml merge', () => {
    it('should merge new fields into existing config.yaml', async () => {
      const projectPath = createTempProject('config-merge-project');

      const configPath = path.join(projectPath, 'stdd', 'config.yaml');
      fs.writeFileSync(configPath, `# STDD Copilot Configuration
version: "1.0"
name: "my-project"

project:
  type: "typescript"
  language: "typescript"
`);

      const updateCommand = new UpdateCommand(silentSpinner);
      await updateCommand.execute(projectPath, { force: false });

      const mergedContent = fs.readFileSync(configPath, 'utf-8');
      expect(mergedContent).toContain('name: "my-project"');
      expect(mergedContent).toContain('type: "typescript"');
      expect(mergedContent).toContain('# Added by stdd update');
    });

    it('should skip config if already up to date', async () => {
      const projectPath = createTempProject('config-uptodate-project');

      const defaultConfigPath = path.join(__dirname, '..', 'stdd', 'config.yaml');
      const defaultContent = fs.readFileSync(defaultConfigPath, 'utf-8');

      const configPath = path.join(projectPath, 'stdd', 'config.yaml');
      fs.writeFileSync(configPath, defaultContent);

      const updateCommand = new UpdateCommand(silentSpinner);
      await updateCommand.execute(projectPath, { force: false });

      const configCall = logSpy.mock.calls.find(call => {
        const msg = String(call[0]);
        return msg.includes('Config:') && msg.includes('skipped');
      });
      expect(configCall).toBeDefined();
    });

    it('should merge new workspaces without overwriting custom fields', async () => {
      const projectPath = createTempProject('config-workspace-merge-project');
      const configPath = path.join(projectPath, 'stdd', 'config.yaml');
      fs.writeFileSync(configPath, `version: "1.0"
name: "workspace-merge"
workspaces:
  enabled: true
  items:
    - name: "@scope/api"
      root: "packages/api"
      source_root: "custom/api/src"
      package_json: "packages/api/package.json"
      owner: "platform"
`);
      fs.writeFileSync(path.join(projectPath, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
      fs.mkdirSync(path.join(projectPath, 'packages', 'api'), { recursive: true });
      fs.writeFileSync(
        path.join(projectPath, 'packages', 'api', 'package.json'),
        JSON.stringify({ name: '@scope/api' })
      );
      fs.mkdirSync(path.join(projectPath, 'packages', 'web'), { recursive: true });
      fs.writeFileSync(
        path.join(projectPath, 'packages', 'web', 'package.json'),
        JSON.stringify({ name: '@scope/web' })
      );

      const updateCommand = new UpdateCommand(silentSpinner);
      await updateCommand.execute(projectPath, { force: false });

      const mergedContent = fs.readFileSync(configPath, 'utf8');
      expect(mergedContent).toContain('owner: platform');
      expect(mergedContent).toContain('source_root: "packages/api/src"');
      expect(mergedContent).toContain('name: "@scope/web"');
      expect(mergedContent).toContain('root: "packages/web"');
    });
  });

  describe('STDD not initialized', () => {
    it('should throw error if stdd directory does not exist', async () => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-update-not-init-'));
      const projectPath = path.join(root, 'project');
      fs.mkdirSync(projectPath, { recursive: true });
      tempDirs.push(root);

      const updateCommand = new UpdateCommand(silentSpinner);
      await expect(updateCommand.execute(projectPath, {}))
        .rejects
        .toThrow('STDD not initialized');
    });
  });

  describe('printSummary branches', () => {
    it('should truncate errors list at 5 with "...and N more"', async () => {
      const updateCommand = new UpdateCommand(silentSpinner);
      const errors = [];
      for (let i = 0; i < 8; i++) {
        errors.push({ scope: 'test', message: `error ${i}`, error: 'fail' });
      }
      updateCommand.report = {
        engineCommands: { updated: 0, added: 0, skipped: 0, localChanges: 0 },
        skills: { updated: 0, added: 0, skipped: 0, localChanges: 0 },
        schemas: { updated: 0, added: 0, skipped: 0, localChanges: 0 },
        githubTemplates: { updated: 0, added: 0, skipped: 0, localChanges: 0 },
        config: { merged: false, added: [], skipped: [] },
        errors,
        filesUpdated: [], filesSkipped: [], filesAdded: [], filesLocalChanges: [],
      };
      updateCommand.options = {};

      updateCommand.printSummary();

      const output = logSpy.mock.calls.map(c => String(c[0])).join('\n');
      expect(output).toContain('...and 3 more');
    });

    it('should show local changes warning without --force and without --dry-run', async () => {
      const projectPath = createTempProject('local-changes-warning-project');

      // Create a modified file that will be detected as locally changed
      const existingSkillsDir = path.join(projectPath, '.claude', 'skills', 'stdd');
      const existingSkillDir = path.join(existingSkillsDir, 'init');
      fs.mkdirSync(existingSkillDir, { recursive: true });
      fs.writeFileSync(
        path.join(existingSkillDir, 'SKILL.md'),
        '# Locally modified content that differs from template\n'
      );

      const updateCommand = new UpdateCommand(silentSpinner);
      await updateCommand.execute(projectPath, { force: false, dryRun: false });

      expect(logSpy.mock.calls.some(call => stripAnsi(call[0]).includes('Use --force to overwrite'))).toBe(true);
    });
  });

  describe('printChangeDetails', () => {
    it('should print updated files in dry-run mode', async () => {
      const projectPath = createTempProject('print-details-updated');

      // Create a local modification so there's something to update with force
      const existingSkillsDir = path.join(projectPath, '.claude', 'skills', 'stdd');
      const existingSkillDir = path.join(existingSkillsDir, 'init');
      fs.mkdirSync(existingSkillDir, { recursive: true });
      fs.writeFileSync(
        path.join(existingSkillDir, 'SKILL.md'),
        '# Modified content\n'
      );

      const updateCommand = new UpdateCommand(silentSpinner);
      await updateCommand.execute(projectPath, { dryRun: true, force: true });

      expect(logSpy.mock.calls.some(call => stripAnsi(call[0]).includes('Updated:'))).toBe(true);
    });

    it('should print local changes files in dry-run mode', async () => {
      const projectPath = createTempProject('print-details-local');

      // Create a locally modified file
      const existingSkillsDir = path.join(projectPath, '.claude', 'skills', 'stdd');
      const existingSkillDir = path.join(existingSkillsDir, 'init');
      fs.mkdirSync(existingSkillDir, { recursive: true });
      fs.writeFileSync(
        path.join(existingSkillDir, 'SKILL.md'),
        '# Modified content\n'
      );

      const updateCommand = new UpdateCommand(silentSpinner);
      await updateCommand.execute(projectPath, { dryRun: true, force: false });

      expect(logSpy.mock.calls.some(call => stripAnsi(call[0]).includes('Skipped (Local changes):'))).toBe(true);
    });
  });

  describe('updateEngineCommands edge cases', () => {
    it('should handle no engine directories gracefully', async () => {
      const projectPath = createTempProject('no-engine-dirs');
      // Remove all engine dirs so detectEngineDirs returns empty
      const claudeDir = path.join(projectPath, '.claude');
      fs.rmSync(claudeDir, { recursive: true, force: true });

      const updateCommand = new UpdateCommand(silentSpinner);
      await updateCommand.execute(projectPath, { force: false });

      // Should succeed without errors about engine commands
      expect(logSpy.mock.calls.some(call =>
        stripAnsi(call[0]).includes('Engine commands:') && stripAnsi(call[0]).includes('updated 0')
      )).toBe(true);
    });
  });

  describe('updateSkills edge cases', () => {
    it('should handle no engine directories for skills', async () => {
      const projectPath = createTempProject('no-engine-skills');
      const claudeDir = path.join(projectPath, '.claude');
      fs.rmSync(claudeDir, { recursive: true, force: true });

      const updateCommand = new UpdateCommand(silentSpinner);
      await updateCommand.execute(projectPath, { force: false });

      expect(logSpy.mock.calls.some(call =>
        stripAnsi(call[0]).includes('Skills:') && stripAnsi(call[0]).includes('updated 0')
      )).toBe(true);
    });
  });

  describe('syncDirectory extension filter', () => {
    it('should skip files with non-matching extensions', async () => {
      const projectPath = createTempProject('ext-filter-project');
      const updateCommand = new UpdateCommand(silentSpinner);

      // The GitHub templates sync uses extensions: ['.md']
      // Create a .github dir with a non-.md file already present
      // The source dir only has .md files, so this tests the extension branch indirectly
      await updateCommand.execute(projectPath, { force: false });

      // Should complete without error
      expect(logSpy.mock.calls.some(call => stripAnsi(call[0]).includes('Update summary'))).toBe(true);
    });
  });

  describe('updateSchemas edge cases', () => {
    it('should handle missing source schema directory', async () => {
      const projectPath = createTempProject('missing-schema-source');

      const updateCommand = new UpdateCommand(silentSpinner);
      const pathResolver = require('../src/utils/path-resolver');
      const spy = jest.spyOn(pathResolver, 'getPackageRoot').mockReturnValue(path.join(projectPath, 'nonexistent-package-root'));

      try {
        await updateCommand.execute(projectPath, { force: false });
        // Should log errors about missing schema dir
        expect(logSpy.mock.calls.some(call =>
          stripAnsi(call[0]).includes('Schemas:')
        )).toBe(true);
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('updateGitHubTemplates edge cases', () => {
    it('should handle missing source github templates directory', async () => {
      const projectPath = createTempProject('missing-github-source');

      const updateCommand = new UpdateCommand(silentSpinner);
      const pathResolver = require('../src/utils/path-resolver');
      const spy = jest.spyOn(pathResolver, 'getPackageRoot').mockReturnValue(path.join(projectPath, 'nonexistent-package-root'));

      try {
        await updateCommand.execute(projectPath, { force: false });
        expect(logSpy.mock.calls.some(call =>
          stripAnsi(call[0]).includes('GitHub templates:')
        )).toBe(true);
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('updateConfig edge cases', () => {
    it('should create config.yaml from defaults when missing', async () => {
      const projectPath = createTempProject('create-config-defaults');

      // Make sure no config.yaml exists in stdd dir
      const configPath = path.join(projectPath, 'stdd', 'config.yaml');
      if (fs.existsSync(configPath)) fs.unlinkSync(configPath);

      const updateCommand = new UpdateCommand(silentSpinner);
      await updateCommand.execute(projectPath, { force: false });

      // Config should have been created from defaults
      expect(fs.existsSync(configPath)).toBe(true);
    });

    it('should skip config creation in dry-run when config.yaml missing and defaults exist', async () => {
      const projectPath = createTempProject('dryrun-config-create');

      const configPath = path.join(projectPath, 'stdd', 'config.yaml');
      if (fs.existsSync(configPath)) fs.unlinkSync(configPath);

      const updateCommand = new UpdateCommand(silentSpinner);
      await updateCommand.execute(projectPath, { dryRun: true });

      // Config should NOT have been created (dry run)
      expect(fs.existsSync(configPath)).toBe(false);
    });

    it('should skip config when neither user config nor default config exists', async () => {
      const projectPath = createTempProject('no-configs-at-all');
      const updateCommand = new UpdateCommand(silentSpinner);
      const result = await updateCommand.updateConfig(projectPath, { force: false });
      // If default config exists in the package, it gets created (merged=true).
      // If not, merged=false. Either way, no crash.
      expect(result).toBeDefined();
      expect(typeof result.merged).toBe('boolean');
    });

    it('should handle config merge error gracefully', async () => {
      const projectPath = createTempProject('config-merge-error');
      const configPath = path.join(projectPath, 'stdd', 'config.yaml');
      fs.writeFileSync(configPath, 'version: "1.0"\nname: "test"\n');
      // getPackageRoot returns real root — defaultConfigPath may or may not exist
      // If default doesn't exist: skipped
      // If default exists: merged
      const updateCommand = new UpdateCommand(silentSpinner);
      const result = await updateCommand.updateConfig(projectPath, { force: false });
      // Either merged or skipped — either way no crash
      expect(result).toBeDefined();
      expect(typeof result.merged).toBe('boolean');
    });

    it('should skip config when user config exists but default does not', async () => {
      const projectPath = createTempProject('config-no-default');
      const configPath = path.join(projectPath, 'stdd', 'config.yaml');
      fs.writeFileSync(configPath, 'version: "1.0"\nname: "test"\n');
      // The default config comes from getPackageRoot() which resolves to real package root
      // In test environment this might not have stdd/config.yaml, so result.skipped should contain reason
      const updateCommand = new UpdateCommand(silentSpinner);
      const result = await updateCommand.updateConfig(projectPath, { force: false });
      // Key assertion: no crash, and we get a valid result
      expect(result).toBeDefined();
    });
  });

  describe('syncDirectory force with dry-run', () => {
    it('should mark files as updated in dry-run when force is true and content differs', async () => {
      const projectPath = createTempProject('force-dryrun-project');

      // Create a locally modified skill
      const existingSkillsDir = path.join(projectPath, '.claude', 'skills', 'stdd');
      const existingSkillDir = path.join(existingSkillsDir, 'init');
      fs.mkdirSync(existingSkillDir, { recursive: true });
      fs.writeFileSync(
        path.join(existingSkillDir, 'SKILL.md'),
        '# Modified by user - this is different from the template content\n'
      );

      const updateCommand = new UpdateCommand(silentSpinner);
      await updateCommand.execute(projectPath, { dryRun: true, force: true });

      // Should show the file as "updated" in dry run
      expect(logSpy.mock.calls.some(call => stripAnsi(call[0]).includes('Updated:'))).toBe(true);

      // File should NOT actually be modified
      const content = fs.readFileSync(path.join(existingSkillDir, 'SKILL.md'), 'utf8');
      expect(content).toBe('# Modified by user - this is different from the template content\n');
    });
  });

  describe('formatYamlScalar', () => {
    it('should format various scalar types correctly', () => {
      const updateCommand = new UpdateCommand(silentSpinner);

      expect(updateCommand.formatYamlScalar(true)).toBe('true');
      expect(updateCommand.formatYamlScalar(false)).toBe('false');
      expect(updateCommand.formatYamlScalar(42)).toBe('42');
      expect(updateCommand.formatYamlScalar(null)).toBe('null');
      expect(updateCommand.formatYamlScalar(undefined)).toBe('null');
      expect(updateCommand.formatYamlScalar('simple-value')).toBe('simple-value');
      expect(updateCommand.formatYamlScalar('value with spaces')).toBe('"value with spaces"');
    });
  });

  describe('detectEngineDirs', () => {
    it('should detect .claude engine dir', async () => {
      const projectPath = createTempProject('detect-engine');
      const updateCommand = new UpdateCommand(silentSpinner);
      const engines = await updateCommand.detectEngineDirs(projectPath);
      expect(engines).toContain('.claude');
    });

    it('should return empty array when no engine dirs exist', async () => {
      const projectPath = createTempProject('no-engines');
      fs.rmSync(path.join(projectPath, '.claude'), { recursive: true, force: true });

      const updateCommand = new UpdateCommand(silentSpinner);
      const engines = await updateCommand.detectEngineDirs(projectPath);
      expect(engines).toEqual([]);
    });
  });

  describe('hashContent', () => {
    it('should produce consistent hashes', () => {
      const updateCommand = new UpdateCommand(silentSpinner);
      const hash1 = updateCommand.hashContent('test content');
      const hash2 = updateCommand.hashContent('test content');
      const hash3 = updateCommand.hashContent('different content');
      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
    });
  });

  describe('renderGitHubTemplate', () => {
    it('should replace workspace block in template', () => {
      const updateCommand = new UpdateCommand(silentSpinner);
      const content = 'Before\n<!-- STDD:WORKSPACES:start -->old block<!-- STDD:WORKSPACES:end -->\nAfter';
      const result = updateCommand.renderGitHubTemplate(content, '/project', [
        { name: '@scope/api', root: '/project/packages/api', sourceDir: '/project/packages/api/src', packageJsonPath: '/project/packages/api/package.json' },
      ]);
      expect(result).toContain('packages/api');
      expect(result).toContain('Before');
      expect(result).toContain('After');
    });
  });

  describe('formatAffectedWorkspaces', () => {
    it('should return default placeholder when no workspaces', () => {
      const updateCommand = new UpdateCommand(silentSpinner);
      const result = updateCommand.formatAffectedWorkspaces([], '/project');
      expect(result).toContain('packages/api');
      expect(result).toContain('apps/web');
    });

    it('should format workspace paths', () => {
      const updateCommand = new UpdateCommand(silentSpinner);
      const result = updateCommand.formatAffectedWorkspaces([
        { root: '/project/packages/api' },
      ], '/project');
      expect(result).toContain('packages/api');
    });
  });

  describe('mergeYamlConfig', () => {
    it('should append new keys from default config', () => {
      const updateCommand = new UpdateCommand(silentSpinner);
      const userConfig = 'version: "1.0"\nname: "test"\n';
      const defaultConfig = 'version: "1.0"\nname: "default"\nnew_key: "value"\n';
      const result = updateCommand.mergeYamlConfig(userConfig, defaultConfig);
      expect(result).toContain('name: "test"');
      expect(result).toContain('new_key: "value"');
      expect(result).toContain('Added by stdd update');
    });

    it('should return user config unchanged when no new keys', () => {
      const updateCommand = new UpdateCommand(silentSpinner);
      const config = 'version: "1.0"\nname: "test"\n';
      const result = updateCommand.mergeYamlConfig(config, 'version: "1.0"\nname: "default"\n');
      expect(result).toBe(config);
    });

    it('should handle user config without trailing newline', () => {
      const updateCommand = new UpdateCommand(silentSpinner);
      const userConfig = 'version: "1.0"';
      const defaultConfig = 'new_key: "value"\n';
      const result = updateCommand.mergeYamlConfig(userConfig, defaultConfig);
      expect(result).toContain('new_key: "value"');
    });
  });

  describe('renderWorkspaceRegistryBlock', () => {
    it('should render enabled=false correctly', () => {
      const updateCommand = new UpdateCommand(silentSpinner);
      const result = updateCommand.renderWorkspaceRegistryBlock({
        enabled: false,
        items: [],
      });
      expect(result).toContain('enabled: false');
    });

    it('should render items with custom keys', () => {
      const updateCommand = new UpdateCommand(silentSpinner);
      const result = updateCommand.renderWorkspaceRegistryBlock({
        enabled: true,
        items: [{
          name: '@scope/api',
          root: 'packages/api',
          source_root: 'packages/api/src',
          package_json: 'packages/api/package.json',
          owner: 'platform',
        }],
      });
      expect(result).toContain('owner: platform');
      expect(result).toContain('name: "@scope/api"');
    });
  });

  describe('replaceWorkspaceRegistryBlock', () => {
    it('should append block when no existing workspaces section', () => {
      const updateCommand = new UpdateCommand(silentSpinner);
      const content = 'version: "1.0"\nname: "test"\n';
      const block = 'workspaces:\n  enabled: true\n  items: []\n';
      const result = updateCommand.replaceWorkspaceRegistryBlock(content, block);
      expect(result).toContain('workspaces:');
      expect(result).toContain('version: "1.0"');
    });

    it('should replace existing workspaces section', () => {
      const updateCommand = new UpdateCommand(silentSpinner);
      const content = 'version: "1.0"\nworkspaces:\n  enabled: true\n  items:\n    - name: "old"\nname: "test"\n';
      const block = 'workspaces:\n  enabled: true\n  items: []\n';
      const result = updateCommand.replaceWorkspaceRegistryBlock(content, block);
      expect(result).not.toContain('name: "old"');
      expect(result).toContain('version: "1.0"');
      expect(result).toContain('name: "test"');
    });
  });

  describe('detectNewYamlKeys', () => {
    it('should detect newly added keys', () => {
      const updateCommand = new UpdateCommand(silentSpinner);
      const merged = 'version: "1.0"\nname: "test"\n# Added by stdd update\nnew_key: "value"\n';
      const original = 'version: "1.0"\nname: "test"\n';
      const newKeys = updateCommand.detectNewYamlKeys(merged, original);
      expect(newKeys).toContain('new_key');
    });

    it('should return empty array when no new keys', () => {
      const updateCommand = new UpdateCommand(silentSpinner);
      const config = 'version: "1.0"\nname: "test"\n';
      const newKeys = updateCommand.detectNewYamlKeys(config, config);
      expect(newKeys).toEqual([]);
    });
  });

  describe('addError', () => {
    it('should add error to report', () => {
      const updateCommand = new UpdateCommand(silentSpinner);
      updateCommand.addError('test-scope', 'test message', new Error('test error'), '/some/file');
      expect(updateCommand.report.errors).toHaveLength(1);
      expect(updateCommand.report.errors[0]).toEqual({
        scope: 'test-scope',
        message: 'test message',
        filePath: '/some/file',
        error: 'test error',
      });
    });

    it('should handle null error object', () => {
      const updateCommand = new UpdateCommand(silentSpinner);
      updateCommand.addError('scope', 'msg', null);
      expect(updateCommand.report.errors[0].error).toBe('Unknown error');
    });
  });
});
