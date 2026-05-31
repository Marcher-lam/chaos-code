/**
 * PRP Command
 * What/Why/How/Success structured planning for clear requirement communication.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { createLogger } = require('../../utils/logger');
const _logger = createLogger('prp');

const PRP_TEMPLATE = `# PRP: {{title}}

> Generated: {{date}}
> Change: {{change}}

## What

<!-- Describe the feature/change in clear, concise terms -->

{{what}}

## Why

<!-- Explain the business value and problem being solved -->

{{why}}

## How

<!-- Outline the technical approach at a high level (not implementation details) -->

{{how}}

## Success Criteria

<!-- Define checkable acceptance criteria -->

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Dependencies

<!-- List any dependencies or prerequisites -->

## Risks

<!-- Identify potential risks and mitigation strategies -->

---

*This PRP should be reviewed and confirmed before proceeding to detailed specs.*
`;

class PrpCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
  }

  execute(action = 'create', args = [], options = {}) {
    switch (action) {
      case 'create':
      case 'new':
        return this.create(args[0], options);
      case 'list':
      case 'ls':
        return this.list(options);
      case 'show':
        return this.show(args[0], options);
      case 'validate':
        return this.validate(args[0], options);
      case 'template':
        return this.template(options);
      default:
        if (args[0] && !action.startsWith('-')) {
          return this.create(action, options);
        }
        return this.create(null, options);
    }
  }

  create(title, options = {}) {
    if (!title) {
      throw new Error('PRP title is required. Usage: stdd prp create <title>');
    }

    const prpDir = path.join(this.cwd, 'stdd', 'prp');
    fs.mkdirSync(prpDir, { recursive: true });

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filePath = path.join(prpDir, `${timestamp}-${slug}.md`);

    if (fs.existsSync(filePath) && !options.force) {
      throw new Error(`PRP already exists at ${filePath}`);
    }

    const content = PRP_TEMPLATE
      .replace('{{title}}', title)
      .replace('{{date}}', new Date().toISOString().split('T')[0])
      .replace(/{{change}}/g, slug)
      .replace('{{what}}', options.what || '<!-- Describe the feature/change -->')
      .replace('{{why}}', options.why || '<!-- Explain business value -->')
      .replace('{{how}}', options.how || '<!-- Outline technical approach -->');

    fs.writeFileSync(filePath, content, 'utf8');

    if (options.json) {
      console.log(JSON.stringify({ path: filePath, title, created: true }, null, 2));
    } else {
      console.log(chalk.bold('\n✓ PRP created\n'));
      console.log(`  ${chalk.cyan(path.relative(this.cwd, filePath))}`);
      console.log(chalk.dim('\n  Edit this file to fill in the What/Why/How/Success sections.\n'));
    }
    return { path: filePath, title, created: true };
  }

  list(options = {}) {
    const prpDir = path.join(this.cwd, 'stdd', 'prp');
    if (!fs.existsSync(prpDir)) {
      if (options.json) {
        console.log(JSON.stringify({ prps: [] }, null, 2));
      } else {
        console.log(chalk.yellow('\nNo PRPs found. Run "stdd prp create <title>" to create one.\n'));
      }
      return { prps: [] };
    }

    const files = fs.readdirSync(prpDir)
      .filter(f => f.endsWith('.md'))
      .map(f => {
        const filePath = path.join(prpDir, f);
        const stat = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, 'utf8');
        const titleMatch = content.match(/^#\s*PRP:\s*(.+)$/m);
        return {
          file: f,
          title: titleMatch ? titleMatch[1] : f.replace('.md', ''),
          path: filePath,
          modified: stat.mtime,
          size: stat.size,
        };
      })
      .sort((a, b) => b.modified - a.modified);

    if (options.json) {
      console.log(JSON.stringify({ prps: files, count: files.length }, null, 2));
    } else {
      console.log(chalk.bold('\nPRPs\n'));
      if (files.length === 0) {
        console.log('  No PRPs found.\n');
      } else {
        files.forEach((prp, i) => {
          console.log(`  ${chalk.cyan((i + 1).toString() + '.')} ${chalk.bold(prp.title)}`);
          console.log(`      ${chalk.dim(prp.file)} · ${chalk.dim(prp.modified.toLocaleDateString())}\n`);
        });
      }
    }
    return { prps: files, count: files.length };
  }

  show(fileOrTitle, options = {}) {
    const prpDir = path.join(this.cwd, 'stdd', 'prp');
    if (!fs.existsSync(prpDir)) {
      throw new Error('No PRPs found. Run "stdd prp create <title>" first.');
    }

    let filePath;
    if (fileOrTitle?.endsWith('.md')) {
      filePath = path.join(prpDir, fileOrTitle);
    } else {
      const files = fs.readdirSync(prpDir).filter(f => f.endsWith('.md'));
      const match = files.find(f => f.includes(fileOrTitle || ''));
      if (!match) {
        throw new Error(`PRP not found: ${fileOrTitle}`);
      }
      filePath = path.join(prpDir, match);
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`PRP not found: ${fileOrTitle}`);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    if (options.json) {
      console.log(JSON.stringify({ file: path.basename(filePath), content }, null, 2));
    } else {
      console.log(chalk.bold('\n' + path.basename(filePath) + '\n'));
      console.log(chalk.dim('─'.repeat(50)));
      console.log(content);
      console.log(chalk.dim('─'.repeat(50) + '\n'));
    }
    return { file: path.basename(filePath), content };
  }

  validate(fileOrTitle, options = {}) {
    const prpDir = path.join(this.cwd, 'stdd', 'prp');
    if (!fs.existsSync(prpDir)) {
      throw new Error('No PRPs found.');
    }

    let filePath;
    if (fileOrTitle?.endsWith('.md')) {
      filePath = path.join(prpDir, fileOrTitle);
    } else {
      const files = fs.readdirSync(prpDir).filter(f => f.endsWith('.md'));
      const match = files.find(f => f.includes(fileOrTitle || ''));
      filePath = match ? path.join(prpDir, match) : null;
    }

    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error(`PRP not found: ${fileOrTitle}`);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];
    const checks = {
      hasWhat: /##\s*What/i.test(content) && content.split('## What')[1]?.split('##')[0]?.trim().length > 50,
      hasWhy: /##\s*Why/i.test(content) && content.split('## Why')[1]?.split('##')[0]?.trim().length > 50,
      hasHow: /##\s*How/i.test(content) && content.split('## How')[1]?.split('##')[0]?.trim().length > 50,
      hasSuccess: /##\s*Success Criteria/i.test(content),
      hasCheckableItems: /-\s*\[[ x]]/i.test(content),
    };

    if (!checks.hasWhat) issues.push('What section is missing or too brief (should be > 50 chars)');
    if (!checks.hasWhy) issues.push('Why section is missing or too brief (should be > 50 chars)');
    if (!checks.hasHow) issues.push('How section is missing or too brief (should be > 50 chars)');
    if (!checks.hasSuccess) issues.push('Success Criteria section is missing');
    if (!checks.hasCheckableItems) issues.push('No checkable success criteria found (use - [ ] items)');

    const result = {
      file: path.basename(filePath),
      checks,
      issues,
      valid: issues.length === 0,
      score: Math.max(0, 100 - issues.length * 15),
    };

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.bold('\nPRP Validation\n'));
      console.log(`  File: ${chalk.cyan(result.file)}`);
      console.log(`  Score: ${result.score >= 70 ? chalk.green(result.score) : chalk.yellow(result.score)}/100`);
      console.log(`  Status: ${result.valid ? chalk.green('✓ Valid') : chalk.yellow('⚠ Needs review')}\n`);

      Object.entries(checks).forEach(([key, value]) => {
        console.log(`  ${value ? chalk.green('✓') : chalk.yellow('○')} ${key}`);
      });

      if (issues.length > 0) {
        console.log(chalk.yellow('\n  Issues:\n'));
        issues.forEach(issue => console.log(`    • ${issue}`));
      }
      console.log('');
    }
    return result;
  }

  template(options = {}) {
    const content = PRP_TEMPLATE.replace(/{{[^}]+}}/g, '<value>');
    if (options.json) {
      console.log(JSON.stringify({ template: content }, null, 2));
    } else {
      console.log(chalk.bold('\nPRP Template\n'));
      console.log(chalk.dim('─'.repeat(50)));
      console.log(content);
      console.log(chalk.dim('─'.repeat(50) + '\n'));
    }
    return { template: content };
  }
}

module.exports = { PrpCommand };
