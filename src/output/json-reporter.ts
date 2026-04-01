import type { ScanResult } from '../core/file-entry.js';

export function reportToJson(result: ScanResult, packageName: string, packageVersion: string): void {
  const output = {
    package: `${packageName}@${packageVersion}`,
    ...result,
  };
  console.log(JSON.stringify(output, null, 2));
}
