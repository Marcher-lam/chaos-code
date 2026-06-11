const { ChaosAgentLoop } = require('../src/runtime/agent-kernel/chaos-agent-loop');
const { AgentKernel } = require('../src/runtime/agent-kernel/index');

jest.mock('../src/runtime/agent-kernel/index');

describe('Task Management Tools', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.STDD_LLM_API_KEY = 'test-key';
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('task_create', () => {
    test('should create a task with subject and description', () => {
      const agent = new ChaosAgentLoop();
      const result = agent._executeTaskCreate({
        subject: 'Fix auth bug',
        description: 'Fix the authentication bug in login flow',
      });

      expect(result.status).toBe('ok');
      expect(result.task.id).toBe('1');
      expect(result.task.subject).toBe('Fix auth bug');
      expect(result.task.status).toBe('pending');
    });

    test('should create multiple tasks with incrementing IDs', () => {
      const agent = new ChaosAgentLoop();
      const r1 = agent._executeTaskCreate({ subject: 'Task 1', description: 'First' });
      const r2 = agent._executeTaskCreate({ subject: 'Task 2', description: 'Second' });
      const r3 = agent._executeTaskCreate({ subject: 'Task 3', description: 'Third' });

      expect(r1.task.id).toBe('1');
      expect(r2.task.id).toBe('2');
      expect(r3.task.id).toBe('3');
    });

    test('should store activeForm when provided', () => {
      const agent = new ChaosAgentLoop();
      agent._executeTaskCreate({
        subject: 'Fix auth bug',
        description: 'Fix the auth bug',
        activeForm: 'Fixing auth bug',
      });

      const list = agent._executeTaskList();
      expect(list.tasks[0].activeForm).toBe('Fixing auth bug');
    });

    test('should require subject', () => {
      const agent = new ChaosAgentLoop();
      const result = agent._executeTaskCreate({ description: 'No subject' });
      expect(result.status).toBe('error');
      expect(result.error).toContain('subject');
    });

    test('should require description', () => {
      const agent = new ChaosAgentLoop();
      const result = agent._executeTaskCreate({ subject: 'No desc' });
      expect(result.status).toBe('error');
      expect(result.error).toContain('description');
    });
  });

  describe('task_update', () => {
    test('should update task status to in_progress', () => {
      const agent = new ChaosAgentLoop();
      agent._executeTaskCreate({ subject: 'Task', description: 'Test' });

      const result = agent._executeTaskUpdate({ id: '1', status: 'in_progress' });
      expect(result.status).toBe('ok');
      expect(result.task.status).toBe('in_progress');
    });

    test('should update task status to completed', () => {
      const agent = new ChaosAgentLoop();
      agent._executeTaskCreate({ subject: 'Task', description: 'Test' });

      agent._executeTaskUpdate({ id: '1', status: 'in_progress' });
      const result = agent._executeTaskUpdate({ id: '1', status: 'completed' });
      expect(result.task.status).toBe('completed');
    });

    test('should delete a task', () => {
      const agent = new ChaosAgentLoop();
      agent._executeTaskCreate({ subject: 'Task', description: 'Test' });

      const result = agent._executeTaskUpdate({ id: '1', status: 'deleted' });
      expect(result.status).toBe('ok');

      // Deleted tasks should not appear in list
      const list = agent._executeTaskList();
      expect(list.count).toBe(0);
    });

    test('should reject invalid status', () => {
      const agent = new ChaosAgentLoop();
      agent._executeTaskCreate({ subject: 'Task', description: 'Test' });

      const result = agent._executeTaskUpdate({ id: '1', status: 'unknown' });
      expect(result.status).toBe('error');
      expect(result.error).toContain('Invalid status');
    });

    test('should update subject and description', () => {
      const agent = new ChaosAgentLoop();
      agent._executeTaskCreate({ subject: 'Old', description: 'Old desc' });

      const result = agent._executeTaskUpdate({
        id: '1',
        subject: 'New Subject',
        description: 'New Description',
      });
      expect(result.task.subject).toBe('New Subject');
    });

    test('should return error for non-existent task', () => {
      const agent = new ChaosAgentLoop();
      const result = agent._executeTaskUpdate({ id: '99', status: 'completed' });
      expect(result.status).toBe('error');
      expect(result.error).toContain('not found');
    });

    test('should return error for deleted task', () => {
      const agent = new ChaosAgentLoop();
      agent._executeTaskCreate({ subject: 'Task', description: 'Test' });
      agent._executeTaskUpdate({ id: '1', status: 'deleted' });

      const result = agent._executeTaskUpdate({ id: '1', status: 'in_progress' });
      expect(result.status).toBe('error');
      expect(result.error).toContain('deleted');
    });

    test('should require id', () => {
      const agent = new ChaosAgentLoop();
      const result = agent._executeTaskUpdate({ status: 'completed' });
      expect(result.status).toBe('error');
      expect(result.error).toContain('id');
    });

    test('should add blockedBy dependencies', () => {
      const agent = new ChaosAgentLoop();
      agent._executeTaskCreate({ subject: 'Task 1', description: 'First' });
      agent._executeTaskCreate({ subject: 'Task 2', description: 'Second' });

      const result = agent._executeTaskUpdate({ id: '2', addBlockedBy: ['1'] });
      expect(result.status).toBe('ok');

      const list = agent._executeTaskList();
      const task2 = list.tasks.find(t => t.id === '2');
      expect(task2.blockedBy).toContain('1');
    });

    test('should add blocks dependencies bidirectionally', () => {
      const agent = new ChaosAgentLoop();
      agent._executeTaskCreate({ subject: 'Task 1', description: 'First' });
      agent._executeTaskCreate({ subject: 'Task 2', description: 'Second' });

      agent._executeTaskUpdate({ id: '1', addBlocks: ['2'] });

      const list = agent._executeTaskList();
      const task1 = list.tasks.find(t => t.id === '1');
      const task2 = list.tasks.find(t => t.id === '2');
      expect(task1.blocks).toContain('2');
      expect(task2.blockedBy).toContain('1');
    });
  });

  describe('task_list', () => {
    test('should list all non-deleted tasks', () => {
      const agent = new ChaosAgentLoop();
      agent._executeTaskCreate({ subject: 'Task 1', description: 'First' });
      agent._executeTaskCreate({ subject: 'Task 2', description: 'Second' });
      agent._executeTaskCreate({ subject: 'Task 3', description: 'Third' });

      const result = agent._executeTaskList();
      expect(result.status).toBe('ok');
      expect(result.count).toBe(3);
    });

    test('should filter by status', () => {
      const agent = new ChaosAgentLoop();
      agent._executeTaskCreate({ subject: 'Task 1', description: 'First' });
      agent._executeTaskCreate({ subject: 'Task 2', description: 'Second' });
      agent._executeTaskUpdate({ id: '1', status: 'completed' });

      const result = agent._executeTaskList({ status: 'completed' });
      expect(result.count).toBe(1);
      expect(result.tasks[0].subject).toBe('Task 1');
    });

    test('should return empty list when no tasks', () => {
      const agent = new ChaosAgentLoop();
      const result = agent._executeTaskList();
      expect(result.status).toBe('ok');
      expect(result.count).toBe(0);
      expect(result.tasks).toEqual([]);
    });

    test('should exclude deleted tasks from default list', () => {
      const agent = new ChaosAgentLoop();
      agent._executeTaskCreate({ subject: 'Task 1', description: 'First' });
      agent._executeTaskCreate({ subject: 'Task 2', description: 'Second' });
      agent._executeTaskUpdate({ id: '1', status: 'deleted' });

      const result = agent._executeTaskList();
      expect(result.count).toBe(1);
      expect(result.tasks[0].id).toBe('2');
    });
  });

  describe('_executeTool routing', () => {
    test('should route task_create through _executeTool', async () => {
      const agent = new ChaosAgentLoop();
      const result = await agent._executeTool('task_create', {
        subject: 'Routed Task',
        description: 'Created via _executeTool',
      });
      expect(result.status).toBe('ok');
      expect(result.task.subject).toBe('Routed Task');
    });

    test('should route task_update through _executeTool', async () => {
      const agent = new ChaosAgentLoop();
      agent._executeTool('task_create', { subject: 'Test', description: 'Test' });

      const result = await agent._executeTool('task_update', {
        id: '1',
        status: 'in_progress',
      });
      expect(result.status).toBe('ok');
      expect(result.task.status).toBe('in_progress');
    });

    test('should route task_list through _executeTool', async () => {
      const agent = new ChaosAgentLoop();
      agent._executeTool('task_create', { subject: 'Test', description: 'Test' });

      const result = await agent._executeTool('task_list', {});
      expect(result.status).toBe('ok');
      expect(result.count).toBe(1);
    });
  });

  describe('task lifecycle', () => {
    test('full lifecycle: create -> start -> complete -> verify list', () => {
      const agent = new ChaosAgentLoop();

      // Create tasks
      agent._executeTaskCreate({ subject: 'Setup', description: 'Project setup', activeForm: 'Setting up project' });
      agent._executeTaskCreate({ subject: 'Implement', description: 'Implement feature', activeForm: 'Implementing feature' });
      agent._executeTaskCreate({ subject: 'Test', description: 'Write tests', activeForm: 'Writing tests' });

      // Add dependency: Implement depends on Setup
      agent._executeTaskUpdate({ id: '2', addBlockedBy: ['1'] });
      // Test depends on Implement
      agent._executeTaskUpdate({ id: '3', addBlockedBy: ['2'] });

      // Start and complete first task
      agent._executeTaskUpdate({ id: '1', status: 'in_progress' });
      agent._executeTaskUpdate({ id: '1', status: 'completed' });

      // Verify pending tasks (2 and 3)
      const pending = agent._executeTaskList({ status: 'pending' });
      expect(pending.count).toBe(2);

      // Verify completed tasks
      const completed = agent._executeTaskList({ status: 'completed' });
      expect(completed.count).toBe(1);
      expect(completed.tasks[0].subject).toBe('Setup');

      // Verify dependencies are intact
      const all = agent._executeTaskList();
      const impl = all.tasks.find(t => t.id === '2');
      expect(impl.blockedBy).toContain('1');
      expect(impl.blocks).toContain('3');
    });
  });
});
