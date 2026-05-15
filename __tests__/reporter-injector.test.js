const fs = require('fs');
const path = require('path');
const os = require('os');
const { injectReporter, _detectFramework, _resolveReporter } = require('../src/utils/reporter-injector');

describe('reporter-injector utility', () => {
  function createTempProject(name, options = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-reporter-test-'));
    const projectPath = path.join(root, name);
    fs.mkdirSync(projectPath, { recursive: true });

    if (options.packageJson) {
      fs.writeFileSync(
        path.join(projectPath, 'package.json'),
        JSON.stringify(options.packageJson)
      );
    }

    if (options.pyproject) {
      fs.writeFileSync(
        path.join(projectPath, 'pyproject.toml'),
        '[tool.pytest]\n'
      );
    }

    return projectPath;
  }

  describe('_detectFramework', () => {
    it('returns "vitest" when vitest is in devDependencies', () => {
      const projectPath = createTempProject('vitest-proj', {
        packageJson: { devDependencies: { vitest: '^1.0.0' } },
      });
      expect(_detectFramework(projectPath)).toBe('vitest');
    });

    it('returns "jest" when jest is in devDependencies', () => {
      const projectPath = createTempProject('jest-proj', {
        packageJson: { devDependencies: { jest: '^29.0.0' } },
      });
      expect(_detectFramework(projectPath)).toBe('jest');
    });

    it('returns "jest" when ts-jest is in dependencies', () => {
      const projectPath = createTempProject('ts-jest-proj', {
        packageJson: { dependencies: { 'ts-jest': '^29.0.0' } },
      });
      expect(_detectFramework(projectPath)).toBe('jest');
    });

    it('returns "pytest" when pyproject.toml mentions pytest', () => {
      const projectPath = createTempProject('pytest-proj', { pyproject: true });
      expect(_detectFramework(projectPath)).toBe('pytest');
    });

    it('returns null when no test framework is detected', () => {
      const projectPath = createTempProject('no-framework-proj', {});
      expect(_detectFramework(projectPath)).toBe(null);
    });
  });

  describe('_resolveReporter', () => {
    it('returns bundled vitest reporter path when local does not exist', () => {
      createTempProject('resolved-vitest', {
        packageJson: { devDependencies: { vitest: '^1.0.0' } },
      });
      const reporterPath = _resolveReporter('vitest');
      expect(reporterPath).toBeTruthy();
      expect(reporterPath).toMatch(/stdd\/reporters\/vitest\.js$/);
      expect(fs.existsSync(reporterPath)).toBe(true);
    });

    it('returns bundled jest reporter path when local does not exist', () => {
      createTempProject('resolved-jest', {
        packageJson: { devDependencies: { jest: '^29.0.0' } },
      });
      const reporterPath = _resolveReporter('jest');
      expect(reporterPath).toBeTruthy();
      expect(reporterPath).toMatch(/stdd\/reporters\/jest\.js$/);
      expect(fs.existsSync(reporterPath)).toBe(true);
    });

    it('returns bundled pytest plugin path when local does not exist', () => {
      createTempProject('resolved-pytest', { pyproject: true });
      const reporterPath = _resolveReporter('pytest');
      expect(reporterPath).toBeTruthy();
      expect(reporterPath).toMatch(/stdd\/reporters\/pytest_plugin\.py$/);
      expect(fs.existsSync(reporterPath)).toBe(true);
    });
  });

  describe('injectReporter', () => {
    it('injects vitest reporter into test command', () => {
      const projectPath = createTempProject('inject-vitest', {
        packageJson: { devDependencies: { vitest: '^1.0.0' } },
      });
      const { command, env } = injectReporter('npx vitest run', projectPath);
      expect(command).toContain('--reporter=');
      expect(command).toContain('vitest.js');
      expect(env).toBeUndefined();
    });

    it('injects jest reporter into test command', () => {
      const projectPath = createTempProject('inject-jest', {
        packageJson: { devDependencies: { jest: '^29.0.0' } },
      });
      const { command, env } = injectReporter('npx jest', projectPath);
      expect(command).toContain('--reporters=');
      expect(command).toContain('jest.js');
      expect(env).toBeUndefined();
    });

    it('injects pytest plugin via PYTHONPATH env', () => {
      const projectPath = createTempProject('inject-pytest', { pyproject: true });
      const { command, env } = injectReporter('pytest', projectPath);
      expect(command).toContain('-p pytest_plugin');
      expect(env).toBeDefined();
      expect(env.PYTHONPATH).toBeDefined();
      expect(env.PYTHONPATH).toContain('reporters');
    });

    it('returns original command when no framework detected', () => {
      const projectPath = createTempProject('no-framework', {});
      const { command, env } = injectReporter('npm test', projectPath);
      expect(command).toBe('npm test');
      expect(env).toBeUndefined();
    });

    it('returns original command when reporter file not found', () => {
      const projectPath = createTempProject('no-reporter', {
        packageJson: { devDependencies: { unknown_test: '^1.0.0' } },
      });
      const { command, env } = injectReporter('npm test', projectPath);
      expect(command).toBe('npm test');
      expect(env).toBeUndefined();
    });

    it('preserves environment variables for pytest PYTHONPATH', () => {
      const projectPath = createTempProject('pytest-env', { pyproject: true });
      const originalPath = '/some/other/path';
      const origEnv = process.env.PYTHONPATH;
      process.env.PYTHONPATH = originalPath;
      try {
        const { env } = injectReporter('pytest', projectPath);
        expect(env.PYTHONPATH).toContain(originalPath);
        expect(env.PYTHONPATH).toContain('reporters');
      } finally {
        if (origEnv === undefined) {
          delete process.env.PYTHONPATH;
        } else {
          process.env.PYTHONPATH = origEnv;
        }
      }
    });
  });
});
