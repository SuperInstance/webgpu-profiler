import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/profiler.ts', 'src/benchmarks.ts', 'src/metrics.ts'],
  format: ['esm'],
  dts: true,
  splitting: false,
    sourcemap: true,
    clean: true,
    shims: true,
  });
