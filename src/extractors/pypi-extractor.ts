import { stat, readdir } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { PackageExtractor } from './extractor.js';
import type { FileEntry } from '../core/file-entry.js';

// SECURITY: No shell execution. PyPI extractor uses static analysis only.
// Running `python -m build` or `setup.py` would execute arbitrary code
// from the target project, which is unacceptable for a security tool.

export class PyPIExtractor implements PackageExtractor {
  ecosystem = 'pypi';

  async getFiles(packagePath: string): Promise<FileEntry[]> {
    const absPath = resolve(packagePath);
    return this.scanPythonProject(absPath);
  }

  private async scanPythonProject(absPath: string): Promise<FileEntry[]> {
    const entries: FileEntry[] = [];
    const ignore = this.loadGitignorePatterns(absPath);

    // Find all Python-related files
    const allFiles = await this.walkDir(absPath, absPath, ignore);
    return allFiles;
  }

  private async walkDir(root: string, dir: string, ignore: Set<string>): Promise<FileEntry[]> {
    const entries: FileEntry[] = [];
    const items = await readdir(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = join(dir, item.name);
      const relativePath = fullPath.slice(root.length + 1).replace(/\\/g, '/');

      // Skip common non-publishable dirs
      if (item.isDirectory()) {
        if (['node_modules', '.git', '__pycache__', '.tox', '.nox', '.mypy_cache',
             '.pytest_cache', '.eggs', '*.egg-info', 'venv', '.venv', 'env',
             '.env', 'dist', 'build'].includes(item.name)) continue;
        if (item.name.endsWith('.egg-info')) continue;
        if (ignore.has(item.name)) continue;

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

  private loadGitignorePatterns(absPath: string): Set<string> {
    const patterns = new Set<string>();
    const gitignorePath = join(absPath, '.gitignore');
    if (existsSync(gitignorePath)) {
      const content = readFileSync(gitignorePath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          patterns.add(trimmed.replace(/\/$/, ''));
        }
      }
    }
    return patterns;
  }

  private async resolveFiles(absPath: string, relativePaths: string[]): Promise<FileEntry[]> {
    const entries: FileEntry[] = [];
    for (const relativePath of relativePaths) {
      const absolutePath = join(absPath, relativePath);
      try {
        const stats = await stat(absolutePath);
        if (stats.isFile()) {
          entries.push({ relativePath, absolutePath, size: stats.size });
        }
      } catch { /* skip */ }
    }
    return entries;
  }

  getPackageName(packagePath: string): Promise<string> {
    const absPath = resolve(packagePath);

    // Try pyproject.toml
    const pyproject = join(absPath, 'pyproject.toml');
    if (existsSync(pyproject)) {
      const content = readFileSync(pyproject, 'utf-8');
      const match = content.match(/name\s*=\s*"([^"]+)"/);
      if (match) return Promise.resolve(match[1]!);
    }

    // Try setup.py
    const setupPy = join(absPath, 'setup.py');
    if (existsSync(setupPy)) {
      const content = readFileSync(setupPy, 'utf-8');
      const match = content.match(/name\s*=\s*['"]([^'"]+)['"]/);
      if (match) return Promise.resolve(match[1]!);
    }

    // Try setup.cfg
    const setupCfg = join(absPath, 'setup.cfg');
    if (existsSync(setupCfg)) {
      const content = readFileSync(setupCfg, 'utf-8');
      const match = content.match(/name\s*=\s*(.+)/);
      if (match) return Promise.resolve(match[1]!.trim());
    }

    return Promise.resolve('unknown');
  }

  getPackageVersion(packagePath: string): Promise<string> {
    const absPath = resolve(packagePath);

    const pyproject = join(absPath, 'pyproject.toml');
    if (existsSync(pyproject)) {
      const content = readFileSync(pyproject, 'utf-8');
      const match = content.match(/version\s*=\s*"([^"]+)"/);
      if (match) return Promise.resolve(match[1]!);
    }

    const setupPy = join(absPath, 'setup.py');
    if (existsSync(setupPy)) {
      const content = readFileSync(setupPy, 'utf-8');
      const match = content.match(/version\s*=\s*['"]([^'"]+)['"]/);
      if (match) return Promise.resolve(match[1]!);
    }

    return Promise.resolve('0.0.0');
  }
}
