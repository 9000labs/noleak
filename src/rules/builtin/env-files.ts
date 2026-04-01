import type { Rule, RuleContext } from '../rule.js';
import type { Finding } from '../../core/file-entry.js';

const ENV_PATTERN = /(?:^|[/\\])\.env(?:\..+)?$/;
const EXAMPLE_PATTERN = /\.example$|\.sample$|\.template$/;

export const envFilesRule: Rule = {
  id: 'env-files',
  name: 'Environment File Detection',
  description: 'Detects .env files that may contain secrets or API keys',
  defaultSeverity: 'block',

  async run(ctx: RuleContext): Promise<Finding[]> {
    return ctx.files
      .filter(f => ENV_PATTERN.test(f.relativePath) && !EXAMPLE_PATTERN.test(f.relativePath))
      .map(f => ({
        ruleId: 'env-files',
        severity: this.defaultSeverity,
        filePath: f.relativePath,
        message: `Environment file "${f.relativePath}" may contain secrets or API keys`,
        suggestion: 'Add ".env*" to .npmignore. Use .env.example for templates.',
      }));
  },
};
