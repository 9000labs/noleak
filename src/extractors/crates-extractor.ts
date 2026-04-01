import { stat } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import type { PackageExtractor } from './extractor.js';
import type { FileEntry } from '../core/file-entry.js';

export class CratesExtractor implements PackageExtractor {
  ecosystem = 'crates';

  async getFiles(packagePath: string): Promise<FileEntry[]> {
    const absPath = resolve(packagePath);

    // SECURITY: execFileSync (no shell) prevents command injection
    try {
      const output = execFileSync('cargo', ['package', '--list'], {
        cwd: absPath, encoding: 'utf-8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe'],
      });
      const files = output.split('\n').filter(Boolean);
      return this.resolveFiles(absPath, files);
    } catch { /* fallback */ }

    // Fallback: scan src/ and Cargo.toml
    return this.scanRustProject(absPath);
  }

  private async scanRustProject(absPath: string): Promise<FileEntry[]> {
    const entries: FileEntry[] = [];
    const scanDirs = ['src', 'benches', 'examples'];

    for (const dir of scanDirs) {
      const fullDir = join(absPath, dir);
      if (existsSync(fullDir)) {
        entries.push(...await this.walkDir(absPath, fullDir));
      }
    }

    // Include root config files
    for (const f of ['Cargo.toml', 'Cargo.lock', 'build.rs', 'README.md', 'LICENSE']) {
      const fp = join(absPath, f);
      if (existsSync(fp)) {
        const stats = await stat(fp);
        entries.push({ relativePath: f, absolutePath: fp, size: stats.size });
      }
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
        if (['target', '.git'].includes(item.name)) continue;
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

  private async resolveFiles(absPath: string, relativePaths: string[]): Promise<FileEntry[]> {
    const entries: FileEntry[] = [];
    for (const rel of relativePaths) {
      const abs = join(absPath, rel);
      try {
        const stats = await stat(abs);
        entries.push({ relativePath: rel, absolutePath: abs, size: stats.size });
      } catch { /* skip */ }
    }
    return entries;
  }

  getPackageName(packagePath: string): Promise<string> {
    const cargoToml = join(resolve(packagePath), 'Cargo.toml');
    if (existsSync(cargoToml)) {
      const content = readFileSync(cargoToml, 'utf-8');
      const match = content.match(/name\s*=\s*"([^"]+)"/);
      if (match) return Promise.resolve(match[1]!);
    }
    return Promise.resolve('unknown');
  }

  getPackageVersion(packagePath: string): Promise<string> {
    const cargoToml = join(resolve(packagePath), 'Cargo.toml');
    if (existsSync(cargoToml)) {
      const content = readFileSync(cargoToml, 'utf-8');
      const match = content.match(/version\s*=\s*"([^"]+)"/);
      if (match) return Promise.resolve(match[1]!);
    }
    return Promise.resolve('0.0.0');
  }
}
