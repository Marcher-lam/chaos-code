const fs = require('fs');
const path = require('path');

const COMMAND_ONLY_ENTRIES = [
  '/stdd:new',
  '/stdd:ff',
  '/stdd:continue',
  '/stdd:explore'
];

const COMMAND_FILE_BACKED_ENTRIES = [
  '/stdd:init',
  '/stdd:propose',
  '/stdd:clarify',
  '/stdd:confirm',
  '/stdd:spec',
  '/stdd:plan',
  '/stdd:apply',
  '/stdd:execute',
  '/stdd:verify',
  '/stdd:archive',
  '/stdd:final-doc',
  '/stdd:graph',
  '/stdd:brainstorm',
  '/stdd:issue',
  '/stdd:constitution'
];

const SKILL_DRIVEN_ENTRIES = [
  '/stdd:api-spec',
  '/stdd:certainty',
  '/stdd:commit',
  '/stdd:complexity',
  '/stdd:context',
  '/stdd:contract',
  '/stdd:factory',
  '/stdd:guard',
  '/stdd:help',
  '/stdd:iterate',
  '/stdd:learn',
  '/stdd:memory',
  '/stdd:metrics',
  '/stdd:mock',
  '/stdd:mutation',
  '/stdd:outside-in',
  '/stdd:parallel',
  '/stdd:prp',
  '/stdd:roles',
  '/stdd:schema',
  '/stdd:supervisor',
  '/stdd:turbo',
  '/stdd:user-test',
  '/stdd:validate',
  '/stdd:vision'
];

function readFile(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

function getSlashEntriesFromCommandFiles() {
  const dir = path.join(__dirname, '..', '.claude', 'commands', 'stdd');
  return fs.readdirSync(dir)
    .filter(name => name.endsWith('.md'))
    .map(name => `/stdd:${name.replace(/\.md$/, '')}`)
    .sort();
}

function getSlashEntriesFromSkillDirs() {
  const dir = path.join(__dirname, '..', '.claude', 'skills');
  return fs.readdirSync(dir)
    .filter(name => name.startsWith('stdd-'))
    .map(name => `/stdd:${name.replace(/^stdd-/, '')}`)
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

describe('Documentation entry consistency', () => {
  it('keeps the documented command/skill counts in sync with the repository', () => {
    const commandEntries = getSlashEntriesFromCommandFiles();
    const skillEntries = getSlashEntriesFromSkillDirs();

    expect(commandEntries).toHaveLength(19);
    expect(skillEntries).toHaveLength(38);
  });

  it('keeps the slash-entry taxonomy aligned with the repository', () => {
    const commandFileEntries = getCommandFileEntriesSet();
    const skillEntries = getSkillDirEntriesSet();
    const canonicalEntries = getCanonicalSlashEntries();
    const expectedCanonicalEntries = [
      ...COMMAND_ONLY_ENTRIES,
      ...COMMAND_FILE_BACKED_ENTRIES,
      ...SKILL_DRIVEN_ENTRIES
    ].sort();

    expect(expectedCanonicalEntries).toEqual(canonicalEntries);

    for (const entry of COMMAND_ONLY_ENTRIES) {
      expect(commandFileEntries.has(entry)).toBe(true);
      expect(skillEntries.has(entry)).toBe(false);
    }

    for (const entry of COMMAND_FILE_BACKED_ENTRIES) {
      expect(commandFileEntries.has(entry)).toBe(true);
    }

    for (const entry of SKILL_DRIVEN_ENTRIES) {
      expect(skillEntries.has(entry)).toBe(true);
    }
  });

  it('keeps README.md, USAGE.md, and docs/commands.md aligned with canonical slash entries', () => {
    const canonicalEntries = getCanonicalSlashEntries();
    const docsToCheck = ['README.md', 'USAGE.md', 'docs/commands.md'];

    for (const file of docsToCheck) {
      const text = readFile(file);
      const missing = canonicalEntries.filter(entry => !text.includes(entry));

      expect(missing).toEqual([]);
    }
  });

  it('keeps CLAUDE.md taxonomy notes aligned with the repository', () => {
    const text = readFile('CLAUDE.md');

    expect(text).toContain('19 个 /stdd:* 斜杠命令');
    expect(text).toContain('38 个 Skill 定义目录');
    expect(text).toContain('入口 taxonomy（防漂移约定）');
    expect(text).toContain('command-only 快捷入口（4）');
    expect(text).toContain('command-file-backed 入口（15）');
    expect(text).toContain('skill-driven 入口（其余 25 个）');

    for (const entry of [...COMMAND_ONLY_ENTRIES, ...COMMAND_FILE_BACKED_ENTRIES]) {
      expect(text).toContain(entry);
    }
  });
});
