import type { Rule } from './rule.js';
import { sourceMapRule } from './builtin/source-maps.js';
import { envFilesRule } from './builtin/env-files.js';
import { credentialsRule } from './builtin/credentials.js';
import { lockfilesRule } from './builtin/lockfiles.js';
import { gitDirectoryRule } from './builtin/git-directory.js';
import { internalDocsRule } from './builtin/internal-docs.js';
import { testFixturesRule } from './builtin/test-fixtures.js';
import { largeFilesRule } from './builtin/large-files.js';
import { buildArtifactsRule } from './builtin/build-artifacts.js';
import { dockerFilesRule } from './builtin/docker-files.js';
import { ciConfigRule } from './builtin/ci-config.js';
import { ideConfigRule } from './builtin/ide-config.js';
import { entropyScanRule } from './builtin/entropy-scan.js';
import { unexpectedGrowthRule } from './builtin/unexpected-growth.js';

const builtinRules: Rule[] = [
  sourceMapRule,
  envFilesRule,
  credentialsRule,
  lockfilesRule,
  gitDirectoryRule,
  internalDocsRule,
  testFixturesRule,
  largeFilesRule,
  buildArtifactsRule,
  dockerFilesRule,
  ciConfigRule,
  ideConfigRule,
  entropyScanRule,
  unexpectedGrowthRule,
];

export function getAllRules(): Rule[] {
  return [...builtinRules];
}

export function getRuleById(id: string): Rule | undefined {
  return builtinRules.find(r => r.id === id);
}
