const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');
const { ContractCommand } = require('../src/cli/commands/contract');

describe('ContractCommand', () => {
  let tempDirs = [];
  let originalCwd;

  function createTempProject(name) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-contract-test-'));
    tempDirs.push(root);
    const projectPath = path.join(root, name);
    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes', name, 'specs'), { recursive: true });
    return projectPath;
  }

  function createApiSpec(projectPath, changeName, openapiDoc) {
    const specsDir = path.join(projectPath, 'stdd', 'changes', changeName, 'specs');
    fs.mkdirSync(specsDir, { recursive: true });
    const yamlContent = yaml.dump(openapiDoc, { noRefs: true, lineWidth: -1 });
    fs.writeFileSync(path.join(specsDir, 'api-spec.yaml'), yamlContent, 'utf8');
  }

  function createContracts(projectPath, changeName, contractData) {
    const contractsDir = path.join(projectPath, 'stdd', 'changes', changeName, 'specs', 'contracts');
    fs.mkdirSync(contractsDir, { recursive: true });
    fs.writeFileSync(
      path.join(contractsDir, 'contract.json'),
      JSON.stringify(contractData, null, 2),
      'utf8'
    );
  }

  beforeEach(() => {
    originalCwd = process.cwd();
  });

  afterEach(() => {
    process.chdir(originalCwd);
  });

  afterAll(() => {
    if (originalCwd && process.cwd() !== originalCwd) {
      process.chdir(originalCwd);
    }
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  describe('generate', () => {
    it('should generate contract.json from api-spec.yaml with GET /api/users', async () => {
      const projectPath = createTempProject('generate-users');
      process.chdir(projectPath);

      createApiSpec(projectPath, 'generate-users', {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/users': {
            get: { summary: 'List users', responses: { '200': { description: 'OK' } } },
            post: { summary: 'Create user', responses: { '201': { description: 'Created' } } },
          },
        },
      });

      const cmd = new ContractCommand(projectPath);
      const result = await cmd.generate('generate-users');

      expect(fs.existsSync(result.outputPath)).toBe(true);

      const contract = JSON.parse(fs.readFileSync(result.outputPath, 'utf8'));
      expect(contract.consumer).toBe('my-frontend');
      expect(contract.provider).toBe('api-service');
      expect(contract.interactions.length).toBe(2);

      const getInteraction = contract.interactions.find(i => i.request.method === 'GET');
      expect(getInteraction).toBeDefined();
      expect(getInteraction.request.path).toBe('/api/users');
      expect(getInteraction.response.status).toBe(200);

      const postInteraction = contract.interactions.find(i => i.request.method === 'POST');
      expect(postInteraction).toBeDefined();
      expect(postInteraction.response.status).toBe(201);
    });

    it('should generate multiple interactions for multiple paths and methods', async () => {
      const projectPath = createTempProject('generate-multi');
      process.chdir(projectPath);

      createApiSpec(projectPath, 'generate-multi', {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/users/{id}': {
            get: { summary: 'Get user', responses: { '200': { description: 'OK' } } },
            put: { summary: 'Update user', responses: { '200': { description: 'OK' } } },
            delete: { summary: 'Delete user', responses: { '204': { description: 'No Content' } } },
          },
          '/api/health': {
            get: { summary: 'Health check', responses: {} },
          },
        },
      });

      const cmd = new ContractCommand(projectPath);
      const result = await cmd.generate('generate-multi');

      const contract = JSON.parse(fs.readFileSync(result.outputPath, 'utf8'));
      expect(contract.interactions.length).toBe(4);

      expect(contract.interactions.some(i => i.description.includes('DELETE'))).toBe(true);
      expect(contract.interactions.some(i => i.description.includes('GET /api/health'))).toBe(true);
      const healthInteraction = contract.interactions.find(i => i.request.path === '/api/health');
      expect(healthInteraction.response.status).toBe(200);
    });

    it('should use custom consumer and provider names', async () => {
      const projectPath = createTempProject('generate-custom-names');
      process.chdir(projectPath);

      createApiSpec(projectPath, 'generate-custom-names', {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/items': {
            get: { summary: 'List items', responses: { '200': { description: 'OK' } } },
          },
        },
      });

      const cmd = new ContractCommand(projectPath);
      const result = await cmd.generate('generate-custom-names', {
        consumer: 'web-client',
        provider: 'item-api',
      });

      const contract = JSON.parse(fs.readFileSync(result.outputPath, 'utf8'));
      expect(contract.consumer).toBe('web-client');
      expect(contract.provider).toBe('item-api');
    });

    it('should output JSON when --json option is passed', async () => {
      const projectPath = createTempProject('generate-json-output');
      process.chdir(projectPath);

      createApiSpec(projectPath, 'generate-json-output', {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/test': {
            get: { summary: 'Test', responses: { '200': { description: 'OK' } } },
          },
        },
      });

      const cmd = new ContractCommand(projectPath);
      const result = await cmd.generate('generate-json-output', { json: true });

      expect(result).toHaveProperty('contractDoc');
      expect(result).toHaveProperty('evidence');
      expect(result.outputPath).toBeDefined();
    });

    it('should throw when api-spec.yaml does not exist', async () => {
      const projectPath = createTempProject('generate-missing-spec');
      process.chdir(projectPath);

      const cmd = new ContractCommand(projectPath);
      await expect(cmd.generate('generate-missing-spec')).rejects.toThrow(
        "API spec not found"
      );
    });

    it('should throw when api-spec.yaml has no paths', async () => {
      const projectPath = createTempProject('generate-no-paths');
      process.chdir(projectPath);

      createApiSpec(projectPath, 'generate-no-paths', {
        openapi: '3.0.0',
        info: { title: 'Empty API', version: '1.0.0' },
        paths: {},
      });

      const cmd = new ContractCommand(projectPath);
      await expect(cmd.generate('generate-no-paths')).rejects.toThrow(
        'Invalid OpenAPI spec: no paths defined'
      );
    });

    it('should save evidence file after generate', async () => {
      const projectPath = createTempProject('generate-evidence');
      process.chdir(projectPath);

      createApiSpec(projectPath, 'generate-evidence', {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/test': {
            get: { summary: 'Test', responses: { '200': { description: 'OK' } } },
          },
        },
      });

      const cmd = new ContractCommand(projectPath);
      await cmd.generate('generate-evidence');

      const evidenceDir = path.join(projectPath, 'stdd', 'changes', 'generate-evidence', 'evidence');
      expect(fs.existsSync(evidenceDir)).toBe(true);

      const evidenceFiles = fs.readdirSync(evidenceDir).filter(f => f.startsWith('contract-generate'));
      expect(evidenceFiles.length).toBeGreaterThan(0);
    });
  });

  describe('verify', () => {
    it('should pass when contract interaction matches api-spec', async () => {
      const projectPath = createTempProject('verify-pass');
      process.chdir(projectPath);

      createApiSpec(projectPath, 'verify-pass', {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/users': {
            get: { summary: 'List users', responses: { '200': { description: 'OK' } } },
            post: { summary: 'Create user', responses: { '201': { description: 'Created' } } },
          },
        },
      });

      createContracts(projectPath, 'verify-pass', {
        consumer: 'my-frontend',
        provider: 'api-service',
        interactions: [
          {
            description: 'GET /api/users -> 200',
            request: { method: 'GET', path: '/api/users' },
            response: { status: 200, body: {} },
          },
          {
            description: 'POST /api/users -> 201',
            request: { method: 'POST', path: '/api/users' },
            response: { status: 201, body: {} },
          },
        ],
      });

      const cmd = new ContractCommand(projectPath);
      const result = await cmd.verify('verify-pass');

      expect(result.hasViolations).toBe(false);
      expect(result.results.length).toBe(2);
      expect(result.results.every(r => r.status === 'ok')).toBe(true);
    });

    it('should detect violation when endpoint is removed from api-spec', async () => {
      const projectPath = createTempProject('verify-violation');
      process.chdir(projectPath);

      createApiSpec(projectPath, 'verify-violation', {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/users': {
            get: { summary: 'List users', responses: { '200': { description: 'OK' } } },
          },
        },
      });

      createContracts(projectPath, 'verify-violation', {
        consumer: 'my-frontend',
        provider: 'api-service',
        interactions: [
          {
            description: 'GET /api/users -> 200',
            request: { method: 'GET', path: '/api/users' },
            response: { status: 200, body: {} },
          },
          {
            description: 'DELETE /api/users -> 204',
            request: { method: 'DELETE', path: '/api/users' },
            response: { status: 204, body: {} },
          },
          {
            description: 'POST /api/v2/users -> 201',
            request: { method: 'POST', path: '/api/v2/users' },
            response: { status: 201, body: {} },
          },
        ],
      });

      const cmd = new ContractCommand(projectPath);
      const result = await cmd.verify('verify-violation');

      expect(result.hasViolations).toBe(true);

      const violations = result.results.filter(r => r.status === 'violation');
      expect(violations.length).toBe(2);
      expect(violations.some(v => v.interaction.includes('DELETE'))).toBe(true);
      expect(violations.some(v => v.interaction.includes('POST /api/v2/users'))).toBe(true);

      const okResults = result.results.filter(r => r.status === 'ok');
      expect(okResults.length).toBe(1);
      expect(okResults[0].interaction).toContain('GET /api/users');
    });

    it('should detect violation when path is renamed', async () => {
      const projectPath = createTempProject('verify-renamed');
      process.chdir(projectPath);

      createApiSpec(projectPath, 'verify-renamed', {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '2.0.0' },
        paths: {
          '/api/v2/items': {
            get: { summary: 'List items', responses: { '200': { description: 'OK' } } },
          },
        },
      });

      createContracts(projectPath, 'verify-renamed', {
        consumer: 'my-frontend',
        provider: 'api-service',
        interactions: [
          {
            description: 'GET /api/items -> 200',
            request: { method: 'GET', path: '/api/items' },
            response: { status: 200, body: {} },
          },
        ],
      });

      const cmd = new ContractCommand(projectPath);
      const result = await cmd.verify('verify-renamed');

      expect(result.hasViolations).toBe(true);
      expect(result.results[0].status).toBe('violation');
      expect(result.results[0].message).toContain('NOT defined');
    });

    it('should throw when contracts directory does not exist', async () => {
      const projectPath = createTempProject('verify-no-contracts');
      process.chdir(projectPath);

      createApiSpec(projectPath, 'verify-no-contracts', {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/test': {
            get: { summary: 'Test', responses: { '200': { description: 'OK' } } },
          },
        },
      });

      const cmd = new ContractCommand(projectPath);
      await expect(cmd.verify('verify-no-contracts')).rejects.toThrow(
        'Contracts directory not found'
      );
    });

    it('should throw when no contract JSON files exist', async () => {
      const projectPath = createTempProject('verify-empty-contracts');
      process.chdir(projectPath);

      createApiSpec(projectPath, 'verify-empty-contracts', {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
      });

      const contractsDir = path.join(projectPath, 'stdd', 'changes', 'verify-empty-contracts', 'specs', 'contracts');
      fs.mkdirSync(contractsDir, { recursive: true });

      const cmd = new ContractCommand(projectPath);
      await expect(cmd.verify('verify-empty-contracts')).rejects.toThrow(
        'No contract JSON files found'
      );
    });

    it('should detect invalid contract format', async () => {
      const projectPath = createTempProject('verify-invalid-format');
      process.chdir(projectPath);

      createApiSpec(projectPath, 'verify-invalid-format', {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/test': {
            get: { summary: 'Test', responses: { '200': { description: 'OK' } } },
          },
        },
      });

      const contractsDir = path.join(projectPath, 'stdd', 'changes', 'verify-invalid-format', 'specs', 'contracts');
      fs.mkdirSync(contractsDir, { recursive: true });
      fs.writeFileSync(
        path.join(contractsDir, 'bad-contract.json'),
        JSON.stringify({ consumer: 'test', provider: 'test' }),
        'utf8'
      );

      const cmd = new ContractCommand(projectPath);
      const result = await cmd.verify('verify-invalid-format');

      expect(result.hasViolations).toBe(true);
      expect(result.results[0].status).toBe('violation');
      expect(result.results[0].message).toContain('missing interactions array');
    });

    it('should output JSON when --json option is passed', async () => {
      const projectPath = createTempProject('verify-json-output');
      process.chdir(projectPath);

      createApiSpec(projectPath, 'verify-json-output', {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/test': {
            get: { summary: 'Test', responses: { '200': { description: 'OK' } } },
          },
        },
      });

      createContracts(projectPath, 'verify-json-output', {
        consumer: 'my-frontend',
        provider: 'api-service',
        interactions: [
          {
            description: 'GET /api/test -> 200',
            request: { method: 'GET', path: '/api/test' },
            response: { status: 200, body: {} },
          },
        ],
      });

      const cmd = new ContractCommand(projectPath);
      const result = await cmd.verify('verify-json-output', { json: true });

      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('evidence');
    });
  });

  describe('execute', () => {
    it('should delegate to generate when action is "generate"', async () => {
      const projectPath = createTempProject('exec-gen');
      process.chdir(projectPath);

      createApiSpec(projectPath, 'exec-gen', {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/test': { get: { summary: 'Test', responses: { '200': { description: 'OK' } } } },
        },
      });

      const cmd = new ContractCommand(projectPath);
      const result = await cmd.execute('generate', 'exec-gen');
      expect(result.interactions).toBe(1);
    });

    it('should delegate to generate when action is "gen" alias', async () => {
      const projectPath = createTempProject('exec-gen-alias');
      process.chdir(projectPath);

      createApiSpec(projectPath, 'exec-gen-alias', {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/test': { get: { summary: 'Test', responses: { '200': { description: 'OK' } } } },
        },
      });

      const cmd = new ContractCommand(projectPath);
      const result = await cmd.execute('gen', 'exec-gen-alias');
      expect(result.interactions).toBe(1);
    });

    it('should delegate to verify when action is "verify"', async () => {
      const projectPath = createTempProject('exec-verify');
      process.chdir(projectPath);

      createApiSpec(projectPath, 'exec-verify', {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/test': { get: { summary: 'Test', responses: { '200': { description: 'OK' } } } },
        },
      });

      createContracts(projectPath, 'exec-verify', {
        consumer: 'my-frontend',
        provider: 'api-service',
        interactions: [
          {
            description: 'GET /api/test -> 200',
            request: { method: 'GET', path: '/api/test' },
            response: { status: 200, body: {} },
          },
        ],
      });

      const cmd = new ContractCommand(projectPath);
      const result = await cmd.execute('verify', 'exec-verify');
      expect(result.hasViolations).toBe(false);
    });

    it('should delegate to verify when action is "check" alias', async () => {
      const projectPath = createTempProject('exec-check');
      process.chdir(projectPath);

      createApiSpec(projectPath, 'exec-check', {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/test': { get: { summary: 'Test', responses: { '200': { description: 'OK' } } } },
        },
      });

      createContracts(projectPath, 'exec-check', {
        consumer: 'my-frontend',
        provider: 'api-service',
        interactions: [
          {
            description: 'GET /api/test -> 200',
            request: { method: 'GET', path: '/api/test' },
            response: { status: 200, body: {} },
          },
        ],
      });

      const cmd = new ContractCommand(projectPath);
      const result = await cmd.execute('check', 'exec-check');
      expect(result.hasViolations).toBe(false);
    });

    it('should throw for unknown action', async () => {
      const cmd = new ContractCommand('/tmp');
      await expect(cmd.execute('unknown-action', 'some-change')).rejects.toThrow(
        "Unknown contract action 'unknown-action'. Use generate or verify."
      );
    });
  });

  describe('generate with workspace errors', () => {
    it('should throw when workspace is specified but not found during generate', async () => {
      const projectPath = createTempProject('gen-bad-workspace');
      process.chdir(projectPath);

      const cmd = new ContractCommand(projectPath);
      await expect(cmd.generate('gen-bad-workspace', { workspace: 'nonexistent-ws' }))
        .rejects.toThrow("Workspace 'nonexistent-ws' not found.");
    });
  });

  describe('verify with missing api spec', () => {
    it('should throw when api spec is missing during verify', async () => {
      const projectPath = createTempProject('verify-no-spec');
      process.chdir(projectPath);

      // Create contracts dir and a contract but no api-spec.yaml
      const contractsDir = path.join(projectPath, 'stdd', 'changes', 'verify-no-spec', 'specs', 'contracts');
      fs.mkdirSync(contractsDir, { recursive: true });
      fs.writeFileSync(
        path.join(contractsDir, 'contract.json'),
        JSON.stringify({ consumer: 'a', provider: 'b', interactions: [] }),
        'utf8'
      );

      const cmd = new ContractCommand(projectPath);
      await expect(cmd.verify('verify-no-spec')).rejects.toThrow('API spec not found');
    });
  });

  describe('verify with workspace errors', () => {
    it('should throw when workspace is specified but not found during verify', async () => {
      const projectPath = createTempProject('verify-bad-workspace');
      process.chdir(projectPath);

      const cmd = new ContractCommand(projectPath);
      await expect(cmd.verify('verify-bad-workspace', { workspace: 'missing-ws' }))
        .rejects.toThrow("Workspace 'missing-ws' not found.");
    });
  });

  describe('_toSafeFilename', () => {
    const { toSafeFilename: _toSafe } = require('../src/utils/change-helpers');

    it('should handle null input', () => {
      const cmd = new ContractCommand('/tmp');
    expect(_toSafe(null)).toBe('');
    });

    it('should handle undefined input', () => {
      const cmd = new ContractCommand('/tmp');
      expect(_toSafe(undefined)).toBe('');
    });

    it('should handle empty string', () => {
      const cmd = new ContractCommand('/tmp');
      expect(_toSafe('')).toBe('');
    });

    it('should lowercase and replace special chars', () => {
      const cmd = new ContractCommand('/tmp');
      expect(_toSafe('My Workspace Name!')).toBe('my-workspace-name');
    });

    it('should strip leading and trailing hyphens', () => {
      const cmd = new ContractCommand('/tmp');
      expect(_toSafe('--hello--')).toBe('hello');
    });
  });

  describe('_extractInteractions edge cases', () => {
    it('should handle operations with content in responses', async () => {
      const projectPath = createTempProject('gen-with-content');
      process.chdir(projectPath);

      createApiSpec(projectPath, 'gen-with-content', {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/items': {
            get: {
              summary: 'List items',
              responses: {
                '200': {
                  description: 'OK',
                  content: { 'application/json': { schema: { type: 'array' } } },
                },
              },
            },
          },
        },
      });

      const cmd = new ContractCommand(projectPath);
      const result = await cmd.generate('gen-with-content');

      const contract = JSON.parse(fs.readFileSync(result.outputPath, 'utf8'));
      expect(contract.interactions[0].response.body).toHaveProperty('_schema');
    });

    it('should handle operations with non-standard status codes', async () => {
      const projectPath = createTempProject('gen-nonstandard-status');
      process.chdir(projectPath);

      createApiSpec(projectPath, 'gen-nonstandard-status', {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/api/items': {
            get: {
              summary: 'List items',
              responses: {
                'default': { description: 'Error response' },
              },
            },
          },
        },
      });

      const cmd = new ContractCommand(projectPath);
      const result = await cmd.generate('gen-nonstandard-status');

      const contract = JSON.parse(fs.readFileSync(result.outputPath, 'utf8'));
      expect(contract.interactions.length).toBe(1);
      // parseInt('default', 10) is NaN, so it falls back to 200
      expect(contract.interactions[0].response.status).toBe(200);
    });
  });

  describe('_printResults', () => {
    it('should print results with violations', () => {
      const cmd = new ContractCommand('/tmp');
      const logs = [];
      const origLog = console.log;
      console.log = (...args) => logs.push(args.join(' '));

      cmd._printResults([
        { status: 'ok', interaction: 'GET /a' },
        { status: 'violation', interaction: 'POST /b', message: 'Missing endpoint' },
      ], 1);

      console.log = origLog;
      expect(logs.some(l => l.includes('GET /a'))).toBe(true);
      expect(logs.some(l => l.includes('POST /b'))).toBe(true);
      expect(logs.some(l => l.includes('violation'))).toBe(true);
    });

    it('should print all-pass results', () => {
      const cmd = new ContractCommand('/tmp');
      const logs = [];
      const origLog = console.log;
      console.log = (...args) => logs.push(args.join(' '));

      cmd._printResults([
        { status: 'ok', interaction: 'GET /a' },
        { status: 'ok', interaction: 'POST /b' },
      ], 1);

      console.log = origLog;
      expect(logs.some(l => l.includes('All 2 interaction(s) verified'))).toBe(true);
    });
  });
});
