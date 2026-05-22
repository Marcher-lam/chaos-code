# STDD Skills 方法一览

## 完整列表（47 个）

| Skill | 功能 | 同类skill（外部工具） |
|-------|------|----------------------|
| api-spec ✅ | 从 BDD 规格生成 OpenAPI 与类型契约 | [OpenAPI TypeScript](https://openapi-ts.dev/), [OpenAPI Generator](https://openapi-generator.tech/), [hey-api/openapi-ts](https://github.com/hey-api/openapi-ts), [Orval](https://orval.dev/), [Swagger Codegen](https://swagger.io/tools/swagger-codegen/) |
| apply ✅ | 按 Ralph Loop 执行任务级 TDD 实现 | [Jest](https://jestjs.io/), [Vitest](https://vitest.dev/), [Mocha](https://mochajs.org/), [Jasmine](https://jasmine.github.io/), [pytest](https://docs.pytest.org/), [JUnit](https://junit.org/) |
| archive ✅ | 归档完成变更并合并 delta specs 到主规格 | [Git Archive](https://git-scm.com/docs/git-archive), [Confluence](https://www.atlassian.com/software/confluence), [Notion](https://www.notion.so/) |
| brainstorm ✅ | 只读头脑风暴，比较方案并输出建议 | [Miro](https://miro.com/), [Mural](https://www.mural.co/), [Ideanote](https://ideanote.io/), [Stormboard](https://www.stormboard.com/), [Lucidspark](https://www.lucidspark.com/) |
| certainty ✅ | 对关键决策进行五维置信度评分和 HITL 判断 | [LangChain HITL](https://python.langchain.com/docs/guides/human_in_the_loop), [HumanLoop](https://humanloop.com/), [Arize Phoenix](https://phoenix.arize.com/) |
| clarify ✅ | 通过结构化追问消除需求歧义和边界缺口 | [Aha!](https://www.aha.io/), [Productboard](https://www.productboard.com/), [Confluence Questions](https://www.atlassian.com/software/confluence), [UserVoice](https://www.uservoice.com/) |
| commit ✅ | 生成符合 TDD 阶段和 Conventional Commits 的提交信息 | [Commitizen](https://commitizen-tools.github.io/commitizen/), [Commitlint](https://commitlint.js.org/), [cz-git](https://cz-git.qbenben.com/), [git-cliff](https://git-cliff.org/), [Cocogitto](https://cocogitto.io/) |
| complexity ✅ | 分析复杂度、APP mass 与重构热点 | [SonarQube](https://www.sonarqube.org/), [CodeClimate](https://codeclimate.com/), [Lizard](https://github.com/terryyin/lizard), [Radon](https://radon.readthedocs.io/), [ESLint Plugin Complexity](https://github.com/idan/eslint-plugin-complexity) |
| confirm ✅ | 人类确认门，冻结需求范围后进入规格阶段 | [GitHub PR Approval](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/requiring-pull-request-reviews), [GitLab MR Approval](https://docs.gitlab.com/ee/user/project/merge_requests/), [LaunchDarkly](https://launchdarkly.com/) |
| constitution ✅ | 管理 9 篇 Constitution 条例、检查、修复、审计和豁免 | [Open Policy Agent (OPA)](https://www.openpolicyagent.org/), [Snyk](https://snyk.io/), [ESLint](https://eslint.org/), [Stylelint](https://stylelint.io/) |
| context ✅ | 装配 foundation/component/feature 三层上下文 | [LangChain Context](https://python.langchain.com/docs/), [LlamaIndex](https://www.llamaindex.ai/), [Mem0](https://mem0.ai/) |
| continue ✅ | 根据状态机恢复并推进下一个 STDD 产物 | [Git Resume](https://git-scm.com/docs/git-rebase), [Aider](https://aider.chat/), [Cursor Continue](https://cursor.sh/) |
| contract ✅ | 生成并验证消费者驱动 API 契约 | [Pact](https://pact.io/), [Pactum](https://pactumjs.github.io/), [Spring Cloud Contract](https://spring.io/projects/spring-cloud-contract) |
| design ✅ | 生成技术设计文档或根 DESIGN.md 视觉系统 | [ADR Tools](https://adr.github.io/), [Structurizr](https://structurizr.com/), [Mermaid](https://mermaid.js.org/), [C4 Model](https://c4model.com/) |
| execute ✅ | 围绕 Ralph Loop 与 apply 的编排型执行包装器 | [GitHub Actions](https://github.com/features/actions), [CircleCI](https://circleci.com/), [Make](https://www.gnu.org/software/make/) |
| explore ✅ | 只读探索现有系统、约束和可行路径 | [Sourcegraph](https://sourcegraph.com/), [GitHub Code Search](https://cs.github.com/), [RepoInspector](https://repoinspector.com/) |
| factory ✅ | 生成可复用测试数据工厂与场景 fixture | [Faker](https://fakerjs.dev/), [Rosie](https://www.rosiejs.com/), [Factory Boy](https://factoryboy.readthedocs.io/), [Test Data Builder](https://martinfowler.com/bliki/TestDataBuilder.html) |
| ff ✅ | Fast-Forward 为明确需求一次性生成核心产物 | [Aider](https://aider.chat/), [Cursor](https://cursor.sh/), [Copilot Workspace](https://github.com/features/copilot) |
| final-doc ✅ | 聚合变更产物生成最终交付文档 | [Sphinx](https://www.sphinx-doc.org/), [Docusaurus](https://docusaurus.io/), [MkDocs](https://www.mkdocs.org/), [VuePress](https://vuepress.vuejs.org/) |
| fix-packet ✅ | 为失败任务生成 Golden Packet 风格修复上下文 | [Bugzilla](https://www.bugzilla.org/), [Jira](https://www.atlassian.com/software/jira), [Sentry Issues](https://sentry.io/) |
| graph ✅ | Skill Graph 的 DAG 分析、推荐、运行、历史和 replay | [Airflow](https://airflow.apache.org/), [Dagster](https://dagster.io/), [GitHub Actions](https://github.com/features/actions), [Temporal](https://temporal.io/) |
| guard ✅ | 执行 TDD 守护、coverage-aware 质量门禁与 Anti-Bypass | [Husky](https://typicode.github.io/husky/), [pre-commit](https://pre-commit.com/), [Lint-Staged](https://github.com/okonet/lint-staged), [SonarQube Quality Gates](https://www.sonarqube.org/) |
| help ✅ | 根据当前状态提供上下文感知帮助和下一步建议 | [CLI Help](https://clig.dev/), [tldr](https://tldr.sh/), [tealdeer](https://github.com/dbrgn/tealdeer) |
| init ✅ | 初始化 STDD 项目结构、配置、workspace 与 greenfield/brownfield 基线 | [npm init](https://docs.npmjs.com/cli/v10/commands/npm-init), [create-react-app](https://create-react-app.dev/), [Vue CLI](https://cli.vuejs.org/), [Scaffolder](https://github.com/Swiip/generator-gulp-webapp) |
| issue ✅ | 用失败测试先行的 TDD 流程处理 bug 或回归 | [Jira](https://www.atlassian.com/software/jira), [GitHub Issues](https://docs.github.com/en/issues), [Linear](https://linear.app/), [Bugzilla](https://www.bugzilla.org/) |
| iterate ✅ | 执行 Plan-Execute-Reflect 自主迭代循环 | [AgentOps](https://agentops.ai/), [LangGraph](https://langchain-ai.github.io/langgraph/), [CrewAI](https://www.crewai.com/) |
| learn ✅ | 从项目代码和反馈学习本地模式与偏好 | [Github Copilot](https://github.com/features/copilot), [CodeLlama](https://llama.meta.com/), [Tabby](https://tabby.tabbyml.com/) |
| memory ✅ | 保存和检索跨会话语义记忆与决策 | [Mem0](https://mem0.ai/), [Chroma](https://www.trychroma.com/), [Pinecone](https://www.pinecone.io/), [Weaviate](https://weaviate.io/) |
| metrics ✅ | 汇总项目、变更和 workspace 质量指标 | [SonarQube](https://www.sonarqube.org/), [CodeClimate](https://codeclimate.com/), [Codecov](https://about.codecov.io/), [Coveralls](https://coveralls.io/) |
| mock ✅ | 为外部依赖生成测试 Mock、Stub 与 Fake | [MSW](https://mswjs.io/), [Nock](https://nock.github.io/), [Sinon.js](https://sinonjs.org/), [testdouble.js](https://github.com/testdouble/testdouble.js) |
| mutation ✅ | 生成 mutation evidence 以检验测试有效性 | [Stryker Mutator](https://stryker-mutator.io/), [Jest-extended](https://jest-extended.js.org/), [Infection (PHP)](https://infection.github.io/) |
| new ✅ | 创建变更工作区并启动 Spec-First 需求流 | [Git Branch](https://git-scm.com/docs/git-branch), [GitHub Issues](https://docs.github.com/en/issues), [Jira](https://www.atlassian.com/software/jira) |
| outside-in ✅ | 建立 E2E 到集成到单元的外向内 TDD 骨架 | [Cypress](https://www.cypress.io/), [Playwright](https://playwright.dev/), [TestCafe](https://testcafe.io/), [Cucumber](https://cucumber.io/) |
| parallel ✅ | 基于 DAG waves 并行执行独立任务或 skill 节点 | [npm-run-all](https://github.com/mysticatea/npm-run-all/), [GNU Parallel](https://www.gnu.org/software/parallel/), [p-queue](https://github.com/sindresorhus/p-queue) |
| plan ✅ | 从规格生成技术设计和原子 TDD tasks | [Jira](https://www.atlassian.com/software/jira), [Linear](https://linear.app/), [GitHub Projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects) |
| product-proposal ✅ | 从全项目产物生成 15 章节产品方案报告 | [Notion](https://www.notion.so/), [Confluence](https://www.atlassian.com/software/confluence), [Productboard](https://www.productboard.com/) |
| propose ✅ | 把用户意图整理为边界清晰的变更 proposal | [Aha!](https://www.aha.io/), [Productboard](https://www.productboard.com/), [Pendo](https://www.pendo.io/) |
| prp ✅ | 生成 What/Why/How/Success 结构化规划 | [PRFAQ (Amazon)](https://web.archive.org/web/20210126144036/https://www.allthingsdistributed.com/2006/11/working_backwards.html), [Aha!](https://www.aha.io/), [Miro](https://miro.com/) |
| roles ✅ | 启用 12 Agent 角色、Party Mode 和对抗式审查 | [CrewAI](https://www.crewai.com/), [AutoGen](https://microsoft.github.io/autogen/), [MetaGPT](https://github.com/geekan/MetaGPT) |
| schema ✅ | 生成和验证 JSON Schema、Zod 与类型约束 | [Zod](https://zod.dev/), [JSON Schema](https://json-schema.org/), [Ajv](https://ajv.js.org/), [Joi](https://joi.dev/) |
| spec ✅ | 从已确认需求生成可测试 BDD delta specs | [Cucumber](https://cucumber.io/), [SpecFlow](https://specflow.org/), [Behave](https://behave.readthedocs.io/), [Jest-Gherkin](https://github.com/bjcodeio/jest-gherkin) |
| supervisor ✅ | 协调多 Agent 任务委派、同步和失败升级 | [CrewAI](https://www.crewai.com/), [LangGraph](https://langchain-ai.github.io/langgraph/), [Temporal](https://temporal.io/) |
| turbo ✅ | 一键编排从需求到 TDD scaffold 与验证准备 | [Nx](https://nx.dev/), [Turborepo](https://turbo.build/repo), [Lerna](https://lernajs.io/) |
| user-test ✅ | 从 BDD 场景生成人工验收测试脚本 | [Cucumber](https://cucumber.io/), [TestRail](https://www.gurock.com/testrail), [Xray](https://www.xpandit.com/software/xray) |
| validate ✅ | 验证规格一致性并运行 Spec Guardian 泄漏检测 | [Spectral](https://stoplight.io/open-source/spectral), [OpenAPI Lint](https://apitools.dev/swagger-parser/online/), [ESLint](https://eslint.org/) |
| verify ✅ | 验证任务、测试、Constitution 与 evidence 完整性 | [SonarQube](https://www.sonarqube.org/), [Codecov](https://about.codecov.io/), [GitHub Actions](https://github.com/features/actions) |
| vision ✅ | 维护项目愿景、北极星原则和成功指标 | [Notion](https://www.notion.so/), [Confluence](https://www.atlassian.com/software/confluence), [Miro](https://miro.com/) |

---

## 按类别分类

### 生命周期 (Lifecycle) - 14 个
- **init** - 初始化 STDD 项目结构、配置、workspace 与 greenfield/brownfield 基线 | 同类: [npm init](https://docs.npmjs.com/cli/v10/commands/npm-init), [create-react-app](https://create-react-app.dev/), [Vue CLI](https://cli.vuejs.org/)
- **new** - 创建变更工作区并启动 Spec-First 需求流 | 同类: [Git Branch](https://git-scm.com/docs/git-branch), [GitHub Issues](https://docs.github.com/en/issues)
- **propose** - 把用户意图整理为边界清晰的变更 proposal | 同类: [Aha!](https://www.aha.io/), [Productboard](https://www.productboard.com/)
- **clarify** - 通过结构化追问消除需求歧义和边界缺口 | 同类: [Aha!](https://www.aha.io/), [Productboard](https://www.productboard.com/)
- **confirm** - 人类确认门，冻结需求范围后进入规格阶段 | 同类: [GitHub PR Approval](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/requiring-pull-request-reviews)
- **spec** - 从已确认需求生成可测试 BDD delta specs | 同类: [Cucumber](https://cucumber.io/), [SpecFlow](https://specflow.org/)
- **plan** - 从规格生成技术设计和原子 TDD tasks | 同类: [Jira](https://www.atlassian.com/software/jira), [Linear](https://linear.app/)
- **apply** - 按 Ralph Loop 执行任务级 TDD 实现 | 同类: [Jest](https://jestjs.io/), [Vitest](https://vitest.dev/)
- **execute** - 围绕 Ralph Loop 与 apply 的编排型执行包装器 | 同类: [GitHub Actions](https://github.com/features/actions), [CircleCI](https://circleci.com/)
- **verify** - 验证任务、测试、Constitution 与 evidence 完整性 | 同类: [SonarQube](https://www.sonarqube.org/), [Codecov](https://about.codecov.io/)
- **archive** - 归档完成变更并合并 delta specs 到主规格 | 同类: [Git Archive](https://git-scm.com/docs/git-archive), [Confluence](https://www.atlassian.com/software/confluence)
- **commit** - 生成符合 TDD 阶段和 Conventional Commits 的提交信息 | 同类: [Commitizen](https://commitizen-tools.github.io/commitizen/), [Commitlint](https://commitlint.js.org/)
- **continue** - 根据状态机恢复并推进下一个 STDD 产物 | 同类: [Aider](https://aider.chat/), [Cursor Continue](https://cursor.sh/)
- **issue** - 用失败测试先行的 TDD 流程处理 bug 或回归 | 同类: [Jira](https://www.atlassian.com/software/jira), [GitHub Issues](https://docs.github.com/en/issues)

### 规格优先 (Spec-First) - 6 个
- **api-spec** - 从 BDD 规格生成 OpenAPI 与类型契约 | 同类: [OpenAPI TypeScript](https://openapi-ts.dev/), [OpenAPI Generator](https://openapi-generator.tech/)
- **contract** - 生成并验证消费者驱动 API 契约 | 同类: [Pact](https://pact.io/), [Pactum](https://pactumjs.github.io/)
- **design** - 生成技术设计文档或根 DESIGN.md 视觉系统 | 同类: [ADR Tools](https://adr.github.io/), [Structurizr](https://structurizr.com/)
- **prp** - 生成 What/Why/How/Success 结构化规划 | 同类: [PRFAQ (Amazon)](https://web.archive.org/web/20210126144036/https://www.allthingsdistributed.com/2006/11/working_backwards.html)
- **schema** - 生成和验证 JSON Schema、Zod 与类型约束 | 同类: [Zod](https://zod.dev/), [JSON Schema](https://json-schema.org/)
- **validate** - 验证规格一致性并运行 Spec Guardian 泄漏检测 | 同类: [Spectral](https://stoplight.io/open-source/spectral), [OpenAPI Lint](https://apitools.dev/swagger-parser/online/)

### TDD - 5 个
- **factory** - 生成可复用测试数据工厂与场景 fixture | 同类: [Faker](https://fakerjs.dev/), [Rosie](https://www.rosiejs.com/), [Factory Boy](https://factoryboy.readthedocs.io/)
- **guard** - 执行 TDD 守护、coverage-aware 质量门禁与 Anti-Bypass | 同类: [Husky](https://typicode.github.io/husky/), [pre-commit](https://pre-commit.com/)
- **mock** - 为外部依赖生成测试 Mock、Stub 与 Fake | 同类: [MSW](https://mswjs.io/), [Nock](https://nock.github.io/), [Sinon.js](https://sinonjs.org/)
- **mutation** - 生成 mutation evidence 以检验测试有效性 | 同类: [Stryker Mutator](https://stryker-mutator.io/)
- **outside-in** - 建立 E2E 到集成到单元的外向内 TDD 骨架 | 同类: [Cypress](https://www.cypress.io/), [Playwright](https://playwright.dev/)

### 编排 (Orchestration) - 6 个
- **ff** - Fast-Forward 为明确需求一次性生成核心产物 | 同类: [Aider](https://aider.chat/), [Cursor](https://cursor.sh/)
- **graph** - Skill Graph 的 DAG 分析、推荐、运行、历史和 replay | 同类: [Airflow](https://airflow.apache.org/), [Dagster](https://dagster.io/)
- **iterate** - 执行 Plan-Execute-Reflect 自主迭代循环 | 同类: [AgentOps](https://agentops.ai/), [LangGraph](https://langchain-ai.github.io/langgraph/)
- **parallel** - 基于 DAG waves 并行执行独立任务或 skill 节点 | 同类: [npm-run-all](https://github.com/mysticatea/npm-run-all/), [GNU Parallel](https://www.gnu.org/software/parallel/)
- **supervisor** - 协调多 Agent 任务委派、同步和失败升级 | 同类: [CrewAI](https://www.crewai.com/), [Temporal](https://temporal.io/)
- **turbo** - 一键编排从需求到 TDD scaffold 与验证准备 | 同类: [Nx](https://nx.dev/), [Turborepo](https://turbo.build/repo/)

### 文档 (Documentation) - 5 个
- **brainstorm** - 只读头脑风暴，比较方案并输出建议 | 同类: [Miro](https://miro.com/), [Mural](https://www.mural.co/)
- **final-doc** - 聚合变更产物生成最终交付文档 | 同类: [Sphinx](https://www.sphinx-doc.org/), [Docusaurus](https://docusaurus.io/)
- **help** - 根据当前状态提供上下文感知帮助和下一步建议 | 同类: [CLI Help](https://clig.dev/), [tldr](https://tldr.sh/)
- **product-proposal** - 从全项目产物生成 15 章节产品方案报告 | 同类: [Notion](https://www.notion.so/), [Confluence](https://www.atlassian.com/software/confluence)
- **vision** - 维护项目愿景、北极星原则和成功指标 | 同类: [Notion](https://www.notion.so/), [Miro](https://miro.com/)

### 证据 (Evidence) - 4 个
- **certainty** - 对关键决策进行五维置信度评分和 HITL 判断 | 同类: [LangChain HITL](https://python.langchain.com/docs/guides/human_in_the_loop), [HumanLoop](https://humanloop.com/)
- **complexity** - 分析复杂度、APP mass 与重构热点 | 同类: [SonarQube](https://www.sonarqube.org/), [CodeClimate](https://codeclimate.com/)
- **fix-packet** - 为失败任务生成 Golden Packet 风格修复上下文 | 同类: [Bugzilla](https://www.bugzilla.org/), [Jira](https://www.atlassian.com/software/jira)
- **metrics** - 汇总项目、变更和 workspace 质量指标 | 同类: [SonarQube](https://www.sonarqube.org/), [Codecov](https://about.codecov.io/)

### 治理 (Governance) - 2 个
- **constitution** - 管理 9 篇 Constitution 条例、检查、修复、审计和豁免 | 同类: [Open Policy Agent (OPA)](https://www.openpolicyagent.org/), [Snyk](https://snyk.io/)
- **commit** - 生成符合 TDD 阶段和 Conventional Commits 的提交信息 | 同类: [Commitizen](https://commitizen-tools.github.io/commitizen/), [Commitlint](https://commitlint.js.org/)

### 协作 (Collaboration) - 2 个
- **roles** - 启用 12 Agent 角色、Party Mode 和对抗式审查 | 同类: [CrewAI](https://www.crewai.com/), [AutoGen](https://microsoft.github.io/autogen/)
- **user-test** - 从 BDD 场景生成人工验收测试脚本 | 同类: [Cucumber](https://cucumber.io/), [TestRail](https://www.gurock.com/testrail)

### 工作区 (Workspace) - 3 个
- **context** - 装配 foundation/component/feature 三层上下文 | 同类: [LangChain Context](https://python.langchain.com/docs/), [LlamaIndex](https://www.llamaindex.ai/)
- **learn** - 从项目代码和反馈学习本地模式与偏好 | 同类: [GitHub Copilot](https://github.com/features/copilot), [Tabby](https://tabby.tabbyml.com/)
- **memory** - 保存和检索跨会话语义记忆与决策 | 同类: [Mem0](https://mem0.ai/), [Chroma](https://www.trychroma.com/), [Pinecone](https://www.pinecone.io/)

### 探索 (Discovery) - 1 个
- **explore** - 只读探索现有系统、约束和可行路径 | 同类: [Sourcegraph](https://sourcegraph.com/), [GitHub Code Search](https://cs.github.com/)

---

## 参考来源

- [OpenAPI TypeScript](https://openapi-ts.dev/)
- [Conventional Commits Tools](https://www.conventionalcommits.org/en/about/)
- [Stryker Mutator](https://stryker-mutator.io/)
- [Commitizen](https://commitizen-tools.github.io/commitizen/)
- [Cucumber](https://cucumber.io/)
- [SonarQube](https://www.sonarqube.org/)
