/**
 * Chaos Code user configuration manager.
 * Persists preferences to ~/.chaos/config.json
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const CHAOS_DIR = path.join(os.homedir(), '.chaos');
const CONFIG_FILE = path.join(CHAOS_DIR, 'config.json');

const DEFAULT_CONFIG = {
  verbosity: 1,           // 0=minimal, 1=normal, 2=verbose
  notifyThreshold: 30,     // seconds before desktop notification
  bellThreshold: 10,       // seconds before terminal bell
  autoCompact: 80000,      // estimated tokens before auto-compact
  maxTurns: 20,            // max agent turns per prompt
  temperature: 0.2,
  permissionDefaults: {
    fs_patch: 'ask',       // ask | allow | deny
    shell_run: 'ask',
    test_run: 'allow',
    git_add: 'ask',
    git_commit: 'ask',
    git_push: 'deny',
    git_checkout: 'ask',
    git_branch: 'ask',
    git_reset: 'deny',
  },
};

function _ensureDir() {
  if (!fs.existsSync(CHAOS_DIR)) fs.mkdirSync(CHAOS_DIR, { recursive: true });
}

/**
 * Load user config, merged with defaults.
 * @returns {object}
 */
function loadConfig() {
  try {
    _ensureDir();
    if (!fs.existsSync(CONFIG_FILE)) return { ...DEFAULT_CONFIG };
    const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    return { ...DEFAULT_CONFIG, ...data, permissionDefaults: { ...DEFAULT_CONFIG.permissionDefaults, ...(data.permissionDefaults || {}) } };
  } catch (_) {
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Save user config (partial update supported).
 * @param {object} updates - Keys to update
 */
function saveConfig(updates) {
  _ensureDir();
  const current = loadConfig();
  const merged = { ...current, ...updates };
  // Deep merge permissionDefaults
  if (updates.permissionDefaults) {
    merged.permissionDefaults = { ...current.permissionDefaults, ...updates.permissionDefaults };
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}

/**
 * Get a single config value.
 * @param {string} key - Dot-notation key, e.g. 'permissionDefaults.fs_patch'
 * @returns {*}
 */
function getConfigValue(key) {
  const config = loadConfig();
  const parts = key.split('.');
  let val = config;
  for (const p of parts) {
    if (val && typeof val === 'object' && p in val) {
      val = val[p];
    } else {
      return undefined;
    }
  }
  return val;
}

/**
 * Get the effective permission for a tool from config.
 * @param {string} toolName
 * @returns {'ask'|'allow'|'deny'}
 */
function getToolPermission(toolName) {
  const config = loadConfig();
  return (config.permissionDefaults && config.permissionDefaults[toolName]) || 'ask';
}

/**
 * Reset config to defaults.
 */
function resetConfig() {
  _ensureDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8');
  return DEFAULT_CONFIG;
}

module.exports = { loadConfig, saveConfig, getConfigValue, getToolPermission, resetConfig, DEFAULT_CONFIG, CONFIG_FILE };
