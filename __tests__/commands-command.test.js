const fs = require('fs');
const { CommandsCommand } = require('../src/cli/commands/commands');

jest.mock('chalk', () => {
  const fn = (...args) => args.join('');
  fn.bold = fn;
  fn.green = fn;
  fn.yellow = fn;
  fn.cyan = fn;
  fn.dim = fn;
  return fn;
});

describe('CommandsCommand', () => {
  let logSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('exports CommandsCommand class', () => {
    expect(CommandsCommand).toBeDefined();
    expect(typeof CommandsCommand).toBe('function');
  });

  it('returns entries from real commands directory', () => {
    const cmd = new CommandsCommand();
    const result = cmd.execute();
    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('title');
    }
  });

  it('outputs JSON when option set', () => {
    const cmd = new CommandsCommand();
    const result = cmd.execute({ json: true });
    expect(Array.isArray(result)).toBe(true);
    const output = logSpy.mock.calls[0][0];
    expect(output).toContain('[');
  });

  it('handles missing commands directory', () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    const cmd = new CommandsCommand();
    const result = cmd.execute();
    expect(result).toEqual([]);
    fs.existsSync.mockRestore();
  });

  it('sorts entries by name', () => {
    const cmd = new CommandsCommand();
    const result = cmd.execute();
    if (result.length >= 2) {
      const names = result.map(e => e.name);
      const sorted = [...names].sort();
      expect(names).toEqual(sorted);
    }
  });

  it('falls back to first heading when no frontmatter description', () => {
    const _origReaddir = fs.readdirSync;
    const origRead = fs.readFileSync;
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'readdirSync').mockReturnValue(['no-desc.md']);
    jest.spyOn(fs, 'readFileSync').mockImplementation((p) => {
      if (typeof p === 'string' && p.endsWith('no-desc.md')) {
        return '# My Custom Command\nSome body text';
      }
      return origRead(p);
    });

    const cmd = new CommandsCommand();
    const result = cmd.execute();
    expect(result[0].title).toBe('My Custom Command');

    fs.existsSync.mockRestore();
    fs.readdirSync.mockRestore();
    fs.readFileSync.mockRestore();
  });

  it('falls back to filename when no heading or description', () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'readdirSync').mockReturnValue(['bare.md']);
    jest.spyOn(fs, 'readFileSync').mockImplementation((p) => {
      if (typeof p === 'string' && p.endsWith('bare.md')) {
        return 'Just some content\nNo heading';
      }
      return fs.readFileSync(p);
    });

    const cmd = new CommandsCommand();
    const result = cmd.execute();
    expect(result[0].title).toBe('bare');

    fs.existsSync.mockRestore();
    fs.readdirSync.mockRestore();
    fs.readFileSync.mockRestore();
  });

  it('outputs formatted list for non-json mode', () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'readdirSync').mockReturnValue(['test.md']);
    jest.spyOn(fs, 'readFileSync').mockImplementation((p) => {
      if (typeof p === 'string' && p.endsWith('test.md')) {
        return 'description: "Test command"';
      }
      return fs.readFileSync(p);
    });

    const cmd = new CommandsCommand();
    const result = cmd.execute();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('test');
    expect(result[0].title).toBe('Test command');

    fs.existsSync.mockRestore();
    fs.readdirSync.mockRestore();
    fs.readFileSync.mockRestore();
  });
});
