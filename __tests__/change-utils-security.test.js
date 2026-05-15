const fs = require('fs');
const os = require('os');
const path = require('path');
const { resolveChangeDir, validateChangeName, ensureInsideDir, findActiveChange, parseTasks, checkTasksCompletion } = require('../src/utils/change-utils');

describe('change-utils security boundaries', () => {
  let root;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-change-utils-'));
    fs.mkdirSync(path.join(root, 'stdd', 'changes', 'safe-change'), { recursive: true });
  });

  test('resolves valid change names inside stdd/changes', () => {
    const stddDir = path.join(root, 'stdd');
    expect(resolveChangeDir(stddDir, 'safe-change')).toBe(path.join(stddDir, 'changes', 'safe-change'));
  });

  test.each(['../evil', '..evil', 'nested/change', '/tmp/evil', 'bad name'])('rejects unsafe change name %s', (name) => {
    expect(() => validateChangeName(name)).toThrow(/Invalid change name/);
  });

  test('returns null for missing safe change names', () => {
    expect(resolveChangeDir(path.join(root, 'stdd'), 'missing-change')).toBeNull();
  });

  test('can resolve a non-existing safe change when mustExist is false', () => {
    const stddDir = path.join(root, 'stdd');
    expect(resolveChangeDir(stddDir, 'new-change', { mustExist: false })).toBe(path.join(stddDir, 'changes', 'new-change'));
  });

  test('rejects missing, too long, and invalid names', () => {
    expect(() => validateChangeName()).toThrow('Change name is required');
    expect(() => validateChangeName('a'.repeat(129))).toThrow('maximum length');
    expect(() => validateChangeName('bad@name')).toThrow('only alphanumeric');
  });

  test('ensureInsideDir accepts children and rejects traversal', () => {
    expect(ensureInsideDir(root, path.join(root, 'child'), 'test path')).toBe(path.join(root, 'child'));
    expect(() => ensureInsideDir(root, path.join(root, '..', 'outside'), 'test path')).toThrow('Unsafe test path');
  });

  test('findActiveChange returns named or first sorted active change', () => {
    fs.mkdirSync(path.join(root, 'stdd', 'changes', 'another-change'), { recursive: true });
    expect(path.basename(findActiveChange(path.join(root, 'stdd'), 'safe-change'))).toBe('safe-change');
    expect(path.basename(findActiveChange(path.join(root, 'stdd')))).toBe('another-change');
  });

  test('findActiveChange returns null when no active changes directory exists', () => {
    expect(findActiveChange(path.join(root, 'missing-stdd'))).toBeNull();
  });

  test('parseTasks extracts checkbox tasks and completion status', () => {
    const tasksPath = path.join(root, 'stdd', 'changes', 'safe-change', 'tasks.md');
    fs.writeFileSync(tasksPath, '- [ ] Pending task\n- [~] In progress\n- [x] Done task\nplain text\n');

    const tasks = parseTasks(tasksPath);
    expect(tasks).toHaveLength(3);
    expect(tasks[0]).toMatchObject({ status: ' ', description: 'Pending task', isDone: false });
    expect(tasks[2]).toMatchObject({ status: 'x', description: 'Done task', isDone: true });
  });

  test('parseTasks returns null for missing files', () => {
    expect(parseTasks(path.join(root, 'missing.md'))).toBeNull();
  });

  test('checkTasksCompletion reports missing, empty, and pending states', () => {
    const changeDir = path.join(root, 'stdd', 'changes', 'safe-change');
    expect(checkTasksCompletion(changeDir)).toMatchObject({ allDone: false, total: 0, done: 0 });

    const tasksPath = path.join(changeDir, 'tasks.md');
    fs.writeFileSync(tasksPath, '# no checkbox tasks\n');
    expect(checkTasksCompletion(changeDir)).toMatchObject({ allDone: true, total: 0, done: 0, pending: [] });

    fs.writeFileSync(tasksPath, '- [ ] Pending task\n- [x] Done task\n');
    expect(checkTasksCompletion(changeDir)).toMatchObject({ allDone: false, total: 2, done: 1, pending: ['Pending task'] });
  });
});
