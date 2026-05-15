/**
 * Constitution Status Command
 * Quick health score and per-article status for the codebase.
 */

const path = require('path');
const chalk = require('chalk');
const { ConstitutionChecker } = require('./constitution-checker');
const { WaiverManager } = require('./waiver-manager');
const { resolveWorkspace } = require('../../utils/workspace-detector');
const { workspaceToScope, normalizePath } = require('../../utils/workspace-scope');

const ARTICLES = [
  { n: 2, name: 'TDD' },
  { n: 4, name: 'Style' },
  { n: 5, name: 'Documentation' },
  { n: 6, name: 'Error Handling' },
  { n: 7, name: 'Security' },
  { n: 8, name: 'Performance' },
  { n: 9, name: 'CI/CD' },
];

class ConstitutionStatusCommand {
  constructor(cwd) {
    this.cwd = cwd || process.cwd();
  }

  async execute(options = {}) {
    const workspace = options.workspace ? resolveWorkspace(this.cwd, options.workspace) : null;
    if (options.workspace && !workspace) {
      const errorResult = {
        status: 'error',
        error: `Workspace '${options.workspace}' not found.`,
        workspace: null,
      };

      if (options.json) {
        console.log(JSON.stringify(errorResult, null, 2));
        return errorResult;
      }

      throw new Error(errorResult.error);
    }

    const results = this._computeStatus({ workspace });

    if (options.json) {
      console.log(JSON.stringify(results, null, 2));
      return results;
    }

    this._printReport(results);
    return results;
  }

  _computeStatus(options = {}) {
    const checker = new ConstitutionChecker(this.cwd);
    const issues = this._filterIssuesByWorkspace(checker.run(), options.workspace);

    const waiverManager = new WaiverManager(this.cwd);
    const waivers = waiverManager.list();
    const workspaceScope = options.workspace ? workspaceToScope(this.cwd, options.workspace) : null;

    const articles = ARTICLES.map((art) => {
      const blockingForArticle = issues.blocking.filter((i) => i.article === art.n);
      const warningForArticle = issues.warning.filter((i) => i.article === art.n);
      const skippedForArticle = issues.skipped.filter((i) => i.article === art.n);
      const isWaived = skippedForArticle.some((i) => i.reason === 'Waived');
      const waiverInfo = waivers.find((w) => Number(w.article) === art.n);

      let status;
      let points;
      if (isWaived) {
        status = 'Waived';
        points = 0.5;
      } else if (blockingForArticle.length > 0) {
        status = 'Fail';
        points = 0;
      } else if (warningForArticle.length > 0) {
        status = 'Fail';
        points = 0;
      } else {
        status = 'Pass';
        points = 1;
      }

      return {
        article: art.n,
        name: art.name,
        status,
        points,
        blockingCount: blockingForArticle.length,
        warningCount: warningForArticle.length,
        firstIssue: blockingForArticle[0] || warningForArticle[0] || null,
        waiverReason: waiverInfo ? waiverInfo.reason : null,
        waiverDays: waiverInfo ? waiverInfo.days : null,
      };
    });

    const totalPoints = articles.reduce((sum, a) => sum + a.points, 0);
    const totalArticles = ARTICLES.length;
    const score = Math.round((totalPoints / totalArticles) * 100);

    const result = {
      score,
      totalArticles,
      passCount: articles.filter((a) => a.status === 'Pass').length,
      failCount: articles.filter((a) => a.status === 'Fail').length,
      waivedCount: articles.filter((a) => a.status === 'Waived').length,
      articles,
    };

    if (workspaceScope) {
      result.workspace = workspaceScope;
    }

    return result;
  }

  _filterIssuesByWorkspace(issues, workspace) {
    if (!workspace) return issues;

    const filter = (items) => (items || []).filter((issue) => this._issueBelongsToWorkspace(issue, workspace));
    return {
      blocking: filter(issues.blocking),
      warning: filter(issues.warning),
      info: filter(issues.info),
      skipped: filter(issues.skipped),
    };
  }

  _issueBelongsToWorkspace(issue, workspace) {
    const relRoot = normalizePath(path.relative(this.cwd, workspace.root));
    const absRoot = normalizePath(workspace.root);
    const candidates = [];

    for (const key of ['file', 'path', 'filepath', 'filePath']) {
      if (issue[key]) candidates.push(String(issue[key]));
    }

    const message = String(issue.message || '');
    candidates.push(...(message.match(/[\w@.-]+(?:\/[\w@.-]+)+(?::\d+)?/g) || []));

    return candidates.some((candidate) => {
      const withoutLine = candidate.replace(/:\d+$/, '');
      const normalized = normalizePath(withoutLine);
      return normalized === relRoot ||
        normalized.startsWith(relRoot + '/') ||
        normalized === absRoot ||
        normalized.startsWith(absRoot + '/');
    });
  }

  _printReport(results) {
    const { score } = results;
    let scoreColor;
    if (score >= 70) {
      scoreColor = chalk.green;
    } else if (score >= 50) {
      scoreColor = chalk.yellow;
    } else {
      scoreColor = chalk.red;
    }

    const scoreStr = `${score}%`;
    console.log(chalk.bold('\nConstitution Health'));
    if (results.workspace) {
      console.log(chalk.dim(`Workspace: ${results.workspace.name} (${results.workspace.path})`));
    }
    console.log(scoreColor.bold(scoreStr));
    console.log('');

    for (const art of results.articles) {
      if (art.status === 'Pass') {
        console.log(chalk.green(`  ✅  Art ${art.article}: ${art.name}`));
      } else if (art.status === 'Fail') {
        const detail = art.firstIssue ? ` (${art.firstIssue.message.slice(0, 60)})` : '';
        console.log(chalk.red(`  ❌  Art ${art.article}: ${art.name}${detail}`));
      } else {
        let extra = '';
        if (art.waiverDays) {
          extra = ` (Waived for ${art.waiverDays} days)`;
        }
        console.log(chalk.yellow(`  ⚠️   Art ${art.article}: ${art.name}${extra}`));
      }
    }

    console.log('');
    console.log(
      chalk.dim(`  ${results.passCount} passed, ${results.failCount} failed, ${results.waivedCount} waived`)
    );
    console.log('');
  }
}

module.exports = { ConstitutionStatusCommand };
