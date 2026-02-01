import { defineConfig } from 'tsup';

// Separate config for IIFE/UMD builds (CDN usage)
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['iife'],
  dts: false,
  clean: false,
  minify: true,
  sourcemap: false,
  globalName: 'MicroCharts',
  target: 'es2020',
  outExtension() {
    return {
      js: '.global.js',
    };
  },
});
