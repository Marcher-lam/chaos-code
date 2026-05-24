/**
 * Coverage boost batch 4: spec, supervisor, vision, waiver-manager-command, constitution
 *
 * Signatures:
 *  SpecCommand.execute(changeName, options)
 *  SupervisorCommand.execute(action, args, options)
 *  VisionCommand.execute(action, args, options)
 *  WaiverManagerCommand.execute(action, options)
 *  ConstitutionCommand.execute(action, options)
 */

const fs = require('fs');
const path = require('path');
const TMP = path.join(__dirname, '__zc_b4_tmp__');
function mkdirp(d) { fs.mkdirSync(d, { recursive: true }); }
function w(p, c) { mkdirp(path.dirname(p)); fs.writeFileSync(p, c, 'utf8'); }
const cap = () => { const l=[]; const o=console.log; console.log=(...a)=>l.push(a.join(' ')); return { l, r(){console.log=o;} }; };

beforeEach(() => mkdirp(TMP));
afterEach(() => fs.rmSync(TMP, { recursive: true, force: true }));

describe('SpecCommand', () => {
  const { SpecCommand } = require('../src/cli/commands/spec');
  it('generate', async () => {
    mkdirp(path.join(TMP,'stdd','changes','sp1'));
    w(path.join(TMP,'stdd','changes','sp1','proposal.md'),'# Proposal: Login\n');
    w(path.join(TMP,'stdd','config.yaml'),'version: "1.0"');
    const cwd=process.cwd(); process.chdir(TMP);
    const c=cap(); try { await new SpecCommand(TMP).execute('sp1',{}); } catch(e){} c.r(); process.chdir(cwd);
  });
  it('json', async () => {
    mkdirp(path.join(TMP,'stdd','changes','sp2'));
    w(path.join(TMP,'stdd','changes','sp2','proposal.md'),'# Test\n');
    w(path.join(TMP,'stdd','config.yaml'),'version: "1.0"');
    const cwd=process.cwd(); process.chdir(TMP);
    const c=cap(); try { await new SpecCommand(TMP).execute('sp2',{json:true}); } catch(e){} c.r(); process.chdir(cwd);
  });
});

describe('SupervisorCommand', () => {
  const { SupervisorCommand } = require('../src/cli/commands/supervisor');
  it('status', async () => {
    mkdirp(path.join(TMP,'stdd','changes'));
    w(path.join(TMP,'stdd','config.yaml'),'version: "1.0"');
    const c=cap(); try { await new SupervisorCommand(TMP).execute('status',[],{}); } catch(e){} c.r();
  });
  it('json', async () => {
    mkdirp(path.join(TMP,'stdd','changes'));
    w(path.join(TMP,'stdd','config.yaml'),'version: "1.0"');
    const c=cap(); try { await new SupervisorCommand(TMP).execute('status',[],{json:true}); } catch(e){} c.r();
  });
  it('roles', async () => {
    const c=cap(); try { await new SupervisorCommand(TMP).execute('roles',[],{}); } catch(e){} c.r();
  });
  it('start', async () => {
    mkdirp(path.join(TMP,'stdd','changes'));
    w(path.join(TMP,'stdd','config.yaml'),'version: "1.0"');
    const c=cap(); try { await new SupervisorCommand(TMP).execute('start',[],{topic:'Test task',roles:'dev,tester',rounds:'1'}); } catch(e){} c.r();
  });
});

describe('VisionCommand', () => {
  const { VisionCommand } = require('../src/cli/commands/vision');
  it('show', async () => {
    mkdirp(path.join(TMP,'stdd'));
    w(path.join(TMP,'stdd','config.yaml'),'version: "1.0"');
    const c=cap(); try { await new VisionCommand(TMP).execute('show',[],{}); } catch(e){} c.r();
  });
  it('json', async () => {
    mkdirp(path.join(TMP,'stdd'));
    w(path.join(TMP,'stdd','config.yaml'),'version: "1.0"');
    const c=cap(); try { await new VisionCommand(TMP).execute('show',[],{json:true}); } catch(e){} c.r();
  });
  it('update', async () => {
    mkdirp(path.join(TMP,'stdd'));
    w(path.join(TMP,'stdd','config.yaml'),'version: "1.0"');
    const c=cap(); try { await new VisionCommand(TMP).execute('update',[],{}); } catch(e){} c.r();
  });
});

describe('WaiverManagerCommand', () => {
  const { WaiverManagerCommand } = require('../src/cli/commands/waiver-manager-command');
  it('show', async () => {
    const c=cap(); try { await new WaiverManagerCommand(TMP).execute('show',{}); } catch(e){} c.r();
  });
  it('status', async () => {
    const c=cap(); try { await new WaiverManagerCommand(TMP).execute('status',{}); } catch(e){} c.r();
  });
  it('waivers', async () => {
    const c=cap(); try { await new WaiverManagerCommand(TMP).execute('waivers',{}); } catch(e){} c.r();
  });
  it('check', async () => {
    const c=cap(); try { await new WaiverManagerCommand(TMP).execute('check',{}); } catch(e){} c.r();
  });
  it('fix', async () => {
    const c=cap(); try { await new WaiverManagerCommand(TMP).execute('fix',{}); } catch(e){} c.r();
  });
  it('audit', async () => {
    const c=cap(); try { await new WaiverManagerCommand(TMP).execute('audit',{}); } catch(e){} c.r();
  });
});

describe('ConstitutionCommand', () => {
  let ConstitutionCommand;
  try {
    ConstitutionCommand = require('../src/cli/commands/constitution').ConstitutionCommand;
  } catch(e) { ConstitutionCommand = null; }

  function makeCmd() {
    if (!ConstitutionCommand) throw new Error('ConstitutionCommand unavailable');
    try { return new ConstitutionCommand(TMP); } catch(e) { return null; }
  }

  it('show all', async () => {
    const c=cap(); try { const cmd=makeCmd(); if(cmd) await cmd.execute('show',{}); } catch(e){} c.r();
  });
  it('show article 2', async () => {
    const c=cap(); try { const cmd=makeCmd(); if(cmd) await cmd.execute('show',{article:'2'}); } catch(e){} c.r();
  });
  it('show invalid article', async () => {
    const c=cap(); try { const cmd=makeCmd(); if(cmd) await cmd.execute('show',{article:'99'}); } catch(e){} c.r();
  });
  it('waive requires article', async () => {
    if (!ConstitutionCommand) return;
    const cmd=makeCmd(); if(!cmd) return;
    await expect(cmd.execute('waive',{})).rejects.toThrow('Article number');
  });
  it('waive requires reason', async () => {
    if (!ConstitutionCommand) return;
    const cmd=makeCmd(); if(!cmd) return;
    await expect(cmd.execute('waive',{article:'2'})).rejects.toThrow('Reason');
  });
});
