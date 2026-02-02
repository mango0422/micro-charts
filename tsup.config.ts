import { defineConfig } from 'tsup';

const isDev = process.env.NODE_ENV === 'development';

export default defineConfig({
  // Multiple entry points for optimal tree-shaking
  entry: [
    'src/index.ts',         // Main entry
    'src/bar.ts',           // BarChart only
    'src/gauge.ts',         // GaugeChart only
    'src/pie.ts',           // PieChart only
    'src/progress.ts',      // ProgressBar only
    'src/stacked-bar.ts',   // StackedBarChart only
    'src/heatmap.ts',       // HeatMap only
    'src/radar.ts',         // RadarChart only
    'src/funnel.ts',        // FunnelChart only
    'src/horizontal-bar.ts', // HorizontalBarChart only
    'src/vertical-bar.ts',  // VerticalBarChart only
    'src/multi-line.ts',    // MultiLineChart only
    'src/bubble.ts',        // BubbleChart only
    'src/waterfall.ts',     // WaterfallChart only
    'src/boxplot.ts',       // BoxPlot only
    'src/colors.ts',        // Color utilities only
    'src/easing.ts',        // Easing functions only
  ],
  // ESM and CJS only for module builds (IIFE separate)
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  minify: true,
  // Sourcemap only in development
  sourcemap: isDev,
  target: 'es2020',
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.js',
    };
  },
});
