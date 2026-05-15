/**
 * ApiSpec Command
 * Generate OpenAPI 3.0 spec from BDD feature files
 */

const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const { resolveWorkspace } = require('../../utils/workspace-detector');
const { resolveChangeDir } = require('../../utils/change-utils');

class ApiSpecCommand {
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

    const specsDir = path.join(changeDir, 'specs');
    const featureFiles = await this.findFeatureFiles(specsDir, workspaceMeta);

    if (featureFiles.length === 0) {
      const suffix = workspaceMeta ? ` for workspace '${workspaceMeta.path}'` : '';
      throw new Error(`No .feature files found${suffix} in stdd/changes/${changeName}/specs/.`);
    }

    const openapiDoc = this.generateOpenApiSpec(changeName, featureFiles, workspaceMeta);

    const outputFile = workspaceMeta ? `api-spec.${workspaceMeta.tag}.yaml` : 'api-spec.yaml';
    const outputPath = path.join(specsDir, outputFile);
    const yamlContent = yaml.dump(openapiDoc, { noRefs: true, lineWidth: -1 });
    await fsPromises.writeFile(outputPath, yamlContent, 'utf8');

    if (options.format === 'json') {
      console.log(JSON.stringify(openapiDoc, null, 2));
    } else {
      console.log(`Generated API spec: ${outputPath}`);
    }

    return { outputPath, openapiDoc, workspace: workspaceMeta };
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
      await fsPromises.access(specsDir);
    } catch (error) {
      return [];
    }

    const entries = await fsPromises.readdir(specsDir);
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

  async readFeatureFile(filePath) {
    return fsPromises.readFile(filePath, 'utf8');
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
        });
      }
    }

    return endpoints;
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
          hints.push({ line: i, type: 'response_body', text: line });
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
                  description: 'TODO: Please refine type',
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
              description: 'TODO: Please refine type',
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
          type: 'object',
          description: 'TODO: Please refine type for parameter ' + param,
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
      description: bodyHint ? bodyHint.text : 'TODO: Please refine request body schema',
      properties: {},
    };

    if (!bodyHint) {
      schema.properties = {
        data: {
          type: 'object',
          description: 'TODO: Please refine type',
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
}

module.exports = { ApiSpecCommand };
