const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  listSkills,
  loadSkill,
  renderSkillPrompt,
  listCommands,
  loadCommand,
  renderCommandPrompt,
  normalizeSkillName,
} = require('../src/utils/skills-loader');

describe('skills-loader', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chaos-skills-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('name normalization', () => {
    it.each([
      ['commit', 'commit'],
      ['stdd.commit', 'commit'],
      ['/stdd:commit', 'commit'],
      ['  Commit ', 'commit'],
    ])('normalizes %s -> %s', (input, expected) => {
      expect(normalizeSkillName(input)).toBe(expected);
    });
  });

  describe('built-in catalog', () => {
    it('lists the built-in 53 STDD skills', () => {
      const skills = listSkills(tmpDir);
      expect(skills.length).toBeGreaterThanOrEqual(50);
      const names = skills.map(s => s.name);
      expect(names).toContain('commit');
      expect(names).toContain('verify');
    });

    it('parses frontmatter into structured fields', () => {
      const skills = listSkills(tmpDir);
      const commit = skills.find(s => s.name === 'commit');
      expect(commit).toBeDefined();
      expect(commit.description.length).toBeGreaterThan(0);
      expect(commit.source).toBe('builtin');
      expect(commit.phase).toBeDefined();
    });

    it('lists the built-in command templates', () => {
      const cmds = listCommands(tmpDir);
      expect(cmds.length).toBeGreaterThanOrEqual(80);
      expect(cmds.map(c => c.name)).toContain('commit');
    });
  });

  describe('workspace overrides', () => {
    it('a workspace skill with the same name wins over the builtin', () => {
      const wsSkillDir = path.join(tmpDir, 'stdd', 'skills', 'commit');
      fs.mkdirSync(wsSkillDir, { recursive: true });
      fs.writeFileSync(path.join(wsSkillDir, 'SKILL.md'), '---\ndescription: workspace override\n---\nWS body');

      const skill = loadSkill('commit', tmpDir);
      expect(skill.source).toBe('workspace');
      expect(skill.body).toBe('WS body');

      const listed = listSkills(tmpDir).find(s => s.name === 'commit');
      expect(listed.source).toBe('workspace');
    });
  });

  describe('renderSkillPrompt', () => {
    it('substitutes $ARGUMENTS with the provided args', () => {
      const wsSkillDir = path.join(tmpDir, 'stdd', 'skills', 'deploy');
      fs.mkdirSync(wsSkillDir, { recursive: true });
      fs.writeFileSync(path.join(wsSkillDir, 'SKILL.md'), '---\ndescription: d\n---\nDeploy $ARGUMENTS now');

      const rendered = renderSkillPrompt('deploy', 'staging', tmpDir);
      expect(rendered).toContain('[Skill: deploy]');
      expect(rendered).toContain('Deploy staging now');
      expect(rendered).not.toContain('$ARGUMENTS');
    });

    it('strips $ARGUMENTS when no args are given', () => {
      const wsSkillDir = path.join(tmpDir, 'stdd', 'skills', 'deploy');
      fs.mkdirSync(wsSkillDir, { recursive: true });
      fs.writeFileSync(path.join(wsSkillDir, 'SKILL.md'), '---\ndescription: d\n---\nDeploy $ARGUMENTS now');

      const rendered = renderSkillPrompt('deploy', '', tmpDir);
      expect(rendered).toContain('Deploy now');
    });

    it('returns null for unknown skills', () => {
      expect(renderSkillPrompt('no-such-skill', '', tmpDir)).toBeNull();
    });
  });

  describe('command templates', () => {
    it('loads a builtin command and renders its prompt', () => {
      const cmd = loadCommand('commit', tmpDir);
      expect(cmd).not.toBeNull();
      expect(cmd.source).toBe('builtin');
      expect(cmd.body.length).toBeGreaterThan(0);

      const rendered = renderCommandPrompt('commit', 'fix auth', tmpDir);
      expect(rendered).toContain('[Command: commit]');
    });

    it('supports workspace command overrides', () => {
      const wsCmdDir = path.join(tmpDir, 'stdd', 'commands');
      fs.mkdirSync(wsCmdDir, { recursive: true });
      fs.writeFileSync(path.join(wsCmdDir, 'custom.md'), '---\ndescription: my command\n---\nDo $ARGUMENTS');

      const cmd = loadCommand('custom', tmpDir);
      expect(cmd.source).toBe('workspace');
      expect(renderCommandPrompt('custom', 'things', tmpDir)).toContain('Do things');
    });
  });

  describe('malformed frontmatter', () => {
    it('falls back to an empty frontmatter object on bad YAML', () => {
      const wsSkillDir = path.join(tmpDir, 'stdd', 'skills', 'broken');
      fs.mkdirSync(wsSkillDir, { recursive: true });
      fs.writeFileSync(path.join(wsSkillDir, 'SKILL.md'), '---\ndescription: [unclosed\n---\nBody line');

      const skill = loadSkill('broken', tmpDir);
      expect(skill.body).toBe('Body line');
      expect(skill.description).toBe('Body line'); // first body line fallback
    });
  });
});

describe('listing cache and names-only fast path', () => {
  const { skillNames, commandNames, _resetListCache } = require('../src/utils/skills-loader');

  let dir;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chaos-cache-'));
    _resetListCache();
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    _resetListCache();
  });

  it('skillNames lists builtin + workspace without reading SKILL.md bodies', () => {
    const ws = path.join(dir, 'stdd', 'skills', 'custom-one');
    fs.mkdirSync(ws, { recursive: true });
    // NOTE: no SKILL.md at all — names-only path must still surface the dir
    const names = skillNames(dir);
    expect(names.length).toBeGreaterThanOrEqual(51); // 50 builtin + this one
    expect(names).toContain('custom-one');
    expect(names).toContain('commit');
  });

  it('commandNames merges builtin and workspace template names', () => {
    const ws = path.join(dir, 'stdd', 'commands');
    fs.mkdirSync(ws, { recursive: true });
    fs.writeFileSync(path.join(ws, 'mine.md'), '---\ndescription: d\n---\nx');
    const names = commandNames(dir);
    expect(names).toContain('mine');
    expect(names.length).toBeGreaterThanOrEqual(87);
  });

  it('listSkills is TTL-cached (same array reference within the window)', () => {
    const first = listSkills(dir);
    const second = listSkills(dir);
    expect(second).toBe(first); // cache hit — identical reference

    // after a reset the catalog re-scans and sees new entries
    _resetListCache();
    const ws = path.join(dir, 'stdd', 'skills', 'late-arrival');
    fs.mkdirSync(ws, { recursive: true });
    fs.writeFileSync(path.join(ws, 'SKILL.md'), '---\ndescription: d\n---\nbody');
    const third = listSkills(dir);
    expect(third).not.toBe(first);
    expect(third.map(s => s.name)).toContain('late-arrival');
  });

  it('loadSkill stays UNCACHED — a fresh skill loads immediately', () => {
    expect(loadSkill('instant', dir)).toBeNull();
    const ws = path.join(dir, 'stdd', 'skills', 'instant');
    fs.mkdirSync(ws, { recursive: true });
    fs.writeFileSync(path.join(ws, 'SKILL.md'), '---\ndescription: d\n---\nfresh body');
    expect(loadSkill('instant', dir).body).toBe('fresh body');
  });
});
