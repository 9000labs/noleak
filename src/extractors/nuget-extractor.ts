import { stat, readdir } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { PackageExtractor } from './extractor.js';
import type { FileEntry } from '../core/file-entry.js';

// SECURITY: No shell execution. Uses static file analysis only.

export class NuGetExtractor implements PackageExtractor {
  ecosystem = 'nuget';

  async getFiles(packagePath: string): Promise<FileEntry[]> {
    const absPath = resolve(packagePath);
    return this.scanDotNetProject(absPath);
  }

  private async scanDotNetProject(absPath: string): Promise<FileEntry[]> {
    const entries: FileEntry[] = [];
    const items = await readdir(absPath, { withFileTypes: true }).catch(() => []);

    for (const item of items) {
      const fullPath = join(absPath, item.name);
      const relativePath = item.name;

      if (item.isDirectory()) {
        if (['bin', 'obj', '.git', 'node_modules', '.vs', 'packages'].includes(item.name)) continue;
        entries.push(...await this.walkDir(absPath, fullPath));
      } else {
        try {
          const stats = await stat(fullPath);
          entries.push({ relativePath, absolutePath: fullPath, size: stats.size });
        } catch { /* skip */ }
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
        if (['bin', 'obj', '.git', 'node_modules'].includes(item.name)) continue;
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
    const absPath = resolve(packagePath);
    // Find .csproj
    const files = existsSync(absPath) ? require('node:fs').readdirSync(absPath) as string[] : [];
    const csproj = files.find((f: string) => f.endsWith('.csproj'));
    if (csproj) {
      const content = readFileSync(join(absPath, csproj), 'utf-8');
      const match = content.match(/<PackageId>([^<]+)<\/PackageId>/i) ??
                    content.match(/<AssemblyName>([^<]+)<\/AssemblyName>/i);
      if (match) return Promise.resolve(match[1]!);
      return Promise.resolve(csproj.replace('.csproj', ''));
    }
    return Promise.resolve('unknown');
  }

  getPackageVersion(packagePath: string): Promise<string> {
    const absPath = resolve(packagePath);
    const files = existsSync(absPath) ? require('node:fs').readdirSync(absPath) as string[] : [];
    const csproj = files.find((f: string) => f.endsWith('.csproj'));
    if (csproj) {
      const content = readFileSync(join(absPath, csproj), 'utf-8');
      const match = content.match(/<Version>([^<]+)<\/Version>/i) ??
                    content.match(/<PackageVersion>([^<]+)<\/PackageVersion>/i);
      if (match) return Promise.resolve(match[1]!);
    }
    return Promise.resolve('0.0.0');
  }
}
