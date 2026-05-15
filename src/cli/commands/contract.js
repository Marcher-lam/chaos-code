/**
 * Contract Command
 * Generate and verify Consumer-Driven Contracts from OpenAPI specs
 */

const fsPromises = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const { resolveWorkspace } = require('../../utils/workspace-detector');
const EvidenceCapture = require('../../utils/evidence-capture');
const { resolveChangeDir } = require('../../utils/change-utils');

class ContractCommand {
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
    this.evidence = new EvidenceCapture();
  }

  async generate(changeName, options = {}) {
    const workspace = options.workspace ? resolveWorkspace(this.projectRoot, options.workspace) : null;
    if (options.workspace && !workspace) {
      throw new Error(`Workspace '${options.workspace}' not found.`);
    }

    const changeDir = resolveChangeDir(path.join(this.projectRoot, 'stdd'), changeName, { mustExist: false });
    const apiSpecFile = workspace
      ? path.join(changeDir, 'specs', `api-spec.${this._toSafeFilename(workspace.name)}.yaml`)
      : path.join(changeDir, 'specs', 'api-spec.yaml');

    try {
      await fsPromises.access(apiSpecFile);
    } catch {
      throw new Error(`API spec not found at ${workspace ? `api-spec for workspace '${options.workspace}'` : 'api-spec.yaml'}. Run 'stdd api-spec ${changeName}' first.`);
    }

    const specContent = await fsPromises.readFile(apiSpecFile, 'utf8');
    const openapiDoc = yaml.load(specContent);

    if (!openapiDoc || !openapiDoc.paths || Object.keys(openapiDoc.paths).length === 0) {
      throw new Error('Invalid OpenAPI spec: no paths defined.');
    }

    const contractsDir = path.join(changeDir, 'specs', 'contracts');
    await fsPromises.mkdir(contractsDir, { recursive: true });

    const interactions = this._extractInteractions(openapiDoc);

    const consumer = options.consumer || 'my-frontend';
    const provider = options.provider || 'api-service';

    const contractDoc = {
      consumer,
      provider,
      interactions,
    };

    const contractFileName = workspace
      ? `contract.${this._toSafeFilename(workspace.name)}.json`
      : 'contract.json';
    const contractPath = path.join(contractsDir, contractFileName);

    await fsPromises.writeFile(contractPath, JSON.stringify(contractDoc, null, 2), 'utf8');

    const report = this.evidence.captureVerify('contract-generate', {
      changeName,
      contractsGenerated: interactions.length,
      outputPath: contractPath,
      consumer,
      provider,
    }, {
      projectRoot: this.projectRoot,
      workspace: workspace ? workspace.name : null,
    });

    if (options.json) {
      console.log(JSON.stringify({ status: 'success', contractDoc, evidence: report }, null, 2));
    } else {
      console.log(`Generated ${interactions.length} contract interaction(s).`);
      console.log(`Saved to: ${contractPath}`);
    }

    this.evidence.saveToFile(report, changeDir, 'contract-generate');

    return { outputPath: contractPath, contractDoc, interactions: interactions.length, evidence: report };
  }

  async verify(changeName, options = {}) {
    const workspace = options.workspace ? resolveWorkspace(this.projectRoot, options.workspace) : null;
    if (options.workspace && !workspace) {
      throw new Error(`Workspace '${options.workspace}' not found.`);
    }

    const changeDir = resolveChangeDir(path.join(this.projectRoot, 'stdd'), changeName, { mustExist: false });

    const contractsDir = path.join(changeDir, 'specs', 'contracts');
    try {
      await fsPromises.access(contractsDir);
    } catch {
      throw new Error(`Contracts directory not found. Run 'stdd contract generate ${changeName}' first.`);
    }

    const contractFiles = (await fsPromises.readdir(contractsDir))
      .filter(f => f.endsWith('.json'))
      .map(f => path.join(contractsDir, f));

    if (contractFiles.length === 0) {
      throw new Error('No contract JSON files found. Run "stdd contract generate" first.');
    }

    const contractDocs = await Promise.all(contractFiles.map(async (f) => {
      const content = await fsPromises.readFile(f, 'utf8');
      return { file: f, doc: JSON.parse(content) };
    }));

    const apiSpecFile = workspace
      ? path.join(changeDir, 'specs', `api-spec.${this._toSafeFilename(workspace.name)}.yaml`)
      : path.join(changeDir, 'specs', 'api-spec.yaml');

    try {
      await fsPromises.access(apiSpecFile);
    } catch {
      throw new Error(`API spec not found at ${workspace ? `api-spec for workspace '${options.workspace}'` : 'api-spec.yaml'}.`);
    }

    const specContent = await fsPromises.readFile(apiSpecFile, 'utf8');
    const openapiDoc = yaml.load(specContent);

    const results = this._verifyContracts(contractDocs, openapiDoc);

    const hasViolations = results.some(r => r.status === 'violation');

    const report = this.evidence.captureVerify('contract-verify', {
      changeName,
      contractsChecked: contractDocs.length,
      totalInteractions: results.length,
      passed: results.filter(r => r.status === 'ok').length,
      violations: results.filter(r => r.status === 'violation').length,
      hasViolations,
    }, {
      projectRoot: this.projectRoot,
      workspace: workspace ? workspace.name : null,
    });

    if (options.json) {
      console.log(JSON.stringify({
        status: hasViolations ? 'violation' : 'pass',
        results,
        evidence: report,
      }, null, 2));
    } else {
      this._printResults(results, contractDocs.length);
    }

    this.evidence.saveToFile(report, changeDir, 'contract-verify');

    return { results, hasViolations, evidence: report };
  }

  _extractInteractions(openapiDoc) {
    const interactions = [];
    const paths = openapiDoc.paths || {};

    for (const [routePath, pathItem] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method)) {
          const responses = operation.responses || {};
          const responseEntries = Object.entries(responses).map(([statusCode, responseDef]) => ({
            statusCode: parseInt(statusCode, 10) || 200,
            description: responseDef?.description || `${statusCode} response`,
            hasContent: !!(responseDef?.content),
          }));

          if (responseEntries.length > 0) {
            for (const resp of responseEntries) {
              interactions.push({
                description: `${method.toUpperCase()} ${routePath} -> ${resp.statusCode}`,
                request: {
                  method: method.toUpperCase(),
                  path: routePath,
                },
                response: {
                  status: resp.statusCode,
                  body: resp.hasContent ? { _schema: 'defined' } : {},
                },
              });
            }
          } else {
            interactions.push({
              description: `${method.toUpperCase()} ${routePath} -> 200`,
              request: {
                method: method.toUpperCase(),
                path: routePath,
              },
              response: {
                status: 200,
                body: {},
              },
            });
          }
        }
      }
    }

    return interactions;
  }

  _verifyContracts(contractDocs, openapiDoc) {
    const validPaths = {};
    const paths = openapiDoc.paths || {};

    for (const [routePath, pathItem] of Object.entries(paths)) {
      for (const method of ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']) {
        if (pathItem[method]) {
          const key = `${method.toUpperCase()} ${routePath}`;
          validPaths[key] = { method: method.toUpperCase(), path: routePath };
        }
      }
    }

    const results = [];

    for (const { file, doc } of contractDocs) {
      const contractFileName = path.basename(file);
      if (!doc.interactions || !Array.isArray(doc.interactions)) {
        results.push({
          contract: contractFileName,
          status: 'violation',
          message: 'Invalid contract format: missing interactions array',
        });
        continue;
      }

      for (const interaction of doc.interactions) {
        const key = `${interaction.request.method} ${interaction.request.path}`;
        const exists = validPaths[key];

        if (exists) {
          results.push({
            contract: contractFileName,
            interaction: interaction.description,
            status: 'ok',
            message: `Contract ${interaction.description} matches API spec`,
          });
        } else {
          results.push({
            contract: contractFileName,
            interaction: interaction.description,
            status: 'violation',
            message: `Contract requires ${key} but it is NOT defined in the current API spec. The endpoint may have been removed or renamed.`,
          });
        }
      }
    }

    return results;
  }

  _printResults(results, contractCount) {
    const passed = results.filter(r => r.status === 'ok').length;
    const violations = results.filter(r => r.status === 'violation');

    console.log(`\nContract verification: ${contractCount} contract(s) checked, ${results.length} interaction(s)\n`);

    for (const result of results) {
      if (result.status === 'ok') {
        console.log(`  ✓ ${result.interaction}`);
      } else {
        console.log(`  ✗ ${result.interaction}`);
        console.log(`    ${result.message}`);
      }
    }

    console.log('');
    if (violations.length > 0) {
      console.log(`Result: ${violations.length} violation(s) found. API spec no longer satisfies some contracts.`);
    } else {
      console.log(`Result: All ${passed} interaction(s) verified.`);
    }
  }

  _toSafeFilename(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

module.exports = { ContractCommand };
