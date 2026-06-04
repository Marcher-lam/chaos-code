const fs = require('fs');
const path = require('path');
const os = require('os');
const { AgentEngine, DEFAULT_AGENTS } = require('../src/runtime/agent-simulator');

describe('AgentEngine', () => {
  let tmpDir;
  let engine;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-agent-'));
    engine = new AgentEngine(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('getDefaultState', () => {
    test('returns idle state with defaults', () => {
      const state = engine.getDefaultState();
      expect(state.status).toBe('idle');
      expect(state.topic).toBe('');
      expect(state.round).toBe(0);
      expect(state.maxRounds).toBe(10);
      expect(state.convergenceDetected).toBe(false);
    });
  });

  describe('start', () => {
    test('creates active simulation with topic', () => {
      const state = engine.start('test-topic');
      expect(state.status).toBe('active');
      expect(state.topic).toBe('test-topic');
      expect(state.agents).toEqual(DEFAULT_AGENTS);
      expect(state.currentSpeakerIndex).toBe(0);
    });

    test('accepts custom agents and rounds', () => {
      const customAgents = [{ id: 'bot', name: 'Bot', role: 'test' }];
      const state = engine.start('topic', { agents: customAgents, rounds: 3 });
      expect(state.agents).toEqual(customAgents);
      expect(state.maxRounds).toBe(3);
    });

    test('creates runtime directory', () => {
      engine.start('topic');
      expect(fs.existsSync(path.join(tmpDir, 'stdd', 'runtime'))).toBe(true);
    });

    test('clears turn history on start', () => {
      engine.start('topic1');
      engine.recordTurn('po', 'hello');
      engine.start('topic2');
      expect(engine.getHistory()).toEqual([]);
    });
  });

  describe('nextTurn', () => {
    beforeEach(() => {
      engine.start('test-topic', { rounds: 2 });
    });

    test('returns error when not active', async () => {
      engine.forceStop();
      const result = await engine.nextTurn();
      expect(result.error).toBeDefined();
    });

    test('cycles through agents', async () => {
      const turn1 = await engine.nextTurn();
      expect(turn1.speaker.id).toBe('po');
      expect(turn1.turn).toBe(0);

      const turn2 = await engine.nextTurn();
      expect(turn2.speaker.id).toBe('arch');
    });

    test('increments round when all agents have spoken', async () => {
      const agentCount = DEFAULT_AGENTS.length;
      for (let i = 0; i < agentCount; i++) await engine.nextTurn();
      const state = engine.getStatus();
      expect(state.round).toBe(1);
    });

    test('completes simulation after max rounds', async () => {
      engine.start('test-topic', { rounds: 1 });
      const agentCount = DEFAULT_AGENTS.length;
      for (let i = 0; i < agentCount; i++) await engine.nextTurn();
      const state = engine.getStatus();
      expect(state.status).toBe('completed');
      expect(state.convergenceDetected).toBe(true);
    });

    test('triggers product proposal generation on completed state', async () => {
      // Create stdd directory and package.json in tmpDir so fs.existsSync passes
      const stddDir = path.join(tmpDir, 'stdd');
      fs.mkdirSync(stddDir, { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test-app', version: '1.0.0' }), 'utf8');

      // Start simulation
      engine.start('test-topic', { rounds: 1 });
      const agentCount = DEFAULT_AGENTS.length;
      for (let i = 0; i < agentCount; i++) await engine.nextTurn();

      // Check if PRODUCT-PROPOSAL.md was generated
      const proposalPath = path.join(tmpDir, 'PRODUCT-PROPOSAL.md');
      expect(fs.existsSync(proposalPath)).toBe(true);
      const content = fs.readFileSync(proposalPath, 'utf8');
      expect(content).toContain('test-app 产品方案');
    });
  });

  describe('keyword convergence', () => {
    test('detects convergence when last two turns contain agreement keywords', async () => {
      engine.start('topic', { rounds: 100 });
      engine.recordTurn('po', 'I agree with the proposal');
      engine.recordTurn('arch', 'consensus reached');

      await engine.nextTurn();
      const state = engine.getStatus();
      expect(state.status).toBe('completed');
      expect(state.convergenceDetected).toBe(true);
    });

    test('does not converge with fewer than two agreeing turns', async () => {
      engine.start('topic', { rounds: 100 });
      engine.recordTurn('po', 'I agree');
      engine.recordTurn('arch', 'Still debating');

      await engine.nextTurn();
      const state = engine.getStatus();
      expect(state.status).toBe('active');
    });
  });

  describe('recordTurn', () => {
    beforeEach(() => {
      engine.start('topic');
    });

    test('appends record to turns file', () => {
      engine.recordTurn('po', 'Hello world');
      const history = engine.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].speakerId).toBe('po');
      expect(history[0].content).toBe('Hello world');
      expect(history[0].timestamp).toBeDefined();
    });

    test('handles multiple records', () => {
      engine.recordTurn('po', 'First');
      engine.recordTurn('arch', 'Second');
      expect(engine.getHistory()).toHaveLength(2);
    });
  });

  describe('getHistory', () => {
    test('returns empty array when no turns file exists', () => {
      expect(engine.getHistory()).toEqual([]);
    });

    test('handles malformed JSON lines gracefully', () => {
      engine.start('topic');
      const turnsPath = path.join(tmpDir, 'stdd', 'runtime', 'agent-turns.jsonl');
      fs.appendFileSync(turnsPath, 'invalid json\n');
      fs.appendFileSync(turnsPath, JSON.stringify({ speakerId: 'po', content: 'valid' }) + '\n');
      const history = engine.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].content).toBe('valid');
    });
  });

  describe('forceStop', () => {
    test('sets status to stopped', () => {
      engine.start('topic');
      const state = engine.forceStop();
      expect(state.status).toBe('stopped');
    });
  });

  describe('getStatus', () => {
    test('returns default state when no state file exists', () => {
      const state = engine.getStatus();
      expect(state.status).toBe('idle');
    });
  });
});

describe('DEFAULT_AGENTS', () => {
  test('contains four agent roles', () => {
    expect(DEFAULT_AGENTS).toHaveLength(4);
    const ids = DEFAULT_AGENTS.map(a => a.id);
    expect(ids).toContain('po');
    expect(ids).toContain('arch');
    expect(ids).toContain('dev');
    expect(ids).toContain('qa');
  });
});
