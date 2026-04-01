import type { Rule, RuleContext } from '../rule.js';
import type { Finding } from '../../core/file-entry.js';

const IDE_PATTERNS = [
  /(?:^|[/\\])\.vscode[/\\]/,
  /(?:^|[/\\])\.idea[/\\]/,
  /(?:^|[/\\])\.sublime-/,
  /(?:^|[/\\])\.editorconfig$/,
  /\.code-workspace$/,
];

export const ideConfigRule: Rule = {
  id: 'ide-config',
  name: 'IDE Configuration Detection',
  description: 'Detects IDE/editor configuration files in published packages',
  defaultSeverity: 'info',

  async run(ctx: RuleContext): Promise<Finding[]> {
    const ideFiles = ctx.files.filter(f => IDE_PATTERNS.some(p => p.test(f.relativePath)));
    if (ideFiles.length === 0) return [];

    const dirs = new Set(ideFiles.map(f => {
      if (f.relativePath.includes('.vscode')) return '.vscode/';
      if (f.relativePath.includes('.idea')) return '.idea/';
      return f.relativePath;
    }));

    return [...dirs].map(dir => ({
      ruleId: 'ide-config',
      severity: this.defaultSeverity,
      filePath: dir,
      message: `IDE config "${dir}" included in package`,
      suggestion: `Add "${dir}" to .npmignore`,
    }));
  },
};
