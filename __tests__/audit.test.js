const fs = require('fs');
const path = require('path');
const os = require('os');
const { AuditCommand } = require('../src/cli/commands/audit');

describe('AuditCommand', () => {
  let tempDir;
  let logSpy;

  function createTempProject(name, setupFn) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-audit-test-'));
    tempDir = path.join(root, name);
    fs.mkdirSync(tempDir, { recursive: true });
    if (setupFn) setupFn(tempDir);
    return tempDir;
  }

  function makeEvidence(type, status, constitutionIssues = {}, extra = {}) {
    return {
      type,
      id: 'test-hash',
      timestamp: new Date().toISOString(),
      unixTimestamp: Date.now(),
      status,
      results: {
        tasks: { allDone: true },
        tests: { passed: true },
        constitution: {
          status,
          issues: {
            blocking: constitutionIssues.blocking || [],
            warning: constitutionIssues.warning || [],
          },
        },
      },
      metadata: { changeName: 'test-change', os: process.platform, nodeVersion: process.version },
      ...extra,
    };
  }

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(path.dirname(tempDir), { recursive: true, force: true });
    }
    tempDir = null;
  });

  describe('Case 1: No evidence files', () => {
    it('should show "No history found" when stdd is not initialized', async () => {
      const projectPath = createTempProject('no-stdd', () => {});

      const cmd = new AuditCommand(projectPath);
      const result = await cmd.execute({ json: true });

      expect(result.totalChecks).toBe(0);
      expect(result.avgCompliance).toBe(0);
    });

    it('should show "No history found" when stdd exists but no evidence', async () => {
      const projectPath = createTempProject('empty-stdd', (p) => {
        fs.mkdirSync(path.join(p, 'stdd'), { recursive: true });
        fs.mkdirSync(path.join(p, 'stdd', 'changes'), { recursive: true });
      });

      const cmd = new AuditCommand(projectPath);
      const result = await cmd.execute({ json: true });

      expect(result.totalChecks).toBe(0);
    });

    it('should print "No history found" in text mode', async () => {
      const projectPath = createTempProject('no-history', (p) => {
        fs.mkdirSync(path.join(p, 'stdd'), { recursive: true });
      });

      const cmd = new AuditCommand(projectPath);
      await cmd.execute({ json: false });

      const printed = logSpy.mock.calls.map(call => String(call[0])).join('\n');
      expect(printed).toContain('No history found');
    });
  });

  describe('Case 2: One pass, one fail', () => {
    it('should count 2 runs and correctly identify the failing Article', async () => {
      const projectPath = createTempProject('mixed', (p) => {
        // Pass evidence in stdd/evidence/
        const rootEvidenceDir = path.join(p, 'stdd', 'evidence');
        fs.mkdirSync(rootEvidenceDir, { recursive: true });
        const passEvidence = makeEvidence('guard', 'pass');
        fs.writeFileSync(
          path.join(rootEvidenceDir, 'guard-1000000001.json'),
          JSON.stringify(passEvidence, null, 2)
        );

        // Fail evidence in a change's evidence/
        const changeEvidenceDir = path.join(p, 'stdd', 'changes', 'feature-x', 'evidence');
        fs.mkdirSync(changeEvidenceDir, { recursive: true });
        const failEvidence = makeEvidence('verify', 'fail', {
          blocking: [
            {
              article: 7,
              name: 'Security',
              message: 'Hardcoded secret in src/config.js: password = "secret"',
            },
          ],
          warning: [
            {
              article: 4,
              name: 'Style',
              message: 'File too long (600 lines): src/utils.js',
            },
          ],
        });
        fs.writeFileSync(
          path.join(changeEvidenceDir, 'verify-1000000002.json'),
          JSON.stringify(failEvidence, null, 2)
        );
      });

      const cmd = new AuditCommand(projectPath);
      const result = await cmd.execute({ json: true });

      expect(result.totalChecks).toBe(2);

      // Only 1 pass out of 2
      expect(result.avgCompliance).toBe(50);

      // Article 7 (Security) should be top violation with 1 failure
      expect(result.topViolations.length).toBeGreaterThanOrEqual(1);
      const art7 = result.topViolations.find(v => v.article === 7);
      expect(art7).toBeDefined();
      expect(art7.count).toBe(1);

      // Article 4 (Style) should also be counted
      const art4 = result.topViolations.find(v => v.article === 4);
      expect(art4).toBeDefined();
      expect(art4.count).toBe(1);

      // src/config.js should appear in risky files
      expect(result.riskiestFiles.length).toBeGreaterThanOrEqual(1);
      const riskyConfig = result.riskiestFiles.find(f => f.file.includes('src/config.js'));
      expect(riskyConfig).toBeDefined();
      expect(riskyConfig.count).toBe(1);
    });

    it('should output valid text report without --json', async () => {
      const projectPath = createTempProject('text-report', (p) => {
        const evidenceDir = path.join(p, 'stdd', 'evidence');
        fs.mkdirSync(evidenceDir, { recursive: true });
        const evidence = makeEvidence('guard', 'pass');
        fs.writeFileSync(
          path.join(evidenceDir, 'guard-1000000003.json'),
          JSON.stringify(evidence, null, 2)
        );
      });

      const cmd = new AuditCommand(projectPath);
      await cmd.execute({ json: false });

      const printed = logSpy.mock.calls.map(call => String(call[0])).join('\n');
      expect(printed).toContain('Total Checks');
      expect(printed).toContain('Avg Compliance');
    });

    it('should group issue paths by workspace and print workspace breakdown', async () => {
      const projectPath = createTempProject('workspace-report', (p) => {
        fs.writeFileSync(path.join(p, 'package.json'), JSON.stringify({ workspaces: ['packages/*'] }, null, 2));
        fs.mkdirSync(path.join(p, 'packages', 'api'), { recursive: true });
        fs.writeFileSync(path.join(p, 'packages', 'api', 'package.json'), JSON.stringify({ name: '@demo/api' }, null, 2));

        const evidenceDir = path.join(p, 'stdd', 'evidence');
        fs.mkdirSync(evidenceDir, { recursive: true });
        const evidence = makeEvidence('guard', 'fail', {
          blocking: [
            {
              article: 7,
              name: 'Security',
              file: 'packages/api/src/index.ts',
              message: 'Hardcoded secret in packages/api/src/index.ts',
            },
          ],
        });
        fs.writeFileSync(
          path.join(evidenceDir, 'guard-1000000007.json'),
          JSON.stringify(evidence, null, 2)
        );
      });

      const cmd = new AuditCommand(projectPath);
      const result = await cmd.execute({ json: true });

      expect(result.workspaceBreakdown).toEqual([
        expect.objectContaining({
          workspaceName: 'packages/api',
          totalIssues: 1,
          blockingIssues: 1,
          warningIssues: 0,
        }),
      ]);
      expect(result.workspaceBreakdown[0].topArticles).toEqual([
        expect.objectContaining({ article: 7, count: 1 }),
      ]);

      logSpy.mockClear();
      await cmd.execute({ json: false });
      const printed = logSpy.mock.calls.map(call => String(call[0])).join('\n');
      expect(printed).toContain('Workspace Breakdown');
      expect(printed).toContain('packages/api');
    });

    it('should filter aggregation by workspace evidence scope', async () => {
      const projectPath = createTempProject('workspace-filter', (p) => {
        fs.writeFileSync(path.join(p, 'package.json'), JSON.stringify({ workspaces: ['packages/*'] }, null, 2));
        fs.mkdirSync(path.join(p, 'packages', 'api'), { recursive: true });
        fs.writeFileSync(path.join(p, 'packages', 'api', 'package.json'), JSON.stringify({ name: '@demo/api' }, null, 2));
        fs.mkdirSync(path.join(p, 'packages', 'web'), { recursive: true });
        fs.writeFileSync(path.join(p, 'packages', 'web', 'package.json'), JSON.stringify({ name: '@demo/web' }, null, 2));

        const evidenceDir = path.join(p, 'stdd', 'evidence');
        fs.mkdirSync(evidenceDir, { recursive: true });
        fs.writeFileSync(path.join(evidenceDir, 'guard-1000000020.json'), JSON.stringify(makeEvidence('guard', 'fail', {
          blocking: [{ article: 7, file: 'packages/api/src/index.ts', message: 'Hardcoded secret' }],
        }, {
          metadata: { workspace: { name: '@demo/api', path: 'packages/api', root: path.join(p, 'packages', 'api') } },
        }), null, 2));
        fs.writeFileSync(path.join(evidenceDir, 'guard-1000000021.json'), JSON.stringify(makeEvidence('guard', 'fail', {
          warning: [{ article: 4, file: 'packages/web/src/index.ts', message: 'Style issue' }],
        }, {
          metadata: { workspace: { name: '@demo/web', path: 'packages/web', root: path.join(p, 'packages', 'web') } },
        }), null, 2));
      });

      const cmd = new AuditCommand(projectPath);
      const result = await cmd.execute({ json: true, workspace: 'packages/api' });

      expect(result.totalChecks).toBe(1);
      expect(result.topViolations).toEqual([
        expect.objectContaining({ article: 7, count: 1 }),
      ]);
      expect(result.topViolations.find(v => v.article === 4)).toBeUndefined();
    });
  });

  describe('Aggregation edge cases', () => {
    it('should ignore non-matching files in evidence directories', async () => {
      const projectPath = createTempProject('ignore-files', (p) => {
        const evidenceDir = path.join(p, 'stdd', 'evidence');
        fs.mkdirSync(evidenceDir, { recursive: true });
        // Valid evidence
        const evidence = makeEvidence('guard', 'pass');
        fs.writeFileSync(
          path.join(evidenceDir, 'guard-1000000004.json'),
          JSON.stringify(evidence, null, 2)
        );
        // Non-matching file
        fs.writeFileSync(
          path.join(evidenceDir, 'notes.txt'),
          'Not an evidence file'
        );
        fs.writeFileSync(
          path.join(evidenceDir, 'report.pdf'),
          'pdf content'
        );
      });

      const cmd = new AuditCommand(projectPath);
      const result = await cmd.execute({ json: true });

      expect(result.totalChecks).toBe(1);
    });

    it('should ignore malformed JSON evidence files', async () => {
      const projectPath = createTempProject('malformed-json', (p) => {
        const evidenceDir = path.join(p, 'stdd', 'evidence');
        fs.mkdirSync(evidenceDir, { recursive: true });
        const evidence = makeEvidence('guard', 'pass');
        fs.writeFileSync(
          path.join(evidenceDir, 'guard-1000000005.json'),
          JSON.stringify(evidence, null, 2)
        );
        // Malformed JSON
        fs.writeFileSync(
          path.join(evidenceDir, 'verify-1000000006.json'),
          '{broken json'
        );
      });

      const cmd = new AuditCommand(projectPath);
      const result = await cmd.execute({ json: true });

      // Only the valid one should count
      expect(result.totalChecks).toBe(1);
    });

    it('should aggregate multiple failures of the same article', async () => {
      const projectPath = createTempProject('repeat-violations', (p) => {
        const evidenceDir = path.join(p, 'stdd', 'evidence');
        fs.mkdirSync(evidenceDir, { recursive: true });

        // 3 fails all with Article 4 style violations
        for (let i = 0; i < 3; i++) {
          const evidence = makeEvidence('verify', 'fail', {
            warning: [
              {
                article: 4,
                name: 'Style',
                message: `File too long: src/app.js`,
              },
            ],
          });
          fs.writeFileSync(
            path.join(evidenceDir, `verify-${1000000010 + i}.json`),
            JSON.stringify(evidence, null, 2)
          );
        }
      });

      const cmd = new AuditCommand(projectPath);
      const result = await cmd.execute({ json: true });

      expect(result.totalChecks).toBe(3);
      expect(result.avgCompliance).toBe(0);

      const art4 = result.topViolations.find(v => v.article === 4);
      expect(art4).toBeDefined();
      expect(art4.count).toBe(3);
    });
  });
});
