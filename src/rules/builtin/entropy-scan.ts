import { readFileSync } from 'node:fs';
import type { Rule, RuleContext } from '../rule.js';
import type { Finding } from '../../core/file-entry.js';
import { findHighEntropyStrings } from '../../utils/entropy.js';

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.avif',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.zip', '.tar', '.gz', '.bz2', '.7z',
  '.pdf', '.exe', '.dll', '.so', '.dylib',
  '.node', '.wasm', '.map',
]);

const MAX_FILE_SIZE = 512_000; // 512KB

export const entropyScanRule: Rule = {
  id: 'entropy-scan',
  name: 'High-Entropy String Detection',
  description: 'Detects high-entropy strings that may be API keys, tokens, or secrets',
  defaultSeverity: 'warn',

  async run(ctx: RuleContext): Promise<Finding[]> {
    const findings: Finding[] = [];

    for (const file of ctx.files) {
      // Skip binary files and large files
      const ext = file.relativePath.substring(file.relativePath.lastIndexOf('.'));
      if (BINARY_EXTENSIONS.has(ext)) continue;
      if (file.size > MAX_FILE_SIZE) continue;
      if (file.size === 0) continue;

      let content: string;
      try {
        content = readFileSync(file.absolutePath, 'utf-8');
      } catch {
        continue;
      }

      const matches = findHighEntropyStrings(content);
      if (matches.length > 0) {
        // Report at most 3 matches per file to avoid noise
        const topMatches = matches.slice(0, 3);
        const detail = topMatches
          .map(m => `line ${m.line}: "${m.value}" (entropy: ${m.entropy})`)
          .join('; ');

        findings.push({
          ruleId: 'entropy-scan',
          severity: this.defaultSeverity,
          filePath: file.relativePath,
          message: `${matches.length} high-entropy string(s) found: ${detail}`,
          suggestion: 'Review these strings. If they are secrets, remove them and use environment variables.',
        });
      }
    }

    return findings;
  },
};
