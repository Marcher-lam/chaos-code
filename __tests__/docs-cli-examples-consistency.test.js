const { CANONICAL_CLI_ENTRIES, readFile } = require('../test-support/docs-contracts');

const CHINESE_CLI_DOCS = [
  'USAGE.md'
];

const ENGLISH_CLI_DOCS = [
  'USAGE_EN.md'
];

describe('Documentation CLI example consistency', () => {
  it('keeps Chinese CLI documentation aligned with the canonical CLI entries', () => {
    for (const file of CHINESE_CLI_DOCS) {
      const text = readFile(file);
      const missing = CANONICAL_CLI_ENTRIES.filter(entry => !text.includes(entry));

      expect(missing).toEqual([]);
    }
  });

  it('keeps English CLI documentation aligned with the canonical CLI entries', () => {
    for (const file of ENGLISH_CLI_DOCS) {
      const text = readFile(file);
      const missing = CANONICAL_CLI_ENTRIES.filter(entry => !text.includes(entry));

      expect(missing).toEqual([]);
    }
  });
});

