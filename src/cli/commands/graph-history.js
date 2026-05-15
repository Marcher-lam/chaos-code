/**
 * GraphHistoryCommand - View execution history and replay evidence
 *
 * Scans evidence directories for evidence JSON files, prints
 * a time-ordered history table and supports replay.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { evidenceMatchesWorkspace, extractEvidenceWorkspaceRefs } = require('../../utils/workspace-scope');

function extractWorkspacesFromEvidence(data) {
  const explicit = extractEvidenceWorkspaceRefs(data);
  const displayRefs = explicit.filter(ref => !path.isAbsolute(ref));
  if (displayRefs.length > 0) return displayRefs;

  const names = new Set();

  const tests = data.results && data.results.tests;
  if (tests && Array.isArray(tests.workspaces)) {
    for (const result of tests.workspaces) {
      const name = result.workspaceName || result.workspace || result.name;
      if (name) names.add(name);
    }
  }

  const constitution = data.results && data.results.constitution;
  const issues = constitution && (constitution.details || constitution.issues);
  if (issues) {
    for (const issue of [...(issues.blocking || []), ...(issues.warning || [])]) {
      const candidates = [];
      for (const key of ['workspace', 'workspaceName']) {
        if (typeof issue[key] === 'string') candidates.push(issue[key]);
      }
      for (const key of ['file', 'path', 'filepath', 'filePath']) {
        if (typeof issue[key] === 'string') candidates.push(workspaceFromPath(issue[key]));
      }
      const matches = String(issue.message || '').match(/[\w.-]+(?:\/[\w.-]+)+\.(?:js|jsx|ts|tsx|py|json|md|yml|yaml)/g) || [];
      candidates.push(...matches.map(workspaceFromPath));
      for (const candidate of candidates) {
        if (candidate) names.add(candidate);
      }
    }
  }

  return Array.from(names).sort();
}

function workspaceFromPath(filePath) {
  const normalized = String(filePath || '').replace(/\\/g, '/').replace(/^\.\//, '');
  const parts = normalized.split('/');
  if (parts.length >= 2 && (parts[0] === 'packages' || parts[0] === 'apps')) {
    return parts[0] + '/' + parts[1];
  }
  return null;
}

class GraphHistoryCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.stddDir = path.join(cwd, 'stdd');
  }

  /**
   * Scan all evidence files
   * @param {object} options  { change: string or null }
   * @returns {Array} Evidence entries sorted by time desc
   */
  scanEvidence(options = {}) {
    const entries = [];

    if (!fs.existsSync(this.stddDir)) {
      return entries;
    }

    this._scanDir(path.join(this.stddDir, 'evidence'), null, entries, options);

    const changesDir = path.join(this.stddDir, 'changes');
    if (fs.existsSync(changesDir)) {
      const changes = fs.readdirSync(changesDir).filter(d => {
        const full = path.join(changesDir, d);
        return fs.statSync(full).isDirectory() && d !== 'archive';
      });

      for (const changeName of changes) {
        if (options.change && changeName !== options.change) continue;
        const evDir = path.join(changesDir, changeName, 'evidence');
        this._scanDir(evDir, changeName, entries, options);
      }
    }

    entries.sort((a, b) => b.unixTimestamp - a.unixTimestamp);
    return entries;
  }

  _scanDir(evidenceDir, changeName, entries, options = {}) {
    if (!fs.existsSync(evidenceDir)) return;

    const files = fs.readdirSync(evidenceDir).filter(f => f.endsWith('.json'));

    for (const file of files) {
        const filePath = path.join(evidenceDir, file);
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (options.workspace && !evidenceMatchesWorkspace(data, options.workspace)) {
          continue;
        }
        entries.push({
          id: data.id || file.replace('.json', ''),
          type: data.type || this._inferType(file),
          timestamp: data.timestamp || new Date().toISOString(),
          unixTimestamp: data.unixTimestamp || (data.timestamp ? new Date(data.timestamp).getTime() : 0),
          status: data.status || 'unknown',
          changeName: changeName || (data.metadata && data.metadata.changeName) || null,
          file: filePath,
          fileName: file,
          metadata: data.metadata || null,
          results: data.results || null,
          workspaces: extractWorkspacesFromEvidence(data),
        });
      } catch (err) {
        // ignore parse errors
      }
    }
  }

  _inferType(fileName) {
    if (fileName.startsWith('verify')) return 'verify';
    if (fileName.startsWith('guard')) return 'guard';
    if (fileName.startsWith('error')) return 'error';
    return 'unknown';
  }

  /**
   * Print history table
   * @param {object} options  { json, change }
   */
  list(options = {}) {
    const entries = this.scanEvidence({ change: options.change || null, workspace: options.workspace || null });

    if (entries.length === 0) {
      if (options.json) {
        console.log(JSON.stringify([]));
      } else {
        console.log(chalk.yellow('No evidence history found.'));
        console.log(chalk.dim('  Evidence files are created when you run: stdd verify, stdd guard'));
      }
      return;
    }

    if (options.json) {
      console.log(JSON.stringify(entries.map(e => this._toOutput(e)), null, 2));
      return;
    }

    this._printTable(entries);
  }

  _printTable(entries) {
    console.log(chalk.bold('\nSTDD Execution History\n'));

    const cols = [
      { label: 'ID', width: 18 },
      { label: 'Type', width: 8 },
      { label: 'Status', width: 8 },
      { label: 'Change', width: 20 },
      { label: 'Time', width: 24 },
    ];

    const header = cols.map(c => c.label.padEnd(c.width)).join('| ');
    console.log(chalk.cyan(header));
    console.log(chalk.dim('-'.repeat(cols.reduce((sum, c) => sum + c.width, 0) + cols.length * 3)));

    for (const entry of entries.slice(0, 50)) {
      const idShort = entry.id.slice(0, 16);
      const typeStr = entry.type.toUpperCase().padEnd(cols[1].width);
      const statusColor = entry.status === 'pass' ? chalk.green : entry.status === 'fail' ? chalk.red : chalk.yellow;
      const statusStr = statusColor(entry.status.padEnd(cols[2].width));
      const changeStr = (entry.changeName || '(global)').padEnd(cols[3].width);
      const timeStr = this._formatTime(entry.timestamp).padEnd(cols[4].width);

      console.log(idShort.padEnd(cols[0].width) + '| ' + typeStr + '| ' + statusStr + '| ' + changeStr + '| ' + timeStr);
    }

    if (entries.length > 50) {
      console.log(chalk.dim('  ... and ' + (entries.length - 50) + ' more entries'));
    }

    console.log(chalk.dim('\nTotal: ' + entries.length + ' record(s)'));
    const workspaceCount = new Set(entries.reduce((all, entry) => all.concat(entry.workspaces || []), [])).size;
    if (workspaceCount > 0) {
      console.log(chalk.dim('Workspaces: ' + workspaceCount));
    }
    console.log(chalk.dim('Replay: stdd graph replay <id>'));
    console.log('');
  }

  /**
   * Replay a specific execution by ID
   * @param {string} executionId  Evidence ID or filename
   * @param {object} options      { verbose }
   */
  replay(executionId, options = {}) {
    const entries = this.scanEvidence();

    const entry = entries.find(
      e => e.id.startsWith(executionId) || e.fileName === executionId || e.fileName.startsWith(executionId)
    );

    if (!entry) {
      console.error(chalk.red("Execution '" + executionId + "' not found."));
      console.log(chalk.dim('Run `stdd graph history` to see available entries.'));
      process.exit(1);
      return;
    }

    if (options.json) {
      console.log(JSON.stringify(this._toOutput(entry), null, 2));
      return;
    }

    this._printDetail(entry, options);
  }

  _printDetail(entry, options = {}) {
    console.log(chalk.bold('\nExecution Detail\n'));

    console.log('ID:        ' + entry.id);
    console.log('Type:      ' + entry.type);
    var statusLabel = entry.status === 'pass' ? chalk.green('PASS') : entry.status === 'fail' ? chalk.red('FAIL') : chalk.yellow(entry.status.toUpperCase());
    console.log('Status:    ' + statusLabel);
    console.log('Time:      ' + this._formatTime(entry.timestamp));
    if (entry.changeName) {
      console.log('Change:    ' + entry.changeName);
    }
    if (entry.workspaces && entry.workspaces.length > 0) {
      console.log('Workspaces: ' + entry.workspaces.join(', '));
    }
    if (entry.metadata) {
      console.log('Metadata:  OS: ' + entry.metadata.os + ', Node: ' + entry.metadata.nodeVersion);
    }

    if (entry.results && options.verbose !== false) {
      console.log('\nResults:');
      this._printResults(entry.results);
    }

    if (entry.type === 'verify' && entry.changeName) {
      console.log('\nRe-run verify:');
      console.log(chalk.dim('  stdd verify ' + entry.changeName));
    }

    console.log('');
  }

  _printResults(results) {
    if (results.tasks) {
      var taskResult = results.tasks;
      console.log('  Tasks:     ' + (taskResult.allDone ? chalk.green('OK') : chalk.red('FAIL')) + ' ' + taskResult.done + '/' + taskResult.total + ' completed');
    }
    if (results.tests !== undefined && results.tests !== null) {
      var testResult = results.tests;
      if (testResult.passed === null) {
        console.log('  Tests:     SKIP');
      } else {
        console.log('  Tests:     ' + (testResult.passed ? chalk.green('pass') : chalk.red('fail')));
        if (!testResult.passed && testResult.error) {
          var tail = testResult.error.trim().split('\n').slice(-3).join('\n      ');
          console.log(chalk.dim('    ' + tail));
        }
      }
    }
    if (results.constitution) {
      var c = results.constitution;
      console.log('  Constitution: ' + (c.status === 'pass' ? chalk.green('pass') : chalk.red('fail')));
      if (c.issues && c.issues.blocking && c.issues.blocking.length > 0) {
        for (var i = 0; i < c.issues.blocking.length; i++) {
          var b = c.issues.blocking[i];
          console.log('    ' + chalk.red('FAIL') + ' Article ' + b.article + ': ' + b.message);
        }
      }
    }
    if (results.lint) {
      var l = results.lint;
      if (l.passed === null) {
        console.log('  Lint:      SKIP');
      } else {
        console.log('  Lint:      ' + (l.passed ? chalk.green('pass') : chalk.yellow('warn')));
      }
    }
  }

  _formatTime(timestamp) {
    try {
      var d = new Date(timestamp);
      return d.toLocaleString();
    } catch (err) {
      return String(timestamp).slice(0, 19);
    }
  }

  _toOutput(entry) {
    return {
      id: entry.id,
      type: entry.type,
      status: entry.status,
      timestamp: entry.timestamp,
      changeName: entry.changeName,
      workspaces: entry.workspaces || [],
    };
  }
}

module.exports = { GraphHistoryCommand };
