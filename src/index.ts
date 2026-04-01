export { scan } from './core/scanner.js';
export { getAllRules, getRuleById } from './rules/rule-registry.js';
export { createExtractor, detectEcosystem, ECOSYSTEMS } from './extractors/factory.js';
export type { Ecosystem } from './extractors/factory.js';
export type { ScanResult, Finding, Severity, FileEntry } from './core/file-entry.js';
export type { Rule, RuleContext } from './rules/rule.js';
export type { PackageExtractor } from './extractors/extractor.js';
