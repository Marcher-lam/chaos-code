const fs = require('fs');
const path = require('path');
const https = require('https');
const { AgentKernel } = require('./index');
const chalk = require('chalk');

const SYSTEM_PROMPT = `You are the Chaos Agent, a self-contained AI coding assistant similar to Claude Code.
Your goal is to help the user implement features, refactor code, and fix bugs in their workspace.
You have access to a set of workspace tools. You must use these tools to inspect the environment, read files, search code, run tests, and write code changes via diffs (fs_patch).

Rules of operation:
1. First, inspect the project environment or read relevant files to understand the context.
2. Before writing code edits, check the existing tests by calling test_run.
3. Write modifications using fs_patch by outputting a valid unified diff (patch) format.
4. After applying a patch, you MUST run tests again to verify the implementation.
5. If tests fail, use fs_read, fs_search, and your reasoning to diagnose and fix the failures, repeating the cycle.
6. Provide concise, clear explanations of your actions and decisions.`;

const TOOLS_DEFINITION = [
  {
    type: 'function',
    function: {
      name: 'fs_read',
      description: 'Read a file from the workspace. Path must be relative to the workspace root.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path of the file to read' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'fs_search',
      description: 'Search workspace files by query string or pattern.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Text or pattern to search for' },
          path: { type: 'string', description: 'Optional relative path to search within, defaults to root' },
          limit: { type: 'integer', description: 'Max number of results to return' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'fs_patch',
      description: 'Apply modifications to files via a unified diff (patch). The diff must contain standard header, hunk ranges @@, and correct context.',
      parameters: {
        type: 'object',
        properties: {
          diff: { type: 'string', description: 'The complete, valid unified diff string' }
        },
        required: ['diff']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'shell_run',
      description: 'Run a shell command inside the workspace directory.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Command line string to execute' }
        },
        required: ['command']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'test_run',
      description: 'Run the project tests and get normalized results.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Optional custom test command' },
          workspace: { type: 'string', description: 'Optional sub-workspace to run tests in' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_diff',
      description: 'Inspect current git dirty status and diff representation.',
      parameters: {
        type: 'object',
        properties: {
          patch: { type: 'boolean', description: 'Whether to include the full patch diff content' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_add',
      description: 'Stage modified or untracked files in the repository.',
      parameters: {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of files to stage'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_commit',
      description: 'Commit staged changes to the repository with a message.',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'The commit message' }
        },
        required: ['message']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_push',
      description: 'Push local commits to the remote repository.',
      parameters: {
        type: 'object',
        properties: {
          remote: { type: 'string', description: 'The remote name, defaults to origin' },
          branch: { type: 'string', description: 'The branch name, defaults to main' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_checkout',
      description: 'Switch branch or restore working tree files.',
      parameters: {
        type: 'object',
        properties: {
          branch: { type: 'string', description: 'The branch name to checkout' }
        },
        required: ['branch']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_branch',
      description: 'Create and checkout a new branch in the repository.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'The new branch name' }
        },
        required: ['name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'git_reset',
      description: 'Reset current HEAD to discard local modifications.',
      parameters: {
        type: 'object',
        properties: {
          hard: { type: 'boolean', description: 'Whether to perform a hard reset, discarding modifications' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'stdd_status',
      description: 'Inspect the active STDD specifications, change tracking and Ralph Loop TDD phases.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'stdd_recommend',
      description: 'Get next step suggestion from STDD engine based on current files and progress.',
      parameters: {
        type: 'object',
        properties: {
          change: { type: 'string', description: 'Name of specific change to get recommendation for' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'stdd_verify',
      description: 'Run STDD Constitution rules audit and automated test verification gating.',
      parameters: {
        type: 'object',
        properties: {
          change: { type: 'string', description: 'Name of the change to verify' }
        }
      }
    }
  }
];

class ChaosAgentLoop {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.kernel = new AgentKernel({ cwd });
    
    // Resolve keys and config
    this.apiKey = process.env.STDD_LLM_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
    this.baseUrl = process.env.STDD_LLM_BASE_URL;
    
    this.provider = 'openai';
    if (process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY && !process.env.STDD_LLM_BASE_URL) {
      this.provider = 'anthropic';
    }
    
    // Resolve model
    const config = this.kernel.getConfig() || {};
    const configDefaults = config.defaults || {};
    this.model = process.env.STDD_LLM_MODEL || process.env.OPENAI_MODEL || process.env.ANTHROPIC_MODEL || configDefaults.model || (this.provider === 'anthropic' ? 'claude-3-5-sonnet-latest' : 'gpt-4o-mini');

    // Token tracking
    this.totalPromptTokens = 0;
    this.totalCompletionTokens = 0;
    this.totalCost = 0;
  }

  async run(goal, chatHistory = [], callbacks = {}) {
    if (this.kernel && this.kernel.mcpInitPromise) {
      await this.kernel.mcpInitPromise.catch(() => {});
    }

    const defaultCallbacks = {
      onMessage: (msg) => console.log(msg),
      onToolStart: (name, args) => console.log(chalk.dim(`\n🛠️ Running tool ${name}...`)),
      onToolEnd: (name, res) => {},
      askPermission: async (name, args) => true,
    };
    const cb = { ...defaultCallbacks, ...callbacks };

    if (!this.apiKey) {
      cb.onMessage(chalk.red('\nError: No API key detected.'));
      cb.onMessage('Please set one of the following environment variables:\n' +
        '  - OPENAI_API_KEY\n' +
        '  - ANTHROPIC_API_KEY\n' +
        '  - STDD_LLM_API_KEY\n');
      return;
    }

    // Initialize messages array for this execution turn
    // If we have history, copy it over
    const messages = [...chatHistory];
    messages.push({ role: 'user', content: goal });

    let running = true;
    let turnCount = 0;
    const maxTurns = 20;

    while (running && turnCount < maxTurns) {
      turnCount++;
      
      let response;
      try {
        response = await this._callLLM(messages);
      } catch (err) {
        cb.onMessage(chalk.red(`\nLLM Call Error: ${err.message}`));
        break;
      }

      // Track usage
      if (response && response.usage) {
        const pTokens = response.usage.prompt_tokens || 0;
        const cTokens = response.usage.completion_tokens || 0;
        this.totalPromptTokens += pTokens;
        this.totalCompletionTokens += cTokens;
        const turnCost = this._calculateCost(this.provider, this.model, pTokens, cTokens);
        this.totalCost += turnCost;
      }

      // Handle response content
      if (response.content) {
        cb.onMessage(response.content);
        messages.push({ role: 'assistant', content: response.content });
      }

      // Handle tool calls
      if (response.toolCalls && response.toolCalls.length > 0) {
        // If the assistant gave content, append tool calls to the same or next message
        if (!response.content) {
          // Anthropic/OpenAI require the assistant message with tool calls to be added to history before tool results
          messages.push({ role: 'assistant', content: null, tool_calls: response.toolCallsRaw });
        } else {
          // Update the last message to include raw tool calls
          messages[messages.length - 1].tool_calls = response.toolCallsRaw;
        }

        for (const toolCall of response.toolCalls) {
          cb.onToolStart(toolCall.name, toolCall.arguments);
          
          let toolResult;
          let allowed = true;
          
          // Guarded / write tools require permission check
          const isGuarded = ['fs_patch', 'shell_run', 'test_run', 'stdd_verify', 'git_add', 'git_commit', 'git_push', 'git_checkout', 'git_branch', 'git_reset'].includes(toolCall.name);
          if (isGuarded) {
            allowed = await cb.askPermission(toolCall.name, toolCall.arguments);
          }

          if (allowed) {
            try {
              toolResult = await this._executeTool(toolCall.name, toolCall.arguments);
              cb.onToolEnd(toolCall.name, toolResult);
            } catch (err) {
              toolResult = { error: err.message };
              cb.onToolEnd(toolCall.name, toolResult);
            }
          } else {
            toolResult = { error: 'User rejected permission to run this tool.' };
            cb.onToolEnd(toolCall.name, toolResult);
          }

          // Append tool result message
          if (this.provider === 'anthropic') {
            messages.push({
              role: 'user',
              content: [
                {
                  type: 'tool_result',
                  tool_use_id: toolCall.id,
                  content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult, null, 2)
                }
              ]
            });
          } else {
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolCall.name,
              content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult, null, 2)
            });
          }

          // Self-healing nudge: if tests fail, guide the model to fix them
          if (toolCall.name === 'test_run') {
            try {
              const parsedRes = typeof toolResult === 'string' ? JSON.parse(toolResult) : toolResult;
              if (parsedRes && parsedRes.passed === false) {
                messages.push({
                  role: 'user',
                  content: '⚠️  Some tests failed. Please read the error output above, modify the code using fs_patch to fix the bug, and run the tests again via test_run to verify.'
                });
              }
            } catch (_) {}
          }
        }
      } else {
        // No tool calls, finish the conversation cycle
        running = false;
      }
    }

    // Return the updated chat history including this run
    return messages;
  }

  _getLLMTools() {
    const list = [...TOOLS_DEFINITION];
    if (this.kernel && this.kernel.tools) {
      const allTools = this.kernel.tools.list();
      for (const tool of allTools) {
        if (tool.category === 'mcp') {
          list.push({
            type: 'function',
            function: {
              name: tool.name.replace(/\./g, '_'),
              description: tool.description,
              parameters: tool.inputSchema || { type: 'object', properties: {} }
            }
          });
        }
      }
    }
    return list;
  }

  async _callLLM(messages) {
    if (this.provider === 'anthropic') {
      return this._callAnthropic(messages);
    }
    return this._callOpenAI(messages);
  }

  _callOpenAI(messages) {
    return new Promise((resolve, reject) => {
      const url = this.baseUrl ? new URL('/chat/completions', this.baseUrl.replace(/\/$/, '')) : new URL('https://api.openai.com/v1/chat/completions');
      
      const payload = {
        model: this.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages.map(m => ({
            role: m.role,
            content: m.content || '',
            ...(m.tool_calls ? { tool_calls: m.tool_calls } : {})
          }))
        ],
        tools: this._getLLMTools(),
        tool_choice: 'auto',
        temperature: 0.2
      };

      const body = JSON.stringify(payload);
      const req = https.request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 120000,
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 400) return reject(new Error(`OpenAI API error (${res.statusCode}): ${data}`));
          try {
            const json = JSON.parse(data);
            const choice = json.choices?.[0] || {};
            const content = choice.message?.content || null;
            const toolCallsRaw = choice.message?.tool_calls || [];
            
            const toolCalls = toolCallsRaw.map(tc => {
              let parsedArgs = {};
              try {
                parsedArgs = JSON.parse(tc.function.arguments);
              } catch (_) {}
              return {
                id: tc.id,
                name: tc.function.name,
                arguments: parsedArgs
              };
            });

            const usage = json.usage || { prompt_tokens: 0, completion_tokens: 0 };
            resolve({ content, toolCalls, toolCallsRaw, usage });
          } catch (err) {
            reject(new Error(`Failed to parse LLM response: ${err.message}`));
          }
        });
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  _callAnthropic(messages) {
    return new Promise((resolve, reject) => {
      const url = new URL('https://api.anthropic.com/v1/messages');
      
      const anthropicTools = this._getLLMTools().map(t => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters
      }));

      // Anthropic does not support "system" in messages list; it must be passed in top level
      // Also format messages
      const formattedMessages = messages.map(m => {
        if (m.role === 'tool') {
          return {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: m.tool_call_id,
                content: m.content
              }
            ]
          };
        }
        if (Array.isArray(m.content)) {
          return { role: m.role, content: m.content };
        }
        if (m.tool_calls) {
          return {
            role: m.role,
            content: [
              { type: 'text', text: m.content || '' },
              ...m.tool_calls.map(tc => ({
                type: 'tool_use',
                id: tc.id,
                name: tc.name || tc.function?.name,
                input: tc.input || (tc.function?.arguments ? JSON.parse(tc.function.arguments) : {})
              }))
            ]
          };
        }
        return { role: m.role, content: m.content || '' };
      });

      const payload = {
        model: this.model,
        system: SYSTEM_PROMPT,
        messages: formattedMessages,
        tools: anthropicTools,
        max_tokens: 4000,
        temperature: 0.2
      };

      const body = JSON.stringify(payload);
      const req = https.request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 120000,
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 400) return reject(new Error(`Anthropic API error (${res.statusCode}): ${data}`));
          try {
            const json = JSON.parse(data);
            let content = '';
            const toolCalls = [];
            const toolCallsRaw = [];

            if (Array.isArray(json.content)) {
              for (const block of json.content) {
                if (block.type === 'text') {
                  content += block.text;
                } else if (block.type === 'tool_use') {
                  toolCalls.push({
                    id: block.id,
                    name: block.name,
                    arguments: block.input
                  });
                  toolCallsRaw.push({
                    id: block.id,
                    type: 'function',
                    function: {
                      name: block.name,
                      arguments: JSON.stringify(block.input)
                    }
                  });
                }
              }
            }

            const usage = {
              prompt_tokens: json.usage?.input_tokens || 0,
              completion_tokens: json.usage?.output_tokens || 0
            };

            resolve({
              content: content || null,
              toolCalls,
              toolCallsRaw,
              usage
            });
          } catch (err) {
            reject(new Error(`Failed to parse Anthropic response: ${err.message}`));
          }
        });
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  async _executeTool(name, args) {
    const kernelToolName = name.replace(/_/g, '.');
    
    // Custom handling for fs_patch
    if (kernelToolName === 'fs.patch') {
      const patchArgs = {
        diff: args.diff,
        approved: true,
        apply: true
      };
      return this.kernel.executeTool('fs.patch', patchArgs);
    }
    
    // Normal handling
    return this.kernel.executeTool(kernelToolName, args);
  }

  _calculateCost(provider, model, promptTokens, completionTokens) {
    let inputRate = 0; // per million tokens
    let outputRate = 0; // per million tokens

    if (provider === 'openai') {
      const lowerModel = String(model).toLowerCase();
      if (lowerModel.includes('gpt-4o-mini')) {
        inputRate = 0.15;
        outputRate = 0.60;
      } else if (lowerModel.includes('gpt-4o')) {
        inputRate = 2.50;
        outputRate = 10.00;
      } else if (lowerModel.includes('o1-')) {
        inputRate = 15.00;
        outputRate = 60.00;
      } else if (lowerModel.includes('gpt-4')) {
        inputRate = 30.00;
        outputRate = 90.00;
      } else {
        inputRate = 0.15;
        outputRate = 0.60;
      }
    } else if (provider === 'anthropic') {
      const lowerModel = String(model).toLowerCase();
      if (lowerModel.includes('sonnet')) {
        inputRate = 3.00;
        outputRate = 15.00;
      } else if (lowerModel.includes('haiku')) {
        inputRate = 0.80;
        outputRate = 4.00;
      } else if (lowerModel.includes('opus')) {
        inputRate = 15.00;
        outputRate = 75.00;
      } else {
        inputRate = 3.00;
        outputRate = 15.00;
      }
    }

    const inputCost = (promptTokens / 1000000) * inputRate;
    const outputCost = (completionTokens / 1000000) * outputRate;
    return inputCost + outputCost;
  }

  setModel(model) {
    this.model = model;
    const lower = model.toLowerCase();
    if (lower.includes('claude') || lower.includes('anthropic')) {
      this.provider = 'anthropic';
    } else if (lower.includes('gpt') || lower.includes('openai') || lower.includes('o1')) {
      this.provider = 'openai';
    }
  }

  getModel() {
    return this.model;
  }

  getProvider() {
    return this.provider;
  }

  getSessionStats() {
    return {
      provider: this.provider,
      model: this.model,
      promptTokens: this.totalPromptTokens,
      completionTokens: this.totalCompletionTokens,
      totalTokens: this.totalPromptTokens + this.totalCompletionTokens,
      cost: this.totalCost
    };
  }

  compactHistory(chatHistory) {
    if (chatHistory.length <= 6) return chatHistory;
    let sliceIndex = chatHistory.length - 6;
    while (sliceIndex > 0 && (
      chatHistory[sliceIndex].role === 'tool' || 
      chatHistory[sliceIndex].role === 'tool_result' || 
      (chatHistory[sliceIndex].content && Array.isArray(chatHistory[sliceIndex].content) && chatHistory[sliceIndex].content.some(c => c.type === 'tool_result'))
    )) {
      sliceIndex--;
    }
    return chatHistory.slice(sliceIndex);
  }
}

module.exports = { ChaosAgentLoop };
