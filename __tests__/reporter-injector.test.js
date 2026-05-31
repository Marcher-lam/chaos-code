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

    it('returns original command when framework is detected but reporter file missing', () => {
      // Cover line 71: _resolveReporter returns null (framework detected but no reporter)
      const projectPath = createTempProject('framework-no-reporter', {
        packageJson: { devDependencies: { vitest: '^1.0.0' } },
      });
      // Mock existsSync so that neither local nor bundled reporter is found
      const origExistsSync = fs.existsSync;
      const origCwd = process.cwd;
      process.cwd = () => projectPath;
      fs.existsSync = (p) => {
        // Allow detection of pyproject.toml etc. to proceed
        if (typeof p === 'string' && p.includes('reporters')) return false;
        return origExistsSync.call(fs, p);
      };
      try {
        const { command, env } = injectReporter('npx vitest run', projectPath);
        expect(command).toBe('npx vitest run');
        expect(env).toBeUndefined();
      } finally {
        fs.existsSync = origExistsSync;
        process.cwd = origCwd;
      }
    });

    it('returns original command for unrecognized framework via dependency injection (line 93)', () => {
      // Cover line 93: the final fallback return in injectReporter.
      // injectReporter accepts an optional _deps parameter for testing,
      // allowing us to inject a custom _detectFramework that returns 'mocha'.
      const _deps = {
        _detectFramework: () => 'mocha',
        _resolveReporter: () => '/fake/reporter.js',
      };
      const { command, env } = injectReporter('npm test', '/tmp', _deps);
      expect(command).toBe('npm test');
      expect(env).toBeUndefined();
    });
  });

  describe('error paths in _readPackageJson', () => {
    it('handles non-ENOENT/EACCES read errors gracefully', () => {
      // Cover line 16 in _readPackageJson: console.error for non-ENOENT/EACCES
      const origReadFileSync = fs.readFileSync;
      const pkgPath = path.join(os.tmpdir(), 'stdd-error-pkg');
      fs.mkdirSync(pkgPath, { recursive: true });
      fs.writeFileSync(path.join(pkgPath, 'package.json'), 'valid');

      // Make readFileSync throw a permission error (EISDIR or similar) for package.json
      fs.readFileSync = (filePath, encoding) => {
        if (filePath.includes('package.json')) {
          const err = new Error('Permission denied: unexpected error');
          err.code = 'EPERM';
          throw err;
        }
        return origReadFileSync.call(fs, filePath, encoding);
      };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // _detectFramework internally calls _readPackageJson
      const result = _detectFramework(pkgPath);
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Permission denied'));

      consoleSpy.mockRestore();
      fs.readFileSync = origReadFileSync;
      fs.rmSync(pkgPath, { recursive: true, force: true });
    });

    it('handles EACCES error silently', () => {
      const origReadFileSync = fs.readFileSync;
      const pkgPath = path.join(os.tmpdir(), 'stdd-eacces-pkg');
      fs.mkdirSync(pkgPath, { recursive: true });
      fs.writeFileSync(path.join(pkgPath, 'package.json'), '{}');

      fs.readFileSync = (filePath, encoding) => {
        if (filePath.includes('package.json')) {
          const err = new Error('Access denied');
          err.code = 'EACCES';
          throw err;
        }
        return origReadFileSync.call(fs, filePath, encoding);
      };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = _detectFramework(pkgPath);
      expect(result).toBeNull();
      // EACCES should NOT trigger console.error (only non-ENOENT/EACCES)
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
      fs.readFileSync = origReadFileSync;
      fs.rmSync(pkgPath, { recursive: true, force: true });
    });
  });

  describe('error paths in _detectFramework python file reading', () => {
    it('handles non-ENOENT/EACCES errors when reading python config files', () => {
      // Cover line 43: error reading pyproject.toml with non-ENOENT/EACCES code
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-pytest-err-'));
      fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
      fs.writeFileSync(path.join(tmpDir, 'pyproject.toml'), '[tool.pytest]\n');

      const origReadFileSync = fs.readFileSync;
      const _origExistsSync = fs.existsSync;

      // Override readFileSync to throw for pyproject.toml
      fs.readFileSync = (filePath, encoding) => {
        if (filePath.includes('pyproject.toml')) {
          const err = new Error('Read error on pyproject');
          err.code = 'EIO';
          throw err;
        }
        return origReadFileSync.call(fs, filePath, encoding);
      };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const _result = _detectFramework(tmpDir);
      // Should still work: returns null since the file can't be read for pytest content
      // But console.error is called for non-ENOENT/EACCES error
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Read error on pyproject'));

      consoleSpy.mockRestore();
      fs.readFileSync = origReadFileSync;
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('silently handles ENOENT error when reading python config files', () => {
      // Cover line 43 false branch: ENOENT error is silently caught
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-pytest-enoent-'));
      fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
      fs.writeFileSync(path.join(tmpDir, 'pyproject.toml'), '[tool.pytest]\n');

      const origReadFileSync = fs.readFileSync;

      // Make readFileSync throw ENOENT for pyproject.toml (even though existsSync said it exists)
      fs.readFileSync = (filePath, encoding) => {
        if (filePath.includes('pyproject.toml')) {
          const err = new Error('ENOENT: no such file');
          err.code = 'ENOENT';
          throw err;
        }
        return origReadFileSync.call(fs, filePath, encoding);
      };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Should return null since pyproject.toml content couldn't be read
      // And should NOT call console.error for ENOENT
      const result = _detectFramework(tmpDir);
      expect(result).toBeNull();
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
      fs.readFileSync = origReadFileSync;
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('skips file that does not contain pytest and continues to next', () => {
      // Cover line 41 false branch: file exists but does not contain 'pytest'
      // Loop continues to next file
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-no-pytest-'));
      fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
      // pyproject.toml exists but no pytest mention -> loop continues to requirements.txt
      fs.writeFileSync(path.join(tmpDir, 'pyproject.toml'), '[build-system]\n');
      // requirements.txt has pytest -> returns 'pytest'
      fs.writeFileSync(path.join(tmpDir, 'requirements.txt'), 'pytest>=7.0\n');

      const result = _detectFramework(tmpDir);
      expect(result).toBe('pytest');

      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('skips all files when none contain pytest', () => {
      // Cover line 41 false branch for all files, then returns null
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-no-pytest-at-all-'));
      fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
      fs.writeFileSync(path.join(tmpDir, 'pyproject.toml'), '[build-system]\n');
      fs.writeFileSync(path.join(tmpDir, 'requirements.txt'), 'requests\nflask\n');

      const result = _detectFramework(tmpDir);
      expect(result).toBeNull();

      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('detects pytest from setup.py', () => {
      // Cover the setup.py branch in the loop
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-setup-py-'));
      fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
      // No pyproject.toml or requirements.txt, but setup.py mentions pytest
      fs.writeFileSync(path.join(tmpDir, 'setup.py'), 'install_requires=["pytest"]\n');

      const result = _detectFramework(tmpDir);
      expect(result).toBe('pytest');

      fs.rmSync(tmpDir, { recursive: true, force: true });
    });
  });

  describe('_resolveReporter bundled path fallback', () => {
    it('returns null when neither local nor bundled reporter exists (lines 58-60)', () => {
      // Cover lines 58-60: localPath doesn't exist, bundledPath doesn't exist either
      // We need to test this without mocking fs.existsSync because Istanbul tracks
      // branches at instrumentation time. Instead, temporarily rename the bundled reporter.
      const origCwd = process.cwd;
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-resolve-nobundled-'));
      process.cwd = () => tmpDir;

      // Temporarily rename the bundled vitest.js reporter
      const { STDD_REPORTERS } = require('../src/utils/reporter-injector');
      const bundledPath = path.join(STDD_REPORTERS, 'vitest.js');
      const backupPath = bundledPath + '.bak';
      const hasBundled = fs.existsSync(bundledPath);
      if (hasBundled) fs.renameSync(bundledPath, backupPath);

      try {
        const result = _resolveReporter('vitest');
        expect(result).toBeNull();
      } finally {
        if (hasBundled) fs.renameSync(backupPath, bundledPath);
        process.cwd = origCwd;
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('returns bundled reporter path when local does not exist (line 59 true branch)', () => {
      // Cover line 59 true branch: localPath does not exist but bundledPath does
      const origCwd = process.cwd;
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-resolve-bundled-'));
      process.cwd = () => tmpDir;

      try {
        const result = _resolveReporter('vitest');
        // localPath = tmpDir/stdd/reporters/vitest.js -> doesn't exist
        // bundledPath = STDD_REPORTERS/vitest.js -> exists (in the project)
        expect(result).toBeTruthy();
        expect(result).toMatch(/stdd\/reporters\/vitest\.js$/);
      } finally {
        process.cwd = origCwd;
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('returns local reporter path when local exists (line 57)', () => {
      // Cover line 57: localPath exists, return early (don't check bundled)
      const origCwd = process.cwd;
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-resolve-local-'));
      const reporterDir = path.join(tmpDir, 'stdd', 'reporters');
      fs.mkdirSync(reporterDir, { recursive: true });
      fs.writeFileSync(path.join(reporterDir, 'vitest.js'), '// local reporter');
      process.cwd = () => tmpDir;

      try {
        const result = _resolveReporter('vitest');
        expect(result).toBe(path.join(reporterDir, 'vitest.js'));
      } finally {
        process.cwd = origCwd;
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

  describe('pytest PYTHONPATH handling', () => {
    it('sets PYTHONPATH to reporter dir when PYTHONPATH is not set (line 81)', () => {
      // Cover line 81 false branch: process.env.PYTHONPATH is falsy
      const projectPath = createTempProject('pytest-no-pypath', { pyproject: true });
      const origEnv = process.env.PYTHONPATH;
      delete process.env.PYTHONPATH;
      try {
        const { env } = injectReporter('pytest', projectPath);
        expect(env.PYTHONPATH).toBeDefined();
        expect(env.PYTHONPATH).toContain('reporters');
        // Should NOT contain a delimiter since there's no existing PYTHONPATH
        expect(env.PYTHONPATH).not.toContain(path.delimiter);
      } finally {
        if (origEnv !== undefined) {
          process.env.PYTHONPATH = origEnv;
        }
      }
    });
  });
});
