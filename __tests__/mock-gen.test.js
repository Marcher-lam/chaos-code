const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');
const { MockGenCommand } = require('../src/cli/commands/mock-gen');
const { MockCommand } = require('../src/cli/commands/mock');

describe('MockGenCommand', () => {
  let tempDirs = [];
  let originalCwd;

  function createTempProject(name) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-mock-test-'));
    tempDirs.push(root);

    const projectPath = path.join(root, name);
    fs.mkdirSync(projectPath, { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'stdd', 'specs'), { recursive: true });

    return projectPath;
  }

  function createApiSpec(projectPath, changeName, filename, spec) {
    const specsDir = path.join(projectPath, 'stdd', 'changes', changeName, 'specs');
    fs.mkdirSync(specsDir, { recursive: true });
    fs.writeFileSync(path.join(specsDir, filename), yaml.dump(spec, { noRefs: true, lineWidth: -1 }), 'utf8');
  }

  function createWorkspace(projectPath, workspacePath, name) {
    fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({ private: true, workspaces: ['packages/*'] }, null, 2));
    const root = path.join(projectPath, workspacePath);
    fs.mkdirSync(root, { recursive: true });
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name }, null, 2));
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

  it('should generate mock JSON files for endpoints', async () => {
    const projectPath = createTempProject('mock-project');
    process.chdir(projectPath);

    createApiSpec(projectPath, 'add-users', 'api-spec.yaml', {
      openapi: '3.0.0',
      info: { title: 'Users API', version: '0.1.0' },
      paths: {
        '/api/users': {
          get: {
            summary: 'List users',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          name: { type: 'string' },
                          email: { type: 'string', format: 'email' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const cmd = new MockGenCommand();
    const result = await cmd.execute('add-users');

    expect(result.mockFiles).toHaveLength(1);
    expect(result.mockFiles[0].filename).toBe('GET_api_users.json');

    const mockPath = result.mockFiles[0].filePath;
    const mockContent = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
    expect(mockContent).toHaveLength(1);
    expect(mockContent[0]).toHaveProperty('id', 0);
    expect(mockContent[0]).toHaveProperty('email', 'user@example.com');
  });

  it('MockCommand accepts a string target from CLI loader mapping', () => {
    const projectPath = createTempProject('mock-command-target-project');
    const cmd = new MockCommand(projectPath);

    const result = cmd.execute('generate', 'User', { force: true, json: true });

    expect(result.target).toBe('User');
    expect(fs.existsSync(path.join(projectPath, 'src', '__mocks__', 'User.js'))).toBe(true);
  });

  it('should generate mock for POST endpoint with 201 response', async () => {
    const projectPath = createTempProject('mock-post-project');
    process.chdir(projectPath);

    createApiSpec(projectPath, 'create-user', 'api-spec.yaml', {
      openapi: '3.0.0',
      info: { title: 'Create User API', version: '0.1.0' },
      paths: {
        '/api/users': {
          post: {
            summary: 'Create user',
            responses: {
              '201': {
                description: 'Created',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const cmd = new MockGenCommand();
    const result = await cmd.execute('create-user');

    expect(result.mockFiles).toHaveLength(1);
    expect(result.mockFiles[0].filename).toBe('POST_api_users.json');

    const mockPath = result.mockFiles[0].filePath;
    const mockContent = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
    expect(mockContent).toEqual({ id: 0, name: '<string>' });
  });

  it('should use example values when available', async () => {
    const projectPath = createTempProject('mock-example-project');
    process.chdir(projectPath);

    createApiSpec(projectPath, 'with-examples', 'api-spec.yaml', {
      openapi: '3.0.0',
      info: { title: 'Example API', version: '0.1.0' },
      paths: {
        '/api/status': {
          get: {
            summary: 'Get status',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', example: 'healthy' },
                        version: { type: 'string', example: '1.0.0' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const cmd = new MockGenCommand();
    const result = await cmd.execute('with-examples');

    const mockPath = result.mockFiles[0].filePath;
    const mockContent = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
    expect(mockContent).toEqual({ status: 'healthy', version: '1.0.0' });
  });

  it('should generate placeholder when no schema is available', async () => {
    const projectPath = createTempProject('mock-placeholder-project');
    process.chdir(projectPath);

    createApiSpec(projectPath, 'no-schema', 'api-spec.yaml', {
      openapi: '3.0.0',
      info: { title: 'No Schema API', version: '0.1.0' },
      paths: {
        '/api/data': {
          get: {
            summary: 'Get data',
            responses: {
              '200': {
                description: 'Success',
              },
            },
          },
        },
      },
    });

    const cmd = new MockGenCommand();
    const result = await cmd.execute('no-schema');

    const mockPath = result.mockFiles[0].filePath;
    const mockContent = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
    expect(mockContent).toHaveProperty('method', 'GET');
    expect(mockContent).toHaveProperty('path', '/api/data');
    expect(mockContent.statusCode).toBe(200);
    expect(mockContent.body).toHaveProperty('message');
  });

  it('should generate handlers.js with MSW and fetch mock', async () => {
    const projectPath = createTempProject('mock-handlers-project');
    process.chdir(projectPath);

    createApiSpec(projectPath, 'with-handlers', 'api-spec.yaml', {
      openapi: '3.0.0',
      info: { title: 'Handlers API', version: '0.1.0' },
      paths: {
        '/api/users': {
          get: {
            summary: 'List users',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: { type: 'array', items: { type: 'object' } },
                  },
                },
              },
            },
          },
          post: {
            summary: 'Create user',
            responses: { '201': { description: 'Created' } },
          },
        },
      },
    });

    const cmd = new MockGenCommand();
    const result = await cmd.execute('with-handlers');

    expect(fs.existsSync(result.handlersPath)).toBe(true);
    const handlersContent = fs.readFileSync(result.handlersPath, 'utf8');

    expect(handlersContent).toContain('mswHandlers');
    expect(handlersContent).toContain('mockFetch');
    expect(handlersContent).toContain('require(\'msw\')');
    expect(handlersContent).toContain('mocks:');
  });

  it('should handle multiple endpoints', async () => {
    const projectPath = createTempProject('mock-multi-project');
    process.chdir(projectPath);

    createApiSpec(projectPath, 'multi-endpoint', 'api-spec.yaml', {
      openapi: '3.0.0',
      info: { title: 'Multi API', version: '0.1.0' },
      paths: {
        '/api/users': {
          get: { summary: 'List', responses: { '200': { description: 'OK' } } },
          post: { summary: 'Create', responses: { '201': { description: 'Created' } } },
        },
        '/api/users/{id}': {
          get: { summary: 'Get', responses: { '200': { description: 'OK' } } },
          delete: { summary: 'Delete', responses: { '204': { description: 'No Content' } } },
        },
      },
    });

    const cmd = new MockGenCommand();
    const result = await cmd.execute('multi-endpoint');

    expect(result.mockFiles).toHaveLength(4);

    const filenames = result.mockFiles.map(f => f.filename);
    expect(filenames).toContain('GET_api_users.json');
    expect(filenames).toContain('POST_api_users.json');
    expect(filenames).toContain('GET_api_users_id.json');
    expect(filenames).toContain('DELETE_api_users_id.json');
  });

  it('should handle enum values', async () => {
    const projectPath = createTempProject('mock-enum-project');
    process.chdir(projectPath);

    createApiSpec(projectPath, 'enum-change', 'api-spec.yaml', {
      openapi: '3.0.0',
      info: { title: 'Enum API', version: '0.1.0' },
      paths: {
        '/api/status': {
          get: {
            summary: 'Get status',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', enum: ['active', 'inactive', 'pending'] },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const cmd = new MockGenCommand();
    const result = await cmd.execute('enum-change');

    const mockPath = result.mockFiles[0].filePath;
    const mockContent = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
    expect(mockContent.status).toBe('active');
  });

  it('should handle nested objects', async () => {
    const projectPath = createTempProject('mock-nested-project');
    process.chdir(projectPath);

    createApiSpec(projectPath, 'nested-change', 'api-spec.yaml', {
      openapi: '3.0.0',
      info: { title: 'Nested API', version: '0.1.0' },
      paths: {
        '/api/profile': {
          get: {
            summary: 'Get profile',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        user: {
                          type: 'object',
                          properties: {
                            name: { type: 'string' },
                            address: {
                              type: 'object',
                              properties: {
                                city: { type: 'string' },
                                zip: { type: 'string' },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const cmd = new MockGenCommand();
    const result = await cmd.execute('nested-change');

    const mockPath = result.mockFiles[0].filePath;
    const mockContent = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
    expect(mockContent).toHaveProperty('user');
    expect(mockContent.user).toHaveProperty('address');
    expect(mockContent.user.address).toHaveProperty('city');
  });

  it('should throw when change does not exist', async () => {
    const projectPath = createTempProject('missing-change-project');
    process.chdir(projectPath);

    const cmd = new MockGenCommand();

    await expect(cmd.execute('nonexistent-change')).rejects.toThrow(
      "Change 'nonexistent-change' does not exist in stdd/changes/."
    );
  });

  it('should throw when no api-spec.yaml exists', async () => {
    const projectPath = createTempProject('no-spec-project');
    process.chdir(projectPath);

    const changeDir = path.join(projectPath, 'stdd', 'changes', 'no-spec-change');
    fs.mkdirSync(changeDir, { recursive: true });
    fs.mkdirSync(path.join(changeDir, 'specs'));

    const cmd = new MockGenCommand();

    await expect(cmd.execute('no-spec-change')).rejects.toThrow(
      "No api-spec.yaml found"
    );
  });

  it('should generate workspace-scoped mocks', async () => {
    const projectPath = createTempProject('workspace-mock-project');
    process.chdir(projectPath);
    createWorkspace(projectPath, 'packages/api', '@demo/api');

    createApiSpec(projectPath, 'workspace-change', 'api-spec.packages-api.yaml', {
      openapi: '3.0.0',
      info: { title: 'Workspace API', version: '0.1.0' },
      'x-stdd-workspace': 'packages/api',
      paths: {
        '/api/workspace/users': {
          get: {
            summary: 'List workspace users',
            responses: { '200': { description: 'OK' } },
          },
        },
      },
    });

    const cmd = new MockGenCommand();
    const result = await cmd.execute('workspace-change', { workspace: 'packages/api' });

    expect(result.mockFiles).toHaveLength(1);
    expect(result.mockFiles[0].filename).toBe('GET_api_workspace_users.json');
    expect(result.workspace).toMatchObject({ path: 'packages/api', tag: 'packages-api' });
  });

  it('should mock filename correctly sanitizes path params', async () => {
    const projectPath = createTempProject('mock-sanitize-project');
    process.chdir(projectPath);

    createApiSpec(projectPath, 'sanitize-change', 'api-spec.yaml', {
      openapi: '3.0.0',
      info: { title: 'Sanitize API', version: '0.1.0' },
      paths: {
        '/api/users/{userId}/posts/{postId}': {
          get: {
            summary: 'Get user post',
            responses: { '200': { description: 'OK' } },
          },
        },
      },
    });

    const cmd = new MockGenCommand();
    const result = await cmd.execute('sanitize-change');

    expect(result.mockFiles[0].filename).toBe('GET_api_users_userId_posts_postId.json');
  });

  it('should handle boolean and date format types', async () => {
    const projectPath = createTempProject('mock-types-project');
    process.chdir(projectPath);

    createApiSpec(projectPath, 'types-change', 'api-spec.yaml', {
      openapi: '3.0.0',
      info: { title: 'Types API', version: '0.1.0' },
      paths: {
        '/api/event': {
          get: {
            summary: 'Get event',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        active: { type: 'boolean' },
                        createdAt: { type: 'string', format: 'date-time' },
                        date: { type: 'string', format: 'date' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const cmd = new MockGenCommand();
    const result = await cmd.execute('types-change');

    const mockPath = result.mockFiles[0].filePath;
    const mockContent = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
    expect(mockContent.active).toBe(false);
    expect(mockContent.createdAt).toBe('2024-01-01T00:00:00Z');
    expect(mockContent.date).toBe('2024-01-01');
  });

  it('should throw when workspace does not exist', async () => {
    const projectPath = createTempProject('missing-ws-project');
    process.chdir(projectPath);
    fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({ private: true, workspaces: ['packages/*'] }, null, 2));
    fs.mkdirSync(path.join(projectPath, 'stdd', 'changes', 'ws-change'), { recursive: true });

    const cmd = new MockGenCommand();
    await expect(cmd.execute('ws-change', { workspace: 'packages/api' }))
      .rejects
      .toThrow("Workspace 'packages/api' not found.");
  });

  it('should generate placeholder when operation has no responses', async () => {
    const projectPath = createTempProject('mock-no-responses-project');
    process.chdir(projectPath);

    createApiSpec(projectPath, 'no-responses', 'api-spec.yaml', {
      openapi: '3.0.0',
      info: { title: 'No Responses API', version: '0.1.0' },
      paths: {
        '/api/data': {
          get: {
            summary: 'Get data with no responses defined',
          },
        },
      },
    });

    const cmd = new MockGenCommand();
    const result = await cmd.execute('no-responses');

    const mockPath = result.mockFiles[0].filePath;
    const mockContent = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
    expect(mockContent).toHaveProperty('method', 'GET');
    expect(mockContent).toHaveProperty('path', '/api/data');
    expect(mockContent.statusCode).toBe(200);
  });

  it('should generate placeholder when success response has no content', async () => {
    const projectPath = createTempProject('mock-no-content-project');
    process.chdir(projectPath);

    createApiSpec(projectPath, 'no-content', 'api-spec.yaml', {
      openapi: '3.0.0',
      info: { title: 'No Content API', version: '0.1.0' },
      paths: {
        '/api/items': {
          get: {
            summary: 'Get items',
            responses: {
              '200': {
                description: 'Success',
              },
            },
          },
        },
      },
    });

    const cmd = new MockGenCommand();
    const result = await cmd.execute('no-content');

    const mockPath = result.mockFiles[0].filePath;
    const mockContent = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
    expect(mockContent).toHaveProperty('method', 'GET');
    expect(mockContent.body).toHaveProperty('message');
  });

  it('should generate placeholder when schema is missing in content', async () => {
    const projectPath = createTempProject('mock-no-schema-content-project');
    process.chdir(projectPath);

    createApiSpec(projectPath, 'no-schema-content', 'api-spec.yaml', {
      openapi: '3.0.0',
      info: { title: 'No Schema Content API', version: '0.1.0' },
      paths: {
        '/api/items': {
          get: {
            summary: 'Get items',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {},
                },
              },
            },
          },
        },
      },
    });

    const cmd = new MockGenCommand();
    const result = await cmd.execute('no-schema-content');

    const mockPath = result.mockFiles[0].filePath;
    const mockContent = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
    expect(mockContent).toHaveProperty('method', 'GET');
  });

  it('should generate placeholder when success response is null/empty', async () => {
    const projectPath = createTempProject('mock-empty-response-project');
    process.chdir(projectPath);

    createApiSpec(projectPath, 'empty-response', 'api-spec.yaml', {
      openapi: '3.0.0',
      info: { title: 'Empty Response API', version: '0.1.0' },
      paths: {
        '/api/items': {
          delete: {
            summary: 'Delete items',
            responses: {
              '204': { description: 'No Content' },
            },
          },
        },
      },
    });

    const cmd = new MockGenCommand();
    const result = await cmd.execute('empty-response');

    const mockPath = result.mockFiles[0].filePath;
    const mockContent = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
    expect(mockContent).toHaveProperty('method', 'DELETE');
    expect(mockContent.statusCode).toBe(200);
  });

  it('should handle schema with no type but with additionalProperties', async () => {
    const projectPath = createTempProject('mock-additional-props-project');
    process.chdir(projectPath);

    createApiSpec(projectPath, 'additional-props', 'api-spec.yaml', {
      openapi: '3.0.0',
      info: { title: 'Additional Props API', version: '0.1.0' },
      paths: {
        '/api/metadata': {
          get: {
            summary: 'Get metadata',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      additionalProperties: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const cmd = new MockGenCommand();
    const result = await cmd.execute('additional-props');

    const mockPath = result.mockFiles[0].filePath;
    const mockContent = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
    expect(mockContent).toHaveProperty('key');
    expect(mockContent.key).toBe('<string>');
  });

  it('should handle schema with default values for boolean and integer', async () => {
    const projectPath = createTempProject('mock-defaults-project');
    process.chdir(projectPath);

    createApiSpec(projectPath, 'defaults-change', 'api-spec.yaml', {
      openapi: '3.0.0',
      info: { title: 'Defaults API', version: '0.1.0' },
      paths: {
        '/api/settings': {
          get: {
            summary: 'Get settings',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        enabled: { type: 'boolean', default: true },
                        count: { type: 'integer', default: 42 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const cmd = new MockGenCommand();
    const result = await cmd.execute('defaults-change');

    const mockPath = result.mockFiles[0].filePath;
    const mockContent = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
    expect(mockContent.enabled).toBe(true);
    expect(mockContent.count).toBe(42);
  });

  it('should handle uri and uuid format strings', async () => {
    const projectPath = createTempProject('mock-format-strings-project');
    process.chdir(projectPath);

    createApiSpec(projectPath, 'format-strings', 'api-spec.yaml', {
      openapi: '3.0.0',
      info: { title: 'Format Strings API', version: '0.1.0' },
      paths: {
        '/api/resource': {
          get: {
            summary: 'Get resource',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        url: { type: 'string', format: 'uri' },
                        id: { type: 'string', format: 'uuid' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const cmd = new MockGenCommand();
    const result = await cmd.execute('format-strings');

    const mockPath = result.mockFiles[0].filePath;
    const mockContent = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
    expect(mockContent.url).toBe('https://example.com');
    expect(mockContent.id).toBe('00000000-0000-0000-0000-000000000000');
  });

  it('should handle string with default value', async () => {
    const projectPath = createTempProject('mock-string-default-project');
    process.chdir(projectPath);

    createApiSpec(projectPath, 'string-default', 'api-spec.yaml', {
      openapi: '3.0.0',
      info: { title: 'String Default API', version: '0.1.0' },
      paths: {
        '/api/config': {
          get: {
            summary: 'Get config',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', default: 'test-config' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const cmd = new MockGenCommand();
    const result = await cmd.execute('string-default');

    const mockPath = result.mockFiles[0].filePath;
    const mockContent = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
    expect(mockContent.name).toBe('test-config');
  });

  it('should handle array without items (returns empty array)', async () => {
    const projectPath = createTempProject('mock-empty-array-project');
    process.chdir(projectPath);

    createApiSpec(projectPath, 'empty-array', 'api-spec.yaml', {
      openapi: '3.0.0',
      info: { title: 'Empty Array API', version: '0.1.0' },
      paths: {
        '/api/list': {
          get: {
            summary: 'Get list',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const cmd = new MockGenCommand();
    const result = await cmd.execute('empty-array');

    const mockPath = result.mockFiles[0].filePath;
    const mockContent = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
    expect(mockContent).toEqual([]);
  });

  it('should return null for schema depth exceeding 5', async () => {
    const projectPath = createTempProject('mock-deep-nested-project');
    process.chdir(projectPath);

    // Create a schema that's deeply nested (6+ levels)
    createApiSpec(projectPath, 'deep-nested', 'api-spec.yaml', {
      openapi: '3.0.0',
      info: { title: 'Deep Nested API', version: '0.1.0' },
      paths: {
        '/api/deep': {
          get: {
            summary: 'Get deep data',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        l1: {
                          type: 'object',
                          properties: {
                            l2: {
                              type: 'object',
                              properties: {
                                l3: {
                                  type: 'object',
                                  properties: {
                                    l4: {
                                      type: 'object',
                                      properties: {
                                        l5: {
                                          type: 'object',
                                          properties: {
                                            l6: { type: 'string' },
                                          },
                                        },
                                      },
                                    },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const cmd = new MockGenCommand();
    const result = await cmd.execute('deep-nested');

    const mockPath = result.mockFiles[0].filePath;
    const mockContent = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
    // l6 should be null because depth exceeds 5
    expect(mockContent.l1.l2.l3.l4.l5.l6).toBeNull();
  });

  it('should handle defaultForType for all types', () => {
    const cmd = new MockGenCommand();
    expect(cmd.defaultForType('string')).toBe('<string>');
    expect(cmd.defaultForType('number')).toBe(0);
    expect(cmd.defaultForType('integer')).toBe(0);
    expect(cmd.defaultForType('boolean')).toBe(false);
    expect(cmd.defaultForType('array')).toEqual([]);
    expect(cmd.defaultForType('object')).toEqual({});
    expect(cmd.defaultForType('unknown')).toBeNull();
  });

  it('should find workspace-specific api-spec when workspace tag matches', async () => {
    const projectPath = createTempProject('mock-ws-tag-project');
    process.chdir(projectPath);
    createWorkspace(projectPath, 'packages/api', '@demo/api');

    // Create both workspace-specific and default api-spec files
    createApiSpec(projectPath, 'ws-tag-change', 'api-spec.packages-api.yaml', {
      openapi: '3.0.0',
      info: { title: 'WS Tag API', version: '0.1.0' },
      paths: {
        '/api/ws-endpoint': {
          get: { summary: 'WS endpoint', responses: { '200': { description: 'OK' } } },
        },
      },
    });

    const cmd = new MockGenCommand();
    const result = await cmd.execute('ws-tag-change', { workspace: 'packages/api' });

    expect(result.mockFiles).toHaveLength(1);
    expect(result.workspace).toMatchObject({ tag: 'packages-api' });
  });
});
