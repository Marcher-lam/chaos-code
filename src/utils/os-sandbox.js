/**
 * OS-level sandboxing for agent-executed shell/test commands.
 *
 *   macOS:  sandbox-exec (seatbelt) — verified profile: system dirs and
 *           credential dirs (~/.ssh, ~/.aws, ~/.gnupg) are write-denied;
 *           workspace, /tmp and package caches stay writable.
 *   Linux:  bubblewrap (bwrap) — read-only root, writable /tmp, $HOME, cwd.
 *
 * Configuration:
 *   ~/.chaos/config.json  { "sandbox": "auto" | "off" }   (default: auto)
 *   env CHAOS_SANDBOX=off                                 (force-disable)
 *
 * "auto" applies the sandbox only when the platform tool is available;
 * everything degrades to a plain spawn otherwise.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

let _detectedTool; // cached availability probe

function sandboxSetting() {
  if (process.env.CHAOS_SANDBOX === 'off') return 'off';
  if (process.env.CHAOS_SANDBOX === 'on') return 'on';
  try {
    const cfgPath = path.join(os.homedir(), '.chaos', 'config.json');
    if (fs.existsSync(cfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      if (cfg.sandbox === 'off') return 'off';
      if (cfg.sandbox === 'on') return 'on';
    }
  } catch (_) { /* fall through */ }
  return 'auto';
}

function detectSandboxTool() {
  if (process.env.CHAOS_SANDBOX_TOOL) {
    return process.env.CHAOS_SANDBOX_TOOL; // test seam / explicit override
  }
  if (_detectedTool !== undefined) return _detectedTool;
  try {
    if (process.platform === 'darwin') {
      // sandbox-exec needs a command to run — probe with /usr/bin/true
      const res = spawnSync('sandbox-exec', ['-p', '(version 1)(allow default)', '/usr/bin/true'], { timeout: 3000 });
      _detectedTool = res.status === 0 ? 'sandbox-exec' : null;
    } else if (process.platform === 'linux') {
      // --version succeeds even in containers where bwrap can't actually run
      // (no unprivileged user namespaces, non-setuid binary) — probe by
      // really executing a trivial command under the wrapper.
      // Probe with the SAME flags bwrapArgs uses (incl. --die-with-parent)
      // so a bwrap that rejects one of them is detected here, not at run time.
      const res = spawnSync('bwrap', ['--ro-bind', '/', '/', '--unshare-pid', '--die-with-parent', '--proc', '/proc', '--dev', '/dev', '/usr/bin/true'], { timeout: 5000 });
      _detectedTool = res.status === 0 ? 'bwrap' : null;
    } else {
      _detectedTool = null;
    }
  } catch (_) {
    _detectedTool = null;
  }
  return _detectedTool;
}

// test seam
function _resetDetection() {
  _detectedTool = undefined;
}

function macosProfile() {
  // Escape profile-special characters in interpolated paths (a home dir
  // containing a quote/backslash would otherwise corrupt the profile).
  const esc = p => p.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const home = os.homedir();
  const denied = [
    '/System', '/private/System', '/Library', '/usr', '/etc', '/private/etc',
    '/bin', '/sbin', '/private/var/db', '/boot',
    `${home}/.ssh`, `${home}/.aws`, `${home}/.gnupg`,
  ];
  const lines = ['(version 1)', '(allow default)'];
  for (const p of denied) {
    lines.push(`(deny file-write* (subpath "${esc(p)}"))`);
  }
  // Pseudo-devices that ubiquitous tooling writes to (`cmd > /dev/null`);
  // note /dev is NOT blanket-denied precisely for this reason.
  lines.push('(allow file-write* (literal "/dev/null"))');
  return lines.join('\n');
}

function bwrapArgs(cwd) {
  const home = os.homedir();
  const args = [
    '--ro-bind', '/', '/',
    '--bind', '/tmp', '/tmp',
    '--bind', home, home,
    '--bind', cwd, cwd,
    '--unshare-pid', // sandboxed commands can't kill/inspect host processes
    '--die-with-parent', // no orphaned sandbox processes if chaos dies
    '--proc', '/proc',
    '--dev', '/dev',
  ];
  // Credential dirs stay read-only (parity with the macOS profile denies)
  for (const cred of ['.ssh', '.aws', '.gnupg']) {
    const credPath = path.join(home, cred);
    if (fs.existsSync(credPath)) args.push('--ro-bind', credPath, credPath);
  }
  return args;
}

/**
 * Wrap a parsed (bin, args) pair for sandboxed execution.
 * Returns { bin, args, sandboxed: boolean }.
 */
function wrapForSandbox(bin, args, options = {}) {
  const setting = sandboxSetting();
  if (setting === 'off') return { bin, args, sandboxed: false };

  const tool = detectSandboxTool();
  if (!tool) {
    if (setting === 'on') {
      // Explicit opt-in must not fail open: refuse instead of running unsandboxed
      throw new Error('CHAOS_SANDBOX=on (or sandbox:"on") but no OS sandbox tool is available on this platform (macOS needs sandbox-exec, Linux needs bwrap). Refusing to run unsandboxed.');
    }
    return { bin, args, sandboxed: false };
  }

  const cwd = options.cwd || process.cwd();
  if (tool === 'sandbox-exec') {
    return { bin: 'sandbox-exec', args: ['-p', macosProfile(), bin, ...args], sandboxed: true };
  }
  if (tool === 'bwrap') {
    return { bin: 'bwrap', args: [...bwrapArgs(cwd), '--', bin, ...args], sandboxed: true };
  }
  return { bin, args, sandboxed: false };
}

module.exports = { wrapForSandbox, sandboxSetting, detectSandboxTool, macosProfile, bwrapArgs, _resetDetection };
