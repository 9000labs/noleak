import type { Rule, RuleContext } from '../rule.js';
import type { Finding } from '../../core/file-entry.js';

const DEFAULT_MAX_SIZE = 1_048_576; // 1MB

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const largeFilesRule: Rule = {
  id: 'large-files',
  name: 'Large File Detection',
  description: 'Detects unusually large files that may be accidentally included',
  defaultSeverity: 'warn',

  async run(ctx: RuleContext): Promise<Finding[]> {
    const maxSize = DEFAULT_MAX_SIZE;

    return ctx.files
      .filter(f => f.size > maxSize)
      .map(f => ({
        ruleId: 'large-files',
        severity: this.defaultSeverity,
        filePath: f.relativePath,
        message: `"${f.relativePath}" is ${formatSize(f.size)} (threshold: ${formatSize(maxSize)})`,
        suggestion: 'Review whether this file needs to be published. Consider code splitting or external hosting.',
      }));
  },
};
