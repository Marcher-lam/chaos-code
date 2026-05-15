/**
 * STDD Test Reporter - Jest 适配器
 *
 * 用法: npx jest --reporters="<rootDir>/stdd/reporters/jest.js"
 */

class STDDJestReporter {
  constructor(globalConfig, options) {
    this.globalConfig = globalConfig;
    this.options = options;
    this.passed = [];
    this.failed = [];
    this.skipped = [];
  }

  onRunStart(aggregatedResults) {
    console.log(`\n[STDD] 开始测试: ${aggregatedResults.numTotalTestSuites} 个文件\n`);
  }

  onTestResult(testPath, testResult) {
    testResult.testResults.forEach((result) => {
      const entry = {
        name: result.fullName,
        file: testPath,
        duration: result.duration,
      };

      switch (result.status) {
        case 'passed':
          this.passed.push(entry);
          break;
        case 'failed':
          entry.errors = result.failureMessages;
          this.failed.push(entry);
          break;
        default:
          this.skipped.push(entry);
      }
    });
  }

  onRunComplete() {
    const total = this.passed.length + this.failed.length + this.skipped.length;

    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║           STDD Test Report                   ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log(`║  Total:   ${String(total).padEnd(33)}║`);
    console.log(`║  Passed:  ${String(this.passed.length).padEnd(33)}║`);
    console.log(`║  Failed:  ${String(this.failed.length).padEnd(33)}║`);
    console.log(`║  Skipped: ${String(this.skipped.length).padEnd(33)}║`);
    console.log('╚══════════════════════════════════════════════╝');

    if (this.failed.length > 0) {
      console.log('\n[STDD] 失败测试:');
      this.failed.forEach((t) => {
        console.log(`  ✗ ${t.name}`);
        if (t.errors) {
          t.errors.forEach((e) => console.log(`    ${e}`));
        }
      });
    }

    // 生成 JSON 报告
    const report = {
      framework: 'jest',
      timestamp: new Date().toISOString(),
      summary: {
        total,
        passed: this.passed.length,
        failed: this.failed.length,
        skipped: this.skipped.length,
      },
      passed: this.passed.map((t) => t.name),
      failed: this.failed.map((t) => ({
        name: t.name,
        file: t.file,
        errors: t.errors || [],
      })),
    };

    const fs = require('fs');
    const path = require('path');
    const reportDir = path.join(process.cwd(), 'stdd', 'reports');
    fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(
      path.join(reportDir, 'test-report.json'),
      JSON.stringify(report, null, 2)
    );
    console.log(`\n[STDD] 报告已生成: stdd/reports/test-report.json`);
  }
}

module.exports = STDDJestReporter;
