import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import chalk from 'chalk';

type Target = 'claude' | 'codex' | 'all';

export function setupCommand(target: Target): number {
  console.log('');
  console.log(`  ${chalk.bold('noleak setup')} — configuring integrations`);
  console.log('');

  let ok = true;

  if (target === 'claude' || target === 'all') {
    ok = setupClaude() && ok;
  }

  if (target === 'codex' || target === 'all') {
    ok = setupCodex() && ok;
  }

  console.log('');
  return ok ? 0 : 1;
}

// ─── Claude Code ───────────────────────────────

function setupClaude(): boolean {
  console.log(chalk.cyan('  [Claude Code]'));

  const mcpOk = configureClaudeMCP();
  const hookOk = configureClaudeHook();
  const mdOk = configureClaudeMD();

  return mcpOk && hookOk && mdOk;
}

function configureClaudeMCP(): boolean {
  const claudeDir = existsSync('.claude') ? '.claude' : join(homedir(), '.claude');
  const settingsPath = join(claudeDir, 'settings.json');

  try {
    if (!existsSync(claudeDir)) mkdirSync(claudeDir, { recursive: true });

    let settings: Record<string, unknown> = {};
    if (existsSync(settingsPath)) {
      settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    }

    const mcpServers = (settings['mcpServers'] ?? {}) as Record<string, unknown>;

    // Use npx so it works regardless of install location
    mcpServers['noleak'] = {
      command: 'npx',
      args: ['-y', 'noleak', '--mcp'],
    };

    // Fallback: if local dist exists, use it directly (faster, no npx overhead)
    const localMcp = resolve('dist/mcp/server.js');
    if (existsSync(localMcp)) {
      mcpServers['noleak'] = {
        command: 'node',
        args: [localMcp],
      };
    }

    settings['mcpServers'] = mcpServers;
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');

    console.log(`  ${chalk.green('✓')} MCP server → ${settingsPath}`);
    console.log(`    Ask: "audit this package before I publish"`);
    return true;
  } catch (err) {
    console.log(`  ${chalk.red('✗')} MCP: ${errMsg(err)}`);
    return false;
  }
}

function configureClaudeHook(): boolean {
  const claudeDir = existsSync('.claude') ? '.claude' : join(homedir(), '.claude');
  const settingsPath = join(claudeDir, 'settings.json');

  try {
    let settings: Record<string, unknown> = {};
    if (existsSync(settingsPath)) {
      settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    }

    const hooks = (settings['hooks'] ?? {}) as Record<string, unknown[]>;
    const preToolUse = (hooks['PreToolUse'] ?? []) as Record<string, unknown>[];

    const alreadyExists = preToolUse.some(
      (h) => JSON.stringify(h).includes('noleak')
    );

    if (!alreadyExists) {
      preToolUse.push({
        matcher: 'Bash',
        hooks: [{
          type: 'command',
          command: `bash -c 'if echo "$TOOL_INPUT" | grep -qE "npm publish|npx publish"; then npx noleak npm . --output json; fi'`,
        }],
      });
      hooks['PreToolUse'] = preToolUse;
      settings['hooks'] = hooks;
      writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
      console.log(`  ${chalk.green('✓')} Hook → auto-audit on npm publish`);
    } else {
      console.log(`  ${chalk.green('✓')} Hook already configured`);
    }
    return true;
  } catch (err) {
    console.log(`  ${chalk.red('✗')} Hook: ${errMsg(err)}`);
    return false;
  }
}

function configureClaudeMD(): boolean {
  const claudeMdPath = 'CLAUDE.md';

  try {
    let content = existsSync(claudeMdPath) ? readFileSync(claudeMdPath, 'utf-8') : '';

    if (content.includes('noleak')) {
      console.log(`  ${chalk.green('✓')} CLAUDE.md already configured`);
      return true;
    }

    content += PUBLISH_INSTRUCTIONS_MD;
    writeFileSync(claudeMdPath, content, 'utf-8');
    console.log(`  ${chalk.green('✓')} CLAUDE.md → pre-publish audit instructions`);
    return true;
  } catch (err) {
    console.log(`  ${chalk.red('✗')} CLAUDE.md: ${errMsg(err)}`);
    return false;
  }
}

// ─── Codex ─────────────────────────────────────

function setupCodex(): boolean {
  console.log(chalk.cyan('  [Codex]'));

  const mcpOk = configureCodexMCP();
  const hookOk = configureCodexHook();
  const mdOk = configureCodexAgentsMD();

  return mcpOk && hookOk && mdOk;
}

function configureCodexMCP(): boolean {
  const codexDir = join(homedir(), '.codex');
  const configPath = join(codexDir, 'config.toml');

  try {
    if (!existsSync(codexDir)) mkdirSync(codexDir, { recursive: true });

    let content = existsSync(configPath) ? readFileSync(configPath, 'utf-8') : '';

    if (content.includes('[mcp_servers.noleak]')) {
      console.log(`  ${chalk.green('✓')} MCP already in config.toml`);
      return true;
    }

    // Append MCP server config in TOML format
    const tomlSection = `
[mcp_servers.noleak]
command = "npx"
args = ["-y", "noleak", "--mcp"]
enabled = true
`;

    // If local dist exists, use direct node path (faster)
    const localMcp = resolve('dist/mcp/server.js');
    const tomlSectionLocal = `
[mcp_servers.noleak]
command = "node"
args = ["${localMcp.replace(/\\/g, '/')}"]
enabled = true
`;

    content += existsSync(localMcp) ? tomlSectionLocal : tomlSection;
    writeFileSync(configPath, content, 'utf-8');

    console.log(`  ${chalk.green('✓')} MCP server → ${configPath}`);
    console.log(`    Ask: "audit this package before I publish"`);
    return true;
  } catch (err) {
    console.log(`  ${chalk.red('✗')} MCP: ${errMsg(err)}`);
    return false;
  }
}

function configureCodexHook(): boolean {
  // Codex hooks can be global (~/.codex/hooks.json) or project-local
  const codexDir = join(homedir(), '.codex');
  const hooksPath = join(codexDir, 'hooks.json');

  try {
    if (!existsSync(codexDir)) mkdirSync(codexDir, { recursive: true });

    let hooks: Record<string, unknown[]> = {};
    if (existsSync(hooksPath)) {
      hooks = JSON.parse(readFileSync(hooksPath, 'utf-8'));
    }

    const preToolUse = (hooks['PreToolUse'] ?? []) as Record<string, unknown>[];

    const alreadyExists = preToolUse.some(
      (h) => JSON.stringify(h).includes('noleak')
    );

    if (!alreadyExists) {
      preToolUse.push({
        matcher: 'Bash',
        hooks: [{
          type: 'command',
          command: `bash -c 'if echo "$TOOL_INPUT" | grep -qE "npm publish|npx publish"; then npx noleak npm . --output json; fi'`,
        }],
      });
      hooks['PreToolUse'] = preToolUse;
      writeFileSync(hooksPath, JSON.stringify(hooks, null, 2), 'utf-8');
      console.log(`  ${chalk.green('✓')} Hook → ${hooksPath}`);
    } else {
      console.log(`  ${chalk.green('✓')} Hook already configured`);
    }
    return true;
  } catch (err) {
    console.log(`  ${chalk.red('✗')} Hook: ${errMsg(err)}`);
    return false;
  }
}

function configureCodexAgentsMD(): boolean {
  const agentsPath = 'AGENTS.md';

  try {
    let content = existsSync(agentsPath) ? readFileSync(agentsPath, 'utf-8') : '';

    if (content.includes('noleak')) {
      console.log(`  ${chalk.green('✓')} AGENTS.md already configured`);
      return true;
    }

    content += PUBLISH_INSTRUCTIONS_MD;
    writeFileSync(agentsPath, content, 'utf-8');
    console.log(`  ${chalk.green('✓')} AGENTS.md → pre-publish audit instructions`);
    return true;
  } catch (err) {
    console.log(`  ${chalk.red('✗')} AGENTS.md: ${errMsg(err)}`);
    return false;
  }
}

// ─── Shared ────────────────────────────────────

const PUBLISH_INSTRUCTIONS_MD = `

## Pre-publish Audit (noleak)

Before running \`npm publish\` or any package publish command, ALWAYS run:

\`\`\`bash
npx noleak npm .
\`\`\`

- **BLOCK** → Do NOT publish. Fix the issues first.
- **WARN** → Inform the user and ask whether to proceed.
- **PASS** → Safe to publish.

This catches source maps, credentials, env files, and other sensitive content
that should not be in published packages.
`;

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
