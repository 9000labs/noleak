import chalk from 'chalk';
import type { ScanResult, Finding, Severity } from '../core/file-entry.js';

const SEVERITY_COLORS: Record<Severity, (s: string) => string> = {
  block: chalk.red.bold,
  warn: chalk.yellow.bold,
  info: chalk.blue,
};

const SEVERITY_LABELS: Record<Severity, string> = {
  block: 'BLOCK',
  warn: ' WARN',
  info: ' INFO',
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatFinding(finding: Finding): string {
  const color = SEVERITY_COLORS[finding.severity];
  const label = SEVERITY_LABELS[finding.severity];
  const lines = [
    `  ${color(label)}  ${chalk.dim(finding.ruleId.padEnd(16))} ${finding.filePath}`,
    `         ${finding.message}`,
  ];
  if (finding.suggestion) {
    lines.push(`         ${chalk.dim('→ ' + finding.suggestion)}`);
  }
  return lines.join('\n');
}

export function reportToConsole(result: ScanResult, packageName: string, packageVersion: string, ecosystem?: string): void {
  const { verdict, findings, stats } = result;

  console.log('');
  console.log(`  ${chalk.bold('noleak')} — ${ecosystem ?? 'package'} audit`);
  console.log('');
  console.log(`  Package: ${chalk.cyan(packageName)}@${packageVersion}`);
  console.log(`  Files:   ${stats.filesScanned} files, ${formatSize(stats.totalSize)} total`);
  console.log('');

  if (findings.length === 0) {
    console.log(`  ${chalk.green.bold('PASS')}  No issues found`);
  } else {
    for (const finding of findings) {
      console.log(formatFinding(finding));
      console.log('');
    }
  }

  console.log('  ' + chalk.dim('─'.repeat(50)));

  const blocks = findings.filter(f => f.severity === 'block').length;
  const warns = findings.filter(f => f.severity === 'warn').length;
  const infos = findings.filter(f => f.severity === 'info').length;

  const parts: string[] = [];
  if (blocks > 0) parts.push(chalk.red(`${blocks} blocking`));
  if (warns > 0) parts.push(chalk.yellow(`${warns} warnings`));
  if (infos > 0) parts.push(chalk.blue(`${infos} info`));

  const verdictColor = verdict === 'PASS' ? chalk.green.bold
    : verdict === 'BLOCK' ? chalk.red.bold
    : chalk.yellow.bold;

  console.log(`  Result: ${verdictColor(verdict)}${parts.length > 0 ? ` (${parts.join(', ')})` : ''}`);
  console.log(`  LLM:    ${stats.llmUsed ? 'enabled' : chalk.dim('skipped (no API key)')}`);
  console.log(`  Time:   ${stats.durationMs}ms`);
  console.log('');
}
