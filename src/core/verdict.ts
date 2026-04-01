import type { Finding, Severity, ScanResult } from './file-entry.js';

const SEVERITY_ORDER: Record<Severity, number> = {
  info: 0,
  warn: 1,
  block: 2,
};

export function buildVerdict(
  findings: Finding[],
  failOn: Severity = 'block',
): Pick<ScanResult, 'verdict' | 'findings'> {
  const sorted = [...findings].sort(
    (a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity],
  );

  const maxSeverity = sorted[0]?.severity;
  let verdict: ScanResult['verdict'] = 'PASS';

  if (maxSeverity && SEVERITY_ORDER[maxSeverity] >= SEVERITY_ORDER[failOn]) {
    verdict = maxSeverity === 'block' ? 'BLOCK' : 'WARN';
  }

  // If there are block-level findings, always BLOCK regardless of failOn
  if (sorted.some(f => f.severity === 'block')) {
    verdict = 'BLOCK';
  }

  return { verdict, findings: sorted };
}
