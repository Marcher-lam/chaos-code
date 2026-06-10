const path = require('path');
const fs = require('fs');
const _os = require('os');

describe('path-resolver', () => {
  describe('getPackageRoot (normal path)', () => {
    const { getPackageRoot } = require('../src/utils/path-resolver');

    test('returns a valid directory from the real project', () => {
      const root = getPackageRoot();
      expect(root).toBeDefined();
      expect(fs.existsSync(root)).toBe(true);
      const pkgPath = path.join(root, 'package.json');
      expect(fs.existsSync(pkgPath)).toBe(true);
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      expect(['stdd-copilot-ultra', '@marcher-lam/stdd-copilot-ultra', '@marcher-lam/stdd-copilot', 'chaos-code', '@marcher-lam/chaos-code']).toContain(pkg.name);
    });

    test('returned root contains package.json with correct name', () => {
      const root = getPackageRoot();
      const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
      expect(pkg.name === 'stdd-copilot-ultra' || pkg.name === '@marcher-lam/stdd-copilot-ultra' || pkg.name === '@marcher-lam/stdd-copilot' || pkg.name === 'chaos-code' || pkg.name === '@marcher-lam/chaos-code').toBe(true);
    });
  });

  describe('getPackageRoot fallback path (line 24)', () => {
    test('returns fallback when no matching package.json found via mocked fs', () => {
      jest.isolateModules(() => {
        // Mock fs so that existsSync always returns false,
        // forcing the while loop to exhaust and hit the fallback return
        const mockFs = {
          existsSync: jest.fn().mockReturnValue(false),
          readFileSync: jest.fn(),
        };
        jest.doMock('fs', () => mockFs);

        const { getPackageRoot } = require('../src/utils/path-resolver');
        const result = getPackageRoot();

        // Should hit the fallback: path.join(__dirname, '..', '..', '..')
        const expected = path.join(
          require('path').resolve(__dirname, '..', 'src', 'utils'),
          '..', '..', '..'
        );
        expect(result).toBe(expected);
      });
    });

    test('skips package.json with wrong name and hits fallback', () => {
      jest.isolateModules(() => {
        // existsSync returns true, readFileSync returns JSON with wrong name
        const mockFs = {
          existsSync: jest.fn().mockReturnValue(true),
          readFileSync: jest.fn().mockReturnValue(JSON.stringify({ name: 'wrong-name' })),
        };
        jest.doMock('fs', () => mockFs);

        const { getPackageRoot } = require('../src/utils/path-resolver');
        const result = getPackageRoot();

        // Should hit the fallback because no package.json matches
        const pathModule = require('path');
        const expected = pathModule.join(
          pathModule.resolve(__dirname, '..', 'src', 'utils'),
          '..', '..', '..'
        );
        expect(result).toBe(expected);
      });
    });

    test('handles malformed package.json gracefully and hits fallback', () => {
      jest.isolateModules(() => {
        const mockFs = {
          existsSync: jest.fn().mockReturnValue(true),
          readFileSync: jest.fn().mockReturnValue('invalid json {{{'),
        };
        jest.doMock('fs', () => mockFs);

        const { getPackageRoot } = require('../src/utils/path-resolver');
        const result = getPackageRoot();

        // Should hit the fallback because JSON.parse fails and no match occurs
        const pathModule = require('path');
        const expected = pathModule.join(
          pathModule.resolve(__dirname, '..', 'src', 'utils'),
          '..', '..', '..'
        );
        expect(result).toBe(expected);
      });
    });
  });
});
