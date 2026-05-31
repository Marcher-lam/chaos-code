const fs = require('fs');
const path = require('path');
const { resolveChangeDir } = require('../../utils/change-utils');
const { walkFiles } = require('../../utils/file-walker');
const { parseBddScenarios } = require('../../utils/bdd-scenario-parser');

class UserTestCommand {
  constructor(cwd = process.cwd()) { this.cwd = cwd; }

  execute(changeName, options = {}) {
    const changeDir = changeName ? resolveChangeDir(path.join(this.cwd, 'stdd'), changeName) : null;
    const base = changeName ? path.join(changeDir || '', 'specs') : path.join(this.cwd, 'stdd', 'specs');
    if (!fs.existsSync(base)) throw new Error(`Spec directory not found: ${path.relative(this.cwd, base)}`);
    const scenarios = this.extractScenarios(walkFiles(base, { extensions: ['.feature', '.md'], skipDirs: new Set() }), this.cwd);
    const outputDir = changeName ? changeDir : path.join(this.cwd, 'stdd');
    const outputs = [];

    if (!options.agentOnly) outputs.push(this.writeHuman(outputDir, scenarios));
    if (!options.humanOnly) outputs.push(this.writeAgent(outputDir, scenarios));

    if (options.framework) {
      outputs.push(this.writeFrameworkSkeleton(outputDir, scenarios, options.framework));
    }

    if (options.json) {
      console.log(JSON.stringify({ scenarios: scenarios.length, outputs }, null, 2));
    } else {
      console.log(`Generated user test scripts: ${outputs.map(file => path.relative(this.cwd, file)).join(', ')}`);
    }
    return { scenarios, outputs };
  }

  extractScenarios(files, cwd) {
    return parseBddScenarios(files, cwd);
  }

  writeHuman(dir, scenarios) {
    const file = path.join(dir, 'user-test-human.md');
    const lines = ['# Human User Test Script', '', 'Use think-aloud protocol. Record blockers, confusion, and time on task.', ''];
    for (const scenario of scenarios) {
      lines.push(`## ${scenario.name}`, '', `Source: ${scenario.source}`, '', 'Steps:');
      scenario.steps.forEach((step, index) => lines.push(`${index + 1}. ${step}`));
      lines.push('', 'Expected outcome:', '- User can complete the scenario without assistance.', '');
    }
    fs.writeFileSync(file, lines.join('\n'), 'utf8');
    return file;
  }

  writeAgent(dir, scenarios) {
    const file = path.join(dir, 'user-test-agent.json');
    const data = { generatedAt: new Date().toISOString(), scenarios: scenarios.map(s => ({ ...s, mode: 'agent', captureScreenshots: true })) };
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    return file;
  }

  writeFrameworkSkeleton(dir, scenarios, framework) {
    const fw = String(framework).toLowerCase();
    if (fw === 'react') {
      const file = path.join(dir, 'user-test-react.test.jsx');
      const lines = [
        "import React from 'react';",
        "import { render, screen, fireEvent } from '@testing-library/react';",
        "import '@testing-library/jest-dom';",
        "// TODO: Import your components",
        "",
        "describe('BDD User Test Scenarios (React)', () => {"
      ];

      for (const scenario of scenarios) {
        lines.push(
          `  test('Scenario: ${scenario.name.replace(/'/g, "\\'")}', async () => {`,
          `    // Source: ${scenario.source}`,
          `    // Steps:`
        );
        scenario.steps.forEach(step => {
          lines.push(`    // - ${step}`);
        });
        lines.push(
          "",
          "    // TODO: Render component and implement test steps",
          "    // render(<YourComponent />);",
          "    // expect(screen.getByText(/text/i)).toBeInTheDocument();",
          "  });",
          ""
        );
      }
      lines.push("});");
      fs.writeFileSync(file, lines.join('\n'), 'utf8');
      return file;
    } else if (fw === 'vue') {
      const file = path.join(dir, 'user-test-vue.spec.js');
      const lines = [
        "import { mount } from '@vue/test-utils';",
        "// TODO: Import your components",
        "",
        "describe('BDD User Test Scenarios (Vue)', () => {"
      ];

      for (const scenario of scenarios) {
        lines.push(
          `  test('Scenario: ${scenario.name.replace(/'/g, "\\'")}', async () => {`,
          `    // Source: ${scenario.source}`,
          `    // Steps:`
        );
        scenario.steps.forEach(step => {
          lines.push(`    // - ${step}`);
        });
        lines.push(
          "",
          "    // TODO: Mount component and implement test steps",
          "    // const wrapper = mount(YourComponent);",
          "    // expect(wrapper.text()).toContain('text');",
          "  });",
          ""
        );
      }
      lines.push("});");
      fs.writeFileSync(file, lines.join('\n'), 'utf8');
      return file;
    } else {
      // Default to Playwright E2E vanilla JS
      const file = path.join(dir, 'user-test-e2e.spec.js');
      const lines = [
        "const { test, expect } = require('@playwright/test');",
        "",
        "test.describe('BDD User Test Scenarios (Playwright E2E)', () => {"
      ];

      for (const scenario of scenarios) {
        lines.push(
          `  test('Scenario: ${scenario.name.replace(/'/g, "\\'")}', async ({ page }) => {`,
          `    // Source: ${scenario.source}`,
          `    // Steps:`
        );
        scenario.steps.forEach(step => {
          lines.push(`    // - ${step}`);
        });
        lines.push(
          "",
          "    // TODO: Navigate and implement interactions",
          "    // await page.goto('http://localhost:3000');",
          "    // await expect(page.locator('text=value')).toBeVisible();",
          "  });",
          ""
        );
      }
      lines.push("});");
      fs.writeFileSync(file, lines.join('\n'), 'utf8');
      return file;
    }
  }
}

module.exports = { UserTestCommand };
