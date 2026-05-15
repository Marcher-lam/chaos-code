# STDD Copilot 实测示例：在 STDD-TEST 跑通一次变更闭环

本文档基于 `/Users/marcher/Desktop/STDD-TEST` 的真实执行结果重写。目标不是展示概念，而是给出一套可以复现的最小流程：初始化项目、创建变更、生成规格、执行任务、生成 mutation evidence、验证、推荐下一步、归档。

本示例直接调用仓库内 CLI，避免依赖全局 `npm link`：

```bash
node "/Users/marcher/Desktop/stdd-copliot/cli.js" <command>
```

如果已经执行过 `npm link`，可替换为：

```bash
stdd <command>
```

## 1. 准备测试项目

测试目录：

```bash
cd /Users/marcher/Desktop/STDD-TEST
```

本次实测创建了一个最小 Node.js 项目：

```text
STDD-TEST/
├── package.json
├── src/calculator.js
└── test/calculator.test.js
```

`package.json`：

```json
{
  "name": "stdd-test-demo",
  "version": "0.1.0",
  "private": true,
  "type": "commonjs",
  "scripts": {
    "test": "node --test"
  }
}
```

初始 `src/calculator.js`：

```js
function add(a, b) {
  return a + b;
}

function subtract(a, b) {
  return a - b;
}

module.exports = { add, subtract };
```

初始 `test/calculator.test.js`：

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { add, subtract } = require('../src/calculator');

test('add returns the sum of two numbers', () => {
  assert.equal(add(2, 3), 5);
});

test('subtract returns the difference of two numbers', () => {
  assert.equal(subtract(7, 4), 3);
});
```

基线测试：

```bash
npm test
```

实测结果：`tests 2`，`pass 2`，`fail 0`。

## 2. 初始化 STDD

```bash
node "/Users/marcher/Desktop/stdd-copliot/cli.js" init --skip-skills --yes
```

实测输出要点：

```text
STDD Copilot initialized!
Tech stack: Node.js project
Enabled engines: .claude
```

生成的关键结构：

```text
stdd/
├── changes/
├── specs/
├── memory/foundation.md
└── config.yaml
AGENTS.md
.github/
```

`stdd/config.yaml` 自动识别测试命令：

```yaml
test:
  command: "npm test"
  runner: "unknown"
```

## 3. 创建变更

本次目标：为 `calculator` 增加乘法能力。

```bash
node "/Users/marcher/Desktop/stdd-copliot/cli.js" ff "为 calculator 增加乘法能力" --change-name add-multiply
```

实测输出：

```text
Fast-forward change 'add-multiply' created at stdd/changes/add-multiply/
Next steps:
  stdd apply add-multiply
```

生成目录：

```text
stdd/changes/add-multiply/
├── proposal.md
├── specs/
└── tasks.md
```

生成的 `tasks.md`：

```md
# Tasks

- [ ] TASK-001: 环境准备与脚手架搭建
- [ ] TASK-002: 为 calculator 增加乘法能力 核心逻辑实现
- [ ] TASK-003: 单元测试编写与验证
```

## 4. 生成规格

```bash
node "/Users/marcher/Desktop/stdd-copliot/cli.js" spec add-multiply
```

实测后生成：

```text
stdd/changes/add-multiply/specs/
├── .feature
└── calculator.feature
```

注意：本次观察到 `spec` 会生成一个隐藏文件 `specs/.feature`。这不阻塞流程，但说明 `SpecGenerator` 需要增加空文件名兜底，避免生成隐藏 feature 文件。

## 5. dry-run apply

```bash
node "/Users/marcher/Desktop/stdd-copliot/cli.js" apply add-multiply --dry-run
```

实测输出：

```text
Applying task in add-multiply:
  TASK-001: 环境准备与脚手架搭建

Dry run mode — no commands will execute.
Test command would run (root, .): npm test
```

dry-run 用于确认 STDD 将运行什么测试命令，不修改任务状态。

## 6. 执行第一个任务

```bash
node "/Users/marcher/Desktop/stdd-copliot/cli.js" apply add-multiply
```

实测结果：

```text
Running root: npm test
tests 2
pass 2
Task passed tests
```

第一个任务会从 `[ ]` 更新为 `[x]`。

## 7. 实现功能并继续 apply

将 `src/calculator.js` 改为：

```js
function add(a, b) {
  return a + b;
}

function subtract(a, b) {
  return a - b;
}

function multiply(a, b) {
  return a * b;
}

module.exports = { add, subtract, multiply };
```

将 `test/calculator.test.js` 改为：

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { add, subtract, multiply } = require('../src/calculator');

test('add returns the sum of two numbers', () => {
  assert.equal(add(2, 3), 5);
});

test('subtract returns the difference of two numbers', () => {
  assert.equal(subtract(7, 4), 3);
});

test('multiply returns the product of two numbers', () => {
  assert.equal(multiply(3, 4), 12);
});
```

继续执行剩余任务：

```bash
node "/Users/marcher/Desktop/stdd-copliot/cli.js" apply add-multiply
node "/Users/marcher/Desktop/stdd-copliot/cli.js" apply add-multiply
```

实测结果：

```text
TASK-002 ... Task passed tests
TASK-003 ... Task passed tests
tests 3
pass 3
```

## 8. 生成 mutation evidence

```bash
node "/Users/marcher/Desktop/stdd-copliot/cli.js" mutation add-multiply --threshold 50
```

实测输出：

```text
Mutation Gate
  Mode:        quick
  Score:       77% (threshold 50%)
  Assertions:  3
  Placeholders:0
  Status:      PASS
  Evidence:    stdd/changes/add-multiply/evidence/mutation-1778650844136.json
```

说明：`quick` mutation 是启发式测试质量检查，不等同于完整 Stryker mutation。这里使用 `--threshold 50`，是为了在最小 demo 中验证 evidence 流程。

## 9. 验证变更

```bash
node "/Users/marcher/Desktop/stdd-copliot/cli.js" verify add-multiply --no-constitution
```

实测输出要点：

```text
Tasks:       PASS  (3/3)
Tests:       PASS
Constitution: PASS
Mutation: latest evidence pass (77%)
Evidence saved to stdd/changes/add-multiply/evidence/verify-1778650844525.json
Verification passed for add-multiply
```

本示例使用 `--no-constitution`，因为这是最小 demo，缺少 CI、lint、完整文档等生产项目治理条件。若要测试治理规则，去掉该参数并按输出修复 Article 违规项。

## 10. 查看推荐下一步

```bash
node "/Users/marcher/Desktop/stdd-copliot/cli.js" recommend
```

实测输出：

```text
Recommended: stdd archive add-multiply
Reason: All 3 tasks completed and verified. Archive with `stdd archive`.
```

## 11. 查看 evidence 历史

```bash
node "/Users/marcher/Desktop/stdd-copliot/cli.js" graph history --change add-multiply --json
```

实测输出包含：

```json
[
  {
    "type": "verify",
    "status": "pass",
    "changeName": "add-multiply",
    "workspaces": ["root"]
  },
  {
    "type": "schema-validation",
    "status": "pass"
  },
  {
    "type": "mutation",
    "status": "pass",
    "changeName": "add-multiply"
  }
]
```

## 12. 归档变更

```bash
node "/Users/marcher/Desktop/stdd-copliot/cli.js" archive add-multiply
```

实测输出：

```text
Archived add-multiply as add-multiply-20260513134058
```

归档目录：

```text
stdd/changes/archive/add-multiply-20260513134058/
├── proposal.md
├── tasks.md
├── specs/
├── evidence/
└── summary.md
```

`summary.md` 摘要：

```md
# Archive Summary: 为 calculator 增加乘法能力

- **Status**: Verification Passed

## Tasks
- 3/3 completed (100%)

## Specs
- `specs/.feature`
- `specs/calculator.feature`

## Workspaces
- Involved: `root`
- Test Results:
  - root: PASS
```

确认归档列表：

```bash
node "/Users/marcher/Desktop/stdd-copliot/cli.js" list --archived --json
```

实测输出：

```json
{
  "active": [],
  "archived": ["add-multiply-20260513134058"]
}
```

最终测试仍通过：

```bash
npm test
```

实测结果：`tests 3`，`pass 3`，`fail 0`。

## 13. 完整复现命令

```bash
cd /Users/marcher/Desktop/STDD-TEST

node "/Users/marcher/Desktop/stdd-copliot/cli.js" init --skip-skills --yes
npm test

node "/Users/marcher/Desktop/stdd-copliot/cli.js" ff "为 calculator 增加乘法能力" --change-name add-multiply
node "/Users/marcher/Desktop/stdd-copliot/cli.js" spec add-multiply
node "/Users/marcher/Desktop/stdd-copliot/cli.js" apply add-multiply --dry-run
node "/Users/marcher/Desktop/stdd-copliot/cli.js" apply add-multiply

# 在这里实现 multiply 并补测试

node "/Users/marcher/Desktop/stdd-copliot/cli.js" apply add-multiply
node "/Users/marcher/Desktop/stdd-copliot/cli.js" apply add-multiply
node "/Users/marcher/Desktop/stdd-copliot/cli.js" mutation add-multiply --threshold 50
node "/Users/marcher/Desktop/stdd-copliot/cli.js" verify add-multiply --no-constitution
node "/Users/marcher/Desktop/stdd-copliot/cli.js" recommend
node "/Users/marcher/Desktop/stdd-copliot/cli.js" graph history --change add-multiply --json
node "/Users/marcher/Desktop/stdd-copliot/cli.js" archive add-multiply
node "/Users/marcher/Desktop/stdd-copliot/cli.js" list --archived --json
npm test
```

## 14. 实测发现的问题

### `starters create --type` 当前不可用

尝试：

```bash
node "/Users/marcher/Desktop/stdd-copliot/cli.js" starters create demo-js --type javascript
```

实测结果：

```text
error: unknown option '--type'
```

原因：当前 CLI 注册为 `starters <subcommand> [args...]`，没有声明 `--type`，也没有把 CLI 参数转发到 `StartersCommand.create(name, type)`。

建议后续补齐为：

```text
stdd starters list
stdd starters create <name> --type <javascript|typescript|python|go|rust> [--no-stdd]
```

### `spec` 生成隐藏 `.feature` 文件

本次出现：

```text
stdd/changes/add-multiply/specs/.feature
```

建议为 `SpecGenerator.toSafeFilename` 增加空值兜底，避免生成隐藏 feature 文件。

### 最小 demo 的 `metrics` 不适合作为上线质量判断

执行：

```bash
node "/Users/marcher/Desktop/stdd-copliot/cli.js" metrics add-multiply --json
```

实测返回中 `constitutionHealth` 为 `FAIL`。这是因为最小 demo 没有完整治理条件，不代表本次功能闭环失败。真实项目中应补齐 CI、lint、测试组织和文档后再把 metrics/constitution 作为强门禁。

## 15. 建议的 smoke test

对已初始化项目：

```bash
npm test
node "/Users/marcher/Desktop/stdd-copliot/cli.js" status --json
node "/Users/marcher/Desktop/stdd-copliot/cli.js" recommend
node "/Users/marcher/Desktop/stdd-copliot/cli.js" doctor --deep   # 深度项目健康检查
```

对进行中的 change：

```bash
node "/Users/marcher/Desktop/stdd-copliot/cli.js" apply <change> --dry-run
node "/Users/marcher/Desktop/stdd-copliot/cli.js" mutation <change> --threshold 50
node "/Users/marcher/Desktop/stdd-copliot/cli.js" verify <change> --no-constitution
```

跳过测试缺失的 apply (适用于仅有文档/配置变更)：

```bash
node "/Users/marcher/Desktop/stdd-copliot/cli.js" apply <change> --allow-no-tests
```
