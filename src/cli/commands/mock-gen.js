/**
 * MockGen Command
 * Generate Mock data/files from BDD specs or API Spec
 */

const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const { resolveWorkspace } = require('../../utils/workspace-detector');
const { resolveChangeDir } = require('../../utils/change-utils');

class MockGenCommand {
  async execute(changeName, options = {}) {
    const projectRoot = process.cwd();
    const changeDir = resolveChangeDir(path.join(projectRoot, 'stdd'), changeName);
    const workspace = options.workspace ? resolveWorkspace(projectRoot, options.workspace) : null;
    if (options.workspace && !workspace) {
      throw new Error(`Workspace '${options.workspace}' not found.`);
    }
    const workspaceMeta = this.workspaceContext(workspace);

    try {
      if (!changeDir) throw new Error('missing change');
      await fsPromises.access(changeDir);
    } catch (error) {
      throw new Error(`Change '${changeName}' does not exist in stdd/changes/.`);
    }

    const apiSpecPath = this.findApiSpec(changeDir, workspaceMeta);
    if (!apiSpecPath) {
      throw new Error(`No api-spec.yaml found in stdd/changes/${changeName}/specs/. Run 'stdd api-spec ${changeName}' first.`);
    }

    const apiSpecContent = await fsPromises.readFile(apiSpecPath, 'utf8');
    const apiSpec = yaml.load(apiSpecContent);

    const mocksDir = path.join(changeDir, 'mocks');
    await fsPromises.mkdir(mocksDir, { recursive: true });

    const mockFiles = this.generateMockFiles(apiSpec, mocksDir);
    const handlersContent = this.generateHandlers(mockFiles, apiSpec, workspaceMeta);
    const handlersPath = path.join(mocksDir, 'handlers.js');
    await fsPromises.writeFile(handlersPath, handlersContent, 'utf8');

    console.log(`Generated ${mockFiles.length} mock file(s) in ${mocksDir}/`);
    console.log(`Generated handler template: ${handlersPath}`);

    return { mockFiles, handlersPath, workspace: workspaceMeta };
  }

  workspaceContext(workspace) {
    if (!workspace) return null;
    const root = path.relative(process.cwd(), workspace.root).replace(/\\/g, '/') || workspace.name;
    return {
      name: workspace.name,
      path: root,
      tag: this.toSafeFilename(root),
    };
  }

  toSafeFilename(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  findApiSpec(changeDir, workspaceMeta) {
    const specsDir = path.join(changeDir, 'specs');
    const candidates = workspaceMeta
      ? [`api-spec.${workspaceMeta.tag}.yaml`, 'api-spec.yaml']
      : ['api-spec.yaml'];

    for (const candidate of candidates) {
      const fullPath = path.join(specsDir, candidate);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
    return null;
  }

  generateMockFiles(apiSpec, mocksDir) {
    const mockFiles = [];
    const paths = apiSpec.paths || {};

    for (const [routePath, methods] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        if (['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method)) {
          const mockData = this.generateMockData(operation, method.toUpperCase(), routePath);
          const filename = this.mockFilename(method.toUpperCase(), routePath);
          const filePath = path.join(mocksDir, filename);
          fs.writeFileSync(filePath, JSON.stringify(mockData, null, 2) + '\n', 'utf8');
          mockFiles.push({ filename, filePath, method: method.toUpperCase(), routePath });
        }
      }
    }

    return mockFiles;
  }

  generateMockData(operation, method, routePath) {
    const successResponse = operation.responses['200']
      || operation.responses['201']
      || operation.responses['204']
      || Object.values(operation.responses)[0];

    if (!successResponse) {
      return this.placeholderResponse(method, routePath);
    }

    const content = successResponse.content;
    if (!content || !content['application/json']) {
      return this.placeholderResponse(method, routePath);
    }

    const schema = content['application/json'].schema;
    if (!schema) {
      return this.placeholderResponse(method, routePath);
    }

    return this.schemaToMock(schema, method, routePath);
  }

  schemaToMock(schema, method, routePath, depth = 0) {
    if (depth > 5) return null;

    if (schema.example !== undefined) {
      return schema.example;
    }

    if (schema.enum && schema.enum.length > 0) {
      return schema.enum[0];
    }

    switch (schema.type) {
      case 'string':
        return this.stringDefault(schema, routePath);
      case 'number':
      case 'integer':
        return schema.default !== undefined ? schema.default : 0;
      case 'boolean':
        return schema.default !== undefined ? schema.default : false;
      case 'array':
        if (schema.items) {
          const item = this.schemaToMock(schema.items, method, routePath, depth + 1);
          return [item || this.defaultForType(schema.items?.type)];
        }
        return [];
      case 'object':
      default:
        if (schema.properties) {
          const obj = {};
          for (const [key, propSchema] of Object.entries(schema.properties)) {
            obj[key] = this.schemaToMock(propSchema, method, routePath, depth + 1);
          }
          return obj;
        }
        if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
          return { key: this.schemaToMock(schema.additionalProperties, method, routePath, depth + 1) };
        }
        return this.placeholderResponse(method, routePath);
    }
  }

  stringDefault(schema, _routePath) {
    if (schema.default !== undefined) return schema.default;
    if (schema.format === 'date-time') return '2024-01-01T00:00:00Z';
    if (schema.format === 'date') return '2024-01-01';
    if (schema.format === 'email') return 'user@example.com';
    if (schema.format === 'uri') return 'https://example.com';
    if (schema.format === 'uuid') return '00000000-0000-0000-0000-000000000000';
    return `<${schema.description || 'string'}>`;
  }

  defaultForType(type) {
    switch (type) {
      case 'string': return '<string>';
      case 'number':
      case 'integer': return 0;
      case 'boolean': return false;
      case 'array': return [];
      case 'object': return {};
      default: return null;
    }
  }

  placeholderResponse(method, routePath) {
    return {
      method,
      path: routePath,
      statusCode: method === 'POST' ? 201 : 200,
      body: { message: `Mock response for ${method} ${routePath}`, data: null },
    };
  }

  mockFilename(method, routePath) {
    const sanitizedPath = routePath
      .replace(/^\//, '')
      .replace(/\//g, '_')
      .replace(/[{}]/g, '')
      .replace(/[^a-zA-Z0-9_]/g, '_');
    return `${method}_${sanitizedPath}.json`;
  }

  generateHandlers(mockFiles, apiSpec, workspaceMeta) {
    const handlers = mockFiles.map(f => {
      const varName = `mock_${f.method.toLowerCase()}_${f.routePath.replace(/^\//, '').replace(/\//g, '_').replace(/[{}]/g, '')}`;
      const routePathMsw = f.routePath.replace(/\{(\w+)\}/g, ':$1');
      return { ...f, varName, routePathMsw };
    });

    const importLines = handlers.map(h =>
      `const ${h.varName} = require('./${h.filename}');`
    ).join('\n');

    const mswHandlers = handlers.map(h => {
      const methodUpper = h.method;
      const restImport = methodUpper === 'GET' ? 'http.get' : `http.${h.method.toLowerCase()}`;
      return `  ${restImport}('${h.routePathMsw}', () => {
    return HttpResponse.json(${h.varName});
  })`;
    }).join(',\n');

    return `/**
 * Mock Service Worker (MSW) handlers
 * Auto-generated by stdd mock${workspaceMeta ? ` for workspace '${workspaceMeta.path}'` : ''}
 *
 * Usage:
 *   // In test setup:
 *   import { setupServer } from 'msw/node';
 *   import { handlers } from './mocks/handlers';
 *   const server = setupServer(...handlers);
 *   server.listen();
 *
 * Or with standard fetch mock:
 *   import { mockFetch } from './mocks/handlers';
 *   mockFetch();
 */

${importLines}

// MSW (v2) handlers
const { http, HttpResponse } = require('msw');

const mswHandlers = [
${mswHandlers}
];

// Standard fetch mock alternative
function mockFetch(customMocks = null) {
  const mocks = customMocks || {
${handlers.map(h => `    '${h.method} ${h.routePath}': ${h.varName}`).join(',\n')}
  };

  const originalFetch = global.fetch;
  global.fetch = async (url, options = {}) => {
    const method = (options.method || 'GET').toUpperCase();
    const urlPath = typeof url === 'string' ? new URL(url, 'http://localhost').pathname : url.pathname;

    for (const [key, data] of Object.entries(mocks)) {
      const [mockMethod, mockPath] = key.split(' ');
      const regex = new RegExp('^' + mockPath.replace(/:(\w+)/g, '[^/]+') + '$');
      if (mockMethod === method && regex.test(urlPath)) {
        const _isPost = mockMethod === 'POST';
        return {
          ok: true,
          status: _isPost ? 201 : 200,
          json: async () => data,
        };
      }
    }

    if (originalFetch) {
      return originalFetch(url, options);
    }

    return {
      ok: false,
      status: 404,
      json: async () => ({ error: 'No mock found for ' + method + ' ' + urlPath }),
    };
  };

  return () => {
    global.fetch = originalFetch;
  };
}

module.exports = {
  mswHandlers,
  mockFetch,
  mocks: {
${handlers.map(h => `    '${h.method} ${h.routePath}': ${h.varName}`).join(',\n')}
  },
};
`;
  }
}

module.exports = { MockGenCommand };
