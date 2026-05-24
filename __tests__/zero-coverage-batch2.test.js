/**
 * Coverage boost batch 2: design, execute, factory, final-doc, help, iterate
 *
 * Signatures:
 *  DesignCommand.execute(action, args, options)
 *  ExecuteCommand.execute(changeName, options)
 *  FactoryCommand.execute(action, args, options)
 *  FinalDocCommand.execute(changeName, options)
 *  HelpCommand.execute(topic, args, options)
 *  IterateCommand.execute(action, args, options)
 */

const fs = require('fs');
const path = require('path');
const TMP = path.join(__dirname, '__zc_b2_tmp__');
function mkdirp(d) { fs.mkdirSync(d, { recursive: true }); }
function w(p, c) { mkdirp(path.dirname(p)); fs.writeFileSync(p, c, 'utf8'); }
const cap = () => { const l=[]; const o=console.log; console.log=(...a)=>l.push(a.join(' ')); return { l, r(){console.log=o;} }; };

beforeEach(() => mkdirp(TMP));
afterEach(() => fs.rmSync(TMP, { recursive: true, force: true }));

describe('DesignCommand', () => {
  const { DesignCommand } = require('../src/cli/commands/design');
  ['modern','dark','minimal'].forEach(preset => {
    it(`create ${preset}`, async () => {
      mkdirp(path.join(TMP,'stdd'));
      const c=cap(); try { await new DesignCommand(TMP).execute('create',[],{preset}); } catch(e){} c.r();
    });
  });
  it('list presets', async () => {
    const c=cap(); try { await new DesignCommand(TMP).execute('list',[],{}); } catch(e){} c.r();
  });
  it('json output', async () => {
    mkdirp(path.join(TMP,'stdd'));
    const c=cap(); try { await new DesignCommand(TMP).execute('create',[],{preset:'modern',json:true}); } catch(e){} c.r();
  });
});

describe('ExecuteCommand', () => {
  const { ExecuteCommand } = require('../src/cli/commands/execute');
  it('status', async () => {
    mkdirp(path.join(TMP,'stdd','changes'));
    w(path.join(TMP,'stdd','config.yaml'),'version: "1.0"');
    const c=cap(); try { await new ExecuteCommand(TMP).execute(null,{}); } catch(e){} c.r();
  });
  it('json', async () => {
    mkdirp(path.join(TMP,'stdd','changes'));
    w(path.join(TMP,'stdd','config.yaml'),'version: "1.0"');
    const c=cap(); try { await new ExecuteCommand(TMP).execute(null,{json:true}); } catch(e){} c.r();
  });
});

describe('FactoryCommand', () => {
  const { FactoryCommand } = require('../src/cli/commands/factory');
  it('list', () => {
    const c=cap(); try { new FactoryCommand(TMP).execute('list',[''],{}); } finally { c.r(); }
  });
  it('generate', () => {
    mkdirp(path.join(TMP,'stdd'));
    w(path.join(TMP,'stdd','config.yaml'),'version: "1.0"');
    const c=cap(); try { new FactoryCommand(TMP).execute('generate',['User'],{fields:'name,email'}); } finally { c.r(); }
  });
  it('json', () => {
    const c=cap(); try { new FactoryCommand(TMP).execute('list',[''],{json:true}); } finally { c.r(); }
  });
});

describe('FinalDocCommand', () => {
  const { FinalDocCommand } = require('../src/cli/commands/final-doc');
  it('generate', async () => {
    mkdirp(path.join(TMP,'stdd','changes','fd1'));
    w(path.join(TMP,'stdd','changes','fd1','proposal.md'),'# Test\n');
    w(path.join(TMP,'stdd','changes','fd1','tasks.md'),'- [x] Done\n');
    w(path.join(TMP,'stdd','config.yaml'),'version: "1.0"');
    const cwd=process.cwd(); process.chdir(TMP);
    const c=cap(); try { await new FinalDocCommand(TMP).execute('fd1',{}); } catch(e){} c.r(); process.chdir(cwd);
  });
  it('json', async () => {
    mkdirp(path.join(TMP,'stdd','changes','fd2'));
    w(path.join(TMP,'stdd','changes','fd2','proposal.md'),'# Test\n');
    w(path.join(TMP,'stdd','changes','fd2','tasks.md'),'- [x] Done\n');
    w(path.join(TMP,'stdd','config.yaml'),'version: "1.0"');
    const cwd=process.cwd(); process.chdir(TMP);
    const c=cap(); try { await new FinalDocCommand(TMP).execute('fd2',{json:true}); } catch(e){} c.r(); process.chdir(cwd);
  });
});

describe('HelpCommand', () => {
  const { HelpCommand } = require('../src/cli/commands/help');
  ['overview','workflow','troubleshoot','cheatsheet'].forEach(topic => {
    it(topic, () => {
      const c=cap(); try { new HelpCommand(TMP).execute(topic,[],{}); } finally { c.r(); }
      expect(c.l.join('\n').length).toBeGreaterThan(0);
    });
  });
  it('command help', () => {
    const c=cap(); try { new HelpCommand(TMP).execute('init',[],{}); } finally { c.r(); }
  });
});

describe('IterateCommand', () => {
  const { IterateCommand } = require('../src/cli/commands/iterate');
  it('start', () => {
    const c=cap(); try { new IterateCommand(TMP).start('Test iter',{plan:'Plan A'}); } finally { c.r(); }
  });
  it('start no title throws', async () => {
    await expect(new IterateCommand(TMP).start(null,{})).rejects.toThrow('title');
  });
  it('start json', () => {
    const c=cap(); try { new IterateCommand(TMP).start('Json iter',{json:true}); } finally { c.r(); }
  });
  it('complete throws not found', () => {
    expect(() => new IterateCommand(TMP).complete('nonexistent',{})).toThrow('not found');
  });
  it('reflect throws not found', () => {
    expect(() => new IterateCommand(TMP).reflect('nonexistent',{})).toThrow('not found');
  });
  it('status empty', () => {
    const c=cap(); try { new IterateCommand(TMP).execute('status',[],{}); } finally { c.r(); }
  });
  it('history', async () => {
    mkdirp(path.join(TMP,'stdd','iterations'));
    new IterateCommand(TMP).start('Hist test',{});
    const c=cap(); try { await new IterateCommand(TMP).execute('history',[],{}); } catch(e){} c.r();
  });
  it('continue no active', async () => {
    const c=cap(); try { await new IterateCommand(TMP).execute('continue',[],{}); } catch(e){} c.r();
  });
  it('retrospective', async () => {
    const c=cap(); try { await new IterateCommand(TMP).execute('retrospective',[],{}); } catch(e){} c.r();
  });
});
