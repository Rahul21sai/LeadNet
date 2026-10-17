import { defineConfig } from 'tsup';

// @leadnet/shared is TypeScript source, so it is bundled into the output;
// real npm dependencies stay external and are installed in the container.
export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  noExternal: ['@leadnet/shared'],
});
