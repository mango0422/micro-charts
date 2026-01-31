import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs', 'iife'],
  dts: true,
  clean: true,
  minify: true,
  sourcemap: true,
  globalName: 'MicroCharts',
  target: 'es2020',
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : format === 'iife' ? '.global.js' : '.js',
    };
  },
});
