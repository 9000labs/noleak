import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts', 'src/mcp/server.ts'],
  format: ['esm'],
  dts: false,
  clean: true,
  target: 'node18',
  splitting: false,
  sourcemap: false,
});
