import { stat, readdir } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { PackageExtractor } from './extractor.js';
import type { FileEntry } from '../core/file-entry.js';

/**
 * VS Code extension extractor. Scans files that would be packaged
 * by `vsce package` into a .vsix file.
 * Respects .vscodeignore (like .npmignore but for VS Code extensions).
 */
export class VSCodeExtractor implements PackageExtractor {
  ecosystem = 'vscode';

  async getFiles(packagePath: string): Promise<FileEntry[]> {
    const absPath = resolve(packagePath);
    const ignorePatterns = this.loadVscodeignore(absPath);
    return this.walkDir(absPath, absPath, ignorePatterns);
  }

  private async walkDir(root: string, dir: string, ignore: string[]): Promise<FileEntry[]> {
    const entries: FileEntry[] = [];
    let items;
    try { items = await readdir(dir, { withFileTypes: true }); } catch { return entries; }

    for (const item of items) {
      const fullPath = join(dir, item.name);
      const relativePath = fullPath.slice(root.length + 1).replace(/\\/g, '/');

      if (this.isIgnored(relativePath, item.name, ignore)) continue;

      if (item.isDirectory()) {
        if (['.git', 'node_modules', '.vscode-test'].includes(item.name)) continue;
        entries.push(...await this.walkDir(root, fullPath, ignore));
      } else {
        try {
          const stats = await stat(fullPath);
          entries.push({ relativePath, absolutePath: fullPath, size: stats.size });
        } catch { /* skip */ }
      }
    }
    return entries;
  }

  private loadVscodeignore(absPath: string): string[] {
    const patterns: string[] = [];
    const ignorePath = join(absPath, '.vscodeignore');
    if (existsSync(ignorePath)) {
      const content = readFileSync(ignorePath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) patterns.push(trimmed);
      }
    }
    return patterns;
  }

  private isIgnored(path: string, name: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
      if (pattern === name || path.startsWith(pattern.replace(/\*$/, ''))) return true;
      const regex = pattern
        .replace(/\*\*/g, '{{DS}}').replace(/\*/g, '[^/]*').replace(/\{\{DS\}\}/g, '.*');
      if (new RegExp(`^${regex}$`).test(path)) return true;
    }
    return false;
  }

  getPackageName(packagePath: string): Promise<string> {
    const pkgPath = join(resolve(packagePath), 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      const publisher = pkg.publisher ?? '';
      const name = pkg.name ?? 'unknown';
      return Promise.resolve(publisher ? `${publisher}.${name}` : name);
    }
    return Promise.resolve('unknown');
  }

  getPackageVersion(packagePath: string): Promise<string> {
    const pkgPath = join(resolve(packagePath), 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      return Promise.resolve(pkg.version ?? '0.0.0');
    }
    return Promise.resolve('0.0.0');
  }
}
