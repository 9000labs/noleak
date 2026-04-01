/**
 * Calculate Shannon entropy of a string.
 * Higher entropy = more random = likely a secret/API key.
 * Typical thresholds: >4.5 for hex strings, >5.0 for base64.
 */
export function shannonEntropy(str: string): number {
  if (str.length === 0) return 0;

  const freq = new Map<string, number>();
  for (const char of str) {
    freq.set(char, (freq.get(char) ?? 0) + 1);
  }

  let entropy = 0;
  const len = str.length;
  for (const count of freq.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

/**
 * Find high-entropy strings in text content that look like secrets.
 * Returns matches with their line numbers and entropy values.
 */
export function findHighEntropyStrings(
  content: string,
  minEntropy: number = 4.5,
  minLength: number = 20,
  maxLength: number = 200,
): { line: number; value: string; entropy: number }[] {
  const results: { line: number; value: string; entropy: number }[] = [];
  const lines = content.split('\n');

  // Patterns that look like secrets: long alphanumeric/base64/hex strings
  const tokenPattern = /[A-Za-z0-9+/=_\-]{20,200}/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    let match: RegExpExecArray | null;
    tokenPattern.lastIndex = 0;

    while ((match = tokenPattern.exec(line)) !== null) {
      const token = match[0];
      if (token.length < minLength || token.length > maxLength) continue;

      // Skip obvious non-secrets
      if (isLikelyNotSecret(token)) continue;

      const entropy = shannonEntropy(token);
      if (entropy >= minEntropy) {
        // SECURITY: Only show first 4 chars to avoid leaking secrets in output/logs
        results.push({
          line: i + 1,
          value: token.slice(0, 4) + '***REDACTED***',
          entropy: Math.round(entropy * 100) / 100,
        });
      }
    }
  }

  return results;
}

function isLikelyNotSecret(token: string): boolean {
  // All same case with no digits = probably a word/identifier
  if (/^[a-z]+$/.test(token) || /^[A-Z]+$/.test(token)) return true;
  // Camel case identifiers
  if (/^[a-z][a-zA-Z]+$/.test(token) && token.length < 40) return true;
  // Common base64 padding without high entropy
  if (/^[A]+$/.test(token) || /^[=]+$/.test(token)) return true;
  // Version-like strings
  if (/^\d+\.\d+\.\d+/.test(token)) return true;
  return false;
}
