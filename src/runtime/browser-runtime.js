const path = require('path');
const fs = require('fs');

class BrowserRuntime {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.playwright = null;
  }

  // Lazy load playwright to avoid errors if not installed
  getBrowser() {
    if (this.playwright) return this.playwright;
    try {
      this.playwright = require('playwright');
      return this.playwright;
    } catch (error) {
      throw new Error(
        'Playwright is not installed. Please run:\n' +
        '  npm install playwright\n' +
        '  npx playwright install'
      );
    }
  }

  async snapshot(url, options = {}) {
    const { width = 1280, height = 800 } = options;
    const outputDir = path.join(this.cwd, 'stdd', 'evidence');
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `snapshot-${path.basename(url)}-${timestamp}.png`;
    const filePath = path.join(outputDir, filename);

    console.log(`[BrowserRuntime] Capturing snapshot: ${url}`);

    const browser = await this.getBrowser().chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width, height } });

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
      await page.screenshot({ path: filePath, fullPage: false });
      console.log(`[BrowserRuntime] Snapshot saved to: ${filePath}`);
      return { success: true, path: filePath, relativePath: path.relative(this.cwd, filePath) };
    } catch (error) {
      console.error(`[BrowserRuntime] Error: ${error.message}`);
      return { success: false, error: error.message };
    } finally {
      await browser.close();
    }
  }

  async inspect(url, selector = 'body') {
    console.log(`[BrowserRuntime] Inspecting: ${url} (selector: ${selector})`);
    
    const browser = await this.getBrowser().chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
      
      // Extract text content, title, and URL
      const data = await page.evaluate((sel) => {
        /* global document, window */
        const element = document.querySelector(sel);
        return {
          title: document.title,
          url: window.location.href,
          text: element ? element.innerText.substring(0, 1000) : 'Selector not found',
          selectorFound: !!element
        };
      }, selector);

      console.log(`[BrowserRuntime] Page Title: ${data.title}`);
      return { success: true, data };
    } catch (error) {
      console.error(`[BrowserRuntime] Error: ${error.message}`);
      return { success: false, error: error.message };
    } finally {
      await browser.close();
    }
  }

  async executeScript(url, script) {
    console.log(`[BrowserRuntime] Executing script on: ${url}`);
    
    const browser = await this.getBrowser().chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
      const result = await page.evaluate(script);
      return { success: true, result };
    } catch (error) {
      console.error(`[BrowserRuntime] Error: ${error.message}`);
      return { success: false, error: error.message };
    } finally {
      await browser.close();
    }
  }
}

module.exports = { BrowserRuntime };
