/**
 * @typedef {Object} ChangeOptions
 * @property {string} [title] - Change title
 * @property {string} [workspace] - Workspace scope
 */

/**
 * @typedef {Object} ApplyOptions
 * @property {string} [task] - Task ID to apply
 * @property {boolean} [dryRun] - Show what would be done
 * @property {string} [testCommand] - Custom test command
 * @property {boolean} [delegate] - Write cross-model delegation evidence on failure
 * @property {string} [e2eCommand] - Run E2E probe
 * @property {string} [workspace] - Workspace scope
 */

/**
 * @typedef {Object} VerifyOptions
 * @property {boolean} [constitution] - Skip constitution check
 * @property {boolean} [lint] - Run lint check
 * @property {string} [lintCommand] - Custom lint command
 * @property {string} [testCommand] - Custom test command
 * @property {string} [workspace] - Workspace scope
 */

/**
 * @typedef {Object} WorkspaceInfo
 * @property {string} name - Workspace name
 * @property {string} root - Workspace root directory
 * @property {string} sourceDir - Source directory
 * @property {string} packageJson - Path to package.json
 */

/**
 * @typedef {Object} EvidenceReport
 * @property {string} type - Report type (verify, guard, mutation)
 * @property {string} id - Report ID
 * @property {string} timestamp - ISO timestamp
 * @property {Object} results - Verification results
 * @property {Object} metadata - Additional metadata
 * @property {string} status - Overall status (pass, fail, warn)
 */

/**
 * @typedef {Object} GraphNode
 * @property {string} name - Node name
 * @property {string} description - Node description
 * @property {string} phase - Execution phase
 * @property {string[]} inputs - Input files
 * @property {string[]} outputs - Output files
 * @property {string[]} [next] - Next nodes
 * @property {Object} metadata - Node metadata
 */

/**
 * @typedef {Object} GraphDefinition
 * @property {string} version - Graph version
 * @property {string} name - Graph name
 * @property {Object} config - Graph configuration
 * @property {Object.<string, GraphNode>} skills - Skill nodes
 */

/**
 * @typedef {Object} ConstitutionArticle
 * @property {number} n - Article number
 * @property {string} name - Article name
 * @property {string} priority - Priority level (Blocking, Warning, Suggestion)
 * @property {string} desc - Description
 * @property {string} enforcement - Enforcement method
 */

/**
 * @typedef {Object} MutationResult
 * @property {number} score - Mutation score
 * @property {number} threshold - Score threshold
 * @property {string} status - Status (pass, fail)
 * @property {number} assertions - Number of assertions
 * @property {number} placeholders - Number of placeholder assertions
 * @property {number} emptyTests - Number of empty tests
 */

/**
 * @typedef {Object} GuardReport
 * @property {Object} constitution - Constitution check results
 * @property {Object} lint - Lint check results
 * @property {Object} coverage - Coverage check results
 * @property {Object} testCommands - Test command detection results
 * @property {Object} mutation - Mutation evidence results
 */

/**
 * @typedef {Object} TechStackInfo
 * @property {string} language - Detected language (node, python, rust, go, unknown)
 * @property {string} testRunner - Test runner name (jest, vitest, pytest, cargo, unknown)
 * @property {string} framework - Framework name (react, express, fastify, nestjs, unknown)
 * @property {string} testCommand - Resolved test command string
 */

/**
 * @typedef {Object} TaskInfo
 * @property {number} index - Line index in tasks.md
 * @property {string} line - Raw line content
 * @property {string} prefix - Checkbox prefix (e.g. '- ')
 * @property {string} status - Status character (' ', '~', 'x')
 * @property {string} description - Task description text
 * @property {boolean} isDone - Whether the task is completed
 * @property {string} raw - Raw match string
 */

/**
 * @typedef {Object} TasksCompletion
 * @property {boolean} allDone - Whether all tasks are completed
 * @property {number} total - Total number of tasks
 * @property {number} done - Number of completed tasks
 * @property {string[]} pending - Descriptions of pending tasks
 */

/**
 * @typedef {Object} CommandResult
 * @property {number} status - Exit code (0 = success)
 * @property {string} stdout - Standard output
 * @property {string} stderr - Standard error
 * @property {string[]} args - Parsed arguments
 * @property {string} bin - Binary name
 */

/**
 * @typedef {Object} AgentTurn
 * @property {string} speakerId - Agent identifier (e.g. 'po', 'arch', 'dev', 'qa')
 * @property {string} timestamp - ISO timestamp
 * @property {string} content - Turn content text
 */

/**
 * @typedef {Object} AgentState
 * @property {string} status - Simulation status (idle, active, completed, stopped)
 * @property {string} topic - Current discussion topic
 * @property {Object[]} agents - Participating agents
 * @property {number} currentSpeakerIndex - Index of current speaker
 * @property {number} round - Current round number
 * @property {number} maxRounds - Maximum allowed rounds
 * @property {boolean} convergenceDetected - Whether convergence was detected
 */

/**
 * @typedef {Object} EvidenceEvent
 * @property {string} event_id - Unique event identifier
 * @property {string} timestamp - ISO timestamp
 * @property {string} type - Event type from EVENT_TYPES
 * @property {string} trace_id - Distributed trace identifier
 * @property {string} span_id - Span identifier
 * @property {string} [change_name] - Associated change name
 * @property {string} [phase] - TDD phase (red, green, refactor)
 * @property {string} [status] - Event status (passed, failed, skipped)
 * @property {string} [command] - Executed command
 * @property {number} [duration_ms] - Duration in milliseconds
 */

/**
 * @typedef {Object} ProfileConfig
 * @property {string} id - Profile identifier (quick, standard, thorough, enterprise)
 * @property {string} name - Display name
 * @property {string} description - Short description
 * @property {number} depth - Planning depth level (1-4)
 * @property {Object} phases - Phase configuration with skip/include arrays
 */

/**
 * @typedef {Object} ParallelGroup
 * @property {string[]} skills - Skill names in this group
 * @property {('all'|'any'|'race')} strategy - Execution strategy
 * @property {boolean} passed - Whether the group passed its strategy
 * @property {number} successCount - Number of succeeded skills
 * @property {number} totalCount - Total skills in group
 */

/**
 * @typedef {Object} SecurityScanResult
 * @property {Array<{name: string, line: number}>} secrets - Detected secrets
 * @property {string} sanitized - Sanitized input string
 * @property {boolean} pathSafe - Whether a path passes safety checks
 * @property {string} redacted - Redacted output string
 */

/**
 * @typedef {Object} SudoLangArtifact
 * @property {string} [spec] - Auto-generated spec from goals
 * @property {string} [design] - Architecture constraints document
 * @property {string} [apispec] - Interface definitions JSON
 */

/**
 * @typedef {Object} SudoLangParseResult
 * @property {string} extractedAt - ISO timestamp
 * @property {number} complexityScore - Sum of all parsed elements
 * @property {Object[]} interfaces - Parsed interface definitions
 * @property {Object[]} constraints - Parsed constraints
 * @property {Object[]} commands - Parsed commands
 * @property {Object[]} goals - Parsed goals
 * @property {string[]} raw - Raw non-comment lines
 */

/**
 * @typedef {Object} BrowserSnapshot
 * @property {string} status - Result status (success)
 * @property {string} filePath - Screenshot file path
 * @property {string} relativePath - Path relative to cwd
 * @property {string} url - Final page URL
 * @property {string} title - Page title
 * @property {number} timestamp - Timestamp of snapshot
 */

const TASK_STATUS = {
  PENDING: ' ',
  IN_PROGRESS: '~',
  DONE: 'x',
};

const GUARD_STATUS = {
  PASS: 'pass',
  FAIL: 'fail',
  WARN: 'warn',
  SKIP: 'skip',
};

const CHANGE_PHASES = {
  PROPOSAL: 'Phase 1: Proposal',
  SPECIFICATION: 'Phase 2: Specification',
  DESIGN: 'Phase 3: Design',
  IMPLEMENTATION: 'Phase 4: Implementation',
  VERIFICATION: 'Phase 5: Verification',
  COMPLETE: 'Phase 6: Complete',
};

module.exports = { TASK_STATUS, GUARD_STATUS, CHANGE_PHASES };
