import { Command } from 'commander';
import { npmCommand } from './commands/npm.js';
import { scanCommand } from './commands/scan.js';
import { initCommand } from './commands/init.js';
import { setupCommand } from './commands/setup.js';
import { getAllRules } from './rules/rule-registry.js';
import { ECOSYSTEMS } from './extractors/factory.js';

// --mcp flag: start MCP server instead of CLI
if (process.argv.includes('--mcp')) {
  import('./mcp/server.js').catch(console.error);
} else {
  main();
}

function main() {
  const program = new Command();

  program
    .name('noleak')
    .description('Pre-publish security gate. Supports: npm, pypi, docker, maven, nuget, crates, rubygems, github-release, vscode, chrome.')
    .version('0.1.1');

  // Universal scan command (auto-detects ecosystem)
  program
    .command('scan')
    .description('Audit any package before publishing (auto-detects ecosystem)')
    .argument('[path]', 'path to package directory', '.')
    .option('-e, --ecosystem <type>', `ecosystem: ${ECOSYSTEMS.join(' | ')}`)
    .option('-o, --output <format>', 'output format: console | json', 'console')
    .option('--fail-on <level>', 'exit non-zero on: block | warn | info', 'block')
    .action(async (path: string, options: { ecosystem?: string; output: string; failOn: string }) => {
      const exitCode = await scanCommand(path, {
        ecosystem: options.ecosystem,
        output: options.output as 'console' | 'json',
        failOn: options.failOn,
      });
      process.exit(exitCode);
    });

  // npm shortcut (backward compatible)
  program
    .command('npm')
    .description('Audit npm package before publishing')
    .argument('[path]', 'path to package directory', '.')
    .option('-o, --output <format>', 'output format: console | json', 'console')
    .option('--fail-on <level>', 'exit non-zero on: block | warn | info', 'block')
    .action(async (path: string, options: { output: string; failOn: string }) => {
      const exitCode = await npmCommand(path, {
        output: options.output as 'console' | 'json',
        failOn: options.failOn,
      });
      process.exit(exitCode);
    });

  // Ecosystem-specific shortcuts
  for (const eco of ['pypi', 'docker', 'maven', 'nuget', 'crates', 'rubygems', 'github-release', 'vscode', 'chrome'] as const) {
    program
      .command(eco)
      .description(`Audit ${eco} package before publishing`)
      .argument('[path]', 'path to package directory', '.')
      .option('-o, --output <format>', 'output format: console | json', 'console')
      .option('--fail-on <level>', 'exit non-zero on: block | warn | info', 'block')
      .action(async (path: string, options: { output: string; failOn: string }) => {
        const exitCode = await scanCommand(path, {
          ecosystem: eco,
          output: options.output as 'console' | 'json',
          failOn: options.failOn,
        });
        process.exit(exitCode);
      });
  }

  program
    .command('init')
    .description('Create a starter .noleakrc.json config file')
    .argument('[path]', 'directory to create config in', '.')
    .action((path: string) => process.exit(initCommand(path)));

  program
    .command('setup')
    .description('Configure for Claude Code, Codex, or both')
    .argument('<target>', 'claude | codex | all')
    .action((target: string) => {
      if (!['claude', 'codex', 'all'].includes(target)) {
        console.error(`  Unknown target: ${target}. Use: claude | codex | all`);
        process.exit(1);
      }
      process.exit(setupCommand(target as 'claude' | 'codex' | 'all'));
    });

  program
    .command('rules')
    .description('List all available audit rules')
    .action(() => {
      const rules = getAllRules();
      console.log('');
      console.log('  Available rules:');
      console.log('');
      for (const rule of rules) {
        const severity = rule.defaultSeverity.toUpperCase().padEnd(5);
        console.log(`  [${severity}] ${rule.id.padEnd(20)} ${rule.description}`);
      }
      console.log('');
      console.log(`  Total: ${rules.length} rules`);
      console.log(`  Ecosystems: ${ECOSYSTEMS.join(', ')}`);
      console.log('');
    });

  program.parse();
}
