const fs = require('fs');
const path = require('path');
const os = require('os');

const CHAOS_DIR = path.join(os.homedir(), '.chaos');
const PROVIDERS_FILE = path.join(CHAOS_DIR, 'providers.json');

// Built-in provider templates with well-known endpoints and models
const BUILTIN_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    envKey: 'OPENAI_API_KEY',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'o1', 'o1-mini', 'o3-mini'],
    defaultModel: 'gpt-4o-mini',
  },
  anthropic: {
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    envKey: 'ANTHROPIC_API_KEY',
    models: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-opus-4-20250514'],
    defaultModel: 'claude-sonnet-4-20250514',
  },
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    envKey: 'DEEPSEEK_API_KEY',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    defaultModel: 'deepseek-chat',
  },
  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    envKey: 'OPENROUTER_API_KEY',
    models: ['anthropic/claude-sonnet-4-20250514', 'openai/gpt-4o', 'google/gemini-2.5-pro', 'deepseek/deepseek-chat'],
    defaultModel: 'anthropic/claude-sonnet-4-20250514',
  },
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    envKey: 'GROQ_API_KEY',
    models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
    defaultModel: 'llama-3.3-70b-versatile',
  },
  ollama: {
    name: 'Ollama (local)',
    baseUrl: 'http://localhost:11434/v1',
    envKey: '',
    models: ['llama3', 'qwen2.5-coder', 'codellama', 'mistral'],
    defaultModel: 'qwen2.5-coder',
  },
  custom: {
    name: 'Custom (OpenAI-compatible)',
    baseUrl: '',
    envKey: '',
    models: [],
    defaultModel: '',
  },
};

function ensureChaosDir() {
  if (!fs.existsSync(CHAOS_DIR)) {
    fs.mkdirSync(CHAOS_DIR, { recursive: true });
  }
}

function loadProviders() {
  ensureChaosDir();
  if (!fs.existsSync(PROVIDERS_FILE)) {
    return { providers: {}, active: null };
  }
  try {
    return JSON.parse(fs.readFileSync(PROVIDERS_FILE, 'utf8'));
  } catch (_) {
    return { providers: {}, active: null };
  }
}

function saveProviders(data) {
  ensureChaosDir();
  fs.writeFileSync(PROVIDERS_FILE, JSON.stringify(data, null, 2));
}

/**
 * Add or update a provider configuration.
 * @param {string} id - Provider ID (e.g. "openai", "custom-mine")
 * @param {object} opts - { name, apiKey, baseUrl, model, models }
 */
function addProvider(id, opts) {
  const data = loadProviders();
  data.providers[id] = {
    name: opts.name || id,
    apiKey: opts.apiKey || '',
    baseUrl: opts.baseUrl || '',
    model: opts.model || '',
    models: opts.models || [],
  };
  // If this is the first provider, auto-activate it
  if (!data.active) {
    data.active = id;
  }
  saveProviders(data);
  return data;
}

function removeProvider(id) {
  const data = loadProviders();
  delete data.providers[id];
  if (data.active === id) {
    const keys = Object.keys(data.providers);
    data.active = keys.length > 0 ? keys[0] : null;
  }
  saveProviders(data);
  return data;
}

function setActive(id) {
  const data = loadProviders();
  if (!data.providers[id]) return null;
  data.active = id;
  saveProviders(data);
  return data;
}

function getActive() {
  const data = loadProviders();
  if (!data.active || !data.providers[data.active]) return null;
  const id = data.active;
  const prov = data.providers[id];

  // Resolve apiKey: saved value > env variable from builtin template
  const builtin = BUILTIN_PROVIDERS[id];
  const apiKey = prov.apiKey
    || (builtin && builtin.envKey ? process.env[builtin.envKey] : '')
    || process.env.STDD_LLM_API_KEY
    || '';

  // Resolve baseUrl: saved value > builtin default > env override
  const baseUrl = prov.baseUrl
    || (builtin ? builtin.baseUrl : '')
    || process.env.STDD_LLM_BASE_URL
    || '';

  // Resolve model: saved value > builtin default > env override
  const model = prov.model
    || (builtin ? builtin.defaultModel : '')
    || process.env.STDD_LLM_MODEL
    || '';

  // Determine provider type for API format
  const providerType = determineProviderType(id, baseUrl);

  return {
    id,
    name: prov.name || id,
    apiKey,
    baseUrl,
    model,
    providerType,
    models: prov.models.length > 0 ? prov.models : (builtin ? builtin.models : []),
  };
}

/**
 * Get all configured providers with resolved credentials.
 */
function listProviders() {
  const data = loadProviders();
  const result = [];
  for (const [id, prov] of Object.entries(data.providers)) {
    const builtin = BUILTIN_PROVIDERS[id];
    const apiKey = prov.apiKey
      || (builtin && builtin.envKey ? process.env[builtin.envKey] : '')
      || '';
    result.push({
      id,
      name: prov.name || id,
      hasKey: !!(apiKey || (builtin && builtin.envKey && process.env[builtin.envKey])),
      baseUrl: prov.baseUrl || (builtin ? builtin.baseUrl : ''),
      model: prov.model || (builtin ? builtin.defaultModel : ''),
      active: data.active === id,
    });
  }
  return result;
}

function determineProviderType(id, baseUrl) {
  // Anthropic uses a different API format
  if (id === 'anthropic') return 'anthropic';
  if (baseUrl && baseUrl.includes('anthropic.com')) return 'anthropic';
  // Everything else uses OpenAI-compatible chat/completions
  return 'openai';
}

/**
 * Auto-detect providers from environment variables.
 * Returns a list of detected provider IDs.
 */
function detectFromEnv() {
  const detected = [];
  if (process.env.OPENAI_API_KEY) detected.push('openai');
  if (process.env.ANTHROPIC_API_KEY) detected.push('anthropic');
  if (process.env.DEEPSEEK_API_KEY) detected.push('deepseek');
  if (process.env.OPENROUTER_API_KEY) detected.push('openrouter');
  if (process.env.GROQ_API_KEY) detected.push('groq');
  if (process.env.STDD_LLM_BASE_URL) {
    // Custom endpoint detected
    if (!detected.length) detected.push('custom');
  }
  return detected;
}

/**
 * Initialize providers from env if none configured yet.
 * Returns the active provider config or null.
 */
function initFromEnv() {
  const data = loadProviders();
  if (Object.keys(data.providers).length > 0) {
    return getActive();
  }

  // Auto-configure from env vars
  if (process.env.OPENAI_API_KEY) {
    addProvider('openai', {
      name: 'OpenAI',
      apiKey: '',
      baseUrl: '',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    });
  }
  if (process.env.ANTHROPIC_API_KEY) {
    addProvider('anthropic', {
      name: 'Anthropic',
      apiKey: '',
      baseUrl: '',
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
    });
  }

  // If STDD_LLM_BASE_URL is set with no known provider, create a custom entry
  if (process.env.STDD_LLM_BASE_URL && !data.providers['custom']) {
    addProvider('custom', {
      name: 'Custom Endpoint',
      apiKey: process.env.STDD_LLM_API_KEY || '',
      baseUrl: process.env.STDD_LLM_BASE_URL,
      model: process.env.STDD_LLM_MODEL || '',
    });
  }

  // Set the first detected as active
  const detected = detectFromEnv();
  if (detected.length > 0) {
    setActive(detected[0]);
  }

  return getActive();
}

module.exports = {
  BUILTIN_PROVIDERS,
  PROVIDERS_FILE,
  loadProviders,
  saveProviders,
  addProvider,
  removeProvider,
  setActive,
  getActive,
  listProviders,
  detectFromEnv,
  initFromEnv,
};
