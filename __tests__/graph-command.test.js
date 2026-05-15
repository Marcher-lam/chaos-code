const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

describe('graph CLI command', () => {
  const cliPath = path.join(__dirname, '..', 'cli.js');

  function runCli(args) {
    const result = spawnSync(process.execPath, [cliPath, ...args], {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
    });
    return {
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  }

  it('prints graph command help with implemented and pending operations', () => {
    const result = runCli(['graph', '--help']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('stdd graph visualize');
    expect(result.stdout).toContain('Currently implemented: visualize, analyze, parallel --detect, history, replay, run, recommend.');
  });

  it('prints Mermaid graph visualization by default', () => {
    const result = runCli(['graph', 'visualize']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('graph TD');
    expect(result.stdout).toContain('stdd-propose');
    expect(result.stdout).toContain('-->');
  });

  it('prints JSON graph visualization', () => {
    const result = runCli(['graph', 'visualize', '--format', 'json']);

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.nodes).toContain('stdd-propose');
    expect(payload.nodes).toContain('stdd-outside-in');
    expect(payload.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ from: 'stdd-propose', to: 'stdd-spec' }),
      expect.objectContaining({ from: 'stdd-plan', to: 'stdd-outside-in' }),
    ]));
  });

  it('prints repair graph with fix-packet node', () => {
    const result = runCli(['graph', 'visualize', '--intent', 'repair', '--format', 'json']);

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.nodes).toContain('stdd-fix-packet');
    expect(payload.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ from: 'stdd-fix-packet', to: 'stdd-apply' }),
    ]));
  });

  it('writes graph visualization to an output file', () => {
    const outputPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-graph-')), 'graph.mmd');
    const result = runCli(['graph', 'visualize', '--output', outputPath]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Graph output written to');
    expect(fs.readFileSync(outputPath, 'utf8')).toContain('graph TD');
  });

  it('prints graph analysis summary', () => {
    const result = runCli(['graph', 'analyze']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Nodes:');
    expect(result.stdout).toContain('Edges:');
    expect(result.stdout).toContain('Entry nodes:');
    expect(result.stdout).toContain('Terminal nodes:');
    expect(result.stdout).toContain('Parallel layers:');
  });

  it('prints parallel layers with --detect', () => {
    const result = runCli(['graph', 'parallel', '--detect']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Parallelizable layers');
    expect(result.stdout).toContain('Layer 0:');
  });

  it('generates HTML file and opens browser with --format html', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-graph-html-'));
    const outputPath = path.join(tmpDir, 'graph.html');
    const result = runCli(['graph', 'visualize', '--format', 'html', '--output', outputPath]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Graph visualization opened in browser');
    expect(fs.existsSync(outputPath)).toBe(true);
    const content = fs.readFileSync(outputPath, 'utf8');
    expect(content).toContain('graph TD');
    expect(content).toContain('mermaid');
    expect(content).toContain('MERMAID_CODE');
    expect(content).toContain('stdd-propose');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('generates HTML with proper template structure', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-graph-struct-'));
    const outputPath = path.join(tmpDir, 'graph.html');
    const result = runCli(['graph', 'visualize', '--format', 'html', '--output', outputPath]);

    expect(result.status).toBe(0);
    const content = fs.readFileSync(outputPath, 'utf8');
    expect(content).toContain('<!DOCTYPE html>');
    expect(content).toContain('STDD Copilot');
    expect(content).toContain('graph TD');
    expect(content).not.toContain('{{MERMAID_CODE}}');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes graph output with shell metacharacters without executing them', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stdd-graph-injection-'));
    const marker = path.join(tmpDir, 'pwned.txt');
    const outputPath = path.join(tmpDir, `graph.html;touch ${path.basename(marker)}`);
    const result = runCli(['graph', 'visualize', '--format', 'html', '--output', outputPath]);

    expect(result.status).toBe(0);
    expect(fs.existsSync(outputPath)).toBe(true);
    expect(fs.existsSync(marker)).toBe(false);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
