/**
 * ApiSpec Command
 * Generate OpenAPI 3.0 spec and language-specific types, mocks, and validators from BDD feature files
 *
 * Multi-language support:
 * - TypeScript/JavaScript: interfaces, MSW handlers, Zod schemas
 * - Python: Pydantic models, pytest fixtures, Pydantic validators
 * - Java: POJOs/Records, WireMock stubs, Bean Validation
 * - Go: structs, httptest handlers, validator tags
 * - C#: classes/records, NSubstitute mocks, Data Annotations
 * - Rust: serde structs, httptest mocks, serde validators
 * - PHP: DTO classes, PHPUnit mocks, Symfony/Laravel validation
 *
 * Inspired by:
 * - Orval: OpenAPI → React Query hooks + MSW + Zod
 * - OpenAPI Generator: Multi-language code generation
 * - datamodel-code-generator: Python Pydantic models
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { resolveWorkspace } = require('../../utils/workspace-detector');
const { resolveChangeDir } = require('../../utils/change-utils');

// Language detection patterns
const LANGUAGE_PATTERNS = {
  typescript: ['package.json', 'tsconfig.json'],
  javascript: ['package.json'],
  python: ['requirements.txt', 'setup.py', 'pyproject.toml', 'Pipfile'],
  java: ['pom.xml', 'build.gradle', 'build.gradle.kts'],
  go: ['go.mod'],
  rust: ['Cargo.toml'],
  csharp: ['*.csproj', '*.sln'],
  php: ['composer.json'],
  ruby: ['Gemfile'],
  kotlin: ['build.gradle.kts', 'pom.xml'],
};

// Language aliases
const LANGUAGE_ALIASES = {
  ts: 'typescript',
  js: 'javascript',
  py: 'python',
  golang: 'go',
  cs: 'csharp',
  rb: 'ruby',
};

class ApiSpecCommand {
  constructor() {
    this.languageGenerators = {
      typescript: this.generateTypeScriptArtifacts.bind(this),
      javascript: this.generateTypeScriptArtifacts.bind(this),
      python: this.generatePythonArtifacts.bind(this),
      java: this.generateJavaArtifacts.bind(this),
      go: this.generateGoArtifacts.bind(this),
      rust: this.generateRustArtifacts.bind(this),
      csharp: this.generateCSharpArtifacts.bind(this),
      php: this.generatePhpArtifacts.bind(this),
    };
  }

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
      fs.accessSync(changeDir);
    } catch (error) {
      throw new Error(`Change '${changeName}' does not exist in stdd/changes/.`);
    }

    const specsDir = path.join(changeDir, 'specs');
    const featureFiles = await this.findFeatureFiles(specsDir, workspaceMeta);

    if (featureFiles.length === 0) {
      const suffix = workspaceMeta ? ` for workspace '${workspaceMeta.path}'` : '';
      throw new Error(`No .feature files found${suffix} in stdd/changes/${changeName}/specs/.`);
    }

    // Detect or use specified language
    const language = this.resolveLanguage(options.language || options.lang, projectRoot);

    const openapiDoc = this.generateOpenApiSpec(changeName, featureFiles, workspaceMeta);

    // Determine output directory
    const outputDir = options.outputDir ? path.join(projectRoot, options.outputDir) : specsDir;

    // Generate outputs based on options
    const results = {};
    const generateFull = options.full || options.typesOnly || options.mswOnly || options.mocksOnly || options.zodOnly || options.validatorsOnly;
    const generateTypes = options.full || options.typesOnly;
    const generateMocks = options.full || options.mswOnly || options.mocksOnly;
    const generateValidators = options.full || options.zodOnly || options.validatorsOnly;

    // Always generate OpenAPI spec
    const outputFile = workspaceMeta ? `api-spec.${workspaceMeta.tag}.yaml` : 'api-spec.yaml';
    const outputPath = path.join(outputDir, outputFile);
    const yamlContent = yaml.dump(openapiDoc, { noRefs: true, lineWidth: -1 });
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, yamlContent, 'utf8');
    results.openapi = { path: path.relative(projectRoot, outputPath), doc: openapiDoc, language: 'agnostic' };

    if (options.format === 'json') {
      console.log(JSON.stringify(openapiDoc, null, 2));
    } else {
      console.log(`Generated API spec: ${outputPath}`);
    }

    // Generate language-specific artifacts
    if (generateFull && language !== 'agnostic') {
      const generator = this.languageGenerators[language];
      if (generator) {
        const extractedTypes = this.extractTypeDefinitions(featureFiles);

        if (generateTypes) {
          const typesPath = await this.generateLanguageTypes(language, extractedTypes, outputDir, workspaceMeta);
          results.types = { path: path.relative(projectRoot, typesPath), language };
          console.log(`Generated ${language} types: ${typesPath}`);
        }

        if (generateMocks) {
          const mocksPath = await this.generateLanguageMocks(language, extractedTypes, outputDir, workspaceMeta);
          results.mocks = { path: path.relative(projectRoot, mocksPath), language };
          console.log(`Generated ${language} mocks: ${mocksPath}`);
        }

        if (generateValidators) {
          const validatorsPath = await this.generateLanguageValidators(language, extractedTypes, outputDir, workspaceMeta);
          results.validators = { path: path.relative(projectRoot, validatorsPath), language };
          console.log(`Generated ${language} validators: ${validatorsPath}`);
        }
      } else {
        console.log(`Language '${language}' not yet supported. Generated OpenAPI spec only.`);
        console.log(`Supported languages: ${Object.keys(this.languageGenerators).join(', ')}`);
      }
    }

    return { outputPath, openapiDoc, workspace: workspaceMeta, results, language };
  }

  /**
   * Resolve the target language from options, config, or auto-detection
   */
  resolveLanguage(specifiedLanguage, projectRoot) {
    if (specifiedLanguage) {
      const normalized = LANGUAGE_ALIASES[specifiedLanguage.toLowerCase()] || specifiedLanguage.toLowerCase();
      if (this.languageGenerators[normalized]) {
        return normalized;
      }
      console.log(`Warning: Language '${specifiedLanguage}' not yet supported. Will generate OpenAPI spec only.`);
      return 'agnostic';
    }

    // Try to read from stdd config
    const configPath = path.join(projectRoot, 'stdd.config.yml');
    if (fs.existsSync(configPath)) {
      try {
        const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
        if (config.language && this.languageGenerators[config.language]) {
          return config.language;
        }
      } catch (e) {
        // Ignore config errors
      }
    }

    // Auto-detect from project files
    return this.detectLanguage(projectRoot);
  }

  /**
   * Auto-detect project language from file presence
   */
  detectLanguage(projectRoot) {
    const files = this.listProjectFiles(projectRoot);

    for (const [language, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.startsWith('*')) {
          const ext = pattern.slice(1);
          if (files.some(f => f.endsWith(ext))) return language;
        } else if (files.includes(pattern)) {
          return language;
        }
      }
    }

    return 'agnostic';
  }

  listProjectFiles(projectRoot) {
    const files = [];
    const maxDepth = 3;

    function scanDir(dir, depth) {
      if (depth > maxDepth || !fs.existsSync(dir)) return;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
            scanDir(path.join(dir, entry.name), depth + 1);
          } else if (entry.isFile()) {
            files.push(entry.name);
          }
        }
      } catch (e) {
        // Ignore permission errors
      }
    }

    scanDir(projectRoot, 0);
    return files;
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

  async findFeatureFiles(specsDir, workspace = null) {
    try {
      fs.accessSync(specsDir);
    } catch (error) {
      return [];
    }

    const entries = fs.readdirSync(specsDir);
    let featureFiles = entries
      .filter(entry => entry.endsWith('.feature'))
      .map(entry => path.join(specsDir, entry))
      .sort();

    if (workspace) {
      const scopedFeatureFiles = featureFiles.filter(filePath => this.featureHasWorkspaceScope(filePath));
      featureFiles = scopedFeatureFiles.length > 0
        ? featureFiles.filter(filePath => this.featureBelongsToWorkspace(filePath, workspace))
        : featureFiles;
    }

    return featureFiles;
  }

  featureBelongsToWorkspace(filePath, workspace) {
    const content = fs.readFileSync(filePath, 'utf8');
    const metadataWorkspace = this.extractWorkspaceMetadata(content);
    if (metadataWorkspace) return metadataWorkspace === workspace.path;

    const tags = this.extractWorkspaceTags(content);
    if (tags.length > 0) return tags.includes(workspace.tag);

    return false;
  }

  featureHasWorkspaceScope(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    return Boolean(this.extractWorkspaceMetadata(content)) || this.extractWorkspaceTags(content).length > 0;
  }

  extractWorkspaceMetadata(content) {
    const match = String(content || '').match(/^#\s*Workspace:\s*(.+)$/mi);
    return match ? match[1].trim().replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '') : null;
  }

  extractWorkspaceTags(content) {
    const tags = [];
    const pattern = /@workspace:([^\s]+)/g;
    let match;
    while ((match = pattern.exec(String(content || ''))) !== null) {
      tags.push(match[1].trim());
    }
    return tags;
  }

  readFeatureFile(filePath) {
    return fs.readFileSync(filePath, 'utf8');
  }

  generateOpenApiSpec(changeName, featureFiles, workspace = null) {
    const doc = {
      openapi: '3.0.0',
      info: {
        title: workspace ? `API Spec for ${changeName} (${workspace.path})` : `API Spec for ${changeName}`,
        version: '0.1.0',
        description: 'Auto-generated from BDD feature files. Please refine.',
      },
      paths: {},
      components: {
        schemas: {},
      },
    };

    if (workspace) {
      doc['x-stdd-workspace'] = workspace.path;
    }

    for (const featureFile of featureFiles) {
      const content = fs.readFileSync(featureFile, 'utf8');
      const endpoints = this.extractEndpoints(content);

      for (const endpoint of endpoints) {
        this.addPathToOpenApi(doc, endpoint, featureFile);
      }
    }

    if (Object.keys(doc.components.schemas).length === 0) {
      delete doc.components.schemas;
    }

    return doc;
  }

  extractEndpoints(content) {
    const endpoints = [];
    const methodPattern = /\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\/[\w\/{}\-\._]*)/gi;
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      let match;
      while ((match = methodPattern.exec(line)) !== null) {
        const method = match[1].toUpperCase();
        const routePath = match[2];

        const requestHints = this.extractRequestHints(lines, i);
        const responseHints = this.extractResponseHints(lines, i);

        endpoints.push({
          method,
          path: routePath,
          requestHints,
          responseHints,
          summary: this.extractScenarioSummary(lines, i),
          featureName: this.extractFeatureName(lines),
        });
      }
    }

    return endpoints;
  }

  extractFeatureName(lines) {
    for (const line of lines) {
      if (line.trim().startsWith('Feature:')) {
        return line.replace(/^Feature:\s*/, '').trim();
      }
    }
    return 'Unknown';
  }

  extractRequestHints(lines, matchLineIndex) {
    const hints = [];
    const contextStart = Math.max(0, matchLineIndex - 5);
    const contextEnd = Math.min(lines.length, matchLineIndex + 8);

    for (let i = contextStart; i < contextEnd; i++) {
      const line = lines[i].trim();
      const lower = line.toLowerCase();

      if (lower.includes('request body') || lower.includes('payload') || lower.includes('body')) {
        hints.push({ line: i, type: 'body_ref', text: line });
      }
      if (lower.includes('header') || lower.includes('authorization') || lower.includes('content-type')) {
        hints.push({ line: i, type: 'header', text: line });
      }
      if (lower.includes('param') || lower.includes('query')) {
        hints.push({ line: i, type: 'query_param', text: line });
      }
    }

    return hints;
  }

  extractResponseHints(lines, matchLineIndex) {
    const hints = [];
    const contextStart = Math.max(0, matchLineIndex - 2);
    const contextEnd = Math.min(lines.length, matchLineIndex + 12);

    for (let i = contextStart; i < contextEnd; i++) {
      const line = lines[i].trim();
      const lower = line.toLowerCase();

      const statusCodeMatch = line.match(/\b(2\d{2}|3\d{2}|4\d{2}|5\d{2})\s+([A-Za-z]+)/);
      if (statusCodeMatch) {
        hints.push({
          line: i,
          type: 'status_code',
          code: parseInt(statusCodeMatch[1], 10),
          reason: statusCodeMatch[2],
          text: line,
        });
      }

      if (lower.includes('response body') || lower.includes('returns') || lower.includes('response')) {
        const jsonMatch = line.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          hints.push({ line: i, type: 'response_body', text: line, json: jsonMatch[0] });
        }
      }
    }

    return hints;
  }

  extractScenarioSummary(lines, matchLineIndex) {
    for (let i = matchLineIndex; i >= Math.max(0, matchLineIndex - 20); i--) {
      const line = lines[i].trim();
      if (line.startsWith('Scenario:')) {
        return line.replace(/^Scenario:\s*/, '').trim();
      }
      if (line.startsWith('Scenario Outline:')) {
        return line.replace(/^Scenario Outline:\s*/, '').trim();
      }
    }
    return null;
  }

  addPathToOpenApi(doc, endpoint, featureFile) {
    const { method, path: routePath, requestHints, responseHints, summary } = endpoint;
    const normalizedPath = this.normalizeOpenApiPath(routePath);

    if (!doc.paths[normalizedPath]) {
      doc.paths[normalizedPath] = {};
    }

    const pathItem = doc.paths[normalizedPath];
    const lowerMethod = method.toLowerCase();
    if (!pathItem[lowerMethod]) {
      pathItem[lowerMethod] = {
        summary: summary || `Auto-generated ${method} ${normalizedPath}`,
        tags: this.extractTags(featureFile),
        responses: {},
      };
    }

    const op = pathItem[lowerMethod];

    if (requestHints.length > 0) {
      op.requestBody = this.buildRequestBody(requestHints);
    }

    if (responseHints.length > 0) {
      for (const hint of responseHints) {
        if (hint.type === 'status_code') {
          const statusCode = String(hint.code);
          op.responses[statusCode] = {
            description: `${hint.code} ${hint.reason}`,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  description: 'Response body payload',
                },
              },
            },
          };
        }
      }
    }

    if (Object.keys(op.responses).length === 0) {
      op.responses['200'] = {
        description: `Successful ${method} operation`,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              description: 'Response body payload',
            },
          },
        },
      };
    }

    const pathParams = this.extractPathParams(normalizedPath);
    if (pathParams.length > 0 && !op.parameters) {
      op.parameters = pathParams.map(param => ({
        name: param,
        in: 'path',
        required: true,
        schema: {
          type: 'string',
        },
      }));
    }
  }

  normalizeOpenApiPath(routePath) {
    return routePath.replace(/\{(\w+)\}/g, '{$1}');
  }

  extractPathParams(routePath) {
    const matches = routePath.match(/\{(\w+)\}/g);
    if (!matches) return [];
    return matches.map(m => m.replace(/[{}]/g, ''));
  }

  buildRequestBody(hints) {
    const bodyHint = hints.find(h => h.type === 'body_ref');
    const schema = {
      type: 'object',
      description: bodyHint ? bodyHint.text : 'Request body payload',
      properties: {},
    };

    if (!bodyHint) {
      schema.properties = {
        data: {
          type: 'object',
          description: 'Auto-generated schema',
        },
      };
    }

    return {
      required: true,
      content: {
        'application/json': {
          schema,
        },
      },
    };
  }

  extractTags(featureFile) {
    const baseName = path.basename(featureFile, '.feature');
    return [baseName.replace(/-/g, '_')];
  }

  /**
   * Extract type definitions from feature files
   */
  extractTypeDefinitions(featureFiles) {
    const types = {
      endpoints: [],
      schemas: new Map(),
    };

    for (const featureFile of featureFiles) {
      const content = fs.readFileSync(featureFile, 'utf8');
      const endpoints = this.extractEndpoints(content);

      for (const ep of endpoints) {
        const resourceName = this.inferResourceName(ep.path, ep.method);
        const operationName = this.inferOperationName(ep.method, resourceName);

        types.endpoints.push({
          ...ep,
          operationName,
          resourceName,
          requestType: this.inferRequestType(ep.method, resourceName),
          responseType: this.inferResponseType(ep.method, resourceName),
        });
      }
    }

    return types;
  }

  inferResourceName(routePath, _method) {
    const segments = routePath.split('/').filter(function(s) { return s && !s.startsWith('{'); });
    const lastSegment = segments[segments.length - 1];
    if (lastSegment) {
      return this.singularize(this.pascalCase(lastSegment));
    }
    return 'Resource';
  }

  inferOperationName(method, resourceName) {
    const methodPrefixes = {
      GET: 'get',
      POST: 'create',
      PUT: 'update',
      PATCH: 'patch',
      DELETE: 'delete',
    };
    const prefix = methodPrefixes[method] || method.toLowerCase();
    return prefix + resourceName;
  }

  inferRequestType(method, resourceName) {
    if (method === 'POST') return `Create${resourceName}Request`;
    if (method === 'PUT' || method === 'PATCH') return `Update${resourceName}Request`;
    return null;
  }

  inferResponseType(method, resourceName) {
    if (method === 'DELETE') return null;
    if (method === 'POST') return resourceName;
    return resourceName;
  }

  singularize(word) {
    if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
    if (word.endsWith('ses')) return word.slice(0, -2);
    if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
    return word;
  }

  pascalCase(str) {
    return str
      .replace(/[-_](.)/g, function(_, c) { return c.toUpperCase(); })
      .replace(/^./, function(c) { return c.toUpperCase(); });
  }

  camelCase(str) {
    const pascal = this.pascalCase(str);
    return pascal[0].toLowerCase() + pascal.slice(1);
  }

  /**
   * Generate types for a specific language
   */
  async generateLanguageTypes(language, types, outputDir, workspace) {
    const generators = {
      typescript: this.generateTypeScriptTypes.bind(this),
      javascript: this.generateTypeScriptTypes.bind(this),
      python: this.generatePythonTypes.bind(this),
      java: this.generateJavaTypes.bind(this),
      go: this.generateGoTypes.bind(this),
      rust: this.generateRustTypes.bind(this),
      csharp: this.generateCSharpTypes.bind(this),
      php: this.generatePhpTypes.bind(this),
    };

    const generator = generators[language];
    if (generator) {
      return generator(types, outputDir, workspace);
    }

    throw new Error(`Type generation not supported for language: ${language}`);
  }

  /**
   * Generate mocks for a specific language
   */
  async generateLanguageMocks(language, types, outputDir, workspace) {
    const generators = {
      typescript: this.generateMswHandlers.bind(this),
      javascript: this.generateMswHandlers.bind(this),
      python: this.generatePythonMocks.bind(this),
      java: this.generateJavaMocks.bind(this),
      go: this.generateGoMocks.bind(this),
      rust: this.generateRustMocks.bind(this),
      csharp: this.generateCSharpMocks.bind(this),
      php: this.generatePhpMocks.bind(this),
    };

    const generator = generators[language];
    if (generator) {
      return generator(types, outputDir, workspace);
    }

    throw new Error(`Mock generation not supported for language: ${language}`);
  }

  /**
   * Generate validators for a specific language
   */
  async generateLanguageValidators(language, types, outputDir, workspace) {
    const generators = {
      typescript: this.generateZodSchemas.bind(this),
      javascript: this.generateZodSchemas.bind(this),
      python: this.generatePydanticSchemas.bind(this),
      java: this.generateJavaValidators.bind(this),
      go: this.generateGoValidators.bind(this),
      rust: this.generateRustValidators.bind(this),
      csharp: this.generateCSharpValidators.bind(this),
      php: this.generatePhpValidators.bind(this),
    };

    const generator = generators[language];
    if (generator) {
      return generator(types, outputDir, workspace);
    }

    throw new Error(`Validator generation not supported for language: ${language}`);
  }

  // ===== TypeScript/JavaScript Artifacts =====

  async generateTypeScriptTypes(types, outputDir, workspace) {
    const typesDir = path.join(outputDir, 'typescript', 'types');
    fs.mkdirSync(typesDir, { recursive: true });

    const content = this.generateTypeScriptContent(types, workspace);
    const outputPath = path.join(typesDir, 'api-types.ts');
    fs.writeFileSync(outputPath, content, 'utf8');

    return outputPath;
  }

  generateTypeScriptContent(types, workspace) {
    const lines = [
      '/**',
      ' * Auto-generated TypeScript types from BDD feature files',
      ` * Generated at: ${new Date().toISOString()}`,
      workspace ? ` * Workspace: ${workspace.path}` : '',
      ' *',
      ' * @stdd:api-spec',
      ' *',
      ' * Inspired by: Orval, openapi-typescript',
      ' */',
      '',
    ];

    const resourceTypes = new Set();
    for (const ep of types.endpoints) {
      if (ep.resourceName) resourceTypes.add(ep.resourceName);
    }

    for (const resourceName of resourceTypes) {
      lines.push(`export interface ${resourceName} {`);
      lines.push(`  id: number;`);
      lines.push(`  ${this.camelCase(resourceName)}: string;`);
      lines.push(`  // TODO: Add properties from BDD scenarios`);
      lines.push(`}`);
      lines.push('');
    }

    lines.push(`export interface ApiResponse<T> {`);
    lines.push(`  data: T;`);
    lines.push(`  status: number;`);
    lines.push(`  message?: string;`);
    lines.push(`}`);
    lines.push('');

    return lines.filter(function(l) { return l !== ''; }).join('\n');
  }

  async generateMswHandlers(types, outputDir, workspace) {
    const mocksDir = path.join(outputDir, 'typescript', 'mocks');
    fs.mkdirSync(mocksDir, { recursive: true });

    const content = this.generateMswContent(types, workspace);
    const outputPath = path.join(mocksDir, 'msw-handlers.ts');
    fs.writeFileSync(outputPath, content, 'utf8');

    return outputPath;
  }

  generateMswContent(types, workspace) {
    const lines = [
      '/**',
      ' * Auto-generated MSW (Mock Service Worker) handlers from BDD feature files',
      ` * Generated at: ${new Date().toISOString()}`,
      workspace ? ` * Workspace: ${workspace.path}` : '',
      ' *',
      ' * @stdd:api-spec',
      ' * @see https://mswjs.io',
      ' */',
      '',
      "import { http, HttpResponse } from 'msw';",
      '',
    ];

    const handlersByResource = new Map();
    for (const ep of types.endpoints) {
      if (!handlersByResource.has(ep.resourceName)) {
        handlersByResource.set(ep.resourceName, []);
      }
      handlersByResource.get(ep.resourceName).push(ep);
    }

    for (const [resourceName, endpoints] of handlersByResource) {
      const handlerName = this.camelCase(resourceName) + 'Handlers';
      lines.push(`export const ${handlerName} = [`);

      for (const ep of endpoints) {
        const lowerMethod = ep.method.toLowerCase();
        const normalizedPath = this.normalizeOpenApiPath(ep.path);
        lines.push(`  http.${lowerMethod}('${normalizedPath}', () => {`);

        if (ep.method === 'GET') {
          lines.push(`    return HttpResponse.json({ data: [] });`);
        } else if (ep.method === 'POST') {
          lines.push(`    return HttpResponse.json({ data: { id: Date.now() } }, { status: 201 });`);
        } else if (ep.method === 'DELETE') {
          lines.push(`    return new HttpResponse(null, { status: 204 });`);
        } else {
          lines.push(`    return HttpResponse.json({ data: {} });`);
        }

        lines.push(`  }),`);
      }

      lines.push(`];`);
      lines.push('');
    }

    lines.push(`export const handlers = [`);
    for (const [resourceName] of handlersByResource) {
      lines.push(`  ...${this.camelCase(resourceName)}Handlers,`);
    }
    lines.push(`];`);

    return lines.filter(function(l) { return l !== ''; }).join('\n');
  }

  async generateZodSchemas(types, outputDir, workspace) {
    const validatorsDir = path.join(outputDir, 'typescript', 'validators');
    fs.mkdirSync(validatorsDir, { recursive: true });

    const content = this.generateZodContent(types, workspace);
    const outputPath = path.join(validatorsDir, 'zod-schemas.ts');
    fs.writeFileSync(outputPath, content, 'utf8');

    return outputPath;
  }

  generateZodContent(types, workspace) {
    const lines = [
      '/**',
      ' * Auto-generated Zod validation schemas from BDD feature files',
      ` * Generated at: ${new Date().toISOString()}`,
      workspace ? ` * Workspace: ${workspace.path}` : '',
      ' *',
      ' * @stdd:api-spec',
      ' * @see https://zod.dev',
      ' */',
      '',
      "import { z } from 'zod';",
      '',
    ];

    const resourceTypes = new Set();
    for (const ep of types.endpoints) {
      if (ep.resourceName) resourceTypes.add(ep.resourceName);
    }

    for (const resourceName of resourceTypes) {
      lines.push(`export const ${resourceName}Schema = z.object({`);
      lines.push(`  id: z.number(),`);
      lines.push(`  ${this.camelCase(resourceName)}: z.string(),`);
      lines.push(`});`);
      lines.push(`export type ${resourceName} = z.infer<typeof ${resourceName}Schema>;`);
      lines.push('');
    }

    // Add generic API response wrapper schema
    lines.push(`// Generic API response wrapper`);
    lines.push(`export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>`);
    lines.push(`  z.object({`);
    lines.push(`    data: dataSchema,`);
    lines.push(`    status: z.number(),`);
    lines.push(`    message: z.string().optional(),`);
    lines.push(`  });`);
    lines.push('');

    return lines.filter(function(l) { return l !== ''; }).join('\n');
  }

  // ===== Python Artifacts =====

  async generatePythonTypes(types, outputDir, workspace) {
    const typesDir = path.join(outputDir, 'python', 'types');
    fs.mkdirSync(typesDir, { recursive: true });

    const content = this.generatePythonTypesContent(types, workspace);
    const outputPath = path.join(typesDir, 'models.py');
    fs.writeFileSync(outputPath, content, 'utf8');

    return outputPath;
  }

  generatePythonTypesContent(types, workspace) {
    const lines = [
      '"""',
      'Auto-generated Pydantic models from BDD feature files',
      `Generated at: ${new Date().toISOString()}`,
      workspace ? `Workspace: ${workspace.path}` : '',
      '',
      '@stdd:api-spec',
      '',
      'Inspired by: Pydantic, datamodel-code-generator',
      '"""',
      '',
      'from pydantic import BaseModel',
      'from typing import Optional, List, Generic, TypeVar',
      'from datetime import datetime',
      '',
      'T = TypeVar("T")',
      '',
    ];

    const resourceTypes = new Set();
    for (const ep of types.endpoints) {
      if (ep.resourceName) resourceTypes.add(ep.resourceName);
    }

    for (const resourceName of resourceTypes) {
      lines.push(`class ${resourceName}(BaseModel):`);
      lines.push(`    id: int`);
      lines.push(`    ${this.camelCase(resourceName)}: str`);
      lines.push(`    # TODO: Add fields from BDD scenarios`);
      lines.push(`    class Config:`);
      lines.push(`        from_attributes = True`);
      lines.push('');
    }

    lines.push(`class ApiResponse(BaseModel, Generic[T]):`);
    lines.push(`    data: T`);
    lines.push(`    status: int`);
    lines.push(`    message: Optional[str] = None`);
    lines.push('');

    return lines.filter(function(l) { return l !== ''; }).join('\n');
  }

  async generatePythonMocks(types, outputDir, workspace) {
    const mocksDir = path.join(outputDir, 'python', 'mocks');
    fs.mkdirSync(mocksDir, { recursive: true });

    const content = this.generatePythonMocksContent(types, workspace);
    const outputPath = path.join(mocksDir, 'fixtures.py');
    fs.writeFileSync(outputPath, content, 'utf8');

    return outputPath;
  }

  generatePythonMocksContent(types, workspace) {
    const lines = [
      '"""',
      'Auto-generated pytest fixtures from BDD feature files',
      `Generated at: ${new Date().toISOString()}`,
      workspace ? `Workspace: ${workspace.path}` : '',
      '',
      '@stdd:api-spec',
      '"""',
      '',
      'import pytest',
      'from typing import Dict, Any',
      '',
    ];

    const resourceTypes = new Set();
    for (const ep of types.endpoints) {
      if (ep.resourceName) resourceTypes.add(ep.resourceName);
    }

    for (const resourceName of resourceTypes) {
      const snakeCaseName = this.camelCase(resourceName).replace(/([A-Z])/g, '_$1').toLowerCase();
      lines.push(`@pytest.fixture`);
      lines.push(`def mock_${snakeCaseName}() -> Dict[str, Any]:`);
      lines.push(`    return {`);
      lines.push(`        "id": 1,`);
      lines.push(`        "${this.camelCase(resourceName)}": "example",`);
      lines.push(`    }`);
      lines.push('');
    }

    return lines.filter(function(l) { return l !== ''; }).join('\n');
  }

  async generatePydanticSchemas(types, outputDir, workspace) {
    // Pydantic models serve as both types and validators
    return this.generatePythonTypes(types, outputDir, workspace);
  }

  // ===== Java Artifacts =====

  async generateJavaTypes(types, outputDir, workspace) {
    const typesDir = path.join(outputDir, 'java', 'types');
    fs.mkdirSync(typesDir, { recursive: true });

    // Generate one file per resource type
    const resourceTypes = new Set();
    for (const ep of types.endpoints) {
      if (ep.resourceName) resourceTypes.add(ep.resourceName);
    }

    const generatedPaths = [];
    for (const resourceName of resourceTypes) {
      const content = this.generateJavaClassContent(resourceName, workspace);
      const outputPath = path.join(typesDir, `${resourceName}.java`);
      fs.writeFileSync(outputPath, content, 'utf8');
      generatedPaths.push(outputPath);
    }

    return generatedPaths[0] || path.join(typesDir, 'README.md');
  }

  generateJavaClassContent(resourceName, workspace) {
    return `/**
 * Auto-generated Java class from BDD feature files
 * Generated at: ${new Date().toISOString()}
${workspace ? ` * Workspace: ${workspace.path}` : ''}
 *
 * @stdd:api-spec
 *
 * Inspired by: OpenAPI Generator, Springdoc
 */

package com.stdd.api.model;

public record ${resourceName}(
    Long id,
    String ${this.camelCase(resourceName)}
    // TODO: Add fields from BDD scenarios
) {
}
`;
  }

  async generateJavaMocks(types, outputDir, workspace) {
    const mocksDir = path.join(outputDir, 'java', 'mocks');
    fs.mkdirSync(mocksDir, { recursive: true });

    const content = this.generateJavaMocksContent(types, workspace);
    const outputPath = path.join(mocksDir, 'MockServer.java');
    fs.writeFileSync(outputPath, content, 'utf8');

    return outputPath;
  }

  generateJavaMocksContent(types, workspace) {
    return `/**
 * Auto-generated WireMock stubs from BDD feature files
 * Generated at: ${new Date().toISOString()}
${workspace ? ` * Workspace: ${workspace.path}` : ''}
 *
 * @stdd:api-spec
 */

package com.stdd.api.mock;

import com.github.tomakehurst.wiremock.client.WireMock;

public class MockServer {
    // TODO: Add WireMock stub mappings based on BDD scenarios

    public static void setupMocks() {
        // Example:
        // WireMock.stubFor(WireMock.get(WireMock.urlPathEqualTo("/api/users"))
        //     .willReturn(WireMock.aResponse()
        //         .withStatus(200)
        //         .withBody("{\\"data\\":[]}")));
    }
}
`;
  }

  async generateJavaValidators(types, outputDir, workspace) {
    const validatorsDir = path.join(outputDir, 'java', 'validators');
    fs.mkdirSync(validatorsDir, { recursive: true });

    const content = `/**
 * Auto-generated Bean Validation from BDD feature files
 * Generated at: ${new Date().toISOString()}
${workspace ? ` * Workspace: ${workspace.path}` : ''}
 *
 * @stdd:api-spec
 */

package com.stdd.api.validator;

import jakarta.validation.constraints.*;

public class UserValidator {
    // TODO: Add Bean Validation annotations based on BDD scenarios

    @NotNull
    @Size(min = 1, max = 100)
    private String name;

    @Email
    private String email;
}
`;
    const outputPath = path.join(validatorsDir, 'UserValidator.java');
    fs.writeFileSync(outputPath, content, 'utf8');

    return outputPath;
  }

  // ===== Go Artifacts =====

  async generateGoTypes(types, outputDir, workspace) {
    const typesDir = path.join(outputDir, 'go', 'types');
    fs.mkdirSync(typesDir, { recursive: true });

    const content = this.generateGoTypesContent(types, workspace);
    const outputPath = path.join(typesDir, 'types.go');
    fs.writeFileSync(outputPath, content, 'utf8');

    return outputPath;
  }

  generateGoTypesContent(types, workspace) {
    const lines = [
      '// Auto-generated Go types from BDD feature files',
      `// Generated at: ${new Date().toISOString()}`,
      workspace ? `// Workspace: ${workspace.path}` : '',
      '//',
      '// @stdd:api-spec',
      '//',
      '// Inspired by: oapi-codegen, go-swagger',
      '',
      'package types',
      '',
    ];

    const resourceTypes = new Set();
    for (const ep of types.endpoints) {
      if (ep.resourceName) resourceTypes.add(ep.resourceName);
    }

    for (const resourceName of resourceTypes) {
      lines.push(`type ${resourceName} struct {`);
      lines.push(`    ID    int    \`json:"id"\``);
      lines.push(`    Name  string \`json:"${this.camelCase(resourceName)}"\``);
      lines.push(`    // TODO: Add fields from BDD scenarios`);
      lines.push(`}`);
      lines.push('');
    }

    lines.push(`type ApiResponse[T any] struct {`);
    lines.push(`    Data    T    \`json:"data"\``);
    lines.push(`    Status  int  \`json:"status"\``);
    lines.push(`    Message *string \`json:"message,omitempty"\``);
    lines.push(`}`);

    return lines.filter(function(l) { return l !== ''; }).join('\n');
  }

  async generateGoMocks(types, outputDir, workspace) {
    const mocksDir = path.join(outputDir, 'go', 'mocks');
    fs.mkdirSync(mocksDir, { recursive: true });

    const content = `// Auto-generated Go test mocks from BDD feature files
// Generated at: ${new Date().toISOString()}
${workspace ? `// Workspace: ${workspace.path}` : ''}
//
// @stdd:api-spec

package mocks

import (
    "net/http"
    "net/http/httptest"
    "encoding/json"
)

// TODO: Add httptest handlers based on BDD scenarios

func MockUsersHandler() *httptest.Server {
    return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]interface{}{
            "data": []interface{}{},
        })
    }))
}
`;
    const outputPath = path.join(mocksDir, 'handlers_test.go');
    fs.writeFileSync(outputPath, content, 'utf8');

    return outputPath;
  }

  async generateGoValidators(types, outputDir, workspace) {
    const validatorsDir = path.join(outputDir, 'go', 'validators');
    fs.mkdirSync(validatorsDir, { recursive: true });

    const content = `// Auto-generated Go validators from BDD feature files
// Generated at: ${new Date().toISOString()}
${workspace ? `// Workspace: ${workspace.path}` : ''}
//
// @stdd:api-spec

package validators

import "github.com/go-playground/validator/v10"

var validate = validator.New()

// TODO: Add validator tags based on BDD scenarios

type UserRequest struct {
    Name  string \`validate:"required,min=1,max=100"\`
    Email string \`validate:"required,email"\`
}

func ValidateUser(req UserRequest) error {
    return validate.Struct(req)
}
`;
    const outputPath = path.join(validatorsDir, 'validators.go');
    fs.writeFileSync(outputPath, content, 'utf8');

    return outputPath;
  }

  // ===== Rust Artifacts =====

  async generateRustTypes(types, outputDir, workspace) {
    const typesDir = path.join(outputDir, 'rust', 'types');
    fs.mkdirSync(typesDir, { recursive: true });

    const content = this.generateRustTypesContent(types, workspace);
    const outputPath = path.join(typesDir, 'types.rs');
    fs.writeFileSync(outputPath, content, 'utf8');

    return outputPath;
  }

  generateRustTypesContent(types, workspace) {
    const lines = [
      '// Auto-generated Rust types from BDD feature files',
      `// Generated at: ${new Date().toISOString()}`,
      workspace ? `// Workspace: ${workspace.path}` : '',
      '//',
      '// @stdd:api-spec',
      '//',
      '// Inspired by: proteus, openapi',
      '',
      'use serde::{Serialize, Deserialize};',
      '',
    ];

    const resourceTypes = new Set();
    for (const ep of types.endpoints) {
      if (ep.resourceName) resourceTypes.add(ep.resourceName);
    }

    for (const resourceName of resourceTypes) {
      lines.push(`#[derive(Debug, Clone, Serialize, Deserialize)]`);
      lines.push(`pub struct ${resourceName} {`);
      lines.push(`    pub id: i64,`);
      lines.push(`    pub ${this.camelCase(resourceName)}: String,`);
      lines.push(`    // TODO: Add fields from BDD scenarios`);
      lines.push(`}`);
      lines.push('');
    }

    return lines.filter(function(l) { return l !== ''; }).join('\n');
  }

  async generateRustMocks(types, outputDir, workspace) {
    const mocksDir = path.join(outputDir, 'rust', 'mocks');
    fs.mkdirSync(mocksDir, { recursive: true });

    const content = `// Auto-generated Rust mocks from BDD feature files
// Generated at: ${new Date().toISOString()}
${workspace ? `// Workspace: ${workspace.path}` : ''}
//
// @stdd:api-spec

// TODO: Add mock server implementations based on BDD scenarios
`;
    const outputPath = path.join(mocksDir, 'mocks.rs');
    fs.writeFileSync(outputPath, content, 'utf8');

    return outputPath;
  }

  async generateRustValidators(types, outputDir, workspace) {
    // In Rust, validation is often done with serde
    return this.generateRustTypes(types, outputDir, workspace);
  }

  // ===== C# Artifacts =====

  async generateCSharpTypes(types, outputDir, workspace) {
    const typesDir = path.join(outputDir, 'csharp', 'Types');
    fs.mkdirSync(typesDir, { recursive: true });

    // Generate files for each resource type
    const resourceTypes = new Set();
    for (const ep of types.endpoints) {
      if (ep.resourceName) resourceTypes.add(ep.resourceName);
    }

    const generatedPaths = [];
    for (const resourceName of resourceTypes) {
      const content = this.generateCSharpClassContent(resourceName, workspace);
      const outputPath = path.join(typesDir, `${resourceName}.cs`);
      fs.writeFileSync(outputPath, content, 'utf8');
      generatedPaths.push(outputPath);
    }

    return generatedPaths[0] || path.join(typesDir, 'README.md');
  }

  generateCSharpClassContent(resourceName, workspace) {
    return `// Auto-generated C# types from BDD feature files
// Generated at: ${new Date().toISOString()}
${workspace ? `// Workspace: ${workspace.path}` : ''}
//
// @stdd:api-spec
//
// Inspired by: NSwag, Swashbuckle

namespace Stdd.Api.Types;

public record ${resourceName}(
    long Id,
    string ${this.pascalCase(this.camelCase(resourceName))}
    // TODO: Add properties from BDD scenarios
);

public record ApiResponse<T>(
    T Data,
    int Status,
    string? Message
);
`;
  }

  async generateCSharpMocks(types, outputDir, workspace) {
    const mocksDir = path.join(outputDir, 'csharp', 'Mocks');
    fs.mkdirSync(mocksDir, { recursive: true });

    const content = `// Auto-generated C# mocks from BDD feature files
// Generated at: ${new Date().toISOString()}
${workspace ? `// Workspace: ${workspace.path}` : ''}
//
// @stdd:api-spec

using NSubstitute;

namespace Stdd.Api.Mocks;

// TODO: Add NSubstitute mocks based on BDD scenarios
public class MockUserRepository
{
    public readonly IUserRepository Repository = Substitute.For<IUserRepository>();
}
`;
    const outputPath = path.join(mocksDir, 'MockUserRepository.cs');
    fs.writeFileSync(outputPath, content, 'utf8');

    return outputPath;
  }

  async generateCSharpValidators(types, outputDir, workspace) {
    const validatorsDir = path.join(outputDir, 'csharp', 'Validators');
    fs.mkdirSync(validatorsDir, { recursive: true });

    const content = `// Auto-generated C# validators from BDD feature files
// Generated at: ${new Date().toISOString()}
${workspace ? `// Workspace: ${workspace.path}` : ''}
//
// @stdd:api-spec

using System.ComponentModel.DataAnnotations;

namespace Stdd.Api.Validators;

// TODO: Add Data Annotations based on BDD scenarios
public class UserValidator
{
    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    [EmailAddress]
    public string Email { get; set; } = string.Empty;
}
`;
    const outputPath = path.join(validatorsDir, 'UserValidator.cs');
    fs.writeFileSync(outputPath, content, 'utf8');

    return outputPath;
  }

  // ===== PHP Artifacts =====

  async generatePhpTypes(types, outputDir, workspace) {
    const typesDir = path.join(outputDir, 'php', 'DTO');
    fs.mkdirSync(typesDir, { recursive: true });

    // Generate files for each resource type
    const resourceTypes = new Set();
    for (const ep of types.endpoints) {
      if (ep.resourceName) resourceTypes.add(ep.resourceName);
    }

    const generatedPaths = [];
    for (const resourceName of resourceTypes) {
      const content = this.generatePhpClassContent(resourceName, workspace);
      const outputPath = path.join(typesDir, `${resourceName}DTO.php`);
      fs.writeFileSync(outputPath, content, 'utf8');
      generatedPaths.push(outputPath);
    }

    return generatedPaths[0] || path.join(typesDir, 'README.md');
  }

  generatePhpClassContent(resourceName, workspace) {
    return `<?php
/**
 * Auto-generated PHP DTO from BDD feature files
 * Generated at: ${new Date().toISOString()}
${workspace ? ` * Workspace: ${workspace.path}` : ''}
 *
 * @stdd:api-spec
 */

namespace App\\DTO;

class ${resourceName}DTO
{
    public int $id;
    public string $${this.camelCase(resourceName)};

    // TODO: Add properties from BDD scenarios

    public function __construct(int $id, string $${this.camelCase(resourceName)})
    {
        $this->id = $id;
        $this->${this.camelCase(resourceName)} = $${this.camelCase(resourceName)};
    }
}
`;
  }

  async generatePhpMocks(types, outputDir, workspace) {
    const mocksDir = path.join(outputDir, 'php', 'Mocks');
    fs.mkdirSync(mocksDir, { recursive: true });

    // Get first resource type for the mock handler name
    const resourceName = types.endpoints.length > 0 && types.endpoints[0].resourceName
      ? types.endpoints[0].resourceName
      : 'Resource';

    const content = `<?php
/**
 * Auto-generated PHP mocks from BDD feature files
 * Generated at: ${new Date().toISOString()}
${workspace ? ` * Workspace: ${workspace.path}` : ''}
 *
 * @stdd:api-spec
 */

namespace App\\Mocks;

// TODO: Add PHPUnit mocks based on BDD scenarios
class Mock${resourceName}Handler
{
    public function handle(): array
    {
        return [
            'data' => []
        ];
    }
}
`;
    const outputPath = path.join(mocksDir, 'MockUserHandler.php');
    fs.writeFileSync(outputPath, content, 'utf8');

    return outputPath;
  }

  async generatePhpValidators(types, outputDir, workspace) {
    const validatorsDir = path.join(outputDir, 'php', 'Validators');
    fs.mkdirSync(validatorsDir, { recursive: true });

    const content = `<?php
/**
 * Auto-generated PHP validators from BDD feature files
 * Generated at: ${new Date().toISOString()}
${workspace ? ` * Workspace: ${workspace.path}` : ''}
 *
 * @stdd:api-spec
 */

namespace App\\Validators;

use Symfony\\Component\\Validator\\Constraints as Assert;

// TODO: Add Symfony/Laravel validation rules based on BDD scenarios
class UserValidator
{
    #[Assert\\NotBlank]
    #[Assert\\Length(min: 1, max: 100)]
    public string $name;

    #[Assert\\Email]
    public string $email;
}
`;
    const outputPath = path.join(validatorsDir, 'UserValidator.php');
    fs.writeFileSync(outputPath, content, 'utf8');

    return outputPath;
  }

  // ===== Legacy method for backward compatibility =====

  async generateTypeScriptArtifacts(types, outputDir, workspace) {
    const results = {};
    results.types = await this.generateTypeScriptTypes(types, outputDir, workspace);
    results.mocks = await this.generateMswHandlers(types, outputDir, workspace);
    results.validators = await this.generateZodSchemas(types, outputDir, workspace);
    return results;
  }

  async generatePythonArtifacts(types, outputDir, workspace) {
    const results = {};
    results.types = await this.generatePythonTypes(types, outputDir, workspace);
    results.mocks = await this.generatePythonMocks(types, outputDir, workspace);
    results.validators = await this.generatePydanticSchemas(types, outputDir, workspace);
    return results;
  }

  async generateJavaArtifacts(types, outputDir, workspace) {
    const results = {};
    results.types = await this.generateJavaTypes(types, outputDir, workspace);
    results.mocks = await this.generateJavaMocks(types, outputDir, workspace);
    results.validators = await this.generateJavaValidators(types, outputDir, workspace);
    return results;
  }

  async generateGoArtifacts(types, outputDir, workspace) {
    const results = {};
    results.types = await this.generateGoTypes(types, outputDir, workspace);
    results.mocks = await this.generateGoMocks(types, outputDir, workspace);
    results.validators = await this.generateGoValidators(types, outputDir, workspace);
    return results;
  }

  async generateRustArtifacts(types, outputDir, workspace) {
    const results = {};
    results.types = await this.generateRustTypes(types, outputDir, workspace);
    results.mocks = await this.generateRustMocks(types, outputDir, workspace);
    results.validators = await this.generateRustValidators(types, outputDir, workspace);
    return results;
  }

  async generateCSharpArtifacts(types, outputDir, workspace) {
    const results = {};
    results.types = await this.generateCSharpTypes(types, outputDir, workspace);
    results.mocks = await this.generateCSharpMocks(types, outputDir, workspace);
    results.validators = await this.generateCSharpValidators(types, outputDir, workspace);
    return results;
  }

  async generatePhpArtifacts(types, outputDir, workspace) {
    const results = {};
    results.types = await this.generatePhpTypes(types, outputDir, workspace);
    results.mocks = await this.generatePhpMocks(types, outputDir, workspace);
    results.validators = await this.generatePhpValidators(types, outputDir, workspace);
    return results;
  }
}

module.exports = { ApiSpecCommand };
