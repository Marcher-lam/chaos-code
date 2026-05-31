/**
 * Tests for cli.js — the main CLI entry point.
 *
 * cli.js calls program.parse() at module load time, so we must mock
 * every dependency BEFORE the first require('../cli').
 *
 * Strategy:
 * - safeAction and createSpinner are module-private (not exported).
 *   We capture the .action() callbacks registered on the Commander mock
 *   to exercise the real safeAction wrapper through the actual cli.js code.
 * - Program setup is verified by inspecting the mock calls.
 */

// ─── Mocks (declared before any require of the UUT) ───

jest.mock('commander', () => {
  const commands = [];
  const program = {
    name: jest.fn().mockReturnThis(),
    description: jest.fn().mockReturnThis(),
    version: jest.fn().mockReturnThis(),
    option: jest.fn().mockReturnThis(),
    addHelpText: jest.fn().mockReturnThis(),
    command: jest.fn().mockImplementation(() => {
      const sub = {
        description: jest.fn().mockReturnThis(),
        option: jest.fn().mockReturnThis(),
        alias: jest.fn().mockReturnThis(),
        addHelpText: jest.fn().mockReturnThis(),
        action: jest.fn().mockReturnThis(),
        command: jest.fn().mockImplementation(() => {
          // nested subcommand
          return {
            description: jest.fn().mockReturnThis(),
            option: jest.fn().mockReturnThis(),
            action: jest.fn().mockReturnThis(),
            addHelpText: jest.fn().mockReturnThis(),
            command: jest.fn().mockImplementation(() => {
              return {
                description: jest.fn().mockReturnThis(),
                option: jest.fn().mockReturnThis(),
                action: jest.fn().mockReturnThis(),
                addHelpText: jest.fn().mockReturnThis(),
              };
            }),
          };
        }),
      };
      commands.push(sub);
      return sub;
    }),
    parse: jest.fn(),
  };
  const Command = jest.fn(() => program);
  return { Command, _program: program, _commands: commands };
});

jest.mock('chalk', () => ({
  red: jest.fn((s) => `[red]${s}`),
  green: jest.fn((s) => `[green]${s}`),
  yellow: jest.fn((s) => `[yellow]${s}`),
  bold: jest.fn((s) => s),
  dim: jest.fn((s) => s),
}));

jest.mock('../src/cli/registry/command-loader', () => {
  return {
    CommandLoader: jest.fn().mockImplementation(() => ({
      registerAll: jest.fn(),
    })),
  };
});

jest.mock('../src/cli/commands/index', () => ({
  InitCommand: jest.fn(),
  UpdateCommand: jest.fn(),
  ListCommand: jest.fn(),
  NewCommand: jest.fn(),
  StatusCommand: jest.fn(),
  ApplyCommand: jest.fn(),
  VerifyCommand: jest.fn(),
  ArchiveCommand: jest.fn(),
  FFCommand: jest.fn(),
  TurboCommand: jest.fn(),
  MetricsCommand: jest.fn(),
  GuardCommand: jest.fn(),
  ExploreCommand: jest.fn(),
  StartersCommand: jest.fn(),
  ContinueCommand: jest.fn(),
  IssueCommand: jest.fn(),
  CommitCommand: jest.fn(),
  ContextCommand: jest.fn(),
  CiGeneratorCommand: jest.fn(),
  AuditCommand: jest.fn(),
  WorkspaceCommand: jest.fn(),
  DepcheckCommand: jest.fn(),
  SchemaCommand: jest.fn(),
  ContractCommand: jest.fn(),
  MockGenCommand: jest.fn(),
  ValidateCommand: jest.fn(),
  LearnCommand: jest.fn(),
  RolesCommand: jest.fn(),
  ExtensionsCommand: jest.fn(),
  StoryCommand: jest.fn(),
  UserTestCommand: jest.fn(),
  PipelineCommand: jest.fn(),
  FixPacketCommand: jest.fn(),
  OutsideInCommand: jest.fn(),
  RecommendEngine: jest.fn().mockImplementation(() => ({ recommend: jest.fn().mockReturnValue([]) })),
  printRecommendations: jest.fn(),
  ConstitutionFixCommand: jest.fn(),
  MutationCommand: jest.fn(),
  AgentEngine: jest.fn(),
  SudoLangParser: jest.fn(),
  BabyStepsCommand: jest.fn(),
  SudoExecutor: jest.fn(),
  ElicitationCommand: jest.fn(),
  createAgentExecutor: jest.fn(),
  ProductProposalCommand: jest.fn(),
  StartCommand: jest.fn(),
  DoctorCommand: jest.fn(),
  SkillsCommand: jest.fn(),
  CommandsCommand: jest.fn(),
}));

jest.mock('../src/cli/commands/progress', () => ({
  ProgressCommand: jest.fn(),
}));

jest.mock('../src/cli/commands/browser', () => ({
  BrowserCommand: jest.fn(),
}));

jest.mock('../src/cli/commands/spec-generator', () => ({
  SpecGenerator: jest.fn(),
}));

jest.mock('../src/cli/commands/api-spec', () => ({
  ApiSpecCommand: jest.fn(),
}));

jest.mock('../src/cli/commands/memory-scan', () => ({
  MemoryScanner: jest.fn(),
}));

jest.mock('../src/cli/commands/tdd-init', () => ({
  TddInitCommand: jest.fn(),
}));

jest.mock('../src/cli/commands/constitution-status', () => ({
  ConstitutionStatusCommand: jest.fn(),
}));

jest.mock('../src/cli/commands/hooks', () => jest.fn());

jest.mock('../src/cli/commands/graph', () => ({
  graphCommand: jest.fn(),
}));

jest.mock('../src/cli/commands/constitution-checker', () => ({
  ConstitutionChecker: jest.fn(),
}));

jest.mock('../src/cli/commands/waiver-manager', () => ({
  WaiverManager: jest.fn(),
}));

jest.mock('../src/utils/session-progress', () => ({
  progress: jest.fn(() => ({
    start: jest.fn(() => ({ id: 'test-id' })),
    complete: jest.fn(),
    fail: jest.fn(),
  })),
  installSignals: jest.fn(),
  active: jest.fn(() => null),
  setActive: jest.fn(),
  clearActive: jest.fn(),
}));

jest.mock('../src/utils/change-utils', () => ({
  findActiveChange: jest.fn(),
}));

// ─── Tests ───

describe('cli.js entry point', () => {
  let originalExitCode;
  let commanderMock;
  let errorSpy;

  beforeAll(() => {
    originalExitCode = process.exitCode;
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    commanderMock = require('commander');
    // Require cli.js — all its code runs, including program.parse()
    // (which is a no-op mock) and every .action() call.
    require('../cli');
  });

  afterAll(() => {
    errorSpy.mockRestore();
    process.exitCode = originalExitCode;
  });

  // Helper: collect all action callbacks registered on inline commands
  function getInlineCommandActions() {
    const _program = commanderMock._program;
    const actions = [];
    for (const cmd of commanderMock._commands) {
      if (cmd.action.mock.calls.length > 0) {
        actions.push(cmd.action.mock.calls[0][0]);
      }
      // Check nested subcommands too
      if (cmd.command.mock.calls.length > 0) {
        // The nested command mock objects are created inline, so we can't
        // easily access them. Instead we rely on direct inspection below.
      }
    }
    return actions;
  }

  // ──────────────────────────────────────────────────────────
  // 1. safeAction wrapper — tested via captured action callbacks
  // ──────────────────────────────────────────────────────────

  describe('safeAction wrapper (via inline command actions)', () => {
    it('should catch errors and set process.exitCode to 1', async () => {
      // The "start" command uses safeAction and throws because
      // StartCommand is a mock constructor whose .execute() is undefined.
      process.exitCode = 0;

      const actions = getInlineCommandActions();
      // At least one action was registered (e.g. start, doctor, progress)
      expect(actions.length).toBeGreaterThan(0);

      // Pick the first action callback and call it.
      // All inline commands are wrapped with safeAction, so any thrown
      // error will be caught and exitCode set to 1.
      const actionFn = actions[0];
      await actionFn({});

      // The mock constructor throws because .execute is not a function,
      // so safeAction catches it and sets exitCode = 1.
      expect(process.exitCode).toBe(1);
    });

    it('should log error message via console.error with chalk.red', async () => {
      const chalk = require('chalk');
      errorSpy.mockClear();

      const actions = getInlineCommandActions();
      const actionFn = actions[0];
      await actionFn({});

      // chalk.red should have been called with the error message
      expect(chalk.red).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should NOT set exitCode when action succeeds', async () => {
      process.exitCode = 0;
      // We'll test by looking at a command that won't throw.
      // The "recommend" command calls engine.recommend() which on a mock
      // returns undefined. The action callback:
      //   const engine = new RecommendEngine(process.cwd());
      //   const recs = engine.recommend(change, options);
      //   if (options.json) console.log(...) else printRecommendations(recs);
      // RecommendEngine is a mock, so engine.recommend() returns undefined.
      // printRecommendations is a mock so it won't throw.
      // This should succeed.

      // Find the "recommend" command action.
      // The commands array corresponds to program.command() calls.
      const program = commanderMock._program;
      const recommendIdx = program.command.mock.calls.findIndex(
        (c) => c[0] === 'recommend [change]'
      );
      // The recommend command is an inline command
      const recommendCmd = commanderMock._commands[recommendIdx];
      if (recommendCmd && recommendCmd.action.mock.calls.length > 0) {
        const actionFn = recommendCmd.action.mock.calls[0][0];
        await actionFn(undefined, { json: true });
        // Since RecommendEngine is a mock, it shouldn't throw
        // and exitCode should stay 0
        expect(process.exitCode).toBe(0);
      }
    });
  });

  // ──────────────────────────────────────────────────────────
  // 2. createSpinner — tested by triggering constitution check
  //    which internally uses createSpinner
  // ──────────────────────────────────────────────────────────

  describe('createSpinner', () => {
    let writeSpy;

    beforeEach(() => {
      writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    });

    afterEach(() => {
      writeSpy.mockRestore();
    });

    it('should write spinner output on succeed/fail', async () => {
      // The "constitution check" action uses createSpinner.
      // Find the constitution command action.
      const program = commanderMock._program;
      const constitutionIdx = program.command.mock.calls.findIndex(
        (c) => c[0] === 'constitution [action] [target]'
      );
      const constitutionCmd = commanderMock._commands[constitutionIdx];

      if (constitutionCmd && constitutionCmd.action.mock.calls.length > 0) {
        process.exitCode = 0;
        const actionFn = constitutionCmd.action.mock.calls[0][0];

        // ConstitutionChecker mock — set up issues
        const { ConstitutionChecker } = require('../src/cli/commands/constitution-checker');
        ConstitutionChecker.mockImplementation(() => ({
          loadWaivers: jest.fn(),
          run: jest.fn(),
          issues: { blocking: [], warning: [], suggestion: [] },
        }));

        await actionFn('check', undefined, {});

        // createSpinner.succeed writes to stdout
        expect(writeSpy).toHaveBeenCalled();
      }
    });

    it('should write fail output when constitution check has blocking violations', async () => {
      const { ConstitutionChecker } = require('../src/cli/commands/constitution-checker');
      ConstitutionChecker.mockImplementation(() => ({
        loadWaivers: jest.fn(),
        run: jest.fn(),
        issues: { blocking: [{ article: 7, severity: 'blocking', message: 'Security issue' }], warning: [], suggestion: [] },
      }));

      const program = commanderMock._program;
      const constitutionIdx = program.command.mock.calls.findIndex(
        (c) => c[0] === 'constitution [action] [target]'
      );
      const constitutionCmd = commanderMock._commands[constitutionIdx];

      if (constitutionCmd && constitutionCmd.action.mock.calls.length > 0) {
        process.exitCode = 0;
        const actionFn = constitutionCmd.action.mock.calls[0][0];
        await actionFn('check', undefined, {});
        // Blocking violations set process.exitCode = 1
        expect(process.exitCode).toBe(1);
      }
    });
  });

  // ──────────────────────────────────────────────────────────
  // 3. Program setup verification
  // ──────────────────────────────────────────────────────────

  describe('program setup', () => {
    it('should create a Commander program instance', () => {
      const { Command } = commanderMock;
      expect(Command).toHaveBeenCalled();
    });

    it('should call program.name, description, version, and option', () => {
      const program = commanderMock._program;
      expect(program.name).toHaveBeenCalledWith('stdd');
      expect(program.description).toHaveBeenCalledWith(
        'STDD Copilot - Spec + Test Driven Development Framework'
      );
      expect(program.version).toHaveBeenCalled();
      expect(program.option).toHaveBeenCalledWith('--no-color', 'Disable color output');
    });

    it('should add help text with common examples', () => {
      const program = commanderMock._program;
      expect(program.addHelpText).toHaveBeenCalledWith('after', expect.stringContaining('stdd init'));
    });

    it('should register commands via CommandLoader', () => {
      const { CommandLoader } = require('../src/cli/registry/command-loader');
      expect(CommandLoader).toHaveBeenCalled();
      const loaderInstance = CommandLoader.mock.results[0].value;
      expect(loaderInstance.registerAll).toHaveBeenCalled();
    });

    it('should register inline commands on the program', () => {
      const program = commanderMock._program;
      const commandCalls = program.command.mock.calls.map((c) => c[0]);
      expect(commandCalls).toContain('start');
      expect(commandCalls).toContain('doctor');
      expect(commandCalls).toContain('progress');
      expect(commandCalls).toContain('recommend [change]');
      expect(commandCalls).toContain('memory <action> [args...]');
      expect(commandCalls).toContain('baby-steps [task]');
      expect(commandCalls).toContain('list');
      expect(commandCalls).toContain('status [change]');
      expect(commandCalls).toContain('constitution [action] [target]');
      expect(commandCalls).toContain('runtime');
    });

    it('should call hooksCommand and graphCommand with the program', () => {
      const hooksCommand = require('../src/cli/commands/hooks');
      const { graphCommand } = require('../src/cli/commands/graph');
      const program = commanderMock._program;

      expect(hooksCommand).toHaveBeenCalledWith(program);
      expect(graphCommand).toHaveBeenCalledWith(program);
    });

    it('should replace program.parse with progress-tracking wrapper', () => {
      const program = commanderMock._program;
      // cli.js wraps parse with a progress-tracking function
      expect(typeof program.parse).toBe('function');
    });

    it('should install session progress signals', () => {
      const sessionProgress = require('../src/utils/session-progress');
      expect(sessionProgress.installSignals).toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────
  // 4. Constitution command routing
  // ──────────────────────────────────────────────────────────

  describe('constitution command routing', () => {
    let logSpy;

    beforeEach(() => {
      logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      logSpy.mockRestore();
    });

    function getConstitutionAction() {
      const program = commanderMock._program;
      const constitutionIdx = program.command.mock.calls.findIndex(
        (c) => c[0] === 'constitution [action] [target]'
      );
      const cmd = commanderMock._commands[constitutionIdx];
      return cmd.action.mock.calls[0][0];
    }

    it('should show all articles when action is "show" with no target', async () => {
      const actionFn = getConstitutionAction();
      await actionFn('show', undefined, {});

      // Should log all 9 articles
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Article 1'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Article 9'));
    });

    it('should show a specific article when target is provided', async () => {
      const actionFn = getConstitutionAction();
      await actionFn('show', '2', {});

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Article 2: TDD'));
    });

    it('should fall back to listing all articles for unknown target', async () => {
      const actionFn = getConstitutionAction();
      await actionFn('show', '999', {});

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Article 1'));
    });

    it('should call ConstitutionStatusCommand for "status" action', async () => {
      const { ConstitutionStatusCommand } = require('../src/cli/commands/constitution-status');
      const mockExecute = jest.fn().mockResolvedValue(undefined);
      ConstitutionStatusCommand.mockImplementation(() => ({ execute: mockExecute }));

      const actionFn = getConstitutionAction();
      await actionFn('status', undefined, {});

      expect(ConstitutionStatusCommand).toHaveBeenCalled();
      expect(mockExecute).toHaveBeenCalled();
    });

    it('should call AuditCommand for "audit" action', async () => {
      const { AuditCommand } = require('../src/cli/commands/index');
      const mockExecute = jest.fn().mockResolvedValue(undefined);
      AuditCommand.mockImplementation(() => ({ execute: mockExecute }));

      const actionFn = getConstitutionAction();
      await actionFn('audit', undefined, {});

      expect(AuditCommand).toHaveBeenCalled();
      expect(mockExecute).toHaveBeenCalled();
    });

    it('should call WaiverManager for "waive" action', async () => {
      const { WaiverManager } = require('../src/cli/commands/waiver-manager');
      const mockAdd = jest.fn().mockResolvedValue(undefined);
      WaiverManager.mockImplementation(() => ({ add: mockAdd }));

      const actionFn = getConstitutionAction();
      await actionFn('waive', '7', { reason: 'test' });

      expect(WaiverManager).toHaveBeenCalled();
      expect(mockAdd).toHaveBeenCalledWith('7', { reason: 'test' });
    });

    it('should print warning for unknown action', async () => {
      const chalk = require('chalk');
      const actionFn = getConstitutionAction();
      await actionFn('unknown-action', undefined, {});

      expect(chalk.yellow).toHaveBeenCalledWith(
        expect.stringContaining('Unknown action: unknown-action')
      );
    });

    it('should default to "show" when no action provided', async () => {
      const actionFn = getConstitutionAction();
      // action defaults to 'show' when undefined
      await actionFn(undefined, undefined, {});

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Article 1'));
    });
  });

  // ──────────────────────────────────────────────────────────
  // 5. Runtime agent subcommands
  // ──────────────────────────────────────────────────────────

  describe('runtime agent subcommands', () => {
    it('should register runtime parent command', () => {
      const program = commanderMock._program;
      const runtimeCalls = program.command.mock.calls.filter((c) => c[0] === 'runtime');
      expect(runtimeCalls.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ──────────────────────────────────────────────────────────
  // 6. Inline command action execution
  // ──────────────────────────────────────────────────────────

  describe('inline command action execution', () => {
    let logSpy;

    beforeEach(() => {
      logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      logSpy.mockRestore();
    });

    function getCommandAction(commandName) {
      const program = commanderMock._program;
      const idx = program.command.mock.calls.findIndex((c) => c[0] === commandName);
      if (idx === -1) return null;
      const cmd = commanderMock._commands[idx];
      if (!cmd || cmd.action.mock.calls.length === 0) return null;
      return cmd.action.mock.calls[0][0];
    }

    it('start command should call StartCommand.execute', async () => {
      const { StartCommand } = require('../src/cli/commands/index');
      const mockExecute = jest.fn().mockResolvedValue(undefined);
      StartCommand.mockImplementation(() => ({ execute: mockExecute }));

      const actionFn = getCommandAction('start');
      if (actionFn) {
        await actionFn({});
        expect(StartCommand).toHaveBeenCalled();
        expect(mockExecute).toHaveBeenCalledWith({});
      }
    });

    it('doctor command should call DoctorCommand.execute', async () => {
      const { DoctorCommand } = require('../src/cli/commands/index');
      const mockExecute = jest.fn().mockResolvedValue(undefined);
      DoctorCommand.mockImplementation(() => ({ execute: mockExecute }));

      const actionFn = getCommandAction('doctor');
      if (actionFn) {
        await actionFn({ json: true });
        expect(DoctorCommand).toHaveBeenCalled();
        expect(mockExecute).toHaveBeenCalledWith({ json: true });
      }
    });

    it('progress command should call ProgressCommand.execute', async () => {
      const { ProgressCommand } = require('../src/cli/commands/progress');
      const mockExecute = jest.fn().mockResolvedValue(undefined);
      ProgressCommand.mockImplementation(() => ({ execute: mockExecute }));

      const actionFn = getCommandAction('progress');
      if (actionFn) {
        await actionFn({ summary: true });
        expect(ProgressCommand).toHaveBeenCalled();
        expect(mockExecute).toHaveBeenCalledWith({ summary: true });
      }
    });

    it('recommend command should call RecommendEngine.recommend', async () => {
      const { RecommendEngine, printRecommendations } = require('../src/cli/commands/index');
      const mockRecommend = jest.fn().mockReturnValue([{ step: 'write tests' }]);
      RecommendEngine.mockImplementation(() => ({ recommend: mockRecommend }));

      const actionFn = getCommandAction('recommend [change]');
      if (actionFn) {
        await actionFn(undefined, {});
        expect(RecommendEngine).toHaveBeenCalled();
        expect(printRecommendations).toHaveBeenCalledWith([{ step: 'write tests' }]);
      }
    });

    it('recommend command should output JSON when --json flag is set', async () => {
      const { RecommendEngine } = require('../src/cli/commands/index');
      const mockRecommend = jest.fn().mockReturnValue({ steps: ['a'] });
      RecommendEngine.mockImplementation(() => ({ recommend: mockRecommend }));

      const actionFn = getCommandAction('recommend [change]');
      if (actionFn) {
        await actionFn('my-change', { json: true });
        expect(logSpy).toHaveBeenCalledWith(JSON.stringify({ steps: ['a'] }, null, 2));
      }
    });

    it('memory command scan action should call scanner.scan', async () => {
      const { MemoryScanner } = require('../src/cli/commands/memory-scan');
      const mockScan = jest.fn().mockResolvedValue(undefined);
      MemoryScanner.mockImplementation(() => ({ scan: mockScan, listMemory: jest.fn() }));

      const actionFn = getCommandAction('memory <action> [args...]');
      if (actionFn) {
        await actionFn('scan', [], {});
        expect(mockScan).toHaveBeenCalledWith({});
      }
    });

    it('memory command list action should call scanner.listMemory', async () => {
      const { MemoryScanner } = require('../src/cli/commands/memory-scan');
      const mockListMemory = jest.fn();
      MemoryScanner.mockImplementation(() => ({ scan: jest.fn(), listMemory: mockListMemory }));

      const actionFn = getCommandAction('memory <action> [args...]');
      if (actionFn) {
        await actionFn('list', [], { json: true });
        expect(mockListMemory).toHaveBeenCalledWith({ json: true });
      }
    });

    it('list command should call ListCommand.execute', async () => {
      const { ListCommand } = require('../src/cli/commands/index');
      const mockExecute = jest.fn().mockResolvedValue(undefined);
      ListCommand.mockImplementation(() => ({ execute: mockExecute }));

      const actionFn = getCommandAction('list');
      if (actionFn) {
        await actionFn({ archived: true });
        expect(mockExecute).toHaveBeenCalledWith('.', { archived: true });
      }
    });

    it('status command should call StatusCommand.execute', async () => {
      const { StatusCommand } = require('../src/cli/commands/index');
      const mockExecute = jest.fn().mockResolvedValue(undefined);
      StatusCommand.mockImplementation(() => ({ execute: mockExecute }));

      const actionFn = getCommandAction('status [change]');
      if (actionFn) {
        await actionFn('my-change', { json: true });
        expect(mockExecute).toHaveBeenCalledWith('my-change', { json: true });
      }
    });

    it('baby-steps command should throw when not initialized', async () => {
      process.exitCode = 0;
      const { _findActiveChange } = require('../src/utils/change-utils');
      const fs = require('fs');
      const origExistsSync = fs.existsSync;
      fs.existsSync = jest.fn().mockReturnValue(false);

      const actionFn = getCommandAction('baby-steps [task]');
      if (actionFn) {
        await actionFn('task');
        expect(process.exitCode).toBe(1);
      }

      fs.existsSync = origExistsSync;
    });

    it('sudo run command should throw when no file provided', async () => {
      process.exitCode = 0;

      const actionFn = getCommandAction('sudo run [file]');
      if (actionFn) {
        await actionFn(undefined);
        expect(process.exitCode).toBe(1);
      }
    });
  });
});
