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
const { execSync } = require('child_process');
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

    const executeAI = options.execute === true;
    const aiCLI = executeAI ? this._detectAICLI() : null;
    if (executeAI && !aiCLI) {
      console.log(chalk.yellow('  No AI CLI detected (install Claude Code CLI). Falling back to prompt-only mode.'));
    }

    const contributions = selected.map(def => ({
      role: def.id,
      name: def.name,
      lens: def.lens,
      expertise: def.expertise,
      reviewFocus: def.reviewFocus,
      checklist: def.checklist,
      prompt: def.promptTemplate(topic, context),
      analysis: null,
      analysisSource: 'prompt-only',
    }));

    // Execute prompts through AI if available
    if (aiCLI) {
      console.log(chalk.dim('  Executing role analyses via ' + aiCLI + '...'));
      for (const item of contributions) {
        const result = this._executePrompt(item.prompt, aiCLI);
        if (result.response) {
          item.analysis = result.response;
          item.analysisSource = 'ai-' + aiCLI;
        } else {
          item.analysis = 'AI execution failed: ' + (result.error || 'unknown');
          item.analysisSource = 'ai-failed';
        }
      }
    }

    // Synthesis: find common themes across roles (uses analysis if available).
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
        console.log(`  ${chalk.yellow(item.name)} (${item.role}) [${item.analysisSource}]`);
        console.log(`  ${chalk.dim('Focus:')} ${item.reviewFocus.slice(0, 3).join(', ')}`);
        if (item.analysis && item.analysisSource.startsWith('ai')) {
          console.log(`  ${chalk.dim('AI Analysis:')}`);
          const analysisLines = item.analysis.split('\n').slice(0, 10);
          for (const line of analysisLines) {
            console.log(`    ${chalk.green(line)}`);
          }
          if (item.analysis.split('\n').length > 10) {
            console.log(`    ${chalk.dim('... (truncated)')}`);
          }
        } else {
          console.log(`  ${chalk.dim('Prompt:')}`);
          for (const line of item.prompt.split('\n')) {
            console.log(`    ${chalk.dim(line)}`);
          }
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
  /**
   * Detect available AI CLI tool.
   * Returns 'claude' | null.
   */
  _detectAICLI() {
    try { execSync('which claude', { encoding: 'utf8', stdio: 'pipe' }); return 'claude'; }
    catch (_) {}
    return null;
  }

  /**
   * Execute a prompt through the detected AI CLI.
   * Returns { response: string, error: string|null }.
   */
  _executePrompt(prompt, cliName) {
    try {
      // Truncate extremely long prompts to avoid shell limits
      const truncated = prompt.length > 4000 ? prompt.slice(0, 4000) + '...' : prompt;
      const escaped = truncated.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/`/g, '\\`');

      let output;
      if (cliName === 'claude') {
        output = execSync('claude -p "' + escaped + '" --output-format text 2>/dev/null', {
          encoding: 'utf8',
          timeout: 60000,
          maxBuffer: 1024 * 1024,
          stdio: ['pipe', 'pipe', 'pipe'],
        });
      } else {
        return { response: null, error: 'Unsupported CLI: ' + cliName };
      }

      return { response: output.trim(), error: null };
    } catch (err) {
      return { response: null, error: err.message.split('\n')[0] };
    }
  }
  /**
   * Multi-round debate between selected roles on a topic.
   * Each round, roles see all previous analyses and respond to each other.
   */
  debate(topic, options = {}) {
    if (!topic) topic = 'current change';
    const rounds = parseInt(options.rounds, 10) || 3;
    const selectedRoleIds = options.roles
      ? String(options.roles).split(',').map(r => r.trim())
      : ['architect', 'developer', 'tester', 'security'];
    const selected = selectedRoleIds.map(id => ROLE_DEFINITIONS[id]).filter(Boolean);

    if (selected.length < 2) throw new Error('Debate requires at least 2 roles. Use: --roles architect,developer,tester');

    const context = this._gatherProjectContext();
    const roundOutputs = [];

    for (let round = 1; round <= rounds; round++) {
      const roundContributions = [];
      for (const def of selected) {
        const previousContext = roundOutputs.length > 0
          ? '\\n\\n## Previous Round Analyses:\\n' + roundOutputs[roundOutputs.length - 1].map(c =>
              '**' + c.name + '**: ' + (c.analysis || c.prompt).slice(0, 500)
            ).join('\\n')
          : '';

        const prompt = def.promptTemplate(topic + ' (Debate Round ' + round + ')' + previousContext, context);
        roundContributions.push({
          role: def.id,
          name: def.name,
          round,
          prompt,
          analysis: null,
        });
      }
      roundOutputs.push(roundContributions);
    }

    // Synthesize final debate result
    const finalPositions = roundOutputs[roundOutputs.length - 1];
    const convergence = this._analyzeDebateConvergence(roundOutputs);
    const report = {
      topic,
      type: 'debate',
      rounds,
      roles: selected.map(r => ({ id: r.id, name: r.name })),
      roundOutputs: roundOutputs.map(round => round.map(c => ({
        role: c.role, name: c.name, round: c.round,
        prompt: c.prompt.slice(0, 200),
      }))),
      convergence,
      createdAt: new Date().toISOString(),
    };

    const outputPath = this._savePartyReport('debate', report);
    report.output = outputPath;

    if (!options.json) {
      console.log(chalk.bold('\\n  Role Debate\\n'));
      console.log('  Topic: ' + chalk.cyan(topic));
      console.log('  Rounds: ' + rounds);
      console.log('  Roles: ' + selected.map(r => chalk.cyan(r.name)).join(', '));
      console.log('  Convergence: ' + (convergence.converged ? chalk.green('Yes') : chalk.yellow('Partial')));
      console.log('  Consensus points: ' + convergence.consensus.length);
      console.log('  Remaining conflicts: ' + convergence.conflicts.length);
      console.log('\\n  Output: ' + chalk.cyan(outputPath) + '\\n');
    }
    return report;
  }

  _analyzeDebateConvergence(roundOutputs) {
    if (roundOutputs.length < 2) return { converged: false, consensus: [], conflicts: [] };
    const firstRound = roundOutputs[0];
    const lastRound = roundOutputs[roundOutputs.length - 1];
    const consensus = [];
    const conflicts = [];

    for (let i = 0; i < firstRound.length; i++) {
      if (i >= lastRound.length) break;
      const firstPrompt = firstRound[i].prompt.toLowerCase();
      const lastPrompt = lastRound[i].prompt.toLowerCase();
      // Simple convergence: if a role's later prompt acknowledges other roles' points
      const acknowledgesOthers = lastPrompt.includes('agree') || lastPrompt.includes('consensus') || lastPrompt.includes('acknowledge');
      if (acknowledgesOthers) consensus.push(firstRound[i].name + ' converged');
      else conflicts.push(firstRound[i].name + ' maintained position');
    }

    return { converged: consensus.length >= firstRound.length * 0.6, consensus, conflicts };
  }

  /**
   * Produce a consensus report by aggregating all role perspectives.
   * Votes on key decisions and produces a unified recommendation.
   */
  consensus(topic, options = {}) {
    if (!topic) topic = 'current change';
    const selectedRoleIds = options.roles
      ? String(options.roles).split(',').map(r => r.trim())
      : Object.keys(ROLE_DEFINITIONS);
    const selected = selectedRoleIds.map(id => ROLE_DEFINITIONS[id]).filter(Boolean);

    const context = this._gatherProjectContext();
    const perspectives = selected.map(def => ({
      role: def.id,
      name: def.name,
      expertise: def.expertise,
      reviewFocus: def.reviewFocus,
      checklist: def.checklist,
      prompt: def.promptTemplate(topic, context),
      vote: null,
    }));

    // Auto-vote based on role expertise
    const decisions = [
      { question: 'Should this change require a full ADR?', key: 'requireADR' },
      { question: 'Is security review mandatory?', key: 'requireSecurity' },
      { question: 'Should mutation testing be enforced?', key: 'requireMutation' },
      { question: 'Is multi-role review needed?', key: 'requireMultiRoleReview' },
    ];

    const votes = decisions.map(d => {
      const yesVotes = perspectives.filter(p => {
        const focus = p.reviewFocus.join(' ').toLowerCase();
        if (d.key === 'requireSecurity') return p.role === 'security' || focus.includes('security');
        if (d.key === 'requireMutation') return p.role === 'tester' || focus.includes('test');
        if (d.key === 'requireADR') return p.role === 'architect' || focus.includes('architect');
        if (d.key === 'requireMultiRoleReview') return true;
        return false;
      }).length;
      return { ...d, yes: yesVotes, no: perspectives.length - yesVotes, passed: yesVotes > perspectives.length / 2 };
    });

    const report = {
      topic,
      type: 'consensus',
      totalRoles: perspectives.length,
      perspectives: perspectives.map(p => ({ role: p.role, name: p.name, focus: p.reviewFocus.slice(0, 3) })),
      votes,
      recommendation: votes.filter(v => v.passed).map(v => v.key),
      createdAt: new Date().toISOString(),
    };

    const outputPath = this._savePartyReport('consensus', report);
    report.output = outputPath;

    if (!options.json) {
      console.log(chalk.bold('\\n  Role Consensus Report\\n'));
      console.log('  Topic: ' + chalk.cyan(topic));
      console.log('  Roles consulted: ' + perspectives.length);
      console.log('\\n  Votes:');
      for (const v of votes) {
        const icon = v.passed ? chalk.green('PASS') : chalk.red('FAIL');
        console.log('    ' + icon + ' ' + v.question + ' (' + v.yes + '/' + perspectives.length + ')');
      }
      console.log('\\n  Recommendation: ' + report.recommendation.join(', ') || 'none');
      console.log('\\n  Output: ' + chalk.cyan(outputPath) + '\\n');
    }
    return report;
  }
}

module.exports = { RolesCommand, ROLES, REVIEW_PATTERNS };
