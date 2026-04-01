import type { FileEntry } from '../core/file-entry.js';

export function buildFilePrompt(
  file: FileEntry,
  content: string,
  packageName: string,
  packageDescription?: string,
): string {
  return `You are a security auditor reviewing files in an npm package about to be published publicly.

Package: ${packageName}${packageDescription ? ` — "${packageDescription}"` : ''}
File: ${file.relativePath} (${file.size} bytes)

First 2000 characters of content:
---
${content.slice(0, 2000)}
---

Should this file be included in a published npm package? Consider:
- Does it contain secrets, API keys, tokens, or credentials?
- Does it contain internal URLs, IP addresses, or infrastructure details?
- Does it appear to be an internal/private document?
- Is it a development artifact that consumers don't need?

Respond ONLY with valid JSON (no markdown):
{"shouldInclude": boolean, "confidence": 0.0-1.0, "reason": "one sentence explanation", "severity": "info"|"warn"|"block"}`;
}

export function buildPackagePrompt(
  files: FileEntry[],
  packageName: string,
  packageDescription?: string,
): string {
  const fileList = files
    .map(f => `  ${f.relativePath} (${f.size} bytes)`)
    .join('\n');

  return `You are a security auditor reviewing an npm package before public publication.

Package: ${packageName}${packageDescription ? ` — "${packageDescription}"` : ''}

File listing (${files.length} files):
${fileList}

Review this file list and identify any files that:
- Look suspicious or out of place for a published npm package
- Might contain secrets or internal information
- Are development artifacts that shouldn't be shipped
- Have unusual names or patterns suggesting accidental inclusion

Respond ONLY with valid JSON array (no markdown). Empty array if all files look fine:
[{"file": "path", "concern": "explanation", "severity": "info"|"warn"|"block"}]`;
}
