const fs = require('fs');
const path = require('path');
const { VisualRegression } = require('../src/utils/visual-regression');

describe('VisualRegression', () => {
  const tempDir = path.join(__dirname, 'temp-visual-tests');
  const baselineFile = path.join(tempDir, 'baseline.png');
  const currentFile = path.join(tempDir, 'current.png');
  const diffFile = path.join(tempDir, 'diff.png');

  beforeAll(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(baselineFile)) fs.unlinkSync(baselineFile);
    if (fs.existsSync(currentFile)) fs.unlinkSync(currentFile);
    if (fs.existsSync(diffFile)) fs.unlinkSync(diffFile);
    if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
  });

  it('throws error if baseline file does not exist', () => {
    const vr = new VisualRegression(__dirname);
    expect(() => {
      vr.compare('nonexistent-baseline.png', 'nonexistent-current.png');
    }).toThrow(/Baseline image does not exist/);
  });

  it('throws error if current file does not exist', () => {
    const vr = new VisualRegression(__dirname);
    fs.writeFileSync(baselineFile, Buffer.from('baseline-png-mock-data'));
    
    expect(() => {
      vr.compare(baselineFile, 'nonexistent-current.png');
    }).toThrow(/Current image does not exist/);
    
    fs.unlinkSync(baselineFile);
  });

  it('performs byte correlation comparison fallback correctly', () => {
    const vr = new VisualRegression(__dirname);
    
    // Create standard mock PNG files
    const baselineData = Buffer.alloc(100);
    baselineData.write('PNG_HEADER', 0);
    // Write fake width & height
    baselineData.writeUInt32BE(1280, 16);
    baselineData.writeUInt32BE(800, 20);
    
    const currentData = Buffer.alloc(100);
    currentData.write('PNG_HEADER', 0);
    currentData.writeUInt32BE(1280, 16);
    currentData.writeUInt32BE(800, 20);

    // Make them slightly different
    baselineData.write('A', 50);
    currentData.write('B', 50);

    fs.writeFileSync(baselineFile, baselineData);
    fs.writeFileSync(currentFile, currentData);

    const result = vr.compare(baselineFile, currentFile, {
      threshold: 0.05
    });

    expect(result.status).toBe('pass'); // diff ratio is 1/100 (1%) which is <= 5%
    expect(result.diffRatio).toBe(0.01);
    expect(result.engine).toBe('fallback');
    expect(result.width).toBe(1280);
    expect(result.height).toBe(800);
  });

  it('handles visual mismatch under fallback correctly', () => {
    const vr = new VisualRegression(__dirname);
    
    const baselineData = Buffer.alloc(100);
    baselineData.writeUInt32BE(1280, 16);
    baselineData.writeUInt32BE(800, 20);
    
    const currentData = Buffer.alloc(100);
    currentData.writeUInt32BE(1280, 16);
    currentData.writeUInt32BE(800, 20);

    // Mismatch 20 bytes
    for (let i = 40; i < 60; i++) {
      baselineData[i] = 1;
      currentData[i] = 2;
    }

    fs.writeFileSync(baselineFile, baselineData);
    fs.writeFileSync(currentFile, currentData);

    const result = vr.compare(baselineFile, currentFile, {
      threshold: 0.05 // 5% limit, but diff is 20%
    });

    expect(result.status).toBe('fail');
    expect(result.diffRatio).toBe(0.20);
  });
});
