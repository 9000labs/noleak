import type { Rule, RuleContext } from '../rule.js';
import type { Finding } from '../../core/file-entry.js';

const SOURCEMAP_PATTERN = /\.(js|css|mjs|cjs|d\.ts)\.map$/;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const sourceMapRule: Rule = {
  id: 'source-maps',
  name: 'Source Map Detection',
  description: 'Detects source map files that expose original source code when published',
  defaultSeverity: 'block',

  async run(ctx: RuleContext): Promise<Finding[]> {
    return ctx.files
      .filter(f => SOURCEMAP_PATTERN.test(f.relativePath))
      .map(f => ({
        ruleId: 'source-maps',
        severity: this.defaultSeverity,
        filePath: f.relativePath,
        message: `Source map "${f.relativePath}" (${formatSize(f.size)}) would expose original source code`,
        suggestion: 'Add "*.map" to .npmignore, or set "sourceMap": false in tsconfig.json',
      }));
  },
};
