import type { Rule, RuleContext } from '../rule.js';
import type { Finding } from '../../core/file-entry.js';

const LOCKFILE_NAMES = [
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lockb',
  'shrinkwrap.json',
  'npm-shrinkwrap.json',
];

export const lockfilesRule: Rule = {
  id: 'lockfiles',
  name: 'Lockfile Detection',
  description: 'Detects lockfiles that are unnecessary in published packages',
  defaultSeverity: 'warn',

  async run(ctx: RuleContext): Promise<Finding[]> {
    return ctx.files
      .filter(f => LOCKFILE_NAMES.includes(f.relativePath))
      .map(f => ({
        ruleId: 'lockfiles',
        severity: this.defaultSeverity,
        filePath: f.relativePath,
        message: `Lockfile "${f.relativePath}" is unnecessary in a published package`,
        suggestion: `Add "${f.relativePath}" to .npmignore`,
      }));
  },
};
