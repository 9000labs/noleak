import { z } from 'zod';

const RuleOverrideSchema = z.object({
  enabled: z.boolean().default(true),
  severity: z.enum(['info', 'warn', 'block']).optional(),
  options: z.record(z.unknown()).optional(),
});

export const AuditGateConfigSchema = z.object({
  rules: z.record(z.string(), RuleOverrideSchema).default({}),
  ignore: z.array(z.string()).default([]),
  maxFileSize: z.number().default(1_048_576),
  maxPackageSize: z.number().default(10_485_760),
  failOn: z.enum(['block', 'warn', 'info']).default('block'),
  output: z.enum(['console', 'json']).default('console'),
  llm: z.object({
    enabled: z.boolean().default(false),
    provider: z.enum(['claude', 'openai']).default('claude'),
    model: z.string().optional(),
    apiKey: z.string().optional(),
    maxCalls: z.number().default(20),
    cache: z.boolean().default(true),
  }).default({}),
});

export type AuditGateConfig = z.infer<typeof AuditGateConfigSchema>;

export const DEFAULT_CONFIG: AuditGateConfig = AuditGateConfigSchema.parse({});
