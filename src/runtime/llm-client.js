/**
 * Lightweight LLM Client Adapter for Multi-Agent Debate
 * Supports OpenAI and Anthropic API.
 * Gracefully falls back to mock responses if no API key is provided.
 */

const https = require('https');
const { createLogger } = require('../utils/logger');
const logger = createLogger('llm-client');

const DEFAULT_TIMEOUT_MS = 30000;

class LLMClient {
  constructor() {
    this.openAiKey = process.env.OPENAI_API_KEY;
    this.anthropicKey = process.env.ANTHROPIC_API_KEY;
  }

  /**
   * Generates a response from the available LLM.
   * @param {Array} messages - Array of message objects { role, content }
   * @param {string} systemPrompt - System prompt to set behavior
   * @param {Object} options - Options for the request
   * @returns {Promise<Object>} { content, token_usage, cost_estimate }
   */
  async generateResponse(messages, systemPrompt = '', options = {}) {
    if (this.openAiKey) {
      return this._callOpenAI(messages, systemPrompt, options);
    }
    
    if (this.anthropicKey) {
      return this._callAnthropic(messages, systemPrompt, options);
    }

    // Fallback to mock behavior if no keys provided
    logger.warn('No OPENAI_API_KEY or ANTHROPIC_API_KEY found. Falling back to mock LLM response.');
    return {
      content: this._generateMockResponse(messages, systemPrompt),
      token_usage: { prompt_tokens: 50, completion_tokens: 15, total_tokens: 65 },
      cost_estimate: 0.0001
    };
  }

  async _callOpenAI(messages, systemPrompt, options) {
    return new Promise((resolve, reject) => {
      const model = options.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
      const formattedMessages = [];
      if (systemPrompt) {
        formattedMessages.push({ role: 'system', content: systemPrompt });
      }
      formattedMessages.push(...messages);

      const timeoutMs = options.timeoutMs || Number(process.env.STDD_LLM_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
      const requestBody = JSON.stringify({
        model,
        messages: formattedMessages,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 1000
      });

      const reqOptions = {
        hostname: 'api.openai.com',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openAiKey}`,
          'Content-Length': Buffer.byteLength(requestBody)
        }
      };

      const req = https.request(reqOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 400) {
            return reject(new Error(`OpenAI API error (${res.statusCode}): ${data}`));
          }
          try {
            const json = JSON.parse(data);
            const content = json.choices[0]?.message?.content || '';
            const usage = json.usage || {};
            // Rough estimate: $0.15/1M input, $0.60/1M output for gpt-4o-mini
            const cost = (usage.prompt_tokens || 0) * 0.15 / 1000000 + (usage.completion_tokens || 0) * 0.60 / 1000000;
            resolve({
              content,
              token_usage: usage,
              cost_estimate: cost
            });
          } catch (e) {
            reject(new Error(`Failed to parse OpenAI response: ${e.message}`));
          }
        });
      });

      req.on('error', (e) => reject(new Error(`OpenAI network error: ${e.message}`)));
      req.setTimeout(timeoutMs, () => {
        req.destroy(new Error(`OpenAI request timed out after ${timeoutMs}ms`));
      });
      req.write(requestBody);
      req.end();
    });
  }

  async _callAnthropic(messages, systemPrompt, options) {
    return new Promise((resolve, reject) => {
      const model = options.model || process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307';
      
      const timeoutMs = options.timeoutMs || Number(process.env.STDD_LLM_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
      const requestBody = JSON.stringify({
        model,
        system: systemPrompt,
        messages: messages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        })),
        max_tokens: options.max_tokens || 1000,
        temperature: options.temperature || 0.7
      });

      const reqOptions = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.anthropicKey,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(requestBody)
        }
      };

      const req = https.request(reqOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 400) {
            return reject(new Error(`Anthropic API error (${res.statusCode}): ${data}`));
          }
          try {
            const json = JSON.parse(data);
            const content = json.content?.[0]?.text || '';
            const usage = {
              prompt_tokens: json.usage?.input_tokens || 0,
              completion_tokens: json.usage?.output_tokens || 0,
              total_tokens: (json.usage?.input_tokens || 0) + (json.usage?.output_tokens || 0)
            };
            // Rough estimate for haiku: $0.25/1M input, $1.25/1M output
            const cost = usage.prompt_tokens * 0.25 / 1000000 + usage.completion_tokens * 1.25 / 1000000;
            
            resolve({
              content,
              token_usage: usage,
              cost_estimate: cost
            });
          } catch (e) {
            reject(new Error(`Failed to parse Anthropic response: ${e.message}`));
          }
        });
      });

      req.on('error', (e) => reject(new Error(`Anthropic network error: ${e.message}`)));
      req.setTimeout(timeoutMs, () => {
        req.destroy(new Error(`Anthropic request timed out after ${timeoutMs}ms`));
      });
      req.write(requestBody);
      req.end();
    });
  }

  _generateMockResponse(messages, systemPrompt) {
    const roleMatch = systemPrompt.match(/You are a (.*?)\./);
    const roleName = roleMatch ? roleMatch[1] : 'Specialist';
    
    // Simulate structural convergence analysis
    return `[Mock Response] As a ${roleName}, here is a concise perspective based on the current debate context. Additional role input is still useful before making a final decision.`;
  }
}

module.exports = new LLMClient();
