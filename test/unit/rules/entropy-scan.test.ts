import { describe, it, expect } from 'vitest';
import { shannonEntropy, findHighEntropyStrings } from '../../../src/utils/entropy.js';

describe('shannonEntropy', () => {
  it('returns 0 for empty string', () => {
    expect(shannonEntropy('')).toBe(0);
  });

  it('returns 0 for single character repeated', () => {
    expect(shannonEntropy('aaaaaaa')).toBe(0);
  });

  it('returns ~1.0 for two equally distributed characters', () => {
    const e = shannonEntropy('abababab');
    expect(e).toBeCloseTo(1.0, 1);
  });

  it('returns high entropy for random-looking string', () => {
    const e = shannonEntropy('aB3kL9mP2xR7nQ4wJ6vE8tY1uI5oH0s');
    expect(e).toBeGreaterThan(4.0);
  });
});

describe('findHighEntropyStrings', () => {
  it('finds API key-like strings', () => {
    const content = `
const config = {
  apiKey: "tok_test_aB3kL9mP2xR7nQ4wJ6vE8tY1uI5oH0sZzXx",
  name: "test"
};
`;
    const results = findHighEntropyStrings(content);
    expect(results.length).toBeGreaterThan(0);
  });

  it('ignores normal identifiers', () => {
    const content = `
const myVariableName = "hello";
function calculateTotalPrice() { return 42; }
`;
    const results = findHighEntropyStrings(content);
    expect(results).toHaveLength(0);
  });

  it('ignores short strings', () => {
    const content = 'key=abc123';
    const results = findHighEntropyStrings(content);
    expect(results).toHaveLength(0);
  });
});
