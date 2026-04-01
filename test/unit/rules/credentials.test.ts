import { describe, it, expect } from 'vitest';
import { credentialsRule } from '../../../src/rules/builtin/credentials.js';
import type { RuleContext } from '../../../src/rules/rule.js';

function mockContext(files: { relativePath: string; size: number }[]): RuleContext {
  return {
    packageName: 'test-pkg',
    packageVersion: '1.0.0',
    files: files.map(f => ({ ...f, absolutePath: `/fake/${f.relativePath}` })),
    packagePath: '/fake',
  };
}

describe('credentials rule', () => {
  it('flags .pem files', async () => {
    const ctx = mockContext([{ relativePath: 'certs/server.pem', size: 1000 }]);
    const findings = await credentialsRule.run(ctx);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe('block');
  });

  it('flags id_rsa', async () => {
    const ctx = mockContext([{ relativePath: 'id_rsa', size: 2000 }]);
    const findings = await credentialsRule.run(ctx);
    expect(findings).toHaveLength(1);
  });

  it('flags credentials.json', async () => {
    const ctx = mockContext([{ relativePath: 'credentials.json', size: 500 }]);
    const findings = await credentialsRule.run(ctx);
    expect(findings).toHaveLength(1);
  });

  it('flags .npmrc', async () => {
    const ctx = mockContext([{ relativePath: '.npmrc', size: 100 }]);
    const findings = await credentialsRule.run(ctx);
    expect(findings).toHaveLength(1);
  });

  it('ignores normal files', async () => {
    const ctx = mockContext([
      { relativePath: 'dist/index.js', size: 5000 },
      { relativePath: 'README.md', size: 300 },
    ]);
    const findings = await credentialsRule.run(ctx);
    expect(findings).toHaveLength(0);
  });
});
