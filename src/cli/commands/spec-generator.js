/**
 * Spec Generator
 * Auto-generate BDD *.feature files from tasks.md
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { resolveWorkspace } = require('../../utils/workspace-detector');
const { resolveChangeDir } = require('../../utils/change-utils');

class SpecGenerator {
  constructor() {
    this.keywordTemplates = {
      login: {
        feature: 'User Login',
        given: [
          'Given a valid user exists in the system',
          'And the user is on the login page'
        ],
        when: [
          'When the user enters valid credentials',
          'And submits the login form'
        ],
        then: [
          'Then the user is redirected to the dashboard',
          'And an authentication token is issued'
        ]
      },
      logout: {
        feature: 'User Logout',
        given: [
          'Given a user is logged in'
        ],
        when: [
          'When the user clicks the logout button'
        ],
        then: [
          'Then the session is terminated',
          'And the user is redirected to the login page'
        ]
      },
      register: {
        feature: 'User Registration',
        given: [
          'Given the user is on the registration page'
        ],
        when: [
          'When the user fills in valid registration details',
          'And submits the registration form'
        ],
        then: [
          'Then a new user account is created',
          'And a confirmation email is sent'
        ]
      },
      create: {
        feature: 'Create Resource',
        given: [
          'Given the user is authenticated',
          'And the user has permission to create resources'
        ],
        when: [
          'When the user submits valid creation data'
        ],
        then: [
          'Then the resource is created successfully',
          'And the resource ID is returned'
        ]
      },
      delete: {
        feature: 'Delete Resource',
        given: [
          'Given the user is authenticated',
          'And the resource exists'
        ],
        when: [
          'When the user requests to delete the resource'
        ],
        then: [
          'Then the resource is deleted',
          'And a success confirmation is returned'
        ]
      },
      update: {
        feature: 'Update Resource',
        given: [
          'Given the user is authenticated',
          'And the resource exists'
        ],
        when: [
          'When the user submits valid update data'
        ],
        then: [
          'Then the resource is updated',
          'And the updated resource is returned'
        ]
      },
      list: {
        feature: 'List Resources',
        given: [
          'Given the user is authenticated'
        ],
        when: [
          'When the user requests the resource list'
        ],
        then: [
          'Then a list of resources is returned',
          'And the list is paginated'
        ]
      },
      search: {
        feature: 'Search Resources',
        given: [
          'Given resources exist in the system'
        ],
        when: [
          'When the user searches with valid criteria'
        ],
        then: [
          'Then matching resources are returned',
          'And the results are sorted by relevance'
        ]
      },
      payment: {
        feature: 'Process Payment',
        given: [
          'Given the user has items in their cart',
          'And the user proceeds to checkout'
        ],
        when: [
          'When the user submits valid payment information'
        ],
        then: [
          'Then the payment is processed',
          'And an order confirmation is generated'
        ]
      },
      upload: {
        feature: 'Upload File',
        given: [
          'Given the user is authenticated',
          'And the file is within size limits'
        ],
        when: [
          'When the user uploads the file'
        ],
        then: [
          'Then the file is stored successfully',
          'And a download URL is returned'
        ]
      },
      download: {
        feature: 'Download File',
        given: [
          'Given the file exists',
          'And the user has access permission'
        ],
        when: [
          'When the user requests to download the file'
        ],
        then: [
          'Then the file is downloaded successfully'
        ]
      }
    };
    this.defaultTemplate = {
      feature: 'Feature',
      given: [
        'Given the system is ready'
      ],
      when: [
        'When the user performs the action'
      ],
      then: [
        'Then the result is expected'
      ]
    };
  }

  async ensureChangesDir(changeName) {
    const changesDir = path.join(process.cwd(), 'stdd', 'changes');
    try {
      await fs.access(changesDir);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('STDD not initialized. Run `stdd init` first.');
      }
      throw error;
    }

    const changeDir = resolveChangeDir(path.join(process.cwd(), 'stdd'), changeName, { mustExist: false });
    try {
      await fs.access(changeDir);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Change '${changeName}' does not exist in stdd/changes/.`);
      }
      throw error;
    }

    return changeDir;
  }

  parseTasks(content) {
    const tasks = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const match = line.match(/- \[[ xX]\]\s*(TASK-\d+):\s*(.+)/);
      if (match) {
        tasks.push({
          id: match[1],
          description: match[2].trim()
        });
      }
    }

    return tasks;
  }

  toTitleCase(str) {
    return str
      .trim()
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .replace(/ /g, '');
  }

  toFeatureTitle(str) {
    return str
      .trim()
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  toSafeFilename(str) {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  workspaceContext(workspace) {
    if (!workspace) return null;
    const root = path.relative(process.cwd(), workspace.root).replace(/\\/g, '/') || workspace.name;
    return {
      name: workspace.name,
      path: root,
      tag: this.toSafeFilename(root),
    };
  }

  matchTemplate(description) {
    const lower = description.toLowerCase();
    for (const [keyword, template] of Object.entries(this.keywordTemplates)) {
      if (lower.includes(keyword)) {
        return template;
      }
    }
    return null;
  }

  generateFeatureContent(task, workspace = null) {
    const template = this.matchTemplate(task.description);
    const featureTitle = this.toFeatureTitle(task.description);
    const scenarioTitle = featureTitle;
    const workspaceMeta = this.workspaceContext(workspace);

    let givenSteps;
    let whenSteps;
    let thenSteps;

    if (template) {
      givenSteps = template.given;
      whenSteps = template.when;
      thenSteps = template.then;
    } else {
      givenSteps = this.defaultTemplate.given;
      whenSteps = this.defaultTemplate.when;
      thenSteps = this.defaultTemplate.then;
    }

    const stripKeyword = (s) => s.replace(/^(Given|When|Then|And)\s+/, '');
    const givenLines = givenSteps.map((s, i) => i === 0 ? `  Given ${stripKeyword(s)}` : `  And ${stripKeyword(s)}`).join('\n');
    const whenLines = whenSteps.map((s, i) => i === 0 ? `  When ${stripKeyword(s)}` : `  And ${stripKeyword(s)}`).join('\n');
    const thenLines = thenSteps.map((s, i) => i === 0 ? `  Then ${stripKeyword(s)}` : `  And ${stripKeyword(s)}`).join('\n');

    const metadataLines = [`# Task: ${task.id} - ${task.description}`];
    if (workspaceMeta) metadataLines.push(`# Workspace: ${workspaceMeta.path}`);
    const tags = [`@${task.id.toLowerCase()}`];
    if (workspaceMeta) tags.push(`@workspace:${workspaceMeta.tag}`);

    return `${metadataLines.join('\n')}

Feature: ${featureTitle}
  As a user
  I want to ${task.description.toLowerCase()}
  So that I can achieve my goal

  ${tags.join(' ')}
  Scenario: ${scenarioTitle}
${givenLines}
${whenLines}
${thenLines}
`;
  }

  async generateFromTasks(changeName, options = {}) {
    const changeDir = await this.ensureChangesDir(changeName);
    const workspace = options.workspace ? resolveWorkspace(process.cwd(), options.workspace) : null;
    if (options.workspace && !workspace) {
      throw new Error(`Workspace '${options.workspace}' not found.`);
    }
    const workspaceMeta = this.workspaceContext(workspace);
    const tasksPath = path.join(changeDir, 'tasks.md');

    let tasksContent;
    try {
      tasksContent = await fs.readFile(tasksPath, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`tasks.md not found in change '${changeName}'.`);
      }
      throw error;
    }

    const tasks = this.parseTasks(tasksContent);
    if (tasks.length === 0) {
      throw new Error(`No tasks found in tasks.md for change '${changeName}'.`);
    }

    const specsDir = path.join(changeDir, 'specs');
    await fs.mkdir(specsDir, { recursive: true });

    const generated = [];
    const skipped = [];

    for (const task of tasks) {
      const baseFilename = this.toSafeFilename(task.description);
      const filename = workspaceMeta ? `${workspaceMeta.tag}-${baseFilename}` : baseFilename;
      const featurePath = path.join(specsDir, `${filename}.feature`);

      if (fsSync.existsSync(featurePath)) {
        skipped.push({
          id: task.id,
          description: task.description,
          file: `${filename}.feature`
        });
        continue;
      }

      const content = this.generateFeatureContent(task, workspace);
      await fs.writeFile(featurePath, content, 'utf8');
      generated.push({
        id: task.id,
        description: task.description,
        file: `${filename}.feature`
      });
    }

    return { generated, skipped, workspace: workspaceMeta };
  }
}

module.exports = { SpecGenerator };
