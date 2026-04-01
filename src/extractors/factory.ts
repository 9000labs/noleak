import type { PackageExtractor } from './extractor.js';
import { NpmExtractor } from './npm-extractor.js';
import { PyPIExtractor } from './pypi-extractor.js';
import { DockerExtractor } from './docker-extractor.js';
import { MavenExtractor } from './maven-extractor.js';
import { NuGetExtractor } from './nuget-extractor.js';
import { CratesExtractor } from './crates-extractor.js';
import { RubyGemsExtractor } from './rubygems-extractor.js';
import { GitHubReleaseExtractor } from './github-release-extractor.js';
import { VSCodeExtractor } from './vscode-extractor.js';
import { ChromeExtractor } from './chrome-extractor.js';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const ECOSYSTEMS = [
  'npm', 'pypi', 'docker', 'maven', 'nuget', 'crates', 'rubygems',
  'github-release', 'vscode', 'chrome',
] as const;

export type Ecosystem = typeof ECOSYSTEMS[number];

export function createExtractor(ecosystem: Ecosystem): PackageExtractor {
  switch (ecosystem) {
    case 'npm': return new NpmExtractor();
    case 'pypi': return new PyPIExtractor();
    case 'docker': return new DockerExtractor();
    case 'maven': return new MavenExtractor();
    case 'nuget': return new NuGetExtractor();
    case 'crates': return new CratesExtractor();
    case 'rubygems': return new RubyGemsExtractor();
    case 'github-release': return new GitHubReleaseExtractor();
    case 'vscode': return new VSCodeExtractor();
    case 'chrome': return new ChromeExtractor();
  }
}

/**
 * Auto-detect ecosystem from project files.
 * Returns the detected ecosystem or null if ambiguous.
 */
export function detectEcosystem(packagePath: string): Ecosystem | null {
  const absPath = resolve(packagePath);
  const has = (f: string) => existsSync(join(absPath, f));

  // Order matters: more specific first
  if (has('Cargo.toml')) return 'crates';
  if (has('manifest.json') && hasManifestVersion(absPath)) return 'chrome';
  if (has('.vscodeignore') || (has('package.json') && hasVscodeEngine(absPath))) return 'vscode';
  if (has('Dockerfile') || has('docker-compose.yml')) return 'docker';
  if (has('pyproject.toml') || has('setup.py') || has('setup.cfg')) return 'pypi';
  if (has('pom.xml') || has('build.gradle') || has('build.gradle.kts')) return 'maven';
  if (has('package.json')) return 'npm';
  if (hasGemspec(absPath)) return 'rubygems';
  if (hasCsproj(absPath)) return 'nuget';

  return null;
}

function hasManifestVersion(absPath: string): boolean {
  try {
    const m = JSON.parse(require('node:fs').readFileSync(join(absPath, 'manifest.json'), 'utf-8'));
    return m.manifest_version !== undefined;
  } catch { return false; }
}

function hasVscodeEngine(absPath: string): boolean {
  try {
    const pkg = JSON.parse(require('node:fs').readFileSync(join(absPath, 'package.json'), 'utf-8'));
    return pkg.engines?.vscode !== undefined;
  } catch { return false; }
}

function hasGemspec(absPath: string): boolean {
  try {
    return require('node:fs').readdirSync(absPath).some((f: string) => f.endsWith('.gemspec'));
  } catch { return false; }
}

function hasCsproj(absPath: string): boolean {
  try {
    return require('node:fs').readdirSync(absPath).some((f: string) => f.endsWith('.csproj'));
  } catch { return false; }
}
