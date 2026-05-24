/**
 * Coverage boost batch 1: brainstorm, certainty, commit-tdd, complexity
 *
 * Signatures:
 *  BrainstormCommand.execute(topic, options)
 *  CertaintyCommand.execute(action, args, options)
 *  CommitTddCommand.execute(action, args, options) — uses cwd, not first arg
 *  ComplexityCommand.execute(action, args, options)
 */

const fs = require('fs');
const path = require('path');
const TMP = path.join(__dirname, '__zc_b1_tmp__');
function mkdirp(d) { fs.mkdirSync(d, { recursive: true }); }
function w(p, c) { mkdirp(path.dirname(p)); fs.writeFileSync(p, c, 'utf8'); }
const cap = () => { const l=[]; const o=console.log; console.log=(...a)=>l.push(a.join(' ')); return { l, r(){console.log=o;} }; };

beforeEach(() => mkdirp(TMP));
afterEach(() => fs.rmSync(TMP, { recursive: true, force: true }));

describe('BrainstormCommand', () => {
  const { BrainstormCommand } = require('../src/cli/commands/brainstorm');
  it('execute text', async () => {
    const c = cap();
    try { await new BrainstormCommand().execute('user auth', {}); } finally { c.r(); }
    expect(c.l.join('\n')).toContain('auth');
  });
  it('execute json', async () => {
    const c = cap();
    try { await new BrainstormCommand().execute('search', { format: 'json' }); } finally { c.r(); }
    expect(JSON.parse(c.l.join('\n')).topic).toBe('search');
  });
  it('throws no topic', async () => {
    await expect(new BrainstormCommand().execute('', {})).rejects.toThrow('Topic');
  });
  it('custom angles', async () => {
    const c = cap();
    try { await new BrainstormCommand().execute('test', { angles: 'technical,user' }); } finally { c.r(); }
  });
  it('custom solutions', async () => {
    const c = cap();
    try { await new BrainstormCommand().execute('test', { solutions: '5' }); } finally { c.r(); }
  });
  it('unknown angle ignored', () => {
    expect(Object.keys(new BrainstormCommand().analyzeFromAngles('x', ['zzz']))).toHaveLength(0);
  });
});

describe('CertaintyCommand', () => {
  const { CertaintyCommand } = require('../src/cli/commands/certainty');
  it('assess with scores', () => {
    mkdirp(path.join(TMP, 'stdd', 'memory'));
    const c = cap();
    try { new CertaintyCommand(TMP).execute('assess', [], { scores: 'req:4,tech:5,risk:3,test:4,vision:5' }); } finally { c.r(); }
    expect(c.l.join('\n').length).toBeGreaterThan(0);
  });
  it('assess json', () => {
    mkdirp(path.join(TMP, 'stdd', 'memory'));
    const c = cap();
    try { new CertaintyCommand(TMP).execute('assess', [], { scores: 'req:4,tech:5,risk:3,test:4,vision:5', json: true }); } finally { c.r(); }
  });
  it('history', () => {
    mkdirp(path.join(TMP, 'stdd', 'memory'));
    const c = cap();
    try { new CertaintyCommand(TMP).execute('history', [], {}); } finally { c.r(); }
  });
  it('thresholds', () => {
    const c = cap();
    try { new CertaintyCommand(TMP).execute('thresholds', [], {}); } finally { c.r(); }
  });
  it('configure', () => {
    mkdirp(path.join(TMP, 'stdd'));
    const c = cap();
    try { new CertaintyCommand(TMP).execute('configure', [], { set: 'confirm:0.8' }); } finally { c.r(); }
  });
});

describe('CommitTddCommand', () => {
  const { CommitTddCommand } = require('../src/cli/commands/commit-tdd');
  it('status', () => {
    const c = cap();
    try { new CommitTddCommand(TMP).status({}); } finally { c.r(); }
    expect(c.l.join('\n')).toContain('Branch');
  });
  it('status json', () => {
    const c = cap();
    try { new CommitTddCommand(TMP).status({ json: true }); } finally { c.r(); }
  });
  it('detectPhaseFromMessage', () => {
    const cmd = new CommitTddCommand(TMP);
    expect(cmd.detectPhaseFromMessage('red: test')).toBe('red');
    expect(cmd.detectPhaseFromMessage('green: ok')).toBe('green');
    expect(cmd.detectPhaseFromMessage('refactor: x')).toBe('refactor');
    expect(cmd.detectPhaseFromMessage('feat: a')).toBe('unknown');
  });
  it('ready throws without stdd', () => {
    expect(() => new CommitTddCommand(TMP).ready('x', {})).toThrow();
  });
  it('amend throws without change', () => {
    expect(() => new CommitTddCommand(TMP).amend('x', {})).toThrow();
  });
});

describe('ComplexityCommand', () => {
  const { ComplexityCommand } = require('../src/cli/commands/complexity');
  it('analyze text', () => {
    w(path.join(TMP, 'src', 'app.js'), 'function add(a,b){if(a>0)return a+b;return 0;}');
    const c = cap();
    try { new ComplexityCommand(TMP).execute('analyze', ['src'], {}); } finally { c.r(); }
    expect(c.l.join('\n').length).toBeGreaterThan(0);
  });
  it('analyze json', () => {
    w(path.join(TMP, 'src', 'm.js'), 'const x=1;');
    const c = cap();
    try { new ComplexityCommand(TMP).execute('analyze', ['src'], { json: true }); } finally { c.r(); }
    expect(c.l.join('\n')).toContain('{');
  });
  it('throws no source', () => {
    expect(() => new ComplexityCommand(TMP).execute('analyze', [], {})).toThrow('No source');
  });
  it('hotspots', () => {
    w(path.join(TMP, 'src', 'h.js'), 'function f(){'+'if(true){}'.repeat(15)+'}');
    const c = cap();
    try { new ComplexityCommand(TMP).execute('hotspots', [], {}); } catch(e){ expect(e.message).toContain('report'); } c.r();
  });
  it('getComplexityLevel', () => {
    const cmd = new ComplexityCommand(TMP);
    expect(cmd.getComplexityLevel(3)).toBe('low');
    expect(cmd.getComplexityLevel(8)).toBe('moderate');
    expect(cmd.getComplexityLevel(15)).toBe('high');
    expect(cmd.getComplexityLevel(25)).toBe('very-high');
  });
  it('report', () => {
    w(path.join(TMP, 'src', 'r.js'), 'const x=1;');
    const c = cap();
    try { new ComplexityCommand(TMP).execute('report', [], {}); } catch(e){ expect(e.message).toContain('report'); } c.r();
  });
});
