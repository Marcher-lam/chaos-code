const fs = require('fs');
const path = require('path');
const os = require('os');
const { WaiverManager } = require('../src/cli/commands/waiver-manager');

function setup() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-waiver-'));
  return tmp;
}

describe('WaiverManager', () => {
  it('list returns empty when no waivers', () => {
    const tmp = setup();
    const mgr = new WaiverManager(tmp);
    expect(mgr.list()).toEqual([]);
  });

  it('add creates waiver with validUntil', () => {
    const tmp = setup();
    const mgr = new WaiverManager(tmp);
    const result = mgr.add({ article: 2, reason: 'Legacy migration', days: 7 });
    expect(result.article).toBe(2);
    expect(result.validUntil).toBeDefined();
    expect(result.days).toBe(7);
  });

  it('add uses default 30 days', () => {
    const tmp = setup();
    const mgr = new WaiverManager(tmp);
    const result = mgr.add({ article: 3, reason: 'test' });
    expect(result.days).toBe(30);
  });

  it('add throws on invalid article range', () => {
    const tmp = setup();
    const mgr = new WaiverManager(tmp);
    expect(() => mgr.add({ article: 0, reason: 'test' })).toThrow();
    expect(() => mgr.add({ article: 10, reason: 'test' })).toThrow();
  });

  it('add throws on duplicate without force', () => {
    const tmp = setup();
    const mgr = new WaiverManager(tmp);
    mgr.add({ article: 2, reason: 'first' });
    expect(() => mgr.add({ article: 2, reason: 'second' })).toThrow();
  });

  it('add with force replaces existing', () => {
    const tmp = setup();
    const mgr = new WaiverManager(tmp);
    mgr.add({ article: 2, reason: 'first' });
    mgr.add({ article: 2, reason: 'second', force: true });
    const waivers = mgr.list();
    expect(waivers).toHaveLength(1);
    expect(waivers[0].reason).toBe('second');
  });

  it('findByArticle returns matching waiver', () => {
    const tmp = setup();
    const mgr = new WaiverManager(tmp);
    mgr.add({ article: 2, reason: 'test' });
    mgr.add({ article: 5, reason: 'docs' });
    const found = mgr.findByArticle(5);
    expect(found).toHaveLength(1);
    expect(found[0].article).toBe(5);
  });

  it('remove deletes waiver and returns count', () => {
    const tmp = setup();
    const mgr = new WaiverManager(tmp);
    mgr.add({ article: 2, reason: 'test' });
    const result = mgr.remove(2);
    expect(result).toBe(1);
    expect(mgr.list()).toHaveLength(0);
  });

  it('remove throws on missing waiver', () => {
    const tmp = setup();
    const mgr = new WaiverManager(tmp);
    expect(() => mgr.remove(2)).toThrow();
  });
});
