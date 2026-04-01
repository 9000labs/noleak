export interface FileEntry {
  /** Relative path within the package (e.g. "dist/index.js") */
  relativePath: string;
  /** Absolute filesystem path for reading content */
  absolutePath: string;
  /** File size in bytes */
  size: number;
}

export type Severity = 'info' | 'warn' | 'block';

export interface Finding {
  ruleId: string;
  severity: Severity;
  filePath: string;
  message: string;
  suggestion?: string;
}

export interface ScanResult {
  verdict: 'PASS' | 'WARN' | 'BLOCK';
  findings: Finding[];
  stats: {
    filesScanned: number;
    totalSize: number;
    rulesRun: number;
    llmUsed: boolean;
    durationMs: number;
  };
}
