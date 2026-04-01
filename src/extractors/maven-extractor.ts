import { stat, readdir } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { PackageExtractor } from './extractor.js';
import type { FileEntry } from '../core/file-entry.js';

/**
 * Maven/Gradle extractor scans src/main and resources that would end up
 * in the published JAR/WAR artifact.
 */
export class MavenExtractor implements PackageExtractor {
  ecosystem = 'maven';

  async getFiles(packagePath: string): Promise<FileEntry[]> {
    const absPath = resolve(packagePath);
    const entries: FileEntry[] = [];

    // Scan directories that end up in the JAR
    const publishableDirs = [
      'src/main',
      'src/main/java',
      'src/main/kotlin',
      'src/main/resources',
      'src/main/webapp',
    ];

    for (const dir of publishableDirs) {
      const fullDir = join(absPath, dir);
      if (existsSync(fullDir)) {
        const dirEntries = await this.walkDir(absPath, fullDir);
        entries.push(...dirEntries);
      }
    }

    // Also check pom.xml / build.gradle for secrets
    for (const configFile of ['pom.xml', 'build.gradle', 'build.gradle.kts', 'settings.gradle', 'settings.gradle.kts']) {
      const fullPath = join(absPath, configFile);
      if (existsSync(fullPath)) {
        const stats = await stat(fullPath);
        entries.push({ relativePath: configFile, absolutePath: fullPath, size: stats.size });
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
        if (['.git', 'target', 'build', 'node_modules'].includes(item.name)) continue;
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
    const pomPath = join(absPath, 'pom.xml');
    if (existsSync(pomPath)) {
      const content = readFileSync(pomPath, 'utf-8');
      const artifactId = content.match(/<artifactId>([^<]+)<\/artifactId>/);
      const groupId = content.match(/<groupId>([^<]+)<\/groupId>/);
      if (groupId && artifactId) return Promise.resolve(`${groupId[1]}:${artifactId[1]}`);
      if (artifactId) return Promise.resolve(artifactId[1]!);
    }
    const gradlePath = join(absPath, 'build.gradle');
    if (existsSync(gradlePath)) {
      const content = readFileSync(gradlePath, 'utf-8');
      const match = content.match(/group\s*=\s*['"]([^'"]+)['"]/);
      if (match) return Promise.resolve(match[1]!);
    }
    return Promise.resolve('unknown');
  }

  getPackageVersion(packagePath: string): Promise<string> {
    const absPath = resolve(packagePath);
    const pomPath = join(absPath, 'pom.xml');
    if (existsSync(pomPath)) {
      const content = readFileSync(pomPath, 'utf-8');
      const match = content.match(/<version>([^<]+)<\/version>/);
      if (match) return Promise.resolve(match[1]!);
    }
    const gradlePath = join(absPath, 'build.gradle');
    if (existsSync(gradlePath)) {
      const content = readFileSync(gradlePath, 'utf-8');
      const match = content.match(/version\s*=\s*['"]([^'"]+)['"]/);
      if (match) return Promise.resolve(match[1]!);
    }
    return Promise.resolve('0.0.0');
  }
}
