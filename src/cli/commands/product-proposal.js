const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const chalk = require('chalk');

const SECTIONS = [
  'product-overview',
  'market-analysis',
  'user-personas',
  'positioning',
  'features',
  'architecture',
  'workflow',
  'pm-capability',
  'quality',
  'tech-stack',
  'competitive',
  'roadmap',
  'metrics',
  'risk',
  'appendix',
];

class ProductProposalCommand {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.stddDir = path.join(cwd, 'stdd');
    this.artifacts = {};
  }

  execute(options = {}) {
    if (!fs.existsSync(this.stddDir)) {
      throw new Error('STDD not initialized. Run `stdd init` first.');
    }

    this.scanArtifacts();

    if (options.json) {
      const data = this.buildStructuredData();
      console.log(JSON.stringify(data, null, 2));
      return data;
    }

    const report = this.buildReport(options);
    const outputPath = options.output
      ? path.resolve(options.output)
      : path.join(this.cwd, 'PRODUCT-PROPOSAL.md');

    fs.writeFileSync(outputPath, report, 'utf-8');

    const sectionCount = SECTIONS.length;
    const artifactCount = Object.keys(this.artifacts).filter(k => this.artifacts[k] !== null).length;

    console.log(chalk.bold('\n📋 Product Proposal Report\n'));
    console.log(`  ${chalk.green('✓')} Generated: ${outputPath}`);
    console.log(`  ${chalk.green('✓')} Sections: ${sectionCount}`);
    console.log(`  ${chalk.green('✓')} Artifacts scanned: ${artifactCount}`);
    console.log(chalk.dim(`\n  Use in AI tools: /stdd:product-proposal`));
  }

  scanArtifacts() {
    this.artifacts = {
      vision: this.readFile(path.join(this.stddDir, 'vision.md')),
      config: this.readYaml(path.join(this.stddDir, 'config.yaml')),
      proposals: this.scanChanges('proposal.md'),
      specs: this.scanSpecs(),
      designs: this.scanChanges('design.md'),
      tasks: this.scanChanges('tasks.md'),
      evidence: this.scanEvidence(),
      archived: this.scanArchived(),
      progress: this.readProgressLog(),
      packageJson: this.readPackageJson(),
    };
  }

  readFile(filePath) {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch {
      return null;
    }
  }

  readYaml(filePath) {
    try {
      return yaml.load(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      return null;
    }
  }

  readPackageJson() {
    try {
      return JSON.parse(fs.readFileSync(path.join(this.cwd, 'package.json'), 'utf-8'));
    } catch {
      return null;
    }
  }

  scanChanges(fileName) {
    const changesDir = path.join(this.stddDir, 'changes');
    const results = [];
    try {
      const entries = fs.readdirSync(changesDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name === 'archive' || entry.name.startsWith('.')) continue;
        const filePath = path.join(changesDir, entry.name, fileName);
        const content = this.readFile(filePath);
        if (content) {
          results.push({ change: entry.name, content });
        }
      }
    } catch {}
    return results.length > 0 ? results : null;
  }

  scanSpecs() {
    const changesDir = path.join(this.stddDir, 'changes');
    const results = [];
    try {
      const entries = fs.readdirSync(changesDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name === 'archive' || entry.name.startsWith('.')) continue;
        const specsDir = path.join(changesDir, entry.name, 'specs');
        if (!fs.existsSync(specsDir)) continue;
        const specFiles = this.walkDir(specsDir, '.feature');
        for (const sf of specFiles) {
          results.push({ change: entry.name, file: path.relative(specsDir, sf), content: this.readFile(sf) });
        }
      }
    } catch {}
    return results.length > 0 ? results : null;
  }

  scanEvidence() {
    const results = [];
    const rootEvidenceDir = path.join(this.stddDir, 'evidence');
    if (fs.existsSync(rootEvidenceDir)) {
      const files = this.walkDir(rootEvidenceDir, '.json');
      for (const f of files) {
        try {
          results.push(JSON.parse(fs.readFileSync(f, 'utf-8')));
        } catch {}
      }
    }
    const changesDir = path.join(this.stddDir, 'changes');
    try {
      const entries = fs.readdirSync(changesDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name === 'archive') continue;
        const evDir = path.join(changesDir, entry.name, 'evidence');
        if (!fs.existsSync(evDir)) continue;
        const files = this.walkDir(evDir, '.json');
        for (const f of files) {
          try {
            results.push(JSON.parse(fs.readFileSync(f, 'utf-8')));
          } catch {}
        }
      }
    } catch {}
    return results.length > 0 ? results : null;
  }

  scanArchived() {
    const archiveDir = path.join(this.stddDir, 'changes', 'archive');
    if (!fs.existsSync(archiveDir)) return null;
    try {
      return fs.readdirSync(archiveDir, { withFileTypes: true })
        .filter(e => e.isDirectory())
        .map(e => e.name);
    } catch {
      return null;
    }
  }

  readProgressLog() {
    const logPath = path.join(this.stddDir, 'progress.jsonl');
    if (!fs.existsSync(logPath)) return null;
    try {
      const lines = fs.readFileSync(logPath, 'utf-8').trim().split('\n').filter(Boolean);
      return lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    } catch {
      return null;
    }
  }

  walkDir(dir, ext) {
    const results = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results.push(...this.walkDir(fullPath, ext));
        } else if (entry.name.endsWith(ext)) {
          results.push(fullPath);
        }
      }
    } catch {}
    return results;
  }

  buildStructuredData() {
    const data = {
      metadata: {
        generatedAt: new Date().toISOString(),
        project: this.artifacts.packageJson ? this.artifacts.packageJson.name : 'unknown',
        version: this.artifacts.packageJson ? this.artifacts.packageJson.version : '0.0.0',
      },
      artifactCoverage: {},
      sections: {},
    };

    const artifactKeys = Object.keys(this.artifacts);
    for (const key of artifactKeys) {
      const val = this.artifacts[key];
      data.artifactCoverage[key] = val !== null;
    }

    data.sections = {
      overview: this.extractOverviewData(),
      features: this.extractFeatureData(),
      quality: this.extractQualityData(),
    };

    return data;
  }

  extractOverviewData() {
    const pkg = this.artifacts.packageJson;
    return {
      name: pkg ? pkg.name : 'Unknown',
      version: pkg ? pkg.version : '0.0.0',
      description: pkg ? pkg.description : '',
      hasVision: this.artifacts.vision !== null,
      changeCount: this.artifacts.proposals ? this.artifacts.proposals.length : 0,
      specCount: this.artifacts.specs ? this.artifacts.specs.length : 0,
      archivedCount: this.artifacts.archived ? this.artifacts.archived.length : 0,
    };
  }

  extractFeatureData() {
    const features = [];
    if (this.artifacts.proposals) {
      for (const p of this.artifacts.proposals) {
        features.push({ change: p.change, type: 'proposal' });
      }
    }
    if (this.artifacts.designs) {
      for (const d of this.artifacts.designs) {
        features.push({ change: d.change, type: 'design' });
      }
    }
    return features;
  }

  extractQualityData() {
    const evidence = this.artifacts.evidence || [];
    return {
      evidenceCount: evidence.length,
      passCount: evidence.filter(e => e.status === 'pass').length,
      failCount: evidence.filter(e => e.status === 'fail').length,
    };
  }

  buildReport(_options = {}) {
    const pkg = this.artifacts.packageJson;
    const projectName = pkg ? pkg.name : 'Unknown Project';
    const projectVersion = pkg ? pkg.version : '0.0.0';
    const projectDesc = pkg ? pkg.description : '';

    const sections = [];

    sections.push(this.buildHeader(projectName, projectVersion));
    sections.push(this.buildSection('1. 产品概述', this.buildOverview(projectName, projectVersion, projectDesc)));
    sections.push(this.buildSection('2. 市场分析', this.buildMarketAnalysis()));
    sections.push(this.buildSection('3. 用户画像与场景', this.buildUserPersonas()));
    sections.push(this.buildSection('4. 产品定位与价值主张', this.buildPositioning()));
    sections.push(this.buildSection('5. 核心功能清单', this.buildFeatures()));
    sections.push(this.buildSection('6. 产品架构', this.buildArchitecture()));
    sections.push(this.buildSection('7. 工作流设计', this.buildWorkflow()));
    sections.push(this.buildSection('8. PM 能力矩阵', this.buildPmCapability()));
    sections.push(this.buildSection('9. 质量保障体系', this.buildQuality()));
    sections.push(this.buildSection('10. 技术栈与依赖', this.buildTechStack()));
    sections.push(this.buildSection('11. 竞品对比', this.buildCompetitive()));
    sections.push(this.buildSection('12. 产品路线图', this.buildRoadmap()));
    sections.push(this.buildSection('13. 成功指标与 KPI', this.buildMetrics()));
    sections.push(this.buildSection('14. 风险分析', this.buildRisk()));
    sections.push(this.buildSection('15. 附录', this.buildAppendix(projectName)));

    return sections.join('\n\n');
  }

  buildHeader(name, version) {
    return `# ${name} 产品方案

> **Product Proposal Document** | Version ${version} | ${new Date().toISOString().split('T')[0]}
>
> 文档类型：产品方案报告
> 产品名称：${name}
> 产品版本：${version}
> 生成命令：\`stdd product-proposal\`
> 生成时间：${new Date().toISOString()}

---

## 目录

1. [产品概述](#1-产品概述)
2. [市场分析](#2-市场分析)
3. [用户画像与场景](#3-用户画像与场景)
4. [产品定位与价值主张](#4-产品定位与价值主张)
5. [核心功能清单](#5-核心功能清单)
6. [产品架构](#6-产品架构)
7. [工作流设计](#7-工作流设计)
8. [PM 能力矩阵](#8-pm-能力矩阵)
9. [质量保障体系](#9-质量保障体系)
10. [技术栈与依赖](#10-技术栈与依赖)
11. [竞品对比](#11-竞品对比)
12. [产品路线图](#12-产品路线图)
13. [成功指标与 KPI](#13-成功指标与-kpi)
14. [风险分析](#14-风险分析)
15. [附录](#15-附录)`;
  }

  buildSection(title, content) {
    return `---\n\n## ${title}\n\n${content}`;
  }

  buildOverview(name, version, desc) {
    const lines = [];

    lines.push('### 1.1 一句话描述\n');
    if (desc) {
      lines.push(`> ${desc}\n`);
    } else {
      lines.push('> TODO: 请补充产品一句话描述。\n');
    }

    lines.push('### 1.2 核心数据\n');
    lines.push('| 指标 | 数值 |');
    lines.push('|------|------|');
    lines.push(`| 产品名称 | ${name} |`);
    lines.push(`| 版本 | ${version} |`);
    lines.push(`| 活跃变更 | ${this.artifacts.proposals ? this.artifacts.proposals.length : 0} |`);
    lines.push(`| 已完成规格 | ${this.artifacts.specs ? this.artifacts.specs.length : 0} |`);
    lines.push(`| 技术设计文档 | ${this.artifacts.designs ? this.artifacts.designs.length : 0} |`);
    lines.push(`| 已归档变更 | ${this.artifacts.archived ? this.artifacts.archived.length : 0} |`);
    lines.push(`| 证据记录 | ${this.artifacts.evidence ? this.artifacts.evidence.length : 0} |`);
    lines.push(`| 已有愿景文档 | ${this.artifacts.vision ? '是' : '否'} |`);

    if (this.artifacts.vision) {
      lines.push('\n### 1.3 项目愿景（从 vision.md 提取）\n');
      const visionExcerpt = this.artifacts.vision.split('\n').slice(0, 20).join('\n');
      lines.push(visionExcerpt);
      if (this.artifacts.vision.split('\n').length > 20) {
        lines.push('\n> ... (完整内容请查看 `stdd/vision.md`)');
      }
    }

    if (this.artifacts.proposals && this.artifacts.proposals.length > 0) {
      lines.push('\n### 1.4 变更概览\n');
      lines.push('| 变更名称 | 来源 |');
      lines.push('|---------|------|');
      for (const p of this.artifacts.proposals) {
        const excerpt = p.content.split('\n').find(l => l.trim() && !l.startsWith('#')) || '';
        lines.push(`| ${p.change} | ${excerpt.substring(0, 60)}${excerpt.length > 60 ? '...' : ''} |`);
      }
    }

    return lines.join('\n');
  }

  buildMarketAnalysis() {
    const lines = [];

    if (this.artifacts.vision) {
      lines.push('> 以下内容基于项目愿景文档自动提取，请根据实际市场情况补充。\n');
    }

    lines.push('### 2.1 行业背景\n');
    lines.push('> TODO: 请补充行业背景分析。\n');
    lines.push('### 2.2 目标市场\n');
    lines.push('> TODO: 请补充目标市场规模估算。\n');
    lines.push('### 2.3 市场趋势\n');
    lines.push('> TODO: 请补充市场趋势分析。');

    return lines.join('\n');
  }

  buildUserPersonas() {
    const lines = [];

    lines.push('### 3.1 主要用户画像\n');
    lines.push('> TODO: 请根据实际产品补充用户画像。\n');

    if (this.artifacts.proposals) {
      lines.push('### 3.2 已规划的变更场景\n');
      lines.push('| 变更 | 描述 |');
      lines.push('|------|------|');
      for (const p of this.artifacts.proposals) {
        const firstLine = p.content.split('\n').find(l => l.trim() && !l.startsWith('#')) || p.change;
        lines.push(`| ${p.change} | ${firstLine.substring(0, 80)} |`);
      }
    }

    return lines.join('\n');
  }

  buildPositioning() {
    const lines = [];

    lines.push('### 4.1 产品定位\n');
    if (this.artifacts.packageJson && this.artifacts.packageJson.description) {
      lines.push(`\`${this.artifacts.packageJson.description}\`\n`);
    } else {
      lines.push('> TODO: 请补充产品定位。\n');
    }

    lines.push('### 4.2 价值主张\n');
    lines.push('> TODO: 请补充价值主张（对开发者/对团队/对项目/对 AI）。\n');

    lines.push('### 4.3 独特卖点 (USP)\n');
    lines.push('> TODO: 请补充独特卖点。');

    return lines.join('\n');
  }

  buildFeatures() {
    const lines = [];

    lines.push('### 5.1 功能全景图\n');
    lines.push('| 能力域 | 功能 | 来源 | 状态 |');
    lines.push('|--------|------|------|------|');

    if (this.artifacts.proposals) {
      for (const p of this.artifacts.proposals) {
        const taskStatus = this.getTaskStatus(p.change);
        lines.push(`| 需求 | ${p.change} | proposal.md | ${taskStatus} |`);
      }
    }

    if (this.artifacts.specs) {
      const changesWithSpecs = [...new Set(this.artifacts.specs.map(s => s.change))];
      for (const change of changesWithSpecs) {
        const specCount = this.artifacts.specs.filter(s => s.change === change).length;
        lines.push(`| 规格 | ${change} (${specCount} specs) | specs/*.feature | 已生成 |`);
      }
    }

    if (this.artifacts.designs) {
      for (const d of this.artifacts.designs) {
        lines.push(`| 设计 | ${d.change} | design.md | 已生成 |`);
      }
    }

    if (lines.length <= 3) {
      lines.push('| - | 暂无已规划功能 | - | - |');
    }

    return lines.join('\n');
  }

  getTaskStatus(changeName) {
    const taskEntry = this.artifacts.tasks ? this.artifacts.tasks.find(t => t.change === changeName) : null;
    if (!taskEntry) return '未拆解';
    const content = taskEntry.content;
    const total = (content.match(/- \[.\]/g) || []).length;
    const done = (content.match(/- \[x\]/g) || []).length;
    if (total === 0) return '已拆解';
    if (done === total) return `已完成 (${done}/${total})`;
    return `进行中 (${done}/${total})`;
  }

  buildArchitecture() {
    const lines = [];

    lines.push('### 6.1 目录结构\n');
    lines.push('```');

    const config = this.artifacts.config;
    if (config) {
      lines.push(`# 技术栈: ${config.project ? config.project.type || 'N/A' : 'N/A'}`);
      lines.push(`# 语言: ${config.project ? config.project.language || 'N/A' : 'N/A'}`);
      lines.push(`# 框架: ${config.project ? config.project.framework || 'N/A' : 'N/A'}`);
    }

    lines.push(`${path.basename(this.cwd)}/`);
    lines.push('├── stdd/');
    lines.push('│   ├── config.yaml');
    lines.push('│   ├── vision.md' + (this.artifacts.vision ? '  ✓' : '  (未创建)'));
    lines.push('│   ├── changes/');

    if (this.artifacts.proposals) {
      for (const p of this.artifacts.proposals) {
        lines.push(`│   │   ├── ${p.change}/`);
        lines.push(`│   │   │   ├── proposal.md  ✓`);
        const hasSpecs = this.artifacts.specs && this.artifacts.specs.some(s => s.change === p.change);
        const hasDesign = this.artifacts.designs && this.artifacts.designs.some(d => d.change === p.change);
        const hasTasks = this.artifacts.tasks && this.artifacts.tasks.some(t => t.change === p.change);
        lines.push(`│   │   │   ├── specs/  ${hasSpecs ? '✓' : '(无)'}`);
        lines.push(`│   │   │   ├── design.md  ${hasDesign ? '✓' : '(无)'}`);
        lines.push(`│   │   │   └── tasks.md  ${hasTasks ? '✓' : '(无)'}`);
      }
    }

    if (this.artifacts.archived && this.artifacts.archived.length > 0) {
      lines.push(`│   └── archive/  (${this.artifacts.archived.length} 已归档)`);
    }

    lines.push('│   └── specs/');
    lines.push('├── src/');
    lines.push('├── __tests__/');
    lines.push('└── package.json');
    lines.push('```\n');

    lines.push('### 6.2 技术栈\n');
    if (config && config.project) {
      lines.push('| 维度 | 配置 |');
      lines.push('|------|------|');
      for (const [key, val] of Object.entries(config.project)) {
        lines.push(`| ${key} | ${val} |`);
      }
    } else {
      lines.push('> 未检测到 `stdd/config.yaml` 中的技术栈配置。');
    }

    return lines.join('\n');
  }

  buildWorkflow() {
    const lines = [];

    lines.push('### 7.1 标准工作流\n');
    lines.push('```');
    lines.push('init → new → propose → clarify → confirm → spec → plan → apply → verify → archive');
    lines.push('```');

    if (this.artifacts.proposals) {
      lines.push('\n### 7.2 当前项目状态\n');
      lines.push('| 变更 | Proposal | Spec | Design | Tasks | 状态 |');
      lines.push('|------|----------|------|--------|-------|------|');
      for (const p of this.artifacts.proposals) {
        const hasSpec = this.artifacts.specs && this.artifacts.specs.some(s => s.change === p.change);
        const hasDesign = this.artifacts.designs && this.artifacts.designs.some(d => d.change === p.change);
        const hasTasks = this.artifacts.tasks && this.artifacts.tasks.some(t => t.change === p.change);
        const taskStatus = this.getTaskStatus(p.change);
        lines.push(`| ${p.change} | ✓ | ${hasSpec ? '✓' : '—'} | ${hasDesign ? '✓' : '—'} | ${hasTasks ? '✓' : '—'} | ${taskStatus} |`);
      }
    }

    return lines.join('\n');
  }

  buildPmCapability() {
    const lines = [];

    lines.push('### 8.1 已覆盖的 PM 能力（基于已有产物）\n');
    lines.push('| PM 能力 | 状态 | 来源 |');
    lines.push('|---------|------|------|');
    lines.push(`| 需求获取 | ${this.artifacts.proposals ? '✓ 已有' : '— 无'} | proposal.md |`);
    lines.push(`| 行为规格 | ${this.artifacts.specs ? '✓ 已有' : '— 无'} | specs/*.feature |`);
    lines.push(`| 技术设计 | ${this.artifacts.designs ? '✓ 已有' : '— 无'} | design.md |`);
    lines.push(`| 任务拆解 | ${this.artifacts.tasks ? '✓ 已有' : '— 无'} | tasks.md |`);
    lines.push(`| 产品愿景 | ${this.artifacts.vision ? '✓ 已有' : '— 无'} | vision.md |`);
    lines.push(`| 质量证据 | ${this.artifacts.evidence ? '✓ 已有' : '— 无'} | evidence/*.json |`);

    lines.push('\n### 8.2 PM 能力缺口\n');
    lines.push('> TODO: 请根据产品实际情况补充以下能力缺口分析：');
    lines.push('> - 路线图/时间线');
    lines.push('> - 优先级/Backlog');
    lines.push('> - 市场分析');
    lines.push('> - 用户画像库');
    lines.push('> - Sprint 规划');
    lines.push('> - OKR 追踪');

    return lines.join('\n');
  }

  buildQuality() {
    const lines = [];

    const evidence = this.artifacts.evidence || [];
    const passCount = evidence.filter(e => e.status === 'pass').length;
    const failCount = evidence.filter(e => e.status === 'fail').length;

    lines.push('### 9.1 质量指标\n');
    lines.push('| 指标 | 数值 |');
    lines.push('|------|------|');
    lines.push(`| 证据总数 | ${evidence.length} |`);
    lines.push(`| 通过 | ${passCount} |`);
    lines.push(`| 失败 | ${failCount} |`);
    lines.push(`| 通过率 | ${evidence.length > 0 ? Math.round(passCount / evidence.length * 100) : 0}% |`);

    if (this.artifacts.tasks) {
      let totalTasks = 0;
      let doneTasks = 0;
      for (const t of this.artifacts.tasks) {
        const total = (t.content.match(/- \[.\]/g) || []).length;
        const done = (t.content.match(/- \[x\]/g) || []).length;
        totalTasks += total;
        doneTasks += done;
      }
      lines.push(`| 总任务数 | ${totalTasks} |`);
      lines.push(`| 已完成任务 | ${doneTasks} |`);
      lines.push(`| 任务完成率 | ${totalTasks > 0 ? Math.round(doneTasks / totalTasks * 100) : 0}% |`);
    }

    lines.push('\n### 9.2 Constitution 合规\n');
    if (evidence.length > 0) {
      const constitutionIssues = [];
      for (const e of evidence) {
        if (e.results && e.results.constitution && e.results.constitution.issues) {
          const issues = e.results.constitution.issues;
          if (issues.blocking) constitutionIssues.push(...issues.blocking);
          if (issues.warning) constitutionIssues.push(...issues.warning);
        }
      }
      if (constitutionIssues.length > 0) {
        lines.push('| 条例 | 类型 | 信息 |');
        lines.push('|------|------|------|');
        const unique = new Map();
        for (const issue of constitutionIssues) {
          const key = `${issue.article}-${issue.message}`;
          if (!unique.has(key)) unique.set(key, issue);
        }
        for (const [, issue] of unique) {
          lines.push(`| Article ${issue.article}: ${issue.name} | ${issue.severity || 'warning'} | ${issue.message ? issue.message.substring(0, 60) : ''} |`);
        }
      } else {
        lines.push('所有 Constitution 检查均已通过。');
      }
    } else {
      lines.push('> 暂无 Constitution 合规证据。运行 `stdd verify` 生成证据。');
    }

    return lines.join('\n');
  }

  buildTechStack() {
    const config = this.artifacts.config;
    const lines = [];

    if (config && config.project) {
      lines.push('| 维度 | 配置 |');
      lines.push('|------|------|');
      for (const [key, val] of Object.entries(config.project)) {
        lines.push(`| ${key} | ${val} |`);
      }
    } else {
      lines.push('> 未检测到技术栈配置。运行 `stdd init` 配置技术栈。');
    }

    if (this.artifacts.packageJson) {
      const pkg = this.artifacts.packageJson;
      lines.push('\n### 运行时信息\n');
      lines.push(`- **包名**: ${pkg.name}`);
      lines.push(`- **版本**: ${pkg.version}`);
      lines.push(`- **引擎**: ${JSON.stringify(pkg.engines || {})}`);
      const deps = Object.keys(pkg.dependencies || {});
      if (deps.length > 0) {
        lines.push(`- **核心依赖**: ${deps.join(', ')}`);
      }
    }

    return lines.join('\n');
  }

  buildCompetitive() {
    return '> TODO: 请根据实际产品补充竞品对比分析。\n>\n> 建议维度：功能对比、定位差异、技术优势、目标用户差异。';
  }

  buildRoadmap() {
    const lines = [];

    lines.push('### 已完成（基于归档记录）\n');
    if (this.artifacts.archived && this.artifacts.archived.length > 0) {
      lines.push('| 已归档变更 |');
      lines.push('|-----------|');
      for (const name of this.artifacts.archived) {
        lines.push(`| ${name} |`);
      }
    } else {
      lines.push('> 暂无已归档变更。');
    }

    lines.push('\n### 进行中（基于活跃变更）\n');
    if (this.artifacts.proposals && this.artifacts.proposals.length > 0) {
      lines.push('| 变更 | 任务状态 |');
      lines.push('|------|---------|');
      for (const p of this.artifacts.proposals) {
        lines.push(`| ${p.change} | ${this.getTaskStatus(p.change)} |`);
      }
    } else {
      lines.push('> 暂无活跃变更。');
    }

    lines.push('\n### 近期计划\n');
    lines.push('> TODO: 请根据实际规划补充近期计划。');

    return lines.join('\n');
  }

  buildMetrics() {
    const lines = [];

    lines.push('### 当前项目指标\n');
    lines.push('| 指标 | 当前值 |');
    lines.push('|------|--------|');
    lines.push(`| 活跃变更数 | ${this.artifacts.proposals ? this.artifacts.proposals.length : 0} |`);
    lines.push(`| BDD 规格数 | ${this.artifacts.specs ? this.artifacts.specs.length : 0} |`);
    lines.push(`| 已归档数 | ${this.artifacts.archived ? this.artifacts.archived.length : 0} |`);
    lines.push(`| 质量证据数 | ${this.artifacts.evidence ? this.artifacts.evidence.length : 0} |`);

    const evidence = this.artifacts.evidence || [];
    if (evidence.length > 0) {
      const passCount = evidence.filter(e => e.status === 'pass').length;
      lines.push(`| 证据通过率 | ${Math.round(passCount / evidence.length * 100)}% |`);
    }

    lines.push('\n### 目标 KPI\n');
    lines.push('> TODO: 请根据实际产品补充成功指标和 KPI。');

    return lines.join('\n');
  }

  buildRisk() {
    return '### 风险评估\n\n> TODO: 请根据实际产品补充风险分析。\n>\n> 建议维度：产品风险、技术风险、市场风险。\n> 每项风险包含：可能性、影响、缓解策略。';
  }

  buildAppendix(projectName) {
    const lines = [];

    lines.push('### A. 产物清单\n');
    lines.push('| 产物 | 状态 |');
    lines.push('|------|------|');
    lines.push(`| stdd/vision.md | ${this.artifacts.vision ? '✓ 已存在' : '— 未创建'} |`);
    lines.push(`| stdd/config.yaml | ${this.artifacts.config ? '✓ 已存在' : '— 未创建'} |`);
    lines.push(`| stdd/changes/*/proposal.md | ${this.artifacts.proposals ? this.artifacts.proposals.length + ' 个' : '— 无'} |`);
    lines.push(`| stdd/changes/*/specs/ | ${this.artifacts.specs ? this.artifacts.specs.length + ' 个' : '— 无'} |`);
    lines.push(`| stdd/changes/*/design.md | ${this.artifacts.designs ? this.artifacts.designs.length + ' 个' : '— 无'} |`);
    lines.push(`| stdd/changes/*/tasks.md | ${this.artifacts.tasks ? this.artifacts.tasks.length + ' 个' : '— 无'} |`);
    lines.push(`| stdd/evidence/ | ${this.artifacts.evidence ? this.artifacts.evidence.length + ' 条' : '— 无'} |`);
    lines.push(`| stdd/changes/archive/ | ${this.artifacts.archived ? this.artifacts.archived.length + ' 个' : '— 无'} |`);
    lines.push(`| stdd/progress.jsonl | ${this.artifacts.progress ? this.artifacts.progress.length + ' 条' : '— 无'} |`);

    lines.push('\n### B. 生成信息\n');
    lines.push(`- 命令: \`stdd product-proposal\``);
    lines.push(`- 时间: ${new Date().toISOString()}`);
    lines.push(`- 项目: ${projectName}`);

    return lines.join('\n');
  }
}

module.exports = { ProductProposalCommand };
