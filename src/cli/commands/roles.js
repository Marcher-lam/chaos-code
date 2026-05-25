/**
 * Roles Command
 * Lightweight runtime for role listing, adversarial review, party-mode
 * analysis, single-role consult, and structured perspective extraction.
 *
 * Rich role definitions live in   src/config/role-definitions.js
 * Per-role review patterns in     src/config/role-review-strategies.js
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { walkFiles } = require('../../utils/file-walker');
const { createLogger } = require('../../utils/logger');
const { TechStackDetector } = require('../../utils/tech-stack-detector');
const { ROLE_DEFINITIONS, ROLES: RICH_ROLES } = require('../../config/role-definitions');
const { ROLE_REVIEW_PATTERNS, REVIEW_PATTERNS: FLAT_PATTERNS } = require('../../config/role-review-strategies');

const logger = createLogger('roles');

// Flat ROLES array kept for backward compatibility with the rest of the codebase.
const ROLES = RICH_ROLES;

// Flat REVIEW_PATTERNS kept for backward compatibility.
const REVIEW_PATTERNS = FLAT_PATTERNS;

class RolesCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
  }

  execute(action = 'list', args = [], options = {}) {
    switch (action) {
      case 'adversarial':
      case 'review':
        return this.adversarial(args[0] || '.', options);
      case 'party':
      case 'meeting':
        return this.party(args.join(' '), options);
      case 'consult':
        return this.consult(args[0], args.slice(1).join(' '), options);
      case 'perspective':
        return this.rolePerspective(args[0], args.slice(1).join(' '), options);
      case 'list':
      default:
        return this.list(options);
    }
  }

  // ─── list ────────────────────────────────────────────────────────
  list(options = {}) {
    if (options.json) {
      console.log(JSON.stringify(ROLES, null, 2));
      return ROLES;
    }
    console.log(chalk.bold('\nSTDD Roles\n'));
    for (const role of ROLES) {
      const def = ROLE_DEFINITIONS[role.id];
      const expertisePreview = def
        ? def.expertise.slice(0, 4).join(', ') + (def.expertise.length > 4 ? ', ...' : '')
        : role.lens;
      console.log(`  ${chalk.cyan(role.id.padEnd(12))} ${role.name}`);
      console.log(`  ${''.padEnd(12)} Lens: ${chalk.dim(role.lens)}`);
      console.log(`  ${''.padEnd(12)} Expertise: ${chalk.dim(expertisePreview)}`);
    }
    console.log('');
    return ROLES;
  }

  // ─── adversarial (enhanced) ──────────────────────────────────────
  adversarial(target = '.', options = {}) {
    const targetPath = path.resolve(this.cwd, target);
    const files = fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()
      ? walkFiles(targetPath, { extensions: ['.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.rs', '.md', '.feature', '.yaml', '.yml', '.json'] })
      : fs.existsSync(targetPath) ? [targetPath] : [];
    if (files.length === 0) throw new Error(`No reviewable files found at '${target}'.`);

    // Determine which roles' patterns to apply.
    const activeRoleIds = options.roles
      ? String(options.roles).split(',').map(r => r.trim()).filter(Boolean)
      : Object.keys(ROLE_REVIEW_PATTERNS);

    const findings = [];
    for (const file of files) {
      const relFile = path.relative(this.cwd, file).replace(/\\/g, '/');
      let content;
      try { content = fs.readFileSync(file, 'utf8'); } catch (err) {
        logger.warn(err.message);
        continue;
      }
      const lines = content.split('\n');
      for (const [index, line] of lines.entries()) {
        for (const roleId of activeRoleIds) {
          const strategy = ROLE_REVIEW_PATTERNS[roleId];
          if (!strategy) continue;
          for (const rule of strategy.patterns) {
            if (rule.regex.test(line)) {
              findings.push({
                file: relFile,
                line: index + 1,
                role: roleId,
                severity: rule.severity,
                message: rule.message,
                text: line.trim(),
              });
            }
          }
        }
      }
    }

    // Aggregate by role and severity for the enhanced report.
    const byRole = {};
    const bySeverity = { high: 0, medium: 0, low: 0 };
    for (const f of findings) {
      byRole[f.role] = (byRole[f.role] || 0) + 1;
      bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
    }

    const report = {
      target: path.relative(this.cwd, targetPath).replace(/\\/g, '/') || '.',
      filesReviewed: files.length,
      rolesApplied: activeRoleIds,
      findings,
      summary: { byRole, bySeverity, total: findings.length },
      status: findings.some(f => f.severity === 'high') ? 'fail' : 'pass',
    };
    const outputPath = this.saveReport('adversarial-review', report);
    report.output = outputPath;

    if (options.json) console.log(JSON.stringify(report, null, 2));
    else this.printAdversarial(report);
    if (report.status === 'fail') process.exitCode = 1;
    return report;
  }

  // ─── party (enhanced) ────────────────────────────────────────────
  party(topic, options = {}) {
    if (!topic) topic = 'current change';
    const selectedRoleIds = options.roles
      ? String(options.roles).split(',').map(r => r.trim())
      : ['po', 'architect', 'developer', 'tester', 'security', 'reviewer'];
    const selected = selectedRoleIds.map(id => ROLE_DEFINITIONS[id]).filter(Boolean);

    // Gather project context.
    const context = this._gatherProjectContext();

    const contributions = selected.map(def => ({
      role: def.id,
      name: def.name,
      lens: def.lens,
      expertise: def.expertise,
      reviewFocus: def.reviewFocus,
      checklist: def.checklist,
      prompt: def.promptTemplate(topic, context),
    }));

    // Synthesis: find common themes across roles.
    const synthesis = this._synthesizePerspectives(contributions, topic);

    const report = {
      topic,
      context: { techStack: context.techStack, fileCount: context.fileCount },
      roles: contributions,
      synthesis,
      createdAt: new Date().toISOString(),
    };

    const outputPath = this._savePartyReport('party-mode', report);
    report.output = outputPath;

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(chalk.bold('\nParty Mode Brief\n'));
      console.log(`  Topic:    ${chalk.cyan(topic)}`);
      console.log(`  Context:  ${chalk.dim(context.techStack || 'unknown')}`);
      console.log(`  Roles:    ${selected.map(r => chalk.cyan(r.name)).join(', ')}\n`);

      for (const item of contributions) {
        console.log(`  ${chalk.yellow(item.name)} (${item.role})`);
        console.log(`  ${chalk.dim('Focus:')} ${item.reviewFocus.slice(0, 3).join(', ')}`);
        console.log(`  ${chalk.dim('Prompt:')}`);
        for (const line of item.prompt.split('\n')) {
          console.log(`    ${chalk.dim(line)}`);
        }
        console.log('');
      }

      console.log(chalk.bold('  Synthesis'));
      console.log(`  ${chalk.dim('Consensus:')} ${synthesis.consensus.join('; ') || 'none identified'}`);
      console.log(`  ${chalk.dim('Conflicts:')} ${synthesis.conflicts.join('; ') || 'none identified'}`);
      console.log(`  ${chalk.dim('Coverage gaps:')} ${synthesis.coverageGaps.join('; ') || 'none identified'}`);
      console.log(`\n  Output: ${chalk.cyan(outputPath)}\n`);
    }
    return report;
  }

  // ─── consult (new) ───────────────────────────────────────────────
  consult(roleId, topic, options = {}) {
    const def = ROLE_DEFINITIONS[roleId];
    if (!def) throw new Error(`Unknown role "${roleId}". Available: ${Object.keys(ROLE_DEFINITIONS).join(', ')}`);
    if (!topic) topic = 'current change';

    const context = this._gatherProjectContext();
    const prompt = def.promptTemplate(topic, context);

    // Apply role-specific checklist as evaluation criteria.
    const evaluation = {
      topic,
      role: { id: def.id, name: def.name, lens: def.lens },
      expertise: def.expertise,
      reviewFocus: def.reviewFocus,
      checklist: def.checklist.map(item => ({
        criterion: item,
        status: 'pending',
        notes: '',
      })),
      prompt,
      context: { techStack: context.techStack, fileCount: context.fileCount },
    };

    const outputPath = this.saveReport(`consult-${def.id}`, evaluation);

    if (options.json) {
      console.log(JSON.stringify(evaluation, null, 2));
    } else {
      console.log(chalk.bold(`\n${def.name} Consultation\n`));
      console.log(`  Topic:  ${chalk.cyan(topic)}`);
      console.log(`  Lens:   ${chalk.dim(def.lens)}\n`);

      console.log(chalk.bold('  Expertise Areas'));
      for (const e of def.expertise) {
        console.log(`    - ${e}`);
      }

      console.log(chalk.bold('\n  Review Focus'));
      for (const f of def.reviewFocus) {
        console.log(`    ${chalk.yellow('!')} ${f}`);
      }

      console.log(chalk.bold('\n  Evaluation Checklist'));
      for (const item of evaluation.checklist) {
        console.log(`    [ ] ${item.criterion}`);
      }

      console.log(chalk.bold('\n  Generated Prompt'));
      for (const line of prompt.split('\n')) {
        console.log(`    ${chalk.dim(line)}`);
      }
      console.log(`\n  Output: ${chalk.cyan(outputPath)}\n`);
    }

    return evaluation;
  }

  // ─── rolePerspective (new) ───────────────────────────────────────
  rolePerspective(roleId, topic, options = {}) {
    const def = ROLE_DEFINITIONS[roleId];
    if (!def) throw new Error(`Unknown role "${roleId}". Available: ${Object.keys(ROLE_DEFINITIONS).join(', ')}`);
    if (!topic) topic = 'current change';

    const context = this._gatherProjectContext();
    const result = {
      role: { id: def.id, name: def.name, lens: def.lens },
      topic,
      findings: [],
      recommendations: [],
      risks: [],
    };

    // Map review-focus areas into structured findings.
    for (const focus of def.reviewFocus) {
      result.findings.push({
        area: focus,
        severity: 'review-required',
        description: `Evaluate "${topic}" for ${focus}`,
      });
    }

    // Map checklist into recommendations.
    for (const item of def.checklist) {
      result.recommendations.push({
        action: item,
        priority: 'recommended',
      });
    }

    // Identify top risks from review focus.
    const highRisk = def.reviewFocus.slice(0, 3);
    for (const risk of highRisk) {
      result.risks.push({
        risk,
        mitigation: `Apply ${def.name} checklist criteria to identify and address ${risk}`,
      });
    }

    const outputPath = this.saveReport(`perspective-${def.id}`, result);
    result.output = outputPath;

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.bold(`\n${def.name} Perspective on "${topic}"\n`));
      console.log(chalk.bold('  Findings'));
      for (const f of result.findings) {
        console.log(`    ${chalk.yellow('!')} ${f.area}: ${chalk.dim(f.description)}`);
      }
      console.log(chalk.bold('\n  Recommendations'));
      for (const r of result.recommendations) {
        console.log(`    ${chalk.green('>')} ${r.action}`);
      }
      console.log(chalk.bold('\n  Risks'));
      for (const r of result.risks) {
        console.log(`    ${chalk.red('!')} ${r.risk}`);
        console.log(`      ${chalk.dim(r.mitigation)}`);
      }
      console.log(`\n  Output: ${chalk.cyan(outputPath)}\n`);
    }

    return result;
  }

  // ─── helpers ─────────────────────────────────────────────────────

  /**
   * Gather basic project context for prompt templates.
   */
  _gatherProjectContext() {
    const ctx = {
      techStack: 'unknown',
      fileCount: 'unknown',
      testRunner: 'unknown',
      recentChanges: 'none',
    };
    try {
      const stack = TechStackDetector.analyze(this.cwd);
      ctx.techStack = `${stack.language} / ${stack.framework}`;
      ctx.testRunner = stack.testRunner;
    } catch (_) { /* non-critical */ }
    try {
      const srcDir = path.join(this.cwd, 'src');
      if (fs.existsSync(srcDir)) {
        const files = walkFiles(srcDir, { extensions: ['.js', '.jsx', '.ts', '.tsx', '.py'] });
        ctx.fileCount = String(files.length);
      }
    } catch (_) { /* non-critical */ }
    try {
      const stddDir = path.join(this.cwd, 'stdd', 'changes');
      if (fs.existsSync(stddDir)) {
        const changes = fs.readdirSync(stddDir).filter(f => fs.statSync(path.join(stddDir, f)).isDirectory());
        ctx.recentChanges = changes.slice(-3).join(', ') || 'none';
      }
    } catch (_) { /* non-critical */ }
    return ctx;
  }

  /**
   * Cross-role synthesis for party mode.
   * Identify consensus, conflicts, and coverage gaps.
   */
  _synthesizePerspectives(contributions, topic) {
    const consensus = [];
    const conflicts = [];
    const coverageGaps = [];

    // Collect all review-focus areas across selected roles.
    const allFocus = new Map();
    for (const c of contributions) {
      for (const f of c.reviewFocus) {
        if (!allFocus.has(f)) allFocus.set(f, []);
        allFocus.get(f).push(c.name);
      }
    }

    // Focus areas flagged by 2+ roles indicate consensus concerns.
    for (const [focus, roles] of allFocus) {
      if (roles.length >= 2) {
        consensus.push(`${focus} (flagged by ${roles.join(' + ')})`);
      }
    }

    // Check for potential conflicts: roles whose lenses naturally oppose.
    const conflictPairs = [
      ['po', 'developer'],   // scope vs. implementation complexity
      ['security', 'developer'], // lockdown vs. simplicity
      ['ux', 'devops'],      // richness vs. deployability
      ['architect', 'developer'], // ideal design vs. pragmatism
    ];
    const activeIds = new Set(contributions.map(c => c.role));
    for (const [a, b] of conflictPairs) {
      if (activeIds.has(a) && activeIds.has(b)) {
        const defA = ROLE_DEFINITIONS[a];
        const defB = ROLE_DEFINITIONS[b];
        conflicts.push(`${defA.name} (${defA.lens}) vs. ${defB.name} (${defB.lens})`);
      }
    }

    // Coverage gaps: identify key concerns NOT covered by the selected roles.
    const allRoleIds = new Set(Object.keys(ROLE_DEFINITIONS));
    const missingIds = [...allRoleIds].filter(id => !activeIds.has(id));
    if (missingIds.length > 0) {
      const missingNames = missingIds.map(id => ROLE_DEFINITIONS[id].name);
      coverageGaps.push(`Not represented: ${missingNames.join(', ')}`);
    }

    return { consensus, conflicts, coverageGaps };
  }

  /**
   * Save a JSON report to stdd/reports/.
   */
  saveReport(prefix, report) {
    const dir = path.join(this.cwd, 'stdd', 'reports');
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `${prefix}-${Date.now()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf8');
    return path.relative(this.cwd, filePath).replace(/\\/g, '/');
  }

  /**
   * Save party-mode report as markdown.
   */
  _savePartyReport(prefix, report) {
    const dir = path.join(this.cwd, 'stdd', 'reports');
    fs.mkdirSync(dir, { recursive: true });

    // Save JSON for programmatic access.
    const jsonPath = path.join(dir, `${prefix}-${Date.now()}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');

    // Save markdown for human consumption.
    const mdPath = path.join(dir, `${prefix}-${Date.now()}.md`);
    const md = this._renderPartyMarkdown(report);
    fs.writeFileSync(mdPath, md, 'utf8');

    return path.relative(this.cwd, mdPath).replace(/\\/g, '/');
  }

  _renderPartyMarkdown(report) {
    const lines = [];
    lines.push(`# Party Mode Brief`);
    lines.push('');
    lines.push(`**Topic:** ${report.topic}`);
    lines.push(`**Date:** ${report.createdAt}`);
    lines.push(`**Roles:** ${report.roles.map(r => r.name).join(', ')}`);
    lines.push('');

    for (const r of report.roles) {
      lines.push(`## ${r.name} (${r.role})`);
      lines.push('');
      lines.push(`**Lens:** ${r.lens}`);
      lines.push('');
      lines.push('**Review Focus:**');
      for (const f of r.reviewFocus) {
        lines.push(`- ${f}`);
      }
      lines.push('');
      lines.push('**Checklist:**');
      for (const c of r.checklist) {
        lines.push(`- [ ] ${c}`);
      }
      lines.push('');
      lines.push('**Prompt:**');
      lines.push('```');
      lines.push(r.prompt);
      lines.push('```');
      lines.push('');
    }

    if (report.synthesis) {
      lines.push('## Synthesis');
      lines.push('');
      lines.push('### Consensus');
      for (const c of report.synthesis.consensus) {
        lines.push(`- ${c}`);
      }
      lines.push('');
      lines.push('### Potential Conflicts');
      for (const c of report.synthesis.conflicts) {
        lines.push(`- ${c}`);
      }
      lines.push('');
      lines.push('### Coverage Gaps');
      for (const g of report.synthesis.coverageGaps) {
        lines.push(`- ${g}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  printAdversarial(report) {
    console.log(chalk.bold('\nAdversarial Review\n'));
    console.log(`  Files reviewed:  ${chalk.cyan(report.filesReviewed)}`);
    console.log(`  Roles applied:   ${chalk.cyan((report.rolesApplied || []).join(', '))}`);
    console.log(`  Findings:        ${report.findings.length ? chalk.yellow(report.findings.length) : chalk.green(0)}`);

    if (report.summary) {
      console.log(`    ${chalk.red('high')}: ${report.summary.bySeverity.high}  `
        + `${chalk.yellow('medium')}: ${report.summary.bySeverity.medium}  `
        + `${chalk.dim('low')}: ${report.summary.bySeverity.low}`);
      if (Object.keys(report.summary.byRole).length > 0) {
        console.log('  By role:');
        for (const [role, count] of Object.entries(report.summary.byRole)) {
          const def = ROLE_DEFINITIONS[role];
          console.log(`    ${chalk.dim((def ? def.name : role).padEnd(16))} ${count}`);
        }
      }
    }

    for (const finding of report.findings.slice(0, 30)) {
      const color = finding.severity === 'high' ? chalk.red : finding.severity === 'medium' ? chalk.yellow : chalk.dim;
      console.log(`  ${color(finding.severity.toUpperCase())} ${finding.file}:${finding.line} [${finding.role}]`);
      console.log(`    ${finding.message}`);
    }
    if (report.findings.length > 30) console.log(`  ... ${report.findings.length - 30} more finding(s)`);
    console.log(`\n  Output: ${chalk.cyan(report.output)}\n`);
  }
}

module.exports = { RolesCommand, ROLES, REVIEW_PATTERNS };
