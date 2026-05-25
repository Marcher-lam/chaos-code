/**
 * Profile Command
 * Detect and manage planning depth profiles for adaptive workflows.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const yaml = require('js-yaml');
const { createLogger } = require('../../utils/logger');
const { PROFILES, CHANGE_TYPE_OVERRIDES } = require('../../config/planning-profiles');
const { ProfileEngine } = require('../../utils/profile-engine');
const logger = createLogger('profile');

class ProfileCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.engine = new ProfileEngine();
    this.configPath = path.join(cwd, 'stdd', 'config.yaml');
  }

  async execute(action = 'detect', args = [], options = {}) {
    switch (action) {
      case 'detect':
        return this.detect(options);
      case 'set':
        return this.set(args[0], options);
      case 'list':
        return this.list(options);
      case 'recommend':
        return this.recommend(options);
      default:
        return this.detect(options);
    }
  }

  /**
   * Auto-detect profile from project data.
   */
  detect(options = {}) {
    const detected = this.engine.detectFromProject(this.cwd);

    const result = {
      profileId: detected.profileId,
      profile: detected.profile,
      source: detected.source,
      complexityScore: detected.complexityScore,
      certaintyScore: detected.certaintyScore,
    };

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      this.printDetection(result);
    }

    return result;
  }

  /**
   * Save a profile to stdd/config.yaml.
   */
  set(profileName, options = {}) {
    const profileId = (profileName || '').toLowerCase().trim();

    if (!PROFILES[profileId]) {
      const valid = Object.keys(PROFILES).join(', ');
      throw new Error(`Unknown profile "${profileName}". Valid profiles: ${valid}`);
    }

    const profile = PROFILES[profileId];

    // Read existing config or start fresh
    let config = {};
    if (fs.existsSync(this.configPath)) {
      try {
        config = yaml.load(fs.readFileSync(this.configPath, 'utf8')) || {};
      } catch (err) {
        logger.warn(`Failed to parse existing config: ${err.message}`);
      }
    }

    config.profile = {
      id: profile.id,
      name: profile.name,
      depth: profile.depth,
      setAt: new Date().toISOString(),
    };

    // Ensure directory exists
    fs.mkdirSync(path.dirname(this.configPath), { recursive: true });
    fs.writeFileSync(this.configPath, yaml.dump(config, { lineWidth: -1 }), 'utf8');

    const result = {
      saved: true,
      profile: config.profile,
      path: path.relative(this.cwd, this.configPath),
    };

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.bold(`\nProfile set to ${chalk.cyan(profile.name)} (depth ${profile.depth})`));
      console.log(`  Saved to: ${chalk.dim(result.path)}\n`);
    }

    return result;
  }

  /**
   * List all available profiles.
   */
  list(options = {}) {
    const profiles = Object.values(PROFILES).map(p => ({
      id: p.id,
      name: p.name,
      depth: p.depth,
      description: p.description,
      maxTasks: p.phaseConfig.maxTasks,
      testThreshold: p.phaseConfig.testThreshold,
      reviewRounds: p.phaseConfig.reviewRounds,
    }));

    const result = { profiles };

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      this.printProfiles(profiles);
    }

    return result;
  }

  /**
   * Detect + show recommended phases and settings.
   */
  recommend(options = {}) {
    // Detect profile, with optional change type override
    const changeType = options.change || null;
    let detected;

    if (changeType) {
      const normalised = changeType.toLowerCase().trim();
      const override = CHANGE_TYPE_OVERRIDES[normalised];
      if (override) {
        detected = {
          profileId: override,
          profile: PROFILES[override],
          source: `change-type:${normalised}`,
          complexityScore: null,
          certaintyScore: null,
        };
      } else {
        detected = this.engine.detectFromProject(this.cwd);
      }
    } else {
      detected = this.engine.detectFromProject(this.cwd);
    }

    const workflow = this.engine.adaptWorkflow(detected.profileId);
    const phaseConfig = this.engine.getPhaseConfig(detected.profileId);

    const result = {
      profileId: detected.profileId,
      profile: detected.profile,
      source: detected.source,
      complexityScore: detected.complexityScore,
      certaintyScore: detected.certaintyScore,
      workflow,
      phaseConfig,
    };

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      this.printRecommendation(result, changeType);
    }

    return result;
  }

  // ── Display helpers ──

  printDetection(result) {
    const p = result.profile;
    const depthBar = this.getDepthBar(p.depth);

    console.log(chalk.bold('\nProfile Detection\n'));
    console.log(`  Detected:  ${chalk.cyan(p.name)} (depth ${p.depth}) ${depthBar}`);
    console.log(`  Source:    ${chalk.dim(result.source)}`);

    if (result.complexityScore !== null) {
      console.log(`  Complexity: ${this.getScoreDisplay(result.complexityScore, 100)}`);
    } else {
      console.log(`  Complexity: ${chalk.dim('no data')}`);
    }

    if (result.certaintyScore !== null) {
      console.log(`  Certainty:  ${this.getScoreDisplay(result.certaintyScore, 100)}`);
    } else {
      console.log(`  Certainty:  ${chalk.dim('no data')}`);
    }

    console.log(`\n  ${chalk.dim(p.description)}\n`);
  }

  printProfiles(profiles) {
    console.log(chalk.bold('\nPlanning Profiles\n'));

    for (const p of profiles) {
      const depthBar = this.getDepthBar(p.depth);
      console.log(`  ${chalk.cyan(p.name.padEnd(12))} depth ${p.depth} ${depthBar}`);
      console.log(`  ${chalk.dim(' '.repeat(12) + p.description)}`);
      console.log(`  ${chalk.dim(' '.repeat(12))}tasks: ${p.maxTasks} · review: ${p.reviewRounds} · test: ${p.testThreshold}%\n`);
    }

    console.log(chalk.dim('  Change type overrides:'));
    console.log(chalk.dim('  hotfix/fix/bugfix -> quick'));
    console.log(chalk.dim('  feature/enhancement -> standard'));
    console.log(chalk.dim('  refactor/architecture/migration -> thorough'));
    console.log(chalk.dim('  compliance/security/audit -> enterprise\n'));
  }

  printRecommendation(result, changeType) {
    const p = result.profile;
    const depthBar = this.getDepthBar(p.depth);

    console.log(chalk.bold('\nProfile Recommendation\n'));

    if (changeType) {
      console.log(`  Change type: ${chalk.cyan(changeType)}`);
    }
    console.log(`  Profile:     ${chalk.cyan(p.name)} (depth ${p.depth}) ${depthBar}`);
    console.log(`  Source:      ${chalk.dim(result.source)}`);

    if (result.complexityScore !== null) {
      console.log(`  Complexity:  ${this.getScoreDisplay(result.complexityScore, 100)}`);
    }
    if (result.certaintyScore !== null) {
      console.log(`  Certainty:   ${this.getScoreDisplay(result.certaintyScore, 100)}`);
    }

    // Phase configuration
    const cfg = result.phaseConfig;
    console.log(chalk.bold('\n  Phase Configuration:'));
    console.log(`    Max tasks:        ${chalk.cyan(cfg.maxTasks)}`);
    console.log(`    Review rounds:    ${chalk.cyan(cfg.reviewRounds)}`);
    console.log(`    Test threshold:   ${this.getScoreDisplay(cfg.testThreshold, 100)}`);
    console.log(`    Clarify required: ${cfg.clarifyRequired ? chalk.green('yes') : chalk.dim('no')}`);
    console.log(`    Plan required:    ${cfg.planRequired ? chalk.green('yes') : chalk.dim('no')}`);
    console.log(`    Mutation:         ${cfg.requireMutation ? chalk.green('required') : chalk.dim('optional')}`);
    console.log(`    ADR:              ${cfg.requireADR ? chalk.green('required') : chalk.dim('optional')}`);
    console.log(`    Security audit:   ${cfg.requireSecurityAudit ? chalk.green('required') : chalk.dim('optional')}`);
    console.log(`    Multi-role review:${cfg.requireMultiRoleReview ? chalk.green(' required') : chalk.dim(' optional')}`);
    console.log(`    Full docs:        ${cfg.requireFullDocs ? chalk.green('required') : chalk.dim('optional')}`);

    // Workflow
    const wf = result.workflow;
    console.log(chalk.bold('\n  Workflow Phases:'));
    console.log(`    Active:  ${wf.phases.map(ph => chalk.green(ph)).join(' → ')}`);
    if (wf.skipped.length > 0) {
      console.log(`    Skipped: ${wf.skipped.map(ph => chalk.dim(ph)).join(', ')}`);
    }
    if (wf.gates.length > 0) {
      console.log(`    Gates:   ${wf.gates.map(ph => chalk.yellow(ph)).join(', ')}`);
    }

    console.log(`\n  ${chalk.dim(p.description)}\n`);
  }

  getDepthBar(depth) {
    const blocks = ['', '█', '██', '███', '████'];
    return chalk.cyan(blocks[depth] || '');
  }

  getScoreDisplay(value, max) {
    const pct = Math.round((value / max) * 100);
    if (pct >= 85) return chalk.green(`${value}/${max}`);
    if (pct >= 65) return chalk.yellow(`${value}/${max}`);
    return chalk.red(`${value}/${max}`);
  }
}

module.exports = { ProfileCommand };
