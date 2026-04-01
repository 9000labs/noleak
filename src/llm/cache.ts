import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const CACHE_DIR = join(homedir(), '.noleak', 'cache');

function ensureCacheDir(): void {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function hashKey(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

export function getCached(promptContent: string): string | null {
  try {
    const key = hashKey(promptContent);
    const path = join(CACHE_DIR, `${key}.json`);
    if (!existsSync(path)) return null;
    const data = JSON.parse(readFileSync(path, 'utf-8')) as { result: string; ts: number };
    // Cache expires after 7 days
    if (Date.now() - data.ts > 7 * 24 * 60 * 60 * 1000) return null;
    return data.result;
  } catch {
    return null;
  }
}

export function setCache(promptContent: string, result: string): void {
  try {
    ensureCacheDir();
    const key = hashKey(promptContent);
    const path = join(CACHE_DIR, `${key}.json`);
    writeFileSync(path, JSON.stringify({ result, ts: Date.now() }), 'utf-8');
  } catch {
    // Cache write failure is non-fatal
  }
}
