import { resolve } from 'node:path';
import { NpmExtractor } from '../extractors/npm-extractor.js';
import { scan } from '../core/scanner.js';
import { reportToConsole } from '../output/console-reporter.js';
import { reportToJson } from '../output/json-reporter.js';
import { loadConfig } from '../config/loader.js';
import type { Severity } from '../core/file-entry.js';

interface NpmCommandOptions {
  output: 'console' | 'json';
  failOn?: string;
  config?: string;
}

export async function npmCommand(path: string | undefined, options: NpmCommandOptions): Promise<number> {
  const packagePath = resolve(path ?? '.');
  const extractor = new NpmExtractor();

  try {
    const config = await loadConfig(packagePath);

    // CLI flags override config
    if (options.output) config.output = options.output;
    if (options.failOn) config.failOn = options.failOn as Severity;

    const packageName = await extractor.getPackageName(packagePath);
    const packageVersion = await extractor.getPackageVersion(packagePath);
    const result = await scan(extractor, packagePath, config);

    if (config.output === 'json') {
      reportToJson(result, packageName, packageVersion);
    } else {
      reportToConsole(result, packageName, packageVersion);
    }

    switch (result.verdict) {
      case 'PASS': return 0;
      case 'WARN': return 1;
      case 'BLOCK': return 2;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    return 3;
  }
}
