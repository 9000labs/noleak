import type { Rule, RuleContext } from '../rule.js';
import type { Finding } from '../../core/file-entry.js';

const ARTIFACT_PATTERNS = [
  /\.tsbuildinfo$/,
  /tsconfig\.tsbuildinfo$/,
  /\.eslintcache$/,
  /\.stylelintcache$/,
  /\.cache[/\\]/,
  /\.parcel-cache[/\\]/,
  /\.next[/\\]/,
  /\.nuxt[/\\]/,
];

export const buildArtifactsRule: Rule = {
  id: 'build-artifacts',
  name: 'Build Artifact Detection',
  description: 'Detects build cache and artifact files',
  defaultSeverity: 'info',

  async run(ctx: RuleContext): Promise<Finding[]> {
    return ctx.files
      .filter(f => ARTIFACT_PATTERNS.some(p => p.test(f.relativePath)))
      .map(f => ({
        ruleId: 'build-artifacts',
        severity: this.defaultSeverity,
        filePath: f.relativePath,
        message: `Build artifact "${f.relativePath}" included in package`,
        suggestion: `Add to .npmignore`,
      }));
  },
};
