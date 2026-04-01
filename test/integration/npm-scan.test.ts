import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { NpmExtractor } from '../../src/extractors/npm-extractor.js';
import { scan } from '../../src/core/scanner.js';

const FIXTURES = resolve(__dirname, '..', 'fixtures');

describe('npm scan integration', () => {
  const extractor = new NpmExtractor();

  it('passes clean package with zero findings', async () => {
    const result = await scan(extractor, resolve(FIXTURES, 'clean-package'));
    expect(result.verdict).toBe('PASS');
    expect(result.findings).toHaveLength(0);
    expect(result.stats.filesScanned).toBeGreaterThan(0);
  });

  it('blocks leaky package with source maps, env, credentials', async () => {
    const result = await scan(extractor, resolve(FIXTURES, 'leaky-package'));
    expect(result.verdict).toBe('BLOCK');

    const blockFindings = result.findings.filter(f => f.severity === 'block');
    expect(blockFindings.length).toBeGreaterThanOrEqual(3);

    const ruleIds = blockFindings.map(f => f.ruleId);
    expect(ruleIds).toContain('source-maps');
    expect(ruleIds).toContain('env-files');
    expect(ruleIds).toContain('credentials');
  });

  it('extracts correct package name and version', async () => {
    const name = await extractor.getPackageName(resolve(FIXTURES, 'clean-package'));
    const version = await extractor.getPackageVersion(resolve(FIXTURES, 'clean-package'));
    expect(name).toBe('clean-test-pkg');
    expect(version).toBe('1.0.0');
  });

  it('respects config ignore patterns', async () => {
    const result = await scan(extractor, resolve(FIXTURES, 'leaky-package'), {
      rules: {},
      ignore: ['dist/**', 'secrets/**'],
      maxFileSize: 1_048_576,
      maxPackageSize: 10_485_760,
      failOn: 'block',
      output: 'console',
      llm: { enabled: false, provider: 'claude', maxCalls: 20, cache: true },
    });

    // source-maps and credentials should be ignored since their paths are ignored
    const sourceMapFindings = result.findings.filter(f => f.ruleId === 'source-maps');
    expect(sourceMapFindings).toHaveLength(0);

    const credFindings = result.findings.filter(f => f.ruleId === 'credentials');
    expect(credFindings).toHaveLength(0);
  });

  it('respects rule disable config', async () => {
    const result = await scan(extractor, resolve(FIXTURES, 'leaky-package'), {
      rules: { 'source-maps': { enabled: false } },
      ignore: [],
      maxFileSize: 1_048_576,
      maxPackageSize: 10_485_760,
      failOn: 'block',
      output: 'console',
      llm: { enabled: false, provider: 'claude', maxCalls: 20, cache: true },
    });

    const sourceMapFindings = result.findings.filter(f => f.ruleId === 'source-maps');
    expect(sourceMapFindings).toHaveLength(0);

    // Other rules should still fire
    expect(result.verdict).toBe('BLOCK');
  });
});
