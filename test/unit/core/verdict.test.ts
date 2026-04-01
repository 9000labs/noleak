import { describe, it, expect } from 'vitest';
import { buildVerdict } from '../../../src/core/verdict.js';
import type { Finding } from '../../../src/core/file-entry.js';

describe('buildVerdict', () => {
  it('returns PASS when no findings', () => {
    const { verdict } = buildVerdict([]);
    expect(verdict).toBe('PASS');
  });

  it('returns BLOCK when block findings exist', () => {
    const findings: Finding[] = [
      { ruleId: 'test', severity: 'block', filePath: 'a.map', message: 'bad' },
    ];
    const { verdict } = buildVerdict(findings);
    expect(verdict).toBe('BLOCK');
  });

  it('returns PASS when only warn findings and failOn is block', () => {
    const findings: Finding[] = [
      { ruleId: 'test', severity: 'warn', filePath: 'a.lock', message: 'meh' },
    ];
    const { verdict } = buildVerdict(findings, 'block');
    expect(verdict).toBe('PASS');
  });

  it('returns WARN when warn findings and failOn is warn', () => {
    const findings: Finding[] = [
      { ruleId: 'test', severity: 'warn', filePath: 'a.lock', message: 'meh' },
    ];
    const { verdict } = buildVerdict(findings, 'warn');
    expect(verdict).toBe('WARN');
  });

  it('sorts findings by severity descending', () => {
    const findings: Finding[] = [
      { ruleId: 'a', severity: 'info', filePath: 'x', message: 'low' },
      { ruleId: 'b', severity: 'block', filePath: 'y', message: 'high' },
      { ruleId: 'c', severity: 'warn', filePath: 'z', message: 'mid' },
    ];
    const { findings: sorted } = buildVerdict(findings);
    expect(sorted[0]!.severity).toBe('block');
    expect(sorted[1]!.severity).toBe('warn');
    expect(sorted[2]!.severity).toBe('info');
  });
});
