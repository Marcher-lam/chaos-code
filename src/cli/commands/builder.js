/**
 * Builder Command
 * Create custom agents, workflows, and skills for STDD Copilot.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');
const yaml = require('js-yaml');
const { createLogger } = require('../../utils/logger');
const logger = createLogger('builder');

const BUILDERS_DIR = 'stdd/builders';
const EXTENSIONS_DIR = 'stdd/extensions/installed';

const STDD_PHASES = [
  { name: 'propose - Draft requirement proposals', value: 'stdd-propose' },
  { name: 'clarify - Multi-round requirement clarification', value: 'stdd-clarify' },
  { name: 'confirm - User confirmation gate', value: 'stdd-confirm' },
  { name: 'spec - Generate specifications', value: 'stdd-spec' },
  { name: 'plan - Architecture evaluation and micro-tasks', value: 'stdd-plan' },
  { name: 'execute - Ralph Loop TDD execution', value: 'stdd-execute' },
  { name: 'verify - Change readiness verification', value: 'stdd-verify' },
  { name: 'final-doc - Aggregated requirement document', value: 'stdd-final-doc' },
  { name: 'commit-tdd - Atomic git commit with TDD prefix', value: 'stdd-commit-tdd' },
];

const SKILL_CATEGORIES = [
  'spec-first',
  'planning',
  'execution',
  'governance',
  'quality',
  'workflow',
  'custom',
];

class BuilderCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.buildersDir = path.join(cwd, BUILDERS_DIR);
    this.extensionsDir = path.join(cwd, EXTENSIONS_DIR);
  }

  async execute(action = 'list', args = [], options = {}) {
    switch (action) {
      case 'agent':
        return await this.agent(args[0], options);
      case 'workflow':
        return await this.workflow(args[0], options);
      case 'skill':
        return await this.skill(args[0], options);
      case 'list':
        return this.list(options);
      case 'validate':
        return this.validate(args[0], options);
      case 'test':
      case 'dry-run':
        return this.dryRun(args[0], options);
      case 'share':
      case 'publish':
        return this.share(args[0], options);
      case 'export':
        return await this.export(args[0], options);
      default:
        return this.list(options);
    }
  }

  // ── Agent Action ──

  async agent(name, options = {}) {
    if (!name) {
      throw new Error('Agent name is required. Usage: stdd builder agent <name>');
    }

    const safeName = this.sanitizeName(name);
    const agentDir = path.join(this.buildersDir, 'agents');
    const agentPath = path.join(agentDir, `${safeName}.json`);

    if (fs.existsSync(agentPath) && !options.force) {
      throw new Error(`Agent "${safeName}" already exists. Use --force to overwrite.`);
    }

    // Collect fields via CLI flags or interactive prompts
    let expertise = options.expertise ? options.expertise.split(',').map(s => s.trim()) : null;
    let lens = options.lens || null;
    let focus = options.focus ? options.focus.split(',').map(s => s.trim()) : null;

    if (!expertise || !lens || !focus) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'roleId',
          message: 'Role identifier (e.g. security-reviewer, api-designer):',
          default: safeName,
          when: !options.json,
        },
        {
          type: 'input',
          name: 'expertise',
          message: 'Areas of expertise (comma-separated):',
          when: !expertise,
          filter: val => val.split(',').map(s => s.trim()).filter(Boolean),
        },
        {
          type: 'input',
          name: 'lens',
          message: 'Review lens description (e.g. "security vulnerabilities"):',
          when: !lens,
        },
        {
          type: 'input',
          name: 'reviewFocus',
          message: 'Review focus areas (comma-separated):',
          when: !focus,
          filter: val => val.split(',').map(s => s.trim()).filter(Boolean),
        },
        {
          type: 'input',
          name: 'checklist',
          message: 'Checklist items (comma-separated, optional):',
          default: '',
          filter: val => val.split(',').map(s => s.trim()).filter(Boolean),
        },
      ]);

      expertise = expertise || answers.expertise || [];
      lens = lens || answers.lens || '';
      focus = focus || answers.reviewFocus || [];
      const roleId = options.json ? safeName : (answers.roleId || safeName);
      const checklist = answers.checklist || [];

      const agent = this.buildAgentManifest(safeName, roleId, lens, expertise, focus, checklist);
      fs.mkdirSync(agentDir, { recursive: true });
      fs.writeFileSync(agentPath, JSON.stringify(agent, null, 2), 'utf8');

      return this.printResult('agent', safeName, agentPath, agent, options);
    }

    const roleId = safeName;
    const checklist = [];
    const agent = this.buildAgentManifest(safeName, roleId, lens, expertise, focus, checklist);
    fs.mkdirSync(agentDir, { recursive: true });
    fs.writeFileSync(agentPath, JSON.stringify(agent, null, 2), 'utf8');

    return this.printResult('agent', safeName, agentPath, agent, options);
  }

  buildAgentManifest(name, roleId, lens, expertise, reviewFocus, checklist) {
    return {
      id: `custom-${name}`,
      name: name,
      roleId: roleId,
      lens: lens,
      expertise: expertise,
      reviewFocus: reviewFocus,
      checklist: checklist,
      promptTemplate: `As ${name}, analyze '\${topic}' for ${lens}.`,
      custom: true,
      createdAt: new Date().toISOString(),
    };
  }

  // ── Workflow Action ──

  async workflow(name, options = {}) {
    if (!name) {
      throw new Error('Workflow name is required. Usage: stdd builder workflow <name>');
    }

    const safeName = this.sanitizeName(name);
    const workflowDir = path.join(this.buildersDir, 'workflows');
    const workflowPath = path.join(workflowDir, `${safeName}.yaml`);

    if (fs.existsSync(workflowPath) && !options.force) {
      throw new Error(`Workflow "${safeName}" already exists. Use --force to overwrite.`);
    }

    let phases = options.phases ? options.phases.split(',').map(s => s.trim()) : null;
    const intent = options.intent || `Custom workflow: ${safeName}`;

    if (!phases) {
      const answers = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'phases',
          message: 'Select phases for this workflow:',
          choices: STDD_PHASES,
          when: !phases,
        },
        {
          type: 'input',
          name: 'conditions',
          message: 'Conditions (comma-separated, optional):',
          default: '',
          filter: val => val.split(',').map(s => s.trim()).filter(Boolean),
        },
      ]);

      phases = phases || answers.phases || [];
      const conditions = answers.conditions || [];
      const workflow = this.buildWorkflowManifest(safeName, intent, phases, conditions);

      fs.mkdirSync(workflowDir, { recursive: true });
      fs.writeFileSync(workflowPath, yaml.dump(workflow, { lineWidth: -1 }), 'utf8');

      return this.printResult('workflow', safeName, workflowPath, workflow, options);
    }

    const conditions = [];
    const workflow = this.buildWorkflowManifest(safeName, intent, phases, conditions);

    fs.mkdirSync(workflowDir, { recursive: true });
    fs.writeFileSync(workflowPath, yaml.dump(workflow, { lineWidth: -1 }), 'utf8');

    return this.printResult('workflow', safeName, workflowPath, workflow, options);
  }

  buildWorkflowManifest(name, intent, phases, conditions) {
    const phaseEntries = phases.map((skill, idx) => {
      const entry = {
        id: `phase${idx + 1}`,
        skill: skill,
        auto_advance: idx < phases.length - 1,
      };
      // Add human approval gate at mid-point for longer workflows
      if (phases.length >= 4 && idx === Math.floor(phases.length / 2) - 1) {
        entry.gate = 'human_approval';
      }
      return entry;
    });

    return {
      name: name,
      description: intent,
      custom: true,
      createdAt: new Date().toISOString(),
      phases: phaseEntries,
      conditions: conditions,
    };
  }

  // ── Skill Action ──

  async skill(name, options = {}) {
    if (!name) {
      throw new Error('Skill name is required. Usage: stdd builder skill <name>');
    }

    const safeName = this.sanitizeName(name);
    const skillDir = path.join(this.buildersDir, 'skills', safeName);
    const skillPath = path.join(skillDir, 'SKILL.md');

    if (fs.existsSync(skillPath) && !options.force) {
      throw new Error(`Skill "${safeName}" already exists. Use --force to overwrite.`);
    }

    let description = options.description || null;
    let category = options.category || null;
    let phase = options.phase || null;

    if (!description || !category) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'description',
          message: 'Skill description:',
          when: !description,
        },
        {
          type: 'list',
          name: 'category',
          message: 'Skill category:',
          choices: SKILL_CATEGORIES,
          when: !category,
        },
        {
          type: 'input',
          name: 'phase',
          message: 'STDD phase (e.g. planning, execution, governance):',
          default: 'custom',
          when: !phase,
        },
        {
          type: 'input',
          name: 'inputs',
          message: 'Inputs (comma-separated, optional):',
          default: '',
          filter: val => val.split(',').map(s => s.trim()).filter(Boolean),
        },
        {
          type: 'input',
          name: 'outputs',
          message: 'Outputs (comma-separated, optional):',
          default: '',
          filter: val => val.split(',').map(s => s.trim()).filter(Boolean),
        },
      ]);

      description = description || answers.description || '';
      category = category || answers.category || 'custom';
      phase = phase || answers.phase || 'custom';
      const inputs = (answers.inputs || []);
      const outputs = (answers.outputs || []);

      const content = this.buildSkillMarkdown(safeName, description, category, phase, inputs, outputs);
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(skillPath, content, 'utf8');

      return this.printResult('skill', safeName, skillPath, { name: safeName, description, category, phase }, options);
    }

    phase = phase || 'custom';
    const content = this.buildSkillMarkdown(safeName, description, category, phase, [], []);
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(skillPath, content, 'utf8');

    return this.printResult('skill', safeName, skillPath, { name: safeName, description, category, phase }, options);
  }

  buildSkillMarkdown(name, description, category, phase, inputs, outputs) {
    const now = new Date().toISOString();
    const frontmatter = [
      '---',
      `id: stdd.builder.${name}`,
      `command: /stdd:builder`,
      `description: "${(description || '').replace(/"/g, '\\"')}"`,
      `version: "1.0"`,
      `category: ${category}`,
      `phase: ${phase}`,
      `read_only: false`,
      `risk_level: low`,
      `custom: true`,
      `createdAt: "${now}"`,
      'supports:',
      '  greenfield: true',
      '  brownfield: true',
      '  monorepo: true',
      'depends_on: []',
      'next: []',
      'on_failure: []',
      'inputs:',
      ...inputs.map(i => `  - ${i}`),
      'outputs:',
      ...outputs.map(o => `  - ${o}`),
      'evidence:',
      '  required: false',
      `path: stdd/builders/skills/${name}`,
      'constitution_articles:',
      '  blocking: []',
      '  warning: []',
      '  suggestion: []',
      'graph:',
      `  node_id: stdd.builder.${name}`,
      '  parallelizable: false',
      '  resumable: true',
      '  checkpoint: per-invocation',
      '---',
      '',
    ].join('\n');

    const body = [
      `# STDD Skill: /stdd:builder (${name})`,
      '',
      `## Purpose`,
      description || 'Custom skill created via STDD Builder.',
      '',
      `## When to Use`,
      `- When you need ${name} functionality`,
      `- Custom workflow integration`,
      '',
      `## Inputs`,
      inputs.length > 0 ? inputs.map(i => `- ${i}`).join('\n') : '- (none specified)',
      '',
      `## Outputs`,
      outputs.length > 0 ? outputs.map(o => `- ${o}`).join('\n') : '- (none specified)',
      '',
      `## CLI Runtime`,
      '```bash',
      `stdd builder skill ${name}`,
      '```',
      '',
      `## Related Skills`,
      `- stdd.builder - Builder command`,
      '',
      `---`,
      `*Custom skill generated by STDD Builder at ${now}*`,
    ].join('\n');

    return frontmatter + body;
  }

  // ── List Action ──

  list(options = {}) {
    const results = { agents: [], workflows: [], skills: [] };

    // Scan agents
    const agentsDir = path.join(this.buildersDir, 'agents');
    if (fs.existsSync(agentsDir)) {
      const files = fs.readdirSync(agentsDir).filter(f => f.endsWith('.json'));
      for (const file of files) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(agentsDir, file), 'utf8'));
          results.agents.push({
            name: data.name || file.replace('.json', ''),
            type: 'agent',
            id: data.id || '',
            lens: data.lens || '',
            description: (data.expertise || []).join(', '),
          });
        } catch (e) {
          logger.warn(`Failed to parse agent: ${file}`);
        }
      }
    }

    // Scan workflows
    const workflowsDir = path.join(this.buildersDir, 'workflows');
    if (fs.existsSync(workflowsDir)) {
      const files = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
      for (const file of files) {
        try {
          const data = yaml.load(fs.readFileSync(path.join(workflowsDir, file), 'utf8'));
          results.workflows.push({
            name: data.name || file.replace(/\.(yaml|yml)$/, ''),
            type: 'workflow',
            description: data.description || '',
            phases: (data.phases || []).map(p => p.skill),
          });
        } catch (e) {
          logger.warn(`Failed to parse workflow: ${file}`);
        }
      }
    }

    // Scan skills
    const skillsDir = path.join(this.buildersDir, 'skills');
    if (fs.existsSync(skillsDir)) {
      const dirs = fs.readdirSync(skillsDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);
      for (const dir of dirs) {
        const skillFile = path.join(skillsDir, dir, 'SKILL.md');
        if (fs.existsSync(skillFile)) {
          try {
            const content = fs.readFileSync(skillFile, 'utf8');
            const fm = this.parseFrontmatter(content);
            results.skills.push({
              name: dir,
              type: 'skill',
              description: fm.description || '',
              category: fm.category || '',
              phase: fm.phase || '',
            });
          } catch (e) {
            logger.warn(`Failed to parse skill: ${dir}`);
          }
        }
      }
    }

    if (options.json) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      this.printList(results);
    }

    return results;
  }

  printList(results) {
    const total = results.agents.length + results.workflows.length + results.skills.length;

    if (total === 0) {
      console.log(chalk.dim('\n  No custom builders found.'));
      console.log(chalk.dim('  Create one with:'));
      console.log(chalk.cyan('    stdd builder agent <name>'));
      console.log(chalk.cyan('    stdd builder workflow <name>'));
      console.log(chalk.cyan('    stdd builder skill <name>\n'));
      return;
    }

    console.log(chalk.bold('\nCustom Builders\n'));

    if (results.agents.length > 0) {
      console.log(chalk.bold('  Agents:'));
      for (const a of results.agents) {
        console.log(`    ${chalk.green('agent')}  ${chalk.cyan(a.name.padEnd(20))} ${chalk.dim(a.description)}`);
      }
      console.log('');
    }

    if (results.workflows.length > 0) {
      console.log(chalk.bold('  Workflows:'));
      for (const w of results.workflows) {
        console.log(`    ${chalk.green('wf')}     ${chalk.cyan(w.name.padEnd(20))} ${chalk.dim(w.description)}`);
        if (w.phases.length > 0) {
          console.log(`            ${chalk.dim('phases: ' + w.phases.join(' -> '))}`);
        }
      }
      console.log('');
    }

    if (results.skills.length > 0) {
      console.log(chalk.bold('  Skills:'));
      for (const s of results.skills) {
        console.log(`    ${chalk.green('skill')}  ${chalk.cyan(s.name.padEnd(20))} ${chalk.dim(s.description)}`);
      }
      console.log('');
    }

    console.log(chalk.dim(`  Total: ${total} custom builders\n`));
  }

  // ── Validate Action ──

  validate(targetPath, options = {}) {
    if (!targetPath) {
      throw new Error('Path is required. Usage: stdd builder validate <path>');
    }

    const fullPath = path.resolve(this.cwd, targetPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${targetPath}`);
    }

    const ext = path.extname(fullPath).toLowerCase();
    const isJson = ext === '.json';
    const isYaml = ext === '.yaml' || ext === '.yml';
    const isMd = ext === '.md';

    if (!isJson && !isYaml && !isMd) {
      throw new Error(`Unsupported file type: ${ext}. Supported: .json, .yaml, .yml, .md`);
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const issues = [];

    if (isJson) {
      let data;
      try {
        data = JSON.parse(content);
      } catch (e) {
        issues.push({ field: 'parse', message: `Invalid JSON: ${e.message}`, severity: 'error' });
        return this.printValidation(targetPath, issues, options);
      }
      this.validateAgent(data, issues);
    } else if (isYaml) {
      let data;
      try {
        data = yaml.load(content);
      } catch (e) {
        issues.push({ field: 'parse', message: `Invalid YAML: ${e.message}`, severity: 'error' });
        return this.printValidation(targetPath, issues, options);
      }
      this.validateWorkflow(data, issues);
    } else if (isMd) {
      this.validateSkill(content, issues);
    }

    return this.printValidation(targetPath, issues, options);
  }

  validateAgent(data, issues) {
    const required = ['id', 'name', 'lens', 'expertise', 'reviewFocus', 'custom'];
    for (const field of required) {
      if (!data[field]) {
        issues.push({ field, message: `Missing required field: ${field}`, severity: 'error' });
      }
    }
    if (data.expertise && !Array.isArray(data.expertise)) {
      issues.push({ field: 'expertise', message: 'expertise must be an array', severity: 'error' });
    }
    if (data.reviewFocus && !Array.isArray(data.reviewFocus)) {
      issues.push({ field: 'reviewFocus', message: 'reviewFocus must be an array', severity: 'error' });
    }
    if (!data.promptTemplate) {
      issues.push({ field: 'promptTemplate', message: 'Missing promptTemplate (recommended)', severity: 'warning' });
    }
  }

  validateWorkflow(data, issues) {
    const required = ['name', 'phases'];
    for (const field of required) {
      if (!data[field]) {
        issues.push({ field, message: `Missing required field: ${field}`, severity: 'error' });
      }
    }
    if (data.phases && !Array.isArray(data.phases)) {
      issues.push({ field: 'phases', message: 'phases must be an array', severity: 'error' });
    }
    if (data.phases && Array.isArray(data.phases)) {
      data.phases.forEach((phase, idx) => {
        if (!phase.id) {
          issues.push({ field: `phases[${idx}].id`, message: `Phase ${idx} missing id`, severity: 'error' });
        }
        if (!phase.skill) {
          issues.push({ field: `phases[${idx}].skill`, message: `Phase ${idx} missing skill`, severity: 'error' });
        }
      });
    }
  }

  validateSkill(content, issues) {
    const fm = this.parseFrontmatter(content);
    if (!fm.id) {
      issues.push({ field: 'frontmatter.id', message: 'Missing id in frontmatter', severity: 'error' });
    }
    if (!fm.description) {
      issues.push({ field: 'frontmatter.description', message: 'Missing description in frontmatter', severity: 'error' });
    }
    if (!fm.category) {
      issues.push({ field: 'frontmatter.category', message: 'Missing category in frontmatter (recommended)', severity: 'warning' });
    }
    if (!content.includes('## Purpose') && !content.includes('## When to Use')) {
      issues.push({ field: 'body', message: 'Missing Purpose or When to Use section', severity: 'warning' });
    }
  }

  printValidation(targetPath, issues, options) {
    const hasErrors = issues.some(i => i.severity === 'error');
    const result = {
      path: targetPath,
      valid: !hasErrors,
      issues: issues,
    };

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.bold('\nBuilder Validation\n'));
      console.log(`  File:  ${chalk.cyan(targetPath)}`);
      console.log(`  Status: ${hasErrors ? chalk.red('FAIL') : chalk.green('PASS')}`);

      if (issues.length > 0) {
        console.log(chalk.bold('\n  Issues:'));
        for (const issue of issues) {
          const marker = issue.severity === 'error' ? chalk.red('  X') : chalk.yellow('  !');
          console.log(`  ${marker} ${issue.field}: ${issue.message}`);
        }
      } else {
        console.log(chalk.dim('\n  No issues found.'));
      }
      console.log('');
    }

    return result;
  }

  // ── Export Action ──

  async export(name, options = {}) {
    if (!name) {
      throw new Error('Name is required. Usage: stdd builder export <name> --type <agent|workflow|skill>');
    }

    const type = options.type;
    if (!type || !['agent', 'workflow', 'skill'].includes(type)) {
      throw new Error('--type is required and must be one of: agent, workflow, skill');
    }

    const safeName = this.sanitizeName(name);
    let sourcePath;
    let data;

    if (type === 'agent') {
      sourcePath = path.join(this.buildersDir, 'agents', `${safeName}.json`);
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Agent "${safeName}" not found at ${sourcePath}`);
      }
      data = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    } else if (type === 'workflow') {
      sourcePath = path.join(this.buildersDir, 'workflows', `${safeName}.yaml`);
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Workflow "${safeName}" not found at ${sourcePath}`);
      }
      data = yaml.load(fs.readFileSync(sourcePath, 'utf8'));
    } else if (type === 'skill') {
      sourcePath = path.join(this.buildersDir, 'skills', safeName, 'SKILL.md');
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Skill "${safeName}" not found at ${sourcePath}`);
      }
      data = fs.readFileSync(sourcePath, 'utf8');
    }

    // Generate extension manifest
    const manifest = {
      name: safeName,
      version: '1.0.0',
      type: type,
      description: `Custom ${type}: ${safeName}`,
      createdAt: new Date().toISOString(),
      stddBuilder: true,
      files: [path.basename(sourcePath)],
    };

    // Write to extensions directory
    const extDir = path.join(this.extensionsDir, safeName);
    fs.mkdirSync(extDir, { recursive: true });

    // Copy source file
    const destFile = path.join(extDir, path.basename(sourcePath));
    fs.writeFileSync(destFile, typeof data === 'string' ? data : JSON.stringify(data, null, 2), 'utf8');

    // Write manifest
    const manifestPath = path.join(extDir, 'extension.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

    const result = {
      exported: true,
      name: safeName,
      type: type,
      extensionDir: path.relative(this.cwd, extDir),
      manifest: manifest,
    };

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.bold('\nBuilder Export\n'));
      console.log(`  Name:   ${chalk.cyan(safeName)}`);
      console.log(`  Type:   ${chalk.green(type)}`);
      console.log(`  Output: ${chalk.dim(path.relative(this.cwd, extDir))}`);
      console.log(`  Files:  ${chalk.dim('extension.json, ' + path.basename(sourcePath))}`);
      console.log(chalk.dim('\n  Extension installed and ready.\n'));
    }

    return result;
  }

  // ── Helpers ──

  sanitizeName(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  parseFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return {};
    const fm = {};
    const lines = match[1].split('\n');
    for (const line of lines) {
      const kv = line.match(/^(\w[\w-]*):\s*"?([^"]*)"?\s*$/);
      if (kv) {
        fm[kv[1]] = kv[2];
      }
    }
    return fm;
  }

  printResult(type, name, filePath, data, options) {
    const result = {
      created: true,
      type: type,
      name: name,
      path: path.relative(this.cwd, filePath),
    };

    if (options.json) {
      console.log(JSON.stringify({ ...result, data }, null, 2));
    } else {
      console.log(chalk.bold(`\n${type.charAt(0).toUpperCase() + type.slice(1)} Created\n`));
      console.log(`  Name:  ${chalk.cyan(name)}`);
      console.log(`  Type:  ${chalk.green(type)}`);
      console.log(`  Path:  ${chalk.dim(result.path)}`);
      if (type === 'agent' && data.expertise) {
        console.log(`  Focus: ${chalk.dim(data.expertise.join(', '))}`);
      }
      if (type === 'workflow' && data.phases) {
        console.log(`  Phases: ${chalk.dim(data.phases.map(p => p.skill || p.id).join(' -> '))}`);
      }
      console.log('');
    }

    return result;
  }
  /**
   * Dry-run test a custom builder artifact without executing actual commands.
   */
  dryRun(name, options = {}) {
    if (!name) throw new Error('Artifact name required. Usage: stdd builder test <name>');

    const buildersDir = path.join(this.cwd, 'stdd', 'builders');
    const results = { name, valid: true, errors: [], warnings: [], steps: [] };

    // Test agent
    const agentPath = path.join(buildersDir, 'agents', name + '.json');
    if (fs.existsSync(agentPath)) {
      try {
        const agent = JSON.parse(fs.readFileSync(agentPath, 'utf8'));
        if (!agent.name) results.errors.push('Agent missing "name" field');
        if (!agent.expertise || agent.expertise.length === 0) results.warnings.push('Agent has no expertise defined');
        if (!agent.lens) results.warnings.push('Agent has no lens defined');
        results.steps.push({ type: 'agent', name: agent.name || name, status: 'simulated' });
      } catch (e) {
        results.errors.push('Invalid JSON: ' + e.message);
        results.valid = false;
      }
    }

    // Test workflow
    const workflowPath = path.join(buildersDir, 'workflows', name + '.yaml');
    if (fs.existsSync(workflowPath)) {
      try {
        const yaml = require('js-yaml');
        const wf = yaml.load(fs.readFileSync(workflowPath, 'utf8'));
        if (!wf.phases || wf.phases.length === 0) results.errors.push('Workflow has no phases');
        // Simulate phase execution
        const evalCondition = (cond) => !!cond;
        for (const phase of (wf.phases || [])) {
          const conditionMet = phase.condition ? evalCondition(phase.condition) : true;
          results.steps.push({
            phase: phase.name || phase.skill || 'unknown',
            condition: phase.condition || null,
            conditionMet,
            status: conditionMet ? 'would-execute' : 'would-skip',
          });
        }
      } catch (e) {
        results.errors.push('Invalid YAML: ' + e.message);
        results.valid = false;
      }
    }

    if (results.steps.length === 0 && results.errors.length === 0) {
      results.errors.push('No artifact found with name: ' + name);
      results.valid = false;
    }

    if (!options.json) {
      console.log(chalk.bold('\\n  Dry-Run Test: ' + name + '\\n'));
      console.log('  Status: ' + (results.valid ? chalk.green('PASS') : chalk.red('FAIL')));
      for (const e of results.errors) console.log('  ' + chalk.red('ERROR') + ' ' + e);
      for (const w of results.warnings) console.log('  ' + chalk.yellow('WARN') + ' ' + w);
      for (const s of results.steps) {
        const icon = s.status === 'would-execute' ? chalk.green('>>') : s.status === 'would-skip' ? chalk.yellow('--') : chalk.cyan('??');
        console.log('  ' + icon + ' ' + (s.phase || s.name) + (s.condition ? ' (condition: ' + s.condition + ')' : ''));
      }
      console.log('');
    }
    return results;
  }

  /**
   * Share a builder artifact as a packaged extension.
   */
  share(name, options = {}) {
    if (!name) throw new Error('Artifact name required. Usage: stdd builder share <name>');

    const buildersDir = path.join(this.cwd, 'stdd', 'builders');
    const outputPath = path.join(this.cwd, 'stdd', 'exports');
    fs.mkdirSync(outputPath, { recursive: true });

    const manifest = {
      name,
      version: options.version || '1.0.0',
      author: options.author || 'anonymous',
      description: options.description || '',
      exportedAt: new Date().toISOString(),
      artifacts: [],
    };

    // Package all matching artifacts
    for (const subdir of ['agents', 'workflows', 'skills']) {
      const dir = path.join(buildersDir, subdir);
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir).filter(f => f.startsWith(name) || f === name + '.json' || f === name + '.yaml' || f === name + '.md');
      for (const file of files) {
        const srcPath = path.join(dir, file);
        const destDir = path.join(outputPath, name, subdir);
        fs.mkdirSync(destDir, { recursive: true });
        fs.copyFileSync(srcPath, path.join(destDir, file));
        manifest.artifacts.push({ type: subdir.slice(0, -1), file });
      }
    }

    // Write manifest
    fs.writeFileSync(path.join(outputPath, name, 'extension.json'), JSON.stringify(manifest, null, 2), 'utf8');

    if (!options.json) {
      console.log(chalk.bold('\\n  Artifact Packaged\\n'));
      console.log('  Name: ' + chalk.cyan(name));
      console.log('  Artifacts: ' + manifest.artifacts.length);
      console.log('  Output: ' + chalk.cyan(path.join('stdd', 'exports', name)));
      console.log('');
    }
    return manifest;
  }
}

module.exports = { BuilderCommand };
