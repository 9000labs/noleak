import { stat, readdir } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { PackageExtractor } from './extractor.js';
import type { FileEntry } from '../core/file-entry.js';

/**
 * Chrome Web Store extension extractor.
 * Scans the extension directory that would be packaged as .crx/.zip.
 */
export class ChromeExtractor implements PackageExtractor {
  ecosystem = 'chrome';

  async getFiles(packagePath: string): Promise<FileEntry[]> {
    const absPath = resolve(packagePath);
    return this.walkDir(absPath, absPath);
  }

  private async walkDir(root: string, dir: string): Promise<FileEntry[]> {
    const entries: FileEntry[] = [];
    let items;
    try { items = await readdir(dir, { withFileTypes: true }); } catch { return entries; }

    for (const item of items) {
      const fullPath = join(dir, item.name);
      const relativePath = fullPath.slice(root.length + 1).replace(/\\/g, '/');

      if (item.isDirectory()) {
        if (['.git', 'node_modules', '.github', 'test', 'tests', '__tests__'].includes(item.name)) continue;
        entries.push(...await this.walkDir(root, fullPath));
      } else {
        try {
          const stats = await stat(fullPath);
          entries.push({ relativePath, absolutePath: fullPath, size: stats.size });
        } catch { /* skip */ }
      }
    }
    return entries;
  }

  getPackageName(packagePath: string): Promise<string> {
    const manifestPath = join(resolve(packagePath), 'manifest.json');
    if (existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
        return Promise.resolve(manifest.name ?? 'unknown');
      } catch { /* fallback */ }
    }
    return Promise.resolve(resolve(packagePath).split(/[/\\]/).pop() ?? 'unknown');
  }

  getPackageVersion(packagePath: string): Promise<string> {
    const manifestPath = join(resolve(packagePath), 'manifest.json');
    if (existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
        return Promise.resolve(manifest.version ?? '0.0.0');
      } catch { /* fallback */ }
    }
    return Promise.resolve('0.0.0');
  }
}
