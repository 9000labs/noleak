import type { FileEntry } from '../core/file-entry.js';

export interface PackageExtractor {
  /** Name of the ecosystem (npm, pypi, docker) */
  ecosystem: string;
  /** Extract the list of files that would be published */
  getFiles(packagePath: string): Promise<FileEntry[]>;
  /** Get package name from manifest */
  getPackageName(packagePath: string): Promise<string>;
  /** Get package version from manifest */
  getPackageVersion(packagePath: string): Promise<string>;
}
