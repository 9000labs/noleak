import { stat, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { PackageExtractor } from './extractor.js';
import type { FileEntry } from '../core/file-entry.js';

/**
 * GitHub Release extractor scans directories commonly used to build
 * release artifacts (dist/, build/, release/, out/). Catches secrets
 * and source that get bundled into release binaries/archives.
 */
export class GitHubReleaseExtractor implements PackageExtractor {
  ecosystem = 'github-release';

  async getFiles(packagePath: string): Promise<FileEntry[]> {
    const absPath = resolve(packagePath);
    const entries: FileEntry[] = [];

    // Scan release artifact directories
    const artifactDirs = ['dist', 'build', 'release', 'out', 'artifacts', 'bin'];
    for (const dir of artifactDirs) {
      const fullDir = join(absPath, dir);
      if (existsSync(fullDir)) {
        entries.push(...await this.walkDir(absPath, fullDir));
      }
    }

    // Also scan root for common release files
    const rootItems = await readdir(absPath, { withFileTypes: true }).catch(() => []);
    for (const item of rootItems) {
      if (!item.isFile()) continue;
      const ext = item.name.substring(item.name.lastIndexOf('.'));
      // Release artifact extensions
      if (['.zip', '.tar', '.gz', '.tgz', '.exe', '.msi', '.dmg', '.deb', '.rpm', '.AppImage'].includes(ext)) {
        const fullPath = join(absPath, item.name);
        const stats = await stat(fullPath);
        entries.push({ relativePath: item.name, absolutePath: fullPath, size: stats.size });
      }
    }

    return entries;
  }

  private async walkDir(root: string, dir: string): Promise<FileEntry[]> {
    const entries: FileEntry[] = [];
    let items;
    try { items = await readdir(dir, { withFileTypes: true }); } catch { return entries; }
    for (const item of items) {
      const fullPath = join(dir, item.name);
      const relativePath = fullPath.slice(root.length + 1).replace(/\\/g, '/');
      if (item.isDirectory()) {
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
    return Promise.resolve(resolve(packagePath).split(/[/\\]/).pop() ?? 'unknown');
  }

  getPackageVersion(packagePath: string): Promise<string> {
    return Promise.resolve('0.0.0');
  }
}
