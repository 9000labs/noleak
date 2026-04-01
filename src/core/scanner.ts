import type { PackageExtractor } from '../extractors/extractor.js';
import type { FileEntry, Finding, ScanResult, Severity } from './file-entry.js';
import type { RuleContext } from '../rules/rule.js';
import type { AuditGateConfig } from '../config/schema.js';
import { DEFAULT_CONFIG } from '../config/schema.js';
import { getAllRules } from '../rules/rule-registry.js';
import { buildVerdict } from './verdict.js';
import { analyzWithLLM } from '../llm/llm-analyzer.js';

function matchesIgnore(filePath: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    // SECURITY: Convert glob to regex safely.
    // 1. Extract glob tokens, 2. Escape remaining regex chars, 3. Re-insert tokens.
    const tokens: [number, string][] = [];
    let i = 0;
    let safe = pattern;

    // Replace ** first (before single *)
    safe = safe.replace(/\*\*/g, () => { tokens.push([i++, '.*']); return `\x00${i - 1}\x00`; });
    safe = safe.replace(/\*/g, () => { tokens.push([i++, '[^/]*']); return `\x00${i - 1}\x00`; });
    safe = safe.replace(/\?/g, () => { tokens.push([i++, '.']); return `\x00${i - 1}\x00`; });

    // Escape regex metacharacters in the remaining literal parts
    safe = safe.replace(/[.+^${}()|[\]\\]/g, '\\$&');

    // Re-insert glob tokens
    for (const [idx, replacement] of tokens) {
      safe = safe.replace(`\x00${idx}\x00`, replacement);
    }

    return new RegExp(`^${safe}$`).test(filePath);
  });
}

export async function scan(
  extractor: PackageExtractor,
  packagePath: string,
  config: AuditGateConfig = DEFAULT_CONFIG,
): Promise<ScanResult> {
  const startTime = Date.now();

  // 1. Extract file list
  const allFiles = await extractor.getFiles(packagePath);
  const packageName = await extractor.getPackageName(packagePath);
  const packageVersion = await extractor.getPackageVersion(packagePath);

  // 2. Apply ignore patterns
  const files = config.ignore.length > 0
    ? allFiles.filter(f => !matchesIgnore(f.relativePath, config.ignore))
    : allFiles;

  // 3. Build context
  const ctx: RuleContext = {
    packageName,
    packageVersion,
    files,
    packagePath,
  };

  // 4. Get enabled rules with config overrides
  const allRules = getAllRules();
  const enabledRules = allRules.filter(rule => {
    const override = config.rules[rule.id];
    if (override && override.enabled === false) return false;
    return true;
  });

  // 5. Run all rules in parallel
  const ruleResults = await Promise.all(
    enabledRules.map(async rule => {
      const findings = await rule.run(ctx);
      // Apply severity override from config
      const override = config.rules[rule.id];
      if (override?.severity) {
        return findings.map(f => ({ ...f, severity: override.severity as Severity }));
      }
      return findings;
    }),
  );

  const ruleFindings = ruleResults.flat();

  // 6. LLM analysis (only on files not caught by rules)
  const flaggedPaths = new Set(ruleFindings.map(f => f.filePath));
  let llmUsed = false;
  let llmFindings: Finding[] = [];

  if (config.llm.enabled) {
    try {
      llmFindings = await analyzWithLLM(files, flaggedPaths, packageName, config);
      llmUsed = llmFindings.length > 0 || config.llm.enabled;
    } catch {
      // LLM failure is non-fatal
      llmUsed = false;
    }
  }

  const allFindings = [...ruleFindings, ...llmFindings];

  // 7. Build verdict
  const { verdict, findings } = buildVerdict(allFindings, config.failOn);

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  return {
    verdict,
    findings,
    stats: {
      filesScanned: files.length,
      totalSize,
      rulesRun: enabledRules.length,
      llmUsed,
      durationMs: Date.now() - startTime,
    },
  };
}
