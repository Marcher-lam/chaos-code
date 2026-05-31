const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const chalk = require('chalk');
const { walkFiles } = require('../../utils/file-walker');
const { createLogger } = require('../../utils/logger');
const logger = createLogger('product-proposal');

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

    console.log(chalk.bold('\n Product Proposal Report\n'));
    console.log(`  ${chalk.green('ok')} Generated: ${outputPath}`);
    console.log(`  ${chalk.green('ok')} Sections: ${sectionCount}`);
    console.log(`  ${chalk.green('ok')} Artifacts scanned: ${artifactCount}`);
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
    } catch (err) {
      logger.warn(`failed to read ${filePath}: ${err.message}`);
      return null;
    }
  }

  readYaml(filePath) {
    try {
      return yaml.load(fs.readFileSync(filePath, 'utf-8'));
    } catch (err) {
      logger.warn(`failed to parse YAML ${filePath}: ${err.message}`);
      return null;
    }
  }

  readPackageJson() {
    try {
      return JSON.parse(fs.readFileSync(path.join(this.cwd, 'package.json'), 'utf-8'));
    } catch (err) {
      logger.warn(`failed to read package.json: ${err.message}`);
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
    } catch (err) {
      logger.warn(`failed to scan changes for ${fileName}: ${err.message}`);
    }
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
        const specFiles = walkFiles(specsDir, { extensions: ['.feature'] });
        for (const sf of specFiles) {
          results.push({ change: entry.name, file: path.relative(specsDir, sf), content: this.readFile(sf) });
        }
      }
    } catch (err) {
      logger.warn(`failed to scan specs: ${err.message}`);
    }
    return results.length > 0 ? results : null;
  }

  scanEvidence() {
    const results = [];
    const rootEvidenceDir = path.join(this.stddDir, 'evidence');
    if (fs.existsSync(rootEvidenceDir)) {
      const files = walkFiles(rootEvidenceDir, { extensions: ['.json'] });
      for (const f of files) {
        try {
          results.push(JSON.parse(fs.readFileSync(f, 'utf-8')));
        } catch (err) {
          logger.warn(`failed to parse evidence file ${f}: ${err.message}`);
        }
      }
    }
    const changesDir = path.join(this.stddDir, 'changes');
    try {
      const entries = fs.readdirSync(changesDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name === 'archive') continue;
        const evDir = path.join(changesDir, entry.name, 'evidence');
        if (!fs.existsSync(evDir)) continue;
        const files = walkFiles(evDir, { extensions: ['.json'] });
        for (const f of files) {
          try {
            results.push(JSON.parse(fs.readFileSync(f, 'utf-8')));
          } catch (err) {
            logger.warn(`failed to parse evidence file ${f}: ${err.message}`);
          }
        }
      }
    } catch (err) {
      logger.warn(`failed to scan change evidence: ${err.message}`);
    }
    return results.length > 0 ? results : null;
  }

  scanArchived() {
    const archiveDir = path.join(this.stddDir, 'changes', 'archive');
    if (!fs.existsSync(archiveDir)) return null;
    try {
      return fs.readdirSync(archiveDir, { withFileTypes: true })
        .filter(e => e.isDirectory())
        .map(e => e.name);
    } catch (err) {
      logger.warn(`failed to scan archive: ${err.message}`);
      return null;
    }
  }

  readProgressLog() {
    const logPath = path.join(this.stddDir, 'progress.jsonl');
    if (!fs.existsSync(logPath)) return null;
    try {
      const lines = fs.readFileSync(logPath, 'utf-8').trim().split('\n').filter(Boolean);
      return lines.map(l => {
        try { return JSON.parse(l); } catch (err) {
          logger.warn(`failed to parse progress line: ${err.message}`);
          return null;
        }
      }).filter(Boolean);
    } catch (err) {
      logger.warn(`failed to read progress log: ${err.message}`);
      return null;
    }
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

  // ---------------------------------------------------------------------------
  // Market Analysis (data-driven from artifacts)
  // ---------------------------------------------------------------------------

  buildMarketAnalysis() {
    const lines = [];

    if (this.artifacts.vision) {
      lines.push('> 以下内容基于项目愿景文档自动提取，请根据实际市场情况补充。\n');
    }

    const { config, packageJson, proposals, specs, vision } = this.artifacts;

    lines.push('### 2.1 行业背景\n');
    if (config && config.project) {
      const projType = config.project.type || '';
      const lang = config.project.language || '';
      const framework = config.project.framework || '';
      lines.push(`本项目属于 **${projType || '通用软件'}** 领域，基于 ${lang} 语言${framework ? ` + ${framework} 框架` : ''} 构建。`);
    } else if (packageJson) {
      const deps = Object.keys(packageJson.dependencies || {});
      const devDeps = Object.keys(packageJson.devDependencies || {});
      lines.push(`基于 ${deps.length} 个运行时依赖和 ${devDeps.length} 个开发依赖构建。`);
      if (deps.length > 0) {
        const keyDeps = deps.slice(0, 5).join(', ');
        lines.push(`核心依赖: ${keyDeps}${deps.length > 5 ? ' 等' : ''}。`);
      }
    } else {
      lines.push('> TODO: 请补充行业背景分析。\n');
    }

    lines.push('\n### 2.2 目标市场\n');
    if (vision) {
      const visionLines = vision.split('\n').filter(l => l.trim() && !l.startsWith('#'));
      const relevantLines = visionLines.slice(0, 5).join(' ').substring(0, 300);
      lines.push(`基于项目愿景:\n> ${relevantLines}${visionLines.join(' ').length > 300 ? '...' : ''}\n`);
    } else {
      lines.push('> 未检测到 vision.md，无法自动提取目标市场。请手动补充。\n');
    }

    if (proposals && proposals.length > 0) {
      lines.push('当前已规划 **' + proposals.length + '** 个功能变更，覆盖 **' +
        (specs ? this.countUniqueSpecChanges() : 0) + '** 个变更的 BDD 规格。');
    }

    lines.push('\n### 2.3 市场趋势\n');
    lines.push('基于当前产物，以下为可识别的技术方向:\n');
    const trends = this.inferTrendsFromArtifacts();
    if (trends.length > 0) {
      for (const t of trends) {
        lines.push(`- ${t}`);
      }
    } else {
      lines.push('> TODO: 请补充市场趋势分析。');
    }

    return lines.join('\n');
  }

  inferTrendsFromArtifacts() {
    const trends = [];
    const { config, packageJson, specs, evidence } = this.artifacts;

    if (specs && specs.length > 0) {
      trends.push('**BDD 驱动开发**: 已有 ' + specs.length + ' 个行为规格文件，说明项目采用行为驱动开发模式。');
    }

    if (evidence && evidence.length > 0) {
      trends.push('**自动化验证**: 已有 ' + evidence.length + ' 条质量证据，项目重视自动化测试与验证。');
    }

    if (config && config.project) {
      if (config.project.framework) {
        trends.push('**' + config.project.framework + ' 生态**: 基于 ' + config.project.framework + ' 构建，享受其生态红利。');
      }
    }

    if (packageJson) {
      const deps = Object.keys(packageJson.dependencies || {});
      if (deps.some(d => d.includes('ai') || d.includes('llm') || d.includes('openai') || d.includes('anthropic'))) {
        trends.push('**AI/LLM 集成**: 检测到 AI 相关依赖，项目涉及大语言模型应用。');
      }
      if (deps.some(d => d.includes('express') || d.includes('koa') || d.includes('fastify'))) {
        trends.push('**Web 服务**: 检测到 Web 框架依赖，项目面向 HTTP API 场景。');
      }
      if (deps.some(d => d.includes('react') || d.includes('vue') || d.includes('svelte'))) {
        trends.push('**前端应用**: 检测到前端框架依赖，项目包含用户界面。');
      }
    }

    return trends;
  }

  countUniqueSpecChanges() {
    if (!this.artifacts.specs) return 0;
    return new Set(this.artifacts.specs.map(s => s.change)).size;
  }

  // ---------------------------------------------------------------------------
  // User Personas (data-driven with inferUserPersonas + extractScenarioSummaries)
  // ---------------------------------------------------------------------------

  buildUserPersonas() {
    const lines = [];

    lines.push('### 3.1 主要用户画像\n');
    const personas = this.inferUserPersonas();
    if (personas.length > 0) {
      for (const persona of personas) {
        lines.push(`**${persona.name}** — ${persona.description}\n`);
        lines.push('| 维度 | 详情 |');
        lines.push('|------|------|');
        lines.push(`| 核心需求 | ${persona.needs} |`);
        lines.push(`| 痛点 | ${persona.painPoints} |`);
        lines.push(`| 使用场景 | ${persona.scenarios} |`);
        lines.push('');
      }
    } else {
      lines.push('> 未检测到足够的产物数据来自动生成用户画像，请手动补充。\n');
    }

    const scenarioSummaries = this.extractScenarioSummaries();
    if (scenarioSummaries.length > 0) {
      lines.push('### 3.2 BDD 场景摘要（从 specs/*.feature 提取）\n');
      lines.push('| 变更 | Feature | Scenario |');
      lines.push('|------|---------|----------|');
      for (const s of scenarioSummaries) {
        lines.push(`| ${s.change} | ${s.feature} | ${s.scenario} |`);
      }
      lines.push('');
    }

    if (this.artifacts.proposals) {
      lines.push('### 3.3 已规划的变更场景\n');
      lines.push('| 变更 | 描述 |');
      lines.push('|------|------|');
      for (const p of this.artifacts.proposals) {
        const firstLine = p.content.split('\n').find(l => l.trim() && !l.startsWith('#')) || p.change;
        lines.push(`| ${p.change} | ${firstLine.substring(0, 80)} |`);
      }
    }

    return lines.join('\n');
  }

  inferUserPersonas() {
    const personas = [];
    const { config, packageJson, specs, proposals, _vision } = this.artifacts;

    // Infer from project type
    const projType = (config && config.project && config.project.type) || '';
    const _projLang = (config && config.project && config.project.language) || '';
    const projFramework = (config && config.project && config.project.framework) || '';

    if (projType.includes('cli') || projType.includes('tool') || projType.includes('CLI')) {
      personas.push({
        name: 'CLI 用户 / 开发者',
        description: '通过命令行使用工具的开发者',
        needs: '快速上手、清晰的命令文档、可预测的行为',
        painPoints: '命令参数复杂、错误信息不明确、缺少示例',
        scenarios: '日常开发流程中通过命令行调用工具完成特定任务',
      });
    }

    if (projType.includes('web') || projType.includes('api') || projType.includes('service') || projType.includes('backend')) {
      personas.push({
        name: 'API 消费者 / 集成开发者',
        description: '调用本项目 API 或服务的下游开发者',
        needs: '稳定的 API 接口、完善的文档、合理的错误码',
        painPoints: '接口不稳定、文档缺失、错误处理不明确',
        scenarios: '在自有项目中集成本项目的 API 能力',
      });
    }

    if (projFramework.includes('react') || projFramework.includes('vue') || projFramework.includes('svelte') ||
        (packageJson && Object.keys(packageJson.dependencies || {}).some(d => d.includes('react') || d.includes('vue')))) {
      personas.push({
        name: '终端用户',
        description: '通过浏览器使用产品的最终用户',
        needs: '流畅的交互体验、直觉式的操作流程、快速的页面加载',
        painPoints: '加载慢、操作路径深、反馈不及时',
        scenarios: '通过浏览器访问产品完成日常任务',
      });
    }

    // STDD-specific personas based on artifacts
    if (specs && specs.length > 0) {
      personas.push({
        name: '产品经理 / 业务分析师',
        description: '负责需求澄清和行为规格编写的角色',
        needs: 'BDD 规格与需求一一对应、需求变更可追踪',
        painPoints: '需求散落各处、规格与实现不一致、变更影响不可见',
        scenarios: '编写 BDD Feature 文件并跟踪其验证状态',
      });
    }

    if (proposals && proposals.length > 0) {
      personas.push({
        name: '技术负责人',
        description: '负责变更提案评审和技术方案决策的角色',
        needs: '变更全貌可见、技术设计文档完备、任务拆解合理',
        painPoints: '变更状态不透明、设计文档滞后、任务粒度不一致',
        scenarios: '评审 proposal.md 和 design.md，跟踪 verify 证据',
      });
    }

    // Fallback: if no personas inferred but we have a package.json
    if (personas.length === 0 && packageJson) {
      personas.push({
        name: '项目开发者',
        description: '参与本项目开发与维护的团队成员',
        needs: '清晰的代码结构、完善的测试覆盖、可复现的构建流程',
        painPoints: '缺少文档、测试覆盖不足、构建环境不一致',
        scenarios: '克隆仓库后进行功能开发和问题修复',
      });
    }

    return personas;
  }

  extractScenarioSummaries() {
    const summaries = [];
    if (!this.artifacts.specs) return summaries;

    for (const spec of this.artifacts.specs) {
      if (!spec.content) continue;
      const contentLines = spec.content.split('\n');
      let currentFeature = spec.file || spec.change;
      for (const line of contentLines) {
        const trimmed = line.trim();
        const featureMatch = trimmed.match(/^Feature:\s*(.+)/i);
        if (featureMatch) {
          currentFeature = featureMatch[1];
        }
        const scenarioMatch = trimmed.match(/^Scenario:\s*(.+)/i);
        if (scenarioMatch) {
          summaries.push({
            change: spec.change,
            feature: currentFeature.substring(0, 50),
            scenario: scenarioMatch[1].substring(0, 60),
          });
        }
      }
      // Limit to 30 entries to keep output reasonable
      if (summaries.length >= 30) break;
    }

    return summaries.slice(0, 30);
  }

  // ---------------------------------------------------------------------------
  // Positioning (data-driven value propositions and USP)
  // ---------------------------------------------------------------------------

  buildPositioning() {
    const lines = [];

    lines.push('### 4.1 产品定位\n');
    if (this.artifacts.packageJson && this.artifacts.packageJson.description) {
      lines.push(`\`${this.artifacts.packageJson.description}\`\n`);
    } else if (this.artifacts.vision) {
      const firstMeaningful = this.artifacts.vision.split('\n').find(l => l.trim() && !l.startsWith('#') && l.trim().length > 10);
      if (firstMeaningful) {
        lines.push(`> ${firstMeaningful.trim()}\n`);
      }
    } else {
      lines.push('> TODO: 请补充产品定位。\n');
    }

    lines.push('### 4.2 价值主张\n');
    const valueProps = this.inferValuePropositions();
    if (valueProps.length > 0) {
      lines.push('| 受益方 | 价值 | 来源 |');
      lines.push('|--------|------|------|');
      for (const vp of valueProps) {
        lines.push(`| ${vp.audience} | ${vp.value} | ${vp.source} |`);
      }
      lines.push('');
    } else {
      lines.push('> TODO: 请补充价值主张。\n');
    }

    lines.push('### 4.3 独特卖点 (USP)\n');
    const usps = this.inferUSPs();
    if (usps.length > 0) {
      for (const usp of usps) {
        lines.push(`- **${usp.title}**: ${usp.description}`);
      }
    } else {
      lines.push('> TODO: 请补充独特卖点。');
    }

    return lines.join('\n');
  }

  inferValuePropositions() {
    const props = [];
    const { _config, packageJson, proposals, specs, evidence, vision, designs, tasks } = this.artifacts;

    if (specs && specs.length > 0) {
      props.push({
        audience: '产品经理',
        value: '通过 ' + specs.length + ' 个 BDD 规格实现需求与实现的可追溯映射',
        source: 'specs/*.feature',
      });
    }

    if (evidence && evidence.length > 0) {
      const passRate = Math.round(evidence.filter(e => e.status === 'pass').length / evidence.length * 100);
      props.push({
        audience: '质量团队',
        value: '自动化验证覆盖率 ' + passRate + '% (' + evidence.length + ' 条证据)',
        source: 'evidence/*.json',
      });
    }

    if (proposals && proposals.length > 0) {
      props.push({
        audience: '团队协作',
        value: proposals.length + ' 个结构化变更提案，支持从需求到验证的完整工作流',
        source: 'proposal.md',
      });
    }

    if (designs && designs.length > 0) {
      props.push({
        audience: '技术团队',
        value: designs.length + ' 份技术设计文档，降低架构决策风险',
        source: 'design.md',
      });
    }

    if (tasks && tasks.length > 0) {
      props.push({
        audience: '项目经理',
        value: tasks.length + ' 份任务拆解文档，支持进度可视化管理',
        source: 'tasks.md',
      });
    }

    if (vision) {
      props.push({
        audience: '所有利益相关方',
        value: '明确的愿景文档 (vision.md) 确保团队目标一致',
        source: 'vision.md',
      });
    }

    if (packageJson && packageJson.dependencies) {
      const depCount = Object.keys(packageJson.dependencies).length;
      if (depCount > 0) {
        props.push({
          audience: '开发者',
          value: '基于 ' + depCount + ' 个成熟依赖构建，降低造轮子成本',
          source: 'package.json',
        });
      }
    }

    return props;
  }

  inferUSPs() {
    const usps = [];
    const { specs, evidence, proposals, tasks, designs, vision, config, packageJson } = this.artifacts;

    // STDD workflow completeness
    const hasFullPipeline = proposals && specs && designs && tasks;
    if (hasFullPipeline) {
      usps.push({
        title: '全链路 STDD 工作流',
        description: '从 proposal 到 verify 的完整规格驱动开发流程，当前项目已具备全部核心产物。',
      });
    }

    // BDD spec coverage
    if (specs && specs.length > 0) {
      const changesWithSpecs = new Set(specs.map(s => s.change)).size;
      usps.push({
        title: '行为规格驱动',
        description: changesWithSpecs + ' 个变更拥有 BDD 规格覆盖，确保需求与实现的精确映射。',
      });
    }

    // Automated evidence
    if (evidence && evidence.length > 0) {
      usps.push({
        title: '自动化质量验证',
        description: evidence.length + ' 条自动化验证证据，支持持续质量监控。',
      });
    }

    // Tech stack USP
    if (config && config.project) {
      const framework = config.project.framework || '';
      if (framework) {
        usps.push({
          title: framework + ' 技术栈',
          description: '基于 ' + framework + ' 构建，享受成熟生态和社区支持。',
        });
      }
    }

    // Package-specific USPs
    if (packageJson) {
      const deps = Object.keys(packageJson.dependencies || {});
      if (deps.some(d => d.includes('ai') || d.includes('llm') || d.includes('openai') || d.includes('anthropic'))) {
        usps.push({
          title: 'AI/LLM 集成',
          description: '集成大语言模型能力，提供智能化功能。',
        });
      }
    }

    // Vision-driven
    if (vision) {
      usps.push({
        title: '愿景驱动开发',
        description: '明确的 vision.md 确保每个变更都与产品愿景对齐。',
      });
    }

    return usps;
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
    lines.push('│   ├── vision.md' + (this.artifacts.vision ? '  ok' : '  (未创建)'));
    lines.push('│   ├── changes/');

    if (this.artifacts.proposals) {
      for (const p of this.artifacts.proposals) {
        lines.push(`│   │   ├── ${p.change}/`);
        lines.push(`│   │   │   ├── proposal.md  ok`);
        const hasSpecs = this.artifacts.specs && this.artifacts.specs.some(s => s.change === p.change);
        const hasDesign = this.artifacts.designs && this.artifacts.designs.some(d => d.change === p.change);
        const hasTasks = this.artifacts.tasks && this.artifacts.tasks.some(t => t.change === p.change);
        lines.push(`│   │   │   ├── specs/  ${hasSpecs ? 'ok' : '(无)'}`);
        lines.push(`│   │   │   ├── design.md  ${hasDesign ? 'ok' : '(无)'}`);
        lines.push(`│   │   │   └── tasks.md  ${hasTasks ? 'ok' : '(无)'}`);
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
    lines.push('init -> new -> propose -> clarify -> confirm -> spec -> plan -> apply -> verify -> archive');
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
        lines.push(`| ${p.change} | ok | ${hasSpec ? 'ok' : '-'} | ${hasDesign ? 'ok' : '-'} | ${hasTasks ? 'ok' : '-'} | ${taskStatus} |`);
      }
    }

    return lines.join('\n');
  }

  // ---------------------------------------------------------------------------
  // PM Capability (data-driven gap analysis)
  // ---------------------------------------------------------------------------

  buildPmCapability() {
    const lines = [];

    lines.push('### 8.1 已覆盖的 PM 能力（基于已有产物）\n');
    lines.push('| PM 能力 | 状态 | 来源 |');
    lines.push('|---------|------|------|');
    lines.push(`| 需求获取 | ${this.artifacts.proposals ? 'ok 已有' : '- 无'} | proposal.md |`);
    lines.push(`| 行为规格 | ${this.artifacts.specs ? 'ok 已有' : '- 无'} | specs/*.feature |`);
    lines.push(`| 技术设计 | ${this.artifacts.designs ? 'ok 已有' : '- 无'} | design.md |`);
    lines.push(`| 任务拆解 | ${this.artifacts.tasks ? 'ok 已有' : '- 无'} | tasks.md |`);
    lines.push(`| 产品愿景 | ${this.artifacts.vision ? 'ok 已有' : '- 无'} | vision.md |`);
    lines.push(`| 质量证据 | ${this.artifacts.evidence ? 'ok 已有' : '- 无'} | evidence/*.json |`);

    lines.push('\n### 8.2 PM 能力缺口（自动检测）\n');
    const gaps = this.detectPmGaps();
    if (gaps.length > 0) {
      lines.push('| 缺口 | 当前状态 | 建议行动 | 优先级 |');
      lines.push('|------|---------|---------|--------|');
      for (const gap of gaps) {
        lines.push(`| ${gap.name} | ${gap.current} | ${gap.action} | ${gap.priority} |`);
      }
    } else {
      lines.push('> 所有核心 PM 能力均已覆盖，无显著缺口。');
    }

    return lines.join('\n');
  }

  detectPmGaps() {
    const gaps = [];
    const { vision, proposals, specs, designs, tasks, evidence, config, progress, packageJson } = this.artifacts;

    if (!vision) {
      gaps.push({
        name: '产品愿景缺失',
        current: '无 vision.md',
        action: '运行 `stdd:vision` 创建产品愿景文档',
        priority: 'P0',
      });
    }

    if (!config) {
      gaps.push({
        name: '项目配置缺失',
        current: '无 config.yaml',
        action: '运行 `stdd init` 初始化项目配置',
        priority: 'P0',
      });
    }

    if (!proposals) {
      gaps.push({
        name: '无活跃需求',
        current: '无 proposal.md',
        action: '运行 `stdd propose` 创建需求提案',
        priority: 'P1',
      });
    } else {
      // Check proposals without specs
      const changesWithoutSpecs = proposals.filter(p =>
        !specs || !specs.some(s => s.change === p.change)
      );
      if (changesWithoutSpecs.length > 0) {
        gaps.push({
          name: '规格覆盖不完整',
          current: changesWithoutSpecs.length + '/' + proposals.length + ' 个变更缺少 BDD 规格',
          action: '为以下变更运行 `stdd spec`: ' + changesWithoutSpecs.map(c => c.change).join(', '),
          priority: 'P1',
        });
      }

      // Check proposals without designs
      const changesWithoutDesign = proposals.filter(p =>
        !designs || !designs.some(d => d.change === p.change)
      );
      if (changesWithoutDesign.length > 0) {
        gaps.push({
          name: '技术设计缺失',
          current: changesWithoutDesign.length + ' 个变更缺少 design.md',
          action: '为以下变更运行 `stdd plan`: ' + changesWithoutDesign.map(c => c.change).join(', '),
          priority: 'P2',
        });
      }

      // Check proposals without tasks
      const changesWithoutTasks = proposals.filter(p =>
        !tasks || !tasks.some(t => t.change === p.change)
      );
      if (changesWithoutTasks.length > 0) {
        gaps.push({
          name: '任务拆解缺失',
          current: changesWithoutTasks.length + ' 个变更缺少 tasks.md',
          action: '为以下变更运行 `stdd plan`: ' + changesWithoutTasks.map(c => c.change).join(', '),
          priority: 'P2',
        });
      }
    }

    if (!evidence) {
      gaps.push({
        name: '质量证据缺失',
        current: '无 evidence 记录',
        action: '运行 `stdd verify` 生成验证证据',
        priority: 'P1',
      });
    }

    if (!progress) {
      gaps.push({
        name: '进度追踪缺失',
        current: '无 progress.jsonl',
        action: '正常运行 STDD 工作流将自动生成进度记录',
        priority: 'P2',
      });
    }

    // Check for missing package.json metadata
    if (packageJson) {
      if (!packageJson.description) {
        gaps.push({
          name: '产品描述缺失',
          current: 'package.json 缺少 description',
          action: '在 package.json 中补充 description 字段',
          priority: 'P2',
        });
      }
    }

    return gaps;
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

  // ---------------------------------------------------------------------------
  // Competitive (data-driven comparison framework)
  // ---------------------------------------------------------------------------

  buildCompetitive() {
    const lines = [];

    lines.push('### 11.1 竞品对比框架\n');

    const dimensions = this.inferCompetitiveDimensions();
    if (dimensions.length > 0) {
      lines.push('| 对比维度 | 本项目 | 行业基准 | 说明 |');
      lines.push('|---------|--------|---------|------|');
      for (const d of dimensions) {
        lines.push(`| ${d.dimension} | ${d.current} | ${d.benchmark} | ${d.note} |`);
      }
    } else {
      lines.push('> TODO: 请根据实际产品补充竞品对比分析。\n');
    }

    lines.push('\n### 11.2 差异化优势（基于产物数据）\n');
    const advantages = this.inferCompetitiveAdvantages();
    if (advantages.length > 0) {
      for (const a of advantages) {
        lines.push(`- **${a.title}**: ${a.description}`);
      }
    } else {
      lines.push('> 请手动补充竞品对比维度和差异化分析。');
    }

    return lines.join('\n');
  }

  inferCompetitiveDimensions() {
    const dims = [];
    const { specs, evidence, proposals, designs, tasks, vision, config, _packageJson } = this.artifacts;

    // BDD spec coverage dimension
    if (proposals && specs) {
      const totalChanges = proposals.length;
      const changesWithSpecs = new Set(specs.map(s => s.change)).size;
      const coverageRate = totalChanges > 0 ? Math.round(changesWithSpecs / totalChanges * 100) : 0;
      dims.push({
        dimension: 'BDD 规格覆盖率',
        current: coverageRate + '%',
        benchmark: '>80%',
        note: changesWithSpecs + '/' + totalChanges + ' 个变更有规格',
      });
    }

    // Evidence pass rate
    if (evidence && evidence.length > 0) {
      const passRate = Math.round(evidence.filter(e => e.status === 'pass').length / evidence.length * 100);
      dims.push({
        dimension: '验证通过率',
        current: passRate + '%',
        benchmark: '>90%',
        note: evidence.length + ' 条证据',
      });
    }

    // Design coverage
    if (proposals && designs) {
      const totalChanges = proposals.length;
      const changesWithDesign = new Set(designs.map(d => d.change)).size;
      const coverageRate = totalChanges > 0 ? Math.round(changesWithDesign / totalChanges * 100) : 0;
      dims.push({
        dimension: '技术设计覆盖率',
        current: coverageRate + '%',
        benchmark: '>60%',
        note: changesWithDesign + '/' + totalChanges + ' 个变更有设计',
      });
    }

    // Task breakdown coverage
    if (proposals && tasks) {
      const totalChanges = proposals.length;
      const changesWithTasks = new Set(tasks.map(t => t.change)).size;
      const coverageRate = totalChanges > 0 ? Math.round(changesWithTasks / totalChanges * 100) : 0;
      dims.push({
        dimension: '任务拆解覆盖率',
        current: coverageRate + '%',
        benchmark: '>70%',
        note: changesWithTasks + '/' + totalChanges + ' 个变更已拆解',
      });
    }

    // Vision clarity
    dims.push({
      dimension: '产品愿景明确度',
      current: vision ? '有文档' : '缺失',
      benchmark: '有文档',
      note: vision ? 'vision.md 已存在' : '建议创建 vision.md',
    });

    // Tech stack maturity
    if (config && config.project) {
      dims.push({
        dimension: '技术栈明确度',
        current: '已配置',
        benchmark: '已配置',
        note: (config.project.language || '') + ' / ' + (config.project.framework || ''),
      });
    }

    return dims;
  }

  inferCompetitiveAdvantages() {
    const advantages = [];
    const { specs, evidence, proposals, tasks, designs, _vision, _config } = this.artifacts;

    const hasFullPipeline = proposals && specs && designs && tasks;
    if (hasFullPipeline) {
      advantages.push({
        title: '完整 STDD 工作流',
        description: '从需求提案到验证归档的全链路产物管理，多数竞品缺少这种结构化的开发流程。',
      });
    }

    if (specs && specs.length > 0) {
      advantages.push({
        title: 'BDD 行为规格',
        description: specs.length + ' 个行为规格文件确保需求与实现的一致性，减少沟通成本。',
      });
    }

    if (evidence && evidence.length > 0) {
      const passRate = Math.round(evidence.filter(e => e.status === 'pass').length / evidence.length * 100);
      if (passRate >= 80) {
        advantages.push({
          title: '高验证通过率',
          description: '当前验证通过率 ' + passRate + '%，高于行业基准。',
        });
      }
    }

    return advantages;
  }

  // ---------------------------------------------------------------------------
  // Roadmap (data-driven with inferNextSteps)
  // ---------------------------------------------------------------------------

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

    lines.push('\n### 建议的下一步行动\n');
    const nextSteps = this.inferNextSteps();
    if (nextSteps.length > 0) {
      lines.push('| 优先级 | 行动 | 原因 | 命令 |');
      lines.push('|--------|------|------|------|');
      for (const step of nextSteps) {
        lines.push(`| ${step.priority} | ${step.action} | ${step.reason} | \`${step.command}\` |`);
      }
    } else {
      lines.push('> 所有核心产物已就绪，建议专注于当前变更的完成与验证。');
    }

    return lines.join('\n');
  }

  inferNextSteps() {
    const steps = [];
    const { vision, config, proposals, specs, designs, tasks, evidence, _archived } = this.artifacts;

    if (!vision) {
      steps.push({
        priority: 'P0',
        action: '创建产品愿景文档',
        reason: '缺少 vision.md，团队缺少统一的产品方向指引',
        command: 'stdd:vision',
      });
    }

    if (!config) {
      steps.push({
        priority: 'P0',
        action: '初始化项目配置',
        reason: '缺少 config.yaml，技术栈信息不明确',
        command: 'stdd init',
      });
    }

    if (proposals) {
      const changesWithoutSpecs = proposals.filter(p =>
        !specs || !specs.some(s => s.change === p.change)
      );
      for (const c of changesWithoutSpecs) {
        steps.push({
          priority: 'P1',
          action: '为 ' + c.change + ' 生成 BDD 规格',
          reason: '变更缺少行为规格，无法进行验证',
          command: 'stdd spec --change ' + c.change,
        });
      }

      const changesWithoutDesign = proposals.filter(p =>
        !designs || !designs.some(d => d.change === p.change)
      );
      for (const c of changesWithoutDesign) {
        steps.push({
          priority: 'P2',
          action: '为 ' + c.change + ' 编写技术设计',
          reason: '变更缺少技术设计，实施风险较高',
          command: 'stdd plan --change ' + c.change,
        });
      }

      const changesWithoutTasks = proposals.filter(p =>
        !tasks || !tasks.some(t => t.change === p.change)
      );
      for (const c of changesWithoutTasks) {
        steps.push({
          priority: 'P2',
          action: '为 ' + c.change + ' 拆解任务',
          reason: '变更缺少任务拆解，无法跟踪进度',
          command: 'stdd plan --change ' + c.change,
        });
      }

      // Check for changes with all artifacts but no evidence
      const changesReadyForVerify = proposals.filter(p => {
        const hasSpec = specs && specs.some(s => s.change === p.change);
        const hasDesign = designs && designs.some(d => d.change === p.change);
        const hasTasks = tasks && tasks.some(t => t.change === p.change);
        const hasEvidence = evidence && evidence.some(e => {
          // Match evidence to change; evidence may have a change field or similar
          return e.change === p.change || (e.scenario && e.scenario.includes && e.scenario.includes(p.change));
        });
        return hasSpec && hasDesign && hasTasks && !hasEvidence;
      });
      for (const c of changesReadyForVerify) {
        steps.push({
          priority: 'P1',
          action: '验证 ' + c.change,
          reason: '所有产物已就绪，缺少验证证据',
          command: 'stdd verify --change ' + c.change,
        });
      }
    }

    // Suggest creating new proposals if none exist
    if (!proposals || proposals.length === 0) {
      steps.push({
        priority: 'P1',
        action: '创建第一个需求提案',
        reason: '无活跃变更，项目处于空白状态',
        command: 'stdd new',
      });
    }

    // Suggest archiving completed changes
    if (proposals) {
      const completedChanges = proposals.filter(p => {
        const status = this.getTaskStatus(p.change);
        return status.startsWith('已完成');
      });
      for (const c of completedChanges) {
        steps.push({
          priority: 'P2',
          action: '归档已完成的变更 ' + c.change,
          reason: '变更已完成，可归档以保持工作区整洁',
          command: 'stdd archive --change ' + c.change,
        });
      }
    }

    return steps;
  }

  // ---------------------------------------------------------------------------
  // Metrics (data-driven KPI table)
  // ---------------------------------------------------------------------------

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

    lines.push('\n### 目标 KPI（基于产物数据自动生成）\n');

    const kpiRows = this.buildKpiTable();
    lines.push('| KPI 指标 | 当前值 | 目标值 | 计算方式 | 状态 |');
    lines.push('|---------|--------|--------|---------|------|');
    for (const row of kpiRows) {
      lines.push(`| ${row.name} | ${row.current} | ${row.target} | ${row.calculation} | ${row.status} |`);
    }

    return lines.join('\n');
  }

  buildKpiTable() {
    const rows = [];
    const { proposals, specs, evidence, tasks, vision, _config } = this.artifacts;

    // 1. Spec coverage rate
    const totalChanges = proposals ? proposals.length : 0;
    const changesWithSpecs = specs ? new Set(specs.map(s => s.change)).size : 0;
    const specRate = totalChanges > 0 ? Math.round(changesWithSpecs / totalChanges * 100) : (totalChanges === 0 ? 100 : 0);
    rows.push({
      name: '规格覆盖率',
      current: specRate + '%',
      target: '100%',
      calculation: '有规格的变更数 / 活跃变更数 x 100%',
      status: specRate >= 100 ? '达标' : specRate >= 80 ? '接近' : '未达标',
    });

    // 2. Evidence pass rate
    const totalEvidence = evidence ? evidence.length : 0;
    const passedEvidence = evidence ? evidence.filter(e => e.status === 'pass').length : 0;
    const passRate = totalEvidence > 0 ? Math.round(passedEvidence / totalEvidence * 100) : 0;
    rows.push({
      name: '证据通过率',
      current: totalEvidence > 0 ? passRate + '%' : 'N/A',
      target: '>90%',
      calculation: '通过证据数 / 总证据数 x 100%',
      status: totalEvidence === 0 ? '无数据' : passRate >= 90 ? '达标' : passRate >= 70 ? '接近' : '未达标',
    });

    // 3. Task completion rate
    let totalTasks = 0;
    let doneTasks = 0;
    if (tasks) {
      for (const t of tasks) {
        const total = (t.content.match(/- \[.\]/g) || []).length;
        const done = (t.content.match(/- \[x\]/g) || []).length;
        totalTasks += total;
        doneTasks += done;
      }
    }
    const taskRate = totalTasks > 0 ? Math.round(doneTasks / totalTasks * 100) : 0;
    rows.push({
      name: '任务完成率',
      current: totalTasks > 0 ? taskRate + '%' : 'N/A',
      target: '100%',
      calculation: '已完成任务数 / 总任务数 x 100%',
      status: totalTasks === 0 ? '无数据' : taskRate >= 100 ? '达标' : taskRate >= 60 ? '进行中' : '需关注',
    });

    // 4. Vision alignment
    rows.push({
      name: '愿景对齐度',
      current: vision ? '有文档' : '缺失',
      target: '有文档',
      calculation: 'vision.md 是否存在',
      status: vision ? '达标' : '未达标',
    });

    // 5. Constitution compliance
    let constitutionIssues = 0;
    if (evidence) {
      for (const e of evidence) {
        if (e.results && e.results.constitution && e.results.constitution.issues) {
          const issues = e.results.constitution.issues;
          if (issues.blocking) constitutionIssues += issues.blocking.length;
          if (issues.warning) constitutionIssues += issues.warning.length;
        }
      }
    }
    rows.push({
      name: 'Constitution 合规',
      current: totalEvidence > 0 ? constitutionIssues + ' 个问题' : 'N/A',
      target: '0 个问题',
      calculation: 'Constitution 检查中 blocking + warning 问题数',
      status: totalEvidence === 0 ? '无数据' : constitutionIssues === 0 ? '达标' : '需整改',
    });

    // 6. STDD pipeline completeness
    const pipelineSteps = [
      !!proposals,
      !!specs,
      !!tasks,
      !!evidence,
    ];
    const filledSteps = pipelineSteps.filter(Boolean).length;
    const pipelineRate = Math.round(filledSteps / pipelineSteps.length * 100);
    rows.push({
      name: 'STDD 流程完整度',
      current: pipelineRate + '% (' + filledSteps + '/' + pipelineSteps.length + ')',
      target: '100%',
      calculation: '已有产物类别数 / 核心产物类别数 x 100%',
      status: pipelineRate >= 100 ? '达标' : pipelineRate >= 75 ? '接近' : '需提升',
    });

    return rows;
  }

  // ---------------------------------------------------------------------------
  // Risk (data-driven with inferRisks)
  // ---------------------------------------------------------------------------

  buildRisk() {
    const lines = [];

    lines.push('### 风险评估\n');

    const risks = this.inferRisks();
    if (risks.length > 0) {
      lines.push('| 类别 | 风险描述 | 可能性 | 影响 | 缓解策略 |');
      lines.push('|------|---------|--------|------|---------|');
      for (const r of risks) {
        lines.push(`| ${r.category} | ${r.description} | ${r.likelihood} | ${r.impact} | ${r.mitigation} |`);
      }
    } else {
      lines.push('> 所有核心产物已就绪，未检测到显著风险。');
    }

    return lines.join('\n');
  }

  inferRisks() {
    const risks = [];
    const { vision, config, proposals, specs, designs, tasks, evidence, packageJson } = this.artifacts;

    // Missing vision
    if (!vision) {
      risks.push({
        category: '产品风险',
        description: '缺少产品愿景文档，团队可能对产品方向产生分歧',
        likelihood: '高',
        impact: '高',
        mitigation: '尽快运行 `stdd:vision` 创建愿景文档，确保团队目标一致',
      });
    }

    // Missing config
    if (!config) {
      risks.push({
        category: '技术风险',
        description: '缺少项目配置 (config.yaml)，技术栈信息不明确',
        likelihood: '高',
        impact: '中',
        mitigation: '运行 `stdd init` 初始化项目配置',
      });
    }

    // Missing package.json metadata
    if (packageJson && !packageJson.description) {
      risks.push({
        category: '产品风险',
        description: 'package.json 缺少 description 字段，影响产品定位表达',
        likelihood: '中',
        impact: '低',
        mitigation: '在 package.json 中补充 description 字段',
      });
    }

    // Proposals without specs
    if (proposals && specs) {
      const changesWithoutSpecs = proposals.filter(p =>
        !specs.some(s => s.change === p.change)
      );
      if (changesWithoutSpecs.length > 0) {
        risks.push({
          category: '质量风险',
          description: changesWithoutSpecs.length + ' 个变更缺少 BDD 规格，无法进行行为验证',
          likelihood: '高',
          impact: '高',
          mitigation: '为每个变更生成 BDD 规格: ' + changesWithoutSpecs.map(c => '`stdd spec --change ' + c.change + '`').join(', '),
        });
      }
    }

    // Proposals without designs
    if (proposals && !designs && proposals.length > 0) {
      risks.push({
        category: '技术风险',
        description: '所有 ' + proposals.length + ' 个变更均缺少技术设计文档',
        likelihood: '中',
        impact: '中',
        mitigation: '运行 `stdd plan` 为变更生成技术设计方案',
      });
    }

    // No evidence at all
    if (!evidence && proposals && proposals.length > 0) {
      risks.push({
        category: '质量风险',
        description: '无任何验证证据，无法确认变更实施质量',
        likelihood: '高',
        impact: '高',
        mitigation: '运行 `stdd verify` 为已完成变更生成验证证据',
      });
    }

    // Low evidence pass rate
    if (evidence && evidence.length > 0) {
      const failCount = evidence.filter(e => e.status === 'fail').length;
      const failRate = Math.round(failCount / evidence.length * 100);
      if (failRate > 20) {
        risks.push({
          category: '质量风险',
          description: '验证失败率达 ' + failRate + '% (' + failCount + '/' + evidence.length + ')，质量基线不达标',
          likelihood: '已发生',
          impact: '高',
          mitigation: '优先修复失败证据对应的场景，将失败率降至 10% 以下',
        });
      }
    }

    // No task breakdown
    if (proposals && !tasks && proposals.length > 0) {
      risks.push({
        category: '管理风险',
        description: proposals.length + ' 个变更均未拆解任务，无法跟踪进度',
        likelihood: '中',
        impact: '中',
        mitigation: '运行 `stdd plan` 拆解任务并分配执行',
      });
    }

    // Too many active changes without progress
    if (proposals && proposals.length > 5 && !tasks) {
      risks.push({
        category: '管理风险',
        description: '活跃变更过多 (' + proposals.length + ' 个) 且无任务管理，存在并行风险',
        likelihood: '中',
        impact: '高',
        mitigation: '优先聚焦 2-3 个核心变更，其余先归档或暂停',
      });
    }

    // Dependencies risk from package.json
    if (packageJson && packageJson.dependencies) {
      const depCount = Object.keys(packageJson.dependencies).length;
      if (depCount > 30) {
        risks.push({
          category: '技术风险',
          description: '运行时依赖数量较多 (' + depCount + ' 个)，增加维护和安全风险',
          likelihood: '中',
          impact: '中',
          mitigation: '定期运行 `stdd depcheck` 检查依赖健康状态',
        });
      }
    }

    return risks;
  }

  buildAppendix(projectName) {
    const lines = [];

    lines.push('### A. 产物清单\n');
    lines.push('| 产物 | 状态 |');
    lines.push('|------|------|');
    lines.push(`| stdd/vision.md | ${this.artifacts.vision ? 'ok 已存在' : '- 未创建'} |`);
    lines.push(`| stdd/config.yaml | ${this.artifacts.config ? 'ok 已存在' : '- 未创建'} |`);
    lines.push(`| stdd/changes/*/proposal.md | ${this.artifacts.proposals ? this.artifacts.proposals.length + ' 个' : '- 无'} |`);
    lines.push(`| stdd/changes/*/specs/ | ${this.artifacts.specs ? this.artifacts.specs.length + ' 个' : '- 无'} |`);
    lines.push(`| stdd/changes/*/design.md | ${this.artifacts.designs ? this.artifacts.designs.length + ' 个' : '- 无'} |`);
    lines.push(`| stdd/changes/*/tasks.md | ${this.artifacts.tasks ? this.artifacts.tasks.length + ' 个' : '- 无'} |`);
    lines.push(`| stdd/evidence/ | ${this.artifacts.evidence ? this.artifacts.evidence.length + ' 条' : '- 无'} |`);
    lines.push(`| stdd/changes/archive/ | ${this.artifacts.archived ? this.artifacts.archived.length + ' 个' : '- 无'} |`);
    lines.push(`| stdd/progress.jsonl | ${this.artifacts.progress ? this.artifacts.progress.length + ' 条' : '- 无'} |`);

    lines.push('\n### B. 生成信息\n');
    lines.push(`- 命令: \`stdd product-proposal\``);
    lines.push(`- 时间: ${new Date().toISOString()}`);
    lines.push(`- 项目: ${projectName}`);

    return lines.join('\n');
  }
}

module.exports = { ProductProposalCommand };
