const path = require('path');
const { findActiveChange, parseTasks } = require('../../utils/change-utils');
const { RecommendEngine } = require('../../cli/commands/recommend');
const { createLogger } = require('../../utils/logger');
const logger = createLogger('stdd-tools');

class StddTools {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.stddDir = path.join(cwd, 'stdd');
  }

  status() {
    if (!require('fs').existsSync(this.stddDir)) {
      return { tool: 'stdd.status', initialized: false, message: 'STDD not initialized.' };
    }
    const specsDir = path.join(this.stddDir, 'specs');
    const changesDir = path.join(this.stddDir, 'changes');
    const memoryDir = path.join(this.stddDir, 'memory');
    const specs = this.countDir(specsDir);
    const changes = this.listChanges(changesDir);
    const memory = this.countDir(memoryDir);
    return { tool: 'stdd.status', initialized: true, specs, changes, memory };
  }

  recommend(changeName) {
    const engine = new RecommendEngine(this.cwd);
    if (changeName) {
      return engine.recommend(changeName, {});
    }
    return engine.recommend(null, {});
  }

  verify(changeName) {
    const { VerifyCommand } = require('../../cli/commands/verify');
    const cmd = new VerifyCommand();
    const captured = this.runCaptured(() => cmd.execute(changeName, { json: false }));
    return {
      tool: 'stdd.verify',
      change: changeName || this.autoDetectChange(),
      output: captured.replace(/\u001b\[\d+m/g, ''),
      failed: captured.includes('✗') || captured.includes('FAIL'),
    };
  }

  autoDetectChange() {
    try {
      const dir = findActiveChange(this.stddDir);
      return dir ? path.basename(dir) : null;
    } catch (_) {
      return null;
    }
  }

  listChanges(changesDir) {
    if (!require('fs').existsSync(changesDir)) return [];
    const fs = require('fs');
    const entries = fs.readdirSync(changesDir, { withFileTypes: true });
    return entries.filter(e => e.isDirectory() && e.name !== 'archive' && !e.name.startsWith('.'))
      .map(e => {
        const tasksPath = path.join(changesDir, e.name, 'tasks.md');
        const tasks = fs.existsSync(tasksPath) ? parseTasks(tasksPath) : [];
        const done = tasks.filter(t => t.isDone).length;
        return { name: e.name, tasks: tasks.length, done };
      });
  }

  countDir(dirPath) {
    const fs = require('fs');
    if (!fs.existsSync(dirPath)) return 0;
    try {
      return fs.readdirSync(dirPath).filter(f => !f.startsWith('.')).length;
    } catch (err) {
      logger.warn(err.message);
      return 0;
    }
  }

  runCaptured(fn) {
    const originalLog = console.log;
    const originalError = console.error;
    let output = '';
    console.log = (...args) => {
      output += args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ') + '\n';
    };
    console.error = (...args) => {
      output += args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ') + '\n';
    };
    try {
      fn();
    } catch (err) {
      output += `[Exception] ${err.message}`;
    } finally {
      console.log = originalLog;
      console.error = originalError;
    }
    return output;
  }
}

module.exports = { StddTools };
