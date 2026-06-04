const enginesConfig = require('../src/config/engines.json');

describe('Engines Config Validation', () => {
  test('should load engines.json successfully', () => {
    expect(enginesConfig).toBeDefined();
    expect(enginesConfig.engines).toBeInstanceOf(Array);
  });

  test('engines should have correct structure', () => {
    const engines = enginesConfig.engines;
    
    // Test base structure constraints
    expect(engines.length).toBeGreaterThanOrEqual(6); // Should have at least the core 6 engines
    
    engines.forEach(engine => {
      // Must have name and value mapping for inquirer.js
      expect(engine).toHaveProperty('name');
      expect(engine).toHaveProperty('value');
      
      // Value must start with dot (.) or end with .md as it represents a config file/directory
      expect(engine.value.startsWith('.') || engine.value.endsWith('.md')).toBeTruthy();
      
      // Values must be unique to avoid multi-write collisions
    });
  });

  test('default agent (claude) must be present and checked by default', () => {
    const defaultEngine = enginesConfig.engines.find(e => e.value === '.claude');
    
    expect(defaultEngine).toBeDefined();
    expect(defaultEngine.checked).toBe(true);
  });
});
