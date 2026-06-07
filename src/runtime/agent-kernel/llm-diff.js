const fs = require('fs');
const https = require('https');
const path = require('path');

const { isPathSafe } = require('../../utils/security');

function extractUnifiedDiff(text = '') {
  const raw = String(text || '').trim();
  const fenced = raw.match(/```(?:diff|patch)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : raw;
  const idx = candidate.indexOf('diff --git ');
  if (idx === -1) return '';
  return candidate.slice(idx).trim() + '\n';
}

class LlmDiffProvider {
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.trace = options.trace || null;
    this.baseUrl = options.baseUrl || process.env.STDD_LLM_BASE_URL || 'https://api.openai.com/v1';
    this.apiKey = options.apiKey || process.env.STDD_LLM_API_KEY || process.env.OPENAI_API_KEY;
    this.model = options.model || process.env.STDD_LLM_MODEL || 'gpt-4o-mini';
    this.transport = options.transport || defaultTransport;
  }

  async generateDiff(args = {}) {
    const promptPath = path.resolve(this.cwd, args.prompt || '');
    if (!args.prompt) throw new Error('LLM diff requires --prompt.');
    if (!isPathSafe(promptPath, this.cwd)) throw new Error(`Prompt path is outside workspace or unsafe: ${args.prompt}`);
    if (!fs.existsSync(promptPath)) throw new Error(`Prompt file not found: ${args.prompt}`);
    if (!this.apiKey && !args.mockResponse) throw new Error('LLM API key is required. Set STDD_LLM_API_KEY or OPENAI_API_KEY.');

    const prompt = fs.readFileSync(promptPath, 'utf8');
    const content = args.mockResponse || await this.callModel(prompt, args);
    const diff = extractUnifiedDiff(content);
    if (!diff) throw new Error('LLM response did not contain a unified diff.');

    const output = args.output || 'repair.diff';
    const outputPath = path.resolve(this.cwd, output);
    if (!isPathSafe(outputPath, this.cwd)) throw new Error(`Output path is outside workspace or unsafe: ${output}`);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, diff, 'utf8');

    const result = {
      tool: 'llm.diff',
      status: 'generated',
      model: this.model,
      prompt: path.relative(this.cwd, promptPath).replace(/\\/g, '/'),
      output: path.relative(this.cwd, outputPath).replace(/\\/g, '/'),
      bytes: Buffer.byteLength(diff, 'utf8'),
    };
    this.record('tool.llm.diff', result);
    return result;
  }

  async callModel(prompt, args = {}) {
    const url = new URL('/chat/completions', this.baseUrl.replace(/\/$/, ''));
    const payload = {
      model: args.model || this.model,
      messages: [
        { role: 'system', content: 'You generate minimal unified diffs. Return only a unified diff.' },
        { role: 'user', content: prompt },
      ],
      temperature: Number(args.temperature || 0.1),
    };
    const response = await this.transport(url, this.apiKey, payload, Number(args.timeout || 120000));
    return response.choices?.[0]?.message?.content || '';
  }

  record(type, payload) {
    if (this.trace && typeof this.trace.append === 'function') {
      this.trace.append(type, payload);
    }
  }
}

function defaultTransport(url, apiKey, payload, timeout) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(body),
      },
      timeout,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`LLM API error (${res.statusCode}): ${data}`));
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error(`Failed to parse LLM response: ${err.message}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error(`LLM request timed out after ${timeout}ms`)));
    req.write(body);
    req.end();
  });
}

module.exports = { LlmDiffProvider, extractUnifiedDiff };
