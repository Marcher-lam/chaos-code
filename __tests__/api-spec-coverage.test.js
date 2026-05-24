/**
 * Coverage boost: api-spec.js (currently ~74.9% branch, target >85%)
 * Tests standalone utility methods that don't need full feature file setup.
 */
const path = require('path');
const fs = require('fs');
const TMP = path.join(__dirname, '__zc_as_tmp__');
function mkdirp(d) { fs.mkdirSync(d, { recursive: true }); }
function w(p, c) { mkdirp(path.dirname(p)); fs.writeFileSync(p, c, 'utf8'); }

beforeEach(() => mkdirp(TMP));
afterEach(() => fs.rmSync(TMP, { recursive: true, force: true }));

describe('api-spec utility methods', () => {
  const { ApiSpecCommand } = require('../src/cli/commands/api-spec');
  let cmd;

  beforeEach(() => { cmd = new ApiSpecCommand(); });

  describe('singularize', () => {
    it('removes trailing s', () => {
      expect(cmd.singularize('users')).toBe('user');
      expect(cmd.singularize('dogs')).toBe('dog');
    });
    it('converts ies to y', () => {
      expect(cmd.singularize('companies')).toBe('company');
      expect(cmd.singularize('countries')).toBe('country');
    });
    it('converts ses to base', () => {
      expect(cmd.singularize('classes')).toBe('class');
      expect(cmd.singularize('addresses')).toBe('address');
    });
    it('keeps ss words', () => {
      expect(cmd.singularize('address')).toBe('address');
      expect(cmd.singularize('class')).toBe('class');
    });
    it('handles non-plural words', () => {
      expect(cmd.singularize('data')).toBe('data');
      expect(cmd.singularize('info')).toBe('info');
    });
  });

  describe('pascalCase', () => {
    it('converts kebab-case', () => {
      expect(cmd.pascalCase('hello-world')).toBe('HelloWorld');
    });
    it('converts snake_case', () => {
      expect(cmd.pascalCase('hello_world')).toBe('HelloWorld');
    });
    it('handles single word', () => {
      expect(cmd.pascalCase('user')).toBe('User');
    });
    it('handles already PascalCase', () => {
      expect(cmd.pascalCase('AlreadyPascal')).toBe('AlreadyPascal');
    });
  });

  describe('camelCase', () => {
    it('converts PascalCase to camelCase', () => {
      expect(cmd.camelCase('HelloWorld')).toBe('helloWorld');
    });
    it('converts kebab-case to camelCase', () => {
      expect(cmd.camelCase('hello-world')).toBe('helloWorld');
    });
    it('converts snake_case to camelCase', () => {
      expect(cmd.camelCase('hello_world')).toBe('helloWorld');
    });
    it('handles single char', () => {
      expect(cmd.camelCase('A')).toBe('a');
    });
  });

  describe('toSafeFilename', () => {
    it('converts spaces to hyphens', () => {
      expect(cmd.toSafeFilename('Hello World')).toBe('hello-world');
    });
    it('strips leading/trailing hyphens', () => {
      expect(cmd.toSafeFilename('-test-')).toBe('test');
    });
    it('handles empty', () => {
      expect(cmd.toSafeFilename('')).toBe('');
    });
  });

  describe('workspaceContext', () => {
    it('returns null for null', () => {
      expect(cmd.workspaceContext(null)).toBeNull();
    });
    it('returns object for workspace', () => {
      mkdirp(path.join(TMP, 'pkgs', 'app'));
      const ws = { name: 'app', root: path.join(TMP, 'pkgs', 'app') };
      const orig = process.cwd();
      process.chdir(TMP);
      try {
        const ctx = cmd.workspaceContext(ws);
        expect(ctx.name).toBe('app');
        expect(ctx.path).toContain('pkgs');
        expect(ctx.tag).toContain('pkgs');
      } finally { process.chdir(orig); }
    });
  });

  describe('normalizeOpenApiPath', () => {
    it('passes through curly brace params unchanged', () => {
      expect(cmd.normalizeOpenApiPath('/users/{id}')).toBe('/users/{id}');
      expect(cmd.normalizeOpenApiPath('/items/{itemId}')).toBe('/items/{itemId}');
    });
    it('passes through already normalized', () => {
      expect(cmd.normalizeOpenApiPath('/users/{id}')).toBe('/users/{id}');
    });
    it('handles path without params', () => {
      expect(cmd.normalizeOpenApiPath('/users')).toBe('/users');
    });
  });

  describe('extractPathParams', () => {
    it('extracts single param', () => {
      expect(cmd.extractPathParams('/users/{id}')).toEqual(['id']);
    });
    it('extracts multiple params', () => {
      expect(cmd.extractPathParams('/orgs/{orgId}/users/{userId}')).toEqual(['orgId', 'userId']);
    });
    it('returns empty for no params', () => {
      expect(cmd.extractPathParams('/users')).toEqual([]);
      expect(cmd.extractPathParams('/users/list')).toEqual([]);
    });
  });

  describe('extractWorkspaceMetadata', () => {
    it('extracts workspace comment', () => {
      const content = '# Workspace: packages/api\n\nScenario: Test';
      expect(cmd.extractWorkspaceMetadata(content)).toBe('packages/api');
    });
    it('strips trailing slash', () => {
      expect(cmd.extractWorkspaceMetadata('# Workspace: ./packages/app/\n')).toBe('packages/app');
    });
    it('handles backslash paths', () => {
      expect(cmd.extractWorkspaceMetadata('# Workspace: packages\\service\n')).toBe('packages/service');
    });
    it('returns null for no match', () => {
      expect(cmd.extractWorkspaceMetadata('Scenario: Test')).toBeNull();
    });
    it('returns null for empty', () => {
      expect(cmd.extractWorkspaceMetadata('')).toBeNull();
    });
  });

  describe('extractWorkspaceTags', () => {
    it('extracts single tag', () => {
      const content = '  @workspace:api\nScenario: Test';
      expect(cmd.extractWorkspaceTags(content)).toEqual(['api']);
    });
    it('extracts multiple tags', () => {
      const content = '@workspace:org @workspace:team\nScenario: Test';
      expect(cmd.extractWorkspaceTags(content)).toEqual(['org', 'team']);
    });
    it('returns empty for no tags', () => {
      expect(cmd.extractWorkspaceTags('Scenario: Test')).toEqual([]);
    });
    it('handles empty string', () => {
      expect(cmd.extractWorkspaceTags('')).toEqual([]);
    });
  });

  describe('extractFeatureName', () => {
    it('extracts feature name', () => {
      const lines = ['Feature: User Login'];
      expect(cmd.extractFeatureName(lines)).toBe('User Login');
    });
    it('handles extra spaces around feature name', () => {
      const lines = ['Feature:  API Gateway  '];
      expect(cmd.extractFeatureName(lines)).toBe('API Gateway');
    });
    it('returns Unknown for no feature', () => {
      expect(cmd.extractFeatureName(['Background:', 'Scenario: Test'])).toBe('Unknown');
    });
    it('finds feature among other lines', () => {
      const lines = ['# Comment', 'Feature: Search', '  Scenario: Basic'];
      expect(cmd.extractFeatureName(lines)).toBe('Search');
    });
  });

  describe('extractEndpoints', () => {
    it('extracts GET endpoint', () => {
      const content = 'GET /api/users\nScenario: List users';
      const result = cmd.extractEndpoints(content);
      expect(result).toHaveLength(1);
      expect(result[0].method).toBe('GET');
      expect(result[0].path).toBe('/api/users');
    });

    it('extracts POST endpoint', () => {
      const content = 'POST /api/users\nWith request body';
      const result = cmd.extractEndpoints(content);
      expect(result).toHaveLength(1);
      expect(result[0].method).toBe('POST');
    });

    it('extracts PUT and PATCH', () => {
      const content = 'PUT /api/users/1\nPATCH /api/users/1\nScenario: Update';
      const result = cmd.extractEndpoints(content);
      expect(result).toHaveLength(2);
    });

    it('extracts DELETE', () => {
      const content = 'DELETE /api/users/1';
      const result = cmd.extractEndpoints(content);
      expect(result).toHaveLength(1);
      expect(result[0].method).toBe('DELETE');
    });

    it('captures scenario summary for endpoint', () => {
      const content = 'Feature: Users\n\nScenario: Create a user\n  POST /api/users';
      const result = cmd.extractEndpoints(content);
      expect(result).toHaveLength(1);
      expect(result[0].summary).toBe('Create a user');
    });

    it('captures feature name', () => {
      const content = 'Feature: User Management\n\nGET /api/users';
      const result = cmd.extractEndpoints(content);
      expect(result[0].featureName).toBe('User Management');
    });

    it('extracts path params with curly braces', () => {
      const content = 'GET /api/users/{userId}/posts/{postId}';
      const result = cmd.extractEndpoints(content);
      expect(result).toHaveLength(1);
      expect(result[0].path).toContain('{userId}');
    });

    it('handles no endpoints', () => {
      expect(cmd.extractEndpoints('Just some text')).toEqual([]);
    });

    it('finds Scenario Outline summary', () => {
      const content = 'Scenario Outline: Search with filters\n  GET /api/search';
      const result = cmd.extractEndpoints(content);
      expect(result[0].summary).toBe('Search with filters');
    });
  });

  describe('inferResourceName', () => {
    it('infers from path', () => {
      expect(cmd.inferResourceName('/api/users', 'GET')).toBe('User');
      expect(cmd.inferResourceName('/api/blog-posts', 'GET')).toBe('BlogPost');
    });
    it('ignores path params', () => {
      expect(cmd.inferResourceName('/users/{id}/orders', 'GET')).toBe('Order');
    });
    it('returns Resource for empty path', () => {
      expect(cmd.inferResourceName('/', 'GET')).toBe('Resource');
    });
  });

  describe('inferOperationName', () => {
    it('uses get prefix for GET', () => {
      expect(cmd.inferOperationName('GET', 'User')).toBe('getUser');
    });
    it('uses create prefix for POST', () => {
      expect(cmd.inferOperationName('POST', 'User')).toBe('createUser');
    });
    it('uses update prefix for PUT', () => {
      expect(cmd.inferOperationName('PUT', 'User')).toBe('updateUser');
    });
    it('uses patch prefix for PATCH', () => {
      expect(cmd.inferOperationName('PATCH', 'User')).toBe('patchUser');
    });
    it('uses delete prefix for DELETE', () => {
      expect(cmd.inferOperationName('DELETE', 'User')).toBe('deleteUser');
    });
    it('falls back to lowercase method', () => {
      expect(cmd.inferOperationName('OPTIONS', 'User')).toBe('optionsUser');
    });
  });

  describe('inferRequestType', () => {
    it('returns CreateXxxRequest for POST', () => {
      expect(cmd.inferRequestType('POST', 'User')).toBe('CreateUserRequest');
    });
    it('returns UpdateXxxRequest for PUT', () => {
      expect(cmd.inferRequestType('PUT', 'User')).toBe('UpdateUserRequest');
    });
    it('returns UpdateXxxRequest for PATCH', () => {
      expect(cmd.inferRequestType('PATCH', 'User')).toBe('UpdateUserRequest');
    });
    it('returns null for GET', () => {
      expect(cmd.inferRequestType('GET', 'User')).toBeNull();
    });
    it('returns null for DELETE', () => {
      expect(cmd.inferRequestType('DELETE', 'User')).toBeNull();
    });
  });

  describe('inferResponseType', () => {
    it('returns resource name for GET', () => {
      expect(cmd.inferResponseType('GET', 'User')).toBe('User');
    });
    it('returns resource name for POST', () => {
      expect(cmd.inferResponseType('POST', 'User')).toBe('User');
    });
    it('returns null for DELETE', () => {
      expect(cmd.inferResponseType('DELETE', 'User')).toBeNull();
    });
    it('returns resource name for PUT', () => {
      expect(cmd.inferResponseType('PUT', 'Item')).toBe('Item');
    });
  });

  describe('buildRequestBody', () => {
    it('builds body with body_ref hint', () => {
      const hints = [{ type: 'body_ref', text: 'Request body: user data' }];
      const result = cmd.buildRequestBody(hints);
      expect(result.required).toBe(true);
      expect(result.content['application/json'].schema.description).toContain('user data');
    });

    it('builds default body without hints', () => {
      const result = cmd.buildRequestBody([]);
      expect(result.content['application/json'].schema.properties).toHaveProperty('data');
    });
  });

  describe('extractTags', () => {
    it('extracts tag from feature filename', () => {
      expect(cmd.extractTags('/path/to/user-login.feature')).toEqual(['user_login']);
    });
    it('replaces hyphens with underscores', () => {
      expect(cmd.extractTags('blog-post.feature')).toEqual(['blog_post']);
    });
  });

  describe('extractRequestHints', () => {
    it('extracts body hints', () => {
      const lines = ['Given a user', 'When I send request body with data', 'Then success'];
      const hints = cmd.extractRequestHints(lines, 1);
      expect(hints.some(h => h.type === 'body_ref')).toBe(true);
    });

    it('extracts header hints', () => {
      const lines = ['Authorization: Bearer token', 'Content-Type: application/json'];
      const hints = cmd.extractRequestHints(lines, 0);
      expect(hints.some(h => h.type === 'header')).toBe(true);
    });

    it('extracts query param hints', () => {
      const lines = ['query param: page=1', 'param size=10'];
      const hints = cmd.extractRequestHints(lines, 0);
      expect(hints.some(h => h.type === 'query_param')).toBe(true);
    });

    it('returns empty for no hints', () => {
      expect(cmd.extractRequestHints(['nothing here'], 0)).toEqual([]);
    });
  });

  describe('extractResponseHints', () => {
    it('extracts status code hints', () => {
      const lines = ['Then status 200 OK', 'And response body'];
      const hints = cmd.extractResponseHints(lines, 0);
      expect(hints.some(h => h.type === 'status_code' && h.code === 200)).toBe(true);
    });

    it('extracts response body hints with JSON', () => {
      const lines = ['Then response body {"key":"value"}'];
      const hints = cmd.extractResponseHints(lines, 0);
      expect(hints.some(h => h.type === 'response_body')).toBe(true);
    });
  });

  describe('extractScenarioSummary', () => {
    it('finds Scenario line', () => {
      const lines = ['Feature: X', 'Scenario: User login', '  POST /login'];
      expect(cmd.extractScenarioSummary(lines, 1)).toBe('User login');
    });

    it('finds Scenario Outline line', () => {
      const lines = ['Scenario Outline: User search', '  GET /search'];
      expect(cmd.extractScenarioSummary(lines, 1)).toBe('User search');
    });

    it('returns null when no scenario found', () => {
      const lines = ['Feature: X', '  GET /api'];
      expect(cmd.extractScenarioSummary(lines, 1)).toBeNull();
    });
  });

  describe('readFeatureFile', () => {
    it('reads file content', () => {
      w(path.join(TMP, 'test.feature'), 'Feature: Test');
      expect(cmd.readFeatureFile(path.join(TMP, 'test.feature'))).toBe('Feature: Test');
    });
  });
});
