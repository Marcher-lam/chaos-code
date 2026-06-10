/**
 * STDD CLI - Hooks Command
 * 管理 AI Code Hook 系统 (支持多引擎环境)
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { getPackageRoot } = require('../../utils/path-resolver');
const os = require('os');
const chalk = require('chalk');

const enginesConfig = require('../../config/engines.json');
const ALL_SUPPORTED_AGENTS = enginesConfig.engines.map(e => e.value);

const SETTINGS_BACKUP_SUFFIX = '.backup';

const GIT_HOOK_SCRIPT = `#!/bin/sh
echo "\\033[1m\\033[36m🛡️ Running STDD Guard...\\033[0m"
npx stdd guard --no-constitution --no-lint
`;

function getDefaultEngine() {
  return enginesConfig.engines.find(e => e.checked) || enginesConfig.engines[0];
}

/**
 * 智能嗅探当前环境，获取所有存活终端的 settings.json 路径
 */
function getSettingsPaths(global = false) {
  const baseDir = global ? os.homedir() : process.cwd();

  try {
    const items = fs.readdirSync(baseDir, { withFileTypes: true });
    const activeAgents = ALL_SUPPORTED_AGENTS.filter(agent =>
      items.some(entry => entry.isDirectory() && entry.name === agent)
    );

    // 如果没有任何引擎，fallback到配置中选中的主要配置
    if (activeAgents.length === 0) {
      return [path.join(baseDir, getDefaultEngine().value, 'settings.json')];
    }

    return activeAgents.map(agent => path.join(baseDir, agent, 'settings.json'));
  } catch (error) {
    return [path.join(baseDir, getDefaultEngine().value, 'settings.json')];
  }
}

/**
 * 读取当前 settings
 */
function readSettings(settingsPath) {
  if (!fs.existsSync(settingsPath)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
  } catch (error) {
    return {};
  }
}

/**
 * 写入 settings
 */
function writeSettings(settingsPath, settings) {
  const dir = path.dirname(settingsPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  // Backup existing settings before overwriting
  if (fs.existsSync(settingsPath)) {
    const backupPath = settingsPath + SETTINGS_BACKUP_SUFFIX;
    try {
      const existing = fs.readFileSync(settingsPath, 'utf8');
      // Only keep one backup; overwrite previous backup
      fs.writeFileSync(backupPath, existing);
    } catch (_) { /* best effort */ }
  }
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

/**
 * 获取 STDD hooks 脚本路径 (全局同一入口)
 */
function getSTDDHooksPath() {
  const packageRoot = getPackageRoot();

  const possiblePaths = [
    // Source tree (development)
    path.join(packageRoot, 'src', 'templates', 'hooks'),
    path.join(packageRoot, 'stdd', 'hooks'),
    ...enginesConfig.engines.map(e => path.join(packageRoot, e.value, 'hooks')),
    // Project tree (runtime)
    ...enginesConfig.engines.map(e => path.join(process.cwd(), e.value, 'hooks')),
    // Global install fallback
    ...enginesConfig.engines.map(e => path.join(os.homedir(), 'stdd-copilot', e.value, 'hooks')),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return null;
}

/**
 * 生成 hooks 配置
 */
function generateHooksConfig(hooksPath, _options = {}) {
  const config = {
    hooks: {
      PreToolUse: [
        {
          matcher: "Edit|Write",
          hooks: [{ type: "command", command: `node ${path.join(hooksPath, 'pre-file-write.js')}` }]
        }
      ],
      PostToolUse: [
        {
          matcher: "Edit|Write",
          hooks: [{ type: "command", command: `node ${path.join(hooksPath, 'post-file-write.js')}` }]
        }
      ]
    }
  };
  return config;
}

function mergeSettings(existingSettings, hooksConfig) {
  const existingHooks = existingSettings.hooks && typeof existingSettings.hooks === 'object'
    ? existingSettings.hooks
    : {};
  const generatedHooks = hooksConfig.hooks && typeof hooksConfig.hooks === 'object'
    ? hooksConfig.hooks
    : {};

  return {
    ...existingSettings,
    ...hooksConfig,
    hooks: {
      ...existingHooks,
      ...generatedHooks
    }
  };
}

/**
 * 安装 hooks
 */
function installHooks(options) {
  const { global = false, force = false } = options;
  const settingsPaths = getSettingsPaths(global);

  console.log(chalk.bold('\n🔧 STDD Hooks 安装\n'));

  const hooksPath = getSTDDHooksPath();
  if (!hooksPath) {
    console.log(chalk.red('❌ 错误: 找不到 STDD hooks 脚本'));
    return false;
  }
  console.log(`📁 Hooks 脚本位置: ${hooksPath}`);

  let successCount = 0;
  let skippedCount = 0;

  for (const settingsPath of settingsPaths) {
    console.log(chalk.cyan(`\n🎯 检测到目标引擎配置: ${settingsPath}`));
    console.log(chalk.dim(`   📝 配置文件: ${settingsPath}`));
    const existingSettings = readSettings(settingsPath);

    if (existingSettings.hooks && !force) {
      console.log(chalk.yellow('   ⚠️ 配置文件已包含 hooks 配置 (跳过)'));
      skippedCount++;
      continue;
    }

    const hooksConfig = generateHooksConfig(hooksPath, options);
    const newSettings = mergeSettings(existingSettings, hooksConfig);

    writeSettings(settingsPath, newSettings);
    console.log(chalk.green('   ✅ Hooks 注入成功!'));
    successCount++;
  }

  if (successCount > 0) {
    console.log(chalk.bold('\n✅ Hooks 安装成功!\n'));
    console.log('已拦截的方法集:');
    console.log('  • PreToolUse: Article 2, 4, 7 (TDD, Style, Security)');
    console.log('  • PostToolUse: Article 5, 6, 8 (Docs, Errors, Performance)');
    if (settingsPaths.length === 1) {
      console.log(`\n配置位置: ${settingsPaths[0]}`);
    } else {
      console.log(`\n配置位置: ${settingsPaths.length} 个配置文件`);
    }
    console.log('\n验证安装: chaos hooks verify');
  } else if (skippedCount > 0) {
    console.log(chalk.yellow('\n⚠️ 目标配置已存在 hooks 配置，未做更改。'));
  }

  return successCount > 0 || skippedCount > 0;
}

/**
 * 从 hook 配置条目中提取脚本路径
 */
function extractScriptPath(hookEntry) {
  if (!hookEntry || typeof hookEntry !== 'object') return null;
  const hooks = hookEntry.hooks;
  if (!Array.isArray(hooks)) return null;
  for (const h of hooks) {
    if (h.command && typeof h.command === 'string') {
      const match = h.command.match(/node\s+(.+?\.js)/);
      if (match) return match[1];
    }
  }
  return null;
}

/**
 * 检查命令字符串是否包含 STDD hooks 标识
 */
function isSTDDHook(command) {
  if (!command || typeof command !== 'string') return false;
  return command.includes('pre-file-write.js') ||
         command.includes('post-file-write.js') ||
         command.includes('stdd-guard');
}

/**
 * 验证单个 settings 文件的 hook 状态
 * 返回: { status: 'active' | 'not-installed' | 'broken', details: { pre: ..., post: ... } }
 */
function verifySettingsFile(settingsPath) {
  const settings = readSettings(settingsPath);

  if (!settingsPath || !fs.existsSync(settingsPath)) {
    return {
      status: 'not-installed',
      settingsPath,
      pre: { status: 'not-installed', scriptPath: null },
      post: { status: 'not-installed', scriptPath: null }
    };
  }

  if (!settings.hooks || typeof settings.hooks !== 'object') {
    return {
      status: 'not-installed',
      settingsPath,
      pre: { status: 'not-installed', scriptPath: null },
      post: { status: 'not-installed', scriptPath: null }
    };
  }

  const preEntries = settings.hooks.PreToolUse || [];
  const postEntries = settings.hooks.PostToolUse || [];

  let preResult = { status: 'not-installed', scriptPath: null };
  let postResult = { status: 'not-installed', scriptPath: null };

  // 检查 PreToolUse
  for (const entry of (Array.isArray(preEntries) ? preEntries : [])) {
    if (isSTDDHook(entry?.hooks?.[0]?.command)) {
      const scriptPath = extractScriptPath(entry);
      if (scriptPath && fs.existsSync(scriptPath)) {
        preResult = { status: 'active', scriptPath };
      } else if (scriptPath) {
        preResult = { status: 'broken', scriptPath };
      }
      break;
    }
  }

  // 检查 PostToolUse
  for (const entry of (Array.isArray(postEntries) ? postEntries : [])) {
    if (isSTDDHook(entry?.hooks?.[0]?.command)) {
      const scriptPath = extractScriptPath(entry);
      if (scriptPath && fs.existsSync(scriptPath)) {
        postResult = { status: 'active', scriptPath };
      } else if (scriptPath) {
        postResult = { status: 'broken', scriptPath };
      }
      break;
    }
  }

  // 整体状态判定
  const allActive = preResult.status === 'active' && postResult.status === 'active';
  const anyBroken = preResult.status === 'broken' || postResult.status === 'broken';
  const allMissing = preResult.status === 'not-installed' && postResult.status === 'not-installed';

  let overallStatus;
  if (allActive) overallStatus = 'active';
  else if (anyBroken) overallStatus = 'broken';
  else if (allMissing) overallStatus = 'not-installed';
  else overallStatus = 'broken';

  return {
    status: overallStatus,
    settingsPath,
    pre: preResult,
    post: postResult
  };
}

/**
 * 格式化验证结果输出
 */
function formatVerificationResult(results) {
  const lines = [];

  lines.push(chalk.bold('\n🔍 验证 STDD Hooks 安装\n'));

  for (const result of results) {
    lines.push(chalk.cyan(`\n📂 检查引擎: ${result.settingsPath}`));

    const preIcon = result.pre.status === 'active' ? chalk.green('✅') :
                    result.pre.status === 'broken' ? chalk.yellow('⚠️') :
                    chalk.red('❌');
    const preLabel = result.pre.status === 'active' ? 'Active' :
                     result.pre.status === 'broken' ? 'Broken' : 'Not Installed';
    const preDetail = result.pre.scriptPath ? ` (${result.pre.scriptPath})` : '';
    lines.push(`  ${preIcon} PreToolUse Hook: ${chalk.bold(preLabel)}${preDetail}`);

    const postIcon = result.post.status === 'active' ? chalk.green('✅') :
                     result.post.status === 'broken' ? chalk.yellow('⚠️') :
                     chalk.red('❌');
    const postLabel = result.post.status === 'active' ? 'Active' :
                      result.post.status === 'broken' ? 'Broken' : 'Not Installed';
    const postDetail = result.post.scriptPath ? ` (${result.post.scriptPath})` : '';
    lines.push(`  ${postIcon} PostToolUse Hook: ${chalk.bold(postLabel)}${postDetail}`);
  }

  const allActive = results.every(r => r.status === 'active');
  const anyBroken = results.some(r => r.status === 'broken');
  const allMissing = results.every(r => r.status === 'not-installed');

  lines.push('');
  if (allActive) {
    lines.push(chalk.green('✅ 该环境下所有引擎 Hooks 验证通过!'));
  } else if (anyBroken) {
    lines.push(chalk.yellow('⚠️ 部分 Hook 脚本路径无效 (Broken)，请运行: chaos hooks install --force'));
  } else if (allMissing) {
    lines.push(chalk.red('❌ Hooks 未安装，请运行: chaos hooks install'));
  } else {
    lines.push(chalk.red('❌ 部分验证失败，请运行: chaos hooks install --force'));
  }

  return lines.join('\n');
}

/**
 * 验证 hooks 安装
 */
function verifyHooks(options) {
  const { global = false } = options;

  const settingsPaths = getSettingsPaths(global);
  const results = settingsPaths.map(sp => verifySettingsFile(sp));

  const output = formatVerificationResult(results);
  console.log(output);

  return results.every(r => r.status === 'active');
}

/**
 * 禁用 hooks
 */
function disableHooks(options) {
  const { global = false, article = null } = options;
  console.log(chalk.bold('\n⏸️  禁用 STDD Hooks\n'));

  const settingsPaths = getSettingsPaths(global);

  if (article) {
    console.log(chalk.yellow('⚠️ 部分禁用暂不支持，建议设置环境变量: STDD_HOOKS_DISABLED=1'));
    return true;
  }

  let disabledCount = 0;
  for (const settingsPath of settingsPaths) {
    const settings = readSettings(settingsPath);
    if (!settings.hooks) continue;

    const backupPath = settingsPath + SETTINGS_BACKUP_SUFFIX;
    fs.copyFileSync(settingsPath, backupPath);
    console.log(chalk.green(`📦 [备份] ${backupPath}`));

    delete settings.hooks;
    writeSettings(settingsPath, settings);
    console.log(chalk.green(`✅ [禁用] ${settingsPath}`));
    disabledCount++;
  }

  if (disabledCount === 0) {
    console.log(chalk.yellow('⚠️ 未发现可禁用的 Hooks 配置。'));
  }

  return disabledCount > 0;
}

/**
 * 启用 hooks
 */
function enableHooks(options) {
  const { global = false } = options;
  console.log(chalk.bold('\n▶️  启用 STDD Hooks\n'));

  const settingsPaths = getSettingsPaths(global);

  let restoredCount = 0;
  let needsReinstall = false;

  for (const settingsPath of settingsPaths) {
    const backupPath = settingsPath + SETTINGS_BACKUP_SUFFIX;
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, settingsPath);
      fs.unlinkSync(backupPath);
      console.log(chalk.green(`✅ [恢复] ${settingsPath}`));
      restoredCount++;
    } else {
      needsReinstall = true;
    }
  }

  if (needsReinstall) {
    console.log(chalk.yellow('⚠️ 部分配置缺少备份，将重新安装 Hooks。'));
    installHooks({ ...options, force: true });
  } else if (restoredCount === 0) {
    console.log(chalk.yellow('⚠️ 没有找到备份文件，将重新安装 Hooks。'));
    installHooks({ ...options, force: true });
  }

  return true;
}

/**
 * 显示 hooks 状态
 */
function statusHooks(options) {
  const { global = false } = options;
  console.log(chalk.bold('\n📊 STDD Hooks 状态\n'));

  const settingsPaths = getSettingsPaths(global);

  for (const settingsPath of settingsPaths) {
    console.log(chalk.cyan(`\n🔧 引擎配置: ${settingsPath}`));
    const settings = readSettings(settingsPath);
    const backupPath = settingsPath + '.backup';
    const backupExists = fs.existsSync(backupPath);

    if (settings.hooks) {
      if (process.env.STDD_HOOKS_DISABLED === '1') {
        console.log(chalk.yellow('  状态: ⏸️  当前会话已禁用'));
      } else {
        console.log(chalk.green('  状态: ✅ 已启用'));
      }
    } else if (backupExists) {
      console.log(chalk.yellow('  状态: ⏸️  已禁用 (存在备份)'));
    } else {
      console.log(chalk.yellow('  状态: ⏸️  未配置'));
    }
  }
  return true;
}

/**
 * 检查项目是否使用 husky
 */
function hasHusky(cwd) {
  const pkgPath = path.join(cwd || process.cwd(), 'package.json');
  if (!fs.existsSync(pkgPath)) {
    return false;
  }
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const deps = {
      ...((pkg && pkg.dependencies) || {}),
      ...((pkg && pkg.devDependencies) || {}),
    };
    return !!deps.husky;
  } catch (error) {
    return false;
  }
}

/**
 * 安装 Git pre-commit hook
 */
function installGitHooks(options) {
  const cwd = options.cwd || process.cwd();
  const usesHusky = hasHusky(cwd);

  console.log(chalk.bold('\n🔧 STDD Git Hook 安装\n'));

  if (usesHusky) {
    console.log(chalk.cyan('检测到 Husky，写入 .husky/pre-commit'));
    const huskyDir = path.join(cwd, '.husky');
    if (!fs.existsSync(huskyDir)) {
      fs.mkdirSync(huskyDir, { recursive: true });
    }
    const hookPath = path.join(huskyDir, 'pre-commit');
    fs.writeFileSync(hookPath, GIT_HOOK_SCRIPT);
    fs.chmodSync(hookPath, 0o755);
    console.log(chalk.green(`✅ Git Hook 已写入: ${hookPath}`));
  } else {
    console.log(chalk.cyan('未检测到 Husky，写入 .git/hooks/pre-commit'));
    const gitHooksDir = path.join(cwd, '.git', 'hooks');
    if (!fs.existsSync(gitHooksDir)) {
      console.log(chalk.yellow('⚠️ .git/hooks 目录不存在，尝试初始化 git...'));
      try {
        const result = spawnSync('git', ['init'], { cwd, stdio: 'pipe' });
        if (result.status !== 0 || result.error) {
          throw result.error || new Error(String(result.stderr || result.stdout || 'git init failed'));
        }
      } catch (error) {
        console.log(chalk.red('❌ 无法初始化 git 仓库，请手动运行 git init'));
        return false;
      }
    }
    const hookPath = path.join(gitHooksDir, 'pre-commit');
    fs.writeFileSync(hookPath, GIT_HOOK_SCRIPT);
    fs.chmodSync(hookPath, 0o755);
    console.log(chalk.green(`✅ Git Hook 已写入: ${hookPath}`));
  }

  console.log(chalk.bold('\n✅ Git Hook 安装完成!\n'));
  return true;
}

/**
 * 验证 Git pre-commit hook 是否存在
 */
function verifyGitHooks(options) {
  const cwd = options.cwd || process.cwd();
  const usesHusky = hasHusky(cwd);

  console.log(chalk.bold('\n🔍 验证 STDD Git Hook\n'));

  let hookPath;
  if (usesHusky) {
    hookPath = path.join(cwd, '.husky', 'pre-commit');
  } else {
    hookPath = path.join(cwd, '.git', 'hooks', 'pre-commit');
  }

  if (!fs.existsSync(hookPath)) {
    console.log(chalk.red(`❌ Git Hook 不存在: ${hookPath}`));
    console.log(chalk.yellow('请运行: chaos hooks install --git'));
    return false;
  }

  const content = fs.readFileSync(hookPath, 'utf-8');
  if (content.includes('stdd guard')) {
    console.log(chalk.green(`✅ Git Hook 已安装: ${hookPath}`));
    console.log(chalk.dim(`   内容包含 "stdd guard" 检查`));
    return true;
  } else {
    console.log(chalk.yellow(`⚠️ Hook 文件存在但不包含 stdd guard: ${hookPath}`));
    return false;
  }
}

/**
 * 导出命令处理函数
 */
module.exports = function(program) {
  const hooks = program.command('hooks')
    .description('管理 STDD Hook 系统 (多引擎适配版)')
    .addHelpText('after', `
Examples:
  chaos hooks install
  chaos hooks verify
  chaos hooks status
  chaos hooks disable --article 2
  chaos hooks enable
`);

  hooks.command('install')
    .description('自动嗅探并安装 STDD Hooks 到所有活跃引擎')
    .option('-g, --global', '安装到全局配置')
    .option('-f, --force', '强制覆盖现有配置')
    .option('--git', '同时安装 Git pre-commit hook')
    .addHelpText('after', `
Examples:
  chaos hooks install
  chaos hooks install --global
  chaos hooks install --force
  chaos hooks install --git
`)
    .action((options) => {
      installHooks(options);
      if (options.git) {
        installGitHooks(options);
      }
    });

  hooks.command('verify')
    .description('验证各个引擎内的 Hooks 安装')
    .option('-g, --global', '验证全局配置')
    .option('--git', '同时验证 Git pre-commit hook')
    .addHelpText('after', `
Examples:
  chaos hooks verify
  chaos hooks verify --global
  chaos hooks verify --git
`)
    .action((options) => {
      const aiOk = verifyHooks(options);
      if (options.git) {
        const gitOk = verifyGitHooks(options);
        if (!aiOk || !gitOk) process.exitCode = 1;
      } else {
        if (!aiOk) process.exitCode = 1;
      }
    });

  hooks.command('disable')
    .description('禁用选定范围内的 Hooks')
    .option('-g, --global', '禁用全局配置')
    .option('--article <n>', '禁用特定条例')
    .addHelpText('after', `
Examples:
  chaos hooks disable
  chaos hooks disable --global
  chaos hooks disable --article 4

\`--article\` currently keeps compatibility semantics and disables the configured hooks set.
`)
    .action((options) => disableHooks(options));

  hooks.command('enable')
    .description('恢复并启用 Hooks')
    .option('-g, --global', '启用全局配置')
    .addHelpText('after', `
Examples:
  chaos hooks enable
  chaos hooks enable --global
`)
    .action((options) => enableHooks(options));

  hooks.command('status')
    .description('显示所有支持引擎的 Hooks 状态')
    .option('-g, --global', '显示全局状态')
    .addHelpText('after', `
Examples:
  chaos hooks status
  chaos hooks status --global
`)
    .action((options) => statusHooks(options));
};

module.exports.getDefaultEngine = getDefaultEngine;
module.exports.getSettingsPaths = getSettingsPaths;
module.exports.readSettings = readSettings;
module.exports.writeSettings = writeSettings;
module.exports.getSTDDHooksPath = getSTDDHooksPath;
module.exports.generateHooksConfig = generateHooksConfig;
module.exports.mergeSettings = mergeSettings;
module.exports.installHooks = installHooks;
module.exports.verifyHooks = verifyHooks;
module.exports.disableHooks = disableHooks;
module.exports.enableHooks = enableHooks;
module.exports.statusHooks = statusHooks;
module.exports.extractScriptPath = extractScriptPath;
module.exports.isSTDDHook = isSTDDHook;
module.exports.verifySettingsFile = verifySettingsFile;
module.exports.formatVerificationResult = formatVerificationResult;
module.exports.hasHusky = hasHusky;
module.exports.installGitHooks = installGitHooks;
module.exports.verifyGitHooks = verifyGitHooks;
