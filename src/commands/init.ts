import { writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const STARTER_CONFIG = `{
  "rules": {
    "source-maps": { "severity": "block" },
    "env-files": { "severity": "block" },
    "credentials": { "severity": "block" },
    "lockfiles": { "severity": "warn" },
    "large-files": { "severity": "warn", "options": { "maxSize": 1048576 } }
  },
  "ignore": [],
  "failOn": "block",
  "llm": {
    "enabled": false
  }
}
`;

export function initCommand(path?: string): number {
  const dir = resolve(path ?? '.');
  const configPath = join(dir, '.noleakrc.json');

  if (existsSync(configPath)) {
    console.log(`  .noleakrc.json already exists at ${configPath}`);
    return 1;
  }

  writeFileSync(configPath, STARTER_CONFIG, 'utf-8');
  console.log('');
  console.log(`  Created .noleakrc.json`);
  console.log('');
  console.log('  Next steps:');
  console.log('    1. Review and customize the config');
  console.log('    2. Run: noleak npm .');
  console.log('    3. Add to prepublish: "prepublishOnly": "noleak npm ."');
  console.log('');
  return 0;
}
