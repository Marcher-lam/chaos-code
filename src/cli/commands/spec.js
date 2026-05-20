/**
 * Spec Command
 * Generate BDD specifications from confirmed requirements
 */

const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const { createLogger } = require('../../utils/logger');
const logger = createLogger('spec');

const RFC2119_KEYWORDS = {
  'MUST': 'Absolute requirement',
  'SHALL': 'Absolute requirement',
  'SHOULD': 'Recommended, exceptions possible',
  'MAY': 'Optional'
};

class SpecCommand {
  constructor() {
    this.changeTypes = ['ADDED', 'MODIFIED', 'REMOVED'];
  }

  async execute(changeName, options = {}) {
    const changesDir = path.join(process.cwd(), 'stdd', 'changes');
    const changeDir = changeName
      ? path.join(changesDir, changeName)
      : await this.getActiveChangeDir(changesDir);

    if (!changeDir) {
      throw new Error('No active change found. Use `stdd new change <name>` first.');
    }

    const proposalPath = path.join(changeDir, 'proposal.md');
    const proposalExists = await this.fileExists(proposalPath);

    if (!proposalExists) {
      throw new Error(`No proposal found. Create a proposal first.`);
    }

    const proposal = await fs.readFile(proposalPath, 'utf-8');
    const changeName2 = path.basename(changeDir);

    console.log('');
    console.log(chalk.bold('📝 Generating BDD Specifications'));
    console.log(chalk.dim('═'.repeat(50)));
    console.log('');
    console.log(chalk.dim(`Change: ${changeName2}`));
    console.log('');

    const specs = await this.generateSpecs(proposal, changeName2);

    if (options.dryRun) {
      console.log(chalk.yellow('Dry run - specs not saved'));
      for (const spec of specs) {
        console.log('');
        console.log(chalk.bold(`Domain: ${spec.domain}`));
        console.log(spec.content);
      }
      return specs;
    }

    for (const spec of specs) {
      const specDir = path.join(changeDir, 'specs', spec.domain);
      await fs.mkdir(specDir, { recursive: true });
      const specPath = path.join(specDir, 'spec.md');
      await fs.writeFile(specPath, spec.content);
      console.log(chalk.green(`✓ Spec created: ${specPath}`));
    }

    console.log('');
    console.log(chalk.cyan(`Next step: stdd plan ${changeName2}`));
    console.log('');

    return specs;
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

  async generateSpecs(proposal, changeName) {
    const specs = [];
    const domains = this.identifyDomains(proposal);

    for (const domain of domains) {
      const spec = await this.generateDomainSpec(domain, proposal, changeName);
      specs.push(spec);
    }

    return specs;
  }

  identifyDomains(proposal) {
    const domains = [];

    const domainKeywords = {
      'api': ['api', 'endpoint', 'route', 'http', 'rest'],
      'ui': ['ui', 'component', 'view', 'page', 'interface'],
      'data': ['data', 'model', 'schema', 'database', 'storage'],
      'auth': ['auth', 'login', 'permission', 'role'],
      'business': ['business', 'logic', 'rule', 'workflow']
    };

    const lowerProposal = proposal.toLowerCase();

    for (const [domain, keywords] of Object.entries(domainKeywords)) {
      if (keywords.some(kw => lowerProposal.includes(kw))) {
        domains.push(domain);
      }
    }

    return domains.length > 0 ? domains : ['core'];
  }

  async generateDomainSpec(domain, proposal, changeName) {
    const title = this.extractTitle(proposal);
    const scenarios = this.generateScenarios(domain, proposal);
    const changeType = this.detectChangeType(proposal);

    let content = `# ${title} - ${domain}\n\n`;
    content += `**Change**: ${changeName}\n`;
    content += `**Domain**: ${domain}\n`;
    content += `**Type**: ${changeType}\n`;
    content += `**Generated**: ${new Date().toISOString()}\n\n`;
    content += `---\n\n`;

    content += `## Scenarios\n\n`;

    for (const scenario of scenarios) {
      content += `### Scenario: ${scenario.title}\n\n`;
      content += `**Given** ${scenario.given}\n\n`;
      content += `**When** ${scenario.when}\n\n`;
      content += `**Then** ${scenario.then}\n\n`;

      if (scenario.examples && scenario.examples.length > 0) {
        content += `**Examples**:\n\n`;
        content += `| Input | Expected Output |\n`;
        content += `|-------|----------------|\n`;
        for (const example of scenario.examples) {
          content += `| ${example.input} | ${example.output} |\n`;
        }
        content += `\n`;
      }
    }

    content += `---\n\n`;
    content += `## Requirements\n\n`;
    content += `### ${changeType} Behavior\n\n`;
    content += `This specification ${changeType.toLowerCase()} the following behavior:\n\n`;
    content += `- External observable behavior only\n`;
    content += `- No implementation details\n`;
    content += `- Testable criteria\n\n`;

    content += `### RFC 2119 Keywords\n\n`;
    for (const [keyword, meaning] of Object.entries(RFC2119_KEYWORDS)) {
      content += `- **${keyword}**: ${meaning}\n`;
    }
    content += `\n`;

    return {
      domain,
      content
    };
  }

  extractTitle(proposal) {
    const match = proposal.match(/^#+\s*(.+)$/m);
    return match ? match[1].trim() : 'Untitled Feature';
  }

  detectChangeType(proposal) {
    const lower = proposal.toLowerCase();

    if (lower.includes('new') || lower.includes('add') || lower.includes('create')) {
      return 'ADDED';
    } else if (lower.includes('remove') || lower.includes('delete') || lower.includes('deprecate')) {
      return 'REMOVED';
    } else {
      return 'MODIFIED';
    }
  }

  generateScenarios(domain, proposal) {
    const scenarios = [];

    const scenarioTemplates = {
      'api': [
        {
          title: 'Successful API request',
          given: 'the API endpoint is available',
          when: 'a valid request is sent',
          then: 'the response returns 200 status with expected data'
        },
        {
          title: 'Invalid request handling',
          given: 'the API endpoint is available',
          when: 'an invalid request is sent',
          then: 'the response returns 400 status with error details'
        }
      ],
      'ui': [
        {
          title: 'User interacts with component',
          given: 'the component is rendered',
          when: 'the user performs an action',
          then: 'the component updates as expected'
        }
      ],
      'data': [
        {
          title: 'Data persistence',
          given: 'valid data is provided',
          when: 'the data is saved',
          then: 'the data is retrievable and matches the input'
        }
      ],
      'auth': [
        {
          title: 'Authentication success',
          given: 'valid credentials are provided',
          when: 'the user attempts to authenticate',
          then: 'the user is granted access'
        }
      ],
      'business': [
        {
          title: 'Business rule validation',
          given: 'business rule is configured',
          when: 'a transaction is processed',
          then: 'the rule is applied correctly'
        }
      ],
      'core': [
        {
          title: 'Main functionality',
          given: 'the system is initialized',
          when: 'the main operation is performed',
          then: 'the expected outcome occurs'
        }
      ]
    };

    return scenarioTemplates[domain] || scenarioTemplates['core'];
  }
}

module.exports = { SpecCommand };
