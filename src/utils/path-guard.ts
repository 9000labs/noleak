import { resolve, sep } from 'node:path';

/**
 * Ensure a resolved file path stays within the root directory.
 * Prevents path traversal attacks (e.g., ../../etc/passwd).
 */
export function assertWithinRoot(root: string, filePath: string): void {
  const resolvedRoot = resolve(root);
  const resolvedPath = resolve(filePath);

  if (!resolvedPath.startsWith(resolvedRoot + sep) && resolvedPath !== resolvedRoot) {
    throw new Error(`Path traversal blocked: "${filePath}" escapes "${root}"`);
  }
}
