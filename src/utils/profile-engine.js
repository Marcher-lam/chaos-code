/**
 * Profile Engine
 * Maps complexity and certainty scores to adaptive planning profiles.
 */

const fs = require('fs');
const path = require('path');
const { PROFILES, CHANGE_TYPE_OVERRIDES, STANDARD_PHASES } = require('../config/planning-profiles');
const { createLogger } = require('./logger');
const logger = createLogger('profile-engine');

class ProfileEngine {
  /**
   * Detect the appropriate profile based on numeric scores and change type.
   *
   * Priority:
   *  1. changeType override (hotfix -> quick, feature -> standard, refactor -> thorough)
   *  2. Score-based detection:
   *     - complexity < 20 AND certainty >= 90 -> quick
   *     - complexity < 50 AND certainty >= 80 -> standard
   *     - complexity < 80 OR certainty >= 70  -> thorough
   *     - else                                -> enterprise
   *
   * @param {number} complexityScore 0-100
   * @param {number} certaintyScore  0-100
   * @param {string} [changeType]    Optional change type override
   * @returns {{ profileId: string, profile: object, source: string }}
   */
  detectProfile(complexityScore, certaintyScore, changeType) {
    // changeType override takes highest priority
    if (changeType) {
      const normalised = changeType.toLowerCase().trim();
      if (CHANGE_TYPE_OVERRIDES[normalised]) {
        const profileId = CHANGE_TYPE_OVERRIDES[normalised];
        return {
          profileId,
          profile: PROFILES[profileId],
          source: `change-type:${normalised}`,
        };
      }
    }

    const c = typeof complexityScore === 'number' ? complexityScore : 50;
    const cert = typeof certaintyScore === 'number' ? certaintyScore : 80;

    let profileId;
    if (c < 20 && cert >= 90) {
      profileId = 'quick';
    } else if (c < 50 && cert >= 80) {
      profileId = 'standard';
    } else if (c < 80 || cert >= 70) {
      profileId = 'thorough';
    } else {
      profileId = 'enterprise';
    }

    return {
      profileId,
      profile: PROFILES[profileId],
      source: `scores:c=${c},cert=${cert}`,
    };
  }

  /**
   * Get the phase configuration for a given profile.
   * @param {string} profileId
   * @returns {object|null}
   */
  getPhaseConfig(profileId) {
    const profile = PROFILES[profileId];
    if (!profile) return null;
    return {
      id: profile.id,
      name: profile.name,
      depth: profile.depth,
      ...profile.phaseConfig,
    };
  }

  /**
   * Adapt a standard phases array based on the selected profile.
   * Removes skipped phases and inserts quality gates where required.
   *
   * @param {string} profileId
   * @param {string[]} [basePhases] Defaults to STANDARD_PHASES
   * @returns {{ phases: string[], skipped: string[], gates: string[] }}
   */
  adaptWorkflow(profileId, basePhases) {
    const profile = PROFILES[profileId];
    if (!profile) {
      return { phases: basePhases || STANDARD_PHASES, skipped: [], gates: [] };
    }

    const phases = basePhases || [...STANDARD_PHASES];
    const skip = new Set(profile.phases.skip || []);
    const require = new Set(profile.phases.require || []);

    const filtered = phases.filter(p => !skip.has(p));
    const skipped = phases.filter(p => skip.has(p));

    // Insert quality gates for required phases that are not already present
    const gates = [];
    for (const req of require) {
      if (!filtered.includes(req)) {
        // Insert gate before the nearest subsequent phase that exists
        const reqIdx = STANDARD_PHASES.indexOf(req);
        let inserted = false;
        for (let i = reqIdx + 1; i < STANDARD_PHASES.length; i++) {
          const nextPhase = STANDARD_PHASES[i];
          const existingIdx = filtered.indexOf(nextPhase);
          if (existingIdx !== -1) {
            filtered.splice(existingIdx, 0, req);
            gates.push(req);
            inserted = true;
            break;
          }
        }
        if (!inserted) {
          filtered.push(req);
          gates.push(req);
        }
      }
    }

    return { phases: filtered, skipped, gates };
  }

  /**
   * Auto-detect profile from project data files.
   * Reads stdd/reports/complexity.json and stdd/memory/certainty-history.jsonl.
   * Defaults to "standard" when files are missing.
   *
   * @param {string} cwd
   * @returns {{ profileId: string, profile: object, source: string, complexityScore: number|null, certaintyScore: number|null }}
   */
  detectFromProject(cwd) {
    let complexityScore = null;
    let certaintyScore = null;

    // Read complexity report
    const complexityPath = path.join(cwd, 'stdd', 'reports', 'complexity.json');
    if (fs.existsSync(complexityPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(complexityPath, 'utf8'));
        complexityScore = data.summary && typeof data.summary.complexityScore === 'number'
          ? data.summary.complexityScore
          : null;
      } catch (err) {
        logger.warn(`Failed to read complexity report: ${err.message}`);
      }
    }

    // Read certainty history (use latest entry)
    const certaintyPath = path.join(cwd, 'stdd', 'memory', 'certainty-history.jsonl');
    if (fs.existsSync(certaintyPath)) {
      try {
        const lines = fs.readFileSync(certaintyPath, 'utf8').split('\n').filter(Boolean);
        if (lines.length > 0) {
          const lastEntry = JSON.parse(lines[lines.length - 1]);
          certaintyScore = typeof lastEntry.overall === 'number'
            ? Math.round(lastEntry.overall * 100)
            : null;
        }
      } catch (err) {
        logger.warn(`Failed to read certainty history: ${err.message}`);
      }
    }

    // Default scores when data is missing
    if (complexityScore === null && certaintyScore === null) {
      return {
        profileId: 'standard',
        profile: PROFILES.standard,
        source: 'default:no-data',
        complexityScore: null,
        certaintyScore: null,
      };
    }

    // Use defaults for missing individual scores
    const effectiveComplexity = complexityScore !== null ? complexityScore : 50;
    const effectiveCertainty = certaintyScore !== null ? certaintyScore : 80;

    const detected = this.detectProfile(effectiveComplexity, effectiveCertainty);

    return {
      profileId: detected.profileId,
      profile: detected.profile,
      source: detected.source,
      complexityScore,
      certaintyScore,
    };
  }

  /**
   * Automatically select the optimal profile by analyzing the project.
   * Counts source files, test files, reads complexity/certainty, and checks config.
   * Respects user_skill_level from stdd/config.yaml when present.
   */
  autoSelectProfile(cwd) {
    const metrics = this._gatherProjectMetrics(cwd);
    const config = this._readConfig(cwd);
    const skillLevel = config.user_skill_level || null;
    const projectKnowledge = config.project_knowledge || null;

    const composite = metrics.complexityScore !== null && metrics.certaintyScore !== null
      ? (metrics.complexityScore * 0.6 + (100 - metrics.certaintyScore) * 0.4)
      : metrics.fileCount > 100 ? 65 : metrics.fileCount > 30 ? 40 : 20;

    let profileId;
    if (composite < 30) profileId = 'quick';
    else if (composite < 55) profileId = 'standard';
    else if (composite < 80) profileId = 'thorough';
    else profileId = 'enterprise';

    if (skillLevel === 'beginner') {
      if (profileId === 'quick') profileId = 'standard';
      else if (profileId === 'standard') profileId = 'thorough';
    } else if (skillLevel === 'expert') {
      if (profileId === 'thorough') profileId = 'standard';
      else if (profileId === 'enterprise') profileId = 'thorough';
    }

    if (projectKnowledge === 'existing-unfamiliar') {
      if (profileId === 'quick') profileId = 'standard';
      if (profileId === 'standard') profileId = 'thorough';
    }

    return {
      profileId,
      profile: PROFILES[profileId],
      source: 'auto:composite=' + Math.round(composite) + ',skill=' + (skillLevel || 'auto') + ',knowledge=' + (projectKnowledge || 'auto'),
      metrics,
    };
  }

  _gatherProjectMetrics(cwd) {
    let fileCount = 0;
    let testFileCount = 0;
    const self = this;

    function countDir(dir) {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'stdd') continue;
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) { countDir(full); }
          else if (entry.isFile() && /\.(js|ts|jsx|tsx|py|java|go|rs|rb|php)$/.test(entry.name)) {
            fileCount++;
            if (entry.name.includes('.test.') || entry.name.includes('.spec.')) testFileCount++;
          }
        }
      } catch (_) {}
    }
    countDir(cwd);

    let complexityScore = null;
    let certaintyScore = null;
    const detected = self.detectFromProject(cwd);
    complexityScore = detected.complexityScore;
    certaintyScore = detected.certaintyScore;

    return { fileCount, testFileCount, complexityScore, certaintyScore };
  }

  _readConfig(cwd) {
    const configPath = path.join(cwd, 'stdd', 'config.yaml');
    if (!fs.existsSync(configPath)) return {};
    try {
      const yaml = require('js-yaml');
      const raw = fs.readFileSync(configPath, 'utf8');
      const config = yaml.load(raw) || {};
      return {
        user_skill_level: config.user_skill_level || null,
        project_knowledge: config.project_knowledge || null,
      };
    } catch (_) {
      return {};
    }
  }
}

module.exports = { ProfileEngine };
