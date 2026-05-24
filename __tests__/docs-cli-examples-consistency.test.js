const { CANONICAL_CLI_ENTRIES, readFile } = require('../test-support/docs-contracts');

const CHINESE_CLI_DOCS = [
  'USAGE.md',
  'docs/cli-guide.md',
  'docs/getting-started.md'
];

const ENGLISH_CLI_DOCS = [
  'docs/en/cli-guide.md',
  'docs/en/getting-started.md'
];

describe('Documentation CLI example consistency', () => {
  it('keeps Chinese CLI documentation aligned with the canonical CLI entries', () => {
    for (const file of CHINESE_CLI_DOCS) {
      const text = readFile(file);
      const missing = CANONICAL_CLI_ENTRIES.filter(entry => !text.includes(entry));

      expect(missing).toEqual([]);
    }
  });

  it('keeps English CLI documentation aligned with the canonical CLI entries', () => {
    for (const file of ENGLISH_CLI_DOCS) {
      const text = readFile(file);
      const missing = CANONICAL_CLI_ENTRIES.filter(entry => !text.includes(entry));

      expect(missing).toEqual([]);
    }
  });

  it('keeps English entry-doc cross-links and entry descriptions aligned', () => {
    const readme = readFile('README_EN.md');
    const docsIndex = readFile('docs/en/README.md');
    const cliGuide = readFile('docs/en/cli-guide.md');
    const gettingStarted = readFile('docs/en/getting-started.md');

    expect(readme).toContain('[docs/cli-guide.md](./docs/cli-guide.md)');
    expect(readme).toContain('[docs/getting-started.md](./docs/getting-started.md)');
    expect(readme).toContain('[docs/en/](./docs/en/)');

    expect(docsIndex).toContain('[Getting Started](getting-started.md) | First-run workflow and quick CLI reference');
    expect(docsIndex).toContain('[CLI Guide](cli-guide.md) | Full CLI command reference');
    expect(docsIndex).toContain('[Project README](../../README_EN.md) — Project overview and top-level examples');
    expect(docsIndex).toContain('[Getting Started](getting-started.md) — First-run workflow and quick CLI reference');
    expect(docsIndex).toContain('[CLI Guide](cli-guide.md) — Full CLI command reference');

    expect(cliGuide).toContain('## Documentation');
    expect(cliGuide).toContain('[English Docs Index](README.md) — English documentation hub');
    expect(cliGuide).toContain('[Getting Started](getting-started.md) — First-run workflow and quick CLI reference');
    expect(cliGuide).toContain('[Project README](../../README_EN.md) — Project overview and top-level examples');

    expect(gettingStarted).toContain('[English Docs Index](README.md) — English documentation hub');
    expect(gettingStarted).toContain('[CLI Guide](cli-guide.md) — Full CLI command reference');
    expect(gettingStarted).toContain('[Project README](../../README_EN.md) — Project overview and top-level examples');
  });

  it('keeps Chinese entry-doc cross-links and entry descriptions aligned', () => {
    const readme = readFile('README.md');
    const cliGuide = readFile('docs/cli-guide.md');
    const gettingStarted = readFile('docs/getting-started.md');
    const commands = readFile('docs/commands.md');
    const concepts = readFile('docs/concepts.md');
    const usage = readFile('USAGE.md');

    expect(readme).toContain('[docs/cli-guide.md](./docs/cli-guide.md)');
    expect(readme).toContain('[docs/getting-started.md](./docs/getting-started.md)');
    expect(readme).toContain('[USAGE.md](./USAGE.md)');

    expect(cliGuide).toContain('## 文档导航');
    expect(cliGuide).toContain('[项目首页](../README.md) - 项目概览和顶层示例');
    expect(cliGuide).toContain('[快速开始](getting-started.md) - 首次使用流程和 CLI 速查');
    expect(cliGuide).toContain('[使用手册](../USAGE.md) - 完整使用指南');

    expect(gettingStarted).toContain('[项目首页](../README.md) - 项目概览和顶层示例');
    expect(gettingStarted).toContain('[使用手册](../USAGE.md) - 完整使用指南');
    expect(gettingStarted).toContain('[CLI 使用指南](cli-guide.md) - CLI 完整文档');
    expect(gettingStarted).toContain('[工作流程](workflows.md) - 常见模式和使用场景');
    expect(gettingStarted).toContain('[命令参考](commands.md) - 统一会话入口参考');
    expect(gettingStarted).toContain('[核心概念](concepts.md) - 深入理解 specs、changes 和 schemas');
    expect(gettingStarted).toContain('[英文文档入口](en/README.md) - English docs index');

    expect(commands).toContain('## 文档导航');
    expect(commands).toContain('[工作流程](workflows.md) - 常见工作流程');
    expect(commands).toContain('[核心概念](concepts.md) - 深入理解 specs、changes 和 schemas');
    expect(commands).toContain('[CLI 使用指南](cli-guide.md) - CLI 完整文档');
    expect(commands).toContain('[项目首页](../README.md) - 项目概览和顶层示例');
    expect(commands).toContain('[快速开始](getting-started.md) - 首次使用流程和 CLI 速查');
    expect(commands).toContain('[使用手册](../USAGE.md) - 完整使用指南');
    expect(commands).toContain('[英文文档入口](en/README.md) - English docs index');

    expect(concepts).toContain('实践用法请参阅 [快速开始](getting-started.md) 和 [工作流程](workflows.md)。');
    expect(concepts).toContain('## 文档导航');
    expect(concepts).toContain('[快速开始](getting-started.md) - 实践第一步');
    expect(concepts).toContain('[工作流程](workflows.md) - 常见模式和使用场景');
    expect(concepts).toContain('[命令参考](commands.md) - 完整命令参考');
    expect(concepts).toContain('[CLI 使用指南](cli-guide.md) - CLI 完整文档');
    expect(concepts).toContain('[项目首页](../README.md) - 项目概览和顶层示例');
    expect(concepts).toContain('[快速开始](getting-started.md) - 首次使用流程和 CLI 速查');
    expect(concepts).toContain('[使用手册](../USAGE.md) - 完整使用指南');
    expect(concepts).toContain('[英文文档入口](en/README.md) - English docs index');

    expect(usage).toContain('## 文档导航');
    expect(usage).toContain('[项目首页](./README.md) - 项目概览和顶层示例');
    expect(usage).toContain('[快速开始](./docs/getting-started.md) - 首次使用流程和 CLI 速查');
    expect(usage).toContain('[CLI 使用指南](./docs/cli-guide.md) - CLI 完整文档');
    expect(usage).toContain('[英文文档入口](./docs/en/README.md) - English docs index');
  });
});
