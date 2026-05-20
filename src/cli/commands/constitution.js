/**
 * Constitution Command
 * STDD Constitution management - 9 development articles enforcement and waivers
 */

const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const { createLogger } = require('../../utils/logger');
const { ConstitutionChecker } = require('./constitution-checker');
const { ConstitutionFixer } = require('./constitution-fix');
const { ConstitutionStatus } = require('./constitution-status');
const { WaiverManager } = require('./waiver-manager');
const logger = createLogger('constitution');

const ARTICLES = {
  1: {
    name: 'Library-First',
    priority: 'Warning',
    description: '优先使用成熟库而非重新实现',
    check: 'Library-First'
  },
  2: {
    name: 'TDD',
    priority: 'Blocking',
    description: '测试先行 + 覆盖率 gate + mutation evidence',
    check: 'TDD'
  },
  3: {
    name: 'Small Commits',
    priority: 'Warning',
    description: '原子化提交，每次提交应可独立运行',
    check: 'Small-Commits'
  },
  4: {
    name: 'Code Style',
    priority: 'Warning',
    description: '统一代码风格，遵循 ESLint 规则',
    check: 'Code-Style'
  },
  5: {
    name: 'Documentation',
    priority: 'Suggestion',
    description: '文档即代码，公共 API 必须有 JSDoc',
    check: 'Documentation'
  },
  6: {
    name: 'Error Handling',
    priority: 'Warning',
    description: '显式错误处理，禁止空 catch 块',
    check: 'Error-Handling'
  },
  7: {
    name: 'Security',
    priority: 'Blocking',
    description: '安全优先，禁止硬编码密钥',
    check: 'Security'
  },
  8: {
    name: 'Performance',
    priority: 'Suggestion',
    description: '性能默认，避免 N+1 查询',
    check: 'Performance'
  },
  9: {
    name: 'CI/CD',
    priority: 'Blocking',
    description: '自动化流水线，PR 前必须通过 CI',
    check: 'CI-CD'
  }
};

class ConstitutionCommand {
  constructor() {
    this.articles = ARTICLES;
    this.checker = new ConstitutionChecker();
    this.fixer = new ConstitutionFixer();
    this.status = new ConstitutionStatus();
    this.waiverManager = new WaiverManager();
  }

  async execute(action = 'show', options = {}) {
    const subCommands = ['show', 'check', 'status', 'fix', 'waive', 'audit', 'waivers'];
    const normalizedAction = subCommands.includes(action) ? action : 'show';

    switch (normalizedAction) {
      case 'show':
        return this.showArticle(options.article);
      case 'check':
        return this.checkCompliance(options);
      case 'status':
        return this.showStatus();
      case 'fix':
        return this.fixViolations(options);
      case 'waive':
        return this.createWaiver(options);
      case 'audit':
        return this.showAuditHistory(options);
      case 'waivers':
        return this.listWaivers();
      default:
        return this.showAllArticles();
    }
  }

  async showAllArticles() {
    console.log('');
    console.log(chalk.bold('📜 STDD Constitution - 9 Development Articles'));
    console.log(chalk.dim('═'.repeat(60)));
    console.log('');

    const priorityOrder = { 'Blocking': 1, 'Warning': 2, 'Suggestion': 3 };
    const sortedArticles = Object.entries(this.articles)
      .sort(([, a], [, b]) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    for (const [num, article] of sortedArticles) {
      const priorityColor = {
        'Blocking': 'red',
        'Warning': 'yellow',
        'Suggestion': 'blue'
      }[article.priority];

      console.log(chalk.bold(`Article ${num}: ${article.name}`));
      console.log(chalk[priorityColor](`  Priority: ${article.priority}`));
      console.log(chalk.dim(`  ${article.description}`));
      console.log('');
    }

    console.log(chalk.dim('─'.repeat(60)));
    console.log('');
    console.log(chalk.yellow('Commands:'));
    console.log('  stdd constitution show <num>    - View article details');
    console.log('  stdd constitution check         - Check compliance');
    console.log('  stdd constitution status        - View health status');
    console.log('  stdd constitution waive <num>   - Request waiver');
    console.log('');
  }

  async showArticle(articleNum) {
    if (!articleNum) {
      return this.showAllArticles();
    }

    const num = parseInt(articleNum, 10);
    const article = this.articles[num];

    if (!article) {
      console.log(chalk.red(`\n✗ Article ${num} not found. Valid range: 1-9`));
      return;
    }

    console.log('');
    console.log(chalk.bold(`📜 Article ${num}: ${article.name}`));
    console.log(chalk.dim('═'.repeat(60)));
    console.log('');
    console.log(chalk.bold(`Priority: ${article.priority}`));
    console.log('');
    console.log(chalk.dim(article.description));
    console.log('');

    const priorityNotes = {
      'Blocking': 'This article blocks commits when violated.',
      'Warning': 'This article shows a warning when violated.',
      'Suggestion': 'This article is a suggestion only.'
    };
    console.log(chalk.dim(priorityNotes[article.priority]));
    console.log('');
  }

  async checkCompliance(options) {
    return this.checker.execute(options);
  }

  async showStatus() {
    return this.status.execute();
  }

  async fixViolations(options) {
    return this.fixer.execute(options);
  }

  async createWaiver(options) {
    const articleNum = options.article;
    const reason = options.reason;
    const days = options.days || 7;

    if (!articleNum) {
      throw new Error('Article number is required. Use: --article=<num>');
    }

    if (!reason) {
      throw new Error('Reason is required. Use: --reason="<explanation>"');
    }

    const num = parseInt(articleNum, 10);
    if (!this.articles[num]) {
      throw new Error(`Article ${num} not found. Valid range: 1-9`);
    }

    return this.waiverManager.create({
      article: num,
      reason,
      scope: options.scope || 'all',
      days
    });
  }

  async showAuditHistory(options) {
    const auditPath = path.join(process.cwd(), 'stdd', 'constitution', 'audit.log');

    try {
      const exists = await this.fileExists(auditPath);
      if (!exists) {
        console.log(chalk.yellow('\nNo audit history found.'));
        return;
      }

      const content = await fs.readFile(auditPath, 'utf-8');
      const entries = content.trim().split('\n').reverse();

      const limit = options.limit ? parseInt(options.limit, 10) : 20;

      console.log('');
      console.log(chalk.bold('📋 Constitution Audit History'));
    console.log(chalk.dim('═'.repeat(60)));
      console.log('');

      for (let i = 0; i < Math.min(entries.length, limit); i++) {
        console.log(chalk.dim(entries[i]));
      }

      console.log('');
    } catch (err) {
      logger.error(`Failed to read audit log: ${err.message}`);
    }
  }

  async listWaivers() {
    return this.waiverManager.list();
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = { ConstitutionCommand, ARTICLES };
