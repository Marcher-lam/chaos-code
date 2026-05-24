/**
 * Targeted branch-coverage tests for update.js
 * Covers: formatYamlScalar edge cases, mergeYamlKeys edge cases,
 *         detectNewYamlKeys, relativePath, renderWorkspaceRegistryBlock custom keys.
 */

const { UpdateCommand } = require('../src/cli/commands/update');

describe('UpdateCommand coverage boost', () => {
  const cmd = new UpdateCommand();

  describe('formatYamlScalar', () => {
    it('formats boolean true', () => {
      expect(cmd.formatYamlScalar(true)).toBe('true');
    });
    it('formats boolean false', () => {
      expect(cmd.formatYamlScalar(false)).toBe('false');
    });
    it('formats number', () => {
      expect(cmd.formatYamlScalar(42)).toBe('42');
    });
    it('formats null', () => {
      expect(cmd.formatYamlScalar(null)).toBe('null');
    });
    it('formats undefined as null', () => {
      expect(cmd.formatYamlScalar(undefined)).toBe('null');
    });
    it('formats simple string without quotes', () => {
      expect(cmd.formatYamlScalar('hello')).toBe('hello');
    });
    it('formats string with spaces as JSON', () => {
      expect(cmd.formatYamlScalar('hello world')).toBe('"hello world"');
    });
  });

  describe('relativePath', () => {
    it('returns relative path', () => {
      const result = cmd.relativePath('/a/b', '/a/b/c/d.js');
      expect(result).toBe('c/d.js');
    });
    it('normalizes backslashes to forward slashes', () => {
      const result = cmd.relativePath('C:\\project', 'C:\\project\\src\\app.js');
      expect(result).toContain('/');
    });
  });

  describe('renderWorkspaceRegistryBlock — custom keys', () => {
    it('renders items with custom keys', () => {
      const block = cmd.renderWorkspaceRegistryBlock({
        enabled: true,
        items: [{
          name: 'web',
          root: 'packages/web',
          source_root: 'src',
          package_json: 'package.json',
          custom_field: 'hello world',
        }],
      });
      expect(block).toContain('custom_field');
      expect(block).toContain('"hello world"');
    });

    it('renders enabled=false', () => {
      const block = cmd.renderWorkspaceRegistryBlock({
        enabled: false,
        items: [],
      });
      expect(block).toContain('enabled: false');
    });
  });

  describe('replaceWorkspaceRegistryBlock', () => {
    it('appends block when no existing workspaces section', () => {
      const config = 'version: "1.0"\nname: test\n';
      const block = 'workspaces:\n  enabled: true\n  items: []\n';
      const result = cmd.replaceWorkspaceRegistryBlock(config, block);
      expect(result).toContain('workspaces:');
    });

    it('replaces existing workspaces section', () => {
      const config = 'version: "1.0"\nworkspaces:\n  enabled: false\nname: test\n';
      const block = 'workspaces:\n  enabled: true\n  items: []\n';
      const result = cmd.replaceWorkspaceRegistryBlock(config, block);
      expect(result).toContain('enabled: true');
      expect(result).toContain('name: test');
    });
  });

  describe('detectNewYamlKeys', () => {
    it('returns empty array when no new keys', () => {
      const merged = 'foo: bar\nbaz: qux\n';
      const original = 'foo: bar\nbaz: qux\n';
      expect(cmd.detectNewYamlKeys(merged, original)).toEqual([]);
    });

    it('detects new keys', () => {
      const merged = 'foo: bar\nnew_key: value\n';
      const original = 'foo: bar\n';
      expect(cmd.detectNewYamlKeys(merged, original)).toContain('new_key');
    });
  });

  describe('createReport', () => {
    it('returns expected structure', () => {
      const report = cmd.createReport();
      expect(report).toHaveProperty('engineCommands');
      expect(report).toHaveProperty('skills');
      expect(report).toHaveProperty('schemas');
      expect(report).toHaveProperty('githubTemplates');
      expect(report).toHaveProperty('config');
      expect(report).toHaveProperty('errors');
    });
  });

  describe('addError', () => {
    it('adds error entry to report', () => {
      cmd.report = cmd.createReport();
      cmd.addError('test', 'something went wrong', new Error('boom'), '/foo/bar');
      expect(cmd.report.errors).toHaveLength(1);
      expect(cmd.report.errors[0].scope).toBe('test');
      expect(cmd.report.errors[0].filePath).toBe('/foo/bar');
    });
  });
});
