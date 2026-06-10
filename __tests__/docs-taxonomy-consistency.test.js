const {
  COMMAND_ONLY_ENTRIES,
  COMMAND_FILE_BACKED_ENTRIES,
  SKILL_DRIVEN_ENTRIES,
  readFile,
  getCanonicalSlashEntries,
  getCommandFileEntriesSet,
  getSkillDirEntriesSet,
  getSlashEntriesFromCommandFiles,
  getSlashEntriesFromSkillDirs
} = require('../test-support/docs-contracts');

describe('Documentation taxonomy consistency', () => {
  it('keeps the documented command/skill counts in sync with the repository', () => {
    const commandEntries = getSlashEntriesFromCommandFiles();
    const skillEntries = getSlashEntriesFromSkillDirs();

    expect(commandEntries).toHaveLength(86);
    expect(skillEntries).toHaveLength(53);
  });

  it('keeps the slash-entry taxonomy aligned with the repository', () => {
    const commandFileEntries = getCommandFileEntriesSet();
    const skillEntries = getSkillDirEntriesSet();
    const canonicalEntries = getCanonicalSlashEntries();
    const expectedCanonicalEntries = [
      ...new Set([
        ...COMMAND_ONLY_ENTRIES,
        ...COMMAND_FILE_BACKED_ENTRIES,
        ...SKILL_DRIVEN_ENTRIES
      ])
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



  it('keeps README.md taxonomy notes aligned with the repository', () => {
    const text = readFile('README.md');

    expect(text).toContain('86 个');
    expect(text).toContain('53 个');
    expect(text).toContain('86 个');
    expect(text).toContain('命令模板');
    expect(text).toContain('Skill 模板');

    // Spot-check a representative sample of entries
    const sample = ['/stdd:init', '/stdd:apply', '/stdd:verify', '/stdd:archive',
                    '/stdd:spec', '/stdd:plan', '/stdd:propose', '/stdd:turbo'];
    for (const entry of sample) {
      expect(text).toContain(entry);
    }
  });

});
