/**
 * SudoLang Parser
 * Translates SudoLang-style pseudo-code into structured STDD artifacts.
 * Supports: Interfaces, Constraints, Commands, and Goal definitions.
 */

const fs = require('fs');
const path = require('path');

class SudoLangParser {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
  }

  parse(filePath) {
    if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    const result = { interfaces: [], constraints: [], commands: [], goals: [], raw: [] };
    let buffer = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('//') || line.startsWith('#')) continue;

      if (line.match(/^interface\s+(\w+)/i)) {
        if (buffer.length > 0) this.processBlock(result, buffer);
        buffer = [line];
      } else if (line.match(/^constraint:/i) || line.match(/^command:/i) || line.match(/^goal:/i)) {
        if (buffer.length > 0) this.processBlock(result, buffer);
        buffer = [line];
      } else {
        buffer.push(line);
      }
    }
    if (buffer.length > 0) this.processBlock(result, buffer);

    return this.normalize(result);
  }

  processBlock(result, block) {
    const header = block[0] || '';
    const body = block.slice(1).join('\n').trim();

    if (header.match(/^interface\s+(\w+)/i)) {
      const match = header.match(/^interface\s+(\w+)/i);
      result.interfaces.push({ name: match[1], properties: body });
    } else if (header.match(/^constraint:/i)) {
      result.constraints.push({ description: header.replace(/^constraint:\s*/i, ''), body });
    } else if (header.match(/^command:/i)) {
      result.commands.push({ name: header.replace(/^command:\s*/i, ''), action: body });
    } else if (header.match(/^goal:/i)) {
      result.goals.push({ description: header.replace(/^goal:\s*/i, ''), details: body });
    }
  }

  normalize(data) {
    return {
      extractedAt: new Date().toISOString(),
      complexityScore: data.interfaces.length + data.constraints.length,
      ...data
    };
  }

  generateArtifacts(parsedData, _options = {}) {
    const outputDir = path.join(this.cwd, 'stdd', 'runtime', 'generated');
    fs.mkdirSync(outputDir, { recursive: true });

    const artifacts = {};

    // 1. Generate Spec from Goals
    if (parsedData.goals.length > 0) {
      artifacts.spec = path.join(outputDir, 'sudo-spec.md');
      fs.writeFileSync(artifacts.spec, `# Auto-Generated Spec\n\n## Goals\n${parsedData.goals.map(g => `- ${g.description}\n  - ${g.details}`).join('\n')}`, 'utf8');
    }

    // 2. Generate Architecture Constraints
    if (parsedData.constraints.length > 0) {
      artifacts.design = path.join(outputDir, 'sudo-design.md');
      fs.writeFileSync(artifacts.design, `# Design Constraints\n\n${parsedData.constraints.map(c => `## ${c.description}\n${c.body}`).join('\n\n')}`, 'utf8');
    }

    // 3. Generate Interface Definitions
    if (parsedData.interfaces.length > 0) {
      artifacts.apispec = path.join(outputDir, 'sudo-interfaces.json');
      fs.writeFileSync(artifacts.apispec, JSON.stringify(parsedData.interfaces.map(i => ({ name: i.name, properties: i.properties })), null, 2), 'utf8');
    }

    return artifacts;
  }
}

module.exports = { SudoLangParser };
