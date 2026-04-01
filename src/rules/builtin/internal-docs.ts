import type { Rule, RuleContext } from '../rule.js';
import type { Finding } from '../../core/file-entry.js';

const INTERNAL_PATTERNS = [
  /INTERNAL/i,
  /CONFIDENTIAL/i,
  /SECRET/i,
  /PRIVATE/i,
  /DO[-_]?NOT[-_]?SHARE/i,
  /(?:^|[/\\])internal[/\\]/i,
];

export const internalDocsRule: Rule = {
  id: 'internal-docs',
  name: 'Internal Document Detection',
  description: 'Detects files that appear to be internal/confidential documents',
  defaultSeverity: 'warn',

  async run(ctx: RuleContext): Promise<Finding[]> {
    return ctx.files
      .filter(f => INTERNAL_PATTERNS.some(p => p.test(f.relativePath)))
      .map(f => ({
        ruleId: 'internal-docs',
        severity: this.defaultSeverity,
        filePath: f.relativePath,
        message: `"${f.relativePath}" appears to be an internal/confidential document`,
        suggestion: `Review whether "${f.relativePath}" should be published. Add to .npmignore if internal.`,
      }));
  },
};
