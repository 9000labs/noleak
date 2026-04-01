import { stat, readdir } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { PackageExtractor } from './extractor.js';
import type { FileEntry } from '../core/file-entry.js';

/**
 * Docker extractor scans the build context (files that would be sent to
 * the Docker daemon during `docker build`). This catches secrets, credentials,
 * and source code that get baked into images.
 */
export class DockerExtractor implements PackageExtractor {
  ecosystem = 'docker';

  async getFiles(packagePath: string): Promise<FileEntry[]> {
    const absPath = resolve(packagePath);
    const ignorePatterns = this.loadDockerignore(absPath);
    return this.walkDir(absPath, absPath, ignorePatterns);
  }

  private async walkDir(root: string, dir: string, ignore: string[]): Promise<FileEntry[]> {
    const entries: FileEntry[] = [];
    let items;
    try {
      items = await readdir(dir, { withFileTypes: true });
    } catch { return entries; }

    for (const item of items) {
      const fullPath = join(dir, item.name);
      const relativePath = fullPath.slice(root.length + 1).replace(/\\/g, '/');

      if (this.isIgnored(relativePath, ignore)) continue;

      if (item.isDirectory()) {
        if (['.git', 'node_modules'].includes(item.name)) continue;
        const subEntries = await this.walkDir(root, fullPath, ignore);
        entries.push(...subEntries);
      } else {
        try {
          const stats = await stat(fullPath);
          entries.push({ relativePath, absolutePath: fullPath, size: stats.size });
        } catch { /* skip */ }
      }
    }
    return entries;
  }

  private loadDockerignore(absPath: string): string[] {
    const patterns: string[] = [];
    const dockerignorePath = join(absPath, '.dockerignore');
    if (existsSync(dockerignorePath)) {
      const content = readFileSync(dockerignorePath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          patterns.push(trimmed);
        }
      }
    }
    return patterns;
  }

  private isIgnored(path: string, patterns: string[]): boolean {
    let ignored = false;
    for (const pattern of patterns) {
      const negate = pattern.startsWith('!');
      const p = negate ? pattern.slice(1) : pattern;
      const regex = p
        .replace(/\*\*/g, '{{DOUBLESTAR}}')
        .replace(/\*/g, '[^/]*')
        .replace(/\{\{DOUBLESTAR\}\}/g, '.*')
        .replace(/\?/g, '.');
      if (new RegExp(`^${regex}(/|$)`).test(path)) {
        ignored = !negate;
      }
    }
    return ignored;
  }

  getPackageName(packagePath: string): Promise<string> {
    const absPath = resolve(packagePath);
    // Try to extract image name from docker-compose or Dockerfile
    const composePath = join(absPath, 'docker-compose.yml');
    if (existsSync(composePath)) {
      const content = readFileSync(composePath, 'utf-8');
      const match = content.match(/image:\s*['"]?([^'"\s]+)/);
      if (match) return Promise.resolve(match[1]!);
    }
    // Fallback: directory name
    return Promise.resolve(absPath.split(/[/\\]/).pop() ?? 'unknown');
  }

  getPackageVersion(packagePath: string): Promise<string> {
    return Promise.resolve('latest');
  }
}
