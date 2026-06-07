const fs = require('fs');
const path = require('path');
const { createLogger } = require('./logger');
const log = createLogger('VisualRegression');

class VisualRegression {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
  }

  /**
   * Compare two PNG screenshots.
   * Uses pngjs + pixelmatch if available, otherwise falls back to a robust byte correlation comparison.
   * 
   * @param {string} baselinePath - Path to baseline image
   * @param {string} currentPath - Path to current image
   * @param {Object} options - { diffPath, threshold }
   * @returns {Object} comparison result
   */
  compare(baselinePath, currentPath, options = {}) {
    const threshold = options.threshold !== undefined ? options.threshold : 0.01; // default 1% tolerance
    const diffPath = options.diffPath || path.join(path.dirname(currentPath), 'visual-diff.png');

    if (!fs.existsSync(baselinePath)) {
      throw new Error(`Baseline image does not exist: ${baselinePath}`);
    }
    if (!fs.existsSync(currentPath)) {
      throw new Error(`Current image does not exist: ${currentPath}`);
    }

    const baselineBuf = fs.readFileSync(baselinePath);
    const currentBuf = fs.readFileSync(currentPath);

    // Read width & height from PNG IHDR chunk (standard offsets in PNG format)
    let width = 0;
    let height = 0;
    let currentWidth = 0;
    let currentHeight = 0;
    try {
      width = baselineBuf.readUInt32BE(16);
      height = baselineBuf.readUInt32BE(20);
      currentWidth = currentBuf.readUInt32BE(16);
      currentHeight = currentBuf.readUInt32BE(20);
    } catch (e) {
      log.warn(`Failed to parse PNG dimensions: ${e.message}`);
    }

    if (width && height && currentWidth && currentHeight && (width !== currentWidth || height !== currentHeight)) {
      return {
        status: 'fail',
        diffRatio: 1,
        threshold,
        width,
        height,
        currentWidth,
        currentHeight,
        diffPath: null,
        engine: 'dimension-check',
        message: `Image dimensions differ: baseline ${width}x${height}, current ${currentWidth}x${currentHeight}`
      };
    }

    // Try to require optional dependencies pngjs and pixelmatch
    let PNG, pixelmatch;
    try {
      PNG = require('pngjs').PNG;
      pixelmatch = require('pixelmatch');
    } catch (e) {
      // Lazy-load failed, fall back to byte-level correlation
    }

    if (PNG && pixelmatch) {
      try {
        const img1 = PNG.sync.read(baselineBuf);
        const img2 = PNG.sync.read(currentBuf);
        const diffImg = new PNG({ width: img1.width, height: img1.height });

        const numDiffPixels = pixelmatch(
          img1.data,
          img2.data,
          diffImg.data,
          img1.width,
          img1.height,
          { threshold: 0.1 }
        );

        const totalPixels = img1.width * img1.height;
        const diffRatio = numDiffPixels / totalPixels;

        fs.writeFileSync(diffPath, PNG.sync.write(diffImg));

        return {
          status: diffRatio <= threshold ? 'pass' : 'fail',
          diffRatio,
          threshold,
          width: img1.width,
          height: img1.height,
          diffPath: path.relative(this.cwd, diffPath),
          engine: 'pixelmatch',
          message: `Matched using pixelmatch. Diff: ${(diffRatio * 100).toFixed(2)}%`
        };
      } catch (err) {
        log.warn(`Pixelmatch error: ${err.message}. Falling back to byte-level comparison.`);
      }
    }

    // Zero-dependency byte-level fallback
    log.info("Using byte-level correlation visual regression fallback.");
    let diffCount = 0;
    const minLen = Math.min(baselineBuf.length, currentBuf.length);
    const maxLen = Math.max(baselineBuf.length, currentBuf.length);

    for (let i = 0; i < minLen; i++) {
      if (baselineBuf[i] !== currentBuf[i]) {
        diffCount++;
      }
    }
    diffCount += (maxLen - minLen);
    const diffRatio = diffCount / maxLen;

    return {
      status: diffRatio <= threshold ? 'pass' : 'fail',
      diffRatio,
      threshold,
      width: width || 1280,
      height: height || 800,
      diffPath: null,
      engine: 'fallback',
      message: `Matched using byte correlation fallback. Run 'npm install pngjs pixelmatch' for visual diff images. Diff: ${(diffRatio * 100).toFixed(2)}%`
    };
  }
}

module.exports = { VisualRegression };
