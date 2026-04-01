import { readFileSync } from 'node:fs';
import type { LLMProvider } from './providers/provider.js';
import type { FileEntry, Finding, Severity } from '../core/file-entry.js';
import type { AuditGateConfig } from '../config/schema.js';
import { ClaudeProvider } from './providers/claude.js';
import { OpenAIProvider } from './providers/openai.js';
import { buildFilePrompt, buildPackagePrompt } from './prompts.js';
import { getCached, setCache } from './cache.js';

interface FileLLMResult {
  shouldInclude: boolean;
  confidence: number;
  reason: string;
  severity?: string;
}

interface PackageLLMResult {
  file: string;
  concern: string;
  severity: string;
}

function parseJsonSafely<T>(raw: string): T | null {
  try {
    // Strip markdown code fences if present
    const cleaned = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

function createProvider(config: AuditGateConfig['llm']): LLMProvider | null {
  const apiKey = config.apiKey
    ?? (config.provider === 'claude' ? process.env['ANTHROPIC_API_KEY'] : undefined)
    ?? (config.provider === 'openai' ? process.env['OPENAI_API_KEY'] : undefined);

  if (!apiKey) return null;

  if (config.provider === 'claude') {
    return new ClaudeProvider(apiKey, config.model);
  }
  return new OpenAIProvider(apiKey, config.model);
}

export async function analyzWithLLM(
  files: FileEntry[],
  flaggedPaths: Set<string>,
  packageName: string,
  config: AuditGateConfig,
): Promise<Finding[]> {
  if (!config.llm.enabled) return [];

  const provider = createProvider(config.llm);
  if (!provider) return [];

  const findings: Finding[] = [];
  let callCount = 0;
  const maxCalls = config.llm.maxCalls;

  // 1. Package-level review (1 call)
  // SECURITY: Only send unflagged file names (not contents) to LLM
  const safeFiles = files.filter(f => !flaggedPaths.has(f.relativePath));
  if (callCount < maxCalls && safeFiles.length > 0) {
    const packagePrompt = buildPackagePrompt(safeFiles, packageName);

    let response: string | null = null;
    if (config.llm.cache) {
      response = getCached(packagePrompt);
    }
    if (!response) {
      response = await provider.analyze(packagePrompt);
      if (config.llm.cache) setCache(packagePrompt, response);
    }
    callCount++;

    const results = parseJsonSafely<PackageLLMResult[]>(response);
    if (results && Array.isArray(results)) {
      for (const r of results) {
        findings.push({
          ruleId: `llm/${provider.name}`,
          severity: validateSeverity(r.severity),
          filePath: r.file,
          message: r.concern,
        });
      }
    }
  }

  // 2. File-level analysis for unflagged files (remaining calls)
  const unflaggedFiles = files.filter(f => !flaggedPaths.has(f.relativePath));
  // Only analyze text-like files under 100KB
  const candidates = unflaggedFiles.filter(f =>
    f.size < 100_000 && !isBinary(f.relativePath)
  );

  for (const file of candidates) {
    if (callCount >= maxCalls) break;

    let content: string;
    try {
      content = readFileSync(file.absolutePath, 'utf-8');
    } catch {
      continue;
    }

    const filePrompt = buildFilePrompt(file, content, packageName);

    let response: string | null = null;
    if (config.llm.cache) {
      response = getCached(filePrompt);
    }
    if (!response) {
      response = await provider.analyze(filePrompt);
      if (config.llm.cache) setCache(filePrompt, response);
    }
    callCount++;

    const result = parseJsonSafely<FileLLMResult>(response);
    if (result && !result.shouldInclude && result.confidence > 0.7) {
      findings.push({
        ruleId: `llm/${provider.name}`,
        severity: (result.severity as Severity) ?? 'warn',
        filePath: file.relativePath,
        message: result.reason,
      });
    }
  }

  return findings;
}

const VALID_SEVERITIES = new Set(['info', 'warn', 'block']);
function validateSeverity(s: unknown): Severity {
  return typeof s === 'string' && VALID_SEVERITIES.has(s) ? s as Severity : 'warn';
}

function isBinary(path: string): boolean {
  const binaryExts = [
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.avif',
    '.woff', '.woff2', '.ttf', '.otf', '.eot',
    '.zip', '.tar', '.gz', '.bz2', '.7z',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx',
    '.exe', '.dll', '.so', '.dylib',
    '.node', '.wasm',
  ];
  return binaryExts.some(ext => path.endsWith(ext));
}
