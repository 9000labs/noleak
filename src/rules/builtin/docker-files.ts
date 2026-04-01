import type { Rule, RuleContext } from '../rule.js';
import type { Finding } from '../../core/file-entry.js';

const DOCKER_PATTERNS = [
  /(?:^|[/\\])Dockerfile$/,
  /(?:^|[/\\])Dockerfile\..+$/,
  /(?:^|[/\\])docker-compose.*\.ya?ml$/,
  /(?:^|[/\\])\.dockerignore$/,
];

export const dockerFilesRule: Rule = {
  id: 'docker-files',
  name: 'Docker File Detection',
  description: 'Detects Docker configuration files in published packages',
  defaultSeverity: 'info',

  async run(ctx: RuleContext): Promise<Finding[]> {
    return ctx.files
      .filter(f => DOCKER_PATTERNS.some(p => p.test(f.relativePath)))
      .map(f => ({
        ruleId: 'docker-files',
        severity: this.defaultSeverity,
        filePath: f.relativePath,
        message: `Docker config "${f.relativePath}" included in package`,
        suggestion: `Add to .npmignore if not needed by consumers`,
      }));
  },
};
