/**
 * Memory Command
 * Enhanced memory management with vector database integration and semantic search.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { createLogger } = require('../../utils/logger');
const { MemoryScanner } = require('./memory-scan');
const { walkFiles: _walkFiles } = require('../../utils/file-walker');
const _logger = createLogger('memory');

class MemoryCommand extends MemoryScanner {
  constructor(cwd = process.cwd()) {
    super(cwd);
    this.memoryDir = path.join(cwd, 'stdd', 'memory');
    this.vectorPath = path.join(this.memoryDir, 'vectors.jsonl');
    this.indexPath = path.join(this.memoryDir, 'index.json');
  }

  execute(action = 'scan', args = [], options = {}) {
    switch (action) {
      case 'scan':
      case 'index':
        return this.scan(options);
      case 'search':
      case 'query':
        return this.search(args.join(' '), options);
      case 'add':
        return this.add(args[0], options);
      case 'list':
      case 'ls':
        return this.list(options);
      case 'status':
        return this.status(options);
      case 'clear':
        return this.clear(options);
      case 'export':
        return this.export(options);
      case 'import':
        return this.import(args[0], options);
      default:
        return super.execute(action, args, options);
    }
  }

  scan(options = {}) {
    fs.mkdirSync(this.memoryDir, { recursive: true });

    const memories = [];
    const memoryFiles = ['foundation.md', 'components.md', 'contracts.md', 'arch-evolution.md'];

    for (const file of memoryFiles) {
      const filePath = path.join(this.memoryDir, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        memories.push({
          type: file.replace('.md', ''),
          path: filePath,
          size: content.length,
          modified: fs.statSync(filePath).mtime,
        });
      }
    }

    // Scan project for additional context
    const contextFiles = this.scanContextFiles(options);
    const vectorCount = this.buildVectors(contextFiles);

    const result = {
      memoryFiles: memories.length,
      contextFiles: contextFiles.length,
      vectors: vectorCount,
      memoryDir: path.relative(this.cwd, this.memoryDir),
    };

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.bold('\nMemory Scan\n'));
      console.log(`  Memory files: ${chalk.cyan(result.memoryFiles)}`);
      console.log(`  Context files: ${chalk.cyan(result.contextFiles)}`);
      console.log(`  Vector entries: ${chalk.cyan(result.vectors)}`);
      console.log(`  Directory: ${chalk.dim(result.memoryDir)}\n`);
    }

    return result;
  }

  scanContextFiles(options = {}) {
    const contexts = [];
    const roots = ['src', 'lib', 'docs', 'README.md', 'CHANGELOG.md']
      .map(f => path.join(this.cwd, f))
      .filter(f => fs.existsSync(f));

    for (const root of roots) {
      if (fs.statSync(root).isFile()) {
        contexts.push(root);
      } else {
        const files = _walkFiles(root, {
          extensions: ['.md', '.txt', '.js', '.ts', '.jsx', '.tsx'],
          maxDepth: options.depth || 3,
        });
        contexts.push(...files);
      }
    }

    return contexts;
  }

  buildVectors(files) {
    const vectors = [];

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        const chunks = [];

        // Split into chunks for vectorization
        let currentChunk = [];
        for (const line of lines) {
          if (line.trim() && !line.trim().startsWith('#')) {
            currentChunk.push(line);
            if (currentChunk.length >= 5) {
              chunks.push(currentChunk.join(' '));
              currentChunk = [];
            }
          }
        }
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.join(' '));
        }

        chunks.forEach((chunk, i) => {
          vectors.push({
            id: `${path.relative(this.cwd, file)}:${i}`,
            source: path.relative(this.cwd, file),
            content: chunk.substring(0, 500),
            hash: this.simpleHash(chunk),
          });
        });
      } catch (err) {
        // Skip unreadable files
      }
    }

    // Save vectors
    fs.mkdirSync(this.memoryDir, { recursive: true });
    const vectorContent = vectors.map(v => JSON.stringify(v)).join('\n');
    fs.writeFileSync(this.vectorPath, vectorContent, 'utf8');

    // Build index
    const index = {
      updated: new Date().toISOString(),
      count: vectors.length,
      sources: [...new Set(vectors.map(v => v.source))],
    };
    fs.writeFileSync(this.indexPath, JSON.stringify(index, null, 2), 'utf8');

    return vectors.length;
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  search(query, options = {}) {
    if (!query) {
      throw new Error('Search query is required. Usage: stdd memory search "<query>"');
    }

    if (!fs.existsSync(this.vectorPath)) {
      throw new Error('No memory index found. Run "stdd memory scan" first.');
    }

    const vectors = fs.readFileSync(this.vectorPath, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
    const queryLower = query.toLowerCase();

    // Simple keyword matching (in production, would use embeddings)
    const results = vectors
      .map(v => ({
        ...v,
        score: this.calculateRelevance(queryLower, v.content.toLowerCase()),
      }))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit || 10);

    if (options.json) {
      console.log(JSON.stringify({ query, results, count: results.length }, null, 2));
    } else {
      console.log(chalk.bold('\nMemory Search Results\n'));
      console.log(`  Query: ${chalk.cyan(query)}`);
      console.log(`  Found: ${chalk.cyan(results.length.toString())} results\n`);

      if (results.length === 0) {
        console.log(chalk.dim('  No matches found. Try different keywords.\n'));
      } else {
        results.forEach((r, i) => {
          console.log(`  ${chalk.dim((i + 1).toString() + '.')} ${chalk.cyan(r.source)} (${chalk.dim('score: ' + r.score.toFixed(2))})`);
          console.log(`      ${chalk.dim(r.content.substring(0, 100))}...\n`);
        });
      }
    }

    return { query, results, count: results.length };
  }

  calculateRelevance(query, content) {
    const queryWords = query.split(/\s+/);
    let score = 0;
    for (const word of queryWords) {
      if (content.includes(word)) {
        score += 1;
        if (content.startsWith(word)) score += 0.5;
        if (content.split(word).length > 2) score += 0.3;
      }
    }
    return score / queryWords.length;
  }

  add(content, options = {}) {
    if (!content) {
      throw new Error('Content is required. Usage: stdd memory add "<content>"');
    }

    fs.mkdirSync(this.memoryDir, { recursive: true });

    const memoryType = options.type || 'note';
    const timestamp = new Date().toISOString();
    const memory = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      type: memoryType,
      content,
      timestamp,
      tags: options.tags ? options.tags.split(',') : [],
    };

    const memoryPath = path.join(this.memoryDir, `${memoryType}.jsonl`);
    fs.appendFileSync(memoryPath, JSON.stringify(memory) + '\n', 'utf8');

    if (options.json) {
      console.log(JSON.stringify({ memory, saved: true }, null, 2));
    } else {
      console.log(chalk.bold('\n✓ Memory added\n'));
      console.log(`  Type: ${chalk.cyan(memoryType)}`);
      console.log(`  ID: ${chalk.dim(memory.id)}`);
      console.log(`  Content: ${chalk.dim(content.substring(0, 50))}...\n`);
    }

    return { memory, saved: true };
  }

  list(options = {}) {
    const result = {
      memoryFiles: [],
      notes: [],
      vectors: 0,
    };

    if (fs.existsSync(this.memoryDir)) {
      const files = fs.readdirSync(this.memoryDir);
      for (const file of files) {
        const filePath = path.join(this.memoryDir, file);
        const stat = fs.statSync(filePath);

        if (file.endsWith('.md')) {
          result.memoryFiles.push({
            file,
            size: stat.size,
            modified: stat.mtime,
          });
        } else if (file.endsWith('.jsonl')) {
          const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
          result.notes.push({
            type: file.replace('.jsonl', ''),
            count: lines.length,
          });
        }
      }
    }

    if (fs.existsSync(this.indexPath)) {
      const index = JSON.parse(fs.readFileSync(this.indexPath, 'utf8'));
      result.vectors = index.count || 0;
    }

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.bold('\nMemory Contents\n'));

      if (result.memoryFiles.length > 0) {
        console.log('  Memory Files:');
        result.memoryFiles.forEach(m => {
          console.log(`    ${chalk.cyan(m.file)} · ${chalk.dim(m.modified.toLocaleDateString())}`);
        });
      }

      if (result.notes.length > 0) {
        console.log('\n  Notes:');
        result.notes.forEach(n => {
          console.log(`    ${chalk.cyan(n.type)}: ${n.count} entries`);
        });
      }

      console.log(`\n  Vectors: ${chalk.cyan(result.vectors.toString())} indexed chunks\n`);
    }

    return result;
  }

  status(options = {}) {
    return this.list(options);
  }

  clear(options = {}) {
    if (!options.force) {
      throw new Error('Clearing memory requires --force. Use: stdd memory clear --force');
    }

    const files = fs.existsSync(this.memoryDir) ? fs.readdirSync(this.memoryDir) : [];
    let cleared = 0;

    for (const file of files) {
      const filePath = path.join(this.memoryDir, file);
      if (file.endsWith('.jsonl') || file === 'vectors.jsonl' || file === 'index.json') {
        fs.unlinkSync(filePath);
        cleared++;
      }
    }

    if (options.json) {
      console.log(JSON.stringify({ cleared, files }, null, 2));
    } else {
      console.log(chalk.bold('\n✓ Memory cleared\n'));
      console.log(`  Cleared: ${chalk.cyan(cleared.toString())} files\n`);
    }

    return { cleared, files };
  }

  export(filePath, options = {}) {
    const exportPath = filePath || path.join(this.cwd, 'memory-export.json');
    const data = {
      exported: new Date().toISOString(),
      memoryFiles: {},
      notes: {},
      vectors: [],
    };

    if (fs.existsSync(this.memoryDir)) {
      const files = fs.readdirSync(this.memoryDir);
      for (const file of files) {
        const filePath = path.join(this.memoryDir, file);
        if (file.endsWith('.md')) {
          data.memoryFiles[file] = fs.readFileSync(filePath, 'utf8');
        } else if (file.endsWith('.jsonl')) {
          data.notes[file] = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
        }
      }
    }

    if (fs.existsSync(this.vectorPath)) {
      data.vectors = fs.readFileSync(this.vectorPath, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
    }

    fs.writeFileSync(exportPath, JSON.stringify(data, null, 2), 'utf8');

    if (options.json) {
      console.log(JSON.stringify({ exported: true, path: exportPath, size: data }, null, 2));
    } else {
      console.log(chalk.bold('\n✓ Memory exported\n'));
      console.log(`  ${chalk.cyan(path.relative(this.cwd, exportPath))}\n`);
    }

    return { exported: true, path: exportPath, size: data };
  }

  import(filePath, options = {}) {
    if (!filePath) {
      throw new Error('Import path is required. Usage: stdd memory import <file.json>');
    }

    const importPath = path.resolve(filePath);
    if (!fs.existsSync(importPath)) {
      throw new Error(`Import file not found: ${importPath}`);
    }

    const data = JSON.parse(fs.readFileSync(importPath, 'utf8'));
    fs.mkdirSync(this.memoryDir, { recursive: true });

    let imported = 0;

    for (const [file, content] of Object.entries(data.memoryFiles || {})) {
      const resolved = path.resolve(this.memoryDir, file);
      if (!resolved.startsWith(this.memoryDir)) {
        throw new Error(`Path traversal detected in import file key: ${file}`);
      }
      fs.writeFileSync(resolved, content, 'utf8');
      imported++;
    }

    for (const [file, lines] of Object.entries(data.notes || {})) {
      const resolved = path.resolve(this.memoryDir, file);
      if (!resolved.startsWith(this.memoryDir)) {
        throw new Error(`Path traversal detected in import note key: ${file}`);
      }
      fs.appendFileSync(resolved, lines.join('\n') + '\n', 'utf8');
      imported++;
    }

    if (options.json) {
      console.log(JSON.stringify({ imported, path: importPath }, null, 2));
    } else {
      console.log(chalk.bold('\n✓ Memory imported\n'));
      console.log(`  Imported: ${chalk.cyan(imported.toString())} files`);
      console.log(`  From: ${chalk.dim(path.relative(this.cwd, importPath))}\n`);
    }

    return { imported, path: importPath };
  }
}

module.exports = { MemoryCommand };
