import { execFileSync } from 'node:child_process';
import type { Rule, RuleContext } from '../rule.js';
import type { Finding } from '../../core/file-entry.js';

const GROWTH_THRESHOLD = 2.0; // 2x = 100% growth

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function getLastPublishedSize(packageName: string): Promise<number | null> {
  try {
    // SECURITY: execFileSync (no shell) prevents command injection via package name
    const output = execFileSync(
      'npm', ['view', packageName, 'dist.unpackedSize', '--json'],
      { encoding: 'utf-8', timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] },
    ).trim();
    const size = parseInt(output, 10);
    return isNaN(size) ? null : size;
  } catch {
    return null;
  }
}

export const unexpectedGrowthRule: Rule = {
  id: 'unexpected-growth',
  name: 'Unexpected Package Growth',
  description: 'Detects when package size grows more than 2x compared to last published version',
  defaultSeverity: 'warn',

  async run(ctx: RuleContext): Promise<Finding[]> {
    const currentSize = ctx.files.reduce((sum, f) => sum + f.size, 0);
    const lastSize = await getLastPublishedSize(ctx.packageName);

    if (lastSize === null) return []; // Not published yet or npm unavailable

    const ratio = currentSize / lastSize;
    if (ratio <= GROWTH_THRESHOLD) return [];

    return [{
      ruleId: 'unexpected-growth',
      severity: this.defaultSeverity,
      filePath: '(package)',
      message: `Package grew ${ratio.toFixed(1)}x (${formatSize(lastSize)} → ${formatSize(currentSize)}). May indicate accidental file inclusion.`,
      suggestion: 'Compare file list with previous version: npm pack --dry-run',
    }];
  },
};
