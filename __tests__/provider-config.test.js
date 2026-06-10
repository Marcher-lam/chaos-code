const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  BUILTIN_PROVIDERS,
  loadProviders,
  addProvider,
  removeProvider,
  setActive,
  getActive,
  listProviders,
  detectFromEnv,
  PROVIDERS_FILE,
} = require('../src/runtime/agent-kernel/provider-config');

// Backup real providers file and restore after all tests
const realFile = PROVIDERS_FILE;
let backupData = null;

beforeAll(() => {
  // Backup existing providers file
  if (fs.existsSync(realFile)) {
    backupData = fs.readFileSync(realFile, 'utf8');
    fs.unlinkSync(realFile);
  }
});

afterAll(() => {
  // Restore original providers file
  if (backupData !== null) {
    const dir = path.dirname(realFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(realFile, backupData);
  }
});

describe('provider-config', () => {
  beforeEach(() => {
    // Clean up providers file between tests
    if (fs.existsSync(realFile)) fs.unlinkSync(realFile);
    // Clear relevant env vars
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.STDD_LLM_API_KEY;
    delete process.env.STDD_LLM_BASE_URL;
    delete process.env.STDD_LLM_MODEL;
    delete process.env.OPENAI_MODEL;
  });

  test('should have built-in provider templates', () => {
    expect(BUILTIN_PROVIDERS.openai).toBeDefined();
    expect(BUILTIN_PROVIDERS.anthropic).toBeDefined();
    expect(BUILTIN_PROVIDERS.deepseek).toBeDefined();
    expect(BUILTIN_PROVIDERS.ollama).toBeDefined();
    expect(BUILTIN_PROVIDERS.custom).toBeDefined();
  });

  test('should start with empty providers', () => {
    const data = loadProviders();
    expect(Object.keys(data.providers).length).toBe(0);
  });

  test('should add a provider and auto-activate it', () => {
    addProvider('openai', {
      name: 'OpenAI',
      apiKey: 'sk-test-key',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o',
    });

    const data = loadProviders();
    expect(data.providers.openai).toBeDefined();
    expect(data.providers.openai.apiKey).toBe('sk-test-key');
    expect(data.active).toBe('openai');
  });

  test('should list providers with resolved info', () => {
    addProvider('openai', {
      name: 'OpenAI',
      apiKey: 'sk-test',
      baseUrl: '',
      model: 'gpt-4o',
    });

    const list = listProviders();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe('openai');
    expect(list[0].hasKey).toBe(true);
    expect(list[0].active).toBe(true);
  });

  test('should remove a provider', () => {
    addProvider('openai', { name: 'OpenAI', apiKey: 'sk-test' });
    addProvider('anthropic', { name: 'Anthropic', apiKey: 'ant-test' });

    removeProvider('openai');

    const list = listProviders();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe('anthropic');
  });

  test('should switch active provider', () => {
    addProvider('openai', { name: 'OpenAI', apiKey: 'sk-test', model: 'gpt-4o' });
    addProvider('anthropic', { name: 'Anthropic', apiKey: 'ant-test', model: 'claude-sonnet' });

    setActive('anthropic');
    const active = getActive();
    expect(active.id).toBe('anthropic');
    expect(active.model).toBe('claude-sonnet');
    expect(active.providerType).toBe('anthropic');
  });

  test('getActive should resolve env key when saved key is empty', () => {
    process.env.OPENAI_API_KEY = 'env-key-123';
    addProvider('openai', { name: 'OpenAI', apiKey: '', baseUrl: '', model: 'gpt-4o' });

    const active = getActive();
    expect(active.apiKey).toBe('env-key-123');
  });

  test('getActive should use saved key over env', () => {
    process.env.OPENAI_API_KEY = 'env-key';
    addProvider('openai', { name: 'OpenAI', apiKey: 'saved-key', baseUrl: '', model: 'gpt-4o' });

    const active = getActive();
    expect(active.apiKey).toBe('saved-key');
  });

  test('getActive should detect providerType as anthropic', () => {
    addProvider('anthropic', { name: 'Anthropic', apiKey: 'test', baseUrl: '', model: 'claude-sonnet' });

    const active = getActive();
    expect(active.providerType).toBe('anthropic');
  });

  test('getActive should detect providerType as openai for custom', () => {
    addProvider('custom', { name: 'My API', apiKey: 'test', baseUrl: 'https://my-api.com/v1', model: 'my-model' });

    const active = getActive();
    expect(active.providerType).toBe('openai');
  });

  test('getActive should return models list from builtin', () => {
    addProvider('openai', { name: 'OpenAI', apiKey: 'test', models: [] });

    const active = getActive();
    expect(active.models.length).toBeGreaterThan(0);
    expect(active.models).toContain('gpt-4o');
  });

  test('should detect providers from environment', () => {
    process.env.OPENAI_API_KEY = 'test';
    process.env.ANTHROPIC_API_KEY = 'test';
    const detected = detectFromEnv();
    expect(detected).toContain('openai');
    expect(detected).toContain('anthropic');
  });
});
