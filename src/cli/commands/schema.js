const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const VALID_JSON_SCHEMA_KEYS = new Set([
  '$id', '$ref', '$schema', 'type', 'const', 'enum', 'multipleOf',
  'maximum', 'exclusiveMaximum', 'minimum', 'exclusiveMinimum',
  'maxLength', 'minLength', 'pattern', 'maxItems', 'minItems',
  'uniqueItems', 'maxProperties', 'minProperties', 'required',
  'properties', 'patternProperties', 'additionalProperties', 'unevaluatedProperties',
  'allOf', 'anyOf', 'oneOf', 'not', 'if', 'then', 'else',
  'dependentSchemas', 'prefixItems', 'items', 'contains',
  'propertyNames', 'contentEncoding', 'contentMediaType',
  'default', 'description', 'title', 'examples', 'deprecated',
  'readOnly', 'writeOnly', 'format', 'formatMinimum', 'formatMaximum',
  'formatExclusiveMinimum', 'formatExclusiveMaximum', 'contentSchema',
  '$defs', '$anchor', '$dynamicRef', '$dynamicAnchor',
  'definitions',
]);

function findSchemasDir(cwd) {
  const candidates = [
    path.join(cwd, 'schemas'),
    path.join(cwd, 'src', 'schemas'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  return null;
}

function scanSchemaFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...scanSchemaFiles(fullPath));
    } else if (entry.isFile()) {
      if (/\.json$/.test(entry.name) || /\.ya?ml$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

function validateJsonFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  try {
    const parsed = JSON.parse(content);
    return { valid: true, data: parsed };
  } catch (err) {
    const lineMatch = err.message.match(/position\s+(\d+)/i);
    let line = null;
    if (lineMatch) {
      const pos = Number(lineMatch[1]);
      const before = content.substring(0, pos);
      line = before.split('\n').length;
    }
    return {
      valid: false,
      error: err.message,
      file: filePath,
      line,
    };
  }
}

function validateYamlFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  try {
    const parsed = yaml.load(content);
    return { valid: true, data: parsed };
  } catch (err) {
    const line = err.mark ? err.mark.line + 1 : null;
    return {
      valid: false,
      error: err.message,
      file: filePath,
      line,
    };
  }
}

function checkStrictSchema(data, filePath) {
  const errors = [];
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    if ('$schema' in data) {
      for (const key of Object.keys(data)) {
        if (key.startsWith('$') && !VALID_JSON_SCHEMA_KEYS.has(key)) {
          errors.push({
            file: filePath,
            message: `Unknown schema keyword: "${key}"`,
          });
        }
        if (key === 'type' && typeof data[key] === 'string') {
          const validTypes = ['string', 'number', 'integer', 'boolean', 'object', 'array', 'null'];
          if (!validTypes.includes(data[key])) {
            errors.push({
              file: filePath,
              message: `Invalid type value: "${data[key]}"`,
            });
          }
        }
        if (typeof data[key] === 'object' && data[key] !== null && !Array.isArray(data[key])) {
          errors.push(...checkStrictSchema(data[key], filePath));
        }
        if (Array.isArray(data[key])) {
          for (const item of data[key]) {
            if (typeof item === 'object' && item !== null) {
              errors.push(...checkStrictSchema(item, filePath));
            }
          }
        }
      }
    }
  }
  return errors;
}

class SchemaCommand {
  constructor(cwd) {
    this.cwd = cwd || process.cwd();
  }

  validate(targetPath, options = {}) {
    const dir = targetPath ? path.resolve(this.cwd, targetPath) : findSchemasDir(this.cwd);

    if (!dir) {
      if (options.json) {
        console.log(JSON.stringify({
          status: 'pass',
          message: 'No schemas/ directory found',
          files: [],
          errors: [],
        }, null, 2));
        return { status: 'pass', errors: [], files: [] };
      }
      console.log('No schemas/ directory found.');
      return { status: 'pass', errors: [], files: [] };
    }

    const files = scanSchemaFiles(dir);

    if (files.length === 0) {
      if (options.json) {
        console.log(JSON.stringify({
          status: 'pass',
          message: 'No schema files found',
          files: [],
          errors: [],
        }, null, 2));
        return { status: 'pass', errors: [], files: [] };
      }
      console.log('No schema files found in ' + path.relative(this.cwd, dir));
      return { status: 'pass', errors: [], files: [] };
    }

    const results = [];
    const allErrors = [];

    for (const file of files) {
      const relFile = path.relative(this.cwd, file);
      const ext = path.extname(file).toLowerCase();

      let result;
      if (ext === '.json') {
        result = validateJsonFile(file);
      } else {
        result = validateYamlFile(file);
      }

      if (!result.valid) {
        allErrors.push({
          file: relFile,
          path: file,
          error: result.error,
          line: result.line,
        });
      }

      if (result.valid && options.strict) {
        const strictErrors = checkStrictSchema(result.data, file);
        for (const se of strictErrors) {
          allErrors.push({
            file: relFile,
            path: se.file,
            error: se.message,
            line: null,
            strict: true,
          });
        }
      }

      results.push({
        file: relFile,
        path: file,
        valid: result.valid,
      });
    }

    const hasErrors = allErrors.length > 0;
    const timestamp = Date.now();
    const evidence = {
      type: 'schema-validation',
      timestamp,
      unixTimestamp: timestamp,
      directory: path.relative(this.cwd, dir),
      files: results.length,
      validFiles: results.filter(r => r.valid).length,
      invalidFiles: allErrors.length,
      strict: options.strict,
      errors: allErrors.map(e => ({
        file: e.file,
        error: e.error,
        line: e.line,
        strict: e.strict || false,
      })),
      status: hasErrors ? 'fail' : 'pass',
    };

    const evidenceDir = path.join(this.cwd, 'stdd', 'evidence');
    let evidenceFile;
    if (fs.existsSync(path.join(this.cwd, 'stdd'))) {
      if (!fs.existsSync(evidenceDir)) {
        fs.mkdirSync(evidenceDir, { recursive: true });
      }
      evidenceFile = path.join(evidenceDir, `schema-validation-${timestamp}.json`);
      fs.writeFileSync(evidenceFile, JSON.stringify(evidence, null, 2), 'utf8');
    }

    if (options.json) {
      console.log(JSON.stringify({
        status: evidence.status,
        directory: evidence.directory,
        files: results,
        errors: allErrors,
        evidence: hasErrors ? evidenceFile : undefined,
      }, null, 2));
    } else {
      if (hasErrors) {
        console.log(`Schema validation failed with ${allErrors.length} error(s):\n`);
        for (const err of allErrors) {
          const loc = err.line ? `:${err.line}` : '';
          const tag = err.strict ? ' [strict]' : '';
          console.log(`  ✗ ${err.file}${loc}${tag}`);
          console.log(`    ${err.error}`);
        }
      } else {
        console.log(`All ${results.length} schema file(s) validated successfully.`);
      }
    }

    return {
      status: hasErrors ? 'fail' : 'pass',
      errors: allErrors,
      files: results,
      evidence: evidence,
    };
  }

  create(name, options = {}) {
    if (!name) throw new Error('Schema name is required.');
    const schemasDir = path.join(this.cwd, 'schemas', 'workflows');
    fs.mkdirSync(schemasDir, { recursive: true });
    const filePath = path.join(schemasDir, `${name}.yaml`);
    if (fs.existsSync(filePath) && !options.force) {
      throw new Error(`Schema '${name}' already exists. Use --force to overwrite.`);
    }
    const doc = {
      version: '1.0',
      name,
      artifacts: {
        proposal: { requires: [] },
        specs: { requires: ['proposal'] },
        design: { requires: ['specs'] },
        tasks: { requires: ['design'] },
      },
    };
    fs.writeFileSync(filePath, yaml.dump(doc), 'utf8');
    if (options.json) console.log(JSON.stringify({ status: 'created', path: filePath }, null, 2));
    else console.log(`Created workflow schema: ${path.relative(this.cwd, filePath)}`);
    return { status: 'created', path: filePath };
  }

  fork(source, name, options = {}) {
    if (!source || !name) throw new Error('Usage: stdd schema fork <source> <name>');
    const sourcePath = path.resolve(this.cwd, source);
    if (!fs.existsSync(sourcePath)) throw new Error(`Source schema not found: ${source}`);
    const targetDir = path.join(this.cwd, 'schemas', 'workflows');
    fs.mkdirSync(targetDir, { recursive: true });
    const targetPath = path.join(targetDir, `${name}${path.extname(sourcePath) || '.yaml'}`);
    if (fs.existsSync(targetPath) && !options.force) throw new Error(`Schema '${name}' already exists. Use --force to overwrite.`);
    fs.copyFileSync(sourcePath, targetPath);
    if (options.json) console.log(JSON.stringify({ status: 'forked', source: sourcePath, path: targetPath }, null, 2));
    else console.log(`Forked schema to: ${path.relative(this.cwd, targetPath)}`);
    return { status: 'forked', source: sourcePath, path: targetPath };
  }
}

module.exports = { SchemaCommand };
