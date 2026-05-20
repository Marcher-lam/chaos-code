const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');

const COMMAND_ONLY_ENTRIES = [];

const COMMAND_FILE_BACKED_ENTRIES = [
  '/stdd:api-spec',
  '/stdd:apply',
  '/stdd:archive',
  '/stdd:audit',
  '/stdd:baby-steps',
  '/stdd:brainstorm',
  '/stdd:browser',
  '/stdd:ci-generator',
  '/stdd:clarify',
  '/stdd:commands',
  '/stdd:commit-msg',
  '/stdd:confirm',
  '/stdd:constitution',
  '/stdd:context',
  '/stdd:continue',
  '/stdd:contract',
  '/stdd:depcheck',
  '/stdd:doctor',
  '/stdd:elicitation',
  '/stdd:execute',
  '/stdd:explore',
  '/stdd:extensions',
  '/stdd:ff',
  '/stdd:final-doc',
  '/stdd:fix-packet',
  '/stdd:graph',
  '/stdd:graph-history',
  '/stdd:graph-run',
  '/stdd:guard',
  '/stdd:hooks',
  '/stdd:init',
  '/stdd:issue',
  '/stdd:learn',
  '/stdd:list',
  '/stdd:memory-scan',
  '/stdd:metrics',
  '/stdd:mock-gen',
  '/stdd:mutation',
  '/stdd:new',
  '/stdd:outside-in',
  '/stdd:pipeline',
  '/stdd:plan',
  '/stdd:product-proposal',
  '/stdd:progress',
  '/stdd:propose',
  '/stdd:recommend',
  '/stdd:roles',
  '/stdd:schema',
  '/stdd:skills',
  '/stdd:spec',
  '/stdd:spec-generator',
  '/stdd:start',
  '/stdd:starters',
  '/stdd:status',
  '/stdd:story',
  '/stdd:tdd-init',
  '/stdd:turbo',
  '/stdd:update',
  '/stdd:user-test',
  '/stdd:validate',
  '/stdd:verify',
  '/stdd:waiver-manager',
  '/stdd:workspace'
];

const SKILL_DRIVEN_ENTRIES = [
  '/stdd:api-spec',
  '/stdd:apply',
  '/stdd:archive',
  '/stdd:brainstorm',
  '/stdd:certainty',
  '/stdd:clarify',
  '/stdd:commit',
  '/stdd:complexity',
  '/stdd:confirm',
  '/stdd:constitution',
  '/stdd:context',
  '/stdd:continue',
  '/stdd:contract',
  '/stdd:design',
  '/stdd:execute',
  '/stdd:explore',
  '/stdd:factory',
  '/stdd:ff',
  '/stdd:final-doc',
  '/stdd:fix-packet',
  '/stdd:graph',
  '/stdd:guard',
  '/stdd:help',
  '/stdd:init',
  '/stdd:issue',
  '/stdd:iterate',
  '/stdd:learn',
  '/stdd:memory',
  '/stdd:metrics',
  '/stdd:mock',
  '/stdd:mutation',
  '/stdd:new',
  '/stdd:outside-in',
  '/stdd:parallel',
  '/stdd:plan',
  '/stdd:product-proposal',
  '/stdd:propose',
  '/stdd:prp',
  '/stdd:roles',
  '/stdd:schema',
  '/stdd:spec',
  '/stdd:supervisor',
  '/stdd:turbo',
  '/stdd:user-test',
  '/stdd:validate',
  '/stdd:verify',
  '/stdd:vision'
];

const CANONICAL_CLI_ENTRIES = [
  'stdd init',
  'stdd init /path/to/project',
  'stdd init --force',
  'stdd list',
  'stdd list --specs',
  'stdd list --archived',
  'stdd list --json',
  'stdd status',
  'stdd status add-dark-mode',
  'stdd new change add-dark-mode',
  'stdd skills',
  'stdd commands',
  'stdd constitution',
  'stdd constitution show 2',
  'stdd constitution check',
  'stdd hooks install',
  'stdd hooks verify',
  'stdd hooks status',
  'stdd hooks disable',
  'stdd hooks enable'
];

function readFile(relativePath) {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

function getSlashEntriesFromCommandFiles() {
  const dir = path.join(REPO_ROOT, 'src', 'templates', 'commands');
  return fs.readdirSync(dir)
    .filter(name => name.endsWith('.md'))
    .map(name => `/stdd:${name.replace(/\.md$/, '')}`)
    .sort();
}

function getSlashEntriesFromSkillDirs() {
  const dir = path.join(REPO_ROOT, 'src', 'templates', 'skills', 'stdd');
  return fs.readdirSync(dir)
    .filter(name => {
      try { return fs.statSync(path.join(dir, name)).isDirectory(); } catch { return false; }
    })
    .map(name => `/stdd:${name}`)
    .sort();
}

function getCanonicalSlashEntries() {
  return [...new Set([
    ...getSlashEntriesFromCommandFiles(),
    ...getSlashEntriesFromSkillDirs()
  ])].sort();
}

function getSkillDirEntriesSet() {
  return new Set(getSlashEntriesFromSkillDirs());
}

function getCommandFileEntriesSet() {
  return new Set(getSlashEntriesFromCommandFiles());
}

module.exports = {
  COMMAND_ONLY_ENTRIES,
  COMMAND_FILE_BACKED_ENTRIES,
  SKILL_DRIVEN_ENTRIES,
  CANONICAL_CLI_ENTRIES,
  readFile,
  getCanonicalSlashEntries,
  getCommandFileEntriesSet,
  getSkillDirEntriesSet,
  getSlashEntriesFromCommandFiles,
  getSlashEntriesFromSkillDirs
};
