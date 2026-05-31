/**
 * Story Command
 * Agile story/epic/sprint management for iterative development.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class StoryCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.stddDir = path.join(cwd, 'stdd');
    this.storiesDir = path.join(this.stddDir, 'stories');
    this.sprintsDir = path.join(this.stddDir, 'sprints');
  }

  async execute(action = 'list', args = [], options = {}) {
    let safeArgs = [];
    if (Array.isArray(args)) {
      safeArgs = args;
    } else if (typeof args === 'string') {
      safeArgs = [args];
    }
    switch (action) {
      case 'create':
        return this.create(safeArgs[0], options);
      case 'list':
        return this.list(options);
      case 'update':
        return this.update(safeArgs[0], options);
      case 'split':
        return this.split(safeArgs[0], options);
      case 'epic':
        return this.epic(safeArgs[0], options);
      case 'sprint':
        return this.sprint(safeArgs[0], options);
      case 'board':
        return this.board(options);
      default:
        return this.list(options);
    }
  }

  _ensureDir() {
    fs.mkdirSync(this.storiesDir, { recursive: true });
    fs.mkdirSync(this.sprintsDir, { recursive: true });
  }

  _readStories() {
    this._ensureDir();
    const files = fs.readdirSync(this.storiesDir).filter(f => f.endsWith('.json'));
    return files.map(f => {
      try { return JSON.parse(fs.readFileSync(path.join(this.storiesDir, f), 'utf8')); }
      catch (_) { return null; }
    }).filter(Boolean);
  }

  create(name, options = {}) {
    if (!name) throw new Error('Story name required. Usage: stdd story create <name>');
    this._ensureDir();

    const id = 'STORY-' + Date.now().toString(36).toUpperCase();
    const story = {
      id,
      name,
      type: options.type || 'feature',
      epic: options.epic || null,
      status: 'backlog',
      priority: options.priority || 'medium',
      points: parseInt(options.points, 10) || 3,
      assignee: options.assignee || null,
      sprint: options.sprint || null,
      description: options.description || name,
      acceptance: (options.acceptance || '').split(',').map(a => a.trim()).filter(Boolean),
      tasks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(path.join(this.storiesDir, id + '.json'), JSON.stringify(story, null, 2), 'utf8');

    if (!options.json) {
      console.log(chalk.bold('\n  Story Created\n'));
      console.log('  ID:       ' + chalk.cyan(id));
      console.log('  Name:     ' + chalk.cyan(name));
      console.log('  Type:     ' + story.type);
      console.log('  Priority: ' + story.priority);
      console.log('  Points:   ' + story.points);
      if (story.epic) console.log('  Epic:     ' + chalk.cyan(story.epic));
      console.log('');
    }
    return story;
  }

  list(options = {}) {
    const stories = this._readStories();
    let filtered = stories;

    if (options.status) filtered = filtered.filter(s => s.status === options.status);
    if (options.epic) filtered = filtered.filter(s => s.epic === options.epic);
    if (options.sprint) filtered = filtered.filter(s => s.sprint === options.sprint);
    if (options.type) filtered = filtered.filter(s => s.type === options.type);

    if (options.json) {
      console.log(JSON.stringify(filtered, null, 2));
    } else {
      console.log(chalk.bold('\n  Stories (' + filtered.length + ')\n'));
      if (filtered.length === 0) {
        console.log(chalk.dim('  No stories found. Create one with: stdd story create <name>'));
      } else {
        const byStatus = {};
        for (const s of filtered) {
          if (!byStatus[s.status]) byStatus[s.status] = [];
          byStatus[s.status].push(s);
        }
        for (const [status, items] of Object.entries(byStatus)) {
          const color = status === 'done' ? chalk.green : status === 'in-progress' ? chalk.yellow : chalk.dim;
          console.log('  ' + color(status.toUpperCase()) + ' (' + items.length + ')');
          for (const s of items) {
            console.log('    ' + chalk.cyan(s.id) + ' ' + s.name + ' [' + s.points + 'pt]' + (s.epic ? ' (' + s.epic + ')' : ''));
          }
          console.log('');
        }
      }
    }
    return filtered;
  }

  update(id, options = {}) {
    if (!id) throw new Error('Story ID required. Usage: stdd story update <id>');
    const storyPath = path.join(this.storiesDir, id + '.json');
    if (!fs.existsSync(storyPath)) throw new Error('Story not found: ' + id);

    const story = JSON.parse(fs.readFileSync(storyPath, 'utf8'));
    if (options.status) story.status = options.status;
    if (options.priority) story.priority = options.priority;
    if (options.points) story.points = parseInt(options.points, 10);
    if (options.assignee) story.assignee = options.assignee;
    if (options.sprint) story.sprint = options.sprint;
    if (options.epic) story.epic = options.epic;
    if (options.name) story.name = options.name;
    story.updatedAt = new Date().toISOString();

    fs.writeFileSync(storyPath, JSON.stringify(story, null, 2), 'utf8');

    if (!options.json) {
      console.log(chalk.green('\n  Story updated: ' + id + ' -> ' + story.status + '\n'));
    }
    return story;
  }

  split(id, options = {}) {
    if (!id) throw new Error('Story ID required. Usage: stdd story split <id>');
    const storyPath = path.join(this.storiesDir, id + '.json');
    if (!fs.existsSync(storyPath)) throw new Error('Story not found: ' + id);

    const original = JSON.parse(fs.readFileSync(storyPath, 'utf8'));
    const parts = parseInt(options.parts, 10) || 2;
    const results = [];

    for (let i = 0; i < parts; i++) {
      const newId = 'STORY-' + Date.now().toString(36).toUpperCase() + '-' + (i + 1);
      const split = {
        ...original,
        id: newId,
        name: original.name + ' (' + (i + 1) + '/' + parts + ')',
        points: Math.ceil(original.points / parts),
        status: 'backlog',
        splitFrom: id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      delete split.splitFrom;
      fs.writeFileSync(path.join(this.storiesDir, newId + '.json'), JSON.stringify(split, null, 2), 'utf8');
      results.push(split);
    }

    // Update original
    original.status = 'split';
    original.splitInto = results.map(r => r.id);
    original.updatedAt = new Date().toISOString();
    fs.writeFileSync(storyPath, JSON.stringify(original, null, 2), 'utf8');

    if (!options.json) {
      console.log(chalk.bold('\n  Story Split: ' + id + ' -> ' + parts + ' parts\n'));
      for (const r of results) {
        console.log('  ' + chalk.cyan(r.id) + ' ' + r.name + ' [' + r.points + 'pt]');
      }
      console.log('');
    }
    return results;
  }

  epic(name, options = {}) {
    this._ensureDir();
    const epicsDir = path.join(this.stddDir, 'stories', 'epics');
    fs.mkdirSync(epicsDir, { recursive: true });

    if (!name) {
      // List epics
      const stories = this._readStories();
      const epics = {};
      for (const s of stories) {
        const epicName = s.epic || 'uncategorized';
        if (!epics[epicName]) epics[epicName] = [];
        epics[epicName].push(s);
      }
      if (!options.json) {
        console.log(chalk.bold('\n  Epics\n'));
        for (const [epic, items] of Object.entries(epics)) {
          const done = items.filter(s => s.status === 'done').length;
          console.log('  ' + chalk.cyan(epic) + ' (' + done + '/' + items.length + ' done)');
        }
        console.log('');
      }
      return epics;
    }

    // Create epic
    const id = 'EPIC-' + Date.now().toString(36).toUpperCase();
    const epic = {
      id, name,
      description: options.description || '',
      stories: [],
      status: 'planning',
      createdAt: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(epicsDir, id + '.json'), JSON.stringify(epic, null, 2), 'utf8');

    if (!options.json) {
      console.log(chalk.bold('\n  Epic Created\n'));
      console.log('  ID:   ' + chalk.cyan(id));
      console.log('  Name: ' + chalk.cyan(name) + '\n');
    }
    return epic;
  }

  sprint(name, options = {}) {
    this._ensureDir();
    if (!name) {
      // List sprints
      const sprints = fs.readdirSync(this.sprintsDir).filter(f => f.endsWith('.json')).map(f => {
        try { return JSON.parse(fs.readFileSync(path.join(this.sprintsDir, f), 'utf8')); }
        catch (_) { return null; }
      }).filter(Boolean);

      if (!options.json) {
        console.log(chalk.bold('\n  Sprints (' + sprints.length + ')\n'));
        for (const sp of sprints) {
          const totalPts = (sp.stories || []).reduce((sum, s) => sum + (s.points || 0), 0);
          console.log('  ' + chalk.cyan(sp.id) + ' ' + sp.name + ' [' + totalPts + 'pt] ' + (sp.status === 'active' ? chalk.green('ACTIVE') : sp.status));
        }
        console.log('');
      }
      return sprints;
    }

    const id = 'SPRINT-' + Date.now().toString(36).toUpperCase();
    const stories = options.stories ? String(options.stories).split(',').map(s => s.trim()) : [];

    const sprint = {
      id, name,
      status: options.status || 'planning',
      stories: stories.map(s => ({ id: s, status: 'todo' })),
      startDate: options.start || new Date().toISOString().split('T')[0],
      endDate: options.end || null,
      goal: options.goal || name,
      createdAt: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(this.sprintsDir, id + '.json'), JSON.stringify(sprint, null, 2), 'utf8');

    if (!options.json) {
      console.log(chalk.bold('\n  Sprint Created\n'));
      console.log('  ID:   ' + chalk.cyan(id));
      console.log('  Name: ' + chalk.cyan(name));
      console.log('  Stories: ' + stories.length);
      console.log('  Goal: ' + sprint.goal + '\n');
    }
    return sprint;
  }

  board(options = {}) {
    const stories = this._readStories();
    const columns = { backlog: [], 'in-progress': [], review: [], done: [] };

    for (const s of stories) {
      const status = columns[s.status] ? s.status : 'backlog';
      columns[status].push(s);
    }

    if (options.json) {
      console.log(JSON.stringify(columns, null, 2));
    } else {
      console.log(chalk.bold('\n  Story Board\n'));
      const colNames = Object.keys(columns);
      const widths = colNames.map(c => Math.max(c.length, ...columns[c].map(s => (s.id + ' ' + s.name).length)) + 2);
      const header = colNames.map((c, i) => chalk.bold(c.toUpperCase().padEnd(widths[i]))).join(' | ');
      console.log('  ' + header);
      console.log('  ' + colNames.map((c, i) => '-'.repeat(widths[i])).join('-+-'));
      const maxRows = Math.max(...Object.values(columns).map(c => c.length));
      for (let row = 0; row < maxRows; row++) {
        const line = colNames.map((c, i) => {
          const s = columns[c][row];
          return s ? (chalk.cyan(s.id) + ' ' + s.name).slice(0, widths[i]).padEnd(widths[i]) : ' '.repeat(widths[i]);
        }).join(' | ');
        console.log('  ' + line);
      }
      console.log('');
    }
    return columns;
  }
}

module.exports = { StoryCommand };
