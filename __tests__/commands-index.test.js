const commands = require('../src/cli/commands/index');

describe('commands/index.js re-exports', () => {
  const expected = [
    'InitCommand', 'UpdateCommand', 'ListCommand', 'NewCommand',
    'StatusCommand', 'ApplyCommand', 'VerifyCommand', 'ArchiveCommand',
    'FFCommand', 'TurboCommand', 'MetricsCommand', 'GuardCommand',
    'MutationCommand', 'ExploreCommand', 'StartersCommand', 'ContinueCommand',
    'IssueCommand', 'CommitCommand', 'ContextCommand', 'CiGeneratorCommand',
    'RecommendEngine', 'printRecommendations', 'ApiSpecCommand',
    'ConstitutionFixCommand', 'AuditCommand',
    'WorkspaceCommand', 'DepcheckCommand', 'SchemaCommand', 'ContractCommand',
    'MockGenCommand', 'ValidateCommand', 'LearnCommand', 'RolesCommand',
    'ExtensionsCommand', 'StoryCommand', 'UserTestCommand', 'PipelineCommand',
    'FixPacketCommand', 'OutsideInCommand', 'AgentEngine', 'SudoLangParser',
    'BabyStepsCommand', 'ElicitationCommand', 'SudoExecutor',
    'createAgentExecutor', 'StartCommand', 'DoctorCommand', 'SkillsCommand',
    'CommandsCommand', 'GraphHistoryCommand', 'GraphRunCommand',
    'WaiverManagerCommand', 'ProductProposalCommand',
    // New CLI commands for previously Skill-only features
    'VisionCommand', 'PrpCommand', 'DesignCommand', 'CertaintyCommand', 'ComplexityCommand',
    'FactoryCommand', 'MockCommand', 'MemoryCommand', 'IterateCommand', 'HelpCommand',
    'ParallelCommand', 'SupervisorCommand', 'ProfileCommand',
    'BuilderCommand', 'UICommand', 'ModulesCommand', 'DashboardCommand', 'DocsCommand',
    'AdaptCommand', 'McpCommand', 'AgentCommand',
    // Skill-based workflow commands
    'ProposeCommand', 'ClarifyCommand', 'ConfirmCommand', 'PlanCommand',
    'ExecuteCommand', 'FinalDocCommand', 'CommitTddCommand',
  ];

  it('exports all expected command classes', () => {
    for (const name of expected) {
      expect(commands[name]).toBeDefined();
    }
  });

  it('exports exactly the expected keys', () => {
    const actualKeys = Object.keys(commands).sort();
    const expectedSorted = expected.sort();
    expect(actualKeys).toEqual(expectedSorted);
  });

  it('each command export is a function or class', () => {
    for (const name of expected) {
      expect(typeof commands[name]).toMatch(/^(function|object)$/);
    }
  });
});
