const path = require('path');
const fs = require('fs');

/**
 * 智能向上追溯寻找真实包根目录 (防 NPM Global 路径扁平化漂移)
 */
function getPackageRoot() {
  let currentDir = __dirname;
  while (currentDir !== path.parse(currentDir).root) {
    const pkgPath = path.join(currentDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.name === 'stdd-copilot-ultra' || pkg.name === '@marcher-lam/stdd-copilot-ultra' || pkg.name === '@marcher-lam/stdd-copilot' || pkg.name === 'chaos-code' || pkg.name === '@marcher-lam/chaos-code') {
          return currentDir; // 精准命中
        }
      } catch (e) {
        // Ignore read errors
      }
    }
    currentDir = path.join(currentDir, '..');
  }
  // 极端情况兜底机制 (按传统物理层级退退退)
  return path.join(__dirname, '..', '..', '..');
}

module.exports = { getPackageRoot };
