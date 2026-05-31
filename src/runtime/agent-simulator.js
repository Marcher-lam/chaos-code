/**
 * Agent Simulation Engine
 * Manages state machine for multi-agent turn-based interactions.
 * Moves STDD from "Prompt Template" to "Interaction Runtime".
 */

const fs = require('fs');
const path = require('path');

const CONVERGENCE_KEYWORDS = ['agree', 'consensus', 'approved', 'done', 'resolved', 'confirmed', '达成共识', '同意', '通过'];

function detectKeywordConvergence(history) {
  if (history.length < 2) return false;
  const lastTwo = history.slice(-2);
  const allAgree = lastTwo.every(turn =>
    CONVERGENCE_KEYWORDS.some(kw => (turn.content || '').toLowerCase().includes(kw))
  );
  return allAgree;
}


/**
 * Detect structural convergence signals beyond simple keyword matching.
 *
 * Signals checked:
 * 1. Participation coverage — every agent has spoken at least once per round
 * 2. Content repetition — last round has high word overlap with previous round
 * 3. Unanimous vote — every agent in the last full round used positive signal
 *
 * @param {Array<{speakerId: string, content: string}>} history
 * @param {object} state - Current simulation state
 * @returns {{ converged: boolean, reason: string|null, score: number }}
 */
function detectStructuralConvergence(history, state) {
  if (history.length < state.agents.length) {
    return { converged: false, reason: null, score: 0 };
  }

  const agentIds = state.agents.map(a => a.id);
  const score = { value: 0, max: 3, reasons: [] };

  // Signal 1: Full participation coverage in the last round
  const lastRoundSize = state.agents.length;
  const lastRoundTurns = history.slice(-lastRoundSize);
  const speakersInLastRound = new Set(lastRoundTurns.map(t => t.speakerId));
  const coverage = speakersInLastRound.size / agentIds.length;
  if (coverage >= 1.0) {
    score.value++;
    score.reasons.push('full_participation');
  }

  // Signal 2: Content stability — compare word sets of last round vs previous round
  if (history.length >= lastRoundSize * 2) {
    const currentWords = extractWordSet(lastRoundTurns);
    const previousTurns = history.slice(-lastRoundSize * 2, -lastRoundSize);
    const previousWords = extractWordSet(previousTurns);
    const overlap = jaccardSimilarity(currentWords, previousWords);
    if (overlap > 0.6) {
      score.value++;
      score.reasons.push('content_stability');
    }
  }

  // Signal 3: All agents expressed agreement in the last round
  const POSITIVE_SIGNALS = ['yes', 'ok', 'okay', 'agree', 'approved', 'confirmed',
    '好的', '同意', '通过', '确认', '赞成', '可以'];
  const allPositive = lastRoundTurns.every(turn => {
    const text = (turn.content || '').toLowerCase();
    return POSITIVE_SIGNALS.some(sig => text.includes(sig));
  });
  if (allPositive) {
    score.value++;
    score.reasons.push('unanimous_positive');
  }

  const converged = score.value >= 2;
  return {
    converged,
    reason: converged ? score.reasons.join('+') : null,
    score: score.value / score.max,
  };
}

/**
 * Extract a Set of normalized words from an array of turns.
 */
function extractWordSet(turns) {
  const words = new Set();
  for (const turn of turns) {
    const tokens = (turn.content || '').toLowerCase().split(/\s+/);
    for (const token of tokens) {
      if (token.length > 2) words.add(token);
    }
  }
  return words;
}

/**
 * Compute Jaccard similarity between two sets.
 */
function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 1.0;
  if (setA.size === 0 || setB.size === 0) return 0.0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
const DEFAULT_AGENTS = [
  { id: 'po', name: 'Product Owner', role: 'Focus on scope, value, and user journey.' },
  { id: 'arch', name: 'Architect', role: 'Focus on system boundaries, patterns, and risks.' },
  { id: 'dev', name: 'Developer', role: 'Focus on implementation complexity and feasibility.' },
  { id: 'qa', name: 'Tester', role: 'Focus on edge cases, failure scenarios, and validation.' },
];

class AgentEngine {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.statePath = path.join(cwd, 'stdd', 'runtime', 'agent-state.json');
    this.turnsPath = path.join(cwd, 'stdd', 'runtime', 'agent-turns.jsonl');
  }

  ensureRuntimeDir() {
    fs.mkdirSync(path.dirname(this.statePath), { recursive: true });
    if (!fs.existsSync(this.statePath)) {
      this.saveState(this.getDefaultState());
    }
  }

  getDefaultState() {
    return { status: 'idle', topic: '', agents: [], currentSpeakerIndex: 0, round: 0, maxRounds: 10, convergenceDetected: false };
  }

  loadState() {
    if (!fs.existsSync(this.statePath)) return this.getDefaultState();
    try {
      return JSON.parse(fs.readFileSync(this.statePath, 'utf8'));
    } catch (err) {
      if (err.code !== 'ENOENT' && err.code !== 'EACCES') console.error(`  Warning: ${err.message}`);
      return this.getDefaultState();
    }
  }

  saveState(state) {
    fs.writeFileSync(this.statePath, JSON.stringify(state, null, 2), 'utf8');
  }

  start(topic, options = {}) {
    this.ensureRuntimeDir();
    const agents = options.agents && options.agents.length > 0 ? options.agents : DEFAULT_AGENTS;
    const state = {
      ...this.getDefaultState(),
      status: 'active',
      topic,
      agents,
      maxRounds: options.rounds || 6,
      currentSpeakerIndex: 0,
    };
    this.saveState(state);
    // Clear turns history
    fs.writeFileSync(this.turnsPath, '', 'utf8');
    return state;
  }

  nextTurn() {
    const state = this.loadState();
    if (state.status !== 'active') return { error: 'Simulation not active.' };

    const speaker = state.agents[state.currentSpeakerIndex];
    state.currentSpeakerIndex = (state.currentSpeakerIndex + 1) % state.agents.length;
    if (state.currentSpeakerIndex === 0) state.round++;

    // Check convergence (rounds limit or keyword)
    const history = this.getHistory();
    if (state.round >= state.maxRounds) {
      state.status = 'completed';
      state.convergenceDetected = true;
    } else if (detectKeywordConvergence(history)) {
      state.status = 'completed';
      state.convergenceDetected = true;
    }
    // Structural convergence: participation coverage + content stability + unanimous positive
    if (state.status === 'active') {
      const structural = detectStructuralConvergence(history, state);
      if (structural.converged) {
        state.status = 'completed';
        state.convergenceDetected = true;
        state.convergenceReason = structural.reason;
        state.convergenceScore = structural.score;
      }
    }

    if (state.status === 'completed') {
      try {
        const { ProductProposalCommand } = require('../cli/commands/product-proposal');
        const proposalCmd = new ProductProposalCommand(this.cwd);
        const stddDir = path.join(this.cwd, 'stdd');
        if (fs.existsSync(stddDir)) {
          proposalCmd.execute({ output: path.join(this.cwd, 'PRODUCT-PROPOSAL.md') });
        }
      } catch (err) {
        // Squelch errors during non-initialized tests
      }
    }

    this.saveState(state);
    return { turn: state.round, speaker, history: this.getHistory() };
  }

  recordTurn(speakerId, content) {
    const record = { speakerId, timestamp: new Date().toISOString(), content };
    fs.appendFileSync(this.turnsPath, JSON.stringify(record) + '\n', 'utf8');
  }

  getHistory() {
    if (!fs.existsSync(this.turnsPath)) return [];
    return fs.readFileSync(this.turnsPath, 'utf8').trim().split('\n')
      .filter(Boolean)
      .map(line => { try { return JSON.parse(line); } catch { return null; } })
      .filter(Boolean);
  }

  getStatus() {
    return this.loadState();
  }

  forceStop() {
    const state = this.loadState();
    state.status = 'stopped';
    this.saveState(state);
    return state;
  }
}

module.exports = { AgentEngine, DEFAULT_AGENTS, detectKeywordConvergence, detectStructuralConvergence, extractWordSet, jaccardSimilarity };
