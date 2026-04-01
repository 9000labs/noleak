import { stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { PackageExtractor } from './extractor.js';
import type { FileEntry } from '../core/file-entry.js';
import { assertWithinRoot } from '../utils/path-guard.js';

const require = createRequire(import.meta.url);

interface PackWalker {
  on(event: 'done', cb: (files: string[]) => void): void;
  on(event: 'error', cb: (err: Error) => void): void;
  start(): void;
}

function getPackedFiles(absPath: string): Promise<string[]> {
  return new Promise((res, reject) => {
    const packlist = require('npm-packlist') as { Walker: new (opts: { path: string }) => PackWalker };
    const walker = new packlist.Walker({ path: absPath });
    walker.on('done', (files: string[]) => res(files));
    walker.on('error', reject);
    walker.start();
  });
}

export class NpmExtractor implements PackageExtractor {
  ecosystem = 'npm';

  async getFiles(packagePath: string): Promise<FileEntry[]> {
    const absPath = resolve(packagePath);
    const files = await getPackedFiles(absPath);

    const entries: FileEntry[] = [];
    for (const relativePath of files) {
      const absolutePath = join(absPath, relativePath);
      try {
        assertWithinRoot(absPath, absolutePath);
        const stats = await stat(absolutePath);
        entries.push({
          relativePath,
          absolutePath,
          size: stats.size,
        });
      } catch {
        // File listed but inaccessible, skip
      }
    }

    return entries;
  }

  getPackageName(packagePath: string): Promise<string> {
    const pkg = this.readPackageJson(packagePath);
    return Promise.resolve(pkg.name ?? 'unknown');
  }

  getPackageVersion(packagePath: string): Promise<string> {
    const pkg = this.readPackageJson(packagePath);
    return Promise.resolve(pkg.version ?? '0.0.0');
  }

  private readPackageJson(packagePath: string): Record<string, unknown> {
    const pkgPath = join(resolve(packagePath), 'package.json');
    const raw = readFileSync(pkgPath, 'utf-8');
    return JSON.parse(raw) as Record<string, unknown>;
  }
}
