const fs = require('fs');
const path = require('path');
const os = require('os');
const { CssExtractor } = require('../src/utils/css-extractor');
const { DesignCommand } = require('../src/cli/commands/design');

function setup() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-extractor-'));
  return tmp;
}

describe('CssExtractor and Design Reverse-Scan', () => {
  let tmpDir;
  let extractor;

  beforeEach(() => {
    tmpDir = setup();
    extractor = new CssExtractor(tmpDir);
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  });

  it('should return default tokens when directory has no styles', () => {
    const tokens = extractor.extract(tmpDir);
    expect(tokens.colors.primary).toBe('#3B82F6');
    expect(tokens.colors.secondary).toBe('#6366F1');
    expect(tokens.fontFamily).toContain('Inter');
  });

  it('should extract tokens from CSS files correctly', () => {
    const cssContent = `
      :root {
        --color-primary: #10b981;
        --color-secondary: #f59e0b;
        --color-success: #059669;
        --color-warning: #d97706;
        --color-error: #dc2626;
        --font-family-base: "Roboto", sans-serif;
        --radius-sm: 2px;
        --radius-md: 6px;
        --spacing-xs: 2px;
        --spacing-md: 12px;
        --shadow-sm: 0 1px 1px rgba(0,0,0,0.05);
        --color-gray-50: #fafafa;
        --color-gray-100: #f5f5f5;
        --color-gray-200: #e5e5e5;
        --color-gray-300: #d4d4d4;
        --color-gray-400: #a3a3a3;
      }
    `;
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'global.css'), cssContent, 'utf8');

    const tokens = extractor.extract(tmpDir);
    expect(tokens.colors.primary).toBe('#10b981');
    expect(tokens.colors.secondary).toBe('#f59e0b');
    expect(tokens.colors.success).toBe('#059669');
    expect(tokens.colors.warning).toBe('#d97706');
    expect(tokens.colors.error).toBe('#dc2626');
    expect(tokens.fontFamily).toBe('Roboto, sans-serif');
    expect(tokens.borderRadius.sm).toBe('2px');
    expect(tokens.borderRadius.md).toBe('6px');
    expect(tokens.spacing.xs).toBe('2px');
    expect(tokens.spacing.md).toBe('12px');
    expect(tokens.shadows.sm).toBe('0 1px 1px rgba(0,0,0,0.05)');
    expect(tokens.colors.neutral).toEqual(['#fafafa', '#f5f5f5', '#e5e5e5', '#d4d4d4', '#a3a3a3']);
  });

  it('should extract tokens from Tailwind config correctly', () => {
    const tailwindContent = `
      module.exports = {
        theme: {
          extend: {
            colors: {
              primary: '#ef4444',
              secondary: '#10b981',
              success: '#84cc16',
              warning: '#eab308',
              error: '#f43f5e'
            },
            fontFamily: {
              sans: ['Outfit', 'sans-serif']
            },
            spacing: {
              'xs': '0.25rem',
              'md': '1rem'
            },
            borderRadius: {
              'md': '0.375rem'
            },
            boxShadow: {
              'md': '0 4px 6px -1px rgba(0,0,0,0.1)'
            }
          }
        }
      };
    `;
    fs.writeFileSync(path.join(tmpDir, 'tailwind.config.js'), tailwindContent, 'utf8');

    const tokens = extractor.extract(tmpDir);
    expect(tokens.colors.primary).toBe('#ef4444');
    expect(tokens.colors.secondary).toBe('#10b981');
    expect(tokens.colors.success).toBe('#84cc16');
    expect(tokens.colors.warning).toBe('#eab308');
    expect(tokens.colors.error).toBe('#f43f5e');
    expect(tokens.fontFamily).toBe('Outfit, sans-serif');
    expect(tokens.spacing.xs).toBe('0.25rem');
    expect(tokens.spacing.md).toBe('1rem');
    expect(tokens.borderRadius.md).toBe('0.375rem');
    expect(tokens.shadows.md).toBe('0 4px 6px -1px rgba(0,0,0,0.1)');
  });

  it('should execute reverse-scan command successfully', async () => {
    const cssContent = `
      :root {
        --color-primary: #8b5cf6;
        --color-secondary: #ec4899;
        --font-family-base: "Courier New", monospace;
      }
    `;
    fs.writeFileSync(path.join(tmpDir, 'app.css'), cssContent, 'utf8');

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const cmd = new DesignCommand(tmpDir);
    const result = await cmd.execute('reverse-scan', [], { json: false });

    expect(result.path).toBe(path.join(tmpDir, 'DESIGN.md'));
    expect(fs.existsSync(result.path)).toBe(true);

    const designMd = fs.readFileSync(result.path, 'utf8');
    expect(designMd).toContain('--color-primary` | `#8b5cf6`');
    expect(designMd).toContain('--color-secondary` | `#ec4899`');
    expect(designMd).toContain('--font-family-base: Courier New, monospace');

    // Previews should be written successfully
    expect(result.previews.length).toBe(2);
    expect(fs.existsSync(result.previews[0])).toBe(true);
    expect(fs.existsSync(result.previews[1])).toBe(true);

    logSpy.mockRestore();
  });
});
