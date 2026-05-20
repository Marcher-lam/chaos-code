/**
 * Final-Doc Command
 * Generate final aggregated requirement document
 */

const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const { createLogger } = require('../../utils/logger');
const logger = createLogger('final-doc');

class FinalDocCommand {
  constructor() {
    this.sections = [
      'proposal',
      'specs',
      'design',
      'tasks',
      'implementation',
      'verification',
      'metrics'
    ];
  }

  async execute(changeName, options = {}) {
    const changesDir = path.join(process.cwd(), 'stdd', 'changes');
    const changeDir = changeName
      ? path.join(changesDir, changeName)
      : await this.getActiveChangeDir(changesDir);

    if (!changeDir) {
      throw new Error('No active change found. Use `stdd new change <name>` first.');
    }

    const changeName2 = path.basename(changeDir);
    console.log('');
    console.log(chalk.bold('📄 Generating Final Requirement Document'));
    console.log(chalk.dim('═'.repeat(50)));
    console.log('');
    console.log(chalk.dim(`Change: ${changeName2}`));
    console.log('');

    const artifacts = await this.collectArtifacts(changeDir);
    const finalDoc = await this.generateDocument(changeName2, artifacts);

    if (options.dryRun) {
      console.log(chalk.yellow('Dry run - document not saved'));
      console.log('');
      console.log(finalDoc);
      return finalDoc;
    }

    const outputPath = options.output || path.join(changeDir, 'FINAL_REQUIREMENT.md');
    await fs.writeFile(outputPath, finalDoc);

    console.log(chalk.green(`✓ Final document generated: ${outputPath}`));
    console.log('');

    return { path: outputPath, content: finalDoc };
  }

  async getActiveChangeDir(changesDir) {
    try {
      const statusPath = path.join(process.cwd(), 'stdd', '.status.yaml');
      const statusExists = await this.fileExists(statusPath);

      if (statusExists) {
        const status = await fs.readFile(statusPath, 'utf-8');
        const match = status.match(/active_change:\s*(.+)/);
        if (match && match[1].trim() !== 'none') {
          const changeDir = path.join(changesDir, match[1].trim());
          const exists = await this.fileExists(changeDir);
          if (exists) return changeDir;
        }
      }

      const entries = await fs.readdir(changesDir, { withFileTypes: true });
      const dirs = entries.filter(e => e.isDirectory() && e.name !== 'archive');

      if (dirs.length === 1) {
        return path.join(changesDir, dirs[0].name);
      }

      return dirs.length > 0 ? path.join(changesDir, dirs[0].name) : null;
    } catch (err) {
      logger.warn(`Could not determine active change: ${err.message}`);
      return null;
    }
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async collectArtifacts(changeDir) {
    const artifacts = {};
    const specsDir = path.join(changeDir, 'specs');

    for (const section of this.sections) {
      switch (section) {
        case 'proposal':
          artifacts.proposal = await this.readArtifact(path.join(changeDir, 'proposal.md'));
          break;
        case 'specs':
          artifacts.specs = await this.readSpecs(specsDir);
          break;
        case 'design':
          artifacts.design = await this.readArtifact(path.join(changeDir, 'design.md'));
          break;
        case 'tasks':
          artifacts.tasks = await this.readArtifact(path.join(changeDir, 'tasks.md'));
          break;
        case 'implementation':
          artifacts.implementation = await this.readArtifact(path.join(changeDir, 'apply.log'));
          break;
        case 'verification':
          artifacts.verification = await this.readArtifact(path.join(changeDir, 'verification.md'));
          break;
        case 'metrics':
          artifacts.metrics = await this.collectMetrics(changeDir);
          break;
      }
    }

    return artifacts;
  }

  async readArtifact(filePath) {
    try {
      const exists = await this.fileExists(filePath);
      if (exists) {
        return await fs.readFile(filePath, 'utf-8');
      }
    } catch (err) {
      logger.warn(`Could not read ${filePath}: ${err.message}`);
    }
    return null;
  }

  async readSpecs(specsDir) {
    const specs = [];
    try {
      const exists = await this.fileExists(specsDir);
      if (exists) {
        const entries = await fs.readdir(specsDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const specPath = path.join(specsDir, entry.name, 'spec.md');
            const content = await this.readArtifact(specPath);
            if (content) {
              specs.push({ domain: entry.name, content });
            }
          }
        }
      }
    } catch (err) {
      logger.warn(`Could not read specs: ${err.message}`);
    }
    return specs;
  }

  async collectMetrics(changeDir) {
    const metrics = {
      testCoverage: 'N/A',
      mutationScore: 'N/A',
      constitutionCompliance: 'N/A',
      timestamp: new Date().toISOString()
    };

    try {
      const evidenceDir = path.join(changeDir, 'evidence');
      const exists = await this.fileExists(evidenceDir);
      if (exists) {
        const coveragePath = path.join(evidenceDir, 'coverage.json');
        const mutationPath = path.join(evidenceDir, 'mutation.json');
        const constitutionPath = path.join(evidenceDir, 'constitution.json');

        if (await this.fileExists(coveragePath)) {
          const coverage = JSON.parse(await fs.readFile(coveragePath, 'utf-8'));
          metrics.testCoverage = `${coverage.lines?.pct || 0}%`;
        }

        if (await this.fileExists(mutationPath)) {
          const mutation = JSON.parse(await fs.readFile(mutationPath, 'utf-8'));
          metrics.mutationScore = `${mutation.score?.pct || 0}%`;
        }

        if (await this.fileExists(constitutionPath)) {
          const constitution = JSON.parse(await fs.readFile(constitutionPath, 'utf-8'));
          metrics.constitutionCompliance = `${constitution.compliance || 0}%`;
        }
      }
    } catch (err) {
      logger.warn(`Could not collect metrics: ${err.message}`);
    }

    return metrics;
  }

  async generateDocument(changeName, artifacts) {
    const date = new Date().toISOString().split('T')[0];

    let doc = `# Final Requirement Document\n\n`;
    doc += `**Change**: ${changeName}\n`;
    doc += `**Generated**: ${date}\n\n`;
    doc += `---\n\n`;

    if (artifacts.proposal) {
      doc += `## 1. Background and Intent\n\n`;
      doc += this.extractSection(artifacts.proposal, 'description') || artifacts.proposal.substring(0, 500);
      doc += `\n\n`;
    }

    if (artifacts.specs && artifacts.specs.length > 0) {
      doc += `## 2. Requirements Summary\n\n`;
      for (const spec of artifacts.specs) {
        doc += `### ${spec.domain}\n\n`;
        doc += spec.content.substring(0, 300);
        doc += `\n\n`;
      }
    }

    if (artifacts.design) {
      doc += `## 3. Design Decisions\n\n`;
      doc += this.extractSection(artifacts.design, 'decisions') || artifacts.design.substring(0, 500);
      doc += `\n\n`;
    }

    if (artifacts.tasks) {
      doc += `## 4. Implementation Details\n\n`;
      const taskCount = (artifacts.tasks.match(/-\s*\[/g) || []).length;
      const completedCount = (artifacts.tasks.match(/-\s*\[x\]/g) || []).length;
      doc += `- Total Tasks: ${taskCount}\n`;
      doc += `- Completed: ${completedCount}\n`;
      doc += `- Remaining: ${taskCount - completedCount}\n\n`;
    }

    if (artifacts.metrics) {
      doc += `## 5. Quality Metrics\n\n`;
      doc += `| Metric | Value |\n`;
      doc += `|--------|-------|\n`;
      doc += `| Test Coverage | ${artifacts.metrics.testCoverage} |\n`;
      doc += `| Mutation Score | ${artifacts.metrics.mutationScore} |\n`;
      doc += `| Constitution Compliance | ${artifacts.metrics.constitutionCompliance} |\n\n`;
    }

    if (artifacts.verification) {
      doc += `## 6. Verification Results\n\n`;
      doc += artifacts.verification.substring(0, 500);
      doc += `\n\n`;
    }

    doc += `---\n\n`;
    doc += `*This document was automatically generated by STDD Copilot*\n`;

    return doc;
  }

  extractSection(content, sectionName) {
    const pattern = new RegExp(`##+\\s*${sectionName}[\\s\\S]+?(?=##+|$)`, 'i');
    const match = content.match(pattern);
    return match ? match[0].trim() : null;
  }
}

module.exports = { FinalDocCommand };
