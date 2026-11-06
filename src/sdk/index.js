/**
 * Chaos Code SDK — programmatic embedding of the agent.
 *
 *   const { runPrompt } = require('@marcher-lam/chaos-code/src/sdk');
 *   const { reply, stats } = await runPrompt({ prompt: '...', cwd: '/repo' });
 *
 * Credentials come from the environment (OPENAI_API_KEY / ANTHROPIC_API_KEY /
 * STDD_LLM_*), exactly like the CLI. Background subagents are drained before
 * the promise resolves (one-shot semantics).
 */

const { ChaosAgentLoop } = require('../runtime/agent-kernel/chaos-agent-loop');
const { AgentKernel } = require('../runtime/agent-kernel/index');

/**
 * Run a one-shot agent prompt headlessly.
 * @param {object} opts
 * @param {string} opts.prompt
 * @param {string} [opts.cwd] - workspace root (default process.cwd())
 * @param {number} [opts.maxTurns=20]
 * @param {number} [opts.temperature]
 * @param {number} [opts.maxTokens]
 * @param {boolean} [opts.promptCaching]
 * @param {function(string): void} [opts.onToken] - streaming text callback
 * @returns {Promise<{reply: string|null, messages: Array, stats: object}>}
 */
async function runPrompt(opts = {}) {
  const { prompt, cwd = process.cwd(), onToken } = opts;
  if (!prompt || typeof prompt !== 'string') throw new Error('opts.prompt is required');

  const loop = new ChaosAgentLoop(cwd);
  if (opts.maxTurns) loop.maxTurns = opts.maxTurns;
  if (opts.temperature !== undefined) loop.temperature = opts.temperature;
  if (opts.maxTokens) loop.maxTokens = opts.maxTokens;
  if (opts.promptCaching !== undefined) loop.promptCaching = opts.promptCaching;
  loop.awaitBackgroundOnExit = true; // SDK calls are one-shot

  const messages = await loop.run(prompt, [], {
    ...(onToken ? { onToken } : {}),
  });

  // The reply is the last assistant message with textual content
  const assistantMsgs = (messages || []).filter(m => m.role === 'assistant' && typeof m.content === 'string' && m.content.trim());
  const reply = assistantMsgs.length > 0 ? assistantMsgs[assistantMsgs.length - 1].content : null;

  try { loop.kernel.mcpClientManager.stopAll(); } catch (_) { /* best-effort */ }

  return { reply, messages, stats: loop.getSessionStats() };
}

module.exports = {
  runPrompt,
  ChaosAgentLoop,
  AgentKernel,
  skills: require('../utils/skills-loader'),
  agents: require('../utils/agents-config'),
};
