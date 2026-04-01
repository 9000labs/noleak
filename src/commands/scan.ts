import { resolve } from 'node:path';
import chalk from 'chalk';
import { createExtractor, detectEcosystem, ECOSYSTEMS } from '../extractors/factory.js';
import type { Ecosystem } from '../extractors/factory.js';
import { scan } from '../core/scanner.js';
import { reportToConsole } from '../output/console-reporter.js';
import { reportToJson } from '../output/json-reporter.js';
import { loadConfig } from '../config/loader.js';
import type { Severity } from '../core/file-entry.js';

interface ScanCommandOptions {
  ecosystem?: string;
  output: 'console' | 'json';
  failOn?: string;
}

export async function scanCommand(path: string | undefined, options: ScanCommandOptions): Promise<number> {
  const packagePath = resolve(path ?? '.');

  // Determine ecosystem
  let ecosystem: Ecosystem;

  if (options.ecosystem) {
    if (!ECOSYSTEMS.includes(options.ecosystem as Ecosystem)) {
      console.error(`  Unknown ecosystem: ${options.ecosystem}`);
      console.error(`  Supported: ${ECOSYSTEMS.join(', ')}`);
      return 3;
    }
    ecosystem = options.ecosystem as Ecosystem;
  } else {
    const detected = detectEcosystem(packagePath);
    if (!detected) {
      console.error('  Could not auto-detect ecosystem.');
      console.error(`  Use --ecosystem flag. Supported: ${ECOSYSTEMS.join(', ')}`);
      return 3;
    }
    ecosystem = detected;
    if (options.output !== 'json') {
      console.log(`  ${chalk.dim(`Auto-detected: ${ecosystem}`)}`);
    }
  }

  const extractor = createExtractor(ecosystem);

  try {
    const config = await loadConfig(packagePath);
    if (options.failOn) config.failOn = options.failOn as Severity;

    const packageName = await extractor.getPackageName(packagePath);
    const packageVersion = await extractor.getPackageVersion(packagePath);
    const result = await scan(extractor, packagePath, config);

    if (options.output === 'json') {
      reportToJson(result, packageName, packageVersion);
    } else {
      reportToConsole(result, packageName, packageVersion, ecosystem);
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
