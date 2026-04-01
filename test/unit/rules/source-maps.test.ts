import { describe, it, expect } from 'vitest';
import { sourceMapRule } from '../../../src/rules/builtin/source-maps.js';
import type { RuleContext } from '../../../src/rules/rule.js';

function mockContext(files: { relativePath: string; size: number }[]): RuleContext {
  return {
    packageName: 'test-pkg',
    packageVersion: '1.0.0',
    files: files.map(f => ({ ...f, absolutePath: `/fake/${f.relativePath}` })),
    packagePath: '/fake',
  };
}

describe('source-maps rule', () => {
  it('flags .js.map files as block', async () => {
    const ctx = mockContext([
      { relativePath: 'dist/index.js', size: 5000 },
      { relativePath: 'dist/index.js.map', size: 487000 },
    ]);
    const findings = await sourceMapRule.run(ctx);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe('block');
    expect(findings[0]!.filePath).toBe('dist/index.js.map');
  });

  it('flags .css.map files', async () => {
    const ctx = mockContext([
      { relativePath: 'dist/style.css.map', size: 1000 },
    ]);
    const findings = await sourceMapRule.run(ctx);
    expect(findings).toHaveLength(1);
  });

  it('flags .d.ts.map files', async () => {
    const ctx = mockContext([
      { relativePath: 'dist/index.d.ts.map', size: 500 },
    ]);
    const findings = await sourceMapRule.run(ctx);
    expect(findings).toHaveLength(1);
  });

  it('ignores non-map files', async () => {
    const ctx = mockContext([
      { relativePath: 'dist/index.js', size: 5000 },
      { relativePath: 'src/mapping.ts', size: 200 },
      { relativePath: 'docs/sitemap.xml', size: 300 },
    ]);
    const findings = await sourceMapRule.run(ctx);
    expect(findings).toHaveLength(0);
  });

  it('returns empty for no files', async () => {
    const ctx = mockContext([]);
    const findings = await sourceMapRule.run(ctx);
    expect(findings).toHaveLength(0);
  });
});
