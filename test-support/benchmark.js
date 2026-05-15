const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Performance Benchmark Suite
 * 
 * Provides performance benchmarks for critical STDD Copilot operations.
 */


class BenchmarkRunner {
  constructor() {
    this.results = [];
  }

  /**
   * Run a benchmark
   * @param {string} name - Benchmark name
   * @param {Function} fn - Function to benchmark
   * @param {number} iterations - Number of iterations
   */
  async benchmark(name, fn, iterations = 100) {
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const end = performance.now();
      times.push(end - start);
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    const median = times.sort((a, b) => a - b)[Math.floor(times.length / 2)];

    const result = {
      name,
      iterations,
      avg: avg.toFixed(3),
      min: min.toFixed(3),
      max: max.toFixed(3),
      median: median.toFixed(3),
    };

    this.results.push(result);
    return result;
  }

  /**
   * Print benchmark results
   */
  printResults() {
    console.log('\n📊 Performance Benchmark Results\n');
    console.log('=' .repeat(70));
    console.log(`${'Benchmark'.padEnd(30)} ${'Avg (ms)'.padEnd(10)} ${'Min (ms)'.padEnd(10)} ${'Max (ms)'.padEnd(10)} ${'Median (ms)'.padEnd(10)}`);
    console.log('=' .repeat(70));
    
    for (const result of this.results) {
      console.log(`${result.name.padEnd(30)} ${result.avg.padEnd(10)} ${result.min.padEnd(10)} ${result.max.padEnd(10)} ${result.median.padEnd(10)}`);
    }
    
    console.log('=' .repeat(70));
  }

  /**
   * Export results to JSON
   * @param {string} filePath - Output file path
   */
  exportResults(filePath) {
    fs.writeFileSync(filePath, JSON.stringify(this.results, null, 2));
  }
}

// Benchmark tests
async function runBenchmarks() {
  const runner = new BenchmarkRunner();

  // Benchmark 1: Graph compilation
  const DynamicGraphRouter = require('../src/utils/dynamic-router');
  await runner.benchmark('Graph Compilation', () => {
    const router = new DynamicGraphRouter();
    router.compile('feature');
  }, 100);

  // Benchmark 2: Evidence capture
  const EvidenceCapture = require('../src/utils/evidence-capture');
  await runner.benchmark('Evidence Capture', () => {
    const capture = new EvidenceCapture();
    capture.capture('test-node', new Error('Test error'), {
      inputs: { test: 'data' },
      partialOutput: null,
    });
  }, 100);

  // Benchmark 3: Change name validation
  const { validateChangeName } = require('../src/utils/change-utils');
  await runner.benchmark('Change Name Validation', () => {
    validateChangeName('test-change-123');
  }, 1000);

  // Benchmark 4: Task parsing
  const { parseTasks } = require('../src/utils/change-utils');
  const tempFile = path.join(os.tmpdir(), 'tasks.md');
  fs.writeFileSync(tempFile, '- [ ] TASK-001 Write unit tests\n- [x] TASK-002 Implement login logic\n- [ ] TASK-003 Add documentation\n');
  
  await runner.benchmark('Task Parsing', () => {
    parseTasks(tempFile);
  }, 1000);

  // Benchmark 5: Constitution check
  const { ConstitutionChecker } = require('../src/cli/commands/constitution-checker');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-bench-'));
  fs.mkdirSync(path.join(tempDir, 'stdd'), { recursive: true });
  fs.writeFileSync(path.join(tempDir, 'stdd', 'config.yaml'), 'test: true\n');
  
  await runner.benchmark('Constitution Check', () => {
    const checker = new ConstitutionChecker(tempDir);
    checker.run();
  }, 100);

  // Cleanup
  fs.rmSync(tempFile, { force: true });
  fs.rmSync(tempDir, { recursive: true, force: true });

  // Print results
  runner.printResults();

  // Export results
  const resultsPath = path.join(__dirname, '..', 'benchmark-results.json');
  runner.exportResults(resultsPath);
  console.log(`\nResults exported to: ${resultsPath}`);
}

// Run benchmarks if this file is executed directly
if (require.main === module) {
  runBenchmarks().catch(console.error);
}

module.exports = { BenchmarkRunner, runBenchmarks };
