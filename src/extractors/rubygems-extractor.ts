import { stat } from 'node:fs/promises';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { PackageExtractor } from './extractor.js';
import type { FileEntry } from '../core/file-entry.js';

export class RubyGemsExtractor implements PackageExtractor {
  ecosystem = 'rubygems';

  async getFiles(packagePath: string): Promise<FileEntry[]> {
    const absPath = resolve(packagePath);

    // Try to parse .gemspec for files list
    const gemspec = this.findGemspec(absPath);
    if (gemspec) {
      const content = readFileSync(gemspec, 'utf-8');
      // Try to extract files array (common patterns)
      const gitMatch = content.match(/\.files\s*=\s*`git ls-files`/);
      if (gitMatch) {
        // Fallback to scanning
      }

      const arrayMatch = content.match(/\.files\s*=\s*\[([^\]]+)\]/);
      if (arrayMatch) {
        const files = arrayMatch[1]!.match(/['"]([^'"]+)['"]/g)?.map(s => s.replace(/['"]/g, '')) ?? [];
        return this.resolveFiles(absPath, files);
      }
    }

    // Fallback: scan lib/ + typical Ruby gem dirs
    return this.scanRubyProject(absPath);
  }

  private async scanRubyProject(absPath: string): Promise<FileEntry[]> {
    const entries: FileEntry[] = [];
    const dirs = ['lib', 'bin', 'ext', 'data'];

    for (const dir of dirs) {
      const fullDir = join(absPath, dir);
      if (existsSync(fullDir)) {
        entries.push(...await this.walkDir(absPath, fullDir));
      }
    }

    for (const f of ['README.md', 'LICENSE', 'CHANGELOG.md', 'Gemfile', 'Rakefile']) {
      const fp = join(absPath, f);
      if (existsSync(fp)) {
        const stats = await stat(fp);
        entries.push({ relativePath: f, absolutePath: fp, size: stats.size });
      }
    }

    const gemspec = this.findGemspec(absPath);
    if (gemspec) {
      const stats = await stat(gemspec);
      entries.push({ relativePath: gemspec.slice(absPath.length + 1), absolutePath: gemspec, size: stats.size });
    }

    return entries;
  }

  private async walkDir(root: string, dir: string): Promise<FileEntry[]> {
    const { readdir } = await import('node:fs/promises');
    const entries: FileEntry[] = [];
    let items;
    try { items = await readdir(dir, { withFileTypes: true }); } catch { return entries; }
    for (const item of items) {
      const fullPath = join(dir, item.name);
      const relativePath = fullPath.slice(root.length + 1).replace(/\\/g, '/');
      if (item.isDirectory()) {
        if (['.git', 'vendor', 'tmp'].includes(item.name)) continue;
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

  private async resolveFiles(absPath: string, paths: string[]): Promise<FileEntry[]> {
    const entries: FileEntry[] = [];
    for (const rel of paths) {
      const abs = join(absPath, rel);
      try {
        const stats = await stat(abs);
        entries.push({ relativePath: rel, absolutePath: abs, size: stats.size });
      } catch { /* skip */ }
    }
    return entries;
  }

  private findGemspec(absPath: string): string | null {
    const files = readdirSync(absPath);
    const gemspec = files.find(f => f.endsWith('.gemspec'));
    return gemspec ? join(absPath, gemspec) : null;
  }

  getPackageName(packagePath: string): Promise<string> {
    const gemspec = this.findGemspec(resolve(packagePath));
    if (gemspec) {
      const content = readFileSync(gemspec, 'utf-8');
      const match = content.match(/\.name\s*=\s*['"]([^'"]+)['"]/);
      if (match) return Promise.resolve(match[1]!);
    }
    return Promise.resolve('unknown');
  }

  getPackageVersion(packagePath: string): Promise<string> {
    const gemspec = this.findGemspec(resolve(packagePath));
    if (gemspec) {
      const content = readFileSync(gemspec, 'utf-8');
      const match = content.match(/\.version\s*=\s*['"]([^'"]+)['"]/);
      if (match) return Promise.resolve(match[1]!);
    }
    return Promise.resolve('0.0.0');
  }
}
