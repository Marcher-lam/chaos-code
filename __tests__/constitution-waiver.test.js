const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');
const { WaiverManager } = require('../src/cli/commands/waiver-manager');

describe('WaiverManager', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-waiver-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('add', () => {
    it('should create waivers.yaml with a new waiver entry', () => {
      const manager = new WaiverManager(tempDir);
      const result = manager.add({
        article: 2,
        reason: 'Migration code',
        days: 7,
      });

      expect(result.article).toBe(2);
      expect(result.days).toBe(7);
      expect(result.validUntil).toBeDefined();

      const waiversPath = path.join(tempDir, 'stdd', 'constitution', 'waivers.yaml');
      expect(fs.existsSync(waiversPath)).toBe(true);

      const content = fs.readFileSync(waiversPath, 'utf8');
      const data = yaml.load(content);
      expect(data.waivers).toHaveLength(1);
      expect(data.waivers[0].article).toBe(2);
      expect(data.waivers[0].reason).toBe('Migration code');
      expect(data.waivers[0].days).toBe(7);
      expect(data.waivers[0].granted_at).toBeDefined();
      expect(data.waivers[0].valid_until).toBeDefined();
    });

    it('should use default 30 days when not specified', () => {
      const manager = new WaiverManager(tempDir);
      const result = manager.add({
        article: 7,
        reason: 'Legacy dependency',
      });

      expect(result.days).toBe(30);
    });

    it('should throw when article already exists without --force', () => {
      const manager = new WaiverManager(tempDir);
      manager.add({ article: 2, reason: 'First reason' });

      expect(() => {
        manager.add({ article: 2, reason: 'Second reason' });
      }).toThrow(/already has a waiver/);
    });

    it('should replace existing waiver when --force is used', () => {
      const manager = new WaiverManager(tempDir);
      manager.add({ article: 2, reason: 'First reason' });

      manager.add({
        article: 2,
        reason: 'Second reason',
        force: true,
      });

      const waiversPath = path.join(tempDir, 'stdd', 'constitution', 'waivers.yaml');
      const content = fs.readFileSync(waiversPath, 'utf8');
      const data = yaml.load(content);

      const article2Waivers = data.waivers.filter(w => w.article === 2);
      expect(article2Waivers).toHaveLength(1);
      expect(article2Waivers[0].reason).toBe('Second reason');
    });

    it('should append waivers for different articles', () => {
      const manager = new WaiverManager(tempDir);
      manager.add({ article: 2, reason: 'TDD waiver' });
      manager.add({ article: 4, reason: 'Style waiver' });

      const waiversPath = path.join(tempDir, 'stdd', 'constitution', 'waivers.yaml');
      const content = fs.readFileSync(waiversPath, 'utf8');
      const data = yaml.load(content);

      expect(data.waivers).toHaveLength(2);
      const articles = data.waivers.map(w => w.article);
      expect(articles).toContain(2);
      expect(articles).toContain(4);
    });

    it('should reject invalid article numbers', () => {
      const manager = new WaiverManager(tempDir);

      expect(() => manager.add({ article: 0, reason: 'test' })).toThrow(/Invalid article/);
      expect(() => manager.add({ article: 10, reason: 'test' })).toThrow(/Invalid article/);
      expect(() => manager.add({ article: 'abc', reason: 'test' })).toThrow(/Invalid article/);
    });

    it('should reject missing reason', () => {
      const manager = new WaiverManager(tempDir);

      expect(() => manager.add({ article: 2 })).toThrow(/reason is required/);
      expect(() => manager.add({ article: 2, reason: '' })).toThrow(/reason is required/);
    });
  });

  describe('list', () => {
    it('should return empty array when no waivers exist', () => {
      const manager = new WaiverManager(tempDir);
      expect(manager.list()).toEqual([]);
    });

    it('should return all waivers', () => {
      const manager = new WaiverManager(tempDir);
      manager.add({ article: 2, reason: 'TDD waiver', days: 14 });
      manager.add({ article: 7, reason: 'Security waiver', days: 30 });

      const waivers = manager.list();
      expect(waivers).toHaveLength(2);
    });
  });

  describe('findByArticle', () => {
    it('should find waivers for a specific article', () => {
      const manager = new WaiverManager(tempDir);
      manager.add({ article: 2, reason: 'First' });
      manager.add({ article: 2, reason: 'Second', force: true });
      manager.add({ article: 4, reason: 'Style' });

      const found = manager.findByArticle(2);
      expect(found).toHaveLength(1);
      expect(found[0].reason).toBe('Second');
    });

    it('should return empty array for article with no waivers', () => {
      const manager = new WaiverManager(tempDir);
      manager.add({ article: 2, reason: 'TDD waiver' });

      expect(manager.findByArticle(7)).toEqual([]);
    });
  });

  describe('remove', () => {
    it('should remove all waivers for an article', () => {
      const manager = new WaiverManager(tempDir);
      manager.add({ article: 2, reason: 'TDD waiver' });
      manager.add({ article: 4, reason: 'Style waiver' });

      const count = manager.remove(2);
      expect(count).toBe(1);

      const waivers = manager.list();
      expect(waivers).toHaveLength(1);
      expect(waivers[0].article).toBe(4);
    });

    it('should throw when article has no waivers', () => {
      const manager = new WaiverManager(tempDir);

      expect(() => manager.remove(2)).toThrow(/No waiver found/);
    });
  });
});

describe('Waiver integration with ConstitutionChecker', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-waiver-integration-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should skip TDD check after waiver is added via WaiverManager', () => {
    const { ConstitutionChecker } = require('../src/cli/commands/constitution-checker');

    const srcDir = path.join(tempDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'no-test.js'), 'exports.foo = () => 1;\n');

    const manager = new WaiverManager(tempDir);
    manager.add({ article: 2, reason: 'Integration test waiver', days: 30 });

    const checker = new ConstitutionChecker(tempDir);
    const issues = checker.run();

    const tddBlocking = issues.blocking.filter(i => i.article === 2);
    expect(tddBlocking).toHaveLength(0);

    const tddSkipped = issues.skipped.filter(i => i.article === 2);
    expect(tddSkipped.length).toBeGreaterThanOrEqual(1);
  });

  it('should skip Security check after waiver is added via WaiverManager', () => {
    const { ConstitutionChecker } = require('../src/cli/commands/constitution-checker');

    const srcDir = path.join(tempDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(
      path.join(srcDir, 'config.js'),
      "const password = 'secret123';\nmodule.exports = {};\n"
    );

    const manager = new WaiverManager(tempDir);
    manager.add({ article: 7, reason: 'Legacy config waiver', days: 7 });

    const checker = new ConstitutionChecker(tempDir);
    const issues = checker.run();

    const secBlocking = issues.blocking.filter(i => i.article === 7);
    expect(secBlocking).toHaveLength(0);

    const secSkipped = issues.skipped.filter(i => i.article === 7);
    expect(secSkipped.length).toBeGreaterThanOrEqual(1);
  });

  it('should not skip check when waiver has expired', () => {
    const { ConstitutionChecker } = require('../src/cli/commands/constitution-checker');

    const srcDir = path.join(tempDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'no-test.js'), 'exports.foo = () => 1;\n');

    const waiverDir = path.join(tempDir, 'stdd', 'constitution');
    fs.mkdirSync(waiverDir, { recursive: true });

    const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const pastValidUntil = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

    fs.writeFileSync(
      path.join(waiverDir, 'waivers.yaml'),
      yaml.dump({
        waivers: [{
          article: 2,
          reason: 'Expired waiver',
          days: 5,
          granted_at: pastDate,
          valid_until: pastValidUntil,
        }],
      })
    );

    const checker = new ConstitutionChecker(tempDir);
    const issues = checker.run();

    const tddBlocking = issues.blocking.filter(i => i.article === 2);
    expect(tddBlocking.length).toBeGreaterThanOrEqual(1);
  });

  it('should recognize waiver using valid_until without days', () => {
    const { ConstitutionChecker } = require('../src/cli/commands/constitution-checker');

    const srcDir = path.join(tempDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'no-test.js'), 'exports.foo = () => 1;\n');

    const waiverDir = path.join(tempDir, 'stdd', 'constitution');
    fs.mkdirSync(waiverDir, { recursive: true });

    const futureUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    fs.writeFileSync(
      path.join(waiverDir, 'waivers.yaml'),
      yaml.dump({
        waivers: [{
          article: 2,
          reason: 'Future valid_until waiver',
          valid_until: futureUntil,
        }],
      })
    );

    const checker = new ConstitutionChecker(tempDir);
    const issues = checker.run();

    const tddBlocking = issues.blocking.filter(i => i.article === 2);
    expect(tddBlocking).toHaveLength(0);
  });

  it('should skip Documentation check after waiver is added via WaiverManager', () => {
    const { ConstitutionChecker } = require('../src/cli/commands/constitution-checker');

    const srcDir = path.join(tempDir, 'src');
    fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
    fs.writeFileSync(
      path.join(srcDir, 'undocumented.js'),
      'export function undocumentedFn() {}\n'
    );
    fs.writeFileSync(path.join(srcDir, '__tests__', 'undocumented.test.js'), 'test("ok", () => {});\n');

    const manager = new WaiverManager(tempDir);
    manager.add({ article: 5, reason: 'Legacy docs waiver', days: 30 });

    const checker = new ConstitutionChecker(tempDir);
    const issues = checker.run();

    const docWarnings = issues.warning.filter(i => i.article === 5);
    expect(docWarnings).toHaveLength(0);

    const docSkipped = issues.skipped.filter(i => i.article === 5);
    expect(docSkipped.length).toBeGreaterThanOrEqual(1);
  });
});
