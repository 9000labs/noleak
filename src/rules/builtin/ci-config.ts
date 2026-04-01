import type { Rule, RuleContext } from '../rule.js';
import type { Finding } from '../../core/file-entry.js';

const CI_PATTERNS = [
  /(?:^|[/\\])\.github[/\\]/,
  /(?:^|[/\\])\.gitlab-ci\.ya?ml$/,
  /(?:^|[/\\])\.circleci[/\\]/,
  /(?:^|[/\\])Jenkinsfile$/,
  /(?:^|[/\\])\.travis\.ya?ml$/,
  /(?:^|[/\\])azure-pipelines\.ya?ml$/,
  /(?:^|[/\\])\.buildkite[/\\]/,
];

export const ciConfigRule: Rule = {
  id: 'ci-config',
  name: 'CI Configuration Detection',
  description: 'Detects CI/CD configuration files in published packages',
  defaultSeverity: 'warn',

  async run(ctx: RuleContext): Promise<Finding[]> {
    const ciFiles = ctx.files.filter(f => CI_PATTERNS.some(p => p.test(f.relativePath)));
    if (ciFiles.length === 0) return [];

    // Group by CI system to avoid spamming findings
    const systems = new Set(ciFiles.map(f => {
      if (f.relativePath.includes('.github')) return '.github/';
      if (f.relativePath.includes('.circleci')) return '.circleci/';
      if (f.relativePath.includes('.buildkite')) return '.buildkite/';
      return f.relativePath;
    }));

    return [...systems].map(system => ({
      ruleId: 'ci-config',
      severity: this.defaultSeverity,
      filePath: system,
      message: `CI configuration "${system}" included in package`,
      suggestion: `Add "${system}" to .npmignore`,
    }));
  },
};
