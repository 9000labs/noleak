import { cosmiconfig } from 'cosmiconfig';
import { AuditGateConfigSchema, DEFAULT_CONFIG } from './schema.js';
import type { AuditGateConfig } from './schema.js';

// SECURITY: Only allow declarative config formats (JSON, YAML).
// JS/CJS config files are excluded because they execute arbitrary code
// when loaded — a malicious .noleakrc.js in a repo would run on `noleak scan`.
const explorer = cosmiconfig('noleak', {
  searchPlaces: [
    '.noleakrc',
    '.noleakrc.json',
    '.noleakrc.yaml',
    '.noleakrc.yml',
    'package.json',
  ],
});

export async function loadConfig(searchFrom?: string): Promise<AuditGateConfig> {
  try {
    const result = await explorer.search(searchFrom);
    if (!result || result.isEmpty) {
      return DEFAULT_CONFIG;
    }
    return AuditGateConfigSchema.parse(result.config);
  } catch (error) {
    console.error(`Warning: Failed to load config, using defaults: ${error instanceof Error ? error.message : error}`);
    return DEFAULT_CONFIG;
  }
}

export async function loadConfigFromFile(filePath: string): Promise<AuditGateConfig> {
  try {
    const result = await explorer.load(filePath);
    if (!result || result.isEmpty) {
      return DEFAULT_CONFIG;
    }
    return AuditGateConfigSchema.parse(result.config);
  } catch (error) {
    console.error(`Warning: Failed to load config from ${filePath}, using defaults: ${error instanceof Error ? error.message : error}`);
    return DEFAULT_CONFIG;
  }
}
