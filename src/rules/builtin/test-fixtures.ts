import type { Rule, RuleContext } from '../rule.js';
import type { Finding } from '../../core/file-entry.js';

const TEST_PATTERNS = [
  /(?:^|[/\\])__fixtures__[/\\]/,
  /(?:^|[/\\])__mocks__[/\\]/,
  /(?:^|[/\\])__tests__[/\\]/,
  /(?:^|[/\\])test[/\\]data[/\\]/,
  /(?:^|[/\\])test[/\\]fixtures[/\\]/,
  /(?:^|[/\\])fixtures[/\\]/,
  /(?:^|[/\\])\.storybook[/\\]/,
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
];

export const testFixturesRule: Rule = {
  id: 'test-fixtures',
  name: 'Test Fixture Detection',
  description: 'Detects test files and fixtures that are unnecessary in published packages',
  defaultSeverity: 'warn',

  async run(ctx: RuleContext): Promise<Finding[]> {
    const testFiles = ctx.files.filter(f => TEST_PATTERNS.some(p => p.test(f.relativePath)));
    if (testFiles.length === 0) return [];

    return testFiles.map(f => ({
      ruleId: 'test-fixtures',
      severity: this.defaultSeverity,
      filePath: f.relativePath,
      message: `Test file "${f.relativePath}" included in package`,
      suggestion: 'Add test directories to .npmignore, or use "files" field in package.json to whitelist only dist/',
    }));
  },
};
