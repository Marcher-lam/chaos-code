const fs = require('fs');
const path = require('path');
const os = require('os');
const { StoryCommand } = require('../src/cli/commands/story');

function setup() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-story-'));
  fs.mkdirSync(path.join(tmp, 'stdd'), { recursive: true });
  return tmp;
}

describe('StoryCommand', () => {
  let tmpDir;
  let cmd;

  beforeEach(() => {
    tmpDir = setup();
    cmd = new StoryCommand(tmpDir);
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  });

  it('should create a story successfully', async () => {
    const story = await cmd.execute('create', 'Implement login form', {
      type: 'feature',
      priority: 'high',
      points: 5,
      description: 'Implement secure login'
    });

    expect(story.id).toMatch(/^STORY-/);
    expect(story.name).toBe('Implement login form');
    expect(story.priority).toBe('high');
    expect(story.points).toBe(5);
    expect(story.status).toBe('backlog');

    const storyPath = path.join(tmpDir, 'stdd', 'stories', `${story.id}.json`);
    expect(fs.existsSync(storyPath)).toBe(true);

    const savedStory = JSON.parse(fs.readFileSync(storyPath, 'utf8'));
    expect(savedStory.name).toBe('Implement login form');
  });

  it('should throw error when creating story without a name', async () => {
    await expect(cmd.execute('create', null)).rejects.toThrow('Story name required');
  });

  it('should list all stories with filters', async () => {
    const story1 = await cmd.execute('create', 'Story 1', { type: 'feature', priority: 'high' });
    const story2 = await cmd.execute('create', 'Story 2', { type: 'bug', priority: 'low' });

    // Mark one story as in-progress to verify status list filters
    await cmd.execute('update', story1.id, { status: 'in-progress' });

    const all = await cmd.execute('list', [], {});
    expect(all.length).toBe(2);

    const inProgress = await cmd.execute('list', [], { status: 'in-progress' });
    expect(inProgress.length).toBe(1);
    expect(inProgress[0].id).toBe(story1.id);

    const bugs = await cmd.execute('list', [], { type: 'bug' });
    expect(bugs.length).toBe(1);
    expect(bugs[0].id).toBe(story2.id);
  });

  it('should list stories and return empty when none found', async () => {
    const list = await cmd.execute('list', [], {});
    expect(list.length).toBe(0);
  });

  it('should update a story', async () => {
    const story = await cmd.execute('create', 'Original Story');
    const updated = await cmd.execute('update', story.id, {
      status: 'done',
      priority: 'low',
      points: 1,
      name: 'Updated Story Name',
      assignee: 'Alice',
      sprint: 'SPRINT-1',
      epic: 'EPIC-1'
    });

    expect(updated.status).toBe('done');
    expect(updated.priority).toBe('low');
    expect(updated.points).toBe(1);
    expect(updated.name).toBe('Updated Story Name');
    expect(updated.assignee).toBe('Alice');
    expect(updated.sprint).toBe('SPRINT-1');
    expect(updated.epic).toBe('EPIC-1');
  });

  it('should throw error when updating with no ID or non-existent ID', async () => {
    await expect(cmd.execute('update', null)).rejects.toThrow('Story ID required');
    await expect(cmd.execute('update', 'STORY-NONEXISTENT')).rejects.toThrow('Story not found');
  });

  it('should split a story into multiple parts', async () => {
    const story = await cmd.execute('create', 'Big Story', { points: 8 });
    const results = await cmd.execute('split', story.id, { parts: 3 });

    expect(results.length).toBe(3);
    expect(results[0].points).toBe(3); // Math.ceil(8 / 3) = 3
    expect(results[0].name).toContain('Big Story (1/3)');

    // Verify original story status is updated to 'split'
    const origPath = path.join(tmpDir, 'stdd', 'stories', `${story.id}.json`);
    const original = JSON.parse(fs.readFileSync(origPath, 'utf8'));
    expect(original.status).toBe('split');
    expect(original.splitInto).toEqual(results.map(r => r.id));
  });

  it('should throw error when splitting with no ID or non-existent ID', async () => {
    await expect(cmd.execute('split', null)).rejects.toThrow('Story ID required');
    await expect(cmd.execute('split', 'STORY-NONEXISTENT')).rejects.toThrow('Story not found');
  });

  it('should create and list epics', async () => {
    // List epics when none exist
    const emptyEpics = await cmd.execute('epic', null);
    expect(Object.keys(emptyEpics).length).toBe(0);

    // Create a new epic
    const epic = await cmd.execute('epic', 'User Management', { description: 'Epic for users' });
    expect(epic.id).toMatch(/^EPIC-/);
    expect(epic.name).toBe('User Management');

    // Create a story associated with the epic
    const story = await cmd.execute('create', 'Story in epic', { epic: 'User Management' });
    const epicsList = await cmd.execute('epic', null);
    expect(epicsList['User Management'].length).toBe(1);
    expect(epicsList['User Management'][0].id).toBe(story.id);
  });

  it('should create and list sprints', async () => {
    // List sprints when none exist
    const emptySprints = await cmd.execute('sprint', null);
    expect(emptySprints.length).toBe(0);

    // Create a new sprint
    const sprint = await cmd.execute('sprint', 'Sprint 1', {
      status: 'active',
      start: '2026-05-26',
      end: '2026-06-09',
      goal: 'Complete auth flow',
      stories: 'STORY-1,STORY-2'
    });

    expect(sprint.id).toMatch(/^SPRINT-/);
    expect(sprint.name).toBe('Sprint 1');
    expect(sprint.stories).toEqual([
      { id: 'STORY-1', status: 'todo' },
      { id: 'STORY-2', status: 'todo' }
    ]);

    // List sprints again
    const sprints = await cmd.execute('sprint', null);
    expect(sprints.length).toBe(1);
    expect(sprints[0].id).toBe(sprint.id);
  });

  it('should render the story board columns', async () => {
    await cmd.execute('create', 'Backlog Story', { type: 'feature' });
    const inProgressStory = await cmd.execute('create', 'In Progress Story');
    await cmd.execute('update', inProgressStory.id, { status: 'in-progress' });

    const board = await cmd.execute('board', {});
    expect(board.backlog.length).toBe(1);
    expect(board['in-progress'].length).toBe(1);
    expect(board.review.length).toBe(0);
    expect(board.done.length).toBe(0);

    // Board with JSON output option
    const boardJson = await cmd.execute('board', { json: true });
    expect(boardJson.backlog.length).toBe(1);
  });

  it('should default to list action when unknown action is passed', async () => {
    const list = await cmd.execute('unknown-action', [], {});
    expect(list.length).toBe(0);
  });
});
