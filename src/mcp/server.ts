/**
 * Audit Gate MCP Server
 *
 * Provides a single tool "audit_package" that scans npm packages
 * before publishing. Designed to work with Claude Code, Cursor,
 * and any MCP-compatible client.
 *
 * Usage:
 *   node dist/mcp/server.js
 *
 * Or add to claude_desktop_config.json:
 *   {
 *     "mcpServers": {
 *       "noleak": {
 *         "command": "node",
 *         "args": ["path/to/noleak/dist/mcp/server.js"]
 *       }
 *     }
 *   }
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { resolve } from 'node:path';
import { createExtractor, detectEcosystem, ECOSYSTEMS } from '../extractors/factory.js';
import type { Ecosystem } from '../extractors/factory.js';
import { scan } from '../core/scanner.js';
import { loadConfig } from '../config/loader.js';

const server = new Server(
  { name: 'noleak', version: '0.1.1' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'audit_package',
      description:
        'Audit an npm package before publishing. Scans for source maps, credentials, ' +
        'env files, and other sensitive content that should not be published. ' +
        'Returns PASS/WARN/BLOCK verdict with detailed findings.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          path: {
            type: 'string',
            description: 'Path to the package directory (default: current directory)',
          },
          output: {
            type: 'string',
            enum: ['summary', 'full', 'json'],
            description: 'Output detail level (default: summary)',
          },
        },
      },
    },
    {
      name: 'list_rules',
      description: 'List all available audit rules with their severity and description.',
      inputSchema: {
        type: 'object' as const,
        properties: {},
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'audit_package') {
    return handleAuditPackage(args as { path?: string; output?: string });
  }

  if (name === 'list_rules') {
    return handleListRules();
  }

  return {
    content: [{ type: 'text' as const, text: `Unknown tool: ${name}` }],
    isError: true,
  };
});

async function handleAuditPackage(args: { path?: string; output?: string; ecosystem?: string }) {
  const packagePath = resolve(args.path ?? '.');
  const outputMode = args.output ?? 'summary';

  try {
    const eco = (args.ecosystem as Ecosystem) ?? detectEcosystem(packagePath) ?? 'npm';
    const extractor = createExtractor(eco);
    const config = await loadConfig(packagePath);
    const packageName = await extractor.getPackageName(packagePath);
    const packageVersion = await extractor.getPackageVersion(packagePath);
    const result = await scan(extractor, packagePath, config);

    if (outputMode === 'json') {
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ package: `${packageName}@${packageVersion}`, ...result }, null, 2),
        }],
      };
    }

    // Build human-readable output
    const lines: string[] = [];
    lines.push(`## Audit Gate: ${packageName}@${packageVersion}`);
    lines.push('');
    lines.push(`**Verdict: ${result.verdict}**`);
    lines.push(`Files: ${result.stats.filesScanned} | Size: ${formatSize(result.stats.totalSize)} | Time: ${result.stats.durationMs}ms`);
    lines.push('');

    if (result.findings.length === 0) {
      lines.push('No issues found. Safe to publish.');
    } else {
      const blocks = result.findings.filter(f => f.severity === 'block');
      const warns = result.findings.filter(f => f.severity === 'warn');
      const infos = result.findings.filter(f => f.severity === 'info');

      if (blocks.length > 0) {
        lines.push(`### BLOCK (${blocks.length})`);
        for (const f of blocks) {
          lines.push(`- **${f.filePath}** — ${f.message}`);
          if (f.suggestion && outputMode === 'full') lines.push(`  - Fix: ${f.suggestion}`);
        }
        lines.push('');
      }

      if (warns.length > 0) {
        lines.push(`### WARN (${warns.length})`);
        for (const f of warns) {
          lines.push(`- **${f.filePath}** — ${f.message}`);
          if (f.suggestion && outputMode === 'full') lines.push(`  - Fix: ${f.suggestion}`);
        }
        lines.push('');
      }

      if (infos.length > 0 && outputMode === 'full') {
        lines.push(`### INFO (${infos.length})`);
        for (const f of infos) {
          lines.push(`- **${f.filePath}** — ${f.message}`);
        }
        lines.push('');
      }
    }

    return {
      content: [{ type: 'text' as const, text: lines.join('\n') }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text' as const, text: `Error: ${message}` }],
      isError: true,
    };
  }
}

async function handleListRules() {
  const { getAllRules } = await import('../rules/rule-registry.js');
  const rules = getAllRules();

  const lines = ['## Audit Gate Rules', ''];
  lines.push('| Rule | Severity | Description |');
  lines.push('|------|----------|-------------|');
  for (const rule of rules) {
    lines.push(`| ${rule.id} | ${rule.defaultSeverity.toUpperCase()} | ${rule.description} |`);
  }
  lines.push('');
  lines.push(`Total: ${rules.length} rules`);

  return {
    content: [{ type: 'text' as const, text: lines.join('\n') }],
  };
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
