/**
 * Security Framework
 * 
 * Security utilities for STDD Copilot.
 * Provides input sanitization, secret detection, and secure defaults.
 */

const crypto = require('crypto');

/**
 * Sanitize user input to prevent injection attacks
 * @param {string} input - User input
 * @param {object} options - Sanitization options
 * @returns {string} Sanitized input
 */
function sanitizeInput(input, options = {}) {
  if (typeof input !== 'string') {
    return '';
  }

  let sanitized = input;

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove control characters (except newlines and tabs)
  if (!options.allowControlChars) {
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  // Trim whitespace
  if (options.trim !== false) {
    sanitized = sanitized.trim();
  }

  // Limit length
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  return sanitized;
}

/**
 * Validate file path to prevent path traversal
 * @param {string} filePath - File path to validate
 * @param {string} baseDir - Base directory
 * @returns {boolean} Whether the path is safe
 */
function isPathSafe(filePath, baseDir) {
  const path = require('path');
  
  if (!filePath || !baseDir) {
    return false;
  }

  // Check for path traversal sequences
  if (filePath.includes('..')) {
    return false;
  }

  // Resolve and check if path is within base directory
  const resolvedPath = path.resolve(filePath);
  const resolvedBase = path.resolve(baseDir);

  if (resolvedPath !== resolvedBase && !resolvedPath.startsWith(resolvedBase + path.sep)) {
    return false;
  }

  return true;
}

/**
 * Detect hardcoded secrets in code
 * @param {string} content - Code content
 * @returns {Array<{pattern: string, line: number}>} Detected secrets
 */
function detectSecrets(content) {
  const secrets = [];
  
  const patterns = [
    // API keys
    { name: 'API Key', pattern: /(?:api[_-]?key|apikey|api_secret)\s*[:=]\s*['"][A-Za-z0-9+/=]{20,}['"]/gi },
    // Passwords
    { name: 'Password', pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{6,}['"]/gi },
    // Tokens
    { name: 'Token', pattern: /(?:token|secret|jwt)\s*[:=]\s*['"][A-Za-z0-9._-]{20,}['"]/gi },
    // Private keys
    { name: 'Private Key', pattern: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g },
    // AWS keys
    { name: 'AWS Key', pattern: /AKIA[0-9A-Z]{16}/g },
  ];

  const lines = content.split('\n');
  
  for (const { name, pattern } of patterns) {
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        secrets.push({ name, line: i + 1 });
        pattern.lastIndex = 0; // Reset for next line
      }
    }
  }

  return secrets;
}

/**
 * Hash sensitive data for evidence logging
 * @param {string} data - Sensitive data
 * @returns {string} Hash
 */
function hashSensitiveData(data) {
  return crypto.createHash('sha256').update(data).digest('hex').slice(0, 16);
}

/**
 * Redact sensitive information from output
 * @param {string} text - Text to redact
 * @returns {string} Redacted text
 */
function redactSensitiveInfo(text) {
  if (typeof text !== 'string') {
    return text;
  }

  return text
    .replace(/([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g, '[EMAIL]')
    .replace(/(password|token|secret|key|auth)\s*[:=]\s*['"][^'"]+['"]/gi, '$1=["*** REDACTED ***"]')
    .replace(/-----BEGIN\s[^-]+-----[\s\S]*?-----END\s[^-]+-----/g, '[PRIVATE KEY REDACTED]');
}

module.exports = {
  sanitizeInput,
  isPathSafe,
  detectSecrets,
  hashSensitiveData,
  redactSensitiveInfo,
};
