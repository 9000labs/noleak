import type { Rule, RuleContext } from '../rule.js';
import type { Finding } from '../../core/file-entry.js';

export const gitDirectoryRule: Rule = {
  id: 'git-directory',
  name: 'Git Directory Detection',
  description: 'Detects .git directory included in package',
  defaultSeverity: 'block',

  async run(ctx: RuleContext): Promise<Finding[]> {
    const gitFiles = ctx.files.filter(f => f.relativePath.startsWith('.git/') || f.relativePath === '.git');
    if (gitFiles.length === 0) return [];

    return [{
      ruleId: 'git-directory',
      severity: this.defaultSeverity,
      filePath: '.git/',
      message: `.git directory included in package (${gitFiles.length} files). Exposes full commit history.`,
      suggestion: 'Add ".git" to .npmignore',
    }];
  },
};
