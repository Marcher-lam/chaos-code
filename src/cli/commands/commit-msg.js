/**
 * Commit Message Command
 * Generate semantic commit messages from completed STDD changes.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { findActiveChange, parseTasks } = require('../../utils/change-utils');

const MAX_SUBJECT_LENGTH = 50;

function readProposal(changeDir) {
  const proposalPath = path.join(changeDir, 'proposal.md');
  if (!fs.existsSync(proposalPath)) {
    return null;
  }
  return fs.readFileSync(proposalPath, 'utf-8');
}

function extractProposalTitle(content) {
  if (!content) {
    return null;
  }
  const lines = content.split('\n');
  for (const line of lines) {
    const m = line.match(/^#\s+(?:Bug:\s+|Proposal:\s+)?(.+)$/);
    if (m) {
      return m[1].trim();
    }
  }
  return null;
}

function extractScopeFromChangeName(changeName) {
  if (changeName.startsWith('ff-')) {
    const after = changeName.slice(3);
    const parts = after.split(/[-\d]/);
    for (const p of parts) {
      if (p.length > 0) {
        return p.toLowerCase();
      }
    }
  }
  return null;
}

function detectType(changeName, _proposalContent, _tasks) {
  if (changeName && changeName.startsWith('bugfix-')) {
    return 'fix';
  }
  return 'feat';
}

function detectTddPhase(tasks, options = {}) {
  if (options.phase) return options.phase;
  const pending = tasks.filter(t => !t.isDone);
  const completed = tasks.filter(t => t.isDone);
  const text = [...pending, ...completed].map(t => t.description).join(' ').toLowerCase();
  if (/\bred\b|failing test|失败测试|write.*test/.test(text) && completed.length === 0) return 'red';
  if (/refactor|重构|cleanup|simplify/.test(text)) return 'refactor';
  return 'green';
}

function extractIssue(content, changeName, options = {}) {
  if (options.issue) return String(options.issue).replace(/^#/, '');
  const joined = `${content || ''}\n${changeName || ''}`;
  const match = joined.match(/#(\d+)\b|issue[:\s-]+(\d+)\b|gh-(\d+)\b/i);
  return match ? (match[1] || match[2] || match[3]) : null;
}

function buildSubject(type, scope, description) {
  let subject = type;
  if (scope) {
    subject += `(${scope})`;
  }
  const desc = description || '';
  subject += ': ' + desc;

  if (subject.length > MAX_SUBJECT_LENGTH) {
    const available = MAX_SUBJECT_LENGTH - (type + (scope ? `(${scope})` : '') + ': ').length;
    subject = type;
    if (scope) {
      subject += `(${scope})`;
    }
    subject += ': ' + (desc.slice(0, available - 3) + '...');
  }

  if (subject.length > MAX_SUBJECT_LENGTH) {
    subject = subject.slice(0, MAX_SUBJECT_LENGTH - 3) + '...';
  }

  return subject;
}

function buildPhaseSubject(phase, issue, description) {
  const suffix = issue ? ` (#${issue})` : '';
  let subject = `${phase}: ${description || 'update implementation'}${suffix}`;
  if (subject.length > MAX_SUBJECT_LENGTH) {
    const available = MAX_SUBJECT_LENGTH - `${phase}: `.length - suffix.length - 3;
    subject = `${phase}: ${(description || '').slice(0, Math.max(8, available))}...${suffix}`;
  }
  return subject;
}

function buildBody(completedTasks, changeName, changeDir) {
  const lines = [];

  if (completedTasks.length > 0) {
    lines.push('');
      completedTasks.forEach((task, _i) => {
      lines.push(`- ${task.description}`);
    });
  }

  const specsDir = path.join(changeDir, 'specs');
  if (fs.existsSync(specsDir)) {
    try {
      const specFiles = fs.readdirSync(specsDir).filter(f => f.endsWith('.feature') || f.endsWith('.md'));
      if (specFiles.length > 0) {
        lines.push('');
        lines.push('Spec changes:');
        specFiles.forEach(f => {
          lines.push(`- ${f}`);
        });
      }
    } catch {
      // ignore
    }
  }

  return lines.join('\n');
}

class CommitCommand {
  async execute(changeName, options = {}) {
    const cwd = process.cwd();
    const stddDir = path.join(cwd, 'stdd');

    if (!fs.existsSync(stddDir)) {
      throw new Error('STDD not initialized. Run `stdd init` first.');
    }

    const resolvedName = options.change || changeName;
    const changeDir = findActiveChange(stddDir, resolvedName);

    if (!changeDir) {
      throw new Error(resolvedName
        ? `Change '${resolvedName}' not found.`
        : 'No active changes found.'
      );
    }

    if (!fs.existsSync(changeDir)) {
      throw new Error(`Change '${path.basename(changeDir)}' not found.`);
    }

    const actualName = path.basename(changeDir);

    const tasks = parseTasks(path.join(changeDir, 'tasks.md')) || [];
    const completedTasks = tasks.filter(t => t.isDone);

    const proposalContent = readProposal(changeDir);
    const proposalTitle = extractProposalTitle(proposalContent);

    const type = detectType(actualName, proposalContent, tasks);
    const phase = detectTddPhase(tasks, options);
    const issue = extractIssue(proposalContent, actualName, options);
    const scope = extractScopeFromChangeName(actualName);
    const description = proposalTitle || actualName;

    if (options.requireIssue && !issue) {
      throw new Error('Issue number is required. Pass --issue <number> or include #123 in proposal/change name.');
    }

    const subject = options.phase || options.tdd
      ? buildPhaseSubject(phase, issue, description)
      : buildSubject(type, scope, description);
    const body = buildBody(completedTasks, actualName, changeDir);

    const fullMessage = subject + body;

    if (options.format === 'json') {
      const jsonOutput = JSON.stringify({
        subject,
        body: body.trim(),
        full: fullMessage,
        type,
        phase: options.phase || options.tdd ? phase : undefined,
        issue,
        scope,
        description,
        change: actualName,
        tasksCompleted: completedTasks.length,
        tasksTotal: tasks.length,
      }, null, 2);
      console.log(jsonOutput);
      return jsonOutput;
    }

    console.log(chalk.bold('\n📝 Generated Commit Message\n'));
    console.log(chalk.green(subject));
    if (body) {
      console.log(chalk.dim(body));
    }
    console.log('');

    if (completedTasks.length === 0 && tasks.length > 0) {
      console.log(chalk.yellow('  Warning: No completed tasks found in this change.'));
    }

    return fullMessage;
  }
}

module.exports = { CommitCommand, buildSubject, buildPhaseSubject, extractProposalTitle, detectType, detectTddPhase, extractIssue, extractScopeFromChangeName };
