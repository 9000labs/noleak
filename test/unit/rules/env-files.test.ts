import { describe, it, expect } from 'vitest';
import { envFilesRule } from '../../../src/rules/builtin/env-files.js';
import type { RuleContext } from '../../../src/rules/rule.js';

function mockContext(files: { relativePath: string; size: number }[]): RuleContext {
  return {
    packageName: 'test-pkg',
    packageVersion: '1.0.0',
    files: files.map(f => ({ ...f, absolutePath: `/fake/${f.relativePath}` })),
    packagePath: '/fake',
  };
}

describe('env-files rule', () => {
  it('flags .env file', async () => {
    const ctx = mockContext([{ relativePath: '.env', size: 100 }]);
    const findings = await envFilesRule.run(ctx);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe('block');
  });

  it('flags .env.production', async () => {
    const ctx = mockContext([{ relativePath: '.env.production', size: 100 }]);
    const findings = await envFilesRule.run(ctx);
    expect(findings).toHaveLength(1);
  });

  it('allows .env.example', async () => {
    const ctx = mockContext([{ relativePath: '.env.example', size: 100 }]);
    const findings = await envFilesRule.run(ctx);
    expect(findings).toHaveLength(0);
  });

  it('allows .env.template', async () => {
    const ctx = mockContext([{ relativePath: '.env.template', size: 100 }]);
    const findings = await envFilesRule.run(ctx);
    expect(findings).toHaveLength(0);
  });
});
