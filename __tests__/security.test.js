const path = require('path');
const {
  sanitizeInput,
  isPathSafe,
  detectSecrets,
  hashSensitiveData,
  redactSensitiveInfo,
} = require('../src/utils/security');

describe('sanitizeInput', () => {
  it('should trim whitespace by default', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello');
  });

  it('should remove null bytes', () => {
    expect(sanitizeInput('test\0data')).toBe('testdata');
  });

  it('should handle non-string input', () => {
    expect(sanitizeInput(null)).toBe('');
    expect(sanitizeInput(undefined)).toBe('');
    expect(sanitizeInput(123)).toBe('');
  });

  it('should limit length when maxLength is set', () => {
    expect(sanitizeInput('hello world', { maxLength: 5 })).toBe('hello');
  });

  it('should keep whitespace when trim is false', () => {
    expect(sanitizeInput('  hello  ', { trim: false })).toBe('  hello  ');
  });
});

describe('isPathSafe', () => {
  it('should reject paths with parent traversal', () => {
    expect(isPathSafe('../etc/passwd', '/var/www')).toBe(false);
    expect(isPathSafe('foo/../../etc', '/var/www')).toBe(false);
  });

  it('should accept safe paths within base directory', () => {
    const baseDir = '/tmp/test-base';
    expect(isPathSafe(path.join(baseDir, 'src', 'app.js'), baseDir)).toBe(true);
  });

  it('should reject null or empty inputs', () => {
    expect(isPathSafe(null, '/base')).toBe(false);
    expect(isPathSafe('test', null)).toBe(false);
  });
});

describe('detectSecrets', () => {
  it('should detect API keys', () => {
    const secrets = detectSecrets('api_key: "sk12345678901234567890"');
    expect(secrets.length).toBeGreaterThanOrEqual(1);
    expect(secrets[0].name).toBe('API Key');
  });

  it('should detect hardcoded passwords', () => {
    const secrets = detectSecrets('password: "mySecret123456"');
    expect(secrets.length).toBeGreaterThanOrEqual(1);
    expect(secrets[0].name).toBe('Password');
  });

  it('should detect private keys', () => {
    const secrets = detectSecrets('-----BEGIN PRIVATE KEY-----\nMIIB...\n-----END PRIVATE KEY-----');
    expect(secrets.length).toBeGreaterThanOrEqual(1);
    expect(secrets[0].name).toBe('Private Key');
  });

  it('should return empty for clean code', () => {
    const secrets = detectSecrets('function hello() { return "world"; }');
    expect(secrets.length).toBe(0);
  });
});

describe('hashSensitiveData', () => {
  it('should produce consistent hash for same input', () => {
    const h1 = hashSensitiveData('secret123');
    const h2 = hashSensitiveData('secret123');
    expect(h1).toBe(h2);
    expect(h1.length).toBe(16);
  });

  it('should produce different hash for different input', () => {
    const h1 = hashSensitiveData('secret123');
    const h2 = hashSensitiveData('secret456');
    expect(h1).not.toBe(h2);
  });
});

describe('redactSensitiveInfo', () => {
  it('should redact email addresses', () => {
    const result = redactSensitiveInfo('Contact: user@example.com for help');
    expect(result).toContain('[EMAIL]');
    expect(result).not.toContain('user@example.com');
  });

  it('should redact password assignments', () => {
    const result = redactSensitiveInfo('password: "mySecret"');
    expect(result).toContain('*** REDACTED ***');
  });

  it('should return non-string input unchanged', () => {
    expect(redactSensitiveInfo(123)).toBe(123);
    expect(redactSensitiveInfo(null)).toBe(null);
  });
});
