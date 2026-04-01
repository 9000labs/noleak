import type { FileEntry, Finding, Severity } from '../core/file-entry.js';

export interface RuleContext {
  packageName: string;
  packageVersion: string;
  files: FileEntry[];
  packagePath: string;
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  defaultSeverity: Severity;
  run(ctx: RuleContext): Promise<Finding[]>;
}
