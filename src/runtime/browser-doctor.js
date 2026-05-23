const fs = require('fs');
const { spawnSync } = require('child_process');
const { _detectPackageManager: detectPkgMgr } = require('../utils/test-command-resolver');

function detectPackageManager(cwd = process.cwd()) {
  return detectPkgMgr(cwd);
}

function installCommandFor(packageManager) {
  if (packageManager === 'pnpm') return 'pnpm add -D playwright';
  if (packageManager === 'yarn') return 'yarn add -D playwright';
  if (packageManager === 'bun') return 'bun add -d playwright';
  return 'npm install -D playwright';
}

class BrowserDoctor {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
  }

  check(options = {}) {
    const packageManager = detectPackageManager(this.cwd);
    const checks = [];
    const result = {
      status: 'pass',
      packageManager,
      checks,
      suggestions: [],
    };

    const packageCheck = this._checkPackage();
    checks.push(packageCheck);
    if (packageCheck.status !== 'pass') {
      result.status = 'fail';
      result.suggestions.push(installCommandFor(packageManager));
      result.suggestions.push('npx playwright install');
      return result;
    }

    const binaryCheck = this._checkBrowserBinary();
    checks.push(binaryCheck);
    if (binaryCheck.status !== 'pass') {
      result.status = 'fail';
      result.suggestions.push('npx playwright install');
      return result;
    }

    if (options.launch !== false) {
      const launchCheck = this._checkLaunch();
      checks.push(launchCheck);
      if (launchCheck.status !== 'pass') {
        result.status = 'fail';
        result.suggestions.push('npx playwright install --with-deps');
      }
    }

    return result;
  }

  _checkPackage() {
    try {
      require.resolve('playwright', { paths: [this.cwd, process.cwd()] });
      return { name: 'playwright package', status: 'pass' };
    } catch (error) {
      return {
        name: 'playwright package',
        status: 'fail',
        message: 'Playwright package is not installed.',
      };
    }
  }

  _loadPlaywright() {
    const resolved = require.resolve('playwright', { paths: [this.cwd, process.cwd()] });
    return require(resolved);
  }

  _checkBrowserBinary() {
    try {
      const playwright = this._loadPlaywright();
      if (!playwright.chromium || typeof playwright.chromium.executablePath !== 'function') {
        return { name: 'chromium binary', status: 'fail', message: 'Playwright chromium API is unavailable.' };
      }
      const executablePath = playwright.chromium.executablePath();
      if (!executablePath || !fs.existsSync(executablePath)) {
        return { name: 'chromium binary', status: 'fail', message: 'Chromium browser binary is not installed.' };
      }
      return { name: 'chromium binary', status: 'pass', path: executablePath };
    } catch (error) {
      return { name: 'chromium binary', status: 'fail', message: error.message };
    }
  }

  _checkLaunch() {
    const probe = spawnSync(process.execPath, ['-e', [
      "const p=require('playwright');",
      '(async()=>{',
      "const b=await p.chromium.launch({headless:true,args:['--no-sandbox']});",
      'await b.close();',
      '})().catch(e=>{console.error(e.message);});',
    ].join('')], {
      cwd: this.cwd,
      encoding: 'utf8',
      timeout: 15000,
    });

    if (probe.status === 0) return { name: 'headless launch', status: 'pass' };
    return {
      name: 'headless launch',
      status: 'fail',
      message: (probe.stderr || probe.stdout || 'Unable to launch Chromium.').trim(),
    };
  }
}

module.exports = { BrowserDoctor, detectPackageManager, installCommandFor };
